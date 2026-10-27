import { describe, expect, it } from 'vitest';
import { analyzeDirectness, coachLine } from './direct';
import { COACHES } from '../content/coaches';

describe('analyzeDirectness', () => {
  it('scores a bottom-line-first answer as direct', () => {
    const d = analyzeDirectness('We need two more weeks. The vendor is late and testing found three bugs. I will confirm the new date Friday.');
    expect(d.wordsToPoint).toBe(0);
    expect(d.fix).toBeNull();
    expect(d.score).toBeGreaterThanOrEqual(90);
  });

  it('counts the words before a buried point', () => {
    const ramble = 'so a lot happened this week the vendor called us on Monday and then we looked at a few options with the team and talked about the timeline and in the end we need two more weeks';
    const d = analyzeDirectness(ramble);
    expect(d.wordsToPoint).toBeGreaterThan(30);
    expect(d.opener).toBe('so');
    expect(d.headline).toMatch(/after \d+ words/);
    expect(d.score).toBeLessThan(60);
  });

  it('works without punctuation and flags a missing point', () => {
    const d = analyzeDirectness('the project has been going and there were some challenges with the vendor and the team has been working hard on it');
    expect(d.wordsToPoint).toBeNull();
    expect(d.fix).toMatch(/first sentence/);
  });

  it('lists hedges', () => {
    const d = analyzeDirectness('I recommend launching Monday but I think maybe we kind of need one more test');
    expect(d.wordsToPoint).toBe(0);
    expect(d.hedges).toEqual(expect.arrayContaining(['I think', 'maybe', 'kind of / sort of']));
    expect(d.fix).toMatch(/hedge/);
  });

  it('handles an empty take', () => {
    const d = analyzeDirectness('');
    expect(d.words).toBe(0);
    expect(coachLine(d, COACHES[0])).toMatch(/didn't catch/);
  });

  it('phrases praise and nudges in the coach voice', () => {
    const good = analyzeDirectness('Yes, we are on budget. I will send the numbers after this meeting.');
    expect(COACHES[1].praise.some((p) => coachLine(good, COACHES[1]).startsWith(p))).toBe(true);
    const bad = analyzeDirectness('um so basically there is a lot going on and it is complicated');
    expect(COACHES[2].nudge.some((p) => coachLine(bad, COACHES[2]).startsWith(p))).toBe(true);
  });
});
