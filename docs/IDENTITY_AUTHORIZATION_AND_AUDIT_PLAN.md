# Identity, authorization and audit implementation plan

**Status:** Proposed implementation design. Not evidence that authentication has been implemented or independently reviewed.  
**Applies to:** Bestie Clinical Sim API, educator workflows, learner sessions, examinations and future collaboration.

## Why this is a release blocker

The current prototype uses shared pilot and educator tokens. Session-scoped secrets reduce numeric session-ID guessing, but do not establish a person's identity or institutional role. The case-review API accepts a reviewer name in the request body, which is user-supplied text, not verified identity. A shared educator secret cannot attribute actions to an individual or safely support revocation for one person.

Do not treat the current token model as production authentication. Do not use this prototype for high-stakes examinations or unsupervised clinical education.

## Target architecture

### Identity provider and authentication

Prefer institution-managed OpenID Connect (OIDC) / OAuth 2.0 authorization-code flow with PKCE when the pilot institution can provide it. If institutional SSO is not available, evaluate a maintained identity provider rather than implementing password storage, password reset, MFA and session security from scratch.

- The browser must not receive provider client secrets.
- Validate issuer, audience, signature, expiry, nonce and permitted algorithms on the server.
- Use short-lived sessions and secure, HttpOnly, SameSite cookies where compatible with the selected architecture; protect state-changing requests against CSRF.
- Require MFA for educator/admin accounts where supported.
- Provide individual account disablement and session revocation.
- Do not accept role, reviewer identity, learner identity or institution from an untrusted request body as authoritative.

### Authorization model

Resolve identity from a verified server-side authentication context, then enforce role and resource ownership at every protected endpoint.

| Role | Intended permissions |
|---|---|
| Learner | Access own sessions, submit own work, see only released feedback |
| Educator | Create/close exams, review submissions for assigned cohorts, manage assigned case drafts |
| Clinical reviewer | Review and attest clinical content within an explicitly granted scope |
| Institution administrator | Manage institution-scoped accounts, cohorts and configuration; no automatic clinical approval |
| Platform operator | Operate infrastructure; no routine access to learner assessment content |

Roles must be institution-scoped. Use deny-by-default authorization. Separate the ability to draft content from the authority to clinically approve it. For formal assessment, ensure learners cannot retrieve hidden case identifiers, diagnosis, rubric, scoring, threshold decisions, educator reports or answer keys before release.

### Resource ownership and assessment integrity

- Associate every learner session with an immutable authenticated subject ID and institution/cohort scope.
- Continue using cryptographically random per-session secrets only as a transitional control; do not use numeric IDs as authorization.
- Verify session ownership on every chat, investigation, finish, report and future attachment endpoint.
- Associate each exam with its creator, institution, target cohort, selected case version, timing policy and lifecycle status.
- Prevent a learner from joining closed exams, altering another learner's submission, or reading educator-only reports.
- Make exam submission idempotent and protect against duplicate submissions and race conditions.
- Use server-side timestamps and lifecycle checks; do not trust client clocks or client-provided identity.
- Keep hidden diagnosis and scoring data out of learner responses until the educator explicitly releases results.

### Clinical-review attribution

- Derive reviewer identity from the authenticated subject, not a request-body `reviewer` field.
- Record the exact case version, review decision, reviewer subject, institution, timestamp and review notes.
- Require separate draft, review and publication states; publication must not imply independent certification.
- Where risk warrants it, require a second qualified reviewer before a case can be released.
- Keep clinical approval separate from platform administration.

### Audit and privacy

Record security-relevant events: successful/failed sign-in, account/role changes, exam creation/closure, exam join, submission, feedback release, case review/publication, access-denied events and administrative actions.

Audit records should include event type, actor subject, institution, resource ID/version, server timestamp, outcome and correlation ID. Avoid logging credentials, session secrets, API keys, unnecessary patient-like dialogue or full assessment content into infrastructure logs. Restrict audit-log access and document retention/deletion, export and incident procedures. Define a privacy impact assessment and institution-approved lawful basis before a real student pilot.

### Collaboration

Keep production WebSocket collaboration disabled until each connection has verified identity, authorized room membership, bounded message sizes, connection/message rate limits, origin checks, safe disconnect/revocation behaviour and abuse monitoring. Never place shared secrets in URL query parameters.

## Migration sequence

1. **Foundation:** choose and document the identity provider; define institution, user, role, cohort and session identifiers; add schema migrations and rollback strategy.
2. **Authentication:** implement callback/session lifecycle, logout/revocation, CSRF protection, security headers and authentication integration tests.
3. **Authorization:** add centralized dependency/policy checks and migrate every educator and session endpoint. Add negative tests for each role/resource pair.
4. **Data migration:** retain existing prototype data as unassigned legacy records; do not guess who owns historical sessions. Require an authorized mapping or explicitly mark records as legacy/unattributed.
5. **Clinical governance:** bind review decisions to authenticated qualified reviewers; add versioned approval and release workflows.
6. **Audit and operations:** verify immutable/restricted audit access, monitoring, alerting, backups, restore tests and incident runbooks.
7. **Browser validation:** test login/logout, expired/revoked sessions, multiple accounts, direct API calls, cross-user session access, exam confidentiality, concurrent submissions and feedback release.
8. **Controlled rollout:** run in a non-production environment with synthetic data; obtain institutional security, privacy and clinical-governance sign-off before a real student pilot.

## Required acceptance evidence

- A documented identity-provider decision and threat model.
- Automated tests proving unauthenticated requests are rejected and every role/resource boundary is enforced.
- Automated tests proving one learner cannot access another learner's sessions or reports.
- Automated tests proving educators can only access permitted institution/cohort resources.
- Audit records identify the authenticated actor and cannot be forged through request payloads.
- Hidden exam data remains inaccessible until authorized release, including through errors, exports and alternate endpoints.
- Session revocation and disabled-account behaviour are verified.
- Database migration and rollback are tested against a copy of existing data.
- Independent security review and institution approval are recorded.

## Explicit non-goals for the first secure milestone

Do not build a bespoke password-management system, automatic clinical certification, high-stakes automated pass/fail decisions, production WebSocket collaboration, or real-patient-data support as shortcuts. Those require separate decisions, controls and evidence.

## Current state

The existing prototype still uses shared pilot/educator tokens. This document is a design plan only. It does not mark authentication, RBAC, audit attribution, clinical review or the production release gate complete.
