"""API tests for educator-authored, immutable rubric versions."""
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
    db_path = tmp_path / "rubric-authoring.db"
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
               ("inst-rubric", "Rubric University", "2026-01-01T00:00:00+00:00"))
    create_user(db, email="educator@rubric.example", display_name="Rubric Educator",
        password="rubric-educator-password", role="educator", institution_id="inst-rubric")
    db.commit()
    db.close()
    main.init_db()
    return db_path


def test_rubric_revision_is_immutable_and_new_exams_pin_latest(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        login = client.post("/api/auth/login", json={
            "email": "educator@rubric.example", "password": "rubric-educator-password"})
        assert login.status_code == 200, login.text
        headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        old_exam = client.post("/api/educator/exams", headers=headers, json={
            "title": "Exam with original rubric", "case_id": "malaria-001", "duration": 20, "pass_mark": 70})
        assert old_exam.status_code == 200, old_exam.text
        assert old_exam.json()["rubric_version"] == "1.0.0"

        base = main.rubric_for_case(main.CASES["malaria-001"])
        criteria = [dict(item) for item in base["criteria"]]
        criteria[0]["label"] = "Focused history, examination and red-flag recognition"
        revision = client.post("/api/educator/cases/malaria-001/rubrics", headers=headers, json={
            "case_version": "1.0.0", "criteria": criteria,
            "critical_failures": main.CASES["malaria-001"]["critical_errors"],
            "scoring_policy": "Formative rubric only; not validated for high-stakes use.",
            "review_notes": "Clarified history and red-flag assessment anchors."})
        assert revision.status_code == 200, revision.text
        assert revision.json()["rubric_version"] == "1.0.1"

        new_exam = client.post("/api/educator/exams", headers=headers, json={
            "title": "Exam with revised rubric", "case_id": "malaria-001", "duration": 20, "pass_mark": 70})
        assert new_exam.status_code == 200, new_exam.text
        assert new_exam.json()["rubric_version"] == "1.0.1"
        assert old_exam.json()["rubric_version"] == "1.0.0"

        detail = client.get("/api/educator/cases/malaria-001/versions/1.0.0", headers=headers)
        assert detail.status_code == 200, detail.text
        versions = detail.json()["rubric_versions"]
        assert [item["rubric_version"] for item in versions] == ["1.0.1", "1.0.0"]
        assert versions[0]["rubric"]["criteria"][0]["label"] == criteria[0]["label"]


def test_rubric_requires_100_percent_weights_and_known_critical_failures(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        login = client.post("/api/auth/login", json={
            "email": "educator@rubric.example", "password": "rubric-educator-password"})
        headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        base = main.rubric_for_case(main.CASES["malaria-001"])
        criteria = [dict(item) for item in base["criteria"]]
        criteria[0]["weight"] = 19
        response = client.post("/api/educator/cases/malaria-001/rubrics", headers=headers, json={
            "case_version": "1.0.0", "criteria": criteria, "critical_failures": [],
            "review_notes": "Test weight validation."})
        assert response.status_code == 422
        criteria = [dict(item) for item in base["criteria"]]
        response = client.post("/api/educator/cases/malaria-001/rubrics", headers=headers, json={
            "case_version": "1.0.0", "criteria": criteria,
            "critical_failures": ["invented safety failure"], "review_notes": "Test safety validation."})
        assert response.status_code == 422


def test_stale_case_version_cannot_receive_new_rubric(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        login = client.post("/api/auth/login", json={
            "email": "educator@rubric.example", "password": "rubric-educator-password"})
        headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        base = main.rubric_for_case(main.CASES["malaria-001"])
        response = client.post("/api/educator/cases/malaria-001/rubrics", headers=headers, json={
            "case_version": "0.9.0", "criteria": base["criteria"], "critical_failures": [],
            "review_notes": "Stale version must be rejected."})
        assert response.status_code == 409
