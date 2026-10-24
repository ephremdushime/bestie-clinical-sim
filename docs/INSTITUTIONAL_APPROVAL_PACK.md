# Institutional approval and privacy gate

**Status: BLOCKED until the participating institution records its decision.** This pack is a preparation checklist, not an approval, ethics determination, or legal opinion. Obtain the institution's own required forms and signatures.

## A. Intended use and boundaries

- Product/version and commit:
- Institution, department and accountable sponsor:
- Proposed dates, site and cohort:
- Learner level and supervised activities:
- Purpose: [ ] internal technical demonstration [ ] formative teaching pilot [ ] research/publication [ ] formal assessment
- Data types collected (account identifiers, session events, answers, reports, audit logs):
- Explicitly excluded: real patient data, patient identifiers, hospital records, clinical images, and direct care use.
- Responsible educator and technical operator:
- Hosting location, processors/subprocessors, and access roles:

A research or publication purpose must not be relabeled as a technical demonstration to avoid ethics review. A technical demo does not authorize collection of identifiable learner data or use of scores for consequential decisions.

## B. Required institutional determinations

For each line, record decision, approving office/person, date, reference ID, conditions and expiry in the institution's controlled records system. Until evidence is attached there, status remains **PENDING**.

| Gate | Required determination | Status |
|---|---|---|
| Academic sponsor | Named faculty sponsor and department ownership | PENDING |
| Clinical content | Case-specific qualified review and permitted version | PENDING |
| Education/assessment | Learning objectives, formative-use limits and result policy | PENDING |
| Ethics/IRB | Written determination whether review/approval is required; approval before research activity where required | PENDING |
| Privacy/DPO | Privacy impact/risk assessment, lawful basis, data minimization, retention/deletion and access approval | PENDING |
| IT/security | Hosting, network, identity, incident and backup controls approved | PENDING |
| Procurement/legal | Vendor/processor, licensing, data transfer and contractual review as applicable | PENDING |
| Learner communication | Notice, consent/participation terms and withdrawal route where applicable | PENDING |
| Incident management | Named contacts, severity levels, reporting timeline and escalation route | PENDING |
| Final authorization | Authorized institutional decision-maker approves the exact scope and dates | PENDING |

## C. Data protection and participant safeguards

- [ ] Collect only data necessary for the approved purpose.
- [ ] Use test accounts and fictional case content; no patient records.
- [ ] Document whether learner activity is identifiable/pseudonymous and who can re-identify it.
- [ ] Publish a clear notice describing purpose, access, retention, deletion, AI-provider processing and complaint/contact route.
- [ ] Define access by role and institution, audit review, account deactivation and offboarding.
- [ ] Set approved retention periods for session events, reports, audit records, backups and exports.
- [ ] Define correction, access, deletion and withdrawal handling consistent with institutional obligations.
- [ ] Review cross-border hosting and any LLM provider's data retention, training use, subprocessors and transfer terms.
- [ ] Confirm that no API keys or secrets are exposed to browsers, repository history, logs or learner-facing output.
- [ ] Document incident triage, containment, notification and recovery responsibilities.

## D. Go/no-go decision

The institution must choose one:
- **NO-GO** — do not enroll participants or collect pilot data.
- **TECHNICAL DEMONSTRATION ONLY** — fictional data, no research claims, no consequential scoring, supervised and time-limited.
- **SUPERVISED FORMATIVE PILOT** — only after all applicable clinical, privacy, security and institutional gates have written evidence.
- **RESEARCH PILOT** — only after the required ethics determination/approval and consent/data governance are complete.
- **FORMAL ASSESSMENT** — separate high-stakes validation and authorization; not enabled by this pack.

Decision record:
- Decision / exact scope:
- Approved version and commit:
- Start/end dates:
- Conditions and excluded activities:
- Accountable sponsor:
- Approving authority and evidence reference:
- Review/expiry date:

No status should be marked approved based on a verbal conversation, CI pass, PR merge, or this template.
