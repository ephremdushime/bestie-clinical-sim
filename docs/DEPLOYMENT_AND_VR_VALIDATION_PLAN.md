# Deployment and VR headset validation plan

**Status: implementation and validation plan; not a deployment certification.**

This plan applies to Bestie Clinical Sim. It does not certify that any cloud service, headset, browser, or institutional environment is currently configured.

## Deployment target

Use separate frontend and API services behind HTTPS. Keep the API and SQLite database private to the deployment network and persist the database on durable storage. SQLite is suitable only for a small, single-instance supervised demo unless concurrency, persistence, backup and restore characteristics are explicitly validated. Do not scale multiple API replicas against a local SQLite file.

### Required configuration

- Set `APP_ENV=production`.
- Set unique, high-entropy `PILOT_ACCESS_TOKEN` and `EDUCATOR_ACCESS_TOKEN` secrets; never commit them or bake them into images.
- Set `CORS_ORIGINS` to the exact HTTPS frontend origin(s), with no wildcard or localhost.
- Set `CLINICAL_SIM_DB` to a persistent writable mount.
- Configure model provider secrets through the hosting platform's secret manager, only if the feature is enabled.
- Restrict database and backup access; define retention and deletion policy.
- Configure HTTPS, firewall rules, monitoring, alerting, secret rotation, dependency scanning, backup and restore drills.
- Run migrations explicitly before release and keep a rollback plan. Do not rely on container filesystem persistence.
- Use synthetic data only. Do not use real patient data or run formal student assessments without institutional approvals and individual identity/RBAC.

## Release gates before public or institutional deployment

1. A genuine frontend lockfile is committed and `npm ci` succeeds.
2. Backend release tests and frontend build pass on the commit intended for release.
3. Browser end-to-end tests cover the complete practice journey, exam lifecycle, hidden-answer confidentiality and educator review.
4. Individual authentication and institution-scoped RBAC replace shared tokens; all protected endpoints enforce identity and ownership.
5. Security controls include rate limits, attributable audit events, monitoring, alerts, secret rotation and dependency scanning.
6. Backup restoration and database migration/rollback are demonstrated.
7. Clinical reviewers attest to each released case, investigation result, rubric and critical error against current local guidance.
8. Privacy, retention, incident-response, accessibility and institutional approval requirements are documented and met.
9. The exact deployment URL is checked to ensure it serves this repository's build, not another project.

## VR / WebXR scope

The current UI checks whether the browser reports support for `immersive-vr` and `immersive-ar`. This is **capability detection only**, not a completed immersive experience. The current scene is a UI scaffold, not a three-dimensional patient model. Do not advertise full VR/AR support until a working session and device test pass.

### Minimum implementation milestone

- Add an explicit user-initiated `navigator.xr.requestSession('immersive-vr')` path, requiring HTTPS or localhost and handling denial, unsupported browsers and session termination.
- Create a real WebGL/WebXR render loop that uses the XR frame's viewer pose and per-eye views.
- Render a real 3D patient/clinical room model, with safe synthetic assets and clear educational-only labelling.
- Add controller input, selection/raycasting, recenter/exit, session cleanup and graceful non-VR fallback.
- Keep the simulation's clinical state and scoring in the existing API; XR presentation must not invent findings or change assessment answers.
- Support seated mode, readable text, adjustable height/scale, comfort settings and a no-motion fallback. Avoid forced locomotion.
- Test device/browser combinations in person. Browser API support alone does not confirm performance or usable controls.

### Device validation matrix

Record headset model, OS/firmware, browser and version, test date, connection/network, frame stability, session start/exit, controller mapping, seated comfort, accessibility and known defects. At minimum test:

| Test area | Acceptance evidence |
|---|---|
| Session start | User can enter immersive VR after an explicit action; clear error if unavailable |
| Rendering | Both eye views render a stable 3D scene without fatal console/WebGL errors |
| Interaction | Controller selection and pointer fallback work; no accidental clinical action |
| Session lifecycle | Exit, browser tab changes and device disconnect clean up correctly |
| Clinical consistency | VR shows only the same approved synthetic case state as the browser/API |
| Comfort and accessibility | Seated mode, recenter, readable UI, reduced motion and non-VR fallback verified |
| Performance | Measured frame-time/performance evidence on each target headset; no guessed compatibility claims |
| Privacy | No real patient data; no credentials or tokens embedded in XR assets/client bundles |

## Release statement

A successful CI build is necessary but not sufficient for production readiness. Until all release gates above have evidence, the appropriate status is **not production-ready**. A supervised technical demonstration using fictional cases may be possible after environment-specific security and operational checks; it is not equivalent to an approved clinical education pilot or high-stakes assessment.
