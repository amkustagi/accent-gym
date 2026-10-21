import { useEffect, useMemo, useState } from 'react';
import { drillById } from '../content/catalog';
import { LESSONS } from '../content/lessons';
import { SWAPS } from '../content/drills';
import { open } from '../lib/nav';
import { baseline, level, levelName, skillAverages, streak, todayPlan, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { Radar } from '../ui/ui';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}
let deferred: BIPEvent | null = null;
const bipListeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BIPEvent;
  bipListeners.forEach((l) => l());
});
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function InstallCard() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('install-dismissed') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const l = () => force((n) => n + 1);
    bipListeners.add(l);
    return () => void bipListeners.delete(l);
  }, []);
  if (standalone() || dismissed) return null;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const hide = () => {
    setDismissed(true);
    try {
      localStorage.setItem('install-dismissed', '1');
    } catch {
      /* ignore */
    }
  };
  return (
    <section className="card">
      <div className="row spread">
        <h3>Install the app</h3>
        <button className="iconbtn ghost" style={{ width: 36, height: 36 }} onClick={hide} aria-label="Dismiss"><Icon name="close" size={18} /></button>
      </div>
      {deferred ? (
        <>
          <p className="small muted">Add Speak Sharp to your home screen. It opens full-screen and works offline.</p>
          <button className="btn primary" onClick={async () => { await deferred!.prompt(); await deferred!.userChoice; deferred = null; force((n) => n + 1); }}>
            <Icon name="download" />Install
          </button>
        </>
      ) : iOS ? (
        <p className="small muted">In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>. It opens full-screen and works offline.</p>
      ) : (
        <p className="small muted">In Chrome, tap <b>⋮</b>, then <b>Install app</b> or <b>Add to Home screen</b>.</p>
      )}
    </section>
  );
}

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export function Today() {
  const s = useStore((x) => x);
  const plan = useMemo(() => todayPlan(s), [s]);
  const avgs = useMemo(() => skillAverages(s), [s]);
  const base = baseline(s);
  const lv = level(s.xp);
  const st = streak(s);
  const doneCount = plan.filter((p) => p.done >= p.target).length;
  const next = plan.find((p) => p.done < p.target);
  const rule = SWAPS[Math.floor(Date.now() / 864e5) % SWAPS.length];
  const lesson = LESSONS.find((l) => !s.lessonsDone.includes(l.id)) ?? LESSONS[Math.floor(Date.now() / 864e5) % LESSONS.length];
  const hasData = Object.keys(avgs).length >= 3;

  return (
    <div className="page">
      <header className="head">
        <div className="stack-sm">
          <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <h1>{greet()}{s.profile.name ? `, ${s.profile.name}` : ''}</h1>
        </div>
        <button className="iconbtn" onClick={() => open({ kind: 'settings' })} aria-label="Settings"><Icon name="settings" /></button>
      </header>

      <section className="card hero" style={{ gap: 16 }}>
        <div className="row spread">
          <div className="stack-sm">
            <span className="eyebrow">Today's plan · {s.profile.minutes} min</span>
            <h2 style={{ color: '#fff' }}>{doneCount === plan.length ? 'All done. Nice work.' : `${doneCount} of ${plan.length} done`}</h2>
          </div>
          <div className="stat" style={{ alignItems: 'flex-end' }}>
            <b>{st}</b>
            <span>day streak</span>
          </div>
        </div>
        <div className="progress"><i style={{ width: `${(doneCount / plan.length) * 100}%` }} /></div>
        <div className="stack-sm" style={{ gap: 4 }}>
          {plan.map((p, i) => {
            const d = drillById(p.drill);
            const ok = p.done >= p.target;
            return (
              <button key={i} className="item" style={{ color: 'inherit', borderTopColor: 'rgba(255,255,255,0.12)', padding: '10px 0' }} onClick={() => open({ kind: 'drill', id: p.drill, param: p.param })}>
                <span className="ic" style={{ background: ok ? 'var(--signal)' : 'rgba(255,255,255,0.12)', color: ok ? 'var(--signal-ink)' : '#fff' }}>
                  <Icon name={ok ? 'check' : d.icon} />
                </span>
                <span className="grow">
                  <b style={{ textDecoration: ok ? 'line-through' : undefined, opacity: ok ? 0.7 : 1 }}>{d.name}</b>
                  <br />
                  <span className="small" style={{ opacity: 0.72 }}>{p.reason} · {d.minutes} min</span>
                </span>
                <Icon name="chevron" className="chev" />
              </button>
            );
          })}
        </div>
        {next && (
          <button className="btn primary block" onClick={() => open({ kind: 'drill', id: next.drill, param: next.param })}>
            <Icon name="play" />{doneCount ? 'Continue' : 'Start'}: {drillById(next.drill).name}
          </button>
        )}
      </section>

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

      <section className="card">
        <div className="row spread">
          <h3>Your skill profile</h3>
          {base && hasData && <span className="small muted">dashed = baseline</span>}
        </div>
        {hasData ? (
          <Radar scores={avgs} base={base?.scores} />
        ) : (
          <div className="empty">
            <Icon name="target" />
            <p>Do a meeting simulator round to see your profile across six skills.</p>
            <button className="btn primary sm" onClick={() => open({ kind: 'drill', id: 'simulator' })}>Open the simulator</button>
          </div>
        )}
      </section>

      <InstallCard />

      <section className="card">
        <span className="eyebrow">Swap of the day</span>
        <p className="strike" style={{ fontSize: '1.05rem' }}>{rule.weak}</p>
        <p style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--good)' }}>{rule.strong}</p>
        <p className="small muted">{rule.why}</p>
      </section>

      <button className="card" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => open({ kind: 'lesson', id: lesson.id })}>
        <div className="row">
          <span className="ic" style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--signal-soft)', color: 'var(--warn)' }}><Icon name="book" /></span>
          <span className="grow">
            <span className="eyebrow">2-minute lesson</span>
            <br />
            <b>{lesson.title}</b>
          </span>
          <Icon name="chevron" className="chev" />
        </div>
      </button>
    </div>
  );
}
