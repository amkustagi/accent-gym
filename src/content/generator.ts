// Never-ending scenarios: templates filled from the user's role pack, plus large question banks.
import { roleById, type RolePack } from './roles';
import type { CategoryId, Scenario } from './scenarios';

/** Small fast seeded RNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];

interface Template {
  id: string;
  cat: CategoryId;
  context: string;
  prompt: string;
  frame: string[];
  secs: number;
}

// Slots: {project} {metric} {stakeholder} {problem} {deliverable} {proposal} {concept} {pct} {days} {weekday} {n} {topic}
const T: Template[] = [
  // Updates
  { id: 'u-status', cat: 'update', context: 'Weekly sync with {stakeholder}', prompt: 'Give a 45-second update on {project}.', frame: ['Where it stands', 'What\'s next', 'What you need'], secs: 45 },
  { id: 'u-metric-up', cat: 'update', context: 'Monthly review', prompt: '{metric} improved {pct}% this month. Explain why and what you\'ll do next.', frame: ['The number', 'What drove it', 'Next step'], secs: 45 },
  { id: 'u-metric-down', cat: 'update', context: 'Monthly review', prompt: '{metric} dropped {pct}% this month. Explain it to {stakeholder}.', frame: ['The fact', 'The cause', 'Your plan'], secs: 45 },
  { id: 'u-late-join', cat: 'update', context: '{stakeholder} joins the call 20 minutes late', prompt: 'Catch them up on the discussion about {project} in 30 seconds.', frame: ['Decision made', 'Open question', 'What we need from them'], secs: 30 },
  { id: 'u-recap', cat: 'update', context: 'End of the meeting', prompt: 'Recap the decisions on {project} and assign next steps.', frame: ['Decisions', 'Owners', 'Dates'], secs: 30 },
  { id: 'u-standup', cat: 'update', context: 'Stand-up', prompt: 'Give your stand-up. You\'re working on {project} and blocked by {problem}.', frame: ['Done', 'Doing', 'Blocked by'], secs: 30 },
  { id: 'u-milestone', cat: 'update', context: 'Leadership review', prompt: 'Announce that {project} hit its milestone {days} days early.', frame: ['The win', 'Who made it happen', 'What it unlocks'], secs: 40 },
  { id: 'u-exec', cat: 'update', context: 'Elevator with {stakeholder}', prompt: '"How is {project} going?" Answer in two sentences.', frame: ['Status in one line', 'One proof point'], secs: 20 },
  { id: 'u-deliverable', cat: 'update', context: 'Team meeting', prompt: 'Walk the team through the key points of {deliverable}.', frame: ['Purpose', 'Three key points', 'What you need from them'], secs: 60 },
  // Push back
  { id: 'p-deadline', cat: 'pushback', context: '{stakeholder} wants {project} done by {weekday}', prompt: 'Push back: the deadline isn\'t realistic.', frame: ['Acknowledge the goal', 'The constraint', 'Your proposal'], secs: 45 },
  { id: 'p-scope', cat: 'pushback', context: 'Mid-project request from {stakeholder}', prompt: 'They want to add a big new feature to {project}. Explain the trade-off.', frame: ['Restate the request', 'The impact', 'Two options'], secs: 45 },
  { id: 'p-no', cat: 'pushback', context: 'A colleague asks for help', prompt: 'Say no to helping with {deliverable} this week, and keep the relationship strong.', frame: ['Your current priority', 'Why not now', 'What you can offer'], secs: 30 },
  { id: 'p-resources', cat: 'pushback', context: 'Planning meeting', prompt: 'Ask {stakeholder} for {n} more people for {project}.', frame: ['The goal', 'The gap', 'The specific ask'], secs: 45 },
  { id: 'p-interrupt', cat: 'pushback', context: 'You\'re presenting {deliverable}', prompt: '{stakeholder} interrupts for the third time. Hold the floor and finish your point.', frame: ['Hold: "Let me finish this point"', 'Your point', 'Invite their question'], secs: 30 },
  { id: 'p-priority', cat: 'pushback', context: 'Two requests at once', prompt: '{stakeholder} and another team both need you this week. Ask them to agree on the priority.', frame: ['The conflict', 'The cost of doing both', 'The decision you need'], secs: 45 },
  { id: 'p-quality', cat: 'pushback', context: 'Release planning', prompt: 'You\'re asked to skip testing on {project} to save time. Push back.', frame: ['Agree on the goal', 'The risk, with an example', 'A faster safe option'], secs: 45 },
  // Influence
  { id: 'i-propose', cat: 'influence', context: 'Team meeting', prompt: 'Propose {proposal}.', frame: ['The problem today', 'Your proposal', 'The payoff'], secs: 60 },
  { id: 'i-disagree', cat: 'influence', context: 'Design review', prompt: '{stakeholder} suggests {proposal}. You disagree. Say so respectfully.', frame: ['Credit their goal', 'Your concern', 'An alternative'], secs: 45 },
  { id: 'i-recommend', cat: 'influence', context: '"What do you think we should do?"', prompt: 'Recommend what to do about {problem}.', frame: ['Recommendation', 'Two reasons', 'The risk'], secs: 45 },
  { id: 'i-defend', cat: 'influence', context: '{stakeholder} challenges your estimate', prompt: 'Defend your estimate for {project} calmly.', frame: ['Restate their concern', 'Your evidence', 'What would change your mind'], secs: 45 },
  { id: 'i-compare', cat: 'influence', context: 'Decision meeting', prompt: 'Compare {proposal} with keeping things as they are, and pick one.', frame: ['Option A', 'Option B', 'Your pick and why'], secs: 60 },
  { id: 'i-yes-but', cat: 'influence', context: 'Brainstorm', prompt: 'Build on a colleague\'s idea about {project} and steer it toward {proposal}.', frame: ['What you like', 'What you\'d add', 'The next step'], secs: 40 },
  { id: 'i-buyin', cat: 'influence', context: 'Skeptical team', prompt: 'Get the team on board with {proposal} even though they\'re tired of change.', frame: ['Acknowledge the fatigue', 'Why this one matters', 'How you\'ll make it easy'], secs: 60 },
  // Problems
  { id: 'b-late', cat: 'problem', context: '{stakeholder}: "Why is {project} late?"', prompt: 'Explain the delay.', frame: ['Fact', 'Cause', 'Recovery plan with a date'], secs: 45 },
  { id: 'b-incident', cat: 'problem', context: 'Emergency call', prompt: 'There\'s {problem}. Brief {stakeholder}.', frame: ['What happened', 'Impact', 'What happens next'], secs: 45 },
  { id: 'b-mistake', cat: 'problem', context: 'You made an error in {deliverable}', prompt: 'Own the mistake without over-apologizing.', frame: ['What happened', 'The fix', 'How it won\'t recur'], secs: 40 },
  { id: 'b-badnews', cat: 'problem', context: 'One-on-one with {stakeholder}', prompt: 'Tell them {metric} will miss target by {pct}%.', frame: ['The headline', 'Why', 'What you\'re doing about it'], secs: 45 },
  { id: 'b-escalate', cat: 'problem', context: 'You need help', prompt: 'Escalate {problem} to {stakeholder} without sounding like you\'re complaining.', frame: ['The issue', 'What you\'ve tried', 'The decision you need'], secs: 45 },
  { id: 'b-postmortem', cat: 'problem', context: 'Review meeting', prompt: 'Lead the review of {problem}: what went wrong and what changes.', frame: ['Timeline in two lines', 'Root cause', 'Two changes'], secs: 60 },
  // Intros
  { id: 'n-self', cat: 'intro', context: 'First meeting with a new team', prompt: 'Introduce yourself as the new person working on {project}.', frame: ['Name and role', 'What you own', 'How to work with you'], secs: 30 },
  { id: 'n-kickoff', cat: 'intro', context: 'Kickoff for {project}', prompt: 'Open the meeting and set the agenda.', frame: ['Purpose', 'Agenda', 'Desired outcome'], secs: 45 },
  { id: 'n-elevator', cat: 'intro', context: 'You meet {stakeholder} at an event', prompt: '"So what do you do?" Make it memorable.', frame: ['Role in one line', 'A result you\'re proud of', 'A question back'], secs: 30 },
  { id: 'n-handoff', cat: 'intro', context: 'Panel discussion', prompt: 'Introduce a colleague who will present {deliverable}.', frame: ['Who they are', 'Why they\'re the right person', 'Hand-off'], secs: 25 },
  // Client
  { id: 'cl-open', cat: 'client', context: 'Client call', prompt: 'Open a call with a client about {project}.', frame: ['Warm greeting', 'Goal of the call', 'Agenda check'], secs: 30 },
  { id: 'cl-expect', cat: 'client', context: 'Upset client', prompt: 'The client is frustrated about {problem}. Calm them and set expectations.', frame: ['Acknowledge', 'What you\'ll do', 'When they\'ll hear back'], secs: 45 },
  { id: 'cl-value', cat: 'client', context: 'Renewal conversation', prompt: 'Remind the client of the value you delivered on {project}.', frame: ['The result, with a number', 'What it means for them', 'What\'s next'], secs: 45 },
  { id: 'cl-concept', cat: 'client', context: 'Non-technical client', prompt: 'Explain {concept} in plain words.', frame: ['One-line definition', 'An everyday analogy', 'Why it matters to them'], secs: 45 },
  { id: 'cl-no', cat: 'client', context: 'Client request', prompt: 'The client asks for something outside the contract. Say no and offer an alternative.', frame: ['Appreciate the ask', 'The boundary', 'Your alternative'], secs: 40 },
  // Presenting
  { id: 'pr-open', cat: 'present', context: 'Start of your presentation', prompt: 'Open your presentation on {deliverable} with a strong first 20 seconds.', frame: ['A hook: a number or question', 'Why it matters', 'What they\'ll get'], secs: 30 },
  { id: 'pr-close', cat: 'present', context: 'End of your presentation', prompt: 'Close your presentation on {project} with a clear call to action.', frame: ['Key message', 'The ask', 'Thank you'], secs: 30 },
  { id: 'pr-chart', cat: 'present', context: 'Slide with a chart of {metric}', prompt: 'Explain what the chart shows and why it matters.', frame: ['What we\'re looking at', 'The one insight', 'So what'], secs: 40 },
  { id: 'pr-qa', cat: 'present', context: 'Q&A', prompt: '"How confident are you in these numbers?" Answer.', frame: ['Direct answer', 'Your evidence', 'The caveat'], secs: 40 },
  { id: 'pr-dontknow', cat: 'present', context: 'Q&A', prompt: 'You\'re asked about {concept} and you don\'t know the answer. Respond with confidence.', frame: ['Say you don\'t know yet', 'What you do know', 'When you\'ll follow up'], secs: 30 },
  // Negotiation
  { id: 'ng-raise', cat: 'negotiate', context: 'Review with your manager', prompt: 'Ask for a raise based on your work on {project}.', frame: ['Your impact, with numbers', 'The market', 'The specific ask'], secs: 60 },
  { id: 'ng-deadline', cat: 'negotiate', context: '{stakeholder} needs it sooner', prompt: 'Negotiate a trade: an earlier date in exchange for less scope.', frame: ['What you can do', 'What you need in return', 'Confirm the deal'], secs: 45 },
  { id: 'ng-discount', cat: 'negotiate', context: 'A buyer asks for {pct}% off', prompt: 'Hold your price while keeping the deal alive.', frame: ['Acknowledge', 'Restate the value', 'Offer a trade, not a discount'], secs: 45 },
  { id: 'ng-role', cat: 'negotiate', context: 'Career conversation', prompt: 'Ask to lead {project}.', frame: ['Why you', 'What you\'d deliver', 'The ask'], secs: 45 },
  // Feedback
  { id: 'fb-give', cat: 'feedback', context: 'One-on-one', prompt: 'A teammate keeps missing deadlines on {deliverable}. Give them direct, kind feedback.', frame: ['What you observed', 'The impact', 'What you\'d like instead'], secs: 45 },
  { id: 'fb-receive', cat: 'feedback', context: '{stakeholder} criticizes {deliverable}', prompt: 'Respond to the criticism without getting defensive.', frame: ['Thank them', 'Clarify one point', 'What you\'ll change'], secs: 40 },
  { id: 'fb-praise', cat: 'feedback', context: 'Team meeting', prompt: 'Publicly recognize someone who saved {project}.', frame: ['What they did', 'The specific impact', 'Thank you'], secs: 30 },
  { id: 'fb-up', cat: 'feedback', context: 'Skip-level meeting', prompt: 'Give your manager\'s manager honest feedback about {problem}.', frame: ['The pattern', 'The impact', 'A suggestion'], secs: 45 },
  // Networking
  { id: 'nw-small', cat: 'network', context: 'Coffee before the meeting starts', prompt: 'Make small talk with {stakeholder} for 30 seconds.', frame: ['Open with something current', 'Ask a question', 'Share a little'], secs: 30 },
  { id: 'nw-follow', cat: 'network', context: 'After a conference talk', prompt: 'Approach the speaker and start a conversation.', frame: ['A specific compliment', 'Your connection', 'A question'], secs: 30 },
  { id: 'nw-ask', cat: 'network', context: 'Mentor coffee chat', prompt: 'Ask a senior leader for advice about growing in your career.', frame: ['Context about you', 'The specific question', 'Thank them'], secs: 30 },
];

const INTERVIEW_QS = [
  'Tell me about yourself.', 'Why do you want this role?', 'Why are you leaving your current job?', 'What is your greatest strength?', 'What is your biggest weakness?',
  'Tell me about a time you failed.', 'Tell me about a time you disagreed with your manager.', 'Describe a conflict with a coworker and how you resolved it.',
  'Tell me about a time you led without authority.', 'Describe your biggest professional achievement.', 'Tell me about a time you had to learn something fast.',
  'Describe a time you missed a deadline.', 'Tell me about a difficult decision you made.', 'How do you handle pressure?', 'Where do you see yourself in five years?',
  'Why should we hire you?', 'What would your last manager say about you?', 'Tell me about a time you influenced a decision with data.',
  'Describe a time you received tough feedback.', 'Tell me about a project you\'re proud of.', 'How do you prioritize when everything is urgent?',
  'Tell me about a time you went above and beyond.', 'Describe a time you simplified something complex.', 'Tell me about a risk you took.',
  'Describe a time you had to say no.', 'How do you work with people you don\'t get along with?', 'What questions do you have for us?',
  'Tell me about a time you changed your mind.', 'Describe a mistake you made and what you learned.', 'How would your teammates describe you?',
  'What motivates you?', 'Tell me about a time you mentored someone.', 'Describe a time you managed a difficult stakeholder.',
  'What salary are you expecting?', 'Walk me through your resume.', 'Tell me about a time you improved a process.',
];

const IMPROMPTU = [
  'What\'s one habit that made you better at your job?', 'Should meetings have a strict time limit?', 'What\'s the best advice you\'ve ever received?',
  'Is it better to be a specialist or a generalist?', 'What would you change about your company\'s onboarding?', 'Should companies allow four-day work weeks?',
  'What makes a great manager?', 'Describe your ideal workday.', 'What technology will change your job most in five years?',
  'Is email still useful?', 'What\'s a skill everyone should learn?', 'Should every team have a no-meeting day?', 'What makes a presentation memorable?',
  'Is it okay to disagree with your boss in public?', 'What\'s the most overrated business buzzword?', 'Should salaries be public?',
  'What\'s a lesson you learned the hard way?', 'How do you stay focused with constant notifications?', 'What makes a team trust each other?',
  'Should companies pay for employees\' education?', 'Explain your job to a ten-year-old.', 'What\'s one thing you would automate tomorrow?',
  'Is working from home better for productivity?', 'What makes a good decision?', 'How should success be measured at work?',
  'What\'s the hardest part of your role?', 'Should junior people speak up in senior meetings?', 'Describe a book or podcast that changed your thinking.',
  'What would you do with an extra hour every day?', 'Is it better to move fast or get it right?', 'What does good customer service look like?',
  'How do you handle a bad day at work?', 'What makes a meeting worth attending?', 'Should AI write our emails?', 'What is leadership, in one minute?',
  'Describe the best team you\'ve been on.', 'What should every new hire know on day one?', 'How do you recover after a mistake?',
  'What\'s a small change that would make your city better?', 'Is multitasking a myth?', 'What makes someone sound confident?',
  'Should companies have dress codes?', 'What\'s the most useful tool you use daily?', 'How do you say no without upsetting people?',
  'What do you do to keep learning?', 'Should managers be technical?', 'Is failure necessary for success?', 'What\'s your view on open-plan offices?',
  'What would you tell your younger self about work?', 'How do you build trust with a new manager?', 'What does work-life balance mean to you?',
  'Describe a tradition from your culture to a colleague.', 'What\'s a common myth about your industry?', 'Is it better to have more meetings or more emails?',
  'Should companies measure productivity by hours?', 'How do you give credit to others?', 'What\'s a decision you\'d make differently now?',
  'What is the best way to learn a new skill?', 'How do you prepare for an important meeting?', 'What makes feedback useful?',
];

const PRESSURE_CONSTRAINTS = [
  'Constraint: no "I think" or "just".', 'Constraint: include one specific number.', 'Constraint: say your main point in the first sentence.',
  'Constraint: finish 10 seconds early.', 'Constraint: end with a clear ask.', 'Constraint: pause after your first sentence.',
];

export const GEN_CATEGORIES: CategoryId[] = ['update', 'pushback', 'influence', 'problem', 'intro', 'client', 'present', 'negotiate', 'feedback', 'network', 'interview', 'impromptu'];

function fill(s: string, r: () => number, role: RolePack): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return s
    .replace(/\{project\}/g, () => pick(r, role.projects))
    .replace(/\{metric\}/g, () => pick(r, role.metrics))
    .replace(/\{stakeholder\}/g, () => pick(r, role.stakeholders))
    .replace(/\{problem\}/g, () => pick(r, role.problems))
    .replace(/\{deliverable\}/g, () => pick(r, role.deliverables))
    .replace(/\{proposal\}/g, () => pick(r, role.proposals))
    .replace(/\{concept\}/g, () => pick(r, role.concepts))
    .replace(/\{pct\}/g, () => String(pick(r, [5, 8, 10, 12, 15, 18, 20, 25, 30])))
    .replace(/\{days\}/g, () => String(pick(r, [2, 3, 5, 7, 10])))
    .replace(/\{n\}/g, () => String(pick(r, [1, 2, 3])))
    .replace(/\{weekday\}/g, () => pick(r, days));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface GenOptions {
  role: string;
  category?: CategoryId;
  /** 1–5. Higher levels shorten the time limit and add a constraint. */
  level?: number;
  seed?: number;
}

/** Builds one scenario. The same seed and options always give the same scenario. */
export function generateScenario(o: GenOptions): Scenario {
  const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
  const r = rng(seed);
  const role = roleById(o.role);
  const cat = o.category ?? pick(r, GEN_CATEGORIES);
  const level = Math.max(1, Math.min(5, o.level ?? 2));
  let sc: Scenario;
  if (cat === 'interview') {
    const q = pick(r, INTERVIEW_QS);
    const star = /time|describe|tell me about a/i.test(q) && !/yourself/i.test(q);
    sc = { id: `g:${seed}`, category: 'interview', context: `Interview for a ${role.id === 'general' ? 'new' : role.name.toLowerCase()} role`, prompt: q, frame: star ? ['Situation', 'Task', 'Action', 'Result'] : ['Direct answer', 'Proof', 'Tie to the role'], secs: star ? 90 : 60 };
  } else if (cat === 'impromptu') {
    sc = { id: `g:${seed}`, category: 'impromptu', context: 'Cold question', prompt: pick(r, IMPROMPTU), frame: ['Point', 'Reason', 'Example', 'Point again'], secs: 45 };
  } else {
    const pool = T.filter((t) => t.cat === cat);
    const t = pick(r, pool.length ? pool : T);
    sc = { id: `g:${seed}`, category: t.cat, context: cap(fill(t.context, r, role)), prompt: cap(fill(t.prompt, r, role)), frame: t.frame, secs: t.secs };
  }
  const delta = [15, 5, 0, -5, -10][level - 1];
  sc.secs = Math.max(20, sc.secs + delta);
  if (level >= 4) sc.context = `${sc.context} · ${pick(r, PRESSURE_CONSTRAINTS)}`;
  return sc;
}

/** Number of distinct prompts the generator can produce for one role (for display). */
export function generatorSize(): number {
  return T.length * 60 + INTERVIEW_QS.length + IMPROMPTU.length;
}

export { INTERVIEW_QS, IMPROMPTU };
