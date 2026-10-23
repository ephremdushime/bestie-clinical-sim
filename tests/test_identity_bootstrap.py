"""Regression tests for the offline administrator bootstrap guard."""
import getpass
import os
import sqlite3
import sys
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import identity_bootstrap
from identity import init_identity_schema


def _run_bootstrap(db_path, *, email="admin@example.org", name="Initial Admin",
                   password="long-enough-password"):
    answers = iter([email, name])
    with patch.dict(os.environ, {"CLINICAL_SIM_DB": str(db_path)}), \
         patch("builtins.input", side_effect=lambda _prompt: next(answers)), \
         patch.object(getpass, "getpass", side_effect=[password, password]):
        return identity_bootstrap.main()


def test_bootstrap_creates_only_first_platform_admin(tmp_path):
    db_path = tmp_path / "bootstrap.db"
    assert _run_bootstrap(db_path) == 0
    with sqlite3.connect(db_path) as db:
        user = db.execute(
            "SELECT email_normalized, role, institution_id FROM users"
        ).fetchone()
        audit = db.execute(
            "SELECT action, outcome FROM audit_events"
        ).fetchone()
    assert user == ("admin@example.org", "platform_admin", None)
    assert audit == ("platform_admin_bootstrapped", "success")
    assert _run_bootstrap(db_path, email="second@example.org") == 3
    with sqlite3.connect(db_path) as db:
        assert db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1


def test_bootstrap_rejects_password_mismatch(tmp_path):
    db_path = tmp_path / "mismatch.db"
    answers = iter(["admin@example.org", "Initial Admin"])
    with patch.dict(os.environ, {"CLINICAL_SIM_DB": str(db_path)}), \
         patch("builtins.input", side_effect=lambda _prompt: next(answers)), \
         patch.object(getpass, "getpass", side_effect=["first-password-long", "different-password-long"]):
        assert identity_bootstrap.main() == 2
    assert not db_path.exists()


def test_bootstrap_rejects_short_password(tmp_path):
    db_path = tmp_path / "short.db"
    answers = iter(["admin@example.org", "Initial Admin"])
    with patch.dict(os.environ, {"CLINICAL_SIM_DB": str(db_path)}), \
         patch("builtins.input", side_effect=lambda _prompt: next(answers)), \
         patch.object(getpass, "getpass", side_effect=["short", "short"]):
        assert identity_bootstrap.main() == 2
    assert not db_path.exists()
