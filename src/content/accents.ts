// Accent Coach content: target accents, the sounds that make each accent, and what speakers
// of each first language usually need to change. Everything is plain data so it can be tested.

export type AccentId = 'us' | 'gb' | 'au' | 'ca';
export type AccentGoal = AccentId | 'none';

export interface AccentTarget {
  id: AccentId;
  name: string;
  adjective: string;
  locale: string;
  desc: string;
  /** The sounds that most define this accent. */
  signatures: FeatureId[];
  /** Where the model voice comes from. */
  voice: 'natural-us' | 'natural-gb' | 'system';
}

export const TARGETS: AccentTarget[] = [
  { id: 'us', name: 'American', adjective: 'American', locale: 'en-US', voice: 'natural-us', desc: 'General American, the accent of US national news and most North American offices.', signatures: ['r', 'midt', 'lot', 'trap', 'bath', 'yod', 'goat'] },
  { id: 'gb', name: 'British', adjective: 'British', locale: 'en-GB', voice: 'natural-gb', desc: 'Standard Southern British, the accent most people mean by "British" or "European" English.', signatures: ['r', 'midt', 'bath', 'lot', 'goat', 'yod'] },
  { id: 'au', name: 'Australian', adjective: 'Australian', locale: 'en-AU', voice: 'system', desc: 'General Australian, as heard in Australian business and media.', signatures: ['r', 'midt', 'bath', 'face', 'goat', 'intonation'] },
  { id: 'ca', name: 'Canadian', adjective: 'Canadian', locale: 'en-CA', voice: 'natural-us', desc: 'Standard Canadian English: close to American, with a few sounds of its own.', signatures: ['r', 'midt', 'lot', 'caraising', 'yod'] },
];

export const targetById = (id: AccentId) => TARGETS.find((t) => t.id === id)!;

export type FeatureId =
  | 'th' | 'vw' | 'td' | 'midt' | 'r' | 'l' | 'trap' | 'bath' | 'lot' | 'goat' | 'face' | 'shortlong'
  | 'schwa' | 'stress' | 'rhythm' | 'intonation' | 'finals' | 'sz' | 'shs' | 'h' | 'pfb' | 'lr' | 'ing' | 'yod' | 'caraising';

type PerTarget<T> = { all?: T } & Partial<Record<AccentId, T>>;

export interface SoundFeature {
  id: FeatureId;
  name: string;
  ipa: string;
  kind: 'consonant' | 'vowel' | 'melody';
  /** Accents this sound is taught for (most are all four). */
  targets: AccentId[];
  tip: PerTarget<string>;
  pairs: [string, string][];
  words: { w: string; hint?: PerTarget<string> }[];
  sentences: string[];
  /** IPA phonemes Microsoft's American English scoring reports for this sound. */
  phonemes: string[];
}

const ALL: AccentId[] = ['us', 'gb', 'au', 'ca'];

export const FEATURES: SoundFeature[] = [
  {
    id: 'th', name: 'TH', ipa: '/θ/ · /ð/', kind: 'consonant', targets: ALL,
    tip: { all: 'Put your tongue tip lightly between your teeth and push air past it. "Think" is air only; "this" adds a buzz from your throat. It should never turn into T, D, S, Z or F.' },
    pairs: [['tin', 'thin'], ['tank', 'thank'], ['tree', 'three'], ['dare', 'there'], ['den', 'then'], ['sink', 'think'], ['day', 'they']],
    words: [{ w: 'think', hint: { all: 'air, no buzz' } }, { w: 'third' }, { w: 'thanks' }, { w: 'month' }, { w: 'the', hint: { all: 'buzz' } }, { w: 'other' }, { w: 'together' }, { w: 'with' }],
    sentences: ['I think the third option is better.', 'Thanks, that\'s worth thinking through.', 'They gathered the data together on Thursday.'],
    phonemes: ['θ', 'ð'],
  },
  {
    id: 'vw', name: 'V, W and B', ipa: '/v/ · /w/ · /b/', kind: 'consonant', targets: ALL,
    tip: { all: 'V: top teeth rest lightly on your lower lip, then buzz. W: teeth never touch; round your lips like "oo", then open. B: both lips close, then pop open.' },
    pairs: [['vest', 'west'], ['vine', 'wine'], ['very', 'berry'], ['vote', 'boat'], ['veil', 'whale'], ['vary', 'wary']],
    words: [{ w: 'very', hint: { all: 'teeth on lip' } }, { w: 'well', hint: { all: 'round lips' } }, { w: 'review' }, { w: 'workflow' }, { w: 'video' }, { w: 'weekly' }, { w: 'value' }, { w: 'wait' }],
    sentences: ['We vote on the revised version on Wednesday.', 'Very well, I will review the workflow.', 'Our vendor wants a weekly video call.'],
    phonemes: ['v', 'w', 'b'],
  },
  {
    id: 'td', name: 'Crisp T and D', ipa: '/t/ · /d/', kind: 'consonant', targets: ALL,
    tip: { all: 'Touch the ridge just behind your top teeth with your tongue tip. Don\'t touch the teeth and don\'t curl the tongue back. At the start of a word, T comes with a small puff of air: "time", "team".' },
    pairs: [['tie', 'die'], ['time', 'dime'], ['tear', 'dear'], ['town', 'down']],
    words: [{ w: 'today' }, { w: 'team' }, { w: 'doctor' }, { w: 'date' }, { w: 'told' }, { w: 'time' }, { w: 'standard' }, { w: 'deadline' }],
    sentences: ['Today the doctor told David to take time off.', 'The team will deliver the update on Tuesday.'],
    phonemes: ['t', 'd'],
  },
  {
    id: 'midt', name: 'T between vowels', ipa: '[ɾ] · [t]', kind: 'consonant', targets: ALL,
    tip: {
      us: 'Between vowels, T becomes a quick light tap, close to a soft D: water → WAH-der, better → BEH-der. After N it often disappears: twenty → TWEN-ee.',
      ca: 'Like American: between vowels, T is a quick light tap. Water → WAH-der, better → BEH-der.',
      au: 'Australians also tap T between vowels: water → WAW-dah, better → BEDD-ah, with no R at the end.',
      gb: 'In standard British, T between vowels stays a clear, crisp T: water → WAW-tuh, better → BET-uh. The London "wa\'er" glottal stop is common but optional.',
    },
    pairs: [['writer', 'rider'], ['latter', 'ladder'], ['metal', 'medal']],
    words: [
      { w: 'water', hint: { us: 'WAH-der', ca: 'WAH-der', au: 'WAW-dah', gb: 'WAW-tuh' } },
      { w: 'better', hint: { us: 'BEH-der', ca: 'BEH-der', au: 'BEDD-ah', gb: 'BET-uh' } },
      { w: 'meeting', hint: { us: 'MEE-ding', ca: 'MEE-ding', au: 'MEE-ding', gb: 'MEE-ting' } },
      { w: 'data', hint: { us: 'DAY-da', ca: 'DAY-da', au: 'DAH-dah', gb: 'DAY-tuh' } },
      { w: 'matter', hint: { us: 'MA-der', ca: 'MA-der', au: 'MAD-ah', gb: 'MAT-uh' } },
      { w: 'city', hint: { us: 'SIH-dee', ca: 'SIH-dee', au: 'SIH-dee', gb: 'SIT-ee' } },
      { w: 'getting', hint: { us: 'GEH-ding', ca: 'GEH-ding', au: 'GEH-ding', gb: 'GET-ing' } },
      { w: 'a lot of', hint: { us: 'uh-LAH-duv', ca: 'uh-LAH-duv', au: 'uh-LOD-uv', gb: 'uh-LOT-uv' } },
    ],
    sentences: ['Let\'s get a better estimate at the meeting.', 'It doesn\'t matter a lot.', 'What do you think about it?'],
    phonemes: ['t', 'ɾ'],
  },
  {
    id: 'r', name: 'The R sound', ipa: '/ɹ/', kind: 'consonant', targets: ALL,
    tip: {
      us: 'Never tap or roll the R. Pull your tongue back so it touches nothing and round your lips a little. Americans keep the R after vowels: car, work, first and never all end with a full R.',
      ca: 'Like American: never tap or roll it, and keep the R after vowels. Car, work, first and never all have a full R.',
      gb: 'Never tap or roll the R. Say R only before a vowel: "red", "very". After a vowel it disappears: car → CAH, work → WUHK, never → NEV-uh.',
      au: 'Like British, say R only before a vowel: car → CAH, never → NEV-ah. Stretch the vowel a little where the R would be. Never tap or roll it.',
    },
    pairs: [['wed', 'red'], ['way', 'ray'], ['west', 'rest'], ['white', 'right']],
    words: [
      { w: 'work', hint: { us: 'WURK', ca: 'WURK', gb: 'WUHK (no R)', au: 'WUHK (no R)' } },
      { w: 'first', hint: { us: 'FURST', ca: 'FURST', gb: 'FUHST', au: 'FUHST' } },
      { w: 'server', hint: { us: 'SUR-ver', ca: 'SUR-ver', gb: 'SUH-vuh', au: 'SUH-vah' } },
      { w: 'quarter', hint: { us: 'KWOR-der', ca: 'KWOR-der', gb: 'KWAW-tuh', au: 'KWAW-dah' } },
      { w: 'early', hint: { us: 'UR-lee', ca: 'UR-lee', gb: 'UH-lee', au: 'UH-lee' } },
      { w: 'report', hint: { us: 'ri-PORT', ca: 'ri-PORT', gb: 'ri-PAWT', au: 'ri-PAWT' } },
      { w: 'never' },
      { w: 'rarely' },
    ],
    sentences: ['Our third quarter report is over there.', 'The server error occurred early Thursday.', 'Further work is required before the merger.'],
    phonemes: ['ɹ', 'ɚ', 'ɝ'],
  },
  {
    id: 'l', name: 'Light and dark L', ipa: '/l/ · [ɫ]', kind: 'consonant', targets: ALL,
    tip: { all: 'At the start of a word, L is light: tongue tip on the ridge behind your teeth ("light", "lead"). At the end of a word or before a consonant it\'s dark: keep the tip up and raise the back of your tongue ("feel", "milk", "people"). Don\'t turn it into W or O.' },
    pairs: [['fee', 'feel'], ['sea', 'seal'], ['go', 'goal'], ['tea', 'teal']],
    words: [{ w: 'people' }, { w: 'feel' }, { w: 'milk' }, { w: 'global' }, { w: 'deal' }, { w: 'hotel' }, { w: 'help' }, { w: 'will' }],
    sentences: ['We\'ll call all the people at the hotel.', 'Please feel free to help with the global deal.'],
    phonemes: ['l'],
  },
  {
    id: 'trap', name: 'The "cat" vowel', ipa: '/æ/', kind: 'vowel', targets: ALL,
    tip: {
      us: 'Drop your jaw and spread your lips as if starting to smile: plan, back, manage. It\'s a different sound from the "e" in "men".',
      ca: 'Drop your jaw and spread your lips: plan, back, manage. Canadians say it a little more open than Americans. Keep it different from "men".',
      gb: 'Open your mouth wide: plan, man, back. It\'s more open than the "e" in "men" and shorter than the American version.',
      au: 'Australians raise this vowel a little toward "e": man, plan, back. Keep it clearly different from "men".',
    },
    pairs: [['bed', 'bad'], ['men', 'man'], ['pen', 'pan'], ['set', 'sat'], ['said', 'sad']],
    words: [{ w: 'plan' }, { w: 'back' }, { w: 'happen' }, { w: 'manager' }, { w: 'track' }, { w: 'fact' }, { w: 'add' }, { w: 'rapid' }],
    sentences: ['Can we adjust the plan and track the facts?', 'The manager had a bad back.'],
    phonemes: ['æ'],
  },
  {
    id: 'bath', name: 'Bath, class and can\'t', ipa: '/æ/ vs /ɑː/', kind: 'vowel', targets: ALL,
    tip: {
      us: 'Americans say bath, class, ask, can\'t and after with the same short "cat" vowel as "plan". Don\'t stretch them into "ah".',
      ca: 'Like American: bath, class, ask, can\'t and after all use the short "cat" vowel.',
      gb: 'British uses a long "ah" in many words with "a" before s, f, th or n: bath → BAHTH, class → CLAHSS, ask → AHSK, can\'t → CAHNT, after → AHF-tuh. "Plan", "man" and "cat" stay short.',
      au: 'Australians use a long "ah" in bath, class, ask, can\'t, after and last, like British, but "dance", "plant" and "chance" usually keep the short "cat" vowel.',
    },
    pairs: [],
    words: [
      { w: 'bath', hint: { us: 'short a', ca: 'short a', gb: 'BAHTH', au: 'BAHTH' } },
      { w: 'class', hint: { us: 'short a', ca: 'short a', gb: 'CLAHSS', au: 'CLAHSS' } },
      { w: 'ask', hint: { us: 'short a', ca: 'short a', gb: 'AHSK', au: 'AHSK' } },
      { w: 'can\'t', hint: { us: 'KANT', ca: 'KANT', gb: 'KAHNT', au: 'KAHNT' } },
      { w: 'after', hint: { us: 'AF-ter', ca: 'AF-ter', gb: 'AHF-tuh', au: 'AHF-tah' } },
      { w: 'last' },
      { w: 'fast' },
      { w: 'half' },
    ],
    sentences: ['Can\'t we ask the staff to plan a quick class?', 'After the last task, we can leave fast.'],
    phonemes: ['æ'],
  },
  {
    id: 'lot', name: 'The "hot" vowel', ipa: '/ɑ/ · /ɒ/', kind: 'vowel', targets: ALL,
    tip: {
      us: 'Open your mouth wide and relax your lips for an "ah": hot → HAHT, stop → STAHP, project → PRAH-ject, problem → PRAH-blem. Don\'t round your lips.',
      ca: 'An open "ah" like American, with lips slightly rounded. In Canadian English "cot" and "caught" sound the same.',
      gb: 'A short sound with lightly rounded lips, between "ah" and "aw": hot, stop, project, problem.',
      au: 'A short, rounded "o": hot, stop, project. Similar to British.',
    },
    pairs: [['cut', 'cot'], ['nut', 'not'], ['hut', 'hot'], ['luck', 'lock']],
    words: [
      { w: 'hot', hint: { us: 'HAHT', ca: 'HAHT', gb: 'HOT', au: 'HOT' } },
      { w: 'stop' },
      { w: 'project', hint: { us: 'PRAH-ject', ca: 'PRAH-ject', gb: 'PROJ-ekt', au: 'PROJ-ekt' } },
      { w: 'problem', hint: { us: 'PRAH-blem', ca: 'PRAH-blem', gb: 'PROB-lum', au: 'PROB-lum' } },
      { w: 'possible' },
      { w: 'job' },
      { w: 'got' },
      { w: 'office' },
    ],
    sentences: ['Got it: the project is not a problem.', 'It\'s possible we\'ll stop the job at the office.'],
    phonemes: ['ɑ'],
  },
  {
    id: 'goat', name: 'The "go" vowel', ipa: '/oʊ/ · /əʊ/', kind: 'vowel', targets: ALL,
    tip: {
      us: 'This vowel glides: start at "o" and move toward "oo" as your lips round: go → GOH-oo, no, show, home. A flat, pure "o" sounds foreign.',
      ca: 'Like American, a glide from "o" to "oo": go, no, show, home.',
      gb: 'Start with a relaxed "uh" and glide to "oo": go → G-UH-OO, no, show, home. Your lips round only at the end.',
      au: 'Start low, near the "a" in "about", and glide forward to "oo": go, no, show. It\'s a wide glide.',
    },
    pairs: [['cost', 'coast'], ['want', 'won\'t'], ['hall', 'hole']],
    words: [{ w: 'go' }, { w: 'home' }, { w: 'open' }, { w: 'show' }, { w: 'notes' }, { w: 'phone' }, { w: 'only' }, { w: 'focus' }],
    sentences: ['Go home and open the notes on your phone.', 'We only focus on the show.'],
    phonemes: ['oʊ'],
  },
  {
    id: 'face', name: 'The "day" vowel', ipa: '/eɪ/', kind: 'vowel', targets: ALL,
    tip: {
      all: 'This vowel glides from "e" to "ee": day → DEH-ee, say, make, today. Don\'t hold a flat "e".',
      au: 'Australians start this glide lower, nearer "ah", then move to "ee": day, mate, today.',
    },
    pairs: [['get', 'gate'], ['wet', 'wait'], ['pepper', 'paper'], ['test', 'taste']],
    words: [{ w: 'day' }, { w: 'make' }, { w: 'today' }, { w: 'change' }, { w: 'great' }, { w: 'raise' }, { w: 'date' }, { w: 'way' }],
    sentences: ['Today we make a great change to the date.', 'Wait, the paper says May.'],
    phonemes: ['eɪ'],
  },
  {
    id: 'shortlong', name: 'Short and long vowels', ipa: '/ɪ/ · /i/ · /ʊ/ · /u/', kind: 'vowel', targets: ALL,
    tip: { all: 'English has vowel pairs that differ in length and mouth shape. "Ship" is short and relaxed; "sheep" is long with spread lips. "Full" is short; "fool" is long with rounded lips.' },
    pairs: [['ship', 'sheep'], ['live', 'leave'], ['fit', 'feet'], ['full', 'fool'], ['pull', 'pool'], ['sit', 'seat']],
    words: [{ w: 'this' }, { w: 'these' }, { w: 'sit' }, { w: 'seat' }, { w: 'full' }, { w: 'fool' }, { w: 'good' }, { w: 'food' }],
    sentences: ['Ship the cheap seeds this week.', 'The pool is full of good food.'],
    phonemes: ['ɪ', 'i', 'ʊ', 'u'],
  },
  {
    id: 'schwa', name: 'Weak vowels', ipa: '/ə/', kind: 'vowel', targets: ALL,
    tip: { all: 'Unstressed syllables shrink to a quick, relaxed "uh": today → tuh-DAY, support → suh-PORT, balance → BAL-unss. Small words reduce too: "to" → tuh, "for" → fer, "of" → uv. Giving every vowel full value sounds robotic.' },
    pairs: [],
    words: [{ w: 'about', hint: { all: 'uh-BOWT' } }, { w: 'today', hint: { all: 'tuh-DAY' } }, { w: 'support', hint: { all: 'suh-PORT' } }, { w: 'balance', hint: { all: 'BAL-unss' } }, { w: 'agenda', hint: { all: 'uh-JEN-duh' } }, { w: 'going to', hint: { all: 'GO-in-tuh' } }],
    sentences: ['I\'m going to send it to you in a minute.', 'We have a lot of support for the agenda.'],
    phonemes: ['ə'],
  },
  {
    id: 'stress', name: 'Word stress', ipa: 'ˈstress', kind: 'melody', targets: ALL,
    tip: {
      all: 'Hit one syllable hard (louder, longer, higher) and squeeze the rest. Moving the stress can make a word hard to recognize even when every sound is right.',
      gb: 'Hit one syllable hard and squeeze the rest. A few words differ from American: ad-VER-tise-ment (US: AD-ver-tise-ment), GAR-age (US: ga-RAGE).',
    },
    pairs: [],
    words: [{ w: 'development', hint: { all: 'de-VEL-op-ment' } }, { w: 'comfortable', hint: { all: 'COMF-ter-ble' } }, { w: 'technology', hint: { all: 'tech-NOL-o-gy' } }, { w: 'analysis', hint: { all: 'a-NAL-y-sis' } }, { w: 'determine', hint: { all: 'de-TER-mine' } }, { w: 'available', hint: { all: 'a-VAIL-a-ble' } }, { w: 'colleague', hint: { all: 'COL-league' } }, { w: 'category', hint: { all: 'CAT-e-gor-y', gb: 'CAT-uh-gree' } }],
    sentences: ['The analysis is available on Monday.', 'Our development team is comfortable with the technology.'],
    phonemes: [],
  },
  {
    id: 'rhythm', name: 'Rhythm and linking', ipa: 'stress-timed', kind: 'melody', targets: ALL,
    tip: { all: 'English is stress-timed: the important words get the beat and the small words squeeze between them. Join a final consonant to the next vowel: "pick it up" → pi-ki-TUP, "an hour" → a-NOUR.' },
    pairs: [],
    words: [{ w: 'pick it up', hint: { all: 'pi-ki-TUP' } }, { w: 'turn it off', hint: { all: 'tur-ni-TOFF' } }, { w: 'check it out', hint: { all: 'che-ki-TOUT' } }, { w: 'first of all', hint: { all: 'fir-stuh-VALL' } }, { w: 'an hour ago', hint: { all: 'a-nou-ra-GO' } }, { w: 'as soon as', hint: { all: 'uh-SOO-nuz' } }],
    sentences: ['Let me think about it and get back to you.', 'First of all, thanks for an interesting update.'],
    phonemes: [],
  },
  {
    id: 'intonation', name: 'Statement melody', ipa: '↘ falling', kind: 'melody', targets: ALL,
    tip: {
      all: 'Statements fall at the end; yes/no questions rise. Ending statements on a high note makes you sound unsure.',
      au: 'Casual Australian speech often rises at the end of statements. In meetings and interviews, end statements falling so you sound certain.',
    },
    pairs: [],
    words: [{ w: 'We launch on Monday.', hint: { all: 'fall at the end' } }, { w: 'Are we ready?', hint: { all: 'rise at the end' } }, { w: 'That\'s my recommendation.', hint: { all: 'fall' } }, { w: 'Any questions?', hint: { all: 'rise' } }],
    sentences: ['The budget is approved. We start next week.', 'This is the right decision for the team.'],
    phonemes: [],
  },
  {
    id: 'finals', name: 'Word endings', ipa: '-st · -ks · -ed', kind: 'consonant', targets: ALL,
    tip: { all: 'Finish every final consonant: asked → ASKT, months → MUNTHS, helped → HELPT. Don\'t add a vowel after it ("ask-uh") or before an S-cluster ("e-school").' },
    pairs: [['ask', 'asked'], ['test', 'tests'], ['help', 'helped'], ['bow', 'bold']],
    words: [{ w: 'asked', hint: { all: 'askt' } }, { w: 'months', hint: { all: 'munths' } }, { w: 'tests' }, { w: 'world' }, { w: 'texts', hint: { all: 'teksts' } }, { w: 'school', hint: { all: 'no "e" before it' } }, { w: 'strong' }, { w: 'developed', hint: { all: 'de-VEL-upt' } }],
    sentences: ['We tested it for six months and fixed most bugs.', 'She asked what happened to the last two drafts.'],
    phonemes: [],
  },
  {
    id: 'sz', name: 'S and Z', ipa: '/s/ · /z/', kind: 'consonant', targets: ALL,
    tip: { all: 'Many endings buzz like Z: plans, needs, is, was, goes. After voiceless sounds they hiss: tasks, costs, helps. Hand on your throat: Z vibrates, S doesn\'t.' },
    pairs: [['price', 'prize'], ['bus', 'buzz'], ['place', 'plays'], ['ice', 'eyes'], ['sip', 'zip']],
    words: [{ w: 'plans', hint: { all: 'planz' } }, { w: 'needs', hint: { all: 'needz' } }, { w: 'is', hint: { all: 'iz' } }, { w: 'was', hint: { all: 'wuz' } }, { w: 'reports', hint: { all: 'hiss: s' } }, { w: 'goals', hint: { all: 'goalz' } }, { w: 'easy', hint: { all: 'EE-zee' } }, { w: 'business', hint: { all: 'BIZ-ness' } }],
    sentences: ['Our plans and goals change as the business grows.', 'It\'s easy: the team needs three days.'],
    phonemes: ['s', 'z'],
  },
  {
    id: 'shs', name: 'SH and S', ipa: '/ʃ/ · /s/', kind: 'consonant', targets: ALL,
    tip: { all: 'S: tongue tip near the top teeth, a thin hiss. SH: pull your tongue back and push your lips forward, a wider hush.' },
    pairs: [['see', 'she'], ['sell', 'shell'], ['sip', 'ship'], ['sort', 'short'], ['save', 'shave'], ['sue', 'shoe']],
    words: [{ w: 'session', hint: { all: 'SESH-un' } }, { w: 'issue', hint: { all: 'ISH-oo' } }, { w: 'machine' }, { w: 'special', hint: { all: 'SPESH-ul' } }, { w: 'she' }, { w: 'social' }, { w: 'sure' }, { w: 'sales' }],
    sentences: ['She should share the short session notes.', 'The issue is social, not technical.'],
    phonemes: ['ʃ', 's'],
  },
  {
    id: 'h', name: 'The H sound', ipa: '/h/', kind: 'consonant', targets: ALL,
    tip: { all: 'H is just breath, with no scrape in your throat: "hello", "help", "how". Don\'t drop it, and don\'t make it rough like a Spanish "j".' },
    pairs: [['eat', 'heat'], ['air', 'hair'], ['old', 'hold'], ['art', 'heart']],
    words: [{ w: 'hello' }, { w: 'help' }, { w: 'how' }, { w: 'have' }, { w: 'behind' }, { w: 'happy' }, { w: 'hotel' }, { w: 'perhaps' }],
    sentences: ['He has a happy hotel team.', 'How can I help you today?'],
    phonemes: ['h'],
  },
  {
    id: 'pfb', name: 'P, F and B', ipa: '/p/ · /f/ · /b/', kind: 'consonant', targets: ALL,
    tip: { all: 'P: close both lips and release a puff of air (hold a paper in front of your mouth: it should move). B: same lips, with voice and no puff. F: top teeth on your lower lip, then blow.' },
    pairs: [['pan', 'fan'], ['pull', 'full'], ['pig', 'big'], ['pat', 'bat'], ['copy', 'coffee']],
    words: [{ w: 'please' }, { w: 'put' }, { w: 'file' }, { w: 'blue' }, { w: 'folder' }, { w: 'profit' }, { w: 'family' }, { w: 'before' }],
    sentences: ['Please put the file in a blue folder for Paul.', 'The profit before tax was fine.'],
    phonemes: ['p', 'f', 'b'],
  },
  {
    id: 'lr', name: 'L and R', ipa: '/l/ · /ɹ/', kind: 'consonant', targets: ALL,
    tip: { all: 'L: touch the ridge behind your top teeth with your tongue tip. R: pull your tongue back so it touches nothing, lips slightly rounded. Feel the difference: L touches, R floats.' },
    pairs: [['light', 'right'], ['lead', 'read'], ['collect', 'correct'], ['glass', 'grass'], ['fly', 'fry'], ['play', 'pray']],
    words: [{ w: 'really' }, { w: 'rarely' }, { w: 'light' }, { w: 'right' }, { w: 'correct' }, { w: 'collect' }, { w: 'problem' }, { w: 'early' }],
    sentences: ['The lady wore a red dress and a light raincoat.', 'Please collect the correct glass.'],
    phonemes: ['l', 'ɹ'],
  },
  {
    id: 'ing', name: 'The -ing ending', ipa: '/ŋ/', kind: 'consonant', targets: ALL,
    tip: { all: '-ing ends in one nasal sound made at the back of your mouth. Don\'t add a hard G after it ("sing-g") and don\'t turn it into "in".' },
    pairs: [['sin', 'sing'], ['thin', 'thing'], ['ran', 'rang'], ['ban', 'bang']],
    words: [{ w: 'meeting' }, { w: 'thinking' }, { w: 'working' }, { w: 'morning' }, { w: 'long' }, { w: 'wrong' }, { w: 'bring' }, { w: 'something' }],
    sentences: ['We\'re meeting this morning to bring something new.', 'I\'m thinking it\'s the wrong thing.'],
    phonemes: ['ŋ'],
  },
  {
    id: 'yod', name: 'New, tune and student', ipa: '/u/ vs /ju/', kind: 'vowel', targets: ALL,
    tip: {
      us: 'After T, D, N and S, Americans drop the "y": new → NOO, student → STOO-dent, Tuesday → TOOZ-day, duty → DOO-dee.',
      ca: 'Like American, most Canadians drop the "y": new → NOO, student → STOO-dent, Tuesday → TOOZ-day.',
      gb: 'British keeps a light "y" after T, D and N: new → NYOO, student → STYOO-dent, Tuesday → TYOOZ-day. Many speakers blend "tune" into CHOON.',
      au: 'Australians usually blend it: Tuesday → CHOOZ-day, duty → JOO-dee, and keep "new" as NYOO.',
    },
    pairs: [],
    words: [
      { w: 'new', hint: { us: 'NOO', ca: 'NOO', gb: 'NYOO', au: 'NYOO' } },
      { w: 'student', hint: { us: 'STOO-dent', ca: 'STOO-dent', gb: 'STYOO-dent', au: 'STCHOO-dent' } },
      { w: 'Tuesday', hint: { us: 'TOOZ-day', ca: 'TOOZ-day', gb: 'TYOOZ-day', au: 'CHOOZ-day' } },
      { w: 'duty', hint: { us: 'DOO-dee', ca: 'DOO-dee', gb: 'DYOO-tee', au: 'JOO-dee' } },
      { w: 'news' },
      { w: 'during' },
      { w: 'tune' },
      { w: 'assume' },
    ],
    sentences: ['The new student starts on Tuesday.', 'During the news, we tuned in.'],
    phonemes: ['u', 'j'],
  },
  {
    id: 'caraising', name: 'Canadian "out" and "price"', ipa: '/ʌu/ · /ʌi/', kind: 'vowel', targets: ['ca'],
    tip: { ca: 'Before voiceless sounds (p, t, k, s, f), Canadians start the vowel in "out" and "price" higher: about → a-BUH-oot, house, out, price, write. Before voiced sounds ("loud", "prize") it stays open. It\'s subtle, and it\'s what makes Canadian English sound Canadian.' },
    pairs: [['prize', 'price'], ['loud', 'lout'], ['ride', 'write']],
    words: [{ w: 'about' }, { w: 'out' }, { w: 'house' }, { w: 'price' }, { w: 'write' }, { w: 'life' }, { w: 'loud', hint: { ca: 'stays open' } }, { w: 'prize', hint: { ca: 'stays open' } }],
    sentences: ['I\'ll write about the price of the house.', 'We went out about an hour ago.'],
    phonemes: ['aʊ', 'aɪ'],
  },
];

export const featureById = (id: FeatureId) => FEATURES.find((f) => f.id === id)!;

/** The tip for a target, falling back to the shared tip. */
export function tipFor(f: SoundFeature, t: AccentId): string {
  return f.tip[t] ?? f.tip.all ?? '';
}
export function hintFor(h: PerTarget<string> | undefined, t: AccentId): string | undefined {
  return h?.[t] ?? h?.all;
}

// ---------- starting points ----------

export type ProfileKey =
  | 'indian' | 'chinese' | 'spanish' | 'portuguese' | 'french' | 'german' | 'arabic' | 'persian' | 'slavic'
  | 'japanese' | 'korean' | 'vietnamese' | 'southeast' | 'tagalog' | 'turkish' | 'italian' | 'african' | 'singapore' | 'native' | 'other';

export interface L1Profile {
  key: ProfileKey;
  /** Shown as "Common for {label} speakers". */
  label: string;
  features: { id: FeatureId; why: string }[];
}

export const PROFILES: L1Profile[] = [
  {
    key: 'indian', label: 'Indian English',
    features: [
      { id: 'th', why: 'Most Indian languages have no TH, so "think" becomes "tink" and "the" becomes "de".' },
      { id: 'vw', why: 'Most Indian languages have one sound between V and W, so "very" and "wary" sound alike.' },
      { id: 'td', why: 'Indian T and D curl the tongue back. In English the tongue tip taps just behind the teeth.' },
      { id: 'midt', why: 'Indian English keeps a hard T in "water" and "better".' },
      { id: 'r', why: 'Indian R is tapped. The English R doesn\'t touch anything.' },
      { id: 'goat', why: 'Indian English uses a flat "o" in "go" and "home"; native accents glide.' },
      { id: 'face', why: 'Indian English uses a flat "e" in "day" and "make"; native accents glide.' },
      { id: 'trap', why: '"Bad" and "bed" often sound the same in Indian English.' },
      { id: 'bath', why: 'Indian English uses a long "ah" in "ask", "can\'t" and "class", which matches British but not American.' },
      { id: 'stress', why: 'Stress often lands on a different syllable, which makes words hard to recognize.' },
      { id: 'rhythm', why: 'Indian languages give every syllable equal time. English squeezes the small words.' },
      { id: 'schwa', why: 'Unstressed vowels get their full value instead of a quick "uh".' },
      { id: 'sz', why: 'Endings like "plans" and "needs" are often said with S instead of Z.' },
      { id: 'l', why: 'Indian L is always light, so "people" and "feel" sound clipped.' },
      { id: 'intonation', why: 'The melody rises and falls in different places, which listeners can misread as doubt.' },
    ],
  },
  {
    key: 'chinese', label: 'Mandarin and Cantonese',
    features: [
      { id: 'lr', why: 'Mandarin R and L are close to each other, and Cantonese has no R.' },
      { id: 'th', why: 'Chinese has no TH, so it becomes S, F or D.' },
      { id: 'finals', why: 'Mandarin syllables end only in N or NG, so other final consonants get dropped.' },
      { id: 'shortlong', why: '"Ship" and "sheep" use one vowel in Chinese.' },
      { id: 'vw', why: 'Mandarin has no V, so it becomes W or F.' },
      { id: 'sz', why: 'Chinese has no Z sound.' },
      { id: 'trap', why: 'The "cat" vowel doesn\'t exist in Chinese.' },
      { id: 'l', why: 'A final L, as in "feel", is often dropped or turned into "oo".' },
      { id: 'stress', why: 'Tones replace stress in Chinese, so English stress patterns take practice.' },
      { id: 'rhythm', why: 'Chinese gives each syllable equal weight.' },
      { id: 'intonation', why: 'Tones can make English melody sound choppy.' },
    ],
  },
  {
    key: 'spanish', label: 'Spanish',
    features: [
      { id: 'shortlong', why: 'Spanish has 5 vowels, so "ship" and "sheep", "full" and "fool" merge.' },
      { id: 'schwa', why: 'Spanish gives every vowel full value.' },
      { id: 'vw', why: 'Spanish B and V are the same sound.' },
      { id: 'finals', why: 'Spanish adds "e" before S-clusters ("espeak", "estudent") and drops final consonants.' },
      { id: 'sz', why: 'Spanish has no Z sound.' },
      { id: 'th', why: 'Latin American Spanish has no TH.' },
      { id: 'shs', why: 'Spanish has no SH, so "she" becomes "chi" or "si".' },
      { id: 'h', why: 'Spanish J is a scraped H.' },
      { id: 'trap', why: 'The "cat" vowel doesn\'t exist in Spanish.' },
      { id: 'stress', why: 'Spanish stress rules differ from English.' },
      { id: 'rhythm', why: 'Spanish gives each syllable equal time.' },
    ],
  },
  {
    key: 'portuguese', label: 'Portuguese',
    features: [
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'finals', why: 'Portuguese adds an "ee" after final consonants: "Facebook-ee".' },
      { id: 'th', why: 'Portuguese has no TH.' },
      { id: 'h', why: 'English H is often dropped or replaced by a throat sound.' },
      { id: 'schwa', why: 'Unstressed vowels get full value.' },
      { id: 'l', why: 'A final L becomes "oo" in Brazilian Portuguese.' },
      { id: 'trap', why: 'The "cat" vowel needs a wider mouth than any Portuguese vowel.' },
      { id: 'stress', why: 'Stress often lands on a different syllable.' },
      { id: 'ing', why: '"-ing" often becomes a nasal vowel.' },
    ],
  },
  {
    key: 'french', label: 'French',
    features: [
      { id: 'h', why: 'French has no H, so "happy" becomes "appy".' },
      { id: 'th', why: 'French has no TH, so it becomes S or Z.' },
      { id: 'stress', why: 'French stresses the last syllable of every word.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'r', why: 'French R is made in the throat.' },
      { id: 'schwa', why: 'French doesn\'t reduce vowels the way English does.' },
      { id: 'rhythm', why: 'French is syllable-timed.' },
      { id: 'ing', why: 'French has no NG sound.' },
      { id: 'goat', why: 'French "o" doesn\'t glide.' },
    ],
  },
  {
    key: 'german', label: 'German and Dutch',
    features: [
      { id: 'vw', why: 'German W sounds like English V, so "west" becomes "vest".' },
      { id: 'th', why: 'German has no TH.' },
      { id: 'sz', why: 'German devoices final consonants, so "dog" sounds like "dock" and "plans" like "plants".' },
      { id: 'trap', why: 'German has no "cat" vowel.' },
      { id: 'r', why: 'German R is made in the throat.' },
      { id: 'l', why: 'German L is always light.' },
      { id: 'goat', why: 'German "o" doesn\'t glide.' },
    ],
  },
  {
    key: 'arabic', label: 'Arabic',
    features: [
      { id: 'pfb', why: 'Arabic has no P, so "park" becomes "bark".' },
      { id: 'vw', why: 'Arabic has no V, so it becomes F.' },
      { id: 'shortlong', why: 'Arabic has fewer vowels, so "ship" and "sheep" merge.' },
      { id: 'finals', why: 'Arabic breaks up consonant clusters with an extra vowel.' },
      { id: 'trap', why: '"Bad" and "bed" often merge.' },
      { id: 'schwa', why: 'Unstressed vowels get full value.' },
      { id: 'stress', why: 'Stress rules differ from English.' },
      { id: 'r', why: 'Arabic R is rolled.' },
    ],
  },
  {
    key: 'persian', label: 'Persian',
    features: [
      { id: 'finals', why: 'Persian adds a vowel before S-clusters: "eschool".' },
      { id: 'vw', why: 'W often becomes V.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'th', why: 'Persian has no TH.' },
      { id: 'trap', why: 'The "cat" vowel is often too close to "e".' },
      { id: 'stress', why: 'Persian stresses the last syllable.' },
      { id: 'rhythm', why: 'Persian gives syllables more equal time.' },
    ],
  },
  {
    key: 'slavic', label: 'Russian, Ukrainian and Polish',
    features: [
      { id: 'th', why: 'Slavic languages have no TH.' },
      { id: 'h', why: 'The Slavic H is scraped in the throat.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'trap', why: '"Bad" and "bed" merge.' },
      { id: 'vw', why: 'Russian has no W, so it becomes V.' },
      { id: 'finals', why: 'Final consonants are devoiced, so "bag" sounds like "back".' },
      { id: 'l', why: 'L is often too dark or too light in the wrong places.' },
      { id: 'intonation', why: 'Russian statement melody can sound flat or stern to English ears.' },
      { id: 'rhythm', why: 'Unstressed syllables aren\'t squeezed enough.' },
      { id: 'schwa', why: 'Unstressed vowels get too much value.' },
    ],
  },
  {
    key: 'japanese', label: 'Japanese',
    features: [
      { id: 'lr', why: 'Japanese has one sound between L and R.' },
      { id: 'th', why: 'Japanese has no TH.' },
      { id: 'finals', why: 'Japanese adds vowels after consonants: "desk-u", "milk-u".' },
      { id: 'shortlong', why: 'English vowel length works differently from Japanese.' },
      { id: 'pfb', why: 'Japanese F is breathy, close to H.' },
      { id: 'vw', why: 'Japanese has no V, so it becomes B.' },
      { id: 'sz', why: '"Si" becomes "shi" and Z becomes "dz".' },
      { id: 'rhythm', why: 'Japanese is timed by syllable beats.' },
      { id: 'stress', why: 'Japanese uses pitch accent, not stress.' },
      { id: 'schwa', why: 'Unstressed vowels get full value.' },
    ],
  },
  {
    key: 'korean', label: 'Korean',
    features: [
      { id: 'lr', why: 'Korean has one sound for L and R.' },
      { id: 'pfb', why: 'Korean has no F, so it becomes P.' },
      { id: 'vw', why: 'Korean has no V, so it becomes B.' },
      { id: 'finals', why: 'Final consonants are swallowed, or get an extra vowel.' },
      { id: 'sz', why: 'Z becomes J: "zoo" → "joo".' },
      { id: 'th', why: 'Korean has no TH.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'rhythm', why: 'Korean gives syllables equal time.' },
      { id: 'stress', why: 'Korean has no word stress.' },
    ],
  },
  {
    key: 'vietnamese', label: 'Vietnamese',
    features: [
      { id: 'finals', why: 'Vietnamese drops or swallows final consonants.' },
      { id: 'sz', why: 'S and Z at the end of words are often dropped.' },
      { id: 'th', why: 'Vietnamese has no TH.' },
      { id: 'shortlong', why: 'Vowel length works differently.' },
      { id: 'stress', why: 'Tones replace stress.' },
      { id: 'rhythm', why: 'Each syllable gets equal weight.' },
      { id: 'intonation', why: 'Tones can make English melody sound choppy.' },
      { id: 'shs', why: 'SH and S are easily confused.' },
    ],
  },
  {
    key: 'southeast', label: 'Thai, Indonesian and Malay',
    features: [
      { id: 'finals', why: 'Final consonants are often dropped or unreleased.' },
      { id: 'sz', why: 'S and Z endings get dropped.' },
      { id: 'th', why: 'These languages have no TH.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'r', why: 'R is rolled or tapped.' },
      { id: 'l', why: 'A final L is often dropped.' },
      { id: 'rhythm', why: 'Syllables get equal time.' },
      { id: 'stress', why: 'Stress is weaker than in English.' },
    ],
  },
  {
    key: 'tagalog', label: 'Filipino',
    features: [
      { id: 'pfb', why: 'Filipino languages traditionally have no F, so "family" becomes "pamily".' },
      { id: 'vw', why: 'V often becomes B.' },
      { id: 'th', why: 'TH becomes T or D.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'sz', why: 'Z becomes S.' },
      { id: 'schwa', why: 'Unstressed vowels get full value.' },
      { id: 'trap', why: '"Bad" and "bed" merge.' },
      { id: 'rhythm', why: 'Syllables get equal time.' },
    ],
  },
  {
    key: 'turkish', label: 'Turkish',
    features: [
      { id: 'th', why: 'Turkish has no TH.' },
      { id: 'vw', why: 'W becomes V.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'trap', why: '"Bad" and "bed" merge.' },
      { id: 'finals', why: 'Turkish adds a vowel before initial clusters: "istation".' },
      { id: 'stress', why: 'Turkish stresses the last syllable.' },
      { id: 'l', why: 'L placement differs.' },
    ],
  },
  {
    key: 'italian', label: 'Italian',
    features: [
      { id: 'finals', why: 'Italian adds a vowel after final consonants: "it-a", "big-a".' },
      { id: 'h', why: 'Italian has no H, so it\'s dropped.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'th', why: 'Italian has no TH.' },
      { id: 'schwa', why: 'Italian gives every vowel full value.' },
      { id: 'stress', why: 'Stress often moves to a different syllable.' },
      { id: 'rhythm', why: 'Italian is syllable-timed.' },
    ],
  },
  {
    key: 'african', label: 'African English',
    features: [
      { id: 'th', why: 'TH often becomes T or D.' },
      { id: 'shortlong', why: '"Ship" and "sheep" often merge.' },
      { id: 'schwa', why: 'Many African languages give every vowel full value.' },
      { id: 'rhythm', why: 'Syllables get more equal time than in American or British English.' },
      { id: 'stress', why: 'Stress can land on a different syllable.' },
      { id: 'trap', why: '"Bad" and "bed" can merge.' },
      { id: 'lot', why: 'The "hot" vowel is often too rounded or too long.' },
      { id: 'intonation', why: 'Tone languages shape the melody differently.' },
      { id: 'r', why: 'R is often tapped or rolled.' },
    ],
  },
  {
    key: 'singapore', label: 'Singapore and Malaysian English',
    features: [
      { id: 'finals', why: 'Final consonants are often dropped: "lot" → "lo".' },
      { id: 'th', why: 'TH becomes T or D.' },
      { id: 'shortlong', why: '"Ship" and "sheep" merge.' },
      { id: 'stress', why: 'Stress is weaker or lands elsewhere.' },
      { id: 'rhythm', why: 'Syllables get equal time.' },
      { id: 'intonation', why: 'The melody differs from American or British English.' },
      { id: 'sz', why: 'S and Z endings get dropped.' },
    ],
  },
  { key: 'native', label: 'native English', features: [] },
  {
    key: 'other', label: 'many',
    features: [
      { id: 'th', why: 'TH is rare in other languages.' },
      { id: 'shortlong', why: 'Most languages have fewer vowels than English.' },
      { id: 'schwa', why: 'Most languages don\'t reduce vowels the way English does.' },
      { id: 'stress', why: 'English stress is unpredictable.' },
      { id: 'rhythm', why: 'English rhythm is unusual among languages.' },
      { id: 'finals', why: 'English has many consonant clusters at the ends of words.' },
    ],
  },
];

export const profileByKey = (k: ProfileKey) => PROFILES.find((p) => p.key === k)!;

export interface StartingPoint {
  id: string;
  name: string;
  group: 'english' | 'language';
  profile: ProfileKey;
  /** Native accent of English, if this is one. */
  native?: AccentId;
}

export const STARTING: StartingPoint[] = [
  { id: 'en-in', name: 'English with an Indian accent', group: 'english', profile: 'indian' },
  { id: 'en-pk', name: 'English with a Pakistani, Bangladeshi or Sri Lankan accent', group: 'english', profile: 'indian' },
  { id: 'en-ng', name: 'Nigerian or West African English', group: 'english', profile: 'african' },
  { id: 'en-ke', name: 'Kenyan or East African English', group: 'english', profile: 'african' },
  { id: 'en-ph', name: 'Filipino English', group: 'english', profile: 'tagalog' },
  { id: 'en-sg', name: 'Singapore or Malaysian English', group: 'english', profile: 'singapore' },
  { id: 'en-us', name: 'American English', group: 'english', profile: 'native', native: 'us' },
  { id: 'en-gb', name: 'British or Irish English', group: 'english', profile: 'native', native: 'gb' },
  { id: 'en-au', name: 'Australian or New Zealand English', group: 'english', profile: 'native', native: 'au' },
  { id: 'en-ca', name: 'Canadian English', group: 'english', profile: 'native', native: 'ca' },
  ...(
    [
      ['Hindi', 'indian'], ['Urdu', 'indian'], ['Bengali', 'indian'], ['Tamil', 'indian'], ['Telugu', 'indian'], ['Kannada', 'indian'], ['Malayalam', 'indian'],
      ['Marathi', 'indian'], ['Gujarati', 'indian'], ['Punjabi', 'indian'], ['Odia', 'indian'], ['Nepali', 'indian'], ['Sinhala', 'indian'],
      ['Mandarin', 'chinese'], ['Cantonese', 'chinese'], ['Spanish', 'spanish'], ['Portuguese', 'portuguese'], ['French', 'french'], ['German', 'german'], ['Dutch', 'german'],
      ['Arabic', 'arabic'], ['Persian (Farsi)', 'persian'], ['Russian', 'slavic'], ['Ukrainian', 'slavic'], ['Polish', 'slavic'], ['Japanese', 'japanese'], ['Korean', 'korean'],
      ['Vietnamese', 'vietnamese'], ['Thai', 'southeast'], ['Indonesian', 'southeast'], ['Malay', 'southeast'], ['Tagalog', 'tagalog'], ['Turkish', 'turkish'], ['Italian', 'italian'],
      ['Yoruba', 'african'], ['Igbo', 'african'], ['Hausa', 'african'], ['Swahili', 'african'], ['Amharic', 'african'], ['Another language', 'other'],
    ] as [string, ProfileKey][]
  ).map(([name, profile]) => ({ id: `l1-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`, name, group: 'language' as const, profile })),
];

export const startingById = (id: string) => STARTING.find((s) => s.id === id);

/** Best guess of the starting point from the free-text first language in the profile. */
export function guessStarting(nativeLanguage: string): string {
  const n = nativeLanguage.trim().toLowerCase();
  if (!n) return 'en-in';
  const exact = STARTING.find((s) => s.group === 'language' && s.name.toLowerCase().startsWith(n.split(/[\s(]/)[0]));
  if (exact) return exact.id;
  if (/english/.test(n)) return 'en-in';
  return 'l1-another-language';
}

// ---------- the sound map ----------

export interface MapEntry {
  feature: SoundFeature;
  /** Why this sound is on the user's map. */
  reason: string;
  source: 'profile' | 'signature' | 'general';
}

/**
 * The user's sounds in priority order: what speakers of their first language usually need
 * (most important first), then the signature sounds of the target accent, then the rest.
 */
export function soundMap(startId: string, target: AccentId): MapEntry[] {
  const start = startingById(startId) ?? STARTING[0];
  const prof = profileByKey(start.profile);
  const t = targetById(target);
  const out: MapEntry[] = [];
  const seen = new Set<FeatureId>();
  const push = (id: FeatureId, reason: string, source: MapEntry['source']) => {
    const f = featureById(id);
    if (seen.has(id) || !f.targets.includes(target)) return;
    seen.add(id);
    out.push({ feature: f, reason, source });
  };
  const sameAccent = start.native === target;
  prof.features.forEach((x) => push(x.id, x.why, 'profile'));
  if (!sameAccent) t.signatures.forEach((id) => push(id, `A signature sound of ${t.adjective} English.`, 'signature'));
  FEATURES.forEach((f) => push(f.id, 'Useful for every speaker.', 'general'));
  return out;
}

// ---------- accent check ----------

export interface CheckItem {
  text: string;
  probes: Partial<Record<FeatureId, string[]>>;
  /** Only used for these targets. */
  only?: AccentId[];
}

export const CHECK: CheckItem[] = [
  { text: 'I think this is the third time the water heater broke at work.', probes: { th: ['think', 'this', 'the', 'third'], midt: ['water', 'heater'], r: ['third', 'water', 'heater', 'work'], td: ['time'] } },
  { text: 'Very well, we will review the new video on Wednesday.', probes: { vw: ['very', 'well', 'we', 'will', 'review', 'video', 'wednesday'], yod: ['new'] } },
  { text: 'Can\'t we ask the staff to plan a quick class on the last day?', probes: { bath: ["can't", 'ask', 'staff', 'class', 'last'], trap: ['plan'], face: ['day'] } },
  { text: 'Go home and open the notes on your phone, then call the hotel.', probes: { goat: ['go', 'home', 'open', 'notes', 'phone'], l: ['call', 'hotel'] } },
  { text: 'Ship the cheap seeds and the full pool kits to the hot shop.', probes: { shortlong: ['ship', 'cheap', 'seeds', 'full', 'pool'], lot: ['hot', 'shop'], shs: ['ship', 'shop'] } },
  { text: 'She says his plans and goals are easy, and he hopes to help.', probes: { shs: ['she'], sz: ['says', 'his', 'plans', 'goals', 'easy'], h: ['he', 'hopes', 'help'] } },
  { text: 'Please put the file in a blue folder before Friday.', probes: { pfb: ['please', 'put', 'file', 'blue', 'folder', 'before', 'friday'], td: ['put'] } },
  { text: 'We asked the development team for the results this morning.', probes: { finals: ['asked', 'results'], stress: ['development'], ing: ['morning'], th: ['the', 'this'] } },
  { text: 'The project is not a problem, and the lab results look really correct.', probes: { lot: ['project', 'not', 'problem'], lr: ['lab', 'results', 'look', 'really', 'correct'], trap: ['lab'] } },
  { text: 'I\'ll write about the price of the house.', probes: { caraising: ['write', 'about', 'price', 'house'] }, only: ['ca'] },
];

export const checkFor = (t: AccentId) => CHECK.filter((c) => !c.only || c.only.includes(t));

/** Short lines for shadowing practice, built from every sound's sentences plus confident-speaking lines. */
export function shadowLines(target: AccentId): string[] {
  const own = FEATURES.filter((f) => f.targets.includes(target)).flatMap((f) => f.sentences);
  return [
    ...own,
    'Thanks for joining. Let\'s get started.',
    'Here\'s where we stand on the project.',
    'I\'d like to add one point before we move on.',
    'That\'s a fair question. The short answer is yes.',
    'Let me walk you through the numbers.',
    'I recommend we move the launch to Friday.',
  ];
}
