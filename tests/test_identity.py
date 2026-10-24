"""Unit tests for identity/RBAC primitives; run with pytest."""
import sqlite3
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from identity import (
    create_user, has_permission, init_identity_schema, issue_session,
    resolve_session, revoke_session, verify_password, write_audit_event,
)


def setup_db():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    init_identity_schema(db)
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES('ur','University of Rwanda','now')")
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES('other','Other institution','now')")
    return db


def test_password_hash_login_and_generic_failure():
    db = setup_db()
    uid = create_user(db, email=" Student@Example.org ", display_name="Student",
                      password="a-strong-test-password", role="learner", institution_id="ur")
    row = db.execute("SELECT password_hash FROM users WHERE user_id=?", (uid,)).fetchone()
    assert row["password_hash"] != "a-strong-test-password"
    assert verify_password(db, "STUDENT@example.org", "a-strong-test-password")["user_id"] == uid
    assert verify_password(db, "student@example.org", "wrong-password") is None
    assert verify_password(db, "missing@example.org", "a-strong-test-password") is None


def test_role_and_institution_scope_are_both_required():
    db = setup_db()
    learner_id = create_user(db, email="l@example.org", display_name="Learner",
                             password="a-strong-test-password", role="learner", institution_id="ur")
    educator_id = create_user(db, email="e@example.org", display_name="Educator",
                              password="a-strong-test-password", role="educator", institution_id="ur")
    learner = db.execute("SELECT * FROM users WHERE user_id=?", (learner_id,)).fetchone()
    educator = db.execute("SELECT * FROM users WHERE user_id=?", (educator_id,)).fetchone()
    assert not has_permission(learner, "exam:manage", institution_id="ur")
    assert has_permission(educator, "exam:manage", institution_id="ur")
    assert not has_permission(educator, "exam:manage", institution_id="other")
    assert not has_permission(educator, "audit:read_all")


def test_sessions_store_only_token_hash_and_support_revocation():
    db = setup_db()
    uid = create_user(db, email="l@example.org", display_name="Learner",
                      password="a-strong-test-password", role="learner", institution_id="ur")
    token = issue_session(db, uid)
    stored = db.execute("SELECT token_hash FROM auth_sessions").fetchone()["token_hash"]
    assert token not in stored
    assert resolve_session(db, token)["user_id"] == uid
    assert revoke_session(db, token)
    assert resolve_session(db, token) is None
    assert not revoke_session(db, token)


def test_audit_event_records_actor_scope_and_outcome():
    db = setup_db()
    uid = create_user(db, email="e@example.org", display_name="Educator",
                      password="a-strong-test-password", role="educator", institution_id="ur")
    event_id = write_audit_event(db, actor_user_id=uid, institution_id="ur",
                                 action="case.review", resource_type="case_draft",
                                 resource_id="draft-1", outcome="success")
    row = db.execute("SELECT * FROM audit_events WHERE event_id=?", (event_id,)).fetchone()
    assert row["actor_user_id"] == uid
    assert row["institution_id"] == "ur"
    assert row["outcome"] == "success"



def test_audit_events_are_append_only():
    db = setup_db()
    event_id = write_audit_event(
        db, actor_user_id=None, institution_id="ur", action="security.test",
        resource_type="test", resource_id="immutable-1", outcome="success",
    )
    try:
        db.execute("UPDATE audit_events SET outcome='failure' WHERE event_id=?", (event_id,))
        assert False, "audit updates must be rejected"
    except sqlite3.IntegrityError:
        pass
    try:
        db.execute("DELETE FROM audit_events WHERE event_id=?", (event_id,))
        assert False, "audit deletion must be rejected"
    except sqlite3.IntegrityError:
        pass
    assert db.execute("SELECT outcome FROM audit_events WHERE event_id=?", (event_id,)).fetchone()["outcome"] == "success"


def test_password_policy_and_role_scope_validation():
    db = setup_db()
    try:
        create_user(db, email="l@example.org", display_name="Learner", password="short",
                    role="learner", institution_id="ur")
        assert False, "weak password should fail"
    except ValueError:
        pass
    try:
        create_user(db, email="e@example.org", display_name="Educator",
                    password="a-strong-test-password", role="educator")
        assert False, "institution-scoped role without institution should fail"
    except ValueError:
        pass


def test_suspended_institution_disables_password_login_and_existing_sessions():
    db = setup_db()
    uid = create_user(
        db, email="suspended@example.org", display_name="Suspended Learner",
        password="a-strong-test-password", role="learner", institution_id="ur",
    )
    token = issue_session(db, uid)
    db.execute("UPDATE institutions SET status='suspended' WHERE institution_id='ur'")
    assert verify_password(db, "suspended@example.org", "a-strong-test-password") is None
    assert resolve_session(db, token) is None
