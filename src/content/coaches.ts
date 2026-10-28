// The Tiny Hustler coaches. Same feedback, different personalities: the user picks the one they like.

export type CoachId = 'hustle' | 'mira' | 'pip';

export interface Coach {
  id: CoachId;
  name: string;
  /** Short role shown under the name. */
  role: string;
  blurb: string;
  /** Kokoro voice used when the natural voice is on. */
  voice: string;
  /** Accent color for bubbles and highlights. */
  color: string;
  hello: string[];
  /** How this coach phrases praise and a nudge. */
  praise: string[];
  nudge: string[];
}

export const COACHES: Coach[] = [
  {
    id: 'hustle', name: 'Hustle', role: 'The coach', voice: 'am_michael', color: '#E0761A',
    blurb: 'High energy. Pushes you to get to the point and cheers when you do.',
    hello: ['Ready when you are. One point, first sentence.', 'Let\'s go. Say the ask first.', 'Short and sharp today. You\'ve got this.'],
    praise: ['That\'s it!', 'Sharp.', 'Now that\'s a leader talking.'],
    nudge: ['Close.', 'Let\'s tighten that.', 'Good start, now cut to it.'],
  },
  {
    id: 'mira', name: 'Mira', role: 'The mentor', voice: 'af_heart', color: '#0F766E',
    blurb: 'Calm senior mentor. Explains the why and gives one fix at a time.',
    hello: ['Take a breath. What is the one thing they need to hear?', 'Before you speak, decide your first sentence.', 'Lead with the answer. The detail can wait.'],
    praise: ['Clear and direct. Well done.', 'That would land well with a director.', 'Good. That was easy to follow.'],
    nudge: ['One thing to change.', 'Here is the fix.', 'Almost there.'],
  },
  {
    id: 'pip', name: 'Pip', role: 'The sidekick', voice: 'af_bella', color: '#2563EB',
    blurb: 'A tiny fox spirit. Playful, encouraging, never boring.',
    hello: ['Hi! Tap the mic and tell me one thing.', 'Ears up! What\'s your point today?', 'Quick one: say it like a headline.'],
    praise: ['Yes! Straight to the point!', 'Ooh, crisp!', 'That was snappy!'],
    nudge: ['Hmm, a little long.', 'Let\'s trim it!', 'Nearly! One more go?'],
  },
];

export const coachById = (id: string | undefined): Coach => COACHES.find((c) => c.id === id) ?? COACHES[0];

/** A stable pick from a list, so the same day shows the same line. */
export function dailyLine(lines: string[], seed = new Date().toDateString()): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return lines[Math.abs(h) % lines.length];
}
