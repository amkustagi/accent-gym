// Weekly report card: this week (last 7 days) against the 7 days before.
import { featureById, type FeatureId } from '../content/accents';
import { SKILLS, type Skill } from '../engine/score';
import { habits, weeklyDelta } from '../learn/adapt';
import { dayKey, skillAverages, streak, type State } from '../store/store';

export interface WeeklyStats {
  from: number;
  to: number;
  daysActive: number;
  activities: number;
  rounds: number;
  prevRounds: number;
  minutes: number;
  avg: number | null;
  prevAvg: number | null;
  best: { title: string; score: number } | null;
  skills: { skill: Skill; name: string; now: number; prev: number }[];
  habits: { label: string; thisWeek: number; lastWeek: number }[];
  sounds: { name: string; now: number; before: number }[];
  streak: number;
  focusSkill: { skill: Skill; name: string; score: number } | null;
}

const DAY = 864e5;

export function weeklyStats(s: State, now = Date.now()): WeeklyStats {
  const from = now - 7 * DAY;
  const prevFrom = now - 14 * DAY;
  const inWeek = s.sessions.filter((x) => x.t >= from && x.t <= now && x.durationSec > 0);
  const prevWeek = s.sessions.filter((x) => x.t >= prevFrom && x.t < from && x.durationSec > 0);
  const avg = (xs: typeof inWeek) => (xs.length ? Math.round(xs.reduce((a, x) => a + x.overall, 0) / xs.length) : null);
  let daysActive = 0;
  let activities = 0;
  for (let k = 0; k < 7; k++) {
    const d = s.days[dayKey(now - k * DAY)];
    const n = d ? Object.values(d).reduce((a, b) => a + (b ?? 0), 0) : 0;
    if (n > 0) daysActive++;
    activities += n;
  }
  const best = inWeek.reduce<{ title: string; score: number } | null>((b, x) => (!b || x.overall > b.score ? { title: x.title, score: x.overall } : b), null);
  const sounds = (Object.keys(s.sounds) as FeatureId[])
    .map((id) => {
      const h = s.sounds[id] ?? [];
      const week = h.filter((x) => x.t >= from);
      const before = h.filter((x) => x.t < from);
      if (!week.length) return null;
      const baseline = before.length ? before[before.length - 1].score : h[0].score;
      return { name: featureById(id)?.name ?? id, now: week[week.length - 1].score, before: baseline };
    })
    .filter((x): x is { name: string; now: number; before: number } => !!x && x.now !== x.before)
    .sort((a, b) => b.now - b.before - (a.now - a.before))
    .slice(0, 3);
  const avgs = skillAverages(s);
  const weakest = (Object.keys(avgs) as Skill[]).sort((a, b) => avgs[a]! - avgs[b]!)[0];
  return {
    from,
    to: now,
    daysActive,
    activities,
    rounds: inWeek.length,
    prevRounds: prevWeek.length,
    minutes: Math.round(inWeek.reduce((a, x) => a + x.durationSec, 0) / 60),
    avg: avg(inWeek),
    prevAvg: avg(prevWeek),
    best,
    skills: weeklyDelta(s).map((d) => ({ ...d, name: SKILLS.find((k) => k.id === d.skill)!.name })),
    habits: habits(s, 14).filter((h) => h.thisWeek + h.lastWeek > 0).slice(0, 3).map((h) => ({ label: h.label, thisWeek: h.thisWeek, lastWeek: h.lastWeek })),
    sounds,
    streak: streak(s),
    focusSkill: weakest ? { skill: weakest, name: SKILLS.find((k) => k.id === weakest)!.name, score: avgs[weakest]! } : null,
  };
}

/** Show the report card on Today from Friday to Monday, once there's been some practice this week. */
export function weeklyDue(s: State, now = new Date()): boolean {
  const dow = now.getDay();
  return (dow === 5 || dow === 6 || dow === 0 || dow === 1) && weeklyStats(s, now.getTime()).daysActive >= 2;
}
