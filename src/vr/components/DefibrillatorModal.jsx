import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DefibrillatorAudio } from '../audio/defibAudio.js';

export const ALS_RHYTHMS = {
  sinus_tachy: {
    id: 'sinus_tachy',
    name: 'Sinus Tachycardia (124 bpm)',
    rate: 124,
    shockable: false,
    category: 'Periarrest / Baseline',
    desc: 'Regular narrow QRS with preceded P waves. Seen in severe sepsis, hypoxia, and hypovolemia.',
    drawWave: (x, offset) => {
      const rel = (x + offset) % 120;
      if (rel > 30 && rel < 42) return -6; // P wave
      if (rel >= 48 && rel < 52) return 4;  // Q wave
      if (rel >= 52 && rel < 58) return -48; // R wave spike
      if (rel >= 58 && rel < 64) return 14; // S wave
      if (rel >= 80 && rel < 100) return -12; // T wave
      return 0;
    },
  },
  vf: {
    id: 'vf',
    name: 'Coarse Ventricular Fibrillation (VF)',
    rate: 0,
    shockable: true,
    category: 'Cardiac Arrest (Shockable)',
    desc: 'Chaotic, irregular, undulating baseline without discernible QRS complexes. Immediate 200J shock required!',
    drawWave: (x, offset) => {
      const t = (x + offset) * 0.08;
      return Math.sin(t * 1.5) * 18 + Math.sin(t * 3.7) * 12 + Math.cos(t * 7.1) * 6;
    },
  },
  vt: {
    id: 'vt',
    name: 'Pulseless Ventricular Tachycardia (pVT)',
    rate: 220,
    shockable: true,
    category: 'Cardiac Arrest (Shockable)',
    desc: 'Monomorphic rapid wide-complex ventricular tachycardia. Check pulse immediately; if pulseless, deliver 200J shock.',
    drawWave: (x, offset) => {
      const rel = (x + offset) % 65;
      const rad = (rel / 65) * Math.PI * 2;
      return -Math.sin(rad) * 36;
    },
  },
  asystole: {
    id: 'asystole',
    name: 'Asystole (Ventricular Standstill)',
    rate: 0,
    shockable: false,
    category: 'Cardiac Arrest (Non-Shockable)',
    desc: 'Absence of ventricular electrical activity. DO NOT SHOCK. Immediate CPR + Adrenaline 1mg IV stat.',
    drawWave: (x, offset) => {
      // Very slight baseline somatic artifact
      return (Math.sin((x + offset) * 0.05) * 1.5) + (Math.random() * 1.2 - 0.6);
    },
  },
  pea: {
    id: 'pea',
    name: 'Pulseless Electrical Activity (PEA)',
    rate: 55,
    shockable: false,
    category: 'Cardiac Arrest (Non-Shockable)',
    desc: 'Organized QRS rhythm on monitor but NO palpable carotid pulse. DO NOT SHOCK. Identify and treat 4 Hs & 4 Ts.',
    drawWave: (x, offset) => {
      const rel = (x + offset) % 200;
      if (rel > 60 && rel < 76) return -5;
      if (rel >= 92 && rel < 98) return 5;
      if (rel >= 98 && rel < 108) return -44;
      if (rel >= 108 && rel < 118) return 12;
      if (rel >= 140 && rel < 170) return -10;
      return 0;
    },
  },
  svt: {
    id: 'svt',
    name: 'Supraventricular Tachycardia (SVT)',
    rate: 210,
    shockable: false,
    category: 'Tachyarrhythmia',
    desc: 'Rapid regular narrow-complex tachycardia without visible P waves. Vagal maneuvers / Adenosine / Synchronized Cardioversion.',
    drawWave: (x, offset) => {
      const rel = (x + offset) % 70;
      if (rel >= 20 && rel < 24) return 3;
      if (rel >= 24 && rel < 28) return -40;
      if (rel >= 28 && rel < 32) return 10;
      if (rel >= 45 && rel < 58) return -8;
      return 0;
    },
  },
  heart_block: {
    id: 'heart_block',
    name: '3rd Degree Complete Heart Block',
    rate: 34,
    shockable: false,
    category: 'Bradyarrhythmia',
    desc: 'Complete atrioventricular dissociation. P waves march independently through slow ventricular escape (34 bpm). Pacing required.',
    drawWave: (x, offset) => {
      const rel = (x + offset) % 360;
      let pWave = 0;
      // Independent P waves every 90px
      const pRel = (x + offset) % 90;
      if (pRel > 15 && pRel < 30) pWave = -8;
      // Slow wide escape QRS every 360px
      let qrs = 0;
      if (rel >= 120 && rel < 128) qrs = 6;
      else if (rel >= 128 && rel < 144) qrs = -50;
      else if (rel >= 144 && rel < 156) qrs = 16;
      else if (rel >= 180 && rel < 220) qrs = -14;
      return pWave + qrs;
    },
  },
};

export function DefibrillatorModal({
  isOpen,
  onClose,
  initialRhythm = 'sinus_tachy',
  onShockDelivered,
  onLogEvent,
}) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const [currentRhythmKey, setCurrentRhythmKey] = useState(initialRhythm);
  const [mode, setMode] = useState('MANUAL'); // 'MANUAL' | 'AED' | 'PACING'
  const [energy, setEnergy] = useState(200); // 50, 100, 150, 200 Joules
  const [chargeState, setChargeState] = useState('DISARMED'); // 'DISARMED' | 'CHARGING' | 'READY'
  const [syncCardioversion, setSyncCardioversion] = useState(false);
  const [metronomeActive, setMetronomeActive] = useState(false);

  // CPR Cycle & Drug Log
  const [cprTimer, setCprTimer] = useState(120); // 2:00 in seconds
  const [cprCycleRunning, setCprCycleRunning] = useState(false);
  const [shocksDeliveredCount, setShocksDeliveredCount] = useState(0);
  const [adrenalineDoses, setAdrenalineDoses] = useState(0);
  const [amiodaroneDoses, setAmiodaroneDoses] = useState(0);
  const [lastAdrenalineTime, setLastAdrenalineTime] = useState(null);

  // 4 H's and 4 T's Checklist State
  const [reversibleCauses, setReversibleCauses] = useState({
    hypoxia: false,
    hypovolemia: false,
    hypokalemia: false,
    hypothermia: false,
    thrombosis_coronary: false,
    thrombosis_pulmonary: false,
    tension_pneumothorax: false,
    tamponade: false,
    toxins: false,
  });

  const [clinicalFeedback, setClinicalFeedback] = useState(null);

  // Initialize Web Audio Synthesizer
  useEffect(() => {
    audioRef.current = new DefibrillatorAudio();
    return () => {
      audioRef.current?.destroy();
    };
  }, []);

  // Update rhythm if parent changes initialRhythm
  useEffect(() => {
    if (initialRhythm && ALS_RHYTHMS[initialRhythm]) {
      setCurrentRhythmKey(initialRhythm);
    }
  }, [initialRhythm]);

  // CPR 2-Minute Timer countdown
  useEffect(() => {
    let timer = null;
    if (cprCycleRunning && cprTimer > 0) {
      timer = setInterval(() => {
        setCprTimer((prev) => {
          if (prev <= 1) {
            setClinicalFeedback({
              type: 'warning',
              message: '🔔 2-Minute CPR Cycle Complete! PAUSE COMPRESSIONS: Check rhythm and pulse (< 10 seconds).',
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cprCycleRunning, cprTimer]);

  // Animated Lead II ECG on Canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId = null;
    let offset = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const rhythm = ALS_RHYTHMS[currentRhythmKey] || ALS_RHYTHMS.sinus_tachy;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Grid Lines (1mm / 5mm standard ECG paper)
      ctx.strokeStyle = '#0f291e';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 15) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Major Grid Lines (5mm)
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.2;
      for (let x = 0; x < w; x += 75) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 75) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Header Telemetry Info
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`LEAD II · 25 mm/s · 10 mm/mV · HR: ${rhythm.rate ? rhythm.rate + ' BPM' : '---'}`, 14, 26);

      if (syncCardioversion) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('⚡ SYNC ON (R-Wave Flagged)', 320, 26);
      }

      // Draw dynamic rhythm waveform
      ctx.strokeStyle = chargeState === 'READY' ? '#f59e0b' : '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const centerY = h * 0.58;
      for (let x = 0; x < w; x += 2) {
        const dy = rhythm.drawWave(x, offset);
        const y = centerY + dy;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        // Draw Sync markers over R peaks if in sync mode
        if (syncCardioversion && dy < -35 && Math.floor(x) % 10 === 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x - 2, centerY - 65, 4, 12);
        }
      }
      ctx.stroke();

      offset = (offset + 4) % 10000;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, currentRhythmKey, chargeState, syncCardioversion]);

  // Charge Capacitor
  const handleCharge = useCallback(() => {
    if (chargeState === 'CHARGING' || chargeState === 'READY') return;
    setChargeState('CHARGING');
    setClinicalFeedback({
      type: 'info',
      message: `⚡ Charging Biphasic Defibrillator to ${energy} Joules... Clear the bed!`,
    });

    audioRef.current?.startCharging(() => {
      setChargeState('READY');
      setClinicalFeedback({
        type: 'danger',
        message: `🔴 DEFIBRILLATOR CHARGED (${energy}J READY)! Stand clear of patient and oxygen sources!`,
      });
      onLogEvent?.(`Defibrillator charged to ${energy}J`);
    });
  }, [chargeState, energy, onLogEvent]);

  // Disarm Capacitor
  const handleDisarm = useCallback(() => {
    audioRef.current?.playDisarmClick();
    setChargeState('DISARMED');
    setClinicalFeedback({
      type: 'neutral',
      message: 'Capacitor safely disarmed. Energy discharged internally.',
    });
    onLogEvent?.('Defibrillator capacitor disarmed');
  }, [onLogEvent]);

  // Shock Delivery
  const handleDeliverShock = useCallback(() => {
    if (chargeState !== 'READY') return;

    audioRef.current?.playShockDischarge();
    setChargeState('DISARMED');
    const newCount = shocksDeliveredCount + 1;
    setShocksDeliveredCount(newCount);

    const rhythm = ALS_RHYTHMS[currentRhythmKey];
    if (rhythm.shockable) {
      // Correct clinical action! Convert to Sinus Rhythm (or post-arrest ROSC)
      setClinicalFeedback({
        type: 'success',
        message: `⚡ SHOCK DELIVERED (${energy}J BIPHASIC)! Rhythm converted: ROSC (Return of Spontaneous Circulation) achieved! Immediately resume CPR for 2 minutes before rhythm check.`,
      });
      setCurrentRhythmKey('sinus_tachy');
      onShockDelivered?.({
        shockNumber: newCount,
        energy,
        rhythmBefore: rhythm.id,
        rhythmAfter: 'sinus_tachy',
        success: true,
      });
      onLogEvent?.(`Shock #${newCount} (${energy}J) delivered for ${rhythm.name}: Converted to Sinus Tachycardia`);
    } else {
      // Inappropriate shock on Non-Shockable rhythm (Asystole/PEA)
      setClinicalFeedback({
        type: 'error',
        message: `⚠️ INAPPROPRIATE SHOCK DELIVERY! ${rhythm.name} is a NON-SHOCKABLE rhythm per ALS guidelines. Continue uninterrupted CPR and administer Adrenaline 1mg IV.`,
      });
      onShockDelivered?.({
        shockNumber: newCount,
        energy,
        rhythmBefore: rhythm.id,
        rhythmAfter: rhythm.id,
        success: false,
      });
      onLogEvent?.(`Inappropriate shock delivered for non-shockable rhythm ${rhythm.name}`);
    }
  }, [chargeState, currentRhythmKey, energy, onLogEvent, onShockDelivered, shocksDeliveredCount]);

  // Administer Adrenaline 1mg IV
  const handleAdministerAdrenaline = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setAdrenalineDoses((prev) => prev + 1);
    setLastAdrenalineTime(timeStr);
    setClinicalFeedback({
      type: 'info',
      message: `💉 Adrenaline 1mg (1:10,000) IV push administered with 20mL saline flush at ${timeStr}. Next dose due in 3-5 minutes.`,
    });
    onLogEvent?.(`Adrenaline 1mg IV administered (Dose #${adrenalineDoses + 1})`);
  };

  // Administer Amiodarone IV (300mg after shock 3, 150mg after shock 5)
  const handleAdministerAmiodarone = (doseMg) => {
    setAmiodaroneDoses((prev) => prev + 1);
    setClinicalFeedback({
      type: 'info',
      message: `💉 Amiodarone ${doseMg}mg IV push administered for refractory shockable rhythm.`,
    });
    onLogEvent?.(`Amiodarone ${doseMg}mg IV administered`);
  };

  // Toggle CPR Metronome
  const toggleMetronome = () => {
    if (metronomeActive) {
      audioRef.current?.stopCprMetronome();
      setMetronomeActive(false);
    } else {
      audioRef.current?.startCprMetronome(110);
      setMetronomeActive(true);
    }
  };

  // Start / Reset 2-Minute CPR Cycle
  const handleResetCprCycle = () => {
    setCprTimer(120);
    setCprCycleRunning(true);
    setClinicalFeedback({
      type: 'info',
      message: '⏱️ 2-Minute CPR Cycle Started: High-quality chest compressions (100-120/min, 5-6 cm depth, complete recoil).',
    });
  };

  if (!isOpen) return null;

  const currentRhythm = ALS_RHYTHMS[currentRhythmKey] || ALS_RHYTHMS.sinus_tachy;

  return (
    <div
      role="dialog"
      aria-labelledby="defib-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1060px',
          maxHeight: '94vh',
          background: '#0f172a',
          borderRadius: '12px',
          border: '2px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: '#b91c1c',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #7f1d1d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>⚡</span>
            <div>
              <h2 id="defib-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>
                LIFEPAK / ZOLL ADVANCED BIPHASIC DEFIBRILLATOR
              </h2>
              <span style={{ fontSize: '12px', color: '#fecaca' }}>
                Resuscitation Council (UK) / AHA Advanced Life Support (ALS) Station
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#450a0a',
              color: '#fecaca',
              border: '1px solid #991b1b',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕ Exit Console
          </button>
        </div>

        {/* Main Body */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Row: Waveform Monitor & Primary Energy Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
            {/* Left: Animated ECG Monitor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  background: '#020617',
                  borderRadius: '8px',
                  border: '2px solid #1e293b',
                  padding: '8px',
                  position: 'relative',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={220}
                  style={{ width: '100%', height: '220px', borderRadius: '4px', display: 'block' }}
                />
                {chargeState === 'READY' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '16px',
                      background: '#dc2626',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '13px',
                      animation: 'pulse 1s infinite',
                    }}
                  >
                    ⚡ READY TO SHOCK ({energy}J)
                  </div>
                )}
              </div>

              {/* Rhythm Selector Buttons (For Educational Simulation) */}
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Simulate Cardiac Rhythm Encounter:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {Object.values(ALS_RHYTHMS).map((r) => {
                    const active = currentRhythmKey === r.id;
                    const isShock = r.shockable;
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          setCurrentRhythmKey(r.id);
                          setClinicalFeedback({
                            type: 'info',
                            message: `Active Rhythm: ${r.name} (${r.category}). ${r.desc}`,
                          });
                          onLogEvent?.(`Rhythm set to: ${r.name}`);
                        }}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: active ? 700 : 500,
                          borderRadius: '4px',
                          border: active ? '2px solid #f8fafc' : '1px solid #475569',
                          background: active ? (isShock ? '#b91c1c' : '#0369a1') : '#0f172a',
                          color: '#f8fafc',
                          cursor: 'pointer',
                        }}
                      >
                        {isShock ? '⚡ ' : '🩺 '}
                        {r.name.split('(')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Defibrillator Physical Controls (Energy, Charge, Shock) */}
            <div
              style={{
                background: '#1e293b',
                borderRadius: '8px',
                border: '2px solid #334155',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Mode Selection */}
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>OPERATION MODE</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  {['MANUAL', 'AED', 'PACING'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      style={{
                        padding: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: mode === m ? '#0284c7' : '#0f172a',
                        color: '#ffffff',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy Select (Joules) */}
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
                  ENERGY SELECT (BIPHASIC JOULES)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '4px' }}>
                  {[50, 100, 150, 200].map((j) => (
                    <button
                      key={j}
                      onClick={() => {
                        setEnergy(j);
                        if (chargeState === 'READY') handleDisarm();
                      }}
                      style={{
                        padding: '8px 4px',
                        fontSize: '14px',
                        fontWeight: 800,
                        background: energy === j ? '#d97706' : '#0f172a',
                        color: '#ffffff',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {j}J
                    </button>
                  ))}
                </div>
              </div>

              {/* Synchronized Cardioversion Toggle */}
              <button
                onClick={() => setSyncCardioversion(!syncCardioversion)}
                style={{
                  padding: '8px',
                  background: syncCardioversion ? '#0284c7' : '#0f172a',
                  color: syncCardioversion ? '#ffffff' : '#94a3b8',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {syncCardioversion ? '✓ SYNC CARDIOVERSION ON' : '○ SYNC CARDIOVERSION (OFF)'}
              </button>

              {/* Charge & Shock Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                <button
                  onClick={handleCharge}
                  disabled={chargeState === 'CHARGING' || chargeState === 'READY'}
                  style={{
                    padding: '12px',
                    background: chargeState === 'READY' ? '#15803d' : '#eab308',
                    color: '#020617',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 900,
                    fontSize: '15px',
                    cursor: chargeState === 'READY' ? 'default' : 'pointer',
                  }}
                >
                  {chargeState === 'CHARGING' ? '⚡ CHARGING...' : chargeState === 'READY' ? '✓ CHARGED' : `⚡ 2. CHARGE (${energy}J)`}
                </button>

                <button
                  onClick={handleDeliverShock}
                  disabled={chargeState !== 'READY'}
                  style={{
                    padding: '14px',
                    background: chargeState === 'READY' ? '#dc2626' : '#450a0a',
                    color: '#ffffff',
                    border: '2px solid #ef4444',
                    borderRadius: '6px',
                    fontWeight: 900,
                    fontSize: '17px',
                    cursor: chargeState === 'READY' ? 'pointer' : 'not-allowed',
                    opacity: chargeState === 'READY' ? 1 : 0.6,
                    letterSpacing: '0.5px',
                  }}
                >
                  ⚡ 3. DELIVER SHOCK
                </button>

                {chargeState === 'READY' && (
                  <button
                    onClick={handleDisarm}
                    style={{
                      padding: '6px',
                      background: '#334155',
                      color: '#cbd5e1',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Disarm Energy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Feedback Banner */}
          {clinicalFeedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                background:
                  clinicalFeedback.type === 'danger' || clinicalFeedback.type === 'error'
                    ? '#7f1d1d'
                    : clinicalFeedback.type === 'success'
                    ? '#14532d'
                    : clinicalFeedback.type === 'warning'
                    ? '#78350f'
                    : '#0c4a6e',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {clinicalFeedback.message}
            </div>
          )}

          {/* Middle Row: CPR Resuscitation Cycle & Drug Protocol */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* CPR 2-Minute Timer & Metronome */}
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                  ⏱️ 2-MINUTE CPR RESUSCITATION CYCLE
                </span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: cprTimer <= 10 ? '#ef4444' : '#4ade80' }}>
                  {Math.floor(cprTimer / 60)}:{String(cprTimer % 60).padStart(2, '0')}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', background: '#0f172a', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(cprTimer / 120) * 100}%`,
                    background: cprTimer <= 15 ? '#ef4444' : '#38bdf8',
                    transition: 'width 1s linear',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={handleResetCprCycle}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🔄 Reset 2-Min Cycle
                </button>
                <button
                  onClick={toggleMetronome}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: metronomeActive ? '#15803d' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {metronomeActive ? '🔊 CPR Metronome (ON)' : '🔇 110 cpm Metronome'}
                </button>
              </div>
            </div>

            {/* Emergency ALS Resuscitation Drugs */}
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b' }}>
                💉 ALS RESUSCITATION MEDICATIONS
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={handleAdministerAdrenaline}
                  style={{
                    padding: '8px',
                    background: '#991b1b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  + Adrenaline 1mg IV ({adrenalineDoses} given)
                </button>
                <button
                  onClick={() => handleAdministerAmiodarone(shocksDeliveredCount >= 5 ? 150 : 300)}
                  style={{
                    padding: '8px',
                    background: '#7c3aed',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  + Amiodarone {shocksDeliveredCount >= 5 ? '150mg' : '300mg'} IV ({amiodaroneDoses} given)
                </button>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                • Adrenaline: Non-shockable immediately; Shockable after 3rd shock. Repeat every 3-5 min.
                <br />• Amiodarone: 300mg after 3rd shock; 150mg after 5th shock for refractory VF/pVT.
              </div>
            </div>
          </div>

          {/* Bottom Row: Reversible Causes (4 H's and 4 T's) */}
          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#a855f7' }}>
              🔍 REVERSIBLE CAUSES OF CARDIAC ARREST (4 H's & 4 T's)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '8px' }}>
              {[
                ['hypoxia', 'Hypoxia (O2 / Airway)'],
                ['hypovolemia', 'Hypovolemia (Fluids)'],
                ['hypokalemia', 'Hypo/Hyperkalemia'],
                ['hypothermia', 'Hypothermia'],
                ['tension_pneumothorax', 'Tension Pneumo'],
                ['tamponade', 'Cardiac Tamponade'],
                ['toxins', 'Toxins / Overdose'],
                ['thrombosis_pulmonary', 'Thrombosis (PE/MI)'],
              ].map(([k, label]) => {
                const checked = reversibleCauses[k];
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setReversibleCauses((prev) => ({ ...prev, [k]: !prev[k] }));
                      onLogEvent?.(`Evaluated reversible cause: ${label}`);
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      background: checked ? '#6b21a8' : '#0f172a',
                      color: checked ? '#f3e8ff' : '#94a3b8',
                      border: checked ? '1px solid #c084fc' : '1px solid #334155',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {checked ? '✓ ' : '○ '}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
