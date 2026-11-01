import React, { useState, useEffect, useRef } from 'react';

export const ECG_12_LEAD_CASES = {
  sinus_tachy_pneumonia: {
    id: 'sinus_tachy_pneumonia',
    title: 'Current Patient: Sinus Tachycardia with P-Pulmonale',
    category: 'Severe Pneumonia / Hypoxia / Sepsis',
    heartRate: 124,
    axis: 'Normal (+60°)',
    intervals: { pr: '140 ms', qrs: '84 ms', qt: '310 ms', qtc: '445 ms' },
    findings: [
      'Sinus Tachycardia at 124 bpm',
      'Tall, peaked P-waves in Lead II (> 2.5 mm), consistent with P-pulmonale / right atrial strain from acute pulmonary disease',
      'Normal QRS morphology and axis without pathological Q-waves',
      'Non-specific sinus tachycardia with physiological ST/T wave adaptations',
    ],
    diagnosis: 'Sinus Tachycardia secondary to severe community-acquired pneumonia and septic hypoperfusion.',
    leads: {
      I: { p: 1.5, q: -1, r: 8, s: -2, st: 0, t: 3 },
      II: { p: 3.2, q: -1, r: 14, s: -3, st: 0, t: 4 }, // Tall peaked P-wave
      III: { p: 2.1, q: 0, r: 9, s: -2, st: 0, t: 2 },
      aVR: { p: -2.0, q: 1, r: -11, s: 2, st: 0, t: -3 },
      aVL: { p: 1.0, q: 0, r: 6, s: -2, st: 0, t: 2 },
      aVF: { p: 2.8, q: -1, r: 12, s: -2, st: 0, t: 3 },
      V1: { p: 1.0, q: 0, r: 4, s: -12, st: 0, t: -2 },
      V2: { p: 1.5, q: -1, r: 7, s: -10, st: 0, t: 3 },
      V3: { p: 1.8, q: -1, r: 11, s: -7, st: 0, t: 4 },
      V4: { p: 2.0, q: -1, r: 15, s: -4, st: 0, t: 4 },
      V5: { p: 1.8, q: -1, r: 14, s: -3, st: 0, t: 3 },
      V6: { p: 1.5, q: -1, r: 11, s: -2, st: 0, t: 3 },
    },
  },
  anteroseptal_stemi: {
    id: 'anteroseptal_stemi',
    title: 'Acute Anteroseptal STEMI (LAD Occlusion)',
    category: 'Acute Coronary Syndrome',
    heartRate: 98,
    axis: 'Leftward (+15°)',
    intervals: { pr: '160 ms', qrs: '92 ms', qt: '380 ms', qtc: '484 ms' },
    findings: [
      'Marked ST-elevation (4-7 mm) with convex "tombstone" morphology in leads V1, V2, V3, and V4',
      'Loss of normal R-wave progression across precordial leads',
      'Reciprocal ST-segment depression in inferior leads (II, III, aVF)',
      'Hyperacute T-waves in lateral leads V5-V6',
    ],
    diagnosis: 'Acute Anteroseptal ST-Elevation Myocardial Infarction. Urgent Primary PCI (Cath Lab activation stat).',
    leads: {
      I: { p: 1.0, q: 0, r: 9, s: -2, st: 1.5, t: 3 },
      II: { p: 1.2, q: 0, r: 7, s: -4, st: -2.0, t: -2 }, // Reciprocal depression
      III: { p: 0.8, q: 0, r: 4, s: -5, st: -2.5, t: -3 }, // Reciprocal depression
      aVR: { p: -1.0, q: 0, r: -7, s: 2, st: 1.0, t: -2 },
      aVL: { p: 1.0, q: 0, r: 8, s: -2, st: 2.0, t: 3 },
      aVF: { p: 1.0, q: 0, r: 5, s: -4, st: -2.0, t: -2 }, // Reciprocal depression
      V1: { p: 1.0, q: 0, r: 2, s: -6, st: 4.5, t: 4 },  // STEMI elevation
      V2: { p: 1.2, q: 0, r: 3, s: -4, st: 6.8, t: 6 },  // Marked tombstone elevation
      V3: { p: 1.5, q: 0, r: 5, s: -3, st: 6.2, t: 5 },  // Marked tombstone elevation
      V4: { p: 1.5, q: 0, r: 8, s: -2, st: 4.0, t: 4 },  // STEMI elevation
      V5: { p: 1.4, q: -1, r: 12, s: -2, st: 1.5, t: 4 },
      V6: { p: 1.2, q: -1, r: 10, s: -2, st: 0.5, t: 3 },
    },
  },
  pulmonary_embolism: {
    id: 'pulmonary_embolism',
    title: 'Acute Pulmonary Embolism (Classic S1Q3T3 Pattern)',
    category: 'Acute Thromboembolism / Right Heart Strain',
    heartRate: 118,
    axis: 'Right Axis Deviation (+110°)',
    intervals: { pr: '130 ms', qrs: '88 ms', qt: '320 ms', qtc: '450 ms' },
    findings: [
      'Sinus Tachycardia at 118 bpm',
      'Classic S1Q3T3 pattern (McGinn-White sign): Deep S wave in I, pathological Q wave in III, inverted T wave in III',
      'T-wave inversions in anterior/septal precordial leads (V1 to V3) indicative of acute RV strain',
      'Incomplete Right Bundle Branch Block (RBBB) pattern in V1',
    ],
    diagnosis: 'Acute Pulmonary Embolism with Right Ventricular Strain. Urgent CT Pulmonary Angiogram (CTPA) indicated.',
    leads: {
      I: { p: 1.0, q: 0, r: 5, s: -8, st: 0, t: 2 }, // Deep S in Lead I
      II: { p: 2.0, q: 0, r: 10, s: -2, st: 0, t: 3 },
      III: { p: 1.5, q: -4, r: 7, s: 0, st: 0, t: -4 }, // Q wave & T inversion in Lead III
      aVR: { p: -1.0, q: 0, r: -5, s: 3, st: 0, t: -2 },
      aVL: { p: -0.5, q: 0, r: 3, s: -7, st: 0, t: -1 },
      aVF: { p: 1.8, q: -2, r: 9, s: -1, st: 0, t: 2 },
      V1: { p: 1.0, q: 0, r: 6, s: -3, st: 0, t: -4 }, // T inversion V1
      V2: { p: 1.2, q: 0, r: 8, s: -5, st: 0, t: -5 }, // T inversion V2
      V3: { p: 1.4, q: 0, r: 9, s: -6, st: 0, t: -4 }, // T inversion V3
      V4: { p: 1.5, q: -1, r: 11, s: -4, st: 0, t: 2 },
      V5: { p: 1.4, q: -1, r: 12, s: -3, st: 0, t: 3 },
      V6: { p: 1.2, q: -1, r: 10, s: -2, st: 0, t: 2 },
    },
  },
  hyperkalemia: {
    id: 'hyperkalemia',
    title: 'Severe Hyperkalemia (Serum K+ 7.4 mmol/L)',
    category: 'Electrolyte Emergency',
    heartRate: 58,
    axis: 'Normal (+45°)',
    intervals: { pr: '220 ms (Prolonged)', qrs: '136 ms (Widened)', qt: '410 ms', qtc: '402 ms' },
    findings: [
      'Tall, narrow, peaked, symmetrical "tented" T-waves, especially prominent in V2 to V5',
      'Flattened, low-amplitude P-waves with prolonged PR interval (first degree AV block)',
      'Widened QRS complexes (> 120 ms) signaling dangerous conduction slowing',
      'Risk of impending sinusoidal rhythm and cardiac arrest!',
    ],
    diagnosis: 'Life-Threatening Hyperkalemia. Immediate IV Calcium Gluconate (10 mL 10%) for membrane stabilization + Insulin/Dextrose.',
    leads: {
      I: { p: 0.4, q: 0, r: 6, s: -2, st: 0, t: 6 },
      II: { p: 0.5, q: -1, r: 8, s: -3, st: 0, t: 9 },
      III: { p: 0.3, q: 0, r: 5, s: -2, st: 0, t: 5 },
      aVR: { p: -0.4, q: 0, r: -6, s: 2, st: 0, t: -6 },
      aVL: { p: 0.3, q: 0, r: 5, s: -2, st: 0, t: 5 },
      aVF: { p: 0.4, q: -1, r: 7, s: -2, st: 0, t: 8 },
      V1: { p: 0.2, q: 0, r: 3, s: -8, st: 0, t: 7 },
      V2: { p: 0.3, q: 0, r: 5, s: -7, st: 0, t: 16 }, // Massive tented T wave
      V3: { p: 0.4, q: 0, r: 7, s: -6, st: 0, t: 18 }, // Massive tented T wave
      V4: { p: 0.4, q: 0, r: 9, s: -4, st: 0, t: 15 }, // Massive tented T wave
      V5: { p: 0.4, q: -1, r: 10, s: -3, st: 0, t: 12 },
      V6: { p: 0.3, q: -1, r: 8, s: -2, st: 0, t: 8 },
    },
  },
};

export function Ecg12LeadModal({ isOpen, onClose, onLogEvent }) {
  const [activeCaseKey, setActiveCaseKey] = useState('sinus_tachy_pneumonia');
  const [selectedInterpretation, setSelectedInterpretation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showMeasurements, setShowMeasurements] = useState(true);

  if (!isOpen) return null;

  const currentCase = ECG_12_LEAD_CASES[activeCaseKey] || ECG_12_LEAD_CASES.sinus_tachy_pneumonia;

  const LEAD_ORDER = [
    ['I', 'aVR', 'V1', 'V4'],
    ['II', 'aVL', 'V2', 'V5'],
    ['III', 'aVF', 'V3', 'V6'],
  ];

  const renderSingleLeadCanvas = (leadName, leadParams, width = 190, height = 95) => {
    // Generate synthetic Lead Waveform
    return (
      <div
        key={leadName}
        style={{
          position: 'relative',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '4px',
          overflow: 'hidden',
          height: `${height}px`,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '4px',
            left: '6px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#991b1b',
            fontFamily: 'monospace',
          }}
        >
          {leadName}
        </span>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            {/* 1mm / 5mm ECG grid */}
            <pattern id={`ecg-grid-${leadName}`} width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#fecaca" strokeWidth="0.5" />
            </pattern>
            <pattern id={`ecg-grid-major-${leadName}`} width="25" height="25" patternUnits="userSpaceOnUse">
              <rect width="25" height="25" fill={`url(#ecg-grid-${leadName})`} />
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#f87171" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill={`url(#ecg-grid-major-${leadName})`} />

          {/* Baseline ECG Trace */}
          <path
            d={generateEcgPath(width, height, leadParams, currentCase.heartRate)}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  };

  const generateEcgPath = (w, h, p, hr) => {
    const cycleWidth = Math.max(45, (60 / hr) * 120);
    const baselineY = h * 0.58;
    let d = `M 0 ${baselineY}`;

    for (let startX = 0; startX < w + cycleWidth; startX += cycleWidth) {
      const pY = baselineY - (p.p * 2.2);
      const qY = baselineY - (p.q * 2.2);
      const rY = baselineY - (p.r * 2.2);
      const sY = baselineY - (p.s * 2.2);
      const stY = baselineY - (p.st * 2.2);
      const tY = baselineY - (p.t * 2.2);

      // P wave
      d += ` L ${startX + 8} ${baselineY}`;
      d += ` Q ${startX + 14} ${pY} ${startX + 20} ${baselineY}`;
      // PR segment
      d += ` L ${startX + 28} ${baselineY}`;
      // Q wave
      d += ` L ${startX + 30} ${qY}`;
      // R spike
      d += ` L ${startX + 33} ${rY}`;
      // S wave
      d += ` L ${startX + 36} ${sY}`;
      // ST segment
      d += ` L ${startX + 42} ${stY}`;
      // T wave
      d += ` Q ${startX + 52} ${tY} ${startX + 62} ${baselineY}`;
      // Isoelectric line to end of beat
      d += ` L ${startX + cycleWidth} ${baselineY}`;
    }
    return d;
  };

  const evaluateAnswer = () => {
    if (!selectedInterpretation) return;
    if (activeCaseKey === 'sinus_tachy_pneumonia') {
      if (selectedInterpretation === 'sinus_tachy') {
        setFeedback({
          type: 'success',
          text: '✓ Correct! Sinus Tachycardia (124 bpm) with prominent P-pulmonale in Lead II (> 2.5 mm). Secondary to severe acute pneumonia and hypoxia.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: '✗ Incorrect. Note the regular rhythm, rate 124 bpm, preceded by peaked P waves in Lead II without ischemic ST elevation.',
        });
      }
    } else if (activeCaseKey === 'anteroseptal_stemi') {
      if (selectedInterpretation === 'stemi') {
        setFeedback({
          type: 'success',
          text: '✓ Correct! Acute Anteroseptal STEMI with tombstone ST-segment elevation in V1-V4 and reciprocal inferior depression. Immediate Cath Lab activation!',
        });
      } else {
        setFeedback({
          type: 'error',
          text: '✗ Incorrect. Look at the dramatic 4-7mm ST elevation in precordial leads V1 through V4.',
        });
      }
    } else if (activeCaseKey === 'pulmonary_embolism') {
      if (selectedInterpretation === 'pe') {
        setFeedback({
          type: 'success',
          text: '✓ Correct! Classic S1Q3T3 pattern with T-wave inversions in V1-V3 indicative of acute right ventricular strain in pulmonary embolism.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: '✗ Incorrect. Notice the deep S in I, Q in III, inverted T in III (S1Q3T3) and RV strain in anterior leads.',
        });
      }
    } else if (activeCaseKey === 'hyperkalemia') {
      if (selectedInterpretation === 'hyperkalemia') {
        setFeedback({
          type: 'success',
          text: '✓ Correct! Severe Hyperkalemia with tall, peaked, tented T-waves and widened QRS. Requires emergency IV Calcium Gluconate!',
        });
      } else {
        setFeedback({
          type: 'error',
          text: '✗ Incorrect. Look at the symmetrical, peaked, narrow "tented" T waves across V2-V5 with broadened QRS.',
        });
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="ecg-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.90)',
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
          maxWidth: '1120px',
          maxHeight: '96vh',
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
            borderBottom: '2px solid #991b1b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📈</span>
            <div>
              <h2 id="ecg-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                SCHILLER CARDIOVIT · 12-LEAD DIAGNOSTIC ELECTROCARDIOGRAM (ECG)
              </h2>
              <span style={{ fontSize: '12px', color: '#fecaca' }}>
                Standard 25 mm/s · 10 mm/mV Calibration · Limb & Precordial Leads
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#450a0a',
              color: '#fecaca',
              border: '1px solid #ef4444',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕ Close ECG
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Case Selector Tabs */}
          <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Select 12-Lead ECG Tracing:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {Object.values(ECG_12_LEAD_CASES).map((c) => {
                const active = activeCaseKey === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCaseKey(c.id);
                      setFeedback(null);
                      setSelectedInterpretation('');
                      onLogEvent?.(`Viewed 12-lead ECG: ${c.title}`);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: active ? 700 : 500,
                      borderRadius: '4px',
                      border: active ? '2px solid #ef4444' : '1px solid #475569',
                      background: active ? '#991b1b' : '#0f172a',
                      color: '#f8fafc',
                      cursor: 'pointer',
                    }}
                  >
                    {active ? '✓ ' : ''}{c.title.split('(')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard 12-Lead Paper Layout (3 Rows x 4 Columns) */}
          <div
            style={{
              background: '#fef2f2',
              borderRadius: '8px',
              border: '2px solid #ef4444',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {/* Header Data on ECG Paper */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#7f1d1d',
                fontWeight: 700,
                borderBottom: '1px solid #fca5a5',
                paddingBottom: '4px',
              }}
            >
              <span>BESTIE VIRTUAL HOSPITAL · EMERGENCY RESUS BAY 04</span>
              <span>RATE: {currentCase.heartRate} BPM | AXIS: {currentCase.axis}</span>
              <span>SPEED: 25 mm/s | VOLTAGE: 10 mm/mV</span>
            </div>

            {/* 3x4 Grid of Leads */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {LEAD_ORDER.flat().map((leadName) => {
                const leadParams = currentCase.leads[leadName] || { p: 1, q: 0, r: 8, s: -2, st: 0, t: 3 };
                return renderSingleLeadCanvas(leadName, leadParams, 250, 85);
              })}
            </div>

            {/* Continuous Lead II Rhythm Strip at bottom */}
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b', fontFamily: 'monospace' }}>
                CONTINUOUS RHYTHM STRIP: LEAD II (10 SECONDS)
              </span>
              <div style={{ height: '70px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #fca5a5' }}>
                <svg width="100%" height="100%" viewBox="0 0 1050 70">
                  <rect width="1050" height="70" fill="url(#ecg-grid-major-II)" />
                  <path
                    d={generateEcgPath(1050, 70, currentCase.leads.II, currentCase.heartRate)}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Measurements & Clinical Teaching Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Left: Caliper Measurements & Structured Interpretation */}
            <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#38bdf8' }}>
                  📐 Automated Caliper Measurements & Intervals
                </h3>
                <button
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    background: '#334155',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {showMeasurements ? 'Hide' : 'Show'}
                </button>
              </div>

              {showMeasurements && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px' }}>
                  <div style={{ background: '#0f172a', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>PR Interval</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>{currentCase.intervals.pr}</div>
                  </div>
                  <div style={{ background: '#0f172a', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>QRS Width</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>{currentCase.intervals.qrs}</div>
                  </div>
                  <div style={{ background: '#0f172a', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>QT Interval</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>{currentCase.intervals.qt}</div>
                  </div>
                  <div style={{ background: '#0f172a', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>QTc (Bazett)</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>{currentCase.intervals.qtc}</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <b style={{ fontSize: '13px', color: '#f59e0b' }}>Diagnostic Findings:</b>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', lineHeight: 1.6, color: '#cbd5e1' }}>
                  {currentCase.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Medical Student Interpretation Self-Assessment */}
            <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#facc15' }}>
                🎯 OSCE ECG Question: What is the primary diagnosis?
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {[
                  ['sinus_tachy', 'Sinus Tachycardia with P-Pulmonale (Severe Respiratory Sepsis / Hypoxia)'],
                  ['stemi', 'Acute Anteroseptal STEMI (LAD Occlusion requiring immediate PCI)'],
                  ['pe', 'Acute Pulmonary Embolism (S1Q3T3 Pattern with RV Strain)'],
                  ['hyperkalemia', 'Severe Hyperkalemia (Tall Tented T-Waves + Widened QRS)'],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: selectedInterpretation === key ? '#0f172a' : 'transparent',
                      border: selectedInterpretation === key ? '1px solid #ef4444' : '1px solid transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    <input
                      type="radio"
                      name="ecg_diag"
                      checked={selectedInterpretation === key}
                      onChange={() => setSelectedInterpretation(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={evaluateAnswer}
                  disabled={!selectedInterpretation}
                  style={{
                    padding: '8px 16px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: selectedInterpretation ? 'pointer' : 'not-allowed',
                    opacity: selectedInterpretation ? 1 : 0.6,
                  }}
                >
                  Confirm ECG Diagnosis
                </button>
              </div>

              {feedback && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: feedback.type === 'success' ? '#14532d' : '#7f1d1d',
                    color: '#ffffff',
                  }}
                >
                  {feedback.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

