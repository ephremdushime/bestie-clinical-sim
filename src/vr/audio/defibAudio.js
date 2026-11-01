// Authentic Web Audio Synthesizer for Hospital Defibrillators & ALS Resuscitation.
// Synthesizes clinical capacitor charging whine, charged alarm, shock discharge thump,
// QRS sync beeps, and 110 cpm CPR compression metronome.

export class DefibrillatorAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.chargingOsc = null;
    this.chargedOsc = null;
    this.chargedGain = null;
    this.metronomeInterval = null;
    this.isCharging = false;
  }

  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Synchronized QRS Beep (pitch modulated by oxygen saturation level)
  playQrsBeep(spo2 = 98) {
    try {
      this._init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch decreases if patient is hypoxic (real hospital monitor behavior)
      const baseFreq = spo2 >= 95 ? 880 : spo2 >= 88 ? 660 : 440;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch { /* non-blocking */ }
  }

  // Capacitor Charge Sound: Rising exponential pitch (420 Hz -> 1750 Hz over 2.5s)
  startCharging(onChargedCallback) {
    try {
      this._init();
      this.stopCharging();
      this.isCharging = true;

      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // High-pass filter capacitor hum to sound metallic
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.value = 3.5;

      // Pitch rise from 420 Hz to 1750 Hz
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1750, ctx.currentTime + 2.5);
      filter.frequency.exponentialRampToValueAtTime(1750, ctx.currentTime + 2.5);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + 2.45);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.6);
      this.chargingOsc = osc;

      setTimeout(() => {
        if (this.isCharging) {
          this.playChargedContinuousTone();
          if (onChargedCallback) onChargedCallback();
        }
      }, 2500);
    } catch { /* non-blocking */ }
  }

  // Sustained continuous tone when capacitor is fully charged (Ready to Shock)
  playChargedContinuousTone() {
    try {
      this._init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1750, ctx.currentTime);

      // Subtle pulse to indicate active capacitor
      gain.gain.setValueAtTime(0.22, ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(ctx.currentTime);
      this.chargedOsc = osc;
      this.chargedGain = gain;
    } catch { /* non-blocking */ }
  }

  // Shock Discharge: Heavy electromagnetic inductive coil thump + spark snap
  playShockDischarge() {
    try {
      this.stopCharging();
      this._init();
      const ctx = this.ctx;

      // 1. Inductive Low-Frequency Thump (60 Hz decaying)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.25);

      oscGain.gain.setValueAtTime(0.7, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);

      // 2. High-Voltage Spark Snap (Filtered noise burst)
      const bufferSize = ctx.sampleRate * 0.12;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      noise.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(ctx.currentTime);
    } catch { /* non-blocking */ }
  }

  // Stop charging or disarm defibrillator
  stopCharging() {
    this.isCharging = false;
    try {
      if (this.chargedOsc) {
        this.chargedOsc.stop();
        this.chargedOsc.disconnect();
        this.chargedOsc = null;
      }
      if (this.chargingOsc) {
        this.chargingOsc.stop();
        this.chargingOsc.disconnect();
        this.chargingOsc = null;
      }
    } catch { /* ignore */ }
  }

  // Disarm click sound
  playDisarmClick() {
    this.stopCharging();
    try {
      this._init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } catch { /* ignore */ }
  }

  // CPR Compression Metronome: 110 cpm (ERC/AHA standard 100-120 compressions/min)
  startCprMetronome(bpm = 110) {
    this.stopCprMetronome();
    this._init();
    const intervalMs = (60 / bpm) * 1000;

    let beat = 0;
    const playTick = () => {
      try {
        const ctx = this.ctx;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Accent on 1st beat of every 30-compression cycle
        const isAccent = beat % 30 === 0;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1200 : 800, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(isAccent ? 0.35 : 0.20, ctx.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
        beat++;
      } catch { /* non-blocking */ }
    };

    playTick();
    this.metronomeInterval = setInterval(playTick, intervalMs);
  }

  stopCprMetronome() {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
  }

  destroy() {
    this.stopCharging();
    this.stopCprMetronome();
    if (this.ctx && this.ctx.state !== 'closed') {
      try { this.ctx.close(); } catch {}
    }
  }
}
