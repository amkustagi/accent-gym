import { useEffect, useRef, useState } from 'react';
import { SOUNDS, TWISTERS, WARMUP, type SoundModule } from '../../content/drills';
import { heardWord, matchTarget, tokenize, type MatchResult } from '../../engine/text';
import { speak, stopSpeaking } from '../../engine/tts';
import { levelFor, recordScore, reviewCard } from '../../learn/adapt';
import { getState } from '../../store/store';
import { HearButton, TakeCompare } from '../../ui/TakeCompare';
import { logActivity, setBest, useStore } from '../../store/store';
import { quickRecord } from '../../lib/session';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { ScoreRing, Seg, SessionShell, scoreTone } from '../../ui/ui';

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
  const [k, setK] = useState(0);
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
      <Seg label="Level" value={lvl} onChange={(v) => { setLvl(v); setK(0); setRes(null); }} options={[{ v: 1, label: 'Level 1' }, { v: 2, label: 'Level 2' }, { v: 3, label: 'Level 3' }]} />
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

// ---------------- Pronunciation ----------------

export function PronunciationDrill({ param, onClose }: { param?: string; onClose: () => void }) {
  const [mod, setMod] = useState<SoundModule | null>(() => SOUNDS.find((s) => s.id === param) ?? null);
  if (!mod)
    return (
      <SessionShell title="Pronunciation" onClose={onClose}>
        <p className="muted">Pick a sound. Each one has listening tests, words, and sentences to say, scored on how well a speech recognizer understands you.</p>
        <div className="card">
          <div className="list">
            {SOUNDS.map((s) => (
              <button key={s.id} className="item" onClick={() => setMod(s)}>
                <span className="ic"><Icon name="mouth" /></span>
                <span className="grow"><b>{s.name}</b><br /><span className="small muted mono">{s.ipa}</span></span>
                <Icon name="chevron" className="chev" />
              </button>
            ))}
          </div>
        </div>
      </SessionShell>
    );
  return <SoundSession mod={mod} onClose={onClose} onBack={param ? undefined : () => setMod(null)} />;
}

function SoundSession({ mod, onClose, onBack }: { mod: SoundModule; onClose: () => void; onBack?: () => void }) {
  const [tab, setTab] = useState<'listen' | 'words' | 'lines'>(mod.pairs.length ? 'listen' : 'words');
  const [rate, setRate] = useState(1);
  const points = useRef(0);
  useEffect(() => () => {
    if (points.current) logActivity('pronunciation', Math.min(30, 6 + points.current * 2));
  }, []);
  const award = () => (points.current += 1);

  return (
    <SessionShell title={mod.name} onClose={onClose} right={onBack && <button className="iconbtn ghost" onClick={onBack} aria-label="All sounds"><Icon name="grid" /></button>}>
      <section className="card">
        <div className="row spread">
          <span className="eyebrow">How to make it</span>
          <span className="mono small" style={{ color: 'var(--brand)' }}>{mod.ipa}</span>
        </div>
        <p>{mod.tip}</p>
        <Seg label="Model speed" value={rate} onChange={setRate} options={[{ v: 1, label: 'Normal' }, { v: 0.65, label: 'Slow' }]} />
      </section>
      <Seg
        label="Section"
        value={tab}
        onChange={setTab}
        options={[...(mod.pairs.length ? [{ v: 'listen' as const, label: 'Listen' }] : []), { v: 'words' as const, label: 'Words' }, { v: 'lines' as const, label: 'Sentences' }]}
      />
      {tab === 'listen' && <ListenTest mod={mod} rate={rate} onPoint={award} />}
      {tab === 'words' && <WordSay mod={mod} rate={rate} onPoint={award} />}
      {tab === 'lines' && <LineSay mod={mod} rate={rate} onPoint={award} />}
    </SessionShell>
  );
}

function ListenTest({ mod, rate, onPoint }: { mod: SoundModule; rate: number; onPoint: () => void }) {
  const [q, setQ] = useState<{ pair: [string, string]; answer: string } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const ask = () => {
    const pair = mod.pairs[Math.floor(Math.random() * mod.pairs.length)];
    const answer = pair[Math.random() < 0.5 ? 0 : 1];
    setQ({ pair, answer });
    setPicked(null);
    setTimeout(() => void speak(answer, { rate }), 150);
  };
  return (
    <div className="stack">
      <section className="card">
        <h3>Hear the difference</h3>
        <p className="small muted">Tap any word to hear it. Then take the test: I say one, you pick which.</p>
        <div className="stack-sm">
          {mod.pairs.map(([a, b]) => (
            <div className="row" key={a}>
              <button className="btn quiet pairbtn" onClick={() => void speak(a, { rate })}>{a}</button>
              <span className="muted small">vs</span>
              <button className="btn quiet pairbtn" onClick={() => void speak(b, { rate })}>{b}</button>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="row spread">
          <h3>Listening test</h3>
          {score.total > 0 && <span className="pill brand">{score.right}/{score.total}</span>}
        </div>
        {!q ? (
          <button className="btn signal block" onClick={ask}><Icon name="ear" />Start the test</button>
        ) : (
          <>
            <div className="row">
              {q.pair.map((w) => (
                <button
                  key={w}
                  className={`btn pairbtn ${picked ? (w === q.answer ? 'opt right' : w === picked ? 'opt wrong' : '') : ''}`}
                  disabled={!!picked}
                  onClick={() => {
                    setPicked(w);
                    const ok = w === q.answer;
                    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
                    if (ok) onPoint();
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="row">
              <button className="btn quiet grow" onClick={() => void speak(q.answer, { rate })}><Icon name="speaker" />Play again</button>
              {picked && <button className="btn primary grow" onClick={ask}>Next</button>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function WordSay({ mod, rate, onPoint }: { mod: SoundModule; rate: number; onPoint: () => void }) {
  const targets = [...mod.words.map((w) => ({ w: w.w, hint: w.hint })), ...mod.pairs.flat().map((w) => ({ w, hint: '' }))];
  const [i, setI] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; heard: string } | null>(null);
  const [take, setTake] = useState<Blob | null>(null);
  const alts = useRef<string[]>([]);
  const t = targets[i % targets.length];
  return (
    <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
      <span className="eyebrow">Word {(i % targets.length) + 1} of {targets.length}</span>
      <div className="bigword">{t.w}</div>
      {t.hint && <span className="pill brand">{t.hint}</span>}
      {take ? <TakeCompare text={t.w} take={take} rate={rate} /> : <HearButton text={t.w} rate={rate} className="btn quiet sm" />}
      {result && (
        <div className={`note ${result.ok ? 'good' : 'warn'}`} style={{ width: '100%' }}>
          <b>{result.ok ? 'Understood.' : 'Not quite.'}</b>
          {result.ok ? 'The recognizer heard exactly that word.' : `It heard "${result.heard || '…'}". Check the tip above and try again.`}
        </div>
      )}
      <MicStage
        key={`${i}-${result ? 1 : 0}`}
        size="sm"
        maxSec={6}
        needsTranscript
        showCanvas={false}
        showCounters={false}
        showTranscript={false}
        continuous={false}
        autoStopSilence={1.2}
        onStart={() => (alts.current = [])}
        onAlternatives={(a) => (alts.current = [...alts.current, ...a])}
        onDone={(r) => {
          const all = [...alts.current, r.transcript];
          const ok = heardWord(t.w, all) || tokenize(r.transcript).join(' ') === tokenize(t.w).join(' ');
          setTake(r.audio);
          reviewCard(`word:${t.w}`, ok);
          if (ok) onPoint();
          setResult({ ok, heard: r.transcript });
        }}
        idleHint="Tap and say the word"
      />
      <button className="btn block" onClick={() => { setI(i + 1); setResult(null); setTake(null); }}>Next word</button>
    </section>
  );
}

function LineSay({ mod, rate, onPoint }: { mod: SoundModule; rate: number; onPoint: () => void }) {
  const [i, setI] = useState(0);
  const [m, setM] = useState<MatchResult | null>(null);
  const [take, setTake] = useState<Blob | null>(null);
  const line = mod.lines[i % mod.lines.length];
  return (
    <section className="card">
      <p className="script" style={{ color: 'var(--ink)' }}>
        {m ? m.words.map((w, k) => <span key={k} className={`w ${w.hit ? 'hit' : 'miss'}`}>{w.word} </span>) : line}
      </p>
      {take ? <TakeCompare text={line} take={take} rate={rate} /> : <HearButton text={line} rate={rate} />}
      {m && (
        <div className="row">
          <ScoreRing value={m.accuracy} label="understood" size={96} />
          <p className="small grow">{m.accuracy >= 90 ? 'Clear. Try it at full speed.' : 'Red words weren\'t understood. Say them slowly, then the whole line.'}</p>
        </div>
      )}
      <MicStage
        key={`${i}-${m ? 1 : 0}`}
        size="sm"
        maxSec={12}
        needsTranscript
        showCanvas={false}
        showCounters={false}
        showTranscript={false}
        autoStopSilence={1.5}
        onDone={(r) => {
          setTake(r.audio);
          const res = matchTarget(line, r.transcript);
          if (res.accuracy >= 80) onPoint();
          setM(res);
        }}
        idleHint="Tap and say the sentence"
      />
      <button className="btn block" onClick={() => { setI(i + 1); setM(null); setTake(null); }}>Next sentence</button>
    </section>
  );
}
