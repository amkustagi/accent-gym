// Meeting mode on the phone (tinyhustlers/hq#105): records a real meeting in silence, transcribes it on the
// device as it goes, and keeps only text plus a few voice numbers per chunk. No audio is recorded or stored:
// the capture runs with record:false, so there is no MediaRecorder and no Blob, and analyzer frames are
// dropped once a chunk's features are computed.
import { del, get, set } from 'idb-keyval';
import { CaptureSession } from '../engine/capture';
import { featuresOf, tagChunks, defaultNames, type Chunk, type Meeting, type VoicePrint } from '../engine/meeting';
import type { Frame } from '../engine/voice';
import { setMeetingQuiet } from './quiet';

const PRINT_KEY = 'voiceprint';

/** The voice print lives only in this phone's database, under its own key: never in state, backups or sync. */
export const loadVoicePrint = () => get(PRINT_KEY).then((x) => (x && (x as VoicePrint).v === 1 ? (x as VoicePrint) : null)).catch(() => null);
export const saveVoicePrint = (p: VoicePrint) => set(PRINT_KEY, p);
export const deleteVoicePrint = () => del(PRINT_KEY);

/** A frame counts as silence below this loudness (dBFS). */
const SILENT_DB = -50;
/** A pause this long ends a chunk; speakers usually change at a pause. */
const CUT_PAUSE_SEC = 0.8;

const words = (t: string) => t.split(/\s+/).filter(Boolean);

/** Splits a running transcript into chunks at pauses, with the voice features of each chunk. */
export class ChunkBuilder {
  chunks: Chunk[] = [];
  private frames: Frame[] = [];
  private text = '';
  private cutWords = 0;
  private start = 0;
  private quietSince: number | null = null;
  private spoke = false;

  onText(t: string) {
    this.text = t;
  }

  onFrame(f: Frame) {
    this.frames.push(f);
    if (f.db > SILENT_DB) {
      this.spoke = true;
      this.quietSince = null;
      return;
    }
    if (this.quietSince === null) this.quietSince = f.t;
    if (this.spoke && f.t - this.quietSince >= CUT_PAUSE_SEC) this.cut(this.quietSince);
  }

  /** Closes the current chunk at time `end` (seconds). */
  cut(end: number) {
    const w = words(this.text);
    const text = w.slice(this.cutWords).join(' ');
    if (text) {
      this.chunks.push({ text, start: this.start, end, features: featuresOf(this.frames, this.start, end) });
      this.cutWords = w.length;
    }
    // Only numbers survive; the frames for this stretch are dropped.
    this.frames = this.frames.filter((f) => f.t > end);
    this.start = end;
    this.spoke = false;
    this.quietSince = null;
  }

  /** Final text from the recognizer may arrive after the last pause; it joins the last chunk. */
  finish(finalText: string, end: number): Chunk[] {
    if (finalText) this.text = finalText;
    this.cut(end);
    return this.chunks;
  }
}

export interface LiveMeeting {
  stop(): Promise<Meeting>;
  cancel(): void;
  elapsed(): number;
}

/** Starts a silent meeting recording. Resolves with an error message if the microphone can't open. */
export async function startMeeting(print: VoicePrint | null, lang: string | undefined, onWords?: (n: number) => void): Promise<{ live?: LiveMeeting; error?: string }> {
  const b = new ChunkBuilder();
  let wordCount = 0;
  const session = new CaptureSession(
    'full',
    {
      onTranscript: (t) => {
        b.onText(t);
        const n = words(t).length;
        if (n !== wordCount) onWords?.((wordCount = n));
      },
      onFrame: (f) => b.onFrame(f),
    },
    // No recording (no audio Blob), continuous recognition, and enough restarts for a long meeting.
    { record: false, continuous: true, lang, maxRestarts: 5000 },
  );
  setMeetingQuiet(true);
  const r = await session.start();
  if (!r.ok) {
    setMeetingQuiet(false);
    return { error: r.error ?? 'Could not open the microphone.' };
  }
  let lock: { release(): Promise<void> } | null = null;
  try {
    // Keeps the screen awake (dimmed by the app) so the phone doesn't lock and close the microphone.
    lock = await (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null;
  } catch {
    lock = null;
  }
  const end = () => {
    setMeetingQuiet(false);
    void lock?.release().catch(() => undefined);
  };
  return {
    live: {
      elapsed: () => session.elapsed(),
      async stop() {
        const res = await session.stop();
        end();
        const chunks = b.finish(res.transcript, res.durationSec);
        const turns = tagChunks(chunks, print);
        return { turns, names: defaultNames(turns), durationSec: Math.round(res.durationSec), source: 'live' };
      },
      cancel() {
        session.cancel();
        end();
      },
    },
  };
}
