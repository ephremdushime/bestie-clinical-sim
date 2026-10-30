import * as THREE from 'three';
import { buildRealisticPatient } from './patientModel.js';
import {
  makeTexture,
  createRealisticStethoscope,
  createRealisticPulseOximeter,
  createRealisticBpCuff,
  createRealisticOxygenMask,
  createRealisticThermometer,
  createRealisticIvPole,
  createRealisticCrashCart,
  createScialyticSurgicalLamp,
  createRealisticInfusionPump,
  createRealisticVentilator,
  createRealisticUltrasoundFast,
  createRealisticWallDiagnosticSet,
  createRealisticCtgMonitor,
  createRealisticInfantWarmer,
  createRealisticPacsWorkstation,
  createRealisticProcedureMayoStand,
} from './hospitalTools.js';
import { createClinicalStaffMember } from './clinicalStaff.js';

const mat = (color, rough = 0.5, metal = 0.2, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...opts });
const box = (w, h, d, m) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

export function makeCanvasTexture(w, h) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { canvas, ctx: canvas.getContext('2d'), tex };
}

// --------------------------------------------------------------------------
// AUTHENTIC MULTI-DEPARTMENT VIRTUAL TEACHING HOSPITAL WARD
// Supports: 'resus' (Emergency Resuscitation Bay), 'medical' (Acute Medical Ward), 'icu' (Intensive Care)
// --------------------------------------------------------------------------
export function buildRoom(initialPhenotype = 'black-male', department = 'resus') {
  const root = new THREE.Group();
  const interactables = [];
  const staffMembers = [];

  // 1. HOSPITAL ILLUMINATION & DIRECTIONAL SHADOW CASTERS
  root.add(new THREE.HemisphereLight(0xf8fafc, 0x64748b, 0.95));

  // Key Clinical Ceiling Light (casts soft shadows onto bed and floor)
  const mainKey = new THREE.DirectionalLight(0xffffff, 2.2);
  mainKey.position.set(0.6, 2.8, -0.4);
  mainKey.castShadow = true;
  mainKey.shadow.mapSize.width = 2048;
  mainKey.shadow.mapSize.height = 2048;
  mainKey.shadow.camera.near = 0.1;
  mainKey.shadow.camera.far = 8.0;
  mainKey.shadow.camera.left = -2.5;
  mainKey.shadow.camera.right = 2.5;
  mainKey.shadow.camera.top = 2.5;
  mainKey.shadow.camera.bottom = -2.5;
  mainKey.shadow.bias = -0.0005;
  root.add(mainKey);

  // Soft bedside examination spotlight
  const examSpot = new THREE.SpotLight(0xfffbeb, 4.5, 6.0, Math.PI / 4, 0.45, 1.2);
  examSpot.position.set(0, 2.75, -1.4);
  examSpot.target.position.set(0, 0.85, -1.4);
  examSpot.castShadow = true;
  root.add(examSpot);
  root.add(examSpot.target);

  // 2. HIGH-GLOSS ANTI-MICROBIAL VINYL FLOORING
  const floorTex = makeTexture(1024, 1024, (ctx) => {
    // Medical vinyl base
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine aggregate safety vinyl flecks
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < 6000; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3500; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1.5, 1.5);
    }

    // 1m sanitised welded vinyl seam borders
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 1024, 1024);
  });
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, 4);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 6.6),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.18, // High specular gloss reflection of ceiling lights & bed
      metalness: 0.08,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Coved sanitised wall skirting around perimeter
  const skirtingM = mat(0x475569, 0.3, 0.2);
  const skirtNorth = box(6.6, 0.14, 0.04, skirtingM); skirtNorth.position.set(0, 0.07, -3.28); root.add(skirtNorth);
  const skirtSouth = box(6.6, 0.14, 0.04, skirtingM); skirtSouth.position.set(0, 0.07, 3.28); root.add(skirtSouth);
  const skirtWest = box(0.04, 0.14, 6.6, skirtingM); skirtWest.position.set(-3.28, 0.07, 0); root.add(skirtWest);
  const skirtEast = box(0.04, 0.14, 6.6, skirtingM); skirtEast.position.set(3.28, 0.07, 0); root.add(skirtEast);

  // 3. ARCHITECTURAL WALLS & EXTRUDED 3D IMPACT BUMPER RAILS
  const wallM = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.65,
    metalness: 0.02,
  });

  [[0, 1.45, -3.3, 0], [0, 1.45, 3.3, Math.PI], [-3.3, 1.45, 0, Math.PI / 2], [3.3, 1.45, 0, -Math.PI / 2]].forEach(([x, y, z, r]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.9), wallM);
    w.position.set(x, y, z);
    w.rotation.y = r;
    w.receiveShadow = true;
    root.add(w);
  });

  // Physical 3D Extruded Medical Crash Rails (Continuous along walls at 0.95m height)
  const railBackingM = mat(0x94a3b8, 0.2, 0.8); // Brushed aluminum channel
  const railBufferM = mat(0x0f766e, 0.4, 0.1);  // Durable antimicrobial teal impact rubber

  function addWallBumperRail(x, z, length, isHorizontal = true) {
    const bumperG = new THREE.Group();
    // Aluminum backplate
    const backplate = isHorizontal
      ? box(length, 0.14, 0.025, railBackingM)
      : box(0.025, 0.14, length, railBackingM);
    bumperG.add(backplate);
    // Extruded rubber impact buffer
    const rubber = isHorizontal
      ? box(length, 0.08, 0.035, railBufferM)
      : box(0.035, 0.08, length, railBufferM);
    rubber.position.set(0, 0, isHorizontal ? (z < 0 ? 0.015 : -0.015) : (x < 0 ? 0.015 : -0.015));
    bumperG.add(rubber);

    bumperG.position.set(x, 0.95, z);
    root.add(bumperG);
  }

  addWallBumperRail(0, -3.27, 6.5, true);  // North wall
  addWallBumperRail(0, 3.27, 6.5, true);   // South wall
  addWallBumperRail(-3.27, 0, 6.5, false); // West wall
  addWallBumperRail(3.27, 0, 6.5, false);  // East wall

  // 4. ARCHITECTURAL DEEP DOOR FRAME & CORRIDOR VIEW
  const doorGroup = new THREE.Group();
  doorGroup.position.set(-1.4, 0, 3.26);

  // Deep structural door frame jambs
  const frameM = mat(0x475569, 0.3, 0.3);
  const jambL = box(0.08, 2.30, 0.12, frameM); jambL.position.set(-0.74, 1.15, 0); doorGroup.add(jambL);
  const jambR = box(0.08, 2.30, 0.12, frameM); jambR.position.set(0.74, 1.15, 0); doorGroup.add(jambR);
  const jambTop = box(1.56, 0.08, 0.12, frameM); jambTop.position.set(0, 2.26, 0); doorGroup.add(jambTop);

  // Solid hospital door leaf with beveled edge
  const doorLeafM = mat(0xe2e8f0, 0.5, 0.05);
  const doorLeaf = box(1.36, 2.20, 0.045, doorLeafM);
  doorLeaf.position.set(0, 1.10, -0.02);
  doorGroup.add(doorLeaf);

  // Stainless steel push plate & lever handle
  const handleM = mat(0xf1f5f9, 0.1, 0.95);
  const pushPlate = box(0.09, 0.42, 0.015, handleM);
  pushPlate.position.set(0.55, 1.12, -0.045);
  doorGroup.add(pushPlate);

  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 12), handleM);
  lever.rotation.z = Math.PI / 2;
  lever.position.set(0.52, 1.05, -0.07);
  doorGroup.add(lever);

  // Stainless kickplate at door base
  const kickPlate = box(1.34, 0.28, 0.008, handleM);
  kickPlate.position.set(0, 0.14, -0.045);
  doorGroup.add(kickPlate);

  // Double-glazed observation vision panel with frosted safety cross
  const glassM = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
  });
  const visionGlass = box(0.24, 0.95, 0.02, glassM);
  visionGlass.position.set(0.15, 1.42, -0.02);
  doorGroup.add(visionGlass);

  // Door sign badge
  const signTex = makeTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';

    if (department === 'icu') {
      ctx.fillText('INTENSIVE CARE', 128, 48);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('BED 02 · LEVEL 3 CRITICAL', 128, 86);
    } else if (department === 'medical') {
      ctx.fillText('ACUTE MEDICAL WARD', 128, 48);
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('BED 12 · ADULT INPATIENT', 128, 86);
    } else if (department === 'obs') {
      ctx.fillText('MATERNAL & OBSTETRICS', 128, 48);
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('BED 05 · MATERNAL-FETAL', 128, 86);
    } else if (department === 'rad') {
      ctx.fillText('DIAGNOSTIC RADIOLOGY', 128, 48);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('SUITE 01 · PACS & IMAGING', 128, 86);
    } else {
      ctx.fillText('EMERGENCY RESUS', 128, 48);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('BAY 04 · HIGH ACUITY', 128, 86);
    }
  });
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.19),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signMesh.position.set(-0.35, 1.55, -0.045);
  signMesh.rotation.y = Math.PI;
  doorGroup.add(signMesh);

  root.add(doorGroup);

  // 5. MODULAR ACOUSTIC CEILING GRID & RECESSED 600x600 TROFFERS
  const ceilTex = makeTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 512, 512);
    // Subtle acoustic tile fissures
    ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
    for (let i = 0; i < 400; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 1.5);
    }
  });
  ceilTex.wrapS = THREE.RepeatWrapping;
  ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(11, 11);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 6.6),
    new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.92, metalness: 0.02 })
  );
  ceil.position.y = 2.90;
  ceil.rotation.x = Math.PI / 2;
  root.add(ceil);

  // 4 Glowing Recessed Daylight Light Panels
  [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]].forEach(([lx, lz]) => {
    const troffer = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.92),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    troffer.position.set(lx, 2.89, lz);
    troffer.rotation.x = Math.PI / 2;
    root.add(troffer);

    const frameM = mat(0x64748b, 0.2, 0.8);
    const trofferFrame = box(0.96, 0.02, 0.96, frameM);
    trofferFrame.position.set(lx, 2.895, lz);
    root.add(trofferFrame);
  });

  // 6. HIGH-FIDELITY MEDICAL HEADWALL (Behind Bed)
  const headwall = box(2.6, 0.50, 0.10, mat(0xe2e8f0, 0.2, 0.7)); // Anodized aluminum trunking
  headwall.position.set(0, 1.68, -3.24);
  root.add(headwall);

  // Gas Terminal Outlets (Color Coded: 2x O2 Green, 2x Air Yellow, 2x Vac White)
  [
    [-0.30, 0x16a34a, 'O2'],
    [-0.15, 0x16a34a, 'O2'],
    [0.05, 0xeab308, 'Air'],
    [0.25, 0xf1f5f9, 'Vac'],
    [0.40, 0xf1f5f9, 'Vac'],
  ].forEach(([ox, col]) => {
    const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 16), mat(col, 0.3, 0.6));
    outlet.rotation.x = Math.PI / 2;
    outlet.position.set(ox, 1.68, -3.18);
    root.add(outlet);
  });

  // Flowmeter with glass rotameter & bobbin
  const flowmeterBody = box(0.045, 0.18, 0.045, mat(0xf8fafc, 0.2, 0.4));
  flowmeterBody.position.set(-0.30, 1.78, -3.14);
  root.add(flowmeterBody);

  const rotameterGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.13, 12),
    mat(0xe0f2fe, 0.1, 0.1, { transparent: true, opacity: 0.85 })
  );
  rotameterGlass.position.set(-0.30, 1.78, -3.11);
  root.add(rotameterGlass);

  // Vacuum Suction Regulator & Yellow Fluid Canister
  const suctionCanister = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.055, 0.26, 16),
    mat(0xfef08a, 0.15, 0.1, { transparent: true, opacity: 0.8 })
  );
  suctionCanister.position.set(0.40, 1.60, -3.12);
  root.add(suctionCanister);

  // Wall Clock
  const clockTex = makeTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#1e293b'; ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.lineWidth = i % 3 === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95);
      ctx.lineTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115);
      ctx.stroke();
    }
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128, 60); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(185, 128); ctx.stroke();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 - 75, 128 - 75); ctx.stroke();
  });
  const wallClock = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ map: clockTex }));
  wallClock.position.set(-1.6, 2.25, -3.28);
  root.add(wallClock);

  // 7. HIGH-FIDELITY ELECTRIC HOSPITAL RESUS / ICU BED (Hill-Rom Style)
  const bed = new THREE.Group();
  bed.position.set(0, 0, -1.6);

  // Steel chassis frame
  const chassisM = mat(0x334155, 0.3, 0.7);
  const frame = box(1.06, 0.12, 2.15, chassisM);
  frame.position.y = 0.45;
  bed.add(frame);

  // 4 Rubber Swivel Caster Wheels with Chrome Brake Pedals
  const wheelM = mat(0x0f172a, 0.8, 0.1);
  const pedalM = mat(0xdc2626, 0.3, 0.4); // Red brake pedal
  [
    [-0.45, -0.92],
    [0.45, -0.92],
    [-0.45, 0.92],
    [0.45, 0.92],
  ].forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16), wheelM);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.065, wz);
    wheel.castShadow = true;
    bed.add(wheel);

    const brakePedal = box(0.04, 0.02, 0.08, pedalM);
    brakePedal.position.set(wx, 0.12, wz + 0.04);
    bed.add(brakePedal);
  });

  // Twin Heavy-Duty Electric Lift Columns
  const columnM = mat(0xe2e8f0, 0.2, 0.9);
  const col1 = box(0.18, 0.32, 0.18, columnM); col1.position.set(0, 0.26, -0.55); bed.add(col1);
  const col2 = box(0.18, 0.32, 0.18, columnM); col2.position.set(0, 0.26, 0.55); bed.add(col2);

  // Contoured Pressure-Relief Anti-Decubitus Mattress (Dark hospital vinyl)
  const mattressM = mat(0x1e3a5f, 0.6, 0.05);
  const mattress = box(0.98, 0.15, 2.05, mattressM);
  mattress.position.y = 0.58;
  bed.add(mattress);

  // Articulated Fowler's Backrest Platform
  const backPlatform = box(0.98, 0.15, 0.95, mattressM);
  backPlatform.position.set(0, 0.86, -0.68);
  backPlatform.rotation.x = -0.55;
  bed.add(backPlatform);

  // Beech laminate headboard
  const headboard = box(1.08, 0.55, 0.04, mat(0x9a3412, 0.5, 0.1));
  headboard.position.set(0, 0.95, -1.08);
  bed.add(headboard);

  // Modern low-profile hospital bed footboard with chrome grip rail
  const footboard = box(1.04, 0.20, 0.04, mat(0x334155, 0.4, 0.6));
  footboard.position.set(0, 0.70, 1.06);
  bed.add(footboard);

  const footRail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.96, 16), mat(0xe2e8f0, 0.1, 0.95));
  footRail.rotation.z = Math.PI / 2;
  footRail.position.set(0, 0.81, 1.06);
  bed.add(footRail);

  // Split 4-Piece Chrome Safety Side Rails (2 on each side)
  [-0.52, 0.52].forEach((rx) => {
    // Upper head-end rail
    const railHead = box(0.03, 0.28, 0.68, mat(0xe2e8f0, 0.1, 0.95));
    railHead.position.set(rx, 0.86, -0.35);
    bed.add(railHead);
    // Lower foot-end rail
    const railFoot = box(0.03, 0.24, 0.64, mat(0xe2e8f0, 0.1, 0.95));
    railFoot.position.set(rx, 0.76, 0.45);
    bed.add(railFoot);
  });

  root.add(bed);

  // 8. REALISTIC ANATOMICAL VIRTUAL PATIENT
  const patient = buildRealisticPatient(interactables, initialPhenotype);
  patient.group.position.set(0, 0.72, -1.45);
  root.add(patient.group);

  // 9. HIGH-RESOLUTION BEDSIDE MONITOR (Philips IntelliVue MP70)
  const mon = makeCanvasTexture(640, 480);
  const stand = box(0.05, 1.35, 0.05, mat(0x334155, 0.3, 0.8));
  stand.position.set(0.98, 0.68, -1.9);
  root.add(stand);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.58), new THREE.MeshBasicMaterial({ map: mon.tex }));
  screen.position.set(0.98, 1.48, -1.86);
  screen.rotation.y = -0.38;
  screen.userData = { action: 'measure:all', label: 'Bedside Monitor' };
  interactables.push(screen);
  root.add(screen);

  const bezel = box(0.80, 0.62, 0.04, mat(0x0f172a, 0.4, 0.3));
  bezel.position.copy(screen.position);
  bezel.position.z -= 0.025;
  bezel.rotation.y = -0.38;
  root.add(bezel);

  let pulseWaveOffset = 0;
  const monitor = {
    draw(vitals, statusLabel = 'UNSTABLE', clockMin = 0.0, oxygenActive = false) {
      const { ctx, tex, canvas } = mon;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header Bar
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, 0, canvas.width, 48);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('INTELLIVUE MP70 · BEDSIDE MONITOR', 18, 32);

      // Clock
      const m = Math.floor(clockMin), s = Math.floor((clockMin % 1) * 60);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`T+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, 400, 32);

      // Status Pill
      const isOk = statusLabel.toLowerCase().includes('improv');
      ctx.fillStyle = isOk ? '#15803d' : '#b91c1c';
      ctx.fillRect(500, 8, 125, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(statusLabel.toUpperCase(), 562, 30);
      ctx.textAlign = 'left';

      if (!vitals) {
        ctx.font = '26px sans-serif'; ctx.fillStyle = '#22c55e';
        ctx.fillText('Observations not yet initiated.', 20, 180);
        ctx.font = '18px sans-serif'; ctx.fillStyle = '#94a3b8';
        ctx.fillText('Attach pulse oximeter probe or BP cuff to display live telemetry.', 20, 220);
      } else {
        // HR
        ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('HR (bpm)', 24, 82);
        ctx.font = 'bold 50px sans-serif'; ctx.fillText(String(vitals.hr || vitals.Pulse || '124'), 24, 132);

        // SpO2
        const spo2Val = parseInt(vitals.spo2 || vitals['SpO₂'] || '88', 10);
        ctx.fillStyle = spo2Val < 90 ? '#ef4444' : '#22c55e';
        ctx.font = 'bold 18px sans-serif'; ctx.fillText('SpO₂ (%)', 240, 82);
        ctx.font = 'bold 50px sans-serif'; ctx.fillText(String(spo2Val) + '%', 240, 132);
        if (oxygenActive) {
          ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#22c55e'; ctx.fillText('O₂ ON (15L/MIN)', 240, 154);
        }

        // RR
        ctx.fillStyle = '#facc15'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('RR (/min)', 460, 82);
        ctx.font = 'bold 50px sans-serif'; ctx.fillText(String(vitals.rr || vitals['Respiratory rate'] || '32'), 460, 132);

        // NIBP
        ctx.fillStyle = '#c084fc'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('NIBP (mmHg)', 24, 204);
        ctx.font = 'bold 42px sans-serif';
        const bpStr = vitals.sbp && vitals.dbp ? `${vitals.sbp}/${vitals.dbp}` : (vitals['Blood pressure'] || '92/58');
        ctx.fillText(bpStr, 24, 252);

        // Temp
        ctx.fillStyle = '#fb923c'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('TEMP (°C)', 240, 204);
        ctx.font = 'bold 42px sans-serif';
        const tempStr = vitals.temp ? `${vitals.temp} °C` : (vitals.Temperature || '39.1 °C');
        ctx.fillText(tempStr, 240, 252);

        // Animated Lead II ECG
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5; ctx.beginPath();
        const startX = 20, waveY = 328, endX = 620;
        ctx.fillStyle = '#065f46'; ctx.font = '14px monospace'; ctx.fillText('LEAD II · CAL 1.0mV · 25mm/s', 24, 296);
        pulseWaveOffset = (pulseWaveOffset + 6) % 180;
        for (let x = startX; x < endX; x += 4) {
          const relX = (x + pulseWaveOffset) % 180;
          let dy = 0;
          if (relX > 60 && relX < 68) dy = -14;
          else if (relX >= 68 && relX < 74) dy = 7;
          else if (relX >= 74 && relX < 82) dy = -56;
          else if (relX >= 82 && relX < 88) dy = 18;
          else if (relX >= 115 && relX < 140) dy = -10;
          const y = waveY + dy;
          if (x === startX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      tex.needsUpdate = true;
    },
  };

  // 10. AUTHENTIC MEDICAL EQUIPMENT & TOOLS (PHASES 3 & 4)
  // Department-Specific High-Poly Medical Suites
  if (department === 'resus') {
    // Overhead surgical scialytic lamp for resuscitation & trauma procedures
    const scialytic = createScialyticSurgicalLamp();
    scialytic.group.position.set(0.25, 0, -1.4);
    root.add(scialytic.group);

    // Resuscitation Crash Cart with active Defibrillator
    const cartM = createRealisticCrashCart();
    cartM.group.position.set(1.4, 0, 0.4);
    cartM.group.rotation.y = -Math.PI / 4;
    root.add(cartM.group);
    if (cartM.defibScreen) {
      cartM.defibScreen.userData = { action: 'tool:defib', label: 'Biphasic Defibrillator (Crash Cart)' };
      interactables.push(cartM.defibScreen);
    }

    // Bedside Mobile Ultrasound / eFAST Console
    const usCart = createRealisticUltrasoundFast();
    usCart.group.position.set(-1.6, 0, 0.4);
    usCart.group.rotation.y = Math.PI / 4;
    root.add(usCart.group);
    if (usCart.screen) {
      interactables.push(usCart.screen);
    }

    // Emergency Surgical Mayo Stand with Chest Drain & Decompression Needle
    const mayoStand = createRealisticProcedureMayoStand();
    mayoStand.group.position.set(-1.3, 0, -1.8);
    root.add(mayoStand.group);
    interactables.push(mayoStand.group);

  } else if (department === 'icu') {
    // Advanced Mechanical Ventilator with patient breathing circuit
    const vent = createRealisticVentilator();
    vent.group.position.set(1.25, 0, -1.7);
    vent.group.rotation.y = -Math.PI / 4;
    if (vent.screen) {
      vent.screen.userData = { action: 'tool:ventilator', label: 'Hamilton-G5 Mechanical Ventilator' };
      interactables.push(vent.screen);
    }
    root.add(vent.group);

    // Bedside Mobile Ultrasound / eFAST Console for critical line placement
    const usCart = createRealisticUltrasoundFast();
    usCart.group.position.set(-1.6, 0, 0.4);
    usCart.group.rotation.y = Math.PI / 4;
    root.add(usCart.group);
    if (usCart.screen) interactables.push(usCart.screen);

    // Crash cart positioned on standby
    const cartM = createRealisticCrashCart();
    cartM.group.position.set(2.2, 0, -0.2);
    cartM.group.rotation.y = -Math.PI / 2;
    root.add(cartM.group);

  } else if (department === 'obs') {
    // Obstetric & Maternal Ward: CTG Fetal Monitor next to bed
    const ctg = createRealisticCtgMonitor();
    ctg.group.position.set(1.25, 0, -1.7);
    ctg.group.rotation.y = -Math.PI / 4;
    root.add(ctg.group);
    if (ctg.screen) {
      interactables.push(ctg.screen);
    }

    // Neonatal Radiant Infant Warmer Bassinet in maternal room corner
    const infantWarmer = createRealisticInfantWarmer();
    infantWarmer.group.position.set(-1.8, 0, 0.6);
    infantWarmer.group.rotation.y = Math.PI / 3;
    root.add(infantWarmer.group);
    interactables.push(infantWarmer.group);

    // Crash cart positioned on perimeter standby
    const cartM = createRealisticCrashCart();
    cartM.group.position.set(2.2, 0, 0.5);
    cartM.group.rotation.y = -Math.PI / 2;
    root.add(cartM.group);

  } else if (department === 'rad') {
    // Diagnostic Radiology & PACS Workstation Suite
    const pacs = createRealisticPacsWorkstation();
    pacs.group.position.set(1.5, 0, -0.4);
    pacs.group.rotation.y = -Math.PI / 2;
    root.add(pacs.group);
    if (pacs.leftScreen) {
      pacs.leftScreen.userData = { action: 'tool:pacs', label: 'PACS Chest Radiograph Viewer' };
      interactables.push(pacs.leftScreen);
    }
    if (pacs.rightScreen) {
      pacs.rightScreen.userData = { action: 'tool:pacs', label: 'PACS Axial CT Trauma Viewer' };
      interactables.push(pacs.rightScreen);
    }

    // Mobile Ultrasound Console in radiology suite
    const usCart = createRealisticUltrasoundFast();
    usCart.group.position.set(-1.5, 0, 0.2);
    usCart.group.rotation.y = Math.PI / 4;
    root.add(usCart.group);
    if (usCart.screen) interactables.push(usCart.screen);

    // Standby crash cart
    const cartM = createRealisticCrashCart();
    cartM.group.position.set(2.2, 0, 1.2);
    cartM.group.rotation.y = -Math.PI / 2;
    root.add(cartM.group);

  } else {
    // Acute Medical Ward: Welch Allyn Wall Diagnostic Set (Otoscope & Ophthalmoscope)
    const wallDiag = createRealisticWallDiagnosticSet();
    wallDiag.group.position.set(1.4, 1.8, -3.24);
    root.add(wallDiag.group);
    interactables.push(wallDiag.group);

    // Acute Medical Ward: Crash cart on perimeter standby
    const cartM = createRealisticCrashCart();
    cartM.group.position.set(2.3, 0, 0.8);
    cartM.group.rotation.y = -Math.PI / 2;
    root.add(cartM.group);
  }

  // IV Pole & Saline Infusion
  const ivPole = createRealisticIvPole();
  ivPole.group.position.set(0.68, 0, -2.1);
  root.add(ivPole.group);

  // Volumetric Infusion Pump on IV Pole for Medical Ward and ICU
  if (department === 'medical' || department === 'icu') {
    const pump = createRealisticInfusionPump();
    pump.group.position.set(0.68, 1.35, -2.1);
    root.add(pump.group);
  }

  // Overbed Clinical Instrument Trolley
  const trolleyGroup = new THREE.Group();
  trolleyGroup.position.set(-0.95, 0.85, -1.2);
  const trayTop = box(0.55, 0.03, 0.75, mat(0xe2e8f0, 0.15, 0.95)); // Polished stainless steel
  trolleyGroup.add(trayTop);
  const trolleyLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.82, 16), mat(0xe2e8f0, 0.1, 0.95));
  trolleyLeg.position.set(0, -0.42, 0);
  trolleyGroup.add(trolleyLeg);
  root.add(trolleyGroup);

  // Medical Tools placed on trolley
  const steth = createRealisticStethoscope();
  steth.position.set(-0.85, 0.88, -1.3);
  steth.scale.set(1.2, 1.2, 1.2);
  steth.userData = { action: 'tool:stethoscope', label: 'Littmann Cardiology Stethoscope' };
  interactables.push(steth);
  root.add(steth);

  const oximeter = createRealisticPulseOximeter();
  oximeter.position.set(-1.05, 0.88, -1.15);
  oximeter.userData = { action: 'measure:spo2', label: 'Pulse Oximeter Finger Clip' };
  interactables.push(oximeter);
  root.add(oximeter);

  const bpCuff = createRealisticBpCuff();
  bpCuff.position.set(-0.92, 0.88, -1.05);
  bpCuff.userData = { action: 'measure:bp', label: 'Sphygmomanometer BP Cuff' };
  interactables.push(bpCuff);
  root.add(bpCuff);

  const o2Mask = createRealisticOxygenMask();
  o2Mask.position.set(-1.08, 0.88, -1.35);
  o2Mask.userData = { action: 'tool:oxygen', label: '15L High-Flow Non-Rebreather Oxygen Mask' };
  interactables.push(o2Mask);
  root.add(o2Mask);

  const therm = createRealisticThermometer();
  therm.position.set(-0.80, 0.88, -1.10);
  therm.userData = { action: 'measure:temp', label: 'Digital Tympanic Thermometer' };
  interactables.push(therm);
  root.add(therm);

  // 11. INTERPROFESSIONAL AI CLINICAL STAFF MEMBERS
  const nurse = createClinicalStaffMember({
    role: 'nurse',
    phenotypeKey: 'black-female',
    name: 'Staff Nurse Amina',
    interactables,
  });
  nurse.group.position.set(1.25, 0, -1.2);
  nurse.group.rotation.y = -Math.PI / 3;
  root.add(nurse.group);
  staffMembers.push(nurse);

  const studentPeer = createClinicalStaffMember({
    role: 'student',
    phenotypeKey: 'white-male',
    name: 'Dr. David (Student Peer)',
    interactables,
  });
  studentPeer.group.position.set(-1.15, 0, -0.6);
  studentPeer.group.rotation.y = Math.PI / 4;
  root.add(studentPeer.group);
  staffMembers.push(studentPeer);

  const update = (delta = 0.016) => {
    staffMembers.forEach(s => s.update(delta));
  };

  return { root, patient, monitor, interactables, screen, staffMembers, update };
}
