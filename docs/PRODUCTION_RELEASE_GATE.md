# Production release gate

This checklist is a release blocker, not optional advice. Mark an item complete only when evidence is attached.

## Engineering
- [ ] Frontend dependencies install reproducibly from a committed lockfile (`npm ci`).
- [ ] `npm run build` succeeds in CI.
- [ ] Browser end-to-end tests cover practice, investigations, report, exam join, expiry, submission and educator review.
- [ ] Individual accounts and role-based authorization replace shared access tokens.
- [ ] Session ownership is verified; educator endpoints require an individual educator role.
- [ ] Rate limits, audit logs, monitoring, alerts, secret rotation and dependency scanning are enabled.
- [ ] Database migration, backup and restore drills pass.

## Clinical governance and privacy
- [ ] Every case, test result, critical error and rubric has a named qualified reviewer and review date.
- [ ] Local protocols, referral pathways, medicine safety, pregnancy/pediatric considerations and result ranges are checked against approved guidance.
- [ ] Assessment validity, reliability, fairness and accommodations are reviewed before consequential use.
- [ ] Privacy impact assessment, retention/deletion policy, access policy and incident response are approved.
- [ ] Institutional approval is obtained for research or student pilots where required.
- [ ] No real patient data is used without authorization and safeguards.

## AI and operations
- [ ] Live model integration, retrieval provenance, timeout/error cases and prompt-injection protections are verified.
- [ ] Generated cases cannot be published without human clinical review.
- [ ] HTTPS, firewall, backups, restore, monitoring and incident contacts are operational.
- [ ] Accessibility and supported-browser testing passes.
- [ ] VR/AR capabilities are described accurately and verified on target devices.
