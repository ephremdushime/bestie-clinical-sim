"""Integrity tests for immutable case and rubric snapshots."""
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main


def setup_snapshot_db(tmp_path, monkeypatch):
    path = tmp_path / "hash-integrity.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    main.ensure_version_snapshots()
    return path


def test_case_snapshot_hash_detects_tampering(tmp_path, monkeypatch):
    path = setup_snapshot_db(tmp_path, monkeypatch)
    with sqlite3.connect(path) as db:
        db.execute(
            "UPDATE case_versions SET payload=? WHERE case_id=? AND version=?",
            ('{"id":"malaria-001","diagnosis":"tampered"}', "malaria-001", "1.0.0"),
        )
        db.commit()
        db.row_factory = sqlite3.Row
        with pytest.raises(HTTPException) as exc:
            main.case_for_session(db, {"case_id": "malaria-001", "case_version": "1.0.0"})
        assert exc.value.status_code == 409
        assert "integrity check" in exc.value.detail


def test_rubric_snapshot_hash_detects_tampering(tmp_path, monkeypatch):
    path = setup_snapshot_db(tmp_path, monkeypatch)
    with sqlite3.connect(path) as db:
        db.execute(
            "UPDATE rubric_versions SET payload=? WHERE case_id=? AND case_version=? AND rubric_version=?",
            ('{"version":"tampered"}', "malaria-001", "1.0.0", main.RUBRIC_VERSION),
        )
        db.commit()
        db.row_factory = sqlite3.Row
        with pytest.raises(HTTPException) as exc:
            main.rubric_for_session(db, {
                "case_id": "malaria-001", "case_version": "1.0.0",
                "rubric_version": main.RUBRIC_VERSION,
            })
        assert exc.value.status_code == 409
        assert "integrity check" in exc.value.detail
