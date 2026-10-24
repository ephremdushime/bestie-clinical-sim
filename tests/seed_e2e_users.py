"""Create disposable fictional accounts for Playwright; never run against a real database."""
import os
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
from identity import create_user, init_identity_schema

db_path = os.environ.get("CLINICAL_SIM_DB", "/tmp/bcs-playwright-e2e.sqlite")
db = sqlite3.connect(db_path)
db.row_factory = sqlite3.Row
db.execute("PRAGMA foreign_keys=ON")
init_identity_schema(db)
db.execute("INSERT OR IGNORE INTO institutions(institution_id,name,created_at) VALUES(?,?,?)",
           ("e2e-institution", "Fictional E2E University", "2026-01-01T00:00:00+00:00"))
users = [
    ("learner@e2e.example", "Learner E2E", "e2e-learner-password-123", "learner"),
    ("educator@e2e.example", "Educator E2E", "e2e-educator-password-123", "educator"),
]
for email, name, password, role in users:
    exists = db.execute("SELECT 1 FROM users WHERE email_normalized=?", (email,)).fetchone()
    if not exists:
        create_user(db, email=email, display_name=name, password=password,
                    role=role, institution_id="e2e-institution")
db.commit()
db.close()
print("Seeded fictional Playwright accounts.")
