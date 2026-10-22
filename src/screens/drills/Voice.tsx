import { useEffect, useMemo, useRef, useState } from 'react';
import { EMPHASIS, EXPRESSIVE_LINES, type Passage } from '../../content/drills';
import { PASSAGE_KINDS, nextPassage, type PassageKind } from '../../content/passages';
import type { CaptureResult } from '../../engine/capture';
import { overallOf, scorePace, scoreVariety } from '../../engine/score';
import { matchTarget } from '../../engine/text';
import { semitones, summarize, type Frame } from '../../engine/voice';
import { playBlob } from '../../engine/tts';
import { levelFor, recordScore } from '../../learn/adapt';
import { getState } from '../../store/store';
import { HearButton } from '../../ui/TakeCompare';
import { scoreAndSave, tooShort } from '../../lib/session';
import { logActivity, markSeen, setBest, useStore, type SessionRecord } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { Report } from '../../ui/Report';
import { Seg, SessionShell } from '../../ui/ui';

interface Tok {
  word: string;
  pause: boolean;
  /** Index among real words (pause markers excluded). */
  wi: number;
}

function tokenizePassage(text: string): Tok[] {
  let wi = 0;
  return text.split(/\s+/).filter(Boolean).map((w) => (w === '/' ? { word: '/', pause: true, wi: -1 } : { word: w, pause: false, wi: wi++ }));
}

/** A fresh passage each time: hand-written or generated for the user's role, never one just read. */
function usePassage() {
  const [kind, setKind] = useState<PassageKind | 'any'>('any');
  const fresh = (k: PassageKind | 'any', exclude?: string) => {
    const st = getState();
    const p = nextPassage({ roleId: st.profile.role, seen: st.seen, kind: k, exclude });
    markSeen(p.id);
    return p;
  };
  const [passage, setPassage] = useState<Passage>(() => fresh('any'));
  return {
    passage,
    kind,
    setKind: (k: PassageKind | 'any') => { setKind(k); setPassage(fresh(k, passage.id)); },
    another: () => setPassage(fresh(kind, passage.id)),
  };
}

function PassageTopics({ value, onChange }: { value: PassageKind | 'any'; onChange: (k: PassageKind | 'any') => void }) {
  return (
    <div className="chips" role="group" aria-label="Topic">
      <button className="chip" aria-pressed={value === 'any'} onClick={() => onChange('any')}>Any topic</button>
      {PASSAGE_KINDS.map((k) => (
        <button key={k.id} className="chip" aria-pressed={value === k.id} onClick={() => onChange(k.id)}>{k.title}</button>
      ))}
    </div>
  );
}

function NewPassageButton({ onClick }: { onClick: () => void }) {
  return <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={onClick}><Icon name="refresh" />New passage</button>;
}

// ---------------- Pace ----------------

export function PaceDrill({ onClose }: { onClose: () => void }) {
  const { passage, kind, setKind, another } = usePassage();
  const [wpm, setWpm] = useState(() => [130, 145, 145, 160, 160][levelFor(getState(), 'pace') - 1]);
  const [guide, setGuide] = useState(-1);
  const [read, setRead] = useState(0);
  const [res, setRes] = useState<{ rec: SessionRecord; xp: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef(0);
  const toks = useMemo(() => tokenizePassage(passage.text), [passage]);
  const words = toks.filter((t) => !t.pause).map((t) => t.word);
  const schedule = useMemo(() => {
    let t = 0;
    return toks.map((tk) => {
      const at = t;
      t += tk.pause ? 0.7 : 60 / wpm;
      return at;
    });
  }, [toks, wpm]);

  useEffect(() => () => clearInterval(timer.current), []);

  const onStart = () => {
    const t0 = performance.now();
    clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const e = (performance.now() - t0) / 1000;
      let g = -1;
      for (let k = 0; k < schedule.length; k++) if (schedule[k] <= e) g = k;
      setGuide(g);
    }, 80);
  };

  const onTranscript = (t: string) => {
    const m = matchTarget(words.join(' '), t);
    let last = -1;
    m.words.forEach((w, k) => w.hit && (last = k));
    setRead(last + 1);
  };

  const done = async (r: CaptureResult) => {
    clearInterval(timer.current);
    setGuide(-1);
    const short = tooShort(r);
    if (short) return setErr(short);
    setErr(null);
    const m = r.transcript ? matchTarget(words.join(' '), r.transcript) : null;
    const speakSec = r.voice?.hadSpeech ? r.voice.speakingSec : r.durationSec;
    const wordsRead = m ? Math.max(1, Math.round((m.accuracy / 100) * words.length)) : words.length;
    const myWpm = Math.round((wordsRead / Math.max(speakSec, 3)) * 60);
    const { rec, xp } = await scoreAndSave(r, {
      drill: 'pace',
      title: `Pace: ${passage.title}`,
      itemId: passage.id,
      scripted: true,
      clarity: m?.accuracy ?? null,
      extra: { 'target wpm': wpm },
      adjust: (ev) => {
        const scores = { ...ev.scores, pace: scorePace(myWpm) };
        const metrics = { ...ev.metrics, wpm: myWpm };
        const diff = myWpm - wpm;
        const tip = Math.abs(diff) <= 12
          ? { skill: 'pace' as const, severity: 'good' as const, title: `Right on pace: ${myWpm} wpm`, body: 'Remember how this felt. That is the pace to use in meetings.' }
          : { skill: 'pace' as const, severity: 'fix' as const, title: `${Math.abs(diff)} wpm ${diff > 0 ? 'faster' : 'slower'} than the guide`, body: diff > 0 ? 'Stay with the highlight. Let each pause marker fully stop you.' : 'Keep up with the highlight; read a few words ahead with your eyes.' };
        return { ...ev, scores, metrics, overall: overallOf(scores), tips: [tip, ...ev.tips.filter((t) => t.skill !== 'pace')] };
      },
    });
    setBest('pace', rec.overall);
    recordScore('pace', rec.overall);
    setRes({ rec, xp });
  };

  if (res)
    return (
      <SessionShell title="Pace trainer" onClose={onClose}>
        <Report rec={res.rec} xp={res.xp} onRetry={() => { setRes(null); setRead(0); }} onDone={onClose} />
      </SessionShell>
    );

  return (
    <SessionShell title="Pace trainer" onClose={onClose}>
      <PassageTopics value={kind} onChange={(k) => { setKind(k); setRead(0); }} />
      <Seg label="Target pace" value={wpm} onChange={setWpm} options={[{ v: 130, label: '130 calm' }, { v: 145, label: '145 natural' }, { v: 160, label: '160 brisk' }]} />
      <section className="card">
        <span className="eyebrow">{passage.title}</span>
        <span className="small muted">Read with the highlight and stop fully at each /</span>
        <p className="script">
          {toks.map((t, k) =>
            t.pause ? (
              <span key={k} className="pz">/ </span>
            ) : (
              <span key={k} className={`w${k === guide ? ' guide' : t.wi < read ? ' read' : ''}`}>{t.word} </span>
            ),
          )}
        </p>
        <div className="row wrap">
          <HearButton text={passage.text.replace(/\s\/\s?/g, '. ')} rate={wpm / 150} label="Hear the model" />
          <NewPassageButton onClick={() => { another(); setRead(0); }} />
        </div>
      </section>
      <MicStage maxSec={60} needsTranscript onStart={onStart} onTranscript={onTranscript} onDone={done} showTranscript={false} showCounters={false} autoStopSilence={3} idleHint="Tap, then read with the highlight" />
      {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
    </SessionShell>
  );
}

// ---------------- Pauses ----------------

export function PausesDrill({ onClose }: { onClose: () => void }) {
  const { passage, kind, setKind, another } = usePassage();
  const [held, setHeld] = useState(0);
  const [silence, setSilence] = useState(0);
  const [res, setRes] = useState<{ rec: SessionRecord; xp: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const toks = useMemo(() => tokenizePassage(passage.text), [passage]);
  const markers = toks.filter((t) => t.pause).length;
  const live = useRef({ floor: 0, n: 0, quietSince: -1, spoke: false, counted: false, held: 0 });

  const onStart = () => {
    live.current = { floor: 0, n: 0, quietSince: -1, spoke: false, counted: false, held: 0 };
    setHeld(0);
    setSilence(0);
  };

  const onFrame = (f: Frame) => {
    const L = live.current;
    if (L.n < 12) {
      L.floor = L.n ? Math.min(L.floor, f.db) : f.db;
      L.n++;
      return;
    }
    const thr = Math.max(L.floor + 12, -52);
    if (f.db >= thr) {
      L.spoke = true;
      L.quietSince = -1;
      L.counted = false;
      setSilence(0);
    } else if (L.spoke) {
      if (L.quietSince < 0) L.quietSince = f.t;
      const q = f.t - L.quietSince;
      setSilence(q);
      if (q >= 0.45 && !L.counted) {
        L.counted = true;
        L.held++;
        setHeld(L.held);
      }
    }
  };

  const done = async (r: CaptureResult) => {
    const short = tooShort(r);
    if (short) return setErr(short);
    setErr(null);
    const v = r.voice;
    const good = v?.goodPauses ?? 0;
    const hit = Math.min(good, markers);
    const words = toks.filter((t) => !t.pause).length;
    const wpm = v?.hadSpeech ? Math.round((words / Math.max(v.speakingSec, 3)) * 60) : null;
    const { rec, xp } = await scoreAndSave(r, {
      drill: 'pauses',
      title: `Pauses: ${passage.title}`,
      itemId: passage.id,
      scripted: true,
      extra: { 'pauses held': `${hit}/${markers}`, 'avg pause': `${v?.avgPauseSec ?? 0}s` },
      adjust: (ev) => {
        const markerScore = Math.round((hit / markers) * 100) - (v?.longPauses ?? 0) * 10;
        const scores = { ...ev.scores, pauses: Math.max(0, Math.min(100, Math.round((markerScore + (ev.scores.pauses ?? markerScore)) / 2))), ...(wpm ? { pace: scorePace(wpm) } : {}) };
        const avg = v?.avgPauseSec ?? 0;
        const tip = hit >= markers
          ? { skill: 'pauses' as const, severity: 'good' as const, title: 'Every pause held', body: avg > 1.5 ? 'Good control. Your pauses run a little long; aim for about one second.' : 'This rhythm sounds calm and deliberate.' }
          : { skill: 'pauses' as const, severity: 'fix' as const, title: `${markers - hit} pause${markers - hit > 1 ? 's' : ''} missed`, body: 'At each /, close your mouth, breathe in through your nose, then continue.' };
        return { ...ev, scores, metrics: { ...ev.metrics, wpm }, overall: overallOf(scores), tips: [tip, ...ev.tips.filter((t) => t.skill !== 'pauses')] };
      },
    });
    setBest('pauses', rec.overall);
    recordScore('pauses', rec.overall);
    setRes({ rec, xp });
  };

  if (res)
    return (
      <SessionShell title="Pause power" onClose={onClose}>
        <Report rec={res.rec} xp={res.xp} onRetry={() => setRes(null)} onDone={onClose} />
      </SessionShell>
    );

  let seen = 0;
  return (
    <SessionShell title="Pause power" onClose={onClose}>
      <PassageTopics value={kind} onChange={(k) => { setKind(k); setHeld(0); }} />
      <section className="card">
        <div className="row spread">
          <span className="eyebrow">{passage.title}</span>
          <span className={`pill ${held >= markers ? 'good' : 'brand'}`}>{Math.min(held, markers)}/{markers} held</span>
        </div>
        <p className="script">
          {toks.map((t, k) => {
            if (!t.pause) return <span key={k} className="w read">{t.word} </span>;
            seen++;
            return <span key={k} className={`pz${seen <= held ? ' done' : ''}`}>{seen <= held ? '✓' : '/'} </span>;
          })}
        </p>
        <div className="stack-sm">
          <span className="small muted">Hold a beat at each /. Fill the silence meter to about one second.</span>
          <div className="progress" style={{ height: 12 }}>
            <i style={{ width: `${Math.min(100, (silence / 1.2) * 100)}%`, background: silence >= 0.45 ? 'var(--good)' : 'var(--signal)', transition: 'none' }} />
          </div>
        </div>
        <NewPassageButton onClick={() => { another(); setHeld(0); }} />
      </section>
      <MicStage maxSec={60} modeOverride="voice" onStart={onStart} onFrame={onFrame} onDone={done} showTranscript={false} showCounters={false} autoStopSilence={3.5} idleHint="Tap and read it aloud" />
      {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
    </SessionShell>
  );
}

// ---------------- Variety ----------------

function PitchMini({ frames, color }: { frames: Frame[]; color: string }) {
  const pts = frames.filter((f) => f.f0 !== null).map((f) => [f.t, semitones(f.f0!)] as const);
  if (pts.length < 5) return <div className="small muted">Not enough voiced sound.</div>;
  const T = Math.max(frames[frames.length - 1].t, 1);
  const W = 300;
  const H = 70;
  const x = (t: number) => (t / T) * W;
  const y = (s: number) => H - ((s + 8) / 30) * H;
  let d = '';
  let prevT = -1;
  pts.forEach(([t, s]) => {
    d += `${prevT >= 0 && t - prevT < 0.12 ? 'L' : 'M'}${x(t).toFixed(1)} ${y(s).toFixed(1)} `;
    prevT = t;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Pitch trace">
      <rect width={W} height={H} rx="10" fill="var(--sunken)" />
      <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VarietyDrill({ onClose }: { onClose: () => void }) {
  const lines = useMemo(
    () => [
      ...EXPRESSIVE_LINES.map((t) => ({ text: t, stress: [] as number[], meaning: '' })),
      ...EMPHASIS.flatMap((e) => e.variants.slice(0, 2).map((v) => ({ text: e.text, stress: [v.word], meaning: v.meaning }))),
    ],
    [],
  );
  const [li, setLi] = useState(() => Math.floor(Math.random() * 1000));
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [flat, setFlat] = useState<{ frames: Frame[]; range: number; audio: Blob | null } | null>(null);
  const [lively, setLively] = useState<{ frames: Frame[]; range: number; audio: Blob | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const line = lines[li % lines.length];
  const best = useStore((s) => s.best.variety);

  const take = (r: CaptureResult) => {
    const v = r.voice ?? (r.frames.length ? summarize(r.frames) : null);
    if (!v?.hadSpeech || v.pitchRangeSt === null) {
      setErr('I couldn\'t track your pitch. Speak a little louder, closer to the phone, in a quiet room.');
      return;
    }
    setErr(null);
    const got = { frames: r.frames, range: v.pitchRangeSt, audio: r.audio };
    if (step === 0) {
      setFlat(got);
      setStep(1);
    } else {
      setLively(got);
      setStep(2);
      const score = scoreVariety(got.range);
      logActivity('variety', 8 + Math.round(score / 10));
      recordScore('variety', score);
      setBest('variety', Math.round(got.range * 10) / 10);
    }
  };

  const next = () => {
    setLi(li + 1);
    setStep(0);
    setFlat(null);
    setLively(null);
  };

  const words = line.text.split(' ');
  const gain = flat && lively ? Math.round((lively.range - flat.range) * 10) / 10 : 0;

  return (
    <SessionShell title="Vocal variety" onClose={onClose}>
      <div className="steps" aria-hidden="true">
        <i className={step > 0 ? 'on' : 'now'} />
        <i className={step > 1 ? 'on' : step === 1 ? 'now' : ''} />
        <i className={step === 2 ? 'now' : ''} />
      </div>
      <section className="card">
        <span className="eyebrow">{step === 0 ? 'Take 1: say it flat, like a robot' : step === 1 ? 'Take 2: bring it to life' : 'Compare'}</span>
        <p className="script" style={{ color: 'var(--ink)' }}>
          {words.map((w, k) => (
            <span key={k} className={step >= 1 && line.stress.includes(k) ? 'stress' : ''}>{w} </span>
          ))}
        </p>
        {step === 1 && (
          <p className="small muted">
            {line.meaning ? `Stress the highlighted word so it means: ${line.meaning} ` : 'Lift the key words, vary your speed, and drop your pitch at the end. '}
            Exaggerate. It will sound less dramatic than it feels.
          </p>
        )}
      </section>
      {step < 2 && <MicStage key={step} maxSec={15} modeOverride="voice" showTranscript={false} showCounters={false} autoStopSilence={1.8} onDone={take} idleHint={step === 0 ? 'Tap, then say it in one flat tone' : 'Tap, then say it with energy'} />}
      {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
      {step === 2 && flat && lively && (
        <div className="stack">
          <section className="card">
            <div className="row spread">
              <span className="eyebrow">Flat</span>
              <span className="pill">{flat.range} semitones</span>
            </div>
            <PitchMini frames={flat.frames} color="var(--faint)" />
            {flat.audio && <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => playBlob(flat.audio!)}><Icon name="play" />Play flat take</button>}
            <div className="row spread">
              <span className="eyebrow">Lively</span>
              <span className={`pill ${lively.range >= 5 ? 'good' : 'warn'}`}>{lively.range} semitones</span>
            </div>
            <PitchMini frames={lively.frames} color="var(--signal)" />
            {lively.audio && <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => playBlob(lively.audio!)}><Icon name="play" />Play lively take</button>}
            <div className={`note ${lively.range >= 5 && gain >= 2 ? 'good' : 'warn'}`}>
              <b>{lively.range >= 5 && gain >= 2 ? `+${gain} semitones. That's real range.` : gain > 0 ? `+${gain} semitones. Push further.` : 'Not much difference yet.'}</b>
              Confident speakers use 5 or more semitones. {best ? `Your best: ${best}.` : ''}
            </div>
          </section>
          <div className="foot">
            <button className="btn signal block" onClick={() => { setStep(1); setLively(null); }}><Icon name="refresh" />Try take 2 again</button>
            <button className="btn block" onClick={next}>Next line</button>
          </div>
        </div>
      )}
    </SessionShell>
  );
}
