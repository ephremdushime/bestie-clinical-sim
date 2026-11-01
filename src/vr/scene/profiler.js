import * as THREE from 'three';

/**
 * Lightweight real-time VR/Desktop performance profiler for Meta Quest 3 benchmarking.
 * Renders draw calls, triangles, frame time (ms), and FPS into a dynamic texture
 * on an unobtrusive floating or HUD badge without impacting frame rate.
 */
export class VrProfiler {
  constructor(renderer) {
    this.renderer = renderer;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(0.24, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 9999;
    this.mesh.position.set(-0.65, 1.85, -1.05);
    this.mesh.rotation.y = 0.45;

    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 72;
    this.frameTimeMs = 13.8;
    this.lastDrawTime = 0;
  }

  update(now = performance.now()) {
    this.frameCount++;
    const delta = now - this.lastTime;
    if (delta >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameTimeMs = (delta / this.frameCount).toFixed(1);
      this.frameCount = 0;
      this.lastTime = now;
      this.renderTelemetry();
    }
  }

  renderTelemetry() {
    const { ctx, canvas, texture, renderer } = this;
    const info = renderer.info;
    const calls = info.render.calls;
    const triangles = info.render.triangles;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Header
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('QUEST 3 PROFILER', 12, 20);

    // FPS with dynamic color coding
    ctx.fillStyle = this.fps >= 70 ? '#22c55e' : this.fps >= 50 ? '#facc15' : '#ef4444';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${this.fps} FPS`, 12, 48);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px monospace';
    ctx.fillText(`${this.frameTimeMs} ms`, 120, 48);

    // Draw calls & Triangles
    ctx.fillStyle = calls <= 120 ? '#38bdf8' : '#ef4444';
    ctx.font = '13px monospace';
    ctx.fillText(`Calls: ${calls} / 120`, 12, 78);

    ctx.fillStyle = triangles <= 250000 ? '#e2e8f0' : '#ef4444';
    ctx.fillText(`Tris:  ${(triangles / 1000).toFixed(1)}k`, 12, 102);

    texture.needsUpdate = true;
  }
}

