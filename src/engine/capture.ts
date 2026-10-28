// One recording session: microphone → voice analyzer + recorder, plus speech-to-text, with graceful fallbacks.
import { closeMic, listen, openMic, Recorder, sttSupported, type SttError, type SttHandle } from './speech';
import { summarize, VoiceAnalyzer, type Frame, type VoiceSummary } from './voice';
import { setRecording } from './tts';

export type ListeningMode = 'full' | 'transcript' | 'voice';

export interface CaptureCallbacks {
  onTranscript?: (text: string) => void;
  onFrame?: (f: Frame) => void;
  onAlternatives?: (alts: string[]) => void;
  /** Speech-to-text failed but audio analysis continues (or vice versa). */
  onWarning?: (msg: string) => void;
}

export interface CaptureResult {
  transcript: string;
  durationSec: number;
  frames: Frame[];
  voice: VoiceSummary | null;
  audio: Blob | null;
  sttError?: SttError;
  micError?: string;
}

export class CaptureSession {
  private stream: MediaStream | null = null;
  private analyzer: VoiceAnalyzer | null = null;
  private recorder: Recorder | null = null;
  private stt: SttHandle | null = null;
  private transcript = '';
  private sttDone: Promise<{ text: string; err?: SttError }> = Promise.resolve({ text: '' });
  private t0 = 0;
  private micError: string | undefined;
  running = false;

  constructor(private mode: ListeningMode, private cb: CaptureCallbacks = {}, private opts: { record?: boolean; continuous?: boolean; lang?: string } = {}) {}

  async start(): Promise<{ ok: boolean; error?: string }> {
    // Never let the model voice leak into the microphone, including a voice still being synthesized.
    setRecording(true);
    this.t0 = performance.now();
    this.running = true;
    const wantVoice = this.mode !== 'transcript';
    const wantStt = this.mode !== 'voice' && sttSupported();

    if (wantVoice) {
      try {
        this.stream = await openMic();
        this.analyzer = new VoiceAnalyzer(this.cb.onFrame);
        await this.analyzer.start(this.stream);
        if (this.opts.record !== false) {
          this.recorder = new Recorder();
          if (!this.recorder.start(this.stream)) this.recorder = null;
        }
      } catch (e) {
        const name = (e as Error)?.name;
        this.micError = name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser settings for this site.' : 'Could not open the microphone.';
        closeMic(this.stream);
        this.stream = null;
        this.analyzer = null;
        if (!wantStt) {
          this.running = false;
          setRecording(false);
          return { ok: false, error: this.micError };
        }
      }
    }

    if (wantStt) {
      this.sttDone = new Promise((resolve) => {
        this.stt = listen({
          continuous: this.opts.continuous ?? true,
          lang: this.opts.lang,
          onText: (t) => {
            this.transcript = t;
            this.cb.onTranscript?.(t);
          },
          alternatives: this.cb.onAlternatives,
          onEnd: (text, err) => {
            if (err && this.running) this.cb.onWarning?.(err);
            resolve({ text: text || this.transcript, err });
          },
        });
      });
    } else if (this.mode !== 'voice' && !sttSupported()) {
      this.cb.onWarning?.('unsupported');
    }

    if (!this.analyzer && !this.stt) {
      this.running = false;
      setRecording(false);
      return { ok: false, error: this.micError ?? 'No microphone available.' };
    }
    return { ok: true };
  }

  elapsed(): number {
    return (performance.now() - this.t0) / 1000;
  }

  async stop(): Promise<CaptureResult> {
    const durationSec = this.elapsed();
    this.running = false;
    setRecording(false);
    this.stt?.stop();
    const frames = this.analyzer?.stop() ?? [];
    const audio = this.recorder ? await this.recorder.stop() : null;
    closeMic(this.stream);
    const { text, err } = this.stt ? await this.sttDone : { text: '', err: undefined };
    return {
      transcript: (text || this.transcript).trim(),
      durationSec,
      frames,
      voice: frames.length > 20 ? summarize(frames) : null,
      audio,
      sttError: err,
      micError: this.micError,
    };
  }

  /** Abandons the session without results. */
  cancel(): void {
    this.running = false;
    setRecording(false);
    this.stt?.stop();
    this.analyzer?.stop();
    this.recorder?.stop();
    closeMic(this.stream);
  }
}
