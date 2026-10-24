"""Regression tests for tenant isolation in educator and learner workflows."""
import sys
import pytest
from fastapi import HTTPException
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



def test_legacy_development_exam_closure_remains_compatible(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    monkeypatch.setattr(main, "APP_ENV", "development")
    with main.conn() as db:
        db.execute(
            "INSERT INTO exams(code,title,case_id,duration,pass_mark,created_at,status,creator) VALUES(?,?,?,?,?,?,?,?)",
            ("LEGACY-EXAM", "Legacy exam", "malaria-001", 20, 70, main.now(), "open", "Legacy educator"),
        )
        db.commit()

    with TestClient(main.app) as client:
        response = client.post("/api/educator/exams/1/close")
        assert response.status_code == 200, response.text
        assert response.json()["closed"] is True


def test_legacy_ownership_reconciliation_requires_platform_admin_and_writes_audit(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    from identity import create_user, init_identity_schema
    with main.conn() as db:
        init_identity_schema(db)
        db.execute(
            "INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
            ("institution-a", "Institution A", main.now()),
        )
        admin_id = create_user(
            db, email="platform-admin@example.test", display_name="Platform Admin",
            password="platform-admin-long-password", role="platform_admin",
        )
        db.execute(
            "INSERT INTO sessions(learner,case_id,mode,created_at,status,events,report) VALUES(?,?,?,?,?,?,?)",
            ("Legacy Student", "malaria-001", "practice", main.now(), "completed", "[]", "{}"),
        )
        db.execute(
            "INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
            ("legacy-draft", "Legacy topic", "General medicine", "draft", '{"case":{}}', main.now(), main.now()),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(
            main, "current_identity_user",
            lambda request: identity(admin_id, None, role="platform_admin"),
        )
        queue = client.get("/api/platform-admin/ownership-reconciliation")
        assert queue.status_code == 200, queue.text
        assert queue.json()["counts"]["sessions"] == 1
        assert queue.json()["counts"]["case_drafts"] == 1

        assigned = client.post(
            "/api/platform-admin/ownership-reconciliation",
            json={
                "resource_type": "session",
                "resource_id": "1",
                "institution_id": "institution-a",
                "reason": "Institution registry and archived placement log confirm ownership.",
            },
        )
        assert assigned.status_code == 200, assigned.text
        assert assigned.json()["audit_recorded"] is True

        with main.conn() as db:
            row = db.execute("SELECT institution_id FROM sessions WHERE id=1").fetchone()
            audit = db.execute(
                "SELECT actor_user_id,action,resource_type,resource_id,outcome,metadata_json FROM audit_events WHERE action='ownership.reconciled'"
            ).fetchone()
            assert row["institution_id"] == "institution-a"
            assert audit["actor_user_id"] == admin_id
            assert audit["resource_type"] == "session"
            assert audit["resource_id"] == "1"
            assert audit["outcome"] == "success"
            assert "archived placement log" in audit["metadata_json"]

        duplicate = client.post(
            "/api/platform-admin/ownership-reconciliation",
            json={
                "resource_type": "session",
                "resource_id": "1",
                "institution_id": "institution-a",
                "reason": "Trying to repeat an already completed ownership assignment.",
            },
        )
        assert duplicate.status_code == 409


def test_ownership_reconciliation_rejects_non_platform_admin(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        monkeypatch.setattr(
            main, "current_identity_user",
            lambda request: identity("educator-a", "institution-a", role="educator"),
        )
        response = client.post(
            "/api/platform-admin/ownership-reconciliation",
            json={
                "resource_type": "session",
                "resource_id": "1",
                "institution_id": "institution-a",
                "reason": "Documented ownership evidence from archived records.",
            },
        )
        assert response.status_code == 403


def test_production_case_review_and_publication_require_separate_people(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute(
            "INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,updated_at,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?)",
            ("draft-separation", "Test topic", "General medicine", "draft", '{"case":{}}',
             main.now(), main.now(), "institution-a", "creator-user"),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(
            main, "current_identity_user",
            lambda request: identity("creator-user", "institution-a", role="educator"),
        )
        self_review = client.post(
            "/api/educator/case-drafts/draft-separation/review",
            json={"review_notes": "The creator tries to review their own case."},
        )
        assert self_review.status_code == 403

        monkeypatch.setattr(
            main, "current_identity_user",
            lambda request: identity("reviewer-user", "institution-a", role="educator"),
        )
        review = client.post(
            "/api/educator/case-drafts/draft-separation/review",
            json={"review_notes": "Reviewed for internal consistency; clinical details still require completion."},
        )
        assert review.status_code == 200, review.text

        same_person_publish = client.post(
            "/api/educator/case-drafts/draft-separation/approve-and-publish",
            json={"review_notes": "I reviewed and approve this case."},
        )
        assert same_person_publish.status_code == 403

        monkeypatch.setattr(
            main, "current_identity_user",
            lambda request: identity("approver-user", "institution-a", role="educator"),
        )
        different_person_publish = client.post(
            "/api/educator/case-drafts/draft-separation/approve-and-publish",
            json={"review_notes": "Independent publication attestation."},
        )
        # Independence passes, but the deliberately incomplete draft must still fail validation.
        assert different_person_publish.status_code == 422


def test_tampered_pinned_case_snapshot_is_rejected_without_substitution(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute(
            "UPDATE case_versions SET payload=? WHERE case_id=? AND version=?",
            ('{"id":"malaria-001","version":"1.0.0","diagnosis":"tampered"}', "malaria-001", "1.0.0"),
        )
        db.commit()
        with pytest.raises(HTTPException) as exc:
            main.case_for_session(
                db,
                {"case_id": "malaria-001", "case_version": "1.0.0"},
            )
        assert exc.value.status_code == 409
        assert "integrity check" in exc.value.detail


def test_session_without_pinned_version_fails_closed(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        with pytest.raises(HTTPException) as exc:
            main.case_for_session(db, {"case_id": "malaria-001", "case_version": None})
        assert exc.value.status_code == 409
        assert "no pinned case version" in exc.value.detail

def test_tampered_pinned_rubric_snapshot_is_rejected_without_substitution(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute(
            "UPDATE rubric_versions SET payload=? WHERE case_id=? AND case_version=? AND rubric_version=?",
            ('{"version":"tampered","domains":[]}', "malaria-001", "1.0.0", main.RUBRIC_VERSION),
        )
        db.commit()
        with pytest.raises(HTTPException) as exc:
            main.rubric_for_session(
                db,
                {"case_id": "malaria-001", "case_version": "1.0.0",
                 "rubric_version": main.RUBRIC_VERSION},
            )
        assert exc.value.status_code == 409
        assert "integrity check" in exc.value.detail


def test_session_without_pinned_rubric_version_fails_closed(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        with pytest.raises(HTTPException) as exc:
            main.rubric_for_session(
                db,
                {"case_id": "malaria-001", "case_version": "1.0.0",
                 "rubric_version": None},
            )
        assert exc.value.status_code == 409
        assert "no pinned rubric version" in exc.value.detail
