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
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")

    with TestClient(main.app) as client:
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
