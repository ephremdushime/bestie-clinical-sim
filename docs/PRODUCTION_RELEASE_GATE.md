# Production release gate

This checklist is a release blocker, not optional advice. Mark an item complete only when evidence (build log, test result, signed review, or operational record) is attached to the project.

## Engineering
- [ ] Frontend dependencies install reproducibly from a committed lockfile (`npm ci`).
- [ ] `npm run build` succeeds in CI.
- [ ] Browser end-to-end tests cover practice, investigations, report, exam join, exam expiry, exam submission and educator review.
- [ ] Individual accounts and role-based authorization replace shared access tokens.
- [ ] Every session endpoint verifies session ownership; educator-only endpoints require individual educator role.
- [ ] Rate limits, audit logs, monitoring, alerts, secret rotation and dependency scanning are enabled.
- [ ] Database migration, backup and restore drills pass.

## Clinical governance and privacy
- [ ] Every case, test result, critical error and rubric has a named qualified reviewer and review date.
- [ ] Local protocols, referral pathways, medicine safety, pregnancy/pediatric considerations and result ranges are checked against current approved guidance.
- [ ] Assessment validity, reliability, fairness and accommodations are reviewed before consequential use.
- [ ] Privacy impact assessment, retention/deletion policy, access policy and incident response are approved.
- [ ] Institutional ethics/education approval is obtained for research or student pilots where required.
- [ ] No real patient data is used without explicit authorization and safeguards.

## AI and evidence
- [ ] Live model provider integration is tested with safe timeout, malformed-response and outage cases.
- [ ] Evidence retrieval is verified against original sources; citation metadata and access/licensing status are recorded.
- [ ] Generated cases cannot be published without human clinical review.
- [ ] Fixed clinical state and investigation results are deterministic; model output cannot alter hidden state or formal scoring.

## Operations and devices
- [ ] HTTPS, firewall, backups, restore, uptime monitoring and incident contacts are operational.
- [ ] Accessibility and supported-browser testing passes.
- [ ] Any VR/AR claims are limited to hardware/browser combinations actually tested.

**Current status: BLOCKED.** See `RELEASE_STATUS.md` for what has and has not been verified in version 1.3.0.
