import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[React Entrypoint] Starting Head Over Heels II initialization...');
console.log(`[React Entrypoint] Document readyState: ${document.readyState}`);
console.log(`[React Entrypoint] Window location: ${window.location.href}`);
console.log(`[React Entrypoint] Electron API available: ${Boolean(window.electronAPI)}`);

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[React Entrypoint] FATAL: #root DOM element not found!');
  document.body.innerHTML = `
    <div style="background:#0a0a14;color:#f87171;padding:24px;font-family:monospace;">
      <h2>[Head Over Heels II] Initialization Error</h2>
      <p>Could not locate the #root element in index.html.</p>
    </div>
  `;
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('[React Entrypoint] React application successfully mounted into #root.');
  } catch (err) {
    console.error('[React Entrypoint] Render exception during initial mount:', err);
    rootElement.innerHTML = `
      <div style="background:#0a0a14;color:#f87171;padding:24px;font-family:monospace;">
        <h2>[Head Over Heels II] Component Crash</h2>
        <pre>${err instanceof Error ? err.stack || err.message : String(err)}</pre>
      </div>
    `;
  }
}
