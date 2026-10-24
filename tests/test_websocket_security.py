"""WebSocket collaboration security: tickets, room scope, expiry and replay protection."""
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes
from identity import create_user, init_identity_schema, issue_session, revoke_session


def provision(path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(auth_routes, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-a", "Institution A", "2026-01-01T00:00:00+00:00"))
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-b", "Institution B", "2026-01-01T00:00:00+00:00"))
    learner_a = create_user(db, email="learner-a@example.test", display_name="Learner A",
                            password="learner-password-long", role="learner", institution_id="inst-a")
    learner_b = create_user(db, email="learner-b@example.test", display_name="Learner B",
                            password="learner-password-long", role="learner", institution_id="inst-b")
    token_a = issue_session(db, learner_a)
    token_b = issue_session(db, learner_b)
    db.commit()
    db.close()
    main.init_db()
    return learner_a, learner_b, token_a, token_b


def test_ticket_endpoint_requires_individual_identity(tmp_path, monkeypatch):
    provision(tmp_path / "ws-auth.db", monkeypatch)
    with TestClient(main.app) as client:
        assert client.post("/api/ws/tickets", json={"room": "institution-inst-a"}).status_code == 401


def test_ticket_is_room_scoped_short_lived_and_single_use(tmp_path, monkeypatch):
    learner_a, _, token_a, _ = provision(tmp_path / "ws-scope.db", monkeypatch)
    with TestClient(main.app) as client:
        headers = {"Authorization": f"Bearer {token_a}"}
        assert client.post("/api/ws/tickets", headers=headers,
                           json={"room": "institution-inst-b"}).status_code == 403
        response = client.post("/api/ws/tickets", headers=headers,
                               json={"room": "institution-inst-a"})
        assert response.status_code == 200, response.text
        ticket = response.json()["ticket"]
        assert response.json()["expires_in"] == 60
        assert "access_token" not in response.json()

        # A ticket cannot be moved to a different room.
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/user-{learner_a}?ticket={ticket}"):
                pass

        with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}") as socket:
            assert socket.receive_json() == {"type": "history", "messages": []}
            socket.send_json({"name": "Forged Administrator", "role": "platform_admin", "text": "Hello"})
            message = socket.receive_json()
            assert message["type"] == "message"
            assert message["user_id"] is not None
            assert message["role"] == "learner"
            assert message["name"] == "Participant"

        # Consumed tickets cannot be replayed for a second connection.
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}"):
                pass


def test_revoked_account_session_cannot_use_issued_ticket(tmp_path, monkeypatch):
    learner_id, _, token_a, _ = provision(tmp_path / "ws-revoke.db", monkeypatch)
    with TestClient(main.app) as client:
        response = client.post("/api/ws/tickets",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"room": "user-" + learner_id})
        assert response.status_code == 200
        ticket = response.json()["ticket"]
        db = sqlite3.connect(tmp_path / "ws-revoke.db")
        db.row_factory = sqlite3.Row
        assert revoke_session(db, token_a)
        db.commit()
        db.close()
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/user-{learner_id}?ticket={ticket}"):
                pass


def test_invalid_or_missing_websocket_ticket_is_rejected(tmp_path, monkeypatch):
    provision(tmp_path / "ws-invalid.db", monkeypatch)
    with TestClient(main.app) as client:
        for url in ("/ws/rooms/institution-inst-a", "/ws/rooms/institution-inst-a?ticket=invalid"):
            with pytest.raises(WebSocketDisconnect):
                with client.websocket_connect(url):
                    pass


def test_expired_ticket_is_rejected(tmp_path, monkeypatch):
    learner_id, _, token_a, _ = provision(tmp_path / "ws-expired.db", monkeypatch)
    with TestClient(main.app) as client:
        response = client.post(
            "/api/ws/tickets",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"room": f"user-{learner_id}"},
        )
        assert response.status_code == 200, response.text
        ticket = response.json()["ticket"]
        import hashlib
        digest = hashlib.sha256(ticket.encode("utf-8")).hexdigest()
        db = sqlite3.connect(tmp_path / "ws-expired.db")
        db.execute(
            "UPDATE websocket_tickets SET expires_at=? WHERE ticket_hash=?",
            ("2000-01-01T00:00:00+00:00", digest),
        )
        db.commit()
        db.close()
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/user-{learner_id}?ticket={ticket}"):
                pass


def test_suspended_institution_cannot_use_issued_ticket(tmp_path, monkeypatch):
    learner_id, _, token_a, _ = provision(tmp_path / "ws-suspended.db", monkeypatch)
    with TestClient(main.app) as client:
        response = client.post(
            "/api/ws/tickets",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"room": "institution-inst-a"},
        )
        assert response.status_code == 200, response.text
        ticket = response.json()["ticket"]
        db = sqlite3.connect(tmp_path / "ws-suspended.db")
        db.execute("UPDATE institutions SET status='suspended' WHERE institution_id='inst-a'")
        db.commit()
        db.close()
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/institution-inst-a?ticket={ticket}"):
                pass

def test_production_websocket_requires_trusted_origin(tmp_path, monkeypatch):
    provision(tmp_path / "ws-origin.db", monkeypatch)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://pilot.example.org,https://educator.example.org")

    from types import SimpleNamespace
    assert main._websocket_origin_allowed("https://pilot.example.org")
    assert main._websocket_origin_allowed("https://educator.example.org")
    assert not main._websocket_origin_allowed("https://attacker.example")
    assert not main._websocket_origin_allowed(None)
    assert not main._websocket_origin_allowed("")
