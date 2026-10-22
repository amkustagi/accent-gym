import { useEffect, useMemo, useRef, useState } from 'react';
import { featureById, shadowLines, targetById, type AccentId, type FeatureId } from '../../content/accents';
import { contour, contourSimilarity, framesFromBlob, speechDuration, type AzureResult } from '../../engine/assess';
import type { CaptureResult } from '../../engine/capture';
import { matchTarget } from '../../engine/text';
import { modelBlob, playBlob, speak, stopSpeaking } from '../../engine/tts';
import { assessPrecise, precisionAvailable } from '../../lib/accentScore';
import { logActivity, recordSounds, setBest, useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { TakeCompare } from '../../ui/TakeCompare';
import { ScoreRing, SessionShell, scoreTone } from '../../ui/ui';
import { useAccent } from './AccentHome';

function Melody({ model, mine }: { model: (number | null)[] | null; mine: (number | null)[] }) {
  const W = 320;
  const H = 110;
  const all = [...(model ?? []), ...mine].filter((v): v is number => v !== null);
  const lo = Math.min(-4, ...all);
  const hi = Math.max(4, ...all);
  const x = (i: number, n: number) => 8 + (i / Math.max(1, n - 1)) * (W - 16);
  const y = (v: number) => 10 + (1 - (v - lo) / (hi - lo)) * (H - 20);
  const path = (c: (number | null)[]) => {
    let d = '';
    let pen = false;
    c.forEach((v, i) => {
      if (v === null) return (pen = false);
      d += `${pen ? 'L' : 'M'}${x(i, c.length).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  return (
    <figure className="stack-sm" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Your melody compared with the model">
        <rect width={W} height={H} rx="12" fill="var(--sunken)" />
        {model && <path d={path(model)} fill="none" stroke="var(--faint)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />}
        <path d={path(mine)} fill="none" stroke="var(--signal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <figcaption className="legend">
        {model && <span><i style={{ background: 'var(--faint)' }} />Native model</span>}
        <span><i style={{ background: 'var(--signal)' }} />You</span>
      </figcaption>
    </figure>
  );
}

export function ShadowDrill({ param, onClose }: { param?: string; onClose: () => void }) {
  const { target } = useAccent();
  if (!target) {
    return (
      <SessionShell title="Shadowing" onClose={onClose}>
        <p className="muted">Choose an accent goal on the Accent tab first.</p>
      </SessionShell>
    );
  }
  return <Shadow target={target} feature={param as FeatureId | undefined} onClose={onClose} />;
}

function Shadow({ target, feature, onClose }: { target: AccentId; feature?: FeatureId; onClose: () => void }) {
  const t = targetById(target);
  const lines = useMemo(() => {
    const base = feature ? featureById(feature).sentences : shadowLines(target);
    return [...base].sort(() => Math.random() - 0.5);
  }, [target, feature]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'listen' | 'speak' | 'result'>('listen');
  const [modelFrames, setModelFrames] = useState<(number | null)[] | null>(null);
  const [modelDur, setModelDur] = useState<number | null>(null);
  const [heard, setHeard] = useState(0);
  const [res, setRes] = useState<{ match: number; melody: number | null; pace: number | null; score: number; mine: (number | null)[]; take: Blob | null; precise?: AzureResult; err?: string } | null>(null);
  const precision = useStore((s) => precisionAvailable(s));
  const blob = useRef<Blob | null>(null);
  const line = lines[i % lines.length];

  useEffect(() => {
    let live = true;
    setModelFrames(null);
    setModelDur(null);
    blob.current = null;
    void modelBlob(line, target).then(async (b) => {
      if (!live || !b) return;
      blob.current = b;
      try {
        const fr = await framesFromBlob(b);
        if (!live) return;
        setModelFrames(contour(fr));
        setModelDur(speechDuration(fr));
      } catch {
        /* no melody for this clip */
      }
    });
    return () => {
      live = false;
      stopSpeaking();
    };
  }, [line, target]);

  const play = (rate = 1) => {
    setHeard((n) => n + 1);
    if (blob.current) playBlob(blob.current, { rate });
    else void speak(line, { accent: target, rate });
  };

  const [miss, setMiss] = useState(false);
  const done = async (r: CaptureResult) => {
    if (!r.transcript.trim() && !r.voice?.hadSpeech) {
      setMiss(true);
      return;
    }
    setMiss(false);
    const match = matchTarget(line, r.transcript).accuracy;
    const mine = contour(r.frames);
    const melody = modelFrames ? contourSimilarity(modelFrames, mine) : null;
    const myDur = speechDuration(r.frames);
    const pace = modelDur && myDur ? Math.round((myDur / modelDur) * 100) / 100 : null;
    const paceScore = pace ? Math.max(0, 100 - Math.abs(1 - pace) * 120) : null;
    const weights = [0.5, melody !== null ? 0.3 : 0, paceScore !== null ? 0.2 : 0];
    const score = Math.round((match * weights[0] + (melody ?? 0) * weights[1] + (paceScore ?? 0) * weights[2]) / (weights[0] + weights[1] + weights[2]));
    const base = { match, melody, pace, score, mine, take: r.audio };
    setRes(base);
    setPhase('result');
    logActivity('shadow', 6 + Math.round(score / 20));
    setBest(`shadow:${target}`, score);
    if (melody !== null) recordSounds({ intonation: melody }, 'free');
    if (precision && r.audio) {
      try {
        const pr = await assessPrecise(r.audio, line, target);
        setRes({ ...base, precise: pr });
        if (pr.prosody !== null) recordSounds({ intonation: Math.round(pr.prosody), rhythm: Math.round(pr.prosody) }, 'pro');
      } catch (e) {
        setRes({ ...base, err: (e as Error).message });
      }
    }
  };

  const next = () => {
    setI(i + 1);
    setRes(null);
    setHeard(0);
    setPhase('listen');
  };

  return (
    <SessionShell title={feature ? `Shadow: ${featureById(feature).name}` : 'Shadowing'} onClose={onClose}>
      <section className="card">
        <span className="eyebrow">Listen, then repeat it the same way</span>
        <p className="script" style={{ color: 'var(--ink)' }}>{line}</p>
        <div className="row">
          <button className="btn quiet grow" onClick={() => play(1)}><Icon name="speaker" />Hear {t.adjective}</button>
          <button className="btn quiet grow" onClick={() => play(0.75)}>Slow</button>
        </div>
        <p className="small muted">Copy the melody, the stress and the speed, not just the words. Listen two or three times first.</p>
      </section>

      {phase === 'listen' && (
        <button className="btn signal block" disabled={heard === 0} onClick={() => setPhase('speak')}>
          <Icon name="mic" />{heard === 0 ? 'Listen first' : 'I\'m ready to repeat'}
        </button>
      )}
      {phase === 'speak' && <MicStage autoStart={!miss} maxSec={15} lang={t.locale} needsTranscript showCounters={false} showTranscript={false} autoStopSilence={1.6} idleHint="Tap and repeat the line" onDone={done} />}
      {phase === 'speak' && miss && <div className="note bad"><b>I didn't hear you</b>Check the microphone, hold the phone closer, and try again.</div>}

      {phase === 'result' && res && (
        <>
          <section className="card">
            <div className="row" style={{ gap: 16 }}>
              <ScoreRing value={res.precise ? Math.round(res.precise.pron) : res.score} label="shadow" size={100} />
              <div className="stack-sm grow small">
                <span>Words matched: <b style={{ color: scoreTone(res.match) }}>{res.match}%</b></span>
                {res.melody !== null && <span>Melody match: <b style={{ color: scoreTone(res.melody) }}>{res.melody}</b></span>}
                {res.pace !== null && <span>Speed: <b>{res.pace < 0.9 ? 'faster than the model' : res.pace > 1.15 ? `${Math.round((res.pace - 1) * 100)}% slower than the model` : 'right on'}</b></span>}
                {res.precise?.prosody != null && <span>Native-like melody: <b style={{ color: scoreTone(res.precise.prosody) }}>{Math.round(res.precise.prosody)}</b></span>}
              </div>
            </div>
            <Melody model={modelFrames} mine={res.mine} />
            {!modelFrames && <p className="small muted">Download the natural voice (Settings › Model voice) to see the model's melody line.</p>}
            {res.err && <div className="note warn">{res.err}</div>}
            <TakeCompare text={line} take={res.take} accent={target} />
          </section>
          <div className="foot">
            <button className="btn signal block" onClick={() => { setRes(null); setPhase('speak'); }}><Icon name="refresh" />Try again</button>
            <button className="btn block" onClick={next}>Next line</button>
          </div>
        </>
      )}
    </SessionShell>
  );
}
