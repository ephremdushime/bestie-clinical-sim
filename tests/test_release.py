"""Release regression suite. Each integration scenario runs in an isolated process/database."""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run_check(script: str) -> None:
    env = os.environ.copy()
    env.pop("APP_ENV", None)
    env.pop("CLINICAL_SIM_DB", None)
    completed = subprocess.run(
        [sys.executable, str(ROOT / "tests" / script)],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=90,
    )
    assert completed.returncode == 0, completed.stdout + "\n" + completed.stderr


def test_api_security_and_exam_confidentiality():
    run_check("smoke_checks.py")


def test_ai_draft_persistence_and_publish_flow():
    run_check("llm_mock_checks.py")
