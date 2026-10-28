// Follow-up questions that work on the phone with no AI: realistic next questions per situation.
// The AI version (lib/ai.ts followUp) is used when Pro or an API key is available.
import type { CategoryId, Scenario } from './scenarios';

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
