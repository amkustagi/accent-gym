import { getState, scoredToday } from '../store/store';
import { FREE_DAILY_ROUNDS, isPro } from './backend';
import { open } from './nav';

/** True if the user may start another scored speaking round; otherwise opens the upgrade sheet. */
export function canStartRound(): boolean {
  const s = getState();
  if (isPro(s) || scoredToday(s) < FREE_DAILY_ROUNDS) return true;
  open({ kind: 'paywall', reason: `You've used today's ${FREE_DAILY_ROUNDS} free speaking rounds.` });
  return false;
}

/** True if a Pro-only feature may be used; otherwise opens the upgrade sheet. */
export function requirePro(reason: string): boolean {
  if (isPro(getState())) return true;
  open({ kind: 'paywall', reason });
  return false;
}

export const roundsLeft = () => {
  const s = getState();
  return isPro(s) ? Infinity : Math.max(0, FREE_DAILY_ROUNDS - scoredToday(s));
};
