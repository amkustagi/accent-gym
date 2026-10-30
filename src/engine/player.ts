// Playback that only reports "speaking" once sound is really coming out.
// iPhone can refuse to start audio that wasn't started by a tap, or leave it hanging after the
// mic closes. Before, the coach's mouth moved while nothing played (#20). Now a clip counts as
// started only when the browser says it is playing, and gives up (as "blocked") if it never does.

export type PlayEnd = 'ended' | 'blocked' | 'stopped';

/** The parts of an HTMLAudioElement this needs (lets tests use a fake). */
export interface PlayableEl {
  play(): Promise<void> | void;
  pause(): void;
  currentTime: number;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
}

export interface WatchOptions {
  onStart?: () => void;
  onDone?: (how: PlayEnd) => void;
  /** Give up if no sound has started after this long. */
  startTimeoutMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}

export const START_TIMEOUT_MS = 3000;

/** Plays `el` and watches it. Returns a stop function. onDone is called exactly once. */
export function playWatched(el: PlayableEl, o: WatchOptions = {}): () => void {
  const setTimer = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = o.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  let started = false;
  let finished = false;
  let timer: unknown;

  const onPlaying = () => {
    if (started || finished) return;
    started = true;
    clearTimer(timer);
    o.onStart?.();
  };
  const onTime = () => {
    if (el.currentTime > 0) onPlaying();
  };
  const onEnded = () => finish('ended');
  const onError = () => finish(started ? 'ended' : 'blocked');
  const events: [string, () => void][] = [['playing', onPlaying], ['timeupdate', onTime], ['ended', onEnded], ['error', onError]];

  function finish(how: PlayEnd) {
    if (finished) return;
    finished = true;
    clearTimer(timer);
    events.forEach(([t, f]) => el.removeEventListener(t, f));
    if (how !== 'ended') {
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    }
    o.onDone?.(how);
  }

  events.forEach(([t, f]) => el.addEventListener(t, f));
  timer = setTimer(() => {
    if (!started) finish('blocked');
  }, o.startTimeoutMs ?? START_TIMEOUT_MS);
  try {
    const p = el.play();
    if (p && typeof (p as Promise<void>).then === 'function') (p as Promise<void>).then(onPlaying, () => finish('blocked'));
  } catch {
    finish('blocked');
  }
  return () => finish('stopped');
}

/** Same idea for the phone's built-in voice: speech that never starts is reported as blocked. */
export interface UtteranceLike {
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e?: { error?: string }) => void) | null;
}

export function watchUtterance(
  u: UtteranceLike,
  o: WatchOptions & { cancel: () => void },
): () => void {
  const setTimer = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = o.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  let started = false;
  let finished = false;
  const finish = (how: PlayEnd) => {
    if (finished) return;
    finished = true;
    clearTimer(timer);
    if (how !== 'ended') o.cancel();
    o.onDone?.(how);
  };
  u.onstart = () => {
    if (started || finished) return;
    started = true;
    clearTimer(timer);
    o.onStart?.();
  };
  u.onend = () => finish(started ? 'ended' : 'blocked');
  u.onerror = (e) => finish(e?.error === 'interrupted' || e?.error === 'canceled' ? 'stopped' : started ? 'ended' : 'blocked');
  const timer = setTimer(() => {
    if (!started) finish('blocked');
  }, o.startTimeoutMs ?? START_TIMEOUT_MS);
  return () => finish('stopped');
}

/** A tiny silent WAV, played inside the first tap so iPhone lets this element play later. */
export const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
