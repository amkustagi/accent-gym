// Browser speech input: speech-to-text, microphone, recording, and the iPhone audio session.

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;
const SRClass: SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

export const sttSupported = (): boolean => !!SRClass;
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
}

/**
 * Continuous recognition that restarts itself when the browser ends a phrase early.
 * The transcript is rebuilt from the full result list on every event, because Safari
 * re-sends earlier results and reading only `resultIndex` onward duplicated words.
 */
export function listen(opts: SttOptions): SttHandle {
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
    rec.lang = 'en-US';
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

export const STT_HELP: Record<SttError, string> = {
  'not-allowed': 'The microphone is blocked. Allow it for this site in your browser settings.',
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

export async function openMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
  setAudioMode('record');
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
  });
}

export function closeMic(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
  setAudioMode('playback');
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
