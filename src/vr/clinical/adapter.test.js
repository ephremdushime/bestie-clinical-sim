import test from 'node:test';
import assert from 'node:assert/strict';
import { ClinicalAdapter, VR_EXAMINATIONS, VR_INTERVENTIONS } from './adapter.js';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

function make(handler) {
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push({ url, body: opts.body && JSON.parse(opts.body), headers: opts.headers, method: opts.method || 'GET' }); return handler(url, opts, calls); };
  return { a: new ClinicalAdapter({ fetchImpl, storage: store() }), calls };
}

test('start/ask/order/finish use the same session id and session token', async () => {
  const { a, calls } = make((url) => {
    if (url === '/api/sessions') return json({ session_id: 7, session_token: 'tok', opening: 'Hi' });
    if (url.endsWith('/chat')) return json({ reply: 'Since yesterday.' });
    if (url.endsWith('/investigations')) return json({ name: 'FBC', result: 'r' });
    return json({ score: 50 });
  });
  await a.start('respiratory-severe-001');
  assert.equal(await a.ask('When did it start?'), 'Since yesterday.');
  await a.order('fbc', 'Assess infection');
  await a.finish({});
  assert.deepEqual(calls.slice(1).map((c) => c.url), ['/api/sessions/7/chat', '/api/sessions/7/investigations', '/api/sessions/7/finish']);
  assert.equal(calls[1].headers['X-Session-Token'], 'tok');
  assert.equal(a.active, false);
});

test('examine and intervene endpoints update clinical state and record findings', async () => {
  const { a, calls } = make((url, opts) => {
    if (url === '/api/sessions') return json({ session_id: 9, session_token: 'tok', opening: 'Help' });
    if (url.endsWith('/examine')) return json({ action: 'auscultate:right_lower', finding: 'Crackles over the right lower chest.', measured: false, state: { vitals: { spo2: 88 }, status: 'unstable' } });
    if (url.endsWith('/intervene')) return json({ action: 'oxygen', label: 'Start supplemental oxygen', already: false, state: { vitals: { spo2: 94 }, status: 'improving' } });
    if (url.endsWith('/state')) return json({ simulated: true, vitals: { spo2: 94 }, status: 'improving', clock: 1.5 });
    return json({});
  });
  await a.start('respiratory-severe-001');

  // Perform examination
  const examRes = await a.examine('auscultate:right_lower');
  assert.match(examRes.finding, /crackles/i);
  assert.equal(a.examinationFindings.length, 1);
  assert.equal(a.patientState.status, 'unstable');

  // Perform intervention
  const intRes = await a.intervene('oxygen');
  assert.equal(intRes.label, 'Start supplemental oxygen');
  assert.deepEqual(a.completedInterventions, ['oxygen']);
  assert.equal(a.patientState.vitals.spo2, 94);
  assert.equal(a.patientState.status, 'improving');

  // Query state
  const state = await a.getState();
  assert.equal(state.vitals.spo2, 94);
  assert.equal(state.status, 'improving');
});

test('duplicate identical questions collapse into one request', async () => {
  const { a, calls } = make((url) => (url === '/api/sessions' ? json({ session_id: 1, opening: 'x' }) : json({ reply: 'ok' })));
  await a.start('c');
  await Promise.all([a.ask('Any pain?'), a.ask('Any pain?')]);
  assert.equal(calls.filter((c) => c.url.endsWith('/chat')).length, 1);
});

test('unsupported test result is passed through, not invented', async () => {
  const msg = 'No case-specific result is configured for this test. It has not been performed in this simulation.';
  const { a } = make((url) => (url === '/api/sessions' ? json({ session_id: 1, opening: 'x' }) : json({ result: msg, configured: false })));
  await a.start('c');
  const r = await a.order('ct-head', 'Headache');
  assert.equal(r.result, msg);
});

test('errors: server detail surfaced; network failure is retryable; indication required', async () => {
  const { a } = make((url) => (url === '/api/sessions' ? json({ session_id: 1, opening: 'x' }) : json({ detail: 'Session is no longer active.' }, 409)));
  await a.start('c');
  await assert.rejects(a.ask('hi'), /no longer active/);
  await assert.rejects(a.order('fbc', ''), /indication/);
  const b = new ClinicalAdapter({ fetchImpl: async () => { throw new TypeError('fetch failed'); }, storage: store() });
  await assert.rejects(b.start('c'), (e) => e.retryable === true);
});

test('actions without a session are rejected', async () => {
  const { a } = make(() => json({}));
  await assert.rejects(a.ask('hello'), /No active encounter/);
  await assert.rejects(a.examine('inspect:general'), /No active encounter/);
  await assert.rejects(a.intervene('oxygen'), /No active encounter/);
});
