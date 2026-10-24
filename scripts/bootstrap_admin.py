"""One-time bootstrap for the first platform administrator.

Run this manually in a trusted deployment environment. It is never called at app startup.
Required environment: BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME,
BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_INSTITUTION_ID, BOOTSTRAP_INSTITUTION_NAME.
"""
from __future__ import annotations

import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from identity import create_user, init_identity_schema


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def main() -> None:
    email = required("BOOTSTRAP_ADMIN_EMAIL")
    display_name = required("BOOTSTRAP_ADMIN_NAME")
    password = required("BOOTSTRAP_ADMIN_PASSWORD")
    institution_id = required("BOOTSTRAP_INSTITUTION_ID")
    institution_name = required("BOOTSTRAP_INSTITUTION_NAME")
    if len(password) < 16:
        raise SystemExit("Bootstrap password must be at least 16 characters.")
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}", institution_id):
        raise SystemExit("BOOTSTRAP_INSTITUTION_ID must be a 2-80 character slug.")

    db_path = Path(os.getenv("CLINICAL_SIM_DB", str(BACKEND / "clinical_sim.db")))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(db_path, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        init_identity_schema(db)
        existing = db.execute("SELECT user_id FROM users WHERE role='platform_admin' LIMIT 1").fetchone()
        if existing:
            raise SystemExit("A platform administrator already exists; bootstrap is disabled.")
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        institution = db.execute(
            "SELECT status FROM institutions WHERE institution_id=?", (institution_id,)
        ).fetchone()
        if institution and institution["status"] != "active":
            raise SystemExit("The requested institution exists but is not active.")
        if not institution:
            db.execute(
                "INSERT INTO institutions(institution_id,name,status,created_at) VALUES(?,?,?,?)",
                (institution_id, institution_name, "active", now),
            )
        create_user(
            db, email=email, display_name=display_name, password=password,
            role="platform_admin", institution_id=None,
        )
        db.commit()
        print("Platform administrator bootstrapped successfully.")
        print("Sign in through /api/auth/login, then remove the bootstrap environment variables.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
