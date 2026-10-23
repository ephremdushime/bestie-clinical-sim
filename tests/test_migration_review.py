"""Read-only legacy migration inventory tests."""
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
from migration_review import inventory


def test_inventory_counts_legacy_scope_gaps_without_mutating_database(tmp_path):
    path = tmp_path / "legacy.db"
    db = sqlite3.connect(path)
    db.executescript("""
      CREATE TABLE sessions(id INTEGER PRIMARY KEY, learner TEXT, owner_user_id TEXT, institution_id TEXT);
      INSERT INTO sessions(id,learner,owner_user_id,institution_id) VALUES
        (1,'Example learner',NULL,NULL),(2,'Another learner','user-2','inst-a');
      CREATE TABLE exams(id INTEGER PRIMARY KEY, creator_user_id TEXT, institution_id TEXT);
      INSERT INTO exams(id,creator_user_id,institution_id) VALUES(1,NULL,NULL);
      CREATE TABLE case_drafts(id INTEGER PRIMARY KEY, creator_user_id TEXT, institution_id TEXT);
      CREATE TABLE approved_cases(case_id TEXT PRIMARY KEY, institution_id TEXT);
      INSERT INTO approved_cases(case_id,institution_id) VALUES('legacy-case',NULL);
    """)
    db.commit()
    db.close()

    report = inventory(path)
    assert report["database_exists"] is True
    assert report["tables"]["sessions"]["total"] == 2
    assert report["tables"]["sessions"]["missing_owner"] == 1
    assert report["tables"]["sessions"]["missing_institution"] == 1
    assert report["tables"]["exams"]["missing_creator"] == 1
    assert report["tables"]["approved_cases"]["missing_institution"] == 1
    assert "Read-only" in report["action"]

    db = sqlite3.connect(path)
    assert db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 2
    assert db.execute("SELECT owner_user_id,institution_id FROM sessions WHERE id=1").fetchone() == (None, None)
    db.close()


def test_inventory_missing_database_does_not_create_file(tmp_path):
    path = tmp_path / "not-created.db"
    report = inventory(path)
    assert report["database_exists"] is False
    assert not path.exists()
