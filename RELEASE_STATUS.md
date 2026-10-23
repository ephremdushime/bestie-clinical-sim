# Bestie Clinical Sim 1.3.0 — release status

## Release classification
**Hardened development build / technical pilot candidate. Not production-certified.** No deployment or hosting has been performed.

## Changes verified in this release
- Per-session random access secret is returned once to the browser; only its SHA-256 hash is persisted. In production, session chat, investigation, and finish endpoints require the session secret in addition to the pilot access gate.
- Controlled-exam start response no longer exposes the case ID, case title, or pass mark. Student-facing exam submission remains a pending-review receipt.
- Production startup validation rejects weak/placeholder pilot or educator secrets, identical secrets, wildcard CORS, and localhost origins.
- Existing SQLite databases receive an additive session-token column migration.
- Isolated regression tests cover the API, exam confidentiality, per-session authorization, production configuration guard, AI draft/publish flow, and persistence after module reload.

## Tests run in this environment
- `python -m pytest -q`: **2 passed**.
- `python -m compileall -q backend tests`: **passed**.
- Mocked AI integration test: **passed** for draft creation, persistence, educator attestation, registry insertion, and reload. This does not prove a live model provider or external literature retrieval works.
- Frontend production build: **not verified**. Package installation failed because the npm registry was unavailable and the required packages were not cached.

## Blocking requirements before production
1. Verify frontend dependency installation/build on a network-enabled build runner; create and commit a lockfile and use reproducible installs (`npm ci`).
2. Replace shared pilot/educator tokens with individual accounts, secure password storage, role-based authorization, session expiry/revocation, account recovery and educator identity/audit attribution. The per-session secret is an additional protection, not a replacement for accounts.
3. Add rate limiting, brute-force controls, structured security logging, monitoring/alerting, automated backup and tested restore, and a documented incident response process.
4. Conduct an independent security review, privacy impact assessment, data-retention review and institutional approval.
5. Have qualified clinical educators validate every case, investigation result, management pathway, critical error and marking rubric against current Rwanda-relevant guidance. Current scoring is formative and unvalidated.
6. Verify live LLM and PubMed/Europe PMC retrieval, provider timeout/error handling, citation provenance, content licensing, and prompt-injection protections.
7. Complete accessibility testing and browser/device end-to-end tests.
8. VR/AR 3D patient interaction, real headset support and surgical simulation are not implemented in this release.

## Safe use
Local technical evaluation with fictional data only. Do not enter real patient-identifiable information. Do not use scores for progression, licensing, clinical decisions or other high-stakes decisions. Do not expose this build publicly until the blocking requirements are closed and documented.
