import { describe, expect, it } from 'vitest';
import { poseFromMatrix, presenceTips, summarizePresence, type FaceFrame } from './face';

const f = (i: number, o: Partial<FaceFrame> = {}): FaceFrame => ({ t: i * 100, present: true, yaw: 0, pitch: 0, smile: 0, cx: 0.5, cy: 0.42, size: 0.4, light: 140, ...o });

describe('video presence', () => {
  it('reads head pose from the transformation matrix', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(poseFromMatrix(identity)).toEqual({ yaw: 0, pitch: -0 });
    const a = (30 * Math.PI) / 180;
    // Rotation about Y by 30°: column-major, d[8] = sin, d[10] = cos.
    const yaw30 = [Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1];
    expect(Math.round(poseFromMatrix(yaw30).yaw)).toBe(30);
  });
  it('scores a steady, well-lit, centered speaker looking at the lens', () => {
    const s = summarizePresence(Array.from({ length: 50 }, (_, i) => f(i, { smile: i < 10 ? 0.6 : 0.1 })));
    expect(s).toMatchObject({ facePct: 100, eyeContactPct: 100, framing: 'good', lighting: 'good', smilePct: 20 });
    expect(s.stillness).toBeGreaterThan(90);
    expect(presenceTips(s)).toEqual([]);
  });
  it('flags looking away, a dark room, sitting too far and moving around', () => {
    const frames = Array.from({ length: 50 }, (_, i) => f(i, { yaw: i % 2 ? 35 : 5, light: 40, size: 0.15, cx: 0.5 + (i % 2 ? 0.05 : -0.05) }));
    const s = summarizePresence(frames);
    expect(s.eyeContactPct).toBe(50);
    expect(s.lighting).toBe('dark');
    expect(s.framing).toBe('far');
    expect(s.stillness).toBeLessThan(55);
    const tips = presenceTips(s).join(' ');
    expect(tips).toMatch(/lens/);
    expect(tips).toMatch(/light/);
    expect(tips).toMatch(/closer/);
  });
  it('handles no face at all', () => {
    const s = summarizePresence(Array.from({ length: 20 }, (_, i) => f(i, { present: false })));
    expect(s.facePct).toBe(0);
    expect(presenceTips(s)[0]).toMatch(/frame/);
  });
});
