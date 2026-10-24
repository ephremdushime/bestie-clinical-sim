"""Fail-closed tests for immutable case snapshots."""
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main


def test_missing_or_corrupt_pinned_case_version_never_falls_back(tmp_path, monkeypatch):
    db_path = tmp_path / "snapshot-integrity.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    main.ensure_version_snapshots()

    with sqlite3.connect(db_path) as db:
        db.execute(
            "INSERT INTO case_versions(case_id,version,payload,approved_by,approved_by_user_id,approved_at,change_note) VALUES(?,?,?,?,?,?,?)",
            ("malaria-001", "9.9.9", "{not-json", "test", None, main.now(), "corrupt test fixture"),
        )
        db.commit()
        db.row_factory = sqlite3.Row
        with pytest.raises(HTTPException) as missing:
            main.case_for_session(db, {"case_id": "malaria-001", "case_version": "8.8.8"})
        assert missing.value.status_code == 409
        with pytest.raises(HTTPException) as corrupt:
            main.case_for_session(db, {"case_id": "malaria-001", "case_version": "9.9.9"})
        assert corrupt.value.status_code == 409
        with pytest.raises(HTTPException) as unpinned:
            main.case_for_session(db, {"case_id": "malaria-001", "case_version": None})
        assert unpinned.value.status_code == 409
