# Bestie Clinical Sim — Advanced 3D Virtual Teaching Hospital
## Master Development Protocol & Architectural Roadmap

### 1. Vision & Engineering Philosophy

**Bestie Virtual Teaching Hospital** is an immersive, multi-department clinical simulation environment. It is engineered not as a passive virtual classroom, but as an operational tertiary healthcare facility where every clinically significant interaction is interactive and carries measurable clinical consequences.

#### The Golden Rule:
> **Everything that matters clinically must be interactive, and every interaction must have a meaningful consequence in the simulation.**

---

### 2. Multi-Department Facility Scope

The hospital campus is organized around a central circulation spine, with streaming asset loading to maintain high framerates on standalone hardware (Meta Quest 3 / WebXR):

| Tier | Departments / Services |
| :--- | :--- |
| **Acute Care** | Emergency & Trauma Bay, Triage, Resuscitation Suite, Intensive Care Unit (ICU), High-Dependency Unit (HDU) |
| **Inpatient Wards** | Internal Medicine, General Surgery, Paediatric Ward, Neonatal Intensive Care (NICU), Maternal-Fetal Unit & Labour Ward |
| **Diagnostic & Ancillary** | Radiology (X-Ray, CT, MRI, Ultrasound), Clinical Pathology & Hematology Labs, Pharmacy, Dialysis / Renal Unit |
| **Circulation & Admin** | Reception, Triage desk, Nursing stations, Lift banks, Medical records / EHR terminal, Simulation observation theatre |

---

### 3. Three Levels of Environmental Detail

Every simulated hospital space conforms to a strict three-tier hierarchy:
1. **Level 1 — Structural**: Walls, anti-microbial vinyl flooring, acoustic ceiling tiles, door jambs, vision panels, window fenestration, and crash rails (0.95m height).
2. **Level 2 — Functional**: Electric Hill-Rom beds, multi-parameter monitors, overhead surgical lighting, headwalls with medical gas outlets ($O_2$, Air, Vac), crash carts, IV infusion poles.
3. **Level 3 — Interactive**: Clickable/grabbable instruments (stethoscope, pulse oximeter, BP cuff, oxygen mask), movable bed backrests (Fowler's position), interactive touchscreens, drug draw-up, needle decompression, defibrillator pad placement.

---

### 4. Patient Engineering Protocol

To guarantee clinical realism without risking patient privacy:
- **Zero Real Identifiable Data**: All encounters use synthetic, physiologically grounded teaching cases.
- **Demographic & Phenotypic Diversity**: 4 standard adult baseline archetypes covering Fitzpatrick skin scales I through VI, plus planned paediatric, geriatric, and obstetric avatars.
- **Dynamic Physiological Signs**:
  - Respiratory excursions directly driven by simulated respiratory rate (RR).
  - Pupillary light reflex with dynamic sphincter pupillae constriction.
  - Perioral cyanosis, febrile malar flushing, scleral icterus, and diaphoresis (forehead cold sweat sheen).
  - Tactile signs: Capillary refill time ($<2\text{s}$), radial artery pulse volume, pre-tibial pitting edema ($2+$), and tracheal alignment.
- **Verbal Compliance Engine**: Avatar physically complies with clinical verbal commands:
  - *"Take a deep breath"* $\rightarrow$ Deep inspiration, asymmetric excursion, adventitious crackles.
  - *"Open your mouth and say 'Ah'"* $\rightarrow$ Jaw articulates, tongue depresses, pharynx exposed.
  - *"Turn your head to the left"* $\rightarrow$ JVP exposed at $45^\circ$.
  - *"Sit forward"* $\rightarrow$ Leans forward to expose posterior lung bases for back auscultation.
  - *"Squeeze both hands"* $\rightarrow$ Motor strength evaluation ($5/5$).

---

### 5. Architectural Split: Simulation vs. Presentation

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation Layer                    │
│   (3D Scene • Three.js / WebXR / Unity • Spatial Audio)     │
└──────────────────────────────▲──────────────────────────────┘
                               │ Event Stream / Action Intention
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Clinical Gateway (API)                   │
│   - Action Validation (e.g. check allergy, contraindication)│
│   - Structured Clinical Event Logger & Timestamps           │
└──────────────────────────────▲──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Deterministic Simulation Core                  │
│   - Event-Replay Patient State Engine (simulation.py)       │
│   - Physiological Chemistry & Linter (medical_linter.py)    │
│   - Multi-tenant Scoped Case Versions (SHA-256 Pinned)      │
└─────────────────────────────────────────────────────────────┘
```

**Generative AI Guardrails**: Language models drive natural patient dialogue and case drafting suggestions; they **never** independently synthesize vital signs, lab values, or pass/fail examination scoring.

---

### 6. Phased Implementation Roadmap

- **Phase 0 — Foundation & Technical Proof** *(Completed)*: Three.js/WebXR hospital bay, PBR lighting, procedural equipment, and deterministic API integration.
- **Phase 1 — Reference Virtual Emergency Department (Milestone 001)**:
  - Complete resuscitation room with full Level 3 interactions.
  - End-to-end clinical encounter from triage to stabilization, investigations, and handover.
  - Benchmark test package for 3D collaborators.
- **Phase 2 — Inpatient & Critical Expansion**:
  - Acute medical ward, ICU, and maternal/obstetric suites.
  - Shared patient transfer workflows (SBAR handover between bays).
- **Phase 3 — Advanced Diagnostics & Procedural Simulation**:
  - Interactive eFAST ultrasound probe placement and imaging view generation.
  - 12-lead ECG electrode placement and telemetry tracing acquisition.
  - Simulated blood specimen draw and lab analyzer station.
- **Phase 4 — Multi-Disciplinary Virtual Hospital**:
  - Multi-user synchronous simulation (Student Doctor + Student Nurse + Educator).
  - Operating theatre, surgical scrubbing, and neonatal resuscitation.
- **Phase 5 — Hybrid Sim Lab (Physical + Virtual)**:
  - 3D printed sensor-instrumented manikins aligned with VR coordinates.

