# Product validation and institutional pilot acceptance

**Status:** Draft acceptance record. This file is not a sign-off and must not be presented as evidence that external review or hardware testing has happened.

## Current automated evidence

| Check | Evidence | Status |
|---|---|---|
| Backend regression suite | GitHub Actions run 40038043332 on commit `dbfe189e21095ac9c040759988f6dd0039597c5e` | Passed: 28 tests, 3 warnings |
| Frontend production build | GitHub Actions run 40038043332 on commit `dbfe189e21095ac9c040759988f6dd0039597c5e` | Passed |
| Exam confidentiality | Automated regression checks for start, submission and resume responses | Automated only; faculty/security review still required |
| Institution isolation | Automated tests for learner ownership, case visibility, cohort membership and scoped exports | Automated only; external security review still required |
| Legacy migration inventory | `backend/migration_review.py` opens the selected SQLite database read-only | Tool implemented; must be run against an approved database copy |
| WebXR rendering/interactions | WebGL preview and early select/squeeze region-focus interaction in source | Not accepted on actual target hardware |

## Required sign-offs

### 1. Clinical content and assessment

- [ ] Name and affiliation of reviewing clinical educator recorded.
- [ ] Every starter case reviewed against current, jurisdiction-appropriate clinical guidance.
- [ ] Critical errors, referral thresholds, medication/pregnancy/pediatric safety and investigation values checked.
- [ ] Rubric criteria, weights, versioning and feedback validated against faculty-marked examples.
- [ ] Inter-rater agreement and known limitations documented.
- [ ] Written confirmation that prototype scores are not used for high-stakes decisions.

### 2. Learner and educator usability

- [ ] Test with representative medical/health-sciences learners and educators.
- [ ] Observe first-run sign-in, case selection, session recovery, investigation ordering, submission and assignment completion.
- [ ] Test small laptop, mobile browser, keyboard-only use, screen reader labels, contrast, zoom and reduced motion.
- [ ] Test slow/unstable connectivity, reload during active practice and reload during timed examination.
- [ ] Record task completion, errors, accessibility barriers, feedback and issue owners.
- [ ] Confirm the app clearly labels fictional content and does not accept real patient-identifiable information.

### 3. Security and privacy

- [ ] Independent reviewer examines every HTTP and WebSocket route, tenant boundary, session lifecycle, exam secrecy, CSV export and audit trail.
- [ ] Test authentication throttling, disabled/suspended users, expired/replayed tickets, cross-tenant object IDs and abuse/rate limits.
- [ ] Confirm CSRF/origin strategy, HTTPS-only deployment, secret rotation, log redaction and dependency vulnerability response.
- [ ] Run ownership-gap inventory against a copy; obtain a steward-approved classification for each historical record.
- [ ] Complete backup/restore rehearsal and a reviewed rollback plan before data migration.
- [ ] Institution approves data purpose, access, retention, deletion, hosting region and incident-response procedure.

### 4. Deployment and operations

- [ ] Production secrets unique and stored in a secret manager; no example credentials remain.
- [ ] CORS restricted to the actual frontend origins; HTTPS and trusted proxy settings verified.
- [ ] Database persistence, write permissions, backup schedule, restore verification and monitoring tested.
- [ ] Account provisioning, disabling, password recovery and incident response documented.
- [ ] Load/error smoke tests and database concurrency tests completed.
- [ ] Exact release commit, dependency lockfiles, CI artifacts and rollback target recorded.

### 5. WebXR / VR / AR acceptance

Record device/browser/firmware versions, date, tester and evidence before checking these items.

- [ ] Actual target headset successfully starts and ends an immersive VR session over the intended secure origin.
- [ ] Both eyes render correctly; no persistent flicker, clipping or unacceptable frame drops.
- [ ] Controller select/squeeze events are detected; focus feedback is understandable and accessible.
- [ ] Desktop/mobile fallback works if WebXR is unavailable or denied.
- [ ] Comfort, seated/standing use, boundaries, immediate exit and session interruption are tested.
- [ ] Faculty reviews the scene and approves what is represented; no synthetic scene is described as diagnostic-quality anatomy or imaging.
- [ ] Any procedural task has its own validated objectives, safety controls and competency assessment.

## Go / no-go decision

Do not launch an institutional pilot until all required security, privacy, clinical and operational approvals are signed and blocking defects are resolved. Passing CI is necessary but insufficient. Record the decision, date, approving institution, accepted limitations and conditions for rollback here.
