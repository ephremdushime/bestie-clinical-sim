// Adapter between VR scene actions and the existing Bestie Clinical Sim API.
// It holds NO clinical facts: every answer, result, observation and report comes from the backend.
const API = '/api';

export const VR_TESTS = [
  ['pulse-ox', 'Pulse oximetry'],
  ['blood-gas', 'Blood gas'],
  ['fbc', 'Full blood count'],
  ['chest-xray', 'Chest X-ray'],
  ['renal-electrolytes', 'Renal function / electrolytes'],
  ['blood-culture', 'Blood cultures'],
  ['ct-chest', 'CT chest'],
];

export const VR_EXAMINATIONS = [
  ['inspect:general', 'General appearance', 'Look at patient alertness, facial distress, cyanosis and posture'],
  ['inspect:respiratory_effort', 'Respiratory effort', 'Check accessory muscle use, sternocleidomastoid indrawing'],
  ['auscultate:aortic', 'Aortic area (2nd R ICS)', '2nd right intercostal space, right sternal border (S2 / aortic valve)'],
  ['auscultate:pulmonic', 'Pulmonic area (2nd L ICS)', '2nd left intercostal space, left sternal border (S2 splitting)'],
  ['auscultate:erbs', "Erb's point (3rd L ICS)", '3rd left intercostal space, sternal border'],
  ['auscultate:tricuspid', 'Tricuspid area (4th L ICS)', '4th/5th left lower sternal border'],
  ['auscultate:mitral', 'Mitral apex (5th L ICS MCL)', '5th left intercostal space mid-clavicular line (S1 / apex beat)'],
  ['auscultate:right_lower', 'Auscultate right lower base', '6th ICS / right posterolateral base for inspiratory crackles'],
  ['auscultate:left_lower', 'Auscultate left lower base', '6th ICS / left posterolateral base'],
  ['palpate:radial', 'Palpate radial pulse', 'Feel right radial artery at the wrist for rate, rhythm and volume'],
  ['palpate:carotid', 'Palpate carotid pulse', 'Assess central arterial pulse wave and volume'],
  ['palpate:abdomen', 'Palpate abdomen', 'Check for peritoneal guarding, rigidity, and focal tenderness'],
  ['measure:spo2', 'Pulse oximeter (SpO₂)', 'Attach clip probe to digit and obtain current saturation'],
  ['measure:bp', 'Blood pressure cuff', 'Apply cuff to arm and measure systolic/diastolic BP'],
  ['measure:temp', 'Thermometer', 'Measure core tympanic/oral temperature'],
  ['inspect:burn', 'Inspect burn & soot', 'Assess burn depth, blister fluid, and airway soot contamination'],
  ['inspect:wound', 'Inspect trauma wound', 'Check active bleeding, tissue loss, and hematoma margins'],
  ['inspect:emesis', 'Inspect vomitus', 'Observe bedside basin for coffee-ground, bilious or fresh blood'],
];

export const VR_INTERVENTIONS = [
  ['oxygen', 'Start supplemental oxygen', 'Apply oxygen via mask / cannula per emergency protocol'],
  ['escalate', 'Call senior help / emergency team', 'Urgent clinical escalation for physiologically unstable patient'],
  ['monitoring', 'Continuous bedside monitoring', 'Attach continuous 3-lead ECG, pulse oximetry and automated NIBP'],
];

export const VR_MANAGEMENT = [
  'ABCDE / systematic initial assessment',
  'Urgent senior help / escalation',
  'Oxygenation and monitoring per local protocol',
  'Repeat observations and reassess response',
  'Referral / transfer with structured handover',
];

export class ClinicalAdapter {
  constructor({ fetchImpl = (...a) => fetch(...a), storage = globalThis.sessionStorage, timeoutMs = 20000 } = {}) {
    this.fetch = fetchImpl;
    this.storage = storage;
    this.timeoutMs = timeoutMs;
    this.session = null;
    this.inflight = new Map();
    this.transcript = [];
    this.results = [];
    this.examinationFindings = [];
    this.completedInterventions = [];
    this.patientState = null;
  }

  _headers() {
    const s = this.storage;
    const get = (k) => (s && s.getItem(k)) || '';
    const access = get('bcsAccessToken'), pilot = get('bcsPilotToken'), st = get('bcsSessionToken');
    return {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : pilot ? { 'X-Pilot-Token': pilot } : {}),
      ...(st ? { 'X-Session-Token': st } : {}),
    };
  }

  async _request(path, opts = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const r = await this.fetch(API + path, { ...opts, headers: { ...this._headers(), ...(opts.headers || {}) }, signal: ctrl.signal });
      if (!r.ok) {
        let m = `Request failed (${r.status})`;
        try { m = (await r.json()).detail || m; } catch { /* keep default */ }
        const e = new Error(m); e.status = r.status; throw e;
      }
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') { const t = new Error('The server took too long to respond. Please retry.'); t.retryable = true; throw t; }
      if (e.status === undefined) e.retryable = true; // network failure
      throw e;
    } finally { clearTimeout(timer); }
  }

  // Collapse duplicate identical requests (e.g. double trigger pulls) into one call.
  _dedupe(key, fn) {
    if (this.inflight.has(key)) return this.inflight.get(key);
    const p = fn().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  async start(caseId, learner = 'Student') {
    const d = await this._request('/sessions', { method: 'POST', body: JSON.stringify({ learner, case_id: caseId, mode: 'practice' }) });
    this.storage?.setItem('bcsSessionToken', d.session_token || '');
    this.session = d;
    this.transcript = [{ role: 'patient', content: d.opening }];
    this.results = [];
    this.examinationFindings = [];
    this.completedInterventions = [];
    this.patientState = null;
    return d;
  }

  get active() { return !!this.session; }

  async ask(text) {
    const message = String(text || '').trim();
    if (!message) throw new Error('Nothing to send.');
    this._need();
    return this._dedupe('chat:' + message, async () => {
      const d = await this._request(`/sessions/${this.session.session_id}/chat`, { method: 'POST', body: JSON.stringify({ message }) });
      this.transcript.push({ role: 'student', content: message }, { role: 'patient', content: d.reply });
      return d.reply;
    });
  }

  async order(testId, indication) {
    this._need();
    if (!indication || indication.trim().length < 3) throw new Error('A clinical indication is required.');
    return this._dedupe('inv:' + testId, async () => {
      const d = await this._request(`/sessions/${this.session.session_id}/investigations`, { method: 'POST', body: JSON.stringify({ test_id: testId, indication }) });
      this.results.push(d);
      return d;
    });
  }

  async examine(actionKey) {
    this._need();
    if (!actionKey || !actionKey.trim()) throw new Error('Examination action key is required.');
    return this._dedupe('exam:' + actionKey, async () => {
      const d = await this._request(`/sessions/${this.session.session_id}/examine`, { method: 'POST', body: JSON.stringify({ action: actionKey }) });
      this.examinationFindings.push(d);
      if (d.state) this.patientState = d.state;
      return d;
    });
  }

  async intervene(actionKey) {
    this._need();
    if (!actionKey || !actionKey.trim()) throw new Error('Intervention action key is required.');
    return this._dedupe('intervene:' + actionKey, async () => {
      const d = await this._request(`/sessions/${this.session.session_id}/intervene`, { method: 'POST', body: JSON.stringify({ action: actionKey }) });
      if (!this.completedInterventions.includes(actionKey)) {
        this.completedInterventions.push(actionKey);
      }
      if (d.state) this.patientState = d.state;
      return d;
    });
  }

  async getState() {
    this._need();
    const d = await this._request(`/sessions/${this.session.session_id}/state`, { method: 'GET' });
    if (d.simulated) this.patientState = d;
    return d;
  }

  async finish({ differential = [], final_diagnosis = '', management = [], reflection = '' }) {
    this._need();
    return this._dedupe('finish', async () => {
      const report = await this._request(`/sessions/${this.session.session_id}/finish`, { method: 'POST', body: JSON.stringify({ differential, final_diagnosis, management, reflection }) });
      this.session = null;
      this.storage?.removeItem('bcsSessionToken');
      return report;
    });
  }

  reset() {
    this.session = null;
    this.transcript = [];
    this.results = [];
    this.examinationFindings = [];
    this.completedInterventions = [];
    this.patientState = null;
    this.storage?.removeItem('bcsSessionToken');
  }

  _need() { if (!this.session) throw new Error('No active encounter. Start a case first.'); }
}
