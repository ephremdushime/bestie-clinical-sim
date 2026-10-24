"""Regression tests for tenant isolation in educator and learner workflows."""
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main


def setup_db(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "tenant-isolation.db")
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setattr(main, "PILOT_TOKEN", "tenant-test-pilot-token-0123456789-abcdef")
    monkeypatch.setattr(main, "EDUCATOR_TOKEN", "tenant-test-educator-token-0123456789-abcdef")
    monkeypatch.setenv("CORS_ORIGINS", "https://pilot.example.org")
    monkeypatch.setattr(main, "validate_production_configuration", lambda: None)
    
    main.init_db()
    main.ensure_version_snapshots()


def identity(user_id, institution_id, role="educator"):
    return {
        "user_id": user_id,
        "institution_id": institution_id,
        "display_name": user_id,
        "role": role,
    }


def test_educator_dashboard_is_limited_to_own_institution(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute(
            "INSERT INTO exams(code,title,case_id,duration,pass_mark,created_at,status,creator,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("A-EXAM", "Institution A exam", "malaria-001", 20, 70, main.now(), "open", "a", "institution-a", "a"),
        )
        db.execute(
            "INSERT INTO exams(code,title,case_id,duration,pass_mark,created_at,status,creator,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("B-EXAM", "Institution B exam", "malaria-001", 20, 70, main.now(), "open", "b", "institution-b", "b"),
        )
        db.execute(
            "INSERT INTO sessions(learner,case_id,mode,exam_id,created_at,status,events,report,institution_id) VALUES(?,?,?,?,?,?,?,?,?)",
            ("Student A", "malaria-001", "practice", None, main.now(), "completed", "[]", "{}", "institution-a"),
        )
        db.execute(
            "INSERT INTO sessions(learner,case_id,mode,exam_id,created_at,status,events,report,institution_id) VALUES(?,?,?,?,?,?,?,?,?)",
            ("Student B", "malaria-001", "practice", None, main.now(), "completed", "[]", "{}", "institution-b"),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user", lambda request: identity("educator-a", "institution-a"))
        response = client.get("/api/educator/dashboard", headers={"Authorization": "Bearer test"})
        assert response.status_code == 200, response.text
        payload = response.json()
        assert all(row["title"] == "Institution A exam" for row in payload["exams"])
        assert {row["learner"] for row in payload["sessions"]} == {"Student A"}
        assert {row["title"] for row in payload["exams"]} == {"Institution A exam"}

        # Guessed IDs must not allow closing another institution's exam.
        response = client.post("/api/educator/exams/2/close", headers={"Authorization": "Bearer test"})
        assert response.status_code == 404, response.text


def test_case_drafts_are_scoped_for_list_review_and_publish(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        for draft_id, institution in (("draft-a", "institution-a"), ("draft-b", "institution-b")):
            db.execute(
                "INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,updated_at,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?)",
                (draft_id, "Topic", "General medicine", "draft", '{"case":{}}', main.now(), main.now(), institution, institution + "-user"),
            )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user", lambda request: identity("educator-a", "institution-a"))
        listed = client.get("/api/educator/case-drafts", headers={"Authorization": "Bearer test"})
        assert listed.status_code == 200, listed.text
        assert {draft["draft_id"] for draft in listed.json()["drafts"]} == {"draft-a"}

        review = client.post(
            "/api/educator/case-drafts/draft-b/review",
            json={"reviewer": "Educator A", "review_notes": "Review"},
            headers={"Authorization": "Bearer test"},
        )
        assert review.status_code == 404, review.text

        publish = client.post(
            "/api/educator/case-drafts/draft-b/approve-and-publish",
            json={"reviewer": "Educator A", "review_notes": "Review"},
            headers={"Authorization": "Bearer test"},
        )
        assert publish.status_code == 404, publish.text


def test_educator_cannot_access_learner_session_from_another_institution(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute(
            "INSERT INTO sessions(learner,case_id,mode,created_at,status,events,report,owner_user_id,institution_id) VALUES(?,?,?,?,?,?,?,?,?)",
            ("Student B", "malaria-001", "practice", main.now(), "active", "[]", None, "learner-b", "institution-b"),
        )
        db.commit()
    session_id = 1
    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user", lambda request: identity("educator-a", "institution-a"))
        response = client.post(
            f"/api/sessions/{session_id}/chat",
            json={"message": "Tell me about your symptoms"},
            headers={"Authorization": "Bearer test"},
        )
        assert response.status_code == 403, response.text

def test_exam_close_requires_creator_or_institution_admin(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute(
            "INSERT INTO exams(code,title,case_id,duration,pass_mark,created_at,status,creator,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("OWNED-EXAM", "Owned exam", "malaria-001", 20, 70, main.now(), "open", "creator", "institution-a", "educator-owner"),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user", lambda request: identity("educator-other", "institution-a"))
        denied = client.post("/api/educator/exams/1/close", headers={"Authorization": "Bearer test"})
        assert denied.status_code == 403, denied.text

        monkeypatch.setattr(
            main, "current_identity_user",
            lambda request: identity("institution-admin", "institution-a", role="institution_admin"),
        )
        allowed = client.post("/api/educator/exams/1/close", headers={"Authorization": "Bearer test"})
        assert allowed.status_code == 200, allowed.text
        assert allowed.json()["closed"] is True

