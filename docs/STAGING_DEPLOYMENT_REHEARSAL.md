# Staging deployment and disaster-recovery rehearsal

**Status: NOT RUN.** Do not mark a deployment gate complete from a successful container build. Run this procedure in a staging environment owned by the operator, with synthetic data and approved access.

## 1. Pre-flight and change control

- [ ] Record release tag, commit SHA, operator, date/time, rollback owner and maintenance window.
- [ ] Confirm institution sponsor, privacy/security approvals and intended-use scope are documented.
- [ ] Confirm host/region, data residency, processor terms, DNS owner and incident contact.
- [ ] Pin reviewed image digests and dependency artifacts; review release notes and migrations.
- [ ] Store production secrets in a managed secret store, not .env committed to Git or copied into artifacts.
- [ ] Use distinct high-entropy secrets; set APP_ENV=production and exact trusted HTTPS CORS_ORIGINS.
- [ ] Verify no wildcard/localhost CORS or development tokens are enabled in production.
- [ ] Configure HTTPS/TLS, renewal monitoring, firewall/security groups, least-privilege network access and appropriate security headers.
- [ ] Restrict administrative shell access and provision a named platform administrator through the trusted provisioning procedure.
- [ ] Verify account provisioning, password reset, revocation and institution membership before test enrollment.

## 2. Deploy and smoke test

Record command, output/evidence reference, operator and result for each check.

- [ ] Pull/build the reviewed release from the exact commit.
- [ ] Start API and frontend behind the intended reverse proxy.
- [ ] Verify health endpoint, frontend delivery, API routing, TLS certificate and redirect behavior.
- [ ] Verify logs do not contain credentials, session bearer tokens, learner answers, or unnecessary sensitive data.
- [ ] Verify sign-in, sign-out/revocation, role restrictions and institution boundaries with at least two isolated test institutions.
- [ ] Complete practice journey using a synthetic case and learner account.
- [ ] Complete educator exam creation, learner join, expiry/submission, pending-review response and authorized educator review.
- [ ] Verify no learner response reveals hidden diagnosis, rubric details, or unauthorized reports.
- [ ] Verify case/rubric version pinning and audit events survive process restart.
- [ ] Verify rate limiting, timeouts, invalid inputs, dependency outage behavior and controlled service restart.
- [ ] Confirm no real patient data is present.

## 3. Backup and restore drill

The backup script creates a consistent SQLite backup and checks SQLite integrity; it does not by itself prove recoverability or off-host durability.

- [ ] Configure restricted, encrypted, off-host backup destination and access policy.
- [ ] Create a backup using scripts/backup_database.py --output-dir <restricted-backup-directory>.
- [ ] Record checksum, timestamp, database identity, operator and storage location in a restricted operations log.
- [ ] Confirm backup is copied off-host and is not only inside the application volume.
- [ ] Restore into a separate isolated test environment; never overwrite the live database during the drill.
- [ ] Run SQLite integrity check and application-level checks for users, institutions, case/rubric versions, exam/session references and audit continuity.
- [ ] Confirm expected access controls and historical quarantines remain intact after restore.
- [ ] Record recovery time, recovery point, data loss estimate, defects and corrective actions.
- [ ] Delete test copies securely when permitted and verify access logs.

## 4. Observability and operations

- [ ] Centralized structured logs with restricted access and retention.
- [ ] Uptime/health checks, alert delivery test, disk-space and database-growth alerts.
- [ ] Security-event alerting for repeated failed logins, authorization denials, unusual exports and admin changes.
- [ ] Documented incident severity, contact tree, containment, notification, forensic preservation and recovery steps.
- [ ] Assign patching, dependency review, secret rotation, vulnerability triage and account offboarding owners.
- [ ] Define RPO/RTO with the institution; verify by restore drill, not assumption.
- [ ] Test rollback to the previous known-good image and compatible database state.

## 5. Performance, accessibility and exit criteria

- [ ] Define expected concurrent learners and workload before load testing.
- [ ] Run authorized load/soak tests; record latency percentiles, error rate, saturation and recovery.
- [ ] Test supported browsers, keyboard-only navigation, focus visibility, reduced motion, contrast and screen-reader-critical flows.
- [ ] Test network interruption/reconnection and data persistence.
- [ ] Record defects and re-run tests after fixes.

## 6. Sign-off

- Release/commit:
- Staging URL (do not include credentials):
- Operator and date:
- CI evidence:
- TLS/network evidence:
- Smoke-test evidence:
- Backup/restore evidence:
- Load/accessibility evidence:
- Open defects and risk owner:
- Rollback tested:
- Decision: **BLOCKED / TECHNICAL DEMONSTRATION ONLY / APPROVED FOR DEFINED FORMATIVE PILOT**
- Approver and controlled evidence reference:

A successful rehearsal only approves the stated environment and use. It does not replace external security testing, clinical/faculty validation, or institutional approval.
