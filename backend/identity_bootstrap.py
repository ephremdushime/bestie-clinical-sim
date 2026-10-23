"""One-time offline bootstrap for the first Bestie Clinical Sim platform administrator.

Run from the repository root:
  PYTHONPATH=backend CLINICAL_SIM_DB=backend/clinical_sim.db python -m identity_bootstrap

This command is intentionally not an HTTP endpoint. It refuses to create an initial
administrator if any user already exists. Back up and protect the SQLite database.
"""
from __future__ import annotations

import getpass
import os
import sqlite3
import sys
import uuid
from pathlib import Path

from identity import create_user, init_identity_schema, write_audit_event


def main() -> int:
    db_path = Path(os.environ.get("CLINICAL_SIM_DB", "backend/clinical_sim.db")).expanduser()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    email = input("Platform administrator email: ").strip()
    display_name = input("Display name: ").strip()
    password = getpass.getpass("Password (minimum 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        print("Error: passwords do not match.", file=sys.stderr)
        return 2
    if len(password) < 12:
        print("Error: password must contain at least 12 characters.", file=sys.stderr)
        return 2

    db = sqlite3.connect(db_path, timeout=20)
    db.row_factory = sqlite3.Row
    try:
        db.execute("PRAGMA foreign_keys=ON")
        init_identity_schema(db)
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            db.rollback()
            print("Error: bootstrap is allowed only when no users exist.", file=sys.stderr)
            return 3
        user_id = create_user(
            db,
            email=email,
            display_name=display_name,
            password=password,
            role="platform_admin",
            user_id=uuid.uuid4().hex,
        )
        write_audit_event(
            db,
            actor_user_id=user_id,
            institution_id=None,
            action="platform_admin_bootstrapped",
            resource_type="user",
            resource_id=user_id,
            outcome="success",
            metadata_json='{"method":"offline_cli"}',
        )
        db.commit()
        print(f"Created the initial platform administrator ({user_id}).")
        print("No password or session token was written to the database or output.")
        print("Keep the database and backups restricted; this CLI does not expose HTTP login.")
        return 0
    except (ValueError, sqlite3.IntegrityError) as exc:
        db.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
