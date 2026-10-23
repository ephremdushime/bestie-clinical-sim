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


### Cross-headset architecture strategy

**Design target: broad interoperability, not a claim of universal compatibility.** Headsets expose different operating systems, browsers, runtimes and controller capabilities. Support should be reported per tested device/browser combination.

1. **Standards-first immersive client:** implement the scene with WebGL and the WebXR Device API, entered only after a user gesture. Prefer standards-based viewer poses, per-eye views, reference spaces and generic controller input over vendor-specific APIs.
2. **Graceful capability tiers:**
   - **Tier A — immersive VR:** supported WebXR browser + compatible headset; stereoscopic scene and controller interaction.
   - **Tier B — desktop 3D:** ordinary browser with mouse/keyboard interaction.
   - **Tier C — mobile/tablet 3D:** touch interaction and a reduced-complexity scene.
   - **Tier D — standard clinical workflow:** accessible 2D case UI remains available when 3D/WebXR is unavailable.
   Unsupported WebXR must never block core learning.
3. **Avoid a single-vendor dependency:** keep the case/session API, clinical state, scoring and educator tools independent of the rendering engine. Do not require Meta-only, SteamVR-only or a vendor SDK for the baseline workflow. Optional platform-specific enhancements must be isolated behind adapters and feature detection.
4. **Progressive rendering:** use a small, optimized base scene; load optional anatomy/room assets on demand; provide low-complexity settings for standalone headsets; avoid unnecessary post-processing and forced locomotion.
5. **Input abstraction:** map select, back, confirm, recenter and menu actions to WebXR generic controller profiles where available, with desktop and touch alternatives. Do not assume every headset has identical buttons, hand tracking or haptics.
6. **Secure runtime:** serve immersive features over HTTPS (localhost for development), request only necessary permissions, and never place access tokens or private case keys in 3D assets.
7. **Compatibility policy:** publish a tested-device matrix with browser/runtime versions and known limitations. “Not tested” must be displayed distinctly from “unsupported.” Browser capability detection alone is not a compatibility certification.

### Suggested initial test coverage

Start with one readily available standalone headset for hands-on debugging, then expand to representative classes rather than attempting every device at once:
- Standalone Android-based VR headset using its supported browser/WebXR runtime.
- A second standalone headset family/runtime where available.
- PC-tethered headset using a compatible desktop runtime/browser.
- Desktop Chrome/Edge or Firefox where the relevant WebXR implementation is available, plus non-WebXR desktop fallback.
- Android phone/tablet touch fallback and a standard laptop screen.

Choose exact device models after confirming which hardware the university/testing partner can provide. Keep the architecture device-neutral from the beginning; do not advertise any model as supported until the acceptance matrix has been completed.

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
