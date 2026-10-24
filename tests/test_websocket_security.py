"""WebSocket collaboration authorization regressions."""
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes
from identity import create_user, init_identity_schema


def setup_accounts(tmp_path, monkeypatch):
    path = tmp_path / "websocket.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(auth_routes, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.execute(
        "INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
        ("inst-a", "Institution A", "2026-01-01T00:00:00+00:00"),
    )
    learner_id = create_user(
        db, email="learner@ws.example", display_name="Verified Learner",
        password="learner-password-long", role="learner", institution_id="inst-a",
    )
    other_id = create_user(
        db, email="other@ws.example", display_name="Other Learner",
        password="other-password-long", role="learner", institution_id="inst-a",
    )
    educator_id = create_user(
        db, email="educator@ws.example", display_name="Verified Educator",
        password="educator-password-long", role="educator", institution_id="inst-a",
    )
    db.commit()
    db.close()
    main.init_db()
    return learner_id, other_id, educator_id


def login(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_websocket_ticket_is_scoped_single_use_and_identity_attributed(tmp_path, monkeypatch):
    learner_id, other_id, educator_id = setup_accounts(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        learner_token = login(client, "learner@ws.example", "learner-password-long")
        other_token = login(client, "other@ws.example", "other-password-long")
        headers = {"Authorization": f"Bearer {learner_token}"}
        started = client.post("/api/sessions", headers=headers, json={
            "learner": "Forged Display Name", "case_id": "malaria-001", "mode": "practice"
        })
        assert started.status_code == 200, started.text
        session_id = started.json()["session_id"]
        room = f"session:{session_id}"

        assert client.post("/api/ws/ticket", json={"room": room}).status_code == 401
        forbidden = client.post("/api/ws/ticket", headers={
            "Authorization": f"Bearer {other_token}"
        }, json={"room": room})
        assert forbidden.status_code == 403, forbidden.text

        issued = client.post("/api/ws/ticket", headers=headers, json={"room": room})
        assert issued.status_code == 200, issued.text
        ticket = issued.json()["ticket"]
        assert issued.json()["expires_in"] == 60

        with client.websocket_connect(f"/ws/rooms/{room}?ticket={ticket}") as ws:
            assert ws.receive_json()["type"] == "history"
            ws.send_json({"name": "Platform Admin", "role": "platform_admin", "text": "Hello"})
            msg = ws.receive_json()
            assert msg["name"] == "Verified Learner"
            assert msg["role"] == "learner"
            assert msg["text"] == "Hello"

        # A ticket cannot be replayed, even by the account that originally obtained it.
        try:
            with client.websocket_connect(f"/ws/rooms/{room}?ticket={ticket}"):
                raise AssertionError("A consumed WebSocket ticket must be rejected")
        except WebSocketDisconnect:
            pass


def test_websocket_ticket_rejects_unknown_rooms_and_nonmember_institution_rooms(tmp_path, monkeypatch):
    _, _, _ = setup_accounts(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        learner = login(client, "learner@ws.example", "learner-password-long")
        educator = login(client, "educator@ws.example", "educator-password-long")
        learner_headers = {"Authorization": f"Bearer {learner}"}
        educator_headers = {"Authorization": f"Bearer {educator}"}

        assert client.post("/api/ws/ticket", headers=learner_headers,
                           json={"room": "free-form-room"}).status_code == 403
        assert client.post("/api/ws/ticket", headers=learner_headers,
                           json={"room": "institution:inst-a"}).status_code == 403
        assert client.post("/api/ws/ticket", headers=educator_headers,
                           json={"room": "institution:inst-a"}).status_code == 200


def test_websocket_ticket_is_bound_to_requested_room(tmp_path, monkeypatch):
    setup_accounts(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        token = login(client, "learner@ws.example", "learner-password-long")
        headers = {"Authorization": f"Bearer {token}"}
        started = client.post("/api/sessions", headers=headers, json={
            "learner": "Learner", "case_id": "malaria-001", "mode": "practice"
        })
        room = f"session:{started.json()['session_id']}"
        ticket = client.post("/api/ws/ticket", headers=headers,
                             json={"room": room}).json()["ticket"]
        try:
            with client.websocket_connect(f"/ws/rooms/session:999999?ticket={ticket}"):
                raise AssertionError("Ticket must not be usable in a different room")
        except WebSocketDisconnect:
            pass
