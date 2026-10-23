# Bestie Clinical Sim — delivery roadmap and acceptance gates

## Product north star

A clinical-skills learning platform for African medical and health-sciences programmes: guided fictional patient encounters, indication-based investigation practice, formative reflection, educator-authored controlled assessments, evidence-assisted case authoring, team learning, and a presentation-independent clinical engine that can later power desktop, tablet, VR and AR experiences.

The product must support learners with different levels of spoken English and digital confidence. The UI should remain readable on modest laptops and mobile screens, with slow/clear optional patient speech, text-first fallback, accessible navigation and reduced-motion support. Clinical safety, student privacy, educator accountability and institution control are core requirements—not optional features.

## Current implementation status (repository state, not deployment status)

- Browser learner flow: practice and exam modes, fictional patient dialogue, fixed investigation results, management reflection and report.
- Educator workflow: exam creation/closure, dashboard/report access, evidence-assisted draft generation, draft review and educator-attested publication.
- Account security draft: provisioned account login/logout/current-user, hashed expiring bearer sessions, password hashing, login throttling, audit events, role checks and institution boundaries.
- Learner ownership: authenticated learner sessions are bound to the account; legacy pilot-token compatibility remains for migration.
- Content isolation: published cases are scoped to the owning institution, with global built-in cases; case-ID collision protection is added in the current draft PR.
- Collaboration draft: institution-scoped WebSocket text room with single-use, short-lived tickets. It is text-only; no synchronized case or examination state.
- WebXR: illustrative WebGL/WebXR scene and browser support detection. Real target-headset acceptance and controller-driven tasks are not complete.
- CI: automated backend checks and frontend production compilation are configured. A passing build does not prove deployment, clinical validity, privacy compliance, load resilience or hardware compatibility.

## Delivery phases

### Phase A — establish a safe release candidate

1. Review and merge the stacked identity/security pull requests in dependency order only after each relevant CI run passes.
2. Audit all HTTP and WebSocket routes for authentication, role requirements, institution scope, session ownership, and unintended body-supplied identity.
3. Keep exam-start/submission responses free of hidden diagnosis, rubric, score, pass mark and educator-only reports; maintain regression tests for every response path.
4. Review migration behavior for historical sessions, exams, drafts and published cases whose institution/owner fields are null. Create a documented dry-run/backfill plan; do not silently assign historical records to an institution.
5. Confirm production secrets, CORS allowlist, HTTPS, database persistence, backup/restore, logging redaction, rate limits and dependency scanning.
6. Add operational runbooks: first administrator bootstrap, account provisioning/deactivation, audit review, backup/restore, incident response and data retention.

**Exit criteria:** CI green on the exact release candidate; no known high-severity authorization defects; migration rehearsed against a copy; rollback documented; security and deployment review signed off.

### Phase B — learner experience and assessment quality

1. Make session resume/exit behavior explicit and recover safely from network interruption without duplicating submissions.
2. Add a structured learner progress view: completed encounters, objectives practised, reflection history and educator-assigned work, with privacy controls.
3. Improve case navigation and patient communication: history domains, focused examination prompts, vital-sign access, investigation ordering, reassessment and structured handover.
4. Keep practice feedback separate from controlled exams. The learner must not receive exam scores, hidden diagnosis, rubric decisions or pass/fail result until the configured release/review policy allows it.
5. Version cases, rubric criteria and scoring logic. Reports must record the exact case/rubric version used.
6. Add educator tools for assigning cases, cohort management, rubric editing, review queues, feedback, export and audit-friendly activity history.
7. Validate scoring against faculty-rated sample encounters before using it for progression decisions. Keep critical safety errors visible and never let a high total automatically offset a critical error.

**Exit criteria:** usability tests with representative learners and educators; faculty review of all starter cases; controlled-exam regression suite; transparent versioned scoring; accessibility review.

### Phase C — evidence-assisted case factory

1. Treat search results and model output as untrusted drafts, not clinical truth.
2. Store source URL/DOI, title, publisher, retrieval date and relevant version alongside every claim that needs evidence.
3. Add a case validation checklist covering history consistency, differential, red flags, age/pregnancy context, investigations, reference ranges, medication safety, referral thresholds and local protocol alignment.
4. Add explicit draft/review/approved/retired lifecycle states and two-person review for higher-risk scenarios.
5. Keep the hidden diagnosis and marking rubric server-side. Never place secrets or hidden assessment content in frontend bundles.
6. Use licensed, synthetic or permissioned images only. Every image must have provenance and a clear label when illustrative rather than diagnostic-quality.
7. Add automated structural validation and contradiction checks, but require qualified educator approval before publishing.

**Exit criteria:** documented source provenance; review audit trail; versioned approval; no template-only or placeholder case can publish; a qualified clinician signs off each scenario used in a pilot.

### Phase D — team learning

1. Keep room access tied to authenticated identity and institution membership; use short-lived, single-use tickets for browser WebSockets.
2. Define room membership and room types (cohort discussion, facilitator room, case debrief) before expanding permissions.
3. Add reconnect/backoff, explicit leave controls, message retention rules, moderation/reporting and abuse/rate limits.
4. Decide whether collaboration is text-only or will later support instructor-led synchronized scenarios. Do not share exam secrets or protected reports in general rooms.
5. Test cross-institution isolation, ticket expiry/reuse, disabled users, oversized messages and disconnect cleanup.

**Exit criteria:** security regression tests, institution-approved retention policy, accessibility review and a supervised team-learning pilot.

### Phase E — WebXR / VR / AR learning

1. Record exact headset, firmware, browser, controller and secure-origin requirements during the UniPod/Uniport compatibility session.
2. Verify actual immersive VR entry and clean fallback to desktop/mobile; do not infer headset support from a browser flag alone.
3. Add a small validated 3D patient/room scene and simple, reversible controller interactions before complex surgery.
4. Keep clinical case state and assessment rules on the same backend as browser mode.
5. Add interaction design for comfort, safe boundaries, seated mode, motion sickness, text legibility, captioning and immediate exit.
6. Build procedural modules only with domain-expert input: anatomy, instruments, task steps, permitted actions, error consequences and objective competency checklists.
7. Evaluate performance, rendering stability, network interruption, device compatibility and faculty usability on actual hardware.

**Exit criteria:** signed headset/device test records, no blocking accessibility/safety defects, validated content and a clear statement of what the module does and does not teach.

### Phase F — supervised institutional pilot

1. Obtain university/institution approval and any required ethics review before collecting research data or evaluating student performance.
2. Use fictional scenarios; do not connect real patient records or accept identifiable clinical information in the prototype.
3. Define a data protection plan: purpose limitation, minimum necessary data, access, retention, deletion, export, incident handling and hosting region.
4. Pilot with opt-in participants, informed consent where applicable, educator supervision and a documented support contact.
5. Track technical measures (availability, error rate, latency, completion), learning measures (objective performance and faculty rating), and usability/safety feedback separately.
6. Predefine analysis methods and avoid claiming learning efficacy from usage metrics alone.

**Exit criteria:** written approvals, tested recovery/backup, support runbook, documented risk review, pilot evaluation plan and explicit go/no-go decision.

## Definition of done for any feature

- Acceptance criteria and failure states written before implementation.
- Authorization and tenant boundary tests included where data is user- or institution-scoped.
- Controlled-exam confidentiality preserved.
- Backend tests and frontend production build pass on the exact commit.
- Keyboard, mobile layout, clear errors and reduced-motion behavior considered.
- No real patient data, embedded credentials, or unsupported clinical claims.
- Documentation accurately describes the feature and remaining limitations.
- No production deployment or merge is claimed until the relevant human approval is complete.
