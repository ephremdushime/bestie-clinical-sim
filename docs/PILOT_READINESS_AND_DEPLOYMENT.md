# Controlled pilot readiness and deployment checklist

## Current status

This build is suitable for supervised technical demonstrations and for collecting feedback on the product workflow. It is **not yet approved for formal clinical education, research data collection, or high-stakes examination**. CI verifies the frontend build and browser workflows, but deployment-like operations and clinical validation remain outstanding.

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
- [ ] Validate tenant scoping, account ownership, exam identity and result-release policy in a deployment-like environment; no code-based access control alone is sufficient for high-stakes exams.
- [ ] Conduct security, accessibility, privacy and load testing.
- [ ] Pilot with low-stakes formative use and a faculty member present.
- [ ] Evaluate usability, technical failures, educator agreement and adverse/unexpected behavior before expanding.

## Environment and deployment

1. Copy `.env.example` to `.env`.
2. Set `APP_ENV=production` only after setting explicit trusted `CORS_ORIGINS`, bootstrapping the first platform administrator once with `python scripts/bootstrap_admin.py`, provisioning institutional accounts through the authenticated admin API, and verifying bearer-session login/logout.
3. Set `CORS_ORIGINS` to the exact HTTPS origin(s); avoid wildcard origins.
4. Keep LLM credentials server-side. Configure `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` only if using a compatible provider.
5. Run `docker compose up --build -d` on a managed host and place it behind HTTPS, with restricted network access and backups for the SQLite volume.
6. Confirm health endpoint, case list, student flow, educator flow, timeout enforcement and data persistence in staging.
7. Do not use the development Vite server as a public service.

## Security limitations

- Shared pilot/educator tokens are retired for production session creation. Legacy unowned sessions may still require their per-session capability during migration.
- Exam codes are not identity verification and are not designed to prevent impersonation.
- Login/logout/current-user and tenant-scoped account provisioning/status-management APIs are available. The first platform administrator is bootstrapped manually; password recovery, MFA, institutional SSO and full account lifecycle automation remain incomplete.
- SQLite is intended only for small supervised tests; concurrent writes, retention controls and backups need review.
- API keys, network traffic, dependency versions and deployment logs need production security review.

## Tenant ownership and legacy records

- Built-in teaching cases are shared across institutions. Cases created and published by educators are assigned to the creator's institution and are visible only to that institution and platform administrators.
- Existing published cases without a trusted institution assignment are intentionally hidden from institution-scoped accounts until an authorized migration assigns ownership. Their records are not deleted automatically.
- Legacy sessions without a trusted owner/institution are not exposed to institution-scoped educator dashboards. Reconcile ownership before importing production or pilot data.
- Institution administrators manage accounts through the administration routes; educator sessions, case review/publishing, and exam-management routes require an educator or platform-administrator role.
- Verify these behaviors against a copy of the existing SQLite database before a pilot. Keep a recoverable backup and document any manual ownership reassignment.

## Release gates

**Gate A — demonstration:** API smoke tests pass; no real patient data; all UI limitations disclosed.

**Gate B — formative student pilot:** educator-approved cases/rubric, applicable institutional approvals, privacy and retention plan, supervised use, usability test and incident process.

**Gate C — formal examination:** individual identity/authentication, exam security, immutable case/rubric versioning, validated scoring, independent faculty agreement, audit review and institution sign-off.

**Gate D — VR/AR:** physical headset compatibility testing, real WebXR session implementation, validated patient assets, comfort/accessibility checks and specialist review.
