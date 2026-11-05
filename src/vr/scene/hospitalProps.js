import * as THREE from 'three';
import { makeTexture } from './hospitalTools.js';

const mat = (color, rough = 0.5, metal = 0.2, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...opts });

const box = (w, h, d, m) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

/**
 * 1. HOSPITAL CUBICLE PRIVACY CURTAINS & CURVED CEILING TRACK
 * Creates realistic pleated antimicrobial fabric curtains hanging from an aluminum ceiling track.
 */
export function createHospitalPrivacyCurtains() {
  const group = new THREE.Group();

  // Aluminum Ceiling Track (running at y = 2.84 around the bed bay)
  const trackM = mat(0xe2e8f0, 0.2, 0.85);
  const trackCurve = new THREE.CurvePath();

  // Straight section along foot of bed
  const p1 = new THREE.Vector3(-1.8, 2.84, -0.2);
  const p2 = new THREE.Vector3(-1.8, 2.84, 0.8);
  const p3 = new THREE.Vector3(1.2, 2.84, 0.8);

  const t1 = new THREE.LineCurve3(p1, p2);
  const t2 = new THREE.LineCurve3(p2, p3);
  trackCurve.add(t1);
  trackCurve.add(t2);

  const trackGeom = new THREE.TubeGeometry(t1, 16, 0.012, 8, false);
  const trackMesh = new THREE.Mesh(trackGeom, trackM);
  group.add(trackMesh);

  // Pleated Antimicrobial Hospital Fabric Curtain
  // Generates undulating vertical folds using a sine-wave displacement
  const curtainW = 1.35, curtainH = 2.20;
  const segsX = 36, segsY = 24;
  const curtainGeom = new THREE.PlaneGeometry(curtainW, curtainH, segsX, segsY);

  // Deform vertices along Z to create natural vertical curtain folds
  const pos = curtainGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const zOffset = Math.sin(x * 24.0) * 0.045 + Math.cos(x * 12.0) * 0.02;
    pos.setZ(i, zOffset);
  }
  curtainGeom.computeVertexNormals();

  // Texture: Hospital sanitized seafoam cyan with white top ventilation mesh
  const curtainTex = makeTexture(512, 1024, (ctx) => {
    // Upper 15% is white ventilation mesh (NFPA fire code for sprinklers)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    for (let my = 10; my < 160; my += 8) {
      for (let mx = 10; mx < 512; mx += 8) {
        ctx.fillRect(mx, my, 4, 4);
      }
    }
    // Lower body is soothing sanitized pastel medical fabric
    ctx.fillStyle = '#0d9488'; // Hospital Teal / Seafoam
    ctx.fillRect(0, 160, 512, 864);

    // Subtle vertical fabric ribbing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let rx = 0; rx < 512; rx += 6) {
      ctx.fillRect(rx, 160, 2, 864);
    }
  });

  const curtainM = new THREE.MeshStandardMaterial({
    map: curtainTex,
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  // Hanging Curtain Section (Partially drawn along bay side)
  const curtainMesh = new THREE.Mesh(curtainGeom, curtainM);
  curtainMesh.position.set(-1.8, 1.70, 0.2);
  curtainMesh.rotation.y = Math.PI / 2;
  curtainMesh.castShadow = true;
  group.add(curtainMesh);

  // Chrome curtain gliders connecting to track
  for (let gIdx = 0; gIdx < 12; gIdx++) {
    const glider = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 8), trackM);
    glider.position.set(-1.8, 2.81, -0.4 + gIdx * 0.11);
    group.add(glider);
  }

  return group;
}

/**
 * 2. WALL-MOUNTED TRIPLE NITRILE GLOVE BOX DISPENSER
 */
export function createWallGloveDispenser() {
  const group = new THREE.Group();

  // Clear acrylic wall holder
  const holderM = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.45,
  });
  const backplate = box(0.32, 0.64, 0.015, holderM);
  group.add(backplate);

  // 3 Boxes of Nitrile Gloves (Small, Medium, Large)
  const sizes = [
    { label: 'SMALL · 100 PCS', col: '#0284c7', y: 0.20 },
    { label: 'MEDIUM · 100 PCS', col: '#4338ca', y: 0.0 },
    { label: 'LARGE · 100 PCS', col: '#7c3aed', y: -0.20 },
  ];

  sizes.forEach(({ label, col, y }) => {
    const boxTex = makeTexture(256, 128, (ctx) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('NITRILE GLOVES', 16, 32);
      ctx.font = '12px sans-serif';
      ctx.fillText('POWDER-FREE · EXAM', 16, 52);
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(label, 16, 80);

      // Oval perforation dispenser opening
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(190, 64, 45, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    const gBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.08),
      new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.6 })
    );
    gBox.position.set(0, y, 0.05);
    gBox.castShadow = true;
    group.add(gBox);
  });

  return group;
}

/**
 * 3. YELLOW BIOHAZARD SHARPS DISPOSAL CONTAINER
 */
export function createWallSharpsBin() {
  const group = new THREE.Group();

  const yellowM = mat(0xeab308, 0.35, 0.05); // Bright medical safety yellow
  const whiteM = mat(0xf8fafc, 0.3, 0.1);

  // Yellow tapered tub
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.26, 16), yellowM);
  tub.castShadow = true;
  group.add(tub);

  // White lid with deposit slot
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.122, 0.04, 16), whiteM);
  lid.position.y = 0.14;
  group.add(lid);

  // Rotating safety deposit tumbler
  const tumbler = box(0.08, 0.015, 0.06, mat(0xdc2626, 0.4, 0.1));
  tumbler.position.set(0, 0.165, 0.02);
  group.add(tumbler);

  // Biohazard warning label
  const labelTex = makeTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☣ BIOHAZARD', 128, 38);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('DANGER · CONTAMINATED', 128, 72);
    ctx.fillText('SHARPS ONLY', 128, 96);
  });
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.08),
    new THREE.MeshBasicMaterial({ map: labelTex })
  );
  labelMesh.position.set(0, 0.02, 0.115);
  group.add(labelMesh);

  // Wall bracket
  const bracket = box(0.06, 0.24, 0.02, mat(0x64748b, 0.3, 0.6));
  bracket.position.set(0, 0, -0.11);
  group.add(bracket);

  return group;
}

/**
 * 4. WALL-MOUNTED ALCOHOL GEL HAND HYGIENE DISPENSER
 */
export function createWallHandSanitizer() {
  const group = new THREE.Group();

  const whiteM = mat(0xf8fafc, 0.25, 0.1);
  const bluePumpM = mat(0x0284c7, 0.3, 0.1);

  // Housing
  const body = box(0.11, 0.26, 0.08, whiteM);
  body.castShadow = true;
  group.add(body);

  // Fluid reservoir level window
  const gelM = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.75,
  });
  const gelWindow = box(0.04, 0.14, 0.015, gelM);
  gelWindow.position.set(0, 0.02, 0.042);
  group.add(gelWindow);

  // Push actuation bar at bottom
  const pushBar = box(0.09, 0.04, 0.03, bluePumpM);
  pushBar.position.set(0, -0.11, 0.04);
  group.add(pushBar);

  // Sanitizer printed badge
  const badgeTex = makeTexture(128, 64, (ctx) => {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ALCOHOL RUB', 64, 28);
    ctx.fillText('HAND HYGIENE', 64, 46);
  });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), new THREE.MeshBasicMaterial({ map: badgeTex }));
  badge.position.set(0, 0.09, 0.041);
  group.add(badge);

  return group;
}

/**
 * 5. CLINICAL FOOT-PEDAL WASTE BINS (Yellow Clinical & Black Domestic)
 */
export function createClinicalPedalBins() {
  const group = new THREE.Group();

  // Yellow Biohazard Waste Bin
  const binG = new THREE.Group();
  binG.position.set(-1.4, 0, -2.9);

  const binYellowM = mat(0xfacc15, 0.35, 0.1);
  const bodyY = box(0.32, 0.52, 0.30, binYellowM);
  bodyY.position.y = 0.26;
  binG.add(bodyY);

  const lidY = box(0.34, 0.03, 0.32, mat(0xeab308, 0.3, 0.2));
  lidY.position.set(0, 0.53, 0);
  binG.add(lidY);

  const pedalY = box(0.08, 0.015, 0.06, mat(0x0f172a, 0.5, 0.5));
  pedalY.position.set(0, 0.02, 0.16);
  binG.add(pedalY);

  // Biohazard Sticker
  const bioTex = makeTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☣', 64, 55);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CLINICAL WASTE', 64, 85);
    ctx.fillText('INFECTIOUS', 64, 105);
  });
  const bioMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: bioTex }));
  bioMesh.position.set(0, 0.30, 0.152);
  binG.add(bioMesh);
  group.add(binG);

  return group;
}
