"""Production examination authorization, attempt-integrity and confidentiality tests."""
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes
from identity import create_user, init_identity_schema


def setup(tmp_path, monkeypatch):
    db_path = tmp_path / "exam-integrity.db"
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
               ("inst-a", "Institution A", "2026-01-01T00:00:00+00:00"))
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-b", "Institution B", "2026-01-01T00:00:00+00:00"))
    create_user(db, email="educator@a.example", display_name="Educator A",
        password="educator-password-long", role="educator", institution_id="inst-a")
    create_user(db, email="learner@a.example", display_name="Learner A",
        password="learner-password-long", role="learner", institution_id="inst-a")
    create_user(db, email="learner@b.example", display_name="Learner B",
        password="other-learner-password-long", role="learner", institution_id="inst-b")
    db.commit()
    db.close()
    main.init_db()
    main.ensure_version_snapshots()
    return db_path


def sign_in(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def create_exam(client, educator_headers):
    response = client.post("/api/educator/exams", headers=educator_headers, json={
        "title": "Secure assessment", "case_id": "malaria-001", "duration": 5, "pass_mark": 70})
    assert response.status_code == 200, response.text
    return response.json()


def start_exam(client, headers, exam):
    return client.post("/api/sessions", headers=headers, json={
        "learner": "Forged Student", "case_id": "malaria-001", "mode": "exam", "exam_code": exam["code"]})


def test_exam_requires_learner_identity_and_matching_institution(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator = sign_in(client, "educator@a.example", "educator-password-long")
        learner_a = sign_in(client, "learner@a.example", "learner-password-long")
        learner_b = sign_in(client, "learner@b.example", "other-learner-password-long")
        exam = create_exam(client, educator)
        assert exam["institution_id"] == "inst-a"
        assert start_exam(client, learner_a, exam).status_code == 200
        assert start_exam(client, learner_b, exam).status_code == 403
        assert start_exam(client, educator, exam).status_code == 403
        assert start_exam(client, {"X-Pilot-Token": "p" * 40}, exam).status_code == 403


def test_exam_allows_only_one_attempt_per_account_and_exam(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator = sign_in(client, "educator@a.example", "educator-password-long")
        learner = sign_in(client, "learner@a.example", "learner-password-long")
        exam = create_exam(client, educator)
        first = start_exam(client, learner, exam)
        assert first.status_code == 200, first.text
        second = start_exam(client, learner, exam)
        assert second.status_code == 409, second.text


def test_exam_submission_hides_case_identifier_and_scores_and_is_single_submit(tmp_path, monkeypatch):
    db_path = setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator = sign_in(client, "educator@a.example", "educator-password-long")
        learner = sign_in(client, "learner@a.example", "learner-password-long")
        exam = create_exam(client, educator)
        started = start_exam(client, learner, exam)
        assert started.status_code == 200, started.text
        sid = started.json()["session_id"]
        finish_body = {"differential": ["malaria", "viral illness"], "final_diagnosis": "malaria",
            "management": ["ABCDE / systematic initial assessment", "Referral / transfer with structured handover"],
            "reflection": "I interpreted the result and will reassess the patient."}
        response = client.post(f"/api/sessions/{sid}/finish", headers=learner, json=finish_body)
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["status"] == "submitted_pending_educator_review"
        assert "case_id" not in result and "score" not in result and "threshold_status" not in result
        duplicate = client.post(f"/api/sessions/{sid}/finish", headers=learner, json=finish_body)
        assert duplicate.status_code == 409
        with sqlite3.connect(db_path) as db:
            row = db.execute("SELECT report FROM sessions WHERE id=?", (sid,)).fetchone()
        stored = __import__("json").loads(row[0])
        assert stored["case_version"] == exam["case_version"]
        assert stored["rubric_version"] == exam["rubric_version"]


def test_server_enforces_exam_deadline_for_actions_and_records_late_submission(tmp_path, monkeypatch):
    db_path = setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator = sign_in(client, "educator@a.example", "educator-password-long")
        learner = sign_in(client, "learner@a.example", "learner-password-long")
        exam = create_exam(client, educator)
        started = start_exam(client, learner, exam)
        assert started.status_code == 200, started.text
        sid = started.json()["session_id"]
        old_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(timespec="seconds")
        with sqlite3.connect(db_path) as db:
            db.execute("UPDATE sessions SET created_at=? WHERE id=?", (old_time, sid))
        blocked = client.post(f"/api/sessions/{sid}/chat", headers=learner, json={"message": "Any symptoms?"})
        assert blocked.status_code == 409
        submitted = client.post(f"/api/sessions/{sid}/finish", headers=learner, json={
            "differential": [], "final_diagnosis": "", "management": [], "reflection": ""})
        assert submitted.status_code == 200, submitted.text
        assert submitted.json()["time_expired"] is True
