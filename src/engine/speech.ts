// Browser speech services: speech-to-text, text-to-speech, microphone, recording.

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;
const SRClass: SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

export const sttSupported = (): boolean => !!SRClass;

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

/** Continuous recognition that restarts itself when the browser ends a phrase early. */
export function listen(opts: SttOptions): SttHandle {
  if (!SRClass) {
    queueMicrotask(() => opts.onEnd('', 'unsupported'));
    return { stop() {} };
  }
  let finalText = '';
  let stopped = false;
  let ended = false;
  let rec: SR;
  let restarts = 0;
  const finish = (err?: SttError) => {
    if (ended) return;
    ended = true;
    opts.onEnd(finalText.trim(), err);
  };
  const start = () => {
    rec = new SRClass();
    rec.lang = 'en-US';
    rec.continuous = opts.continuous ?? true;
    rec.interimResults = true;
    rec.maxAlternatives = opts.alternatives ? 5 : 1;
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript + ' ';
          if (opts.alternatives) opts.alternatives(Array.from(r as ArrayLike<{ transcript: string }>).map((a) => a.transcript));
        } else interim += r[0].transcript;
      }
      opts.onText(`${finalText} ${interim}`.replace(/\s+/g, ' ').trim(), !interim);
    };
    rec.onerror = (e: any) => {
      const fatal: SttError[] = ['not-allowed', 'service-not-allowed', 'audio-capture'];
      if (fatal.includes(e.error)) {
        stopped = true;
        finish(e.error);
      } else if (e.error === 'network') {
        stopped = true;
        finish('network');
      }
    };
    rec.onend = () => {
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
  'audio-capture': 'Another feature is using the microphone. Try Settings › Listening mode › Transcript only.',
  network: 'Speech recognition needs an internet connection on this phone.',
  unsupported: 'This browser can\'t turn speech into text. Use Chrome on Android or Safari on iPhone.',
};

// ---------- microphone & recording ----------

export async function openMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
  });
}

export function closeMic(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  start(stream: MediaStream): boolean {
    if (typeof MediaRecorder === 'undefined') return false;
    const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported?.(t));
    try {
      this.rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      return false;
    }
    this.chunks = [];
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000);
    return true;
  }

  stop(): Promise<Blob | null> {
    const rec = this.rec;
    if (!rec || rec.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => resolve(this.chunks.length ? new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }) : null);
      rec.stop();
    });
  }
}

// ---------- text-to-speech ----------

let preferredVoice = '';
export const setPreferredVoice = (name: string) => {
  preferredVoice = name;
};

export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  const all = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  const us = all.filter((v) => /^en[-_]US/i.test(v.lang));
  return (us.length ? us : all).sort((a, b) => Number(/enhanced|premium|natural|neural/i.test(b.name)) - Number(/enhanced|premium|natural|neural/i.test(a.name)));
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const vs = englishVoices();
  return vs.find((v) => v.name === preferredVoice) ?? vs.find((v) => /Samantha|Ava|Google US English|Aria|Jenny|Allison|Natural/i.test(v.name)) ?? vs[0];
}

export function speak(text: string, rate = 1, onEnd?: () => void): void {
  if (typeof speechSynthesis === 'undefined') {
    onEnd?.();
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'en-US';
  u.rate = rate;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}

export const stopSpeaking = () => {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
};

if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
