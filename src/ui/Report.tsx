import { useEffect, useState, type ReactNode } from 'react';
import type { Scores } from '../engine/score';
import { coach, type CoachReply } from '../lib/ai';
import { loadRecording, useStore, type SessionRecord } from '../store/store';
import { Icon } from './Icon';
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

export function AudioPlayer({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    loadRecording(id).then((b) => {
      if (b) {
        u = URL.createObjectURL(b);
        setUrl(u);
      }
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  if (!url) return null;
  return <audio controls src={url} style={{ width: '100%' }} preload="metadata" />;
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
  const key = useStore((s) => s.settings.aiKey);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [err, setErr] = useState('');
  if (!key || rec.metrics.words < 15) return null;
  const run = async () => {
    setState('loading');
    try {
      setReply(await coach(key, { prompt, frame, transcript: rec.transcript, metrics: { ...rec.metrics, scores: rec.scores } }));
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
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export interface ReportProps {
  rec: SessionRecord;
  prompt?: string;
  frame?: string[];
  compare?: Scores;
  xp?: number;
  /** Drill-specific section shown under the score. */
  children?: ReactNode;
  onRetry?: () => void;
  onDone?: () => void;
  doneLabel?: string;
  sttNote?: string | null;
}

export function Report({ rec, prompt, frame, compare, xp, children, onRetry, onDone, doneLabel = 'Done', sttNote }: ReportProps) {
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
      </section>
      {sttNote && <div className="note warn"><b>Partial analysis</b>{sttNote}</div>}
      {children}
      {(fixes.length > 0 || goods.length > 0) && (
        <section className="card">
          <h3>What to work on</h3>
          <div className="list">
            {fixes.map((t, i) => (
              <div key={i} className={`tip ${t.severity}`}>
                <div>
                  <b>{t.title}</b>
                  <span className="small muted">{t.body}</span>
                </div>
              </div>
            ))}
            {goods.map((t, i) => (
              <div key={`g${i}`} className="tip good">
                <div>
                  <b>{t.title}</b>
                  <span className="small muted">{t.body}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="card">
        <h3>Numbers</h3>
        <MetricGrid rec={rec} />
        <VoiceTimeline rec={rec} />
      </section>
      {rec.transcript && (
        <section className="card">
          <div className="row spread">
            <h3>What you said</h3>
          </div>
          <Transcript text={rec.transcript} />
          <Legend />
          {rec.hasAudio && <AudioPlayer id={rec.id} />}
        </section>
      )}
      {!rec.transcript && rec.hasAudio && (
        <section className="card">
          <h3>Listen back</h3>
          <AudioPlayer id={rec.id} />
        </section>
      )}
      {prompt && <Coach rec={rec} prompt={prompt} frame={frame} />}
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
