import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceController } from './voice.js';

const fakeRec = () => { const r = { mimeType: 'audio/webm', start() { setTimeout(() => this.ondataavailable({ data: new Blob(['abc']), size: 3 }), 0); }, stop() { setTimeout(() => this.onstop(), 0); } }; return r; };
const stream = { getTracks: () => [{ stop() {} }] };
const mk = (over = {}) => { const states = []; const v = new VoiceController({ onState: (s, d) => states.push([s, d]), getStream: async () => stream, createRecorder: fakeRec, speak: async () => {}, minMs: 0, transcribe: async () => 'Any chest pain?', ...over }); return { v, states }; };
const wait = (ms = 10) => new Promise((r) => setTimeout(r, ms));

test('happy path: listening -> processing -> text -> responding -> idle', async () => {
  const { v, states } = mk();
  await v.begin(); await wait();
  const text = await v.end();
  assert.equal(text, 'Any chest pain?');
  await v.respond('Yes, on the right.');
  assert.deepEqual(states.map((s) => s[0]), ['listening', 'processing', 'responding', 'idle']);
});

test('microphone denial gives a clear error and no crash', async () => {
  const { v, states } = mk({ getStream: async () => { const e = new Error('x'); e.name = 'NotAllowedError'; throw e; } });
  await v.begin();
  assert.equal(states.at(-1)[0], 'error'); assert.match(states.at(-1)[1], /permission denied/i);
});

test('transcription failure and empty transcript surface retryable errors', async () => {
  let { v, states } = mk({ transcribe: async () => { throw new Error('Transcription failed (503)'); } });
  await v.begin(); await wait(); assert.equal(await v.end(), null); assert.match(states.at(-1)[1], /503/);
  ({ v, states } = mk({ transcribe: async () => '  ' }));
  await v.begin(); await wait(); assert.equal(await v.end(), null); assert.equal(states.at(-1)[0], 'error');
});

test('double begin while listening is ignored; end when idle is a no-op', async () => {
  const { v, states } = mk();
  await v.begin(); await v.begin();
  assert.equal(states.filter((s) => s[0] === 'listening').length, 1);
  const { v: v2 } = mk(); assert.equal(await v2.end(), null);
});

