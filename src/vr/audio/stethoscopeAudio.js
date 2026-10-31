// Realistic Web Audio stethoscope synthesizer for cardiac and pulmonary auscultation.
// Produces authentic soundscapes: normal vesicular breathing, coarse inspiratory crackles (pneumonia),
// wheeze, and synchronized S1/S2 cardiac cycles.
// Tuned for high acoustic clarity with sub-bass cut (<95 Hz) to eliminate boomy bass rumble.

export class StethoscopeAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.highpassFilter = null;
    this.gain = null;
    this.activeSource = null;
    this.currentMode = null;
    this.intervalId = null;
  }

  _init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master high-pass filter cuts boomy sub-bass frequencies (<95 Hz)
      // Mimics genuine clinical stethoscope diaphragm acoustic attenuation
      this.highpassFilter = this.ctx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.value = 95;
      this.highpassFilter.Q.value = 0.7;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.75;

      this.highpassFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.85;
      this.gain.connect(this.highpassFilter);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.gain && this.ctx) {
      this.gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    }
    this.currentMode = null;
  }

  // Crisp coarse/fine inspiratory crackles (pneumonia consolidation)
  playCrackles(durationSec = 4.0) {
    this._init();
    this.stop();
    this.currentMode = 'crackles';
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.85, ctx.currentTime);

    const playBreathCycle = () => {
      const now = ctx.currentTime;
      // Inhalation airflow (bandpassed 280-600 Hz, crisp non-boomy)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(1.4, now);

      const bufferSize = ctx.sampleRate * 1.5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.94 * b0 + white * 0.12;
        b1 = 0.88 * b1 + white * 0.18;
        output[i] = (b0 + b1) * 0.28;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const breathGain = ctx.createGain();
      breathGain.gain.setValueAtTime(0.01, now);
      breathGain.gain.exponentialRampToValueAtTime(0.35, now + 0.7);
      breathGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

      noise.connect(filter);
      filter.connect(breathGain);
      breathGain.connect(this.gain);
      noise.start(now);

      // Superimpose explosive crackles in mid-to-late inspiration (350-850 Hz micro-pops)
      const numCrackles = 14 + Math.floor(Math.random() * 8);
      for (let i = 0; i < numCrackles; i++) {
        const crackleTime = now + 0.45 + Math.random() * 0.85;
        const popOsc = ctx.createOscillator();
        const popGain = ctx.createGain();
        popOsc.type = 'triangle';
        popOsc.frequency.setValueAtTime(380 + Math.random() * 380, crackleTime);
        popOsc.frequency.exponentialRampToValueAtTime(140, crackleTime + 0.018);

        popGain.gain.setValueAtTime(0.55, crackleTime);
        popGain.gain.exponentialRampToValueAtTime(0.001, crackleTime + 0.020);

        popOsc.connect(popGain);
        popGain.connect(this.gain);
        popOsc.start(crackleTime);
        popOsc.stop(crackleTime + 0.025);
      }
    };

    playBreathCycle();
    this.intervalId = setInterval(playBreathCycle, 2500);
    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Normal Vesicular Breath Sounds
  playVesicular(durationSec = 4.0) {
    this._init();
    this.stop();
    this.currentMode = 'vesicular';
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.8, ctx.currentTime);

    const playBreathCycle = () => {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(340, now);
      filter.Q.setValueAtTime(1.2, now);

      const bufferSize = ctx.sampleRate * 2.0;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.92 * b0 + white * 0.15;
        output[i] = b0 * 0.35;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const breathGain = ctx.createGain();
      breathGain.gain.setValueAtTime(0.01, now);
      breathGain.gain.linearRampToValueAtTime(0.30, now + 0.8);
      breathGain.gain.linearRampToValueAtTime(0.05, now + 1.4);
      breathGain.gain.linearRampToValueAtTime(0.14, now + 1.7);
      breathGain.gain.linearRampToValueAtTime(0.01, now + 2.3);

      noise.connect(filter);
      filter.connect(breathGain);
      breathGain.connect(this.gain);
      noise.start(now);
    };

    playBreathCycle();
    this.intervalId = setInterval(playBreathCycle, 2700);
    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Authentic Clinical Cardiac Auscultation (S1 "lub" & S2 "dub")
  // Re-tuned: eliminates boomy low-end bass drone by using 110-85 Hz + 220 Hz diaphragm snap
  playHeartSounds(durationSec = 4.0, bpm = 124) {
    this._init();
    this.stop();
    this.currentMode = 'heart';
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.85, ctx.currentTime);
    const intervalMs = (60 / bpm) * 1000;

    const playBeat = () => {
      const now = ctx.currentTime;

      // S1 (lub) - Mitral & Tricuspid valve closure: 110 Hz down to 85 Hz with 220 Hz diaphragm snap
      const s1 = ctx.createOscillator();
      const s1Gain = ctx.createGain();
      s1.type = 'sine';
      s1.frequency.setValueAtTime(115, now);
      s1.frequency.exponentialRampToValueAtTime(85, now + 0.07);
      s1Gain.gain.setValueAtTime(0.45, now);
      s1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      s1.connect(s1Gain);
      s1Gain.connect(this.gain);
      s1.start(now);
      s1.stop(now + 0.09);

      // Acoustic diaphragm snap for S1 (crisp mechanical valve closure)
      const s1Snap = ctx.createOscillator();
      const s1SnapGain = ctx.createGain();
      s1Snap.type = 'triangle';
      s1Snap.frequency.setValueAtTime(220, now);
      s1SnapGain.gain.setValueAtTime(0.25, now);
      s1SnapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      s1Snap.connect(s1SnapGain);
      s1SnapGain.connect(this.gain);
      s1Snap.start(now);
      s1Snap.stop(now + 0.05);

      // S2 (dub) - Aortic & Pulmonic semilunar valve closure: 160 Hz down to 125 Hz
      const s2Time = now + (intervalMs / 1000) * 0.35;
      const s2 = ctx.createOscillator();
      const s2Gain = ctx.createGain();
      s2.type = 'sine';
      s2.frequency.setValueAtTime(160, s2Time);
      s2.frequency.exponentialRampToValueAtTime(125, s2Time + 0.06);
      s2Gain.gain.setValueAtTime(0.38, s2Time);
      s2Gain.gain.exponentialRampToValueAtTime(0.001, s2Time + 0.07);
      s2.connect(s2Gain);
      s2Gain.connect(this.gain);
      s2.start(s2Time);
      s2.stop(s2Time + 0.08);

      // Semilunar valve snap for S2 (higher pitch crisp click)
      const s2Snap = ctx.createOscillator();
      const s2SnapGain = ctx.createGain();
      s2Snap.type = 'triangle';
      s2Snap.frequency.setValueAtTime(280, s2Time);
      s2SnapGain.gain.setValueAtTime(0.20, s2Time);
      s2SnapGain.gain.exponentialRampToValueAtTime(0.001, s2Time + 0.035);
      s2Snap.connect(s2SnapGain);
      s2SnapGain.connect(this.gain);
      s2Snap.start(s2Time);
      s2Snap.stop(s2Time + 0.04);
    };

    playBeat();
    this.intervalId = setInterval(playBeat, intervalMs);
    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Deep breath in on patient command ("Take a deep breath")
  playDeepInspiration(durationSec = 2.4) {
    this._init();
    this.stop();
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.9, ctx.currentTime);
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, now);
    filter.Q.setValueAtTime(1.2, now);

    const bufferSize = Math.floor(ctx.sampleRate * 2.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.93 * b0 + white * 0.14;
      output[i] = b0 * 0.35;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.01, now);
    // Smooth deep inhalation ramp
    breathGain.gain.linearRampToValueAtTime(0.45, now + 1.2);
    breathGain.gain.linearRampToValueAtTime(0.20, now + 1.8);
    breathGain.gain.linearRampToValueAtTime(0.01, now + 2.2);

    noise.connect(filter);
    filter.connect(breathGain);
    breathGain.connect(this.gain);
    noise.start(now);
    noise.stop(now + 2.3);

    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Vocalized "Aaaaaah..." when opening mouth for pharynx inspection
  playSayAh(durationSec = 2.0) {
    this._init();
    this.stop();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Vowel formant /a/ (F1 ~ 750 Hz, F2 ~ 1250 Hz, fundamental ~ 140 Hz)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.linearRampToValueAtTime(138, now + 1.6);

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(750, now);
    f1.Q.setValueAtTime(4.0, now);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1250, now);
    f2.Q.setValueAtTime(5.0, now);

    const vGain = ctx.createGain();
    vGain.gain.setValueAtTime(0.01, now);
    vGain.gain.linearRampToValueAtTime(0.40, now + 0.3);
    vGain.gain.linearRampToValueAtTime(0.35, now + 1.2);
    vGain.gain.linearRampToValueAtTime(0.01, now + 1.8);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(vGain);
    f2.connect(vGain);
    vGain.connect(this.gain);

    osc.start(now);
    osc.stop(now + 1.9);

    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Realistic explosive coughing fit with post-tussive gasp (no boomy 50 Hz sub-bass)
  playCoughSpasm(durationSec = 3.0) {
    this._init();
    this.stop();
    this.currentMode = 'cough';
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.85, ctx.currentTime);

    const playCoughBlast = (startTime) => {
      // 1. Explosive turbulent glottal airflow
      const bufferSize = Math.floor(ctx.sampleRate * 0.20);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(800, startTime);
      bp.Q.setValueAtTime(2.0, startTime);

      const cGain = ctx.createGain();
      cGain.gain.setValueAtTime(0.70, startTime);
      cGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);

      noise.connect(bp);
      bp.connect(cGain);
      cGain.connect(this.gain);
      noise.start(startTime);

      // Thoracic resonance (220 Hz down to 130 Hz - non-boomy)
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(220, startTime);
      thud.frequency.exponentialRampToValueAtTime(130, startTime + 0.12);
      thudGain.gain.setValueAtTime(0.40, startTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.13);
      thud.connect(thudGain);
      thudGain.connect(this.gain);
      thud.start(startTime);
      thud.stop(startTime + 0.14);
    };

    const now = ctx.currentTime;
    playCoughBlast(now);
    playCoughBlast(now + 0.32);
    playCoughBlast(now + 0.68);

    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Expiratory musical polyphonic wheeze (Asthma / Bronchospasm)
  playWheeze(durationSec = 4.0) {
    this._init();
    this.stop();
    this.currentMode = 'wheeze';
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.70, ctx.currentTime);

    const now = ctx.currentTime;
    [380, 440, 520].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscG = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + idx * 15, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.9, now + 2.5);
      oscG.gain.setValueAtTime(0.01, now);
      oscG.gain.linearRampToValueAtTime(0.22, now + 0.6);
      oscG.gain.linearRampToValueAtTime(0.01, now + 2.8);
      osc.connect(oscG);
      oscG.connect(this.gain);
      osc.start(now);
      osc.stop(now + 3.0);
    });

    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Vocalized pain gasp / groan on palpation
  playPainGroan() {
    this._init();
    this.stop();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.50, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // High-pitched inspiratory stridor (Upper airway burn edema / laryngeal obstruction)
  playStridor(durationSec = 4.0) {
    this._init();
    this.stop();
    this.currentMode = 'stridor';
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.75, ctx.currentTime);

    const playStridorBreath = () => {
      const now = ctx.currentTime;
      // Monophonic harsh high-pitched crowing tone (720-980 Hz)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.linearRampToValueAtTime(920, now + 0.7);
      osc.frequency.linearRampToValueAtTime(810, now + 1.4);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(850, now);
      filter.Q.setValueAtTime(3.5, now);

      oscGain.gain.setValueAtTime(0.01, now);
      oscGain.gain.linearRampToValueAtTime(0.35, now + 0.5);
      oscGain.gain.linearRampToValueAtTime(0.01, now + 1.5);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.gain);
      osc.start(now);
      osc.stop(now + 1.6);
    };

    playStridorBreath();
    this.intervalId = setInterval(playStridorBreath, 2600);
    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Tactile acoustic tap for radial pulse palpation
  playRadialPulse(durationSec = 3.5, bpm = 124) {
    this._init();
    this.stop();
    this.currentMode = 'pulse';
    const ctx = this.ctx;
    this.gain.gain.setValueAtTime(0.80, ctx.currentTime);
    const intervalMs = (60 / bpm) * 1000;

    const playTap = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      g.gain.setValueAtTime(0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(g);
      g.connect(this.gain);
      osc.start(now);
      osc.stop(now + 0.07);
    };

    playTap();
    this.intervalId = setInterval(playTap, intervalMs);
    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Penlight click for pupillary examination
  playPenlightClick() {
    this._init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

    g.gain.setValueAtTime(0.20, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(g);
    g.connect(this.gain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  // --------------------------------------------------------------------------
  // CONTINUOUS HOSPITAL WARD TELEMETRY & AMBIENCE (REAL-WORLD WARD SOUNDS)
  // --------------------------------------------------------------------------

  // Realistic Philips IntelliVue QRS Heartbeat Pulse Beeper
  startTelemetryTone(bpm = 124, spo2 = 88) {
    this._init();
    this.stopTelemetryTone();
    this.telemetryActive = true;
    const ctx = this.ctx;

    // Pitch correlates directly to SpO2 (e.g. 98% -> 916 Hz, 88% -> 696 Hz)
    const baseFreq = Math.max(520, Math.min(980, 520 + (spo2 - 80) * 18));
    const intervalMs = (60 / Math.max(40, Math.min(200, bpm))) * 1000;

    const playBeep = () => {
      if (!this.telemetryActive || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      // Clean 45ms telemetry pulse beep with soft attack and decay
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.08, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.050);
    };

    playBeep();
    this.telemetryIntervalId = setInterval(playBeep, intervalMs);
  }

  stopTelemetryTone() {
    this.telemetryActive = false;
    if (this.telemetryIntervalId) {
      clearInterval(this.telemetryIntervalId);
      this.telemetryIntervalId = null;
    }
  }

  // Continuous Enclosing Hospital Room Airflow / HVAC Ambience
  startWardAmbience(department = 'resus') {
    this._init();
    this.stopWardAmbience();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Filtered pink room tone (subtle air ventilation hum at 140 Hz)
    const bufferSize = ctx.sampleRate * 2.0;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0555179;
      b1 = 0.96300 * b1 + white * 0.0750759;
      b2 = 0.57000 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.025;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);

    this.ambienceGain = ctx.createGain();
    this.ambienceGain.gain.setValueAtTime(0.035, now);

    noise.connect(filter);
    filter.connect(this.ambienceGain);
    this.ambienceGain.connect(this.masterGain);
    noise.start(now);
    this.ambienceSource = noise;
  }

  stopWardAmbience() {
    if (this.ambienceSource) {
      try { this.ambienceSource.stop(); } catch { /* ignore */ }
      this.ambienceSource = null;
    }
  }

  // Continuous Oxygen Therapy Flow Hiss (15 L/min non-rebreather gas flow)
  startOxygenFlow() {
    this._init();
    this.stopOxygenFlow();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 1.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.04;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(1.2, now);

    this.o2Gain = ctx.createGain();
    this.o2Gain.gain.setValueAtTime(0.045, now);

    noise.connect(filter);
    filter.connect(this.o2Gain);
    this.o2Gain.connect(this.masterGain);
    noise.start(now);
    this.o2Source = noise;
  }

  stopOxygenFlow() {
    if (this.o2Source) {
      try { this.o2Source.stop(); } catch { /* ignore */ }
      this.o2Source = null;
    }
  }

}
