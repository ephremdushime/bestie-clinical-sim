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




def test_institution_scoped_auth_rejects_missing_or_suspended_tenant(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    from identity import create_user, issue_session, resolve_session, verify_password
    with main.conn() as db:
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-auth", "Auth Institution", main.now()))
        user_id = create_user(
            db, email="tenant-user@example.test", display_name="Tenant User",
            password="long-test-password-123", role="educator",
            institution_id="institution-auth",
        )
        db.commit()
        assert verify_password(db, "tenant-user@example.test", "long-test-password-123") is not None
        token = issue_session(db, user_id)
        db.execute("UPDATE institutions SET status='suspended' WHERE institution_id='institution-auth'")
        db.commit()
        assert verify_password(db, "tenant-user@example.test", "long-test-password-123") is None
        assert resolve_session(db, token) is None

        db.execute("UPDATE institutions SET status='active' WHERE institution_id='institution-auth'")
        db.execute("UPDATE users SET institution_id=NULL WHERE user_id=?", (user_id,))
        db.commit()
        assert verify_password(db, "tenant-user@example.test", "long-test-password-123") is None
        assert resolve_session(db, token) is None


def test_database_bootstrap_initializes_identity_and_institution_schema(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        tables = {row["name"] for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}
        assert {"institutions", "users", "auth_sessions", "audit_events"} <= tables
        columns = {row["name"] for row in db.execute("PRAGMA table_info(institutions)")}
        assert {"institution_id", "name", "status", "created_at"} <= columns


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
        learner_id = create_user(
            db, email="legacy-student@example.test", display_name="Legacy Student",
            password="legacy-student-long-password", role="learner", institution_id="institution-a",
        )
        db.execute(
            "INSERT INTO sessions(learner,case_id,mode,created_at,status,events,report,owner_user_id) VALUES(?,?,?,?,?,?,?,?)",
            ("Legacy Student", "malaria-001", "practice", main.now(), "completed", "[]", "{}", learner_id),
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
                "evidence_reference": "RECON-2026-0042 / archived placement log",
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
                "evidence_reference": "RECON-2026-0042 / archived placement log",
            },
        )
        assert duplicate.status_code == 409


def test_ownerless_historical_records_stay_quarantined(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    from identity import create_user, init_identity_schema
    with main.conn() as db:
        init_identity_schema(db)
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-a", "Institution A", main.now()))
        admin_id = create_user(db, email="platform-admin-quarantine@example.test",
            display_name="Platform Admin", password="platform-admin-long-password", role="platform_admin")
        db.execute("INSERT INTO sessions(learner,case_id,mode,created_at,status,events,report) VALUES(?,?,?,?,?,?,?)",
            ("Unassigned Legacy Student", "malaria-001", "practice", main.now(), "completed", "[]", "{}"))
        db.commit()
    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity(admin_id, None, role="platform_admin"))
        response = client.post("/api/platform-admin/ownership-reconciliation", json={
            "resource_type": "session", "resource_id": "1", "institution_id": "institution-a",
            "reason": "The archived source is not yet attributable to a verified institution.",
            "evidence_reference": "RECON-2026-UNKNOWN",
        })
        assert response.status_code == 409, response.text
        assert "keep this record quarantined" in response.json()["detail"]
        queue = client.get("/api/platform-admin/ownership-reconciliation")
        assert queue.status_code == 200, queue.text
        assert queue.json()["counts"]["sessions"] == 1


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
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-a", "Institution A", main.now()))
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



def test_production_exam_session_rejects_mismatched_exam_version_pins(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute(
            "INSERT INTO exams(code,title,case_id,duration,pass_mark,created_at,status,creator,case_version,rubric_version,institution_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ("PINNED-EXAM", "Pinned exam", "malaria-001", 20, 70, main.now(), "open",
             "Educator", "1.0.0", main.RUBRIC_VERSION, "institution-a"),
        )
        exam_id = db.execute("SELECT id FROM exams WHERE code='PINNED-EXAM'").fetchone()["id"]
        session = {
            "mode": "exam", "exam_id": exam_id, "case_id": "malaria-001",
            "case_version": "1.0.0", "rubric_version": main.RUBRIC_VERSION,
            "institution_id": "institution-a",
        }
        assert main.case_for_session(db, session)["id"] == "malaria-001"
        db.execute("UPDATE exams SET case_version='1.1.0' WHERE id=?", (exam_id,))
        db.commit()
        with pytest.raises(HTTPException) as exc:
            main.case_for_session(db, session)
        assert exc.value.status_code == 409
        assert "version pins do not match" in exc.value.detail


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

def test_published_cases_are_not_visible_or_usable_across_institutions(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    # Production tenant checks depend on the identity/institution schema; initialize
    # it explicitly so this isolation test exercises authorization, not missing DDL.
    from identity import init_identity_schema
    with main.conn() as db:
        init_identity_schema(db)
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-a", "Institution A", main.now()))
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-b", "Institution B", main.now()))
        db.commit()
    private_case = {
        "id": "generated-institution-b", "version": "1.0.0", "title": "Institution B private case",
        "specialty": "Internal medicine", "level": "Clinical-year student", "age": 30,
        "sex": "adult woman", "appearance": "Fictional patient", "opening": "I feel unwell.",
        "diagnosis": "Private teaching diagnosis", "vitals": {}, "facts": {},
        "investigations": {"fbc": {"name": "FBC", "result": "Fictional result",
            "interpretation": "Fictional interpretation", "appropriate": True, "why": "Indicated"}},
        "expected_differentials": [], "expected_actions": [], "critical_errors": [],
    }
    with main.conn() as db:
        db.execute(
            "INSERT INTO approved_cases(case_id,version,payload,approved_by,approved_at,institution_id) VALUES(?,?,?,?,?,?)",
            (private_case["id"], private_case["version"], main.canonical_json(private_case),
             "Institution B Educator", main.now(), "institution-b"),
        )
        db.execute(
            "INSERT INTO case_versions(case_id,version,payload,approved_by,approved_by_user_id,approved_at,change_note,content_hash,institution_id) VALUES(?,?,?,?,?,?,?,?,?)",
            (private_case["id"], private_case["version"], main.canonical_json(private_case),
             "Institution B Educator", "educator-b", main.now(), "Reviewed case",
             main.content_digest(private_case), "institution-b"),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity("educator-a", "institution-a"))
        catalogue = client.get("/api/cases", headers={"Authorization": "Bearer test"})
        assert catalogue.status_code == 200, catalogue.text
        assert private_case["id"] not in {item["id"] for item in catalogue.json()["cases"]}

        session = client.post("/api/sessions", headers={"Authorization": "Bearer test"},
            json={"case_id": private_case["id"], "mode": "practice"})
        assert session.status_code == 404, session.text

        exam = client.post("/api/educator/exams", headers={"Authorization": "Bearer test"},
            json={"title": "Cross-tenant attempt", "case_id": private_case["id"]})
        assert exam.status_code == 404, exam.text

        history = client.get(f"/api/educator/cases/{private_case['id']}/versions",
            headers={"Authorization": "Bearer test"})
        assert history.status_code == 404, history.text


def test_unassigned_published_case_reconciliation_assigns_case_and_versions_with_audit(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    from identity import create_user, init_identity_schema
    case_payload = {
        "id": "legacy-approved-case", "version": "1.0.0", "title": "Legacy approved case",
        "diagnosis": "Fictional diagnosis", "investigations": {},
    }
    with main.conn() as db:
        init_identity_schema(db)
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-a", "Institution A", main.now()))
        admin_id = create_user(db, email="case-reconcile-admin@example.test",
            display_name="Platform Admin", password="case-reconcile-admin-password",
            role="platform_admin")
        db.execute(
            "INSERT INTO approved_cases(case_id,version,payload,approved_by,approved_at) VALUES(?,?,?,?,?)",
            (case_payload["id"], "1.0.0", main.canonical_json(case_payload), "Legacy reviewer", main.now()),
        )
        db.execute(
            "INSERT INTO case_versions(case_id,version,payload,approved_by,approved_by_user_id,approved_at,change_note,content_hash) VALUES(?,?,?,?,?,?,?,?)",
            (case_payload["id"], "1.0.0", main.canonical_json(case_payload), "Legacy reviewer",
             None, main.now(), "Legacy version", main.content_digest(case_payload)),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity(admin_id, None, role="platform_admin"))
        queue = client.get("/api/platform-admin/ownership-reconciliation")
        assert queue.status_code == 200, queue.text
        assert queue.json()["counts"]["approved_cases"] == 1

        result = client.post("/api/platform-admin/ownership-reconciliation", json={
            "resource_type": "approved_case", "resource_id": case_payload["id"],
            "institution_id": "institution-a",
            "reason": "Archived curriculum approval record confirms institution ownership.",
        })
        assert result.status_code == 200, result.text

        with main.conn() as db:
            approved = db.execute("SELECT institution_id FROM approved_cases WHERE case_id=?",
                (case_payload["id"],)).fetchone()
            version = db.execute("SELECT institution_id FROM case_versions WHERE case_id=? AND version='1.0.0'",
                (case_payload["id"],)).fetchone()
            audit = db.execute("SELECT action,outcome FROM audit_events WHERE action='ownership.reconciled' AND resource_type='approved_case'").fetchone()
            assert approved["institution_id"] == "institution-a"
            assert version["institution_id"] == "institution-a"
            assert audit["outcome"] == "success"


def test_production_publication_fails_closed_when_creator_attribution_is_missing(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    draft = {
        "draft_id": "legacy-draft-no-creator", "status": "reviewed_not_approved",
        "topic": "Legacy case", "specialty": "General medicine",
        "case": {
            "id": "legacy-case-no-creator", "title": "Legacy case",
            "diagnosis": "Fictional diagnosis",
            "investigations": {
                "fbc": {"name": "FBC", "result": "Fictional result", "interpretation": "Fictional interpretation"},
                "glucose": {"name": "Glucose", "result": "Fictional result", "interpretation": "Fictional interpretation"},
            },
        },
        "review": {"reviewer_user_id": "reviewer-a", "notes": "Independent review completed."},
    }
    with main.conn() as db:
        db.execute(
            "INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,updated_at,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?)",
            (draft["draft_id"], draft["topic"], draft["specialty"], draft["status"],
             main.canonical_json(draft), main.now(), main.now(), "institution-a", None),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity("approver-a", "institution-a"))
        response = client.post(
            f"/api/educator/case-drafts/{draft['draft_id']}/approve-and-publish",
            json={"review_notes": "Publication attestation after independent review."},
        )
        assert response.status_code == 409, response.text
        assert "creator attribution is missing" in response.json()["detail"]
        with main.conn() as db:
            assert db.execute("SELECT COUNT(*) n FROM approved_cases").fetchone()["n"] == 0


def test_production_case_publication_stays_with_originating_institution(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with main.conn() as db:
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-a", "Institution A", main.now()))
        db.commit()
    case_payload = {
        "id": "generated-institution-a-private", "version": "0.1.0-draft",
        "title": "Institution A teaching case", "specialty": "Internal medicine",
        "level": "Clinical-year student", "age": 28, "sex": "adult man",
        "appearance": "Fictional adult patient", "opening": "I have felt unwell.",
        "diagnosis": "Fictional teaching diagnosis", "vitals": {},
        "facts": {"onset": "Started today", "symptoms": "Fictional symptoms",
                  "history": "No known allergies", "risk": "No known risk", "exam": "Stable"},
        "investigations": {
            "fbc": {"name": "Full blood count", "result": "Fictional result A",
                    "interpretation": "Fictional interpretation A", "appropriate": True, "why": "Indicated"},
            "glucose": {"name": "Blood glucose", "result": "Fictional result B",
                        "interpretation": "Fictional interpretation B", "appropriate": True, "why": "Indicated"},
        },
        "expected_differentials": ["diagnosis A", "diagnosis B"],
        "expected_actions": ["assess", "review"],
        "critical_errors": [], "marking_rubric": [],
    }
    draft = {
        "draft_id": "draft-private-publication", "status": "reviewed_not_approved",
        "topic": "Institution A teaching case", "specialty": "Internal medicine",
        "case": case_payload, "generation_mode": "llm_with_evidence_retrieval",
        "review": {"reviewer": "Reviewer A", "reviewer_user_id": "reviewer-a",
                   "notes": "Reviewed case consistency and investigation indications.", "reviewed_at": main.now()},
    }
    with main.conn() as db:
        db.execute(
            "INSERT INTO case_drafts(draft_id,topic,specialty,status,payload,created_at,updated_at,institution_id,creator_user_id) VALUES(?,?,?,?,?,?,?,?,?)",
            (draft["draft_id"], draft["topic"], draft["specialty"], draft["status"],
             main.canonical_json(draft), main.now(), main.now(), "institution-a", "creator-a"),
        )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity("approver-a", "institution-a"))
        published = client.post(
            f"/api/educator/case-drafts/{draft['draft_id']}/approve-and-publish",
            json={"review_notes": "Independent approval after checking case consistency."},
        )
        assert published.status_code == 200, published.text
        case_id = published.json()["case_id"]
        assert case_id not in main.CASES

        same_institution = client.get("/api/cases", headers={"Authorization": "Bearer test"})
        assert case_id in {item["id"] for item in same_institution.json()["cases"]}

        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity("educator-b", "institution-b"))
        other_institution = client.get("/api/cases", headers={"Authorization": "Bearer test"})
        assert case_id not in {item["id"] for item in other_institution.json()["cases"]}
        history = client.get(f"/api/educator/cases/{case_id}/versions",
            headers={"Authorization": "Bearer test"})
        assert history.status_code == 404

def test_production_exam_creation_requires_active_tenant_and_blocks_cross_tenant_assignment(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    from identity import init_identity_schema
    with main.conn() as db:
        init_identity_schema(db)
        for institution_id, name in (("institution-a", "Institution A"), ("institution-b", "Institution B")):
            db.execute(
                "INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                (institution_id, name, main.now()),
            )
        db.commit()

    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity("educator-a", "institution-a"))
        created = client.post("/api/educator/exams", headers={"Authorization": "Bearer test"},
            json={"title": "Institution A assessment", "case_id": "malaria-001"})
        assert created.status_code == 200, created.text
        assert created.json()["institution_id"] == "institution-a"

        cross_tenant = client.post("/api/educator/exams", headers={"Authorization": "Bearer test"},
            json={"title": "Misassigned assessment", "case_id": "malaria-001",
                  "institution_id": "institution-b"})
        assert cross_tenant.status_code == 403, cross_tenant.text

        missing_tenant = client.post("/api/educator/exams", headers={"Authorization": "Bearer test"},
            json={"title": "Unassigned assessment", "case_id": "malaria-001",
                  "institution_id": "missing-institution"})
        assert missing_tenant.status_code == 403, missing_tenant.text


def test_production_platform_admin_must_select_an_active_institution_for_exam(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    from identity import init_identity_schema
    with main.conn() as db:
        init_identity_schema(db)
        db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
                   ("institution-a", "Institution A", main.now()))
        db.commit()
    with TestClient(main.app) as client:
        monkeypatch.setattr(main, "current_identity_user",
            lambda request: identity("platform-admin", None, role="platform_admin"))
        missing = client.post("/api/educator/exams", headers={"Authorization": "Bearer test"},
            json={"title": "Unassigned admin exam", "case_id": "malaria-001"})
        assert missing.status_code == 422, missing.text

        invalid = client.post("/api/educator/exams", headers={"Authorization": "Bearer test"},
            json={"title": "Invalid institution exam", "case_id": "malaria-001",
                  "institution_id": "missing-institution"})
        assert invalid.status_code == 422, invalid.text

        assigned = client.post("/api/educator/exams", headers={"Authorization": "Bearer test"},
            json={"title": "Assigned admin exam", "case_id": "malaria-001",
                  "institution_id": "institution-a"})
        assert assigned.status_code == 200, assigned.text
        assert assigned.json()["institution_id"] == "institution-a"
