"""Authentication endpoints for pre-provisioned Bestie Clinical Sim accounts.

This router intentionally does not expose registration or role assignment. Existing
simulation and educator routes must be migrated separately before claiming end-to-end
identity enforcement.
"""
from __future__ import annotations

import os
import sqlite3
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from identity import (
    PASSWORD_ITERATIONS,
    _password_record,
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
        succeeded INTEGER NOT NULL DEFAULT 0,
        client_key TEXT NOT NULL DEFAULT 'unknown'
      )
    """)
    attempt_columns = {row["name"] for row in db.execute("PRAGMA table_info(auth_login_attempts)")}
    if "client_key" not in attempt_columns:
        db.execute("ALTER TABLE auth_login_attempts ADD COLUMN client_key TEXT NOT NULL DEFAULT 'unknown'")
    db.execute("CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email_time ON auth_login_attempts(email_normalized, attempted_at)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_client_time ON auth_login_attempts(client_key, attempted_at)")
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
def login(body: LoginRequest, request: Request):
    """Authenticate a provisioned account with per-account and per-client throttling."""
    from datetime import datetime, timedelta, timezone

    email = body.email.strip().casefold()
    now = datetime.now(timezone.utc)
    now_text = now.isoformat(timespec="seconds")
    cutoff = (now - timedelta(minutes=15)).isoformat(timespec="seconds")
    # The bundled reverse proxy overwrites X-Real-IP. The API must not be exposed
    # directly to the public network, otherwise this header is not trustworthy.
    client_key = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    db = _db()
    try:
        client_attempts = db.execute(
            "SELECT COUNT(*) AS n FROM auth_login_attempts WHERE client_key=? AND attempted_at>=? AND succeeded=0",
            (client_key, cutoff),
        ).fetchone()["n"]
        if client_attempts >= 50:
            write_audit_event(db, actor_user_id=None, institution_id=None,
                              action="auth.login_throttled", resource_type="client",
                              resource_id=None, outcome="denied",
                              metadata_json='{"reason":"client_attempt_limit"}')
            db.commit()
            raise HTTPException(429, "Too many sign-in attempts from this network. Try again later.")

        attempts = db.execute(
            "SELECT COUNT(*) AS n FROM auth_login_attempts WHERE email_normalized=? AND attempted_at>=? AND succeeded=0",
            (email, cutoff),
        ).fetchone()["n"]
        user = verify_password(db, email, body.password)
        db.execute(
            "INSERT INTO auth_login_attempts(email_normalized,attempted_at,succeeded,client_key) VALUES(?,?,?,?)",
            (email, now_text, 1 if user else 0, client_key),
        )
        # Retain only the recent window plus a small margin.
        db.execute("DELETE FROM auth_login_attempts WHERE attempted_at<?",
                   ((now - timedelta(days=2)).isoformat(timespec="seconds"),))
        if not user:
            if attempts >= 10:
                write_audit_event(db, actor_user_id=None, institution_id=None,
                                  action="auth.login_throttled", resource_type="user",
                                  resource_id=None, outcome="denied",
                                  metadata_json='{"reason":"account_attempt_limit"}')
                db.commit()
                raise HTTPException(429, "Too many sign-in attempts. Try again later.")
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


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=12, max_length=1024)


@router.post("/change-password")
def change_password(body: PasswordChangeRequest, authorization: str | None = Header(default=None)):
    """Change the authenticated user's password and revoke all existing sessions."""
    token = _bearer(authorization)
    db = _db()
    try:
        db.execute("BEGIN IMMEDIATE")
        session = resolve_session(db, token)
        if not session:
            raise HTTPException(401, "Session is invalid, expired, revoked, or account disabled.")
        user = db.execute("SELECT * FROM users WHERE user_id=?", (session["user_id"],)).fetchone()
        if not user or not verify_password(db, user["email_normalized"], body.current_password):
            write_audit_event(db, actor_user_id=session["user_id"],
                              institution_id=session["institution_id"],
                              action="auth.password_change_failed", resource_type="user",
                              resource_id=session["user_id"], outcome="denied")
            db.commit()
            raise HTTPException(403, "Current password is incorrect.")
        salt = secrets.token_bytes(16)
        password_hash = _password_record(body.new_password, salt, PASSWORD_ITERATIONS)
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        db.execute(
            "UPDATE users SET password_salt=?,password_hash=?,password_iterations=?,updated_at=? WHERE user_id=?",
            (salt.hex(), password_hash, PASSWORD_ITERATIONS, now, session["user_id"]),
        )
        db.execute(
            "UPDATE auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL",
            (now, session["user_id"]),
        )
        write_audit_event(db, actor_user_id=session["user_id"],
                          institution_id=session["institution_id"],
                          action="auth.password_changed", resource_type="user",
                          resource_id=session["user_id"], outcome="success")
        db.commit()
        return {"status": "password_changed", "reauthentication_required": True}
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
