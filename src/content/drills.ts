// Practice content: swap cards, tongue twisters, reading passages, emphasis lines, warm-up, pronunciation.
import { MORE_EMPHASIS, MORE_EXPRESSIVE, MORE_PASSAGES, MORE_SWAPS, MORE_TWISTERS } from './more';

export interface SwapCard {
  weak: string;
  strong: string;
  wrong: [string, string];
  why: string;
  tag: 'apology' | 'hedge' | 'regional' | 'filler' | 'permission';
  /** Weak-language rule this card trains (links cards to the user's habits). */
  rule?: string;
}

const BASE_SWAPS: SwapCard[] = [
  { tag: 'apology', weak: 'Sorry to bother you, but do you have a minute?', strong: 'Do you have a minute?', wrong: ['Sorry, sorry, quick question?', "I'm sorry if this is a bad time, but…"], why: 'Asking a question is not an offense. Drop the apology.' },
  { tag: 'apology', weak: 'Sorry for the late reply.', strong: 'Thanks for your patience.', wrong: ['Sorry sorry, I was very busy.', 'So sorry, apologies for the delay.'], why: 'Thank people for what they gave you instead of apologizing.' },
  { tag: 'apology', weak: 'Sorry, I didn\'t understand.', strong: 'Could you say that another way?', wrong: ['Sorry sorry, what?', "Sorry, I'm confused, sorry."], why: 'Ask for what you need.' },
  { tag: 'apology', weak: 'Sorry, can I just add something?', strong: "I'd like to add one point.", wrong: ['Sorry sorry, just one small thing?', "If that's okay, can I maybe add?"], why: 'Claim the floor. You don\'t need permission to speak.' },
  { tag: 'apology', weak: 'Sorry for the long email.', strong: 'Here are the details you asked for.', wrong: ['Apologies for the length, sorry.', 'Sorry, this is a long one, sorry.'], why: 'Frame it as useful, not as a burden.' },
  { tag: 'apology', weak: 'Sorry, I\'m running late.', strong: 'Thanks for waiting. I\'m two minutes away.', wrong: ['So sorry, sorry, almost there.', 'Sorry, very sorry for this.'], why: 'Thank them and give a concrete update.' },
  { tag: 'hedge', weak: 'I think maybe we should push the release?', strong: 'I recommend we move the release to Friday.', wrong: ['I feel like maybe pushing it could kind of help.', 'Maybe we push it? Not sure.'], why: 'Recommend, and name the date.' },
  { tag: 'hedge', weak: "I'll try to get it done by Friday.", strong: "I'll have it done by Friday.", wrong: ["I'll try my best, hopefully Friday.", "Maybe Friday, I'll try."], why: 'Commit. If there\'s a risk, name it.' },
  { tag: 'hedge', weak: "I'm not an expert, but I feel like the numbers are off.", strong: "The numbers look off: Q3 revenue doesn't match the forecast.", wrong: ['I could be wrong, but maybe the numbers are kind of off?', "Sorry, I'm no expert, but…"], why: 'Lead with the point and the evidence.' },
  { tag: 'hedge', weak: 'Hopefully we\'ll hit the target.', strong: "We're on track to hit the target. The risk is vendor delays.", wrong: ['Hopefully, fingers crossed.', "We'll try, hopefully."], why: 'Show confidence and name the real risk.' },
  { tag: 'hedge', weak: 'This might be a stupid question, but…', strong: 'One question about the timeline:', wrong: ['Sorry, maybe stupid, but…', 'I guess this is dumb, but…'], why: 'Never discount your question before you ask it.' },
  { tag: 'hedge', weak: 'I just wanted to check if you saw my email.', strong: 'Following up on my email from Tuesday.', wrong: ["I just wanted to quickly check, if that's okay.", 'Sorry, did you maybe get a chance to see it?'], why: '"Just" shrinks your request.' },
  { tag: 'hedge', weak: 'I kind of think this approach is better?', strong: 'This approach is faster and cheaper. I recommend it.', wrong: ['I sort of feel this one is better?', 'Maybe this one is kind of better?'], why: 'Say it as a statement, with your reason.' },
  { tag: 'hedge', weak: 'I guess we could try that.', strong: "Let's try that and review on Monday.", wrong: ['I guess, maybe, sure.', "I guess it's fine, I don't know."], why: 'Agree with a plan, not a shrug.' },
  { tag: 'permission', weak: 'Does that make sense?', strong: 'What questions do you have?', wrong: ['Is it making sense or not?', 'Sorry, was that confusing?'], why: 'Invite questions without doubting yourself.' },
  { tag: 'permission', weak: "If it's okay, could we maybe talk about my promotion?", strong: "I'd like to discuss my promotion. Do you have 20 minutes this week?", wrong: ["If that's alright, maybe we could talk sometime?", 'Sorry, is it okay if we talk about it?'], why: 'State the topic and propose a time.' },
  { tag: 'regional', weak: 'Please do the needful.', strong: 'Could you approve the invoice by Thursday?', wrong: ['Kindly do the needful at the earliest.', 'Please do it, please.'], why: 'Name the exact action and the deadline.' },
  { tag: 'regional', weak: 'Kindly revert back at the earliest.', strong: 'Could you reply by end of day?', wrong: ['Please revert back ASAP.', 'Kindly revert back soon.'], why: 'In North America "revert" means undo. Say "reply."' },
  { tag: 'regional', weak: 'Can we prepone the meeting?', strong: 'Can we move the meeting earlier, to 2 pm?', wrong: ['Can we prepone it to before?', 'Can we do it early-early?'], why: '"Prepone" is unfamiliar outside India.' },
  { tag: 'regional', weak: 'I have a doubt about the report.', strong: 'I have a question about the report.', wrong: ['I am having one doubt.', 'Small doubt, please clarify.'], why: 'In US English "doubt" means you don\'t believe it.' },
  { tag: 'regional', weak: 'Is it? Okay, okay.', strong: 'Got it. Thanks.', wrong: ['Is it? Really? Okay okay.', 'Ohh, is it?'], why: 'Confirm once, cleanly.' },
  { tag: 'regional', weak: 'Please find attached the file for your kind perusal.', strong: "I've attached the file. The key numbers are on page 2.", wrong: ['Kindly find attached for your perusal.', 'PFA, please check, please.'], why: 'Plain words and a pointer to what matters.' },
  { tag: 'regional', weak: 'No issues, no issues.', strong: 'Happy to help.', wrong: ['No problem at all, sorry.', 'Not an issue, not an issue.'], why: 'Positive framing beats a double negative.' },
  { tag: 'regional', weak: 'What is the good name of the client?', strong: "What's the client's name?", wrong: ['Your good name please?', 'Kindly share the good name.'], why: '"Good name" is not used in North American English.' },
  { tag: 'filler', weak: 'Um, so, basically, the server, like, crashed.', strong: "The server crashed at 2 pm. We're restoring it now.", wrong: ['So basically the server crashed, you know.', 'Actually, the server, basically, crashed.'], why: 'Swap fillers for a pause. Fact first, then action.' },
  { tag: 'filler', weak: 'So yeah, I mean, that\'s kind of it.', strong: 'That\'s my recommendation. I\'d like a decision by Friday.', wrong: ['So yeah, that\'s basically it, I guess.', 'Yeah so, I mean, that\'s all.'], why: 'End on your ask, not a trail-off.' },
  { tag: 'filler', weak: 'Actually, honestly, the results were, you know, good.', strong: 'Conversions rose 12% in three weeks.', wrong: ['Honestly the results were actually good, you know.', 'The results were, like, basically good.'], why: 'A number does more than three fillers.' },
];

export interface Twister {
  text: string;
  level: 1 | 2 | 3;
  focus: string;
}

const BASE_TWISTERS: Twister[] = [
  { level: 1, text: 'Red leather, yellow leather', focus: 'R and L' },
  { level: 1, text: 'Toy boat, toy boat, toy boat', focus: 'T and B' },
  { level: 1, text: 'Truly rural, truly rural', focus: 'R' },
  { level: 1, text: 'Good blood, bad blood', focus: 'B and D' },
  { level: 1, text: 'Eleven benevolent elephants', focus: 'L and V' },
  { level: 2, text: 'She sells seashells by the seashore', focus: 'S and SH' },
  { level: 2, text: 'Unique New York, unique New York, you know you need unique New York', focus: 'Y and N' },
  { level: 2, text: 'Peter Piper picked a peck of pickled peppers', focus: 'P' },
  { level: 2, text: 'Very well, very well, very well', focus: 'V and W' },
  { level: 2, text: 'Three free throws, three free throws', focus: 'TH and R' },
  { level: 3, text: 'Six sticky skeletons, six sticky skeletons', focus: 'S clusters' },
  { level: 3, text: "The sixth sick sheik's sixth sheep's sick", focus: 'S, SH, TH' },
  { level: 3, text: 'Fresh French fried fish, fresh French fried fish', focus: 'F and R' },
  { level: 3, text: 'Which wristwatches are Swiss wristwatches', focus: 'W, R, S' },
  { level: 3, text: 'Thirty-three thousand thoughtful thinkers thought', focus: 'TH' },
];

export interface Passage {
  id: string;
  title: string;
  /** "/" marks a deliberate pause. */
  text: string;
}

const BASE_PASSAGES: Passage[] = [
  { id: 'pa1', title: 'Project update', text: 'Here is where we stand. / The integration is ninety percent complete. / We finish testing on Thursday, / and we launch on Monday. / The one risk is the vendor API. / I need a decision on the backup plan by Wednesday.' },
  { id: 'pa2', title: 'Pushing back', text: 'I understand why Friday matters. / With the current team, / Friday means we skip testing. / I recommend we ship the core features Friday / and the reports the following week. / That keeps quality where it needs to be.' },
  { id: 'pa3', title: 'Introduction', text: 'Hi everyone. / I lead the data platform work. / My focus this quarter is cutting report time in half. / If you need anything from the platform, / message me directly. / I\'m glad to be on this team.' },
  { id: 'pa4', title: 'Bad news', text: 'The release is delayed by three days. / We found a security issue in final testing. / The fix is done, / and we are retesting now. / The new date is Thursday. / I will send an update tomorrow at noon.' },
  { id: 'pa5', title: 'Recommendation', text: 'My recommendation is option B. / It costs twenty percent less, / it ships a month sooner, / and the team already knows the tools. / The trade-off is fewer custom reports. / I think that trade is worth it.' },
  { id: 'pa6', title: 'Closing', text: 'Let me recap. / We agreed on three things. / Priya owns the budget. / Sam owns the timeline. / I own the client update. / We meet again next Tuesday.' },
];

export interface EmphasisLine {
  text: string;
  /** Index of the word to stress, and what that stress means. */
  variants: { word: number; meaning: string }[];
}

const BASE_EMPHASIS: EmphasisLine[] = [
  { text: 'I never said she stole the money', variants: [{ word: 0, meaning: 'Someone else said it.' }, { word: 1, meaning: 'I deny saying it at all.' }, { word: 3, meaning: 'Someone else did.' }, { word: 4, meaning: 'She borrowed it, maybe.' }, { word: 6, meaning: 'She stole something else.' }] },
  { text: 'We need this done by Friday', variants: [{ word: 0, meaning: 'Our team, not yours.' }, { word: 2, meaning: 'This, not the other thing.' }, { word: 5, meaning: 'Friday, not Monday.' }] },
  { text: 'This is the most important decision we make this year', variants: [{ word: 3, meaning: 'Nothing matters more.' }, { word: 5, meaning: 'A decision, not a discussion.' }, { word: 8, meaning: 'This year in particular.' }] },
  { text: 'Our customers want faster answers', variants: [{ word: 1, meaning: 'Customers, not partners.' }, { word: 3, meaning: 'Speed is the issue.' }, { word: 4, meaning: 'Answers, not more features.' }] },
];

const BASE_EXPRESSIVE = [
  'We doubled revenue in six months, and we did it without adding a single person.',
  'This is not a small problem. It touches every customer we have.',
  'I have good news and bad news. The good news is we\'re early.',
  'Three things matter this quarter: speed, quality, and trust.',
];

export interface WarmStep {
  title: string;
  how: string;
  secs: number;
  /** Optional text to speak/say during the step. */
  say?: string;
}

export const WARMUP: WarmStep[] = [
  { title: 'Breathe low', how: 'Hand on your stomach. In through the nose for 4, hold for 4, out through the mouth for 6. Your stomach should move, not your shoulders.', secs: 30 },
  { title: 'Lip trills', how: 'Relax your lips and blow air through them so they flutter, like a motorboat. Slide your pitch up and down.', secs: 20 },
  { title: 'Jaw and tongue', how: 'Open your jaw wide, then chew big and slow. Stick your tongue out and point it up, down, left, right.', secs: 20 },
  { title: 'Hum and siren', how: 'Hum "mmm" and feel it buzz in your lips. Then slide from your lowest note to your highest and back, like a siren.', secs: 20 },
  { title: 'Over-articulate', how: 'Say it slowly with huge mouth movements. Every consonant crisp.', secs: 20, say: 'Red leather, yellow leather. Unique New York.' },
  { title: 'Power line', how: 'Stand tall, look up, and say your opening line at full volume, ending with your pitch going down.', secs: 15, say: "Good morning everyone. Let's get started." },
];

export interface SoundModule {
  id: string;
  name: string;
  ipa: string;
  tip: string;
  pairs: [string, string][];
  words: { w: string; hint: string }[];
  lines: string[];
}

export const SOUNDS: SoundModule[] = [
  { id: 'vw', name: 'V vs W', ipa: '/v/ · /w/', tip: 'V: top teeth rest lightly on the lower lip, then buzz. W: teeth never touch; round the lips like "oo", then open.', pairs: [['vest', 'west'], ['vine', 'wine'], ['veil', 'whale'], ['vary', 'wary'], ['verse', 'worse'], ['vent', 'went']], words: [{ w: 'very', hint: 'teeth on lip' }, { w: 'well', hint: 'round lips' }, { w: 'review', hint: 'teeth on lip' }, { w: 'workflow', hint: 'round lips' }], lines: ['We vote on the revised version on Wednesday.', 'Very well, I will review the workflow.', 'Our vendor wants a weekly video call.'] },
  { id: 'th', name: 'TH', ipa: '/θ/ · /ð/', tip: 'Tongue tip lightly between the teeth, push air past it. "Think" is just air; "this" adds a buzz. Never a T or D.', pairs: [['tin', 'thin'], ['tank', 'thank'], ['tree', 'three'], ['dare', 'there'], ['den', 'then'], ['day', 'they']], words: [{ w: 'third', hint: 'air, no buzz' }, { w: 'thanks', hint: 'air, no buzz' }, { w: 'the', hint: 'buzz' }, { w: 'together', hint: 'buzz' }], lines: ['I think the third option is better.', "Thanks, that's worth thinking through.", 'Both of them thought the timeline was fine.'] },
  { id: 't', name: 'Soft T and D', ipa: '[t] · [ɾ]', tip: 'Tap the ridge just behind your top teeth, don\'t curl the tongue back. Between vowels, T becomes a quick light tap: water sounds like "wah-der."', pairs: [['writer', 'rider'], ['latter', 'ladder'], ['metal', 'medal']], words: [{ w: 'water', hint: 'WAH-der' }, { w: 'better', hint: 'BEH-der' }, { w: 'meeting', hint: 'MEE-ding' }, { w: 'data', hint: 'DAY-da' }, { w: 'matter', hint: 'MA-der' }, { w: 'city', hint: 'SIH-dee' }], lines: ["Let's get a better estimate at the meeting.", "It doesn't matter a lot.", 'What do you think about it?'] },
  { id: 'r', name: 'American R', ipa: '/ɹ/ · /ɚ/', tip: 'Never tap or roll the R. Pull the tongue back so it touches nothing, round the lips a little, and keep the R after vowels: car, work, server.', pairs: [['wok', 'work'], ['ca', 'car'], ['bud', 'bird']], words: [{ w: 'work', hint: 'WURK' }, { w: 'first', hint: 'FURST' }, { w: 'server', hint: 'SUR-ver' }, { w: 'quarter', hint: 'KWOR-der' }, { w: 'early', hint: 'UR-lee' }, { w: 'report', hint: 'ri-PORT' }], lines: ['Our third quarter report is over there.', 'The server error occurred early Thursday.', 'Further work is required before the merger.'] },
  { id: 'vowels', name: 'Vowels', ipa: '/æ/ · /ɑ/', tip: '/æ/ in plan, task, can\'t: drop the jaw and spread the lips. /ɑ/ in got, project, not: a relaxed, open "ah", not a rounded "aw".', pairs: [['bed', 'bad'], ['men', 'man'], ['pen', 'pan'], ['set', 'sat'], ['cut', 'cot'], ['nut', 'not']], words: [{ w: 'plan', hint: 'open, spread' }, { w: 'task', hint: 'open, spread' }, { w: 'project', hint: 'PRAH-ject' }, { w: 'problem', hint: 'PRAH-blem' }], lines: ["Can't we ask the client to adjust the plan?", 'Got it, the project is not a problem.'] },
  { id: 'stress', name: 'Word stress', ipa: 'ˈstress', tip: 'Hit one syllable hard (louder, longer, higher) and squeeze the rest into a short "uh". Words often sound wrong only because the stress moved.', pairs: [], words: [{ w: 'development', hint: 'de-VEL-op-ment' }, { w: 'comfortable', hint: 'COMF-ter-ble' }, { w: 'technology', hint: 'tech-NOL-o-gy' }, { w: 'analysis', hint: 'a-NAL-y-sis' }, { w: 'determine', hint: 'de-TER-mine' }, { w: 'available', hint: 'a-VAIL-a-ble' }, { w: 'colleague', hint: 'COL-league' }, { w: 'category', hint: 'CAT-e-gor-y' }], lines: ["I'd like to talk to you about the schedule.", 'The analysis is available on Monday.'] },
  { id: 'linking', name: 'Linking', ipa: 'connected speech', tip: 'Join a final consonant to the next vowel: "pick it up" becomes "pi-ki-tup". Content words get the beat; small words stay short.', pairs: [], words: [{ w: 'pick it up', hint: 'pi-ki-TUP' }, { w: 'turn it off', hint: 'tur-ni-TOFF' }, { w: 'check it out', hint: 'che-ki-DOUT' }, { w: 'first of all', hint: 'fir-stuh-VALL' }], lines: ['Let me think about it and get back to you.', 'First of all, thanks for an interesting update.'] },
  { id: 'sz', name: 'S vs Z endings', ipa: '/s/ · /z/', tip: 'Plurals and verbs ending in a voiced sound take a buzzing Z: plans, needs, goes. After voiceless sounds it is a hiss: tasks, costs, helps. Put your hand on your throat: Z vibrates.', pairs: [['price', 'prize'], ['bus', 'buzz'], ['place', 'plays'], ['loss', 'laws'], ['ice', 'eyes']], words: [{ w: 'plans', hint: 'planz' }, { w: 'needs', hint: 'needz' }, { w: 'reports', hint: 'hiss: s' }, { w: 'is', hint: 'iz' }, { w: 'was', hint: 'wuz' }, { w: 'goals', hint: 'goalz' }], lines: ['Our plans and goals change as the business grows.', 'It\'s easy: the team needs three days.'] },
  { id: 'shs', name: 'SH vs S', ipa: '/ʃ/ · /s/', tip: 'S: tongue tip near the top teeth, lips relaxed, a thin hiss. SH: tongue pulled back, lips pushed forward and rounded, a wider hush.', pairs: [['see', 'she'], ['sell', 'shell'], ['sip', 'ship'], ['sort', 'short'], ['save', 'shave']], words: [{ w: 'session', hint: 'SESH-un' }, { w: 'issue', hint: 'ISH-oo' }, { w: 'machine', hint: 'muh-SHEEN' }, { w: 'special', hint: 'SPESH-ul' }], lines: ['She should share the short session notes.', 'The issue is social, not technical.'] },
  { id: 'finals', name: 'Final consonants', ipa: 'word endings', tip: 'English meaning lives in word endings: asked, helped, tests, months. Finish every final consonant clearly, especially -ed and -ts. Don\'t add a vowel after it.', pairs: [['ask', 'asked'], ['test', 'tests'], ['help', 'helped'], ['month', 'months']], words: [{ w: 'asked', hint: 'askt' }, { w: 'tests', hint: 'tests, all of it' }, { w: 'months', hint: 'munths' }, { w: 'texts', hint: 'teksts' }, { w: 'developed', hint: 'de-VEL-upt' }, { w: 'world', hint: 'wurld' }], lines: ['We tested it for six months and fixed most bugs.', 'She asked what happened to the last two drafts.'] },
  { id: 'schwa', name: 'Reduced words', ipa: '/ə/ schwa', tip: 'Small words go weak in fast speech: "to" sounds like "tuh", "for" like "fer", "and" like "n", "of" like "uv". Stressing every word sounds robotic; reducing them sounds fluent.', pairs: [], words: [{ w: 'going to', hint: 'GO-in-tuh' }, { w: 'want to', hint: 'WAN-tuh' }, { w: 'a lot of', hint: 'uh-LAH-duv' }, { w: 'cup of coffee', hint: 'CUP-uh-COF-fee' }, { w: 'rock and roll', hint: 'ROCK-n-ROLL' }], lines: ['I\'m going to send it to you in a minute.', 'We have a lot of work to do for the client.'] },
  { id: 'intonation', name: 'Statement intonation', ipa: '↘ falling', tip: 'Statements end with your pitch going down. Questions with yes or no answers go up. Ending statements high makes you sound unsure.', pairs: [], words: [{ w: 'We launch on Monday.', hint: 'fall at the end' }, { w: 'Are we ready?', hint: 'rise at the end' }, { w: 'That\'s my recommendation.', hint: 'fall' }, { w: 'Any questions?', hint: 'rise' }], lines: ['The budget is approved. We start next week.', 'This is the right decision for the team.'] },
];

export const SWAPS: SwapCard[] = [...BASE_SWAPS, ...MORE_SWAPS];
export const TWISTERS: Twister[] = [...BASE_TWISTERS, ...MORE_TWISTERS];
export const PASSAGES: Passage[] = [...BASE_PASSAGES, ...MORE_PASSAGES];
export const EMPHASIS: EmphasisLine[] = [...BASE_EMPHASIS, ...MORE_EMPHASIS];
export const EXPRESSIVE_LINES: string[] = [...BASE_EXPRESSIVE, ...MORE_EXPRESSIVE];

/** Stable key for a swap card (used by spaced repetition). */
export const swapKey = (c: SwapCard) => `swap:${c.weak}`;
