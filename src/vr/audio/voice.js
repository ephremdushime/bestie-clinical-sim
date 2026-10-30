// Push-to-talk voice pipeline: record -> server-side transcription -> caller asks patient -> speak.
// States: idle | listening | processing | responding | error
export class VoiceController {
  constructor({ onState = () => {}, transcribe, speak = defaultSpeak, getStream = defaultStream, createRecorder = (s) => new MediaRecorder(s), minMs = 400, maxMs = 15000 } = {}) {
    Object.assign(this, { onState, transcribe, speak, getStream, createRecorder, minMs, maxMs });
    this.state = 'idle'; this.recorder = null; this.chunks = []; this.timer = null; this.startedAt = 0; this.stream = null;
  }
  _set(state, detail = '') { this.state = state; this.onState(state, detail); }

  async begin() {
    if (this.state === 'listening' || this.state === 'processing') return;
    this.cancelSpeech();
    try {
      this.stream = await this.getStream();
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      this._set('error', denied ? 'Microphone permission denied. Use the text box or allow the microphone in browser settings.' : 'No microphone available. Use the text fallback.');
      return;
    }
    this.chunks = [];
    this.recorder = this.createRecorder(this.stream);
    this.recorder.ondataavailable = (ev) => ev.data && ev.data.size && this.chunks.push(ev.data);
    this.recorder.start();
    this.startedAt = Date.now();
    this.timer = setTimeout(() => this.end(), this.maxMs);
    this._set('listening');
  }

  // Resolves with the final text, or null if nothing usable was captured.
  end() {
    if (this.state !== 'listening' || !this.recorder) return Promise.resolve(null);
    clearTimeout(this.timer);
    const rec = this.recorder; this.recorder = null;
    const tooShort = Date.now() - this.startedAt < this.minMs;
    return new Promise((resolve) => {
      rec.onstop = async () => {
        this.stream?.getTracks?.().forEach((t) => t.stop());
        if (tooShort || !this.chunks.length) { this._set('error', 'That was too short. Hold the trigger while speaking.'); return resolve(null); }
        this._set('processing');
        try {
          const text = (await this.transcribe(new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }))) || '';
          if (!text.trim()) { this._set('error', 'I could not hear that clearly. Please retry or type your question.'); return resolve(null); }
          resolve(text.trim());
        } catch (e) {
          this._set('error', e.message || 'Transcription failed. Please retry or type your question.'); resolve(null);
        }
      };
      rec.stop();
    });
  }

  async respond(text) {
    this._set('responding');
    try { await this.speak(text); } catch { /* captions remain visible */ }
    if (this.state === 'responding') this._set('idle');
  }
  idle() { this._set('idle'); }
  cancelSpeech() { try { globalThis.speechSynthesis?.cancel(); } catch { /* ignore */ } }
}

function defaultStream() { return navigator.mediaDevices.getUserMedia({ audio: true }); }
function defaultSpeak(text) {
  return new Promise((resolve) => {
    if (!globalThis.speechSynthesis) return resolve();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.9;
    u.onend = u.onerror = () => resolve();
    globalThis.speechSynthesis.cancel(); globalThis.speechSynthesis.speak(u);
  });
}

export async function transcribeViaServer(blob, headers = {}) {
  const r = await fetch('/api/voice/transcribe', { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm', ...headers }, body: blob });
  if (!r.ok) { let m = `Transcription failed (${r.status})`; try { m = (await r.json()).detail || m; } catch { /* default */ } throw new Error(m); }
  return (await r.json()).text;
}

