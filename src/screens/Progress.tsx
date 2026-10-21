import { useMemo, useState } from 'react';
import { drillById } from '../content/catalog';
import { SKILLS, type Skill } from '../engine/score';
import { open } from '../lib/nav';
import { baseline, bestStreak, skillAverages, streak, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { Radar, Trend, scoreTone } from '../ui/ui';

const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function Progress() {
  const s = useStore((x) => x);
  const [skill, setSkill] = useState<Skill | 'overall'>('overall');
  const scored = useMemo(() => s.sessions.filter((x) => Object.keys(x.scores).length && x.durationSec > 0), [s.sessions]);
  const series = useMemo(() => {
    const pts = skill === 'overall' ? scored.map((x) => ({ v: x.overall, t: x.t })) : s.sessions.filter((x) => x.scores[skill] !== undefined).map((x) => ({ v: x.scores[skill]!, t: x.t }));
    return pts.slice(-30);
  }, [scored, s.sessions, skill]);
  const avgs = skillAverages(s);
  const base = baseline(s);
  const minutes = Math.round(s.sessions.reduce((a, x) => a + x.durationSec, 0) / 60);
  const daysActive = Object.keys(s.days).length;
  const history = [...s.sessions].filter((x) => x.durationSec > 0).reverse().slice(0, 40);

  return (
    <div className="page">
      <header className="stack-sm">
        <span className="eyebrow">Progress</span>
        <h1>How you're improving</h1>
      </header>
      <section className="grid2">
        <div className="card tight stat"><b>{streak(s)}</b><span>day streak · best {bestStreak(s)}</span></div>
        <div className="card tight stat"><b>{daysActive}</b><span>days practiced</span></div>
        <div className="card tight stat"><b>{scored.length}</b><span>scored rounds</span></div>
        <div className="card tight stat"><b>{minutes}</b><span>minutes speaking</span></div>
      </section>

      <section className="card">
        <h3>Trend</h3>
        <div className="chips" role="group" aria-label="Skill">
          <button className="chip" aria-pressed={skill === 'overall'} onClick={() => setSkill('overall')}>Overall</button>
          {SKILLS.map((k) => (
            <button key={k.id} className="chip" aria-pressed={skill === k.id} onClick={() => setSkill(k.id)}>{k.short}</button>
          ))}
        </div>
        <Trend values={series.map((p) => p.v)} labels={series.length ? [fmtDate(series[0].t), fmtDate(series[series.length - 1].t)] : undefined} />
        {skill !== 'overall' && <p className="small muted">Target: {SKILLS.find((k) => k.id === skill)!.target}</p>}
      </section>

      <section className="card">
        <div className="row spread">
          <h3>Now vs. baseline</h3>
          {base && <span className="small muted">dashed = {fmtDate(base.t)}</span>}
        </div>
        {Object.keys(avgs).length ? <Radar scores={avgs} base={base?.scores} /> : <p className="small muted">Your profile appears after your first scored round.</p>}
        {base && (
          <div className="stack-sm">
            {SKILLS.filter((k) => avgs[k.id] !== undefined && base.scores[k.id] !== undefined).map((k) => {
              const d = avgs[k.id]! - base.scores[k.id]!;
              return (
                <div key={k.id} className="row spread small">
                  <span>{k.name}</span>
                  <span style={{ color: d > 0 ? 'var(--good)' : d < 0 ? 'var(--bad)' : 'var(--muted)', fontWeight: 700 }}>
                    {base.scores[k.id]} → {avgs[k.id]} ({d > 0 ? '+' : ''}{d})
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="stack-sm">
        <h2>History</h2>
        {history.length ? (
          <div className="card" style={{ paddingBlock: 4 }}>
            <div className="list">
              {history.map((x) => (
                <button key={x.id} className="item" onClick={() => open({ kind: 'session', id: x.id })}>
                  <span className="ic" style={{ background: 'var(--sunken)', color: scoreTone(x.overall), fontFamily: 'var(--display)', fontWeight: 800, fontSize: '1.05rem' }}>{x.overall}</span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</b>
                    <span className="small muted">
                      {x.drill === 'baseline' ? 'Baseline' : drillById(x.drill).name} · {fmtDate(x.t)} · {x.durationSec}s
                    </span>
                  </span>
                  {x.hasAudio && <Icon name="speaker" className="chev" />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card empty">
            <Icon name="chart" />
            <p>Your rounds show up here with scores, transcripts and recordings.</p>
          </div>
        )}
      </section>
    </div>
  );
}
