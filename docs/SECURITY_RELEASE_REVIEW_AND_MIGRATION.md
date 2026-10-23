# Security release review and historical data migration

## Route inventory (current application)

| Route | Intended access | Release review |
|---|---|---|
| `GET /api/health` | Public liveness | Must not be treated as readiness or reveal secrets. Review metadata before public production use. |
| `GET /api/cases` | Public-safe built-in summaries; authenticated users additionally see global and same-institution approved cases | No diagnosis, fixed facts or rubric in summary. Test institution visibility. |
| `POST /api/sessions` | Learner/pilot access; exam code checked against institution | Exam response omits hidden case ID/title and vital-sign detail. Legacy pilot-token compatibility remains a migration risk. |
| `GET /api/sessions/{id}/resume` | Session owner; educator access is subject to same-institution scope | Returns safe session state; controlled-exam response is redacted. |
| `PUT /api/sessions/{id}/draft` | Active session owner only | Private work-in-progress autosave; blocked after submission or exam expiry and never returned to another learner/educator. |
| `POST /api/sessions/{id}/chat` | Session owner | Must reject inactive, expired or foreign sessions; no hidden diagnosis passed to the patient model. |
| `POST /api/sessions/{id}/investigations` | Session owner | Fixed server-side results only; unsupported tests do not fabricate findings. |
| `POST /api/sessions/{id}/finish` | Session owner | Exam returns a pending-review receipt only; full report stays server-side. |
| `GET /api/learner/progress`, `GET /api/learner/assignments` | Authenticated learner only | Data filtered by account and institution. |
| `POST/GET /api/educator/cohorts`, `POST /api/educator/cohorts/{id}/members` | Educator/institution administrator | Verify role, active learner and same institution; cross-tenant resource returns 404. |
| `POST/GET /api/educator/assignments` | Educator/institution administrator | Exactly one learner/cohort target; target and case must belong to same institution. |
| `GET /api/educator/reports.csv` | Educator/institution administrator | Tenant-filtered, bounded export; no event transcript export; response is non-cacheable. |
| `GET /api/admin/users`, `PATCH /api/admin/users/{id}/status` | Institution/platform administrator | Lists minimal account metadata; disabling/locking revokes active sessions and records an audit event. Institution administrators are limited to learners/educators in their own institution. |
| `POST /api/educator/evidence-search`, `POST /api/educator/case-draft`, `GET /api/educator/case-drafts`, review/publish routes | Educator/institution administrator | Verify identity, institution scope, review attribution, collision protection and no placeholder-only publication. |
| `POST /api/educator/exams`, `GET /api/educator/dashboard`, `POST /api/educator/exams/{id}/close` | Educator/institution administrator | Tenant-filtered. Dashboard includes sensitive reports and must remain educator-only. |
| `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/ws-ticket` | Public login; other routes require bearer identity | Generic login errors, throttling, expiring/revocable sessions, short-lived one-use WS ticket. |
| `WS /ws/rooms/{room}` | Provisioned account with one-use ticket and tenant room check | Test ticket expiry/replay, suspended/disabled users, tenant boundary, size limits and disconnect behavior. |

This is a source-level inventory, not an external penetration test. Run automated regression tests against every route and review all route changes before deployment.

## Controlled-exam confidentiality checklist

- Exam join must not return hidden case ID/title, diagnosis, fixed facts, marking rubric or pass mark.
- Learner case catalogue must contain summaries only; hidden fields remain server-side.
- Chat model receives fixed patient facts but never the hidden diagnosis.
- Investigation API returns only the selected configured result.
- Exam submission response contains status/time/receipt only—not score, diagnosis, rubric decisions, pass/fail threshold or educator notes.
- Resume endpoint returns a redacted receipt for completed exams and never returns the full report.
- Educator dashboard/report export requires educator role and institution scope.
- Every item above must remain covered by automated tests on the exact release commit.

## Historical record migration — no automatic ownership guesses

The application adds `owner_user_id` and `institution_id` columns without deleting existing data. Existing null values are ambiguous: they may be built-in/global content, old pilot records, or records created before identity existed. Never infer a student or institution from a display name, email fragment, IP address, or guessed cohort.

### Read-only inventory

From the repository root, run:

```bash
python backend/migration_review.py --database path/to/a-copy-of/clinical_sim.db
```

The tool opens SQLite in read-only mode and counts missing ownership/scope metadata. It does not output learner names, session content or clinical events and does not alter the database.

### Review and backfill process

1. Freeze writes or take a consistent SQLite backup and verify it can be restored.
2. Run the inventory on a copy and retain the JSON output with the release ticket.
3. Export a restricted, encrypted mapping worksheet of historical record IDs to institution/owner decisions, reviewed by the data steward and authorized institution representative. Keep names and mapping evidence out of source control.
4. Classify records individually: verified institution-owned, verified global built-in content, retain as legacy/unassigned, or delete under an approved retention request.
5. Require a second reviewer for exam submissions and reports. Do not transfer reports to a learner account without verified evidence and institutional authorization.
6. Write a one-off, reviewed, idempotent migration with a dry-run diff and row-count assertions. Do not run it against production until a restore rehearsal and approval.
7. Preserve original IDs, timestamps and audit history. Record who approved each ownership decision and the migration run ID; do not rewrite assessment scores.
8. Re-run the inventory and tenant isolation tests; reconcile before/after counts and test rollback using the backup.
9. Keep ambiguous records unassigned and inaccessible to ordinary tenant accounts until adjudicated. Do not automatically mark them as global.

## Remaining production gates

- External security review, CSRF/origin policy review, rate limiting and abuse controls.
- User list and audited disable/reactivate controls are implemented for institution/platform administrators. New-user provisioning remains a guarded offline process; password reset/MFA/SSO and a dedicated audit-review workflow remain outstanding.
- Backup/restore rehearsal, data retention/deletion policy, hosting region and privacy/legal approval.
- Faculty review and validation of all cases/rubrics, learner accessibility/usability sessions and a documented pilot approval.
- Real headset/controller acceptance test; browser capability checks do not certify hardware compatibility.
- CI success on the exact release candidate plus human review. This document does not certify production readiness.
