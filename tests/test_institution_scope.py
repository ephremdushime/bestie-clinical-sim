"""Cross-institution access controls for educator dashboards and learner sessions."""
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
    db_path = tmp_path / "institution-scope.db"
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
    for inst in ("inst-a", "inst-b"):
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   (inst, inst.upper(), "2026-01-01T00:00:00+00:00"))
        create_user(db, email=f"educator@{inst}.example", display_name=f"Educator {inst}",
            password=f"educator-password-{inst}", role="educator", institution_id=inst)
        create_user(db, email=f"learner@{inst}.example", display_name=f"Learner {inst}",
            password=f"learner-password-{inst}", role="learner", institution_id=inst)
    db.commit()
    db.close()
    main.init_db()
    return db_path


def login(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_educator_dashboard_only_returns_own_institution_records(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator_a = login(client, "educator@inst-a.example", "educator-password-inst-a")
        educator_b = login(client, "educator@inst-b.example", "educator-password-inst-b")
        learner_a = login(client, "learner@inst-a.example", "learner-password-inst-a")
        learner_b = login(client, "learner@inst-b.example", "learner-password-inst-b")
        session_a = client.post("/api/sessions", headers=learner_a, json={
            "learner": "Forged A", "case_id": "malaria-001", "mode": "practice"})
        session_b = client.post("/api/sessions", headers=learner_b, json={
            "learner": "Forged B", "case_id": "malaria-001", "mode": "practice"})
        assert session_a.status_code == 200 and session_b.status_code == 200
        exam_a = client.post("/api/educator/exams", headers=educator_a, json={
            "title": "Institution A exam", "case_id": "malaria-001", "duration": 20, "pass_mark": 70})
        exam_b = client.post("/api/educator/exams", headers=educator_b, json={
            "title": "Institution B secret exam", "case_id": "malaria-001", "duration": 20, "pass_mark": 70})
        assert exam_a.status_code == 200 and exam_b.status_code == 200

        dashboard = client.get("/api/educator/dashboard", headers=educator_a)
        assert dashboard.status_code == 200, dashboard.text
        data = dashboard.json()
        session_ids = {row["id"] for row in data["sessions"]}
        exam_codes = {row["code"] for row in data["exams"]}
        assert session_a.json()["session_id"] in session_ids
        assert session_b.json()["session_id"] not in session_ids
        assert exam_a.json()["code"] in exam_codes
        assert exam_b.json()["code"] not in exam_codes
        assert data["total_sessions"] == 1


def test_educator_cannot_access_another_institutions_learner_session_or_exam(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        educator_a = login(client, "educator@inst-a.example", "educator-password-inst-a")
        educator_b = login(client, "educator@inst-b.example", "educator-password-inst-b")
        learner_b = login(client, "learner@inst-b.example", "learner-password-inst-b")
        session_b = client.post("/api/sessions", headers=learner_b, json={
            "learner": "Learner B", "case_id": "malaria-001", "mode": "practice"})
        assert session_b.status_code == 200
        sid = session_b.json()["session_id"]
        forbidden = client.post(f"/api/sessions/{sid}/chat", headers=educator_a,
            json={"message": "When did it start?"})
        assert forbidden.status_code == 403
        allowed = client.post(f"/api/sessions/{sid}/chat", headers=educator_b,
            json={"message": "When did it start?"})
        assert allowed.status_code == 200, allowed.text

        exam_b = client.post("/api/educator/exams", headers=educator_b, json={
            "title": "Institution B exam", "case_id": "malaria-001", "duration": 20, "pass_mark": 70})
        assert exam_b.status_code == 200
        close = client.post(f"/api/educator/exams/{exam_b.json()["id"]}/close",
            headers=educator_a, json={})
        assert close.status_code == 403
