import { describe, expect, it } from 'vitest';
import { NATURAL_VOICE_BYTES, fraction, nextProgress, progressLabel } from './download';

describe('natural voice download progress (tinyhustlers/hq#44)', () => {
  it('uses the known model size before the big file starts', () => {
    // The small config file finishes first: that is not 100% of the download.
    const p = nextProgress(null, 2_000, 2_000);
    expect(p.total).toBe(NATURAL_VOICE_BYTES);
    expect(fraction(p)).toBeLessThan(0.01);
  });
  it('never moves backwards when a new file is added', () => {
    let p = nextProgress(null, 40_000_000, 50_000_000);
    const before = fraction(p);
    p = nextProgress(p, 40_000_000, 95_000_000); // total grows past the estimate
    expect(p.total).toBe(95_000_000);
    expect(p.loaded).toBe(40_000_000);
    p = nextProgress(p, 30_000_000, 95_000_000); // stale report
    expect(p.loaded).toBe(40_000_000);
    expect(fraction(p)).toBeGreaterThan(0.4);
    expect(before).toBeGreaterThan(0.4);
  });
  it('shows percent and megabytes, and never 100% before ready', () => {
    expect(progressLabel({ loaded: 38_400_000, total: NATURAL_VOICE_BYTES })).toBe('42% · 38 of 92 MB');
    expect(progressLabel({ loaded: NATURAL_VOICE_BYTES, total: NATURAL_VOICE_BYTES })).toBe('99% · 92 of 92 MB');
    expect(progressLabel({ loaded: 0, total: 0 })).toBe('0% · 0 of 0 MB');
  });
  it('never reports more loaded than the total', () => {
    expect(nextProgress(null, 120_000_000, 100_000_000).loaded).toBe(100_000_000);
  });
});
