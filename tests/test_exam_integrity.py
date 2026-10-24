"""Production exam identity, institution boundary and duplicate-attempt tests."""
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
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "p" * 40)
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "e" * 40)
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    for iid, name in [("inst-a", "Institution A"), ("inst-b", "Institution B")]:
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   (iid, name, "2026-01-01T00:00:00+00:00"))
    create_user(db, email="educator@exam.example", display_name="Educator A",
                password="educator-password-long", role="educator", institution_id="inst-a")
    create_user(db, email="educator@other.example", display_name="Educator B",
                password="other-educator-password-long", role="educator", institution_id="inst-b")
    create_user(db, email="learner@exam.example", display_name="Learner A",
                password="learner-password-long", role="learner", institution_id="inst-a")
    create_user(db, email="learner@other.example", display_name="Learner B",
                password="other-learner-password-long", role="learner", institution_id="inst-b")
    db.commit()
    db.close()
    main.init_db()


def get_token(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_production_exam_requires_learner_identity_and_prevents_duplicate_attempts(tmp_path, monkeypatch):
    provision(tmp_path / "exam-integrity.db", monkeypatch)
    with TestClient(main.app) as client:
        educator = get_token(client, "educator@exam.example", "educator-password-long")
        learner = get_token(client, "learner@exam.example", "learner-password-long")
        other = get_token(client, "learner@other.example", "other-learner-password-long")
        created = client.post("/api/educator/exams", headers={
            "Authorization": f"Bearer {educator}"
        }, json={"title": "Institution-bound exam", "case_id": "malaria-001",
                 "duration": 5, "pass_mark": 70})
        assert created.status_code == 200, created.text
        code = created.json()["code"]

        other_educator = get_token(client, "educator@other.example", "other-educator-password-long")
        other_exam = client.post("/api/educator/exams", headers={
            "Authorization": f"Bearer {other_educator}"
        }, json={"title": "Institution B exam", "case_id": "trauma-001",
                 "duration": 5, "pass_mark": 70})
        assert other_exam.status_code == 200, other_exam.text

        dashboard_a = client.get("/api/educator/dashboard", headers={
            "Authorization": f"Bearer {educator}"
        })
        assert dashboard_a.status_code == 200
        assert all(item["id"] != other_exam.json()["id"] for item in dashboard_a.json()["exams"])
        cross_close = client.post(f"/api/educator/exams/{other_exam.json()['id']}/close", headers={
            "Authorization": f"Bearer {educator}"
        })
        assert cross_close.status_code == 404

        assert client.post("/api/sessions", json={
            "learner": "Anonymous", "case_id": "malaria-001", "mode": "exam",
            "exam_code": code,
        }).status_code == 401

        wrong_institution = client.post("/api/sessions", headers={
            "Authorization": f"Bearer {other}"
        }, json={"learner": "Forged", "case_id": "malaria-001", "mode": "exam",
                 "exam_code": code})
        assert wrong_institution.status_code == 403, wrong_institution.text

        headers = {"Authorization": f"Bearer {learner}"}
        first = client.post("/api/sessions", headers=headers, json={
            "learner": "Forged Learner", "case_id": "trauma-001", "mode": "exam",
            "exam_code": code,
        })
        assert first.status_code == 200, first.text
        assert first.json()["case_id"] is None
        second = client.post("/api/sessions", headers=headers, json={
            "learner": "Learner A", "case_id": "malaria-001", "mode": "exam",
            "exam_code": code,
        })
        assert second.status_code == 409, second.text
