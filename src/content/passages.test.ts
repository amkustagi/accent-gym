import { describe, expect, it } from 'vitest';
import { PASSAGES } from './drills';
import { PASSAGE_KINDS, generatePassage, nextPassage, passageVariety } from './passages';
import { ROLES } from './roles';

describe('read-aloud passages', () => {
  it('fills every slot for every role and kind', () => {
    for (const role of ROLES)
      for (const k of PASSAGE_KINDS)
        for (let seed = 1; seed < 40; seed++) {
          const p = generatePassage(k.id, seed, role.id);
          expect(p.text).not.toMatch(/[{}]|undefined/);
          expect(p.text.split(' / ').length).toBeGreaterThanOrEqual(3);
          expect(p.title).toBe(k.title);
        }
  });
  it('is deterministic per id', () => {
    expect(generatePassage('update', 42, 'engineer')).toEqual(generatePassage('update', 42, 'engineer'));
  });
  it('has far more variety than the fixed list', () => {
    expect(passageVariety()).toBeGreaterThan(1000);
  });
  it('never repeats the passage just shown and skips recently read ones', () => {
    const now = Date.now();
    const seen = Object.fromEntries(PASSAGES.map((p) => [p.id, now]));
    for (let i = 0; i < 50; i++) {
      const p = nextPassage({ roleId: 'pm', seen, exclude: 'pa2', now });
      expect(p.id.startsWith('gp:')).toBe(true);
    }
  });
  it('respects the chosen topic', () => {
    for (let i = 0; i < 30; i++) expect(nextPassage({ roleId: 'general', seen: {}, kind: 'pushback' }).title).toBe('Pushing back');
  });
});
