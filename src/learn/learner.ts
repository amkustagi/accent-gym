// The coach's model of the user. It learns quietly from use and feeds every other part of the app:
// names from what they say, which drills they finish or skip, which skill to focus on, and a few
// one-tap answers. Nothing here adds screens; it only changes what the app picks and writes.
import type { DrillId } from '../content/catalog';
import { roleById, type RolePack } from '../content/roles';
import type { CategoryId, Scenario } from '../content/scenarios';
import type { Skill } from '../engine/score';
import { getState, onChange, updateLearner, type Learner, type SessionRecord, type State, type Term } from '../store/store';
import { extractTerms, knownTerms, mergeTerms } from './extract';

const DAY = 864e5;

/** Rounds where the user speaks in their own words (not reading a script). */
const FREE_SPEECH = new Set<SessionRecord['drill']>(['simulator', 'pressure', 'roleplay', 'structure', 'concision', 'baseline', 'course']);

// ---------- learning from sessions ----------

/** Mines any new free-speech rounds for names, then refreshes the focus skill. */
export function learnFromSessions(s: State, now = Date.now()): Learner {
  let l = s.learner;
  const fresh = s.sessions.filter((x) => x.t > l.minedAt);
  if (fresh.length) {
    let terms = l.terms;
    for (const rec of fresh) {
      if (!FREE_SPEECH.has(rec.drill) || !rec.transcript) continue;
      terms = mergeTerms(terms, extractTerms(rec.transcript), rec.t || now);
    }
    l = { ...l, terms, minedAt: Math.max(...fresh.map((x) => x.t)) };
  }
  const focus = nextFocus(s.sessions, l.focus, s.profile.accentGoal !== 'none', now);
  if (focus !== l.focus) l = { ...l, focus };
  return l;
}

let started = false;
/** Keeps the learner model current in the background. Call once after state loads. */
export function startLearner() {
  if (started) return;
  started = true;
  const tick = () => {
    const s = getState();
    if (!s.loaded) return;
    const next = learnFromSessions(s);
    if (next !== s.learner) updateLearner(() => next);
  };
  tick();
  let lastLen = getState().sessions.length;
  onChange((s) => {
    if (s.sessions.length === lastLen) return;
    lastLen = s.sessions.length;
    queueMicrotask(tick);
  });
}

// ---------- focus skill ----------

const FOCUS_SKILLS: Skill[] = ['language', 'fillers', 'pace', 'pauses', 'variety'];

function recentAverages(sessions: SessionRecord[], now: number, days = 14): Partial<Record<Skill, { avg: number; n: number }>> {
  const out: Partial<Record<Skill, { avg: number; n: number }>> = {};
  const recent = sessions.filter((x) => now - x.t < days * DAY);
  for (const k of [...FOCUS_SKILLS, 'clarity' as Skill]) {
    const v = recent.map((x) => x.scores[k]).filter((x): x is number => typeof x === 'number');
    if (v.length) out[k] = { avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), n: v.length };
  }
  return out;
}

/**
 * The skill to coach this stretch. It holds for at least a week so practice adds up, moves on once
 * the skill has clearly improved (+8 or 80+), and rotates after two weeks so nothing goes stale.
 */
export function nextFocus(sessions: SessionRecord[], cur: Learner['focus'], accent: boolean, now: number): Learner['focus'] {
  const avgs = recentAverages(sessions, now);
  const pool = [...FOCUS_SKILLS, ...(accent ? (['clarity'] as Skill[]) : [])].filter((k) => (avgs[k]?.n ?? 0) >= 2);
  if (!pool.length) return cur;
  const ranked = [...pool].sort((a, b) => avgs[a]!.avg - avgs[b]!.avg);
  if (!cur) return { skill: ranked[0], since: now, start: avgs[ranked[0]]!.avg };
  const age = now - cur.since;
  const nowScore = avgs[cur.skill]?.avg;
  const improved = nowScore !== undefined && (nowScore >= cur.start + 8 || nowScore >= 80);
  if ((age >= 7 * DAY && improved) || age >= 14 * DAY) {
    const pick = ranked.find((k) => k !== cur.skill) ?? ranked[0];
    return { skill: pick, since: now, start: avgs[pick]!.avg };
  }
  return cur;
}

// ---------- drill preferences ----------

/** Share of opened drills the user actually finished, or null with too little data. */
export function finishRate(l: Learner, d: DrillId): number | null {
  const u = l.drills[d];
  if (!u || u.opened < 3) return null;
  return Math.min(1, u.finished / u.opened);
}

/** Drills that train the same skill, used when the user keeps abandoning the default one. */
const SAME_SKILL: Partial<Record<DrillId, DrillId[]>> = {
  swaps: ['concision', 'structure'],
  concision: ['swaps', 'structure'],
  structure: ['concision', 'simulator'],
  pace: ['shadow', 'pauses'],
  pauses: ['pace'],
  variety: ['shadow'],
  clarity: ['pronunciation'],
  simulator: ['roleplay', 'structure'],
  pressure: ['simulator'],
};

/** Swaps a drill the user rarely finishes for one they do, when one trains the same skill. */
export function preferDrill(l: Learner, d: DrillId, available: (x: DrillId) => boolean = () => true): DrillId {
  const rate = finishRate(l, d);
  if (rate === null || rate >= 0.34) return d;
  const alt = (SAME_SKILL[d] ?? []).filter(available).sort((a, b) => (finishRate(l, b) ?? 0.5) - (finishRate(l, a) ?? 0.5))[0];
  return alt && (finishRate(l, alt) ?? 0.5) > rate ? alt : d;
}

/** How many plan items the user actually gets through, learned from the last two weeks. */
export function learnedPlanSize(s: State, base: number, now = Date.now()): number {
  const keys = Object.keys(s.days).filter((k) => now - new Date(`${k}T12:00:00`).getTime() < 14 * DAY);
  const counts = keys.map((k) => Object.values(s.days[k]).reduce((a, b) => a + (b ?? 0), 0)).filter((n) => n > 0);
  if (counts.length < 4) return base;
  const typical = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)];
  return Math.max(2, Math.min(6, Math.round((base + typical) / 2)));
}

// ---------- personal vocabulary ----------

const AUDIENCE_PHRASE: Record<string, string> = {
  team: 'the team', manager: 'your manager', leaders: 'the leadership team', clients: 'the client', peers: 'a colleague from another team', reports: 'your direct reports',
};

/**
 * The role vocabulary blended with what the user has told or shown the coach, so generated
 * scenarios and passages use their real projects and people most of the time.
 */
export function personalPack(s: State): RolePack {
  const base = roleById(s.profile.role);
  const l = s.learner;
  const projects = knownTerms(l.terms, 'project').map((t) => t.text);
  const things = knownTerms(l.terms, 'term').map((t) => t.text);
  const people = knownTerms(l.terms, 'person').map((t) => t.text);
  const audience = l.audience.map((a) => AUDIENCE_PHRASE[a]).filter(Boolean);
  const mine = [...projects, ...things.slice(0, 3)].slice(0, 8);
  const who = [...people.slice(0, 6), ...audience];
  // Repeat the user's own items so they come up about two times in three.
  const weight = (own: string[], stock: string[]) => (own.length ? [...Array.from({ length: Math.ceil((stock.length * 2) / own.length) }, () => own).flat(), ...stock] : stock);
  return { ...base, projects: weight(mine, base.projects), stakeholders: weight(who, base.stakeholders) };
}

/** True when the coach knows enough about the user's world to personalize content. */
export function hasWorld(s: State): boolean {
  return knownTerms(s.learner.terms).length > 0 || s.learner.audience.length > 0;
}

// ---------- category interest ----------

const HARDEST_CATS: Record<string, CategoryId[]> = {
  spot: ['impromptu', 'problem'], disagree: ['pushback', 'influence'], present: ['present'], small: ['network', 'intro'],
  badnews: ['problem', 'feedback'], interview: ['interview'], negotiate: ['negotiate'], leaders: ['update', 'influence'],
};

const AUDIENCE_CATS: Record<string, CategoryId[]> = {
  team: ['update', 'feedback'], manager: ['update', 'negotiate'], leaders: ['present', 'influence'], clients: ['client', 'negotiate'], peers: ['influence', 'pushback'], reports: ['feedback'],
};

/** Extra category weight from what the coach learned (answers), added on top of the profile. */
export function learnedCategoryBoost(l: Learner): Map<CategoryId, number> {
  const w = new Map<CategoryId, number>();
  const add = (cs: CategoryId[] | undefined, by: number) => cs?.forEach((c) => w.set(c, (w.get(c) ?? 0) + by));
  l.hardest.forEach((h) => add(HARDEST_CATS[h], 2));
  l.audience.forEach((a) => add(AUDIENCE_CATS[a], 1));
  return w;
}

/** The meeting the user said is coming up, while it's still relevant. */
export function upcoming(l: Learner, now = Date.now()): string | null {
  return l.upcoming && now - l.upcoming.t < 10 * DAY ? l.upcoming.text : null;
}

/** A practice round for the meeting the user said is coming up. */
export function upcomingScenario(l: Learner): Scenario | null {
  const text = upcoming(l);
  if (!text || !l.upcoming) return null;
  const t = text.toLowerCase();
  const category: CategoryId = /interview/.test(t) ? 'interview' : /client|customer|pitch|sales/.test(t) ? 'client'
    : /present|demo|talk|keynote|town ?hall/.test(t) ? 'present' : /raise|salary|promotion|negotiat|contract/.test(t) ? 'negotiate'
    : /feedback|performance|review with|1:1|one.on.one/.test(t) ? 'feedback' : 'update';
  const frame = category === 'interview' ? ['Direct answer', 'Proof', 'Tie to the role']
    : category === 'negotiate' ? ['Your impact', 'The specific ask', 'What you can offer'] : ['Why you\'re there', 'Your key point', 'What you need from them'];
  return { id: `up:${l.upcoming.t}`, category, context: `Coming up: ${text}`, prompt: 'Say your opening, the way you want it to sound in the room.', frame, secs: 60 };
}

// ---------- the coach's occasional question ----------

export interface CoachQuestion {
  id: 'project' | 'audience' | 'upcoming' | 'hardest' | 'person';
  ask: string;
  kind: 'text' | 'multi';
  placeholder?: string;
  options?: { id: string; label: string }[];
  /** Days before asking again after an answer. */
  again: number;
}

export const QUESTIONS: CoachQuestion[] = [
  { id: 'project', ask: 'What\'s one project you\'re working on right now?', kind: 'text', placeholder: 'e.g. the Atlas migration', again: 45 },
  { id: 'audience', ask: 'Who do you speak to most at work?', kind: 'multi', again: 120, options: [
    { id: 'team', label: 'My team' }, { id: 'manager', label: 'My manager' }, { id: 'leaders', label: 'Senior leaders' },
    { id: 'clients', label: 'Clients' }, { id: 'peers', label: 'Other teams' }, { id: 'reports', label: 'People I manage' },
  ] },
  { id: 'upcoming', ask: 'Any important meeting coming up? I\'ll set up practice for it.', kind: 'text', placeholder: 'e.g. Budget review with the CFO on Thursday', again: 7 },
  { id: 'hardest', ask: 'Which moment is hardest for you?', kind: 'multi', again: 90, options: [
    { id: 'spot', label: 'Put on the spot' }, { id: 'disagree', label: 'Disagreeing' }, { id: 'present', label: 'Presenting' },
    { id: 'leaders', label: 'Speaking to leaders' }, { id: 'badnews', label: 'Bad news' }, { id: 'small', label: 'Small talk' },
    { id: 'negotiate', label: 'Negotiating' }, { id: 'interview', label: 'Interviews' },
  ] },
  { id: 'person', ask: 'Who do you present to or report to most? A first name is enough.', kind: 'text', placeholder: 'e.g. Priya', again: 60 },
];

/**
 * At most one short question a day, after the user has done a couple of rounds, only when the
 * answer would fill a real gap, and never again soon after a skip.
 */
export function pickQuestion(s: State, now = Date.now()): CoachQuestion | null {
  const l = s.learner;
  if (s.sessions.length < 2 || now - l.lastAsked < 20 * 3600e3) return null;
  const need: Record<CoachQuestion['id'], boolean> = {
    project: knownTerms(l.terms, 'project').length + knownTerms(l.terms, 'term').length < 2,
    audience: l.audience.length === 0,
    upcoming: !upcoming(l, now),
    hardest: l.hardest.length === 0,
    person: knownTerms(l.terms, 'person').length === 0,
  };
  for (const q of QUESTIONS) {
    if (!need[q.id]) continue;
    if (l.answered[q.id] && now - l.answered[q.id] < q.again * DAY) continue;
    if (l.skipped[q.id] && now - l.skipped[q.id] < 14 * DAY) continue;
    return q;
  }
  return null;
}

const clean = (t: string) => t.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').slice(0, 80);

function addTold(terms: Term[], text: string, kind: Term['kind'], now: number): Term[] {
  const key = text.toLowerCase();
  const rest = terms.filter((t) => t.text.toLowerCase() !== key);
  return [{ text, kind, n: 2, last: now, src: 'told' }, ...rest];
}

export function answerQuestion(id: CoachQuestion['id'], value: string | string[], now = Date.now()) {
  updateLearner((l) => {
    const base = { ...l, lastAsked: now, answered: { ...l.answered, [id]: now } };
    if (id === 'audience') return { ...base, audience: value as string[] };
    if (id === 'hardest') return { ...base, hardest: value as string[] };
    const text = clean(value as string);
    if (!text) return base;
    if (id === 'upcoming') return { ...base, upcoming: { text, t: now } };
    if (id === 'person') return { ...base, terms: addTold(l.terms, text.replace(/^(my |the )/i, ''), 'person', now) };
    return { ...base, terms: addTold(l.terms, text, 'project', now) };
  });
}

export function skipQuestion(id: CoachQuestion['id'], now = Date.now()) {
  updateLearner((l) => ({ ...l, lastAsked: now, skipped: { ...l.skipped, [id]: now } }));
}

// ---------- editing what the coach knows ----------

export function forgetTerm(text: string) {
  const key = text.toLowerCase();
  updateLearner((l) => ({ ...l, terms: l.terms.map((t) => (t.text.toLowerCase() === key ? { ...t, hidden: true } : t)) }));
}

export function tellTerm(text: string, kind: Term['kind']) {
  const t = clean(text);
  if (t) updateLearner((l) => ({ ...l, terms: addTold(l.terms, t, kind, Date.now()) }));
}

export function clearUpcoming() {
  updateLearner((l) => ({ ...l, upcoming: null }));
}

/** One line for AI prompts describing the user's world. */
export function worldLine(s: State): string {
  const l = s.learner;
  const parts: string[] = [];
  const projects = knownTerms(l.terms, 'project').map((t) => t.text).slice(0, 5);
  const people = knownTerms(l.terms, 'person').map((t) => t.text).slice(0, 5);
  const things = knownTerms(l.terms, 'term').map((t) => t.text).slice(0, 5);
  if (projects.length) parts.push(`Their projects: ${projects.join(', ')}.`);
  if (things.length) parts.push(`Names from their work: ${things.join(', ')}.`);
  if (people.length) parts.push(`People they work with: ${people.join(', ')}.`);
  if (l.audience.length) parts.push(`They mostly speak to: ${l.audience.map((a) => AUDIENCE_PHRASE[a] ?? a).join(', ')}.`);
  const up = upcoming(l);
  if (up) parts.push(`Coming up: ${up}.`);
  return parts.join(' ');
}
