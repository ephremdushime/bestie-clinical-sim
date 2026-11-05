import * as THREE from 'three';
import { makeCanvasTexture } from './room.js';

// In-world UI panel drawn to a canvas. Mounted on a realistic 3D mobile medical cart stand.
export class Panel {
  constructor(w = 1024, h = 768, widthM = 0.95) {
    this.w = w; this.h = h;
    const { canvas, ctx, tex } = makeCanvasTexture(w, h);
    this.canvas = canvas; this.ctx = ctx; this.tex = tex; this.buttons = []; this.hover = null;

    // Root group containing the interactive screen and the physical medical terminal stand
    this.mesh = new THREE.Group();

    // 1. Interactive Display Quad
    const screenH = widthM * h / w;
    this.screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(widthM, screenH),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    this.screenMesh.position.set(0, 0, 0.015);
    this.mesh.add(this.screenMesh);

    // 2. Physical 3D Monitor Bezel & Housing
    const bezelM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 });
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(widthM + 0.04, screenH + 0.04, 0.03),
      bezelM
    );
    housing.position.set(0, 0, 0);
    this.mesh.add(housing);

    // Power indicator LED on bezel
    const ledM = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.005, 12), ledM);
    led.position.set(widthM / 2 - 0.03, -screenH / 2 + 0.015, 0.016);
    this.mesh.add(led);

    // 3. Ergonomic Medical Cart Articulating Arm & Mobile Stand
    const chromeM = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 16), chromeM);
    pole.position.set(0, -screenH / 2 - 0.625, -0.04);
    this.mesh.add(pole);

    // Wheeled 5-star base on floor
    const baseG = new THREE.Group();
    baseG.position.set(0, -screenH / 2 - 1.25, -0.04);
    for (let i = 0; i < 5; i++) {
      const legAngle = (i * Math.PI * 2) / 5;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.26), chromeM);
      leg.position.set(Math.sin(legAngle) * 0.13, 0.02, Math.cos(legAngle) * 0.13);
      leg.rotation.y = legAngle;
      baseG.add(leg);

      const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 12), bezelM);
      caster.rotation.z = Math.PI / 2;
      caster.position.set(Math.sin(legAngle) * 0.24, 0.02, Math.cos(legAngle) * 0.24);
      baseG.add(caster);
    }
    this.mesh.add(baseG);
  }

  // content: { title, banner, status, lines:[{text,color?,size?}], buttons:[{id,label,x,y,w,h,active?,disabled?}], caption }
  draw(c) {
    const { ctx, w, h } = this;
    ctx.fillStyle = 'rgba(11, 20, 34, 0.98)'; ctx.fillRect(0, 0, w, h);

    // Top Header Banner
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(c.banner || 'BESTIE CLINICAL SIM · VIRTUAL TEACHING HOSPITAL', 16, 30);

    // Persistent top-right control buttons: Exit VR and Hide/Show Monitor
    const defaultTopButtons = [
      { id: 'exit', label: '🚪 Exit VR', x: w - 150, y: 6, w: 136, h: 32, size: 16, bg: '#991b1b' },
      { id: 'toggle_monitor', label: '➖ Hide Chart', x: w - 280, y: 6, w: 122, h: 32, size: 16, bg: '#334155' },
    ];

    ctx.fillStyle = '#80deea'; ctx.font = 'bold 32px sans-serif'; ctx.fillText(c.title || '', 20, 92);
    if (c.status) {
      ctx.textAlign = 'right'; ctx.fillStyle = c.statusColor || '#ffd54f'; ctx.font = 'bold 26px sans-serif';
      ctx.fillText(c.status, w - 20, 92); ctx.textAlign = 'left';
    }

    let y = c.lineY || 132;
    (c.lines || []).forEach((l) => {
      ctx.font = `${l.size || 24}px sans-serif`; ctx.fillStyle = l.color || '#eceff1';
      y = this._wrap(l.text, 20, y, w - 40, (l.size || 24) + 8);
    });

    // Merge custom buttons with persistent top buttons
    this.buttons = [...(c.buttons || []), ...defaultTopButtons];

    this.buttons.forEach((b) => {
      ctx.fillStyle = b.disabled ? '#37474f' : b.active ? '#00acc1' : (b.bg || (this.hover === b.id ? '#1e88e5' : '#2c4a6b'));
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#80deea'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.disabled ? '#78909c' : '#fff'; ctx.font = `bold ${b.size || 22}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2, b.w - 12);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });

    if (c.caption) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, h - 140, w, 140);
      ctx.fillStyle = '#fff'; ctx.font = '26px sans-serif'; this._wrap(c.caption, 20, h - 105, w - 40, 34, 3);
    }
    this.tex.needsUpdate = true;
  }

  _wrap(text, x, y, maxW, lh, maxLines = 99) {
    const { ctx } = this; let line = '', n = 0;
    for (const word of String(text).split(/\s+/)) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = word; if (++n >= maxLines) return y; } else line = t;
    }
    ctx.fillText(line, x, y); return y + lh;
  }

  hit(uv) {
    const px = uv.x * this.w, py = (1 - uv.y) * this.h;
    return this.buttons.find((b) => !b.disabled && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) || null;
  }
}
