import * as THREE from 'three';

/**
 * BESTIE CLINICAL SIM — PANORAMIC EXTERIOR VISTA & ARCHITECTURAL WINDOW
 * Creates a panoramic exterior landscape (sky, mountains, clouds, hospital campus gardens)
 * visible through a large multi-pane hospital architectural window.
 * Provides immense stereoscopic depth and real-world presence in VR.
 */

// Procedural high-resolution panoramic landscape texture
function createPanoramicVistaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. SKY GRADIENT (Daylight Azure to Soft Horizon)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 620);
  skyGrad.addColorStop(0, '#0284c7');    // Deep vibrant sky blue
  skyGrad.addColorStop(0.35, '#38bdf8'); // Radiant azure
  skyGrad.addColorStop(0.70, '#bae6fd'); // Soft atmospheric haze
  skyGrad.addColorStop(1.0, '#e0f2fe');  // Horizon glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 2048, 620);

  // Soft Sun Disc with atmospheric corona
  const sunX = 1450, sunY = 180;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260);
  sunGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  sunGrad.addColorStop(0.15, 'rgba(254, 240, 138, 0.85)');
  sunGrad.addColorStop(0.45, 'rgba(253, 224, 71, 0.35)');
  sunGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
  ctx.fill();

  // 2. VOLUMETRIC CIRRUS & CUMULUS CLOUDS
  const drawCloud = (cx, cy, scaleX, scaleY, opacity = 0.55) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    for (let i = 0; i < 7; i++) {
      const offsetX = (i - 3) * (scaleX * 0.28);
      const offsetY = Math.sin(i * 1.2) * (scaleY * 0.18);
      const rad = scaleY * (0.45 + (1 - Math.abs(i - 3) / 4) * 0.45);
      ctx.beginPath();
      ctx.ellipse(cx + offsetX, cy + offsetY, rad * 1.5, rad, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  drawCloud(320, 140, 280, 65, 0.65);
  drawCloud(780, 220, 360, 80, 0.75);
  drawCloud(1180, 110, 240, 50, 0.50);
  drawCloud(1720, 180, 320, 70, 0.60);
  drawCloud(190, 260, 220, 48, 0.45);

  // 3. DISTANT MOUNTAIN RANGE (Layer 1 - Deep Atmospheric Haze)
  ctx.fillStyle = '#93c5fd'; // Distance atmospheric blue
  ctx.beginPath();
  ctx.moveTo(0, 480);
  const mountainPoints1 = [
    [0, 480], [180, 340], [360, 420], [540, 310], [720, 390],
    [920, 280], [1120, 380], [1320, 290], [1520, 410], [1720, 330],
    [1920, 430], [2048, 380], [2048, 620], [0, 620]
  ];
  mountainPoints1.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();

  // 4. MID-DISTANCE MOUNTAIN PEAKS & RIDGES (Layer 2 - Rich Teal/Slate Blue)
  const mtnGrad = ctx.createLinearGradient(0, 320, 0, 580);
  mtnGrad.addColorStop(0, '#60a5fa');
  mtnGrad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = mtnGrad;
  ctx.beginPath();
  ctx.moveTo(0, 520);
  const mountainPoints2 = [
    [0, 520], [140, 430], [290, 490], [460, 380], [610, 450],
    [810, 360], [1010, 460], [1210, 370], [1410, 470], [1610, 390],
    [1810, 480], [2048, 420], [2048, 620], [0, 620]
  ];
  mountainPoints2.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();

  // Mountain snowcaps & ridge highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  [[460, 380], [810, 360], [1210, 370], [1610, 390]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 35, py + 38);
    ctx.lineTo(px + 20, py + 32);
    ctx.closePath();
    ctx.fill();
  });

  // 5. HOSPITAL CAMPUS FOOTHILLS & FORESTRY (Layer 3)
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(0, 540);
  for (let x = 0; x <= 2048; x += 32) {
    const y = 490 + Math.sin(x * 0.008) * 28 + Math.cos(x * 0.02) * 12;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(2048, 680);
  ctx.lineTo(0, 680);
  ctx.closePath();
  ctx.fill();

  // 6. MODERN HOSPITAL PAVILION BUILDINGS & MEDICAL CAMPUS
  // Neighboring medical wing across courtyard
  const drawBuilding = (bx, by, bw, bh, col, winCol = '#bae6fd') => {
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, bw, bh);

    // Architectural window grid
    ctx.fillStyle = winCol;
    for (let wy = by + 12; wy < by + bh - 16; wy += 22) {
      for (let wx = bx + 12; wx < bx + bw - 12; wx += 24) {
        ctx.fillRect(wx, wy, 15, 12);
      }
    }
    // Roof coping
    ctx.fillStyle = '#475569';
    ctx.fillRect(bx - 3, by - 5, bw + 6, 6);
  };
  drawBuilding(180, 480, 260, 160, '#cbd5e1');
  drawBuilding(520, 440, 340, 200, '#e2e8f0');
  drawBuilding(960, 490, 240, 150, '#94a3b8');
  drawBuilding(1320, 460, 380, 180, '#f1f5f9');
  drawBuilding(1780, 500, 220, 140, '#cbd5e1');

  // Red Cross / Medical Symbol on main pavilion
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(680, 460, 24, 8);
  ctx.fillRect(688, 452, 8, 24);

  // 7. LUSH GREEN HOSPITAL COURTYARD & TREES
  // Courtyard grass
  const grassGrad = ctx.createLinearGradient(0, 600, 0, 1024);
  grassGrad.addColorStop(0, '#15803d');
  grassGrad.addColorStop(0.4, '#16a34a');
  grassGrad.addColorStop(1.0, '#22c55e');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, 600, 2048, 424);

  // Paved courtyard walkways
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(340, 1024);
  ctx.lineTo(620, 640);
  ctx.lineTo(720, 640);
  ctx.lineTo(580, 1024);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(1480, 1024);
  ctx.lineTo(1240, 640);
  ctx.lineTo(1320, 640);
  ctx.lineTo(1640, 1024);
  ctx.closePath();
  ctx.fill();

  // Courtyard Deciduous & Pine Trees
  const drawTree = (tx, ty, r, treeCol = '#166534') => {
    // Trunk
    ctx.fillStyle = '#451a03';
    ctx.fillRect(tx - r * 0.12, ty, r * 0.24, r * 0.7);

    // Foliage clusters
    ctx.fillStyle = treeCol;
    ctx.beginPath(); ctx.arc(tx, ty - r * 0.3, r * 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx - r * 0.35, ty - r * 0.15, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + r * 0.35, ty - r * 0.15, r * 0.5, 0, Math.PI * 2); ctx.fill();

    // Top highlight
    ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.beginPath(); ctx.arc(tx - r * 0.1, ty - r * 0.45, r * 0.38, 0, Math.PI * 2); ctx.fill();
  };

  for (let i = 0; i < 48; i++) {
    const tx = 40 + i * 42 + Math.sin(i * 3) * 15;
    const ty = 660 + (i % 6) * 45;
    const tr = 28 + (i % 5) * 8;
    const col = i % 3 === 0 ? '#14532d' : i % 3 === 1 ? '#15803d' : '#166534';
    drawTree(tx, ty, tr, col);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Builds the exterior vista panorama cylinder and the architectural window.
 */
export function buildHospitalWindowAndVista() {
  const group = new THREE.Group();

  // 1. PANORAMIC EXTERIOR CYLINDER VISTA
  const vistaTex = createPanoramicVistaTexture();
  const vistaGeom = new THREE.CylinderGeometry(14.0, 14.0, 10.0, 48, 1, true, -Math.PI * 0.65, Math.PI * 1.3);
  const vistaMat = new THREE.MeshBasicMaterial({
    map: vistaTex,
    side: THREE.BackSide,
    fog: false,
  });
  const vistaMesh = new THREE.Mesh(vistaGeom, vistaMat);
  vistaMesh.position.set(-1.0, 2.2, 0);
  vistaMesh.rotation.y = Math.PI / 2;
  group.add(vistaMesh);

  // 2. ARCHITECTURAL MULTI-PANE WINDOW (Positioned on the West Wall at x = -3.28)
  const winGroup = new THREE.Group();
  winGroup.position.set(-3.28, 1.70, 0);
  winGroup.rotation.y = Math.PI / 2;

  const winW = 3.60, winH = 1.65;
  const frameM = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.65 });

  // Main Outer Perimeter Frame
  const frameThick = 0.08, frameDepth = 0.12;
  // Top
  const fTop = new THREE.Mesh(new THREE.BoxGeometry(winW, frameThick, frameDepth), frameM);
  fTop.position.set(0, winH / 2, 0);
  winGroup.add(fTop);
  // Bottom / Window Sill
  const sillM = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.15 });
  const fBottom = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.15, frameThick + 0.04, frameDepth + 0.12), sillM);
  fBottom.position.set(0, -winH / 2, 0.04);
  winGroup.add(fBottom);
  // Left Jamb
  const fLeft = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), frameM);
  fLeft.position.set(-winW / 2 + frameThick / 2, 0, 0);
  winGroup.add(fLeft);
  // Right Jamb
  const fRight = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), frameM);
  fRight.position.set(winW / 2 - frameThick / 2, 0, 0);
  winGroup.add(fRight);

  // Vertical Mullions (Dividing into 3 large architectural panes)
  [-winW / 6, winW / 6].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.045, winH, frameDepth * 0.8), frameM);
    mullion.position.set(mx, 0, 0);
    winGroup.add(mullion);
  });

  // Horizontal Transom Bar (Upper third)
  const transom = new THREE.Mesh(new THREE.BoxGeometry(winW - frameThick * 2, 0.04, frameDepth * 0.7), frameM);
  transom.position.set(0, winH / 2 - 0.42, 0);
  winGroup.add(transom);

  // Clear Double-Glazed Window Glass with Realistic Reflections
  const glassM = new THREE.MeshStandardMaterial({
    color: 0xecfeff,
    roughness: 0.04,
    metalness: 0.12,
    transparent: true,
    opacity: 0.22,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - frameThick * 2, winH - frameThick * 2), glassM);
  glass.position.set(0, 0, 0.01);
  winGroup.add(glass);

  // Internal Venetian Blind Slats (partially drawn at top)
  const blindM = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.1 });
  for (let b = 0; b < 6; b++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(winW - frameThick * 2, 0.025, 0.035), blindM);
    slat.position.set(0, winH / 2 - 0.08 - b * 0.032, 0.03);
    slat.rotation.x = 0.35;
    winGroup.add(slat);
  }

  group.add(winGroup);

  // 3. WARM DIRECTIONAL SUNLIGHT BEAM ENTERING THROUGH WINDOW
  const sunLight = new THREE.DirectionalLight(0xfffaed, 1.8);
  sunLight.position.set(-6.0, 4.5, 1.5);
  sunLight.target.position.set(0, 0.7, -1.2); // Directed at patient bed
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 14.0;
  sunLight.shadow.camera.left = -3.0;
  sunLight.shadow.camera.right = 3.0;
  sunLight.shadow.camera.top = 3.0;
  sunLight.shadow.camera.bottom = -3.0;
  sunLight.shadow.bias = -0.0004;
  group.add(sunLight);
  group.add(sunLight.target);

  return group;
}
