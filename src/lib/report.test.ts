import { afterEach, describe, expect, it, vi } from 'vitest';
import { areaName, localTitle } from './ticket';
import { localFollowUp } from '../content/followups';
import { SCENARIOS, CATEGORIES } from '../content/scenarios';
import { todayPlan } from '../learn/adapt';
import { migrate } from '../store/store';

describe('ticket titles from spoken reports', () => {
  it('drops filler, keeps the first sentence and names the screen', () => {
    expect(localTitle('Hey so the take follow up questions button is not working here. There is a button but it does nothing', 'Meeting simulator')).toBe('Meeting simulator: The take follow up questions button is…');
    expect(localTitle('um basically the timer never stops', '')).toBe('The timer never stops');
  });
  it('never cuts a word in half and stays short', () => {
    const t = localTitle('During the recording of my own voice sometimes I hear the system voice playing over it', 'Shadowing');
    expect(t).toBe('Shadowing: During the recording of my own voice sometimes I…');
    expect(t.length).toBeLessThanOrEqual(61);
  });
  it('has a title even for an empty report', () => {
    expect(localTitle('   ')).toBe('Report from the app');
  });
  it('names screens', () => {
    expect(areaName('drill:shadow:td')).toBe('Shadowing');
    expect(areaName('tab:today')).toBe('Today');
    expect(areaName('settings')).toBe('Settings');
    expect(areaName(undefined)).toBe('');
  });
});

describe('follow-up questions without AI', () => {
  it('has a question for every category and does not repeat until the bank runs out', () => {
    for (const c of CATEGORIES) {
      const sc = SCENARIOS.find((s) => s.category === c.id) ?? { ...SCENARIOS[0], category: c.id };
      const asked: string[] = [];
      for (let i = 0; i < 3; i++) {
        const q = localFollowUp(sc, asked);
        expect(q.question.length).toBeGreaterThan(5);
        expect(asked).not.toContain(q.question);
        asked.push(q.question);
      }
    }
  });
});

describe('daily plan', () => {
  it('leaves the warm-up out unless it is switched on', () => {
    const s = migrate({ profile: { minutes: 15 } } as never);
    expect(todayPlan(s).some((i) => i.drill === 'warmup')).toBe(false);
    const on = { ...s, settings: { ...s.settings, warmupInPlan: true } };
    expect(todayPlan(on).some((i) => i.drill === 'warmup')).toBe(true);
  });
});

describe('no voice while recording', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('a voice that finishes loading after the mic opens never plays', async () => {
    const played: string[] = [];
    class FakeAudio {
      playbackRate = 1;
      src = '';
      currentTime = 0;
      paused = true;
      preload = '';
      setAttribute() {}
      addEventListener() {}
      removeEventListener() {}
      play() {
        played.push(this.src);
        return Promise.resolve();
      }
      pause() {}
    }
    vi.stubGlobal('Audio', FakeAudio);
    // Spy on the static methods only: replacing the whole URL global breaks Vitest 4's module loader.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const tts = await import('../engine/tts');
    tts.setRecording(true);
    tts.playBlob(new Blob(['a']));
    expect(played).toHaveLength(0);
    let ended = false;
    await tts.speak('hello', { onEnd: () => (ended = true) });
    expect(ended).toBe(true);
    tts.setRecording(false);
    tts.playBlob(new Blob(['a']));
    expect(played).toHaveLength(1);
  });
});
