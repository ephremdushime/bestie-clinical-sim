"""Tenant-safe account provisioning and lifecycle tests."""
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main
import auth_routes
import admin_routes
from identity import create_user, init_identity_schema


def setup(tmp_path, monkeypatch):
    path = tmp_path / "admin-routes.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(auth_routes, "DB_PATH", path)
    monkeypatch.setattr(admin_routes, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://sim.example.edu")
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    for iid in ("inst-a", "inst-b"):
        db.execute(
            "INSERT INTO institutions(institution_id,name,status,created_at) VALUES(?,?,?,?)",
            (iid, iid.upper(), "active", "2026-01-01T00:00:00+00:00"),
        )
    create_user(db, email="platform@example.org", display_name="Platform Admin",
                password="platform-password-long", role="platform_admin")
    create_user(db, email="admin-a@example.org", display_name="Institution A Admin",
                password="institution-admin-password", role="institution_admin", institution_id="inst-a")
    create_user(db, email="learner-a@example.org", display_name="Learner A",
                password="learner-password-long", role="learner", institution_id="inst-a")
    create_user(db, email="learner-b@example.org", display_name="Learner B",
                password="other-learner-password-long", role="learner", institution_id="inst-b")
    db.commit()
    db.close()
    main.init_db()
    return path


def sign_in(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_institution_admin_can_only_provision_learners_and_educators_in_own_tenant(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        admin = sign_in(client, "admin-a@example.org", "institution-admin-password")
        created = client.post("/api/admin/users", headers=admin, json={
            "email": "new-learner@example.org", "display_name": "New Learner",
            "password": "new-learner-password-long", "role": "learner", "institution_id": "inst-b"
        })
        assert created.status_code == 201, created.text
        assert created.json()["institution_id"] == "inst-a"
        assert "password_hash" not in created.json() and "password" not in created.json()

        forbidden_role = client.post("/api/admin/users", headers=admin, json={
            "email": "new-admin@example.org", "display_name": "New Admin",
            "password": "new-admin-password-long", "role": "institution_admin", "institution_id": "inst-a"
        })
        assert forbidden_role.status_code == 403

        own_list = client.get("/api/admin/users", headers=admin)
        assert own_list.status_code == 200, own_list.text
        assert all(user["institution_id"] == "inst-a" for user in own_list.json()["users"])
        cross_tenant_list = client.get("/api/admin/users?institution_id=inst-b", headers=admin)
        assert cross_tenant_list.status_code == 403


def test_platform_admin_can_create_institutions_and_provision_accounts(tmp_path, monkeypatch):
    setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        platform = sign_in(client, "platform@example.org", "platform-password-long")
        institution = client.post("/api/admin/institutions", headers=platform, json={
            "institution_id": "inst-c", "name": "Institution C"
        })
        assert institution.status_code == 201, institution.text
        educator = client.post("/api/admin/users", headers=platform, json={
            "email": "educator-c@example.org", "display_name": "Educator C",
            "password": "educator-c-password-long", "role": "educator", "institution_id": "inst-c"
        })
        assert educator.status_code == 201, educator.text
        assert educator.json()["role"] == "educator"
        assert educator.json()["institution_id"] == "inst-c"


def test_disabling_user_revokes_sessions_and_cross_tenant_status_changes_are_denied(tmp_path, monkeypatch):
    path = setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        admin = sign_in(client, "admin-a@example.org", "institution-admin-password")
        learner = sign_in(client, "learner-a@example.org", "learner-password-long")
        with sqlite3.connect(path) as db:
            learner_id = db.execute(
                "SELECT user_id FROM users WHERE email_normalized='learner-a@example.org'"
            ).fetchone()[0]
            learner_b_id = db.execute(
                "SELECT user_id FROM users WHERE email_normalized='learner-b@example.org'"
            ).fetchone()[0]

        cross_tenant = client.patch(f"/api/admin/users/{learner_b_id}/status", headers=admin,
                                    json={"status": "disabled"})
        assert cross_tenant.status_code == 403

        disabled = client.patch(f"/api/admin/users/{learner_id}/status", headers=admin,
                                json={"status": "disabled"})
        assert disabled.status_code == 200, disabled.text
        assert disabled.json()["sessions_revoked"] is True
        me = client.get("/api/auth/me", headers=learner)
        assert me.status_code == 401

