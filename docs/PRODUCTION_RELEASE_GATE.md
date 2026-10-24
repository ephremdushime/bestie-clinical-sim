# Production release gate

**Current decision: BLOCKED — technical pilot candidate only.** This checklist is a release blocker, not optional advice. Mark an item complete only when the evidence exists, is reviewed by the accountable person, and is linked in the controlled release record. A GitHub merge or green CI is not clinical, institutional, or external security approval.

## Gate 0 — automated engineering evidence

- [x] CI on main passed for commit 33e9394ac7c456fba67f56487a9755067e9dccc8: backend release tests, frontend build/browser tests, live-backend browser workflows, container builds, Compose validation, non-root API checks and Nginx validation.
- [x] Tenant isolation, assessment-version integrity and historical ownership quarantine have automated regression coverage.
- [ ] Pin a committed frontend lockfile and use reproducible dependency installation (npm ci); CI currently uses npm install.
- [ ] Add dependency/SBOM and secret scanning, vulnerability triage, and a documented update cadence.
- [ ] Complete full accessibility review and broader browser/device coverage.

CI evidence: https://github.com/ephremdushime/bestie-clinical-sim/actions/runs/40138514028

## Gate 1 — clinical content and assessment validity (BLOCKED)

Use docs/CLINICAL_FACULTY_VALIDATION_PACK.md and docs/AI_SOURCE_GOVERNANCE.md.

- [ ] Appoint qualified reviewers for every built-in and educator-authored case; retain qualifications, conflicts and written decisions.
- [ ] Verify source provenance against the original current Rwanda-relevant protocols and approved referral pathways.
- [ ] Review every history, vital, investigation result/range, expected action, medicine, critical error, feedback item and image label.
- [ ] Version and approve each case and rubric; any material change requires review of the new version.
- [ ] Validate rubric anchors and scoring with independent assessors; document agreement, disagreements, fairness, accommodations and intended-use limits.
- [ ] Keep scoring formative unless a separately governed validity/reliability study and authorized decision support its proposed use.
- [ ] Record case/version/hash, reviewers, evidence references, conditions and review expiry in the institution's controlled records.

No faculty evidence has been supplied in this repository; all case rows start NOT REVIEWED. Do not infer approval from educator attestation, automated tests or generated citations.

## Gate 2 — institutional authorization, ethics and privacy (BLOCKED)

Use docs/INSTITUTIONAL_APPROVAL_PACK.md.

- [ ] Name a faculty sponsor, accountable operator and institutional owner.
- [ ] Obtain written determination from the relevant ethics/IRB authority on whether review is required; secure approval before any research activity that requires it.
- [ ] Obtain education/assessment, privacy/DPO, IT/security and legal/procurement approvals as applicable.
- [ ] Approve purpose, cohort, dates, permitted data, notice/consent where applicable, access, retention/deletion, complaint and incident paths.
- [ ] Review hosting/data residency, subprocessors and LLM-provider retention/training terms.
- [ ] Obtain final written go/no-go for the exact version, site and use.

No institutional or ethics approval is claimed.

## Gate 3 — deployment and operational resilience (BLOCKED)

Use docs/STAGING_DEPLOYMENT_REHEARSAL.md and docs/PILOT_READINESS_AND_DEPLOYMENT.md.

- [ ] Deploy to an institution-controlled staging environment with HTTPS/TLS, exact CORS origins, firewall/network restrictions and managed secrets.
- [ ] Verify named account provisioning, session revocation, institution isolation and least privilege in staging.
- [ ] Run end-to-end practice and controlled-exam workflows using fictional data.
- [ ] Enable monitoring, security alerts, log retention, incident contacts and a tested incident-response procedure.
- [ ] Create encrypted off-host backups and perform an isolated restore drill; check application-level integrity and historical quarantine, not only SQLite PRAGMA integrity_check.
- [ ] Record agreed RPO/RTO, performance/load results, recovery time and rollback test.
- [ ] Complete accessibility and supported-device checks; do not claim VR/AR functionality beyond actual tests.
- [ ] Obtain operator sign-off for the exact deployment environment.

A container build and Compose validation are not a deployment rehearsal. No production deployment, successful restore drill, load test or operational monitoring is claimed.

## Gate 4 — independent security/privacy assessment (BLOCKED)

Use docs/EXTERNAL_SECURITY_ASSESSMENT.md.

- [ ] Obtain written scope and rules of engagement from the system owner.
- [ ] Have an independent qualified assessor test an authorized staging environment using synthetic data.
- [ ] Assess authentication, role/tenant boundaries, object-level authorization, exam confidentiality, WebSockets, secrets, API/web risks, dependencies, container/TLS, backup/restore and AI prompt/data boundaries.
- [ ] Record findings, severity, evidence, owner, remediation and independent retest.
- [ ] Close all critical/high findings; any residual-risk exception must have a named institutional risk owner, expiry, compensating controls and written authorization.
- [ ] Retain the final assessor report and release decision in restricted controlled records.

Automated CI is not an external penetration test. No independent assessment or security certification is claimed.

## Permitted use while blocked

Only supervised technical demonstrations using fictional cases and synthetic data, with limitations disclosed. Do not enter real patient data. Do not use results for clinical care, progression, licensing, credentialing or other high-stakes decisions. Do not advertise the build as clinically validated, institutionally approved, penetration-tested or production-certified.

## Final release decision record

- Exact commit / image digest:
- Environment and intended use:
- Clinical faculty evidence reference:
- Assessment validation evidence reference:
- Institutional/ethics/privacy approval reference:
- Deployment and restore evidence reference:
- Independent security report and retest reference:
- Residual risks / risk owner / expiry:
- Decision: BLOCKED / TECHNICAL DEMONSTRATION ONLY / APPROVED FOR DEFINED FORMATIVE PILOT
- Accountable approver and date:
