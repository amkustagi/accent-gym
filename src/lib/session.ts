import type { CaptureResult } from '../engine/capture';
import { evaluate, type Evaluation } from '../engine/score';
import { semitones, type Frame } from '../engine/voice';
import type { DrillId } from '../content/catalog';
import { saveSession, type SessionRecord } from '../store/store';

/** Down-samples frames to 0.1 s steps for the report chart. */
export function toTrace(frames: Frame[]): [number, number, number | null][] {
  const out: [number, number, number | null][] = [];
  for (let i = 0; i + 1 < frames.length; i += 2) {
    const a = frames[i];
    const b = frames[i + 1];
    const f0 = a.f0 ?? b.f0;
    out.push([Math.round(a.t * 10) / 10, Math.round(Math.max(a.db, b.db)), f0 ? Math.round(semitones(f0) * 10) / 10 : null]);
  }
  return out;
}

export interface ScoreOptions {
  drill: DrillId | 'baseline';
  title: string;
  itemId?: string;
  clarity?: number | null;
  scripted?: boolean;
  extra?: Record<string, number | string>;
  /** Extra adjustments to the overall score (e.g. word budget penalty). */
  adjust?: (ev: Evaluation) => Evaluation;
}

export async function scoreAndSave(result: CaptureResult, o: ScoreOptions): Promise<{ rec: SessionRecord; ev: Evaluation; xp: number }> {
  let ev = evaluate({ transcript: result.transcript, durationSec: result.durationSec, voice: result.voice, clarity: o.clarity, scripted: o.scripted });
  if (o.adjust) ev = o.adjust(ev);
  const xp = 10 + Math.round(ev.overall / 10);
  const rec = await saveSession(
    {
      drill: o.drill,
      title: o.title,
      itemId: o.itemId,
      overall: ev.overall,
      scores: ev.scores,
      metrics: ev.metrics,
      transcript: result.transcript,
      durationSec: Math.round(result.durationSec),
      trace: toTrace(result.frames),
      pauses: result.voice?.pauses,
      tips: ev.tips,
      extra: o.extra,
    },
    result.audio,
    xp,
  );
  return { rec, ev, xp };
}

/** True if the take has too little speech to score. */
export function tooShort(r: CaptureResult): string | null {
  const words = r.transcript.trim() ? r.transcript.trim().split(/\s+/).length : 0;
  if (r.voice && !r.voice.hadSpeech && words < 3) return 'I couldn\'t hear any speech. Check that the microphone isn\'t muted, then try again closer to the phone.';
  if (!r.voice && words < 3) return r.sttError ? 'Speech recognition didn\'t return any words. See the note above, then try again.' : 'I didn\'t catch enough words to score. Try again and speak for at least 10 seconds.';
  if (r.durationSec < 3) return 'That was very short. Speak for at least 10 seconds.';
  return null;
}

/** Saves a small scored result (no audio) so drills like twisters feed the skill profile. */
export function quickRecord(drill: DrillId, title: string, scores: Evaluation['scores'], transcript: string, xp: number) {
  const ev = evaluate({ transcript, durationSec: 0, scripted: true });
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + (b ?? 0), 0) / Math.max(1, Object.keys(scores).length));
  return saveSession({ drill, title, overall, scores, metrics: { ...ev.metrics, clarity: scores.clarity ?? null }, transcript, durationSec: 0, tips: [] }, null, xp);
}
