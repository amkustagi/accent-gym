// Voice analysis from raw microphone audio: loudness, pitch, pauses. Pure math is exported for tests.

export interface Frame {
  /** Seconds since start. */
  t: number;
  /** Loudness in dBFS (0 = full scale, typically -70 … -10). */
  db: number;
  /** Fundamental frequency in Hz when voiced, otherwise null. */
  f0: number | null;
}

export const FRAME_SEC = 0.05;
const MIN_F0 = 70;
const MAX_F0 = 420;

export function rmsDb(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  const rms = Math.sqrt(sum / buf.length);
  return rms > 0 ? Math.max(-100, 20 * Math.log10(rms)) : -100;
}

/**
 * Pitch by normalized square difference (McLeod pitch method, simplified).
 * Searches only human speaking range, so it stays cheap enough for phones.
 */
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length;
  const minLag = Math.floor(sampleRate / MAX_F0);
  const maxLag = Math.min(n - 1, Math.ceil(sampleRate / MIN_F0));
  if (maxLag <= minLag + 2) return null;
  const nsdf = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1 && lag < n; lag++) {
    let acf = 0;
    let m = 0;
    for (let i = 0; i < n - lag; i++) {
      const a = buf[i];
      const b = buf[i + lag];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[lag] = m > 0 ? (2 * acf) / m : 0;
  }
  let best = -1;
  for (let lag = minLag + 1; lag <= maxLag; lag++) if (nsdf[lag] > best) best = nsdf[lag];
  if (best < 0.6) return null;
  // First local peak that is close to the best one avoids octave errors.
  const threshold = best * 0.88;
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (nsdf[lag] >= threshold && nsdf[lag] >= nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]) {
      const a = nsdf[lag - 1];
      const b = nsdf[lag];
      const c = nsdf[lag + 1];
      const denom = a - 2 * b + c;
      const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
      const f0 = sampleRate / (lag + shift);
      return f0 >= MIN_F0 && f0 <= MAX_F0 ? f0 : null;
    }
  }
  return null;
}

export const semitones = (f: number): number => 12 * Math.log2(f / 100);

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface Pause {
  start: number;
  dur: number;
}

export interface VoiceSummary {
  totalSec: number;
  /** From first to last detected speech, in seconds. */
  speakingSec: number;
  /** Seconds with voice above the speech threshold. */
  voicedSec: number;
  pauses: Pause[];
  /** Pauses between 0.35 s and 2.5 s. */
  goodPauses: number;
  /** Silences of 2.5 s or more inside speech. */
  longPauses: number;
  avgPauseSec: number;
  pitchMedianHz: number | null;
  /** p10–p90 pitch spread in semitones. */
  pitchRangeSt: number | null;
  /** Share of phrase endings that rise (question-like). */
  uptalkRatio: number | null;
  loudnessDb: number | null;
  /** Loudness change from first to last third of speech, in dB. */
  trailOffDb: number | null;
  speechThresholdDb: number;
  hadSpeech: boolean;
}

export const PAUSE_MIN = 0.35;
export const PAUSE_LONG = 2.5;

export function summarize(frames: Frame[]): VoiceSummary {
  const totalSec = frames.length ? frames[frames.length - 1].t + FRAME_SEC : 0;
  const dbs = frames.map((f) => f.db).sort((a, b) => a - b);
  const floor = quantile(dbs, 0.05);
  const peak = quantile(dbs, 0.95);
  // Speech threshold sits between the noise floor and typical speech peaks.
  // With almost no silence in the take, the floor is speech itself, so fall back to the peak.
  const continuous = peak - floor < 8 && peak > -45;
  const threshold = continuous ? peak - 14 : Math.max(-60, Math.min(floor + 12, peak - 14));
  const speech = frames.map((f) => f.db >= threshold || f.f0 !== null && f.db >= threshold - 6);

  const first = speech.indexOf(true);
  const last = speech.lastIndexOf(true);
  const empty: VoiceSummary = {
    totalSec, speakingSec: 0, voicedSec: 0, pauses: [], goodPauses: 0, longPauses: 0, avgPauseSec: 0,
    pitchMedianHz: null, pitchRangeSt: null, uptalkRatio: null, loudnessDb: null, trailOffDb: null,
    speechThresholdDb: threshold, hadSpeech: false,
  };
  if (first < 0 || (peak - floor < 8 && !continuous)) return empty;

  const pauses: Pause[] = [];
  const segmentsIdx: [number, number][] = [];
  let segStart = first;
  let gapStart = -1;
  for (let i = first; i <= last; i++) {
    if (!speech[i]) {
      if (gapStart < 0) gapStart = i;
    } else if (gapStart >= 0) {
      const dur = (i - gapStart) * FRAME_SEC;
      if (dur >= PAUSE_MIN) {
        pauses.push({ start: frames[gapStart].t, dur });
        segmentsIdx.push([segStart, gapStart - 1]);
        segStart = i;
      }
      gapStart = -1;
    }
  }
  segmentsIdx.push([segStart, last]);

  const voicedFrames = frames.filter((_, i) => speech[i]);
  const f0s = voicedFrames.map((f) => f.f0).filter((f): f is number => f !== null);
  const st = f0s.map(semitones).sort((a, b) => a - b);
  const pitchMedianHz = f0s.length >= 10 ? 100 * 2 ** (quantile(st, 0.5) / 12) : null;
  const pitchRangeSt = f0s.length >= 10 ? Math.round((quantile(st, 0.9) - quantile(st, 0.1)) * 10) / 10 : null;

  // Uptalk: phrase ends that rise 2+ semitones above the phrase median.
  let endings = 0;
  let rises = 0;
  for (const [a, b] of segmentsIdx) {
    if ((b - a) * FRAME_SEC < 1) continue;
    const seg = frames.slice(a, b + 1).map((f) => f.f0).filter((f): f is number => f !== null).map(semitones);
    if (seg.length < 8) continue;
    const tail = seg.slice(-Math.max(3, Math.round(seg.length * 0.2)));
    const med = [...seg].sort((x, y) => x - y)[Math.floor(seg.length / 2)];
    const tailMed = [...tail].sort((x, y) => x - y)[Math.floor(tail.length / 2)];
    endings++;
    if (tailMed - med >= 2) rises++;
  }

  const loud = voicedFrames.map((f) => f.db);
  const third = Math.floor(loud.length / 3);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

  return {
    totalSec,
    speakingSec: Math.max(FRAME_SEC, (last - first + 1) * FRAME_SEC),
    voicedSec: voicedFrames.length * FRAME_SEC,
    pauses,
    goodPauses: pauses.filter((p) => p.dur < PAUSE_LONG).length,
    longPauses: pauses.filter((p) => p.dur >= PAUSE_LONG).length,
    avgPauseSec: pauses.length ? Math.round((pauses.reduce((s, p) => s + p.dur, 0) / pauses.length) * 100) / 100 : 0,
    pitchMedianHz: pitchMedianHz ? Math.round(pitchMedianHz) : null,
    pitchRangeSt,
    uptalkRatio: endings >= 2 ? Math.round((rises / endings) * 100) / 100 : null,
    loudnessDb: loud.length ? Math.round(mean(loud)) : null,
    trailOffDb: third >= 5 ? Math.round((mean(loud.slice(-third)) - mean(loud.slice(0, third))) * 10) / 10 : null,
    speechThresholdDb: threshold,
    hadSpeech: true,
  };
}

/** Live analyzer attached to a microphone stream. */
export class VoiceAnalyzer {
  frames: Frame[] = [];
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private t0 = 0;

  constructor(private onFrame?: (f: Frame) => void) {}

  async start(stream: MediaStream): Promise<void> {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => undefined);
    const src = this.ctx.createMediaStreamSource(stream);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const rate = this.ctx.sampleRate;
    this.t0 = performance.now();
    this.frames = [];
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      const db = rmsDb(buf);
      const f0 = db > -55 ? detectPitch(buf, rate) : null;
      const frame = { t: (performance.now() - this.t0) / 1000, db, f0 };
      this.frames.push(frame);
      this.onFrame?.(frame);
    };
    this.timer = window.setInterval(tick, FRAME_SEC * 1000);
  }

  stop(): Frame[] {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    return this.frames;
  }
}
