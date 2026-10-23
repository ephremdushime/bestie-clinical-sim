"""Focused tests for the new authentication endpoints, isolated from the app database."""
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import auth_routes
from auth_routes import LoginRequest
from identity import create_user


def setup_auth_db(tmp_path, monkeypatch):
    db_path = tmp_path / "auth-routes.db"
    monkeypatch.setattr(auth_routes, "DB_PATH", db_path)
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    auth_routes.init_identity_schema(db)
    db.execute(
        "INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
        ("inst-1", "Test Institution", "2026-01-01T00:00:00+00:00"),
    )
    user_id = create_user(
        db, email="learner@example.org", display_name="Test Learner",
        password="test-password-that-is-long", role="learner", institution_id="inst-1",
    )
    db.commit()
    db.close()
    return db_path, user_id


def test_login_me_logout_revokes_session(tmp_path, monkeypatch):
    setup_auth_db(tmp_path, monkeypatch)
    result = auth_routes.login(LoginRequest(
        email=" LEARNER@example.org ", password="test-password-that-is-long"
    ))
    assert result["token_type"] == "bearer"
    assert result["user"]["role"] == "learner"
    assert result["user"]["email"] == "learner@example.org"
    token = result["access_token"]

    current = auth_routes.current_user("Bearer " + token)
    assert current["user"]["user_id"] == result["user"]["user_id"]

    assert auth_routes.logout("Bearer " + token) == {"logged_out": True}
    with pytest.raises(HTTPException) as exc:
        auth_routes.current_user("Bearer " + token)
    assert exc.value.status_code == 401


def test_invalid_credentials_are_generic_and_audited(tmp_path, monkeypatch):
    db_path, _ = setup_auth_db(tmp_path, monkeypatch)
    with pytest.raises(HTTPException) as exc:
        auth_routes.login(LoginRequest(
            email="learner@example.org", password="incorrect-password"
        ))
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid email or password."
    with sqlite3.connect(db_path) as db:
        action = db.execute(
            "SELECT action FROM audit_events ORDER BY created_at DESC LIMIT 1"
        ).fetchone()[0]
        failed = db.execute(
            "SELECT COUNT(*) FROM auth_login_attempts WHERE succeeded=0"
        ).fetchone()[0]
    assert action == "auth.login_failed"
    assert failed == 1


def test_login_rate_limit_blocks_after_ten_failed_attempts(tmp_path, monkeypatch):
    db_path, _ = setup_auth_db(tmp_path, monkeypatch)
    for _ in range(10):
        with pytest.raises(HTTPException) as exc:
            auth_routes.login(LoginRequest(
                email="learner@example.org", password="incorrect-password"
            ))
        assert exc.value.status_code == 401
    with pytest.raises(HTTPException) as exc:
        auth_routes.login(LoginRequest(
            email="learner@example.org", password="incorrect-password"
        ))
    assert exc.value.status_code == 429
    with sqlite3.connect(db_path) as db:
        assert db.execute(
            "SELECT COUNT(*) FROM auth_login_attempts WHERE succeeded=0"
        ).fetchone()[0] == 10


def test_malformed_or_missing_bearer_token_is_rejected():
    for header in (None, "", "Basic abc", "Bearer "):
        with pytest.raises(HTTPException) as exc:
            auth_routes.current_user(header)
        assert exc.value.status_code == 401



def test_expired_account_session_cannot_be_reused_for_api_or_websocket_ticket(tmp_path, monkeypatch):
    db_path, _ = setup_auth_db(tmp_path, monkeypatch)
    result = auth_routes.login(LoginRequest(
        email="learner@example.org", password="test-password-that-is-long"))
    token = result["access_token"]
    import hashlib
    with sqlite3.connect(db_path) as db:
        db.execute("UPDATE auth_sessions SET expires_at=? WHERE token_hash=?",
                   ("2000-01-01T00:00:00+00:00",
                    hashlib.sha256(token.encode("utf-8")).hexdigest()))
        db.commit()

    with pytest.raises(HTTPException) as current_error:
        auth_routes.current_user("Bearer " + token)
    assert current_error.value.status_code == 401
    with pytest.raises(HTTPException) as ticket_error:
        auth_routes.create_websocket_ticket("Bearer " + token)
    assert ticket_error.value.status_code == 401
