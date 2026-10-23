"""Authentication endpoints for pre-provisioned Bestie Clinical Sim accounts.

This router intentionally does not expose registration or role assignment. Existing
simulation and educator routes must be migrated separately before claiming end-to-end
identity enforcement.
"""
from __future__ import annotations

import os
import sqlite3
import hashlib
import secrets
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from identity import (
    init_identity_schema,
    issue_session,
    resolve_session,
    revoke_session,
    verify_password,
    write_audit_event,
)

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("CLINICAL_SIM_DB", str(ROOT / "clinical_sim.db")))
router = APIRouter(prefix="/api/auth", tags=["authentication"])


def _db() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.execute("""
      CREATE TABLE IF NOT EXISTS auth_login_attempts (
        attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_normalized TEXT NOT NULL,
        attempted_at TEXT NOT NULL,
        succeeded INTEGER NOT NULL DEFAULT 0
      )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email_time ON auth_login_attempts(email_normalized, attempted_at)")
    db.execute("""CREATE TABLE IF NOT EXISTS websocket_tickets (
      ticket_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id),
      institution_id TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    )""")
    db.execute("CREATE INDEX IF NOT EXISTS idx_websocket_tickets_expiry ON websocket_tickets(expires_at)")
    db.commit()
    return db


def _public_user(row: Any) -> dict[str, Any]:
    return {
        "user_id": row["user_id"],
        "email": row["email_normalized"],
        "display_name": row["display_name"],
        "role": row["role"],
        "institution_id": row["institution_id"],
    }


def _bearer(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(401, "Bearer access token required.")
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(401, "Bearer access token required.")
    return token.strip()


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


@router.post("/login")
def login(body: LoginRequest):
    """Authenticate a provisioned account; never creates users."""
    from datetime import datetime, timedelta, timezone

    email = body.email.strip().casefold()
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(minutes=15)).isoformat(timespec="seconds")
    db = _db()
    try:
        attempts = db.execute(
            "SELECT COUNT(*) AS n FROM auth_login_attempts WHERE email_normalized=? AND attempted_at>=? AND succeeded=0",
            (email, cutoff),
        ).fetchone()["n"]
        # Per-account throttle; generic error avoids confirming account existence.
        if attempts >= 10:
            write_audit_event(db, actor_user_id=None, institution_id=None,
                              action="auth.login_throttled", resource_type="user",
                              resource_id=None, outcome="denied",
                              metadata_json='{"reason":"attempt_limit"}')
            db.commit()
            raise HTTPException(429, "Too many sign-in attempts. Try again later.")
        user = verify_password(db, email, body.password)
        db.execute(
            "INSERT INTO auth_login_attempts(email_normalized,attempted_at,succeeded) VALUES(?,?,?)",
            (email, now.isoformat(timespec="seconds"), 1 if user else 0),
        )
        # Retain only the recent window plus a small margin.
        db.execute("DELETE FROM auth_login_attempts WHERE attempted_at<?",
                   ((now - timedelta(days=2)).isoformat(timespec="seconds"),))
        if not user:
            write_audit_event(db, actor_user_id=None, institution_id=None,
                              action="auth.login_failed", resource_type="user",
                              resource_id=None, outcome="denied")
            db.commit()
            raise HTTPException(401, "Invalid email or password.")
        token = issue_session(db, user["user_id"], lifetime_hours=8)
        write_audit_event(db, actor_user_id=user["user_id"],
                          institution_id=user["institution_id"],
                          action="auth.login_succeeded", resource_type="auth_session",
                          resource_id=None, outcome="success")
        db.commit()
        return {"access_token": token, "token_type": "bearer",
                "expires_in": 28800, "user": _public_user(user)}
    finally:
        db.close()


@router.get("/me")
def current_user(authorization: str | None = Header(default=None)):
    token = _bearer(authorization)
    db = _db()
    try:
        user = resolve_session(db, token)
        if not user:
            raise HTTPException(401, "Session is invalid, expired, revoked, or account disabled.")
        db.commit()
        return {"user": _public_user(user)}
    finally:
        db.close()


@router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    token = _bearer(authorization)
    db = _db()
    try:
        user = resolve_session(db, token)
        if not user:
            raise HTTPException(401, "Session is invalid, expired, revoked, or account disabled.")
        revoke_session(db, token)
        write_audit_event(db, actor_user_id=user["user_id"],
                          institution_id=user["institution_id"],
                          action="auth.logout", resource_type="auth_session",
                          resource_id=None, outcome="success")
        db.commit()
        return {"logged_out": True}
    finally:
        db.close()


@router.post("/ws-ticket")
def create_websocket_ticket(authorization: str | None = Header(default=None)):
    """Issue a single-use 60-second ticket for browser WebSocket authentication."""
    from datetime import datetime, timedelta, timezone

    token = _bearer(authorization)
    db = _db()
    try:
        user = resolve_session(db, token)
        if not user:
            raise HTTPException(401, "Session is invalid, expired, revoked, or account disabled.")
        now = datetime.now(timezone.utc)
        db.execute("DELETE FROM websocket_tickets WHERE expires_at<? OR consumed_at IS NOT NULL",
                   (now.isoformat(timespec="seconds"),))
        ticket = secrets.token_urlsafe(32)
        digest = hashlib.sha256(ticket.encode("utf-8")).hexdigest()
        db.execute("""INSERT INTO websocket_tickets
          (ticket_hash,user_id,institution_id,created_at,expires_at)
          VALUES(?,?,?,?,?)""",
          (digest, user["user_id"], user["institution_id"],
           now.isoformat(timespec="seconds"),
           (now + timedelta(seconds=60)).isoformat(timespec="seconds")))
        write_audit_event(db, actor_user_id=user["user_id"],
                          institution_id=user["institution_id"],
                          action="auth.websocket_ticket_issued",
                          resource_type="websocket_ticket", resource_id=None,
                          outcome="success")
        db.commit()
        return {"ticket": ticket, "expires_in": 60}
    finally:
        db.close()
