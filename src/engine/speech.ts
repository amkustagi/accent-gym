// Browser speech input: speech-to-text, microphone, recording, and the iPhone audio session.

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;
const SRClass: SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

import { SpeechRecognition as NativeSR } from '@capacitor-community/speech-recognition';
import { hasPlugin, isNative } from '../lib/native';

/** The iPhone/Android app uses the phone's own recognizer when the web view has no Web Speech API. */
const useNativeStt = (): boolean => !SRClass && isNative() && hasPlugin('SpeechRecognition');

export const sttSupported = (): boolean => !!SRClass || useNativeStt();
export const isSafari = (): boolean => typeof navigator !== 'undefined' && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
export const isIOS = (): boolean => typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export type SttError = 'not-allowed' | 'service-not-allowed' | 'audio-capture' | 'network' | 'unsupported';

export interface SttHandle {
  stop(): void;
}

export interface SttOptions {
  onText: (text: string, isFinal: boolean) => void;
  onEnd: (finalText: string, error?: SttError) => void;
  /** Return several guesses per phrase (used for single-word pronunciation checks). */
  alternatives?: (alts: string[]) => void;
  continuous?: boolean;
  /** Recognition locale, e.g. en-GB for a British accent target. */
  lang?: string;
}

/**
 * Continuous recognition that restarts itself when the browser ends a phrase early.
 * The transcript is rebuilt from the full result list on every event, because Safari
 * re-sends earlier results and reading only `resultIndex` onward duplicated words.
 */
export function listen(opts: SttOptions): SttHandle {
  if (useNativeStt()) return listenNative(opts);
  if (!SRClass) {
    queueMicrotask(() => opts.onEnd('', 'unsupported'));
    return { stop() {} };
  }
  let committed = ''; // finals from earlier recognizer sessions (before a restart)
  let sessionFinal = '';
  let stopped = false;
  let ended = false;
  let rec: SR;
  let restarts = 0;
  const seenAlts = new Set<number>();
  const all = () => `${committed} ${sessionFinal}`.replace(/\s+/g, ' ').trim();
  const finish = (err?: SttError) => {
    if (ended) return;
    ended = true;
    opts.onEnd(all(), err);
  };
  const start = () => {
    rec = new SRClass();
    rec.lang = opts.lang ?? 'en-US';
    rec.continuous = opts.continuous ?? true;
    rec.interimResults = true;
    rec.maxAlternatives = opts.alternatives ? 5 : 1;
    seenAlts.clear();
    rec.onresult = (e: any) => {
      let fin = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          fin += r[0].transcript + ' ';
          if (opts.alternatives && !seenAlts.has(i)) {
            seenAlts.add(i);
            opts.alternatives(Array.from(r as ArrayLike<{ transcript: string }>).map((a) => a.transcript));
          }
        } else interim += r[0].transcript + ' ';
      }
      sessionFinal = fin;
      opts.onText(`${all()} ${interim}`.replace(/\s+/g, ' ').trim(), !interim.trim());
    };
    rec.onerror = (e: any) => {
      const fatal: SttError[] = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'];
      if (fatal.includes(e.error)) {
        stopped = true;
        finish(e.error);
      }
    };
    rec.onend = () => {
      committed = all();
      sessionFinal = '';
      if (stopped || !(opts.continuous ?? true) || restarts > 60) finish();
      else {
        restarts++;
        try {
          start();
        } catch {
          finish();
        }
      }
    };
    try {
      rec.start();
    } catch {
      stopped = true;
      finish('not-allowed');
    }
  };
  start();
  return {
    stop() {
      stopped = true;
      try {
        rec.stop();
      } catch {
        finish();
      }
      // Some browsers never fire onend after stop(); don't hang the UI.
      setTimeout(() => finish(), 1500);
    },
  };
}

/** Native recognizer (iOS SFSpeechRecognizer / Android SpeechRecognizer) with the same contract as listen(). */
function listenNative(opts: SttOptions): SttHandle {
  let committed = '';
  let current = '';
  let stopped = false;
  let ended = false;
  let restarts = 0;
  const all = () => `${committed} ${current}`.replace(/\s+/g, ' ').trim();
  const finish = (err?: SttError) => {
    if (ended) return;
    ended = true;
    void NativeSR.removeAllListeners();
    opts.onEnd(all(), err);
  };
  const begin = async () => {
    try {
      const perm = await NativeSR.requestPermissions();
      if (perm.speechRecognition !== 'granted') return finish('not-allowed');
      await NativeSR.addListener('partialResults', (d: { matches?: string[] }) => {
        const m = d.matches ?? [];
        current = m[0] ?? '';
        if (opts.alternatives && m.length > 1) opts.alternatives(m);
        opts.onText(all(), false);
      });
      await NativeSR.addListener('listeningState', (d: { status: 'started' | 'stopped' }) => {
        if (d.status !== 'stopped') return;
        committed = all();
        current = '';
        if (stopped || !(opts.continuous ?? true) || restarts > 60) finish();
        else {
          restarts++;
          void NativeSR.start({ language: opts.lang ?? 'en-US', maxResults: opts.alternatives ? 5 : 1, partialResults: true, popup: false }).catch(() => finish());
        }
      });
      await NativeSR.start({ language: opts.lang ?? 'en-US', maxResults: opts.alternatives ? 5 : 1, partialResults: true, popup: false });
    } catch {
      finish('service-not-allowed');
    }
  };
  void begin();
  return {
    stop() {
      stopped = true;
      void NativeSR.stop().catch(() => undefined);
      setTimeout(() => finish(), 1200);
    },
  };
}

export const STT_HELP: Record<SttError, string> = {
  'not-allowed': 'The microphone or speech recognition is blocked. Allow it in your browser or phone settings (Settings › Speakco).',
  'service-not-allowed': 'Speech recognition is off. On iPhone, turn on Settings › General › Keyboard › Enable Dictation, and Siri.',
  'audio-capture': 'Another feature is using the microphone. Try Settings › Listening › Words only.',
  network: 'Speech recognition needs an internet connection on this phone.',
  unsupported: 'This browser can\'t turn speech into text. Use Chrome on Android or Safari on iPhone.',
};

// ---------- audio session (iPhone) ----------

/**
 * iPhone keeps audio in "record" mode after the mic closes, which makes the model voice and
 * playback silent or route to the earpiece. Safari 16.4+ exposes navigator.audioSession to fix it.
 */
export function setAudioMode(mode: 'record' | 'playback'): void {
  const s = (navigator as any).audioSession;
  if (!s) return;
  try {
    s.type = mode === 'record' ? 'play-and-record' : 'playback';
  } catch {
    /* unsupported */
  }
}

// ---------- microphone & recording ----------

// The microphone stays open between takes for a short while, so the browser doesn't ask for
// permission again on every round. It's released when idle, when the app goes to the background,
// and (on iPhone) before playback, which is quiet while the mic is open.
const KEEP_WARM_MS = 90_000;
let warm: MediaStream | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
let prompts: { t: number }[] = [];

const live = (s: MediaStream | null): s is MediaStream => !!s && s.getAudioTracks().some((t) => t.readyState === 'live' && !t.muted);

export async function openMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
  clearTimeout(releaseTimer);
  setAudioMode('record');
  if (live(warm)) return warm;
  releaseMic();
  const t0 = performance.now();
  const s = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
  });
  // A slow grant means the browser showed a permission prompt.
  if (performance.now() - t0 > 600) prompts.push({ t: Date.now() });
  warm = s;
  return s;
}

/** Ends a take. The stream stays open briefly for the next take, then closes on its own. */
export function closeMic(stream: MediaStream | null): void {
  if (stream && stream !== warm) stream.getTracks().forEach((t) => t.stop());
  setAudioMode('playback');
  clearTimeout(releaseTimer);
  if (warm) releaseTimer = setTimeout(releaseMic, KEEP_WARM_MS);
}

/** Closes the microphone completely (the recording indicator turns off). */
export function releaseMic(): void {
  clearTimeout(releaseTimer);
  warm?.getTracks().forEach((t) => t.stop());
  warm = null;
}

/** Before playing audio: iPhone plays quietly through the earpiece route while the mic is open. True if it was open. */
export function releaseMicForPlayback(): boolean {
  if (!(isIOS() || isSafari())) return false;
  const wasOpen = live(warm);
  releaseMic();
  return wasOpen;
}

/** Number of permission prompts seen in this app session (used to offer the "always allow" tip). */
export const promptCount = () => prompts.length;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && releaseMic());
  window.addEventListener('pagehide', releaseMic);
}

/** Container types in order of preference: Safari can only play back what it records as MP4/AAC. */
export function recorderMimeTypes(safari = isSafari() || isIOS()): string[] {
  const mp4 = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac'];
  const webm = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  return safari ? [...mp4, ...webm] : [...webm, ...mp4];
}

export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const probe = typeof document !== 'undefined' ? document.createElement('audio') : null;
  const ok = recorderMimeTypes().filter((t) => MediaRecorder.isTypeSupported?.(t));
  // Prefer a type this browser can also play back.
  return ok.find((t) => !probe || probe.canPlayType(t.split(';')[0]) !== '') ?? ok[0];
}

export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  start(stream: MediaStream): boolean {
    if (typeof MediaRecorder === 'undefined') return false;
    const mimeType = pickRecorderMime();
    try {
      this.rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined);
    } catch {
      try {
        this.rec = new MediaRecorder(stream);
      } catch {
        return false;
      }
    }
    this.chunks = [];
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(500);
    return true;
  }

  stop(): Promise<Blob | null> {
    const rec = this.rec;
    if (!rec || rec.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      const done = () => resolve(this.chunks.length ? new Blob(this.chunks, { type: (rec.mimeType || 'audio/mp4').split(';')[0] }) : null);
      rec.onstop = done;
      try {
        rec.stop();
      } catch {
        done();
      }
    });
  }
}
