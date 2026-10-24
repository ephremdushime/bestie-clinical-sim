"""Offline platform-admin account provisioning for controlled pilots.

There is intentionally no public registration endpoint. Run this command on the
trusted host after bootstrapping the first platform administrator. Passwords are
prompted interactively and never accepted as command-line arguments.
"""
from __future__ import annotations

import argparse
import getpass
import json
import os
import sqlite3
from pathlib import Path

from identity import create_user, init_identity_schema, write_audit_event

ROOT = Path(__file__).resolve().parent
DEFAULT_DB = Path(os.getenv("CLINICAL_SIM_DB", str(ROOT / "clinical_sim.db")))


def open_db(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    db.commit()
    return db


def require_platform_admin(db: sqlite3.Connection, actor_email: str) -> sqlite3.Row:
    actor = db.execute(
        "SELECT * FROM users WHERE email_normalized=?",
        (actor_email.strip().casefold(),),
    ).fetchone()
    if not actor or actor["status"] != "active" or actor["role"] != "platform_admin":
        raise PermissionError("An active platform administrator account is required.")
    return actor


def create_institution(db: sqlite3.Connection, *, actor_email: str,
                       institution_id: str, name: str) -> str:
    actor = require_platform_admin(db, actor_email)
    institution_id = institution_id.strip()
    name = name.strip()
    if not institution_id or len(institution_id) > 80:
        raise ValueError("Institution ID must contain 1–80 characters.")
    if not name or len(name) > 200:
        raise ValueError("Institution name must contain 1–200 characters.")
    db.execute(
        "INSERT INTO institutions(institution_id,name,status,created_at) VALUES(?,?,'active',datetime('now'))",
        (institution_id, name),
    )
    write_audit_event(db, actor_user_id=actor["user_id"], institution_id=institution_id,
        action="institution.created", resource_type="institution", resource_id=institution_id,
        outcome="success", metadata_json=json.dumps({"name": name}, separators=(",", ":")))
    db.commit()
    return institution_id


def provision_user(db: sqlite3.Connection, *, actor_email: str, email: str,
                   display_name: str, password: str, role: str,
                   institution_id: str | None = None) -> str:
    actor = require_platform_admin(db, actor_email)
    normalized_role = role.strip().lower()
    if normalized_role != "platform_admin":
        if not institution_id:
            raise ValueError("Learner, educator and institution-admin accounts require an institution.")
        institution = db.execute(
            "SELECT status FROM institutions WHERE institution_id=?", (institution_id,)
        ).fetchone()
        if not institution or institution["status"] != "active":
            raise ValueError("The target institution is missing or inactive.")
    user_id = create_user(db, email=email, display_name=display_name, password=password,
                          role=normalized_role, institution_id=institution_id)
    write_audit_event(db, actor_user_id=actor["user_id"], institution_id=institution_id,
        action="user.provisioned", resource_type="user", resource_id=user_id,
        outcome="success", metadata_json=json.dumps(
            {"role": normalized_role, "email": email.strip().casefold()},
            separators=(",", ":")))
    db.commit()
    return user_id


def set_user_status(db: sqlite3.Connection, *, actor_email: str,
                    target_email: str, status: str) -> None:
    actor = require_platform_admin(db, actor_email)
    if status not in {"active", "disabled", "locked"}:
        raise ValueError("Status must be active, disabled, or locked.")
    target = db.execute("SELECT * FROM users WHERE email_normalized=?",
                        (target_email.strip().casefold(),)).fetchone()
    if not target:
        raise ValueError("Target account does not exist.")
    if target["user_id"] == actor["user_id"] and status != "active":
        raise ValueError("You cannot disable or lock the account used to run this command.")
    if target["role"] == "platform_admin" and status != "active":
        remaining = db.execute(
            "SELECT COUNT(*) AS n FROM users WHERE role='platform_admin' AND status='active' AND user_id<>?",
            (target["user_id"],),
        ).fetchone()["n"]
        if remaining == 0:
            raise ValueError("Cannot disable the last active platform administrator.")
    db.execute("UPDATE users SET status=?,updated_at=datetime('now') WHERE user_id=?",
               (status, target["user_id"]))
    write_audit_event(db, actor_user_id=actor["user_id"],
        institution_id=target["institution_id"], action="user.status_changed",
        resource_type="user", resource_id=target["user_id"], outcome="success",
        metadata_json=json.dumps({"new_status": status}, separators=(",", ":")))
    db.commit()


def _password_pair() -> str:
    password = getpass.getpass("New password (minimum 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise ValueError("Passwords do not match.")
    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters.")
    return password


def main() -> int:
    parser = argparse.ArgumentParser(description="Provision Bestie Clinical Sim accounts offline.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="SQLite database path")
    parser.add_argument("--actor-email", required=True, help="Active platform administrator email")
    sub = parser.add_subparsers(dest="command", required=True)
    institution = sub.add_parser("create-institution")
    institution.add_argument("--id", required=True)
    institution.add_argument("--name", required=True)
    user = sub.add_parser("create-user")
    user.add_argument("--email", required=True)
    user.add_argument("--display-name", required=True)
    user.add_argument("--role", required=True,
                      choices=["learner", "educator", "institution_admin", "platform_admin"])
    user.add_argument("--institution-id")
    status = sub.add_parser("set-user-status")
    status.add_argument("--email", required=True)
    status.add_argument("--status", required=True, choices=["active", "disabled", "locked"])
    sub.add_parser("list-users")
    args = parser.parse_args()
    db = open_db(args.db)
    try:
        if args.command == "create-institution":
            print("Created institution:", create_institution(
                db, actor_email=args.actor_email, institution_id=args.id, name=args.name))
        elif args.command == "create-user":
            print("Created user ID:", provision_user(
                db, actor_email=args.actor_email, email=args.email,
                display_name=args.display_name, password=_password_pair(),
                role=args.role, institution_id=args.institution_id))
        elif args.command == "set-user-status":
            set_user_status(db, actor_email=args.actor_email,
                            target_email=args.email, status=args.status)
            print("Account status updated.")
        elif args.command == "list-users":
            require_platform_admin(db, args.actor_email)
            for row in db.execute(
                "SELECT user_id,email_normalized,display_name,role,institution_id,status,created_at "
                "FROM users ORDER BY email_normalized"
            ):
                print(json.dumps(dict(row), separators=(",", ":")))
        return 0
    except (ValueError, PermissionError, sqlite3.IntegrityError) as exc:
        parser.exit(2, f"Error: {exc}\n")
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
