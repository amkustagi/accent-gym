// Follow-up questions that work on the phone with no AI: realistic next questions per situation.
// The AI version (lib/ai.ts followUp) is used when Pro or an API key is available.
import type { CategoryId, Scenario } from './scenarios';
import { analyzeDirectness } from '../engine/direct';
import { countWords } from '../engine/text';

const PERSONA: Record<CategoryId, string> = {
  update: 'Your manager',
  pushback: 'Your manager',
  influence: 'A skeptical colleague',
  problem: 'Your director',
  intro: 'A new colleague',
  interview: 'The interviewer',
  impromptu: 'Your director',
  client: 'The client',
  present: 'Someone in the audience',
  negotiate: 'The other side',
  feedback: 'Your teammate',
  network: 'The person you just met',
};

const BANK: Record<CategoryId, string[]> = {
  update: ['What\'s the one risk that could push this out?', 'When exactly will that be done?', 'What do you need from me to unblock it?', 'Is that on track or behind? Give me a straight answer.', 'If you had to cut one thing, what would it be?'],
  pushback: ['I hear you, but the date can\'t move. What can you deliver by then?', 'What would it take to make the original date work?', 'Why didn\'t this come up earlier?', 'Who else could pick this up?', 'What exactly do you need from me to say yes?'],
  influence: ['What\'s the evidence that your way is better?', 'What do we lose if we go with your option?', 'We tried something like that before and it didn\'t work. Why is this different?', 'How much will it cost and who pays for it?', 'What would change your mind?'],
  problem: ['How did this happen, in one sentence?', 'What are you doing about it right now?', 'Who\'s affected, and do they know?', 'How do we stop it from happening again?', 'What do you need me to decide?'],
  intro: ['What are you working on right now?', 'How can I help you in your first month?', 'What did you do before this?', 'What should I come to you for?', 'What\'s your biggest priority this quarter?'],
  interview: ['Can you give me a specific example?', 'What was your part, not the team\'s?', 'What would you do differently next time?', 'How did you measure success?', 'Why should we pick you over the other candidates?'],
  impromptu: ['Can you give me that in one sentence?', 'What\'s your recommendation?', 'What makes you confident about that?', 'What would you do first?', 'What\'s the biggest risk you see?'],
  client: ['Why should we pay for that?', 'When will we see results?', 'What happens if it doesn\'t work?', 'Your competitor quoted us less. Why are you worth more?', 'What do you need from our side?'],
  present: ['Can you go back to the main point?', 'Where does that number come from?', 'What do you want us to do after this?', 'How does this affect my team?', 'What\'s the timeline?'],
  negotiate: ['That\'s more than we budgeted. Can you do better?', 'What can you give us if we sign today?', 'Why that number?', 'What happens if we walk away?', 'What matters most to you here?'],
  feedback: ['Can you give me a specific example?', 'What should I do differently next time?', 'Is this a big deal or a small thing?', 'Why didn\'t you tell me sooner?', 'How will I know I\'ve fixed it?'],
  network: ['So what do you actually do day to day?', 'What are you looking for right now?', 'How did you get into that?', 'Who should I introduce you to?', 'What\'s the best way to stay in touch?'],
};

const GENERIC = ['Can you say that more simply?', 'What\'s the bottom line?', 'What do you need from me?', 'Why does that matter?', 'What happens next?'];

/** The next question for this scenario that hasn't been asked yet in the conversation. */
export function localFollowUp(scenario: Scenario, asked: string[]): { question: string; persona: string } {
  const pool = [...(BANK[scenario.category] ?? []), ...GENERIC];
  const fresh = pool.filter((q) => !asked.includes(q));
  const list = fresh.length ? fresh : pool;
  const question = list[Math.floor(Math.random() * list.length)];
  return { question, persona: PERSONA[scenario.category] ?? 'Your colleague' };
}

// ---------- follow-ups that react to what you said (no AI needed) ----------


export interface FollowUpQ {
  question: string;
  persona: string;
  /** Why the listener asked this, in a few words (shown under the question). */
  why?: string;
}

/** Categories where a real listener expects a number. */
const WANTS_NUMBER: CategoryId[] = ['update', 'problem', 'client', 'negotiate', 'present', 'influence', 'pushback'];
/** Small-talk situations: no answer or ask is expected. */
const SOCIAL: CategoryId[] = ['intro', 'network'];
/** Categories where a real listener expects a date or deadline. */
const WANTS_DATE: CategoryId[] = ['update', 'problem', 'pushback', 'client', 'influence'];

const NUMBER_RE = /\b\d[\d,.]*\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred|thousand|million|billion|half|percent|dozen)\b/i;
const DATE_RE = /\b(?:today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|week|weeks|month|months|quarter|q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december|eod|end of (?:day|week|month)|by (?:the )?\w+|deadline|days?|hours?)\b/i;

/** "Sorry, what do you need from me?" in the words a person in this situation would use. */
const NO_POINT: Record<CategoryId, string> = {
  update: 'Sorry, I lost you. Are we on track or not?',
  pushback: 'So what are you actually asking me for?',
  influence: 'Okay, but what exactly are you proposing?',
  problem: 'Hang on. What do you need me to decide?',
  intro: 'Sorry, so what is it you do?',
  interview: 'Let me stop you. What\'s the short answer?',
  impromptu: 'Sorry, what\'s your recommendation?',
  client: 'I\'m not following. What are you proposing we do?',
  present: 'What\'s the main point here?',
  negotiate: 'So what\'s your number?',
  feedback: 'Sorry, what\'s the actual feedback?',
  network: 'So what are you working on these days?',
};

/**
 * The next question, reacting to the answer the way a busy listener would: no point → "what do you
 * need?", a long build-up → "short version?", hedging → "yes or no?", vague → "what's the number?" /
 * "by when?". Each reaction is used once per conversation; otherwise a realistic question from the bank.
 */
export function reactiveFollowUp(scenario: Scenario, answer: string, asked: string[]): FollowUpQ {
  const persona = PERSONA[scenario.category] ?? 'Your colleague';
  const fresh = (q: string) => !asked.includes(q);
  const n = countWords(answer);
  const d = analyzeDirectness(answer);
  const candidates: FollowUpQ[] = [];
  if (n < 6) candidates.push({ question: 'Sorry, I didn\'t catch that. What\'s your answer, in one sentence?', persona, why: 'Your answer was very short' });
  else {
    // Introductions and networking have no "ask" to wait for, so only check for the point elsewhere.
    if (d.wordsToPoint === null && !SOCIAL.includes(scenario.category)) candidates.push({ question: NO_POINT[scenario.category] ?? 'Sorry, what do you need from me?', persona, why: 'They never heard your point' });
    else if (d.wordsToPoint !== null && d.wordsToPoint > 20) candidates.push({ question: 'Can you give me the short version?', persona, why: `Your point came after ${d.wordsToPoint} words` });
    if (d.hedges.length >= 2 || (d.hedges.length && /\b(?:maybe|i think|i guess|probably|not sure)\b/i.test(answer.slice(0, 80))))
      candidates.push({ question: 'You sound unsure. Is that a yes or a no?', persona, why: `You hedged ("${d.hedges[0]}")` });
    if (n > 130) candidates.push({ question: 'That\'s a lot. What\'s the one thing I should remember?', persona, why: `${n} words is long for one answer` });
    if (WANTS_NUMBER.includes(scenario.category) && !NUMBER_RE.test(answer)) candidates.push({ question: 'Can you put a number on that?', persona, why: 'No numbers in your answer' });
    if (WANTS_DATE.includes(scenario.category) && !DATE_RE.test(answer)) candidates.push({ question: 'By when?', persona, why: 'No date or deadline' });
  }
  const reaction = candidates.find((c) => fresh(c.question));
  if (reaction) return reaction;
  return localFollowUp(scenario, asked);
}

export interface Turn {
  q: string;
  a: string;
  score?: number;
}

export interface Debrief {
  answers: number;
  avgScore: number | null;
  best: { q: string; score: number } | null;
  /** Average words before the point, over answers where a point was found. */
  avgWordsToPoint: number | null;
  /** Answers where no point was heard. */
  missedPoint: number;
  hedged: number;
  headline: string;
  next: string;
}

/** End-of-conversation summary: how the whole back-and-forth went and one thing to practice. */
export function conversationDebrief(turns: Turn[]): Debrief {
  const answered = turns.filter((t) => countWords(t.a) > 0);
  const scored = answered.filter((t) => typeof t.score === 'number') as Required<Turn>[];
  const avgScore = scored.length ? Math.round(scored.reduce((a, t) => a + t.score, 0) / scored.length) : null;
  const best = scored.length ? scored.reduce((b, t) => (t.score > b.score ? t : b)) : null;
  const ds = answered.map((t) => analyzeDirectness(t.a));
  const withPoint = ds.filter((d) => d.wordsToPoint !== null);
  const avgWordsToPoint = withPoint.length ? Math.round(withPoint.reduce((a, d) => a + (d.wordsToPoint ?? 0), 0) / withPoint.length) : null;
  const missedPoint = ds.length - withPoint.length;
  const hedged = ds.filter((d) => d.hedges.length > 0).length;

  let headline: string;
  let next: string;
  if (!answered.length) {
    headline = 'No answers recorded yet.';
    next = 'Answer the first question out loud to start the conversation.';
  } else if (missedPoint > answered.length / 2) {
    headline = `They had to dig for your point in ${missedPoint} of ${answered.length} answers.`;
    next = 'Open every answer with the answer itself: "Yes", "We need…", "I recommend…". Then one reason.';
  } else if (avgWordsToPoint !== null && avgWordsToPoint > 15) {
    headline = `You got to the point after about ${avgWordsToPoint} words on average.`;
    next = 'Aim for under 10 words before your point. Cut the set-up and say it first.';
  } else if (hedged > answered.length / 2) {
    headline = `Clear points, but you hedged in ${hedged} of ${answered.length} answers.`;
    next = 'Drop "I think", "maybe" and "kind of" under pressure. State it as fact, then stop.';
  } else {
    headline = avgWordsToPoint !== null ? `Direct all the way through: point after about ${avgWordsToPoint} words.` : 'You held the conversation well.';
    next = 'Next time, try a harder listener: the Pressure round or a fresh scenario.';
  }
  return { answers: answered.length, avgScore, best: best ? { q: best.q, score: best.score } : null, avgWordsToPoint, missedPoint, hedged, headline, next };
}
