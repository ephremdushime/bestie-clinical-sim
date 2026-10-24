"""Tests for trusted-host account provisioning and account lifecycle controls."""
import sqlite3
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
from identity import create_user, init_identity_schema, verify_password
from identity_provision import create_institution, open_db, provision_user, set_user_status


def setup_db(tmp_path):
    path = tmp_path / "provisioning.db"
    db = open_db(path)
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("platform-home", "Platform", "2026-01-01T00:00:00+00:00"))
    create_user(db, email="admin@example.test", display_name="Platform Admin",
                password="platform-admin-password", role="platform_admin")
    db.commit()
    return db, path


def test_platform_admin_can_create_institution_and_provision_users(tmp_path):
    db, _ = setup_db(tmp_path)
    institution_id = create_institution(db, actor_email="admin@example.test",
        institution_id="university-a", name="University A")
    user_id = provision_user(db, actor_email="admin@example.test", email="student@example.test",
        display_name="Student A", password="student-password-long", role="learner",
        institution_id=institution_id)
    assert db.execute("SELECT status FROM institutions WHERE institution_id=?",
        (institution_id,)).fetchone()["status"] == "active"
    assert verify_password(db, "STUDENT@example.test", "student-password-long")["user_id"] == user_id
    event = db.execute("SELECT action FROM audit_events WHERE resource_id=? ORDER BY created_at DESC LIMIT 1",
        (user_id,)).fetchone()
    assert event["action"] == "user.provisioned"
    db.close()


def test_non_admin_or_disabled_admin_cannot_provision_accounts(tmp_path):
    db, _ = setup_db(tmp_path)
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("university-a", "University A", "2026-01-01T00:00:00+00:00"))
    create_user(db, email="educator@example.test", display_name="Educator",
        password="educator-password-long", role="educator", institution_id="university-a")
    db.commit()
    with pytest.raises(PermissionError):
        create_institution(db, actor_email="educator@example.test",
            institution_id="university-b", name="University B")
    db.execute("UPDATE users SET status='disabled' WHERE email_normalized='admin@example.test'")
    db.commit()
    with pytest.raises(PermissionError):
        provision_user(db, actor_email="admin@example.test", email="new@example.test",
            display_name="New User", password="new-user-password-long", role="learner",
            institution_id="university-a")
    db.close()


def test_provisioning_rejects_inactive_institutions_and_short_passwords(tmp_path):
    db, _ = setup_db(tmp_path)
    db.execute("INSERT INTO institutions(institution_id,name,status,created_at) VALUES(?,?,?,?)",
               ("suspended", "Suspended University", "suspended", "2026-01-01T00:00:00+00:00"))
    db.commit()
    with pytest.raises(ValueError):
        provision_user(db, actor_email="admin@example.test", email="student@example.test",
            display_name="Student", password="student-password-long", role="learner",
            institution_id="suspended")
    db.execute("INSERT INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
               ("university-a", "University A", "2026-01-01T00:00:00+00:00"))
    db.commit()
    with pytest.raises(ValueError):
        provision_user(db, actor_email="admin@example.test", email="student@example.test",
            display_name="Student", password="short", role="learner",
            institution_id="university-a")
    db.close()


def test_cannot_disable_last_platform_admin(tmp_path):
    db, _ = setup_db(tmp_path)
    with pytest.raises(ValueError):
        set_user_status(db, actor_email="admin@example.test",
            target_email="admin@example.test", status="disabled")
    db.close()
