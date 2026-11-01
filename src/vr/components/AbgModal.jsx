import React, { useState } from 'react';

export const ABG_SCENARIOS = {
  sepsis_pneumonia: {
    id: 'sepsis_pneumonia',
    title: 'Severe CAP with Septic Shock (Current Patient)',
    fio2: '21% (Room Air)',
    sampleType: 'Radial Arterial Puncture',
    temperature: '39.1 °C',
    values: {
      ph: 7.28,
      pao2_kpa: 7.4,
      pao2_mmhg: 55.5,
      paco2_kpa: 4.2,
      paco2_mmhg: 31.5,
      hco3: 17.2,
      be: -7.8,
      lactate: 4.6,
      sao2: 88,
      na: 136,
      k: 4.4,
      cl: 98,
      glucose: 7.8,
    },
    interpretation: {
      primary: 'Metabolic Acidosis with Type 1 Hypoxemic Respiratory Failure',
      compensation: 'Partial respiratory compensation (hyperventilation with PaCO2 4.2 kPa)',
      oxygenation: 'Severe hypoxemia (PaO2 7.4 kPa on room air)',
      lactateNote: 'Marked lactic acidosis (4.6 mmol/L) indicating systemic tissue hypoperfusion / sepsis',
      action: 'Emergency High-Flow Oxygen (15L NRB), IV Crystalloid Fluid Resuscitation (30 mL/kg), IV Antibiotics within 1 hour (Sepsis Six)',
    },
  },
  post_oxygen: {
    id: 'post_oxygen',
    title: 'Post-Stabilization (15L High-Flow Oxygen + 1000mL IV Saline)',
    fio2: '85% (15L Non-Rebreather Mask)',
    sampleType: 'Radial Arterial Puncture',
    temperature: '38.4 °C',
    values: {
      ph: 7.36,
      pao2_kpa: 14.8,
      pao2_mmhg: 111.0,
      paco2_kpa: 4.6,
      paco2_mmhg: 34.5,
      hco3: 21.0,
      be: -3.2,
      lactate: 2.1,
      sao2: 98,
      na: 138,
      k: 4.1,
      cl: 101,
      glucose: 6.9,
    },
    interpretation: {
      primary: 'Resolving Metabolic Acidosis with Corrected Hypoxemia',
      compensation: 'Near-complete physiological compensation',
      oxygenation: 'Normoxemia restored (PaO2 14.8 kPa, SaO2 98%)',
      lactateNote: 'Lactate cleared from 4.6 to 2.1 mmol/L following fluid challenge',
      action: 'Maintain oxygen targeting 94-98%, monitor urine output, proceed to ICU / High Dependency transfer',
    },
  },
  copd_type2: {
    id: 'copd_type2',
    title: 'Acute COPD Exacerbation (Severe CO2 Retention)',
    fio2: '28% (Venturi Mask)',
    sampleType: 'Radial Arterial Puncture',
    temperature: '37.1 °C',
    values: {
      ph: 7.24,
      pao2_kpa: 7.9,
      pao2_mmhg: 59.2,
      paco2_kpa: 9.8,
      paco2_mmhg: 73.5,
      hco3: 31.4,
      be: +5.8,
      lactate: 1.4,
      sao2: 89,
      na: 139,
      k: 4.2,
      cl: 96,
      glucose: 5.6,
    },
    interpretation: {
      primary: 'Acute-on-Chronic Type 2 Respiratory Acidosis',
      compensation: 'Renal bicarbonate retention (HCO3- 31.4 mmol/L)',
      oxygenation: 'Hypoxemia with hypercapnia',
      lactateNote: 'Lactate normal (1.4 mmol/L); primary failure is ventilatory pump exhaustion',
      action: 'Target SpO2 88-92%, back-to-back bronchodilators, systemic steroids, urgent NIV (BiPAP) evaluation',
    },
  },
  dka: {
    id: 'dka',
    title: 'Diabetic Ketoacidosis (Severe High Anion Gap Metabolic Acidosis)',
    fio2: '21% (Room Air)',
    sampleType: 'Venous Blood Gas (VBG)',
    temperature: '36.8 °C',
    values: {
      ph: 7.12,
      pao2_kpa: 11.2,
      pao2_mmhg: 84.0,
      paco2_kpa: 2.8,
      paco2_mmhg: 21.0,
      hco3: 7.8,
      be: -18.4,
      lactate: 2.4,
      sao2: 97,
      na: 132,
      k: 5.8,
      cl: 96,
      glucose: 29.4,
    },
    interpretation: {
      primary: 'Severe High Anion Gap Metabolic Acidosis (HAGMA)',
      compensation: 'Maximal respiratory compensation (Kussmaul breathing blowing off CO2 to 2.8 kPa)',
      oxygenation: 'Oxygenation preserved',
      lactateNote: 'Anion Gap = (Na + K) - (Cl + HCO3) = (132 + 5.8) - (96 + 7.8) = 34 mmol/L (Severe Ketoacidosis)',
      action: 'Fixed-Rate Intravenous Insulin Infusion (0.1 units/kg/hr), Aggressive IV 0.9% NaCl resuscitation, Potassium replacement',
    },
  },
};

export function AbgModal({ isOpen, onClose, oxygenActive = false, onLogEvent }) {
  const [activeCaseKey, setActiveCaseKey] = useState(oxygenActive ? 'post_oxygen' : 'sepsis_pneumonia');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('');
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const currentCase = ABG_SCENARIOS[activeCaseKey] || ABG_SCENARIOS.sepsis_pneumonia;
  const v = currentCase.values;

  // Anion gap calculation
  const anionGap = (v.na + v.k - (v.cl + v.hco3)).toFixed(1);

  const checkAnswer = () => {
    if (!selectedDiagnosis) return;
    if (activeCaseKey === 'sepsis_pneumonia') {
      if (selectedDiagnosis === 'type1_lactic') {
        setFeedback({
          type: 'success',
          text: '✓ Correct! Severe Metabolic Lactic Acidosis (Lactate 4.6) with Type 1 Hypoxemic Respiratory Failure (PaO2 7.4 kPa). The low PaCO2 is respiratory compensation via tachypnea.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: '✗ Incorrect. Look at the Lactate (4.6) and HCO3- (17.2) indicating primary metabolic acidosis from septic hypoperfusion, and PaO2 (7.4 kPa) indicating Type 1 respiratory failure.',
        });
      }
    } else if (activeCaseKey === 'copd_type2') {
      if (selectedDiagnosis === 'copd_type2') {
        setFeedback({
          type: 'success',
          text: '✓ Correct! Acute-on-chronic Type 2 respiratory acidosis with high PaCO2 (9.8 kPa) and elevated renal bicarbonate (31.4 mmol/L). Requires controlled oxygen (88-92%) and NIV.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: '✗ Incorrect. Note the severe hypercapnia (PaCO2 9.8 kPa) with acidemia (pH 7.24) and high HCO3- indicating chronic retention.',
        });
      }
    } else if (activeCaseKey === 'dka') {
      if (selectedDiagnosis === 'dka') {
        setFeedback({
          type: 'success',
          text: `✓ Correct! Severe High Anion Gap Metabolic Acidosis (Anion Gap = ${anionGap} mmol/L) with marked Kussmaul respiratory compensation (PaCO2 2.8 kPa) and hyperglycemia.`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: '✗ Incorrect. This is severe ketoacidosis with a massive anion gap (>30) and compensatory hypocapnia.',
        });
      }
    } else {
      setFeedback({
        type: 'success',
        text: '✓ Correct! Observations demonstrate resolving acidosis and normalized oxygenation following aggressive treatment.',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="abg-title"
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
          maxWidth: '1020px',
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
            background: '#0284c7',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #0369a1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🩸</span>
            <div>
              <h2 id="abg-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                RADIOMETER ABL90 FLEX · POINT-OF-CARE BLOOD GAS ANALYZER
              </h2>
              <span style={{ fontSize: '12px', color: '#e0f2fe' }}>
                Arterial & Venous Blood Gas Diagnostic Station (ABG / VBG)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#0369a1',
              color: '#ffffff',
              border: '1px solid #38bdf8',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕ Close Station
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Patient Encounter Selector */}
          <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Select Blood Gas Case Specimen:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {Object.values(ABG_SCENARIOS).map((c) => {
                const active = activeCaseKey === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCaseKey(c.id);
                      setFeedback(null);
                      setSelectedDiagnosis('');
                      onLogEvent?.(`Loaded ABG specimen: ${c.title}`);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: active ? 700 : 500,
                      borderRadius: '4px',
                      border: active ? '2px solid #38bdf8' : '1px solid #475569',
                      background: active ? '#0369a1' : '#0f172a',
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

          {/* Grid Layout: Blood Gas Printout vs Educational Interpretation */}
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px' }}>
            {/* Left: Thermal Printout Receipt */}
            <div
              style={{
                background: '#f8fafc',
                color: '#0f172a',
                fontFamily: 'monospace',
                padding: '16px',
                borderRadius: '8px',
                border: '2px solid #cbd5e1',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #94a3b8', paddingBottom: '8px' }}>
                <b style={{ fontSize: '15px' }}>ABL90 FLEX PLUS ANALYZER</b>
                <br />
                BESTIE VIRTUAL HOSPITAL · RESUS BAY 04
                <br />
                {currentCase.sampleType.toUpperCase()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span>Patient Temp:</span>
                <b>{currentCase.temperature}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Inspired O2 (FiO2):</span>
                <b>{currentCase.fio2}</b>
              </div>

              <div style={{ borderBottom: '1px solid #cbd5e1', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>pH (7.35 - 7.45)</span>
                <b style={{ color: v.ph < 7.35 ? '#dc2626' : v.ph > 7.45 ? '#0284c7' : '#15803d' }}>
                  {v.ph.toFixed(2)} {v.ph < 7.35 ? 'L' : v.ph > 7.45 ? 'H' : ''}
                </b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PaO2 (10.0 - 14.0 kPa)</span>
                <b style={{ color: v.pao2_kpa < 10.0 ? '#dc2626' : '#15803d' }}>
                  {v.pao2_kpa.toFixed(1)} kPa ({v.pao2_mmhg.toFixed(0)} mmHg)
                </b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PaCO2 (4.5 - 6.0 kPa)</span>
                <b style={{ color: v.paco2_kpa > 6.0 || v.paco2_kpa < 4.5 ? '#dc2626' : '#15803d' }}>
                  {v.paco2_kpa.toFixed(1)} kPa ({v.paco2_mmhg.toFixed(0)} mmHg)
                </b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>HCO3- (22 - 26 mmol/L)</span>
                <b style={{ color: v.hco3 < 22 || v.hco3 > 26 ? '#dc2626' : '#15803d' }}>
                  {v.hco3.toFixed(1)} mmol/L
                </b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base Excess (-2 to +2)</span>
                <b style={{ color: Math.abs(v.be) > 2 ? '#dc2626' : '#15803d' }}>
                  {v.be > 0 ? `+${v.be.toFixed(1)}` : v.be.toFixed(1)} mmol/L
                </b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: v.lactate > 2.0 ? '#fee2e2' : 'transparent', padding: '2px 4px' }}>
                <span style={{ fontWeight: 700 }}>Lactate (&lt; 2.0 mmol/L)</span>
                <b style={{ color: v.lactate > 2.0 ? '#dc2626' : '#15803d' }}>
                  {v.lactate.toFixed(1)} mmol/L {v.lactate > 2.0 ? 'HIGH' : ''}
                </b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SaO2 (94 - 98 %)</span>
                <b>{v.sao2} %</b>
              </div>

              <div style={{ borderBottom: '1px solid #cbd5e1', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Na+ / K+</span>
                <span>{v.na} / {v.k} mmol/L</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cl- / Glucose</span>
                <span>{v.cl} / {v.glucose} mmol/L</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Calculated Anion Gap</span>
                <b>{anionGap} mmol/L (Normal 10-14)</b>
              </div>
            </div>

            {/* Right: Step-by-Step Educational Analysis & Self-Test */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 5-Step Clinical Rule Guide */}
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>
                  📚 The 5-Step Medical Student ABG Analysis Rule
                </h3>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1' }}>
                  <li>
                    <b>Step 1 — pH:</b> {v.ph < 7.35 ? 'Acidemia (< 7.35)' : v.ph > 7.45 ? 'Alkalemia (> 7.45)' : 'Normal pH range (7.35 - 7.45)'}
                  </li>
                  <li>
                    <b>Step 2 — Respiratory Driver:</b> PaCO2 is {v.paco2_kpa < 4.5 ? 'LOW (hyperventilating/blowing off acid)' : v.paco2_kpa > 6.0 ? 'HIGH (hypoventilating/retaining acid)' : 'Normal'}.
                  </li>
                  <li>
                    <b>Step 3 — Metabolic Driver:</b> HCO3- is {v.hco3 < 22 ? 'LOW (acid consumed / metabolic deficit)' : v.hco3 > 26 ? 'HIGH (metabolic retention)' : 'Normal'}.
                  </li>
                  <li>
                    <b>Step 4 — Compensation:</b> {currentCase.interpretation.compensation}.
                  </li>
                  <li>
                    <b>Step 5 — Oxygenation & Lactate:</b> PaO2 {v.pao2_kpa.toFixed(1)} kPa | Lactate {v.lactate.toFixed(1)} mmol/L.
                  </li>
                </ol>
              </div>

              {/* Interactive Self-Assessment Quiz */}
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#facc15' }}>
                  🎯 Clinical Competency Test: What is the primary diagnosis?
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {[
                    ['type1_lactic', 'Type 1 Respiratory Failure with High Lactic Metabolic Acidosis (Septic Shock)'],
                    ['copd_type2', 'Acute-on-Chronic Type 2 Respiratory Acidosis (CO2 Retention)'],
                    ['dka', 'High Anion Gap Metabolic Acidosis with Kussmaul Respiration (DKA)'],
                    ['normal', 'Normal ABG / Fully Compensated Physiology'],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: selectedDiagnosis === key ? '#0f172a' : 'transparent',
                        border: selectedDiagnosis === key ? '1px solid #38bdf8' : '1px solid transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <input
                        type="radio"
                        name="abg_diag"
                        checked={selectedDiagnosis === key}
                        onChange={() => setSelectedDiagnosis(key)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={checkAnswer}
                    disabled={!selectedDiagnosis}
                    style={{
                      padding: '8px 16px',
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: selectedDiagnosis ? 'pointer' : 'not-allowed',
                      opacity: selectedDiagnosis ? 1 : 0.6,
                    }}
                  >
                    Submit Clinical Diagnosis
                  </button>
                </div>

                {feedback && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: feedback.type === 'success' ? '#14532d' : '#7f1d1d',
                      color: '#ffffff',
                    }}
                  >
                    {feedback.text}
                  </div>
                )}
              </div>

              {/* Recommended Action Plan */}
              <div style={{ background: '#082f49', padding: '12px', borderRadius: '8px', border: '1px solid #0284c7' }}>
                <b style={{ color: '#38bdf8', fontSize: '13px' }}>📋 Immediate Medical Action:</b>
                <div style={{ fontSize: '13px', marginTop: '4px', color: '#e0f2fe' }}>
                  {currentCase.interpretation.action}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
