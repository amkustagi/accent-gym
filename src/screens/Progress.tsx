import { useMemo, useState } from 'react';
import { DRILLS, drillById } from '../content/catalog';
import { LEVEL_LABEL, habits, levelFor } from '../learn/adapt';
import { SKILLS, type Skill } from '../engine/score';
import { open } from '../lib/nav';
import { baseline, bestStreak, level, levelName, skillAverages, streak, useStore } from '../store/store';
import { ChallengesCard } from './Challenges';
import { Icon } from '../ui/Icon';
import { Radar, Trend, scoreTone } from '../ui/ui';
import { targetById, type AccentId } from '../content/accents';

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
  const lv = level(s.xp);
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
      {scored.length === 0 && (
        <section className="card">
          <div className="empty">
            <Icon name="target" />
            <p><b>Do your first scored round</b><br />Your streak, trend and six-skill profile start here.</p>
            <button className="btn primary sm" onClick={() => open({ kind: 'drill', id: 'simulator' })}>Open the simulator</button>
          </div>
        </section>
      )}
      <section className="card">
        <div className="row spread">
          <div className="stack-sm">
            <span className="eyebrow">Level {lv.lvl}</span>
            <h3>{levelName(lv.lvl)}</h3>
          </div>
          <span className="pill brand">{s.xp} XP</span>
        </div>
        <div className="progress"><i style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div>
        <p className="small muted">{lv.need - lv.into} XP to {levelName(lv.lvl + 1)}</p>
      </section>
      <DirectTrend />
      <ChallengesCard />
      {scored.length > 0 && <section className="grid2">
        <div className="card tight stat"><b>{streak(s)}</b><span>day streak · best {bestStreak(s)}</span></div>
        <div className="card tight stat"><b>{daysActive}</b><span>days practiced</span></div>
        <div className="card tight stat"><b>{scored.length}</b><span>scored rounds</span></div>
        <div className="card tight stat"><b>{minutes}</b><span>minutes speaking</span></div>
      </section>}

      <button className="btn quiet block" onClick={() => open({ kind: 'weekly' })}><Icon name="trophy" />Weekly report card</button>

      <section className="card">
        <h3>Trend</h3>
        <div className="chips wrap" role="group" aria-label="Skill">
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

      {s.accentChecks.length > 0 && (
        <section className="card">
          <h3>Accent checks</h3>
          <Trend values={s.accentChecks.filter((c) => c.target === s.accentChecks[s.accentChecks.length - 1].target).map((c) => c.overall)} />
          <div className="stack-sm">
            {[...s.accentChecks].reverse().slice(0, 5).map((c) => (
              <div key={c.t} className="row spread small">
                <span>{fmtDate(c.t)} · {targetById(c.target as AccentId).adjective} · {c.src === 'pro' ? 'precise' : 'clarity'}</span>
                <b style={{ color: scoreTone(c.overall) }}>{c.overall}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3>Habits in your own words</h3>
        <p className="small muted">Last 14 days, counted from your transcripts.</p>
        {habits(s, 14).length ? (
          <div className="stack-sm">
            {habits(s, 14).slice(0, 8).map((h) => (
              <div key={h.ruleId} className="row spread small">
                <span>"{h.label}"</span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="muted">last week {h.lastWeek}</span>
                  <b style={{ color: h.thisWeek <= h.lastWeek ? 'var(--good)' : 'var(--bad)' }}>this week {h.thisWeek}</b>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="small">No habits detected yet. Nice.</p>
        )}
      </section>

      <section className="card">
        <h3>Difficulty, adapted to you</h3>
        <p className="small muted">Two strong rounds in a row move a drill up a level; two weak ones move it down.</p>
        <div className="stack-sm">
          {DRILLS.filter((d) => s.adapt[d.id]).map((d) => (
            <div key={d.id} className="row spread small">
              <span>{d.name}</span>
              <span className="row" style={{ gap: 4 }} aria-label={`Level ${levelFor(s, d.id)}`}>
                {[1, 2, 3, 4, 5].map((n) => <i key={n} style={{ width: 14, height: 6, borderRadius: 3, background: n <= levelFor(s, d.id) ? 'var(--brand)' : 'var(--line)' }} />)}
                <span className="muted" style={{ marginLeft: 6, minWidth: 82, textAlign: 'right' }}>{LEVEL_LABEL[levelFor(s, d.id) - 1]}</span>
              </span>
            </div>
          ))}
          {!Object.keys(s.adapt).length && <p className="small">Levels appear after a few scored rounds.</p>}
        </div>
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
                      {x.drill === 'baseline' ? 'Baseline' : drillById(x.drill)?.name ?? x.drill} · {fmtDate(x.t)} · {x.durationSec}s
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

/** Words before the point, recent takes vs the ones before: the number a manager notices. */
function DirectTrend() {
  const sessions = useStore((x) => x.sessions);
  const pts = useMemo(() => sessions.filter((x) => typeof x.extra?.toPoint === 'number' && (x.extra.toPoint as number) >= 0).map((x) => x.extra!.toPoint as number), [sessions]);
  if (pts.length < 2) return null;
  const avg = (a: number[]) => Math.round(a.reduce((p, c) => p + c, 0) / a.length);
  const recent = pts.slice(-5);
  const before = pts.slice(-10, -5);
  const now = avg(recent);
  const prev = before.length ? avg(before) : null;
  return (
    <section className="card">
      <div className="row spread">
        <h3>Getting to the point</h3>
        <button className="btn ghost sm" onClick={() => open({ kind: 'course', id: 'direct' })}>Course</button>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: '2.2rem', fontWeight: 800 }}>{now}</span>
        <span className="muted">words before your point, last {recent.length} takes</span>
      </div>
      {prev !== null && (
        <p className="small" style={{ color: now <= prev ? 'var(--good)' : 'var(--bad)' }}>
          {now < prev ? `Down from ${prev}. You're getting there faster.` : now === prev ? `Same as before (${prev}).` : `Up from ${prev}. Lead with the answer.`}
        </p>
      )}
      <p className="small muted">Aim for under 10.</p>
    </section>
  );
}
