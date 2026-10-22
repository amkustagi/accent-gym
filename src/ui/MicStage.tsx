import { useCallback, useEffect, useRef, useState } from 'react';
import { CaptureSession, type CaptureResult, type ListeningMode } from '../engine/capture';
import { analyzeText } from '../engine/text';
import { STT_HELP, isIOS, promptCount, type SttError } from '../engine/speech';
import { semitones, type Frame } from '../engine/voice';
import { useStore } from '../store/store';
import { Icon } from './Icon';
import { Transcript, Legend } from './ui';

export interface MicStageProps {
  maxSec: number;
  onDone: (r: CaptureResult) => void;
  onStart?: () => void;
  onTranscript?: (t: string) => void;
  onFrame?: (f: Frame) => void;
  onAlternatives?: (alts: string[]) => void;
  showTranscript?: boolean;
  showCounters?: boolean;
  showCanvas?: boolean;
  record?: boolean;
  continuous?: boolean;
  idleHint?: string;
  liveHint?: string;
  /** Stop automatically after this many seconds of silence once speech has started. */
  autoStopSilence?: number;
  size?: 'lg' | 'sm';
  /** Force a listening mode, e.g. voice-only for pitch drills. */
  modeOverride?: ListeningMode;
  /** The drill needs words: never run in voice-only mode. */
  needsTranscript?: boolean;
  /** Speech recognition locale (accent target). */
  lang?: string;
  /** Start listening as soon as this appears (the user just tapped "I'm ready" or similar). */
  autoStart?: boolean;
}

const TIP_KEY = 'mic-allow-tip';
const dismissedTip = () => {
  try {
    return localStorage.getItem(TIP_KEY) === '1';
  } catch {
    return false;
  }
};
const dismissTip = () => {
  try {
    localStorage.setItem(TIP_KEY, '1');
  } catch {
    /* private mode */
  }
};

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function MicStage(p: MicStageProps) {
  const setting = useStore((s) => s.settings.listening);
  const mode: ListeningMode = p.modeOverride ?? (p.needsTranscript && setting === 'voice' ? 'full' : setting);
  const [phase, setPhase] = useState<'idle' | 'live' | 'processing'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [text, setText] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [showAllowTip, setShowAllowTip] = useState(false);
  const auto = useRef(false);
  const sess = useRef<CaptureSession | null>(null);
  const frames = useRef<Frame[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const tick = useRef(0);
  const stopping = useRef(false);
  const spoke = useRef(false);
  const lastLoud = useRef(0);
  const cbs = useRef(p);
  cbs.current = p;

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== w * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const fs = frames.current;
    const span = 6; // seconds visible
    const now = fs.length ? fs[fs.length - 1].t : 0;
    const x = (t: number) => w - ((now - t) / span) * w;
    // Loudness bars.
    g.fillStyle = css('--brand');
    g.globalAlpha = 0.28;
    const barW = Math.max(2, (w / (span / 0.05)) - 1);
    for (let i = fs.length - 1; i >= 0 && now - fs[i].t <= span; i--) {
      const f = fs[i];
      const lv = Math.max(0, Math.min(1, (f.db + 65) / 50));
      const bh = lv * (h - 8);
      g.fillRect(x(f.t) - barW, h - bh, barW, bh);
    }
    // Pitch trace.
    g.globalAlpha = 1;
    g.strokeStyle = css('--signal');
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    let drawing = false;
    g.beginPath();
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      if (now - f.t > span) continue;
      if (f.f0 === null) {
        drawing = false;
        continue;
      }
      const st = semitones(f.f0); // ~ -6 … +22 for most voices
      const y = h - 8 - Math.max(0, Math.min(1, (st + 8) / 30)) * (h - 16);
      if (!drawing) g.moveTo(x(f.t), y);
      else g.lineTo(x(f.t), y);
      drawing = true;
    }
    g.stroke();
  }, []);

  const finish = useCallback(async () => {
    if (!sess.current || stopping.current) return;
    stopping.current = true;
    cancelAnimationFrame(raf.current);
    clearInterval(tick.current);
    setPhase('processing');
    const r = await sess.current.stop();
    sess.current = null;
    stopping.current = false;
    setPhase('idle');
    cbs.current.onDone(r);
  }, []);

  const start = useCallback(async () => {
    setWarning(null);
    setText('');
    setElapsed(0);
    frames.current = [];
    spoke.current = false;
    lastLoud.current = 0;
    const s = new CaptureSession(
      mode,
      {
        onTranscript: (t) => {
          setText(t);
          cbs.current.onTranscript?.(t);
        },
        onFrame: (f) => {
          frames.current.push(f);
          if (frames.current.length > 2400) frames.current.splice(0, 600);
          if (f.db > -45) {
            spoke.current = true;
            lastLoud.current = f.t;
          }
          cbs.current.onFrame?.(f);
        },
        onAlternatives: (a) => cbs.current.onAlternatives?.(a),
        onWarning: (w) => {
          // If an automatic start isn't allowed (some browsers need a tap), quietly wait for one.
          if (auto.current && (w === 'not-allowed' || w === 'service-not-allowed')) {
            auto.current = false;
            cancelAnimationFrame(raf.current);
            clearInterval(tick.current);
            sess.current?.cancel();
            sess.current = null;
            setPhase('idle');
            return;
          }
          setWarning(STT_HELP[w as SttError] ?? w);
        },
      },
      { record: p.record, continuous: p.continuous, lang: p.lang },
    );
    sess.current = s;
    setPhase('live');
    const res = await s.start();
    if (!res.ok) {
      sess.current = null;
      setPhase('idle');
      if (!auto.current) setWarning(res.error ?? 'Could not start the microphone.');
      auto.current = false;
      return;
    }
    // Asked for permission again in the same session: offer the one-time "always allow" fix.
    if (promptCount() >= 2) setShowAllowTip(!dismissedTip());
    setTimeout(() => (auto.current = false), 2000);
    cbs.current.onStart?.();
    const loop = () => {
      draw();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    tick.current = window.setInterval(() => {
      const e = s.elapsed();
      setElapsed(e);
      if (e >= cbs.current.maxSec) void finish();
      const quiet = cbs.current.autoStopSilence;
      if (quiet && spoke.current && frames.current.length && frames.current[frames.current.length - 1].t - lastLoud.current > quiet) void finish();
    }, 200);
  }, [mode, p.record, p.continuous, p.lang, draw, finish]);

  useEffect(() => {
    // Phones cut the mic when the app goes to the background; score what we have instead of hanging.
    const onHide = () => document.visibilityState === 'hidden' && sess.current && void finish();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [finish]);

  useEffect(() => {
    if (!p.autoStart) return;
    auto.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      clearInterval(tick.current);
      sess.current?.cancel();
    },
    [],
  );

  const live = phase === 'live';
  const left = Math.max(0, Math.ceil(p.maxSec - elapsed));
  const frac = Math.min(1, elapsed / p.maxSec);
  const counts = live && text ? analyzeText(text) : null;
  const R = 62;
  const C = 2 * Math.PI * R;
  const big = p.size !== 'sm';

  return (
    <div className="stage">
      <button
        className={`micbtn${live ? ' live' : ''}`}
        style={big ? undefined : { width: 84, height: 84 }}
        onClick={() => {
          auto.current = false;
          if (live) void finish();
          else if (phase === 'idle') void start();
        }}
        aria-label={live ? 'Stop recording' : 'Start recording'}
        disabled={phase === 'processing'}
      >
        <svg className="ring" viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
          {live && <circle cx="70" cy="70" r={R} fill="none" stroke="var(--signal)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />}
        </svg>
        <Icon name={live ? 'stop' : 'mic'} className="glyph" />
      </button>
      <div className="clock" aria-live="off">
        {phase === 'processing' ? '…' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>
        {phase === 'processing' ? 'Analyzing your voice…' : live ? p.liveHint ?? 'Listening. Tap to finish.' : p.idleHint ?? 'Tap the mic and start speaking'}
      </p>
      {p.showCanvas !== false && mode !== 'transcript' && <canvas ref={canvas} className="live-canvas" aria-label="Live voice: loudness bars and pitch line" style={{ opacity: live ? 1 : 0.5 }} />}
      {live && p.showCounters !== false && counts && (
        <div className="counters">
          <span className={`pill ${counts.fillerCount ? 'warn' : 'good'}`}>{counts.fillerCount} fillers</span>
          <span className={`pill ${counts.weakCount ? 'bad' : 'good'}`}>{counts.weakCount} weak phrases</span>
          <span className="pill">{counts.words} words</span>
        </div>
      )}
      {showAllowTip && (
        <div className="note" style={{ width: '100%' }}>
          <b>Stop the repeated microphone prompts</b>
          {isIOS()
            ? 'On iPhone: Settings › Apps › Safari › Microphone › Allow. If you use the app inside Safari, you can also tap aA › Website Settings › Microphone › Allow.'
            : 'Tap the lock or settings icon next to the address, set Microphone to Allow, and it will stop asking.'}
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={() => { dismissTip(); setShowAllowTip(false); }}>Got it</button>
        </div>
      )}
      {warning && (
        <div className="note warn" style={{ width: '100%' }}>
          <b>Heads up</b>
          {warning}
        </div>
      )}
      {p.showTranscript !== false && (live || text) && (
        <div className="card sunken" style={{ width: '100%' }}>
          <Transcript text={text} />
          <Legend />
        </div>
      )}
    </div>
  );
}
