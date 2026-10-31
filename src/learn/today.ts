/** What Today shows under the plan: exactly one suggestion, picked by priority. */
export type Suggestion = 'weekly' | 'checkin' | 'review' | 'course';

/** Swap cards due before review becomes the suggestion (a few due is normal; the plan covers it). */
export const REVIEW_THRESHOLD = 5;

export function todaySuggestion(o: { weeklyDue: boolean; checkinDue: boolean; reviewDue: number }): Suggestion {
  if (o.weeklyDue) return 'weekly';
  if (o.checkinDue) return 'checkin';
  if (o.reviewDue >= REVIEW_THRESHOLD) return 'review';
  return 'course';
}

/** Which one-time setup steps are still open. The card disappears when both are done or dismissed. */
export function setupSteps(o: { naturalEngine: boolean; voiceReady: boolean; voiceDismissed: boolean; installed: boolean; installDismissed: boolean }) {
  return {
    voice: o.naturalEngine && !o.voiceReady && !o.voiceDismissed,
    install: !o.installed && !o.installDismissed,
  };
}
