import { describe, expect, it } from 'vitest';
import { CHECK, FEATURES, PROFILES, STARTING, TARGETS, checkFor, featureById, guessStarting, hintFor, profileByKey, soundMap, tipFor } from './accents';
import { tokenize } from '../engine/text';
import { assessmentHeader, azureUrl, contour, contourSimilarity, encodeWav, mergeScores, parseAzure, recognizedWords, scoreProbesAzure, scoreProbesFree } from '../engine/assess';
import { migrate } from '../store/store';
import { FRAME_SEC, type Frame } from '../engine/voice';

describe('accent content', () => {
  it('has a tip for every target each sound is taught for', () => {
    FEATURES.forEach((f) => f.targets.forEach((t) => expect(tipFor(f, t), `${f.id}/${t}`).not.toBe('')));
  });
  it('gives every sound enough practice material', () => {
    FEATURES.forEach((f) => {
      expect(f.words.length, f.id).toBeGreaterThanOrEqual(4);
      expect(f.sentences.length, f.id).toBeGreaterThanOrEqual(2);
    });
  });
  it('only references real sounds from profiles and signatures', () => {
    const ids = new Set(FEATURES.map((f) => f.id));
    PROFILES.forEach((p) => p.features.forEach((x) => expect(ids.has(x.id), `${p.key}:${x.id}`).toBe(true)));
    TARGETS.forEach((t) => t.signatures.forEach((id) => expect(featureById(id).targets).toContain(t.id)));
  });
  it('maps every starting point to a profile', () => {
    STARTING.forEach((s) => expect(profileByKey(s.profile)).toBeTruthy());
    expect(new Set(STARTING.map((s) => s.id)).size).toBe(STARTING.length);
  });
  it('builds an Indian-English → American map with TH and V/W first', () => {
    const map = soundMap('en-in', 'us');
    expect(map.slice(0, 2).map((e) => e.feature.id)).toEqual(['th', 'vw']);
    expect(map.some((e) => e.feature.id === 'caraising')).toBe(false);
    expect(new Set(map.map((e) => e.feature.id)).size).toBe(map.length);
  });
  it('puts target signatures first for native speakers of another accent', () => {
    const map = soundMap('en-us', 'gb');
    expect(map[0].source).toBe('signature');
    expect(map.slice(0, 6).map((e) => e.feature.id)).toEqual(expect.arrayContaining(['r', 'bath', 'yod']));
  });
  it('includes Canadian raising only for Canadian', () => {
    expect(soundMap('l1-hindi', 'ca').some((e) => e.feature.id === 'caraising')).toBe(true);
    expect(checkFor('ca').length).toBe(checkFor('us').length + 1);
  });
  it('uses target-specific hints', () => {
    const water = featureById('midt').words[0];
    expect(hintFor(water.hint, 'us')).toBe('WAH-der');
    expect(hintFor(water.hint, 'gb')).toBe('WAW-tuh');
  });
  it('has every probe word inside its check sentence', () => {
    CHECK.forEach((c) => {
      const words = new Set(tokenize(c.text));
      Object.entries(c.probes).forEach(([f, ws]) => ws!.forEach((w) => expect(words.has(tokenize(w).join('')), `${f}: ${w} in "${c.text}"`).toBe(true)));
    });
  });
  it('guesses a starting point from the first language', () => {
    expect(guessStarting('Kannada')).toBe('l1-kannada');
    expect(guessStarting('spanish')).toBe('l1-spanish');
    expect(guessStarting('')).toBe('en-in');
    expect(guessStarting('Klingon')).toBe('l1-another-language');
  });
});

describe('free accent scoring', () => {
  it('scores each sound by recognized probe words', () => {
    const c = CHECK[0];
    const s = scoreProbesFree(c.probes, c.text, 'I tink this is the turd time the water heater broke at work');
    expect(s.th).toBe(50); // think, third missed; this, the heard
    expect(s.midt).toBe(100);
  });
  it('aligns in order', () => {
    expect([...recognizedWords('very well we will', 'berry well we will')].sort()).toEqual(['we', 'well', 'will']);
  });
  it('merges scores by average', () => {
    expect(mergeScores([{ th: 50 }, { th: 100, vw: 80 }])).toEqual({ th: 75, vw: 80 });
  });
});

const REST = {
  RecognitionStatus: 'Success',
  NBest: [{
    Display: 'I think so.', AccuracyScore: 82, FluencyScore: 90, CompletenessScore: 100, PronScore: 86, ProsodyScore: 77,
    Words: [
      { Word: 'i', AccuracyScore: 100, ErrorType: 'None', Phonemes: [{ Phoneme: 'aɪ', AccuracyScore: 100 }] },
      { Word: 'think', AccuracyScore: 45, ErrorType: 'Mispronunciation', Phonemes: [{ Phoneme: 'θ', AccuracyScore: 12 }, { Phoneme: 'ɪ', AccuracyScore: 90 }, { Phoneme: 'ŋ', AccuracyScore: 80 }, { Phoneme: 'k', AccuracyScore: 95 }] },
      { Word: 'so', AccuracyScore: 70, ErrorType: 'None', Phonemes: [{ Phoneme: 's', AccuracyScore: 99 }, { Phoneme: 'oʊ', AccuracyScore: 41 }] },
    ],
  }],
};

describe('Azure scoring', () => {
  it('parses the flat REST shape', () => {
    const r = parseAzure(REST);
    expect(r.pron).toBe(86);
    expect(r.prosody).toBe(77);
    expect(r.words[1].phonemes[0]).toEqual({ phoneme: 'θ', accuracy: 12 });
  });
  it('parses the nested SDK shape', () => {
    const nested = { RecognitionStatus: 'Success', NBest: [{ PronunciationAssessment: { AccuracyScore: 70, FluencyScore: 60, CompletenessScore: 100, PronScore: 72 }, Words: [{ Word: 'the', PronunciationAssessment: { AccuracyScore: 50, ErrorType: 'Mispronunciation' }, Phonemes: [{ Phoneme: 'ð', PronunciationAssessment: { AccuracyScore: 30 } }] }] }] };
    const r = parseAzure(nested);
    expect(r.pron).toBe(72);
    expect(r.prosody).toBeNull();
    expect(r.words[0]).toEqual({ word: 'the', accuracy: 50, error: 'Mispronunciation', phonemes: [{ phoneme: 'ð', accuracy: 30 }] });
  });
  it('rejects silence with a useful message', () => {
    expect(() => parseAzure({ RecognitionStatus: 'NoMatch' })).toThrow(/No speech/);
  });
  it('scores sounds from phonemes, or from words when phonemes are unnamed', () => {
    const r = parseAzure(REST);
    expect(scoreProbesAzure({ th: ['think'], goat: ['so'] }, r)).toEqual({ th: 12, goat: 41 });
    const unnamed = { ...r, words: r.words.map((w) => ({ ...w, phonemes: w.phonemes.map((p) => ({ ...p, phoneme: '' })) })) };
    expect(scoreProbesAzure({ th: ['think'] }, unnamed)).toEqual({ th: 45 });
  });
  it('builds the request', () => {
    const h = JSON.parse(atob(assessmentHeader('Good morning.', 'en-US')));
    expect(h).toMatchObject({ ReferenceText: 'Good morning.', GradingSystem: 'HundredMark', Granularity: 'Phoneme', PhonemeAlphabet: 'IPA' });
    expect(JSON.parse(atob(assessmentHeader('Hi', 'en-GB'))).PhonemeAlphabet).toBeUndefined();
    expect(azureUrl('eastus', 'en-GB')).toBe('https://eastus.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-GB&format=detailed');
    expect(azureUrl('my-speech.cognitiveservices.azure.com', 'en-US')).toMatch(/^https:\/\/my-speech\.cognitiveservices\.azure\.com\/stt\//);
  });
  it('encodes a valid 16 kHz WAV', () => {
    const wav = new DataView(encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 16000));
    const str = (o: number) => String.fromCharCode(...[0, 1, 2, 3].map((i) => wav.getUint8(o + i)));
    expect(str(0)).toBe('RIFF');
    expect(str(8)).toBe('WAVE');
    expect(wav.getUint32(24, true)).toBe(16000);
    expect(wav.getUint16(34, true)).toBe(16);
    expect(wav.getUint32(40, true)).toBe(8);
    expect(wav.getInt16(44 + 2 * 3, true)).toBe(32767);
  });
});

describe('shadowing melody', () => {
  const frames = (fn: (t: number) => number | null, sec = 2): Frame[] =>
    Array.from({ length: Math.round(sec / FRAME_SEC) }, (_, i) => {
      const t = i * FRAME_SEC;
      const st = fn(t);
      return { t, db: -25, f0: st === null ? null : 100 * 2 ** (st / 12) };
    });
  it('matches the same melody and rejects the opposite', () => {
    const rise = contour(frames((t) => t * 4));
    const rise2 = contour(frames((t) => t * 3 + 2));
    const fall = contour(frames((t) => 8 - t * 4));
    expect(contourSimilarity(rise, rise2)!).toBeGreaterThan(90);
    expect(contourSimilarity(rise, fall)!).toBeLessThan(10);
  });
});

describe('migration', () => {
  it('turns the old pronunciation switch into an American accent goal', () => {
    expect(migrate({ profile: { pronunciation: true } } as never).profile.accentGoal).toBe('us');
    expect(migrate({ profile: { pronunciation: false } } as never).profile.accentGoal).toBe('none');
    expect(migrate({ profile: { accentGoal: 'gb' } } as never).profile.accentGoal).toBe('gb');
    expect(migrate({}).sounds).toEqual({});
  });
});
