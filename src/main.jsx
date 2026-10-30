import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './patient-diversity.css';

const root = createRoot(document.getElementById('root'));

function renderError(err) {
  console.error('App init error:', err);
  root.render(
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ color: '#ef4444' }}>Simulation Initialisation Notice</h2>
      <p style={{ color: '#94a3b8' }}>An unexpected error occurred while loading the virtual hospital environment:</p>
      <pre style={{ background: '#1e293b', padding: 16, borderRadius: 8, overflowX: 'auto', color: '#fca5a5', fontSize: '13px' }}>
        {err?.stack || err?.message || String(err)}
      </pre>
      <button onClick={() => location.reload()} style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 12, fontWeight: 600 }}>
        Reload Simulation
      </button>
    </div>
  );
}

// Immersive client lives at /vr (or ?vr=1) and is code-split so the existing app bundle is unchanged.
if (location.pathname.replace(/\/+$/, '') === '/vr' || new URLSearchParams(location.search).has('vr')) {
  import('./vr/VRApp.jsx')
    .then(({ default: VRApp }) => root.render(<React.StrictMode><VRApp /></React.StrictMode>))
    .catch(renderError);
} else {
  import('./App.jsx')
    .then(({ default: App }) => root.render(<React.StrictMode><App /></React.StrictMode>))
    .catch(renderError);
}
