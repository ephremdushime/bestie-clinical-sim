import React, { useState } from 'react';

export function SbarHandoverModal({
  isOpen,
  onClose,
  patientData = {},
  vitals = {},
  oxygenActive = false,
  onLogEvent,
  voiceController,
}) {
  const [situation, setSituation] = useState(
    'Hello, this is the student doctor caring for John Smith, a 48-year-old male in Resus Bay 04. I am calling because he is acutely deteriorating with severe respiratory distress, a NEWS2 score of 11, and signs of septic shock.'
  );
  const [background, setBackground] = useState(
    'He presented with a 4-day history of worsening productive cough with rusty sputum, high fever, and right-sided pleuritic chest pain. He has no significant past medical history, takes no regular medications, and has a DOCUMENTED SEVERE ALLERGY TO PENICILLIN (anaphylaxis).'
  );
  const [assessment, setAssessment] = useState(
    `On ABCDE assessment: Airway is patent. Breathing: RR 32/min, initial SpO2 was 88% on room air, improving to ${oxygenActive ? '96%' : '88%'} on ${oxygenActive ? '15L non-rebreather oxygen' : 'room air'}. Auscultation reveals coarse inspiratory crackles and bronchial breath sounds at the right lower lobe base. Circulation: Tachycardic at ${vitals.hr || 124} bpm, BP ${vitals.sbp || 92}/${vitals.dbp || 58} mmHg, core temp 39.1°C. ABG confirms Type 1 respiratory failure with a metabolic lactic acidosis (Lactate 4.6 mmol/L). 20G IV access secured, and 500mL 0.9% Normal Saline fluid bolus is running.`
  );
  const [recommendation, setRecommendation] = useState(
    'I recommend an immediate senior review in Resus Bay 04 within 15 minutes. I would like your guidance on non-penicillin antimicrobial selection (e.g. IV Levofloxacin / Clarithromycin), and an urgent referral to Intensive Care for High-Flow Nasal Cannula (HFNC) or critical care admission.'
  );

  const [handoverSubmitted, setHandoverSubmitted] = useState(false);
  const [scoreReport, setScoreReport] = useState(null);
  const [seniorResponse, setSeniorResponse] = useState(null);

  if (!isOpen) return null;

  const handleSubmitHandover = async () => {
    // Objective clinical assessment against GMC / UKMLA / USMLE communication rubric
    let score = 0;
    const checks = [];

    // Situation checks
    const sLower = situation.toLowerCase();
    if (sLower.includes('john') || sLower.includes('smith') || sLower.includes('patient') || sLower.includes('48')) {
      score += 15;
      checks.push('✓ Correct Patient Identification & Location (Resus Bay 04)');
    } else {
      checks.push('✗ Missing explicit patient name/demographics in Situation');
    }
    if (sLower.includes('news') || sLower.includes('11') || sLower.includes('deteriorat') || sLower.includes('respiratory') || sLower.includes('shock')) {
      score += 10;
      checks.push('✓ Clear clinical reason for urgent escalation stated');
    }

    // Background checks
    const bLower = background.toLowerCase();
    if (bLower.includes('cough') || bLower.includes('fever') || bLower.includes('pleuritic') || bLower.includes('pneumonia') || bLower.includes('sputum')) {
      score += 15;
      checks.push('✓ Relevant presenting history and duration covered');
    }
    if (bLower.includes('allergy') || bLower.includes('penicillin')) {
      score += 15;
      checks.push('✓ CRITICAL SAFETY: Documented Penicillin allergy highlighted');
    } else {
      checks.push('⚠️ CAUTION: Failed to highlight patient penicillin allergy');
    }

    // Assessment checks
    const aLower = assessment.toLowerCase();
    if (aLower.includes('rr') || aLower.includes('32') || aLower.includes('crackles') || aLower.includes('breathing')) {
      score += 15;
      checks.push('✓ Respiratory exam & oxygen saturation reported');
    }
    if (aLower.includes('bp') || aLower.includes('hr') || aLower.includes('lactate') || aLower.includes('fluids') || aLower.includes('tachycard')) {
      score += 15;
      checks.push('✓ Hemodynamic stability, lactate, and fluid status detailed');
    }

    // Recommendation checks
    const rLower = recommendation.toLowerCase();
    if (rLower.includes('review') || rLower.includes('come') || rLower.includes('15') || rLower.includes('urgent') || rLower.includes('senior')) {
      score += 10;
      checks.push('✓ Time-critical request for immediate bedside senior review');
    }
    if (rLower.includes('icu') || rLower.includes('antibiotic') || rLower.includes('antimicrobial') || rLower.includes('referral') || rLower.includes('hfnc')) {
      score += 5;
      checks.push('✓ Specific management decisions & escalation targets requested');
    }

    const seniorSpokenText =
      "Thank you for that excellent and structured SBAR handover, Doctor. You recognized the severity of his sepsis and pneumonia early. Given his documented penicillin allergy, please prescribe IV Levofloxacin 500mg and IV Clarithromycin 500mg stat instead of co-amoxiclav. Continue the crystalloid fluid challenge and keep him on high-flow oxygen. I am on my way to Resus Bay 04 right now and I will contact the ICU registrar for a critical care bed.";

    setScoreReport({
      totalScore: score,
      maxScore: 100,
      checks,
    });
    setSeniorResponse(seniorSpokenText);
    setHandoverSubmitted(true);

    onLogEvent?.(`Completed SBAR Handover (Score: ${score}/100)`);

    // Senior clinician voice synthesis
    if (voiceController) {
      voiceController.respond(seniorSpokenText, 'white-male');
    } else if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(seniorSpokenText);
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="sbar-title"
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
            background: '#059669',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #047857',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            <div>
              <h2 id="sbar-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                STRUCTURED SBAR CLINICAL HANDOVER & EHR WORKSTATION
              </h2>
              <span style={{ fontSize: '12px', color: '#d1fae5' }}>
                Situation · Background · Assessment · Recommendation (GMC & OSCE Standard)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#064e3b',
              color: '#d1fae5',
              border: '1px solid #10b981',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕ Close Handover
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!handoverSubmitted ? (
            <>
              {/* Situation */}
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ color: '#38bdf8', fontSize: '14px' }}>S — SITUATION (Who, Where, Acute Reason for Escalation)</b>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>State your name, patient identity, location & NEWS2 score</span>
                </div>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Background */}
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ color: '#facc15', fontSize: '14px' }}>B — BACKGROUND (Clinical History & Allergies)</b>
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>Must include Penicillin allergy alert!</span>
                </div>
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Assessment */}
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ color: '#4ade80', fontSize: '14px' }}>A — ASSESSMENT (ABCDE Findings, Observations & Investigations)</b>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Vitals, auscultation, ABG results, fluids initiated</span>
                </div>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Recommendation */}
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ color: '#c084fc', fontSize: '14px' }}>R — RECOMMENDATION (Explicit Clinical Request)</b>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Urgent review timeframe, antibiotics, ICU bed request</span>
                </div>
                <textarea
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={handleSubmitHandover}
                  style={{
                    padding: '12px 24px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
                  }}
                >
                  📞 Deliver SBAR Handover to Senior Registrar (Audio Call)
                </button>
              </div>
            </>
          ) : (
            /* Post-Submission Assessment Report */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Score Header */}
              <div
                style={{
                  background: '#064e3b',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#6ee7b7' }}>
                    🏆 SBAR Clinical Handover Competency Score
                  </h3>
                  <span style={{ fontSize: '13px', color: '#a7f3d0' }}>
                    Evaluated against UKMLA / USMLE OSCE Handover Rubric
                  </span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#34d399' }}>
                  {scoreReport.totalScore} / {scoreReport.maxScore}
                </div>
              </div>

              {/* Senior Clinician Audio Response */}
              <div style={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '20px' }}>👨‍⚕️</span>
                  <b style={{ color: '#38bdf8', fontSize: '15px' }}>
                    Senior Registrar (Dr. Michael) Verbal Response:
                  </b>
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#f8fafc', fontStyle: 'italic' }}>
                  "{seniorResponse}"
                </p>
              </div>

              {/* Rubric Breakdown */}
              <div style={{ background: '#1e293b', borderRadius: '8px', padding: '14px', border: '1px solid #334155' }}>
                <b style={{ color: '#facc15', fontSize: '14px' }}>Rubric Component Analysis:</b>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                  {scoreReport.checks.map((chk, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: chk.startsWith('✓') ? '#064e3b' : '#7f1d1d',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {chk}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => setHandoverSubmitted(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Edit Handover
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 18px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✓ Return to Patient Bay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

