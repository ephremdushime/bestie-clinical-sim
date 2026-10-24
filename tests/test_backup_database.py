"""Tests for consistent and permission-restricted SQLite backups."""
import importlib.util
import os
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_backup_cli_creates_integrity_checked_restricted_copy(tmp_path, monkeypatch, capsys):
    source_path = tmp_path / "live.db"
    with sqlite3.connect(source_path) as source:
        source.execute("CREATE TABLE sample_records(id INTEGER PRIMARY KEY, value TEXT NOT NULL)")
        source.execute("INSERT INTO sample_records(value) VALUES(?)", ("committed value",))
        source.commit()

    script_path = ROOT / "scripts" / "backup_database.py"
    spec = importlib.util.spec_from_file_location("backup_database_cli_test", script_path)
    assert spec and spec.loader
    backup = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backup)

    output_dir = tmp_path / "restricted-backups"
    monkeypatch.setenv("CLINICAL_SIM_DB", str(source_path))
    monkeypatch.setattr(sys, "argv", ["backup_database.py", "--output-dir", str(output_dir)])
    assert backup.main_cli() == 0

    files = list(output_dir.glob("clinical_sim_*.sqlite3"))
    assert len(files) == 1
    backup_path = files[0]
    assert os.stat(backup_path).st_mode & 0o777 == 0o600
    with sqlite3.connect(backup_path) as restored:
        assert restored.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert restored.execute("SELECT value FROM sample_records").fetchone()[0] == "committed value"
    output = capsys.readouterr().out
    assert "Backup verified:" in output
    assert "SHA-256:" in output
