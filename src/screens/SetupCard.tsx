import { useEffect, useState } from 'react';
import { loadNatural, naturalState, onNaturalState, speak } from '../engine/tts';
import { updateSettings, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/ui';
import { setupSteps } from '../learn/today';

// Same keys the old separate cards used, so anyone who dismissed one before keeps it hidden.
const VOICE_KEY = 'natural-voice-card-dismissed';
const INSTALL_KEY = 'install-dismissed';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}
let deferred: BIPEvent | null = null;
const bipListeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BIPEvent;
  bipListeners.forEach((l) => l());
});

const flag = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const setFlag = (k: string) => {
  try {
    localStorage.setItem(k, '1');
  } catch {
    /* ignore */
  }
};
const installed = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true ||
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

/** One card for the one-time setup: natural voice and installing the app. */
export function SetupCard() {
  const engine = useStore((s) => s.settings.voiceEngine);
  const [st, setSt] = useState(naturalState());
  const [, force] = useState(0);
  useEffect(() => onNaturalState(setSt), []);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    bipListeners.add(l);
    return () => void bipListeners.delete(l);
  }, []);
  const steps = setupSteps({ naturalEngine: engine === 'natural', voiceReady: st.status === 'ready', voiceDismissed: flag(VOICE_KEY), installed: installed(), installDismissed: flag(INSTALL_KEY) });
  if (!steps.voice && !steps.install) return null;
  const dismiss = () => {
    setFlag(VOICE_KEY);
    setFlag(INSTALL_KEY);
    force((n) => n + 1);
  };
  const wifi = (navigator as unknown as { connection?: { type?: string } }).connection?.type;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const n = Number(steps.voice) + Number(steps.install);

  return (
    <section className="card">
      <div className="row spread">
        <div className="stack-sm">
          <span className="eyebrow">One-time setup · {n} {n === 1 ? 'step' : 'steps'}</span>
          <h3>Finish setting up</h3>
        </div>
        <button className="iconbtn ghost" onClick={dismiss} aria-label="Hide setup"><Icon name="close" size={18} /></button>
      </div>

      {steps.voice && (
        <div className="stack-sm">
          <b>Natural voice</b>
          {st.status === 'loading' ? (
            <>
              <span className="small muted">Downloading… {Math.round(st.progress * 100)}%. You can keep practicing.</span>
              <div className="progress"><i style={{ width: `${Math.round(st.progress * 100)}%` }} /></div>
            </>
          ) : (
            <>
              <span className="small muted">A human-sounding voice that runs on your phone. About 90 MB{wifi === 'cellular' ? '; you\'re on mobile data, so Wi-Fi is better' : ', best on Wi-Fi'}.</span>
              {st.status === 'error' && <div className="note bad">{st.message}</div>}
              <div className="row">
                <button className="btn primary grow" onClick={() => void loadNatural().then(() => { toast('Natural voice ready'); void speak('Hi! This is your new coaching voice.'); }).catch(() => undefined)}>
                  <Icon name="download" />{st.status === 'error' ? 'Try again' : 'Download'}
                </button>
                <button className="btn quiet" onClick={() => { updateSettings({ voiceEngine: 'system' }); setFlag(VOICE_KEY); force((x) => x + 1); }}>Phone voice</button>
              </div>
            </>
          )}
        </div>
      )}

      {steps.install && (
        <div className="stack-sm">
          <b>Add to your home screen</b>
          {deferred ? (
            <button className="btn quiet" onClick={async () => { await deferred!.prompt(); await deferred!.userChoice; deferred = null; force((x) => x + 1); }}>
              <Icon name="download" />Install
            </button>
          ) : iOS ? (
            <span className="small muted">In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>. It opens full-screen and works offline.</span>
          ) : (
            <span className="small muted">In Chrome, tap <b>⋮</b>, then <b>Install app</b>. It opens full-screen and works offline.</span>
          )}
        </div>
      )}
    </section>
  );
}
