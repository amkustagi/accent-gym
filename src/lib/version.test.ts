import { describe, expect, it } from 'vitest';
import { normalizeVersion, sameVersion } from './version';

describe('version', () => {
  it('reads old two-part versions as semver', () => {
    expect(normalizeVersion('0.16')).toBe('0.16.0');
    expect(normalizeVersion('0.04')).toBe('0.4.0');
    expect(normalizeVersion('0.16.1')).toBe('0.16.1');
    expect(normalizeVersion('v0.17.0')).toBe('0.17.0');
  });
  it('does not re-show What\'s new after the format change', () => {
    expect(sameVersion('0.16', '0.16.0')).toBe(true);
    expect(sameVersion('0.16.0', '0.16.1')).toBe(false);
    expect(sameVersion('', '0.16.0')).toBe(false);
  });
});
