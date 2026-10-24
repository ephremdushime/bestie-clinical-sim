"""Identity and session primitives for Bestie Clinical Sim.

Passwords are PBKDF2-hashed; raw bearer tokens are returned once and only their
hashes are persisted. Protected production HTTP routes resolve provisioned bearer
sessions through this module. WebSocket access uses separately issued, short-lived,
single-use room tickets. This is not a substitute for institutional SSO, MFA, or
external identity verification.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Iterable

PASSWORD_ITERATIONS = 310_000
TOKEN_BYTES = 32
ALLOWED_ROLES = {"learner", "educator", "institution_admin", "platform_admin"}
ROLE_PERMISSIONS = {
    "learner": {"session:create", "session:read_own", "session:submit_own"},
    "educator": {"session:read_institution", "case:draft", "case:review", "exam:manage"},
    "institution_admin": {"user:manage_institution", "audit:read_institution"},
    "platform_admin": {"institution:manage", "user:manage_all", "audit:read_all"},
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_identity_schema(db: sqlite3.Connection) -> None:
    """Create identity tables additively; caller owns connection/transaction."""
    db.executescript("""
    CREATE TABLE IF NOT EXISTS institutions (
      institution_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      institution_id TEXT REFERENCES institutions(institution_id),
      email_normalized TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_iterations INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('learner','educator','institution_admin','platform_admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled','locked')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_institution_role
      ON users(institution_id, role, status);
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      last_seen_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
    CREATE TABLE IF NOT EXISTS audit_events (
      event_id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(user_id),
      institution_id TEXT REFERENCES institutions(institution_id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      outcome TEXT NOT NULL CHECK(outcome IN ('success','denied','failure')),
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_institution_time
      ON audit_events(institution_id, created_at);
    CREATE TRIGGER IF NOT EXISTS audit_events_no_update
      BEFORE UPDATE ON audit_events
      BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END;
    CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
      BEFORE DELETE ON audit_events
      BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END;
    """)


def _password_record(password: str, salt: bytes, iterations: int = PASSWORD_ITERATIONS) -> str:
    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters.")
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return derived.hex()


def create_user(
    db: sqlite3.Connection, *, email: str, display_name: str, password: str,
    role: str, institution_id: str | None = None, user_id: str | None = None,
) -> str:
    """Create a user; administrative authorization must be checked by the caller."""
    email_normalized = email.strip().casefold()
    if not email_normalized or "@" not in email_normalized:
        raise ValueError("A valid email address is required.")
    if not display_name.strip():
        raise ValueError("Display name is required.")
    if role not in ALLOWED_ROLES:
        raise ValueError("Unsupported role.")
    if role in {"learner", "educator", "institution_admin"} and not institution_id:
        raise ValueError("Institution-scoped roles require an institution.")
    if role == "platform_admin" and institution_id:
        raise ValueError("Platform administrators must not be institution-scoped.")
    salt = secrets.token_bytes(16)
    password_hash = _password_record(password, salt)
    uid = user_id or secrets.token_urlsafe(16)
    now = utc_now()
    db.execute(
        """INSERT INTO users(user_id,institution_id,email_normalized,display_name,
           password_salt,password_hash,password_iterations,role,status,created_at,updated_at)
           VALUES(?,?,?,?,?,?,? ,?,'active',?,?)""",
        (uid, institution_id, email_normalized, display_name.strip(), salt.hex(),
         password_hash, PASSWORD_ITERATIONS, role, now, now),
    )
    return uid


def verify_password(db: sqlite3.Connection, email: str, password: str) -> sqlite3.Row | None:
    """Return active user row on success; generic None for unknown/disabled/wrong password."""
    row = db.execute(
        "SELECT * FROM users WHERE email_normalized=?", (email.strip().casefold(),)
    ).fetchone()
    if not row or row["status"] != "active":
        # Spend a hash operation for unknown/disabled accounts to reduce timing leakage.
        _password_record(password if len(password) >= 12 else "invalid-password-placeholder", b"\0" * 16)
        return None
    if row["role"] in {"learner", "educator", "institution_admin"} and not row["institution_id"]:
        _password_record(password if len(password) >= 12 else "invalid-password-placeholder", b"\0" * 16)
        return None
    if row["institution_id"]:
        institution = db.execute(
            "SELECT status FROM institutions WHERE institution_id=?",
            (row["institution_id"],),
        ).fetchone()
        if not institution or institution["status"] != "active":
            _password_record(password if len(password) >= 12 else "invalid-password-placeholder", b"\0" * 16)
            return None
    try:
        candidate = _password_record(password, bytes.fromhex(row["password_salt"]), row["password_iterations"])
    except (ValueError, TypeError):
        return None
    return row if hmac.compare_digest(candidate, row["password_hash"]) else None


def issue_session(db: sqlite3.Connection, user_id: str, *, lifetime_hours: int = 8) -> str:
    """Issue a random bearer token; only its SHA-256 digest is persisted."""
    if not 1 <= lifetime_hours <= 24:
        raise ValueError("Session lifetime must be between 1 and 24 hours.")
    row = db.execute("SELECT status FROM users WHERE user_id=?", (user_id,)).fetchone()
    if not row or row["status"] != "active":
        raise ValueError("Cannot issue a session for an inactive or missing user.")
    token = secrets.token_urlsafe(TOKEN_BYTES)
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now_dt = datetime.now(timezone.utc)
    db.execute(
        "INSERT INTO auth_sessions(token_hash,user_id,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?)",
        (digest, user_id, now_dt.isoformat(timespec="seconds"),
         (now_dt + timedelta(hours=lifetime_hours)).isoformat(timespec="seconds"),
         now_dt.isoformat(timespec="seconds")),
    )
    return token


def resolve_session(db: sqlite3.Connection, token: str) -> sqlite3.Row | None:
    """Resolve a non-revoked, unexpired session for an active user."""
    if not token or len(token) > 512:
        return None
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    row = db.execute(
        """SELECT u.user_id,u.institution_id,u.email_normalized,u.display_name,u.role,
                  u.status,s.expires_at,s.revoked_at,i.status AS institution_status
           FROM auth_sessions s JOIN users u ON u.user_id=s.user_id
           LEFT JOIN institutions i ON i.institution_id=u.institution_id
           WHERE s.token_hash=?""", (digest,)
    ).fetchone()
    if not row or row["status"] != "active" or row["revoked_at"]:
        return None
    if row["role"] in {"learner", "educator", "institution_admin"} and not row["institution_id"]:
        return None
    if row["institution_id"] and row["institution_status"] != "active":
        return None
    try:
        if datetime.fromisoformat(row["expires_at"]) <= datetime.now(timezone.utc):
            return None
    except ValueError:
        return None
    db.execute("UPDATE auth_sessions SET last_seen_at=? WHERE token_hash=?", (utc_now(), digest))
    return row


def revoke_session(db: sqlite3.Connection, token: str) -> bool:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    cur = db.execute(
        "UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL",
        (utc_now(), digest),
    )
    return cur.rowcount == 1


def has_permission(user: sqlite3.Row, permission: str, *, institution_id: str | None = None) -> bool:
    """Role + tenant guard. Platform admin permissions are intentionally explicit."""
    role = user["role"]
    if permission not in ROLE_PERMISSIONS.get(role, set()):
        return False
    if role != "platform_admin" and institution_id is not None:
        return user["institution_id"] == institution_id
    return True


def write_audit_event(
    db: sqlite3.Connection, *, actor_user_id: str | None, institution_id: str | None,
    action: str, resource_type: str, resource_id: str | None, outcome: str,
    metadata_json: str = "{}",
) -> str:
    """Append-only application interface; do not put passwords, tokens, or patient data in metadata."""
    if outcome not in {"success", "denied", "failure"}:
        raise ValueError("Invalid audit outcome.")
    if not action.strip() or not resource_type.strip():
        raise ValueError("Audit action and resource type are required.")
    event_id = secrets.token_urlsafe(16)
    db.execute(
        """INSERT INTO audit_events(event_id,actor_user_id,institution_id,action,
           resource_type,resource_id,outcome,metadata_json,created_at)
           VALUES(?,?,?,?,?,?,?,?,?)""",
        (event_id, actor_user_id, institution_id, action, resource_type,
         resource_id, outcome, metadata_json, utc_now()),
    )
    return event_id
