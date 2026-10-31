import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoom } from './scene/room.js';
import { Panel } from './scene/panel.js';
import { ClinicalAdapter, VR_TESTS, VR_EXAMINATIONS, VR_INTERVENTIONS, VR_MANAGEMENT } from './clinical/adapter.js';
import { VoiceController, transcribeViaServer } from './audio/voice.js';
import { StethoscopeAudio } from './audio/stethoscopeAudio.js';
import { PATIENT_PHENOTYPES } from './scene/patientModel.js';

const DEFAULT_CASE = new URLSearchParams(location.search).get('case') || 'respiratory-severe-001';
const DEPARTMENTS = {
  resus: {
    id: 'resus',
    name: 'Emergency Resus',
    subtitle: 'Bay 04 · High Acuity',
    badge: 'RESUS · HIGH ACUITY (NEWS2: 11)',
    badgeColor: '#dc2626',
    icon: '⚡',
  },
  medical: {
    id: 'medical',
    name: 'Acute Medical',
    subtitle: 'Bed 12 · Adult Inpatient',
    badge: 'WARD · ACUTE ADMISSION',
    badgeColor: '#0284c7',
    icon: '🏥',
  },
  icu: {
    id: 'icu',
    name: 'Intensive Care (ICU)',
    subtitle: 'Bed 02 · Level 3 Critical Care',
    badge: 'ICU · LEVEL 3 CRITICAL CARE',
    badgeColor: '#7c3aed',
    icon: '🩺',
  },
  obs: {
    id: 'obs',
    name: 'Maternal & Obs',
    subtitle: 'Bed 05 · Maternal-Fetal Unit',
    badge: 'MATERNAL · HIGH RISK OBSTETRICS',
    badgeColor: '#db2777',
    icon: '🤰',
  },
  rad: {
    id: 'rad',
    name: 'Radiology / PACS',
    subtitle: 'Suite 01 · Diagnostic Imaging',
    badge: 'PACS · DIAGNOSTIC IMAGING SUITE',
    badgeColor: '#059669',
    icon: '🩻',
  },
};

const STANCES = {
  'bedside-right': {
    cam: [0.72, 1.48, -0.95],
    target: [0.0, 1.15, -1.45],
    panelPos: [0.28, 1.30, -0.65],
    panelRot: -0.45,
    label: 'Bedside Right (OSCE Standard Exam)',
  },
  'bedside-left': {
    cam: [-0.72, 1.48, -0.95],
    target: [0.0, 1.15, -1.45],
    panelPos: [-0.28, 1.30, -0.65],
    panelRot: 0.45,
    label: 'Bedside Left',
  },
  'face-airway': {
    cam: [0.18, 1.38, -0.85],
    target: [0.0, 1.25, -1.45],
    panelPos: [-0.48, 1.30, -0.75],
    panelRot: 0.45,
    label: 'Close-up Airway & Facial Inspection',
  },
  'foot-of-bed': {
    cam: [0.0, 1.55, 0.55],
    target: [0.0, 1.10, -1.45],
    panelPos: [-0.45, 1.30, -0.35],
    panelRot: 0.35,
    label: 'Foot of Bed (Inspection)',
  },
  'back-exam': {
    cam: [0.42, 1.42, -2.05],
    target: [0.0, 1.15, -1.45],
    panelPos: [0.45, 1.30, -1.15],
    panelRot: -Math.PI / 2,
    label: 'Posterior Chest (Back Auscultation)',
  },
};

const QUICK = [
  ['Introduce & Consent', "Hello, I am the doctor looking after you today. Can you tell me your name, and may I ask you a few questions and examine you?"],
  ['When started?', 'When did your cough and breathing difficulty start, and how has it changed?'],
  ['Chest pain / symptoms', 'Do you have any chest pain when you breathe in, or any other symptoms?'],
  ['Medications & allergies', 'Do you have any medical conditions, take regular medicines, or have any allergies?'],
];
const INDICATIONS = [
  'Assess oxygenation and respiratory failure',
  'Assess suspected pneumonia and inflammatory response',
  'Assess end-organ function and hydration status',
  'Blood cultures before antibiotics if no delay in treatment',
];
const NAV = [
  ['talk', 'Talk'],
  ['exam', 'Examine'],
  ['treat', 'Treat / Stabilize'],
  ['tests', 'Investigations'],
  ['ehr', 'EHR & SBAR'],
  ['decide', 'Decide'],
  ['exit', 'Exit VR'],
];
const STATE_LABEL = { idle: 'Ready', listening: 'Listening…', processing: 'Processing…', responding: 'Patient responding', error: 'Retry' };

export default function VRApp() {
  const mountRef = useRef(null);
  const eng = useRef({});
  const [xr, setXr] = useState({ checked: false, vr: false });
  const [ui, setUi] = useState({
    page: 'start',
    voice: 'idle',
    caption: 'Start the encounter to enter the virtual consultation room.',
    error: '',
    busy: false,
    vitals: null,
    statusLabel: 'UNSTABLE',
    clockMin: 0.0,
    oxygenActive: false,
    pulseOxAttached: false,
    phenotype: 'black-male',
    department: 'resus',
    currentStance: 'bedside-right',
    lastResult: null,
    lastFinding: null,
    indication: 0,
    differential: [],
    diagnosis: '',
    reasoning: '',
    management: [],
    sbar: { situation: '', background: '', assessment: '', recommendation: '' },
    report: null,
    inVR: false,
    telemetrySound: true,
  });
  const [text, setText] = useState('');
  const uiRef = useRef(ui); uiRef.current = ui;
  const patch = useCallback((p) => setUi((u) => ({ ...u, ...(typeof p === 'function' ? p(u) : p) })), []);

  // Safe executor for clinical async actions
  const act = useCallback(async (fn, retry) => {
    eng.current.retry = retry; patch({ busy: true, error: '' });
    try { await fn(); } catch (e) {
      patch({ error: (e.message || 'Action failed.') + (e.retryable ? ' Check the network and retry.' : '') });
    } finally { patch({ busy: false }); }
  }, [patch]);

  // Bedside Stance Switcher (Walk & Stand in clinical examination positions)
  const setCameraStance = useCallback((stanceKey) => {
    const st = STANCES[stanceKey] || STANCES['bedside-right'];
    const { camera, rig, panel, controls, renderer } = eng.current;
    if (!camera) return;

    if (renderer?.xr?.isPresenting) {
      if (rig) rig.position.set(st.cam[0], 0, st.cam[2]);
    } else {
      camera.position.set(st.cam[0], st.cam[1], st.cam[2]);
      if (controls) {
        controls.target.set(st.target[0], st.target[1], st.target[2]);
        controls.update();
      } else {
        camera.lookAt(st.target[0], st.target[1], st.target[2]);
      }
    }

    if (panel?.mesh) {
      panel.mesh.position.set(st.panelPos[0], st.panelPos[1], st.panelPos[2]);
      panel.mesh.rotation.y = st.panelRot;
    }

    patch({ currentStance: stanceKey, caption: `Position: ${st.label}` });
  }, [patch]);

  // Live Hospital Department Transfer
  const switchDepartment = useCallback((newDept) => {
    if (!DEPARTMENTS[newDept]) return;
    const { scene } = eng.current;
    if (!scene) return;

    if (eng.current.room) {
      scene.remove(eng.current.room.root);
      eng.current.room.root.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }

    const currentPheno = uiRef.current.phenotype || 'black-male';
    const room = buildRoom(currentPheno, newDept);
    scene.add(room.root);
    eng.current.room = room;

    room.monitor.draw(eng.current.vitals, uiRef.current.statusLabel, uiRef.current.clockMin, uiRef.current.oxygenActive);
    if (uiRef.current.oxygenActive) room.patient.setOxygen(true);
    if (uiRef.current.pulseOxAttached) room.patient.setPulseOx(true);

    patch({ department: newDept, caption: `Department transferred to ${DEPARTMENTS[newDept].name} (${DEPARTMENTS[newDept].subtitle}).` });
  }, [patch]);

  // Sync bedside monitor & 3D avatar with current clinical state
  const syncState = useCallback((state) => {
    if (!state) return;
    const vitals = state.vitals || eng.current.vitals;
    const status = state.status || 'unstable';
    const clock = typeof state.clock === 'number' ? state.clock : 0.0;
    const oxy = eng.current.adapter?.completedInterventions.includes('oxygen') || false;

    patch({ vitals, statusLabel: status, clockMin: clock, oxygenActive: oxy });
    eng.current.room?.monitor.draw(vitals, status, clock, oxy);

    if (vitals && (vitals.rr || vitals['Respiratory rate'])) {
      const rr = parseInt(vitals.rr || vitals['Respiratory rate'], 10);
      eng.current.room?.patient.setBreathing(rr);
    }
    eng.current.room?.patient.setOxygen(oxy);
  }, [patch]);

  const changePhenotype = useCallback((newKey) => {
    if (!PATIENT_PHENOTYPES[newKey]) return;
    eng.current.room?.patient.setPhenotype(newKey);
    patch({ phenotype: newKey, caption: `Patient appearance updated: ${PATIENT_PHENOTYPES[newKey].label}` });
  }, [patch]);

  const askPatient = useCallback((q) => act(async () => {
    patch({ caption: `You: ${q}` });
    const reply = await eng.current.adapter.ask(q);
    patch({ caption: `Patient: ${reply}` });
    eng.current.room?.patient.setTalking(true);
    await eng.current.voice.respond(reply, uiRef.current.phenotype);
    eng.current.room?.patient.setTalking(false);
    try {
      const st = await eng.current.adapter.getState();
      syncState(st);
    } catch { /* ignore non-blocking sync */ }
  }, () => askPatient(q)), [act, patch, syncState]);

  const triggerHapticPulse = useCallback((intensity = 0.6, durationMs = 45) => {
    try {
      const session = eng.current.renderer?.xr?.getSession();
      if (!session) return;
      for (const source of session.inputSources || []) {
        if (source.gamepad?.hapticActuators?.length > 0) {
          source.gamepad.hapticActuators[0].pulse(intensity, durationMs);
        }
      }
    } catch { /* ignore non-blocking haptic error */ }
  }, []);

  // Clinical Verbal Commands (Student instructs, Patient complies)
  const commandPatient = useCallback((cmdKey) => act(async () => {
    const patient = eng.current.room?.patient;
    const audio = eng.current.stethAudio;
    const voice = eng.current.voice;

    if (cmdKey === 'breathe') {
      patch({ caption: 'Doctor: "Take a deep breath in through your mouth."' });
      patient?.takeDeepBreath();
      audio?.playDeepInspiration(2.5);
      await voice.respond("Taking a deep breath in, doctor...", uiRef.current.phenotype);
      patch({ caption: 'Patient compliance: Deep inspiration. Bilateral asymmetric chest wall expansion, prolonged expiratory phase, coarse right basal crepitations.' });
    } else if (cmdKey === 'ah') {
      patch({ caption: 'Doctor: "Open your mouth and say \'Ah\'."' });
      patient?.openMouth();
      audio?.playSayAh(2.0);
      await voice.respond("Aaaaaah...", uiRef.current.phenotype);
      patch({ caption: 'Oral Cavity: Pharynx moist, tonsils non-hypertrophic, uvula midline, dry coated tongue, airway patent.' });
    } else if (cmdKey === 'turn_head') {
      patch({ caption: 'Doctor: "Can you turn your head to the left?"' });
      patient?.turnHead('left');
      await voice.respond("Turning to the left, doctor...", uiRef.current.phenotype);
      patch({ caption: 'Neck Inspection: JVP elevated 3cm above sternal angle at 45°. Rapid carotid upstroke.' });
    } else if (cmdKey === 'sit_forward') {
      patch({ caption: 'Doctor: "Can you sit forward so I can examine your back?"' });
      patient?.sitForward();
      setCameraStance('back-exam');
      await voice.respond("Yes doctor... leaning forward... ah, taking it slowly...", uiRef.current.phenotype);
      patch({ caption: 'Patient sits forward: Thoracic spine straight, posterior lung bases exposed. Auscultation available.' });
    } else if (cmdKey === 'lie_back') {
      patch({ caption: 'Doctor: "You can lean back and rest now."' });
      patient?.lieBack();
      setCameraStance('bedside-right');
      await voice.respond("Thank you doctor, resting back now.", uiRef.current.phenotype);
      patch({ caption: 'Patient reclined back to 45° semi-recumbent posture.' });
    } else if (cmdKey === 'squeeze') {
      patch({ caption: 'Doctor: "Squeeze both of my hands as hard as you can."' });
      patient?.squeezeFingers();
      await voice.respond("Squeezing now, doctor...", uiRef.current.phenotype);
      patch({ caption: 'Motor Power: 5/5 bilateral symmetric handgrip strength. Sensation intact.' });
    } else if (cmdKey === 'crt') {
      patch({ caption: 'Doctor: Testing capillary refill on right hand nail bed.' });
      patient?.testCapillaryRefill();
      patch({ caption: 'Capillary Refill Time (CRT): Pressed nail blanches white, flushes back to pink in 1.6s (< 2s Normal Perfusion).' });
    }
  }, () => commandPatient(cmdKey)), [act, patch, setCameraStance]);

  const examinePatient = useCallback((actionKey) => act(async () => {
    let res = null;
    try {
      res = await eng.current.adapter.examine(actionKey);
    } catch {
      // Anatomical surface landmark findings
      const findingMap = {
        'auscultate:aortic': 'Aortic Area (2nd R ICS, Sternal Edge): Crisp S1, accentuated S2. No systolic ejection murmur radiating to carotids.',
        'auscultate:pulmonic': 'Pulmonic Area (2nd L ICS, Sternal Edge): Normal pulmonary component of S2 with physiological inspiratory splitting.',
        'auscultate:erbs': "Erb's Point (3rd L ICS, Sternal Edge): Dual heart sounds present; no early diastolic regurgitant murmur.",
        'auscultate:tricuspid': 'Tricuspid Area (4th/5th L Lower Sternal Border): Normal S1 and S2; no tricuspid regurgitation or right-sided gallop.',
        'auscultate:mitral': 'Mitral Apex (5th L ICS, Mid-Clavicular Line): S1 loud, tachycardic at 124 bpm. No pansystolic murmur radiating to axilla.',
        'auscultate:right_upper': 'Right Upper Lobe (1st/2nd ICS Anterior): Vesicular breath sounds with transmitted upper airway sounds.',
        'auscultate:left_upper': 'Left Upper Lobe (1st/2nd ICS Anterior): Clear vesicular breath sounds; no adventitious sounds.',
        'auscultate:right_middle': 'Right Middle Lobe (4th ICS Anterior MCL): Vesicular breath sounds; no wheezing or consolidation.',
        'auscultate:right_lower': 'Right Lower Lobe Base: Coarse inspiratory crackles (crepitations) and bronchial breath sounds consistent with consolidation.',
        'auscultate:left_lower': 'Left Lower Lobe Base: Vesicular breath sounds throughout; no crackles or wheezes.',
        'auscultate:post_right_base': 'Posterior Right Base: Marked coarse late-inspiratory crepitations and increased vocal resonance (bronchophony).',
        'auscultate:post_left_base': 'Posterior Left Base: Normal vesicular breath sounds.',
        'auscultate:post_interscapular': 'Interscapular Region: Bronchovesicular breath sounds without stridor or wheeze.',
        'palpate:radial': 'Right Radial Pulse: Tachycardic at 124 bpm, bounding peripheral pulse volume, regular rhythm.',
        'palpate:carotid': 'Carotid Arteries: Strong, rapid pulse waveform without bruits.',
        'palpate:temperature': 'Tactile Core Temperature (Forehead): Marked pyrexia (39.1 °C); skin is burning hot to touch with profuse cold diaphoresis.',
        'palpate:pupils': 'Pupillary Light Reflex: Bilateral 4mm pupils constrict briskly to 2mm under direct penlight stimulus; consensual reflex intact.',
        'palpate:trachea': 'Tracheal Palpation: Trachea is central within the suprasternal notch; no deviation, stridor, or subcutaneous emphysema.',
        'palpate:edema': 'Pre-Tibial Palpation: Firm pressure over lower tibia demonstrates Grade 2+ pitting indentation (~3mm depth, 4s rebound).',
        'palpate:abdomen': 'Abdominal Palpation: Soft abdomen with mild voluntary epigastric guarding due to coughing. No rebound or peritonitis.',
        'inspect:general': 'General Appearance: Patient is ill-looking, diaphoretic with forehead cold sweats, flushed (Temp 39.1°C), tachypnoeic at 32/min using intercostal accessory muscles.',
        'inspect:jvp': 'Neck & JVP: JVP elevated ~3cm above sternal angle at 45° elevation. Carotid pulse rapid and bounding.',
        'inspect:respiratory_effort': 'Respiratory Effort: RR 32/min, shallow breathing with accessory muscle use (sternocleidomastoid tensing), asymmetrical right lower expansion.',
        'inspect:hands': 'Hands & Periphery: Warm and moist, no peripheral cyanosis, no clubbing or splinter hemorrhages. Palmar erythema absent.',
        'inspect:wristband': 'Patient Identification Band: Confirmed SMITH, JOHN · DOB 14-04-1978 · NHS 492 819 0281 · Allergy Alert: PENICILLIN.',
        'inspect:iv': 'Intravenous Access: 20G pink cannula in right hand dorsum is patent, no phlebitis, clean transparent Tegaderm dressing.',
        'test:crt': 'Capillary Refill Time (CRT): Pressed right nail bed blanches white and briskly refills to pink in 1.6s (Normal < 2s).',
        'inspect:burn': 'Burn Assessment: Partial-thickness dermal burn with fluid-filled tense blisters and perioral carbon soot. Audible inspiratory stridor.',
        'inspect:wound': 'Traumatic Wound: Severe blunt chest contusion, gaping forearm laceration with active venous oozing, and stabilized SAM pelvic binder.',
        'inspect:emesis': 'Bedside kidney dish contains yellow-green bilious vomitus (~150 mL).',
        'tool:ultrasound': 'Bedside eFAST Ultrasound: Subxiphoid pericardial view clear, no hemopericardium. Morrison’s pouch and splenorenal recess clear without free fluid.',
        'tool:ctg': 'Cardiotocography (CTG): Baseline FHR 140 bpm, moderate variability (10-15 bpm), reassuring accelerations present, no decelerations. Tocography 3 contractions / 10 min.',
        'tool:pacs': 'PACS Diagnostic Station: Diagnostic Chest X-ray & Axial CT loaded. Right lower lobe dense alveolar consolidation with patent air bronchograms. No pneumothorax.',
        'tool:wall_diagnostic': 'Wall Diagnostic Center: Welch Allyn coaxial ophthalmoscope and macroview otoscope charged and ready for fundoscopy and otoscopy.',
        'tool:mayo_stand': 'Mayo Surgical Stand: Sterile field prepared with 14G emergency decompression cannula, sterile scalpels, hemostats, and Atrium chest drainage canister.',
        'tool:infant_warmer': 'Neonatal Radiant Warmer: Overhead quartz heating unit set to 36.5°C servo-control. Resuscitation neopuff T-piece and suction primed.',
      };
      res = { finding: findingMap[actionKey] || 'Physical examination completed.' };
    }

    patch({ lastFinding: res.finding, caption: `Examination: ${res.finding}` });

    // Auscultation audio synthesis & physical Quest controller haptic vibration
    const hr = parseInt(uiRef.current.vitals?.hr || '124', 10);
    if (actionKey === 'auscultate:right_lower' || actionKey === 'auscultate:right_base' || actionKey === 'auscultate:post_right_base') {
      eng.current.stethAudio?.playCrackles(4.5);
    } else if (actionKey.startsWith('auscultate:mitral') || actionKey.startsWith('auscultate:aortic') || actionKey.startsWith('auscultate:pulmonic') || actionKey.startsWith('auscultate:erbs') || actionKey.startsWith('auscultate:tricuspid')) {
      eng.current.stethAudio?.playHeartSounds(4.0, hr);
      triggerHapticPulse(0.7, 50);
    } else if (actionKey === 'palpate:radial') {
      eng.current.room?.patient.palpateRadialPulse();
      eng.current.stethAudio?.playRadialPulse(3.5, hr);
      triggerHapticPulse(0.85, 45);
      setTimeout(() => triggerHapticPulse(0.5, 30), (60 / hr) * 350);
    } else if (actionKey === 'palpate:carotid') {
      eng.current.stethAudio?.playHeartSounds(3.5, hr);
      triggerHapticPulse(0.85, 45);
    } else if (actionKey === 'palpate:pupils') {
      eng.current.room?.patient.shinePenlight();
      eng.current.stethAudio?.playPenlightClick();
    } else if (actionKey === 'palpate:temperature') {
      const tInfo = eng.current.room?.patient.checkTemperature?.();
      if (tInfo) patch({ caption: `Tactile Assessment: ${tInfo.temp} · ${tInfo.sweat}` });
    } else if (actionKey === 'palpate:edema') {
      eng.current.room?.patient.checkEdema?.();
    } else if (actionKey === 'palpate:abdomen') {
      eng.current.stethAudio?.playPainGroan();
    } else if (actionKey === 'inspect:burn') {
      eng.current.stethAudio?.playStridor(3.5);
    } else if (actionKey === 'test:crt') {
      eng.current.room?.patient.testCapillaryRefill();
    } else if (actionKey.startsWith('auscultate:')) {
      eng.current.stethAudio?.playVesicular(4.0);
    }

    if (actionKey === 'measure:spo2') {
      eng.current.room?.patient.setPulseOx(true);
      patch({ pulseOxAttached: true });
    }
    if (res.state) syncState(res.state);
  }, () => examinePatient(actionKey)), [act, patch, syncState, triggerHapticPulse]);

  const intervenePatient = useCallback((actionKey) => act(async () => {
    const res = await eng.current.adapter.intervene(actionKey);
    const label = res.already ? `${res.label} (already active)` : `${res.label} administered.`;
    patch({ caption: `Intervention: ${label}` });
    if (actionKey === 'oxygen') {
      eng.current.room?.patient.setOxygen(true);
      patch({ oxygenActive: true });
    }
    if (res.state) syncState(res.state);
  }, () => intervenePatient(actionKey)), [act, patch, syncState]);

  const setPathology = useCallback((type) => {
    eng.current.room?.patient.setTraumaVisual(type);
    const labels = {
      respiratory: 'Simulated Pathology: Severe Pneumonia & Sepsis (RR 32, accessory muscle retractions, diaphoresis, cyanosis, RLL crackles).',
      trauma: 'Simulated Pathology: Major Road Trauma & Hemorrhagic Shock (Thoracic contusion, gaping bleeding laceration, SAM pelvic binder, shock pallor).',
      burn: 'Simulated Pathology: Thermal Flame Burns & Inhalation Injury (Partial/full-thickness burns, fluid blisters, perioral soot, stridor).',
      malaria: 'Simulated Pathology: Severe Malaria with Febrile Rigors (Temp 39.1°C, intense facial flushing, shivering tremors, scleral icterus).',
      vomit: 'Simulated Pathology: Acute Bilious Emesis (Bedside kidney dish containing yellow-green gastric fluid).',
    };
    patch({ caption: labels[type] || 'Pathology updated.' });
  }, [patch]);

  const startEncounter = useCallback(() => act(async () => {
    const d = await eng.current.adapter.start(DEFAULT_CASE, 'VR Medical Student');
    eng.current.vitals = d.patient?.vitals || null;
    patch({
      page: 'talk',
      vitals: d.patient?.vitals || null,
      statusLabel: 'UNSTABLE',
      clockMin: 0.0,
      oxygenActive: false,
      pulseOxAttached: false,
      lastResult: null,
      lastFinding: null,
      report: null,
      management: [],
      differential: [],
      diagnosis: '',
      reasoning: '',
      caption: `Patient: ${d.opening}`,
    });

    // Step learner right to bedside (OSCE right examination stance)
    setCameraStance('bedside-right');

    eng.current.room?.patient.setOxygen(false);
    eng.current.room?.patient.setPulseOx(false);
    if (d.patient?.phenotype && PATIENT_PHENOTYPES[d.patient.phenotype]) {
      changePhenotype(d.patient.phenotype);
    }
    // Set visual trauma & physical condition
    const caseLower = (d.case_id || DEFAULT_CASE).toLowerCase();
    if (caseLower.includes('burn')) {
      eng.current.room?.patient.setTraumaVisual('burn');
    } else if (caseLower.includes('trauma')) {
      eng.current.room?.patient.setTraumaVisual('trauma');
    } else if (caseLower.includes('malaria')) {
      eng.current.room?.patient.setTraumaVisual('malaria');
    } else {
      eng.current.room?.patient.setTraumaVisual('respiratory');
    }
    eng.current.room?.patient.setBreathing(32);
    eng.current.room?.monitor.draw(d.patient?.vitals || null, 'UNSTABLE', 0.0, false);
    
    // Start authentic hospital ward soundscape & telemetry pulse monitor
    eng.current.stethAudio?.startWardAmbience(uiRef.current.department);
    if (uiRef.current.telemetrySound) {
      const hr = parseInt(d.patient?.vitals?.hr || '124', 10);
      const spo2 = parseInt(d.patient?.vitals?.spo2 || '88', 10);
      eng.current.stethAudio?.startTelemetryTone(hr, spo2);
    }
    eng.current.room?.patient.setTalking(true);
    await eng.current.voice.respond(d.opening, uiRef.current.phenotype);
    eng.current.room?.patient.setTalking(false);
  }, () => startEncounter()), [act, patch, setCameraStance, changePhenotype]);

  const order = useCallback((id) => act(async () => {
    const r = await eng.current.adapter.order(id, INDICATIONS[uiRef.current.indication]);
    patch({ lastResult: r, caption: `Result: ${r.name} — ${r.result}` });
    try {
      const st = await eng.current.adapter.getState();
      syncState(st);
    } catch { /* ignore non-blocking sync */ }
  }, () => order(id)), [act, patch, syncState]);

  const finish = useCallback(() => act(async () => {
    const u = uiRef.current;
    const report = await eng.current.adapter.finish({
      differential: u.differential,
      final_diagnosis: u.diagnosis,
      management: u.management,
      reflection: u.reasoning,
    });
    patch({ report, page: 'report', caption: 'Encounter submitted. Review formative feedback below.' });
  }, () => finish()), [act, patch]);

  const exitVR = useCallback(() => {
    eng.current.renderer?.xr.getSession()?.end();
  }, []);

  // Voice toggle
  const voiceToggle = useCallback(async (target = 'ask') => {
    const v = eng.current.voice;
    if (v.state === 'listening') {
      const t = await v.end();
      if (t) await handleSpeech(target, t);
      else if (v.state === 'listening') v.idle();
      return;
    }
    eng.current.target = target;
    await v.begin();
  }, []); // eslint-disable-line

  async function handleSpeech(target, t) {
    if (target === 'ask') {
      const lower = t.toLowerCase();
      if (lower.includes('breath') || lower.includes('inhale')) return commandPatient('breathe');
      if (lower.includes('ah') || lower.includes('mouth') || lower.includes('throat')) return commandPatient('ah');
      if (lower.includes('turn') && lower.includes('head')) return commandPatient('turn_head');
      if (lower.includes('sit') && lower.includes('forward')) return commandPatient('sit_forward');
      if (lower.includes('lie') || lower.includes('rest') || lower.includes('back')) return commandPatient('lie_back');
      if (lower.includes('squeeze') || lower.includes('grip')) return commandPatient('squeeze');
      if (lower.includes('crt') || lower.includes('refill')) return commandPatient('crt');
      return askPatient(t);
    }
    if (target === 'differential') patch({ differential: t.split(/,| and /i).map((x) => x.trim()).filter(Boolean) });
    if (target === 'diagnosis') patch({ diagnosis: t });
    if (target === 'reasoning') patch({ reasoning: t });
    if (target.startsWith('sbar:')) {
      const key = target.slice(5);
      patch((u) => ({ sbar: { ...u.sbar, [key]: t }, caption: `SBAR ${key.toUpperCase()}: ${t}` }));
    }
    eng.current.voice.idle();
  }

  const submitText = () => {
    const t = text.trim();
    if (!t || !uiRef.current.page || uiRef.current.page === 'start') return;
    setText('');
    const lower = t.toLowerCase();
    if (lower.includes('breath') || lower.includes('inhale')) {
      return commandPatient('breathe');
    }
    if (lower.includes('ah') || lower.includes('mouth') || lower.includes('throat')) {
      return commandPatient('ah');
    }
    if (lower.includes('turn') && lower.includes('head')) {
      return commandPatient('turn_head');
    }
    if (lower.includes('sit') && lower.includes('forward')) {
      return commandPatient('sit_forward');
    }
    if (lower.includes('lie') || lower.includes('rest') || lower.includes('back')) {
      return commandPatient('lie_back');
    }
    if (lower.includes('squeeze') || lower.includes('grip') || lower.includes('hand')) {
      return commandPatient('squeeze');
    }
    if (lower.includes('crt') || lower.includes('refill')) {
      return commandPatient('crt');
    }
    askPatient(t);
  };

  // Button dispatcher
  const onButton = useCallback((id) => {
    const u = uiRef.current;
    if (id === 'start') return startEncounter();
    if (id === 'exit') return exitVR();
    if (NAV.some(([n]) => n === id)) {
      patch({ page: id });
      if (id === 'obs' || id === 'exam') eng.current.room?.monitor.draw(eng.current.vitals, u.statusLabel, u.clockMin, u.oxygenActive);
      return;
    }
    if (id === 'talk-btn') return voiceToggle('ask');
    if (id.startsWith('q:')) return askPatient(QUICK[+id.slice(2)][1]);
    if (id.startsWith('exam:')) return examinePatient(id.slice(5));
    if (id.startsWith('cmd:')) return commandPatient(id.slice(4));
    if (id.startsWith('stance:')) return setCameraStance(id.slice(7));
    if (id.startsWith('treat:')) return intervenePatient(id.slice(6));
    if (id.startsWith('pheno:')) return changePhenotype(id.slice(6));
    if (id.startsWith('t:')) return order(id.slice(2));
    if (id === 'ind') return patch({ indication: (u.indication + 1) % INDICATIONS.length });
    if (id.startsWith('dict:')) return voiceToggle(id.slice(5));
    if (id.startsWith('m:')) {
      const m = VR_MANAGEMENT[+id.slice(2)];
      return patch({ management: u.management.includes(m) ? u.management.filter((x) => x !== m) : [...u.management, m] });
    }
    if (id === 'finish') return finish();
    if (id === 'restart') {
      eng.current.adapter.reset();
      setCameraStance('foot-of-bed');
      patch({
        page: 'start',
        report: null,
        caption: 'Start the encounter to enter the virtual consultation room.',
        oxygenActive: false,
        pulseOxAttached: false,
        lastFinding: null,
        lastResult: null,
        sbar: { situation: '', background: '', assessment: '', recommendation: '' },
      });
      eng.current.room?.monitor.draw(null);
      eng.current.room?.patient.setOxygen(false);
      eng.current.room?.patient.setPulseOx(false);
      eng.current.room?.patient.setBreathing(32);
    }
  }, [startEncounter, exitVR, voiceToggle, askPatient, examinePatient, commandPatient, setCameraStance, intervenePatient, changePhenotype, order, finish, patch]);

  // One-time WebXR and Three.js initialization
  useEffect(() => {
    eng.current.adapter = new ClinicalAdapter();
    eng.current.stethAudio = new StethoscopeAudio();
    eng.current.voice = new VoiceController({
      onState: (s, detail) => patch((u) => ({ voice: s, error: s === 'error' ? detail : (s === 'listening' ? '' : u.error) })),
      transcribe: (blob) => transcribeViaServer(blob, ((t) => (t ? { Authorization: `Bearer ${t}` } : {}))(sessionStorage.getItem('bcsAccessToken'))),
    });

    if (navigator.xr?.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-vr').then(
        (vr) => setXr({ checked: true, vr }),
        () => setXr({ checked: true, vr: false })
      );
    } else {
      setXr({ checked: true, vr: false });
    }

    const el = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.xr.enabled = true;
    renderer.xr.setFoveation?.(1);

    // Photorealistic PBR Tone Mapping & Soft Directional Shadow Mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1421);

    // Image-Based Lighting (IBL) via RoomEnvironment for realistic vinyl, chrome, and skin specular reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const rig = new THREE.Group();
    scene.add(rig);

    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.05, 30);
    // Initial camera position (Bedside Right OSCE position)
    camera.position.set(0.72, 1.48, -0.95);
    rig.add(camera);

    // Desktop Free-Look Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.35;
    controls.maxDistance = 5.2;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent camera sinking beneath floor
    controls.target.set(0.0, 1.15, -1.45);
    controls.update();

    const initialDept = uiRef.current.department || 'resus';
    const room = buildRoom(uiRef.current.phenotype || 'black-male', initialDept);
    scene.add(room.root);

    // In-world UI Panel placed beside the patient
    const panel = new Panel(1024, 768, 1.35);
    panel.mesh.position.set(0.28, 1.30, -0.65);
    panel.mesh.rotation.y = -0.45;
    scene.add(panel.mesh);

    Object.assign(eng.current, { renderer, room, panel, scene, camera, rig, controls });

    const ray = new THREE.Raycaster();
    const tmpM = new THREE.Matrix4();

    // Raycast hit handler: checks panel first, then 3D interactable clinical equipment & landmarks
    const handlePointerAction = (origin, dir) => {
      ray.set(origin, dir);
      const panelHits = ray.intersectObject(panel.mesh);
      if (panelHits.length > 0) {
        const btn = panel.hit(panelHits[0].uv);
        if (btn) { onRef.current(btn.id); return; }
      }
      const currentRoom = eng.current.room || room;
      const objHits = ray.intersectObjects(currentRoom.interactables, true);
      if (objHits.length > 0) {
        let hitObj = objHits[0].object;
        while (hitObj && !hitObj.userData?.action && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData?.action) {
          const actKey = hitObj.userData.action;
          if (actKey === 'sanitize') {
            patch({ caption: 'Infection prevention: Hand hygiene performed with alcohol rub.' });
          } else if (actKey === 'tool:stethoscope') {
            patch({ page: 'exam', caption: 'Stethoscope active: Click an auscultation zone on chest or back.' });
          } else if (actKey === 'open:ehr') {
            patch({ page: 'ehr', caption: 'EHR Chart opened: Review observations, eMAR and SBAR handover.' });
          } else if (actKey === 'oxygen' || actKey === 'tool:oxygen') {
            interveneRef.current('oxygen');
            eng.current.stethAudio?.startOxygenFlow();
          } else if (actKey.startsWith('auscultate:') || actKey.startsWith('inspect:') || actKey.startsWith('measure:') || actKey.startsWith('palpate:') || actKey.startsWith('test:')) {
            examineRef.current(actKey);
          } else if (actKey === 'staff:nurse') {
            patch({ caption: 'Staff Nurse Amina: "Doctor, 20G IV access is secured in the right hand. NEWS2 is 11. High-flow oxygen mask and emergency medications are ready on the cart."' });
          } else if (actKey === 'staff:student') {
            patch({ caption: 'Dr. David (Student Peer): "I have recorded baseline vitals. SpO2 is 88% on room air with severe tachypnoea. We should prioritize ABCDE stabilization."' });
          } else if (actKey === 'tool:defib') {
            patch({ caption: 'Crash Cart: Biphasic defibrillator is in standby. Drawers A (Airway), B (Breathing), C (Circulation), and D (Drugs) are stocked and verified.' });
          } else if (actKey === 'tool:ventilator') {
            patch({ caption: 'Mechanical Ventilator: SIMV-PC mode active. FiO2 60%, PEEP 8 cmH2O, Ppeak 24 cmH2O. Dual-limb circuit connected.' });
          } else if (actKey === 'tool:ultrasound') {
            patch({ caption: 'Bedside eFAST Ultrasound: Subxiphoid pericardial view clear, no hemopericardium. Morrison’s pouch and splenorenal recess clear without free fluid.' });
          } else if (actKey === 'tool:ctg') {
            patch({ caption: 'Cardiotocography (CTG): Baseline FHR 140 bpm, moderate variability (10-15 bpm), reassuring accelerations present, no decelerations. Tocography 3 contractions / 10 min.' });
          } else if (actKey === 'tool:pacs') {
            patch({ caption: 'PACS Diagnostic Station: Diagnostic Chest X-ray & Axial CT loaded. Right lower lobe dense alveolar consolidation with patent air bronchograms. No pneumothorax.' });
          } else if (actKey === 'tool:wall_diagnostic') {
            patch({ caption: 'Wall Diagnostic Center: Welch Allyn coaxial ophthalmoscope and macroview otoscope charged and ready for fundoscopy and otoscopy.' });
          } else if (actKey === 'tool:mayo_stand') {
            patch({ caption: 'Mayo Surgical Stand: Sterile field prepared with 14G emergency decompression cannula, sterile scalpels, hemostats, and Atrium chest drainage canister.' });
          } else if (actKey === 'tool:infant_warmer') {
            patch({ caption: 'Neonatal Radiant Warmer: Overhead quartz heating unit set to 36.5°C servo-control. Resuscitation neopuff T-piece and suction primed.' });
          }
        }
      }
    };

    // VR Controllers
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i); rig.add(c);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -2.5)]),
        new THREE.LineBasicMaterial({ color: 0x80deea })
      );
      c.add(line);

      c.addEventListener('selectstart', () => {
        tmpM.identity().extractRotation(c.matrixWorld);
        const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
        const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(tmpM);
        handlePointerAction(origin, dir);
      });

      c.addEventListener('squeezestart', () => {
        if (uiRef.current.page !== 'start') {
          eng.current.target = 'ask';
          eng.current.voice.begin();
        }
      });
      c.addEventListener('squeezeend', async () => {
        const t = await eng.current.voice.end();
        if (t) handleSpeechRef.current('ask', t);
      });
    }

    renderer.xr.addEventListener('sessionstart', () => {
      controls.enabled = false;
      rig.position.set(0.72, 0, -0.95);
      camera.position.set(0, 0, 0);
      patch({ inVR: true });
    });
    renderer.xr.addEventListener('sessionend', () => {
      controls.enabled = true;
      rig.position.set(0, 0, 0);
      camera.position.set(0.72, 1.48, -0.95);
      controls.target.set(0.0, 1.15, -1.45);
      controls.update();
      eng.current.voice.cancelSpeech();
      eng.current.stethAudio?.stop();
      patch({ inVR: false });
    });

    let downPos = { x: 0, y: 0 };
    const onMouseDown = (ev) => {
      downPos = { x: ev.clientX, y: ev.clientY };
    };

    const onClick = (ev) => {
      const dx = ev.clientX - downPos.x;
      const dy = ev.clientY - downPos.y;
      if (Math.hypot(dx, dy) > 8) return; // User was dragging the camera to look around

      const r = renderer.domElement.getBoundingClientRect();
      const m = new THREE.Vector2(
        ((ev.clientX - r.left) / r.width) * 2 - 1,
        -((ev.clientY - r.top) / r.height) * 2 + 1
      );
      ray.setFromCamera(m, camera);
      handlePointerAction(ray.ray.origin, ray.ray.direction);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      if (renderer.xr.isPresenting) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      if (!renderer.xr.isPresenting) {
        controls.update();
      }
      const activeRoom = eng.current.room || room;
      activeRoom.patient.update(t);
      if (activeRoom.update) activeRoom.update(0.016);
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      renderer.xr.getSession()?.end();
      controls.dispose();
      eng.current.voice.cancelSpeech();
      eng.current.stethAudio?.stop();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('click', onClick);
      removeEventListener('resize', onResize);
      renderer.dispose();
      pmremGenerator.dispose();
      if (renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line

  const onRef = useRef(onButton); onRef.current = onButton;
  const examineRef = useRef(examinePatient); examineRef.current = examinePatient;
  const interveneRef = useRef(intervenePatient); interveneRef.current = intervenePatient;
  const handleSpeechRef = useRef(handleSpeech); handleSpeechRef.current = handleSpeech;

  // Redraw in-world HUD panel whenever UI state changes
  useEffect(() => {
    const p = eng.current.panel; if (!p) return;
    const u = ui; const listening = u.voice === 'listening';
    const nav = u.page === 'start' || u.page === 'report' ? [] : NAV.map(([id, label], i) => ({
      id, label, x: 12 + i * 142, y: 104, w: 136, h: 52, active: u.page === id, size: 18,
    }));
    const status = STATE_LABEL[u.voice];
    const statusColor = u.voice === 'error' ? '#ff8a80' : u.voice === 'idle' ? '#a5d6a7' : '#ffd54f';
    const base = { status: u.busy ? 'Working…' : status, statusColor, buttons: [...nav], lines: [] };
    if (u.error) base.lines.push({ text: `⚠ ${u.error}`, color: '#ff8a80', size: 22 });

    let c;
    if (u.page === 'start') {
      c = {
        ...base,
        title: 'Bestie Clinical Sim — Virtual Teaching Hospital',
        lines: [
          ...base.lines,
          { text: 'Fictional training scenario. Emergency Room presentation.', size: 26 },
          { text: 'Workflow: Communicate with patient → Examine → Treat/Stabilize → Order tests → Decide & Hand over.', size: 22, color: '#b0bec5' },
          { text: `Current Patient: ${PATIENT_PHENOTYPES[u.phenotype]?.label || 'Standard'}`, size: 22, color: '#80cbc4' },
          { text: 'Controls: Trigger = point & select · Grip (hold) = push-to-talk mic.', size: 20, color: '#80cbc4' },
          { text: 'Formative educational simulation. Not validated for clinical grading.', size: 20, color: '#ffb74d' },
        ],
        buttons: [{ id: 'start', label: u.busy ? 'Entering Consultation Room…' : 'Enter Consultation Room', x: 232, y: 440, w: 560, h: 100, size: 30, disabled: u.busy }],
        caption: u.caption,
      };
    } else if (u.page === 'talk') {
      c = {
        ...base,
        title: 'History-Taking & Dialogue',
        lines: [
          ...base.lines,
          { text: 'Speak into headset mic (hold Grip or tap Talk below), or select a prompt:', size: 22, color: '#b0bec5' },
        ],
        buttons: [
          ...nav,
          { id: 'talk-btn', label: listening ? '■ Stop & Send Speech' : '● Push to Talk (Hold / Tap)', x: 20, y: 220, w: 984, h: 80, size: 28, active: listening },
          ...QUICK.map(([l], i) => ({ id: 'q:' + i, label: l, x: 20 + (i % 2) * 497, y: 320 + Math.floor(i / 2) * 78, w: 487, h: 68, size: 21 })),
        ],
        caption: u.caption,
      };
    } else if (u.page === 'exam') {
      c = {
        ...base,
        title: 'Bedside Examination & Patient Commands',
        lines: [
          ...base.lines,
          { text: u.lastFinding ? `Last finding: ${u.lastFinding}` : 'Stand by bedside, issue clinical commands, or auscultate landmarks:', size: 20, color: '#80deea' },
        ],
        buttons: [
          ...nav,
          // Row 1: Bedside Stance / Positioning (Y: 175)
          { id: 'stance:bedside-right', label: 'Stand: Bedside (R)', x: 20, y: 175, w: 236, h: 44, size: 16, active: u.currentStance === 'bedside-right' },
          { id: 'stance:bedside-left', label: 'Stand: Bedside (L)', x: 266, y: 175, w: 236, h: 44, size: 16, active: u.currentStance === 'bedside-left' },
          { id: 'stance:face-airway', label: 'Stand: Airway/Face', x: 512, y: 175, w: 236, h: 44, size: 16, active: u.currentStance === 'face-airway' },
          { id: 'stance:back-exam', label: 'Stand: Back Exam', x: 758, y: 175, w: 246, h: 44, size: 16, active: u.currentStance === 'back-exam' },

          // Row 2: Clinical Patient Verbal Commands (Y: 228)
          { id: 'cmd:breathe', label: '🫁 Deep Breath', x: 20, y: 228, w: 188, h: 46, size: 17 },
          { id: 'cmd:ah', label: '👄 Say "Ah"', x: 218, y: 228, w: 188, h: 46, size: 17 },
          { id: 'cmd:turn_head', label: '🔄 Turn Head (JVP)', x: 416, y: 228, w: 188, h: 46, size: 16 },
          { id: 'cmd:sit_forward', label: '🪑 Sit Forward', x: 614, y: 228, w: 188, h: 46, size: 17 },
          { id: 'cmd:squeeze', label: '🤝 Squeeze Hands', x: 812, y: 228, w: 192, h: 46, size: 16 },

          // Row 3 & 4: Core Physical Examination Manoeuvres (Y: 284)
          ...VR_EXAMINATIONS.slice(0, 8).map(([id, label], i) => ({
            id: 'exam:' + id,
            label,
            x: 20 + (i % 2) * 497,
            y: 284 + Math.floor(i / 2) * 54,
            w: 487,
            h: 48,
            size: 16,
            disabled: u.busy,
          })),

          // Row 5: Phenotype / Appearance Selection (Y: 510)
          ...Object.values(PATIENT_PHENOTYPES).map((pheno, i) => ({
            id: 'pheno:' + pheno.id,
            label: (u.phenotype === pheno.id ? '✓ ' : '') + pheno.label,
            x: 20 + (i % 2) * 497,
            y: 510 + Math.floor(i / 2) * 44,
            w: 487,
            h: 38,
            size: 15,
            active: u.phenotype === pheno.id,
          })),
        ],
        caption: u.caption,
      };
    } else if (u.page === 'treat') {
      c = {
        ...base,
        title: 'Immediate Treatment & Stabilization',
        lines: [
          ...base.lines,
          { text: 'Select an emergency clinical intervention (changes patient physiology in real time):', size: 22, color: '#b0bec5' },
        ],
        buttons: [
          ...nav,
          ...VR_INTERVENTIONS.map(([id, label], i) => ({
            id: 'treat:' + id,
            label: (id === 'oxygen' && u.oxygenActive ? '✓ ' : '') + label,
            x: 20,
            y: 220 + i * 90,
            w: 984,
            h: 76,
            size: 26,
            active: id === 'oxygen' ? u.oxygenActive : false,
            disabled: u.busy,
          })),
        ],
        caption: u.caption,
      };
    } else if (u.page === 'ehr') {
      const v = u.vitals || {};
      c = {
        ...base,
        title: 'Bedside EHR & SBAR Handover Workstation',
        lines: [
          ...base.lines,
          { text: '• NEWS2 Score: 11 (High Clinical Risk — Trigger Emergency Outreach)', size: 22, color: '#ff8a80' },
          { text: `• Observations: RR ${v.rr || 32}/min, SpO2 ${v.spo2 || 88}%, HR ${v.hr || 124}/min, BP ${v.sbp || 92}/${v.dbp || 58}`, size: 20 },
          { text: '• Active eMAR Orders: Supplemental O2 mask, IV crystalloid, Blood cultures stat', size: 20, color: '#80cbc4' },
          { text: '• SBAR Handover to Senior Registrar:', size: 20, color: '#ffd54f' },
          { text: `   S (Situation): ${u.sbar.situation || 'Tap Dictate below'}`, size: 18 },
          { text: `   B (Background): ${u.sbar.background || 'Tap Dictate below'}`, size: 18 },
          { text: `   A (Assessment): ${u.sbar.assessment || 'Tap Dictate below'}`, size: 18 },
          { text: `   R (Recommendation): ${u.sbar.recommendation || 'Tap Dictate below'}`, size: 18 },
        ],
        buttons: [
          ...nav,
          ...[
            ['sbar:situation', 'Dictate Situation'],
            ['sbar:background', 'Dictate Background'],
            ['sbar:assessment', 'Dictate Assessment'],
            ['sbar:recommendation', 'Dictate Recommendation'],
          ].map(([k, l], i) => ({
            id: 'dict:' + k,
            label: listening && eng.current.target === k ? '■ Stop' : '● ' + l,
            x: 20 + i * 248,
            y: 560,
            w: 238,
            h: 60,
            size: 16,
            active: listening && eng.current.target === k,
          })),
        ],
        caption: u.caption,
      };
    } else if (u.page === 'tests') {
      c = {
        ...base,
        title: 'Diagnostic Investigations',
        lines: [
          ...base.lines,
          { text: 'Select a clinical indication before requesting an investigation:', size: 22, color: '#b0bec5' },
        ],
        buttons: [
          ...nav,
          { id: 'ind', label: `Indication: ${INDICATIONS[u.indication]} (tap to switch)`, x: 20, y: 190, w: 984, h: 58, size: 22 },
          ...VR_TESTS.map(([id, l], i) => ({
            id: 't:' + id,
            label: l,
            x: 20 + (i % 2) * 497,
            y: 270 + Math.floor(i / 2) * 64,
            w: 487,
            h: 56,
            size: 20,
            disabled: u.busy,
          })),
        ],
        caption: u.caption,
      };
      if (u.lastResult) {
        c.lines.push({ text: `${u.lastResult.name}: ${u.lastResult.result}`, size: 22, color: '#80deea' });
        c.lines.push({ text: u.lastResult.interpretation, size: 20, color: '#b0bec5' });
      }
    } else if (u.page === 'decide') {
      c = {
        ...base,
        title: 'Clinical Reasoning & Management Plan',
        lines: [
          ...base.lines,
          { text: `Differential: ${u.differential.join(', ') || 'None recorded'}`, size: 20 },
          { text: `Final Diagnosis: ${u.diagnosis || 'None recorded'}`, size: 20 },
          { text: `Interpretation: ${u.reasoning || 'None recorded'}`, size: 20 },
        ],
        buttons: [
          ...nav,
          ...[
            ['differential', 'Dictate Differential'],
            ['diagnosis', 'Dictate Diagnosis'],
            ['reasoning', 'Dictate Interpretation'],
          ].map(([k, l], i) => ({
            id: 'dict:' + k,
            label: listening && eng.current.target === k ? '■ Stop' : '● ' + l,
            x: 20 + i * 332,
            y: 250,
            w: 322,
            h: 56,
            size: 20,
            active: listening && eng.current.target === k,
          })),
          ...VR_MANAGEMENT.map((m, i) => ({
            id: 'm:' + i,
            label: (u.management.includes(m) ? '✓ ' : '') + m,
            x: 20 + (i % 2) * 497,
            y: 330 + Math.floor(i / 2) * 56,
            w: 487,
            h: 50,
            size: 18,
            active: u.management.includes(m),
          })),
          { id: 'finish', label: u.busy ? 'Submitting…' : 'Submit & Receive Debrief →', x: 20, y: 650, w: 984, h: 84, size: 28, disabled: u.busy },
        ],
        caption: u.caption,
      };
    } else if (u.page === 'report') {
      const r = u.report || {};
      const simEv = r.simulation_evidence || {};
      c = {
        ...base,
        title: 'Formative Clinical Debrief & Performance',
        lines: [
          ...base.lines,
          { text: `Formative Score: ${r.score}/100 · Unvalidated Educational Demonstration`, color: '#ffd54f', size: 26 },
          { text: `Case Diagnosis: ${r.hidden_case_diagnosis || '—'}`, size: 22 },
          { text: `Patient Status at End: ${simEv.final_status ? simEv.final_status.toUpperCase() : 'Reviewed'}`, size: 20, color: '#80cbc4' },
          ...(r.critical_flags || []).map((f) => ({ text: `⚑ Safety Check: ${f}`, color: '#ff8a80', size: 20 })),
          ...(r.domains || []).slice(0, 4).map((d) => ({
            text: `${d.status === 'evidence observed' ? '✓' : '!'} ${d.domain}: ${d.feedback}`,
            size: 19,
            color: d.status === 'evidence observed' ? '#a5d6a7' : '#ffcc80',
          })),
          { text: 'Review findings and actions with your clinical supervisor.', size: 18, color: '#b0bec5' },
        ],
        buttons: [{ id: 'restart', label: 'Restart Simulation / New Case', x: 262, y: 670, w: 500, h: 72, size: 26 }],
        caption: u.caption,
      };
    }

    c.lineY = u.page === 'tests' ? 520 : u.page === 'decide' ? 170 : 170;
    p.draw(c);
  }, [ui]);

  // Request immersive WebXR session
  const enterVR = async () => {
    try {
      const s = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      await eng.current.renderer.xr.setReferenceSpaceType('local-floor');
      await eng.current.renderer.xr.setSession(s);
    } catch (e) {
      patch({ error: 'Could not start VR session: ' + e.message });
    }
  };

  return (
    <div style={{ font: '15px system-ui', color: '#eceff1', background: '#0a1017', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', background: '#090d16', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '18px' }}>🏥</span>
            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.05em', color: '#f8fafc' }}>
              BESTIE CLINICAL SIM <span style={{ color: '#38bdf8', fontWeight: 600 }}>· VIRTUAL TEACHING HOSPITAL</span>
            </span>
          </div>
          {/* Multi-Department Switcher */}
          <div style={{ display: 'flex', gap: 4, background: '#0f172a', padding: '3px', borderRadius: 6, border: '1px solid #334155' }}>
            {Object.values(DEPARTMENTS).map((d) => (
              <button
                key={d.id}
                onClick={() => switchDepartment(d.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: ui.department === d.id ? d.badgeColor : 'transparent',
                  color: ui.department === d.id ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{d.icon}</span>
                <span>{d.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '12px' }}>
          <span style={{ background: DEPARTMENTS[ui.department]?.badgeColor || '#dc2626', color: '#fff', padding: '3px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.03em' }}>
            {DEPARTMENTS[ui.department]?.badge || 'RESUS · HIGH ACUITY'}
          </span>
          <button
            onClick={() => {
              const next = !ui.telemetrySound;
              patch({ telemetrySound: next });
              if (next) {
                const hr = parseInt(ui.vitals?.hr || '124', 10);
                const spo2 = parseInt(ui.vitals?.spo2 || '88', 10);
                eng.current.stethAudio?.startTelemetryTone(hr, spo2);
              } else {
                eng.current.stethAudio?.stopTelemetryTone();
              }
            }}
            style={{
              background: ui.telemetrySound ? 'rgba(34, 197, 94, 0.2)' : '#1e293b',
              color: ui.telemetrySound ? '#4ade80' : '#94a3b8',
              border: ui.telemetrySound ? '1px solid #22c55e' : '1px solid #475569',
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
            title="Toggle bedside monitor ECG pulse tone"
          >
            {ui.telemetrySound ? '🔊 Telemetry Pulse Tone: ON' : '🔈 Telemetry Pulse Tone: MUTE'}
          </button>
          <span style={{ background: '#1e293b', color: '#94a3b8', padding: '3px 8px', borderRadius: 4, border: '1px solid #334155' }}>
            🖱️ Drag to rotate · Scroll to zoom
          </span>
          <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            {xr.checked ? (xr.vr ? 'Meta Quest WebXR Ready' : 'Desktop Browser 3D') : 'Checking WebXR…'}
          </span>
        </div>
      </header>

      <div ref={mountRef} data-testid="vr-canvas" style={{ flex: 1, minHeight: 400 }} />

      <section style={{ padding: '10px 14px', background: '#0f172a', display: 'grid', gap: 6, borderTop: '1px solid #1e293b' }} aria-live="polite">
        {/* Status Line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: '14px' }}>
          <div>
            <b>Sim Status:</b> <span data-testid="vr-status" style={{ color: '#67e8f9' }}>{STATE_LABEL[ui.voice]}</span> · <b>Time:</b> T+{Math.floor(ui.clockMin)}m · <b>Patient:</b> <span style={{ color: ui.statusLabel.toLowerCase().includes('improv') ? '#4ade80' : '#f87171', fontWeight: 700 }}>{ui.statusLabel.toUpperCase()}</span>
          </div>
          <div style={{ color: '#cbd5e1' }} data-testid="vr-caption">
            {ui.caption}
          </div>
        </div>

        {/* Sensory, Touch & Vital Assessment Telemetry Bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: '#1e293b', padding: '6px 10px', borderRadius: 6, fontSize: '13px', border: '1px solid #334155' }}>
          <span>🌡️ <b>Tactile Temp:</b> 39.1 °C (Pyrexia / Hot to touch)</span>
          <span>💧 <b>Skin Moisture:</b> Diaphoretic (Cold Sweats)</span>
          <span>🫀 <b>Radial Pulse:</b> {ui.vitals?.hr || 124} bpm (Bounding, Regular)</span>
          <span>🫁 <b>Work of Breathing:</b> {ui.vitals?.rr || 32}/min (Accessory Muscles Active)</span>
          <span>🖐️ <b>Capillary Refill:</b> &lt; 2.0s (Normal Perfusion)</span>
        </div>

        {ui.error && (
          <div role="alert" style={{ color: '#ff8a80', fontSize: '14px' }}>
            {ui.error} <button onClick={() => eng.current.retry?.()}>Retry</button>
          </div>
        )}

        {/* Clinical Examination Stance Control Row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>📍 Examination Stance:</span>
          <button
            onClick={() => setCameraStance('bedside-right')}
            style={{ padding: '4px 10px', background: ui.currentStance === 'bedside-right' ? '#0891b2' : '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
          >
            Bedside (Right) — OSCE Standard
          </button>
          <button
            onClick={() => setCameraStance('bedside-left')}
            style={{ padding: '4px 10px', background: ui.currentStance === 'bedside-left' ? '#0891b2' : '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
          >
            Bedside (Left)
          </button>
          <button
            onClick={() => setCameraStance('face-airway')}
            style={{ padding: '4px 10px', background: ui.currentStance === 'face-airway' ? '#0891b2' : '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
          >
            Airway & Face Up-Close
          </button>
          <button
            onClick={() => setCameraStance('foot-of-bed')}
            style={{ padding: '4px 10px', background: ui.currentStance === 'foot-of-bed' ? '#0891b2' : '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
          >
            Foot of Bed (Inspection)
          </button>
          <button
            onClick={() => setCameraStance('back-exam')}
            style={{ padding: '4px 10px', background: ui.currentStance === 'back-exam' ? '#0891b2' : '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
          >
            Back Auscultation Stance
          </button>
        </div>

        {/* Pathology Realism Switcher */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4, paddingBottom: 6, borderBottom: '1px solid #334155' }}>
          <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 700 }}>🚨 Clinical Presentation:</span>
          <button onClick={() => setPathology('respiratory')} style={{ padding: '3px 8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}>
            🫁 Severe Pneumonia / Sepsis
          </button>
          <button onClick={() => setPathology('trauma')} style={{ padding: '3px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}>
            💥 Road Trauma / Hemorrhage
          </button>
          <button onClick={() => setPathology('burn')} style={{ padding: '3px 8px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}>
            🔥 Thermal Burns / Inhalation
          </button>
          <button onClick={() => setPathology('malaria')} style={{ padding: '3px 8px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}>
            🦟 Malaria Febrile Rigors
          </button>
          <button onClick={() => setPathology('vomit')} style={{ padding: '3px 8px', background: '#65a30d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}>
            🤮 Bilious Emesis
          </button>
        </div>

        {/* Advanced Clinical Equipment & Diagnostic Tools (Phases 3 & 4) */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4, paddingBottom: 6, borderBottom: '1px solid #334155' }}>
          <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 700 }}>🔬 Diagnostic Instruments:</span>
          <button onClick={() => examinePatient('tool:pacs')} style={{ padding: '3px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Barco 5MP Dual-Screen PACS Workstation">
            🩻 PACS X-Ray & CT
          </button>
          <button onClick={() => examinePatient('tool:ultrasound')} style={{ padding: '3px 8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Bedside Mobile eFAST Ultrasound Scanner">
            📡 eFAST Ultrasound
          </button>
          <button onClick={() => examinePatient('tool:ctg')} style={{ padding: '3px 8px', background: '#db2777', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Cardiotocography Maternal-Fetal Telemetry">
            🤰 CTG Fetal Monitor
          </button>
          <button onClick={() => examinePatient('tool:wall_diagnostic')} style={{ padding: '3px 8px', background: '#475569', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Welch Allyn Otoscope & Ophthalmoscope">
            👁️ Wall Diagnostic Set
          </button>
          <button onClick={() => examinePatient('tool:mayo_stand')} style={{ padding: '3px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Emergency Needle Decompression & Chest Drainage">
            💉 Mayo Thoracostomy Kit
          </button>
          <button onClick={() => examinePatient('tool:infant_warmer')} style={{ padding: '3px 8px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Infant Radiant Resuscitation Warmer">
            👶 Neonatal Warmer
          </button>
        </div>

        {/* Quick Bedside Physical Examination Hotspots */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4, paddingBottom: 6, borderBottom: '1px solid #334155' }}>
          <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700 }}>🩺 Physical Exam Hotspots:</span>
          <button onClick={() => examinePatient('palpate:radial')} style={{ padding: '3px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Radial Artery (Wrist) Pulse">
            💓 Radial Pulse (Wrist)
          </button>
          <button onClick={() => examinePatient('palpate:temperature')} style={{ padding: '3px 8px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Tactile Core Temperature & Diaphoresis">
            🌡️ Forehead Temp (39.1°C)
          </button>
          <button onClick={() => examinePatient('palpate:pupils')} style={{ padding: '3px 8px', background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }} title="Penlight Pupillary Light Reflex">
            🔦 Penlight Pupils
          </button>
          <button onClick={() => examinePatient('test:crt')} style={{ padding: '3px 8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Capillary Refill Test">
            🖐️ Capillary Refill
          </button>
          <button onClick={() => examinePatient('palpate:edema')} style={{ padding: '3px 8px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Pre-tibial pitting edema">
            🦵 Ankle Edema (2+)
          </button>
          <button onClick={() => examinePatient('palpate:trachea')} style={{ padding: '3px 8px', background: '#475569', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Suprasternal Notch Tracheal Palpation">
            📍 Trachea (Midline)
          </button>
          <button onClick={() => examinePatient('auscultate:aortic')} style={{ padding: '3px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="2nd Right Intercostal Space">
            ❤️ Aortic (2nd R ICS)
          </button>
          <button onClick={() => examinePatient('auscultate:mitral')} style={{ padding: '3px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="5th Left Intercostal Space MCL">
            ❤️ Mitral Apex (5th L ICS)
          </button>
          <button onClick={() => examinePatient('auscultate:right_lower')} style={{ padding: '3px 8px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Coarse Inspiratory Crackles in Pneumonia">
            🫁 RLL Base (Crackles)
          </button>
          <button onClick={() => examinePatient('auscultate:left_lower')} style={{ padding: '3px 8px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }} title="Vesicular Breath Sounds">
            🫁 LLL Base (Normal)
          </button>
        </div>

        {/* Patient Physical Compliance Command Row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>🗣️ Patient Commands:</span>
          <button
            onClick={() => commandPatient('breathe')}
            disabled={ui.busy || ui.page === 'start'}
            style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
            title="Chest visibly expands, deep inhalation audio plays"
          >
            🫁 Take a Deep Breath
          </button>
          <button
            onClick={() => commandPatient('ah')}
            disabled={ui.busy || ui.page === 'start'}
            style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
            title="Jaw articulates open, tongue depresses, mouth interior visible"
          >
            👄 Say "Ah" (Inspect Pharynx)
          </button>
          <button
            onClick={() => commandPatient('turn_head')}
            disabled={ui.busy || ui.page === 'start'}
            style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
            title="Head turns 45° left to inspect right Jugular Venous Pressure"
          >
            🔄 Turn Head Left (JVP)
          </button>
          <button
            onClick={() => commandPatient('sit_forward')}
            disabled={ui.busy || ui.page === 'start'}
            style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
            title="Patient leans forward to expose posterior lung fields for auscultation"
          >
            🪑 Sit Forward (Back Exam)
          </button>
          <button
            onClick={() => commandPatient('lie_back')}
            disabled={ui.busy || ui.page === 'start'}
            style={{ padding: '4px 10px', background: '#475569', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
          >
            🛏️ Lie Back (Rest)
          </button>
          <button
            onClick={() => commandPatient('squeeze')}
            disabled={ui.busy || ui.page === 'start'}
            style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
            title="Neurological bilateral grip strength assessment"
          >
            🤝 Squeeze My Fingers
          </button>
          <button
            onClick={() => commandPatient('crt')}
            disabled={ui.busy || ui.page === 'start'}
            style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' }}
            title="Fingernail blanches white and refills pink"
          >
            🖐️ Capillary Refill Test
          </button>
        </div>

        {/* Main Controls Row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
          <button
            onClick={enterVR}
            disabled={!xr.vr || ui.inVR}
            style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
          >
            {xr.checked ? (xr.vr ? 'Enter Immersive VR' : 'VR Not Detected on Device') : 'Checking WebXR…'}
          </button>
          <button
            onClick={startEncounter}
            disabled={ui.busy || ui.page !== 'start'}
            style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
          >
            Enter Room / Start Encounter
          </button>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Appearance:</span>
            <select
              aria-label="Patient Appearance"
              value={ui.phenotype}
              onChange={(e) => changePhenotype(e.target.value)}
              style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #475569', padding: '4px 8px', borderRadius: 4 }}
            >
              {Object.values(PATIENT_PHENOTYPES).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <input
            aria-label="Type to the patient"
            placeholder="Talk or command: 'take a deep breath', 'say ah', 'turn head', 'when did it start?'"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitText()}
            style={{ flex: 1, minWidth: 260, padding: '6px 10px', borderRadius: 4, border: '1px solid #475569', background: '#1e293b', color: '#f8fafc' }}
          />
          <button
            onClick={submitText}
            disabled={ui.busy || ui.page === 'start' || !text.trim()}
            style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Send
          </button>
          <a href="/" style={{ color: '#80deea', alignSelf: 'center', fontSize: '13px' }}>
            Desktop Version
          </a>
        </div>
      </section>
    </div>
  );
}
