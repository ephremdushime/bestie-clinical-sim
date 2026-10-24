"""Regression tests for institution-level isolation of educator resources."""
import json
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes
from identity import create_user, init_identity_schema


def setup(tmp_path, monkeypatch):
    db_path = tmp_path / "tenant-boundaries.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(auth_routes, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    init_identity_schema(db)
    for iid, name in (("inst-a", "Institution A"), ("inst-b", "Institution B")):
        db.execute(
            "INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
            (iid, name, "2026-01-01T00:00:00+00:00"),
        )
    users = [
        ("educator-a@example.org", "Educator A", "educator-password-a-long", "educator", "inst-a"),
        ("educator-b@example.org", "Educator B", "educator-password-b-long", "educator", "inst-b"),
        ("learner-a@example.org", "Learner A", "learner-password-a-long", "learner", "inst-a"),
        ("learner-b@example.org", "Learner B", "learner-password-b-long", "learner", "inst-b"),
    ]
    for email, name, password, role, institution in users:
        create_user(db, email=email, display_name=name, password=password,
                    role=role, institution_id=institution)
    db.commit()
    db.close()
    main.init_db()
    main.ensure_version_snapshots()
    return db_path


def sign_in(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def create_exam(client, headers, title):
    response = client.post("/api/educator/exams", headers=headers, json={
        "title": title, "case_id": "malaria-001", "duration": 5, "pass_mark": 70
    })
    assert response.status_code == 200, response.text
    return response.json()


def test_dashboard_only_returns_same_institution_exams_and_sessions(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator_a = sign_in(client, "educator-a@example.org", "educator-password-a-long")
        educator_b = sign_in(client, "educator-b@example.org", "educator-password-b-long")
        learner_b = sign_in(client, "learner-b@example.org", "learner-password-b-long")
        exam_a = create_exam(client, educator_a, "Institution A exam")
        exam_b = create_exam(client, educator_b, "Institution B exam")
        started_b = client.post("/api/sessions", headers=learner_b, json={
            "learner": "forged label ignored", "case_id": "malaria-001", "mode": "practice"
        })
        assert started_b.status_code == 200, started_b.text
        dashboard = client.get("/api/educator/dashboard", headers=educator_a)
        assert dashboard.status_code == 200, dashboard.text
        body = dashboard.json()
        assert {exam["id"] for exam in body["exams"]} == {exam_a["id"]}
        assert all(session["id"] != started_b.json()["session_id"] for session in body["sessions"])
        assert all(exam["id"] != exam_b["id"] for exam in body["exams"])


def test_educator_cannot_open_other_institution_learner_session(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator_a = sign_in(client, "educator-a@example.org", "educator-password-a-long")
        learner_b = sign_in(client, "learner-b@example.org", "learner-password-b-long")
        started = client.post("/api/sessions", headers=learner_b, json={
            "learner": "Learner B", "case_id": "malaria-001", "mode": "practice"
        })
        assert started.status_code == 200, started.text
        response = client.post(
            f"/api/sessions/{started.json()['session_id']}/chat",
            headers=educator_a, json={"message": "When did the fever start?"},
        )
        assert response.status_code == 403, response.text


def test_case_drafts_are_tenant_scoped_for_list_review_and_publish(tmp_path, monkeypatch):
    db_path = setup(tmp_path, monkeypatch)
    with sqlite3.connect(db_path) as db:
        db.execute(
            """INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,
               updated_at,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?)""",
            ("draft-b", "Private draft", "Medicine", "draft_requires_clinical_review",
             json.dumps({"draft_id": "draft-b", "case": {}}), "2026-10-24T00:00:00+00:00",
             "2026-10-24T00:00:00+00:00", "inst-b", "user-b"),
        )
    with TestClient(main.app) as client:
        educator_a = sign_in(client, "educator-a@example.org", "educator-password-a-long")
        listed = client.get("/api/educator/case-drafts", headers=educator_a)
        assert listed.status_code == 200, listed.text
        assert "draft-b" not in {draft["draft_id"] for draft in listed.json()["drafts"]}
        review = client.post("/api/educator/case-drafts/draft-b/review", headers=educator_a,
                             json={"reviewer": "Educator A", "review_notes": "Reviewed"})
        assert review.status_code == 403, review.text
        publish = client.post("/api/educator/case-drafts/draft-b/approve-and-publish",
                              headers=educator_a,
                              json={"reviewer": "Educator A", "review_notes": "Approved"})
        assert publish.status_code == 403, publish.text


def test_institution_admin_cannot_close_another_institution_exam(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator_a = sign_in(client, "educator-a@example.org", "educator-password-a-long")
        educator_b = sign_in(client, "educator-b@example.org", "educator-password-b-long")
        exam_b = create_exam(client, educator_b, "Institution B exam")
        response = client.post(f"/api/educator/exams/{exam_b['id']}/close", headers=educator_a)
        assert response.status_code == 403, response.text
