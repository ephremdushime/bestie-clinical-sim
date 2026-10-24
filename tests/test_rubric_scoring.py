"""Tests for immutable case-specific rubric scoring."""
import json
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main


def _setup(tmp_path, monkeypatch):
    path = tmp_path / "rubric-scoring.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    main.ensure_version_snapshots()
    return path


def test_case_rubric_is_case_specific_and_weights_sum_to_100(tmp_path, monkeypatch):
    _setup(tmp_path, monkeypatch)
    case = dict(main.CASES["malaria-001"])
    rubric = main.rubric_for_case(case)
    management = next(item for item in rubric["criteria"] if item["id"] == "management")
    differential = next(item for item in rubric["criteria"] if item["id"] == "differential")
    assert management["anchors"] == case["expected_actions"]
    assert differential["anchors"] == case["expected_differentials"]
    assert sum(item["weight"] for item in rubric["criteria"]) == 100
    assert rubric["source_case_id"] == "malaria-001"


def test_report_scores_against_rubric_anchors_and_preserves_formative_warning(tmp_path, monkeypatch):
    _setup(tmp_path, monkeypatch)
    case = dict(main.CASES["malaria-001"])
    rubric = main.rubric_for_case(case)
    events = [
        {"type": "chat", "student_message": "I will take a focused history, ask about allergies and assess severity."},
        {"type": "investigation", "test_name": "Malaria rapid diagnostic test",
         "indication": "Fever in a malaria-endemic area; test is indicated.", "appropriate": True},
    ]
    body = main.Finish(
        differential=["malaria", "viral illness"],
        final_diagnosis="malaria",
        management=["Give appropriate antimalarial treatment per national guideline",
                    "Arrange follow-up and safety-netting"],
        reflection="The positive malaria RDT result supports malaria in this clinical context; I interpret it with symptoms.",
    )
    report = main.make_report(case, events, body, rubric)
    assert 0 <= report["score"] <= 100
    assert len(report["rubric_criteria"]) == 6
    assert sum(item["weight"] for item in report["rubric_criteria"]) == 100
    scored = {item["id"]: item for item in report["rubric_criteria"]}
    assert scored["differential"]["points"] > 0
    assert scored["investigations"]["points"] > 0
    assert scored["management"]["points"] > 0
    assert "not a validated clinical marking instrument" in report["summary"]
    assert report["status"] == "formative_unvalidated"


def test_legacy_rubric_snapshot_is_migrated_once_without_rewriting_history(tmp_path, monkeypatch):
    path = tmp_path / "legacy-rubric.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    case = main.CASES["malaria-001"]
    legacy = main.rubric_definition()
    with sqlite3.connect(path) as db:
        db.execute(
            """INSERT OR IGNORE INTO rubric_versions(case_id,case_version,rubric_version,payload,
               created_at,content_hash,institution_id) VALUES(?,?,?,?,?,?,?)""",
            (case["id"], case["version"], main.RUBRIC_VERSION, main.canonical_json(legacy),
             "2026-01-01T00:00:00+00:00", main.content_digest(legacy), None),
        )
    main.ensure_version_snapshots()
    with sqlite3.connect(path) as db:
        rows = db.execute(
            "SELECT rubric_version,payload FROM rubric_versions WHERE case_id=? AND case_version=? ORDER BY rowid",
            (case["id"], case["version"]),
        ).fetchall()
    assert rows[0][0] == main.RUBRIC_VERSION
    assert "criteria" not in json.loads(rows[0][1])
    assert rows[-1][0] == main.increment_patch(main.RUBRIC_VERSION)
    assert "criteria" in json.loads(rows[-1][1])
    main.ensure_version_snapshots()
    with sqlite3.connect(path) as db:
        count = db.execute(
            "SELECT COUNT(*) FROM rubric_versions WHERE case_id=? AND case_version=?",
            (case["id"], case["version"]),
        ).fetchone()[0]
    assert count == 2
