import { describe, expect, it } from 'vitest';
import { playWatched, watchUtterance, type PlayEnd, type PlayableEl, type UtteranceLike } from './player';

class FakeEl implements PlayableEl {
  currentTime = 0;
  paused = true;
  listeners = new Map<string, Set<() => void>>();
  constructor(private result: 'resolve' | 'reject' | 'hang' = 'hang') {}
  play() {
    if (this.result === 'resolve') return Promise.resolve();
    if (this.result === 'reject') return Promise.reject(new Error('NotAllowedError'));
    return new Promise<void>(() => undefined);
  }
  pause() {
    this.paused = true;
  }
  addEventListener(t: string, f: () => void) {
    if (!this.listeners.has(t)) this.listeners.set(t, new Set());
    this.listeners.get(t)!.add(f);
  }
  removeEventListener(t: string, f: () => void) {
    this.listeners.get(t)?.delete(f);
  }
  fire(t: string) {
    [...(this.listeners.get(t) ?? [])].forEach((f) => f());
  }
}

/** Manual timers so tests control time. */
function clock() {
  const timers: { fn: () => void; at: number; id: number }[] = [];
  let now = 0;
  let id = 0;
  return {
    setTimer: (fn: () => void, ms: number) => {
      timers.push({ fn, at: now + ms, id: ++id });
      return id;
    },
    clearTimer: (t: unknown) => {
      const i = timers.findIndex((x) => x.id === t);
      if (i >= 0) timers.splice(i, 1);
    },
    advance(ms: number) {
      now += ms;
      timers.filter((t) => t.at <= now).forEach((t) => {
        timers.splice(timers.indexOf(t), 1);
        t.fn();
      });
    },
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('playWatched (#20: the coach talks but nothing is heard)', () => {
  it('only reports "started" when the browser is really playing', async () => {
    const el = new FakeEl('hang');
    const c = clock();
    const log: string[] = [];
    playWatched(el, { ...c, onStart: () => log.push('start'), onDone: (h) => log.push(h) });
    await tick();
    expect(log).toEqual([]);
    el.fire('playing');
    el.fire('ended');
    expect(log).toEqual(['start', 'ended']);
  });

  it('gives up as blocked when sound never starts (no animation stuck on talking)', async () => {
    const el = new FakeEl('hang');
    const c = clock();
    const log: string[] = [];
    playWatched(el, { ...c, startTimeoutMs: 3000, onStart: () => log.push('start'), onDone: (h) => log.push(h) });
    c.advance(2999);
    expect(log).toEqual([]);
    c.advance(1);
    expect(log).toEqual(['blocked']);
    el.fire('playing');
    expect(log).toEqual(['blocked']);
  });

  it('a refused play() (no tap allowed it) is blocked, not started', async () => {
    const el = new FakeEl('reject');
    const log: PlayEnd[] = [];
    let started = false;
    playWatched(el, { ...clock(), onStart: () => (started = true), onDone: (h) => log.push(h) });
    await tick();
    expect(started).toBe(false);
    expect(log).toEqual(['blocked']);
  });

  it('a resolved play() counts as started; stop ends it once', async () => {
    const el = new FakeEl('resolve');
    const log: string[] = [];
    const stop = playWatched(el, { ...clock(), onStart: () => log.push('start'), onDone: (h) => log.push(h) });
    await tick();
    stop();
    stop();
    el.fire('ended');
    expect(log).toEqual(['start', 'stopped']);
    expect(el.listeners.get('ended')?.size ?? 0).toBe(0);
  });
});

describe('watchUtterance (system voice)', () => {
  const utt = (): UtteranceLike => ({ onstart: null, onend: null, onerror: null });

  it('speech that never starts is cancelled and reported as blocked', () => {
    const u = utt();
    const c = clock();
    let cancelled = 0;
    const log: string[] = [];
    watchUtterance(u, { ...c, cancel: () => cancelled++, onStart: () => log.push('start'), onDone: (h) => log.push(h) });
    c.advance(3000);
    expect(log).toEqual(['blocked']);
    expect(cancelled).toBe(1);
  });

  it('normal speech starts then ends', () => {
    const u = utt();
    const log: string[] = [];
    watchUtterance(u, { ...clock(), cancel: () => undefined, onStart: () => log.push('start'), onDone: (h) => log.push(h) });
    u.onstart?.();
    u.onend?.();
    expect(log).toEqual(['start', 'ended']);
  });

  it('an interrupted utterance is stopped, not blocked', () => {
    const u = utt();
    const log: string[] = [];
    watchUtterance(u, { ...clock(), cancel: () => undefined, onDone: (h) => log.push(h) });
    u.onerror?.({ error: 'interrupted' });
    expect(log).toEqual(['stopped']);
  });
});
