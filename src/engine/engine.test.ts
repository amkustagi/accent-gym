import { describe, expect, it } from 'vitest';
import { analyzeText, heardWord, matchTarget, segments } from './text';
import { detectPitch, FRAME_SEC, rmsDb, summarize, type Frame } from './voice';
import { evaluate, overallOf, scorePace, scoreVariety, weakestSkill } from './score';

describe('analyzeText', () => {
  it('finds apologies, hedges and regional phrases', () => {
    const r = analyzeText('Sorry, I just think maybe we can kindly do the needful. Please revert back.');
    const ids = r.weakByRule.map((x) => x.rule.id);
    expect(ids).toEqual(expect.arrayContaining(['sorry', 'think', 'maybe', 'kindly', 'needful', 'revert']));
    expect(ids).not.toContain('please'); // a single "please" is allowed
  });

  it('counts repeated please beyond the first', () => {
    const r = analyzeText('Please send it. Please check. Please confirm.');
    expect(r.weakByRule.find((x) => x.rule.id === 'please')?.count).toBe(2);
  });

  it('prefers the longer overlapping match', () => {
    const segs = segments("I'm so sorry about that");
    expect(segs.find((s) => s.kind)?.text).toBe("I'm so sorry");
  });

  it('finds fillers without flagging "I like it"', () => {
    const r = analyzeText('Um, so basically it was like, you know, broken. I like it.');
    expect(r.fillerByRule.map((x) => x.rule.id).sort()).toEqual(['basically', 'like', 'um', 'youknow']);
    expect(r.fillerCount).toBe(4);
  });

  it('does not flag "you know what" or "let you know"', () => {
    expect(analyzeText('You know what the plan is').fillerCount).toBe(0);
    expect(analyzeText("I'll let you know by Friday. Do you know the date?").fillerCount).toBe(0);
    expect(analyzeText('It was, you know, slow.').fillerCount).toBe(1);
  });

  it('counts words and sentences', () => {
    const r = analyzeText('We ship Friday. The risk is the vendor.');
    expect(r.words).toBe(8);
    expect(r.sentences).toBe(2);
  });
});

describe('matchTarget', () => {
  it('scores word overlap in order', () => {
    const m = matchTarget('Red leather, yellow leather', 'red feather yellow leather');
    expect(m.accuracy).toBe(75);
    expect(m.words.map((w) => w.hit)).toEqual([true, false, true, true]);
  });
  it('handles punctuation and case', () => {
    expect(matchTarget("Let's get started.", 'lets get started').accuracy).toBe(67);
    expect(matchTarget("Let's get started.", "let's get started").accuracy).toBe(100);
  });
  it('matches single words among alternatives', () => {
    expect(heardWord('vest', ['best', 'vest'])).toBe(true);
    expect(heardWord('vest', ['west'])).toBe(false);
  });
});

const sine = (hz: number, rate = 48000, n = 2048, amp = 0.3) => {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = amp * Math.sin((2 * Math.PI * hz * i) / rate) + 0.15 * amp * Math.sin((4 * Math.PI * hz * i) / rate);
  return b;
};

describe('detectPitch', () => {
  it.each([95, 130, 180, 240, 310])('finds %d Hz within 2%%', (hz) => {
    const f = detectPitch(sine(hz), 48000)!;
    expect(Math.abs(f - hz) / hz).toBeLessThan(0.02);
  });
  it('rejects noise', () => {
    let seed = 7;
    const noise = new Float32Array(2048).map(() => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.4);
    expect(detectPitch(noise, 48000)).toBeNull();
  });
  it('computes loudness', () => {
    expect(rmsDb(sine(200, 48000, 2048, 1))).toBeGreaterThan(-4);
    expect(rmsDb(new Float32Array(2048))).toBe(-100);
  });
});

/** Builds frames: speech blocks (with a pitch contour) separated by silences. */
function fakeFrames(pattern: [kind: 'speech' | 'silence', sec: number][], pitch: (t: number) => number = () => 140): Frame[] {
  const frames: Frame[] = [];
  let t = 0;
  for (const [kind, sec] of pattern) {
    const n = Math.round(sec / FRAME_SEC);
    for (let i = 0; i < n; i++) {
      frames.push(kind === 'speech' ? { t, db: -25 + (i % 3), f0: pitch(t) } : { t, db: -62 + (i % 2), f0: null });
      t += FRAME_SEC;
    }
  }
  return frames;
}

describe('summarize', () => {
  it('detects pauses and long hesitations', () => {
    const s = summarize(fakeFrames([['silence', 1], ['speech', 3], ['silence', 0.6], ['speech', 3], ['silence', 3], ['speech', 2], ['silence', 1]]));
    expect(s.hadSpeech).toBe(true);
    expect(s.goodPauses).toBe(1);
    expect(s.longPauses).toBe(1);
    expect(s.speakingSec).toBeCloseTo(11.6, 0);
  });
  it('measures pitch range in semitones', () => {
    const flat = summarize(fakeFrames([['silence', 0.5], ['speech', 6]], () => 140));
    const lively = summarize(fakeFrames([['silence', 0.5], ['speech', 6]], (t) => 140 * 2 ** ((4 * Math.sin(t * 2)) / 12)));
    expect(flat.pitchRangeSt).toBeLessThan(0.5);
    expect(lively.pitchRangeSt!).toBeGreaterThan(6);
  });
  it('flags rising phrase endings', () => {
    const rise = (t: number) => {
      const local = t % 2.5;
      return local > 1.6 ? 140 * 2 ** (4 / 12) : 140;
    };
    const s = summarize(fakeFrames([['silence', 0.5], ['speech', 2], ['silence', 0.5], ['speech', 2], ['silence', 0.5], ['speech', 2]], rise));
    expect(s.uptalkRatio).toBeGreaterThan(0.5);
  });
  it('reports no speech in silence', () => {
    expect(summarize(fakeFrames([['silence', 3]])).hadSpeech).toBe(false);
  });
});

describe('scoring', () => {
  it('rewards pace in the target band', () => {
    expect(scorePace(145)).toBe(100);
    expect(scorePace(100)).toBeLessThan(60);
    expect(scorePace(200)).toBeLessThan(40);
  });
  it('maps pitch range to variety', () => {
    expect(scoreVariety(2)).toBeLessThan(55);
    expect(scoreVariety(6)).toBe(100);
  });
  it('scores a confident answer above a hesitant one', () => {
    const good = evaluate({ transcript: 'The integration is ninety percent done. We finish testing Thursday and launch Monday. The one risk is the vendor API, and I need a decision on the backup plan by Wednesday.', durationSec: 14 });
    const bad = evaluate({ transcript: 'Um so sorry, I just think maybe we could kind of launch, like, Monday? Hopefully. I will try. Does that make sense? Sorry.', durationSec: 14 });
    expect(good.overall).toBeGreaterThan(85);
    expect(bad.overall).toBeLessThan(55);
    expect(bad.tips.some((t) => t.skill === 'language')).toBe(true);
  });
  it('ignores skills it could not measure', () => {
    expect(overallOf({ pace: 80 })).toBe(80);
    expect(weakestSkill({ fillers: 90, pace: 40, language: 70 }, false)).toBe('pace');
  });
});

describe('summarize edge cases', () => {
  it('handles a take with no leading silence', () => {
    const s = summarize(fakeFrames([['speech', 5], ['silence', 0.8], ['speech', 4]]));
    expect(s.hadSpeech).toBe(true);
    expect(s.goodPauses).toBe(1);
  });
});

describe('apologies and the "is it?" tag (hq#91, hq#92)', () => {
  it('counts every form of apologize as an apology (hq#91)', () => {
    for (const t of ['Apologizing for the delay, the report is late.', 'I apologized to the client.', 'I apologise for that.', 'He apologizes a lot.', 'My apologies, the deck is late.'])
      expect(analyzeText(t).weakByRule.find((e) => e.rule.id === 'apologize')?.count, t).toBe(1);
  });
  it('does not flag ordinary questions ending in "is it?" (hq#92)', () => {
    for (const t of ['What time is it?', 'Where is it? I need the file.', 'How big is it?'])
      expect(analyzeText(t).weakByRule.some((e) => e.rule.id === 'isit'), t).toBe(false);
  });
  it('still flags the stand-alone "is it?" tag (hq#92)', () => {
    for (const t of ['You are coming tomorrow, is it?', 'Is it? I did not know.', 'Okay. Is it?'])
      expect(analyzeText(t).weakByRule.some((e) => e.rule.id === 'isit'), t).toBe(true);
  });
});

describe('apologies and over-politeness only count when they are (hq#396, hq#397)', () => {
  const count = (t: string, id: string) => analyzeText(t).weakByRule.find((e) => e.rule.id === id)?.count ?? 0;
  it('does not count "not sorry" or sympathy as an apology (hq#396)', () => {
    for (const t of ["We're not sorry about the price, it's fair.", "I'm sorry to hear that, Meera.", 'I am so sorry for your loss.', "We're never sorry for shipping early."])
      expect(count(t, 'sorry'), t).toBe(0);
  });
  it('still counts real apologies (hq#396)', () => {
    expect(count('Sorry for the delay.', 'sorry')).toBe(1);
    expect(count("Sorry, sorry, I'm so sorry.", 'sorry')).toBe(3);
    expect(count("Sorry, I'm late. Sorry to bother you.", 'sorry')).toBe(2);
  });
  it('does not flag "no issues" or "no problem" stated as a fact (hq#397)', () => {
    for (const t of ['Testing found no issues and we ship Friday.', "There's no problem with the build.", 'We had no issues with the vendor.'])
      expect(count(t, 'noproblem'), t).toBe(0);
  });
  it('still flags "no problem" given as a reply (hq#397)', () => {
    for (const t of ["No problem, I'll send it.", 'No worries!', "Sure. No issues, Meera.", "That's no problem at all.", 'Oh, no problem.'])
      expect(count(t, 'noproblem'), t).toBe(1);
  });
  it('flags spoken replies with no punctuation, and after a dash or quote (hq#465)', () => {
    for (const t of ["yeah no problem I'll send it over", 'okay no problem', 'yes no worries I can do that', 'ok no worries', 'alright no problem', 'yep no problem', 'Sorry—no problem', '"No problem," he said', '(no worries)'])
      expect(count(t, 'noproblem'), t).toBe(1);
  });
  it('still ignores facts after the hq#465 change', () => {
    for (const t of ['we found no problems and we ship friday', 'there are no issues in the logs', "There's no problem with the build.", 'the vendor had no issues'])
      expect(count(t, 'noproblem'), t).toBe(0);
  });
});

describe('comparison "like" is not a filler (hq#574)', () => {
  it.each([
    'We should ship it just like last quarter.',
    "I'd just like to add one point.",
    'The new flow is like the old one.',
    "It's like the old dashboard but faster.",
  ])('%s', (s) => {
    expect(analyzeText(s).fillerByRule.find((x) => x.rule.id === 'like')).toBeUndefined();
  });

  it('still counts filler "like"', () => {
    expect(analyzeText('It was like, you know, broken.').fillerByRule.find((x) => x.rule.id === 'like')?.count).toBe(1);
    expect(analyzeText('so like we need more time').fillerByRule.find((x) => x.rule.id === 'like')?.count).toBe(1);
    // "just" is a minimizer again once "just like to" is not a filler
    expect(analyzeText("I'd just like to add one point.").weakByRule.map((x) => x.rule.id)).toContain('just');
  });
});

describe('"revert" counts only when it means reply (hq#575)', () => {
  it.each([
    'We reverted the deploy last night and the site is fine.',
    "Let's revert it before the demo.",
    'Revert to the old version if the test fails.',
    'We can revert back to the previous design.',
    'I am reverting our changes now.',
  ])('undo: %s', (s) => {
    expect(analyzeText(s).weakByRule.map((x) => x.rule.id)).not.toContain('revert');
  });

  it.each([
    'Please revert back.',
    'Kindly revert at the earliest.',
    'Revert to me by Friday.',
    'I will revert once I hear from the vendor.',
    'Revert back ASAP please.',
    'Can you revert back to us today?',
  ])('reply: %s', (s) => {
    expect(analyzeText(s).weakByRule.map((x) => x.rule.id)).toContain('revert');
  });
});

describe('"kind of" as a type is not a hedge (hq#661)', () => {
  const hedges = (s: string) => analyzeText(s).weakByRule.filter((e) => e.rule.id === 'kindof').reduce((a, e) => a + e.count, 0);
  it('leaves "kind of" / "sort of" alone when it means type of', () => {
    expect(hedges('What kind of data do you need?')).toBe(0);
    expect(hedges('This is a new kind of report for the board.')).toBe(0);
    expect(hedges('We see this sort of delay every sprint.')).toBe(0);
    expect(hedges('Which kind of test failed? The same kind of bug as last week.')).toBe(0);
    expect(hedges('Any kind of feedback helps, and a different sort of plan too.')).toBe(0);
  });
  it('still flags the softener', () => {
    expect(hedges('It was kind of slow.')).toBe(1);
    expect(hedges('I kind of think this approach is better.')).toBe(1);
    expect(hedges("So yeah, that's kind of it.")).toBe(1);
    expect(hedges('The numbers sort of moved, and we kind of need one more test.')).toBe(2);
    expect(hedges('Kind of. We are sort of ready.')).toBe(2);
  });
});
