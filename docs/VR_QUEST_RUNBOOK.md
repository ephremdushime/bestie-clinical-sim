# Bestie Clinical Sim — Quest VR Setup, Virtual Teaching Hospital Runbook & Known Limitations

Status: **Interactive virtual teaching hospital prototype implemented; physical-headset tests NOT yet run.** Nothing below is a test result. Record real results in the log at the end.

## 1. System Architecture
- `/vr` (code-split, `src/vr/`) — Three.js WebXR client for standalone Meta Quest headset; `/` is the desktop clinical app (fallback). Supports `/?vr=1&case=<case_id>` query routing.
- `src/vr/clinical/adapter.js` — Client adapter to the clinical engine (`/api/sessions`, `/chat`, `/examine`, `/intervene`, `/investigations`, `/finish`). It contains NO clinical facts.
- `backend/simulation.py` + `backend/scenarios/` — Deterministic physiological state engine. Time progresses per student action. Vitals, examination findings and interventions are rule-grounded (AI never invents physiology).
- `backend/generator/compiler.py` + `backend/generator/medical_linter.py` — 4-Tier Procedural Clinical Compiler with zero-hallucination medical linter (Henderson-Hasselbalch acid-base verification, hemodynamics & shock index validation, contraindication rules).
- `backend/generator/archetypes/` — Authoritative guideline archetypes:
  - `sepsis.json` (Surviving Sepsis 2021, NICE NG51)
  - `acute_coronary_syndrome.json` (ESC 2020, AHA/ACC 2021)
  - `acute_dyspnoea.json` (BTS/SIGN 2019, GINA 2023)
  - `pediatric_febrile_illness.json` (WHO IMCI, NICE NG143)
- `src/vr/scene/patientModel.js` — High-fidelity procedural human appearance with real facial canvas textures (skin micro-pores, eyelids, natural blinking every 3.5s, styled hair) supporting 4 distinct phenotypes:
  - `black-male` (Fitzpatrick V-VI, textured crop)
  - `white-male` (Fitzpatrick II-III, wavy brown hair)
  - `black-female` (Fitzpatrick V, styled braids)
  - `white-female` (Fitzpatrick II, shoulder-length hair)
- `src/vr/audio/stethoscopeAudio.js` — Web Audio API procedural acoustic stethoscope synthesizer (coarse inspiratory crackles for consolidation/pneumonia, soft vesicular sounds, synchronized S1/S2 heart sounds at patient heart rate).
- `src/vr/scene/room.js` — 3D clinical room with hospital bed, patient avatar, dynamic bedside monitor, bedside interactive EHR tablet, oxygen wall terminal, infection prevention sanitizer, and equipment trolley.
- `src/vr/audio/voice.js` — Push-to-talk voice pipeline (Ready → Listening → Processing → Patient responding / Retry).
- `POST /api/voice/transcribe` — Server-side speech-to-text (OpenAI-compatible). Keys stay on the server.
- Interaction model:
  - Raycast point & trigger = select in-world UI buttons and physical clinical equipment (stethoscope, oximeter, BP cuff, oxygen mask, thermometer, bedside EHR tablet).
  - Grip button (held) = push-to-talk speech to patient.
  - Seated/stationary mode for physical comfort. Clean exit via in-world `Exit VR` button or Quest system menu.

## 2. Interactive Clinical Equipment & Materials
| Clinical Object | Interaction & Target | Behaviour & Physiological Consequence |
|---|---|---|
| **Stethoscope** | Trolley or Chest Zones | Auscultates targeted chest zone (e.g. right lower zone reveals inspiratory crackles). |
| **Pulse Oximeter** | Trolley | Attaches clip to patient finger; displays SpO₂ & pulse waveform on bedside monitor. |
| **BP Cuff** | Trolley | Inflates cuff; displays non-invasive blood pressure (NIBP) on bedside monitor. |
| **Oxygen Mask** | Trolley / Wall Outlet | Starts supplemental oxygen; places mask on patient face; patient respiratory rate slows down from 32/min tachypnoea to 26/min; monitor updates SpO₂ to 94% (`IMPROVING`). |
| **Thermometer** | Trolley | Obtains core temperature (39.1 °C in baseline respiratory case). |
| **Hand Sanitizer** | Entrance Wall | Simulates hand hygiene protocol before/after contact. |
| **Bedside Monitor** | Screen Stand | Live ECG waveform, vitals grid (HR, SpO₂, RR, BP, Temp), simulation clock, and status pill. |

## 3. Configuration
Add to `.env` (see `.env.example`):
```env
# Server-side speech-to-text (OpenAI-compatible /audio/transcriptions)
STT_BASE_URL=
STT_API_KEY=
STT_MODEL=
```
Without STT credentials, the speech endpoint returns HTTP 503 and the client provides quick-question prompt buttons and text fallback.

## 4. Run for Meta Quest Headset (HTTPS Required)
1. Start backend: `python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000`
2. Start frontend: `npm run dev` (or `npm run build` with Nginx container).
3. Expose over HTTPS (staging server with TLS or secure tunnel e.g. `cloudflared tunnel --url http://localhost:5173`).
4. In Meta Quest Browser: open `https://<your-host>/vr`.
5. Grant microphone permission when prompted.
6. Press **Enter Immersive VR**.

## 5. Demonstration Runbook (10-Phase Clinical Workflow)
1. **Preparation:** Verify backend `/api/health`, ensure case `respiratory-severe-001` is loaded, headset charged and volume comfortable.
2. **First Contact:** Enter room. Look at patient, press Grip / push-to-talk: introduce yourself and ask for consent.
3. **History Taking:** Elicit presenting complaint (cough for 4 days, severe breathlessness today), onset, chest pain and medical/medication history.
4. **Physical Examination:** Point at the Stethoscope on the trolley and click the patient's right lower chest to auscultate crackles. Point at the Pulse Oximeter to observe severe hypoxaemia (SpO₂ 88%).
5. **Emergency Treatment:** Point at the Oxygen Mask on the trolley. Observe real-time physiological response: mask attaches to patient, breathing rate visibly calms, monitor transitions to `IMPROVING` (SpO₂ 94%).
6. **Escalation:** In the Treat menu, call senior help / emergency team for an unstable respiratory presentation.
7. **Investigations:** In the Tests menu, select indication `Assess suspected pneumonia`, request Chest X-ray (reveals right lower-zone air-space opacity) and Full Blood Count.
8. **Clinical Reasoning:** In the Decide menu, dictate/enter differential diagnoses (pneumonia, sepsis, PE) and final diagnosis (severe community-acquired pneumonia).
9. **Management & Handover:** Select checklist items (ABCDE, oxygenation, senior escalation, repeat observations, handover).
10. **Debrief & Feedback:** Submit encounter. Review the formative performance score, transparent rubric domains, and simulation evidence timeline showing exact intervention minutes and safety check validations.

## 6. Acceptance Checklist
| Gate | Target / Pass Criteria | Result |
|---|---|---|
| WebXR Enter / Exit | 10/10 clean transitions into `immersive-vr` and exit back to browser | _not run_ |
| 72 FPS Stability | No persistent frame drops in normal demo scene | _not run_ |
| Voice Dialogue | ≥9/10 spoken turns correctly transcribed with contextually grounded reply | _not run_ |
| Voice Latency | Median speech-to-audio under 3 s, 95th percentile under 5 s | _not run_ |
| Equipment Interaction | Stethoscope, Oximeter, BP cuff, Oxygen mask interactable via Quest controller | _not run_ |
| Physiology Dynamics | Oxygen administration visibly changes breathing animation and monitor vitals | _not run_ |
| End-to-End Encounter | Intro to formative debrief completed in a single session | _not run_ |
| Error Recovery | Network interruption or mic denial surfaces clear retry options without crash | _not run_ |
| 3 Rehearsals | Consecutive complete runs using runbook with successful case reset | _not run_ |

Automated offline tests:
- `npm run test:unit` (10 JS tests passing)
- `python tests/test_compiler.py` (8 Python unit tests passing: Henderson-Hasselbalch, hemodynamics, contraindications, procedural compilations across Black and White phenotypes)
- `python tests/test_simulation.py` (7 Python simulation unit tests passing)
- `python tests/test_simulation_integration.py` (Integration tests passing)
- `python -m compileall -q backend tests scripts` (Zero syntax or type errors)
- `npm run build` (Clean production bundle build with code-split VR client)

## 7. Known Limitations & Roadmap
- Patient avatar is an anatomically human-scale primitive with parametric rigging and procedural breathing/mouth movement. High-fidelity skeletal mesh rigging and blendshape lip-sync will be introduced in subsequent asset phases.
- Menu-driven investigation and management selections avoid free-form hallucination; free-form orders are validated against the case investigation schema.
- Practice mode enabled for VR. Examination mode with locked attempt state and token pins is supported by the backend; full proctored exam UI for VR is planned for Phase 3.
- All clinical cases and physiology parameters are fictional educational prototypes requiring clinical faculty attestation before formal educational use.
