// Meeting simulator scenarios. Each has a frame (the structure to follow) and a time limit.
import { MORE_CONCISION, MORE_SCENARIOS } from './more';

export interface Scenario {
  id: string;
  category: CategoryId;
  prompt: string;
  /** Who's asking / the setup, shown above the prompt. */
  context: string;
  frame: string[];
  secs: number;
}

export type CategoryId = 'update' | 'pushback' | 'influence' | 'problem' | 'intro' | 'interview' | 'impromptu' | 'client' | 'present' | 'negotiate' | 'feedback' | 'network';

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: 'update', name: 'Updates', blurb: 'Status, progress, decisions' },
  { id: 'pushback', name: 'Push back', blurb: 'Deadlines, scope, saying no' },
  { id: 'influence', name: 'Disagree & persuade', blurb: 'Make the case, change minds' },
  { id: 'problem', name: 'Bad news', blurb: 'Delays, incidents, mistakes' },
  { id: 'intro', name: 'Introductions', blurb: 'New team, new client' },
  { id: 'client', name: 'Clients', blurb: 'Calls, pricing, expectations' },
  { id: 'present', name: 'Presenting', blurb: 'Openings, charts, Q&A' },
  { id: 'negotiate', name: 'Negotiate', blurb: 'Raises, offers, trade-offs' },
  { id: 'feedback', name: 'Feedback', blurb: 'Give it, take it, praise' },
  { id: 'network', name: 'Small talk', blurb: 'Networking, openers' },
  { id: 'interview', name: 'Interviews', blurb: 'Classic questions, STAR stories' },
  { id: 'impromptu', name: 'Cold questions', blurb: 'Answer on the spot' },
];

const BASE_SCENARIOS: Scenario[] = [
  { id: 'u1', category: 'update', context: 'Weekly team sync', prompt: 'Give a status update on the project you are working on.', frame: ['Where it stands', 'What\'s next', 'What you need'], secs: 60 },
  { id: 'u2', category: 'update', context: 'Your director joins the call late', prompt: 'Summarize the last 20 minutes of discussion in under 30 seconds.', frame: ['Decision made', 'Open question', 'Next step'], secs: 30 },
  { id: 'u3', category: 'update', context: 'End of the meeting', prompt: 'Close the meeting with clear next steps.', frame: ['Decision', 'Owners', 'Dates'], secs: 30 },
  { id: 'u4', category: 'update', context: 'Quarterly review', prompt: 'Present one win from this quarter and why it matters.', frame: ['The result, with a number', 'How you got it', 'Why it matters'], secs: 45 },
  { id: 'u5', category: 'update', context: 'Stand-up', prompt: 'Give your stand-up: yesterday, today, blockers.', frame: ['Done', 'Doing', 'Blocked by'], secs: 30 },

  { id: 'p1', category: 'pushback', context: 'Your manager wants it Friday', prompt: 'Push back on an unrealistic deadline.', frame: ['Acknowledge the goal', 'The constraint', 'Your proposal'], secs: 45 },
  { id: 'p2', category: 'pushback', context: 'A peer asks for "a small favor"', prompt: 'Say no to an extra task without burning the relationship.', frame: ['Current priorities', 'The trade-off', 'What you can offer'], secs: 30 },
  { id: 'p3', category: 'pushback', context: 'The client adds scope mid-project', prompt: 'Explain that the new request changes the timeline or cost.', frame: ['Restate the request', 'The impact', 'Options'], secs: 45 },
  { id: 'p4', category: 'pushback', context: 'Someone keeps interrupting you', prompt: 'Hold the floor politely and finish your point.', frame: ['Hold: "Let me finish this point"', 'Your point', 'Hand back'], secs: 30 },
  { id: 'p5', category: 'pushback', context: 'Leadership asks for more with the same team', prompt: 'Ask for more people or budget.', frame: ['The goal', 'The gap', 'The specific ask'], secs: 45 },

  { id: 'i1', category: 'influence', context: 'Design review', prompt: 'Disagree with a colleague\'s proposal.', frame: ['Credit the goal', 'Your concern', 'An alternative'], secs: 45 },
  { id: 'i2', category: 'influence', context: '"What do you think we should do?"', prompt: 'Give your recommendation.', frame: ['Recommendation', 'Two reasons', 'The risk'], secs: 45 },
  { id: 'i3', category: 'influence', context: 'Budget meeting', prompt: 'Pitch a tool or process change your team should adopt.', frame: ['The problem today', 'The change', 'The payoff'], secs: 60 },
  { id: 'i4', category: 'influence', context: 'Two options on the table', prompt: 'Compare two approaches and pick one.', frame: ['Option A in one line', 'Option B in one line', 'Your pick and why'], secs: 60 },
  { id: 'i5', category: 'influence', context: 'A senior leader challenges your number', prompt: 'Defend your estimate calmly.', frame: ['Restate their concern', 'Your evidence', 'What would change your mind'], secs: 45 },

  { id: 'b1', category: 'problem', context: 'Your manager: "Why is this late?"', prompt: 'Explain the delay.', frame: ['Fact', 'Cause', 'Recovery plan with a date'], secs: 45 },
  { id: 'b2', category: 'problem', context: 'Production incident', prompt: 'Explain a technical issue to non-technical stakeholders.', frame: ['What broke', 'Impact', 'What happens next'], secs: 60 },
  { id: 'b3', category: 'problem', context: 'You made an error in a report', prompt: 'Own the mistake without over-apologizing.', frame: ['What happened', 'The fix', 'How it won\'t recur'], secs: 45 },
  { id: 'b4', category: 'problem', context: 'Customer escalation', prompt: 'Calm an upset customer and set expectations.', frame: ['Acknowledge', 'What you\'ll do', 'When they\'ll hear back'], secs: 45 },

  { id: 'n1', category: 'intro', context: 'First meeting with a new team', prompt: 'Introduce yourself.', frame: ['Name and role', 'What you own', 'How to work with you'], secs: 30 },
  { id: 'n2', category: 'intro', context: 'Client kickoff', prompt: 'Open the meeting and set the agenda.', frame: ['Purpose', 'Agenda', 'Desired outcome'], secs: 45 },
  { id: 'n3', category: 'intro', context: 'Elevator with a VP', prompt: '"So what are you working on?"', frame: ['The project in one line', 'Why it matters', 'One result'], secs: 30 },
  { id: 'n4', category: 'intro', context: 'Panel or conference call', prompt: 'Introduce a speaker or colleague.', frame: ['Who they are', 'Why they\'re relevant', 'Hand-off'], secs: 30 },

  { id: 'v1', category: 'interview', context: 'Interview opener', prompt: 'Tell me about yourself.', frame: ['Present: role and focus', 'Past: what got you here', 'Future: why this role'], secs: 60 },
  { id: 'v2', category: 'interview', context: 'Behavioral question', prompt: 'Tell me about a time you handled a conflict.', frame: ['Situation', 'Task', 'Action', 'Result'], secs: 90 },
  { id: 'v3', category: 'interview', context: 'Behavioral question', prompt: 'Describe your biggest professional achievement.', frame: ['Situation', 'Task', 'Action', 'Result with a number'], secs: 90 },
  { id: 'v4', category: 'interview', context: 'Closing question', prompt: 'Why should we hire you?', frame: ['Their need', 'Your proof', 'What you\'ll deliver'], secs: 45 },
  { id: 'v5', category: 'interview', context: 'Tricky question', prompt: 'What is your biggest weakness?', frame: ['A real weakness', 'What you do about it', 'Evidence it\'s improving'], secs: 45 },

  { id: 'c1', category: 'impromptu', context: 'Out of nowhere', prompt: 'What\'s one thing you would change about how your team works?', frame: ['Point', 'Reason', 'Example', 'Point again'], secs: 45 },
  { id: 'c2', category: 'impromptu', context: 'Out of nowhere', prompt: 'Explain what your company does to a 10-year-old.', frame: ['One-line answer', 'An analogy', 'Why people pay for it'], secs: 45 },
  { id: 'c3', category: 'impromptu', context: 'Out of nowhere', prompt: 'What trend will most change your industry in five years?', frame: ['Point', 'Reason', 'Example', 'Point again'], secs: 60 },
  { id: 'c4', category: 'impromptu', context: 'Out of nowhere', prompt: 'Describe a decision you made with incomplete information.', frame: ['The decision', 'What you knew', 'What happened'], secs: 60 },
  { id: 'c5', category: 'impromptu', context: 'Out of nowhere', prompt: 'What advice would you give someone starting in your role?', frame: ['Point', 'Reason', 'Example', 'Point again'], secs: 45 },
  { id: 'c6', category: 'impromptu', context: 'Out of nowhere', prompt: 'Make the case for remote or in-office work.', frame: ['Your position', 'Two reasons', 'The counterpoint you accept'], secs: 60 },
];

export const BASELINE: Scenario = {
  id: 'baseline',
  category: 'intro',
  context: 'Baseline check',
  prompt: 'Tell me about your work: what you do, and one thing you\'re proud of.',
  frame: ['What you do', 'Something you\'re proud of', 'What\'s next for you'],
  secs: 60,
};

/** Short concision challenges: say it within a word budget. */
const BASE_CONCISION: { id: string; prompt: string; secs: number; maxWords: number }[] = [
  { id: 'k1', prompt: 'Explain what you do at work.', secs: 15, maxWords: 40 },
  { id: 'k2', prompt: 'Give your opinion on the last meeting you attended.', secs: 20, maxWords: 50 },
  { id: 'k3', prompt: 'Summarize your current project for a busy executive.', secs: 20, maxWords: 50 },
  { id: 'k4', prompt: 'Recommend a book, tool, or app, and say why.', secs: 15, maxWords: 40 },
  { id: 'k5', prompt: 'Explain why a deadline will slip.', secs: 20, maxWords: 50 },
  { id: 'k6', prompt: 'Ask your manager for a decision you need.', secs: 15, maxWords: 35 },
  { id: 'k7', prompt: 'Describe your ideal team in one breath.', secs: 15, maxWords: 35 },
  { id: 'k8', prompt: 'Explain the biggest risk in your project.', secs: 20, maxWords: 45 },
];

export const SCENARIOS: Scenario[] = [...BASE_SCENARIOS, ...MORE_SCENARIOS];
export const CONCISION = [...BASE_CONCISION, ...MORE_CONCISION];
