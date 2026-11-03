// Acceptance tests for "one goal for your next meeting" (tinyhustlers/hq#142). Sample family: Arjun is You.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { YOU, defaultNames, meetingDebrief, type Meeting } from '../engine/meeting';
import { meetingRecord } from '../screens/drills/Meeting';
import { migrate, type SessionRecord, type State } from '../store/store';
import { todayPlan } from './adapt';
import { goalChoices, goalMet, goalPending, goalPlanItem, goalTrend, goalsMetThisWeek, suggestGoals } from './meetingGoal';

const meeting = (mine: string[]): Meeting => {
  const turns = mine.flatMap((text, i) => [
    { speaker: 'p1', text: 'Arjun, where are we on the launch?', start: i * 20, end: i * 20 + 3 },
    { speaker: YOU, text, start: i * 20 + 3, end: i * 20 + 15 },
  ]);
  return { turns, names: defaultNames(turns), durationSec: mine.length * 20, source: 'paste' };
};

// Arjun gets to the point fast but apologises three times.
const SORRY = meeting([
  'We ship on Friday. Sorry, the vendor was late with the build.',
  'The budget is approved. Sorry for the delay on the numbers, Meera.',
  'Sorry, the demo moves to Thursday and the deck is ready.',
]);

const session = (t: number, extra: Record<string, number | string>, drill: SessionRecord['drill'] = 'meeting'): SessionRecord =>
  ({ id: `s${t}`, t, drill, title: 'Real meeting', overall: 70, scores: {}, metrics: {} as never, transcript: '', durationSec: 60, tips: [], hasAudio: false, extra }) as SessionRecord;

const withGoal = (s: State, goal: State['learner']['meetingGoal'], sessions: SessionRecord[] = []): State => ({ ...s, sessions, learner: { ...s.learner, meetingGoal: goal } });

describe('suggesting a goal from the worst number (hq#142)', () => {
  it("suggests sorry ≤ 1 from Arjun's 3 apologies", () => {
    const d = meetingDebrief(SORRY);
    expect(d.apologies).toBe(3);
    expect(suggestGoals(d)[0]).toBe('sorry');
  });
  it('puts the point first when the point comes late, like the headline', () => {
    const late = meeting(['So um I just wanted to give some background on where things are with the vendor and the testing and all of that, and basically we need two more weeks.']);
    expect(suggestGoals(meetingDebrief(late))[0]).toBe('point');
  });
  it('suggests nothing when every number is on target, but every goal can still be picked', () => {
    const d = meetingDebrief(meeting(['We ship on Friday.', 'The budget is approved.']));
    expect(suggestGoals(d)).toEqual([]);
    expect(goalChoices(d)).toHaveLength(5);
  });
  it('lists the suggested goal first among the choices', () => {
    const d = meetingDebrief(SORRY);
    expect(goalChoices(d)[0]).toBe('sorry');
    expect(new Set(goalChoices(d)).size).toBe(5);
  });
});

describe('practice that targets the goal (hq#142)', () => {
  const base = migrate({ profile: { minutes: 10, onboarded: true } } as never);
  it('puts the matching drill first in the plan until the next real meeting is saved', () => {
    const s = withGoal(base, { id: 'sorry', setAt: 1000, from: 3 });
    const plan = todayPlan(s);
    expect(plan[0]).toMatchObject({ drill: 'swaps', param: 'habit:sorry' });
    expect(plan[0].reason).toBe('Meeting goal: sorry ≤ 1 · last meeting 3');
    expect(plan.filter((i) => i.drill === 'swaps')).toHaveLength(1);
    const after = withGoal(base, { id: 'sorry', setAt: 1000, from: 3 }, [session(2000, { apologies: 1 })]);
    expect(goalPending(after)).toBe(false);
    expect(goalPlanItem(after)).toBeNull();
    expect(todayPlan(after)[0].reason.startsWith('Meeting goal')).toBe(false);
  });
  it('uses Say it short for the point and Pause power for fillers', () => {
    expect(goalPlanItem(withGoal(base, { id: 'point', setAt: 1, from: 22 }))).toMatchObject({ drill: 'concision', reason: 'Meeting goal: point ≤ 10 words · last meeting 22' });
    expect(goalPlanItem(withGoal(base, { id: 'fillers', setAt: 1, from: null }))).toMatchObject({ drill: 'pauses', reason: 'Meeting goal: fillers ≤ 3' });
  });
  it('a meeting saved before the goal was set does not end it', () => {
    expect(goalPending(withGoal(base, { id: 'hedges', setAt: 5000, from: 4 }, [session(4000, { hedges: 4 })]))).toBe(true);
  });
  it('no goal, no goal item (the plan is unchanged)', () => {
    expect(goalPlanItem(base)).toBeNull();
    expect(todayPlan(base)).toEqual(todayPlan(withGoal(base, null)));
  });
});

describe('scorecard (hq#142)', () => {
  it('computes "goal met" against the target', () => {
    expect(goalMet('sorry', 1)).toBe(true);
    expect(goalMet('sorry', 2)).toBe(false);
    expect(goalMet('point', 10)).toBe(true);
    expect(goalMet('talk', 41)).toBe(false);
    expect(goalMet('point', null)).toBeNull();
  });
  it('lists the last 5 real meetings in order, oldest first, skipping other drills and older meetings without the number', () => {
    const sessions = [
      session(7, { apologies: 1 }), session(1, { talkShare: 50 }), session(2, { apologies: 4 }), session(3, { apologies: 9 }, 'simulator'),
      session(4, { apologies: 3 }), session(5, { apologies: 2 }), session(6, { apologies: 2 }), session(8, { apologies: 0 }),
    ];
    expect(goalTrend(sessions, 'sorry')).toEqual([3, 2, 2, 1, 0]);
    expect(goalTrend(sessions, 'sorry', 10)).toEqual([4, 3, 2, 2, 1, 0]);
    expect(goalTrend(sessions, 'point')).toEqual([]);
  });
  it('saves the counts and the goal result with the meeting (numbers only, no words)', () => {
    const d = meetingDebrief(SORRY);
    const rec = meetingRecord(SORRY, d, 'sorry');
    expect(rec.extra).toMatchObject({ apologies: 3, hedges: 0, goal: 'sorry', goalMet: 0 });
    expect(Object.values(rec.extra!).every((v) => typeof v === 'number' || v === 'sorry')).toBe(true);
    expect(meetingRecord(SORRY, d).extra).not.toHaveProperty('goal');
  });
  it('counts goals met this week for the weekly review', () => {
    const now = 30 * 864e5;
    const sessions = [session(now - 864e5, { goal: 'sorry', goalMet: 1 }), session(now - 2 * 864e5, { goal: 'sorry', goalMet: 0 }), session(now - 9 * 864e5, { goal: 'sorry', goalMet: 1 }), session(now - 864e5, { apologies: 1 })];
    expect(goalsMetThisWeek(sessions, now)).toEqual({ met: 1, tried: 2 });
  });
});

describe('Meeting mode stays silent (hq#142)', () => {
  it('the recording screen never shows or says the goal; it appears only on the Start screen', () => {
    const src = readFileSync(new URL('../screens/drills/Meeting.tsx', import.meta.url), 'utf8');
    const recording = src.slice(src.indexOf('function Recording('), src.indexOf('function Enrol('));
    expect(recording.length).toBeGreaterThan(100);
    expect(recording).not.toMatch(/goal/i);
    expect(recording).not.toMatch(/speak\(|toast|play\(/);
    const home = src.slice(src.indexOf("{phase === 'home' && ("), src.indexOf("{phase === 'enrol' &&"));
    expect(home).toMatch(/Goal for this meeting/);
  });
});
