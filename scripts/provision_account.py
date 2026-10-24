#!/usr/bin/env python3
"""Provision Bestie Clinical Sim accounts from a trusted server shell.

Passwords are prompted with terminal echo disabled and are never accepted as CLI
arguments. Run only on the host that owns the configured database. This utility is
not an HTTP endpoint and should not be exposed to learners.
"""
from __future__ import annotations

import argparse
import getpass
import os
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

import main  # initializes the configured simulation and identity schema
from identity import PASSWORD_ITERATIONS, _password_record, create_user, init_identity_schema, write_audit_event


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision an institution or account.")
    parser.add_argument("--email", help="Account email.")
    parser.add_argument("--reset-password", action="store_true",
                        help="Reset an existing account password from this trusted server shell.")
    parser.add_argument("--display-name", help="Human-readable account name.")
    parser.add_argument("--role", choices=("platform_admin", "institution_admin", "educator", "learner"))
    parser.add_argument("--institution-id", help="Existing institution ID for scoped accounts.")
    parser.add_argument("--create-institution", action="store_true",
                        help="Create the supplied institution before provisioning the account.")
    parser.add_argument("--institution-name", help="Required with --create-institution.")
    parser.add_argument("--allow-additional-platform-admin", action="store_true",
                        help="Explicitly permit another platform administrator.")
    return parser.parse_args()


def main_cli() -> int:
    args = parse_args()
    if args.reset_password:
        if not args.email or args.create_institution or args.display_name or args.role or args.institution_id:
            raise SystemExit("--reset-password requires only --email; do not combine it with account/institution creation.")
    else:
        if not args.email and not args.create_institution:
            raise SystemExit("Provide --email to create an account or --create-institution to create an institution.")
        if args.email and (not args.display_name or not args.role):
            raise SystemExit("Account creation requires --display-name and --role.")
        if args.create_institution and (not args.institution_id or not args.institution_name or not args.institution_name.strip()):
            raise SystemExit("Institution creation requires a non-empty --institution-id and --institution-name.")
        if args.role in {"learner", "educator", "institution_admin"} and not args.institution_id:
            raise SystemExit("Institution-scoped roles require --institution-id.")
        if args.role == "platform_admin" and args.institution_id:
            raise SystemExit("Platform administrators must not be assigned to an institution.")

    main.init_db()
    db = main.conn()
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    try:
        db.execute("BEGIN IMMEDIATE")
        existing_admins = db.execute(
            "SELECT user_id FROM users WHERE role='platform_admin' AND status='active' ORDER BY created_at"
        ).fetchall()
        actor_user_id = existing_admins[0]["user_id"] if existing_admins else None

        if args.reset_password:
            user = db.execute(
                "SELECT user_id,institution_id,status FROM users WHERE email_normalized=?",
                (args.email.strip().casefold(),),
            ).fetchone()
            if not user:
                raise SystemExit("No account with that email exists; no changes were made.")
            password = getpass.getpass("New password (minimum 12 characters): ")
            confirmation = getpass.getpass("Confirm new password: ")
            if password != confirmation:
                raise SystemExit("Passwords do not match.")
            if len(password) < 12:
                raise SystemExit("Password must contain at least 12 characters.")
            salt = secrets.token_bytes(16)
            password_hash = _password_record(password, salt, PASSWORD_ITERATIONS)
            now = main.now()
            db.execute(
                "UPDATE users SET password_salt=?,password_hash=?,password_iterations=?,updated_at=? WHERE user_id=?",
                (salt.hex(), password_hash, PASSWORD_ITERATIONS, now, user["user_id"]),
            )
            db.execute(
                "UPDATE auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL",
                (now, user["user_id"]),
            )
            write_audit_event(
                db, actor_user_id=actor_user_id, institution_id=user["institution_id"],
                action="provision.password_reset", resource_type="user",
                resource_id=user["user_id"], outcome="success",
                metadata_json='{"method":"trusted_server_cli"}',
            )
            print(f"Reset password for account: {args.email}; all active sessions were revoked.")

        if args.create_institution:
            exists = db.execute(
                "SELECT 1 FROM institutions WHERE institution_id=?", (args.institution_id,)
            ).fetchone()
            if exists:
                raise SystemExit("That institution ID already exists; no changes were made.")
            db.execute(
                "INSERT INTO institutions(institution_id,name,status,created_at) VALUES(?,?,?,?)",
                (args.institution_id, args.institution_name.strip(), "active", main.now()),
            )
            write_audit_event(
                db, actor_user_id=actor_user_id, institution_id=args.institution_id,
                action="provision.institution_created", resource_type="institution",
                resource_id=args.institution_id, outcome="success",
                metadata_json='{"method":"trusted_server_cli"}',
            )
            print(f"Created active institution: {args.institution_id}")

        if args.email:
            if args.role == "platform_admin" and existing_admins and not args.allow_additional_platform_admin:
                raise SystemExit(
                    "An active platform administrator already exists. Use --allow-additional-platform-admin "
                    "only when a second platform administrator is explicitly approved."
                )
            if args.role in {"learner", "educator", "institution_admin"}:
                institution = db.execute(
                    "SELECT status FROM institutions WHERE institution_id=?", (args.institution_id,)
                ).fetchone()
                if not institution or institution["status"] != "active":
                    raise SystemExit("The selected institution does not exist or is not active.")

            password = getpass.getpass("Initial password (minimum 12 characters): ")
            confirmation = getpass.getpass("Confirm initial password: ")
            if password != confirmation:
                raise SystemExit("Passwords do not match.")
            if len(password) < 12:
                raise SystemExit("Password must contain at least 12 characters.")
            user_id = create_user(
                db, email=args.email, display_name=args.display_name,
                password=password, role=args.role, institution_id=args.institution_id,
            )
            write_audit_event(
                db, actor_user_id=actor_user_id,
                institution_id=args.institution_id if args.role != "platform_admin" else None,
                action="provision.user_created", resource_type="user",
                resource_id=user_id, outcome="success",
                metadata_json=main.canonical_json({
                    "method": "trusted_server_cli", "role": args.role,
                    "institution_id": args.institution_id,
                }),
            )
            print(f"Created account: {args.email} ({args.role}); user ID: {user_id}")
            print("Deliver the initial password through an approved secure channel. The user should change it after signing in.")

        db.commit()
        return 0
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main_cli())
