import type { Skill } from '../engine/score';
import type { DrillId } from './catalog';

export interface Lesson {
  id: string;
  skill: Skill;
  title: string;
  rule: string;
  why: string;
  points: string[];
  examples?: { weak: string; strong: string }[];
  practice: DrillId;
}

export const LESSONS: Lesson[] = [
  {
    id: 'l-apology', skill: 'language', title: 'Stop apologizing for existing',
    rule: 'Apologize for mistakes, not for asking, speaking, or taking time.',
    why: 'Every unnecessary "sorry" tells the room your point is an imposition. Listeners lower their estimate of your confidence before they hear your idea.',
    points: ['Replace "sorry" with "thank you" when someone waited for you.', 'Replace "sorry to bother you" with the question itself.', 'Keep one real apology for a real mistake, then move to the fix.'],
    examples: [{ weak: 'Sorry for the delay.', strong: 'Thanks for your patience.' }, { weak: 'Sorry, quick question?', strong: 'One question about the budget:' }],
    practice: 'swaps',
  },
  {
    id: 'l-hedges', skill: 'language', title: 'Drop the hedges',
    rule: 'Say what you think as a statement, then give your reason.',
    why: '"I think", "maybe", "kind of" and "just" make a strong idea sound like a guess. Decision-makers act on clear recommendations.',
    points: ['"I think we should" becomes "I recommend".', '"I\'ll try" becomes "I will" plus a date.', 'If you are uncertain, say so once with a number: "I\'m 70% confident."'],
    examples: [{ weak: 'I think maybe we should wait?', strong: 'I recommend we wait two weeks for the test results.' }],
    practice: 'swaps',
  },
  {
    id: 'l-regional', skill: 'language', title: 'Global business English',
    rule: 'Use phrases your North American colleagues use every day.',
    why: 'Phrases common in Indian English, like "do the needful", "revert", or "prepone", are perfectly correct where they come from, but they can distract or confuse listeners elsewhere.',
    points: ['"Revert" → "reply" or "get back to me".', '"Do the needful" → name the exact action.', '"I have a doubt" → "I have a question".', '"Kindly" → "Could you".'],
    examples: [{ weak: 'Kindly revert at the earliest.', strong: 'Could you reply by end of day?' }],
    practice: 'swaps',
  },
  {
    id: 'l-fillers', skill: 'fillers', title: 'Pause instead of filling',
    rule: 'When you feel "um" coming, close your mouth and pause.',
    why: 'Fillers happen when your mouth runs ahead of your thinking. A one-second silence feels long to you but sounds deliberate to everyone else.',
    points: ['Close your lips at the end of each sentence; you can\'t say "um" with your mouth closed.', 'Plan your first sentence before you speak.', 'Slow down. Fillers rise with speed.'],
    practice: 'pauses',
  },
  {
    id: 'l-bluf', skill: 'language', title: 'BLUF: bottom line up front',
    rule: 'Start with the conclusion, then the reasons.',
    why: 'Busy people decide in the first 15 seconds whether to keep listening. Leading with the answer respects their time and makes you sound senior.',
    points: ['First sentence: the answer, decision, or ask.', 'Then two or three supporting points.', 'End by restating the ask.'],
    examples: [{ weak: 'So we looked at a lot of vendors and there were many factors…', strong: 'We should pick Vendor B. It\'s 20% cheaper and ships a month sooner.' }],
    practice: 'structure',
  },
  {
    id: 'l-prep', skill: 'language', title: 'PREP for opinions',
    rule: 'Point, Reason, Example, Point.',
    why: 'When someone asks "what do you think?", a frame stops you from rambling and makes your answer easy to follow.',
    points: ['Point: your answer in one sentence.', 'Reason: why.', 'Example: one concrete case or number.', 'Point: repeat the answer.'],
    practice: 'structure',
  },
  {
    id: 'l-star', skill: 'language', title: 'STAR for stories',
    rule: 'Situation, Task, Action, Result.',
    why: 'Interviewers and leaders remember stories with a clear result. STAR keeps you from spending 80% of your time on background.',
    points: ['Situation and Task: two sentences, total.', 'Action: what you did. Say "I", not "we".', 'Result: a number or a concrete outcome.'],
    practice: 'structure',
  },
  {
    id: 'l-concise', skill: 'language', title: 'Say less',
    rule: 'Make the point, then stop talking.',
    why: 'Long answers bury the point and invite interruption. Short answers signal you know exactly what you think.',
    points: ['One idea per sentence.', 'Cut warm-up phrases like "So basically what I wanted to say is…".', 'End on your point or your ask, not "so yeah".'],
    practice: 'concision',
  },
  {
    id: 'l-pace', skill: 'pace', title: 'Find your pace',
    rule: 'Aim for 130–160 words per minute.',
    why: 'Nerves speed people up. Too fast sounds anxious and is hard to follow, especially with an accent. A steady pace sounds calm and in control.',
    points: ['Slow down most on numbers, names, and your key point.', 'It will feel slow to you. It sounds right to them.', 'Use the pace trainer to feel 140 words per minute.'],
    practice: 'pace',
  },
  {
    id: 'l-pauses', skill: 'pauses', title: 'The power of the pause',
    rule: 'Pause for about one second after each key point.',
    why: 'Pauses let your point land, give listeners time to process, and give you time to think. Confident speakers are comfortable with silence.',
    points: ['Pause before your most important word.', 'Pause after a number.', 'Hesitations over 2.5 seconds read as lost; a frame helps you avoid them.'],
    practice: 'pauses',
  },
  {
    id: 'l-variety', skill: 'variety', title: 'Bring your voice to life',
    rule: 'Lift the key word, and drop your pitch at the end of statements.',
    why: 'A flat voice sounds bored or nervous. Pitch movement tells listeners what matters. Rising at the end turns statements into questions.',
    points: ['Choose one word per sentence to stress: louder, longer, higher.', 'End statements going down, like you mean it.', 'Smile slightly; it lifts your tone.'],
    practice: 'variety',
  },
  {
    id: 'l-clarity', skill: 'clarity', title: 'Crisp articulation',
    rule: 'Open your jaw and finish every consonant.',
    why: 'Most unclear speech is lazy mouth movement, not accent. Word endings (t, d, s, k) carry meaning; dropping them makes people ask "sorry?"',
    points: ['Warm up for two minutes before important meetings.', 'Exaggerate in practice so normal speech is clear.', 'Say numbers slowly: "fifteen" vs "fifty".'],
    practice: 'clarity',
  },
];
