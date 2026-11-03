// Acceptance tests for Meeting mode (tinyhustlers/hq#105). Sample family: Arjun is You, Meera and Anya are others.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  YOU, defaultNames, featuresOf, meetingDebrief, meetingText, parseTranscript, renameSpeaker, setAsYou, setTurnSpeaker, tagChunks,
  type Chunk, type Meeting, type VoiceFeatures,
} from './meeting';
import type { Frame } from './voice';

const ARJUN: VoiceFeatures = { medianSt: 2.0, spreadSt: 2.4, voiced: 200 };
const MEERA: VoiceFeatures = { medianSt: 11.5, spreadSt: 3.2, voiced: 200 };
const ANYA: VoiceFeatures = { medianSt: 16.8, spreadSt: 4.0, voiced: 200 };
const jitter = (f: VoiceFeatures, d: number): VoiceFeatures => ({ ...f, medianSt: f.medianSt + d, spreadSt: f.spreadSt + d / 2 });
const chunk = (text: string, f: VoiceFeatures | null, start: number, end: number): Chunk => ({ text, features: f, start, end });

const meeting = (): Meeting => {
  const turns = [
    { speaker: 'p1', text: 'Arjun, where are we on the launch?', start: 0, end: 3 },
    { speaker: YOU, text: 'Sorry, so um I just wanted to give some context. The vendor was late and testing found bugs, and I think we need two more weeks. Sorry about that.', start: 3, end: 15 },
    { speaker: 'p2', text: 'Um, okay so like, sorry, what does that mean for the demo? I think maybe Thursday?', start: 15, end: 20 },
    { speaker: YOU, text: 'We should move the demo to Thursday.', start: 20, end: 23 },
  ];
  return { turns, names: defaultNames(turns), durationSec: 23, source: 'live' };
};

describe('speaker matcher (hq#105)', () => {
  it('tags the enrolled voice as You and others as Person 1, Person 2 in order', () => {
    const chunks = [
      chunk('Where are we on the launch?', jitter(MEERA, 0.4), 0, 3),
      chunk('We need two more weeks.', jitter(ARJUN, -0.5), 3, 6),
      chunk('The vendor was late.', jitter(ARJUN, 0.8), 6, 8),
      chunk('What about the demo?', jitter(ANYA, -0.3), 8, 10),
      chunk('Thursday works for me.', jitter(MEERA, -0.6), 10, 12),
    ];
    const turns = tagChunks(chunks, { ...ARJUN });
    expect(turns.map((t) => t.speaker)).toEqual(['p1', YOU, 'p2', 'p1']);
    expect(turns[1].text).toBe('We need two more weeks. The vendor was late.');
  });
  it('gives a chunk with too little voice to the previous speaker', () => {
    const turns = tagChunks([chunk('We need two more weeks.', ARJUN, 0, 2), chunk('Okay.', null, 2, 3), chunk('Fine by me.', MEERA, 3, 4)], ARJUN);
    expect(turns.map((t) => [t.speaker, t.text])).toEqual([[YOU, 'We need two more weeks. Okay.'], ['p1', 'Fine by me.']]);
  });
  it('builds features from pitch frames only, and needs enough voiced frames', () => {
    const frames: Frame[] = Array.from({ length: 20 }, (_, i) => ({ t: i * 0.05, db: -30, f0: i % 2 ? 120 : null }));
    expect(featuresOf(frames, -Infinity, Infinity, 6)?.voiced).toBe(10);
    expect(featuresOf(frames, -Infinity, Infinity, 40)).toBeNull();
  });
});

describe('labels (hq#105)', () => {
  it('renaming Person 1 updates every one of their turns', () => {
    const m = renameSpeaker(meeting(), 'p1', 'Meera');
    expect(meetingText(m).split('\n').filter((l) => l.startsWith('Meera: '))).toHaveLength(1);
    expect(m.turns.filter((t) => t.speaker === 'p1').every((t) => m.names[t.speaker] === 'Meera')).toBe(true);
  });
  it('"This is me" swaps You for the whole meeting', () => {
    const m = setAsYou(meeting(), 'p2');
    expect(m.turns.map((t) => t.speaker)).toEqual(['p1', 'p3', YOU, 'p3']);
    expect(m.names[YOU]).toBe('You');
    expect(m.names.p3).toBe('Person 3');
  });
  it('fixing one turn changes only that turn', () => {
    const m = setTurnSpeaker(meeting(), 3, 'p1');
    expect(m.turns.map((t) => t.speaker)).toEqual(['p1', YOU, 'p2', 'p1']);
  });
});

describe('debrief (hq#105)', () => {
  it('counts only your turns', () => {
    const d = meetingDebrief(meeting());
    expect(d.yourTurns).toBe(2);
    // Two "sorry"s are yours; Person 2's "sorry", "um", "okay so", "like", "I think", "maybe" are not counted.
    expect(d.apologies).toBe(2);
    expect(d.fillers).toBe(1);
    expect(d.hedges).toBe(1);
    const all = meeting().turns.reduce((a, t) => a + t.text.split(' ').length, 0);
    const mine = meeting().turns.filter((t) => t.speaker === YOU).reduce((a, t) => a + t.text.split(' ').length, 0);
    expect(d.talkShare).toBe(Math.round((mine / all) * 100));
    expect(d.longestWords).toBeGreaterThan(20);
  });
  it('picks your weakest moment and rewrites it point-first', () => {
    const d = meetingDebrief(meeting());
    expect(d.weakest).toHaveLength(1);
    expect(d.weakest[0].index).toBe(1);
    const r = d.weakest[0].rewrite.toLowerCase();
    expect(r).toContain('we need two more weeks');
    expect(r).not.toMatch(/sorry|\bjust\b|i think|\bum\b/);
  });
  it('asks you to pick yourself when no turn is yours', () => {
    const m = meeting();
    const d = meetingDebrief({ ...m, turns: m.turns.filter((t) => t.speaker !== YOU) });
    expect(d.yourTurns).toBe(0);
    expect(d.headline).toMatch(/This is me/);
  });
});

describe('transcript paste fallback (hq#105)', () => {
  it('reads "Name: text" lines and finds you by first name', () => {
    const m = parseTranscript('Meera Rao: Where are we on the launch?\nArjun Rao: We need two more weeks.\nAnya Rao: OK.\nArjun Rao: I will send the plan today.', 'Arjun');
    expect(m.turns.map((t) => t.speaker)).toEqual(['p1', YOU, 'p2', YOU]);
    expect(m.names).toEqual({ p1: 'Meera Rao', [YOU]: 'You', p2: 'Anya Rao' });
  });
  it('reads WebVTT voice tags and Teams-style name/time headers', () => {
    const vtt = parseTranscript('WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\n<v Meera Rao>Where are we?</v>\n\n2\n00:00:03.000 --> 00:00:05.000\n<v Arjun Rao>On track.</v>', 'Arjun Rao');
    expect(vtt.turns.map((t) => [t.speaker, t.text])).toEqual([['p1', 'Where are we?'], [YOU, 'On track.']]);
    const teams = parseTranscript('Meera Rao   0:03\nWhere are we?\nArjun Rao   0:07\nOn track. Demo is Thursday.', 'Arjun');
    expect(teams.turns.map((t) => [t.speaker, t.text])).toEqual([['p1', 'Where are we?'], [YOU, 'On track. Demo is Thursday.']]);
  });
});

describe('paste: your full name wins over a shared first name (Fix tinyhustlers/hq#159)', () => {
  it('tags Arjun Rao as you even when another Arjun speaks first', () => {
    const m = parseTranscript('Arjun Mehta: Morning all.\nArjun Rao: We need two more weeks.\nMeera Rao: OK.', 'Arjun Rao');
    expect(m.turns.map((t) => [t.speaker, t.text])).toEqual([['p1', 'Morning all.'], [YOU, 'We need two more weeks.'], ['p2', 'OK.']]);
    expect(m.names).toEqual({ p1: 'Arjun Mehta', [YOU]: 'You', p2: 'Meera Rao' });
  });
  it('still matches by first name when nobody has your full name', () => {
    const m = parseTranscript('Meera Rao: Where are we?\nArjun: On track.', 'Arjun Rao');
    expect(m.turns.map((t) => t.speaker)).toEqual(['p1', YOU]);
  });
});

describe('debrief: longest turn in minutes and seconds (Fix tinyhustlers/hq#160)', () => {
  it('a 91-second turn reads 1 min 31 s, not 2 minutes', () => {
    const text = 'We need two more weeks. The vendor is late and testing found three bugs. I will confirm the new date on Friday.';
    const m: Meeting = { turns: [{ speaker: 'p1', text: 'Where are we?', start: 0, end: 2 }, { speaker: YOU, text, start: 2, end: 93 }], names: { p1: 'Meera', [YOU]: 'You' }, durationSec: 93, source: 'live' };
    const d = meetingDebrief(m);
    expect(d.longestSec).toBe(91);
    expect(d.headline).toBe('Your longest turn ran 1 min 31 s. Make the point, then stop.');
  });
  it('whole minutes read without seconds', () => {
    const text = 'We need two more weeks. The vendor is late and testing found three bugs. I will confirm the new date on Friday.';
    const m: Meeting = { turns: [{ speaker: YOU, text, start: 0, end: 120 }], names: { [YOU]: 'You' }, durationSec: 120, source: 'live' };
    expect(meetingDebrief(m).headline).toBe('Your longest turn ran 2 min. Make the point, then stop.');
  });
});

describe('silent while recording (hq#105)', () => {
  afterEach(async () => (await import('../lib/quiet')).setMeetingQuiet(false));
  it('suppresses the coach voice, playback and toasts', async () => {
    const synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] };
    vi.stubGlobal('speechSynthesis', synth);
    const createUrl = vi.fn(() => 'blob:x');
    URL.createObjectURL = createUrl;
    const { setMeetingQuiet } = await import('../lib/quiet');
    const tts = await import('./tts');
    setMeetingQuiet(true);
    const ended = vi.fn();
    await tts.speak('Nice work. Point first.', { onEnd: ended });
    tts.playBlob(new Blob(['x']), { onEnd: ended });
    expect(ended).toHaveBeenCalledTimes(2);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
    const ui = await import('../ui/ui');
    expect(ui.toast('Saved')).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
