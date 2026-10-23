# Controlled pilot readiness and deployment checklist

## Current status

This build is suitable for supervised technical demonstrations and for collecting feedback on the product workflow. It is **not yet approved for formal clinical education, research data collection, or high-stakes examination**. The seeded cases and rubrics are drafts; the front-end production build was not verified in this environment because dependency installation timed out.

## Before a university demonstration

- [ ] Identify a clinical faculty sponsor and one reviewer per case specialty.
- [ ] Agree on the exact learning objectives and learner level.
- [ ] Review the fictional case, every vital sign, result, expected action, critical error and referral pathway.
- [ ] Confirm the scoring/report language does not imply validated clinical competence.
- [ ] Use fictional names and no real patient data, photographs, scans or hospital identifiers.
- [ ] Test the workflow on a desktop and mobile browser.
- [ ] If using an LLM, use a server-side key and review provider data-retention terms.

## Before a supervised student pilot

- [ ] Obtain applicable university/ethics approval if data are collected for research or publication.
- [ ] Approve the cases, source provenance, rubric anchors, feedback and escalation rules in writing.
- [ ] Define consent, student data access, retention/deletion, reporting and incident handling.
- [ ] Validate exam identity, access control and result release policy; current shared tokens and codes are not sufficient for a high-stakes exam.
- [ ] Conduct security, accessibility, privacy and load testing.
- [ ] Pilot with low-stakes formative use and a faculty member present.
- [ ] Evaluate usability, technical failures, educator agreement and adverse/unexpected behavior before expanding.

## Environment and deployment

1. Copy `.env.example` to `.env`.
2. Set `APP_ENV=production` only after configuring strong unique `PILOT_ACCESS_TOKEN` and `EDUCATOR_ACCESS_TOKEN` secrets.
3. Set `CORS_ORIGINS` to the exact HTTPS origin(s); avoid wildcard origins.
4. Keep LLM credentials server-side. Configure `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` only if using a compatible provider.
5. Run `docker compose up --build -d` on a managed host and place it behind HTTPS, with restricted network access and backups for the SQLite volume.
6. Confirm health endpoint, case list, student flow, educator flow, timeout enforcement and data persistence in staging.
7. Do not use the development Vite server as a public service.

## Security limitations

- Shared pilot/educator tokens are not per-user authentication and can be shared.
- Exam codes are not identity verification and are not designed to prevent impersonation.
- No institutional SSO, role lifecycle, granular permissions, password recovery or account revocation workflow.
- SQLite is intended only for small supervised tests; concurrent writes, retention controls and backups need review.
- API keys, network traffic, dependency versions and deployment logs need production security review.

## Release gates

**Gate A — demonstration:** API smoke tests pass; no real patient data; all UI limitations disclosed.

**Gate B — formative student pilot:** educator-approved cases/rubric, applicable institutional approvals, privacy and retention plan, supervised use, usability test and incident process.

**Gate C — formal examination:** individual identity/authentication, exam security, immutable case/rubric versioning, validated scoring, independent faculty agreement, audit review and institution sign-off.

**Gate D — VR/AR:** physical headset compatibility testing, real WebXR session implementation, validated patient assets, comfort/accessibility checks and specialist review.
