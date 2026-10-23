# Changelog

## 1.3.0 — security hardening and regression suite

- Added per-session random bearer secrets; the database stores only SHA-256 hashes and production session endpoints verify session ownership.
- Removed hidden case ID/title and pass mark from the controlled-exam start response.
- Added a fail-closed production startup guard for weak or placeholder shared tokens, identical pilot/educator tokens, wildcard CORS and localhost production origins.
- Added an additive SQLite migration for session-token hashes.
- Added isolated pytest regression tests for session authorization, exam confidentiality, production configuration, and mocked AI case lifecycle persistence.
- Validation: `python -m pytest -q` passes (2 tests); `python -m compileall -q backend tests` passes.
- Frontend build remains unverified because the npm registry was unreachable and dependencies were not cached. This release is not production-certified.

## 1.0.0 — Integrated development build

- Consolidated the previous Phase 1, Phase 2 and Pilot Build 0.3 work into one browser-first clinical simulation prototype.
- Added distinct learning/practice and controlled examination flows.
- Added six fictional case scenarios across infectious disease, respiratory emergency, burns, trauma, obstetrics and pediatrics.
- Added indication-required investigations with fixed, case-specific results and no free-form invention of test results.
- Added synthetic schematic imaging previews with explicit non-diagnostic labeling.
- Added teacher exam builder, hidden-case assignment, duration/pass-mark settings, exam codes, closure control, reports and event logs.
- Added server-side examination timeout checks for patient chat and investigation requests.
- Added educator-only AI case-draft endpoint with template fallback and review-required status.
- Added optional bounded LLM patient role-play and plain-English browser speech support.
- Added VR/AR capability check, headset-style preview, and Uniport compatibility test plan.
- Added product specification, AI/source governance, deployment checklist, test record and source registry template.

## Explicitly not completed in this build

- Production WebXR session, 3D patient models, controller/haptic interaction or validated immersive procedural simulation.
- External source crawling, automatic Google/source retrieval, source verification or RAG pipeline.
- Individual account authentication/SSO, secure exam identity verification or hardened production security.
- Clinical validation, psychometric validation, or high-stakes exam approval.
- Frontend production build verification; dependency installation timed out in the available environment.


## 1.1.0 — AI Clinical Scenario Engine
- Added PubMed and Europe PMC metadata/abstract retrieval endpoints.
- Expanded case drafting to include retrieved evidence leads and an optional LLM-generated structured scenario.
- Added persistent case-draft registry, review notes, and educator-attested publishing to the persistent case registry.
- Added frontend source-result display and publishing workflow with explicit clinical-review warnings.
- Added AI case factory governance and limitations documentation.
- Validation: Python compilation, existing backend smoke suite, and draft/list/publish/practice-session integration check passed. Frontend production build remains unverified because `npm install` timed out in the build environment.


## 1.1.1 — configuration and integration verification

- Backend now loads variables from the project-root `.env` file for local development while preserving process-environment precedence.
- API health reports version 1.1.1.
- Added an offline mocked-language-model integration test covering generated draft creation, persistence, educator attestation, publication to the case registry, and restoration after backend restart.
- Backend smoke tests and the mocked LLM integration test pass.
- Frontend production build remains unverified because npm registry DNS/network access was unavailable in this environment.
- Live model-provider operation remains unverified until a valid provider key/model are configured by the operator.
- Placeholder values in `.env.example` no longer count as a configured language model, preventing a copied sample configuration from falsely reporting readiness.


## 1.2.0 — examination confidentiality and release gates

- Student exam submissions now return a pending-review receipt only; hidden diagnosis, score and rubric details remain in the educator-facing stored report.
- Updated the student report screen to avoid revealing case answers or scores after a controlled examination submission.
- Added regression tests for exam confidentiality and production-mode access-token enforcement.
- Case publication now rejects template-only scaffolds, cases with fewer than two investigation options, and investigation fields that still contain placeholders.
- Frontend build and live external-service integrations remain unverified; this is not a production-certified release.
