import { describe, expect, it } from 'vitest';
import { generatePassage } from '../content/passages';
import { generateScenario } from '../content/generator';
import { DEFAULT_LEARNER, migrate, type Learner, type SessionRecord, type State } from '../store/store';
import { extractTerms, knownTerms, mergeTerms } from './extract';
import { learnFromSessions, learnedPlanSize, nextFocus, personalPack, pickQuestion, preferDrill, upcomingScenario } from './learner';

const DAY = 864e5;
const NOW = Date.UTC(2026, 9, 22, 15);

function sess(drill: SessionRecord['drill'], t: number, transcript = '', scores: SessionRecord['scores'] = {}): SessionRecord {
  return { id: `${drill}${t}`, t, drill, title: 'x', overall: 60, scores, metrics: {} as SessionRecord['metrics'], transcript, durationSec: 30, hasAudio: false };
}

const base = (over: Partial<State> = {}): State => ({ ...migrate({ profile: { onboarded: true, role: 'engineer' } } as never), ...over });

describe('term extraction', () => {
  it('finds projects, people and names', () => {
    const f = extractTerms('Here is where we stand on the Atlas migration. I talked to Priya yesterday. We also met Northwind Bank and Project Phoenix is on track.');
    expect(f).toEqual(expect.arrayContaining([
      { text: 'the Atlas migration', kind: 'project' },
      { text: 'Priya', kind: 'person' },
      { text: 'Northwind Bank', kind: 'term' },
      { text: 'Project Phoenix', kind: 'project' },
    ]));
    expect(f.some((x) => x.text === 'Atlas')).toBe(false);
    expect(extractTerms('Northwind Bank wants the demo.')).toEqual([{ text: 'Northwind Bank', kind: 'term' }]);
  });
  it('ignores sentence starts, weekdays, common acronyms and generic phrases', () => {
    expect(extractTerms('So we finish on Friday. The new project is fine. The CEO and the API team agree. Honestly it went well.')).toEqual([]);
  });
  it('needs two separate rounds before a heard name is used', () => {
    let terms = mergeTerms([], [{ text: 'Priya', kind: 'person' }], NOW);
    expect(knownTerms(terms)).toHaveLength(0);
    terms = mergeTerms(terms, [{ text: 'Priya', kind: 'person' }], NOW + 1);
    expect(knownTerms(terms).map((t) => t.text)).toEqual(['Priya']);
  });
  it('never re-learns a removed name', () => {
    const terms = mergeTerms([{ text: 'Priya', kind: 'person', n: 3, last: NOW, src: 'heard', hidden: true }], [{ text: 'Priya', kind: 'person' }], NOW);
    expect(knownTerms(terms)).toHaveLength(0);
    expect(terms[0].n).toBe(3);
  });
});

describe('learning from sessions', () => {
  it('mines only free-speech rounds, once each', () => {
    const sessions = [
      sess('simulator', NOW - 3 * DAY, 'The update on the Atlas migration is good. I asked Priya for help.'),
      sess('pace', NOW - 2 * DAY, 'Quick update on the Zebra migration and I told Omar.'),
      sess('pressure', NOW - DAY, 'The Atlas migration slipped, so I called Priya.'),
    ];
    const s = base({ sessions });
    const l = learnFromSessions(s, NOW);
    expect(knownTerms(l.terms).map((t) => t.text).sort()).toEqual(['Priya', 'the Atlas migration']);
    expect(l.terms.some((t) => /Zebra|Omar/.test(t.text))).toBe(false);
    // A second pass over the same sessions changes nothing.
    const again = learnFromSessions({ ...s, learner: l }, NOW);
    expect(again.terms).toEqual(l.terms);
  });
  it('old data migrates with an empty learner and still gets mined', () => {
    const s = migrate({ sessions: [sess('simulator', NOW, 'I met Priya.'), sess('simulator', NOW + 1, 'Then I emailed Priya.')] } as never);
    expect(s.learner).toEqual(DEFAULT_LEARNER);
    expect(knownTerms(learnFromSessions(s, NOW + 2).terms).map((t) => t.text)).toEqual(['Priya']);
  });
});

describe('personal content', () => {
  const learner: Learner = { ...DEFAULT_LEARNER, terms: [{ text: 'the Atlas migration', kind: 'project', n: 3, last: NOW, src: 'heard' }, { text: 'Priya', kind: 'person', n: 2, last: NOW, src: 'told' }] };
  it('uses the user\'s own project and people most of the time', () => {
    const pack = personalPack(base({ learner }));
    const share = pack.projects.filter((p) => p === 'the Atlas migration').length / pack.projects.length;
    expect(share).toBeGreaterThan(0.6);
    expect(pack.stakeholders).toContain('Priya');
    let hits = 0;
    for (let seed = 1; seed <= 60; seed++) if (/Atlas|Priya/.test(generatePassage('update', seed, pack).text)) hits++;
    expect(hits).toBeGreaterThan(35);
    let sc = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = generateScenario({ role: 'engineer', pack, category: 'update', seed });
      if (/Atlas|Priya/.test(g.context + g.prompt)) sc++;
    }
    expect(sc).toBeGreaterThan(25);
  });
  it('builds a practice round for an upcoming meeting', () => {
    const sc = upcomingScenario({ ...DEFAULT_LEARNER, upcoming: { text: 'Pitch to the Northwind client on Thursday', t: NOW } });
    expect(sc?.category).toBe('client');
    expect(sc?.context).toContain('Northwind');
    expect(upcomingScenario({ ...DEFAULT_LEARNER, upcoming: { text: 'Old meeting', t: NOW - 20 * DAY } })).toBeNull();
  });
});

describe('focus skill', () => {
  const scored = (skill: string, vals: number[], at: number) => vals.map((v, i) => sess('simulator', at + i, '', { [skill]: v, language: 90 }));
  it('starts on the weakest skill and holds it for a week', () => {
    const sessions = scored('pauses', [40, 45], NOW - DAY);
    const f = nextFocus(sessions, null, false, NOW);
    expect(f?.skill).toBe('pauses');
    expect(nextFocus(sessions, f, false, NOW + 3 * DAY)).toBe(f);
  });
  it('moves on once the skill improves, or after two weeks', () => {
    const f = { skill: 'pauses' as const, since: NOW - 8 * DAY, start: 40 };
    const better = [...scored('pauses', [60, 62], NOW - DAY), ...scored('pace', [50, 52], NOW - DAY)];
    expect(nextFocus(better, f, false, NOW)?.skill).toBe('pace');
    const same = [...scored('pauses', [41, 42], NOW - DAY), ...scored('pace', [70, 70], NOW - DAY)];
    expect(nextFocus(same, f, false, NOW)).toBe(f);
    expect(nextFocus(same, { ...f, since: NOW - 15 * DAY }, false, NOW)?.skill).not.toBe('pauses');
  });
});

describe('adapting to how the user practices', () => {
  it('swaps a drill the user keeps abandoning for one they finish', () => {
    const l: Learner = { ...DEFAULT_LEARNER, drills: { swaps: { opened: 6, finished: 1, last: NOW }, concision: { opened: 4, finished: 4, last: NOW } } };
    expect(preferDrill(l, 'swaps')).toBe('concision');
    expect(preferDrill({ ...l, drills: { swaps: { opened: 2, finished: 0, last: NOW } } }, 'swaps')).toBe('swaps');
  });
  it('sizes the plan to what the user typically does', () => {
    const days: State['days'] = {};
    for (let i = 0; i < 6; i++) days[new Date(NOW - i * DAY).toISOString().slice(0, 10)] = { pace: 1, swaps: 1 };
    expect(learnedPlanSize(base({ days }), 6, NOW)).toBe(4);
    expect(learnedPlanSize(base({ days: {} }), 6, NOW)).toBe(6);
  });
});

describe('the coach question', () => {
  const two = [sess('simulator', NOW - 2), sess('simulator', NOW - 1)];
  it('waits for a couple of rounds and asks at most once a day', () => {
    expect(pickQuestion(base({ sessions: [two[0]] }), NOW)).toBeNull();
    expect(pickQuestion(base({ sessions: two }), NOW)?.id).toBe('project');
    expect(pickQuestion(base({ sessions: two, learner: { ...DEFAULT_LEARNER, lastAsked: NOW - 3600e3 } }), NOW)).toBeNull();
  });
  it('skips questions already answered or recently skipped', () => {
    const learner: Learner = { ...DEFAULT_LEARNER, skipped: { project: NOW - DAY }, audience: ['clients'] };
    expect(pickQuestion(base({ sessions: two, learner }), NOW)?.id).toBe('upcoming');
  });
});
