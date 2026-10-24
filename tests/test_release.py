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

def test_clinical_and_operational_release_gates_fail_closed():
    """Documentation must not imply unperformed clinical/approval/security work is complete."""
    required = {
        "docs/CLINICAL_FACULTY_VALIDATION_PACK.md": ("NOT REVIEWED", "blocks publication"),
        "docs/INSTITUTIONAL_APPROVAL_PACK.md": ("PENDING", "No status should be marked approved"),
        "docs/EXTERNAL_SECURITY_ASSESSMENT.md": ("NOT PERFORMED", "RELEASE BLOCKER"),
        "docs/STAGING_DEPLOYMENT_REHEARSAL.md": ("NOT RUN", "restore drill"),
        "docs/PRODUCTION_RELEASE_GATE.md": ("Current decision: BLOCKED", "No independent assessment"),
    }
    for relative_path, markers in required.items():
        document = (ROOT / relative_path).read_text(encoding="utf-8")
        for marker in markers:
            assert marker.casefold() in document.casefold(), (
                f"{relative_path} must retain fail-closed marker {marker!r}"
            )
