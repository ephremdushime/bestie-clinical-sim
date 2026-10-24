"""Security regression tests for session-bound, one-time WebSocket tickets."""
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
from identity import create_user, init_identity_schema


def provision(tmp_path, monkeypatch):
    db_path = tmp_path / "websocket-security.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(auth_routes, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-ws", "WebSocket Test Institution", "2026-01-01T00:00:00+00:00"))
    create_user(db, email="learner@ws.example", display_name="Verified Learner",
        password="learner-password-long", role="learner", institution_id="inst-ws")
    db.commit()
    db.close()
    main.init_db()


def login(client):
    result = client.post("/api/auth/login", json={
        "email": "learner@ws.example", "password": "learner-password-long"})
    assert result.status_code == 200, result.text
    return result.json()["access_token"]


def start_owned_session(client, token):
    result = client.post("/api/sessions", headers={"Authorization": f"Bearer {token}"},
        json={"learner": "Forged Name", "case_id": "malaria-001", "mode": "practice"})
    assert result.status_code == 200, result.text
    return result.json()["session_id"]


def issue_ticket(client, token, session_id):
    result = client.post(f"/api/sessions/{session_id}/ws-ticket",
        headers={"Authorization": f"Bearer {token}"})
    assert result.status_code == 200, result.text
    return result.json()["ticket"]


def test_websocket_requires_single_use_ticket_and_binds_identity(tmp_path, monkeypatch):
    provision(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        token = login(client)
        session_id = start_owned_session(client, token)
        ticket = issue_ticket(client, token, session_id)
        with client.websocket_connect(f"/ws/rooms/{session_id}?ticket={ticket}") as socket:
            assert socket.receive_json()["type"] == "history"
            socket.send_json({"name": "Impersonated Admin", "role": "platform_admin", "text": "hello"})
            message = socket.receive_json()
            assert message["name"] == "Verified Learner"
            assert message["role"] == "learner"
            assert message["text"] == "hello"
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/{session_id}?ticket={ticket}") as socket:
                socket.receive_json()


def test_websocket_ticket_is_bound_to_room_and_rejects_long_lived_token(tmp_path, monkeypatch):
    provision(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        token = login(client)
        session_id = start_owned_session(client, token)
        ticket = issue_ticket(client, token, session_id)
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/{session_id + 100}?ticket={ticket}") as socket:
                socket.receive_json()
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/rooms/{session_id}?token={"p" * 40}") as socket:
                socket.receive_json()


def test_websocket_ticket_cannot_be_issued_for_another_users_session(tmp_path, monkeypatch):
    provision(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        token_a = login(client)
        session_id = start_owned_session(client, token_a)
        db = main.conn()
        create_user(db, email="other@ws.example", display_name="Other Learner",
            password="other-learner-password-long", role="learner", institution_id="inst-ws")
        db.commit()
        db.close()
        other_login = client.post("/api/auth/login", json={
            "email": "other@ws.example", "password": "other-learner-password-long"})
        assert other_login.status_code == 200
        token_b = other_login.json()["access_token"]
        response = client.post(f"/api/sessions/{session_id}/ws-ticket",
            headers={"Authorization": f"Bearer {token_b}"})
        assert response.status_code == 403


def test_websocket_ticket_requires_authentication(tmp_path, monkeypatch):
    provision(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        token = login(client)
        session_id = start_owned_session(client, token)
        response = client.post(f"/api/sessions/{session_id}/ws-ticket")
        assert response.status_code == 401
