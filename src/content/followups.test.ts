import { describe, expect, it } from 'vitest';
import { conversationDebrief, reactiveFollowUp } from './followups';
import type { Scenario } from './scenarios';

const update: Scenario = { id: 't-update', category: 'update', context: 'Weekly sync', prompt: 'Give your manager a status update on the launch.', frame: ['Status', 'Risk', 'Next step'], secs: 45 };
const intro: Scenario = { id: 't-intro', category: 'intro', context: 'New team', prompt: 'Introduce yourself.', frame: ['Who', 'What', 'Ask'], secs: 30 };

describe('reactiveFollowUp (#17: real back-and-forth without AI)', () => {
  it('asks for the point when the answer never makes one', () => {
    const q = reactiveFollowUp(update, 'so there has been a lot going on with the vendor and the design team and various other things happening across the board this week', []);
    expect(q.question).toBe('Sorry, I lost you. Are we on track or not?');
    expect(q.persona).toBe('Your manager');
    expect(q.why).toMatch(/point/i);
  });

  it('asks for the short version when the point comes late', () => {
    const late = 'so as you know there were a lot of moving parts with the vendor and the design team and finance and legal all weighing in over the last few weeks on various things and then finally we are on track for the 12th of March';
    expect(reactiveFollowUp(update, late, []).question).toBe('Can you give me the short version?');
  });

  it('pushes back on hedging', () => {
    const q = reactiveFollowUp(update, 'I think we are maybe on track, I guess, for the March 12 launch with 3 people', []);
    expect(q.question).toBe('You sound unsure. Is that a yes or a no?');
  });

  it('asks for a number and then a date when they are missing', () => {
    const vague = 'We are on track. The team finished the hard part and the vendor delivered what we asked for.';
    const first = reactiveFollowUp(update, vague, []);
    expect(first.question).toBe('Can you put a number on that?');
    const second = reactiveFollowUp(update, vague, [first.question]);
    expect(second.question).toBe('By when?');
  });

  it('never repeats a question and falls back to the bank once reactions are used', () => {
    const asked: string[] = [];
    const vague = 'We are on track. The team finished the hard part and the vendor delivered what we asked for.';
    for (let i = 0; i < 6; i++) {
      const q = reactiveFollowUp(update, vague, asked);
      expect(asked).not.toContain(q.question);
      asked.push(q.question);
    }
  });

  it('a clear, specific answer gets a normal question for that situation', () => {
    const q = reactiveFollowUp(intro, 'I lead the payments team. We ship the checkout. Come to me for anything about refunds.', []);
    expect(q.why).toBeUndefined();
    expect(q.persona).toBe('A new colleague');
  });

  it('asks again when the answer is almost empty', () => {
    expect(reactiveFollowUp(update, 'um yes', []).question).toMatch(/didn't catch/);
  });
});

describe('conversationDebrief', () => {
  it('flags a conversation where the point was missing', () => {
    const d = conversationDebrief([
      { q: 'Status?', a: 'so there has been a lot happening with the vendor and the team', score: 50 },
      { q: 'Are we on track?', a: 'well it is complicated with many moving parts', score: 45 },
      { q: 'By when?', a: 'We need two more weeks, so the 20th.', score: 80 },
    ]);
    expect(d.answers).toBe(3);
    expect(d.missedPoint).toBe(2);
    expect(d.avgScore).toBe(58);
    expect(d.best).toEqual({ q: 'By when?', score: 80 });
    expect(d.headline).toMatch(/dig for your point in 2 of 3/);
  });

  it('praises a direct conversation', () => {
    const d = conversationDebrief([
      { q: 'Status?', a: 'We are on track for March 12.', score: 85 },
      { q: 'Risk?', a: 'The risk is the vendor API. We have a fallback.', score: 82 },
    ]);
    expect(d.missedPoint).toBe(0);
    expect(d.headline).toMatch(/^Direct all the way through/);
  });

  it('handles no answers', () => {
    expect(conversationDebrief([{ q: 'Status?', a: '' }]).answers).toBe(0);
  });
});
