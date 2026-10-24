"""Regression tests for cross-institution data isolation."""
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


def _setup(db_path, monkeypatch):
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
    for iid, name in (("inst-a", "Institution A"), ("inst-b", "Institution B")):
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   (iid, name, "2026-01-01T00:00:00+00:00"))
    educator_a = create_user(db, email="educator-a@example.edu", display_name="Educator A",
                             password="educator-a-password", role="educator", institution_id="inst-a")
    educator_b = create_user(db, email="educator-b@example.edu", display_name="Educator B",
                             password="educator-b-password", role="educator", institution_id="inst-b")
    learner_b = create_user(db, email="learner-b@example.edu", display_name="Learner B",
                            password="learner-b-password", role="learner", institution_id="inst-b")
    db.commit()
    db.close()
    main.init_db()
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    for iid, suffix in (("inst-a", "a"), ("inst-b", "b")):
        db.execute(
            """INSERT INTO exams(code,title,case_id,duration,pass_mark,created_at,status,creator,
               institution_id,creator_user_id,case_version,rubric_version)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            ("CODE-" + suffix.upper(), "Exam " + suffix.upper(), "malaria-001", 20, 70,
             "2026-10-24T10:00:00+00:00", "open", "Educator " + suffix.upper(),
             iid, educator_a if suffix == "a" else educator_b,
             "1.0.0", main.RUBRIC_VERSION),
        )
        db.execute(
            """INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,updated_at,
               institution_id,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?)""",
            ("draft-" + suffix, "Topic " + suffix.upper(), "General medicine", "draft",
             json.dumps({"case": {"title": "Draft " + suffix.upper()}}),
             "2026-10-24T10:00:00+00:00", "2026-10-24T10:00:00+00:00",
             iid, educator_a if suffix == "a" else educator_b),
        )
    db.execute(
        """INSERT INTO sessions(learner,case_id,mode,exam_id,created_at,status,events,report,
           session_token_hash,owner_user_id,case_version,rubric_version,institution_id)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        ("Learner B", "malaria-001", "practice", None, "2026-10-24T10:00:00+00:00",
         "active", "[]", json.dumps({"private": "institution-b-report"}), "hash-b",
         learner_b, "1.0.0", main.RUBRIC_VERSION, "inst-b"),
    )
    db.commit()
    db.close()
    return educator_a, educator_b, learner_b


def _login(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_dashboard_and_case_drafts_are_scoped_to_authenticated_institution(tmp_path, monkeypatch):
    _setup(tmp_path / "tenant.db", monkeypatch)
    with TestClient(main.app) as client:
        headers_a = _login(client, "educator-a@example.edu", "educator-a-password")
        dashboard = client.get("/api/educator/dashboard", headers=headers_a)
        assert dashboard.status_code == 200, dashboard.text
        body = dashboard.json()
        assert [row["title"] for row in body["exams"]] == ["Exam A"]
        assert body["total_sessions"] == 0
        assert all(row["learner"] != "Learner B" for row in body["sessions"])
        drafts = client.get("/api/educator/case-drafts", headers=headers_a)
        assert drafts.status_code == 200, drafts.text
        assert [row["draft_id"] for row in drafts.json()["drafts"]] == ["draft-a"]


def test_cross_institution_draft_review_and_learner_session_access_are_denied(tmp_path, monkeypatch):
    _setup(tmp_path / "tenant-access.db", monkeypatch)
    with TestClient(main.app) as client:
        headers_a = _login(client, "educator-a@example.edu", "educator-a-password")
        review = client.post("/api/educator/case-drafts/draft-b/review", headers=headers_a,
                             json={"reviewer": "Pretend Reviewer", "review_notes": "Attempted cross-tenant review"})
        assert review.status_code == 404, review.text
        session = client.post("/api/sessions/1/chat", headers=headers_a,
                              json={"message": "Please tell me when symptoms started"})
        assert session.status_code == 403, session.text


def test_generated_cases_are_visible_and_usable_only_in_their_institution(tmp_path, monkeypatch):
    _setup(tmp_path / "generated-case-tenant.db", monkeypatch)
    generated = {
        "id": "generated-private-b",
        "version": "1.0.0",
        "title": "Institution B private case",
        "specialty": "Internal medicine",
        "level": "Clinical-year student",
        "appearance": "Fictional adult patient",
        "age": 40,
        "sex": "adult",
    }
    monkeypatch.setitem(main.CASES, generated["id"], generated)
    db = sqlite3.connect(tmp_path / "generated-case-tenant.db")
    db.execute(
        """INSERT INTO approved_cases(case_id,version,payload,approved_by,approved_at,institution_id)
           VALUES(?,?,?,?,?,?)""",
        (generated["id"], generated["version"], json.dumps(generated), "Educator B",
         "2026-10-24T10:00:00+00:00", "inst-b"),
    )
    db.commit()
    db.close()

    with TestClient(main.app) as client:
        headers_a = _login(client, "educator-a@example.edu", "educator-a-password")
        listed = client.get("/api/cases", headers=headers_a)
        assert listed.status_code == 200, listed.text
        assert generated["id"] not in {item["id"] for item in listed.json()["cases"]}

        started = client.post("/api/sessions", headers=headers_a,
                              json={"case_id": generated["id"], "mode": "practice"})
        assert started.status_code == 404, started.text

        exam = client.post("/api/educator/exams", headers=headers_a, json={
            "title": "Cross-tenant exam", "case_id": generated["id"], "duration": 20,
            "pass_mark": 70})
        assert exam.status_code == 404, exam.text

        history = client.get(f"/api/educator/cases/{generated['id']}/versions", headers=headers_a)
        assert history.status_code == 404, history.text
