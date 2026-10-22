// Model voice: a natural neural voice (Kokoro, on-device) with the best system voice as fallback.
import { get, set } from 'idb-keyval';
import { setAudioMode } from './speech';

export type VoiceEngine = 'natural' | 'system';

export const NATURAL_VOICES = [
  { id: 'af_heart', name: 'Heart', desc: 'American, warm, female' },
  { id: 'af_bella', name: 'Bella', desc: 'American, bright, female' },
  { id: 'am_michael', name: 'Michael', desc: 'American, calm, male' },
  { id: 'am_fenrir', name: 'Fenrir', desc: 'American, deep, male' },
  { id: 'bf_emma', name: 'Emma', desc: 'British, female' },
  { id: 'bm_george', name: 'George', desc: 'British, male' },
] as const;

let engine: VoiceEngine = 'natural';
let systemVoiceName = '';
let naturalVoice = 'af_heart';

export function configureVoice(cfg: { engine?: VoiceEngine; systemVoice?: string; naturalVoice?: string }) {
  if (cfg.engine) engine = cfg.engine;
  if (cfg.systemVoice !== undefined) systemVoiceName = cfg.systemVoice;
  if (cfg.naturalVoice) naturalVoice = cfg.naturalVoice;
  if (engine === 'natural' && naturalWasLoaded()) void loadNatural();
}

// ---------- system voices ----------

/** macOS/iOS novelty voices that sound robotic or silly. They are never chosen automatically. */
const NOVELTY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley)\b/i;
const GOOD_NAMES = /\b(Ava|Zoe|Evan|Nathan|Samantha|Allison|Susan|Tom|Joelle|Nicky|Noelle|Aaron|Jenny|Aria|Guy|Michelle|Davis|Emma|Brian|Andrew|Natural|Neural|Google US English|Microsoft)\b/i;

export function voiceScore(v: { name: string; lang: string; localService?: boolean }): number {
  if (NOVELTY.test(v.name)) return -100;
  let s = 0;
  if (/^en[-_]US/i.test(v.lang)) s += 20;
  else if (/^en[-_](GB|CA|AU|IE)/i.test(v.lang)) s += 10;
  else if (/^en/i.test(v.lang)) s += 5;
  else return -50;
  if (/premium/i.test(v.name)) s += 30;
  if (/enhanced/i.test(v.name)) s += 22;
  if (/natural|neural|online/i.test(v.name)) s += 25;
  if (/Google US English/i.test(v.name)) s += 18;
  if (GOOD_NAMES.test(v.name)) s += 8;
  if (/compact|eloquence/i.test(v.name)) s -= 15;
  return s;
}

export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => voiceScore(v) > 0)
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

function pickSystemVoice(): SpeechSynthesisVoice | undefined {
  const vs = englishVoices();
  return vs.find((v) => v.name === systemVoiceName) ?? vs[0];
}

/** True when the best available system voice is likely to sound robotic. */
export function systemVoiceIsBasic(): boolean {
  const v = englishVoices()[0];
  return !v || voiceScore(v) < 45;
}

// ---------- playback ----------

let current: HTMLAudioElement | null = null;
let currentEnd: (() => void) | null = null;

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (current) {
    current.pause();
    current.src = '';
    current = null;
  }
  const end = currentEnd;
  currentEnd = null;
  end?.();
}

/** Plays a recording or synthesized clip; returns a stop function. */
export function playBlob(blob: Blob, opts: { rate?: number; onEnd?: () => void } = {}): () => void {
  stopSpeaking();
  setAudioMode('playback');
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  a.playbackRate = opts.rate ?? 1;
  (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  current = a;
  const end = () => {
    URL.revokeObjectURL(url);
    if (current === a) current = null;
    if (currentEnd === end) currentEnd = null;
    opts.onEnd?.();
  };
  currentEnd = end;
  a.onended = end;
  a.onerror = end;
  a.play().catch(end);
  return () => {
    if (current === a) stopSpeaking();
  };
}

function speakSystem(text: string, rate: number, onEnd?: () => void) {
  if (typeof speechSynthesis === 'undefined') return onEnd?.();
  setAudioMode('playback');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickSystemVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'en-US';
  u.rate = rate;
  const end = () => {
    if (currentEnd === end) currentEnd = null;
    onEnd?.();
  };
  currentEnd = end;
  u.onend = end;
  u.onerror = end;
  speechSynthesis.speak(u);
}

// ---------- natural voice ----------

export type NaturalState = { status: 'off' | 'loading' | 'ready' | 'error'; progress: number; message?: string };
let natural: NaturalState = { status: 'off', progress: 0 };
const naturalListeners = new Set<(s: NaturalState) => void>();
const setNatural = (s: NaturalState) => {
  natural = s;
  naturalListeners.forEach((l) => l(s));
};
export const naturalState = () => natural;
export function onNaturalState(l: (s: NaturalState) => void) {
  naturalListeners.add(l);
  return () => void naturalListeners.delete(l);
}

const READY_KEY = 'natural-voice-ready';
const naturalWasLoaded = () => {
  try {
    return localStorage.getItem(READY_KEY) === '1';
  } catch {
    return false;
  }
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (b: Blob) => void; reject: (e: Error) => void }>();

export function loadNatural(): Promise<void> {
  if (natural.status === 'ready') return Promise.resolve();
  if (!worker) {
    try {
      worker = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
      setNatural({ status: 'error', progress: 0, message: 'This browser can\'t run the natural voice.' });
      return Promise.reject(e);
    }
    setNatural({ status: 'loading', progress: 0 });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'progress') setNatural({ status: 'loading', progress: m.total ? m.loaded / m.total : 0 });
      else if (m.type === 'ready') {
        setNatural({ status: 'ready', progress: 1 });
        try {
          localStorage.setItem(READY_KEY, '1');
        } catch {
          /* ignore */
        }
      } else if (m.type === 'audio') {
        pending.get(m.id)?.resolve(m.blob);
        pending.delete(m.id);
      } else if (m.type === 'error') {
        if (m.id !== undefined) {
          pending.get(m.id)?.reject(new Error(m.message));
          pending.delete(m.id);
        }
        if (natural.status !== 'ready') {
          setNatural({ status: 'error', progress: 0, message: 'Couldn\'t download the natural voice. Check your connection and try again.' });
          worker?.terminate();
          worker = null;
        }
      }
    };
    worker.postMessage({ type: 'load' });
  }
  return new Promise((resolve, reject) => {
    const off = onNaturalState((s) => {
      if (s.status === 'ready') {
        off();
        resolve();
      } else if (s.status === 'error') {
        off();
        reject(new Error(s.message));
      }
    });
  });
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

async function synthNatural(text: string, voice: string): Promise<Blob> {
  const key = `tts:${voice}:${hash(text)}`;
  const cached = (await get(key).catch(() => undefined)) as Blob | undefined;
  if (cached) return cached;
  if (!worker || natural.status !== 'ready') throw new Error('not-ready');
  const id = nextId++;
  const blob = await new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ type: 'speak', id, text, voice });
  });
  void set(key, blob).catch(() => undefined);
  return blob;
}

/** Pre-renders upcoming lines so they play instantly. */
export function prefetch(texts: string[]) {
  if (engine !== 'natural' || natural.status !== 'ready') return;
  texts.slice(0, 4).forEach((t) => void synthNatural(t, naturalVoice).catch(() => undefined));
}

// ---------- public ----------

export interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
  onStart?: () => void;
}

/** Speaks text with the natural voice when ready, otherwise the best system voice. */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const rate = opts.rate ?? 1;
  stopSpeaking();
  if (engine === 'natural' && natural.status === 'ready') {
    try {
      const blob = await synthNatural(text, naturalVoice);
      opts.onStart?.();
      playBlob(blob, { rate, onEnd: opts.onEnd });
      return;
    } catch {
      /* fall through to the system voice */
    }
  }
  opts.onStart?.();
  speakSystem(text, rate, opts.onEnd);
}

if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
