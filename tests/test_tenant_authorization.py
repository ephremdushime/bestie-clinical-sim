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
        ("admin-a@example.org", "Institution Admin A", "institution-admin-password-a-long", "institution_admin", "inst-a"),
        ("platform-admin@example.org", "Platform Admin", "platform-admin-password-long", "platform_admin", None),
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
        admin_a = sign_in(client, "admin-a@example.org", "institution-admin-password-a-long")
        educator_b = sign_in(client, "educator-b@example.org", "educator-password-b-long")
        exam_b = create_exam(client, educator_b, "Institution B exam")
        response = client.post(f"/api/educator/exams/{exam_b['id']}/close", headers=admin_a)
        assert response.status_code == 403, response.text


def test_platform_admin_has_explicit_cross_institution_dashboard_access(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator_a = sign_in(client, "educator-a@example.org", "educator-password-a-long")
        educator_b = sign_in(client, "educator-b@example.org", "educator-password-b-long")
        platform_admin = sign_in(client, "platform-admin@example.org", "platform-admin-password-long")
        exam_a = create_exam(client, educator_a, "Institution A exam")
        exam_b = create_exam(client, educator_b, "Institution B exam")
        dashboard = client.get("/api/educator/dashboard", headers=platform_admin)
        assert dashboard.status_code == 200, dashboard.text
        assert {exam["id"] for exam in dashboard.json()["exams"]} == {exam_a["id"], exam_b["id"]}



def test_published_cases_remain_private_to_the_owning_institution(tmp_path, monkeypatch):
    db_path = setup(tmp_path, monkeypatch)
    case_id = "generated-institution-b-private"
    case = {
        "id": case_id, "version": "1.0.0", "title": "Institution B private case",
        "specialty": "Medicine", "level": "Clinical-year student",
        "appearance": "Fictional adult patient", "age": 35, "sex": "adult",
        "opening": "I feel unwell.", "diagnosis": "Fictional teaching diagnosis",
        "vitals": {}, "facts": {}, "investigations": {},
        "expected_actions": [], "expected_differentials": [], "critical_errors": [],
    }
    monkeypatch.setitem(main.CASES, case_id, case)
    with sqlite3.connect(db_path) as db:
        db.execute(
            """INSERT INTO approved_cases(case_id,version,payload,approved_by,approved_at,institution_id)
               VALUES(?,?,?,?,?,?)""",
            (case_id, "1.0.0", json.dumps(case), "Educator B",
             "2026-10-24T00:00:00+00:00", "inst-b"),
        )
        db.execute(
            """INSERT INTO case_versions(case_id,version,payload,approved_by,approved_at,
               change_note,content_hash,institution_id) VALUES(?,?,?,?,?,?,?,?)""",
            (case_id, "1.0.0", json.dumps(case), "Educator B",
             "2026-10-24T00:00:00+00:00", "Initial version",
             main.content_digest(case), "inst-b"),
        )

    with TestClient(main.app) as client:
        educator_a = sign_in(client, "educator-a@example.org", "educator-password-a-long")
        educator_b = sign_in(client, "educator-b@example.org", "educator-password-b-long")

        cases_a = client.get("/api/cases", headers=educator_a)
        cases_b = client.get("/api/cases", headers=educator_b)
        assert cases_a.status_code == 200, cases_a.text
        assert cases_b.status_code == 200, cases_b.text
        assert case_id not in {item["id"] for item in cases_a.json()["cases"]}
        assert case_id in {item["id"] for item in cases_b.json()["cases"]}

        denied_session = client.post("/api/sessions", headers=educator_a, json={
            "learner": "Educator A", "case_id": case_id, "mode": "practice"
        })
        assert denied_session.status_code == 403, denied_session.text

        denied_exam = client.post("/api/educator/exams", headers=educator_a, json={
            "title": "Unauthorized case exam", "case_id": case_id, "duration": 5, "pass_mark": 70
        })
        assert denied_exam.status_code == 403, denied_exam.text

        denied_history = client.get(
            f"/api/educator/cases/{case_id}/versions", headers=educator_a
        )
        assert denied_history.status_code == 403, denied_history.text
        denied_detail = client.get(
            f"/api/educator/cases/{case_id}/versions/1.0.0", headers=educator_a
        )
        assert denied_detail.status_code == 403, denied_detail.text

        allowed_exam = client.post("/api/educator/exams", headers=educator_b, json={
            "title": "Institution B case exam", "case_id": case_id, "duration": 5, "pass_mark": 70
        })
        assert allowed_exam.status_code == 200, allowed_exam.text
