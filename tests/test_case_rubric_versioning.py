"""Immutable case/rubric version and exam snapshot regressions."""
import json
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes


def setup_db(tmp_path, monkeypatch):
    path = tmp_path / "versioning.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(auth_routes, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    return path


def test_published_case_versions_are_immutable_and_increment(tmp_path, monkeypatch):
    path = setup_db(tmp_path, monkeypatch)
    case_id = "generated-version-regression"
    case = {
        "id": case_id, "version": "0.1.0-draft", "rubric_version": "1.0.0",
        "title": "Versioned fictional case", "diagnosis": "Teaching diagnosis A",
        "specialty": "General medicine", "level": "Clinical year", "age": 30,
        "sex": "adult", "appearance": "Fictional patient", "opening": "I feel unwell.",
        "facts": {"history": "Fictional history"}, "vitals": {},
        "investigations": {
            "test-a": {"name": "Test A", "result": "Result A", "interpretation": "Interpretation A"},
            "test-b": {"name": "Test B", "result": "Result B", "interpretation": "Interpretation B"},
        },
        "expected_actions": ["Assess stability"], "expected_differentials": ["A", "B"],
        "critical_errors": [],
    }
    with sqlite3.connect(path) as db:
        db.execute(
            "INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
            ("draft-version-test", case["title"], case["specialty"], "reviewed_not_approved",
             json.dumps({"case": case, "generation_mode": "llm"}), "2026-01-01", "2026-01-01"),
        )

    with TestClient(main.app) as client:
        payload = {"reviewer": "Local Educator", "review_notes": "Fictional workflow validation only."}
        first = client.post("/api/educator/case-drafts/draft-version-test/approve-and-publish", json=payload)
        assert first.status_code == 200, first.text
        assert first.json()["version"] == "1.0.0"

        updated_case = dict(case)
        updated_case["title"] = "Versioned fictional case revised"
        with sqlite3.connect(path) as db:
            db.execute("UPDATE case_drafts SET payload=? WHERE draft_id=?",
                       (json.dumps({"case": updated_case, "generation_mode": "llm"}), "draft-version-test"))
        second = client.post("/api/educator/case-drafts/draft-version-test/approve-and-publish", json=payload)
        assert second.status_code == 200, second.text
        assert second.json()["version"] == "1.0.1"

        # A change to assessment-critical criteria increments the rubric version,
        # while the preceding narrative-only edit did not.
        rubric_changed_case = dict(updated_case)
        rubric_changed_case["critical_errors"] = ["Missing a time-critical escalation"]
        with sqlite3.connect(path) as db:
            db.execute("UPDATE case_drafts SET payload=? WHERE draft_id=?",
                       (json.dumps({"case": rubric_changed_case, "generation_mode": "llm"}),
                        "draft-version-test"))
        third = client.post("/api/educator/case-drafts/draft-version-test/approve-and-publish", json=payload)
        assert third.status_code == 200, third.text
        assert third.json()["version"] == "1.0.2"

    with sqlite3.connect(path) as db:
        rows = db.execute(
            "SELECT version,payload,rubric_version,rubric_json FROM case_versions WHERE case_id=? ORDER BY version",
            (case_id,),
        ).fetchall()
        assert [row[0] for row in rows] == ["1.0.0", "1.0.1", "1.0.2"]
        assert [row[2] for row in rows] == ["1.0.0", "1.0.0", "1.0.1"]
        assert json.loads(rows[0][1])["title"] == "Versioned fictional case"
        assert json.loads(rows[1][1])["title"] == "Versioned fictional case revised"
        assert json.loads(rows[2][1])["critical_errors"] == ["Missing a time-critical escalation"]
        assert json.loads(rows[0][3])["version"] == rows[0][2]
        assert json.loads(rows[2][3])["version"] == rows[2][2]


def test_exam_uses_frozen_case_and_rubric_snapshot_without_leaking_answers(tmp_path, monkeypatch):
    path = setup_db(tmp_path, monkeypatch)
    original = json.loads(json.dumps(main.CASES["malaria-001"]))
    try:
        with TestClient(main.app) as client:
            created = client.post("/api/educator/exams", json={
                "title": "Snapshot integrity test", "case_id": "malaria-001",
                "duration": 5, "pass_mark": 70, "creator": "Local Educator",
            })
            assert created.status_code == 200, created.text
            exam = created.json()
            assert "case_snapshot_json" not in exam
            assert "rubric_snapshot_json" not in exam
            assert "diagnosis" not in str(exam).lower()
            assert exam["case_version"] == original["version"]

            main.CASES["malaria-001"]["diagnosis"] = "MUTATED CURRENT CASE"
            joined = client.post("/api/sessions", json={
                "learner": "Exam learner", "case_id": "malaria-001",
                "mode": "exam", "exam_code": exam["code"],
            })
            assert joined.status_code == 200, joined.text
            data = joined.json()
            assert data["case_id"] is None
            assert data["patient"]["vitals"] is None
            assert data["opening"] == original["opening"]

            finished = client.post(f"/api/sessions/{data['session_id']}/finish", json={
                "differential": ["malaria", "viral illness"],
                "final_diagnosis": "Malaria",
                "management": ["Appropriate treatment", "Follow-up"],
                "reflection": "Positive test result supports diagnosis",
            })
            assert finished.status_code == 200, finished.text
            public_text = json.dumps(finished.json()).lower()
            assert "hidden_case_diagnosis" not in public_text
            assert "mutated current case" not in public_text
            assert "case_id" not in finished.json()
            assert "score" not in finished.json()

        with sqlite3.connect(path) as db:
            db.row_factory = sqlite3.Row
            session = db.execute("SELECT * FROM sessions WHERE id=?", (data["session_id"],)).fetchone()
            report = json.loads(session["report"])
            assert session["case_version"] == original["version"]
            assert session["rubric_version"] == "1.0.0"
            assert json.loads(session["case_snapshot_json"])["diagnosis"] == original["diagnosis"]
            assert report["hidden_case_diagnosis"] == original["diagnosis"]
            exam_row = db.execute("SELECT case_snapshot_json,rubric_snapshot_json FROM exams WHERE id=?",
                                   (exam["id"],)).fetchone()
            assert json.loads(exam_row["case_snapshot_json"])["diagnosis"] == original["diagnosis"]
            assert json.loads(exam_row["rubric_snapshot_json"])["version"] == "1.0.0"
    finally:
        main.CASES["malaria-001"] = original
