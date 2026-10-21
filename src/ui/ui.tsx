import { useEffect, useState, type ReactNode } from 'react';
import { segments } from '../engine/text';
import { SKILLS, type Scores, type Skill } from '../engine/score';
import { Icon } from './Icon';

export const scoreTone = (v: number) => (v >= 85 ? 'var(--good)' : v >= 65 ? 'var(--warn)' : 'var(--bad)');
export const scoreWord = (v: number) => (v >= 90 ? 'Excellent' : v >= 80 ? 'Strong' : v >= 65 ? 'Getting there' : v >= 45 ? 'Needs work' : 'Rough take');

export function ScoreRing({ value, label = 'score', size = 132 }: { value: number; label?: string; size?: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="ring-wrap" style={{ width: size, height: size }} role="img" aria-label={`${label} ${value} out of 100`}>
      <svg viewBox="0 0 132 132" width={size} height={size}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--sunken)" strokeWidth="12" />
        <circle cx="66" cy="66" r={r} fill="none" stroke={scoreTone(value)} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} transform="rotate(-90 66 66)" style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="val">
        <div>
          <b>{value}</b>
          <div className="small muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

export function SkillBars({ scores, compare }: { scores: Scores; compare?: Scores }) {
  const list = SKILLS.filter((s) => scores[s.id] !== undefined);
  if (!list.length) return null;
  return (
    <div className="stack-sm">
      {list.map((s) => {
        const v = scores[s.id]!;
        const prev = compare?.[s.id];
        return (
          <div className="skillbar" key={s.id}>
            <span>{s.name}</span>
            <div className="bar" aria-hidden="true">
              <i style={{ width: `${v}%`, background: scoreTone(v) }} />
            </div>
            <span className="v" aria-label={`${s.name} ${v}`}>
              {v}
              {prev !== undefined && prev !== v && <sup style={{ color: v > prev ? 'var(--good)' : 'var(--bad)', fontSize: '0.65em', marginLeft: 1 }}>{v > prev ? '▲' : '▼'}</sup>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Six-axis skill profile. Missing skills are drawn at the center. */
export function Radar({ scores, base, size = 260 }: { scores: Scores; base?: Scores; size?: number }) {
  const cx = 150;
  const cy = 132;
  const R = 92;
  const axes = SKILLS;
  const pt = (i: number, v: number) => {
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / axes.length;
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)];
  };
  const poly = (sc: Scores) => axes.map((s, i) => pt(i, sc[s.id] ?? 0).join(',')).join(' ');
  return (
    <svg viewBox="0 0 300 264" width="100%" style={{ maxWidth: size + 40 }} role="img" aria-label="Skill profile">
      {[25, 50, 75, 100].map((g) => (
        <polygon key={g} points={axes.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />;
      })}
      {base && <polygon points={poly(base)} fill="none" stroke="var(--faint)" strokeWidth="1.5" strokeDasharray="4 4" />}
      <polygon points={poly(scores)} fill="var(--brand)" fillOpacity="0.18" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((s, i) => {
        const v = scores[s.id];
        if (v === undefined) return null;
        const [x, y] = pt(i, v);
        return <circle key={s.id} cx={x} cy={y} r="3.5" fill="var(--brand)" />;
      })}
      {axes.map((s, i) => {
        const [x, y] = pt(i, 122);
        const v = scores[s.id];
        return (
          <text key={s.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11.5" fontWeight="700" fill="var(--muted)">
            {s.short}
            <tspan x={x} dy="13" fontWeight="400" fill={v !== undefined ? 'var(--ink)' : 'var(--faint)'}>{v ?? '–'}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

/** Line chart of scores over sessions. */
export function Trend({ values, height = 140, labels }: { values: number[]; height?: number; labels?: string[] }) {
  if (values.length < 2)
    return <p className="small muted">Your trend appears after two scored rounds.</p>;
  const W = 320;
  const H = height;
  const pad = { l: 28, r: 10, t: 10, b: 20 };
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (values.length - 1);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Score trend, latest ${last}`}>
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--line)" />
          <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize="10" fill="var(--faint)">{g}</text>
        </g>
      ))}
      <rect x={pad.l} width={W - pad.l - pad.r} y={y(90)} height={y(70) - y(90)} fill="var(--good)" opacity="0.07" />
      <path d={area} fill="var(--brand)" opacity="0.1" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="4.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
      {labels && (
        <>
          <text x={pad.l} y={H - 4} fontSize="10" fill="var(--faint)">{labels[0]}</text>
          <text x={W - pad.r} y={H - 4} fontSize="10" fill="var(--faint)" textAnchor="end">{labels[labels.length - 1]}</text>
        </>
      )}
    </svg>
  );
}

export function Transcript({ text, empty = 'Your words appear here as you speak…' }: { text: string; empty?: string }) {
  return (
    <p className="transcript" data-empty={empty} aria-live="polite">
      {text
        ? segments(text).map((s, i) =>
            s.kind ? (
              <mark key={i} className={`mark ${s.kind}`} title={s.label}>
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )
        : null}
    </p>
  );
}

export function Legend() {
  return (
    <div className="legend">
      <span><i style={{ background: 'var(--bad)' }} />Weak phrase</span>
      <span><i style={{ background: 'var(--warn)' }} />Filler</span>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </span>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SessionShell({ title, onClose, children, progress, right }: { title: string; onClose: () => void; children: ReactNode; progress?: number; right?: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="session" role="dialog" aria-modal="true" aria-label={title}>
      <div className="session-inner">
        <div className="session-top">
          <button className="iconbtn ghost" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          <div className="grow">{title}</div>
          <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
        </div>
        {progress !== undefined && (
          <div className="progress" aria-hidden="true">
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

let toastSetter: ((m: string | null) => void) | null = null;
export const toast = (m: string) => toastSetter?.(m);
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    toastSetter = setMsg;
    return () => {
      toastSetter = null;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function skillName(k: Skill) {
  return SKILLS.find((s) => s.id === k)?.name ?? k;
}
