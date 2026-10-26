import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PresenceTracker, presenceTips, type FaceFrame, type PresenceSummary } from '../engine/face';
import { Icon } from './Icon';

export interface CameraHandle {
  /** Begins measuring (loads the face model the first time). */
  begin: () => Promise<void>;
  /** Stops measuring and returns the summary, or null if the camera never ran. */
  end: () => PresenceSummary | null;
}

/** Front-camera preview with a live eye-contact hint. Video stays on the phone; nothing is recorded. */
export const CameraPanel = forwardRef<CameraHandle, { compact?: boolean }>(function CameraPanel({ compact }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const tracker = useRef<PresenceTracker | null>(null);
  const [state, setState] = useState<'off' | 'starting' | 'ready' | 'loading' | 'tracking' | 'error'>('off');
  const [err, setErr] = useState('');
  const [live, setLive] = useState<FaceFrame | null>(null);

  const open = async () => {
    setState('starting');
    setErr('');
    try {
      const t = new PresenceTracker();
      t.onFrame = setLive;
      await t.open(video.current!);
      tracker.current = t;
      setState('ready');
    } catch (e) {
      setState('error');
      setErr((e as Error).name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in your browser settings for this site.' : 'The camera couldn\'t start on this device.');
    }
  };

  useEffect(() => {
    // Turn the camera off when the app goes to the background.
    const onHide = () => {
      if (document.visibilityState !== 'hidden' || !tracker.current) return;
      tracker.current.close();
      tracker.current = null;
      setState('off');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      tracker.current?.close();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    begin: async () => {
      if (!tracker.current || !video.current) return;
      setState('loading');
      try {
        await tracker.current.start(video.current);
        setState('tracking');
      } catch {
        setState('error');
        setErr('The face check couldn\'t load. Check your connection; it downloads once, then works offline.');
      }
    },
    end: () => {
      if (!tracker.current || state === 'error' || state === 'off') return null;
      const s = tracker.current.stop();
      setState('ready');
      return s.seconds > 1 ? s : null;
    },
  }), [state]);

  const looking = live?.present && Math.abs(live.yaw) <= 15 && Math.abs(live.pitch) <= 14;
  return (
    <div className="card" style={{ padding: 10, gap: 8 }}>
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'var(--sunken)', aspectRatio: compact ? '16 / 9' : '4 / 3', display: state === 'off' || state === 'error' ? 'none' : 'block' }}>
        <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        {state === 'tracking' && (
          <span className={`pill ${looking ? 'good' : 'warn'}`} style={{ position: 'absolute', top: 8, left: 8 }}>
            {live?.present ? (looking ? 'Eye contact' : 'Look at the lens') : 'Face not in view'}
          </span>
        )}
        {state === 'loading' && <span className="pill" style={{ position: 'absolute', top: 8, left: 8 }}>Loading face check…</span>}
      </div>
      {state === 'off' && (
        <button className="btn quiet" onClick={() => void open()}><Icon name="user" />Turn on camera check</button>
      )}
      {state === 'off' && <span className="small muted">Checks eye contact, framing, light and stillness. Video stays on your phone and isn't recorded.</span>}
      {state === 'starting' && <span className="small muted">Starting the camera…</span>}
      {state === 'error' && <div className="note warn" style={{ margin: 0 }}>{err}</div>}
    </div>
  );
});

const FRAMING: Record<PresenceSummary['framing'], string> = { good: 'Good', far: 'Too far', close: 'Too close', 'off-center': 'Off-center', unknown: '–' };
const LIGHT: Record<PresenceSummary['lighting'], string> = { good: 'Good', dark: 'Too dark', bright: 'Too bright', unknown: '–' };

/** Overall camera-presence score, 0–100. */
export function presenceScore(s: PresenceSummary): number {
  const framing = s.framing === 'good' ? 100 : s.framing === 'unknown' ? 0 : 55;
  const light = s.lighting === 'good' ? 100 : s.lighting === 'unknown' ? 0 : 55;
  return Math.round(0.4 * s.eyeContactPct * (s.facePct / 100) + 0.2 * framing + 0.15 * light + 0.2 * s.stillness + 0.05 * Math.min(100, s.smilePct * 3));
}

export function PresenceResult({ s }: { s: PresenceSummary }) {
  const tips = presenceTips(s);
  const row = (label: string, value: string, good: boolean) => (
    <div className="row spread">
      <span>{label}</span>
      <span className={`pill ${good ? 'good' : 'warn'}`}>{value}</span>
    </div>
  );
  return (
    <section className="card">
      <div className="row spread">
        <h3>On camera</h3>
        <span className="pill brand">{presenceScore(s)}</span>
      </div>
      <div className="stack-sm">
        {row('Eye contact with the lens', `${s.eyeContactPct}%`, s.eyeContactPct >= 60)}
        {row('Face in view', `${s.facePct}%`, s.facePct >= 80)}
        {row('Framing', FRAMING[s.framing], s.framing === 'good')}
        {row('Lighting', LIGHT[s.lighting], s.lighting === 'good')}
        {row('Head steady', `${s.stillness}`, s.stillness >= 55)}
        {row('Smiled', `${s.smilePct}% of the time`, s.smilePct >= 10)}
      </div>
      {tips.length > 0 && (
        <ul className="stack-sm small" style={{ margin: 0, paddingLeft: 18 }}>
          {tips.slice(0, 3).map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
    </section>
  );
}
