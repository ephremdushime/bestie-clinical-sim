"""Institution-aware account administration for provisioned Bestie Clinical Sim users."""
from __future__ import annotations

import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from identity import create_user, init_identity_schema, resolve_session, write_audit_event

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("CLINICAL_SIM_DB", str(ROOT / "clinical_sim.db")))
router = APIRouter(prefix="/api/admin", tags=["account administration"])


def _db() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    init_identity_schema(db)
    return db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _actor(db: sqlite3.Connection, authorization: str | None) -> sqlite3.Row:
    if not authorization:
        raise HTTPException(401, "Bearer access token required.")
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(401, "Bearer access token required.")
    actor = resolve_session(db, token.strip())
    if not actor:
        raise HTTPException(401, "Session is invalid, expired, revoked, or account disabled.")
    return actor


def _require_admin(actor: sqlite3.Row) -> None:
    if actor["role"] not in ("institution_admin", "platform_admin"):
        raise HTTPException(403, "An institution administrator or platform administrator is required.")


class InstitutionCreate(BaseModel):
    institution_id: str = Field(min_length=2, max_length=80, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$")
    name: str = Field(min_length=2, max_length=160)


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    display_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=1024)
    role: Literal["learner", "educator", "institution_admin", "platform_admin"]
    institution_id: str | None = Field(default=None, min_length=2, max_length=80)


class UserStatusUpdate(BaseModel):
    status: Literal["active", "disabled", "locked"]


@router.post("/institutions", status_code=201)
def create_institution(body: InstitutionCreate, authorization: str | None = Header(default=None)):
    db = _db()
    try:
        actor = _actor(db, authorization)
        if actor["role"] != "platform_admin":
            raise HTTPException(403, "Only a platform administrator can create institutions.")
        now = _now()
        try:
            db.execute(
                "INSERT INTO institutions(institution_id,name,status,created_at) VALUES(?,?,?,?)",
                (body.institution_id.strip(), body.name.strip(), "active", now),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "An institution with this ID already exists.")
        write_audit_event(
            db, actor_user_id=actor["user_id"], institution_id=body.institution_id.strip(),
            action="admin.institution_created", resource_type="institution",
            resource_id=body.institution_id.strip(), outcome="success",
        )
        db.commit()
        return {"institution_id": body.institution_id.strip(), "name": body.name.strip(), "status": "active"}
    finally:
        db.close()


@router.get("/users")
def list_users(
    institution_id: str | None = Query(default=None, min_length=2, max_length=80),
    authorization: str | None = Header(default=None),
):
    db = _db()
    try:
        actor = _actor(db, authorization)
        _require_admin(actor)
        if actor["role"] == "institution_admin":
            scope = actor["institution_id"]
            if institution_id and institution_id != scope:
                raise HTTPException(403, "Institution administrators can only list users in their own institution.")
        else:
            scope = institution_id
        columns = "user_id,institution_id,email_normalized,display_name,role,status,created_at,updated_at"
        if scope:
            rows = db.execute(
                f"SELECT {columns} FROM users WHERE institution_id=? ORDER BY created_at DESC LIMIT 500",
                (scope,),
            ).fetchall()
        else:
            rows = db.execute(f"SELECT {columns} FROM users ORDER BY created_at DESC LIMIT 500").fetchall()
        return {"users": [dict(row) for row in rows]}
    finally:
        db.close()


@router.post("/users", status_code=201)
def provision_user(body: UserCreate, authorization: str | None = Header(default=None)):
    db = _db()
    try:
        actor = _actor(db, authorization)
        _require_admin(actor)
        institution_id = body.institution_id
        if actor["role"] == "institution_admin":
            if body.role not in ("learner", "educator"):
                raise HTTPException(403, "Institution administrators may provision learners and educators only.")
            institution_id = actor["institution_id"]
        elif body.role == "platform_admin":
            if institution_id:
                raise HTTPException(422, "Platform administrator accounts must not be institution-scoped.")
        elif not institution_id:
            raise HTTPException(422, "An institution is required for this account role.")
        if institution_id:
            institution = db.execute(
                "SELECT status FROM institutions WHERE institution_id=?", (institution_id,)
            ).fetchone()
            if not institution or institution["status"] != "active":
                raise HTTPException(422, "The selected institution does not exist or is not active.")
        try:
            user_id = create_user(
                db, email=body.email, display_name=body.display_name, password=body.password,
                role=body.role, institution_id=institution_id,
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "An account with this email already exists.")
        write_audit_event(
            db, actor_user_id=actor["user_id"], institution_id=institution_id,
            action="admin.user_provisioned", resource_type="user", resource_id=user_id,
            outcome="success", metadata_json='{"role":"' + body.role + '"}',
        )
        db.commit()
        return {
            "user_id": user_id, "email": body.email.strip().casefold(),
            "display_name": body.display_name.strip(), "role": body.role,
            "institution_id": institution_id, "status": "active",
        }
    finally:
        db.close()


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str, body: UserStatusUpdate, authorization: str | None = Header(default=None)
):
    db = _db()
    try:
        actor = _actor(db, authorization)
        _require_admin(actor)
        target = db.execute(
            "SELECT user_id,institution_id,role,status FROM users WHERE user_id=?", (user_id,)
        ).fetchone()
        if not target:
            raise HTTPException(404, "Account not found.")
        if target["user_id"] == actor["user_id"]:
            raise HTTPException(409, "Administrators cannot change their own account status.")
        if actor["role"] == "institution_admin":
            if target["institution_id"] != actor["institution_id"]:
                raise HTTPException(403, "This account belongs to another institution.")
            if target["role"] in ("institution_admin", "platform_admin"):
                raise HTTPException(403, "Institution administrators cannot manage administrator accounts.")
        now = _now()
        db.execute("UPDATE users SET status=?,updated_at=? WHERE user_id=?", (body.status, now, user_id))
        if body.status != "active":
            db.execute(
                "UPDATE auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL",
                (now, user_id),
            )
        write_audit_event(
            db, actor_user_id=actor["user_id"], institution_id=target["institution_id"],
            action="admin.user_status_changed", resource_type="user", resource_id=user_id,
            outcome="success", metadata_json='{"status":"' + body.status + '"}',
        )
        db.commit()
        return {"user_id": user_id, "status": body.status, "sessions_revoked": body.status != "active"}
    finally:
        db.close()
