# Production readiness execution sequence

**Release decision: BLOCKED.** Code presence is not verification; attach evidence for every completed item.

## 1. Verifiable builds
- [ ] Review and merge the CI workflow so pull requests receive checks.
- [ ] Run backend smoke and mocked-LLM tests on the latest security branch and fix failures.
- [ ] Generate a genuine npm lockfile with the project toolchain; verify `npm ci` and `npm run build` in CI.
- [ ] Add dependency scanning and browser end-to-end tests for practice, investigations, reports, exam join/expiry/submission and educator review.

## 2. Identity and authorization
- [ ] Choose an institutional OIDC provider or maintained identity provider.
- [ ] Implement verified identity, individual accounts, revocation and institution-scoped roles.
- [ ] Enforce resource ownership on every session, exam, report, draft and review endpoint.
- [ ] Attribute clinical review to authenticated identities, not request-body names.
- [ ] Migrate legacy records only with authorized ownership mapping; otherwise mark them unattributed.
- [ ] Add negative tests for every role/resource boundary.

## 3. Assessment integrity
- [ ] Test hidden-case confidentiality across API responses, errors, logs and exports.
- [ ] Test timing, exam closure, concurrent submission, replay and idempotency.
- [ ] Keep formative scores labelled unvalidated until assessment evidence exists.
- [ ] Do not use the current prototype for high-stakes examinations.

## 4. Clinical content and learning quality
- [ ] Maintain a versioned case register with learning objectives, source references, intended level, risk rating, qualified reviewer and review date.
- [ ] Have qualified reviewers verify cases, results, interpretations, critical errors and rubrics against current approved guidance.
- [ ] Validate local referral pathways, escalation and medicine guidance with the institution.
- [ ] Test the complete learner journey: history, examination, differential, indicated investigations, management, handover, follow-up and debrief.
- [ ] Keep clinical state and investigation results deterministic; generated content must not publish without human review.
- [ ] Evaluate accessibility, fairness and assessment validity before consequential use.

## 5. Privacy and operations
- [ ] Complete privacy impact, retention/deletion, access and incident-response documentation.
- [ ] Use synthetic data unless other use is explicitly approved.
- [ ] Add rate limits, restricted audit logs, monitoring, alerts, secret rotation and dependency scanning.
- [ ] Test database migrations, backup restoration, HTTPS, trusted origins and security configuration.
- [ ] Test LLM timeout, malformed output, rate limits and outage handling.
- [ ] Keep production collaboration disabled until identity, room authorization, message bounds and abuse controls are tested.
- [ ] Describe WebXR as a compatibility scaffold until hardware and interactions are actually tested.

## 6. Institutional release
A supervised technical demonstration with fictional cases is not the same as a formal student pilot or consequential assessment. Obtain applicable institutional education, privacy, security and ethics approvals before a pilot. Require independent assessment validation before consequential use. Hosting alone does not make the system production-ready.

## Immediate sequence
1. Get CI onto the default branch through normal review and merge.
2. Run and fix security regression tests.
3. Implement identity and authorization with reviewed schema migrations.
4. Add browser-level journey tests.
5. Begin qualified clinical content review in parallel; do not mark cases approved without actual review evidence.
