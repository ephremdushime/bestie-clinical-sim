"""Regression tests for immutable case/rubric snapshots and exam pinning."""
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main


def test_seed_cases_have_immutable_case_and_rubric_snapshots(tmp_path, monkeypatch):
    db_path = tmp_path / "versions.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    main.ensure_version_snapshots()
    with sqlite3.connect(db_path) as db:
        case = db.execute(
            "SELECT payload FROM case_versions WHERE case_id=? AND version=?",
            ("malaria-001", "1.0.0"),
        ).fetchone()
        rubric = db.execute(
            "SELECT payload FROM rubric_versions WHERE case_id=? AND case_version=? AND rubric_version=?",
            ("malaria-001", "1.0.0", main.RUBRIC_VERSION),
        ).fetchone()
    assert case is not None and "diagnosis" in case[0]
    assert rubric is not None and "formative_unvalidated" in rubric[0]


def test_exam_and_session_pin_case_and_rubric_versions(tmp_path, monkeypatch):
    db_path = tmp_path / "pinning.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    main.ensure_version_snapshots()
    with TestClient(main.app) as client:
        created = client.post("/api/educator/exams", json={
            "title": "Version pinning test", "case_id": "malaria-001",
            "duration": 10, "pass_mark": 70,
        })
        assert created.status_code == 200, created.text
        exam = created.json()
        assert exam["case_version"] == main.CASES["malaria-001"]["version"]
        assert exam["rubric_version"]
        with sqlite3.connect(db_path) as db:
            pinned_rubric = db.execute(
                "SELECT content_hash FROM rubric_versions WHERE case_id=? AND case_version=? AND rubric_version=?",
                ("malaria-001", exam["case_version"], exam["rubric_version"]),
            ).fetchone()
        assert pinned_rubric is not None and len(pinned_rubric[0]) == 64

        joined = client.post("/api/sessions", json={
            "learner": "Version test learner", "case_id": "burn-001",
            "mode": "exam", "exam_code": exam["code"],
        })
        assert joined.status_code == 200, joined.text
        with sqlite3.connect(db_path) as db:
            row = db.execute(
                "SELECT case_id,case_version,rubric_version FROM sessions WHERE id=?",
                (joined.json()["session_id"],),
            ).fetchone()
        assert row == ("malaria-001", exam["case_version"], exam["rubric_version"])
        # The learner-facing exam response must not disclose the pinned case identifier.
        assert joined.json()["case_id"] is None
        assert joined.json()["patient"]["vitals"] is None
        submitted = client.post(f"/api/sessions/{joined.json()['session_id']}/finish", json={
            "differential": ["malaria", "viral illness"], "final_diagnosis": "malaria",
            "management": ["urgent referral", "follow-up"], "reflection": "test result",
        })
        assert submitted.status_code == 200, submitted.text
        assert submitted.json()["status"] == "submitted_pending_educator_review"
        assert "case_id" not in submitted.json()
        assert "score" not in submitted.json()


def test_case_version_history_is_readable_and_does_not_expose_payload(tmp_path, monkeypatch):
    db_path = tmp_path / "history.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    main.ensure_version_snapshots()
    with TestClient(main.app) as client:
        response = client.get("/api/educator/cases/malaria-001/versions")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["versions"]
        assert data["versions"][0]["version"] == "1.0.0"
        assert "payload" not in data["versions"][0]


def test_invalid_exam_codes_are_rate_limited(tmp_path, monkeypatch):
    db_path = tmp_path / "exam-throttle.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    with TestClient(main.app) as client:
        for _ in range(10):
            response = client.post("/api/sessions", json={
                "learner": "Test learner", "case_id": "malaria-001",
                "mode": "exam", "exam_code": "INVALID-CODE",
            })
            assert response.status_code == 404
        blocked = client.post("/api/sessions", json={
            "learner": "Test learner", "case_id": "malaria-001",
            "mode": "exam", "exam_code": "ANOTHER-CODE",
        })
        assert blocked.status_code == 429
