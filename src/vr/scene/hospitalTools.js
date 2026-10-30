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


