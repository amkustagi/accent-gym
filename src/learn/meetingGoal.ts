// One goal for your next meeting (tinyhustlers/hq#142). After a Meeting mode debrief Speakco suggests one goal
// from the worst number; until the next real meeting, Today's plan practises it first; the next debrief says
// whether it was met and shows that number across the last real meetings. Only counts are used (no transcripts),
// nothing leaves the phone, and nothing is shown or played during a meeting.
import type { DrillId } from '../content/catalog';
import type { MeetingDebrief } from '../engine/meeting';
import type { SessionRecord, State } from '../store/store';

export type MeetingGoalId = 'point' | 'sorry' | 'hedges' | 'fillers' | 'talk';

export interface MeetingGoalDef {
  id: MeetingGoalId;
  /** Shown when choosing a goal ("Say sorry at most once"). */
  label: string;
  /** One-line form for Today and the Start screen ("sorry ≤ 1"). */
  short: string;
  /** Met when the meeting's number is at most this. */
  target: number;
  /** The drill that practises it, and its parameter. */
  drill: DrillId;
  param?: string;
  /** The number from a debrief, or null if this meeting can't tell (no longer turns, for example). */
  value: (d: MeetingDebrief) => number | null;
  /** The same number from a saved Real meeting session (extra fields), null for older sessions without it. */
  saved: (extra: Record<string, number | string>) => number | null;
  /** The debrief number is bad enough to be worth a goal (same order and limits as the debrief headline). */
  bad: (d: MeetingDebrief) => boolean;
}

const num = (x: number | string | undefined) => (typeof x === 'number' && x >= 0 ? x : null);
const fillerRate = (d: MeetingDebrief) => d.fillers / Math.max(1, d.yourWords);

/** In priority order: the first one that is bad is the suggested goal. */
export const MEETING_GOALS: MeetingGoalDef[] = [
  { id: 'point', label: 'Make your point within 10 words', short: 'point ≤ 10 words', target: 10, drill: 'concision', value: (d) => d.wordsToPoint, saved: (e) => num(e.toPoint), bad: (d) => d.wordsToPoint !== null && d.wordsToPoint > 15 },
  { id: 'sorry', label: 'Say sorry at most once', short: 'sorry ≤ 1', target: 1, drill: 'swaps', param: 'habit:sorry', value: (d) => d.apologies, saved: (e) => num(e.apologies), bad: (d) => d.apologies >= 2 },
  { id: 'hedges', label: 'Hedge at most once ("I think", "maybe")', short: 'hedges ≤ 1', target: 1, drill: 'swaps', param: 'habit:think', value: (d) => d.hedges, saved: (e) => num(e.hedges), bad: (d) => d.hedges >= 3 },
  { id: 'fillers', label: 'Three fillers or fewer: pause instead', short: 'fillers ≤ 3', target: 3, drill: 'pauses', value: (d) => d.fillers, saved: (e) => num(e.fillers), bad: (d) => d.yourWords >= 40 && fillerRate(d) > 0.04 },
  { id: 'talk', label: 'Talk under 40% of the meeting', short: 'talk ≤ 40%', target: 40, drill: 'concision', value: (d) => (d.yourTurns ? d.talkShare : null), saved: (e) => num(e.talkShare), bad: (d) => d.talkShare > 60 },
];

export const goalDef = (id: MeetingGoalId): MeetingGoalDef => MEETING_GOALS.find((g) => g.id === id) ?? MEETING_GOALS[0];

export const goalMet = (id: MeetingGoalId, v: number | null): boolean | null => (v === null ? null : v <= goalDef(id).target);

/** Goals worth suggesting after this meeting, worst first (empty when everything is on target). */
export function suggestGoals(d: MeetingDebrief): MeetingGoalId[] {
  if (!d.yourTurns) return [];
  return MEETING_GOALS.filter((g) => g.bad(d)).map((g) => g.id);
}

/** Every goal this meeting could take, the suggested ones first, so the user can pick another. */
export function goalChoices(d: MeetingDebrief): MeetingGoalId[] {
  const top = suggestGoals(d);
  return [...top, ...MEETING_GOALS.map((g) => g.id).filter((id) => !top.includes(id))];
}

const isMeeting = (x: SessionRecord) => x.drill === 'meeting';

/** The goal's number across your last `n` real meetings, oldest first ("sorry 4 → 2 → 1"). */
export function goalTrend(sessions: SessionRecord[], id: MeetingGoalId, n = 5): number[] {
  const g = goalDef(id);
  return [...sessions]
    .filter(isMeeting)
    .sort((a, b) => a.t - b.t)
    .map((x) => g.saved(x.extra ?? {}))
    .filter((v): v is number => v !== null)
    .slice(-n);
}

/** The goal is waiting for its real meeting: none has been saved since it was set. */
export function goalPending(s: Pick<State, 'learner' | 'sessions'>): boolean {
  const goal = s.learner.meetingGoal;
  return !!goal && !s.sessions.some((x) => isMeeting(x) && x.t > goal.setAt);
}

/** First item of Today's plan while the goal waits for the next real meeting. */
export function goalPlanItem(s: Pick<State, 'learner' | 'sessions'>): { drill: DrillId; reason: string; param?: string } | null {
  const goal = s.learner.meetingGoal;
  if (!goal || !goalPending(s)) return null;
  const g = goalDef(goal.id);
  const last = goal.from === null ? '' : ` · last meeting ${goal.from}${g.id === 'talk' ? '%' : ''}`;
  return { drill: g.drill, param: g.param, reason: `Meeting goal: ${g.short}${last}` };
}

/** Real meetings this week that met the goal they were held under, for the weekly review. */
export function goalsMetThisWeek(sessions: SessionRecord[], now = Date.now()): { met: number; tried: number } {
  const week = sessions.filter((x) => isMeeting(x) && now - x.t < 7 * 864e5 && typeof x.extra?.goalMet === 'number');
  return { met: week.filter((x) => x.extra!.goalMet === 1).length, tried: week.length };
}
