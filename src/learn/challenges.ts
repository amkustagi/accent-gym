// Weekly challenges: three goals each week, picked around the user's focus, tracked automatically.
import type { Skill } from '../engine/score';
import { dayKey, getState, onChange, setState, type SessionRecord, type State } from '../store/store';

const DAY = 864e5;

/** Monday of the week containing t, as a day key. */
export function weekKey(t = Date.now()): string {
  const d = new Date(t);
  const back = (d.getDay() + 6) % 7;
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime());
}

export function weekStart(t = Date.now()): number {
  return new Date(`${weekKey(t)}T00:00:00`).getTime();
}

export interface Challenge {
  id: string;
  title: string;
  detail: string;
  target: number;
  xp: number;
  /** The skill it builds, so the week leans toward the coach's focus. */
  skill?: Skill;
  /** Only offered when this is true for the user. */
  when?: (s: State) => boolean;
  progress: (week: SessionRecord[], s: State, start: number) => number;
}

const scored = (xs: SessionRecord[]) => xs.filter((x) => Object.keys(x.scores).length > 0);

export const CHALLENGES: Challenge[] = [
  { id: 'days5', title: 'Five-day streak', detail: 'Practice on 5 different days this week.', target: 5, xp: 60,
    progress: (_w, s, start) => Object.keys(s.days).filter((k) => new Date(`${k}T12:00:00`).getTime() >= start && Object.values(s.days[k]).some((n) => (n ?? 0) > 0)).length },
  { id: 'noweak', title: 'Zero hedges', detail: '3 speaking rounds with no hedges or apologies.', target: 3, xp: 50, skill: 'language',
    progress: (w) => scored(w).filter((x) => x.metrics.words >= 20 && x.metrics.weak === 0).length },
  { id: 'fillers', title: 'Filler-free', detail: '3 rounds under 2 fillers a minute.', target: 3, xp: 50, skill: 'fillers',
    progress: (w) => scored(w).filter((x) => x.metrics.fillersPerMin !== null && x.metrics.words >= 20 && x.metrics.fillersPerMin < 2).length },
  { id: 'pauses', title: 'Master the pause', detail: '3 rounds scoring 75+ on pauses.', target: 3, xp: 50, skill: 'pauses',
    progress: (w) => w.filter((x) => (x.scores.pauses ?? 0) >= 75).length },
  { id: 'pace', title: 'In the pocket', detail: '3 rounds between 130 and 160 words a minute.', target: 3, xp: 50, skill: 'pace',
    progress: (w) => w.filter((x) => x.metrics.wpm !== null && x.metrics.wpm >= 130 && x.metrics.wpm <= 160).length },
  { id: 'variety', title: 'Bring it to life', detail: '3 rounds scoring 75+ on vocal variety.', target: 3, xp: 50, skill: 'variety',
    progress: (w) => w.filter((x) => (x.scores.variety ?? 0) >= 75).length },
  { id: 'lessons', title: 'Course sprint', detail: 'Practice 4 course lessons out loud.', target: 4, xp: 60,
    progress: (w) => new Set(w.filter((x) => x.drill === 'course').map((x) => x.itemId)).size },
  { id: 'sim', title: 'Meeting marathon', detail: '5 simulator or pressure rounds.', target: 5, xp: 60,
    progress: (w) => w.filter((x) => x.drill === 'simulator' || x.drill === 'pressure' || x.drill === 'roleplay').length },
  { id: 'minutes', title: 'Twenty minutes of talk', detail: 'Speak for 20 minutes in total this week.', target: 20, xp: 70,
    progress: (w) => Math.floor(w.reduce((a, x) => a + x.durationSec, 0) / 60) },
  { id: 'camera', title: 'Camera ready', detail: '2 video presence rounds.', target: 2, xp: 40,
    progress: (w) => w.filter((x) => x.drill === 'camera').length },
  { id: 'accent', title: 'Sound practice', detail: 'Practice your accent on 3 different days.', target: 3, xp: 50, skill: 'clarity',
    when: (s) => s.profile.accentGoal !== 'none',
    progress: (_w, s, start) => Object.keys(s.days).filter((k) => new Date(`${k}T12:00:00`).getTime() >= start && ((s.days[k].pronunciation ?? 0) + (s.days[k].shadow ?? 0) + (s.days[k].accentcheck ?? 0)) > 0).length },
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * This week's three: one for the coach's focus skill (when there's a match), a habit builder
 * (streak, lessons, simulator or minutes), and one more. The same all week, different next week.
 */
export function weeklyChallenges(s: State, t = Date.now()): Challenge[] {
  const wk = weekKey(t);
  const pool = CHALLENGES.filter((c) => !c.when || c.when(s));
  const seed = hash(`${wk}:${s.profile.createdAt}`);
  const rot = <T,>(xs: T[], k: number) => xs.map((_, i) => xs[(i + k) % xs.length]);
  const out: Challenge[] = [];
  const focus = s.learner.focus?.skill;
  const skillOne = pool.find((c) => c.skill && c.skill === focus) ?? rot(pool.filter((c) => c.skill), seed % 7)[0];
  if (skillOne) out.push(skillOne);
  const habit = rot(pool.filter((c) => ['days5', 'lessons', 'sim', 'minutes'].includes(c.id)), seed % 5)[0];
  if (habit) out.push(habit);
  for (const c of rot(pool, (seed >>> 3) % pool.length)) {
    if (out.length >= 3) break;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

export interface ChallengeStatus {
  c: Challenge;
  value: number;
  done: boolean;
  claimed: boolean;
}

export function challengeStatus(s: State, t = Date.now()): ChallengeStatus[] {
  const start = weekStart(t);
  const week = s.sessions.filter((x) => x.t >= start);
  const claimed = s.challenges[weekKey(t)] ?? [];
  return weeklyChallenges(s, t).map((c) => {
    const value = Math.min(c.target, c.progress(week, s, start));
    return { c, value, done: value >= c.target, claimed: claimed.includes(c.id) };
  });
}

export const daysLeftInWeek = (t = Date.now()) => Math.max(0, Math.ceil((weekStart(t) + 7 * DAY - t) / DAY));

export function weekXp(s: State, t = Date.now()): number {
  const start = weekStart(t);
  return Object.entries(s.xpByDay).filter(([k]) => new Date(`${k}T12:00:00`).getTime() >= start && new Date(`${k}T12:00:00`).getTime() < start + 7 * DAY).reduce((a, [, v]) => a + v, 0);
}

/** XP for each of the last n weeks, oldest first (this week last). */
export function recentWeeks(s: State, n = 5, t = Date.now()): { week: string; xp: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const at = weekStart(t) - (n - 1 - i) * 7 * DAY + DAY;
    return { week: weekKey(at), xp: weekXp(s, at) };
  });
}

/** Total challenges completed, for badges. */
export const challengesWon = (s: State) => Object.values(s.challenges).reduce((a, v) => a + v.length, 0);

export const BADGES: { at: number; name: string }[] = [
  { at: 1, name: 'First win' }, { at: 5, name: 'On a roll' }, { at: 12, name: 'Committed' }, { at: 25, name: 'Pro speaker' }, { at: 50, name: 'Legend' },
];

/** Awards XP once for each challenge completed this week. */
export function claimCompleted(s: State = getState(), t = Date.now()): string[] {
  const fresh = challengeStatus(s, t).filter((x) => x.done && !x.claimed);
  if (!fresh.length) return [];
  const wk = weekKey(t);
  const bonus = fresh.reduce((a, x) => a + x.c.xp, 0);
  const today = dayKey(t);
  setState((st) => ({
    ...st,
    xp: st.xp + bonus,
    xpByDay: { ...st.xpByDay, [today]: (st.xpByDay[today] ?? 0) + bonus },
    challenges: { ...st.challenges, [wk]: [...(st.challenges[wk] ?? []), ...fresh.map((x) => x.c.id)] },
  }));
  return fresh.map((x) => x.c.title);
}

let started = false;
let onWin: ((titles: string[]) => void) | null = null;
export const onChallengeWon = (fn: (titles: string[]) => void) => (onWin = fn);

/** Checks for completed challenges after each new round. */
export function startChallenges() {
  if (started) return;
  started = true;
  let lastLen = getState().sessions.length;
  const check = () => {
    const won = claimCompleted();
    if (won.length) onWin?.(won);
  };
  check();
  onChange((s) => {
    if (s.sessions.length === lastLen) return;
    lastLen = s.sessions.length;
    queueMicrotask(check);
  });
}
