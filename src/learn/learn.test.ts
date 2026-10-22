import { describe, expect, it } from 'vitest';
import { GEN_CATEGORIES, generateScenario } from '../content/generator';
import { ROLES } from '../content/roles';
import { SWAPS, TWISTERS, PASSAGES, SOUNDS, swapKey } from '../content/drills';
import { SCENARIOS, CATEGORIES } from '../content/scenarios';
import { WEAK_RULES, FILLER_RULES, analyzeText } from '../engine/text';
import { voiceScore } from '../engine/tts';
import { recorderMimeTypes } from '../engine/speech';
import { migrate } from '../store/store';
import { mergeStates } from '../lib/backend';

describe('scenario generator', () => {
  it('is deterministic for a seed', () => {
    expect(generateScenario({ role: 'engineer', seed: 42 })).toEqual(generateScenario({ role: 'engineer', seed: 42 }));
  });
  it('fills every slot for every role and category', () => {
    for (const r of ROLES)
      for (const c of GEN_CATEGORIES)
        for (let seed = 1; seed <= 12; seed++) {
          const s = generateScenario({ role: r.id, category: c, seed });
          expect(`${s.context} ${s.prompt}`).not.toMatch(/[{}]/);
          expect(s.frame.length).toBeGreaterThan(1);
          expect(s.secs).toBeGreaterThanOrEqual(20);
        }
  });
  it('produces many distinct prompts', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 600; seed++) seen.add(generateScenario({ role: 'pm', seed }).prompt);
    expect(seen.size).toBeGreaterThan(250);
  });
  it('makes higher levels harder', () => {
    const easy = generateScenario({ role: 'sales', category: 'update', seed: 7, level: 1 });
    const hard = generateScenario({ role: 'sales', category: 'update', seed: 7, level: 5 });
    expect(hard.secs).toBeLessThan(easy.secs);
    expect(hard.context).toMatch(/Constraint/);
  });
});

describe('content library', () => {
  it('has unique ids and keys', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    expect(new Set(SWAPS.map(swapKey)).size).toBe(SWAPS.length);
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(PASSAGES.length);
    expect(new Set(SOUNDS.map((p) => p.id)).size).toBe(SOUNDS.length);
  });
  it('covers every category', () => {
    CATEGORIES.forEach((c) => expect(SCENARIOS.some((s) => s.category === c.id)).toBe(true));
  });
  it('has the expanded sizes', () => {
    expect(SWAPS.length).toBeGreaterThanOrEqual(90);
    expect(TWISTERS.length).toBeGreaterThanOrEqual(45);
    expect(SOUNDS.length).toBeGreaterThanOrEqual(12);
  });
  it('links swap cards to real rules, and strong versions contain no weak language', () => {
    const ids = new Set([...WEAK_RULES, ...FILLER_RULES].map((r) => r.id));
    SWAPS.forEach((c) => {
      if (c.rule) expect(ids.has(c.rule)).toBe(true);
      expect(c.wrong.includes(c.strong)).toBe(false);
      const r = analyzeText(c.strong);
      expect(r.fillerCount, c.strong).toBe(0);
      expect(r.weakByRule.filter((w) => w.rule.id !== 'please').length, c.strong).toBe(0);
    });
  });
});

describe('voice ranking', () => {
  it('never picks novelty voices and prefers premium ones', () => {
    expect(voiceScore({ name: 'Albert', lang: 'en-US' })).toBeLessThan(0);
    expect(voiceScore({ name: 'Zarvox', lang: 'en-US' })).toBeLessThan(0);
    expect(voiceScore({ name: 'Ava (Premium)', lang: 'en-US' })).toBeGreaterThan(voiceScore({ name: 'Samantha', lang: 'en-US' }));
    expect(voiceScore({ name: 'Google US English', lang: 'en-US' })).toBeGreaterThan(voiceScore({ name: 'Fiona', lang: 'en-GB' }));
    expect(voiceScore({ name: 'Thomas', lang: 'fr-FR' })).toBeLessThan(0);
  });
  it('records MP4 first on Safari', () => {
    expect(recorderMimeTypes(true)[0]).toMatch(/mp4/);
    expect(recorderMimeTypes(false)[0]).toMatch(/webm/);
  });
});

describe('state', () => {
  it('migrates v0.01 data', () => {
    const s = migrate({ profile: { name: 'A', goal: 'meetings' }, settings: { voice: 'Samantha', listening: 'full' }, sessions: [], xp: 50 } as never);
    expect(s.settings.systemVoice).toBe('Samantha');
    expect(s.settings.voiceEngine).toBe('natural');
    expect(s.profile.role).toBe('general');
    expect(s.xp).toBe(50);
    expect(s.srs).toEqual({});
  });
  it('merges local and cloud state without losing history', () => {
    const base = migrate({});
    const local = { ...base, xp: 100, updatedAt: 10, sessions: [{ id: 'a', t: 1 }, { id: 'b', t: 3 }] as never, days: { '2026-10-20': { swaps: 2 } } };
    const remote = { ...base, xp: 80, updatedAt: 20, profile: { ...base.profile, name: 'Cloud' }, sessions: [{ id: 'a', t: 1 }, { id: 'c', t: 2 }] as never, days: { '2026-10-20': { swaps: 1, pace: 1 } } };
    const m = mergeStates(local, remote);
    expect(m.sessions.map((x) => x.id)).toEqual(['a', 'c', 'b']);
    expect(m.xp).toBe(100);
    expect(m.days['2026-10-20']).toEqual({ swaps: 2, pace: 1 });
    expect(m.profile.name).toBe('Cloud');
  });
});
