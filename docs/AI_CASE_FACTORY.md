# AI Clinical Scenario Engine — Build 1.1.0

## What this module does

- Retrieves citation metadata from PubMed and Europe PMC through their public APIs. Europe PMC results may include abstracts; retrieval failures are returned as status information rather than blocking the workflow.
- Uses retrieved records as evidence leads. Search ranking and abstracts are not treated as clinical validation.
- Sends a structured prompt and retrieved evidence metadata to an optional OpenAI-compatible chat-completions endpoint configured on the backend.
- Falls back to a structured, explicitly incomplete case scaffold if no LLM is configured or the model response cannot be parsed.
- Persists every generated draft in SQLite, including source metadata, generation mode and review status.
- Supports educator review notes and educator-attested publishing. Published cases are persisted and loaded into the case registry at backend startup.
- Uses fixed investigation result fields so the model does not generate new test results during an active encounter.

## API endpoints

All `/api/educator/*` endpoints require educator access in production (`X-Educator-Token`). In development, access checks are intentionally bypassed for local evaluation.

- `POST /api/educator/evidence-search` — body: `{"query":"malaria diagnosis guideline","max_results":8}`
- `POST /api/educator/case-draft` — creates and persists a case draft; accepts `topic`, `specialty`, `learner_level`, `learning_objectives`, `source_notes`, `source_references`, and `auto_retrieve`.
- `GET /api/educator/case-drafts` — lists recent drafts.
- `POST /api/educator/case-drafts/{draft_id}/review` — records a reviewer and notes without publishing.
- `POST /api/educator/case-drafts/{draft_id}/approve-and-publish` — records educator attestation and publishes the case to the case registry.
- `GET /api/cases` — includes published cases without exposing hidden diagnosis or fixed facts.

## Publishing and safety

Publishing is a software workflow, not an independent clinical certification. A reviewer must actually check current local guidance, patient facts, age/pregnancy-specific ranges, medication safety, investigation indications/results, image rights, differential diagnoses, critical errors and rubric validity before attesting. Do not use this workflow for unsupervised high-stakes examinations until institutional validation and appropriate identity/role access controls are implemented.

The system does not retrain the base language model from student sessions. It improves the case library through versioned drafts, evidence updates, educator corrections and approval. Student data should not be reused for model training without explicit governance, lawful basis, appropriate consent where required, and de-identification safeguards.

## Current limitations

- Public literature retrieval requires network access from the backend. Results may be empty or partial if external services are unavailable.
- PubMed/Europe PMC search results do not include every guideline, textbook or licensed reference. National protocols must be added and verified separately.
- The fallback generator produces a scaffold, not a complete clinically accurate case. It intentionally leaves uncertainty rather than inventing medical specifics.
- Generated cases may need manual schema/content correction before use. Automated checks are structural and do not prove clinical validity.
- Case image generation, licensed full-text ingestion, source passage-level claim attribution, background scheduled updates, full identity/SSO, and formal assessment validation are future work.
