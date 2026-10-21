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

  it('does not flag "you know what"', () => {
    expect(analyzeText('You know what the plan is').fillerCount).toBe(0);
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
