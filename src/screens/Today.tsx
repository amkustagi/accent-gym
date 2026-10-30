import { useMemo } from 'react';
import { drillById } from '../content/catalog';
import { open } from '../lib/nav';
import { streak, useStore } from '../store/store';
import { dueCount, todayPlan } from '../learn/adapt';
import { FREE_DAILY_ROUNDS, isPro } from '../lib/backend';
import { checkinDue } from '../lib/feedback';
import { scoredToday } from '../store/store';
import { CheckinCard } from './FeedbackScreen';
import { SetupCard } from './SetupCard';
import { weeklyDue } from '../lib/weekly';
import { ContinueCourseCard } from './Courses';
import { ReportButton } from '../ui/ReportButton';
import { Icon } from '../ui/Icon';
import { CoachSays } from '../ui/CoachSays';
import { coachById, dailyLine } from '../content/coaches';
import { todaySuggestion } from '../learn/today';

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export function Today() {
  const s = useStore((x) => x);
  const plan = useMemo(() => todayPlan(s), [s]);
  const coach = coachById(s.settings.coach);
  const st = streak(s);
  const doneCount = plan.filter((p) => p.done).length;
  const next = plan.find((p) => !p.done);
  const due = dueCount(s);
  const pro = isPro(s);
  const left = FREE_DAILY_ROUNDS - scoredToday(s);
  // Today = the plan, one suggestion and (until done) one setup card. Stats and habits live in Progress.
  const pick = todaySuggestion({ weeklyDue: weeklyDue(s), checkinDue: checkinDue(), reviewDue: due });

  return (
    <div className="page">
      <header className="head">
        <div className="stack-sm">
          <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <h1>{greet()}{s.profile.name ? `, ${s.profile.name}` : ''}</h1>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <ReportButton />
          <button className="iconbtn" onClick={() => open({ kind: 'settings' })} aria-label="Settings"><Icon name="settings" /></button>
        </div>
      </header>

      <CoachSays text={dailyLine(coach.hello)} size={72} />

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
            const ok = p.done;
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

      {!pro && (
        <div className="note" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="grow">{left > 0 ? `${left} of ${FREE_DAILY_ROUNDS} free speaking rounds left today.` : 'You\'ve used today\'s free speaking rounds. Drills are still unlimited.'}</span>
          <button className="btn sm signal" onClick={() => open({ kind: 'paywall' })}>Go Pro</button>
        </div>
      )}

      {pick === 'course' && <ContinueCourseCard />}

      {pick === 'weekly' && (
        <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', borderColor: 'var(--brand)' }} onClick={() => open({ kind: 'weekly' })}>
          <div className="row">
            <span className="ic" style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="trophy" /></span>
            <span className="grow"><b>Your week in review</b><br /><span className="small muted">Progress, habits and next week's focus. Shareable.</span></span>
            <Icon name="chevron" className="chev" />
          </div>
        </button>
      )}

      {pick === 'checkin' && <CheckinCard />}

      {pick === 'review' && (
        <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }} onClick={() => open({ kind: 'drill', id: 'swaps' })}>
          <div className="row">
            <span className="ic" style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--signal-soft)', color: 'var(--warn)' }}><Icon name="target" /></span>
            <span className="grow"><b>{due} phrase cards to review</b><br /><span className="small muted">A quick round keeps the stronger swaps fresh.</span></span>
            <Icon name="chevron" className="chev" />
          </div>
        </button>
      )}

      <SetupCard />
    </div>
  );
}
