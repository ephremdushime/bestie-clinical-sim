# Bestie Clinical Sim — Hardened Development Release 1.3.0

Bestie Clinical Sim is a clinical education simulation prototype for medical and health-sciences learners. It combines guided practice, controlled teacher-created examinations, indication-based simulated investigations, an educator console, bounded AI patient dialogue/case drafting, and an early VR/AR compatibility workspace.

**Important:** This is a development release for controlled technical evaluation, not a clinically validated or production-approved product. The six bundled cases are fictional teaching scenarios and require review by qualified clinical educators against current Rwanda-relevant guidance before student use. The scoring logic is illustrative and must not be used alone for high-stakes decisions. Never enter real patient-identifiable data.

## Included capabilities

- **Practice mode:** patient dialogue, adjustable browser speech synthesis, optional browser dictation where supported, hints, investigations with a required clinical indication, case-configured results, management checklist, reflection and formative report.
- **Examination mode:** an educator creates an institution-scoped exam with a hidden case and join code; in production, provisioned learner accounts must belong to that institution. The API enforces exam time limits, one attempt per learner account, and pinned case/rubric versions. The student-facing submission response does not reveal the hidden diagnosis, score, rubric decisions or threshold result. Full reports remain in the authorized educator dashboard.
- **Case library:** malaria, severe respiratory presentation, burns with possible inhalation injury, road-traffic trauma, pregnancy with severe headache, and pediatric fever/fast breathing.
- **Investigations:** case-specific fixed results for configured tests; unsupported tests do not receive invented findings. A test's indication is recorded. Synthetic imaging schematics are explicitly labeled as illustrations, not diagnostic-quality images.
- **Educator console:** exam builder, exam codes, close-exam control, recent sessions, reports and event/decision logs.
- **AI case drafting:** educator-only draft endpoint. If an OpenAI-compatible model is configured, it can propose a structured case draft; otherwise it returns a structured template. Drafts are never automatically published and must be source-checked and educator-approved.
- **AI patient role-play:** optional OpenAI-compatible chat-completions endpoint; the model receives case facts but not the hidden diagnosis. Case results remain controlled by the API.
- **Collaboration:** basic WebSocket text room. It does not synchronize clinical case state or exam actions.
- **VR/AR roadmap:** browser capability check for WebXR and a headset-oriented interface scaffold. There is no production 3D avatar, controller/haptic integration, spatial tracking, or real WebXR session implementation yet. The Uniport headset collaboration is intended for compatibility testing.
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

In development, legacy token gates are available for local testing. Shared `PILOT_ACCESS_TOKEN` and `EDUCATOR_ACCESS_TOKEN` values are **not accepted for protected routes in production**. Production requires provisioned account bearer sessions. Provision accounts from the trusted server shell with `python scripts/provision_account.py`; the utility prompts for passwords without echoing them. Users can change their password from the signed-in sidebar. Account provisioning is not exposed as a public registration endpoint; institutional SSO, password recovery, and centralized lifecycle management are still not implemented.

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
- `GET /api/educator/dashboard`
- `POST /api/educator/exams/{id}/close`
- `WS /ws/rooms/{room}` — basic text collaboration

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

1. Individual provisioned accounts, password changes, revocable bearer sessions, and per-user audit attribution are implemented. Institutional SSO, self-service account recovery, verified identity onboarding, MFA, and centralized account lifecycle management are not implemented; accounts must be provisioned through the trusted server shell.
2. Scoring is based on transparent but limited demonstration checks; it is not validated against faculty marking or OSCE performance.
3. Exam settings include duration and pass mark; pass/fail decisions must be reviewed and formally validated before operational use.
4. The case registry is loaded from built-in cases plus educator-approved cases persisted in SQLite. Case approval/publishing remains an educator attestation and is not independent clinical certification.
5. The source workflow accepts references and notes but does not crawl Google or external platforms, perform retrieval-augmented generation, verify URLs, or establish clinical evidence automatically.
6. Imaging schematics are not real radiographs/CTs/ultrasounds. A validated synthetic image library and specialist review are required.
7. The current VR/AR workspace is a compatibility scaffold, not a functional immersive clinical environment.
8. CI currently passes the backend regression suite, frontend production build/browser workflows, live backend browser workflows, Docker image builds, Docker Compose validation, and Nginx configuration checks. This is not a substitute for a deployment rehearsal, TLS/domain configuration, external security assessment, load testing, backup restoration drill, monitoring/alerting, incident-response procedures, or institutional approval. No production deployment or clinical validation is claimed.

See `docs/PRODUCT_SPECIFICATION.md`, `docs/AI_SOURCE_GOVERNANCE.md`, `docs/UNIPORT_VR_AR_TEST_PLAN.md`, and `docs/TEST_RESULTS.md`.


## AI Clinical Scenario Engine (1.1.1)

The educator console supports evidence-assisted case drafting. It can query PubMed and Europe PMC, pass retrieved citation metadata/eligible abstracts to the optional configured language model, persist drafts in SQLite, record review notes, and publish an educator-attested case into the case registry. See `docs/AI_CASE_FACTORY.md` for endpoints, controls and limitations.

Important: the source search is evidence discovery, not clinical verification. A fallback draft is only a scaffold. Educator attestation does not independently certify clinical accuracy; complete the review checklist before publishing.
