// Directness: how fast a speaker gets to the point, and what slows them down.
// Pure functions over the transcript. Speech-to-text often drops punctuation, so nothing here
// relies on sentences: "the point" is the first phrase that states an answer, ask, decision or status.
import { FILLER_RULES, WEAK_RULES, countWords, tokenize } from './text';

/** Phrases that usually mean "here is the point": an answer, ask, recommendation, decision or status. */
const POINT_MARKERS = [
  'bottom line', 'short answer', 'in short', 'the answer is', 'my answer is', 'yes', 'no',
  'i recommend', 'we recommend', 'my recommendation', 'i suggest', 'i propose', 'i\'d propose',
  'i need', 'we need', 'my ask', 'the ask is', 'i\'m asking', 'i am asking', 'i\'d like you to', 'i would like you to',
  'can you', 'could you', 'would you', 'please approve', 'approve', 'sign off',
  'we decided', 'i decided', 'the decision', 'we should', 'you should', 'let\'s', 'let us', 'go with',
  'on track', 'off track', 'behind schedule', 'ahead of schedule', 'we\'re behind', 'we are behind', 'we\'re late', 'we are late',
  'is done', 'are done', 'is ready', 'are ready', 'is finished', 'will be ready', 'will ship', 'will launch',
  'finishes', 'will finish', 'ships', 'goes live', 'launches', 'is fixed', 'are fixed', 'is complete', 'is completed', 'is blocked', 'are blocked', 'we\'re blocked',
  'the plan is', 'the goal is', 'the problem is', 'the issue is', 'the risk is',
];

/** Openers that clear the throat instead of making a point. */
const THROAT = [
  'so', 'um', 'uh', 'well', 'okay so', 'ok so', 'basically', 'a lot happened', 'as you know', 'just to give some context',
  'to give some context', 'just to give you some background', 'let me start', 'let me explain', 'first of all', 'to be honest',
  'i wanted to', 'i just wanted to', 'there are a few things', 'there are many things', 'it\'s a bit complicated', 'it is complicated',
];

const norm = (t: string) => tokenize(t.toLowerCase().replace(/[’]/g, "'")).join(' ');

function firstIndex(words: string[], phrases: string[]): number | null {
  let best: number | null = null;
  for (const p of phrases) {
    const pw = p.split(' ');
    for (let i = 0; i + pw.length <= words.length; i++) {
      if (best !== null && i >= best) break;
      if (pw.every((w, j) => words[i + j] === w)) {
        best = i;
        break;
      }
    }
  }
  return best;
}

/** Index of the first word that starts the point (answer, ask, decision or status), or null. */
export function pointIndex(text: string): number | null {
  const t = norm(text);
  return firstIndex(t ? t.split(' ') : [], POINT_MARKERS);
}

export interface Directness {
  words: number;
  /** Words spoken before the point, or null if no point was found. */
  wordsToPoint: number | null;
  hedges: string[];
  fillers: number;
  /** The throat-clearing phrase the answer opened with, if any. */
  opener: string | null;
  /** 0–100: higher is more direct. */
  score: number;
  /** One plain sentence about the biggest win or problem. */
  headline: string;
  /** One concrete fix, or null when there is nothing to fix. */
  fix: string | null;
}

export function analyzeDirectness(transcript: string): Directness {
  const text = norm(transcript);
  const words = text ? text.split(' ') : [];
  const n = countWords(transcript);
  const wtp = firstIndex(words, POINT_MARKERS);
  const opener = THROAT.find((t) => (` ${words.slice(0, 6).join(' ')} `).startsWith(` ${t} `)) ?? null;
  const hedges: string[] = [];
  for (const r of WEAK_RULES.filter((x) => x.category === 'hedge')) {
    const m = transcript.match(r.re);
    if (m && m.length > (r.allow ?? 0)) hedges.push(r.label);
  }
  const fillers = FILLER_RULES.reduce((a, r) => a + (transcript.match(r.re)?.length ?? 0), 0);

  let score = 100;
  if (wtp === null) score -= 45;
  else score -= Math.min(45, Math.max(0, wtp - 8) * 2);
  score -= Math.min(24, hedges.length * 6);
  score -= Math.min(20, n ? Math.round((fillers / n) * 100 * 3) : 0);
  if (opener) score -= 8;
  if (n > 120) score -= Math.min(15, Math.round((n - 120) / 5));
  score = Math.max(0, Math.min(100, Math.round(score)));

  let headline: string;
  let fix: string | null = null;
  if (!n) headline = 'I didn\'t catch any words that time.';
  else if (wtp === null) {
    headline = 'I never heard the point: no answer, ask or decision.';
    fix = 'Say the answer in your first sentence: "We need two more weeks", "I recommend X", "Yes, with one condition".';
  } else if (wtp > 15) {
    headline = `You reached your point after ${wtp} words.`;
    fix = `Try it again with the point first. Aim for under 10 words before it.`;
  } else if (hedges.length) {
    headline = wtp <= 3 ? 'Point first. Nice.' : `Point after ${wtp} words. Good.`;
    fix = `Drop the hedge${hedges.length > 1 ? 's' : ''} (${hedges.slice(0, 2).map((h) => `"${h}"`).join(', ')}). State it as fact.`;
  } else if (opener) {
    headline = `Point after ${wtp} words.`;
    fix = `Skip the "${opener}" warm-up and start on the point.`;
  } else if (n > 120) {
    headline = 'Point first, but long overall.';
    fix = `${n} words. Cut it to the point, one reason, and the next step.`;
  } else headline = wtp <= 3 ? 'Point in your first breath. That\'s direct.' : `Point after ${wtp} words. That\'s direct.`;

  return { words: n, wordsToPoint: wtp, hedges, fillers, opener, score, headline, fix };
}

/** What the coach says about a take, in the coach's own voice. */
export function coachLine(d: Directness, coach: { praise: string[]; nudge: string[] }, seed = 0): string {
  const pick = (a: string[]) => a[Math.abs(seed) % a.length];
  if (!d.words) return d.headline;
  return d.fix ? `${pick(coach.nudge)} ${d.headline} ${d.fix}` : `${pick(coach.praise)} ${d.headline}`;
}
