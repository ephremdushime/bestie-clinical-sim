"""Regression tests for identity-backed educator authorization and learner ownership."""
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes
from identity import create_user, init_identity_schema


def _provision(db_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(auth_routes, "DB_PATH", db_path)
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-a", "Institution A", "2026-01-01T00:00:00+00:00"))
    learner = create_user(db, email="learner@a.example", display_name="Learner A",
                          password="learner-password-long", role="learner", institution_id="inst-a")
    educator = create_user(db, email="educator@a.example", display_name="Educator A",
                           password="educator-password-long", role="educator", institution_id="inst-a")
    db.commit()
    db.close()
    return learner, educator


def test_educator_routes_require_provisioned_educator_identity(tmp_path, monkeypatch):
    learner_id, educator_id = _provision(tmp_path / "routes.db", monkeypatch)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    main.init_db()

    with TestClient(main.app) as client:
        learner_login = client.post("/api/auth/login", json={
            "email": "learner@a.example", "password": "learner-password-long"})
        educator_login = client.post("/api/auth/login", json={
            "email": "educator@a.example", "password": "educator-password-long"})
        assert learner_login.status_code == 200
        assert educator_login.status_code == 200
        learner_token = learner_login.json()["access_token"]
        educator_token = educator_login.json()["access_token"]

        assert client.get("/api/educator/dashboard").status_code == 401
        assert client.get("/api/educator/dashboard",
                          headers={"Authorization": f"Bearer {learner_token}"}).status_code == 403
        dashboard = client.get("/api/educator/dashboard",
                               headers={"Authorization": f"Bearer {educator_token}"})
        assert dashboard.status_code == 200, dashboard.text

        # A request-body reviewer name must never override the verified account identity.
        draft = client.post("/api/educator/case-draft", headers={
            "Authorization": f"Bearer {educator_token}"}, json={
                "topic": "Test topic", "auto_retrieve": False})
        assert draft.status_code == 200, draft.text
        review = client.post(f"/api/educator/case-drafts/{draft.json()['draft_id']}/review",
            headers={"Authorization": f"Bearer {educator_token}"}, json={
                "reviewer": "Impersonated Platform Admin", "review_notes": "Reviewed for workflow testing"})
        assert review.status_code == 200, review.text
        assert review.json()["review"]["reviewer"] == "Educator A"
        assert review.json()["review"]["reviewer_user_id"] == educator_id


def test_authenticated_learner_session_is_bound_to_account(tmp_path, monkeypatch):
    learner_id, _ = _provision(tmp_path / "owner.db", monkeypatch)
    # The route test uses an isolated database; initialize the simulation schema too.
    main.init_db()
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")

    with TestClient(main.app) as client:
        # Startup/test-client ordering must not leave the isolated DB without simulation tables.
        main.init_db()
        login = client.post("/api/auth/login", json={
            "email": "learner@a.example", "password": "learner-password-long"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        started = client.post("/api/sessions", headers=headers, json={
            "learner": "Forged Learner Name", "case_id": "malaria-001", "mode": "practice"})
        assert started.status_code == 200, started.text
        data = started.json()
        with sqlite3.connect(tmp_path / "owner.db") as db:
            db.row_factory = sqlite3.Row
            row = db.execute("SELECT learner,owner_user_id FROM sessions WHERE id=?",
                             (data["session_id"],)).fetchone()
        assert row["owner_user_id"] == learner_id
        assert row["learner"] == "Learner A"
        # Identity-backed session access is allowed without the legacy shared pilot token.
        reply = client.post(f"/api/sessions/{data['session_id']}/chat", headers=headers,
                            json={"message": "When did it start?"})
        assert reply.status_code == 200, reply.text



def test_institution_boundaries_isolate_drafts_exams_and_dashboard(tmp_path, monkeypatch):
    _, educator_a_id = _provision(tmp_path / "tenants.db", monkeypatch)
    db = sqlite3.connect(tmp_path / "tenants.db")
    db.row_factory = sqlite3.Row
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-b", "Institution B", "2026-01-01T00:00:00+00:00"))
    educator_b_id = create_user(db, email="educator@b.example", display_name="Educator B",
                                password="educator-password-long", role="educator",
                                institution_id="inst-b")
    db.commit()
    db.close()
    main.init_db()
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")

    with TestClient(main.app) as client:
        def login(email):
            response = client.post("/api/auth/login", json={
                "email": email, "password": "educator-password-long"})
            assert response.status_code == 200, response.text
            return {"Authorization": f"Bearer {response.json()['access_token']}"}

        headers_a = login("educator@a.example")
        headers_b = login("educator@b.example")
        draft = client.post("/api/educator/case-draft", headers=headers_a, json={
            "topic": "Tenant isolation test", "auto_retrieve": False})
        assert draft.status_code == 200, draft.text
        draft_id = draft.json()["draft_id"]
        assert draft_id in [d["draft_id"] for d in client.get(
            "/api/educator/case-drafts", headers=headers_a).json()["drafts"]]
        assert draft_id not in [d["draft_id"] for d in client.get(
            "/api/educator/case-drafts", headers=headers_b).json()["drafts"]]
        denied = client.post(f"/api/educator/case-drafts/{draft_id}/review",
                             headers=headers_b, json={"reviewer": "Fake", "review_notes": "no"})
        assert denied.status_code == 404

        exam = client.post("/api/educator/exams", headers=headers_a, json={
            "title": "Tenant exam", "case_id": "malaria-001", "creator": "Forged Creator"})
        assert exam.status_code == 200, exam.text
        assert exam.json()["creator"] == "Educator A"
        assert exam.json()["institution_id"] == "inst-a"
        assert client.post(f"/api/educator/exams/{exam.json()['id']}/close",
                           headers=headers_b).status_code == 404
        assert client.get("/api/educator/dashboard", headers=headers_b).json()["exams"] == []


def test_production_websocket_uses_identity_and_tenant_room(tmp_path, monkeypatch):
    _provision(tmp_path / "ws.db", monkeypatch)
    main.init_db()
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")

    with TestClient(main.app) as client:
        login = client.post("/api/auth/login", json={
            "email": "educator@a.example", "password": "educator-password-long"})
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        with client.websocket_connect(f"/ws/rooms/inst-a?token={token}") as websocket:
            assert websocket.receive_json()["type"] == "history"
            websocket.send_json({"name": "Impersonated Admin", "role": "platform_admin",
                                 "text": "Hello colleagues"})
            message = websocket.receive_json()
            assert message["name"] == "Educator A"
            assert message["role"] == "educator"
            assert message["text"] == "Hello colleagues"
        from starlette.websockets import WebSocketDisconnect
        try:
            with client.websocket_connect(f"/ws/rooms/inst-b?token={token}"):
                raise AssertionError("Cross-institution WebSocket connection unexpectedly succeeded")
        except WebSocketDisconnect:
            pass
