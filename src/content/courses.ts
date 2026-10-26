// Courses: a guided path through every part of speaking well at work.
// Each lesson teaches one idea in about two minutes, then the user says it out loud and the app
// checks that lesson's specific skill (on top of the usual voice report).
import type { DrillId } from './catalog';
import type { PresenceSummary } from '../engine/face';

export type Check =
  | { t: 'avoid'; words: string[]; label: string }
  | { t: 'include'; any: string[]; label: string }
  | { t: 'question'; label: string }
  | { t: 'words'; min?: number; max?: number; label: string }
  | { t: 'pauses'; min: number; label: string }
  | { t: 'pace'; lo: number; hi: number; label: string }
  | { t: 'variety'; min: number; label: string }
  | { t: 'fillers'; maxPerMin: number; label: string }
  /** Something only the user (or the camera check, when it's on) can see. */
  | { t: 'self'; label: string; camera?: 'eye' | 'light' | 'still' | 'framing' | 'smile' };

export interface CourseLesson {
  id: string;
  title: string;
  /** The one idea, in a sentence. */
  idea: string;
  why: string;
  how: string[];
  example: { weak: string; strong: string };
  practice: { context: string; prompt: string; frame: string[]; secs: number };
  checks: Check[];
  /** A drill that trains this further. */
  deeper?: DrillId;
}

export interface Course {
  id: string;
  title: string;
  /** Which part of speaking well it covers. */
  area: string;
  blurb: string;
  icon: string;
  lessons: CourseLesson[];
}

const NO_SORRY: Check = { t: 'avoid', words: ['sorry', 'apologize', 'apologise'], label: 'No unnecessary "sorry"' };
const NO_HEDGE: Check = { t: 'avoid', words: ['i think', 'maybe', 'kind of', 'sort of', 'i guess', 'i feel like', 'probably'], label: 'No hedges ("I think", "maybe", "kind of")' };
const FEW_FILLERS: Check = { t: 'fillers', maxPerMin: 3, label: 'Few fillers (under 3 a minute)' };
const CALM_PACE: Check = { t: 'pace', lo: 120, hi: 165, label: 'Calm pace (120–165 words a minute)' };
const PAUSES: Check = { t: 'pauses', min: 2, label: 'At least 2 deliberate pauses' };

export const COURSES: Course[] = [
  {
    id: 'confidence', title: 'Confidence from the inside', area: 'Mindset', icon: 'flame',
    blurb: 'Calm nerves, speak up, and sound sure of what you know.',
    lessons: [
      {
        id: 'c1-nerves', title: 'Turn nerves into energy',
        idea: 'Nerves are energy. Slow your breath and your first sentence, and the rest follows.',
        why: 'A racing heart feels like fear, but it is the same body state as excitement. Listeners can\'t see your heartbeat; they hear your pace. Slow the first ten seconds and you sound in control.',
        how: ['Breathe in for 4 counts, out for 6, twice, before you speak.', 'Say your first sentence 20% slower than feels natural.', 'Plant your feet and let your hands rest; stillness reads as calm.'],
        example: { weak: 'Um, so, okay, hi, I guess I\'ll just start…', strong: 'Good morning. I have three updates, and one decision I need from you.' },
        practice: { context: 'Your manager asks you to open today\'s meeting', prompt: 'Take two slow breaths, then open the meeting in 20 seconds.', frame: ['Greeting', 'What we\'ll cover', 'What you need'], secs: 30 },
        checks: [CALM_PACE, FEW_FILLERS, NO_SORRY],
        deeper: 'warmup',
      },
      {
        id: 'c1-speakup', title: 'Speak up in any room',
        idea: 'Speak in the first ten minutes. The longer you wait, the harder it gets.',
        why: 'People who speak early are seen as more engaged and more senior. The first contribution doesn\'t need to be brilliant: a question, a summary, or agreement with a reason all count.',
        how: ['Prepare one point or question before the meeting.', 'Enter with a bridge: "Building on what Maya said…"', 'Say it at full volume, then stop. Don\'t trail off.'],
        example: { weak: 'Sorry, this might be a dumb question, but…', strong: 'Building on Maya\'s point: what happens to the timeline if the vendor is late?' },
        practice: { context: 'A busy team meeting; others keep talking', prompt: 'Jump in with a bridge and make one point or ask one question.', frame: ['Bridge to what was said', 'Your point or question', 'Stop'], secs: 25 },
        checks: [{ t: 'include', any: ['building on', 'to add to', 'on that point', 'following up on', 'picking up on', 'adding to'], label: 'Opened with a bridge ("Building on…")' }, NO_SORRY, { t: 'words', max: 60, label: 'Kept it short (60 words or fewer)' }],
      },
      {
        id: 'c1-expertise', title: 'Own what you know',
        idea: 'State what you know as fact; save doubt for what you truly don\'t know.',
        why: 'Hedging everything makes your expertise sound like a guess. Leaders listen for a clear position and a reason. When you are unsure, one precise caveat sounds more credible than ten vague ones.',
        how: ['Lead with "I recommend" or "The data shows", not "I think maybe".', 'Give one reason with a number.', 'If unsure, give a confidence level: "I\'m 80% sure; I\'ll confirm by Friday."'],
        example: { weak: 'I think maybe we kind of need more testing?', strong: 'I recommend one more week of testing. Last release, two bugs reached customers.' },
        practice: { context: 'Your director asks for your view on launching next week', prompt: 'Give a clear recommendation with one reason.', frame: ['Recommendation', 'Reason with a number', 'One caveat, if any'], secs: 30 },
        checks: [NO_HEDGE, { t: 'include', any: ['i recommend', 'my recommendation', 'we should', 'the data shows', 'i suggest'], label: 'Clear position ("I recommend…")' }, NO_SORRY],
        deeper: 'swaps',
      },
      {
        id: 'c1-blank', title: 'Recover when your mind goes blank',
        idea: 'A blank mind is solved by a pause and a structure, not by filling the silence.',
        why: 'Everyone blanks. What listeners notice is panic: "um, uh, sorry". A two-second pause looks like thinking. A simple structure gets you moving again.',
        how: ['Pause and repeat the question in your own words.', 'Use "Point, reason, example" to rebuild the answer.', 'If you truly don\'t know: say so, share what you do know, and promise a follow-up.'],
        example: { weak: 'Uh… sorry, um, what was the question again? Um…', strong: 'Good question. Let me think. The short answer is yes, for one reason: …' },
        practice: { context: 'A senior leader asks you a question you didn\'t expect', prompt: '"What would you cut if the budget dropped 20%?" Pause, then answer.', frame: ['Pause and restate', 'Your point', 'One reason'], secs: 40 },
        checks: [{ t: 'pauses', min: 1, label: 'Took a pause instead of filling it' }, FEW_FILLERS, NO_SORRY],
        deeper: 'pressure',
      },
      {
        id: 'c1-wrong', title: 'Be wrong without shrinking',
        idea: 'Own a mistake in one sentence, then spend the rest on the fix.',
        why: 'Long apologies make a small mistake feel big. People trust those who own it quickly and move to the solution.',
        how: ['One clear ownership sentence: "That was my mistake."', 'The fix, already done or with a date.', 'What changes so it doesn\'t happen again.'],
        example: { weak: 'I\'m so sorry, I feel terrible, I don\'t know how this happened, sorry…', strong: 'That number was wrong; it was my mistake. The corrected report is in your inbox, and I\'ve added a check.' },
        practice: { context: 'You sent a report with a wrong number to your team', prompt: 'Tell the team, own it, and move to the fix.', frame: ['Ownership in one line', 'The fix', 'What changes'], secs: 30 },
        checks: [{ t: 'include', any: ['my mistake', 'my error', 'i made', 'that was on me', 'my fault', 'i missed'], label: 'Owned it in plain words' }, { t: 'avoid', words: ['so sorry', 'really sorry', 'terribly sorry', 'i feel terrible'], label: 'No over-apologizing' }, { t: 'words', max: 80, label: 'Short (80 words or fewer)' }],
      },
      {
        id: 'c1-wins', title: 'Talk about your wins',
        idea: 'Share results as facts with numbers. That isn\'t bragging; it\'s information.',
        why: 'If you don\'t say what you achieved, decision-makers don\'t know. Facts with numbers sound confident and modest at the same time.',
        how: ['Use "I" for your part and "we" for the team\'s.', 'Lead with the result and a number.', 'Say what it means for the business.'],
        example: { weak: 'It was nothing, the team did everything, I just helped a bit.', strong: 'I rebuilt the onboarding flow. Sign-ups rose 18% in a month, about 400 more customers.' },
        practice: { context: 'Your skip-level manager asks what you\'ve been working on', prompt: 'Share one recent win with a number and why it matters.', frame: ['What you did', 'The result, with a number', 'Why it matters'], secs: 30 },
        checks: [{ t: 'include', any: ['percent', '%', 'hundred', 'thousand', 'million', 'twice', 'double', 'half'], label: 'Used a number' }, { t: 'avoid', words: ['just helped', 'it was nothing', 'not a big deal', 'only did'], label: 'No downplaying' }, NO_HEDGE],
      },
    ],
  },
  {
    id: 'presence', title: 'Presence and first impressions', area: 'Presence', icon: 'user',
    blurb: 'Make a strong first impression, in person and on camera.',
    lessons: [
      {
        id: 'c2-first', title: 'First impression hacks',
        idea: 'In the first seven seconds, people judge warmth, then competence. Show both.',
        why: 'Before your words register, people read your smile, eye contact and pace. A warm opening plus a clear role makes people want to hear more.',
        how: ['Smile and say their name: "Hi Priya, good to meet you."', 'Say your role in one line, with one thing you\'re proud of.', 'End with a question about them.'],
        example: { weak: 'Hi, so I\'m, um, I work in, like, the data team, I guess.', strong: 'Hi Priya, good to meet you. I lead data quality; we cut report errors in half last year. What brings you to the project?' },
        practice: { context: 'You meet a new senior colleague at the start of a project', prompt: 'Introduce yourself in 20 seconds and end with a question.', frame: ['Warm greeting with their name', 'Your role and one win', 'A question about them'], secs: 25 },
        checks: [{ t: 'question', label: 'Ended with a question about them' }, FEW_FILLERS, NO_HEDGE, { t: 'self', label: 'I smiled and looked at them', camera: 'smile' }],
      },
      {
        id: 'c2-body', title: 'Body language that says confident',
        idea: 'Take up your space, keep your hands visible, and stay still when you make a point.',
        why: 'Fidgeting, crossed arms and a lowered head all signal nerves. Open, still posture signals that you\'re comfortable, and it changes how your voice sounds too.',
        how: ['Feet planted, shoulders back and down.', 'Hands visible, gestures between waist and chest.', 'Stop moving when you say your most important sentence.'],
        example: { weak: 'Arms crossed, looking at the floor, swaying.', strong: 'Standing tall, open hands, still on the key sentence.' },
        practice: { context: 'Stand up, phone in front of you like a camera', prompt: 'Give a 30-second update standing tall, with open hands, still on the key line.', frame: ['Headline', 'One detail', 'What you need'], secs: 35 },
        checks: [{ t: 'self', label: 'I stood tall with my feet planted' }, { t: 'self', label: 'My hands stayed open and visible' }, { t: 'self', label: 'I kept my head steady on the key line', camera: 'still' }, { t: 'variety', min: 4, label: 'Lively voice (4+ semitones)' }],
      },
      {
        id: 'c2-camera', title: 'Own the camera on video calls',
        idea: 'On video, the camera is their eyes. Look at the lens for key sentences.',
        why: 'Looking at faces on screen reads as looking down. Lens contact, good light and your face filling a third of the frame make you look present and credible.',
        how: ['Camera at eye level, light in front of you, not behind.', 'Look at the lens for your first and last sentence.', 'Lean in slightly and nod while others speak.'],
        example: { weak: 'Looking down at notes, camera below the chin, window behind you.', strong: 'Eye-level camera, face lit, eyes on the lens for the key point.' },
        practice: { context: 'Set your phone up like a video call', prompt: 'Make one key point to the camera, looking at the lens.', frame: ['Key point', 'Why it matters', 'What happens next'], secs: 30 },
        checks: [{ t: 'self', label: 'I looked at the lens, not the screen', camera: 'eye' }, { t: 'self', label: 'My face was lit from the front', camera: 'light' }, { t: 'self', label: 'My face filled about a third of the frame', camera: 'framing' }, FEW_FILLERS],
      },
      {
        id: 'c2-trust', title: 'Build trust with your voice',
        idea: 'Warm and low beats fast and high. End sentences down, not up.',
        why: 'A sentence that rises at the end sounds like a question, so your statement sounds unsure. A slightly lower, slower voice with downward endings sounds trustworthy.',
        how: ['Let the last word of each statement drop in pitch.', 'Slow down on numbers and names.', 'Smile slightly; people can hear it.'],
        example: { weak: 'We\'re on track? The launch is Monday?', strong: 'We\'re on track. The launch is Monday.' },
        practice: { context: 'A client asks if the project is on schedule', prompt: 'Reassure them with three short statements that end down.', frame: ['Status', 'One proof point', 'Next date'], secs: 25 },
        checks: [CALM_PACE, NO_HEDGE, { t: 'self', label: 'My sentences ended down, not up' }],
        deeper: 'variety',
      },
      {
        id: 'c2-pause', title: 'The power of a perfect pause',
        idea: 'A pause before your key point makes people lean in.',
        why: 'Silence feels long to the speaker and short to the listener. A one-second pause signals confidence and lets important words land.',
        how: ['Pause before the number or the decision.', 'Pause after a question; let others think.', 'Replace "um" with a silent breath.'],
        example: { weak: 'Um, so the result is, uh, we grew 20 percent, so, yeah.', strong: 'The result? … Twenty percent growth. … In one quarter.' },
        practice: { context: 'Sharing a big result with your team', prompt: 'Share one result. Pause before the number and after it.', frame: ['Set it up', 'Pause, then the number', 'Pause, then what it means'], secs: 30 },
        checks: [PAUSES, FEW_FILLERS, CALM_PACE],
        deeper: 'pauses',
      },
      {
        id: 'c2-close', title: 'Finish strong',
        idea: 'Your last sentence is what people remember. Plan it, say it, then stop.',
        why: 'Many speakers fade out with "so, yeah, that\'s it". A planned closing line, a clear ask or summary, leaves a strong last impression.',
        how: ['End with the one thing you want them to do or remember.', 'Say it slower and lower than the rest.', 'Stop. Don\'t add "anyway" or "so yeah".'],
        example: { weak: 'So, yeah, I guess that\'s it, any questions or whatever.', strong: 'So my ask is simple: approve the pilot today, and we start Monday.' },
        practice: { context: 'End of your presentation to leadership', prompt: 'Close with a clear ask in two sentences.', frame: ['One-line summary', 'The ask', 'Stop'], secs: 20 },
        checks: [{ t: 'avoid', words: ['so yeah', 'that\'s it', 'or whatever', 'i guess', 'anyway'], label: 'No fade-out ("so yeah", "that\'s it")' }, { t: 'words', max: 45, label: 'Short and sharp (45 words or fewer)' }, CALM_PACE],
      },
    ],
  },
  {
    id: 'message', title: 'Say it so it sticks', area: 'Message', icon: 'blocks',
    blurb: 'Stories, numbers and structure people remember.',
    lessons: [
      {
        id: 'c3-bluf', title: 'Bottom line first',
        idea: 'Say the conclusion first, then the reasons.',
        why: 'Busy people decide in the first ten seconds whether to listen. Leading with the answer respects their time and makes you sound decisive.',
        how: ['Start with the answer or decision.', 'Give two or three reasons.', 'End with the next step.'],
        example: { weak: 'So, a lot happened this week, the vendor called, then we looked at options…', strong: 'We need two more weeks. The vendor is late, and testing found three bugs. I\'ll confirm the new date Friday.' },
        practice: { context: 'Your manager, in the hallway: "Where are we on the project?"', prompt: 'Answer with the bottom line first.', frame: ['Bottom line', 'Two reasons', 'Next step'], secs: 30 },
        checks: [{ t: 'words', max: 70, label: 'Concise (70 words or fewer)' }, NO_HEDGE, FEW_FILLERS],
        deeper: 'structure',
      },
      {
        id: 'c3-story', title: 'Storytelling secrets',
        idea: 'A good work story has a moment, a problem, a turn and a lesson, in under a minute.',
        why: 'People forget data but remember stories. A short story with a real moment makes your point stick and makes you relatable.',
        how: ['Start in a moment: "Last March, at 2 a.m., our site went down."', 'Name the problem and what was at stake.', 'Show the turn, then one-line lesson.'],
        example: { weak: 'We had some issues and fixed them and learned stuff.', strong: 'Last March our site went down on launch night. We had one hour. We rolled back, then added a test that has caught twelve bugs since. Lesson: test the rollback, not just the launch.' },
        practice: { context: 'An interviewer asks: "Tell me about a challenge you overcame."', prompt: 'Tell a short story with a moment, a turn and a lesson.', frame: ['The moment', 'The problem', 'The turn', 'The lesson'], secs: 60 },
        checks: [{ t: 'words', min: 30, max: 180, label: 'A full story (30–180 words)' }, { t: 'include', any: ['lesson', 'learned', 'since then', 'now we', 'taught me'], label: 'Ended with the lesson' }, { t: 'variety', min: 4, label: 'Lively voice (4+ semitones)' }],
        deeper: 'simulator',
      },
      {
        id: 'c3-numbers', title: 'Make numbers memorable',
        idea: 'One number, made human, beats ten numbers on a slide.',
        why: 'Listeners can hold about one number at a time. Rounding and comparing to something familiar makes it stick.',
        how: ['Pick the one number that matters most.', 'Round it: "about a third", not "32.7%".', 'Compare it: "that\'s a full workday every week".'],
        example: { weak: 'Processing time decreased from 47.3 to 31.8 minutes, a 32.77% improvement.', strong: 'We cut processing time by a third. That gives each analyst back an hour a day.' },
        practice: { context: 'Presenting results to leadership', prompt: 'Share one result: round it, then compare it to something familiar.', frame: ['The rounded number', 'The comparison', 'So what'], secs: 30 },
        checks: [{ t: 'include', any: ['that\'s', 'that is', 'like', 'same as', 'equal to', 'every day', 'every week', 'a day', 'a week'], label: 'Made it relatable ("that\'s like…")' }, { t: 'pauses', min: 1, label: 'Paused around the number' }, { t: 'words', max: 70, label: 'Concise (70 words or fewer)' }],
      },
      {
        id: 'c3-why', title: 'Persuade with "why it matters to you"',
        idea: 'People say yes to what helps them. Frame your idea in their goals.',
        why: 'An idea framed around your needs gets polite nods. The same idea framed around their goals, costs or risks gets action.',
        how: ['Name their goal first: "You want fewer escalations."', 'Show how your idea serves it.', 'Make the ask small and specific.'],
        example: { weak: 'I want to try this new tool because I like it.', strong: 'You want fewer customer escalations. This tool flags them a day earlier. Can we pilot it with one team for two weeks?' },
        practice: { context: 'Pitching an idea to a skeptical manager', prompt: 'Pitch one idea framed around their goal, with a small ask.', frame: ['Their goal', 'How your idea helps', 'A small ask'], secs: 40 },
        checks: [{ t: 'include', any: ['you want', 'your goal', 'for you', 'your team', 'helps you', 'you\'ll', 'you get'], label: 'Framed around their goal' }, { t: 'question', label: 'Ended with a clear ask' }, NO_HEDGE],
      },
      {
        id: 'c3-simple', title: 'Explain anything simply',
        idea: 'If a 12-year-old can follow it, an executive will thank you.',
        why: 'Jargon makes listeners work and switch off. A one-line definition plus an everyday comparison makes complex things clear.',
        how: ['Define it in one plain sentence.', 'Add an everyday analogy.', 'Say why it matters to them.'],
        example: { weak: 'It\'s an asynchronous event-driven microservice mesh with eventual consistency.', strong: 'It\'s like a post office for our apps: messages wait in line, so nothing is lost when one app is busy.' },
        practice: { context: 'A non-technical client asks about something from your work', prompt: 'Explain one concept from your job with a plain definition and an analogy.', frame: ['Plain definition', 'Everyday analogy', 'Why it matters'], secs: 40 },
        checks: [{ t: 'include', any: ['like a', 'like the', 'think of', 'imagine', 'similar to', 'it\'s like'], label: 'Used an analogy ("it\'s like…")' }, { t: 'words', max: 110, label: 'Concise (110 words or fewer)' }, CALM_PACE],
      },
      {
        id: 'c3-open', title: 'Open a talk with a hook',
        idea: 'Start with a surprising number, a question or a moment, never with "So, today I\'ll talk about…".',
        why: 'The first 20 seconds decide whether people pay attention. A hook creates curiosity; an agenda creates yawns.',
        how: ['Open with a number, a question, or a short moment.', 'Say why it matters to this audience.', 'Promise what they\'ll get.'],
        example: { weak: 'So, um, today I\'ll be talking about our onboarding process.', strong: 'Four out of ten new customers leave in the first week. Today I\'ll show you why, and the fix that keeps them.' },
        practice: { context: 'You\'re presenting to a room of 30 people', prompt: 'Open your talk with a hook in 20 seconds.', frame: ['Hook', 'Why it matters', 'The promise'], secs: 25 },
        checks: [{ t: 'avoid', words: ['today i\'ll be talking', 'today i will talk', 'i\'m going to talk about', 'so today'], label: 'No flat "Today I\'ll talk about…" opening' }, FEW_FILLERS, { t: 'variety', min: 4, label: 'Lively voice (4+ semitones)' }],
      },
    ],
  },
  {
    id: 'tough', title: 'Hard conversations', area: 'Interaction', icon: 'chat',
    blurb: 'Feedback, conflict, difficult people, and saying no.',
    lessons: [
      {
        id: 'c4-feedback', title: 'Give tough feedback fast',
        idea: 'Situation, behavior, impact, request. Kind, specific and short.',
        why: 'Vague feedback ("be more proactive") feels personal and changes nothing. Specific feedback about one behavior and its impact is fair and actionable.',
        how: ['Situation: "In yesterday\'s client call…"', 'Behavior and impact: "…you interrupted twice, and the client went quiet."', 'Request: "Next time, let them finish, then add your point."'],
        example: { weak: 'You\'re kind of not a team player sometimes, maybe work on that?', strong: 'In yesterday\'s call, you interrupted the client twice, and they went quiet. Next time, let them finish, then add your point.' },
        practice: { context: 'A teammate keeps missing deadlines on shared work', prompt: 'Give them feedback using situation, behavior, impact, request.', frame: ['Situation', 'Behavior', 'Impact', 'Request'], secs: 45 },
        checks: [{ t: 'include', any: ['next time', 'going forward', 'could you', 'i\'d like you to', 'i need you to', 'please'], label: 'Made a clear request' }, NO_HEDGE, NO_SORRY],
        deeper: 'simulator',
      },
      {
        id: 'c4-criticism', title: 'Take criticism without defending',
        idea: 'Thank, clarify, then commit. Defending can wait until you understand.',
        why: 'Jumping to defend makes people stop giving you feedback. Asking one clarifying question shows maturity and often reveals the real issue.',
        how: ['Thank them: "Thanks for telling me directly."', 'Ask one question: "Can you give me an example?"', 'Commit to one change.'],
        example: { weak: 'That\'s not fair, it wasn\'t my fault, the data was late.', strong: 'Thanks for telling me. Can you give me an example? … I see it. I\'ll send drafts a day earlier.' },
        practice: { context: 'Your manager says your reports are hard to follow', prompt: 'Respond: thank, ask one question, commit to a change.', frame: ['Thank them', 'One clarifying question', 'One commitment'], secs: 35 },
        checks: [{ t: 'include', any: ['thank', 'thanks', 'appreciate'], label: 'Thanked them' }, { t: 'question', label: 'Asked a clarifying question' }, { t: 'avoid', words: ['not my fault', 'not fair', 'but i', 'that\'s wrong'], label: 'Didn\'t get defensive' }],
      },
      {
        id: 'c4-no', title: 'Say "no" and be likable',
        idea: 'A good no has three parts: appreciation, a clear no with a reason, and an alternative.',
        why: 'Saying yes to everything burns you out and lowers your quality. A warm, clear no with an alternative protects your time and the relationship.',
        how: ['Appreciate: "Thanks for thinking of me."', 'Clear no with the real reason: "I\'m committed to the launch this week."', 'Offer an alternative: a later date, a smaller part, or someone else.'],
        example: { weak: 'Um, I\'m so sorry, maybe, I don\'t know, I\'ll try?', strong: 'Thanks for thinking of me. I can\'t take this on this week; the launch needs my focus. I can help next Tuesday, or suggest someone now.' },
        practice: { context: 'A senior colleague asks you to take on extra work this week', prompt: 'Say no warmly, with a reason and an alternative.', frame: ['Appreciation', 'Clear no with a reason', 'An alternative'], secs: 30 },
        checks: [{ t: 'include', any: ['can\'t', 'cannot', 'won\'t be able', 'not able to', 'have to say no', 'need to pass', 'i\'ll pass'], label: 'Said a clear no' }, { t: 'include', any: ['instead', 'next week', 'tuesday', 'monday', 'wednesday', 'thursday', 'friday', 'later', 'suggest', 'how about', 'i can'], label: 'Offered an alternative' }, NO_SORRY, NO_HEDGE],
      },
      {
        id: 'c4-conflict', title: 'Defuse any conflict',
        idea: 'Lower the temperature first: name the shared goal, then the problem, never the person.',
        why: 'In conflict, people defend their identity. Naming a shared goal turns opponents into partners, and talking about the problem, not the person, keeps it solvable.',
        how: ['Slow down and lower your voice.', 'Name the shared goal: "We both want this launch to go well."', 'Describe the problem neutrally and propose a next step.'],
        example: { weak: 'You always do this, you never listen to the team.', strong: 'We both want this launch to go well. Right now, the two plans conflict on dates. Can we take ten minutes to pick one together?' },
        practice: { context: 'Two teams are arguing about who owns a delayed task', prompt: 'Step in and lower the temperature.', frame: ['Shared goal', 'The problem, neutrally', 'A next step'], secs: 40 },
        checks: [{ t: 'include', any: ['we both', 'we all', 'our goal', 'shared', 'together', 'same goal'], label: 'Named the shared goal' }, { t: 'avoid', words: ['you always', 'you never', 'your fault'], label: 'No "you always / you never"' }, CALM_PACE],
      },
      {
        id: 'c4-difficult', title: 'Handle difficult people smartly',
        idea: 'Stay calm, acknowledge, set the boundary, redirect to the work.',
        why: 'Difficult behavior feeds on reaction. Calm acknowledgment takes the heat out; a clear boundary and redirect keeps you in control.',
        how: ['Acknowledge the feeling, not the attack: "I can see this is frustrating."', 'Set the boundary: "Let\'s keep it to the facts."', 'Redirect: "Here\'s what I can do by Friday."'],
        example: { weak: 'Well, you\'re being really rude right now, so…', strong: 'I can see this is frustrating. Let\'s keep it to the facts. Here\'s what I can do by Friday.' },
        practice: { context: 'A stakeholder is being dismissive and sharp in a meeting', prompt: 'Respond: acknowledge, set a boundary, redirect.', frame: ['Acknowledge', 'Boundary', 'Redirect to the work'], secs: 35 },
        checks: [{ t: 'include', any: ['i can see', 'i understand', 'i hear', 'i get that', 'makes sense'], label: 'Acknowledged the feeling' }, { t: 'include', any: ['let\'s', 'here\'s what', 'what i can do', 'next step', 'focus on'], label: 'Redirected to the work' }, CALM_PACE],
      },
      {
        id: 'c4-disagree', title: 'Disagree with your boss',
        idea: 'Disagree in private, early, with data, and end with "your call".',
        why: 'Good managers want to hear concerns before decisions are final. Data plus respect for their authority makes it safe to disagree.',
        how: ['Ask for a moment: "Can I share a concern?"', 'Give the concern with one fact.', 'Offer an option, then: "It\'s your call; I\'ll support either way."'],
        example: { weak: 'That plan is wrong, everyone thinks so.', strong: 'Can I share a concern? Last time we cut testing, support tickets doubled. One option is a two-week beta. It\'s your call.' },
        practice: { context: 'Your boss wants to cut the testing phase to hit a date', prompt: 'Disagree respectfully with a fact and an option.', frame: ['Ask to share', 'Concern with one fact', 'An option + "your call"'], secs: 40 },
        checks: [{ t: 'include', any: ['your call', 'your decision', 'up to you', 'i\'ll support', 'happy to go with'], label: 'Respected their decision' }, { t: 'include', any: ['option', 'alternative', 'instead', 'we could', 'what if'], label: 'Offered an option' }, NO_SORRY],
      },
    ],
  },
  {
    id: 'people', title: 'People skills', area: 'Interaction', icon: 'user',
    blurb: 'Listen, read the room, and connect with anyone.',
    lessons: [
      {
        id: 'c5-listen', title: 'Listen like a leader',
        idea: 'Reflect what you heard before you respond. People feel heard, and you avoid misunderstandings.',
        why: 'Most people listen to reply. Summarizing first shows respect, catches misunderstandings, and makes your answer land better.',
        how: ['Reflect: "So what I\'m hearing is…"', 'Check: "Did I get that right?"', 'Then respond with your view.'],
        example: { weak: 'Yeah yeah, but what I think is…', strong: 'So what I\'m hearing is the deadline matters more than the scope. Did I get that right?' },
        practice: { context: 'A colleague explained their worries about the new process', prompt: 'Reflect back what they said, check it, then respond briefly.', frame: ['Reflect', 'Check', 'Your response'], secs: 35 },
        checks: [{ t: 'include', any: ['what i\'m hearing', 'what i hear', 'sounds like', 'if i understand', 'so you\'re saying', 'you\'re saying'], label: 'Reflected what you heard' }, { t: 'question', label: 'Checked you got it right' }, CALM_PACE],
      },
      {
        id: 'c5-room', title: 'Read the room',
        idea: 'Watch for energy, confusion and silence, and adjust out loud.',
        why: 'Great communicators notice when people are lost, bored or tense, and adapt. Saying it out loud ("I\'m seeing some puzzled faces") builds trust.',
        how: ['Scan faces at the end of each point.', 'Name what you see: "Looks like this needs a better example."', 'Adjust: slow down, give an example, or ask a question.'],
        example: { weak: 'Keeps reading slides while people look at their phones.', strong: '"I\'m seeing some puzzled faces; let me give a quick example. Does that help?"' },
        practice: { context: 'Mid-presentation, people look confused', prompt: 'Name what you see and adjust with an example or a question.', frame: ['Name what you see', 'Adjust', 'Check in'], secs: 30 },
        checks: [{ t: 'include', any: ['i\'m seeing', 'i see', 'looks like', 'i notice', 'seems like'], label: 'Named what you noticed' }, { t: 'question', label: 'Checked in with a question' }, FEW_FILLERS],
      },
      {
        id: 'c5-small', title: 'Small talk magic',
        idea: 'Notice, ask, share: three moves that turn small talk into connection.',
        why: 'Small talk is how trust starts. Open questions about something you both see, plus a little about yourself, beat talking about the weather.',
        how: ['Notice something shared: the event, the coffee, the project.', 'Ask an open question: "What got you into…?"', 'Share a little, then ask again.'],
        example: { weak: 'Nice weather. … Yeah.', strong: 'This is a great turnout. What brought you here today? I came for the AI talk; I\'m trying it on our support team.' },
        practice: { context: 'Before a meeting starts, you\'re next to someone you don\'t know', prompt: 'Start a short conversation: notice, ask, share.', frame: ['Notice', 'Open question', 'Share a little'], secs: 30 },
        checks: [{ t: 'question', label: 'Asked an open question' }, { t: 'include', any: ['i ', 'i\'m', 'my '], label: 'Shared something about yourself' }, { t: 'variety', min: 4, label: 'Warm, lively voice (4+ semitones)' }],
      },
      {
        id: 'c5-questions', title: 'Ask questions that open people up',
        idea: 'Ask "what" and "how", not "yes or no".',
        why: 'Closed questions get one-word answers. Open questions invite people to think and share, which gives you better information and better relationships.',
        how: ['Start with "What" or "How".', 'Ask about their view: "What would you do differently?"', 'Follow up once: "Tell me more about that."'],
        example: { weak: 'Was the project good?', strong: 'What was the hardest part of the project, and how did you handle it?' },
        practice: { context: 'A one-on-one with a new team member', prompt: 'Ask two open questions to get to know how they work.', frame: ['Open question', 'Follow-up', 'Thank them'], secs: 30 },
        checks: [{ t: 'include', any: ['what', 'how'], label: 'Used "what" or "how" questions' }, { t: 'question', label: 'Asked questions' }, CALM_PACE],
      },
      {
        id: 'c5-interrupt', title: 'Interrupt smoothly',
        idea: 'Use their name, a quick bridge, and your point, without apologizing.',
        why: 'In fast meetings, waiting for a perfect pause means never speaking. A respectful interruption with a name and a bridge is normal and effective.',
        how: ['Say their name: "Sam,"', 'Bridge: "can I add one thing to that?"', 'Make your point in one or two sentences, then hand back.'],
        example: { weak: 'Sorry, sorry, can I just, sorry…', strong: 'Sam, can I add one thing? The vendor confirmed Friday, so we\'re clear to go.' },
        practice: { context: 'A colleague is talking at length and you have a key fact', prompt: 'Interrupt smoothly and make your point in two sentences.', frame: ['Name', 'Bridge', 'Your point', 'Hand back'], secs: 20 },
        checks: [NO_SORRY, { t: 'include', any: ['can i add', 'let me add', 'one thing', 'quick point', 'if i may', 'jump in'], label: 'Used a bridge ("Can I add one thing?")' }, { t: 'words', max: 45, label: 'Short (45 words or fewer)' }],
      },
      {
        id: 'c5-network', title: 'Network without feeling fake',
        idea: 'Be curious and helpful. Networking is just conversation with a follow-up.',
        why: 'People remember those who were interested and useful, not those who pitched. A specific compliment, a real question and a follow-up build lasting connections.',
        how: ['Open with something specific: "Your point about pricing stuck with me."', 'Ask about their work and listen.', 'Offer something and suggest a follow-up.'],
        example: { weak: 'Hi, here\'s my card, I\'m looking for a job.', strong: 'Your point about pricing stuck with me. How did your team test it? I\'d love to send you an article we used. Can I connect with you?' },
        practice: { context: 'After a conference talk, you approach the speaker', prompt: 'Start a genuine conversation and suggest a follow-up.', frame: ['Specific compliment', 'A real question', 'Offer and follow-up'], secs: 35 },
        checks: [{ t: 'question', label: 'Asked about them' }, { t: 'include', any: ['connect', 'follow up', 'send you', 'coffee', 'stay in touch', 'reach out'], label: 'Suggested a follow-up' }, FEW_FILLERS],
      },
    ],
  },
  {
    id: 'meetings', title: 'Meetings that move', area: 'Situations', icon: 'mic',
    blurb: 'Updates, Q&A, put-on-the-spot moments, and wrap-ups.',
    lessons: [
      {
        id: 'c6-update', title: 'The 30-second status update',
        idea: 'Status, next step, help needed. Three sentences.',
        why: 'Long updates lose the room. A tight three-part update shows control and leaves time for decisions.',
        how: ['Status in one line: "On track for Monday."', 'Next step with a date.', 'One thing you need, or "nothing needed".'],
        example: { weak: 'So, this week was busy, we did a lot of things, um, the vendor…', strong: 'On track for Monday. Testing finishes Thursday. I need sign-off from legal by Wednesday.' },
        practice: { context: 'Your turn in the weekly team meeting', prompt: 'Give your update in three sentences.', frame: ['Status', 'Next step', 'Help needed'], secs: 30 },
        checks: [{ t: 'words', max: 55, label: 'Tight (55 words or fewer)' }, FEW_FILLERS, NO_HEDGE],
        deeper: 'simulator',
      },
      {
        id: 'c6-open', title: 'Open a meeting with purpose',
        idea: 'Purpose, agenda, outcome, in the first 30 seconds.',
        why: 'Meetings without a clear purpose drift. Saying what you\'ll decide and by when keeps everyone focused and makes you look like a leader.',
        how: ['Purpose: "We\'re here to decide the launch date."', 'Agenda: two or three items.', 'Outcome: "By 10:30 we\'ll have a date and owners."'],
        example: { weak: 'Okay, so, um, let\'s get started I guess, so, what\'s everyone working on?', strong: 'We\'re here to pick the launch date. Two items: the test results, then the decision. By 10:30 we\'ll have a date and owners.' },
        practice: { context: 'You\'re running the kickoff meeting', prompt: 'Open with purpose, agenda and outcome.', frame: ['Purpose', 'Agenda', 'Outcome'], secs: 30 },
        checks: [{ t: 'include', any: ['decide', 'goal', 'purpose', 'here to', 'by the end', 'outcome'], label: 'Stated the purpose or outcome' }, FEW_FILLERS, NO_HEDGE],
      },
      {
        id: 'c6-spot', title: 'Answer when put on the spot',
        idea: 'Pause, give a short answer, offer to follow up with detail.',
        why: 'Cold questions test composure, not knowledge. A pause and a short honest answer beats a long nervous one.',
        how: ['Pause for a breath.', 'Give the short answer first.', 'Offer detail later: "I\'ll send the numbers after this."'],
        example: { weak: 'Uh, well, it\'s complicated, there are a lot of factors, um…', strong: 'Short answer: yes, we\'re within budget. I\'ll send the detailed numbers after this meeting.' },
        practice: { context: 'The VP turns to you: "Are we on budget?"', prompt: 'Pause, answer briefly, offer a follow-up.', frame: ['Pause', 'Short answer', 'Follow-up offer'], secs: 25 },
        checks: [{ t: 'pauses', min: 1, label: 'Paused before answering' }, { t: 'words', max: 50, label: 'Brief (50 words or fewer)' }, FEW_FILLERS],
        deeper: 'pressure',
      },
      {
        id: 'c6-qa', title: 'Handle Q&A like a pro',
        idea: 'Repeat the question, answer directly, check you answered it.',
        why: 'Repeating the question buys thinking time and helps everyone hear it. A direct answer and a quick check shows confidence.',
        how: ['Repeat or rephrase the question.', 'Answer in two or three sentences.', 'Check: "Does that answer it?"'],
        example: { weak: 'Yeah, so, um, that\'s a good question, there are many aspects…', strong: 'The question is whether this works on mobile. Yes, it does; we tested it on 200 phones. Does that answer it?' },
        practice: { context: 'After your talk, someone asks: "How confident are you in these numbers?"', prompt: 'Repeat the question, answer, then check.', frame: ['Repeat the question', 'Direct answer', 'Check'], secs: 35 },
        checks: [{ t: 'question', label: 'Checked that you answered it' }, NO_HEDGE, FEW_FILLERS],
      },
      {
        id: 'c6-deadline', title: 'Push back on a deadline',
        idea: 'Agree with the goal, show the trade-off, offer options.',
        why: 'Saying yes to an impossible date hurts everyone later. Showing the trade-off and offering choices keeps you a partner, not a blocker.',
        how: ['Agree with the goal: "I want Friday too."', 'Show the trade-off: "Friday means skipping testing."', 'Offer two options and ask them to choose.'],
        example: { weak: 'Um, I\'m not sure, maybe Friday is a bit hard, I\'ll try…', strong: 'I want Friday too. To hit it we\'d skip testing. Option one: core features Friday, reports next week. Option two: everything the following Wednesday. Which do you prefer?' },
        practice: { context: 'A client wants delivery two weeks earlier than planned', prompt: 'Push back with the trade-off and two options.', frame: ['Agree with the goal', 'The trade-off', 'Two options'], secs: 45 },
        checks: [{ t: 'include', any: ['option', 'either', 'or we', 'alternatively', 'choice'], label: 'Offered options' }, NO_HEDGE, NO_SORRY],
        deeper: 'simulator',
      },
      {
        id: 'c6-wrap', title: 'Wrap up with decisions and owners',
        idea: 'End every meeting with what was decided, who owns what, and by when.',
        why: 'Most meetings end with "great, thanks everyone" and nothing happens. A 20-second recap turns talk into action, and the person who does it is seen as the leader.',
        how: ['Decisions: "We agreed on Monday."', 'Owners and dates: "Priya, the test plan by Thursday."', 'Next check-in.'],
        example: { weak: 'Okay, great, thanks everyone, talk soon.', strong: 'To recap: launch is Monday. Priya owns testing by Thursday, I\'ll update the client today. We check in Wednesday.' },
        practice: { context: 'Last two minutes of a project meeting', prompt: 'Recap decisions, owners and dates.', frame: ['Decisions', 'Owners and dates', 'Next check-in'], secs: 30 },
        checks: [{ t: 'include', any: ['recap', 'we agreed', 'we decided', 'to summarize', 'so we'], label: 'Recapped the decisions' }, { t: 'include', any: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'tomorrow', 'today', 'next week', 'by end of'], label: 'Gave dates' }, FEW_FILLERS],
      },
    ],
  },
];

export const ALL_COURSE_LESSONS = COURSES.flatMap((c) => c.lessons.map((l) => ({ ...l, course: c })));
export const courseLessonById = (id: string) => ALL_COURSE_LESSONS.find((l) => l.id === id);
export const courseById = (id: string) => COURSES.find((c) => c.id === id);

// ---------- checking a take against the lesson ----------

export interface CheckResult {
  label: string;
  /** null when it couldn't be measured (no voice data, or a self-check not answered). */
  pass: boolean | null;
  self?: boolean;
}

const norm = (t: string) => ` ${t.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9%' ]+/g, ' ').replace(/\s+/g, ' ')} `;
const has = (text: string, phrase: string) => {
  const p = norm(phrase).trim();
  return p === '%' ? text.includes('%') : text.includes(` ${p} `);
};
const QUESTION = /\b(what|how|why|when|where|who|which|could you|would you|can you|can i|can we|do you|does|did you|is there|are you|will you|shall we|should we|any thoughts|right)\b/;

export interface TakeData {
  transcript: string;
  words: number;
  wpm: number | null;
  pauses: number | null;
  pitchRangeSt: number | null;
  fillersPerMin: number | null;
}

export function runChecks(checks: Check[], take: TakeData, selfTicks: Record<string, boolean> = {}, cam: PresenceSummary | null = null): CheckResult[] {
  const raw = take.transcript;
  const text = norm(raw);
  return checks.map((c): CheckResult => {
    switch (c.t) {
      case 'avoid':
        return { label: c.label, pass: raw.trim() ? !c.words.some((w) => has(text, w)) : null };
      case 'include':
        return { label: c.label, pass: raw.trim() ? c.any.some((w) => has(text, w)) : null };
      case 'question':
        return { label: c.label, pass: raw.trim() ? raw.includes('?') || QUESTION.test(text) : null };
      case 'words':
        return { label: c.label, pass: take.words ? (c.min === undefined || take.words >= c.min) && (c.max === undefined || take.words <= c.max) : null };
      case 'pauses':
        return { label: c.label, pass: take.pauses === null ? null : take.pauses >= c.min };
      case 'pace':
        return { label: c.label, pass: take.wpm === null ? null : take.wpm >= c.lo && take.wpm <= c.hi };
      case 'variety':
        return { label: c.label, pass: take.pitchRangeSt === null ? null : take.pitchRangeSt >= c.min };
      case 'fillers':
        return { label: c.label, pass: take.fillersPerMin === null ? null : take.fillersPerMin <= c.maxPerMin };
      case 'self':
        if (c.camera && cam && cam.facePct >= 40) {
          const pass = c.camera === 'eye' ? cam.eyeContactPct >= 60 : c.camera === 'light' ? cam.lighting === 'good' : c.camera === 'still' ? cam.stillness >= 55 : c.camera === 'framing' ? cam.framing === 'good' : cam.smilePct >= 10;
          return { label: `${c.label} (camera)`, pass };
        }
        return { label: c.label, pass: c.label in selfTicks ? selfTicks[c.label] : null, self: true };
    }
  });
}

/** Lesson passes when every measurable check passes, or all but one with a decent overall score. */
export function lessonPassed(results: CheckResult[], overall: number): boolean {
  const known = results.filter((r) => r.pass !== null && !r.self);
  const failed = known.filter((r) => !r.pass).length;
  if (!known.length) return overall >= 60;
  return failed === 0 || (failed === 1 && known.length >= 3 && overall >= 65);
}
