# Bestie Clinical Sim 1.3.0 — release status

## Release classification
**Hardened development build / technical demonstration candidate. Not production-certified, not clinically validated, and not institutionally approved.** No production deployment is recorded.

## Verified engineering evidence
The security and institution-isolation changes merged to main at `33e9394ac7c456fba67f56487a9755067e9dccc8`. Post-merge CI run [40138514028](https://github.com/ephremdushime/bestie-clinical-sim/actions/runs/40138514028) passed all four jobs:
- backend release tests: 70 passed;
- frontend production build and browser workflows: passed (6 browser checks);
- live backend browser workflows: passed (2 checks);
- Docker Compose validation, backend/frontend image builds, non-root API assertions and Nginx validation: passed.

These checks verify the tested code paths and build configuration only. They do not verify an institution's live database or replace independent clinical, institutional, operational or external security review.

## Release gates — current state

| Gate | Status | Evidence needed to change status |
|---|---|---|
| Automated engineering checks | PASS for the recorded commit | Rerun on any release candidate and retain the run link |
| Clinical/faculty review of each case and rubric | BLOCKED | Signed qualified review, source provenance, version/hash, conditions and review expiry |
| Assessment validity/reliability | BLOCKED | Blueprint, anchored rubric, independent scoring evidence, fairness/accommodation review and approved intended use |
| Institutional and ethics determination | BLOCKED | Written determination/approval and exact scope from the participating institution |
| Privacy/data governance | BLOCKED | Approved data map, purpose, retention/deletion, notice/consent where applicable, provider/data-transfer review |
| Staging deployment and operational controls | NOT RUN | HTTPS/network configuration, smoke tests, monitoring/incident process, rollback and access-boundary evidence |
| Backup restoration | NOT RUN | Isolated restore drill and application-level integrity evidence; off-host encrypted backup |
| Independent security assessment | NOT PERFORMED | Signed scope, assessor report, remediation and retest; no unresolved critical/high findings |
| Load and full accessibility testing | NOT RUN | Authorized workload results and documented accessibility/browser/device review |

See `docs/PRODUCTION_RELEASE_GATE.md` and the associated faculty, institutional, external-security and staging-rehearsal packs. Templates are not evidence of completed approvals.

## Safe use while blocked
Use only supervised technical demonstrations with fictional cases and synthetic data. Never enter real patient-identifiable information. Do not use scores for progression, licensing, credentialing, clinical decisions or other high-stakes decisions. Do not describe this release as clinically validated, penetration-tested, institutionally approved, or production-ready.

## Outstanding product limitations
- Scoring remains formative and unvalidated.
- Educator attestation does not independently certify clinical accuracy.
- Live LLM/evidence retrieval, provider terms, citation provenance and prompt-injection protections require independent verification.
- Institutional SSO, MFA, self-service recovery, centralized account lifecycle management and several enterprise controls are not implemented.
- VR/AR remains a compatibility scaffold, not a completed immersive clinical simulation.
