# Bestie Clinical Sim — Hardened Development Release 1.3.0

Bestie Clinical Sim is a clinical education simulation prototype for medical and health-sciences learners. It combines guided practice, controlled teacher-created examinations, indication-based simulated investigations, an educator console, bounded AI patient dialogue/case drafting, and an early VR/AR compatibility workspace.

**Important:** This is a development release for controlled technical evaluation, not a clinically validated or production-approved product. The six bundled cases are fictional teaching scenarios and require review by qualified clinical educators against current Rwanda-relevant guidance before student use. The scoring logic is illustrative and must not be used alone for high-stakes decisions. Never enter real patient-identifiable data.

## Included capabilities

- **Practice mode:** patient dialogue, adjustable browser speech synthesis, optional browser dictation where supported, hints, investigations with a required clinical indication, case-configured results, management checklist, reflection and formative report.
- **Examination mode:** teacher creates an exam with a hidden case and shareable code; the API enforces time limits on chat/investigation actions; the student-facing submission response does not reveal the hidden diagnosis, score, rubric decisions or threshold result. Full reports remain in the educator dashboard. Controlled-exam confidentiality remains a release gate; the current identity-backed routes bind authenticated learners to their own sessions and keep reports educator-only.
- **Case library:** malaria, severe respiratory presentation, burns with possible inhalation injury, road-traffic trauma, pregnancy with severe headache, and pediatric fever/fast breathing.
- **Investigations:** case-specific fixed results for configured tests; unsupported tests do not receive invented findings. A test's indication is recorded. Synthetic imaging schematics are explicitly labeled as illustrations, not diagnostic-quality images.
- **Educator console:** exam builder, exam codes, close-exam control, institution-scoped cohorts, cohort membership, learner assignments, recent sessions, and bounded institution report CSV export. Assignments and exam records carry a rubric version; the default rubric is formative and not clinically validated.
- **AI case drafting:** educator-only draft endpoint. If an OpenAI-compatible model is configured, it can propose a structured case draft; otherwise it returns a structured template. Drafts are never automatically published and must be source-checked and educator-approved.
- **AI patient role-play:** optional OpenAI-compatible chat-completions endpoint; the model receives case facts but not the hidden diagnosis. Case results remain controlled by the API.
- **Collaboration:** institution-scoped WebSocket text room with provisioned-account identity, single-use 60-second connection tickets, one-time ticket consumption, tenant room checks and bounded message sizes. It does not synchronize clinical case state or exam actions.
- **VR/AR:** an early WebXR/WebGL scene and browser capability checks are integrated. It remains a prototype: no clinically validated anatomy, controller-driven tasks, haptics, spatial competency assessment or real-headset acceptance testing has been completed. The Uniport headset collaboration is intended for compatibility testing.
- **Learner continuity:** active sessions can be restored after a browser reload using the server-authorized resume endpoint; examination time remaining is calculated server-side. Learners have an account-scoped progress view and assignment list.
- **Security release review:** read-only legacy ownership inventory is available via `python backend/migration_review.py --database path/to/copy.db`; see `docs/SECURITY_RELEASE_REVIEW_AND_MIGRATION.md`. It never auto-assigns historical ownership.
- **Privacy:** SQLite stores learner display names, fictional-case activity, and assessment event logs. Do not use real patient records.

## Local development

Requirements: Python 3.10+ and Node.js 20+.

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (new terminal, project root)

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Vite proxies `/api` and `/ws` to `localhost:8000`.

Provisioned account login is available through `/api/auth/login`, `/api/auth/me` and `/api/auth/logout`; accounts must be created through the guarded offline administrator bootstrap/provisioning process. There is no public registration or self-service role assignment. Production educator endpoints require verified identity and role, and institution-owned content is scoped to the authenticated institution. Legacy pilot-token access is retained for compatibility; do not treat it as a substitute for account identity or institutional SSO. Review the identity migration and deployment guides before any real pilot.

## Optional language model

Copy `.env.example` to `.env` in the project root, then set these variables there for local development or in your deployment secret manager. The backend reads the project-root `.env` file automatically; environment variables already supplied by the operating system take precedence. Keep `.env` private and never commit it. Set these variables on the **backend only**:

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_secret_key
LLM_MODEL=your_model_name
```

Never put API keys in React, browser storage, a public repository, or a client-side `.env` variable. If no real model is configured (sample placeholder values do not count) or a request fails, patient dialogue uses a deterministic case-fact fallback. Case drafting returns a template if the configured model is unavailable or fails to return valid JSON.

## Docker

Copy `.env.example` to `.env`, replace all example secrets, configure the exact frontend origins, and read `docs/PILOT_READINESS_AND_DEPLOYMENT.md` before using Docker Compose. Put the service behind managed HTTPS and restrict network access. Do not expose a development deployment publicly.

## API overview

- `GET /api/health`
- `GET /api/cases` — public-safe case summaries only
- `POST /api/sessions` — start practice or join an exam by code
- `POST /api/sessions/{id}/chat`
- `POST /api/sessions/{id}/investigations`
- `POST /api/sessions/{id}/finish`
- `POST /api/educator/case-draft`
- `POST /api/educator/exams`
- `GET /api/sessions/{id}/resume` — restore owner-authorized state and server-derived remaining exam time
- `GET /api/learner/progress` and `GET /api/learner/assignments` — account-scoped learner activity
- `POST/GET /api/educator/cohorts`; `POST /api/educator/cohorts/{id}/members` — manage institution cohorts
- `POST/GET /api/educator/assignments` — create and list cohort/learner assignments
- `GET /api/educator/reports.csv` — bounded tenant-scoped report export
- `GET /api/admin/users` and `PATCH /api/admin/users/{id}/status` — role-gated account listing and session-revoking disable/reactivate
- `GET /api/educator/dashboard`
- `POST /api/educator/exams/{id}/close`
- `POST /api/auth/ws-ticket` — issue a short-lived, single-use WebSocket ticket for the signed-in account\n- `WS /ws/rooms/{room}?ticket=...` — institution-scoped text collaboration

## Release 1.3.0 changes

- Added per-session bearer secrets; only a hash is stored in SQLite, and production session operations require the matching session secret.
- Removed the hidden case ID, case title, and pass mark from the student-facing exam-start response.
- Added fail-closed production configuration validation for strong distinct access secrets and explicit non-local CORS origins.
- Added isolated regression tests for session authorization, exam confidentiality, AI draft persistence, publication and restart recovery.

## Release 1.2.0 changes

- Fixed an examination confidentiality defect: submitting an exam no longer returns the hidden diagnosis or scoring breakdown to the student response. The full report is stored for educator review.
- Updated the student report view so exam submissions show a pending-review receipt rather than practice feedback.
- Added automated regression assertions for exam confidentiality and production-mode token enforcement.

## Known limitations and next steps

1. Provisioned individual learner/educator accounts, bearer sessions, role checks, institution boundaries and identity-backed audit attribution are implemented in the current draft security stack. Account recovery/password reset, institutional SSO, MFA, account administration UX, security review and deployment-secret/backup/restore validation remain outstanding.
2. Scoring is based on transparent but limited demonstration checks; it is not validated against faculty marking or OSCE performance.
3. Exam settings include duration and pass mark; pass/fail decisions must be reviewed and formally validated before operational use.
4. The case registry is loaded from built-in cases plus educator-approved cases persisted in SQLite. Case approval/publishing remains an educator attestation and is not independent clinical certification.
5. The source workflow accepts references and notes but does not crawl Google or external platforms, perform retrieval-augmented generation, verify URLs, or establish clinical evidence automatically.
6. Imaging schematics are not real radiographs/CTs/ultrasounds. A validated synthetic image library and specialist review are required.
7. The current VR/AR scene is an early functional WebXR/WebGL prototype, not a validated immersive clinical environment; test on actual target headsets and implement controller-driven clinical tasks before claiming headset readiness.
8. Draft pull requests must be reviewed and merged in dependency order before the complete stack exists on `main`. Passing GitHub CI confirms the tested backend and frontend build jobs only; it does not prove deployment, clinical validity, privacy/legal approval, load resilience, or headset acceptance.

See `docs/PRODUCT_SPECIFICATION.md`, `docs/SECURITY_RELEASE_REVIEW_AND_MIGRATION.md`, `docs/PILOT_VALIDATION_CHECKLIST.md`, `docs/DELIVERY_ROADMAP_AND_ACCEPTANCE.md`, `docs/AI_SOURCE_GOVERNANCE.md`, `docs/UNIPORT_VR_AR_TEST_PLAN.md`, and `docs/TEST_RESULTS.md`.


## AI Clinical Scenario Engine (1.1.1)

The educator console supports evidence-assisted case drafting. It can query PubMed and Europe PMC, pass retrieved citation metadata/eligible abstracts to the optional configured language model, persist drafts in SQLite, record review notes, and publish an educator-attested case into the case registry. See `docs/AI_CASE_FACTORY.md` for endpoints, controls and limitations.

Important: the source search is evidence discovery, not clinical verification. A fallback draft is only a scaffold. Educator attestation does not independently certify clinical accuracy; complete the review checklist before publishing.
