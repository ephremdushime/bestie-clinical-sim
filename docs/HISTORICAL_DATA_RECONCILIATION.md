# Historical record ownership reconciliation

## Purpose

Older pilot records may predate institution ownership. The application intentionally fails closed for these records in production. **Never infer ownership from a learner's current institution, an educator's current account, a case title, or timestamps alone.** This runbook describes the required evidence and audit trail; it does not automatically assign ownership.

## Record classes

Reconcile each class independently:

- learner sessions and their reports;
- case drafts and review history;
- exams and exam attempts;
- educator-created approved cases and immutable case/rubric versions.

A linked record may be assigned only when its parent relationship is independently verified and the resulting ownership is consistent across the entire record chain.

## Required controlled procedure

1. **Authorize and scope.** A platform administrator opens a tracked reconciliation ticket identifying the database, record IDs, record classes, intended institution, reason, operator, and independent reviewer. Do not include passwords, bearer tokens, or patient-identifiable information in the ticket.
2. **Back up and verify.** Take a database backup using the supported backup procedure. Record the backup identifier and checksum; verify that the backup can be read. Do not begin writes until the backup is available.
3. **Collect evidence.** Accept only contemporaneous, attributable evidence such as an original institution-issued exam assignment, an audit event, or a documented foreign-key relationship to an already verified institution-owned parent. Record the evidence reference and why it supports the assignment. Current account affiliation alone is insufficient.
4. **Independent review.** A second authorized reviewer who did not propose the assignment checks the evidence, record chain, conflicts, and scope. If evidence is missing, conflicting, or ambiguous, leave the record unassigned and quarantined.
5. **Apply a minimal transaction.** Use a reviewed, version-controlled migration or administrative procedure that checks the exact record IDs and expected pre-change state, writes only the approved ownership fields, and writes an audit event containing the actor, reviewer, ticket/evidence references, before/after values, timestamp, and outcome. Do not rewrite clinical content, case/rubric snapshots, or their hashes as part of ownership reconciliation.
6. **Verify after writing.** Re-read the affected records, verify tenant-boundary behavior with a second institution, confirm immutable snapshot hashes remain valid, and confirm the audit event is present. Roll back from the verified backup if checks fail.
7. **Close the ticket.** Record the exact changed IDs, migration/commit identifier, backup reference, verification results, and reviewer sign-off. Keep unresolved records quarantined.

## Application enforcement

The production reconciliation API requires a platform administrator to submit the change and a second, independently authenticated active platform administrator via the `X-Ownership-Reviewer-Authorization` bearer header. Requests must include a non-PHI `evidence_reference` and a reason; both are written to the append-only audit event alongside the reviewer identity.

The API also requires attributable account evidence: session owners, draft/exam creators, or recorded case approvers must be present and their account institution must match the proposed institution. Linked exam ownership must already match before a session can be assigned. If those relationships are missing or conflict, the API rejects the write and the record remains in the quarantine queue. A narrative reference alone cannot override missing attribution. Records with no attributable ownership must be handled only through a separately reviewed, version-controlled migration after external evidence is established; do not bypass the rejection with a bulk update.

## Stop conditions

Stop without making changes if the evidence does not establish ownership, a record chain crosses institutions, snapshot integrity fails, the backup cannot be verified, an unexpected row count occurs, or the audit write fails. Never use a bulk default such as assigning every null institution to one institution.

## Release gate

This document is a procedural control, not proof that historical records have been reconciled. Production remains blocked until the actual database has been inventoried, each change is supported by evidence and audited, unresolved records remain inaccessible to institutional users, and a reviewer verifies the resulting access boundaries. Run this process only against an authorized, backed-up database; CI does not exercise a live institution's historical data.
