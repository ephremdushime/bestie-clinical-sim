# Controlled pilot readiness and deployment checklist

## Current status

This build is suitable for supervised technical demonstrations and for collecting feedback on the product workflow. It is **not yet approved for formal clinical education, research data collection, or high-stakes examination**. Automated backend, frontend-build, and browser workflows have passed on the current development branch; this is not a substitute for staging, load/security testing, clinical case validation, or institutional approval.

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
2. Set `APP_ENV=production` and `CORS_ORIGINS` to the exact trusted HTTPS frontend origin(s); wildcard and localhost origins are rejected. Shared pilot/educator tokens are development-only and are not accepted on protected production routes.
3. Keep LLM credentials server-side. Configure `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` only if using a compatible provider.
4. Run `docker compose up --build -d` on a managed host and place it behind HTTPS, with restricted network access and backups for the SQLite volume.
5. Provision the initial platform administrator from a trusted server shell: `docker compose exec api python /app/scripts/provision_account.py --email admin@example.org --display-name "Platform Administrator" --role platform_admin`. The script prompts for the password without echoing it.
6. Create institutions and institution-scoped accounts with `docker compose exec api python /app/scripts/provision_account.py --create-institution --institution-id inst-a --institution-name "Institution A"`, then create users with `--email`, `--display-name`, `--role educator` (or `institution_admin` or `learner`), and `--institution-id inst-a`.
7. Confirm health endpoint, case list, account sign-in/password change, learner flow, educator flow, timeout enforcement and data persistence in staging.
8. Do not use the development Vite server as a public service.

## Security limitations

- Production protected routes require provisioned account sessions; shared pilot/educator tokens are development-only. Account provisioning is a trusted-shell operation, not an in-app administration workflow.
- Exam codes are not identity verification and are not designed to prevent impersonation.
- No institutional SSO or self-service password recovery. Password changes revoke existing sessions; a trusted server operator can reset a lost password using `docker compose exec api python /app/scripts/provision_account.py --reset-password --email user@example.org`, which records an audit event and revokes sessions.
- SQLite is intended only for small supervised tests; concurrent writes, retention controls and backups need review.
- API keys, network traffic, dependency versions and deployment logs need production security review.

## Governance and evidence packs

The following templates prepare the evidence that must be produced by the responsible people; they do not approve the product:
- `docs/CLINICAL_FACULTY_VALIDATION_PACK.md` — case-by-case clinical review, source provenance and rubric validation.
- `docs/INSTITUTIONAL_APPROVAL_PACK.md` — institutional sponsor, ethics determination, privacy/data governance and written go/no-go.
- `docs/EXTERNAL_SECURITY_ASSESSMENT.md` — independent assessor scope, findings, remediation and retest.
- `docs/STAGING_DEPLOYMENT_REHEARSAL.md` — staging smoke tests, TLS/network checks, backup restore, observability, load/accessibility and rollback.
- `docs/PRODUCTION_RELEASE_GATE.md` — consolidated release blocker and evidence register.

Current status remains blocked for clinical/faculty validation, institutional/ethics approval, staging/restore rehearsal, and independent security assessment. Do not mark these complete from a CI run, code review, merge, or verbal agreement.

## Release gates

**Gate A — demonstration:** API smoke tests pass; no real patient data; all UI limitations disclosed.

**Gate B — formative student pilot:** educator-approved cases/rubric, applicable institutional approvals, privacy and retention plan, supervised use, usability test and incident process.

**Gate C — formal examination:** individual identity/authentication, exam security, immutable case/rubric versioning, validated scoring, independent faculty agreement, audit review and institution sign-off.

**Gate D — VR/AR:** physical headset compatibility testing, real WebXR session implementation, validated patient assets, comfort/accessibility checks and specialist review.
