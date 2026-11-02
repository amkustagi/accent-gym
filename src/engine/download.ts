// Progress for the one-time natural-voice download (tinyhustlers/hq#44). Pure functions, no DOM.

/** Kokoro-82M q8 model plus tokenizer and config: about 92 MB in total. */
export const NATURAL_VOICE_BYTES = 92_000_000;

export interface Progress {
  loaded: number;
  total: number;
}

/**
 * Combines the per-file numbers from the model loader into one steady bar.
 * Files are reported one after another, so the raw total grows as each new file starts and the
 * percentage used to jump backwards. The total never drops below the known model size, and
 * the bar never moves backwards during one download.
 */
export function nextProgress(prev: Progress | null, loaded: number, total: number, expected = NATURAL_VOICE_BYTES): Progress {
  const t = Math.max(total, expected, prev?.total ?? 0);
  const l = Math.min(t, Math.max(loaded, prev?.loaded ?? 0));
  return { loaded: l, total: t };
}

/** Share done, 0 to 0.99 (it reads 100% only once the voice is ready). */
export const fraction = (p: Progress) => (p.total > 0 ? Math.min(0.99, p.loaded / p.total) : 0);

const mb = (b: number) => Math.round(b / 1e6);

/** "42% · 38 of 92 MB" */
export function progressLabel(p: Progress): string {
  return `${Math.round(fraction(p) * 100)}% · ${mb(p.loaded)} of ${mb(p.total)} MB`;
}
