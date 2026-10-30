import * as THREE from 'three';
import { PATIENT_PHENOTYPES, createPatientHeadTexture } from './patientModel.js';
import { makeTexture } from './hospitalTools.js';

const mat = (color, rough = 0.7, metal = 0.1) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

// --------------------------------------------------------------------------
// PROCEDURAL CLINICAL STAFF MEMBERS (Medical Student, Ward Nurse, Consultant)
// --------------------------------------------------------------------------
export function createClinicalStaffMember({
  role = 'nurse',
  phenotypeKey = 'black-female',
  name = 'Staff Nurse Amina',
  interactables = [],
} = {}) {
  const group = new THREE.Group();
  const pheno = PATIENT_PHENOTYPES[phenotypeKey] || PATIENT_PHENOTYPES['black-female'];

  // 1. Realistic Procedural Anatomical Head
  const headGeo = new THREE.SphereGeometry(0.11, 24, 24);
  headGeo.scale(0.85, 1.15, 0.95);
  const headTex = createPatientHeadTexture(phenotypeKey, { cyanosis: 0.0, diaphoresis: 0.0, eyesClosed: false });
  const headMat = new THREE.MeshStandardMaterial({
    map: headTex,
    roughness: 0.55,
    metalness: 0.05,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.55;
  group.add(head);

  // Hair style geometry
  const hairM = mat(parseInt(pheno.hairColor.replace('#', '0x'), 16), 0.9, 0.05);
  if (pheno.hairStyle === 'braided-updo' || pheno.hairStyle === 'wavy-shoulder') {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), hairM);
    hair.position.set(0, 1.62, -0.02);
    hair.scale.set(0.9, 0.8, 0.95);
    group.add(hair);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.118, 16, 16), hairM);
    hair.position.set(0, 1.60, -0.015);
    hair.scale.set(0.88, 0.7, 0.92);
    group.add(hair);
  }

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.10, 16), headMat);
  neck.position.y = 1.44;
  group.add(neck);

  // 2. Uniform & Torso
  let scrubColor = 0x0284c7; // Default royal blue medical scrubs
  let badgeTitle = 'STAFF NURSE';
  let badgeColor = '#0284c7';

  if (role === 'student') {
    scrubColor = 0x059669; // Emerald green university medical student scrubs
    badgeTitle = 'STUDENT DOCTOR';
    badgeColor = '#059669';
  } else if (role === 'consultant') {
    scrubColor = 0x334155; // Dark slate consultant scrub with white coat
    badgeTitle = 'CONSULTANT PHYSICIAN';
    badgeColor = '#b91c1c';
  }

  const torso = box(0.38, 0.58, 0.22, mat(scrubColor, 0.85, 0.05));
  torso.position.y = 1.15;
  group.add(torso);

  // Consultant white clinical consultation coat layer
  if (role === 'consultant') {
    const coat = box(0.42, 0.64, 0.24, mat(0xf8fafc, 0.8, 0.05));
    coat.position.set(0, 1.14, -0.005);
    group.add(coat);
  }

  // 3. Identification Badge & Lanyard
  const badgeTex = makeTexture(256, 160, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = badgeColor;
    ctx.fillRect(0, 0, 256, 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('UNIVERSITY TEACHING HOSPITAL', 12, 24);

    // Simulated staff photo box
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(16, 48, 64, 80);
    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    ctx.fillText('PHOTO', 30, 94);

    // Name & Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(name, 90, 72);
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(badgeTitle, 90, 96);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('ID: 2026-MED-' + Math.floor(1000 + Math.random() * 9000), 90, 118);
  });

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.06),
    new THREE.MeshBasicMaterial({ map: badgeTex })
  );
  badge.position.set(0.10, 1.25, 0.115);
  group.add(badge);

  // Woven fabric lanyard around neck
  const lanyardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.06, 1.42, 0.02),
    new THREE.Vector3(-0.04, 1.30, 0.11),
    new THREE.Vector3(0.08, 1.27, 0.115),
    new THREE.Vector3(0.06, 1.42, 0.02),
  ]);
  const lanyard = new THREE.Mesh(
    new THREE.TubeGeometry(lanyardCurve, 16, 0.003, 8, false),
    mat(0x1d4ed8, 0.8, 0.05)
  );
  group.add(lanyard);

  // Fob watch pinned to pocket for Ward Nurse
  if (role === 'nurse') {
    const fobWatch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16), mat(0xd4d4d8, 0.2, 0.9));
    fobWatch.rotation.x = Math.PI / 2;
    fobWatch.position.set(-0.11, 1.26, 0.114);
    group.add(fobWatch);
  }

  // 4. Arms & Hands
  [-0.23, 0.23].forEach((ax) => {
    // Upper arm in scrub sleeve
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.32, 12), mat(scrubColor, 0.85, 0.05));
    upperArm.position.set(ax, 1.20, 0);
    group.add(upperArm);

    // Forearm in skin tone
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.28, 12), headMat);
    forearm.position.set(ax, 0.95, 0.04);
    forearm.rotation.x = 0.2;
    group.add(forearm);

    // Hand
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.025), headMat);
    hand.position.set(ax, 0.78, 0.07);
    group.add(hand);
  });

  // Clinical Clipboard held by Medical Student
  if (role === 'student') {
    const clipBoard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.28, 0.01), mat(0x78350f, 0.7, 0.1));
    clipBoard.position.set(0, 0.98, 0.20);
    clipBoard.rotation.x = -0.5;
    group.add(clipBoard);

    const chartPaperTex = makeTexture(256, 320, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 320);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 256, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('CLINICAL ADMISSION NOTE', 10, 20);
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px monospace';
      ctx.fillText('Pt: Unstable Respiratory', 10, 50);
      ctx.fillText('SpO2: 88% room air', 10, 75);
      ctx.fillText('Action: ABCDE assessment', 10, 100);
      ctx.fillText('Order: High-flow O2 mask', 10, 125);
    });
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.25), new THREE.MeshBasicMaterial({ map: chartPaperTex }));
    paper.position.set(0, 0.98, 0.208);
    paper.rotation.x = -0.5;
    group.add(paper);
  }

  // 5. Scrub Trousers & Hospital Clogs
  const pantsM = mat(scrubColor, 0.9, 0.05);
  [-0.10, 0.10].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.85, 12), pantsM);
    leg.position.set(lx, 0.45, 0);
    group.add(leg);

    // Washable white/navy medical theatre clogs
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.22), mat(0xf8fafc, 0.5, 0.1));
    shoe.position.set(lx, 0.035, 0.03);
    group.add(shoe);
  });

  // Make staff member interactable
  torso.userData = {
    action: `staff:${role}`,
    label: `${name} (${badgeTitle}) — Tap to consult or request task`,
  };
  interactables.push(torso);

  // Subtle natural idle breathing animation
  let breathPhase = Math.random() * Math.PI * 2;
  const update = (delta = 0.016) => {
    breathPhase += delta * 1.5;
    const dy = Math.sin(breathPhase) * 0.003;
    torso.scale.set(1 + dy * 2, 1 + dy, 1 + dy * 3);
    head.position.y = 1.55 + dy;
  };

  return { group, head, update, name, role };
}

