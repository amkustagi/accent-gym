import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { loadState } from './store/store';
import { startBackend } from './lib/backend';
import { installErrorCapture } from './lib/feedback';
import './styles.css';

installErrorCapture();
void loadState().then(() => startBackend());
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(watchForUpdates).catch(() => undefined);
  });
}

/**
 * Updates apply themselves: a new version found while the app is open switches over the next
 * time the app goes to the background (never mid-recording), and one already waiting at launch
 * switches over right away. Progress is saved before the page reloads.
 */
function watchForUpdates(reg: ServiceWorkerRegistration) {
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    location.reload();
  });
  const activate = () => reg.waiting?.postMessage('skipWaiting');
  if (reg.waiting) activate();
  reg.addEventListener('updatefound', () => {
    const sw = reg.installing;
    sw?.addEventListener('statechange', () => {
      if (sw.state === 'installed' && navigator.serviceWorker.controller && document.hidden) activate();
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setTimeout(() => document.hidden && activate(), 1000);
    else void reg.update().catch(() => undefined);
  });
}
