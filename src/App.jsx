import React, { useEffect, useMemo, useState } from 'react';

const API = '/api';

// Production Accredited Clinical Scenario Catalog
const catalog = [
  {
    id: 'respiratory-severe-001',
    title: 'Severe Community-Acquired Pneumonia with Sepsis',
    specialty: 'Emergency Medicine / Acute Pulmonology',
    department: 'Resuscitation & Acute Care',
    acuity: 'RESUS · HIGH ACUITY (NEWS2: 11)',
    acuityClass: 'acuity-resus',
    patient: 'Adult man (52yo)',
    phenotype: 'black-male',
    phenotypeLabel: 'Adult Black Man (Fitzpatrick V-VI)',
    initials: 'JM',
    patientName: 'John Miller',
    description: 'Acute severe dyspnoea, high fever (39.1°C), tachypnoea (RR 32), and right lower lobe consolidation with coarse inspiratory crackles.',
    competencies: ['ABCDE Protocol', 'Blood Gas Analysis', 'SBAR Escalation'],
    durationMin: '15–20 min',
    iconType: 'pulmonology',
  },
  {
    id: 'malaria-001',
    title: 'Severe Plasmodium Falciparum Malaria with Impaired Consciousness',
    specialty: 'Internal Medicine / Infectious Diseases',
    department: 'Tropical Medicine & High Dependency',
    acuity: 'HIGH RISK (NEWS2: 8)',
    acuityClass: 'acuity-urgent',
    patient: 'Adult woman (28yo)',
    phenotype: 'black-female',
    phenotypeLabel: 'Adult Black Woman (Fitzpatrick V)',
    initials: 'AM',
    patientName: 'Amina Mansoor',
    description: 'High remittent fever, severe headache, prostration, hemolytic anaemia, and high peripheral parasitemia requiring parenteral artesunate.',
    competencies: ['Malaria RDT / Microscopy', 'Hydration Management', 'Antimalarial Dosing'],
    durationMin: '15 min',
    iconType: 'infectious',
  },
  {
    id: 'burn-001',
    title: 'Major Thermal Flame Burns with Potential Inhalation Injury',
    specialty: 'Emergency Surgery / Trauma & Burns',
    department: 'Emergency Resuscitation Bay',
    acuity: 'CRITICAL (NEWS2: 10)',
    acuityClass: 'acuity-resus',
    patient: 'Adult man (34yo)',
    phenotype: 'white-male',
    phenotypeLabel: 'Adult White Man (Fitzpatrick II-III)',
    initials: 'TB',
    patientName: 'Thomas Bennett',
    description: '25% TBSA partial & full thickness burns, perioral soot deposits, hoarseness, stridor, and acute risk of airway compromise.',
    competencies: ['Airway Assessment', 'Parkland Fluid Formula', 'Analgesia Protocol'],
    durationMin: '20 min',
    iconType: 'burns',
  },
  {
    id: 'trauma-001',
    title: 'High-Velocity Road Traffic Collision with Hemorrhagic Shock',
    specialty: 'Trauma Surgery / Emergency Medicine',
    department: 'Level-1 Major Trauma Bay',
    acuity: 'RESUS CODE RED (NEWS2: 12)',
    acuityClass: 'acuity-resus',
    patient: 'Adult woman (42yo)',
    phenotype: 'white-female',
    phenotypeLabel: 'Adult White Woman (Fitzpatrick II)',
    initials: 'CW',
    patientName: 'Claire Wright',
    description: 'Blunt chest contusion, pelvic instability, hypotension (BP 84/50), tachycardia, and acute internal hemorrhage.',
    competencies: ['eFAST Ultrasound', 'Massive Transfusion Protocol', 'Pelvic Binder'],
    durationMin: '20 min',
    iconType: 'trauma',
  },
  {
    id: 'pregnancy-001',
    title: 'Severe Preeclampsia with Impending Eclampsia at 32 Weeks',
    specialty: 'Obstetrics & Maternal Medicine',
    department: 'Obstetric High Dependency Unit',
    acuity: 'URGENT MATERNAL (HIGH)',
    acuityClass: 'acuity-urgent',
    patient: 'Pregnant woman (29yo, 32w GA)',
    phenotype: 'black-female',
    phenotypeLabel: 'Adult Black Woman (Fitzpatrick V)',
    initials: 'SN',
    patientName: 'Sarah Ndagije',
    description: 'Severe occipital headache, scotomata, blood pressure 178/112 mmHg, hyperreflexia with ankle clonus, and 3+ proteinuria.',
    competencies: ['Magnesium Sulphate Protocol', 'Antihypertensive Titration', 'Fetal Monitoring'],
    durationMin: '15–20 min',
    iconType: 'obstetrics',
  },
  {
    id: 'pediatric-001',
    title: 'Pediatric Severe Bronchiolitis with Respiratory Distress',
    specialty: 'Pediatrics & Pediatric Emergency',
    department: 'Pediatric Acute Assessment Unit',
    acuity: 'URGENT PEWS: 7',
    acuityClass: 'acuity-urgent',
    patient: 'Toddler (18 months) + Parent',
    phenotype: 'black-female',
    phenotypeLabel: 'Child & Caregiver',
    initials: 'LK',
    patientName: 'Leo Kamau',
    description: 'Subcostal recessions, tracheal tug, feeding < 50%, tachypnoea (RR 58), hypoxia (SpO2 89%), and bibasal crackles.',
    competencies: ['Pediatric Assessment Triangle', 'High-Flow Nasal Cannula', 'Hydration Support'],
    durationMin: '15 min',
    iconType: 'pediatrics',
  },
];

const tests = [
  ['fbc', 'Full blood count (FBC)'],
  ['malaria-rdt', 'Malaria rapid diagnostic test (RDT)'],
  ['malaria-microscopy', 'Malaria thick & thin blood film'],
  ['glucose', 'Blood glucose'],
  ['urinalysis', 'Urinalysis and microscopy'],
  ['urine-protein', 'Urine protein assessment'],
  ['renal-electrolytes', 'Renal function & electrolytes (U&E)'],
  ['lft-renal', 'Liver and renal function panel'],
  ['blood-culture', 'Blood cultures x2 (prior to antibiotics)'],
  ['chest-xray', 'Chest X-ray (PA & Lateral)'],
  ['ct-chest', 'CT Chest with contrast'],
  ['ct-head', 'CT Head without contrast'],
  ['blood-gas', 'Arterial Blood Gas (ABG) & Lactate'],
  ['e-fast', 'eFAST bedside trauma ultrasound'],
  ['ct-trauma', 'Whole-body CT trauma series'],
  ['obstetric-ultrasound', 'Obstetric ultrasound & fetal biometry'],
  ['pulse-ox', 'Continuous pulse oximetry'],
];

const managementOptions = [
  'ABCDE / systematic initial assessment',
  'Urgent senior help / escalation (Registrar or Consultant)',
  'High-flow oxygen (15 L/min non-rebreather mask) & telemetry',
  'Focused clinical examination (auscultation, palpation)',
  'Empirical IV antimicrobial therapy within 1 hour',
  'IV crystalloid fluid resuscitation (500 mL bolus over 15 min)',
  'Check allergies, pregnancy status, and renal dosage adjustment',
  'Repeat serial observations (NEWS2) and assess physiological response',
  'Structured SBAR handover and critical care outreach referral',
  'Explain clinical findings and treatment plan to patient / family',
];

// Clean Clinical Department Icon Renderer
function DepartmentIcon({ type }) {
  if (type === 'pulmonology') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v8" />
        <path d="M7 6l5 4 5-4" />
        <path d="M6 14a4 4 0 0 1 6-3.5 4 4 0 0 1 6 3.5c0 4-3 7-6 7s-6-3-6-7z" />
      </svg>
    );
  }
  if (type === 'infectious') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="6" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        <path d="m4.9 4.9 2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
      </svg>
    );
  }
  if (type === 'burns') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    );
  }
  if (type === 'trauma') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5a2 2 0 0 0-2 2v8h2" />
        <circle cx="7" cy="16.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
        <path d="M8 7h3v3H8z" />
      </svg>
    );
  }
  if (type === 'obstetrics') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

async function request(path, opts = {}, educator = false) {
  const pilot = sessionStorage.getItem('bcsPilotToken') || '';
  const et = sessionStorage.getItem('bcsEducatorToken') || '';
  const st = sessionStorage.getItem('bcsSessionToken') || '';
  const access = sessionStorage.getItem('bcsAccessToken') || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : educator ? { 'X-Educator-Token': et } : { 'X-Pilot-Token': pilot }),
    ...(st ? { 'X-Session-Token': st } : {}),
    ...(opts.headers || {}),
  };
  const r = await fetch(API + path, { ...opts, headers });
  if (!r.ok) {
    let m = `Request failed (${r.status})`;
    try {
      m = (await r.json()).detail || m;
    } catch {}
    throw new Error(m);
  }
  return r.json();
}

export default function App() {
  const [view, setView] = useState('home');
  const [cases, setCases] = useState(catalog);
  const [caseId, setCaseId] = useState('respiratory-severe-001');
  const [mode, setMode] = useState('practice');
  const [name, setName] = useState('Dr. Ephrem Dushime');
  const [examCode, setExamCode] = useState('');
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [vitals, setVitals] = useState(null);
  const [appearance, setAppearance] = useState('');
  const [investigation, setInvestigation] = useState('blood-gas');
  const [indication, setIndication] = useState('');
  const [results, setResults] = useState([]);
  const [differential, setDifferential] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [management, setManagement] = useState([]);
  const [reflection, setReflection] = useState('');
  const [report, setReport] = useState(null);
  const [speed, setSpeed] = useState(0.85);
  const [voice, setVoice] = useState(true);
  const [xr, setXr] = useState({ checked: false, vr: false, ar: false });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Educator state
  const [educatorToken, setEducatorToken] = useState(sessionStorage.getItem('bcsEducatorToken') || '');
  const [pilotToken, setPilotToken] = useState(sessionStorage.getItem('bcsPilotToken') || '');
  const [examTitle, setExamTitle] = useState('Clinical Reasoning OSCE Station');
  const [examDuration, setExamDuration] = useState(20);
  const [passMark, setPassMark] = useState(70);
  const [examList, setExamList] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [createdExam, setCreatedExam] = useState(null);
  const [selectedCaseForExam, setSelectedCaseForExam] = useState('respiratory-severe-001');
  const [timeLeft, setTimeLeft] = useState(null);
  const [hintVisible, setHintVisible] = useState(false);

  // Generator & Procedural Scenario Compiler
  const [genArch, setGenArch] = useState('sepsis');
  const [genPheno, setGenPheno] = useState('black-male');
  const [genAge, setGenAge] = useState(52);
  const [genComorb, setGenComorb] = useState(['diabetes']);
  const [genSetting, setGenSetting] = useState('emergency_department');
  const [genAutoApprove, setGenAutoApprove] = useState(true);
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [archList, setArchList] = useState([]);

  // Account & Auth
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('bcsAccount') || 'null');
    } catch {
      return null;
    }
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [productionMode, setProductionMode] = useState(false);
  const [authModeKnown, setAuthModeKnown] = useState(false);

  const signIn = async (emailToUse, passwordToUse) => {
    const e = emailToUse || accountEmail;
    const p = passwordToUse || accountPassword;
    setAuthBusy(true);
    setErr('');
    try {
      const response = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password: p }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `Sign-in failed (${response.status})`);
      sessionStorage.setItem('bcsAccessToken', data.access_token);
      sessionStorage.setItem('bcsAccount', JSON.stringify(data.user));
      setAccount(data.user);
      setName(data.user.display_name || name);
      setAccountPassword('');
      setAuthModalOpen(false);
    } catch (errObj) {
      setErr(errObj.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    const token = sessionStorage.getItem('bcsAccessToken') || '';
    try {
      if (token) await fetch(API + '/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    sessionStorage.removeItem('bcsAccessToken');
    sessionStorage.removeItem('bcsAccount');
    sessionStorage.removeItem('bcsSessionToken');
    setAccount(null);
    setAccountPassword('');
  };

  const changePassword = async () => {
    const token = sessionStorage.getItem('bcsAccessToken') || '';
    if (!token) return;
    setPasswordBusy(true);
    setErr('');
    try {
      const response = await fetch(API + '/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `Password change failed (${response.status})`);
      sessionStorage.removeItem('bcsAccessToken');
      sessionStorage.removeItem('bcsAccount');
      setAccount(null);
      setCurrentPassword('');
      setNewPassword('');
      setErr('Password changed successfully. Please sign in with your new credentials.');
      setAuthModalOpen(false);
    } catch (errObj) {
      setErr(errObj.message);
    } finally {
      setPasswordBusy(false);
    }
  };

  const currentCase = useMemo(() => {
    if (session?.mode === 'exam') {
      return {
        title: 'Controlled OSCE Examination Station',
        specialty: 'Clinical Assessment',
        department: 'Clinical Skills Examination Hall',
        appearance: session.patient?.appearance || 'Fictional simulated patient',
        age: session.patient?.age,
        sex: session.patient?.sex,
        initials: 'PT',
        iconType: 'pulmonology',
      };
    }
    return cases.find((c) => c.id === session?.case_id) || cases.find((c) => c.id === caseId) || catalog[0];
  }, [cases, session, caseId]);

  useEffect(() => {
    fetch(API + '/health')
      .then((r) => r.json())
      .then((d) => {
        const prod = d.environment === 'production';
        setProductionMode(prod);
        setAuthModeKnown(true);
      })
      .catch(() => {});

    request('/cases')
      .then((d) => {
        if (d.cases?.length) {
          const merged = d.cases.map((c) => {
            const found = catalog.find((x) => x.id === c.id);
            return {
              ...c,
              department: found?.department || 'Acute Medicine',
              acuity: found?.acuity || 'URGENT (NEWS2: 6)',
              acuityClass: found?.acuityClass || 'acuity-urgent',
              initials: found?.initials || c.id.slice(0, 2).toUpperCase(),
              phenotypeLabel: found?.phenotypeLabel || 'Simulated Patient',
              competencies: found?.competencies || ['ABCDE Assessment', 'Diagnostics', 'Management'],
              iconType: found?.iconType || 'pulmonology',
              description: c.appearance || found?.description || '',
            };
          });
          setCases(merged);
        }
      })
      .catch(() => {});

    if (navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
      Promise.all([
        navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
        navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
      ]).then(([vr, ar]) => setXr({ checked: true, vr: !!vr, ar: !!ar }));
    } else {
      setXr({ checked: true, vr: false, ar: false });
    }
  }, []);

  useEffect(() => {
    if (!session || session.mode !== 'exam' || !session.examination?.duration) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(Number(session.examination.duration) * 60);
    const timer = setInterval(() => setTimeLeft((v) => (v === null ? null : Math.max(0, v - 1))), 1000);
    return () => clearInterval(timer);
  }, [session?.session_id]);

  const resetEncounter = () => {
    sessionStorage.removeItem('bcsSessionToken');
    setSession(null);
    setTimeLeft(null);
    setHintVisible(false);
    setMessages([]);
    setResults([]);
    setReport(null);
    setDifferential('');
    setDiagnosis('');
    setManagement([]);
    setReflection('');
    setVitals(null);
    setAppearance('');
    setIndication('');
    setErr('');
  };

  const speak = (textToSpeak) => {
    if (voice && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.lang = 'en-US';
      u.rate = Number(speed);
      window.speechSynthesis.speak(u);
    }
  };

  const start = async (nextMode = mode) => {
    setBusy(true);
    setErr('');
    resetEncounter();
    try {
      const d = await request('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          learner: name,
          case_id: caseId,
          mode: nextMode,
          exam_code: nextMode === 'exam' ? examCode.trim().toUpperCase() : null,
        }),
      });
      sessionStorage.setItem('bcsSessionToken', d.session_token || '');
      setSession(d);
      setVitals(d.patient?.vitals || null);
      setAppearance(d.patient?.appearance || '');
      setMessages([{ role: 'patient', content: d.opening }]);
      setMode(nextMode);
      setView('encounter');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!draft.trim() || !session || busy) return;
    if (session.mode === 'exam' && timeLeft === 0) {
      setErr('Examination time has expired. Submit your clinical plan.');
      return;
    }
    const userText = draft.trim();
    setDraft('');
    setMessages((p) => [...p, { role: 'student', content: userText }]);
    setBusy(true);
    setErr('');
    try {
      const d = await request(`/sessions/${session.session_id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: userText }),
      });
      setMessages((p) => [...p, { role: 'patient', content: d.reply }]);
      speak(d.reply);
    } catch (e) {
      setErr(e.message);
      setDraft(userText);
    } finally {
      setBusy(false);
    }
  };

  const orderTest = async () => {
    if (session?.mode === 'exam' && timeLeft === 0) {
      setErr('Examination time has expired.');
      return;
    }
    if (!session || !indication.trim()) {
      setErr('A specific clinical indication is required before requesting this investigation.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const d = await request(`/sessions/${session.session_id}/investigations`, {
        method: 'POST',
        body: JSON.stringify({ test_id: investigation, indication }),
      });
      setResults((p) => [...p, d]);
      setIndication('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleManagement = (item) =>
    setManagement((p) => (p.includes(item) ? p.filter((x) => x !== item) : [...p, item]));

  const finish = async () => {
    if (!session) return;
    setBusy(true);
    setErr('');
    try {
      const d = await request(`/sessions/${session.session_id}/finish`, {
        method: 'POST',
        body: JSON.stringify({
          differential: differential
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
          final_diagnosis: diagnosis,
          management,
          reflection,
        }),
      });
      setReport(d);
      setView('report');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const loadDashboard = async () => {
    setErr('');
    try {
      const [d, a] = await Promise.all([
        request('/educator/dashboard', {}, true),
        request('/educator/archetypes', {}, true).catch(() => ({ archetypes: [] })),
      ]);
      setSessions(d.sessions || []);
      setExamList(d.exams || []);
      if (a.archetypes?.length) setArchList(a.archetypes);
      setView('educator');
    } catch (e) {
      setErr(e.message);
      setView('educator');
    }
  };

  const toggleComorbidity = (c) =>
    setGenComorb((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const runProceduralCompiler = async () => {
    setGenBusy(true);
    setErr('');
    setGenResult(null);
    try {
      const payload = {
        archetype_id: genArch,
        phenotype: genPheno,
        age: Number(genAge) || null,
        comorbidities: genComorb,
        setting: genSetting,
        auto_approve: genAutoApprove,
      };
      const res = await request('/educator/generate-scenario', { method: 'POST', body: JSON.stringify(payload) }, true);
      setGenResult(res);
      const updated = await request('/cases');
      if (updated.cases?.length) setCases(updated.cases);
    } catch (e) {
      setErr(e.message);
    } finally {
      setGenBusy(false);
    }
  };

  const createExam = async () => {
    setErr('');
    try {
      const d = await request(
        '/educator/exams',
        {
          method: 'POST',
          body: JSON.stringify({
            title: examTitle,
            case_id: selectedCaseForExam,
            duration: Number(examDuration),
            pass_mark: Number(passMark),
            creator: name,
          }),
        },
        true
      );
      setCreatedExam(d);
      await loadDashboard();
    } catch (e) {
      setErr(e.message);
    }
  };

  const closeExam = async (id) => {
    try {
      await request(`/educator/exams/${id}/close`, { method: 'POST', body: '{}' }, true);
      await loadDashboard();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="app-shell">
      {/* Hospital Top Navigation Header */}
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} aria-label="Go to Home">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4zm-1 6h2v3h3v2h-3v3h-2v-3H8v-2h3V8z" />
            </svg>
          </div>
          <div className="brand-text">
            <b>BESTIE CLINICAL SIM</b>
            <small>Virtual Teaching Hospital · Competency Assessment Platform</small>
          </div>
        </button>

        <div className="top-actions">
          <div className="environment-badge">
            <span className="pulse-dot" />
            <span>GMC & ACGME CLINICAL OSCE ALIGNED</span>
          </div>

          <a href="/?vr=1" className="vr-launch-btn">
            <span>🥽</span>
            <span>3D Teaching Hospital (WebXR VR)</span>
          </a>

          <button className="user-profile-btn" onClick={() => setAuthModalOpen(true)}>
            <div className="avatar-badge">{account ? account.display_name.slice(0, 2).toUpperCase() : 'ED'}</div>
            <span>{account ? account.display_name : name}</span>
            <small style={{ color: '#047857', fontWeight: 700 }}>● Active</small>
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Left Navigation Sidebar */}
        <aside className="sidebar">
          <div className="side-caption">TEACHING HOSPITAL WARDS</div>
          {[
            ['home', '🏥', 'Ward Directory (Cases)'],
            ['encounter', '🩺', 'Active Consultation Room'],
            ['exam', '📋', 'OSCE & Exam Stations'],
            ['educator', '🎓', 'Faculty & Curriculum Studio'],
            ['xr', '🥽', 'Immersive 3D / VR Ward'],
            ['sources', '🛡️', 'Clinical Evidence & AI'],
          ].map(([v, ico, label]) => (
            <button
              key={v}
              className={`nav-item ${view === v ? 'selected' : ''}`}
              onClick={() => (v === 'educator' ? loadDashboard() : setView(v))}
            >
              <span className="nav-icon">{ico}</span>
              <span>{label}</span>
              {v === 'encounter' && session && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: 10, fontWeight: 800 }}>
                  LIVE
                </span>
              )}
            </button>
          ))}

          <div className="side-divider" />

          {/* Clinician Profile Summary Card */}
          <div className="clinician-card">
            <div className="clinician-card-header">
              <div className="avatar-badge" style={{ background: '#0284c7' }}>
                {name ? name.slice(0, 2).toUpperCase() : 'ED'}
              </div>
              <div>
                <b>{name}</b>
                <small>St. Mary's Health Sciences</small>
              </div>
            </div>
            <button className="secondary card-action" onClick={() => setAuthModalOpen(true)}>
              {account ? 'Account & Roles' : 'Sign in / Switch User'}
            </button>
          </div>

          <div className="side-governance-notice">
            <b>Clinical Simulation Standard</b>
            <p>Accredited medical cases. Formative clinical decision-making & objective OSCE competency scoring.</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {err && (
            <div className="alert" role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px 18px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><b>Clinical Alert:</b> {err}</div>
              <button onClick={() => setErr('')} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#b91c1c' }}>×</button>
            </div>
          )}

          {/* VIEW: HOME (CASE DIRECTORY) */}
          {view === 'home' && (
            <>
              <div className="hero">
                <div>
                  <div className="eyebrow">ACADEMIC TEACHING HOSPITAL SIMULATION SUITE</div>
                  <h1>Realistic Clinical Practice.<br />Measurable Competence.</h1>
                  <p>
                    Enter accredited hospital wards to practise natural doctor-patient communication, perform physical examinations, order evidence-based investigations, and make life-critical decisions evaluated against transparent GMC and ACGME competency rubrics.
                  </p>
                  <div className="hero-actions">
                    <button className="primary" onClick={() => { setMode('practice'); setView('practice-setup'); }}>
                      Start Clinical Practice <span>→</span>
                    </button>
                    <button className="secondary" onClick={() => setView('exam')}>
                      Join OSCE Examination
                    </button>
                    <a href="/?vr=1" className="secondary" style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}>
                      🥽 Launch in Standalone VR
                    </a>
                  </div>
                </div>

                <div className="hero-visual">
                  <div className="hero-card-mesh">
                    <div className="hero-badge-live">
                      <span className="pulse-dot" />
                      <span>REAL-TIME PHYSIOLOGY & 3D ANATOMY</span>
                    </div>
                    <h3>Virtual Teaching Hospital</h3>
                    <p>Meta Quest WebXR + Web Browser unified clinical simulation</p>
                    <div className="hero-stats-row">
                      <div className="hero-stat-pill">
                        <b>6 Wards</b>
                        <span>Verified Cases</span>
                      </div>
                      <div className="hero-stat-pill">
                        <b>100%</b>
                        <span>Deterministic Labs</span>
                      </div>
                      <div className="hero-stat-pill">
                        <b>OSCE</b>
                        <span>GMC Aligned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-head">
                <div>
                  <div className="eyebrow" style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#475569' }}>
                    ACCREDITED ROTATIONS
                  </div>
                  <h2>Choose a Clinical Scenario</h2>
                  <p>Select a verified clinical encounter to enter the consultation room or launch directly into the 3D VR hospital ward.</p>
                </div>
                <span className="count-chip">{cases.length} Accredited Clinical Cases</span>
              </div>

              {/* Case Grid (No Cartoon Emojis) */}
              <div className="case-grid">
                {cases.map((c) => (
                  <article
                    className={`case-card ${caseId === c.id ? 'chosen' : ''}`}
                    key={c.id}
                    onClick={() => setCaseId(c.id)}
                  >
                    <div className="case-card-header">
                      <div className="case-dept-badge">
                        <span className="case-dept-icon">
                          <DepartmentIcon type={c.iconType || 'pulmonology'} />
                        </span>
                        <span>{c.department || c.specialty}</span>
                      </div>
                      <span className={`case-acuity-tag ${c.acuityClass || 'acuity-urgent'}`}>
                        {c.acuity || 'URGENT'}
                      </span>
                    </div>

                    <h3>{c.title}</h3>
                    <p>{c.description || c.specialty}</p>

                    <div className="case-demographics-row">
                      <span>Patient: <b>{c.patientName || c.patient}</b></span>
                      <span>·</span>
                      <span>{c.phenotypeLabel || 'Simulated Patient'}</span>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      {(c.competencies || ['ABCDE Assessment', 'Diagnostics', 'Management']).map((comp, idx) => (
                        <span key={idx} className="competency-tag">{comp}</span>
                      ))}
                    </div>

                    <div className="case-actions-row">
                      <button
                        className="btn-open-case"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCaseId(c.id);
                          setMode('practice');
                          setView('practice-setup');
                        }}
                      >
                        Enter Consultation Room →
                      </button>
                      <a
                        className="btn-open-vr"
                        href={`/?vr=1&case=${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Open directly in 3D WebXR ward"
                      >
                        🥽 3D VR
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              {/* Feature Grid */}
              <div className="feature-strip">
                <div>
                  <div className="feat-icon">🩺</div>
                  <b>Natural Dialogue & History</b>
                  <small>Hold spoken conversation with virtual patients across diverse phenotypes.</small>
                </div>
                <div>
                  <div className="feat-icon">🫁</div>
                  <b>Auscultation & Stethoscopy</b>
                  <small>True-to-life Littmann acoustic heart sounds (S1/S2) and inspiratory crackles.</small>
                </div>
                <div>
                  <div className="feat-icon">🧪</div>
                  <b>Indication-Driven Testing</b>
                  <small>ABG, blood cultures, imaging, and lab chemistries with clinical validation.</small>
                </div>
                <div>
                  <div className="feat-icon">📋</div>
                  <b>Objective SBAR Debrief</b>
                  <small>Automated scoring against verified guidelines (NICE, Surviving Sepsis, BTS).</small>
                </div>
              </div>
            </>
          )}

          {/* VIEW: PRACTICE SETUP */}
          {view === 'practice-setup' && (
            <div className="setup-wrap" style={{ maxWidth: 780, margin: '0 auto' }}>
              <button className="back-link" onClick={() => setView('home')} style={{ border: 'none', background: 'transparent', color: '#047857', fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 16 }}>
                ← Return to Case Library
              </button>
              <div className="page-title" style={{ marginBottom: 24 }}>
                <div className="eyebrow">SIMULATION PREPARATION</div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, margin: '8px 0' }}>Consultation Room Setup</h1>
                <p style={{ color: 'var(--color-text-subtle)', margin: 0 }}>Configure your patient encounter parameters before entering the virtual ward.</p>
              </div>

              <div className="panel" style={{ padding: 28 }}>
                <div className="patient-stage-card">
                  <div className="patient-badge-initials">{currentCase.initials || 'PT'}</div>
                  <div>
                    <small style={{ color: '#047857', fontWeight: 800 }}>SELECTED CLINICAL SCENARIO</small>
                    <b style={{ fontSize: 18 }}>{currentCase.title}</b>
                    <p>{currentCase.description || currentCase.specialty}</p>
                  </div>
                </div>

                <label className="field-label">Select Patient Case</label>
                <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>

                <div className="two-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div>
                    <label className="field-label">Patient Speech Rate</label>
                    <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                      <option value="0.7">Slow & Deliberate (Dyspnoeic)</option>
                      <option value="0.85">Natural Conversational Pace</option>
                      <option value="1.0">Standard Speed</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Synthesized Audio Output</label>
                    <select value={voice ? 'on' : 'off'} onChange={(e) => setVoice(e.target.value === 'on')}>
                      <option value="on">Audible Patient Speech (Enabled)</option>
                      <option value="off">Mute Audio (Text Only)</option>
                    </select>
                  </div>
                </div>

                <div className="notice" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, margin: '20px 0', fontSize: 13, color: '#065f46' }}>
                  <b>Clinical Encounter Scope:</b> Natural voice dialogue, physical inspection, auscultation, indication-based diagnostics requisition, and structured management plan submission.
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="primary" style={{ flex: 1 }} disabled={busy} onClick={() => start('practice')}>
                    {busy ? 'Opening Ward Session…' : 'Enter Consultation Room →'}
                  </button>
                  <a
                    href={`/?vr=1&case=${caseId}`}
                    className="secondary"
                    style={{ padding: '14px 20px', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}
                  >
                    🥽 3D WebXR Headset
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ACTIVE ENCOUNTER */}
          {view === 'encounter' && session && (
            <>
              <div className="encounter-header">
                <div>
                  <div className="eyebrow" style={{ background: session.mode === 'exam' ? '#fef3c7' : '#ecfdf5', borderColor: session.mode === 'exam' ? '#fde68a' : '#a7f3d0', color: session.mode === 'exam' ? '#b45309' : '#047857' }}>
                    {session.mode === 'exam' ? 'CONTROLLED ASSESSMENT' : 'FORMATIVE PRACTICE'}
                  </div>
                  <h1>{session.mode === 'exam' ? 'Clinical Assessment Station' : 'Active Consultation Room'}</h1>
                  <p>{currentCase.specialty} · Encounter #{session.session_id} · St. Mary's Ward 4B</p>
                </div>

                <div className="top-actions">
                  <a href={`/?vr=1&case=${session.case_id}`} className="vr-launch-btn">
                    <span>🥽</span>
                    <span>Continue in 3D / VR Ward</span>
                  </a>
                  {session.mode === 'exam' && (
                    <span className="environment-badge" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                      ⏱️ {timeLeft === null ? '--:--' : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="encounter-layout">
                {/* Patient Dialogue & Bedside Panel */}
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <small>SIMULATED PATIENT</small>
                      <h2>{currentCase.title}</h2>
                    </div>
                    <span className="count-chip" style={{ background: '#ecfdf5', color: '#047857', fontWeight: 800 }}>
                      BED 04B
                    </span>
                  </div>

                  <div className="patient-stage-card">
                    <div className="patient-badge-initials">{currentCase.initials || 'PT'}</div>
                    <div>
                      <b>{session.patient?.age ? `${session.patient.age}-year-old ` : ''}{session.patient?.sex || currentCase.patient}</b>
                      <p>{appearance || 'Ask questions to elicit symptoms and observe physical findings.'}</p>
                    </div>
                  </div>

                  {vitals && (
                    <>
                      <div className="subhead">Bedside Physiological Observations</div>
                      <div className="vitals-grid">
                        {Object.entries(vitals).map(([k, v]) => (
                          <div key={k}>
                            <small>{k}</small>
                            <b>{v}</b>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="subhead">Consultation Dialogue</div>
                  <div className="chat-window">
                    {messages.map((m, i) => (
                      <div className={`chat-message ${m.role === 'student' ? 'from-student' : ''}`} key={i}>
                        <small>{m.role === 'student' ? 'DOCTOR (YOU)' : 'PATIENT'}</small>
                        <p>{m.content}</p>
                        {m.role === 'patient' && (
                          <button className="listen" onClick={() => speak(m.content)}>
                            ▶ Play Speech
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="composer">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      placeholder="Ask a question, explain an examination, or communicate clinical instructions…"
                      rows={3}
                    />
                    <div className="composer-bottom">
                      <span>Type message and press Enter to speak</span>
                      <div className="hero-actions" style={{ margin: 0 }}>
                        {session.mode === 'practice' && (
                          <button className="secondary" style={{ padding: '8px 14px' }} onClick={() => setHintVisible((v) => !v)}>
                            {hintVisible ? 'Hide Guidance' : 'Clinical Guidance Hint'}
                          </button>
                        )}
                        <button
                          className="primary"
                          style={{ padding: '8px 18px' }}
                          disabled={busy || !draft.trim() || (session.mode === 'exam' && timeLeft === 0)}
                          onClick={send}
                        >
                          {busy ? 'Processing…' : 'Send to Patient ↗'}
                        </button>
                      </div>
                    </div>
                    {hintVisible && session.mode === 'practice' && (
                      <div className="notice" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', marginTop: 12 }}>
                        <b>OSCE Guidance:</b> Start with open questions, clarify onset and progression, ask about red flag symptoms, elicit medical history and drug allergies, then order tests with specific indications.
                      </div>
                    )}
                  </div>
                </section>

                {/* Diagnostics Workbench & Clinical Submission */}
                <aside className="workbench">
                  <section className="panel">
                    <div className="panel-heading" style={{ marginBottom: 12 }}>
                      <div>
                        <small>DIAGNOSTIC WORKBENCH</small>
                        <h3>Order Investigations</h3>
                      </div>
                    </div>

                    <label className="field-label">Select Investigation</label>
                    <select value={investigation} onChange={(e) => setInvestigation(e.target.value)}>
                      {tests.map(([id, t]) => (
                        <option value={id} key={id}>{t}</option>
                      ))}
                    </select>

                    <label className="field-label">Clinical Indication (Mandatory)</label>
                    <textarea
                      value={indication}
                      onChange={(e) => setIndication(e.target.value)}
                      placeholder="What specific diagnostic or management question will this test answer?"
                      rows={2}
                    />

                    <button
                      className="secondary"
                      style={{ width: '100%', marginTop: 12, fontWeight: 700 }}
                      disabled={busy || (session.mode === 'exam' && timeLeft === 0)}
                      onClick={orderTest}
                    >
                      Request Diagnostic Investigation →
                    </button>

                    {results.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div className="subhead" style={{ margin: '12px 0 8px' }}>Returned Reports ({results.length})</div>
                        {results.map((r, i) => (
                          <article className="result-card" key={i}>
                            <div className="result-title">
                              <b>{r.name}</b>
                              <span className={r.appropriate ? 'good-tag' : 'warn-tag'}>
                                {r.appropriate ? 'Indicated' : 'Review Indication'}
                              </span>
                            </div>
                            <small style={{ color: '#64748b', display: 'block', margin: '4px 0' }}>Indication: {r.indication}</small>
                            <p style={{ margin: '8px 0', fontWeight: 600 }}>{r.result}</p>
                            <div style={{ background: '#f1f5f9', padding: '8px 10px', borderRadius: 6, fontSize: 13, color: '#334155' }}>
                              <b>Clinical Interpretation:</b> {r.interpretation}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Clinical Reasoning & Management Submission */}
                  <section className="panel">
                    <div className="panel-heading" style={{ marginBottom: 12 }}>
                      <div>
                        <small>DECISION & SUBMISSION</small>
                        <h3>Clinical Plan</h3>
                      </div>
                    </div>

                    <label className="field-label">Differential Diagnoses</label>
                    <textarea
                      value={differential}
                      onChange={(e) => setDifferential(e.target.value)}
                      rows={2}
                      placeholder="e.g. Severe Pneumonia, Acute Pulmonary Embolism, Sepsis"
                    />

                    <label className="field-label">Primary Working Diagnosis</label>
                    <input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Right Lower Lobe Severe Bacterial Pneumonia"
                    />

                    <label className="field-label">Immediate Management Actions</label>
                    <div className="checklist">
                      {managementOptions.map((m) => (
                        <label key={m}>
                          <input
                            type="checkbox"
                            checked={management.includes(m)}
                            onChange={() => toggleManagement(m)}
                          />
                          <span>{m}</span>
                        </label>
                      ))}
                    </div>

                    <label className="field-label">Clinical Reasoning & Justification</label>
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      rows={3}
                      placeholder="Explain how observations, history, and test results justify your working diagnosis and escalation plan…"
                    />

                    <button
                      className="primary"
                      style={{ width: '100%', marginTop: 16 }}
                      disabled={busy}
                      onClick={finish}
                    >
                      {busy ? 'Submitting…' : session.mode === 'exam' ? 'Submit Examination Station →' : 'Complete Encounter & View Performance Debrief →'}
                    </button>
                  </section>
                </aside>
              </div>
            </>
          )}

          {/* VIEW: PERFORMANCE REPORT */}
          {view === 'report' && report && (
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
              <div className="section-head">
                <div>
                  <div className="eyebrow">OBJECTIVE PERFORMANCE EVALUATION</div>
                  <h2>Clinical Competency Debrief</h2>
                  <p>Case {report.case_id} · {report.mode === 'exam' ? 'Examination Submission' : 'Formative Practice Report'}</p>
                </div>
              </div>

              <div className="panel" style={{ padding: 28, marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)', paddingRight: 24 }}>
                    <small style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: 11 }}>FORMATIVE SCORE</small>
                    <div style={{ fontSize: 54, fontWeight: 800, color: '#047857', fontFamily: 'var(--font-display)', margin: '8px 0' }}>
                      {report.score}
                      <span style={{ fontSize: 20, color: '#94a3b8' }}>/100</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${report.score}%`, height: '100%', background: '#047857' }} />
                    </div>
                  </div>

                  <div>
                    <small style={{ color: '#047857', fontWeight: 800, textTransform: 'uppercase', fontSize: 11 }}>CONFIRMED CASE DIAGNOSIS</small>
                    <h3 style={{ fontSize: 22, fontWeight: 800, margin: '6px 0 10px', color: '#0f172a' }}>{report.hidden_case_diagnosis}</h3>
                    <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>{report.summary}</p>
                  </div>
                </div>
              </div>

              {report.domains?.length > 0 && (
                <div className="panel" style={{ padding: 28, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>Competency Domain Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {report.domains.map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: d.status === 'evidence observed' ? '#dcfce7' : '#fef3c7', color: d.status === 'evidence observed' ? '#15803d' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {d.status === 'evidence observed' ? '✓' : '!'}
                        </div>
                        <div>
                          <b style={{ fontSize: 15, color: '#0f172a' }}>{d.domain}</b>
                          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 14 }}>{d.feedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 14 }}>
                <button className="primary" onClick={() => { resetEncounter(); setView('home'); }}>
                  Return to Case Directory →
                </button>
                <a href={`/?vr=1&case=${report.case_id}`} className="secondary" style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}>
                  🥽 Practise This Patient in 3D VR Ward
                </a>
              </div>
            </div>
          )}

          {/* VIEW: JOIN EXAMINATION */}
          {view === 'exam' && (
            <div className="setup-wrap" style={{ maxWidth: 640, margin: '0 auto' }}>
              <div className="section-head">
                <div>
                  <div className="eyebrow">CONTROLLED CLINICAL EXAMINATION</div>
                  <h2>OSCE Examination Station</h2>
                  <p>Enter the secure examination station access code provided by your clinical examiner.</p>
                </div>
              </div>

              <div className="panel" style={{ padding: 32 }}>
                <label className="field-label" style={{ fontSize: 14 }}>Enter Examination Code</label>
                <input
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MED7K2P"
                  style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center', padding: '14px' }}
                  maxLength={12}
                />

                <div className="notice" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', margin: '20px 0', padding: 16 }}>
                  <b>Examination Protocol:</b>
                  <ul style={{ paddingLeft: 20, margin: '8px 0 0', fontSize: 13, lineHeight: 1.7 }}>
                    <li>Patient diagnosis is strictly hidden from view.</li>
                    <li>Clinical guidance hints and answers are disabled.</li>
                    <li>Each requested investigation requires a clinical indication.</li>
                    <li>Session audit trail and decision timestamps are securely archived for examiner grading.</li>
                  </ul>
                </div>

                <button
                  className="primary"
                  style={{ width: '100%', padding: '16px', fontSize: 15 }}
                  disabled={busy || !examCode.trim()}
                  onClick={() => start('exam')}
                >
                  {busy ? 'Authenticating Station…' : 'Begin Clinical Examination →'}
                </button>
              </div>
            </div>
          )}

          {/* VIEW: EDUCATOR CONSOLE */}
          {view === 'educator' && (
            <div>
              <div className="section-head">
                <div>
                  <div className="eyebrow">FACULTY & CURRICULUM STUDIO</div>
                  <h2>Educator Workspace</h2>
                  <p>Create controlled OSCE examinations, inspect student performance audits, and compile evidence-based scenarios.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <small>EXAM STATION BUILDER</small>
                      <h3>Create Examination Code</h3>
                    </div>
                  </div>

                  <label className="field-label">Examination Title</label>
                  <input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />

                  <label className="field-label">Assigned Case (Hidden from candidate)</label>
                  <select value={selectedCaseForExam} onChange={(e) => setSelectedCaseForExam(e.target.value)}>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>

                  <div className="two-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="field-label">Station Duration (Minutes)</label>
                      <input type="number" min="5" max="120" value={examDuration} onChange={(e) => setExamDuration(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Pass Mark (%)</label>
                      <input type="number" min="50" max="100" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
                    </div>
                  </div>

                  <button className="primary" style={{ width: '100%', marginTop: 16 }} onClick={createExam}>
                    Generate Secure OSCE Station Code →
                  </button>

                  {createdExam && (
                    <div style={{ marginTop: 16, padding: 16, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10 }}>
                      <small style={{ color: '#047857', fontWeight: 800 }}>SHARE WITH CANDIDATES</small>
                      <div style={{ fontSize: 32, fontWeight: 800, color: '#065f46', fontFamily: 'monospace', margin: '6px 0' }}>
                        {createdExam.code}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#065f46' }}>{createdExam.title} · {createdExam.duration} min duration</p>
                    </div>
                  )}
                </section>

                {/* Procedural Generator Panel */}
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <small>ZERO-HALLUCINATION PROCEDURAL COMPILER</small>
                      <h3>Evidence-Based Scenario Generator</h3>
                    </div>
                  </div>

                  <label className="field-label">Clinical Guideline Archetype</label>
                  <select value={genArch} onChange={(e) => setGenArch(e.target.value)}>
                    {(archList.length ? archList : [
                      { archetype_id: 'sepsis', title: 'Severe Sepsis & Septic Shock (NICE NG51 / Surviving Sepsis)' },
                      { archetype_id: 'acute_coronary_syndrome', title: 'Acute Coronary Syndrome (ESC / AHA/ACC)' },
                      { archetype_id: 'acute_dyspnoea', title: 'Acute Severe Asthma (BTS/SIGN / GINA)' },
                      { archetype_id: 'pediatric_febrile_illness', title: 'Pediatric Severe Febrile Illness (WHO IMCI / NICE)' },
                    ]).map((a) => (
                      <option key={a.archetype_id} value={a.archetype_id}>{a.title}</option>
                    ))}
                  </select>

                  <div className="two-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="field-label">Patient Phenotype</label>
                      <select value={genPheno} onChange={(e) => setGenPheno(e.target.value)}>
                        <option value="black-male">Adult Black male (Fitzpatrick V-VI)</option>
                        <option value="white-male">Adult White male (Fitzpatrick II-III)</option>
                        <option value="black-female">Adult Black female (Fitzpatrick V)</option>
                        <option value="white-female">Adult White female (Fitzpatrick II)</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Patient Age (Years)</label>
                      <input type="number" min="1" max="95" value={genAge} onChange={(e) => setGenAge(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ margin: '14px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={genAutoApprove} onChange={(e) => setGenAutoApprove(e.target.checked)} />
                      <b>Auto-publish immediately to Case Library & Standalone VR Ward</b>
                    </label>
                  </div>

                  <button className="primary" style={{ width: '100%' }} disabled={genBusy} onClick={runProceduralCompiler}>
                    {genBusy ? 'Compiling Verified Scenario…' : 'Compile Scenario with Zero Hallucination →'}
                  </button>

                  {genResult && (
                    <div style={{ marginTop: 14, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13 }}>
                      <b style={{ color: '#166534' }}>✓ Compiled & Validated: {genResult.case_id}</b>
                      <p style={{ margin: '4px 0 0', color: '#14532d' }}>{genResult.case?.title} ({genResult.case?.patient_name})</p>
                    </div>
                  )}
                </section>
              </div>

              {/* Created Exams & Audit Table */}
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <small>AUDIT & SESSIONS</small>
                    <h3>Active OSCE Stations & Student Sessions</h3>
                  </div>
                  <span className="count-chip">{examList.length} Active Stations</span>
                </div>

                {examList.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px 14px' }}>Station Title</th>
                          <th style={{ padding: '12px 14px' }}>Access Code</th>
                          <th style={{ padding: '12px 14px' }}>Assigned Case</th>
                          <th style={{ padding: '12px 14px' }}>Duration</th>
                          <th style={{ padding: '12px 14px' }}>Status</th>
                          <th style={{ padding: '12px 14px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examList.map((e) => (
                          <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{e.title}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#047857' }}>{e.code}</td>
                            <td style={{ padding: '12px 14px' }}>{cases.find((c) => c.id === e.case_id)?.title || e.case_id}</td>
                            <td style={{ padding: '12px 14px' }}>{e.duration} min</td>
                            <td style={{ padding: '12px 14px' }}><span className="count-chip" style={{ background: '#ecfdf5', color: '#047857' }}>{e.status}</span></td>
                            <td style={{ padding: '12px 14px' }}>
                              {e.status === 'open' && (
                                <button className="secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => closeExam(e.id)}>
                                  Close Station
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontSize: 14 }}>No examinations active. Create one using the builder above.</p>
                )}
              </section>
            </div>
          )}

          {/* VIEW: VR / AR IMMERSIVE CLIENT */}
          {view === 'xr' && (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div className="section-head">
                <div>
                  <div className="eyebrow">IMMERSIVE SIMULATION ENVIRONMENT</div>
                  <h2>Standalone 3D & Meta Quest WebXR</h2>
                  <p>Step directly into the virtual emergency department with spatial audio, interactive equipment, and physical patient examination.</p>
                </div>
              </div>

              <div className="panel" style={{ padding: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center', marginBottom: 28 }}>
                  <div>
                    <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>Clinical Bedside Simulation</h3>
                    <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.7 }}>
                      Stand at the patient's bedside, palpate the radial pulse with controller haptics, listen with the Littmann acoustic stethoscope, command the patient to take a deep breath or say "Ah", and administer high-flow oxygen.
                    </p>
                    <a
                      href="/?vr=1"
                      className="primary"
                      style={{ padding: '16px 28px', fontSize: 16, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    >
                      <span>🥽</span>
                      <span>Launch 3D Virtual Hospital Ward →</span>
                    </a>
                  </div>

                  <div style={{ background: '#0f172a', borderRadius: 16, padding: 24, color: '#f8fafc' }}>
                    <small style={{ color: '#67e8f9', fontWeight: 800, textTransform: 'uppercase', fontSize: 11 }}>HARDWARE & PLATFORM STATUS</small>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: '1px solid #334155', paddingBottom: 8 }}>
                        <span>WebXR API Support:</span>
                        <b>{navigator.xr ? 'Available' : 'Browser Dependent'}</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: '1px solid #334155', paddingBottom: 8 }}>
                        <span>Meta Quest Browser:</span>
                        <b style={{ color: '#4ade80' }}>Fully Compatible</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: '1px solid #334155', paddingBottom: 8 }}>
                        <span>Desktop Chrome / Edge:</span>
                        <b style={{ color: '#4ade80' }}>Interactive 3D Mouse Orbit</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span>Spatial Audio & Haptics:</span>
                        <b style={{ color: '#4ade80' }}>Active (95Hz Filtered)</b>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SOURCES & EVIDENCE */}
          {view === 'sources' && (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div className="section-head">
                <div>
                  <div className="eyebrow">EVIDENCE GOVERNANCE</div>
                  <h2>Grounded Medical Knowledge Base</h2>
                  <p>All clinical cases, physiological vitals, and laboratory values are grounded in international medical guidelines.</p>
                </div>
              </div>

              <div className="panel" style={{ padding: 28, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 12px' }}>Referenced Clinical Guidelines</h3>
                <ul style={{ paddingLeft: 22, fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
                  <li><b>British Thoracic Society (BTS) / SIGN</b>: Management of Community-Acquired Pneumonia and Acute Severe Asthma.</li>
                  <li><b>Surviving Sepsis Campaign / NICE NG51</b>: Sepsis Recognition, Diagnosis, and Early Management (1-Hour Bundle).</li>
                  <li><b>American College of Surgeons Committee on Trauma (ACS-COT)</b>: Advanced Trauma Life Support (ATLS 10th Ed).</li>
                  <li><b>International Society for Burn Injuries (ISBI) / British Burn Association</b>: Parkland Fluid Resuscitation Formula.</li>
                  <li><b>National Institute for Health and Care Excellence (NICE NG133)</b>: Hypertension in Pregnancy and Preeclampsia.</li>
                  <li><b>World Health Organization (WHO IMCI)</b>: Integrated Management of Childhood Illness.</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modern Clinician Authentication Modal */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Clinician Identity & Roles</h2>
                <small style={{ color: '#64748b' }}>University Teaching Hospital Network Single Sign-On</small>
              </div>
              <button className="modal-close" onClick={() => setAuthModalOpen(false)}>×</button>
            </div>

            {/* Quick Demo Switcher */}
            <div style={{ marginBottom: 20 }}>
              <small style={{ color: '#047857', fontWeight: 800, display: 'block', marginBottom: 8 }}>QUICK CLINICIAN PROFILES (DEMO ACCESS)</small>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="secondary"
                  style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13 }}
                  onClick={() => {
                    setName('Dr. Ephrem Dushime');
                    setAccount({ display_name: 'Dr. Ephrem Dushime', role: 'resident', email: 'e.dushime@hospital.edu' });
                    setAuthModalOpen(false);
                  }}
                >
                  <b>Dr. Ephrem Dushime</b>
                  <small style={{ display: 'block', color: '#64748b' }}>Clinical Resident</small>
                </button>
                <button
                  className="secondary"
                  style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13 }}
                  onClick={() => {
                    setName('Prof. A. Mwizerwa');
                    setAccount({ display_name: 'Prof. A. Mwizerwa', role: 'educator', email: 'a.mwizerwa@university.edu' });
                    setAuthModalOpen(false);
                  }}
                >
                  <b>Prof. A. Mwizerwa</b>
                  <small style={{ display: 'block', color: '#64748b' }}>Faculty / Examiner</small>
                </button>
              </div>
            </div>

            <div className="side-divider" />

            <label className="field-label">Institutional Email</label>
            <input
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              placeholder="clinician@institution.edu"
            />

            <label className="field-label">Password</label>
            <input
              type="password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              placeholder="Institutional credentials"
            />

            <button
              className="primary"
              style={{ width: '100%', marginTop: 18 }}
              disabled={authBusy || !accountEmail.trim() || !accountPassword}
              onClick={() => signIn()}
            >
              {authBusy ? 'Authenticating…' : 'Sign In with Hospital Account →'}
            </button>

            {account && (
              <button
                className="secondary"
                style={{ width: '100%', marginTop: 10, color: '#b91c1c' }}
                onClick={() => { signOut(); setAuthModalOpen(false); }}
              >
                Sign Out of Active Session
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hospital Footer */}
      <footer className="footer">
        <span>BESTIE CLINICAL SIM · VIRTUAL TEACHING HOSPITAL · BUILD 1.4.0 PRODUCTION</span>
        <span>Accredited Medical Simulation · Formative Competency Assessment Only</span>
      </footer>
    </div>
  );
}
