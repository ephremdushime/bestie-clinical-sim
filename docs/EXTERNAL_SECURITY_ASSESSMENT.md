# Independent security and privacy assessment

**Status: NOT PERFORMED / RELEASE BLOCKER.** Automated tests and code review are not an external penetration test. This document defines work for a qualified independent assessor; it is not a claim that testing occurred.

## 1. Rules of engagement

- Engage an independent security professional or firm with documented authorization from the system owner.
- Test only an approved staging environment with synthetic data and test accounts.
- Agree written scope, source/version, IPs/domains, dates, allowed techniques, rate limits, emergency contact and stop conditions.
- Do not test production or third-party infrastructure without explicit authorization.
- Prohibit destructive testing, uncontrolled denial of service, real learner/patient data, and persistence beyond the approved window.
- Keep raw evidence, credentials and logs in restricted storage; redact secrets and personal data from tickets.

## 2. Required test areas

### Authentication and authorization
- Account provisioning, password policy, session expiry/revocation, suspended users, role escalation, MFA roadmap/risk, recovery/reset process and audit attribution.
- Direct-object reference attacks against learner sessions, reports, exams, drafts, case versions and exports.
- Institution/tenant isolation for every educator, learner, admin, WebSocket and historical reconciliation path.
- Reviewer/operator separation and evidence-backed historical ownership reconciliation.

### Assessment integrity
- Case/rubric pinning and hash validation under concurrent changes.
- Exam join-code guessing, replay, duplicate attempts, time limits, result release, hidden diagnosis/rubric confidentiality and submission idempotency.
- Browser/API tampering, stale versions, role changes during an attempt, audit log completeness and unauthorized exports.

### Web and infrastructure
- OWASP web/API risks, injection, CSRF/CORS, SSRF where applicable, security headers, cookie/token storage, rate limits, brute-force and WebSocket origin/ticket abuse.
- Secret exposure in source, images, build artifacts, logs and frontend bundles.
- Container privilege, filesystem permissions, exposed ports, TLS configuration, reverse-proxy trust, dependency and software-supply-chain risk.
- Backup confidentiality, restore integrity, access control, and deletion/retention behavior.

### AI and clinical-content attack surface
- Prompt injection through user input and retrieved/source text; refusal boundaries; data exfiltration; untrusted URL/content handling.
- Verify model output cannot mutate authoritative case state, fabricate investigation results, expose hidden exam content, or change formal scoring.
- Confirm model provider retention/training terms, API key protection, timeout, malformed output and outage behavior.
- Validate citation/source provenance behavior; never treat generated citations as verified evidence.

## 3. Deliverables required to close the gate

1. Signed scope and rules of engagement.
2. Version/commit and environment tested.
3. Methodology and test-account roles used.
4. Findings with severity, impact, reproducible evidence, affected assets and remediation.
5. Explicit residual-risk register and accepted-risk owner.
6. Retest evidence for all critical/high findings and documented disposition for lower findings.
7. Final assessor report and written sign-off by the accountable owner.

No unresolved critical/high finding may remain at release. A waiver requires documented rationale, compensating controls, named risk owner, expiry and institutional authorization; it must not be self-approved by the developer.

## 4. Finding register template

| ID | Asset / endpoint | Finding and impact | Severity | Evidence reference | Owner | Remediation commit | Retest result | Status |
|---|---|---|---|---|---|---|---|---|
| SEC-001 | Not assessed | Awaiting independent assessment | TBD | None | Unassigned | None | Not run | OPEN |

## 5. Current known boundaries

CI covers the automated tests and build checks recorded in `docs/TEST_RESULTS.md`. It does not establish external penetration testing, load capacity, operational monitoring, production TLS, backup restoration, clinical safety, or institutional approval. Do not describe this application as security-certified.
