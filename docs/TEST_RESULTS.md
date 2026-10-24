# Test results — Bestie Clinical Sim

## Latest verified CI revision on main

- Merge commit: `33e9394ac7c456fba67f56487a9755067e9dccc8`
- GitHub Actions run: [40138514028](https://github.com/ephremdushime/bestie-clinical-sim/actions/runs/40138514028)
- Result: all four CI jobs passed after merge.

| Check | Result | Scope / limitation |
|---|---|---|
| Backend release suite | PASS — 70 tests | Isolated backend, identity, exam/session integrity, tenant isolation, reconciliation, backup and provisioning tests |
| Frontend production build | PASS | Production frontend bundle compiled |
| Frontend browser workflows | PASS — 6 tests | Browser workflow coverage; not full accessibility/device certification |
| Live backend browser workflows | PASS — 2 tests | Practice workflow and controlled-exam submission confidentiality |
| Docker Compose validation | PASS | Configuration validation only |
| Backend container build | PASS | Image builds as unprivileged `appuser`; writable data directory asserted |
| Frontend container build | PASS | Container build completed |
| Nginx configuration | PASS | Configuration syntax validated |

## Security controls covered by regression tests

- Production protected routes require provisioned bearer sessions; suspended or institution-unassigned accounts are denied.
- Educator dashboards, exam actions, case drafts, published cases and learner sessions are institution-scoped.
- Controlled exams enforce learner role, matching institution, one attempt per account, pinned case/rubric versions and snapshot hashes.
- Session submission is one-time; the learner-facing exam response withholds the hidden diagnosis and scoring decisions.
- Historical records with no attributable owner remain quarantined. Reconciliation requires an active platform administrator, a different independently authenticated platform-admin reviewer, an evidence reference, and consistent existing account/parent ownership.
- WebSocket tickets are short-lived and single-use; production Origin, institution-room boundaries and message rate limits are checked.
- Container and deployment configuration checks cover non-root API execution and Nginx syntax.

## What these results do not prove

CI does not inspect a live institution's production database or prove that a real historical record has been reconciled. No assignment should be inferred from these tests. Use `docs/HISTORICAL_DATA_RECONCILIATION.md` against an authorized, backed-up database and keep ambiguous records quarantined.

The checks do **not** establish clinical validation, institutional approval, high-stakes examination validity, production deployment readiness, external penetration-test completion, load capacity, successful backup restoration, or incident-response readiness. Scoring remains formative and unvalidated; clinical cases and rubrics require qualified faculty review. A staging deployment rehearsal and institutional sign-off remain required before real learner data or consequential examinations are used.

The governance and operational evidence packs added in this branch are templates only. Their statuses remain BLOCKED / NOT PERFORMED until an accountable institution, qualified faculty and independent assessor produce evidence outside CI.
