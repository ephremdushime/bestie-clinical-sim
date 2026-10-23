# Changelog

## 1.3.0 — security hardening and regression suite

- Added per-session random bearer secrets; the database stores only SHA-256 hashes and production session endpoints verify session ownership.
- Removed hidden case ID/title and pass mark from the controlled-exam start response.
- Added fail-closed production startup guard for weak or placeholder shared tokens, identical pilot/educator tokens, wildcard CORS and localhost production origins.
- Added additive SQLite migration for session-token hashes.
- Added isolated pytest regression tests for session authorization, exam confidentiality, production configuration, and mocked AI case lifecycle persistence.
- Validation: `python -m pytest -q` passes (2 tests); `python -m compileall -q backend tests` passes.
- Frontend build remains unverified because the npm registry was unreachable and dependencies were not cached. This release is not production-certified.

## 1.0.0 — Integrated development build

- Consolidated Phase 1, Phase 2 and Pilot Build 0.3 into one browser-first clinical simulation prototype.
- Added practice and controlled examination flows, six fictional case scenarios, indication-required investigations, educator exam builder, reports, event logs, optional bounded LLM patient role-play, browser speech support, VR/AR compatibility scaffold, and documentation.

## Explicitly not completed

- Production WebXR session, 3D patient models, controller/haptic interaction or validated immersive procedural simulation.
- External source crawling, automatic Google/source retrieval, source verification or RAG pipeline.
- Individual account authentication/SSO, secure exam identity verification or hardened production security.
- Clinical validation, psychometric validation, or high-stakes exam approval.
- Frontend production build verification; dependency installation timed out in the build environment.

## 1.1.0–1.2.0

- Added PubMed and Europe PMC evidence discovery for educator-reviewed case drafting, persistent draft review and educator-attested publishing.
- Added mocked AI lifecycle checks, project-root `.env` loading, exam confidentiality safeguards and regression assertions.
- Live provider integration and frontend production build remain unverified.
