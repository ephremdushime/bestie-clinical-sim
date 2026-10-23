# Uniport headset compatibility test plan

## Current state

The build includes a WebXR capability check and a non-interactive headset-style preview. It does **not** yet create a real immersive VR/AR session, render a 3D patient, track controllers, or support haptics. The objective of the first Uniport collaboration is compatibility discovery, not a claim of finished VR functionality.

## Before the session

- Identify exact headset make/model, firmware, supported browser, controller type and whether the device is standalone or tethered.
- Confirm access to the headset and required software with Uniport; agree on supervision and time slots.
- Use fictional cases only; do not connect a real hospital record system or show real patient information.
- Test the deployed HTTPS origin if WebXR requires a secure context; localhost is a special development exception.

## Compatibility checklist

1. Open the platform in the supported headset browser.
2. Confirm whether `navigator.xr` exists and whether `immersive-vr` / `immersive-ar` are reported as supported.
3. Record browser and OS versions, permissions, origin/security requirements and any console errors.
4. Test readable text, contrast, font sizes, menu navigation and keyboard/controller access.
5. Test network latency, Wi-Fi stability, reconnect behavior and whether the API remains reachable.
6. Record comfort, dizziness, fatigue and accessibility feedback; provide a stop option.
7. Verify that the same case ID and fixed results are used between browser and headset preview.
8. Document limitations and decide whether to implement WebXR session entry, controller mapping and 3D patient scene next.

## Later clinical simulation validation

Before surgical or emergency procedural training, obtain specialist review of anatomy, visual signs, action constraints and scoring. Validate the simulator against an agreed task checklist and faculty ratings. Do not use VR/AR prompts as live clinical guidance until separately validated and governed.

## Test record template

- Date / tester:
- Headset and firmware:
- Browser and version:
- Network / connection:
- WebXR VR support:
- WebXR AR support:
- UI readability / accessibility:
- Controller interaction:
- Rendering and frame stability:
- Comfort / safety issues:
- Defects and reproduction steps:
- Decision / next actions:
