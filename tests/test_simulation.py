"""Unit tests for the deterministic simulation engine (using standard library unittest)."""
import unittest
import json
from pathlib import Path
import sys

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

import simulation


class TestSimulationEngine(unittest.TestCase):
    def setUp(self):
        self.scenarios = simulation.load_scenarios()
        self.assertIn("respiratory-severe-001", self.scenarios)
        self.scn = self.scenarios["respiratory-severe-001"]

    def test_baseline_state(self):
        st = simulation.replay(self.scn, [])
        cur = simulation.current_state(self.scn, st)
        self.assertEqual(cur["clock"], 0.0)
        self.assertEqual(cur["vitals"]["spo2"], 88)
        self.assertEqual(cur["vitals"]["rr"], 32)
        self.assertEqual(cur["vitals"]["hr"], 124)
        self.assertEqual(cur["status"], "unstable")

    def test_clock_progression(self):
        events = [
            {"type": "chat", "student_message": "Hello"},              # +0.5 min
            {"type": "sim_examine", "key": "inspect:general"},           # +1.0 min
            {"type": "investigation", "test_name": "FBC"},               # +2.0 min
        ]
        st = simulation.replay(self.scn, events)
        self.assertEqual(st["clock"], 3.5)

    def test_oxygen_intervention_improves_vitals(self):
        events = [
            {"type": "sim_intervene", "key": "oxygen"}                   # +1.0 min (at minute 0)
        ]
        st = simulation.replay(self.scn, events)
        cur = simulation.current_state(self.scn, st)
        self.assertIn("oxygen", st["done"])
        self.assertEqual(st["done"]["oxygen"], 0.0)
        # Stage 0 oxygen response: spo2 94, rr 26
        self.assertEqual(cur["vitals"]["spo2"], 94)
        self.assertEqual(cur["vitals"]["rr"], 26)
        self.assertEqual(cur["status"], "improving")

    def test_delayed_oxygen_shows_deterioration(self):
        # 16 chats * 0.5 = 8.0 mins -> triggers deterioration stage 1 (at min 8: spo2 84)
        events = [{"type": "chat", "student_message": f"Question {i}"} for i in range(16)]
        st = simulation.replay(self.scn, events)
        cur = simulation.current_state(self.scn, st)
        self.assertEqual(st["clock"], 8.0)
        self.assertEqual(cur["stage"], 1)
        self.assertEqual(cur["vitals"]["spo2"], 84)
        self.assertEqual(cur["status"], "deteriorating")

        # Now give oxygen at min 8 (stage 1 response: spo2 92)
        events.append({"type": "sim_intervene", "key": "oxygen"})
        st2 = simulation.replay(self.scn, events)
        cur2 = simulation.current_state(self.scn, st2)
        self.assertEqual(cur2["vitals"]["spo2"], 92)
        self.assertEqual(cur2["status"], "improving")

    def test_examination_findings(self):
        st = simulation.replay(self.scn, [])
        # General inspection
        insp = simulation.examine(self.scn, st, "inspect:general")
        self.assertIn("breathless", insp["finding"].lower())
        self.assertFalse(insp["measured"])

        # Auscultation right lower chest
        ausc = simulation.examine(self.scn, st, "auscultate:right_lower")
        self.assertIn("crackles", ausc["finding"].lower())

        # Measure SpO2
        meas = simulation.examine(self.scn, st, "measure:spo2")
        self.assertTrue(meas["measured"])
        self.assertEqual(meas["finding"], "SpO₂ 88%")

        # Unsupported examination raises error (never invent facts)
        with self.assertRaises(simulation.Unsupported):
            simulation.examine(self.scn, st, "palpate:appendix")

    def test_evidence_flags_missing_oxygen_and_escalation(self):
        events = [{"type": "chat", "student_message": "Hello"}]
        ev = simulation.evidence(self.scn, events)
        flag_ids = [f["id"] for f in ev["scenario_flags"]]
        self.assertIn("no-oxygen", flag_ids)
        self.assertIn("no-escalation", flag_ids)

    def test_evidence_flags_late_oxygen(self):
        # Delay oxygen past minute 6
        events = [{"type": "chat", "student_message": f"Q{i}"} for i in range(14)] # 7.0 minutes
        events.append({"type": "sim_intervene", "key": "oxygen"})
        events.append({"type": "sim_intervene", "key": "escalate"})
        ev = simulation.evidence(self.scn, events)
        flag_ids = [f["id"] for f in ev["scenario_flags"]]
        self.assertIn("late-oxygen", flag_ids)
        self.assertNotIn("no-oxygen", flag_ids)
        self.assertNotIn("no-escalation", flag_ids)


if __name__ == "__main__":
    unittest.main()

