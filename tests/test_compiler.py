"""Unit tests for the procedural clinical compiler and medical linter (standard library unittest)."""
import unittest
from pathlib import Path
import sys

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from generator import medical_linter
from generator import compiler


class TestMedicalLinter(unittest.TestCase):
    def test_acid_base_henderson_hasselbalch(self):
        # 1. Normal values: pH 7.40, PaCO2 40, HCO3 24
        # 6.1 + log10(24 / (0.0307 * 40)) = 6.1 + log10(24 / 1.228) = 6.1 + log10(19.544) = 6.1 + 1.291 = 7.391 (~7.40)
        ok, msg = medical_linter.check_acid_base(7.40, 40.0, 24.0)
        self.assertTrue(ok, msg)

        # 2. Metabolic acidosis: pH 7.28, PaCO2 30, HCO3 14
        # 6.1 + log10(14 / (0.0307 * 30)) = 6.1 + log10(14 / 0.921) = 6.1 + 1.182 = 7.282 (~7.28)
        ok2, msg2 = medical_linter.check_acid_base(7.28, 30.0, 14.0)
        self.assertTrue(ok2, msg2)

        # 3. Severe mismatch (hallucinated values): pH 7.50, PaCO2 50, HCO3 12 (mathematically impossible)
        ok3, msg3 = medical_linter.check_acid_base(7.50, 50.0, 12.0)
        self.assertFalse(ok3)
        self.assertIn("Acid-base mismatch", msg3)

    def test_hemodynamics_checks(self):
        # Normal hemodynamics
        ok, issues = medical_linter.check_hemodynamics(hr=80, sbp=120, dbp=80)
        self.assertTrue(ok, issues)

        # Shock index violation: diagnosis says shock, but HR/SBP is 60/130 = 0.46
        ok2, issues2 = medical_linter.check_hemodynamics(hr=60, sbp=130, dbp=85, diagnosis="Septic shock")
        self.assertFalse(ok2)
        self.assertTrue(any("Shock Index" in iss for iss in issues2))

        # Reversed SBP/DBP
        ok3, issues3 = medical_linter.check_hemodynamics(hr=90, sbp=70, dbp=80)
        self.assertFalse(ok3)

    def test_contraindication_checks(self):
        # Pregnancy contraindication: Enalapril
        patient_preg = {"sex": "pregnant woman, 30 weeks", "facts": {"history": "Hypertension"}}
        actions = ["Prescribe enalapril 10mg daily", "Bedside ultrasound"]
        flags = medical_linter.check_contraindications(patient_preg, actions)
        self.assertTrue(any("Teratogenic" in f for f in flags))

        # Penicillin allergy
        patient_allergic = {"sex": "adult man", "allergies": "Severe penicillin allergy (anaphylaxis)"}
        actions2 = ["Administer IV amoxicillin-clavulanic acid 1.2g"]
        flags2 = medical_linter.check_contraindications(patient_allergic, actions2)
        self.assertTrue(any("allergy alert" in f.lower() for f in flags2))


class TestClinicalCompiler(unittest.TestCase):
    def setUp(self):
        self.archetypes = compiler.load_archetypes()
        self.assertIn("sepsis", self.archetypes)
        self.assertIn("acute_coronary_syndrome", self.archetypes)

    def test_compile_sepsis_black_male_with_diabetes(self):
        case = compiler.compile_scenario(
            archetype_id="sepsis",
            phenotype="black-male",
            age=58,
            comorbidities=["diabetes"],
            setting="emergency_department"
        )
        self.assertEqual(case["archetype_id"], "sepsis")
        self.assertEqual(case["phenotype"], "black-male")
        self.assertEqual(case["age"], 58)
        self.assertIn("glucose", case["investigations"])
        self.assertIn("Fitzpatrick", case["appearance"])
        self.assertTrue(any("glucose" in a.lower() for a in case["expected_actions"]))

        # Check full linter passes
        valid, issues = medical_linter.lint_clinical_scenario(case)
        self.assertTrue(valid, f"Issues: {issues}")

    def test_compile_acs_white_female_with_pregnancy(self):
        case = compiler.compile_scenario(
            archetype_id="acute_coronary_syndrome",
            phenotype="white-female",
            age=32,
            comorbidities=["pregnancy"],
            setting="emergency_department"
        )
        self.assertEqual(case["phenotype"], "white-female")
        self.assertIn("pregnant", case["sex"])
        self.assertIn("obstetric-ultrasound", case["investigations"])
        self.assertTrue(any("teratogenic" in a.lower() for a in case["expected_actions"]))

        # Linter passes
        valid, issues = medical_linter.lint_clinical_scenario(case)
        self.assertTrue(valid, f"Issues: {issues}")

    def test_compile_sepsis_white_male_with_ckd(self):
        case = compiler.compile_scenario(
            archetype_id="sepsis",
            phenotype="white-male",
            comorbidities=["ckd"],
            setting="emergency_department"
        )
        self.assertEqual(case["phenotype"], "white-male")
        self.assertIn("renal-electrolytes", case["investigations"])
        self.assertIn("eGFR", case["investigations"]["renal-electrolytes"]["result"])
        self.assertTrue(any("renal" in a.lower() for a in case["expected_actions"]))

        valid, issues = medical_linter.lint_clinical_scenario(case)
        self.assertTrue(valid, f"Issues: {issues}")

    def test_compile_acute_dyspnoea_black_female(self):
        case = compiler.compile_scenario(
            archetype_id="acute_dyspnoea",
            phenotype="black-female",
            age=28,
            setting="resuscitation_bay"
        )
        self.assertEqual(case["archetype_id"], "acute_dyspnoea")
        self.assertEqual(case["phenotype"], "black-female")
        self.assertIn("peak-flow", case["investigations"])
        self.assertIn("blood-gas", case["investigations"])

        valid, issues = medical_linter.lint_clinical_scenario(case)
        self.assertTrue(valid, f"Issues: {issues}")

    def test_compile_pediatric_febrile_illness_white_male(self):
        case = compiler.compile_scenario(
            archetype_id="pediatric_febrile_illness",
            phenotype="white-male",
            age=2,
            setting="pediatric_emergency"
        )
        self.assertEqual(case["archetype_id"], "pediatric_febrile_illness")
        self.assertEqual(case["phenotype"], "white-male")
        self.assertIn("blood-glucose", case["investigations"])
        self.assertIn("lumbar-puncture", case["investigations"])

        valid, issues = medical_linter.lint_clinical_scenario(case)
        self.assertTrue(valid, f"Issues: {issues}")


if __name__ == "__main__":
    unittest.main()
