import { describe, expect, it } from 'vitest';
import { migrate, type SessionRecord, type State } from '../store/store';
import { challengeStatus, recentWeeks, weekKey, weekXp, weeklyChallenges } from './challenges';

const WED = new Date(2026, 9, 21, 12).getTime(); // Wednesday
const base = (o: Partial<State> = {}): State => ({ ...migrate({ profile: { onboarded: true, createdAt: 1 } } as never), ...o });
const rec = (t: number, o: Partial<SessionRecord> = {}): SessionRecord => ({ id: String(t), t, drill: 'simulator', title: 'x', overall: 70, scores: { pauses: 80 }, metrics: { words: 60, durationSec: 40, wpm: 145, fillers: 0, fillersPerMin: 0, weak: 0, pauses: 3, longPauses: 0, avgPauseSec: 0.8, pitchRangeSt: 6, uptalkRatio: 0, trailOffDb: 0, clarity: null }, transcript: '', durationSec: 40, hasAudio: false, ...o });

describe('weekly challenges', () => {
  it('weeks start on Monday', () => {
    expect(weekKey(WED)).toBe('2026-10-19');
    expect(weekKey(new Date(2026, 9, 19, 0, 30).getTime())).toBe('2026-10-19');
    expect(weekKey(new Date(2026, 9, 18, 23).getTime())).toBe('2026-10-12');
  });
  it('picks three different challenges, stable within a week, and leans on the focus skill', () => {
    const s = base({ learner: { ...base().learner, focus: { skill: 'pauses', since: 0, start: 40 } } });
    const a = weeklyChallenges(s, WED).map((c) => c.id);
    expect(new Set(a).size).toBe(3);
    expect(a).toContain('pauses');
    expect(weeklyChallenges(s, WED + 864e5).map((c) => c.id)).toEqual(a);
  });
  it('never offers the accent challenge without an accent goal', () => {
    for (let w = 0; w < 30; w++) expect(weeklyChallenges(base(), WED + w * 7 * 864e5).some((c) => c.id === 'accent')).toBe(false);
  });
  it("counts only this week's rounds", () => {
    const s = base({ learner: { ...base().learner, focus: { skill: 'pauses', since: 0, start: 40 } }, sessions: [rec(WED - 8 * 864e5), rec(WED - 864e5), rec(WED)] });
    const p = challengeStatus(s, WED).find((x) => x.c.id === 'pauses')!;
    expect(p.value).toBe(2);
    expect(p.done).toBe(false);
  });
  it('totals XP by week', () => {
    const s = base({ xpByDay: { '2026-10-19': 30, '2026-10-21': 20, '2026-10-12': 99 } });
    expect(weekXp(s, WED)).toBe(50);
    const weeks = recentWeeks(s, 2, WED);
    expect(weeks).toEqual([{ week: '2026-10-12', xp: 99 }, { week: '2026-10-19', xp: 50 }]);
  });
});
