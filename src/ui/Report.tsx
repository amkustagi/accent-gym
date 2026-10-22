import { useEffect, useRef, useState, type ReactNode } from 'react';
import { evaluate, overallOf, type Scores } from '../engine/score';
import { playBlob, stopSpeaking } from '../engine/tts';
import { aiAvailable, coach, type CoachReply } from '../lib/ai';
import { sendFeedback } from '../lib/feedback';
import { open } from '../lib/nav';
import { getState, loadRecording, updateSession, useStore, type SessionRecord } from '../store/store';
import { FixTranscript, RateReport, TipThumbs } from './Feedback';
import { CoachQuestionCard } from './CoachQuestion';
import { Icon } from './Icon';
import { HearButton } from './TakeCompare';
import { Legend, ScoreRing, SkillBars, Transcript, scoreWord } from './ui';

/** Loudness area, pitch line and pause bands over the whole take. */
export function VoiceTimeline({ rec }: { rec: SessionRecord }) {
  const tr = rec.trace;
  if (!tr || tr.length < 10) return null;
  const W = 340;
  const H = 120;
  const T = Math.max(tr[tr.length - 1][0], 1);
  const x = (t: number) => 4 + (t / T) * (W - 8);
  const yDb = (db: number) => H - 6 - Math.max(0, Math.min(1, (db + 65) / 50)) * (H - 24);
  const sts = tr.map((p) => p[2]).filter((v): v is number => v !== null);
  const lo = sts.length ? Math.min(...sts) - 1 : 0;
  const hi = sts.length ? Math.max(...sts) + 1 : 1;
  const ySt = (st: number) => 10 + (1 - (st - lo) / Math.max(hi - lo, 6)) * (H - 40);
  const area = `M${x(tr[0][0])} ${H - 6} ` + tr.map((p) => `L${x(p[0]).toFixed(1)} ${yDb(p[1]).toFixed(1)}`).join(' ') + ` L${x(tr[tr.length - 1][0])} ${H - 6} Z`;
  let pitch = '';
  let pen = false;
  tr.forEach((p) => {
    if (p[2] === null) {
      pen = false;
      return;
    }
    pitch += `${pen ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${ySt(p[2]).toFixed(1)} `;
    pen = true;
  });
  return (
    <figure className="stack-sm" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Voice timeline: loudness, pitch and pauses">
        {(rec.pauses ?? []).map((p, i) => (
          <rect key={i} x={x(p.start)} width={Math.max(2, x(p.start + p.dur) - x(p.start))} y={0} height={H} fill={p.dur >= 2.5 ? 'var(--bad)' : 'var(--good)'} opacity={0.14} rx="3" />
        ))}
        <path d={area} fill="var(--brand)" opacity="0.22" />
        <path d={pitch} fill="none" stroke="var(--signal)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="4" x2={W - 4} y1={H - 6} y2={H - 6} stroke="var(--line)" />
      </svg>
      <figcaption className="legend" style={{ flexWrap: 'wrap' }}>
        <span><i style={{ background: 'var(--signal)' }} />Pitch</span>
        <span><i style={{ background: 'var(--brand)', opacity: 0.5 }} />Loudness</span>
        <span><i style={{ background: 'var(--good)', opacity: 0.5 }} />Pause</span>
        <span><i style={{ background: 'var(--bad)', opacity: 0.5 }} />Long hesitation</span>
      </figcaption>
    </figure>
  );
}

/** Plays a saved recording through the app's own audio path (fixes silent playback on iPhone). */
export function RecordingPlayer({ id, label = 'Play my answer' }: { id: string; label?: string }) {
  const blob = useRef<Blob | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => {
    loadRecording(id).then((b) => {
      blob.current = b ?? null;
      setReady(!!b);
    });
    return () => stopSpeaking();
  }, [id]);
  if (!ready) return null;
  return (
    <div className="stack-sm">
      <button
        className="btn quiet"
        onClick={() => {
          if (playing) {
            stopSpeaking();
            setPlaying(false);
            return;
          }
          setPlaying(true);
          setErr(false);
          const started = Date.now();
          playBlob(blob.current!, {
            // An immediate end means the device couldn't decode this recording.
            onEnd: () => {
              setPlaying(false);
              if (Date.now() - started < 300) setErr(true);
            },
          });
        }}
      >
        <Icon name={playing ? 'stop' : 'play'} />
        {playing ? 'Stop' : label}
      </button>
      {err && <span className="small muted">This recording can't play on this device.</span>}
    </div>
  );
}

function MetricGrid({ rec }: { rec: SessionRecord }) {
  const m = rec.metrics;
  const cells: [string, string][] = [];
  if (m.wpm !== null) cells.push(['words/min', String(m.wpm)]);
  cells.push(['fillers', String(m.fillers)]);
  cells.push(['weak phrases', String(m.weak)]);
  if (m.pauses !== null) cells.push(['pauses', String(m.pauses)]);
  if (m.pitchRangeSt !== null) cells.push(['pitch range', `${m.pitchRangeSt} st`]);
  if (m.clarity !== null) cells.push(['understood', `${m.clarity}%`]);
  Object.entries(rec.extra ?? {}).forEach(([k, v]) => cells.push([k, String(v)]));
  cells.push(['duration', `${rec.durationSec}s`]);
  return (
    <div className="grid3">
      {cells.slice(0, 9).map(([k, v]) => (
        <div className="statbox stat" key={k}>
          <b style={{ fontSize: '1.25rem' }}>{v}</b>
          <span>{k}</span>
        </div>
      ))}
    </div>
  );
}

function Coach({ rec, prompt, frame }: { rec: SessionRecord; prompt: string; frame?: string[] }) {
  const via = useStore((s) => aiAvailable(s));
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [err, setErr] = useState('');
  if (rec.metrics.words < 15) return null;
  if (!via)
    return (
      <section className="card sunken">
        <div className="row spread">
          <h3>AI coach</h3>
          <span className="pill">Pro</span>
        </div>
        <p className="small muted">Get a rewrite of this answer in your voice plus three specific fixes.</p>
        <button className="btn quiet" onClick={() => open({ kind: 'paywall', reason: 'AI coach' })}>Unlock the AI coach</button>
      </section>
    );
  const run = async () => {
    setState('loading');
    try {
      setReply(await coach({ prompt, frame, transcript: rec.transcript, metrics: { ...rec.metrics, scores: rec.scores } }));
      setState('done');
    } catch (e) {
      setErr((e as Error).message);
      setState('error');
    }
  };
  return (
    <section className="card">
      <div className="row spread">
        <h3>AI coach</h3>
        <span className="pill brand">Claude</span>
      </div>
      {state === 'idle' && (
        <>
          <p className="muted small">Get a rewrite of your answer and three specific fixes.</p>
          <button className="btn primary" onClick={run}><Icon name="sparkle" />Coach this answer</button>
        </>
      )}
      {state === 'loading' && <p className="muted">Reading your answer…</p>}
      {state === 'error' && <div className="note bad"><b>Couldn't get coaching</b>{err}</div>}
      {state === 'done' && reply && (
        <div className="stack">
          <p style={{ fontWeight: 700 }}>{reply.summary}</p>
          {reply.strengths.length > 0 && (
            <div className="stack-sm">
              <span className="eyebrow">Keep</span>
              {reply.strengths.map((s, i) => <p key={i} className="small">✓ {s}</p>)}
            </div>
          )}
          {reply.fixes.length > 0 && (
            <div className="stack-sm">
              <span className="eyebrow">Fix</span>
              {reply.fixes.map((s, i) => <p key={i} className="small">{i + 1}. {s}</p>)}
            </div>
          )}
          {reply.rewrite && (
            <div className="card sunken tight">
              <span className="eyebrow">Stronger version</span>
              <p>{reply.rewrite}</p>
              <HearButton text={reply.rewrite} label="Hear it" />
            </div>
          )}
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => sendFeedback('content', { target: 'ai-coach', rating: 1, meta: { sessionId: rec.id } })}>👍 Helpful coaching</button>
        </div>
      )}
    </section>
  );
}

/** Re-scores the word-based skills after the user corrects the transcript. */
function rescore(rec: SessionRecord, text: string) {
  const ev = evaluate({ transcript: text, durationSec: rec.durationSec });
  const scores: Scores = { ...rec.scores };
  if (ev.scores.fillers !== undefined) scores.fillers = ev.scores.fillers;
  if (ev.scores.language !== undefined) scores.language = ev.scores.language;
  const keepTips = (rec.tips ?? []).filter((t) => t.skill !== 'language' && t.skill !== 'fillers');
  const newTips = ev.tips.filter((t) => t.skill === 'language' || t.skill === 'fillers');
  updateSession(rec.id, {
    transcript: text,
    correctedFrom: rec.correctedFrom ?? rec.transcript,
    scores,
    overall: overallOf(scores),
    tips: [...newTips, ...keepTips],
    metrics: { ...rec.metrics, fillers: ev.metrics.fillers, weak: ev.metrics.weak, words: ev.metrics.words },
  });
  sendFeedback('transcript_fix', { target: rec.id, text, meta: { heard: rec.correctedFrom ?? rec.transcript } });
}

export interface ReportProps {
  rec: SessionRecord;
  prompt?: string;
  frame?: string[];
  compare?: Scores;
  xp?: number;
  children?: ReactNode;
  onRetry?: () => void;
  onDone?: () => void;
  doneLabel?: string;
  sttNote?: string | null;
  /** Extra action, e.g. "Answer a follow-up question". */
  extraAction?: ReactNode;
}

export function Report({ rec: initial, prompt, frame, compare, xp, children, onRetry, onDone, doneLabel = 'Done', sttNote, extraAction }: ReportProps) {
  const rec = useStore((s) => s.sessions.find((x) => x.id === initial.id)) ?? initial;
  const fixes = (rec.tips ?? []).filter((t) => t.severity !== 'good').slice(0, 4);
  const goods = (rec.tips ?? []).filter((t) => t.severity === 'good');
  const hasScores = Object.keys(rec.scores).length > 0;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <div className="row" style={{ gap: 18 }}>
          <ScoreRing value={rec.overall} />
          <div className="stack-sm grow">
            <span className="eyebrow">{scoreWord(rec.overall)}</span>
            <h2 style={{ fontSize: '1.2rem' }}>{rec.title}</h2>
            {xp !== undefined && <span className="pill good" style={{ alignSelf: 'flex-start' }}>+{xp} XP</span>}
          </div>
        </div>
        {hasScores && <SkillBars scores={rec.scores} compare={compare} />}
        {!hasScores && <p className="muted small">Not enough speech was measured to score skills.</p>}
        {rec.hasAudio && <RecordingPlayer id={rec.id} />}
      </section>
      {sttNote && <div className="note warn"><b>Partial analysis</b>{sttNote}</div>}
      {children}
      {(fixes.length > 0 || goods.length > 0) && (
        <section className="card">
          <h3>What to work on</h3>
          <div className="list">
            {[...fixes, ...goods].map((t, i) => (
              <div key={i} className={`tip ${t.severity}`}>
                <div>
                  <div className="row spread" style={{ alignItems: 'flex-start' }}>
                    <b>{t.title}</b>
                    <TipThumbs tip={t.title} sessionId={rec.id} />
                  </div>
                  <span className="small muted">{t.body}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {extraAction}
      <section className="card">
        <h3>Numbers</h3>
        <MetricGrid rec={rec} />
        <VoiceTimeline rec={rec} />
      </section>
      {rec.transcript && (
        <section className="card">
          <div className="row spread">
            <h3>What you said</h3>
            {rec.correctedFrom && <span className="pill">Corrected</span>}
          </div>
          <Transcript text={rec.transcript} />
          <Legend />
          <FixTranscript value={rec.transcript} onSave={(t) => t && rescore(getState().sessions.find((x) => x.id === rec.id) ?? rec, t)} />
        </section>
      )}
      {prompt && <Coach rec={rec} prompt={prompt} frame={frame} />}
      <CoachQuestionCard />
      <RateReport sessionId={rec.id} drill={rec.drill} />
      <div className="foot">
        {onRetry && (
          <button className="btn signal block" onClick={onRetry}>
            <Icon name="refresh" />
            Try again
          </button>
        )}
        {onDone && (
          <button className="btn block" onClick={onDone}>
            {doneLabel}
          </button>
        )}
      </div>
    </div>
  );
}
