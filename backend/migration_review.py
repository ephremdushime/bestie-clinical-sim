"""Read-only migration inventory for legacy pilot records.

This tool intentionally does not auto-assign owners or institutions. Resolve historical
ownership with the institution data steward, rehearse on a database copy, and back up
before any separately reviewed migration.
"""
from __future__ import annotations
import argparse
import json
import os
import sqlite3
from pathlib import Path

DEFAULT_DB = Path(os.getenv("CLINICAL_SIM_DB", str(Path(__file__).resolve().parent / "clinical_sim.db")))

def inventory(database: Path) -> dict:
    if not database.exists():
        return {"database_exists": False, "database": str(database), "tables": {}, "action": "No database found; no changes made."}
    db = sqlite3.connect(f"file:{database.resolve()}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    try:
        tables = {row["name"] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        result = {"database_exists": True, "database": str(database), "tables": {}, "action": "Read-only inventory. No records changed."}
        specs = {
            "sessions": {"owner_user_id": "missing_owner", "institution_id": "missing_institution"},
            "exams": {"creator_user_id": "missing_creator", "institution_id": "missing_institution"},
            "case_drafts": {"creator_user_id": "missing_creator", "institution_id": "missing_institution"},
            "approved_cases": {"institution_id": "missing_institution"},
        }
        for table, fields in specs.items():
            if table not in tables:
                result["tables"][table] = {"exists": False}
                continue
            cols = {r["name"] for r in db.execute(f"PRAGMA table_info({table})")}
            item = {"exists": True, "total": db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]}
            for field, key in fields.items():
                if field not in cols:
                    item[key] = {"column_missing": True}
                else:
                    item[key] = db.execute(f"SELECT COUNT(*) FROM {table} WHERE {field} IS NULL OR TRIM(CAST({field} AS TEXT))=''").fetchone()[0]
            result["tables"][table] = item
        return result
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Inventory legacy Bestie Clinical Sim ownership gaps without modifying data.")
    parser.add_argument("--database", type=Path, default=DEFAULT_DB, help="SQLite database path (default: CLINICAL_SIM_DB or backend/clinical_sim.db)")
    args = parser.parse_args()
    print(json.dumps(inventory(args.database), indent=2))

if __name__ == "__main__":
    main()
