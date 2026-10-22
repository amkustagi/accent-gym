// Self-learning: adaptive difficulty, spaced repetition, personal habits, personalized content, daily plan.
import { DRILL_FOR_SKILL, type DrillId } from '../content/catalog';
import { SWAPS, swapKey, type SwapCard } from '../content/drills';
import { guessStarting, soundMap, targetById, type AccentId, type MapEntry } from '../content/accents';
import { generateScenario } from '../content/generator';
import { SCENARIOS, type CategoryId, type Scenario } from '../content/scenarios';
import { FILLER_RULES, WEAK_RULES, analyzeText } from '../engine/text';
import { SKILLS, type Skill } from '../engine/score';
import { getState, setState, skillAverages, soundScore, todayKey, type State } from '../store/store';
import { hasWorld, learnedCategoryBoost, learnedPlanSize, personalPack, preferDrill, upcoming } from './learner';

// ---------- adaptive difficulty ----------

export function levelFor(s: State, drill: DrillId): number {
  return s.adapt[drill]?.level ?? 2;
}

/** Two strong rounds in a row raise the level; two weak ones lower it. */
export function recordScore(drill: DrillId, score: number) {
  setState((s) => {
    const cur = s.adapt[drill] ?? { level: 2, recent: [] };
    const recent = [...cur.recent, score].slice(-4);
    let lvl = cur.level;
    const last2 = recent.slice(-2);
    if (last2.length === 2 && last2.every((x) => x >= 85)) lvl = Math.min(5, lvl + 1);
    else if (last2.length === 2 && last2.every((x) => x <= 55)) lvl = Math.max(1, lvl - 1);
    const changed = lvl !== cur.level;
    return { ...s, adapt: { ...s.adapt, [drill]: { level: lvl, recent: changed ? [] : recent } } };
  });
}

export function nudgeLevel(drill: DrillId, dir: 1 | -1) {
  setState((s) => {
    const cur = s.adapt[drill] ?? { level: 2, recent: [] };
    return { ...s, adapt: { ...s.adapt, [drill]: { level: Math.max(1, Math.min(5, cur.level + dir)), recent: [] } } };
  });
}

export const LEVEL_LABEL = ['Gentle', 'Standard', 'Challenging', 'Hard', 'Expert'];

// ---------- spaced repetition (Leitner boxes) ----------

const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export function reviewCard(key: string, correct: boolean) {
  setState((s) => {
    const c = s.srs[key] ?? { box: 0, due: 0, seen: 0, right: 0 };
    const box = correct ? Math.min(INTERVAL_DAYS.length - 1, c.box + 1) : 0;
    const due = Date.now() + INTERVAL_DAYS[box] * 864e5 - 3600e3;
    return { ...s, srs: { ...s.srs, [key]: { box, due, seen: c.seen + 1, right: c.right + (correct ? 1 : 0) } } };
  });
}

export function dueCount(s: State): number {
  const now = Date.now();
  return SWAPS.filter((c) => {
    const st = s.srs[swapKey(c)];
    return st && st.due <= now;
  }).length;
}

/**
 * Builds a swap round: cards for the user's own habits first, then due reviews, then new cards,
 * then the ones they get wrong most. Mastered cards (box 5) appear only when due.
 */
export function buildSwapDeck(s: State, n = 8, focus?: string): SwapCard[] {
  const now = Date.now();
  const habitRules = new Set(habits(s, 14).slice(0, 3).map((h) => h.ruleId));
  const score = (c: SwapCard) => {
    const st = s.srs[swapKey(c)];
    let w = Math.random() * 0.5;
    if (focus && c.rule === focus) w += 10;
    if (c.rule && habitRules.has(c.rule)) w += 3;
    if (!st) w += 2;
    else if (st.due <= now) w += 4 + (5 - st.box);
    else w -= 3 + st.box;
    if (s.votes[swapKey(c)] === -1) w -= 6;
    // Regional cards target South Asian business English; de-prioritize them for other speakers.
    const southAsian = /hindi|tamil|telugu|kannada|malayalam|marathi|bengali|gujarati|punjabi|urdu|odia|indian/i.test(s.profile.nativeLanguage);
    if (c.tag === 'regional' && s.profile.nativeLanguage && !southAsian) w -= 2;
    return w;
  };
  return [...SWAPS].sort((a, b) => score(b) - score(a)).slice(0, n).sort(() => Math.random() - 0.5);
}

// ---------- habits from the user's own transcripts ----------

export interface Habit {
  ruleId: string;
  label: string;
  kind: 'weak' | 'filler';
  thisWeek: number;
  lastWeek: number;
  total: number;
}

export function habits(s: State, days = 14): Habit[] {
  const now = Date.now();
  const map = new Map<string, Habit>();
  s.sessions
    .filter((x) => x.transcript && now - x.t < days * 864e5)
    .forEach((x) => {
      const r = analyzeText(x.transcript);
      const week = now - x.t < 7 * 864e5 ? 'thisWeek' : 'lastWeek';
      [...r.weakByRule.map((e) => ({ ...e, kind: 'weak' as const })), ...r.fillerByRule.map((e) => ({ ...e, kind: 'filler' as const }))].forEach((e) => {
        const h = map.get(e.rule.id) ?? { ruleId: e.rule.id, label: e.rule.label, kind: e.kind, thisWeek: 0, lastWeek: 0, total: 0 };
        h[week] += e.count;
        h.total += e.count;
        map.set(e.rule.id, h);
      });
    });
  return [...map.values()].sort((a, b) => b.thisWeek - a.thisWeek || b.total - a.total);
}

export const ruleLabel = (id: string) => [...WEAK_RULES, ...FILLER_RULES].find((r) => r.id === id)?.label ?? id;

// ---------- personalized scenario choice ----------

const GOAL_CATS: Record<string, CategoryId[]> = {
  meetings: ['update', 'pushback', 'influence', 'problem'],
  interviews: ['interview', 'impromptu', 'intro'],
  presenting: ['present', 'impromptu', 'influence'],
  everyday: ['network', 'intro', 'client', 'feedback'],
};
const SITUATION_CATS: Record<string, CategoryId[]> = {
  standups: ['update'],
  client: ['client'],
  presentations: ['present'],
  leadership: ['influence', 'problem', 'update'],
  interviews: ['interview'],
  negotiation: ['negotiate'],
  feedback: ['feedback'],
  networking: ['network', 'intro'],
};
const CHALLENGE_CATS: Record<string, CategoryId[]> = {
  blank: ['impromptu'],
  interrupt: ['pushback'],
  ramble: ['update', 'impromptu'],
};

export function categoryWeights(s: State): Map<CategoryId, number> {
  const w = new Map<CategoryId, number>();
  const add = (cs: CategoryId[] | undefined, by: number) => cs?.forEach((c) => w.set(c, (w.get(c) ?? 1) + by));
  add(GOAL_CATS[s.profile.goal], 2);
  s.profile.situations.forEach((x) => add(SITUATION_CATS[x], 1.5));
  s.profile.challenges.forEach((x) => add(CHALLENGE_CATS[x], 1));
  learnedCategoryBoost(s.learner).forEach((by, c) => w.set(c, (w.get(c) ?? 1) + by));
  // Practice what you've done least recently.
  const recent = s.sessions.slice(-20);
  const catOf = (x: (typeof recent)[number]) => x.category ?? SCENARIOS.find((sc) => sc.id === x.itemId || sc.prompt === x.title)?.category;
  w.forEach((v, c) => {
    const n = recent.filter((x) => catOf(x) === c).length;
    w.set(c, v / (1 + n * 0.3));
  });
  return w;
}

function weightedPick<T>(items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + Math.max(0, w), 0);
  let r = Math.random() * total;
  for (const [it, w] of items) {
    r -= Math.max(0, w);
    if (r <= 0) return it;
  }
  return items[items.length - 1][0];
}

/** Picks the next scenario: generated from the user's role (if allowed) or an unseen hand-written one. */
export function nextScenario(opts: { category?: CategoryId; allowGenerated: boolean; drill?: DrillId; exclude?: string } = { allowGenerated: true }): Scenario {
  const s = getState();
  const level = levelFor(s, opts.drill ?? 'simulator');
  const weights = categoryWeights(s);
  const category = opts.category ?? weightedPick<CategoryId>(
    (['update', 'pushback', 'influence', 'problem', 'intro', 'client', 'present', 'negotiate', 'feedback', 'network', 'interview', 'impromptu'] as CategoryId[]).map((c) => [c, weights.get(c) ?? 1]),
  );
  const curated = SCENARIOS.filter((x) => x.category === category && x.id !== opts.exclude && s.votes[x.id] !== -1);
  const unseen = curated.filter((x) => !s.seen[x.id]);
  // Once the coach knows the user's world, generated scenarios (which use it) come up more often.
  const useGenerated = opts.allowGenerated && (unseen.length === 0 || Math.random() < (hasWorld(s) ? 0.75 : 0.6));
  if (useGenerated || curated.length === 0) {
    return generateScenario({ role: s.profile.role, pack: hasWorld(s) ? personalPack(s) : undefined, category, level });
  }
  const pool = unseen.length ? unseen : curated;
  const sc = pool[Math.floor(Math.random() * pool.length)];
  const delta = [15, 5, 0, -5, -10][level - 1];
  return { ...sc, secs: Math.max(20, sc.secs + delta) };
}

// ---------- daily plan ----------

export interface PlanItem {
  drill: DrillId;
  reason: string;
  done: boolean;
  param?: string;
}

const CHALLENGE_SKILL: Record<string, Skill> = { fillers: 'fillers', apologize: 'language', fast: 'pace', flat: 'variety', understood: 'clarity', ramble: 'language' };

export function todayPlan(s: State): PlanItem[] {
  const avgs = skillAverages(s);
  const today = s.days[todayKey()] ?? {};
  const skills = (['language', 'fillers', 'pace', 'pauses', 'variety', ...(s.profile.accentGoal !== 'none' ? ['clarity'] : [])] as Skill[]).filter((k) => avgs[k] !== undefined).sort((a, b) => avgs[a]! - avgs[b]!);
  const fromChallenge = s.profile.challenges.map((c) => CHALLENGE_SKILL[c]).find(Boolean);
  // The coach's focus skill holds for a week or more, so practice adds up instead of jumping around.
  const focus = s.learner.focus && avgs[s.learner.focus.skill] !== undefined ? s.learner.focus : null;
  const weakest = focus?.skill ?? skills[0] ?? fromChallenge;
  const learner = s.learner;
  const pick = (d: DrillId) => preferDrill(learner, d, (x) => x !== 'pronunciation' || s.profile.accentGoal !== 'none');
  const items: { drill: DrillId; reason: string; param?: string }[] = [];
  if (s.profile.minutes >= 10) items.push({ drill: 'warmup', reason: 'Wake up your voice' });

  const top = habits(s, 7)[0];
  if (top && top.thisWeek >= 3 && SWAPS.some((c) => c.rule === top.ruleId)) items.push({ drill: 'swaps', reason: `Your habit: "${top.label}" ×${top.thisWeek} this week`, param: `habit:${top.ruleId}` });

  if (weakest) {
    const d = pick(DRILL_FOR_SKILL[weakest]);
    const name = SKILLS.find((k) => k.id === weakest)?.name.toLowerCase() ?? weakest;
    const now = avgs[weakest];
    const reason = focus
      ? now !== undefined && now > focus.start ? `This week's focus: ${name}, up from ${focus.start} to ${now}` : `This week's focus: ${name}`
      : skills.length ? 'Your lowest skill lately' : 'From your goals';
    if (!items.some((i) => i.drill === d)) items.push({ drill: d, reason });
  } else items.push({ drill: 'pace', reason: 'Find your speaking pace' });

  // The accent goal is the user's explicit choice, so it comes before the general drills.
  if (s.profile.accentGoal !== 'none') {
    const target = s.profile.accentGoal as AccentId;
    const checked = s.accentChecks.some((c) => c.target === target);
    const next = nextSoundFor(s);
    if (!checked) items.push({ drill: 'accentcheck', reason: `Find your ${targetById(target).adjective} sounds to fix` });
    else if (next) items.push({ drill: 'pronunciation', reason: `${targetById(target).adjective} sound: ${next.feature.name}`, param: next.feature.id });
  }
  const due = dueCount(s);
  if (!items.some((i) => i.drill === 'swaps')) {
    const w = due ? 'swaps' : pick('swaps');
    if (!items.some((i) => i.drill === w)) items.push({ drill: w, reason: due ? `${due} cards due for review` : 'Build confident wording' });
  }

  if (s.profile.accentGoal !== 'none' && s.profile.minutes >= 15) items.push({ drill: 'shadow', reason: 'Copy a native speaker\'s melody' });
  if (s.profile.minutes >= 15 && skills[1]) {
    const d2 = pick(DRILL_FOR_SKILL[skills.find((k) => k !== weakest) ?? skills[1]]);
    if (!items.some((i) => i.drill === d2)) items.push({ drill: d2, reason: 'Second focus skill' });
  }
  const simLevel = levelFor(s, 'simulator');
  const soon = upcoming(learner);
  if (soon) items.push({ drill: 'simulator', reason: `Practice for: ${soon}`, param: 'upcoming' });
  else items.push(simLevel >= 3 ? { drill: pick('pressure'), reason: 'You\'re ready for cold questions' } : { drill: 'simulator', reason: hasWorld(s) ? 'A scenario about your own work' : 'A scenario from your world' });

  // Plan length follows how much the user actually does on a typical day.
  const max = learnedPlanSize(s, s.profile.minutes === 5 ? 3 : s.profile.minutes === 10 ? 4 : 6);
  const trimmed = items.length > max ? [...items.slice(0, max - 1), items[items.length - 1]] : items;
  return trimmed.map((i) => ({ ...i, done: (today[i.drill] ?? 0) > 0 }));
}

/** Week-over-week change per skill, for the weekly insight. */
export function weeklyDelta(s: State): { skill: Skill; now: number; prev: number }[] {
  const now = Date.now();
  const thisWeek = s.sessions.filter((x) => now - x.t < 7 * 864e5);
  const lastWeek = s.sessions.filter((x) => now - x.t >= 7 * 864e5 && now - x.t < 14 * 864e5);
  const avg = (xs: typeof thisWeek, k: Skill) => {
    const v = xs.map((x) => x.scores[k]).filter((x): x is number => x !== undefined);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  return (['fillers', 'language', 'pace', 'pauses', 'variety', 'clarity'] as Skill[])
    .map((k) => ({ skill: k, now: avg(thisWeek, k), prev: avg(lastWeek, k) }))
    .filter((x): x is { skill: Skill; now: number; prev: number } => x.now !== null && x.prev !== null);
}

// ---------- accent ----------

export function accentTarget(s: State): AccentId | null {
  return s.profile.accentGoal === 'none' ? null : (s.profile.accentGoal as AccentId);
}

export function accentFrom(s: State): string {
  return s.profile.accentFrom || guessStarting(s.profile.nativeLanguage);
}

/** The sound to practice next: the highest-priority sound scoring under 75, else the first one not yet scored. */
export function nextSoundFor(s: State): MapEntry | null {
  const target = accentTarget(s);
  if (!target) return null;
  const map = soundMap(accentFrom(s), target).slice(0, 12);
  return map.find((e) => (soundScore(s, e.feature.id)?.score ?? 100) < 75) ?? map.find((e) => !soundScore(s, e.feature.id)) ?? map[0] ?? null;
}
