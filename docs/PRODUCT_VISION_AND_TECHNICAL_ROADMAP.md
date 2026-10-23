# Bestie Clinical Sim: Product Vision and Technical Roadmap

## Product vision

Bestie Clinical Sim is a clinical-skills learning and assessment platform for medical and health-sciences education. It should let learners practise clinical encounters, clinical reasoning, investigation selection and interpretation, emergency prioritization, procedural preparation, and team communication in a safe simulated environment before supervised work with real patients.

The long-term product is not just a chatbot or a collection of web pages. It is a reusable simulation engine that can power browser-based cases, educator-led sessions, skills-laboratory exercises, and eventually immersive VR/AR experiences. The same reviewed clinical scenario and state rules should work across presentation modes.

## Learning experiences

### 1. Clinical encounters and decision-making
- Fictional patients with coherent histories, observations, examination findings, and defined clinical states.
- Focused history-taking, patient-centred communication, consent, professionalism, and respect.
- Indication-aware investigation ordering, fixed case-specific results, interpretation, differential diagnosis, management planning, safety-netting, referral, and structured handover.
- Emergency scenarios that reward recognition of instability, ABCDE priorities, timely escalation, and avoiding delays caused by non-urgent investigations.
- Transparent formative feedback that explains observed evidence and gaps. Scores must not be presented as validated high-stakes measures without appropriate validation.

### 2. Educator and institutional workspace
- Educators create or select cases, define learning objectives, assign practice or controlled assessments, set time limits, and review learner work.
- Controlled examinations keep the case identity, hidden diagnosis, pass mark, and answer key confidential until release is authorized.
- Case authoring supports educator-authored content and optional model-assisted drafts. Search results and generated content are evidence leads, not clinical approval.
- Every published case needs structured source provenance, version history, a named qualified reviewer, review date, and a documented approval process.
- Institutional roles, individual accounts, least-privilege permissions, auditability, and data-retention controls are required before a real university deployment.

### 3. Laboratory, anatomy, and procedural skills
- Extend beyond text cases to laboratory identification and interpretation, specimen selection, normal/abnormal patterns, and explanation of pre-analytical limitations.
- Add anatomy and cadaver-based learning support, surgical anatomy identification, instrument recognition, procedural sequencing, and supervised skills-lab scenarios.
- Provide emergency and procedural practice before supervised real-patient procedures. Simulations must clearly distinguish educational models from real diagnostic images or clinical advice.
- Any procedure-specific scoring must be task-specific, reviewed by qualified educators, and validated before consequential assessment.

### 4. Voice, teamwork, and immersive learning
- Add clear, adjustable-speed spoken patient dialogue and speech transcription for learners who benefit from slower, accessible English.
- Support structured team scenarios, role assignment, synchronized case state, educator observation, and debriefing. A message room alone is not sufficient for synchronized clinical simulation.
- Progress to tested headset compatibility, then a real 3D patient and environment, spatial interaction, controllers, and haptics where supported.
- VR/AR compatibility indicators must not imply that a production immersive experience exists until the complete experience has been implemented and tested on named devices.

## Product principles

1. **Clinical safety first.** The deterministic case engine owns patient facts, observations, investigation results, hidden state, examination timing, and scoring inputs. A language model may help with dialogue or draft content but must not silently change these.
2. **Human clinical governance.** No generated case is clinically approved merely because it is well-formed, sourced, or passes automated checks.
3. **Fictional data by default.** Do not enter real patient-identifiable information. Any future real-data use requires explicit institutional authorization, privacy review, and appropriate safeguards.
4. **Assessment integrity.** Separate practice and examination modes; enforce authorization and session ownership on every relevant endpoint; do not disclose hidden exam data through APIs, logs, or error messages.
5. **Accessible and locally relevant.** Use plain language, support varied learner needs, and review clinical pathways against current approved Rwandan and relevant international guidance.
6. **Evidence and transparency.** Preserve source metadata, uncertainty, case version, reviewer attestation, and a record of what the system actually tested.
7. **Reusable architecture.** Keep the clinical scenario/state engine independent of the web interface so browser, voice, skills-lab, and immersive clients can share approved content.
8. **Professional product quality.** Keep user-facing content, code, documentation, and release notes purposeful and consistent. Do not add irrelevant assistant-directed boilerplate or unsubstantiated claims. Preserve accurate disclosures, third-party licenses, and required provenance.

## Current technical baseline

The current codebase is a browser-based prototype with a React/Vite frontend and FastAPI backend. It includes a small set of fictional cases, text-based patient interaction, case-specific investigation results, formative reports, educator exam creation/review screens, draft case authoring, and an early WebXR compatibility check.

The existing immersive view is a roadmap/compatibility scaffold, not a complete 3D clinical simulator. Voice-based patient interaction, synchronized team-state simulation, production identity management, and procedural/cadaver training are future capabilities, not current completed features.

The backend currently uses SQLite and shared pilot/educator access tokens in production configuration. Session bearer secrets are issued per session, but shared tokens are not individual university identities or a complete role-based access system. The system must not be treated as production-certified on that basis.

## Target architecture

- **Client applications:** responsive browser application first; future voice, skills-lab, and VR/AR clients.
- **Simulation domain:** versioned cases, fixed patient facts, observations, investigation catalogue/results, clinical events, scenario state transitions, timing, and transparent rubric inputs.
- **Application API:** authenticated session operations, educator authoring/review, examination management, reporting, and audit events.
- **Identity and authorization:** individual accounts, role-based permissions, session ownership, secure credential/session lifecycle, and educator/institution boundaries.
- **Persistence:** versioned relational schema, migrations, retention rules, protected secrets, backup/restore evidence, and auditable case approvals.
- **AI and evidence adapters:** optional provider integration behind bounded interfaces, timeouts, schema validation, source metadata, and graceful fallback. Generated drafts stay separate from approved case records.
- **Observability and operations:** structured privacy-aware logs, error reporting, rate limits, dependency scanning, secret rotation, monitoring, backup checks, and incident response.
- **Assessment and analytics:** transparent formative feedback first; validated assessment instruments and documented psychometric review before high-stakes decisions.

## Delivery sequence and acceptance criteria

### Phase 1 — Reliable browser simulation
- Commit and verify a genuine frontend lockfile; use reproducible installation in CI.
- Expand automated backend regression tests and add browser end-to-end coverage for case start, dialogue, investigations, report, examination join, expiry, submission, and educator review.
- Verify authorization, session ownership, exam confidentiality, validation, and error handling for every session and educator endpoint.
- Keep release status blocked until evidence supports each gate.

### Phase 2 — Secure institutional pilot foundation
- Replace shared-token access with individual accounts and explicit student, educator, and administrator permissions.
- Add schema migrations, backup/restore drills, retention/deletion policy, audit review, monitoring, rate limits, and operational runbooks.
- Complete accessibility, browser/device, privacy, and institutional education/ethics checks applicable to the planned pilot.
- Obtain qualified review of every case, investigation result, critical safety error, and rubric.

### Phase 3 — Educator-grade learning content
- Add versioned case lifecycle and source provenance, including reviewer identity, approval date, review expiry, and change history.
- Expand reviewed scenarios across medicine, pediatrics, obstetrics, emergency care, surgery/urology, laboratory practice, and locally relevant referral pathways.
- Improve debriefing, educator notes, cohort reporting, and structured handover/teamwork exercises.

### Phase 4 — Voice and collaborative simulation
- Add voice input/output with accessible speech rate, transcript review, privacy controls, and deterministic case-state integration.
- Implement synchronized room state, participant roles, facilitator controls, reconnection handling, and event ordering.
- Test multi-user sessions under realistic network conditions.

### Phase 5 — Skills lab and immersive simulation
- Test the actual university headset/browser combinations and document findings.
- Implement and clinically review 3D anatomy/patient assets, spatial interaction, procedural tasks, and educator observation.
- Add cadaver/anatomy identification and surgical skills modules with explicit learning objectives and safety boundaries.
- Validate each experience with educators and learners before making capability or effectiveness claims.

## Release policy

The current release gate remains **BLOCKED** for production and formal student assessment. Successful compilation, automated tests, and a frontend build are necessary but do not prove clinical accuracy, complete browser workflows, secure institutional identity, privacy approval, or production operations.

A phase is complete only when its acceptance evidence is recorded in the repository. Do not describe planned capabilities as implemented, and do not describe a technical demonstration as an approved clinical education deployment.
