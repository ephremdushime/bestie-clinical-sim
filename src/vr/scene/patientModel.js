import * as THREE from 'three';

// ============================================================================
// BESTIE CLINICAL SIM — REALISTIC ANATOMICAL VIRTUAL PATIENT
// High-fidelity human anatomical mesh with articulated jaw, expressive eyes,
// diverse demographic phenotypes (Fitzpatrick I-VI), realistic hospital gown,
// continuous contoured limbs, and physical clinical compliance.
// ============================================================================

export const PATIENT_PHENOTYPES = {
  'black-male': {
    id: 'black-male',
    label: 'Adult Black Man (Fitzpatrick V-VI)',
    skinBase: '#3a2118',
    skinHighlight: '#553325',
    skinShadow: '#22130e',
    lipColor: '#532f26',
    lipCyanotic: '#2f272c',
    eyeColor: '#241407',
    hairColor: '#0a0807',
    hairStyle: 'fade-crop',
    browColor: '#0e0b09',
    sex: 'male',
  },
  'white-male': {
    id: 'white-male',
    label: 'Adult White Man (Fitzpatrick II-III)',
    skinBase: '#d8af95',
    skinHighlight: '#edd0bd',
    skinShadow: '#a67d64',
    lipColor: '#b56868',
    lipCyanotic: '#5d6f8f',
    eyeColor: '#2a4d69',
    hairColor: '#291b16',
    hairStyle: 'textured-crop',
    browColor: '#221711',
    sex: 'male',
  },
  'black-female': {
    id: 'black-female',
    label: 'Adult Black Woman (Fitzpatrick V)',
    skinBase: '#46291d',
    skinHighlight: '#5e3829',
    skinShadow: '#2b170f',
    lipColor: '#5c332b',
    lipCyanotic: '#332a2e',
    eyeColor: '#1f1005',
    hairColor: '#0b0807',
    hairStyle: 'styled-updo',
    browColor: '#100c0a',
    sex: 'female',
  },
  'white-female': {
    id: 'white-female',
    label: 'Adult White Woman (Fitzpatrick II)',
    skinBase: '#e2beaa',
    skinHighlight: '#f5ded0',
    skinShadow: '#b0846c',
    lipColor: '#c46f73',
    lipCyanotic: '#657896',
    eyeColor: '#36614a',
    hairColor: '#3d2417',
    hairStyle: 'wavy-shoulder',
    browColor: '#2c1910',
    sex: 'female',
  },
};

// Procedural Organic Hospital Gown PBR Texture
function createHospitalGownTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Hospital sanitised pale seafoam / slate cyan
  ctx.fillStyle = '#68b1c4';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro-woven textile interlacing
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  for (let y = 0; y < 1024; y += 4) {
    ctx.fillRect(0, y, 1024, 1.5);
  }
  for (let x = 0; x < 1024; x += 4) {
    ctx.fillRect(x, 0, 1.5, 1024);
  }

  // Authentic printed diamond-snowflake medical hospital motif
  ctx.fillStyle = '#ffffff';
  for (let x = 24; x < 1024; x += 48) {
    for (let y = 24; y < 1024; y += 48) {
      // Small geometric medical cross
      ctx.fillRect(x - 1.5, y - 6, 3, 12);
      ctx.fillRect(x - 6, y - 1.5, 12, 3);
      // Delicate perimeter dots
      ctx.fillRect(x - 5, y - 5, 2, 2);
      ctx.fillRect(x + 3, y - 5, 2, 2);
      ctx.fillRect(x - 5, y + 3, 2, 2);
      ctx.fillRect(x + 3, y + 3, 2, 2);
    }
  }

  // Realistic fabric drape crease shading
  for (let y = 60; y < 1024; y += 120) {
    const fGrad = ctx.createLinearGradient(0, y, 0, y + 60);
    fGrad.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
    fGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    fGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = fGrad;
    ctx.fillRect(0, y, 1024, 60);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return tex;
}

// Procedural Sanitized Hospital Bed Linens Texture
function createHospitalBeddingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Sanitary crisp off-white hospital cotton
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle cotton fibre noise
  ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
  for (let i = 0; i < 8000; i++) {
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1.5, 1.5);
  }

  // Turned-down top sheet border with stitched hemline
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 1024, 90);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(10, 10, 1004, 70);

  // Realistic natural fabric folds
  for (let y = 120; y < 1024; y += 140) {
    const foldGrad = ctx.createLinearGradient(0, y, 0, y + 80);
    foldGrad.addColorStop(0, 'rgba(100, 116, 139, 0.09)');
    foldGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
    foldGrad.addColorStop(1, 'rgba(100, 116, 139, 0.0)');
    ctx.fillStyle = foldGrad;
    ctx.fillRect(0, y, 1024, 80);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// High-Resolution Photographic Facial Texture
export function createPatientHeadTexture(phenotypeKey = 'black-male', { cyanosis = 0.0, diaphoresis = 0.0, eyesClosed = false, sootLevel = 0.0, woundLevel = 0.0, mouthOpen = false } = {}) {
  const p = PATIENT_PHENOTYPES[phenotypeKey] || PATIENT_PHENOTYPES['black-male'];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Photographic skin tone gradient with anatomical shading
  const bgGrad = ctx.createRadialGradient(512, 450, 120, 512, 512, 510);
  bgGrad.addColorStop(0, p.skinHighlight);
  bgGrad.addColorStop(0.65, p.skinBase);
  bgGrad.addColorStop(1, p.skinShadow);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro-skin epidermal pores
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let i = 0; i < 4000; i++) {
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }

  // 2. Diaphoresis (Forehead cold sweats & fever sheen)
  if (diaphoresis > 0.15) {
    ctx.fillStyle = `rgba(255, 255, 255, ${diaphoresis * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(512, 280, 260, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular sweat droplet beads
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 45; i++) {
      const sx = 320 + Math.random() * 384;
      const sy = 230 + Math.random() * 130;
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2b. Inhalation Soot Deposits
  if (sootLevel > 0.1) {
    ctx.fillStyle = `rgba(18, 18, 20, ${Math.min(0.92, sootLevel * 0.95)})`;
    ctx.beginPath();
    ctx.ellipse(512, 640, 180, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(512, 530, 100, 60, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2c. Traumatic Contusion / Laceration
  if (woundLevel > 0.1) {
    ctx.fillStyle = 'rgba(67, 10, 36, 0.8)';
    ctx.beginPath();
    ctx.ellipse(370, 320, 85, 50, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(335, 305);
    ctx.lineTo(405, 335);
    ctx.stroke();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(370, 325);
    ctx.quadraticCurveTo(362, 385, 350, 450);
    ctx.stroke();
  }

  // 3. Eyebrows
  ctx.fillStyle = p.browColor;
  // Left brow
  ctx.beginPath();
  ctx.moveTo(310, 380);
  ctx.quadraticCurveTo(395, 345, 465, 375);
  ctx.quadraticCurveTo(395, 362, 310, 380);
  ctx.fill();
  // Right brow
  ctx.beginPath();
  ctx.moveTo(714, 380);
  ctx.quadraticCurveTo(629, 345, 559, 375);
  ctx.quadraticCurveTo(629, 362, 714, 380);
  ctx.fill();

  // 4. Eyes (Sclera, Iris, Pupil, Specular reflection, Eyelids)
  const drawEye = (cx, cy) => {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (!eyesClosed) {
      // Iris
      ctx.fillStyle = p.eyeColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();

      // Specular gleam
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 6, cy - 6, 5, 0, Math.PI * 2);
      ctx.fill();

      // Upper lid crease
      ctx.strokeStyle = p.skinShadow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 62, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.strokeStyle = p.skinShadow;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 56, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  };
  drawEye(405, 415);
  drawEye(619, 415);

  // 5. Nose & Nostril contours
  ctx.strokeStyle = p.skinShadow;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(512, 395);
  ctx.lineTo(502, 530);
  ctx.quadraticCurveTo(512, 555, 522, 530);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = 'rgba(20, 10, 8, 0.8)';
  ctx.beginPath();
  ctx.ellipse(485, 548, 14, 8, -0.3, 0, Math.PI * 2);
  ctx.ellipse(539, 548, 14, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 6. Lips & Perioral Cyanosis
  const lipAlpha = Math.min(1.0, Math.max(0.0, cyanosis));
  const currentLipColor = lipAlpha > 0.3 ? p.lipCyanotic : p.lipColor;
  ctx.fillStyle = currentLipColor;

  if (!mouthOpen) {
    // Upper lip
    ctx.beginPath();
    ctx.moveTo(420, 642);
    ctx.quadraticCurveTo(465, 622, 512, 630);
    ctx.quadraticCurveTo(559, 622, 604, 642);
    ctx.quadraticCurveTo(512, 650, 420, 642);
    ctx.fill();

    // Lower lip
    ctx.beginPath();
    ctx.moveTo(425, 644);
    ctx.quadraticCurveTo(512, 680, 599, 644);
    ctx.quadraticCurveTo(512, 654, 425, 644);
    ctx.fill();
  } else {
    // Open mouth for oral pharyngeal exam ("Say Ah")
    ctx.fillStyle = '#3a0808';
    ctx.beginPath();
    ctx.ellipse(512, 660, 84, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tongue & oral cavity
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.ellipse(512, 684, 58, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper dental arch
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(465, 628, 94, 8);
  }

  // Vermilion outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Nasolabial folds
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(460, 535); ctx.quadraticCurveTo(435, 610, 415, 660);
  ctx.moveTo(564, 535); ctx.quadraticCurveTo(589, 610, 609, 660);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return { canvas, tex, ctx };
}

// ----------------------------------------------------------------------------
// BUILD ANATOMICALLY CONTOURED PATIENT MESH
// ----------------------------------------------------------------------------
export function buildRealisticPatient(interactables, initialPhenotype = 'black-male') {
  const g = new THREE.Group();
  let currentPhenotypeKey = initialPhenotype;
  let currentCyanosis = 0.0;
  let currentDiaphoresis = 0.0;
  let mouthOpen = false;
  let sootLevel = 0.0;
  let woundLevel = 0.0;

  let headTexData = createPatientHeadTexture(currentPhenotypeKey, {
    cyanosis: 0,
    diaphoresis: 0,
    mouthOpen: false,
  });

  // Physically-Based Skin Material with Subsurface warmth & specular roughness
  const skinMat = new THREE.MeshStandardMaterial({
    map: headTexData.tex,
    roughness: 0.65,
    metalness: 0.05,
  });

  const bodySkinColor = new THREE.Color(PATIENT_PHENOTYPES[currentPhenotypeKey].skinBase);
  const bodySkinMat = new THREE.MeshStandardMaterial({
    color: bodySkinColor,
    roughness: 0.68,
    metalness: 0.04,
  });

  const gownTex = createHospitalGownTexture();
  const gownMat = new THREE.MeshStandardMaterial({
    map: gownTex,
    roughness: 0.88,
    metalness: 0.02,
  });

  const beddingTex = createHospitalBeddingTexture();
  const beddingMat = new THREE.MeshStandardMaterial({
    map: beddingTex,
    roughness: 0.90,
    metalness: 0.01,
  });

  // 1. HOSPITAL PILLOWS (Soft contoured headrest)
  const pillowGroup = new THREE.Group();
  pillowGroup.position.set(0, 0.78, -0.25);
  pillowGroup.rotation.x = -0.55;

  const pillowBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.16, 0.46),
    beddingMat
  );
  pillowBase.castShadow = true;
  pillowBase.receiveShadow = true;
  pillowGroup.add(pillowBase);

  // Pillow head compression indentation
  const pillowIndent = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.03, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.95 })
  );
  pillowIndent.position.set(0, 0.075, 0);
  pillowGroup.add(pillowIndent);
  g.add(pillowGroup);

  // 2. CONTOURED TORSO & CHEST CAGE
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.45, 0.25);
  torsoGroup.rotation.x = -0.55;

  // Ergonomic chest contour (elliptical cross-section with rounded shoulders)
  const chestCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.28, 0),
    new THREE.Vector3(0, 0, 0.02),
    new THREE.Vector3(0, 0.24, 0),
  ]);
  const torsoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.21, 0.54, 32),
    gownMat
  );
  torsoMesh.scale.set(1.18, 1.0, 0.76);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);
  torsoMesh.userData = { action: 'inspect:respiratory_effort', label: 'Assess Work of Breathing / Chest Wall Expansion' };
  interactables.push(torsoMesh);

  // Exposed Upper Sternal Notch & Clavicles
  const sternalSkin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.20, 24, 1, false, -Math.PI / 2, Math.PI),
    bodySkinMat
  );
  sternalSkin.position.set(0, 0.18, 0.09);
  sternalSkin.rotation.x = 0.15;
  torsoGroup.add(sternalSkin);

  // Curved Clavicles (Left & Right)
  const clavicleL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.010, 0.18, 12), bodySkinMat);
  clavicleL.rotation.z = Math.PI / 2.2;
  clavicleL.position.set(-0.09, 0.25, 0.13);
  const clavicleR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.010, 0.18, 12), bodySkinMat);
  clavicleR.rotation.z = -Math.PI / 2.2;
  clavicleR.position.set(0.09, 0.25, 0.13);
  torsoGroup.add(clavicleL, clavicleR);

  // 3. ANATOMICAL NECK & JVP VEIN
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 0.34, 0.02);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.098, 0.17, 24), bodySkinMat);
  neckMesh.castShadow = true;
  neckGroup.add(neckMesh);

  // Thyroid Cartilage (Adam's Apple)
  const adamsApple = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.025, 8), bodySkinMat);
  adamsApple.rotation.x = Math.PI / 2;
  adamsApple.position.set(0, 0.02, 0.088);
  neckGroup.add(adamsApple);

  // Right Internal Jugular Vein (JVP)
  const jvpMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
  const jvpVein = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 8), jvpMat);
  jvpVein.position.set(0.065, 0.01, 0.055);
  jvpVein.rotation.z = -0.22;
  jvpVein.userData = { action: 'inspect:jvp', label: 'Inspect Jugular Venous Pressure (JVP at 45°)' };
  interactables.push(jvpVein);
  neckGroup.add(jvpVein);

  torsoGroup.add(neckGroup);

  // 4. PRECISE CLINICAL AUSCULTATION LANDMARKS
  const auscMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.38 });
  const makeAuscNode = (action, label, x, y, z) => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), auscMat);
    disc.position.set(x, y, z);
    disc.rotation.x = -0.55;
    disc.userData = { action, label };
    interactables.push(disc);
    g.add(disc);
    return disc;
  };

  // Cardiac Auscultation Landmarks
  makeAuscNode('auscultate:aortic', 'Aortic Area (2nd Right Intercostal Space, Sternal Edge)', 0.06, 0.60, 0.22);
  makeAuscNode('auscultate:pulmonic', 'Pulmonic Area (2nd Left Intercostal Space, Sternal Edge)', -0.06, 0.60, 0.22);
  makeAuscNode('auscultate:erbs', "Erb's Point (3rd Left Intercostal Space, Sternal Edge)", -0.05, 0.52, 0.28);
  makeAuscNode('auscultate:tricuspid', 'Tricuspid Area (4th/5th Left Lower Sternal Border)', -0.04, 0.44, 0.34);
  makeAuscNode('auscultate:mitral', 'Mitral Apex (5th Left Intercostal Space, Mid-Clavicular Line)', -0.14, 0.40, 0.38);

  // Anterior Pulmonary Auscultation Landmarks
  makeAuscNode('auscultate:right_upper', 'Right Upper Lobe (1st/2nd ICS Anterior Chest)', 0.12, 0.56, 0.25);
  makeAuscNode('auscultate:left_upper', 'Left Upper Lobe (1st/2nd ICS Anterior Chest)', -0.12, 0.56, 0.25);
  makeAuscNode('auscultate:right_lower', 'Right Lower Lobe Base (Coarse Inspiratory Crackles in Pneumonia)', 0.14, 0.36, 0.40);
  makeAuscNode('auscultate:left_lower', 'Left Lower Lobe Base (Vesicular Breath Sounds)', -0.14, 0.36, 0.40);

  // Posterior Pulmonary Auscultation Landmarks (Accessible when patient sits forward)
  const postNodes = [
    makeAuscNode('auscultate:post_right_base', 'Posterior Right Lung Base (Marked Inspiratory Crackles)', 0.14, 0.50, -0.10),
    makeAuscNode('auscultate:post_left_base', 'Posterior Left Lung Base (Vesicular Breath Sounds)', -0.14, 0.50, -0.10),
    makeAuscNode('auscultate:post_interscapular', 'Interscapular Area (Bronchial Breathing)', 0.0, 0.62, -0.12),
  ];

  // Peripheral Palpation Points
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.40 });
  const makePulseNode = (action, label, x, y, z) => {
    const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.030, 0.048), pulseMat);
    pMesh.position.set(x, y, z);
    pMesh.userData = { action, label };
    interactables.push(pMesh);
    g.add(pMesh);
    return pMesh;
  };
  makePulseNode('palpate:radial', 'Palpate Right Radial Artery Pulse (Wrist)', 0.32, 0.21, 0.82);
  makePulseNode('palpate:carotid', 'Palpate Right Carotid Artery Pulse (Neck)', 0.08, 0.72, 0.08);
  makePulseNode('palpate:abdomen', 'Abdominal Palpation (Epigastrium & RUQ)', 0, 0.28, 0.55);

  g.add(torsoGroup);

  // 5. CONTINUOUS CONTOURED HEAD, JAW & EYES
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.86, -0.05);

  // Contoured Cranium & Facial Mesh
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.124, 32, 24), skinMat);
  headMesh.scale.set(0.92, 1.05, 1.0);
  headMesh.rotation.y = -Math.PI / 2;
  headMesh.castShadow = true;
  headGroup.add(headMesh);
  headMesh.userData = { action: 'inspect:general', label: 'Inspect Patient Facial Features, Distress & Pallor' };
  interactables.push(headMesh);

  // Sculpted 3D Nose Bridge & Tip
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, 0, 0.12);
  const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.046, 0.035), bodySkinMat);
  noseBridge.position.set(0, 0.015, 0);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), bodySkinMat);
  noseTip.position.set(0, -0.010, 0.015);
  noseGroup.add(noseBridge, noseTip);
  headGroup.add(noseGroup);

  // Shaped 3D Ears (Left & Right)
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.046, 0.026), bodySkinMat);
  earL.position.set(-0.120, 0.01, -0.01);
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.046, 0.026), bodySkinMat);
  earR.position.set(0.120, 0.01, -0.01);
  headGroup.add(earL, earR);

  // Articulated Jaw & Chin
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.07, 0.04);
  const chinMesh = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.065, 0.078), bodySkinMat);
  chinMesh.position.set(0, 0, 0.02);
  chinMesh.castShadow = true;
  jawGroup.add(chinMesh);

  // Oral Cavity & Tongue inside mouth
  const tongueMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.040), new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 }));
  tongueMesh.position.set(0, 0.02, 0.02);
  jawGroup.add(tongueMesh);
  headGroup.add(jawGroup);

  // Demographic Hair Styling
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PATIENT_PHENOTYPES[currentPhenotypeKey].hairColor),
    roughness: 0.95,
    metalness: 0.05,
  });

  const hairGroup = new THREE.Group();
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.126, 24, 16, Math.PI * 0.15, Math.PI * 1.7, 0, Math.PI * 0.58),
    hairMat
  );
  hairCap.position.set(0, 0.02, -0.015);
  hairCap.rotation.x = -0.15;
  hairGroup.add(hairCap);
  headGroup.add(hairGroup);

  // High-Flow Oxygen Mask (hidden until applied)
  const o2MaskMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.095, 16),
    new THREE.MeshStandardMaterial({ color: 0x81c784, transparent: true, opacity: 0.50, roughness: 0.2 })
  );
  o2MaskMesh.rotation.x = Math.PI / 2.1;
  o2MaskMesh.position.set(0, -0.02, 0.135);
  o2MaskMesh.visible = false;
  headGroup.add(o2MaskMesh);

  g.add(headGroup);

  // 6. ANATOMICAL ARMS & DETAILED 5-FINGER HANDS
  // Contoured Gown Sleeves
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.52, 16), gownMat);
  armL.rotation.x = Math.PI / 2.3;
  armL.position.set(-0.31, 0.28, 0.52);
  armL.castShadow = true;

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.52, 16), gownMat);
  armR.rotation.x = Math.PI / 2.3;
  armR.position.set(0.31, 0.28, 0.52);
  armR.castShadow = true;
  g.add(armL, armR);

  // Exposed Contoured Forearms
  const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.28, 16), bodySkinMat);
  forearmL.rotation.x = Math.PI / 2.1;
  forearmL.position.set(-0.31, 0.20, 0.72);
  forearmL.castShadow = true;

  const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.28, 16), bodySkinMat);
  forearmR.rotation.x = Math.PI / 2.1;
  forearmR.position.set(0.31, 0.20, 0.72);
  forearmR.castShadow = true;
  g.add(forearmL, forearmR);

  // Detailed Hands with 5 Individual Fingers
  function createDetailedHand(isRight = true) {
    const handG = new THREE.Group();
    // Palm
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.026, 0.075), bodySkinMat);
    palm.castShadow = true;
    handG.add(palm);

    // 5 Contoured Digits (Thumb, Index, Middle, Ring, Pinky)
    const fingerGeo = new THREE.CylinderGeometry(0.007, 0.006, 0.042, 8);
    const fingerPositions = [
      [-0.038, 0.002, 0.015, Math.PI / 4], // Thumb
      [-0.025, 0.001, 0.050, 0],            // Index
      [-0.008, 0.001, 0.054, 0],            // Middle
      [0.009, 0.001, 0.051, 0],             // Ring
      [0.026, 0.001, 0.044, 0],             // Pinky
    ];

    fingerPositions.forEach(([fx, fy, fz, rz]) => {
      const fMesh = new THREE.Mesh(fingerGeo, bodySkinMat);
      fMesh.rotation.x = Math.PI / 2;
      fMesh.rotation.z = isRight ? rz : -rz;
      fMesh.position.set(isRight ? fx : -fx, fy, fz);
      handG.add(fMesh);
    });

    return handG;
  }

  const handLeftGroup = createDetailedHand(false);
  handLeftGroup.position.set(-0.31, 0.18, 0.86);
  const handRightGroup = createDetailedHand(true);
  handRightGroup.position.set(0.31, 0.18, 0.86);
  handRightGroup.userData = { action: 'inspect:hands', label: 'Inspect Hands, Periphery, Clubbing & Nails' };
  interactables.push(handRightGroup);
  g.add(handLeftGroup, handRightGroup);

  // Capillary Refill Testing Nail Bed (Right Index)
  const nailMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.3 });
  const nailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.016), nailMat);
  nailMesh.position.set(0.285, 0.198, 0.91);
  nailMesh.userData = { action: 'test:crt', label: 'Test Capillary Refill Time (Nail Bed Blanching)' };
  interactables.push(nailMesh);
  g.add(nailMesh);

  // Barcoded Hospital ID Wristband (Left Wrist)
  const wristBandTex = document.createElement('canvas');
  wristBandTex.width = 256; wristBandTex.height = 64;
  const wCtx = wristBandTex.getContext('2d');
  wCtx.fillStyle = '#ffffff'; wCtx.fillRect(0, 0, 256, 64);
  wCtx.fillStyle = '#ef4444'; wCtx.fillRect(0, 0, 32, 64);
  wCtx.fillStyle = '#0f172a';
  wCtx.font = 'bold 12px monospace';
  wCtx.fillText('SMITH, JOHN 14-04-1978', 38, 22);
  wCtx.fillText('NHS# 492 819 0281 | ALLERGY: PEN', 38, 44);
  const bandCanvasTex = new THREE.CanvasTexture(wristBandTex);
  const wristBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.046, 0.035, 16),
    new THREE.MeshStandardMaterial({ map: bandCanvasTex, roughness: 0.4 })
  );
  wristBand.rotation.x = Math.PI / 2;
  wristBand.position.set(-0.31, 0.19, 0.82);
  wristBand.userData = { action: 'inspect:wristband', label: 'Check Hospital ID Wristband & Patient Identifiers' };
  interactables.push(wristBand);
  g.add(wristBand);

  // 20G IV Cannula on Right Hand Dorsum with Sterile Tegaderm
  const cannulaGroup = new THREE.Group();
  cannulaGroup.position.set(0.31, 0.20, 0.84);
  const tegaderm = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1 })
  );
  tegaderm.rotation.x = -Math.PI / 2;
  cannulaGroup.add(tegaderm);

  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.024), new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 }));
  hub.position.set(0, 0.008, 0);
  cannulaGroup.add(hub);
  cannulaGroup.userData = { action: 'inspect:iv', label: 'Inspect 20G IV Cannula Access Site & Patency' };
  interactables.push(cannulaGroup);
  g.add(cannulaGroup);

  // Pulse Oximeter Clip on Right Index Finger
  const oxClip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.022, 0.048), new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.3 }));
  oxClip.position.set(0.285, 0.205, 0.90);
  oxClip.visible = false;
  g.add(oxClip);

  // 7. DRAPED HOSPITAL BED LINENS
  const beddingGroup = new THREE.Group();
  beddingGroup.position.set(0, 0.12, 0.72);

  const sheetDrape = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.18, 0.94),
    beddingMat
  );
  sheetDrape.castShadow = true;
  sheetDrape.receiveShadow = true;
  beddingGroup.add(sheetDrape);

  const sheetCuff = new THREE.Mesh(
    new THREE.BoxGeometry(0.90, 0.03, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 })
  );
  sheetCuff.position.set(0, 0.10, -0.40);
  beddingGroup.add(sheetCuff);
  g.add(beddingGroup);

  // 8. PATHOLOGY MESHES (Burns, Lacerations, Emesis)
  const burnTex = document.createElement('canvas');
  burnTex.width = 256; burnTex.height = 256;
  const bCtx = burnTex.getContext('2d');
  bCtx.fillStyle = '#991b1b'; bCtx.fillRect(0, 0, 256, 256);
  bCtx.fillStyle = '#18181b';
  for (let i = 0; i < 40; i++) {
    bCtx.beginPath();
    bCtx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 18, 0, Math.PI * 2);
    bCtx.fill();
  }
  bCtx.fillStyle = 'rgba(254, 240, 138, 0.85)';
  for (let i = 0; i < 25; i++) {
    bCtx.beginPath();
    bCtx.arc(Math.random() * 256, Math.random() * 256, 5 + Math.random() * 12, 0, Math.PI * 2);
    bCtx.fill();
  }
  const burnCanvasTex = new THREE.CanvasTexture(burnTex);
  const burnMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.32),
    new THREE.MeshStandardMaterial({ map: burnCanvasTex, roughness: 0.35, metalness: 0.1 })
  );
  burnMesh.position.set(-0.31, 0.22, 0.65);
  burnMesh.visible = false;
  burnMesh.userData = { action: 'inspect:burn', label: 'Inspect Burn Injury (Partial & Full Thickness)' };
  interactables.push(burnMesh);
  g.add(burnMesh);

  const lacerationGroup = new THREE.Group();
  lacerationGroup.position.set(0.08, 0.42, 0.32);
  lacerationGroup.rotation.x = -0.55;
  const woundCleft = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.01), new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.2 }));
  lacerationGroup.add(woundCleft);
  const bloodDrip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.008), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.1, metalness: 0.2 }));
  bloodDrip.position.set(0, -0.06, 0.005);
  lacerationGroup.add(bloodDrip);
  lacerationGroup.visible = false;
  lacerationGroup.userData = { action: 'inspect:wound', label: 'Inspect Traumatic Hemorrhage / Wound' };
  interactables.push(lacerationGroup);
  g.add(lacerationGroup);

  const emesisGroup = new THREE.Group();
  emesisGroup.position.set(0.48, 0.68, -0.2);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 }));
  dish.scale.set(1.4, 1.0, 0.8);
  emesisGroup.add(dish);
  const vomitFluid = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshStandardMaterial({ color: 0xa3e635, roughness: 0.2 }));
  vomitFluid.rotation.x = -Math.PI / 2;
  vomitFluid.position.y = 0.02;
  dish.add(vomitFluid);
  emesisGroup.visible = false;
  emesisGroup.userData = { action: 'inspect:emesis', label: 'Inspect Bedside Emesis / Vomitus' };
  interactables.push(emesisGroup);
  g.add(emesisGroup);

  // --------------------------------------------------------------------------
  // PATIENT COMPLIANCE & ANIMATION SYSTEM
  // --------------------------------------------------------------------------
  const state = {
    talking: false,
    breathRate: 0.53, // 32 bpm baseline
    oxygenActive: false,
    pulseOxAttached: false,
    blinkTimer: 0,
    isBlinking: false,

    targetTorsoTilt: -0.55,
    currentTorsoTilt: -0.55,
    targetHeadRotY: 0.0,
    currentHeadRotY: 0.0,
    targetJawDrop: 0.0,
    currentJawDrop: 0.0,
    deepBreathFactor: 1.0,
    deepBreathActive: false,
    crtBlanching: false,
  };

  function updateTexture() {
    headTexData.tex.dispose();
    headTexData = createPatientHeadTexture(currentPhenotypeKey, {
      cyanosis: currentCyanosis,
      diaphoresis: currentDiaphoresis,
      eyesClosed: state.isBlinking,
      mouthOpen,
      sootLevel,
      woundLevel,
    });
    skinMat.map = headTexData.tex;
    skinMat.needsUpdate = true;
  }

  function setPhenotype(key) {
    if (!PATIENT_PHENOTYPES[key]) return;
    currentPhenotypeKey = key;
    const p = PATIENT_PHENOTYPES[key];
    bodySkinColor.set(p.skinBase);
    bodySkinMat.color.set(p.skinBase);
    bodySkinMat.needsUpdate = true;
    hairMat.color.set(p.hairColor);
    hairMat.needsUpdate = true;
    updateTexture();
  }

  return {
    group: g,
    getPhenotype: () => currentPhenotypeKey,
    setPhenotype,
    setTalking(v) { state.talking = !!v; },
    setBreathing(rr) {
      const val = typeof rr === 'number' ? rr : 32;
      state.breathRate = Math.min(1.0, Math.max(0.2, val / 60));
    },
    setOxygen(active) {
      state.oxygenActive = !!active;
      o2MaskMesh.visible = !!active;
      currentCyanosis = active ? 0.0 : 0.85;
      updateTexture();
    },
    setPulseOx(attached) {
      state.pulseOxAttached = !!attached;
      oxClip.visible = !!attached;
    },
    setCyanosis(val) {
      currentCyanosis = Math.min(1.0, Math.max(0.0, val));
      updateTexture();
    },
    setDiaphoresis(val) {
      currentDiaphoresis = Math.min(1.0, Math.max(0.0, val));
      skinMat.roughness = 0.65 - currentDiaphoresis * 0.30;
      updateTexture();
    },
    setTraumaVisual(type) {
      burnMesh.visible = (type === 'burn');
      lacerationGroup.visible = (type === 'trauma');
      emesisGroup.visible = (type === 'vomit');
      sootLevel = (type === 'burn') ? 0.9 : 0.0;
      woundLevel = (type === 'trauma') ? 0.9 : 0.0;
      updateTexture();
    },

    // Clinical Compliance Manoeuvres
    takeDeepBreath() {
      state.deepBreathActive = true;
      state.deepBreathFactor = 1.35;
      setTimeout(() => {
        state.deepBreathActive = false;
        state.deepBreathFactor = 1.0;
      }, 2500);
    },

    openMouth() {
      mouthOpen = true;
      state.targetJawDrop = 0.045;
      updateTexture();
      setTimeout(() => {
        mouthOpen = false;
        state.targetJawDrop = 0.0;
        updateTexture();
      }, 3500);
    },

    turnHead(direction = 'left') {
      state.targetHeadRotY = (direction === 'left') ? 0.65 : -0.65;
      setTimeout(() => {
        state.targetHeadRotY = 0.0;
      }, 5000);
    },

    sitForward() {
      state.targetTorsoTilt = -0.10;
      postNodes.forEach((n) => { n.visible = true; });
    },

    lieBack() {
      state.targetTorsoTilt = -0.55;
    },

    squeezeFingers() {
      handRightGroup.scale.set(0.85, 0.85, 0.85);
      setTimeout(() => {
        handRightGroup.scale.set(1.0, 1.0, 1.0);
      }, 1500);
    },

    testCapillaryRefill() {
      state.crtBlanching = true;
      nailMat.color.set('#ffffff');
      setTimeout(() => {
        nailMat.color.set('#fbcfe8');
        state.crtBlanching = false;
      }, 1800);
    },

    // Frame update loop
    update(t) {
      state.currentTorsoTilt += (state.targetTorsoTilt - state.currentTorsoTilt) * 0.06;
      torsoGroup.rotation.x = state.currentTorsoTilt;

      state.currentHeadRotY += (state.targetHeadRotY - state.currentHeadRotY) * 0.08;
      headGroup.rotation.y = state.currentHeadRotY + (state.talking ? Math.sin(t * 3) * 0.04 : Math.sin(t * 0.6) * 0.015);

      state.currentJawDrop += (state.targetJawDrop - state.currentJawDrop) * 0.12;
      jawGroup.position.y = -0.07 - state.currentJawDrop;

      // Thoracic respiratory motion (chest heave)
      const breathPhase = Math.sin(t * Math.PI * 2 * state.breathRate);
      const expansion = (1 + breathPhase * 0.05) * state.deepBreathFactor;
      torsoGroup.scale.set(expansion, 1 + breathPhase * 0.03, expansion);
      torsoGroup.position.y = 0.45 + breathPhase * 0.012 * state.deepBreathFactor;

      // JVP pulse wave
      const jvpPulse = (Math.sin(t * 12) + Math.sin(t * 24)) * 0.002;
      jvpVein.scale.set(1 + jvpPulse * 20, 1, 1 + jvpPulse * 20);

      // Natural eye blink cycle
      state.blinkTimer += 0.016;
      if (state.blinkTimer > 3.8 && !state.isBlinking) {
        state.isBlinking = true;
        updateTexture();
      } else if (state.blinkTimer > 3.95 && state.isBlinking) {
        state.isBlinking = false;
        state.blinkTimer = 0;
        updateTexture();
      }
    },
  };
}
