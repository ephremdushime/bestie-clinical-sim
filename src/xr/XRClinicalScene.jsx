import React, { useEffect, useRef, useState } from 'react';

const VERTEX = `
attribute vec3 aPosition;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
void main() { gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0); }
`;
const FRAGMENT = `
precision mediump float;
uniform vec4 uColor;
void main() { gl_FragColor = uColor; }
`;

function shader(gl, type, source) {
  const item = gl.createShader(type);
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(item);
    gl.deleteShader(item);
    throw new Error(message || 'WebGL shader compilation failed');
  }
  return item;
}
function programFor(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'WebGL program link failed');
  return program;
}
function sphereData(rows = 14, columns = 20) {
  const vertices = [], indices = [];
  for (let y = 0; y <= rows; y++) {
    const v = y / rows, phi = v * Math.PI;
    for (let x = 0; x <= columns; x++) {
      const u = x / columns, theta = u * Math.PI * 2;
      vertices.push(-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi));
    }
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const a = y * (columns + 1) + x, b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}
function cubeData() {
  const faces = [
    [-1,-1,1, 1,-1,1, 1,1,1, -1,1,1], [1,-1,-1, -1,-1,-1, -1,1,-1, 1,1,-1],
    [-1,-1,-1, -1,-1,1, -1,1,1, -1,1,-1], [1,-1,1, 1,-1,-1, 1,1,-1, 1,1,1],
    [-1,1,1, 1,1,1, 1,1,-1, -1,1,-1], [-1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1]
  ];
  const v = [], idx = [];
  faces.forEach(face => { const base = v.length / 3; v.push(...face); idx.push(base,base+1,base+2,base,base+2,base+3); });
  return { vertices: new Float32Array(v), indices: new Uint16Array(idx) };
}
function matrix(x,y,z,sx,sy,sz) {
  return new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,sz,0, x,y,z,1]);
}
function multiply(a,b) {
  const out = new Float32Array(16);
  for (let c=0;c<4;c++) for (let r=0;r<4;r++) out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return out;
}

export default function XRClinicalScene({ caseTitle = 'Fictional patient encounter' }) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const [status, setStatus] = useState('Loading 3D scene…');
  const [xrAvailable, setXrAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false, raf = 0, session = null, gl, program, position, projection, view, model, color, objects = [];
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: true });
      if (!gl) throw new Error('WebGL is unavailable in this browser.');
      program = programFor(gl);
      position = gl.getAttribLocation(program, 'aPosition');
      projection = gl.getUniformLocation(program, 'uProjection');
      view = gl.getUniformLocation(program, 'uView');
      model = gl.getUniformLocation(program, 'uModel');
      color = gl.getUniformLocation(program, 'uColor');
      const sphere = sphereData(), cube = cubeData();
      const makeMesh = data => {
        const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
        const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
        return { vb, ib, count: data.indices.length };
      };
      const sphereMesh = makeMesh(sphere), cubeMesh = makeMesh(cube);
      objects = [
        {mesh:cubeMesh, transform:matrix(0,-1.25,-2.5,4,.08,4), tint:[.22,.32,.34,1]},
        {mesh:cubeMesh, transform:matrix(0,-.95,-2.5,1.15,.12,2.1), tint:[.72,.76,.76,1]},
        {mesh:cubeMesh, transform:matrix(0,-.68,-2.5,.65,.08,1.1), tint:[.82,.85,.82,1]},
        {mesh:sphereMesh, transform:matrix(0,.15,-2.25,.34,.48,.27), tint:[.23,.53,.61,1]},
        {mesh:sphereMesh, transform:matrix(0,.78,-2.25,.22,.25,.22), tint:[.76,.58,.45,1]},
        {mesh:sphereMesh, transform:matrix(-.48,.12,-2.25,.16,.42,.17), tint:[.76,.58,.45,1]},
        {mesh:sphereMesh, transform:matrix(.48,.12,-2.25,.16,.42,.17), tint:[.76,.58,.45,1]},
        {mesh:sphereMesh, transform:matrix(-.18,-.5,-2.25,.17,.44,.18), tint:[.23,.53,.61,1]},
        {mesh:sphereMesh, transform:matrix(.18,-.5,-2.25,.17,.44,.18), tint:[.23,.53,.61,1]}
      ];
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(.055,.085,.105,1);
      const draw = (proj, vmat, viewport) => {
        // WebXR renders multiple eye viewports into one framebuffer. Restrict both
        // drawing and clearing to the current viewport so the second eye cannot
        // erase the first eye's image.
        gl.enable(gl.SCISSOR_TEST);
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        objects.forEach(o => {
          gl.bindBuffer(gl.ARRAY_BUFFER,o.mesh.vb); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,3,gl.FLOAT,false,0,0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.mesh.ib);
          gl.uniformMatrix4fv(projection,false,proj); gl.uniformMatrix4fv(view,false,vmat); gl.uniformMatrix4fv(model,false,o.transform); gl.uniform4fv(color,o.tint);
          gl.drawElements(gl.TRIANGLES,o.mesh.count,gl.UNSIGNED_SHORT,0);
        });
      };
      const desktopView = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
      const desktopProjection = new Float32Array([1.1,0,0,0, 0,1.5,0,0, 0,0,-1.002,-1, 0,0,-.201,0]);
      const renderDesktop = () => {
        if (disposed || runtimeRef.current?.session) return;
        const width = Math.max(1,canvas.clientWidth), height = Math.max(1,canvas.clientHeight);
        if (canvas.width !== width || canvas.height !== height) { canvas.width=width; canvas.height=height; }
        draw(desktopProjection,desktopView,{x:0,y:0,width:canvas.width,height:canvas.height});
        raf = requestAnimationFrame(renderDesktop);
      };
      renderDesktop();
      runtimeRef.current = { gl, draw, renderDesktop, stop: () => cancelAnimationFrame(raf), resume: renderDesktop, session: null };
      if (navigator.xr?.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-vr').then(value => { if (!disposed) { setXrAvailable(!!value); setStatus(value ? '3D preview ready · immersive VR available' : '3D preview ready · immersive VR not reported'); } }).catch(() => { if (!disposed) setStatus('3D preview ready · XR capability unavailable'); });
      } else setStatus('3D preview ready · this browser does not expose WebXR');
      const onResize = () => { if (!session) { cancelAnimationFrame(raf); renderDesktop(); } };
      window.addEventListener('resize',onResize);
      runtimeRef.current.cleanup = () => window.removeEventListener('resize',onResize);
    } catch (error) {
      setStatus(error.message || 'Unable to initialize 3D rendering.');
    }
    return () => {
      disposed = true; cancelAnimationFrame(raf);
      if (runtimeRef.current?.session) runtimeRef.current.session.end().catch(()=>{});
      runtimeRef.current?.cleanup?.();
      runtimeRef.current = null;
    };
  }, []);

  const enterVR = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!navigator.xr?.requestSession) throw new Error('WebXR is not available. Use the 3D preview or a compatible headset browser over HTTPS.');
      const gl = runtimeRef.current?.gl, draw = runtimeRef.current?.draw;
      if (!gl || !draw) throw new Error('The 3D renderer is not ready yet.');
      const nextSession = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor','bounded-floor','hand-tracking'] });
      runtimeRef.current.session = nextSession;
      runtimeRef.current.stop();
      await gl.makeXRCompatible();
      const layer = new XRWebGLLayer(nextSession,gl);
      await nextSession.updateRenderState({ baseLayer: layer });
      const refSpace = await nextSession.requestReferenceSpace('local-floor').catch(() => nextSession.requestReferenceSpace('local'));
      const onFrame = (_time, frame) => {
        const active = frame.session;
        active.requestAnimationFrame(onFrame);
        const pose = frame.getViewerPose(refSpace);
        if (!pose) return;
        gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
        for (const eye of pose.views) {
          const vp = layer.getViewport(eye);
          draw(eye.projectionMatrix,eye.transform.inverse.matrix,vp);
        }
      };
      nextSession.addEventListener('end',() => { if (runtimeRef.current) { runtimeRef.current.session = null; runtimeRef.current.resume(); } setBusy(false); setStatus('VR session ended · 3D preview remains available'); },{once:true});
      nextSession.requestAnimationFrame(onFrame);
      setStatus('Immersive VR session active · use the headset controls to exit');
    } catch (error) {
      if (runtimeRef.current?.session) { runtimeRef.current.session.end().catch(()=>{}); runtimeRef.current.session = null; runtimeRef.current.resume?.(); }
      setStatus(error.message || 'Could not start the immersive VR session.');
      setBusy(false);
    }
  };

  return <section className="xr-runtime panel">
    <div className="panel-heading"><div><small>INTERACTIVE 3D PROTOTYPE</small><h2>Clinical room preview</h2></div><span className="count-chip">Synthetic scene</span></div>
    <p className="xr-runtime-copy">A low-complexity 3D patient and examination bed rendered with WebGL. Clinical facts and scoring remain in the simulation API; this scene is illustrative only.</p>
    <canvas ref={canvasRef} className="xr-runtime-canvas" aria-label="Interactive 3D illustration of a fictional patient lying on an examination bed" />
    <div className="xr-runtime-controls"><div><b>{caseTitle}</b><span>{status}</span></div><button className="primary" onClick={enterVR} disabled={!xrAvailable || busy}>{busy ? 'Starting VR…' : 'Enter immersive VR'}</button></div>
    {!xrAvailable && <p className="xr-runtime-note">Immersive entry requires a compatible WebXR browser, headset and HTTPS. Desktop 3D preview remains available here.</p>}
  </section>;
}
