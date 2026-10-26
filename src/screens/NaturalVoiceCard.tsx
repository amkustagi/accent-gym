import { useEffect, useState } from 'react';
import { loadNatural, naturalState, onNaturalState, speak } from '../engine/tts';
import { updateSettings, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/ui';

const DISMISS = 'natural-voice-card-dismissed';

/** True when the natural-voice card would show (Today shows one setup card at a time). */
export function naturalCardShowing(engine: string): boolean {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS) === '1';
  } catch {
    /* ignore */
  }
  return engine === 'natural' && naturalState().status !== 'ready' && !dismissed;
}

/** Invites the user to download the natural voice; shows progress while it downloads. */
export function NaturalVoiceCard() {
  const engine = useStore((s) => s.settings.voiceEngine);
  const [st, setSt] = useState(naturalState());
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => onNaturalState(setSt), []);
  if (engine !== 'natural' || st.status === 'ready' || hidden) return null;
  const wifi = (navigator as unknown as { connection?: { type?: string } }).connection?.type;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS, '1');
    } catch {
      /* ignore */
    }
  };
  return (
    <section className="card">
      <div className="row spread">
        <h3>Get the natural voice</h3>
        <button className="iconbtn ghost" style={{ width: 36, height: 36 }} onClick={dismiss} aria-label="Dismiss"><Icon name="close" size={18} /></button>
      </div>
      {st.status === 'loading' ? (
        <>
          <p className="small muted">Downloading… {Math.round(st.progress * 100)}%. You can keep practicing.</p>
          <div className="progress"><i style={{ width: `${Math.round(st.progress * 100)}%` }} /></div>
        </>
      ) : (
        <>
          <p className="small muted">
            Replace the robotic phone voice with a human-sounding one that runs on your phone. One download of about 90 MB{wifi === 'cellular' ? '. You\'re on mobile data, so Wi-Fi is better' : ', best on Wi-Fi'}.
          </p>
          {st.status === 'error' && <div className="note bad">{st.message}</div>}
          <div className="row">
            <button className="btn primary grow" onClick={() => void loadNatural().then(() => { toast('Natural voice ready'); void speak('Hi! This is your new coaching voice.'); }).catch(() => undefined)}>
              <Icon name="download" />{st.status === 'error' ? 'Try again' : 'Download'}
            </button>
            <button className="btn quiet" onClick={() => { updateSettings({ voiceEngine: 'system' }); dismiss(); }}>Use phone voice</button>
          </div>
        </>
      )}
    </section>
  );
}
