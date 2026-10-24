"""Additional WebSocket ticket lifecycle and payload validation regressions."""
import hashlib
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes
from identity import create_user, init_identity_schema, issue_session


def provision(path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(auth_routes, "DB_PATH", path)
    # Exercise production-only guards with safe, test-only configuration.
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "test-pilot-token-" + "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "test-educator-token-" + "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://clinical-sim.example.test")
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.execute(
        "INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
        ("inst-a", "Institution A", "2026-01-01T00:00:00+00:00"),
    )
    user_id = create_user(
        db, email="learner@example.test", display_name="Learner",
        password="learner-password-long", role="learner", institution_id="inst-a",
    )
    token = issue_session(db, user_id)
    db.commit()
    db.close()
    main.init_db()
    return user_id, token


def issue_ticket(client, token, room="institution-inst-a"):
    response = client.post(
        "/api/ws/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={"room": room},
    )
    assert response.status_code == 200, response.text
    return response.json()["ticket"]


def test_expired_ticket_is_rejected_at_socket_handshake(tmp_path, monkeypatch):
    db_path = tmp_path / "expired-ticket.db"
    _, token = provision(db_path, monkeypatch)
    with TestClient(main.app) as client:
        ticket = issue_ticket(client, token)
        expired_at = (datetime.now(timezone.utc) - timedelta(seconds=5)).isoformat(timespec="seconds")
        with sqlite3.connect(db_path) as db:
            db.execute("UPDATE websocket_tickets SET expires_at=? WHERE ticket_hash=?",
                       (expired_at, hashlib.sha256(ticket.encode()).hexdigest()))
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}", headers={"origin": "https://clinical-sim.example.test"}):
                pass


def test_suspended_institution_invalidates_an_unconsumed_ticket(tmp_path, monkeypatch):
    db_path = tmp_path / "suspended-institution.db"
    _, token = provision(db_path, monkeypatch)
    with TestClient(main.app) as client:
        ticket = issue_ticket(client, token)
        with sqlite3.connect(db_path) as db:
            db.execute("UPDATE institutions SET status='suspended' WHERE institution_id='inst-a'")
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}", headers={"origin": "https://clinical-sim.example.test"}):
                pass


def test_disabled_account_invalidates_an_unconsumed_ticket(tmp_path, monkeypatch):
    db_path = tmp_path / "disabled-user.db"
    user_id, token = provision(db_path, monkeypatch)
    with TestClient(main.app) as client:
        ticket = issue_ticket(client, token)
        with sqlite3.connect(db_path) as db:
            db.execute("UPDATE users SET status='disabled' WHERE user_id=?", (user_id,))
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}", headers={"origin": "https://clinical-sim.example.test"}):
                pass


def test_empty_websocket_message_is_rejected_without_broadcasting(tmp_path, monkeypatch):
    db_path = tmp_path / "empty-message.db"
    _, token = provision(db_path, monkeypatch)
    with TestClient(main.app) as client:
        ticket = issue_ticket(client, token)
        with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}", headers={"origin": "https://clinical-sim.example.test"}) as socket:
            assert socket.receive_json() == {"type": "history", "messages": []}
            socket.send_json({"text": "   ", "role": "platform_admin"})
            response = socket.receive_json()
            assert response["type"] == "error"
            assert response["message"] == "Message text is required."


def test_oversized_websocket_message_is_rejected_not_truncated(tmp_path, monkeypatch):
    db_path = tmp_path / "oversized-message.db"
    _, token = provision(db_path, monkeypatch)
    with TestClient(main.app) as client:
        ticket = issue_ticket(client, token)
        with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}", headers={"origin": "https://clinical-sim.example.test"}) as socket:
            assert socket.receive_json() == {"type": "history", "messages": []}
            socket.send_json({"text": "x" * 1201})
            response = socket.receive_json()
            assert response["type"] == "error"
            assert response["message"] == "Message exceeds the 1200-character limit."
