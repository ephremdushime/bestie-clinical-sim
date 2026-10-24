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

        # A request-body reviewer name must never override verified identity,
        # and production review must be performed by someone other than the creator.
        draft = client.post("/api/educator/case-draft", headers={
            "Authorization": f"Bearer {educator_token}"}, json={
            "topic": "Test topic", "auto_retrieve": False})
        assert draft.status_code == 200, draft.text
        draft_id = draft.json()["draft_id"]
        self_review = client.post(f"/api/educator/case-drafts/{draft_id}/review",
            headers={"Authorization": f"Bearer {educator_token}"}, json={
                "reviewer": "Impersonated Platform Admin", "review_notes": "Self-review should be denied"})
        assert self_review.status_code == 403, self_review.text

        with main.conn() as db:
            reviewer_id = create_user(db, email="reviewer@a.example",
                display_name="Independent Reviewer", password="reviewer-password-long",
                role="educator", institution_id="inst-a")
            db.commit()
        reviewer_login = client.post("/api/auth/login", json={
            "email": "reviewer@a.example", "password": "reviewer-password-long"})
        assert reviewer_login.status_code == 200, reviewer_login.text
        reviewer_token = reviewer_login.json()["access_token"]
        review = client.post(f"/api/educator/case-drafts/{draft_id}/review",
            headers={"Authorization": f"Bearer {reviewer_token}"}, json={
                "reviewer": "Impersonated Platform Admin", "review_notes": "Independent review for workflow testing"})
        assert review.status_code == 200, review.text
        assert review.json()["review"]["reviewer"] == "Independent Reviewer"
        assert review.json()["review"]["reviewer_user_id"] == reviewer_id




def test_password_change_requires_current_password_and_revokes_existing_sessions(tmp_path, monkeypatch):
    _provision(tmp_path / "password-change.db", monkeypatch)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    main.init_db()

    with TestClient(main.app) as client:
        login = client.post("/api/auth/login", json={
            "email": "learner@a.example", "password": "learner-password-long"})
        assert login.status_code == 200, login.text
        old_token = login.json()["access_token"]
        wrong = client.post("/api/auth/change-password",
            headers={"Authorization": f"Bearer {old_token}"},
            json={"current_password": "incorrect-password", "new_password": "new-learner-password-456"})
        assert wrong.status_code == 403, wrong.text

        changed = client.post("/api/auth/change-password",
            headers={"Authorization": f"Bearer {old_token}"},
            json={"current_password": "learner-password-long", "new_password": "new-learner-password-456"})
        assert changed.status_code == 200, changed.text
        assert changed.json()["reauthentication_required"] is True
        assert client.get("/api/auth/me",
            headers={"Authorization": f"Bearer {old_token}"}).status_code == 401
        assert client.post("/api/auth/login", json={
            "email": "learner@a.example", "password": "learner-password-long"}).status_code == 401
        new_login = client.post("/api/auth/login", json={
            "email": "learner@a.example", "password": "new-learner-password-456"})
        assert new_login.status_code == 200, new_login.text

        with main.conn() as db:
            events = db.execute(
                "SELECT action,outcome FROM audit_events WHERE action LIKE 'auth.password_change%' ORDER BY created_at"
            ).fetchall()
            assert [(row["action"], row["outcome"]) for row in events] == [
                ("auth.password_change_failed", "denied"),
                ("auth.password_changed", "success"),
            ]


def test_production_protected_routes_reject_shared_pilot_and_educator_tokens(tmp_path, monkeypatch):
    _provision(tmp_path / "shared-token.db", monkeypatch)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    main.init_db()

    with TestClient(main.app) as client:
        pilot = client.post("/api/sessions",
            headers={"X-Pilot-Token": "p" * 40},
            json={"learner": "Unverified", "case_id": "malaria-001", "mode": "practice"})
        assert pilot.status_code == 401, pilot.text
        educator = client.get("/api/educator/dashboard",
            headers={"X-Educator-Token": "e" * 40})
        assert educator.status_code == 401, educator.text


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
