"""Case-specific rubric snapshots and version history API tests."""
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main


def setup_db(tmp_path, monkeypatch):
    path = tmp_path / "rubric-history.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    monkeypatch.setattr(main, "APP_ENV", "development")
    main.init_db()
    main.ensure_version_snapshots()
    return path


def test_rubric_uses_case_specific_anchors_and_stable_patch_versions(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    case = dict(main.CASES["malaria-001"])
    case["expected_actions"] = ["Assess severity", "Interpret malaria test"]
    rubric = main.rubric_for_case(case)
    management = next(item for item in rubric["criteria"] if item["id"] == "management")
    assert management["anchors"] == case["expected_actions"]
    assert main.increment_patch("heuristic-1.0.0") == "heuristic-1.0.1"
    assert main.increment_patch("1.4.9") == "1.4.10"


def test_history_endpoint_returns_case_and_rubric_hashes_without_mutating_snapshots(tmp_path, monkeypatch):
    setup_db(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        history = client.get("/api/educator/cases/malaria-001/versions")
        assert history.status_code == 200, history.text
        version = history.json()["versions"][0]
        assert version["version"] == "1.0.0"
        assert len(version["content_hash"]) == 64
        assert version["rubric_versions"]
        assert len(version["rubric_versions"][0]["content_hash"]) == 64

        detail = client.get(f"/api/educator/cases/malaria-001/versions/{version['version']}")
        assert detail.status_code == 200, detail.text
        assert detail.json()["case"]["id"] == "malaria-001"
        assert detail.json()["rubric_versions"]
        assert detail.json()["rubric_versions"][0]["rubric"]["source_case_id"] == "malaria-001"


def test_patch_version_increment_handles_prefixed_semver():
    assert main.increment_patch("heuristic-1.0.0") == "heuristic-1.0.1"
    assert main.increment_patch("1.4.9") == "1.4.10"
    assert main.increment_patch("custom-rubric-2.9.99") == "custom-rubric-2.9.100"
