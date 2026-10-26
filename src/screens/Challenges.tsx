import { useEffect, useMemo, useState } from 'react';
import { BADGES, challengeStatus, challengesWon, daysLeftInWeek, recentWeeks, weekKey, weekXp } from '../learn/challenges';
import { backendEnabled, fetchLeaderboard, leaveLeaderboard, pushLeaderboard, type LeaderRow } from '../lib/backend';
import { open } from '../lib/nav';
import { updateSettings, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell, Switch } from '../ui/ui';

/** One compact card on Today. */
export function ChallengesCard() {
  const s = useStore((x) => x);
  const st = useMemo(() => challengeStatus(s), [s]);
  const done = st.filter((x) => x.done).length;
  const next = st.find((x) => !x.done);
  return (
    <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }} onClick={() => open({ kind: 'challenges' })}>
      <div className="row spread">
        <span className="eyebrow">Weekly challenges · {daysLeftInWeek() === 1 ? 'last day' : `${daysLeftInWeek()} days left`}</span>
        <span className={`pill ${done === st.length ? 'good' : 'brand'}`}>{done}/{st.length}</span>
      </div>
      <div className="row spread">
        <b>{next ? `${next.c.title}: ${next.value}/${next.c.target}` : 'All done this week'}</b>
        <Icon name="chevron" className="chev" />
      </div>
      <div className="progress" style={{ height: 6 }}><i style={{ width: `${next ? (next.value / next.c.target) * 100 : 100}%` }} /></div>
    </button>
  );
}

function Leaderboard() {
  const account = useStore((s) => s.account);
  const optIn = useStore((s) => s.settings.leaderboard);
  const s = useStore((x) => x);
  const xp = weekXp(s);
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!backendEnabled || !account || !optIn) return;
    let alive = true;
    (async () => {
      try {
        await pushLeaderboard(weekKey(), xp);
        const r = await fetchLeaderboard(weekKey());
        if (alive) setRows(r);
      } catch {
        if (alive) setErr('Couldn\'t load the leaderboard. Check your connection.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [account, optIn, xp]);

  if (!backendEnabled)
    return (
      <section className="card">
        <h3>Leaderboard</h3>
        <p className="small muted">Compete with other Speakco users each week. It turns on once accounts are connected; until then, beat your own best week above.</p>
      </section>
    );
  if (!account)
    return (
      <section className="card">
        <h3>Leaderboard</h3>
        <p className="small muted">Sign in to compete with other speakers each week.</p>
        <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => open({ kind: 'account' })}>Sign in</button>
      </section>
    );
  return (
    <section className="card">
      <div className="row spread">
        <h3>Leaderboard</h3>
        <Switch checked={optIn} onChange={(v) => { updateSettings({ leaderboard: v }); if (!v) { void leaveLeaderboard(); setRows(null); } }} label="Join the leaderboard" />
      </div>
      {!optIn && <p className="small muted">Join to show your first name and weekly XP. Nothing else is shared. You can leave anytime.</p>}
      {optIn && err && <div className="note warn">{err}</div>}
      {optIn && rows && (
        <div className="stack-sm">
          {rows.map((r, i) => (
            <div key={i} className="row spread" style={r.me ? { fontWeight: 800 } : undefined}>
              <span>{i + 1}. {r.name}{r.me ? ' (you)' : ''}</span>
              <span className="num">{r.xp} XP</span>
            </div>
          ))}
          {!rows.length && <p className="small muted">You're the first this week.</p>}
        </div>
      )}
    </section>
  );
}

export function ChallengesScreen({ onClose }: { onClose: () => void }) {
  const s = useStore((x) => x);
  const st = useMemo(() => challengeStatus(s), [s]);
  const weeks = useMemo(() => recentWeeks(s), [s]);
  const best = Math.max(1, ...weeks.map((w) => w.xp));
  const won = challengesWon(s);
  const badges = BADGES.filter((b) => won >= b.at);
  const nextBadge = BADGES.find((b) => won < b.at);
  return (
    <SessionShell title="Challenges" onClose={onClose}>
      <section className="stack-sm">
        <span className="eyebrow">This week · {daysLeftInWeek() === 1 ? 'last day' : `${daysLeftInWeek()} days left`}</span>
        <h2>Three goals, picked for you</h2>
      </section>
      <div className="stack">
        {st.map(({ c, value, done }) => (
          <section key={c.id} className="card">
            <div className="row spread">
              <b>{c.title}</b>
              <span className={`pill ${done ? 'good' : ''}`}>{done ? `Done · +${c.xp} XP` : `+${c.xp} XP`}</span>
            </div>
            <span className="small muted">{c.detail}</span>
            <div className="row" style={{ gap: 10 }}>
              <div className="progress grow" style={{ height: 8 }}><i style={{ width: `${(value / c.target) * 100}%`, background: done ? 'var(--good)' : undefined }} /></div>
              <span className="small num">{value}/{c.target}</span>
            </div>
          </section>
        ))}
      </div>
      <section className="card">
        <div className="row spread">
          <h3>Your weeks</h3>
          <span className="small muted">Best: {Math.max(...weeks.map((w) => w.xp))} XP</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 10, height: 110 }}>
          {weeks.map((w, i) => (
            <div key={w.week} className="grow stack-sm" style={{ alignItems: 'center', gap: 4 }}>
              <span className="small num">{w.xp}</span>
              <div style={{ width: '100%', height: Math.max(4, (w.xp / best) * 70), borderRadius: 6, background: i === weeks.length - 1 ? 'var(--signal)' : 'var(--line)' }} />
              <span className="small muted">{i === weeks.length - 1 ? 'Now' : new Date(`${w.week}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="row spread">
          <h3>Badges</h3>
          <span className="small muted">{won} challenges won</span>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {badges.map((b) => <span key={b.name} className="pill good"><Icon name="trophy" size={14} /> {b.name}</span>)}
          {nextBadge && <span className="pill">Next: {nextBadge.name} at {nextBadge.at}</span>}
        </div>
      </section>
      <Leaderboard />
    </SessionShell>
  );
}
