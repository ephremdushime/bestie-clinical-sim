import * as THREE from 'three';

// High-fidelity procedural hospital instruments and clinical tools.
// Built to exact medical proportions with realistic materials, PBR shaders,
// calibrated measurement dials, and authentic clinical details.

const mat = (color, rough = 0.6, metal = 0.2, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...opts });

export function makeTexture(w, h, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, canvas);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// --------------------------------------------------------------------------
// 1. ACOUSTIC CLINICAL STETHOSCOPE (Dual-head stainless steel Littmann-style)
// --------------------------------------------------------------------------
export function createRealisticStethoscope() {
  const group = new THREE.Group();

  // Stainless steel chestpiece
  const chestpieceGroup = new THREE.Group();
  
  // Tunable diaphragm side (wide, 45mm diameter -> 0.045m)
  const diaphragmBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.023, 0.021, 0.008, 32),
    mat(0xe0e0e0, 0.15, 0.95) // Polished stainless steel
  );
  chestpieceGroup.add(diaphragmBase);

  // Non-chill retaining rim (black silicone)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.023, 0.002, 12, 32),
    mat(0x1a1a1a, 0.9, 0.05)
  );
  rim.rotation.x = Math.PI / 2;
  chestpieceGroup.add(rim);

  // Diaphragm membrane (frosted semi-translucent polyester with printed logo circle)
  const membraneTex = makeTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BESTIE MED', 64, 68);
  });
  const membrane = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 32),
    new THREE.MeshStandardMaterial({ map: membraneTex, roughness: 0.3, metalness: 0.1 })
  );
  membrane.rotation.x = -Math.PI / 2;
  membrane.position.y = 0.0041;
  chestpieceGroup.add(membrane);

  // Bell side (narrow, open acoustic cone, 33mm)
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.012, 0.010, 32),
    mat(0xe0e0e0, 0.15, 0.95)
  );
  bell.position.y = -0.008;
  chestpieceGroup.add(bell);

  // Non-chill bell rubber ring
  const bellRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.016, 0.002, 12, 32),
    mat(0x1a1a1a, 0.9, 0.05)
  );
  bellRing.rotation.x = Math.PI / 2;
  bellRing.position.y = -0.013;
  chestpieceGroup.add(bellRing);

  // Stem & valve connector
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.025, 16),
    mat(0xd4d4d8, 0.15, 0.95)
  );
  stem.rotation.z = Math.PI / 2;
  stem.position.set(0.016, 0, 0);
  chestpieceGroup.add(stem);

  group.add(chestpieceGroup);

  // Flexible medical PVC tubing (Navy Blue, smooth thick lumen)
  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.028, 0, 0),
    new THREE.Vector3(0.08, 0.02, 0.05),
    new THREE.Vector3(0.12, 0.04, -0.04),
    new THREE.Vector3(0.15, 0.02, 0.02),
    new THREE.Vector3(0.18, 0.03, -0.01),
  ]);
  const tubeGeo = new THREE.TubeGeometry(tubeCurve, 32, 0.0055, 12, false);
  const tube = new THREE.Mesh(tubeGeo, mat(0x0f2a4a, 0.4, 0.1)); // Deep navy medical tubing
  group.add(tube);

  // Metal binaural headset & ear tips
  const binauralGroup = new THREE.Group();
  binauralGroup.position.set(0.18, 0.03, -0.01);

  // Y-joint connector
  const yJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.015, 12), mat(0x18181b, 0.6, 0.3));
  binauralGroup.add(yJoint);

  // Left & right stainless steel binaural tubes
  const earM = mat(0xe4e4e7, 0.2, 0.9);
  [-0.025, 0.025].forEach((offset) => {
    const eartube = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 12), earM);
    eartube.position.set(offset, 0.04, 0);
    eartube.rotation.z = offset > 0 ? -0.25 : 0.25;
    binauralGroup.add(eartube);

    // Soft-sealing silicone ear tips
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 12), mat(0x27272a, 0.8, 0.1));
    tip.position.set(offset * 1.6, 0.08, 0);
    binauralGroup.add(tip);
  });
  group.add(binauralGroup);

  group.scale.set(0.85, 0.85, 0.85);
  return group;
}

// --------------------------------------------------------------------------
// 2. FINGER PULSE OXIMETER & BEDSIDE SENSOR PROBE
// --------------------------------------------------------------------------
export function createRealisticPulseOximeter() {
  const group = new THREE.Group();

  // 1. Portable Handheld / Bedside Pulse Oximeter Unit
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.035, 0.038),
    mat(0xf8fafc, 0.3, 0.1) // Medical ABS plastic casing
  );
  group.add(body);

  // Silicone protective bumper edge (hospital cyan)
  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.037, 0.020),
    mat(0x0ea5e9, 0.7, 0.05)
  );
  bumper.position.z = -0.010;
  group.add(bumper);

  // Dual-color OLED Display Screen
  const oledTex = makeTexture(256, 160, (ctx) => {
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, 256, 160);

    // SpO2 section
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('%SpO2', 18, 30);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('88', 18, 92);

    // PR bpm section
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PR bpm', 150, 30);
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('124', 140, 92);

    // Plethysmograph Waveform schematic
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 135);
    for (let x = 10; x < 246; x += 6) {
      const ph = (x % 60);
      const dy = ph < 20 ? -(ph * 1.5) : (ph < 35 ? (ph - 20) : 0);
      ctx.lineTo(x, 135 + dy);
    }
    ctx.stroke();
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.055, 0.026),
    new THREE.MeshBasicMaterial({ map: oledTex })
  );
  screen.position.set(0, 0.018, 0);
  screen.rotation.x = -Math.PI / 2;
  group.add(screen);

  // Hinged finger probe clip on the side
  const clipGroup = new THREE.Group();
  clipGroup.position.set(0.065, 0, 0);

  // Spring-loaded upper clamp
  const topJaw = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.022), mat(0x0284c7, 0.4, 0.1));
  topJaw.position.set(0, 0.007, 0);
  clipGroup.add(topJaw);

  // Rubberized inner finger pads
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.018), mat(0x1e293b, 0.9, 0.05));
  clipGroup.add(pad);

  // Red LED emitter optical lens
  const redLed = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.002, 12), mat(0xef4444, 0.2, 0.9));
  redLed.position.set(0, 0.002, 0);
  clipGroup.add(redLed);

  group.add(clipGroup);

  return group;
}

// --------------------------------------------------------------------------
// 3. ANEROID SPHYGMOMANOMETER (Blood Pressure Cuff, Bulb & Gauge)
// --------------------------------------------------------------------------
export function createRealisticBpCuff() {
  const group = new THREE.Group();

  // 1. Arm Cuff (heavy duty woven nylon fabric with Velcro trim)
  const cuffTex = makeTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 128);
    // Index line & artery arrow
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 236, 108);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('ADULT CUFF (25-35 cm)', 24, 40);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('◀ ARTERY INDEX MARKER ▶', 24, 80);
  });
  const cuffGeo = new THREE.CylinderGeometry(0.050, 0.050, 0.14, 24, 1, true);
  const cuffMat = new THREE.MeshStandardMaterial({ map: cuffTex, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide });
  const cuff = new THREE.Mesh(cuffGeo, cuffMat);
  group.add(cuff);

  // 2. Aneroid Pressure Gauge (circular precision dial, 0-300 mmHg)
  const dialTex = makeTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(128, 128, 126, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Calibrated dial markings (20 to 300 mmHg)
    for (let deg = 40; deg <= 320; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const isMajor = deg % 20 === 0;
      const len = isMajor ? 18 : 10;
      const x1 = 128 + Math.cos(rad) * (120 - len);
      const y1 = 128 + Math.sin(rad) * (120 - len);
      const x2 = 128 + Math.cos(rad) * 120;
      const y2 = 128 + Math.sin(rad) * 120;
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('mmHg', 128, 175);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('CERTIFIED ANEROID', 128, 192);

    // Pressure needle pointing to 92 mmHg
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    const needleRad = (135 * Math.PI) / 180; // ~92 mmHg
    ctx.lineTo(128 + Math.cos(needleRad) * 95, 128 + Math.sin(needleRad) * 95);
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(128, 128, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  const gaugeCase = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 32), mat(0x0f172a, 0.2, 0.8));
  gaugeCase.rotation.x = Math.PI / 2;
  gaugeCase.position.set(0.065, 0.02, 0);

  const gaugeGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.023, 32),
    new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.1, metalness: 0.05 })
  );
  gaugeGlass.position.z = 0.007;
  gaugeCase.add(gaugeGlass);
  group.add(gaugeCase);

  // 3. Inflation Bulb & Thumbscrew Air Release Valve
  const bulbGroup = new THREE.Group();
  bulbGroup.position.set(-0.065, -0.04, 0.05);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 16, 16),
    mat(0x18181b, 0.8, 0.1) // Matte black ribbed rubber
  );
  bulb.scale.set(0.8, 1.4, 0.8);
  bulbGroup.add(bulb);

  // Chrome thumbscrew air release valve
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.015, 12), mat(0xd4d4d8, 0.1, 0.95));
  valve.position.y = 0.03;
  bulbGroup.add(valve);

  group.add(bulbGroup);

  return group;
}

// --------------------------------------------------------------------------
// 4. HIGH-FLOW NON-REBREATHER OXYGEN MASK (Clear PVC with reservoir bag)
// --------------------------------------------------------------------------
export function createRealisticOxygenMask() {
  const group = new THREE.Group();

  // Ergonomic clear medical PVC mask body
  const maskGeo = new THREE.ConeGeometry(0.045, 0.09, 24, 1, false, 0, Math.PI);
  const maskMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const mask = new THREE.Mesh(maskGeo, maskMat);
  mask.rotation.x = -Math.PI / 2;
  mask.scale.set(0.85, 1.1, 0.8);
  group.add(mask);

  // Malleable aluminum nose bridge pinch clip
  const noseClip = new THREE.Mesh(
    new THREE.BoxGeometry(0.030, 0.004, 0.002),
    mat(0xe2e8f0, 0.2, 0.9)
  );
  noseClip.position.set(0, 0.038, 0.032);
  group.add(noseClip);

  // Green elastic adjustable head strap
  const strapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.040, 0.01, 0),
    new THREE.Vector3(-0.060, 0.01, -0.06),
    new THREE.Vector3(0, 0.01, -0.09),
    new THREE.Vector3(0.060, 0.01, -0.06),
    new THREE.Vector3(0.040, 0.01, 0),
  ]);
  const strap = new THREE.Mesh(
    new THREE.TubeGeometry(strapCurve, 20, 0.002, 8, false),
    mat(0x16a34a, 0.9, 0.05) // Medical green elastic
  );
  group.add(strap);

  // Sub-chin 1-Litre Oxygen Reservoir Bag (clear vinyl)
  const bagGeo = new THREE.SphereGeometry(0.035, 16, 16);
  bagGeo.scale(0.8, 1.8, 0.35);
  const bagMat = new THREE.MeshStandardMaterial({
    color: 0xdcfce7,
    transparent: true,
    opacity: 0.65,
    roughness: 0.2,
  });
  const bag = new THREE.Mesh(bagGeo, bagMat);
  bag.position.set(0, -0.09, 0.015);
  group.add(bag);

  // Kink-resistant green oxygen supply tubing
  const o2TubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.045, 0.02),
    new THREE.Vector3(0.05, -0.15, 0.05),
    new THREE.Vector3(0.12, -0.35, 0.02),
    new THREE.Vector3(0.20, -0.65, -0.05),
  ]);
  const o2Tube = new THREE.Mesh(
    new THREE.TubeGeometry(o2TubeCurve, 24, 0.004, 10, false),
    mat(0x22c55e, 0.3, 0.1, { transparent: true, opacity: 0.75 })
  );
  group.add(o2Tube);

  return group;
}

// --------------------------------------------------------------------------
// 5. DIGITAL INFRARED TYMPANIC EAR THERMOMETER (Braun / Welch Allyn Style)
// --------------------------------------------------------------------------
export function createRealisticThermometer() {
  const group = new THREE.Group();

  // Ergonomic pistol-grip handle (Medical White ABS with Teal rubber trim)
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.12, 0.035), mat(0xffffff, 0.25, 0.05));
  handle.rotation.x = 0.2;
  group.add(handle);

  const gripTrim = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.07, 0.015), mat(0x06b6d4, 0.8, 0.05));
  gripTrim.position.set(0, -0.02, -0.012);
  handle.add(gripTrim);

  // Tapered infrared speculum probe tip
  const probe = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.035, 16), mat(0xe2e8f0, 0.15, 0.3));
  probe.rotation.x = -Math.PI / 2;
  probe.position.set(0, 0.06, 0.025);
  group.add(probe);

  // Disposable probe lens filter ring (blue)
  const filterRing = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 16), mat(0x0284c7, 0.4, 0.1));
  filterRing.rotation.x = Math.PI / 2;
  filterRing.position.set(0, 0.06, 0.015);
  group.add(filterRing);

  // Backlit LCD Display showing temperature & fever alert
  const lcdTex = makeTexture(160, 96, (ctx) => {
    ctx.fillStyle = '#ecfeff';
    ctx.fillRect(0, 0, 160, 96);
    ctx.fillStyle = '#0891b2';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('EAR · MEM', 12, 20);
    // 39.1 C High Fever
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('39.1', 12, 64);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('°C', 115, 48);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('▲ FEVER ALERT', 12, 86);
  });
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.014), new THREE.MeshBasicMaterial({ map: lcdTex }));
  lcd.position.set(0, 0.025, 0.018);
  lcd.rotation.x = 0.2;
  group.add(lcd);

  return group;
}

// 6. STAINLESS STEEL IV INFUSION POLE & SALINE BAG
// --------------------------------------------------------------------------
export function createRealisticIvPole() {
  const group = new THREE.Group();

  // 5-caster star wheeled base
  const starM = mat(0x475569, 0.3, 0.8);
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.24), starM);
    leg.position.set(Math.cos(angle) * 0.12, 0.05, Math.sin(angle) * 0.12);
    leg.rotation.y = -angle;
    group.add(leg);

    // Caster wheel
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 12), mat(0x1e293b, 0.7, 0.1));
    wheel.position.set(Math.cos(angle) * 0.22, 0.02, Math.sin(angle) * 0.22);
    group.add(wheel);
  }

  // Telescoping stainless steel pole (2.05m high)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.95, 16), mat(0xe2e8f0, 0.1, 0.95));
  pole.position.y = 1.0;
  group.add(pole);

  // Chrome pig-tail hook arms at the top
  const hookM = mat(0xf1f5f9, 0.1, 0.95);
  [-0.10, 0.10].forEach((hx) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 12), hookM);
    arm.rotation.z = hx > 0 ? -Math.PI / 4 : Math.PI / 4;
    arm.position.set(hx * 0.6, 1.94, 0);
    group.add(arm);
  });

  // Hanging 1000 mL 0.9% Sodium Chloride IV Bag
  const bagTex = makeTexture(256, 384, (ctx) => {
    ctx.fillStyle = 'rgba(235, 245, 255, 0.85)';
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 240, 368);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0.9% SODIUM CHLORIDE', 128, 60);
    ctx.font = '16px sans-serif';
    ctx.fillText('INTRAVENOUS INFUSION BP', 128, 88);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('1000 mL', 128, 150);

    // Graduation level markings
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let ml = 200; ml <= 900; ml += 100) {
      const y = 350 - (ml * 0.22);
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(60, y);
      ctx.stroke();
      ctx.font = '12px monospace';
      ctx.fillText(String(ml), 75, y + 4);
    }
  });

  const ivBag = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.26, 0.035),
    new THREE.MeshStandardMaterial({
      map: bagTex,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.05,
    })
  );
  ivBag.position.set(0.10, 1.76, 0);
  group.add(ivBag);

  // Drip chamber & roller clamp line
  const dripChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12), mat(0xe0f2fe, 0.2, 0.1, { transparent: true, opacity: 0.7 }));
  dripChamber.position.set(0.10, 1.58, 0);
  group.add(dripChamber);

  const ivLineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.10, 1.55, 0),
    new THREE.Vector3(0.12, 1.30, 0.08),
    new THREE.Vector3(0.08, 0.95, 0.12),
    new THREE.Vector3(0, 0.75, 0.15),
  ]);
  const ivLine = new THREE.Mesh(new THREE.TubeGeometry(ivLineCurve, 20, 0.0025, 8, false), mat(0xe0f2fe, 0.3, 0.1, { transparent: true, opacity: 0.6 }));
  group.add(ivLine);

  return { group };
}

// --------------------------------------------------------------------------
// 7. EMERGENCY RESUSCITATION / CRASH CART TROLLEY
// --------------------------------------------------------------------------
export function createRealisticCrashCart() {
  const group = new THREE.Group();

  // Heavy gauge red epoxy steel cart body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.70, 0.88, 0.50),
    mat(0xbe123c, 0.35, 0.25) // Emergency Signal Red
  );
  body.position.y = 0.52;
  group.add(body);

  // 4 Color-Coded Resuscitation Drawers with brushed steel pull handles
  const drawerDefs = [
    { label: 'A — AIRWAY & INTUBATION', color: '#1d4ed8', y: 0.82 },
    { label: 'B — BREATHING & ACCESSORIES', color: '#15803d', y: 0.66 },
    { label: 'C — CIRCULATION & IV ACCESS', color: '#b91c1c', y: 0.50 },
    { label: 'D — EMERGENCY MEDICATIONS', color: '#ca8a04', y: 0.34 },
  ];

  drawerDefs.forEach(({ label, color, y }) => {
    const dTex = makeTexture(384, 80, (ctx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 384, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(label, 20, 48);
    });
    const drawerFront = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.13),
      new THREE.MeshStandardMaterial({ map: dTex, roughness: 0.4 })
    );
    drawerFront.position.set(0, y, 0.252);
    group.add(drawerFront);

    // Chrome handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 12), mat(0xf1f5f9, 0.1, 0.95));
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, y, 0.265);
    group.add(handle);
  });

  // Top stainless work shelf
  const topShelf = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.03, 0.54), mat(0xe2e8f0, 0.15, 0.9));
  topShelf.position.y = 0.97;
  group.add(topShelf);

  // Top-mounted Biphasic Defibrillator Unit
  const defib = new THREE.Group();
  defib.position.set(-0.12, 1.08, 0);

  const defibBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.20, 0.24), mat(0x334155, 0.3, 0.3));
  defib.add(defibBody);

  // Defibrillator Screen (ECG rhythm & Joule energy readout)
  const defibScreenTex = makeTexture(256, 160, (ctx) => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('DEFIB · 200J BIPHASIC', 14, 28);

    // Live Ventricular Tachycardia / VF waveform schematic
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 85);
    for (let x = 10; x < 246; x += 5) {
      const dy = Math.sin(x * 0.12) * 28;
      ctx.lineTo(x, 85 + dy);
    }
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(14, 122, 100, 26);
    ctx.fillStyle = '#052e16';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('CHARGE', 36, 140);

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(142, 122, 100, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SHOCK', 168, 140);
  });
  const defibScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.15), new THREE.MeshBasicMaterial({ map: defibScreenTex }));
  defibScreen.position.set(0, 0.01, 0.121);
  defib.add(defibScreen);

  // Defibrillator paddles on side cradles
  [-0.19, 0.19].forEach((px) => {
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), mat(0xd97706, 0.5, 0.1));
    paddle.position.set(px, 0.02, 0);
    defib.add(paddle);
  });
  group.add(defib);

  // Side-mounted yellow Biohazard Sharps disposal container
  const sharps = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.22, 16), mat(0xeab308, 0.4, 0.1));
  sharps.position.set(0.42, 0.65, 0);
  group.add(sharps);
  const sharpsLid = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 16), mat(0xd97706, 0.3, 0.1));
  sharpsLid.position.set(0.42, 0.77, 0);
  group.add(sharpsLid);

  // 4 Heavy-duty swivel caster wheels
  [[-0.30, -0.20], [0.30, -0.20], [-0.30, 0.20], [0.30, 0.20]].forEach(([cx, cz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 16), mat(0x0f172a, 0.8, 0.2));
    wheel.position.set(cx, 0.045, cz);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  });

  return { group, defibScreen };
}

// --------------------------------------------------------------------------
// 8. OVERHEAD RESUSCITATION / SURGICAL SCIALYTIC LAMP
// --------------------------------------------------------------------------
export function createScialyticSurgicalLamp() {
  const group = new THREE.Group();

  // Ceiling flange mount
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.05, 24), mat(0x94a3b8, 0.2, 0.85));
  flange.position.y = 2.88;
  group.add(flange);

  // Vertical drop column
  const dropCol = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 16), mat(0xe2e8f0, 0.15, 0.95));
  dropCol.position.y = 2.65;
  group.add(dropCol);

  // Articulated dual-axis friction knuckle joint
  const joint1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), mat(0x475569, 0.3, 0.7));
  joint1.position.y = 2.40;
  group.add(joint1);

  // Horizontal cantilever boom
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.75, 16), mat(0xe2e8f0, 0.15, 0.95));
  boom.rotation.z = Math.PI / 3;
  boom.position.set(-0.32, 2.22, 0);
  group.add(boom);

  // Lamp head mounting yoke
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 12, 24, Math.PI), mat(0x475569, 0.3, 0.7));
  yoke.position.set(-0.64, 2.05, 0);
  yoke.rotation.x = Math.PI / 2;
  group.add(yoke);

  // Circular scialytic lamp satellite housing (0.58m diameter)
  const lampHead = new THREE.Group();
  lampHead.position.set(-0.64, 2.02, 0);

  const dome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.29, 0.07, 32),
    mat(0xf8fafc, 0.2, 0.1) // Medical glossy white housing
  );
  lampHead.add(dome);

  // Perimeter rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.015, 16, 32), mat(0x0ea5e9, 0.3, 0.4));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.035;
  lampHead.add(rim);

  // Central sterilizable positioning handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.10, 16), mat(0x0284c7, 0.2, 0.8));
  handle.position.y = -0.085;
  lampHead.add(handle);

  // 7 High-CRI multi-lens LED cluster modules
  const ledClusterPositions = [
    [0, 0],
    [0.17, 0],
    [-0.17, 0],
    [0.085, 0.15],
    [-0.085, 0.15],
    [0.085, -0.15],
    [-0.085, -0.15],
  ];

  ledClusterPositions.forEach(([lx, lz]) => {
    const ledLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    ledLens.position.set(lx, -0.038, lz);
    lampHead.add(ledLens);

    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.005, 12, 16), mat(0x64748b, 0.2, 0.8));
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(lx, -0.040, lz);
    lampHead.add(bezel);
  });

  group.add(lampHead);

  return { group, lampHead };
}

// --------------------------------------------------------------------------
// 9. VOLUMETRIC IV INFUSION PUMP (Alaris / Baxter Style)
// --------------------------------------------------------------------------
export function createRealisticInfusionPump() {
  const group = new THREE.Group();

  // Pump housing (hospital pale grey medical grade polymer)
  const pumpBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.11), mat(0xf1f5f9, 0.3, 0.15));
  group.add(pumpBody);

  // Pole clamp bracket on back
  const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 16), mat(0x475569, 0.2, 0.8));
  clamp.rotation.z = Math.PI / 2;
  clamp.position.set(0, 0, -0.065);
  group.add(clamp);

  // OLED Graphic Telemetry Screen
  const pumpScreenTex = makeTexture(256, 192, (ctx) => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 192);

    ctx.fillStyle = '#16a34a';
    ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ALARIS INFUSION · CH 1', 12, 22);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('INFUSION RATE', 14, 58);
    ctx.font = 'bold 36px monospace';
    ctx.fillText('125.0', 14, 98);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('mL/h', 135, 98);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('VTBI: 950 mL · VOL: 50 mL', 14, 130);
    ctx.fillText('PRESSURE: NORMAL (2.1 psi)', 14, 152);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(14, 164, 90, 20);
    ctx.fillStyle = '#052e16';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('INFUSING', 28, 178);
  });

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.115, 0.095),
    new THREE.MeshBasicMaterial({ map: pumpScreenTex })
  );
  screen.position.set(0, 0.05, 0.056);
  group.add(screen);

  // Keypad Controls
  const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.008), mat(0x334155, 0.5, 0.2));
  keypad.position.set(0, -0.065, 0.056);
  group.add(keypad);

  // Peristaltic silicone tubing guide latch
  const latch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 12), mat(0x0284c7, 0.3, 0.5));
  latch.position.set(0.062, 0, 0.035);
  group.add(latch);

  return { group, screen };
}

// --------------------------------------------------------------------------
// 10. ADVANCED ICU MECHANICAL VENTILATOR (Dräger / Hamilton Style)
// --------------------------------------------------------------------------
export function createRealisticVentilator() {
  const group = new THREE.Group();

  // Mobile stand chassis with 4 casters
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.48), mat(0x1e293b, 0.4, 0.6));
  base.position.y = 0.08;
  group.add(base);

  [[-0.20, -0.20], [0.20, -0.20], [-0.20, 0.20], [0.20, 0.20]].forEach(([cx, cz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16), mat(0x0f172a, 0.8, 0.1));
    wheel.position.set(cx, 0.04, cz);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  });

  // Vertical trolley pedestal
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 16), mat(0xe2e8f0, 0.2, 0.9));
  post.position.set(0, 0.52, 0);
  group.add(post);

  // Ventilator Main Unit Console
  const consoleBody = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.32), mat(0xf8fafc, 0.25, 0.2));
  consoleBody.position.set(0, 1.05, 0);
  group.add(consoleBody);

  // High-Resolution Touchscreen Graphic Interface
  const ventScreenTex = makeTexture(384, 288, (ctx) => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 384, 288);

    // Header: Mode & Patient
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 384, 38);
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('HAMILTON-G5 · SIMV-PC / PS', 14, 26);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(290, 8, 80, 22);
    ctx.fillStyle = '#052e16';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('VENTILATING', 296, 23);

    // Telemetry Grid
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px sans-serif'; ctx.fillText('Ppeak (cmH₂O)', 16, 62);
    ctx.font = 'bold 32px monospace'; ctx.fillText('24', 16, 96);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px sans-serif'; ctx.fillText('PEEP (cmH₂O)', 140, 62);
    ctx.font = 'bold 32px monospace'; ctx.fillText('8.0', 140, 96);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 13px sans-serif'; ctx.fillText('Vte (mL)', 260, 62);
    ctx.font = 'bold 32px monospace'; ctx.fillText('485', 260, 96);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 13px sans-serif'; ctx.fillText('f_total (/min)', 16, 128);
    ctx.font = 'bold 30px monospace'; ctx.fillText('18', 16, 158);

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 13px sans-serif'; ctx.fillText('FiO₂ (%)', 140, 128);
    ctx.font = 'bold 30px monospace'; ctx.fillText('60%', 140, 158);

    // Pressure-Time & Flow-Time Waveforms
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(14, 205);
    for (let x = 14; x < 370; x += 4) {
      const rx = (x * 0.08) % Math.PI;
      const py = Math.sin(rx) * 25;
      ctx.lineTo(x, 205 - py);
    }
    ctx.stroke();

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(14, 255);
    for (let x = 14; x < 370; x += 4) {
      const rx = (x * 0.08) % Math.PI;
      const fy = Math.cos(rx) * 18;
      ctx.lineTo(x, 255 - fy);
    }
    ctx.stroke();
  });

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.28),
    new THREE.MeshBasicMaterial({ map: ventScreenTex })
  );
  screen.position.set(0, 1.08, 0.162);
  group.add(screen);

  // Dual Inspiratory & Expiratory Gas Ports (Blue & White)
  const inspPort = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.04, 16), mat(0x0284c7, 0.3, 0.5));
  inspPort.rotation.x = Math.PI / 2;
  inspPort.position.set(-0.10, 0.88, 0.165);
  group.add(inspPort);

  const expPort = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.04, 16), mat(0xe2e8f0, 0.3, 0.5));
  expPort.rotation.x = Math.PI / 2;
  expPort.position.set(0.10, 0.88, 0.165);
  group.add(expPort);

  // Dual-Limb Corrugated Patient Breathing Circuit Tubes
  const inspCircuit = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.10, 0.88, 0.18),
    new THREE.Vector3(-0.35, 0.75, 0.45),
    new THREE.Vector3(-0.45, 0.90, 0.95),
    new THREE.Vector3(-0.12, 1.15, 1.25),
  ]);
  const inspTube = new THREE.Mesh(
    new THREE.TubeGeometry(inspCircuit, 32, 0.014, 12, false),
    mat(0x38bdf8, 0.4, 0.1, { transparent: true, opacity: 0.85 })
  );
  group.add(inspTube);

  const expCircuit = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.10, 0.88, 0.18),
    new THREE.Vector3(-0.15, 0.72, 0.45),
    new THREE.Vector3(-0.35, 0.86, 0.95),
    new THREE.Vector3(-0.08, 1.15, 1.25),
  ]);
  const expTube = new THREE.Mesh(
    new THREE.TubeGeometry(expCircuit, 32, 0.014, 12, false),
    mat(0xe2e8f0, 0.4, 0.1, { transparent: true, opacity: 0.80 })
  );
  group.add(expTube);

  return { group, screen };
}



// --------------------------------------------------------------------------
// 11. BEDSIDE MOBILE ULTRASOUND / eFAST CONSOLE (Mindray / Sonosite Style)
// --------------------------------------------------------------------------
export function createRealisticUltrasoundFast() {
  const group = new THREE.Group();

  // Mobile stand base with 4 medical casters
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), mat(0x1e293b, 0.4, 0.7));
  base.position.y = 0.08;
  group.add(base);

  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([cx, cz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), mat(0x0f172a, 0.8, 0.1));
    wheel.position.set(cx, 0.035, cz);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  });

  // Vertical telescoping height-adjustable column
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.82, 16), mat(0xe2e8f0, 0.15, 0.95));
  column.position.set(0, 0.50, 0);
  group.add(column);

  // Ultrasound Main Console Unit
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(0, 0.96, 0);

  // Lower keyboard deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.04, 0.32), mat(0xf8fafc, 0.3, 0.2));
  deck.rotation.x = 0.15;
  consoleGroup.add(deck);

  // Transducer probe holster & ultrasound gel bottle on side
  const holster = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.08, 16), mat(0x334155, 0.4, 0.5));
  holster.position.set(0.22, 0.02, 0.05);
  consoleGroup.add(holster);

  const gelBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.10, 16), mat(0x0284c7, 0.2, 0.1, { transparent: true, opacity: 0.85 }));
  gelBottle.position.set(0.22, 0.08, 0.05);
  consoleGroup.add(gelBottle);

  // Phased Array Ultrasound Transducer Probe in holster
  const probe = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.11, 0.022), mat(0xf1f5f9, 0.2, 0.6));
  probe.position.set(-0.22, 0.06, 0.05);
  consoleGroup.add(probe);

  const probeCord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.45, 12), mat(0x1e293b, 0.8, 0.1));
  probeCord.position.set(-0.22, -0.15, 0.05);
  consoleGroup.add(probeCord);

  // Upper articulating diagnostic monitor
  const monFrame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.025), mat(0x0f172a, 0.4, 0.3));
  monFrame.position.set(0, 0.20, -0.06);
  monFrame.rotation.x = -0.15;
  consoleGroup.add(monFrame);

  // High-contrast B-Mode Diagnostic Ultrasound Display (Morrison's Pouch / eFAST)
  const usTex = makeTexture(384, 288, (ctx) => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 384, 288);

    // Header
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('MINDRAY M9 · TRAUMA FAST EXAM', 12, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('PROBE: P4-2s CARDIAC/ABDO · MI: 1.1 · TIS: 0.8', 12, 40);

    // Ultrasound Sector Fan Mask
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(192, 50);
    ctx.arc(192, 50, 210, Math.PI * 0.35, Math.PI * 0.65);
    ctx.closePath();
    ctx.clip();

    // Speckled B-Mode Echogenic Anatomy (Liver & Kidney - Morrison's Pouch)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, 50, 304, 220);

    // Liver parenchyma texture
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(180, 200, 220, ${Math.random() * 0.35})`;
      ctx.fillRect(60 + Math.random() * 260, 60 + Math.random() * 100, 2, 2);
    }

    // Hyperechoic Morrison's Pouch interface line (Liver-Kidney Capsule)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, 160);
    ctx.bezierCurveTo(150, 150, 230, 175, 290, 165);
    ctx.stroke();

    // Renal parenchyma (darker cortex with bright central renal sinus)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(190, 205, 75, 40, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Central bright renal sinus
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(190, 205, 35, 15, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Clinical Finding Text Callout
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(10, 252, 364, 26);
    ctx.fillStyle = '#052e16';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText("RUQ MORRISON'S POUCH: CLEAR (NO FREE FLUID)", 18, 270);
  });

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.25),
    new THREE.MeshBasicMaterial({ map: usTex })
  );
  screen.position.set(0, 0.20, -0.046);
  screen.rotation.x = -0.15;
  screen.userData = { action: 'tool:ultrasound', label: 'Bedside eFAST Ultrasound Console' };
  consoleGroup.add(screen);

  group.add(consoleGroup);
  return { group, screen };
}

// --------------------------------------------------------------------------
// 12. WELCH ALLYN WALL-MOUNTED DIAGNOSTIC SYSTEM (Otoscope & Ophthalmoscope)
// --------------------------------------------------------------------------
export function createRealisticWallDiagnosticSet() {
  const group = new THREE.Group();

  // Transformer Wall Base Plate (Medical cream ABS)
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.05), mat(0xf1f5f9, 0.3, 0.2));
  group.add(base);

  // Welch Allyn Brand Header
  const labelTex = makeTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('WELCH ALLYN 777', 16, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('INTEGRATED WALL SYSTEM 3.5V', 16, 48);
  });
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ map: labelTex }));
  labelMesh.position.set(0, 0.07, 0.026);
  group.add(labelMesh);

  // Dual Rheostat Optical Dial Switches
  [-0.08, 0.08].forEach((rx) => {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 16), mat(0x0284c7, 0.2, 0.8));
    dial.rotation.x = Math.PI / 2;
    dial.position.set(rx, -0.02, 0.028);
    group.add(dial);

    // Chrome knurled handle resting in magnetic cradle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 16), mat(0xe2e8f0, 0.1, 0.95));
    handle.position.set(rx, -0.12, 0.035);
    group.add(handle);

    // Expanding black coiled cord
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 12), mat(0x1e293b, 0.8, 0.1));
    cord.position.set(rx, -0.32, 0.035);
    group.add(cord);
  });

  // Left Instrument Head: MacroView Otoscope (Chrome with black speculum tip)
  const otoscopeHead = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 16), mat(0xe2e8f0, 0.1, 0.95));
  otoscopeHead.position.set(-0.08, -0.02, 0.045);
  group.add(otoscopeHead);

  const speculumTip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 16), mat(0x18181b, 0.9, 0.1));
  speculumTip.position.set(-0.08, 0.015, 0.045);
  group.add(speculumTip);

  // Right Instrument Head: Coaxial Ophthalmoscope (Rectangular aperture window)
  const ophthHead = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.055, 0.028), mat(0x334155, 0.2, 0.7));
  ophthHead.position.set(0.08, -0.02, 0.045);
  group.add(ophthHead);

  const apertureLens = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 16), mat(0x38bdf8, 0.1, 0.9));
  apertureLens.rotation.x = Math.PI / 2;
  apertureLens.position.set(0.08, -0.01, 0.06);
  group.add(apertureLens);

  // Disposable ear specula dispenser tower next to wall set
  const dispenser = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 16), mat(0xe0f2fe, 0.2, 0.1, { transparent: true, opacity: 0.75 }));
  dispenser.position.set(0.24, -0.05, 0.03);
  group.add(dispenser);

  group.userData = { action: 'tool:wall_diagnostic', label: 'Welch Allyn Diagnostic Center (Otoscope & Ophthalmoscope)' };
  return { group };
}

// --------------------------------------------------------------------------
// 13. OBSTETRIC CTG CARDIOTOCOGRAPHY MONITOR (Philips Avalon FM30)
// --------------------------------------------------------------------------
export function createRealisticCtgMonitor() {
  const group = new THREE.Group();

  // Monitor main chassis
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.30, 0.22), mat(0xf8fafc, 0.3, 0.2));
  body.position.y = 0.95;
  group.add(body);

  // High-Resolution Dual CTG Waveform Display
  const ctgTex = makeTexture(384, 288, (ctx) => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 384, 288);

    // Header Bar
    ctx.fillStyle = '#db2777';
    ctx.fillRect(0, 0, 384, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('PHILIPS AVALON FM30 · MATERNAL-FETAL CTG', 12, 22);

    // Upper Graph: Fetal Heart Rate (FHR 50 - 210 bpm)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 40, 364, 115);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    [60, 90, 120, 150, 180].forEach((bpm) => {
      const y = 150 - ((bpm - 50) / 160) * 105;
      ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(374, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.fillText(String(bpm), 14, y - 2);
    });

    // FHR Waveform (Green: Baseline 140 bpm with reassuring 10-15 bpm variability & accelerations)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let x = 35; x < 370; x += 3) {
      const varOffset = (Math.sin(x * 0.25) * 4) + (Math.sin(x * 0.08) * 6);
      const accel = (x > 180 && x < 250) ? Math.sin((x - 180) / 70 * Math.PI) * 18 : 0;
      const bpm = 140 + varOffset + accel;
      const y = 150 - ((bpm - 50) / 160) * 105;
      if (x === 35) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('140', 315, 68);
    ctx.font = '11px sans-serif';
    ctx.fillText('FHR 1 (bpm)', 310, 84);

    // Lower Graph: Uterine Tocography (TOCO 0 - 100 mmHg)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 165, 364, 90);
    ctx.strokeStyle = '#475569';
    [20, 40, 60, 80].forEach((p) => {
      const y = 250 - (p / 100) * 80;
      ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(374, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.fillText(String(p), 14, y - 2);
    });

    // TOCO Contraction Wave (Orange: smooth bell curves peaking at 55 mmHg)
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 35; x < 370; x += 3) {
      const t = x % 160;
      const tocoVal = t < 80 ? 12 + Math.sin(t / 80 * Math.PI) * 45 : 12;
      const y = 250 - (tocoVal / 100) * 80;
      if (x === 35) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('18', 325, 195);
    ctx.font = '11px sans-serif';
    ctx.fillText('TOCO (mmHg)', 305, 210);

    // Status Summary Footer
    ctx.fillStyle = '#fbcfe8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CTG: REASSURING · ACCELERATIONS PRESENT · NO LATE DECELERATIONS', 14, 275);
  });

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.26),
    new THREE.MeshBasicMaterial({ map: ctgTex })
  );
  screen.position.set(0, 0.95, 0.112);
  screen.userData = { action: 'tool:ctg', label: 'Philips Avalon Fetal CTG Monitor' };
  group.add(screen);

  // Twin Ultrasound & Toco Sensor Transducer Belts hanging from side hook
  const beltHook = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 12), mat(0x94a3b8, 0.2, 0.8));
  beltHook.rotation.z = Math.PI / 2;
  beltHook.position.set(-0.20, 0.95, 0);
  group.add(beltHook);

  const usTransducer = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), mat(0x0284c7, 0.3, 0.6));
  usTransducer.position.set(-0.20, 0.82, 0.04);
  group.add(usTransducer);

  const tocoTransducer = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), mat(0xea580c, 0.3, 0.6));
  tocoTransducer.position.set(-0.20, 0.76, 0.04);
  group.add(tocoTransducer);

  return { group, screen };
}

// --------------------------------------------------------------------------
// 14. NEONATAL RADIANT INFANT WARMER (GE Giraffe / Fisher & Paykel Style)
// --------------------------------------------------------------------------
export function createRealisticInfantWarmer() {
  const group = new THREE.Group();

  // Wheeled mobile base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.70), mat(0x334155, 0.4, 0.5));
  base.position.y = 0.08;
  group.add(base);

  [[-0.24, -0.30], [0.24, -0.30], [-0.24, 0.30], [0.24, 0.30]].forEach(([cx, cz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16), mat(0x0f172a, 0.8, 0.1));
    wheel.position.set(cx, 0.04, cz);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  });

  // Vertical support arch column
  const archCol = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.75, 0.08), mat(0xe2e8f0, 0.2, 0.9));
  archCol.position.set(0, 0.92, -0.30);
  group.add(archCol);

  // Infant Bassinet Bed Platform with transparent drop walls
  const bedPlatform = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.08, 0.65), mat(0xf8fafc, 0.3, 0.2));
  bedPlatform.position.set(0, 0.88, 0.05);
  group.add(bedPlatform);

  // Soft contoured neonatal mattress & pastel swaddle blanket
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.58), mat(0xbae6fd, 0.8, 0.05));
  mattress.position.set(0, 0.93, 0.05);
  group.add(mattress);

  // Transparent acrylic perimeter safety walls
  const wallM = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.45, roughness: 0.1 });
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.015), wallM); frontWall.position.set(0, 1.02, 0.36); group.add(frontWall);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.015), wallM); backWall.position.set(0, 1.02, -0.26); group.add(backWall);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.63), wallM); leftWall.position.set(-0.24, 1.02, 0.05); group.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.63), wallM); rightWall.position.set(0.24, 1.02, 0.05); group.add(rightWall);

  // Overhead Quartz Infrared Radiant Heating Module
  const heaterHood = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.10, 0.28), mat(0xf1f5f9, 0.2, 0.8));
  heaterHood.position.set(0, 1.82, 0.05);
  group.add(heaterHood);

  // Glowing orange heating element
  const element = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.26, 16),
    new THREE.MeshBasicMaterial({ color: 0xf97316 })
  );
  element.rotation.z = Math.PI / 2;
  element.position.set(0, 1.78, 0.05);
  group.add(element);

  // Warmer Microprocessor Control Console
  const warmerTex = makeTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('INFANT WARMER · SERVO 36.5°C', 12, 24);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('36.5 °C', 12, 62);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('HEATER: 45%', 145, 58);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('APGAR TIMER: 05:00', 12, 100);
  });
  const controlMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: warmerTex }));
  controlMesh.position.set(0, 1.35, -0.24);
  group.add(controlMesh);

  group.userData = { action: 'tool:infant_warmer', label: 'Neonatal Radiant Infant Warmer' };
  return { group };
}

// --------------------------------------------------------------------------
// 15. DIAGNOSTIC RADIOLOGY DUAL-SCREEN PACS WORKSTATION (Barco / Eizo Style)
// --------------------------------------------------------------------------
export function createRealisticPacsWorkstation() {
  const group = new THREE.Group();

  // Ergonomic Radiology Workstation Desk (Matte graphite with cable raceway)
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.05, 0.75), mat(0x1e293b, 0.6, 0.2));
  desk.position.set(0, 0.75, 0);
  group.add(desk);

  // Twin Heavy-Duty Steel Desk Legs
  [-0.60, 0.60].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.73, 0.65), mat(0x0f172a, 0.4, 0.7));
    leg.position.set(lx, 0.37, 0);
    group.add(leg);
  });

  // Dual Articulating Monitor Mount Arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 16), mat(0x475569, 0.2, 0.8));
  arm.position.set(0, 0.98, -0.22);
  group.add(arm);

  // Left Diagnostic Display (Barco 5MP High-Contrast Chest X-Ray Viewer)
  const leftBezel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.03), mat(0x020617, 0.3, 0.4));
  leftBezel.position.set(-0.30, 1.15, -0.15);
  leftBezel.rotation.y = 0.08;
  group.add(leftBezel);

  const cxrTex = makeTexture(384, 512, (ctx) => {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 384, 512);

    // Header
    ctx.fillStyle = '#0284c7'; ctx.font = 'bold 14px monospace';
    ctx.fillText('BESTIE PACS · CHEST AP ERECT', 14, 24);
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px monospace';
    ctx.fillText('WINDOW: LUNG (W:1500, L:-500) · 100kV, 3.2mAs', 14, 40);

    // Grayscale Thoracic Anatomy Radiograph
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(192, 270, 140, 180, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mediastinum & Cardiac Silhouette
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.moveTo(192, 110);
    ctx.bezierCurveTo(160, 200, 110, 320, 140, 390);
    ctx.lineTo(240, 390);
    ctx.bezierCurveTo(230, 300, 210, 200, 192, 110);
    ctx.fill();

    // Diaphragms
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.arc(120, 420, 95, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(264, 430, 90, Math.PI, Math.PI * 2);
    ctx.fill();

    // Dense Right Lower Lobe Alveolar Consolidation & Air Bronchograms
    ctx.fillStyle = 'rgba(243, 244, 246, 0.88)';
    ctx.beginPath();
    ctx.ellipse(265, 330, 65, 55, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Dark patent tubular air bronchograms inside dense white consolidation
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(250, 305); ctx.lineTo(260, 345); ctx.lineTo(280, 360); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(260, 345); ctx.lineTo(250, 370); ctx.stroke();

    // Diagnostic Callout Footer
    ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 475, 364, 28);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('REPORT: RIGHT LOWER LOBE CONSOLIDATION · BACTERIAL PNEUMONIA', 16, 494);
  });

  const leftScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.51, 0.38),
    new THREE.MeshBasicMaterial({ map: cxrTex })
  );
  leftScreen.position.set(-0.30, 1.15, -0.133);
  leftScreen.rotation.y = 0.08;
  group.add(leftScreen);

  // Right Diagnostic Display (Barco 5MP Axial Trauma CT Series)
  const rightBezel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.03), mat(0x020617, 0.3, 0.4));
  rightBezel.position.set(0.30, 1.15, -0.15);
  rightBezel.rotation.y = -0.08;
  group.add(rightBezel);

  const ctTex = makeTexture(384, 512, (ctx) => {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 384, 512);

    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 14px monospace';
    ctx.fillText('BESTIE PACS · CT THORAX/ABDOMEN', 14, 24);
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px monospace';
    ctx.fillText('AXIAL CONTRAST · SLICE 48/120 · W:350, L:40', 14, 40);

    // Axial Abdominal CT Slice Oval Contour
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.ellipse(192, 260, 150, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright White Vertebral Body & Ribs (Dense Bone)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(192, 335, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Contrast-filled Aorta & Vena Cava
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(175, 310, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(205, 310, 11, 0, Math.PI * 2); ctx.fill();

    // Liver (Right Hemisphere)
    ctx.fillStyle = '#6b7280';
    ctx.beginPath(); ctx.ellipse(130, 245, 65, 45, -0.3, 0, Math.PI * 2); ctx.fill();

    // Spleen (Left Hemisphere)
    ctx.fillStyle = '#6b7280';
    ctx.beginPath(); ctx.ellipse(265, 255, 35, 25, 0.3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#22c55e'; ctx.fillRect(10, 475, 364, 28);
    ctx.fillStyle = '#052e16'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CT FINDING: SOLID ORGANS INTACT · NO HEMOPERITONEUM', 16, 494);
  });

  const rightScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.51, 0.38),
    new THREE.MeshBasicMaterial({ map: ctTex })
  );
  rightScreen.position.set(0.30, 1.15, -0.133);
  rightScreen.rotation.y = -0.08;
  group.add(rightScreen);

  // Ergonomic Radiologist High-Back Mesh Swivel Chair
  const chairGroup = new THREE.Group();
  chairGroup.position.set(0, 0, 0.45);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.42), mat(0x0f172a, 0.8, 0.1));
  seat.position.y = 0.48;
  chairGroup.add(seat);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.04), mat(0x1e293b, 0.9, 0.1));
  backrest.position.set(0, 0.74, 0.19);
  chairGroup.add(backrest);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 16), mat(0x94a3b8, 0.2, 0.9));
  pedestal.position.y = 0.24;
  chairGroup.add(pedestal);

  group.add(chairGroup);

  group.userData = { action: 'tool:pacs', label: 'PACS Diagnostic Radiology Workstation (Chest X-Ray & CT)' };
  return { group, leftScreen, rightScreen };
}

// --------------------------------------------------------------------------
// 16. EMERGENCY SURGICAL MAYO STAND & CHEST DRAIN (Atrium Ocean Style)
// --------------------------------------------------------------------------
export function createRealisticProcedureMayoStand() {
  const group = new THREE.Group();

  // Polished chrome cantilever tray over stainless base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.45), mat(0x475569, 0.2, 0.8));
  base.position.y = 0.06;
  group.add(base);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.88, 16), mat(0xe2e8f0, 0.1, 0.95));
  leg.position.set(0.20, 0.50, 0);
  group.add(leg);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.025, 0.42), mat(0xe2e8f0, 0.1, 0.95));
  tray.position.set(0, 0.94, 0);
  group.add(tray);

  // Sterile hospital teal procedure drape
  const drape = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.005, 0.40), mat(0x0d9488, 0.85, 0.05));
  drape.position.set(0, 0.954, 0);
  group.add(drape);

  // 14G Emergency Orange Decompression Cannula (for tension pneumothorax)
  const cannula = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 12), mat(0xf97316, 0.3, 0.2));
  cannula.rotation.z = Math.PI / 2;
  cannula.position.set(-0.14, 0.965, -0.08);
  group.add(cannula);

  // Stainless Steel Kelly Hemostat Forceps
  const forceps = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.14), mat(0xf1f5f9, 0.15, 0.95));
  forceps.position.set(-0.02, 0.965, -0.06);
  group.add(forceps);

  // Size 10 Scalpel Handle & Blade
  const scalpel = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.003, 0.13), mat(0xe2e8f0, 0.1, 0.98));
  scalpel.position.set(0.08, 0.965, -0.06);
  group.add(scalpel);

  // Atrium Ocean Style Underwater Seal Chest Drain Canister next to stand
  const chestDrain = new THREE.Group();
  chestDrain.position.set(0, 0.28, 0.25);

  const canisterBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.34, 0.10),
    mat(0xe0f2fe, 0.15, 0.1, { transparent: true, opacity: 0.80 })
  );
  chestDrain.add(canisterBody);

  // 3-Chamber Graphic Label (Collection, Water Seal, Suction Control)
  const drainTex = makeTexture(256, 384, (ctx) => {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('ATRIUM CHEST DRAIN', 14, 30);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('WATER SEAL DRAINAGE', 14, 52);

    // Chamber 1: Collection Chamber (Fluid Level 150 mL serosanguinous)
    ctx.fillStyle = '#dc2626'; ctx.fillRect(16, 260, 95, 90);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.fillText('150 mL', 24, 285);

    // Chamber 2: Water Seal (Blue 2cmH2O water seal column)
    ctx.fillStyle = '#0284c7'; ctx.fillRect(122, 310, 45, 40);
    ctx.fillStyle = '#ffffff'; ctx.font = '10px monospace'; ctx.fillText('2cm', 128, 330);

    // Chamber 3: Suction Control (-20 cmH2O)
    ctx.fillStyle = '#059669'; ctx.fillRect(180, 290, 60, 60);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.fillText('-20 cm', 186, 315);
  });
  const drainLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.30), new THREE.MeshBasicMaterial({ map: drainTex }));
  drainLabel.position.set(0, 0, 0.052);
  chestDrain.add(drainLabel);

  // Clear silicone chest drainage tubing connecting to canister
  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.17, 0),
    new THREE.Vector3(0.08, 0.35, 0.05),
    new THREE.Vector3(0.15, 0.55, -0.15),
  ]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(tubeCurve, 16, 0.006, 8, false), mat(0xe0f2fe, 0.2, 0.1, { transparent: true, opacity: 0.7 }));
  chestDrain.add(tube);

  group.add(chestDrain);

  group.userData = { action: 'tool:mayo_stand', label: 'Emergency Procedure Mayo Stand & Chest Drain' };
  return { group };
}
