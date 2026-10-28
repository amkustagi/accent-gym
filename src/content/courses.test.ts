import { describe, expect, it } from 'vitest';
import { ALL_COURSE_LESSONS, COURSES, lessonPassed, runChecks, type Check } from './courses';

const textOnly = (cs: Check[]) => cs.filter((c) => c.t === 'avoid' || c.t === 'include' || c.t === 'question' || c.t === 'words' || c.t === 'lead' || c.t === 'answerFirst');
const take = (t: string) => ({ transcript: t, words: t.split(/\s+/).length, wpm: null, pauses: null, pitchRangeSt: null, fillersPerMin: null });

describe('courses', () => {
  it('cover every area with unique, complete lessons', () => {
    expect(COURSES.length).toBe(7);
    expect(ALL_COURSE_LESSONS.length).toBeGreaterThanOrEqual(36);
    const ids = ALL_COURSE_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of ALL_COURSE_LESSONS) {
      expect(l.how.length).toBeGreaterThanOrEqual(3);
      expect(l.checks.length).toBeGreaterThanOrEqual(2);
      expect(l.practice.frame.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("each lesson's strong example passes its word checks; the weak one fails at least one", () => {
    const bad: string[] = [];
    for (const l of ALL_COURSE_LESSONS) {
      const cs = textOnly(l.checks);
      if (!cs.length) continue;
      const strong = runChecks(cs, take(l.example.strong));
      if (strong.some((r) => r.pass === false)) bad.push(`${l.id} strong: ${strong.filter((r) => !r.pass).map((r) => r.label).join(', ')}`);
      if (cs.some((c) => c.t === 'include') && !/^(Arms|Looking|Keeps)/.test(l.example.weak)) {
        const weak = runChecks(cs, take(l.example.weak));
        if (weak.every((r) => r.pass)) bad.push(`${l.id} weak passes everything`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('passes with one miss only when the rest is strong', () => {
    const r = (p: (boolean | null)[]) => p.map((pass, i) => ({ label: String(i), pass }));
    expect(lessonPassed(r([true, true, true]), 50)).toBe(true);
    expect(lessonPassed(r([true, true, false]), 70)).toBe(true);
    expect(lessonPassed(r([true, true, false]), 55)).toBe(false);
    expect(lessonPassed(r([true, false]), 90)).toBe(false);
    expect(lessonPassed(r([null, null]), 65)).toBe(true);
  });
  it('matches phrases on word boundaries', () => {
    const [noSorry] = runChecks([{ t: 'avoid', words: ['sorry'], label: 'x' }], take('I am not sorrowful at all'));
    expect(noSorry.pass).toBe(true);
    const [q] = runChecks([{ t: 'question', label: 'q' }], take('What brought you here today'));
    expect(q.pass).toBe(true);
  });
});
