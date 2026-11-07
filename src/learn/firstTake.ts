// First take before setup and sign-up (tinyhustlers/hq#398): a new user answers one stand-up question within
// two taps of Welcome and sees feedback on their own voice before any personal questions or an account.
// Pure functions only, so the step order, the result card and the Today item are unit-tested.
import type { Scenario } from '../content/scenarios';
import { analyzeDirectness } from '../engine/direct';
import { pointFirst } from '../engine/pointfirst';
import { analyzeText } from '../engine/text';
import type { DrillId } from '../content/catalog';
import type { State } from '../store/store';

export type OnboardingStep = 'welcome' | 'try' | 'result' | 'personalise' | 'account';

/** Welcome → first take → its result → (optional) personalise → (only with accounts on) save it. */
export function onboardingSteps(accounts: boolean): OnboardingStep[] {
  return ['welcome', 'try', 'result', 'personalise', ...(accounts ? (['account'] as OnboardingStep[]) : [])];
}

/** The one question of the first take. Saved as the baseline round. */
export const FIRST_TAKE: Scenario = {
  id: 'firsttake',
  category: 'update',
  context: 'Stand-up',
  prompt: 'Where are we on the project?',
  frame: ['Where it stands', 'What is at risk', 'What you need'],
  secs: 30,
};

/** Sensible defaults when "Personalise" is skipped: meetings goal, 10 minutes a day. */
export const FIRST_RUN_DEFAULTS = { goal: 'meetings', minutes: 10 } as const;

export interface FirstResult {
  words: number;
  /** Words before your point, or null if no point was found. */
  wordsToPoint: number | null;
  fillers: number;
  hedges: number;
  apologies: number;
  /** Your answer rewritten point-first (the same engine as Say it first). */
  rewrite: string;
  /** True if the rewrite differs from what you said. */
  changed: boolean;
}

/** Everything on the result card, from the transcript alone. Nothing leaves the phone. */
export function firstResult(transcript: string): FirstResult {
  const d = analyzeDirectness(transcript);
  const txt = analyzeText(transcript);
  const cat = (c: string) => txt.weakByRule.filter((e) => e.rule.category === c).reduce((a, e) => a + e.count, 0);
  const pf = pointFirst(transcript);
  const rewrite = pf.text.trim() || transcript.trim();
  return {
    words: d.words,
    wordsToPoint: d.wordsToPoint,
    fillers: txt.fillerCount,
    hedges: cat('hedge'),
    apologies: cat('apology'),
    rewrite,
    changed: rewrite.replace(/\s+/g, ' ') !== transcript.trim().replace(/\s+/g, ' '),
  };
}

/**
 * The first item of Today's plan after onboarding: say the first take again, point-first. It stays until a
 * redo of that question is saved after the first take.
 */
export function firstTakePlanItem(s: Pick<State, 'sessions'>): { drill: DrillId; reason: string; param: string } | null {
  const first = s.sessions.find((x) => x.drill === 'baseline' && x.itemId === FIRST_TAKE.id);
  if (!first) return null;
  const redone = s.sessions.some((x) => x.drill === 'simulator' && x.itemId === FIRST_TAKE.id && x.t > first.t);
  return redone ? null : { drill: 'simulator', reason: 'Say it again, point-first', param: FIRST_TAKE.id };
}
