"""Immutable case/rubric version and assessment pinning regression tests."""
import json
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes


def isolated_client(tmp_path, monkeypatch):
    db_path = tmp_path / "versions.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(auth_routes, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    return TestClient(main.app), db_path


def publish_revision(db_path, original, version, opening, actions):
    revised = dict(original)
    revised["version"] = version
    revised["opening"] = opening
    revised["expected_actions"] = list(actions)
    rubric = main.rubric_for_case(revised)
    rubric_json = main.canonical_json(rubric)
    rubric_hash = __import__("hashlib").sha256(rubric_json.encode("utf-8")).hexdigest()
    case_json = json.dumps(revised)
    stamp = main.now()
    with sqlite3.connect(db_path) as db:
        db.execute("INSERT INTO case_versions(case_id,version,payload,content_hash,approved_by,approved_by_user_id,approved_at,created_at) VALUES(?,?,?,?,?,?,?,?)",
            (revised["id"], version, case_json, main.content_digest(revised), "Test Reviewer", "reviewer-1", stamp, stamp))
        previous = db.execute("SELECT rubric_version,rubric_json FROM rubric_versions WHERE case_id=? ORDER BY rowid DESC LIMIT 1",
            (revised["id"],)).fetchone()
        rubric_version = main.increment_patch(previous[0]) if previous and previous[1] != rubric_json else (previous[0] if previous else "1.0.0")
        db.execute("INSERT INTO rubric_versions(case_id,case_version,rubric_version,rubric_json,content_hash,approved_by_user_id,created_at) VALUES(?,?,?,?,?,?,?)",
            (revised["id"], version, rubric_version, rubric_json, rubric_hash, "reviewer-1", stamp))
        db.execute("INSERT INTO approved_cases(case_id,version,payload,approved_by,approved_at) VALUES(?,?,?,?,?) ON CONFLICT(case_id) DO UPDATE SET version=excluded.version,payload=excluded.payload,approved_by=excluded.approved_by,approved_at=excluded.approved_at",
            (revised["id"], version, case_json, "Test Reviewer", stamp))
    return revised, rubric_version


def test_new_sessions_snapshot_case_and_rubric_versions(tmp_path, monkeypatch):
    client, db_path = isolated_client(tmp_path, monkeypatch)
    with client:
        case = dict(main.CASES["malaria-001"])
        started = client.post("/api/sessions", json={
            "learner": "Learner", "case_id": "malaria-001", "mode": "practice"})
        assert started.status_code == 200, started.text
        old = started.json()
        assert old["case_version"] == "1.0.0"
        with sqlite3.connect(db_path) as db:
            row = db.execute("SELECT case_version,rubric_version,case_snapshot,rubric_snapshot FROM sessions WHERE id=?",
                (old["session_id"],)).fetchone()
        assert row[0] == "1.0.0"
        assert json.loads(row[2])["opening"] == case["opening"]
        assert json.loads(row[3])["criteria"]

        revised, rubric_version = publish_revision(db_path, case, "1.0.1",
            "This is the revised opening for version 1.0.1.", case["expected_actions"] + ["Document response to treatment"])
        newer = client.post("/api/sessions", json={
            "learner": "Learner", "case_id": "malaria-001", "mode": "practice"})
        assert newer.status_code == 200, newer.text
        assert newer.json()["case_version"] == "1.0.1"
        assert newer.json()["opening"] == revised["opening"]
        with sqlite3.connect(db_path) as db:
            old_after = db.execute("SELECT case_version,case_snapshot,rubric_version FROM sessions WHERE id=?",
                (old["session_id"],)).fetchone()
            assert db.execute("SELECT COUNT(*) FROM case_versions WHERE case_id='malaria-001'").fetchone()[0] == 2
            assert db.execute("SELECT COUNT(*) FROM rubric_versions WHERE case_id='malaria-001'").fetchone()[0] >= 2
        assert old_after[0] == "1.0.0"
        assert json.loads(old_after[1])["opening"] == case["opening"]
        assert old_after[2] == "1.0.0"
        assert rubric_version == "1.0.1"


def test_exam_pins_case_and_rubric_versions_at_creation(tmp_path, monkeypatch):
    client, db_path = isolated_client(tmp_path, monkeypatch)
    with client:
        exam = client.post("/api/educator/exams", json={
            "title": "Pinned version exam", "case_id": "malaria-001", "duration": 20, "pass_mark": 70})
        assert exam.status_code == 200, exam.text
        exam_data = exam.json()
        assert exam_data["case_version"] == "1.0.0"
        case = dict(main.CASES["malaria-001"])
        revised, _ = publish_revision(db_path, case, "1.0.1",
            "New version should not alter this existing exam.", case["expected_actions"] + ["New action"])
        start = client.post("/api/sessions", json={
            "learner": "Exam Learner", "case_id": "malaria-001", "mode": "exam", "exam_code": exam_data["code"]})
        assert start.status_code == 200, start.text
        data = start.json()
        assert data["opening"] == case["opening"]
        assert data["case_id"] is None
        with sqlite3.connect(db_path) as db:
            row = db.execute("SELECT case_version,rubric_version,case_snapshot FROM sessions WHERE id=?",
                (data["session_id"],)).fetchone()
        assert row[0] == "1.0.0"
        assert json.loads(row[2])["opening"] != revised["opening"]


def test_case_version_history_does_not_overwrite_existing_payload(tmp_path, monkeypatch):
    client, db_path = isolated_client(tmp_path, monkeypatch)
    with client:
        client.post("/api/sessions", json={"learner": "Learner", "case_id": "malaria-001", "mode": "practice"})
        with sqlite3.connect(db_path) as db:
            original = db.execute("SELECT payload,content_hash FROM case_versions WHERE case_id=? AND version=?",
                ("malaria-001", "1.0.0")).fetchone()
        revised, _ = publish_revision(db_path, dict(main.CASES["malaria-001"]), "1.0.1",
            "Revised content", main.CASES["malaria-001"]["expected_actions"])
        with sqlite3.connect(db_path) as db:
            unchanged = db.execute("SELECT payload,content_hash FROM case_versions WHERE case_id=? AND version=?",
                ("malaria-001", "1.0.0")).fetchone()
        assert tuple(original) == tuple(unchanged)
        assert revised["version"] == "1.0.1"
