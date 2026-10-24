"""Trusted-shell provisioning and recovery utility integration tests."""
import importlib.util
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import main
from identity import issue_session, resolve_session, verify_password


def test_provisioning_cli_creates_accounts_and_audits_password_recovery(tmp_path, monkeypatch):
    db_path = tmp_path / "provisioning.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "development")

    script_path = ROOT / "scripts" / "provision_account.py"
    spec = importlib.util.spec_from_file_location("provision_account_cli_test", script_path)
    assert spec and spec.loader
    provisioning = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(provisioning)

    passwords = iter([
        "PlatformAdminPassword123!", "PlatformAdminPassword123!",
        "EducatorPassword123456!", "EducatorPassword123456!",
        "EducatorResetPassword123!", "EducatorResetPassword123!",
    ])
    monkeypatch.setattr(provisioning.getpass, "getpass", lambda _prompt: next(passwords))

    def run_cli(*args):
        monkeypatch.setattr(sys, "argv", ["provision_account.py", *args])
        assert provisioning.main_cli() == 0

    run_cli("--email", "admin@example.test", "--display-name", "Platform Admin", "--role", "platform_admin")
    run_cli("--create-institution", "--institution-id", "inst-a", "--institution-name", "Institution A")
    run_cli("--email", "educator@example.test", "--display-name", "Educator A",
            "--role", "educator", "--institution-id", "inst-a")

    with main.conn() as db:
        educator = db.execute("SELECT user_id FROM users WHERE email_normalized='educator@example.test'").fetchone()
        assert educator
        token = issue_session(db, educator["user_id"])
        db.commit()

    run_cli("--reset-password", "--email", "educator@example.test")

    with main.conn() as db:
        assert verify_password(db, "educator@example.test", "EducatorPassword123456!") is None
        assert verify_password(db, "educator@example.test", "EducatorResetPassword123!") is not None
        assert resolve_session(db, token) is None
        audit = db.execute(
            "SELECT actor_user_id,action,outcome FROM audit_events WHERE action='provision.password_reset'"
        ).fetchone()
        assert audit["action"] == "provision.password_reset"
        assert audit["outcome"] == "success"
        assert audit["actor_user_id"] is not None
