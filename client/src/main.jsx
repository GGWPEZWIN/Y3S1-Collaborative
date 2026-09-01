import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function showFatalError(err) {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="padding:32px;font-family:monospace;white-space:pre-wrap;color:#b91c1c;background:#fff;min-height:100vh;">
      <h2 style="color:#111827;font-family:sans-serif;margin:0 0 8px;">App failed to load — here's why:</h2>
      <p style="font-weight:bold;margin:0 0 16px;">${(err && err.message) || String(err)}</p>
      <pre style="font-size:12px;background:#fef2f2;padding:16px;border-radius:8px;overflow-x:auto;">${(err && err.stack) || ''}</pre>
    </div>
  `;
}

// TEMPORARY DEBUG WRAPPER — dynamic import() lets us catch errors that
// happen while App.jsx and everything it imports are being evaluated
// (e.g. a bug in top-level code in one of the ~20 files it pulls in),
// not just errors thrown during React's render phase.
(async () => {
  try {
    const { default: App } = await import('./App.jsx');

    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (err) {
    console.error('Failed to load app:', err);
    showFatalError(err);
  }
})();