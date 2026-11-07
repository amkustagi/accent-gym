// Acceptance tests for the first take before setup and sign-up (tinyhustlers/hq#398). Sample family: Arjun Rao.
import { describe, expect, it } from 'vitest';
import { migrate, type SessionRecord } from '../store/store';
import { todayPlan } from './adapt';
import { FIRST_RUN_DEFAULTS, FIRST_TAKE, firstResult, firstTakePlanItem, onboardingSteps } from './firstTake';

const session = (t: number, drill: SessionRecord['drill'], itemId?: string): SessionRecord =>
  ({ id: `s${t}`, t, drill, itemId, title: FIRST_TAKE.prompt, overall: 60, scores: {}, metrics: {} as never, transcript: '', durationSec: 30, tips: [], hasAudio: false }) as SessionRecord;

describe('onboarding order (hq#398)', () => {
  it('with accounts on: welcome → try → result → personalise → account', () => {
    const s = onboardingSteps(true);
    expect(s).toEqual(['welcome', 'try', 'result', 'personalise', 'account']);
    expect(s.indexOf('try')).toBeLessThan(s.indexOf('account'));
  });
  it('without accounts there is no sign-up step at all', () => {
    expect(onboardingSteps(false)).toEqual(['welcome', 'try', 'result', 'personalise']);
  });
  it('the first take is one stand-up question of 30 seconds', () => {
    expect(FIRST_TAKE.prompt).toBe('Where are we on the project?');
    expect(FIRST_TAKE.secs).toBe(30);
  });
  it('skipping personalise keeps sensible defaults (meetings, 10 minutes)', () => {
    expect(FIRST_RUN_DEFAULTS).toEqual({ goal: 'meetings', minutes: 10 });
    const fresh = migrate({} as never);
    expect(fresh.profile.goal).toBe('meetings');
    expect(fresh.profile.minutes).toBe(10);
  });
});

describe('result card (hq#398)', () => {
  it('counts words before the point, fillers, hedges and apologies, and rewrites point-first', () => {
    const r = firstResult('Sorry, so um I just wanted to give some context. The vendor was late. I think we need two more weeks.');
    expect(r.wordsToPoint).toBeGreaterThan(10);
    expect(r.fillers).toBeGreaterThanOrEqual(1);
    expect(r.apologies).toBe(1);
    expect(r.hedges).toBeGreaterThanOrEqual(1);
    expect(r.changed).toBe(true);
    expect(r.rewrite.toLowerCase()).toContain('two more weeks');
    expect(r.rewrite.toLowerCase().indexOf('two more weeks')).toBeLessThan(r.rewrite.toLowerCase().indexOf('vendor'));
  });
  it('a direct answer stays as it is', () => {
    const r = firstResult('We launch on Friday. Testing is done and Meera signed off the budget.');
    expect(r.apologies).toBe(0);
    expect(r.rewrite).toContain('We launch on Friday');
  });
});

describe('Today after onboarding (hq#398)', () => {
  const base = migrate({ profile: { minutes: 10, onboarded: true } } as never);
  it('the first take is saved as the baseline, and Today opens with its point-first redo', () => {
    const s = { ...base, sessions: [session(1000, 'baseline', FIRST_TAKE.id)] };
    expect(firstTakePlanItem(s)).toEqual({ drill: 'simulator', reason: 'Say it again, point-first', param: FIRST_TAKE.id });
    const plan = todayPlan(s);
    expect(plan[0]).toMatchObject({ drill: 'simulator', param: FIRST_TAKE.id, reason: 'Say it again, point-first' });
    expect(plan.filter((p) => p.drill === 'simulator')).toHaveLength(1);
  });
  it('disappears once the redo is saved, and never shows for older users', () => {
    const done = { ...base, sessions: [session(1000, 'baseline', FIRST_TAKE.id), session(2000, 'simulator', FIRST_TAKE.id)] };
    expect(firstTakePlanItem(done)).toBeNull();
    expect(todayPlan(done)[0].param).not.toBe(FIRST_TAKE.id);
    const old = { ...base, sessions: [session(1000, 'baseline', 'baseline')] };
    expect(firstTakePlanItem(old)).toBeNull();
  });
});
