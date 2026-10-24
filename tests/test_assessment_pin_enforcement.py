"""Regression tests for fail-closed exam/session version and tenant pin validation."""
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
    db_path = tmp_path / "assessment-pin-enforcement.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(auth_routes, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    for institution_id, name in (("inst-a", "Institution A"), ("inst-b", "Institution B")):
        db.execute(
            "INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
            (institution_id, name, "2026-01-01T00:00:00+00:00"),
        )
    create_user(db, email="educator@a.example", display_name="Educator A",
                password="educator-password-long", role="educator", institution_id="inst-a")
    create_user(db, email="learner@a.example", display_name="Learner A",
                password="learner-password-long", role="learner", institution_id="inst-a")
    db.commit()
    db.close()
    main.init_db()
    main.ensure_version_snapshots()
    return db_path


def sign_in(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_exam_session_rejects_rubric_version_drift(tmp_path, monkeypatch):
    db_path = setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator = sign_in(client, "educator@a.example", "educator-password-long")
        learner = sign_in(client, "learner@a.example", "learner-password-long")
        exam_response = client.post("/api/educator/exams", headers=educator, json={
            "title": "Pin integrity regression", "case_id": "malaria-001",
            "duration": 5, "pass_mark": 70,
        })
        assert exam_response.status_code == 200, exam_response.text
        exam = exam_response.json()
        started = client.post("/api/sessions", headers=learner, json={
            "learner": "Untrusted display name", "case_id": "malaria-001",
            "mode": "exam", "exam_code": exam["code"],
        })
        assert started.status_code == 200, started.text
        session_id = started.json()["session_id"]

        # Simulate persisted-data drift/tampering after the attempt was created.
        with sqlite3.connect(db_path) as db:
            db.execute("UPDATE exams SET rubric_version=? WHERE id=?",
                       ("999.0.0-tampered", exam["id"]))
            db.commit()

        action = client.post(f"/api/sessions/{session_id}/chat", headers=learner,
                             json={"message": "Please tell me more about the fever."})
        assert action.status_code == 409, action.text
        assert "version pins do not match" in action.json()["detail"]

        submission = client.post(f"/api/sessions/{session_id}/finish", headers=learner, json={
            "differential": ["malaria"], "final_diagnosis": "malaria",
            "management": ["assess severity"], "reflection": "Integrity check.",
        })
        assert submission.status_code == 409, submission.text


def test_exam_session_rejects_institution_ownership_drift(tmp_path, monkeypatch):
    db_path = setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator = sign_in(client, "educator@a.example", "educator-password-long")
        learner = sign_in(client, "learner@a.example", "learner-password-long")
        exam_response = client.post("/api/educator/exams", headers=educator, json={
            "title": "Tenant pin regression", "case_id": "malaria-001",
            "duration": 5, "pass_mark": 70,
        })
        assert exam_response.status_code == 200, exam_response.text
        exam = exam_response.json()
        started = client.post("/api/sessions", headers=learner, json={
            "learner": "Untrusted display name", "case_id": "malaria-001",
            "mode": "exam", "exam_code": exam["code"],
        })
        assert started.status_code == 200, started.text
        session_id = started.json()["session_id"]

        # An exam moved to another tenant must not continue to authorize its old attempt.
        with sqlite3.connect(db_path) as db:
            db.execute("UPDATE exams SET institution_id=? WHERE id=?",
                       ("inst-b", exam["id"]))
            db.commit()

        action = client.post(f"/api/sessions/{session_id}/chat", headers=learner,
                             json={"message": "What other symptoms do I have?"})
        assert action.status_code == 409, action.text
        assert "ownership/version pins do not match" in action.json()["detail"]
