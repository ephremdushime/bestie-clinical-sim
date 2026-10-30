import * as THREE from 'three';
import { makeCanvasTexture } from './room.js';

// In-world UI panel drawn to a canvas. Buttons are hit-tested from raycast UV coordinates.
export class Panel {
  constructor(w = 1024, h = 768, widthM = 1.3) {
    this.w = w; this.h = h;
    const { canvas, ctx, tex } = makeCanvasTexture(w, h);
    this.canvas = canvas; this.ctx = ctx; this.tex = tex; this.buttons = []; this.hover = null;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, widthM * h / w), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  }

  // content: { title, banner, status, lines:[{text,color?,size?}], buttons:[{id,label,x,y,w,h,active?,disabled?}], caption }
  draw(c) {
    const { ctx, w, h } = this;
    ctx.fillStyle = 'rgba(13,27,42,0.96)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(c.banner || 'FICTIONAL SIMULATED PATIENT · FORMATIVE FEEDBACK ONLY', 16, 30);
    ctx.fillStyle = '#80deea'; ctx.font = 'bold 34px sans-serif'; ctx.fillText(c.title || '', 20, 92);
    if (c.status) { ctx.textAlign = 'right'; ctx.fillStyle = c.statusColor || '#ffd54f'; ctx.font = 'bold 28px sans-serif'; ctx.fillText(c.status, w - 20, 92); ctx.textAlign = 'left'; }
    let y = c.lineY || 132;
    (c.lines || []).forEach((l) => { ctx.font = `${l.size || 26}px sans-serif`; ctx.fillStyle = l.color || '#eceff1'; y = this._wrap(l.text, 20, y, w - 40, (l.size || 26) + 8); });
    this.buttons = c.buttons || [];
    this.buttons.forEach((b) => {
      ctx.fillStyle = b.disabled ? '#37474f' : b.active ? '#00acc1' : (this.hover === b.id ? '#1e88e5' : '#2c4a6b');
      ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = '#80deea'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.disabled ? '#78909c' : '#fff'; ctx.font = `bold ${b.size || 24}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2, b.w - 12); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });
    if (c.caption) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, h - 150, w, 150);
      ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif'; this._wrap(c.caption, 20, h - 112, w - 40, 36, 3);
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
