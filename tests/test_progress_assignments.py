"""Learner progress, assignment tenancy, recovery and report-export regressions."""
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


def provision(path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(auth_routes, "DB_PATH", path)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-a", "Institution A", "2026-01-01T00:00:00+00:00"))
    learner = create_user(db, email="learner@a.example", display_name="Learner A",
                          password="learner-password-long", role="learner", institution_id="inst-a")
    educator = create_user(db, email="educator@a.example", display_name="Educator A",
                           password="educator-password-long", role="educator", institution_id="inst-a")
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("inst-b", "Institution B", "2026-01-01T00:00:00+00:00"))
    learner_b = create_user(db, email="learner@b.example", display_name="Learner B",
                            password="learner-password-long", role="learner", institution_id="inst-b")
    educator_b = create_user(db, email="educator@b.example", display_name="Educator B",
                             password="educator-password-long", role="educator", institution_id="inst-b")
    db.commit()
    db.close()
    main.init_db()
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    return learner, educator, learner_b, educator_b


def login(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_cohort_assignment_progress_resume_and_tenant_scoped_csv(tmp_path, monkeypatch):
    learner_id, educator_id, learner_b_id, educator_b_id = provision(tmp_path / "learner-progress.db", monkeypatch)
    with TestClient(main.app) as client:
        educator = login(client, "educator@a.example", "educator-password-long")
        learner = login(client, "learner@a.example", "learner-password-long")
        educator_b = login(client, "educator@b.example", "educator-password-long")
        learner_b = login(client, "learner@b.example", "learner-password-long")

        cohort = client.post("/api/educator/cohorts", headers=educator,
                             json={"name": "Clinical Year 3"})
        assert cohort.status_code == 200, cohort.text
        cohort_id = cohort.json()["cohort_id"]
        added = client.post(f"/api/educator/cohorts/{cohort_id}/members", headers=educator,
                            json={"learner_user_id": learner_id})
        assert added.status_code == 200, added.text
        cross_tenant = client.post(f"/api/educator/cohorts/{cohort_id}/members", headers=educator,
                                   json={"learner_user_id": learner_b_id})
        assert cross_tenant.status_code == 404

        assignment = client.post("/api/educator/assignments", headers=educator, json={
            "title": "Focused clinical reasoning", "case_id": "malaria-001",
            "mode": "practice", "cohort_id": cohort_id})
        assert assignment.status_code == 200, assignment.text
        assert assignment.json()["rubric_version"] == "rubric-v1.0.0"
        assert client.get("/api/learner/assignments", headers=learner).json()["assignments"][0]["assignment_id"] == assignment.json()["assignment_id"]
        assert client.get("/api/learner/assignments", headers=learner_b).json()["assignments"] == []

        started = client.post("/api/sessions", headers=learner, json={
            "learner": "Forged Name", "case_id": "malaria-001", "mode": "practice"})
        assert started.status_code == 200, started.text
        sid = started.json()["session_id"]
        assert started.json()["patient"]["vitals"]
        resume = client.get(f"/api/sessions/{sid}/resume", headers=learner)
        assert resume.status_code == 200, resume.text
        assert resume.json()["session_id"] == sid
        assert resume.json()["case_id"] == "malaria-001"
        assert resume.json()["events"] == []
        assert client.get(f"/api/sessions/{sid}/resume", headers=learner_b).status_code == 403

        finished = client.post(f"/api/sessions/{sid}/finish", headers=learner, json={
            "differential": ["malaria", "viral illness"],
            "final_diagnosis": "uncomplicated malaria",
            "management": ["urgent referral if severe", "follow-up"],
            "reflection": "interpret results and arrange follow-up"})
        assert finished.status_code == 200, finished.text
        assert finished.json()["rubric_version"] == "rubric-v1.0.0"
        progress = client.get("/api/learner/progress", headers=learner)
        assert progress.status_code == 200, progress.text
        assert progress.json()["completed_sessions"] == 1
        assert progress.json()["practice_completed"] == 1

        export = client.get("/api/educator/reports.csv", headers=educator)
        assert export.status_code == 200, export.text
        assert "rubric_version" in export.text and "rubric-v1.0.0" in export.text
        other_export = client.get("/api/educator/reports.csv", headers=educator_b)
        assert other_export.status_code == 200
        assert "Learner A" not in other_export.text
        assert client.get("/api/educator/reports.csv", headers=learner).status_code == 403


def test_exam_resume_does_not_return_hidden_diagnosis_or_report(tmp_path, monkeypatch):
    learner_id, educator_id, _, _ = provision(tmp_path / "exam-resume.db", monkeypatch)
    with TestClient(main.app) as client:
        educator = login(client, "educator@a.example", "educator-password-long")
        learner = login(client, "learner@a.example", "learner-password-long")
        exam = client.post("/api/educator/exams", headers=educator, json={
            "title": "Controlled assessment", "case_id": "malaria-001"})
        assert exam.status_code == 200, exam.text
        assert exam.json()["rubric_version"] == "rubric-v1.0.0"
        joined = client.post("/api/sessions", headers=learner, json={
            "learner": "Learner A", "case_id": "malaria-001", "mode": "exam",
            "exam_code": exam.json()["code"]})
        assert joined.status_code == 200, joined.text
        sid = joined.json()["session_id"]
        assert "case_id" not in joined.json() or joined.json()["case_id"] is None
        submission = client.post(f"/api/sessions/{sid}/finish", headers=learner, json={
            "differential": ["malaria", "viral illness"], "final_diagnosis": "malaria",
            "management": ["follow-up", "urgent referral if severe"], "reflection": "review results"})
        assert submission.status_code == 200
        assert "score" not in submission.json() and "hidden_case_diagnosis" not in submission.json()
        resumed = client.get(f"/api/sessions/{sid}/resume", headers=learner)
        assert resumed.status_code == 200, resumed.text
        serialized = json.dumps(resumed.json()).lower()
        assert "uncomplicated malaria" not in serialized
        assert "hidden_case_diagnosis" not in serialized
        assert "score" not in resumed.json().get("report", {})
