"""Integration test for simulation events, patient state progression, and debrief evidence."""
import unittest
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import sys

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

import simulation


def save_event(c, sid, event):
    row = c.execute("SELECT events FROM sessions WHERE id=?", (sid,)).fetchone()
    ev = json.loads(row["events"] or "[]")
    ev.append({"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), **event})
    c.execute("UPDATE sessions SET events=? WHERE id=?", (json.dumps(ev), sid))


class TestSimulationIntegration(unittest.TestCase):
    def setUp(self):
        self.db_path = Path("test_sim_integration.db")
        if self.db_path.exists():
            self.db_path.unlink()
        self.c = sqlite3.connect(self.db_path)
        self.c.row_factory = sqlite3.Row
        self.c.execute(
            """CREATE TABLE sessions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                learner TEXT,
                case_id TEXT,
                mode TEXT,
                created_at TEXT,
                status TEXT DEFAULT 'active',
                events TEXT DEFAULT '[]'
            )"""
        )
        self.c.commit()
        self.scn = simulation.load_scenarios()["respiratory-severe-001"]

    def tearDown(self):
        self.c.close()
        if self.db_path.exists():
            self.db_path.unlink()

    def test_session_simulation_state_and_finish_evidence(self):
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        self.c.execute(
            "INSERT INTO sessions(learner, case_id, mode, created_at, status, events) "
            "VALUES('Dr Student', 'respiratory-severe-001', 'practice', ?, 'active', '[]')",
            (now,)
        )
        sid = self.c.execute("SELECT last_insert_rowid()").fetchone()[0]
        self.c.commit()

        # 1. Initial State
        events = []
        st = simulation.replay(self.scn, events)
        cur = simulation.current_state(self.scn, st)
        self.assertEqual(cur["vitals"]["spo2"], 88)
        self.assertEqual(cur["status"], "unstable")

        # 2. Examination: Auscultate right lower chest
        res_ausc = simulation.examine(self.scn, st, "auscultate:right_lower")
        self.assertIn("crackles", res_ausc["finding"].lower())
        save_event(self.c, sid, {"type": "sim_examine", "key": "auscultate:right_lower", "finding": res_ausc["finding"]})
        self.c.commit()

        # 3. Intervene: Oxygen
        events_after_ausc = json.loads(self.c.execute("SELECT events FROM sessions WHERE id=?", (sid,)).fetchone()["events"])
        st_after_ausc = simulation.replay(self.scn, events_after_ausc)
        res_oxy = simulation.intervene(self.scn, st_after_ausc, "oxygen")
        self.assertEqual(res_oxy["label"], "Start supplemental oxygen")
        save_event(self.c, sid, {"type": "sim_intervene", "key": "oxygen", "label": res_oxy["label"]})
        self.c.commit()

        # 4. Check state after oxygen
        events_after_oxy = json.loads(self.c.execute("SELECT events FROM sessions WHERE id=?", (sid,)).fetchone()["events"])
        st_after_oxy = simulation.replay(self.scn, events_after_oxy)
        cur_after_oxy = simulation.current_state(self.scn, st_after_oxy)
        self.assertEqual(cur_after_oxy["vitals"]["spo2"], 94)
        self.assertEqual(cur_after_oxy["status"], "improving")

        # 5. Check timeline & debrief evidence
        ev = simulation.evidence(self.scn, events_after_oxy)
        self.assertEqual(ev["final_status"], "improving")
        self.assertIn("oxygen", ev["minutes_to"])
        flag_ids = [f["id"] for f in ev["scenario_flags"]]
        self.assertNotIn("late-oxygen", flag_ids)
        self.assertNotIn("no-oxygen", flag_ids)
        self.assertIn("no-escalation", flag_ids)
        self.assertEqual(len(ev["timeline"]), 2)


if __name__ == "__main__":
    unittest.main()
