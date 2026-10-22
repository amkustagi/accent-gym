// Accent scoring. Free tier: does the speech recognizer, set to the target accent, understand
// the words that carry each sound? Pro tier: Microsoft Azure Pronunciation Assessment, which
// scores every word (and, for American English, every sound) against a native speaker.
import type { AccentId, FeatureId } from '../content/accents';
import { featureById } from '../content/accents';
import { tokenize } from './text';
import { detectPitch, rmsDb, FRAME_SEC, type Frame } from './voice';

// ---------- free: recognition-based ----------

/** Words of the reference that the recognizer heard, in order (LCS alignment). */
export function recognizedWords(reference: string, heard: string): Set<string> {
  const a = tokenize(reference);
  const b = tokenize(heard);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const hit = new Set<string>();
  let i = a.length;
  let j = b.length;
  while (i && j) {
    if (a[i - 1] === b[j - 1]) {
      hit.add(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return hit;
}

export type FeatureScores = Partial<Record<FeatureId, number>>;

/** Percent of each sound's probe words that were recognized. */
export function scoreProbesFree(probes: Partial<Record<FeatureId, string[]>>, reference: string, heard: string): FeatureScores {
  const got = recognizedWords(reference, heard);
  const out: FeatureScores = {};
  (Object.keys(probes) as FeatureId[]).forEach((f) => {
    const words = probes[f]!.map((w) => tokenize(w).join(''));
    if (!words.length) return;
    out[f] = Math.round((100 * words.filter((w) => got.has(w)).length) / words.length);
  });
  return out;
}

/** Combines per-item scores into one score per sound (simple average). */
export function mergeScores(list: FeatureScores[]): FeatureScores {
  const sum: Partial<Record<FeatureId, [number, number]>> = {};
  list.forEach((s) =>
    (Object.keys(s) as FeatureId[]).forEach((k) => {
      const e = sum[k] ?? [0, 0];
      e[0] += s[k]!;
      e[1]++;
      sum[k] = e;
    }),
  );
  const out: FeatureScores = {};
  (Object.keys(sum) as FeatureId[]).forEach((k) => (out[k] = Math.round(sum[k]![0] / sum[k]![1])));
  return out;
}

// ---------- audio: decode, resample, WAV ----------

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

async function decode(blob: Blob): Promise<AudioBuffer> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

/** Converts any recorded clip to 16 kHz mono WAV, trimmed to `maxSec`. */
export async function toWav16k(blob: Blob, maxSec = 29): Promise<Blob> {
  const src = await decode(blob);
  const len = Math.min(Math.ceil(src.duration * 16000), Math.ceil(maxSec * 16000));
  const off = new OfflineAudioContext(1, len, 16000);
  const node = off.createBufferSource();
  node.buffer = src;
  node.connect(off.destination);
  node.start();
  const out = await off.startRendering();
  return new Blob([encodeWav(out.getChannelData(0), 16000)], { type: 'audio/wav' });
}

/** Loudness and pitch frames for a clip (used to draw the model voice's pitch for shadowing). */
export async function framesFromBlob(blob: Blob): Promise<Frame[]> {
  const buf = await decode(blob);
  const data = buf.getChannelData(0);
  const hop = Math.round(buf.sampleRate * FRAME_SEC);
  const win = 2048;
  const frames: Frame[] = [];
  for (let i = 0; i + win < data.length; i += hop) {
    const w = data.subarray(i, i + win);
    const db = rmsDb(w);
    frames.push({ t: i / buf.sampleRate, db, f0: db > -55 ? detectPitch(w, buf.sampleRate) : null });
  }
  return frames;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// ---------- pro: Azure pronunciation assessment ----------

export interface AzurePhoneme {
  phoneme: string;
  accuracy: number;
}
export interface AzureWord {
  word: string;
  accuracy: number;
  error: string;
  phonemes: AzurePhoneme[];
}
export interface AzureResult {
  pron: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number | null;
  words: AzureWord[];
  heard: string;
}

const num = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : 0);

/** Reads both the REST (flat) and SDK (nested PronunciationAssessment) response shapes. */
export function parseAzure(json: unknown): AzureResult {
  const j = json as { RecognitionStatus?: string; NBest?: Record<string, unknown>[]; DisplayText?: string };
  if (j?.RecognitionStatus && j.RecognitionStatus !== 'Success') throw new Error(j.RecognitionStatus === 'NoMatch' || j.RecognitionStatus === 'InitialSilenceTimeout' ? 'No speech was heard. Try again a little louder.' : `Scoring failed (${j.RecognitionStatus}).`);
  const best = j?.NBest?.[0];
  if (!best) throw new Error('Scoring returned no result.');
  const pa = (o: Record<string, unknown>) => ((o.PronunciationAssessment as Record<string, unknown>) ?? o);
  const top = pa(best);
  const words = ((best.Words as Record<string, unknown>[]) ?? []).map((w) => {
    const wa = pa(w);
    return {
      word: String(w.Word ?? ''),
      accuracy: num(wa.AccuracyScore),
      error: String(wa.ErrorType ?? 'None'),
      phonemes: ((w.Phonemes as Record<string, unknown>[]) ?? []).map((p) => ({ phoneme: String(p.Phoneme ?? ''), accuracy: num(pa(p).AccuracyScore) })),
    };
  });
  return {
    pron: num(top.PronScore),
    accuracy: num(top.AccuracyScore),
    fluency: num(top.FluencyScore),
    completeness: num(top.CompletenessScore),
    prosody: typeof top.ProsodyScore === 'number' ? top.ProsodyScore : null,
    words,
    heard: String(best.Display ?? j.DisplayText ?? ''),
  };
}

/**
 * Score per sound: for American English, the average score of that sound's phonemes inside
 * its probe words (falling back to all its phonemes anywhere); for other accents, where
 * Microsoft doesn't name phonemes, the average word score of its probe words.
 */
export function scoreProbesAzure(probes: Partial<Record<FeatureId, string[]>>, r: AzureResult): FeatureScores {
  const out: FeatureScores = {};
  const norm = (s: string) => tokenize(s).join('');
  (Object.keys(probes) as FeatureId[]).forEach((f) => {
    const targets = new Set(probes[f]!.map(norm));
    const ws = r.words.filter((w) => targets.has(norm(w.word)) && w.error !== 'Omission');
    const ph = featureById(f).phonemes;
    const named = ws.flatMap((w) => w.phonemes).filter((p) => p.phoneme && ph.includes(p.phoneme));
    let score: number | null = null;
    if (named.length) score = named.reduce((a, p) => a + p.accuracy, 0) / named.length;
    else if (ws.length) score = ws.reduce((a, w) => a + w.accuracy, 0) / ws.length;
    if (score !== null) out[f] = Math.round(score);
  });
  return out;
}

/** The lowest-scoring sound in a word, for "you said the TH in think like a T"-style feedback. */
export function weakestPhoneme(w: AzureWord): AzurePhoneme | null {
  const named = w.phonemes.filter((p) => p.phoneme);
  if (!named.length) return null;
  return named.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
}

export const azureLocale = (t: AccentId) => ({ us: 'en-US', gb: 'en-GB', au: 'en-AU', ca: 'en-CA' })[t];

export function assessmentHeader(reference: string, locale: string): string {
  const cfg: Record<string, string> = { ReferenceText: reference, GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: 'True' };
  if (locale === 'en-US') {
    cfg.PhonemeAlphabet = 'IPA';
    cfg.EnableProsodyAssessment = 'True';
  }
  const bytes = new TextEncoder().encode(JSON.stringify(cfg));
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

/** Azure endpoint for a region ("eastus") or a resource host ("my-speech.cognitiveservices.azure.com"). */
export function azureUrl(regionOrHost: string, locale: string): string {
  const v = regionOrHost.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const base = v.includes('.') ? `https://${v}/stt/speech/recognition/conversation/cognitiveservices/v1` : `https://${v}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
  return `${base}?language=${locale}&format=detailed`;
}

/** Calls Azure directly with the user's own key (owner testing). */
export async function assessDirect(wav: Blob, reference: string, locale: string, key: string, region: string): Promise<AzureResult> {
  let res: Response;
  try {
    res = await fetch(azureUrl(region, locale), {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Pronunciation-Assessment': assessmentHeader(reference, locale), 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json' },
      body: wav,
    });
  } catch {
    throw new Error('Couldn\'t reach Microsoft from this browser. Check the region in Settings, or use the server setup in SETUP.md.');
  }
  if (res.status === 401 || res.status === 403) throw new Error('Microsoft rejected the key or region. Check them in Settings › Accent scoring.');
  if (!res.ok) throw new Error(`Accent scoring failed (${res.status}).`);
  return parseAzure(await res.json());
}

// ---------- shadowing: melody comparison ----------

/** Pitch contour in semitones, resampled to `n` points over the spoken part, centered on its median. */
export function contour(frames: Frame[], n = 48): (number | null)[] {
  const voiced = frames.filter((f) => f.db > -50);
  if (voiced.length < 4) return new Array(n).fill(null);
  const t0 = voiced[0].t;
  const t1 = voiced[voiced.length - 1].t;
  const span = Math.max(t1 - t0, 0.2);
  const buckets: number[][] = Array.from({ length: n }, () => []);
  frames.forEach((f) => {
    if (f.f0 === null || f.t < t0 || f.t > t1) return;
    const k = Math.min(n - 1, Math.floor(((f.t - t0) / span) * n));
    buckets[k].push(12 * Math.log2(f.f0 / 100));
  });
  const vals = buckets.map((b) => (b.length ? b.reduce((a, x) => a + x, 0) / b.length : null));
  const known = vals.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (!known.length) return vals;
  const med = known[Math.floor(known.length / 2)];
  return vals.map((v) => (v === null ? null : Math.round((v - med) * 10) / 10));
}

/** 0–100: how closely two melodies rise and fall together (correlation where both have pitch). */
export function contourSimilarity(a: (number | null)[], b: (number | null)[]): number | null {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== null && b[i] !== null) pairs.push([a[i]!, b[i]!]);
  if (pairs.length < 8) return null;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const my = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  let sxy = 0;
  let sx = 0;
  let sy = 0;
  pairs.forEach(([x, y]) => {
    sxy += (x - mx) * (y - my);
    sx += (x - mx) ** 2;
    sy += (y - my) ** 2;
  });
  if (sx < 1e-6 || sy < 1e-6) return 30;
  const r = sxy / Math.sqrt(sx * sy);
  return Math.round(Math.max(0, Math.min(100, 50 + r * 50)));
}

export function speechDuration(frames: Frame[]): number {
  const voiced = frames.filter((f) => f.db > -50);
  return voiced.length ? voiced[voiced.length - 1].t - voiced[0].t : 0;
}
