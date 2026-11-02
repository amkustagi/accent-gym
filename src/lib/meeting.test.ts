// Acceptance tests for Meeting mode privacy (tinyhustlers/hq#105): no audio is recorded or stored, the voice print
// stays out of state, backups and sync, and real-meeting text is not synced to the account.
import { describe, expect, it, vi } from 'vitest';

const made: { mode: string; opts: Record<string, unknown> }[] = [];
vi.mock('../engine/capture', () => ({
  CaptureSession: class {
    constructor(public mode: string, public cb: unknown, public opts: Record<string, unknown>) {
      made.push({ mode, opts });
    }
    start = async () => ({ ok: true });
    elapsed = () => 12;
    stop = async () => ({ transcript: 'We need two more weeks.', durationSec: 12, frames: [], voice: null, audio: null });
    cancel() {}
  },
}));
const idb = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: async (k: string) => idb.get(k),
  set: async (k: string, v: unknown) => void idb.set(k, v),
  del: async (k: string) => void idb.delete(k),
  keys: async () => [...idb.keys()],
}));

import { ChunkBuilder, saveVoicePrint, startMeeting } from './meeting';
import { meetingQuiet } from './quiet';
import { syncPayload } from './backend';
import { backupOf, migrate } from '../store/store';
import { meetingRecord } from '../screens/drills/Meeting';
import { defaultNames, meetingDebrief, YOU } from '../engine/meeting';

describe('Meeting mode keeps no audio (hq#105)', () => {
  it('records with no MediaRecorder and stays quiet until stopped', async () => {
    const r = await startMeeting(null, undefined);
    expect(made.at(-1)?.opts.record).toBe(false);
    expect(meetingQuiet()).toBe(true);
    const m = await r.live!.stop();
    expect(meetingQuiet()).toBe(false);
    expect(m.turns.map((t) => t.text)).toEqual(['We need two more weeks.']);
    expect(JSON.stringify(m)).not.toMatch(/audio|blob|f0/i);
  });

  it('drops analyzer frames once a chunk is cut, keeping only a few numbers', () => {
    const b = new ChunkBuilder();
    b.onText('We need two more weeks');
    for (let i = 0; i < 40; i++) b.onFrame({ t: i * 0.05, db: -30, f0: 110 });
    for (let i = 40; i < 60; i++) b.onFrame({ t: i * 0.05, db: -70, f0: null });
    expect(b.chunks).toHaveLength(1);
    expect(Object.keys(b.chunks[0].features ?? {}).sort()).toEqual(['medianSt', 'spreadSt', 'voiced']);
    expect((b as unknown as { frames: { t: number }[] }).frames.every((f) => f.t > b.chunks[0].end)).toBe(true);
  });

  it('keeps the voice print out of backups and sync, and real-meeting text out of sync', async () => {
    await saveVoicePrint({ v: 1, createdAt: 1, medianSt: 2, spreadSt: 2.4, voiced: 300 });
    const turns = [
      { speaker: 'p1', text: 'Where are we on the launch for Northwind?', start: 0, end: 3 },
      { speaker: YOU, text: 'We need two more weeks for the Northwind launch.', start: 3, end: 6 },
    ];
    const m = { turns, names: defaultNames(turns), durationSec: 6, source: 'live' as const };
    const rec = { ...meetingRecord(m, meetingDebrief(m)), id: 'm1', t: 1, hasAudio: false };
    expect(rec.drill).toBe('meeting');
    const s = { ...migrate({}), sessions: [rec] };
    const backup = backupOf(s);
    expect(backup).not.toMatch(/medianSt|voiceprint/);
    expect(backup).toContain('Northwind');
    const sync = JSON.stringify(syncPayload(s));
    expect(sync).not.toContain('Northwind');
    expect(sync).not.toMatch(/medianSt|voiceprint/);
    expect(sync).toContain('"talkShare"');
  });
});
