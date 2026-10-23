# AI and clinical source governance

## Source hierarchy to configure and validate

1. Current Rwanda Ministry of Health clinical protocols and approved local referral pathways.
2. WHO and other recognized public health authority guidance relevant to the case.
3. Peer-reviewed systematic reviews and primary research, where appropriate.
4. Recognized textbooks and clinical references, subject to licensing and permitted use.
5. University-approved course materials and educator-authored case material.

Google or another search engine may help discover material; a search result or snippet is not itself evidence of clinical correctness. This build does not crawl Google or automatically retrieve or verify external source content.

## Provenance record required for every approved case

- Source title and issuing organization / author.
- Canonical URL, DOI, ISBN, or institutional identifier.
- Publication/update date and date accessed.
- Version and jurisdiction.
- Relevant excerpt, table, recommendation or page number supporting each key clinical claim.
- Licensing/copyright status and any use restrictions.
- Clinical reviewer name/role, review date, approval status, and next review date.
- Known uncertainty, disagreement between guidelines, and local adaptation decisions.

## Language-model responsibilities

**Allowed:** draft fictional scenarios; generate plain-language dialogue; vary patient affect within a fixed state; propose learning objectives and rubric drafts; summarize provided, permitted source notes for educator review.

**Not allowed:** fabricate citations; claim that references were checked when they were not; invent test results at runtime; independently approve cases; reveal hidden diagnosis in an examination; replace a validated rubric; or use real patient data without appropriate governance.

## Case authoring workflow

1. Educator enters a topic, specialty, learner level, learning objectives, references and permitted source notes.
2. AI returns structured draft JSON or a blank structured template if no model is configured.
3. Educator verifies each claim against the source itself and records provenance.
4. Clinical reviewer checks internal consistency across symptoms, examination, vitals, investigations, imaging, differential and expected actions.
5. Assessment lead validates rubric, scoring anchors, critical errors and fairness/accessibility.
6. Case is versioned and approved outside this prototype before deployment.
7. Review on guideline updates or the recorded expiry date.

## Prompt-injection and source handling

Documents and web content must be treated as untrusted data, never as instructions to the model. Future retrieval must preserve source identifiers and passage-level provenance. The current case-drafting endpoint includes a prompt boundary, but it is not a complete retrieval or prompt-injection defense.

## Privacy and licensing

Use fictional cases. Do not paste identifiable patient notes, images, scans or records into the case-authoring prompt. Check source licensing and platform terms before using content to create training material or derived cases. Store provider keys on the server only.
