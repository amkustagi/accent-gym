import { afterEach, describe, expect, it, vi } from 'vitest';

function fakeStream() {
  const track = { readyState: 'live', muted: false, stop: vi.fn(() => (track.readyState = 'ended')) };
  return { getAudioTracks: () => [track], getTracks: () => [track], track };
}

describe('microphone reuse', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('asks the browser once for back-to-back takes, and again only after release', async () => {
    const gum = vi.fn(async () => fakeStream());
    vi.stubGlobal('navigator', { userAgent: 'Chrome', platform: 'Linux', maxTouchPoints: 0, mediaDevices: { getUserMedia: gum } });
    const { openMic, closeMic, releaseMic } = await import('./speech');
    const a = await openMic();
    closeMic(a);
    const b = await openMic();
    expect(b).toBe(a);
    expect(gum).toHaveBeenCalledTimes(1);
    releaseMic();
    expect((a as unknown as ReturnType<typeof fakeStream>).track.stop).toHaveBeenCalled();
    await openMic();
    expect(gum).toHaveBeenCalledTimes(2);
    releaseMic();
  });
  it('reopens if the system cut the microphone', async () => {
    const gum = vi.fn(async () => fakeStream());
    vi.stubGlobal('navigator', { userAgent: 'Chrome', platform: 'Linux', maxTouchPoints: 0, mediaDevices: { getUserMedia: gum } });
    const { openMic, closeMic, releaseMic } = await import('./speech');
    const a = (await openMic()) as unknown as ReturnType<typeof fakeStream>;
    closeMic(a as unknown as MediaStream);
    a.track.muted = true;
    await openMic();
    expect(gum).toHaveBeenCalledTimes(2);
    releaseMic();
  });
});
