# Clinical and faculty validation pack

**Status: BLOCKED — no clinical approval is implied by this template.** Use this pack with qualified reviewers appointed by the participating institution. Keep completed evidence in the institution's controlled records system; do not put student or patient information in Git.

## 1. Scope and non-negotiable limits

This release is a formative educational prototype. Until each case and rubric has been reviewed and approved in writing:
- Use fictional cases and synthetic results only.
- Do not use scores for progression, licensing, credentialing, clinical decisions or other consequential decisions.
- Do not present generated text, citations or investigation results as independently verified.
- Do not treat educator attestation or a passing software test as clinical certification.

## 2. Review panel and independence

The institution should appoint:
- a clinical faculty reviewer competent in the case specialty;
- an assessment/OSCE lead to review learning objectives and rubric validity;
- a local-protocol/referral-pathway reviewer where relevant;
- a privacy/ethics contact if learner activity will be collected or analyzed.

Record name, role, qualifications relevant to the review, institution, conflict-of-interest declaration, date, decision, and signature/approval record in the institution's controlled copy. Authors should not be the sole approver of their own case or rubric.

## 3. Case-by-case register

Copy one row per version into the institution's controlled register. Initial state for every case is **NOT REVIEWED**.

| Case / version | Required specialty review | Clinical reviewer / evidence record | Assessment reviewer / evidence record | Status |
|---|---|---|---|---|
| Malaria | Infectious disease / internal medicine or locally designated qualified clinician | Not assigned | Not assigned | NOT REVIEWED |
| Severe respiratory presentation | Emergency / respiratory / internal medicine | Not assigned | Not assigned | NOT REVIEWED |
| Burns with possible inhalation injury | Emergency / surgery / burns | Not assigned | Not assigned | NOT REVIEWED |
| Road-traffic trauma | Emergency / trauma / surgery | Not assigned | Not assigned | NOT REVIEWED |
| Pregnancy with severe headache | Obstetrics and gynaecology | Not assigned | Not assigned | NOT REVIEWED |
| Pediatric fever and fast breathing | Pediatrics | Not assigned | Not assigned | NOT REVIEWED |
| Any educator-authored or AI-drafted case | Relevant case specialty | Not assigned | Not assigned | NOT REVIEWED |

A case is not approved by filling this table alone. Attach the detailed review record and source evidence in the institution's records system.

## 4. Clinical review checklist

For each immutable case version, the clinical reviewer must mark each item **PASS / FAIL / NOT APPLICABLE**, record comments, and cite the source supporting the decision:

- [ ] Learning objectives fit the learner level and intended context.
- [ ] History, examination, vital signs, age, pregnancy status and timeline are internally consistent.
- [ ] Differential diagnosis and red flags are reasonable and not misleading.
- [ ] Every investigation result is plausible, deterministic for the case version, and supported; unsupported tests do not invent findings.
- [ ] Reference ranges and units are explicit and appropriate for the stated population/context.
- [ ] Expected actions, stabilization, escalation and referral pathways match current approved local guidance.
- [ ] Medicines, doses, contraindications, allergies, pregnancy/pediatric considerations and monitoring are checked where included.
- [ ] Critical errors are clinically justified, explicit and proportionate.
- [ ] Feedback avoids unsafe certainty and directs learners to qualified supervision where appropriate.
- [ ] No real patient identifiers, unlicensed images, or unapproved source material are included.
- [ ] Synthetic images are labeled and cannot be mistaken for diagnostic-quality imaging.
- [ ] Uncertainty, local adaptation, review date and re-review trigger are documented.

Any FAIL or unresolved safety-critical disagreement blocks publication and student use. Do not silently change a reviewed case: create a new version and repeat the required review.

## 5. Source provenance record

For every material clinical claim, record in the controlled evidence register:
- exact source title, issuing body/author, canonical URL/DOI/identifier and publication/update date;
- date accessed, version, jurisdiction and relevant page/table/section;
- claim supported and the specific recommendation or passage;
- license/permission and use restrictions;
- any conflict between sources and the local adaptation decision;
- reviewer identity, decision and next review date.

Prioritize current Rwanda Ministry of Health protocols and approved local referral pathways, then applicable WHO guidance and appropriate peer-reviewed sources. A search result, LLM output, abstract alone, or citation string is not proof that the source was checked. Review the original permitted source.

## 6. Rubric and scoring validation

Before any assessment beyond low-stakes practice:
- define construct, blueprint, learning outcomes and assessment purpose;
- map every rubric item to an objective and observable learner behavior;
- specify anchored performance levels, critical actions, critical errors, missing-data behavior and feedback rules;
- check scoring determinism, version pinning and whether the model can alter hidden state (it must not);
- have at least two qualified assessors independently score representative synthetic responses, then document agreement, disagreements, adjudication and revisions;
- evaluate fairness, language proficiency effects, accessibility accommodations and bias;
- determine reliability/validity evidence required for the intended use; do not select a pass mark merely because the UI supports one;
- approve result release, appeals, re-marking and retention procedures.

Do not claim psychometric validity based solely on agreement in a small formative sample. Consequential use requires a separately governed validation study and institutional approval.

## 7. Signed decision record

- Case ID and immutable version/hash:
- Learning objectives / learner level:
- Clinical reviewer and qualification:
- Assessment reviewer and qualification:
- Source register reference:
- Clinical checklist outcome:
- Rubric validation evidence reference:
- Unresolved issues / conditions:
- Decision: **NOT REVIEWED / REJECTED / REVISION REQUIRED / APPROVED FOR SUPERVISED FORMATIVE PILOT ONLY**
- Permitted audience and dates:
- Next review / expiry trigger:
- Institutional record/signature reference:

Approval applies only to the exact reviewed version and stated use. It does not approve the software for formal examinations, clinical decisions, or deployment at another institution.
