import { useEffect, useState } from 'react';
import { TWISTERS, WARMUP } from '../../content/drills';
import { matchTarget, type MatchResult } from '../../engine/text';
import { speak, stopSpeaking } from '../../engine/tts';
import { levelFor, recordScore } from '../../learn/adapt';
import { getState } from '../../store/store';
import { HearButton, TakeCompare } from '../../ui/TakeCompare';
import { logActivity, setBest, useStore } from '../../store/store';
import { quickRecord } from '../../lib/session';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { Seg, SessionShell, scoreTone } from '../../ui/ui';

// ---------------- Warm-up ----------------

export function WarmupDrill({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(-1);
  const [left, setLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const step = WARMUP[i];
  const total = WARMUP.reduce((s, w) => s + w.secs, 0);

  useEffect(() => {
    if (i < 0 || i >= WARMUP.length) return;
    setLeft(WARMUP[i].secs);
    void speak(`${WARMUP[i].title}. ${WARMUP[i].how}`, { rate: 1.02 });
  }, [i]);

  useEffect(() => {
    if (i < 0 || i >= WARMUP.length || paused) return;
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [i, paused]);

  useEffect(() => {
    if (i >= 0 && i < WARMUP.length && left === 0 && !paused) {
      const t = setTimeout(() => setI((k) => k + 1), 600);
      return () => clearTimeout(t);
    }
  }, [left, i, paused]);

  useEffect(() => {
    if (i === WARMUP.length) {
      logActivity('warmup', 10);
      void speak('Warm-up done. Your voice is ready.');
    }
  }, [i]);

  useEffect(() => () => stopSpeaking(), []);

  if (i === -1)
    return (
      <SessionShell title="Warm-up" onClose={onClose}>
        <section className="card">
          <span className="eyebrow">{Math.round(total / 60 * 10) / 10} minutes · voice guided</span>
          <h2>Wake up your voice before you speak</h2>
          <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
            {WARMUP.map((w) => <li key={w.title}>{w.title} <span className="muted small">· {w.secs}s</span></li>)}
          </ol>
          <p className="small muted">Stand up if you can. Turn your volume up: each step is read out loud.</p>
        </section>
        <div className="foot">
          <button className="btn signal block" onClick={() => setI(0)}><Icon name="play" />Start warm-up</button>
        </div>
      </SessionShell>
    );

  if (i >= WARMUP.length)
    return (
      <SessionShell title="Warm-up" onClose={onClose} progress={1}>
        <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="ic" style={{ width: 64, height: 64, borderRadius: 20, display: 'grid', placeItems: 'center', background: 'var(--good-soft)', color: 'var(--good)' }}>
            <Icon name="check" size={34} />
          </div>
          <h2>Voice warmed up</h2>
          <p className="muted">Do this two minutes before any important meeting.</p>
        </section>
        <div className="foot"><button className="btn primary block" onClick={onClose}>Done</button></div>
      </SessionShell>
    );

  const frac = (step.secs - left) / step.secs;
  return (
    <SessionShell title="Warm-up" onClose={onClose} progress={i / WARMUP.length}>
      <section className="card" style={{ alignItems: 'center', textAlign: 'center', gap: 16, paddingBlock: 28 }}>
        <span className="eyebrow">Step {i + 1} of {WARMUP.length}</span>
        <h2 style={{ fontSize: '1.7rem' }}>{step.title}</h2>
        <div className="ring-wrap" style={{ width: 120, height: 120 }}>
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--sunken)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--signal)" strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - frac)} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="val"><b className="num">{left}</b></div>
        </div>
        <p style={{ maxWidth: '34ch' }}>{step.how}</p>
        {step.say && <p className="script" style={{ color: 'var(--ink)', fontSize: '1.2rem' }}>“{step.say}”</p>}
      </section>
      <div className="foot">
        <div className="row">
          <button className="btn quiet grow" onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
          <button className="btn quiet grow" onClick={() => void speak(step.say ?? step.how)}><Icon name="speaker" />Repeat</button>
          <button className="btn primary grow" onClick={() => setI(i + 1)}>Next</button>
        </div>
      </div>
    </SessionShell>
  );
}

// ---------------- Tongue twisters ----------------

export function ClarityDrill({ onClose }: { onClose: () => void }) {
  const best = useStore((s) => s.best);
  const [lvl, setLvl] = useState<1 | 2 | 3>(() => (Math.min(3, Math.max(1, Math.ceil(levelFor(getState(), 'clarity') * 0.6))) as 1 | 2 | 3));
  const list = TWISTERS.filter((t) => t.level === lvl);
  // Start somewhere new each time instead of always on the first twister.
  const [k, setK] = useState(() => Math.floor(Math.random() * 1000));
  const tw = list[k % list.length];
  const key = `tw:${tw.text}`;
  const [res, setRes] = useState<(MatchResult & { wps: number; newBest: boolean }) | null>(null);
  const [take, setTake] = useState<Blob | null>(null);

  const done = (r: { transcript: string; durationSec: number; audio: Blob | null }) => {
    setTake(r.audio);
    const m = matchTarget(tw.text, r.transcript);
    const secs = Math.max(0.8, r.durationSec - 1.6);
    const wps = Math.round((tw.text.split(/\s+/).length / secs) * 10) / 10;
    const score = m.accuracy >= 90 ? Math.min(100, m.accuracy + Math.round(wps * 2)) : m.accuracy;
    const newBest = m.accuracy > 0 && setBest(key, score);
    void quickRecord('clarity', tw.text, { clarity: m.accuracy }, r.transcript, m.accuracy >= 90 ? 10 : 4);
    recordScore('clarity', m.accuracy);
    setRes({ ...m, wps, newBest });
  };

  return (
    <SessionShell title="Tongue twisters" onClose={onClose}>
      <Seg label="Level" value={lvl} onChange={(v) => { setLvl(v); setK(Math.floor(Math.random() * 1000)); setRes(null); }} options={[{ v: 1, label: 'Level 1' }, { v: 2, label: 'Level 2' }, { v: 3, label: 'Level 3' }]} />
      <section className="card">
        <div className="row spread">
          <span className="eyebrow">Focus: {tw.focus}</span>
          {best[key] !== undefined && <span className="pill good">Best {best[key]}</span>}
        </div>
        <p className="script" style={{ color: 'var(--ink)' }}>
          {res ? res.words.map((w, j) => <span key={j} className={`w ${w.hit ? 'hit' : 'miss'}`}>{w.word} </span>) : tw.text}
        </p>
        {res ? <TakeCompare text={tw.text} take={take} rate={0.85} /> : <HearButton text={tw.text} rate={0.85} label="Hear it slowly" />}
      </section>
      {res && (
        <section className="card">
          <div className="grid3">
            <div className="statbox stat"><b style={{ color: scoreTone(res.accuracy) }}>{res.accuracy}%</b><span>understood</span></div>
            <div className="statbox stat"><b>{res.wps}</b><span>words/sec</span></div>
            <div className="statbox stat"><b>{res.newBest ? 'New' : '—'}</b><span>best</span></div>
          </div>
          <p className="small">
            <b>{res.accuracy >= 90 ? 'Clean. Now say it faster without slipping.' : 'Slow down and exaggerate the red words.'}</b>{' '}
            {res.accuracy >= 90 && res.wps >= 3.5 ? 'That speed is impressive.' : ''}
          </p>
        </section>
      )}
      <MicStage
        key={`${lvl}-${k}-${res ? 1 : 0}`}
        size="sm"
        maxSec={15}
        needsTranscript
        showCanvas={false}
        showCounters={false}
        showTranscript={false}
        autoStopSilence={1.4}
        onDone={done}
        idleHint={res ? 'Tap to go again' : 'Tap, say it once clearly'}
      />
      <div className="foot">
        <button className="btn block" onClick={() => { setK(k + 1); setRes(null); setTake(null); }}>Next twister</button>
      </div>
    </SessionShell>
  );
}
