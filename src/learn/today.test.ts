import { describe, expect, it } from 'vitest';
import { REVIEW_THRESHOLD, setupSteps, todaySuggestion } from './today';

describe('todaySuggestion', () => {
  const none = { weeklyDue: false, checkinDue: false, reviewDue: 0 };
  it('defaults to the course', () => expect(todaySuggestion(none)).toBe('course'));
  it('weekly review comes first', () => expect(todaySuggestion({ weeklyDue: true, checkinDue: true, reviewDue: 20 })).toBe('weekly'));
  it('then the check-in', () => expect(todaySuggestion({ ...none, checkinDue: true, reviewDue: 20 })).toBe('checkin'));
  it('review only when enough cards are due', () => {
    expect(todaySuggestion({ ...none, reviewDue: REVIEW_THRESHOLD - 1 })).toBe('course');
    expect(todaySuggestion({ ...none, reviewDue: REVIEW_THRESHOLD })).toBe('review');
  });
});

describe('setupSteps', () => {
  const fresh = { naturalEngine: true, voiceReady: false, voiceDismissed: false, installed: false, installDismissed: false };
  it('shows both steps for a new user', () => expect(setupSteps(fresh)).toEqual({ voice: true, install: true }));
  it('drops the voice step once ready, or on the phone voice', () => {
    expect(setupSteps({ ...fresh, voiceReady: true }).voice).toBe(false);
    expect(setupSteps({ ...fresh, naturalEngine: false }).voice).toBe(false);
  });
  it('drops the install step when installed or dismissed', () => {
    expect(setupSteps({ ...fresh, installed: true }).install).toBe(false);
    expect(setupSteps({ ...fresh, installDismissed: true }).install).toBe(false);
  });
});
