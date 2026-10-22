// Never-ending read-aloud passages for the Pace and Pause drills.
// Each kind is a short, confident meeting script built from interchangeable lines,
// filled with the user's role vocabulary. "/" marks a deliberate pause.
import { rng } from './generator';
import { roleById, type RolePack } from './roles';
import { PASSAGES, type Passage } from './drills';

export type PassageKind =
  | 'update' | 'pushback' | 'intro' | 'standup' | 'badnews' | 'recommend' | 'client' | 'escalate'
  | 'no' | 'thanks' | 'mistake' | 'propose' | 'qa' | 'close' | 'data' | 'opening';

interface Kind {
  id: PassageKind;
  title: string;
  /** One line is picked from each slot, in order. Slots marked optional are sometimes skipped. */
  slots: { lines: string[]; optional?: boolean }[];
}

// Slots filled once per passage so it stays coherent:
// {project} {metric} {stakeholder} {problem} {deliverable} {proposal} {concept}
// {day} {day2} {day3} (different weekdays, in order) {deliverable2} {pct} {few} {weeks} (spelled-out numbers)
const KINDS: Kind[] = [
  {
    id: 'update', title: 'Project update',
    slots: [
      { lines: ['Here is where we stand on {project}.', 'Quick update on {project}.', 'Let me give you the headline on {project}.'] },
      { lines: ['We are {pct} percent complete.', 'The core work is done, / and testing starts {day}.', 'We hit the first milestone {few} days early.'] },
      { lines: ['Next, / we finish {deliverable} by {day2}.', 'This week, / the focus is {deliverable}.', 'The next step is {deliverable}, / due {day2}.'] },
      { lines: ['The one risk is the timeline, / and I have a plan for it.', 'One thing to watch: / {metric}.', 'There is one risk: / staffing over the holidays.'], optional: true },
      { lines: ['I need a decision from {stakeholder} by {day3}.', 'I need one thing from you: / a decision by {day3}.', 'Please send me your feedback by {day3}.'] },
    ],
  },
  {
    id: 'pushback', title: 'Pushing back',
    slots: [
      { lines: ['I understand why {day} matters.', 'I see the goal, / and I want to hit it.', 'I agree this is important.'] },
      { lines: ['With the current team, / {day} means we cut corners.', 'Doing it by {day} / means we skip testing.', 'Adding this now / puts {project} at risk.'] },
      { lines: ['Here is what I recommend.', 'I have a better option.', 'Let me suggest a trade.'] },
      { lines: ['We deliver the core of {project} on {day}, / and the rest the following week.', 'We move {deliverable} to {day2} / and keep the quality bar.', 'We add it to the next release, / in {weeks} weeks.'] },
      { lines: ['That keeps quality where it needs to be.', 'That way, / we keep our promise to {stakeholder}.', 'Can we agree on that today?'] },
    ],
  },
  {
    id: 'intro', title: 'Introduction',
    slots: [
      { lines: ['Hi everyone.', 'Good morning, everyone.', 'Hello, / and thanks for having me.'] },
      { lines: ['I lead the work on {project}.', 'I joined this month / to work on {project}.', 'I own {deliverable} for this group.'] },
      { lines: ['My focus this quarter / is {metric}.', 'My goal is simple: / move {metric} / {pct} percent in the right direction.', 'This quarter, / I am focused on {project}.'] },
      { lines: ['If you need anything from my side, / message me directly.', 'The best way to reach me / is a quick message.', 'My door is always open, / even on busy days.'] },
      { lines: ['I am glad to be on this team.', 'I look forward to working with you.', 'Let us make this a great quarter.'] },
    ],
  },
  {
    id: 'standup', title: 'Stand-up',
    slots: [
      { lines: ['Yesterday, / I finished {deliverable}.', 'Yesterday, / I wrapped up the review for {project}.', 'Since our last call, / I closed out {deliverable}.'] },
      { lines: ['Today, / I am working on {project}.', 'Today, / I start on {deliverable2}.', 'Today is all about {metric}.'] },
      { lines: ['I am blocked on one thing.', 'I have one blocker.', 'One thing is slowing me down.'] },
      { lines: ['I need input from {stakeholder}.', 'I need access to the shared files.', 'I need a decision on the scope.'] },
      { lines: ['Can someone help me after this call?', 'I will follow up right after this.', 'I will ping you on chat.'] },
    ],
  },
  {
    id: 'badnews', title: 'Bad news',
    slots: [
      { lines: ['I want to give you the news early.', 'Here is the headline.', 'I have some difficult news.'] },
      { lines: ['{Metric} will miss its target / by {pct} percent.', '{Project} will slip / by {weeks} weeks.', 'We are dealing with {problem}.'] },
      { lines: ['The main cause / is a late dependency.', 'Here is why: / the scope grew after we planned.', 'The root cause is clear, / and we found it fast.'] },
      { lines: ['We have a recovery plan.', 'Here is what we are doing about it.', 'We already started fixing it.'] },
      { lines: ['You will get a full update by {day}.', 'I will send the new date by {day}.', 'I will report progress every {day}.'] },
    ],
  },
  {
    id: 'recommend', title: 'Recommendation',
    slots: [
      { lines: ['My recommendation is clear.', 'Here is what I think we should do.', 'I recommend one thing.'] },
      { lines: ['We should start {proposal}.', 'Let us commit to {proposal}.', 'We should try {proposal} / for one quarter.'] },
      { lines: ['There are two reasons.', 'Two reasons.', 'I have two reasons.'] },
      { lines: ['First, / it moves {metric} / in the right direction.', 'First, / it saves the team real time.', 'First, / it removes the risk on {project}.'] },
      { lines: ['Second, / it costs very little to try.', 'Second, / {stakeholder} has asked for it.', 'Second, / we can measure it in {weeks} weeks.'] },
      { lines: ['I would like a decision today.', 'Can we agree to start on {day}?', 'If it does not work, / we stop.'] },
    ],
  },
  {
    id: 'client', title: 'Client call',
    slots: [
      { lines: ['Thanks for making time today.', 'Good to see you again.', 'Thank you for joining.'] },
      { lines: ['Our goal is simple.', 'Here is what I would like us to leave with.', 'I have one goal for this call.'] },
      { lines: ['Agree on the plan for {project}.', 'Agree on the date / and the scope.', 'Walk through {deliverable} / and get your sign-off.'] },
      { lines: ['We have thirty minutes, / so I will keep it tight.', 'I will share the key points first, / then take questions.'], optional: true },
      { lines: ['Before we start, / is there anything you want to add?', 'Does that work for you?', 'Is there anything else on your mind?'] },
    ],
  },
  {
    id: 'escalate', title: 'Escalation',
    slots: [
      { lines: ['I need your help with a blocker.', 'I am raising one issue / that needs your decision.', 'I need your support on something.'] },
      { lines: ['We are dealing with {problem}.', 'The issue is {problem}.', 'We have run into {problem}.'] },
      { lines: ['We have tried two fixes, / and neither worked.', 'The team has done what it can / at our level.', 'We have called and emailed, / with no reply.'] },
      { lines: ['If nothing changes by {day}, / {project} slips.', 'Without a decision, / we lose another week.', 'Every week we wait / costs us time.'] },
      { lines: ['Could you speak with {stakeholder}?', 'I need a decision by {day2}.', 'Can you help me unblock this today?'] },
    ],
  },
  {
    id: 'no', title: 'Saying no',
    slots: [
      { lines: ['Thanks for thinking of me.', 'I appreciate you asking.', 'Thank you for the trust.'] },
      { lines: ['This week, / I am focused on {project}, / and I want to do it well.', 'Right now, / {deliverable} is my top priority.', 'My plate is full until {day}.'] },
      { lines: ['I cannot take this on now.', 'I have to say no this time.', 'I will pass on this one.'] },
      { lines: ['But I can help on {day2}, / or suggest someone with more time.', 'Here is what I can offer: / thirty minutes on {day2}.', 'If it can wait {weeks} weeks, / I am in.'] },
    ],
  },
  {
    id: 'thanks', title: 'Recognition',
    slots: [
      { lines: ['Before we wrap up, / I want to thank the team.', 'I want to call out some great work.', 'One quick shout-out before we finish.'] },
      { lines: ['They stayed late {few} nights / to finish {deliverable}.', 'They found and fixed {problem}.', 'They moved {metric} / {pct} percent in the right direction.'] },
      { lines: ['Because of them, / {project} is on track.', 'That made a real difference / for {stakeholder}.', 'That is exactly the standard we want.'] },
      { lines: ['Thank you.', 'Great work, everyone.', 'We are lucky to have you.'] },
    ],
  },
  {
    id: 'mistake', title: 'Owning a mistake',
    slots: [
      { lines: ['I made an error in {deliverable}.', 'There was a mistake in {deliverable}, / and it was mine.', 'I want to flag an error I made.'] },
      { lines: ['The number for {metric} was wrong.', 'I sent the old version / to {stakeholder}.', 'I missed a step / in the review.'] },
      { lines: ['I have already fixed it.', 'The corrected version / is in your inbox.', 'It is fixed, / and the numbers are checked.'] },
      { lines: ['I also added a check, / so it cannot happen again.', 'From now on, / a second person reviews it.', 'Going forward, / I will run a final check every time.'] },
    ],
  },
  {
    id: 'propose', title: 'Proposing an idea',
    slots: [
      { lines: ['I have an idea / that could save us real time.', 'I would like to propose a change.', 'Here is a simple idea.'] },
      { lines: ['Today, / {metric} is holding us back.', 'Right now, / {project} takes longer than it should.', 'Today, / every team does this differently.'] },
      { lines: ['I propose {proposal}.', 'My proposal: / {proposal}.', 'Let us try {proposal}.'] },
      { lines: ['We can test it / for {weeks} weeks.', 'It needs one person / and no new budget.', 'We start small, / with one team.'] },
      { lines: ['If it works, / we roll it out everywhere.', 'I will report back with the results.', 'Who is in?'] },
    ],
  },
  {
    id: 'qa', title: 'Answering a question',
    slots: [
      { lines: ['That is a fair question.', 'Good question.', 'I am glad you asked.'] },
      { lines: ['The short answer is yes.', 'The short answer is no, / not yet.', 'The answer is simple: / we are on track.'] },
      { lines: ['Here is why.', 'Let me explain.', 'The reason is simple.'] },
      { lines: ['We tested it / with real users, / and the results held.', 'The data on {metric} / supports it.', '{Stakeholder} reviewed it / and agreed.'] },
      { lines: ['The one caveat / is timing.', 'One caveat: / we need more data from {project}.', 'I will share the details / after this meeting.'] },
    ],
  },
  {
    id: 'close', title: 'Closing a meeting',
    slots: [
      { lines: ['Let me recap.', 'Before we go, / here is the summary.', 'Here is what we decided.'] },
      { lines: ['We go ahead with {project}.', 'We move {deliverable} to {day}.', 'We start {proposal} next week.'] },
      { lines: ['I own the plan.', '{Stakeholder} owns the budget question.', 'Each team sends its input / by {day2}.'] },
      { lines: ['We meet again on {day2}.', 'I will send notes / within the hour.', 'Next check-in / is in {weeks} weeks.'] },
      { lines: ['Thanks, everyone.', 'Great meeting. / Thank you.', 'Thanks for the focus today.'] },
    ],
  },
  {
    id: 'data', title: 'Explaining a number',
    slots: [
      { lines: ['This chart shows {metric}.', 'Let us look at {metric}.', 'Here is the number that matters: / {metric}.'] },
      { lines: ['Notice the jump / last month.', 'Notice the drop / in the last quarter.', 'Look at the trend / since January.'] },
      { lines: ['That is when we launched {project}.', 'That lines up with {problem}.', 'That is when we changed the process.'] },
      { lines: ['It moved {pct} percent, / and it stayed there.', 'The change held / for {weeks} weeks.', 'The effect is real, / and it is growing.'] },
      { lines: ['The lesson is simple.', 'So what does this mean?', 'Here is the takeaway.'] },
      { lines: ['We should do more of what worked.', 'We need to act / before it gets worse.', 'This is where we put our next dollar.'] },
    ],
  },
  {
    id: 'opening', title: 'Opening a talk',
    slots: [
      { lines: ['Every week, / our team loses hours / to work nobody sees.', 'Here is a number / that surprised me.', 'Let me start with a question.'] },
      { lines: ['{Metric} moved {pct} percent / this year.', 'How much time / do we spend in status meetings?', 'Last month, / we dealt with {problem}.'] },
      { lines: ['Today, / I will show you why.', 'In the next ten minutes, / I will show you what we learned.', 'Today, / I will show you how we fixed it.'] },
      { lines: ['And what we plan to do next.', 'And what it means for {project}.', 'And one thing I need from you.'] },
    ],
  },
];

export const PASSAGE_KINDS = KINDS.map((k) => ({ id: k.id, title: k.title }));

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PCT = ['five', 'eight', 'ten', 'twelve', 'fifteen', 'twenty', 'twenty-five', 'thirty', 'forty'];
const FEW = ['two', 'three', 'four'];
const WEEKS = ['two', 'three', 'four', 'six'];

const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function vocab(r: () => number, role: RolePack): Record<string, string> {
  // Three different weekdays, in calendar order, so dates in a passage make sense together.
  const days = [...DAYS].sort(() => r() - 0.5).slice(0, 3).sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
  const deliverable = pick(r, role.deliverables);
  const others = role.deliverables.filter((d) => d !== deliverable);
  return {
    project: pick(r, role.projects), metric: pick(r, role.metrics), stakeholder: pick(r, role.stakeholders),
    problem: pick(r, role.problems), deliverable, deliverable2: others.length ? pick(r, others) : deliverable, proposal: pick(r, role.proposals),
    concept: pick(r, role.concepts), day: days[0], day2: days[1], day3: days[2], pct: pick(r, PCT), few: pick(r, FEW), weeks: pick(r, WEEKS),
  };
}

function fillLine(line: string, v: Record<string, string>): string {
  return line.replace(/\{(\w+)\}/g, (_, k: string) => {
    const val = v[k.toLowerCase()] ?? '';
    return k[0] === k[0].toUpperCase() ? cap(val) : val;
  });
}

/** Builds a passage deterministically from its id: `gp:<kind>:<seed>`. */
export function generatePassage(kind: PassageKind, seed: number, roleId: string): Passage {
  const k = KINDS.find((x) => x.id === kind) ?? KINDS[0];
  const r = rng(seed);
  const v = vocab(r, roleById(roleId));
  const lines: string[] = [];
  for (const slot of k.slots) {
    const use = !slot.optional || r() < 0.5;
    const line = pick(r, slot.lines);
    if (use) lines.push(cap(fillLine(line, v)));
  }
  return { id: `gp:${k.id}:${seed}`, title: k.title, text: lines.join(' / ') };
}

/** Which kind a passage belongs to (hand-written passages map by title where possible). */
export function kindOf(p: Passage): PassageKind | null {
  if (p.id.startsWith('gp:')) return p.id.split(':')[1] as PassageKind;
  return KINDS.find((k) => k.title === p.title)?.id ?? null;
}

const FRESH_MS = 21 * 24 * 3600 * 1000;

/**
 * A fresh passage: a hand-written one the user hasn't read in the last three weeks,
 * or a new generated one written for their role. Never the passage they just had.
 */
export function nextPassage(opts: { roleId: string; seen: Record<string, number>; kind?: PassageKind | 'any'; exclude?: string; now?: number; random?: () => number }): Passage {
  const r = opts.random ?? Math.random;
  const now = opts.now ?? Date.now();
  const kind = opts.kind && opts.kind !== 'any' ? opts.kind : null;
  const fresh = PASSAGES.filter((p) => p.id !== opts.exclude && (!kind || kindOf(p) === kind) && !(opts.seen[p.id] && now - opts.seen[p.id] < FRESH_MS));
  if (fresh.length && r() < 0.35) return fresh[Math.floor(r() * fresh.length)];
  const k = kind ?? pick(r, KINDS).id;
  for (let tries = 0; tries < 6; tries++) {
    const p = generatePassage(k, Math.floor(r() * 2 ** 31), opts.roleId);
    if (p.id !== opts.exclude && !opts.seen[p.id]) return p;
  }
  return generatePassage(k, Math.floor(r() * 2 ** 31), opts.roleId);
}

/** Rough count of distinct passages per role, for tests and the "never-ending" claim. */
export function passageVariety(): number {
  return KINDS.reduce((a, k) => a + k.slots.reduce((m, s) => m * (s.lines.length + (s.optional ? 1 : 0)), 1), 0);
}
