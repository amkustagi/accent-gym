// Learns the names in the user's working world from what they say in free-speaking rounds:
// projects ("the Atlas migration"), people ("I told Priya"), and products or clients ("Salesforce").
// Pure functions: no state, so they're easy to test.
import type { Term } from '../store/store';

export interface Found {
  text: string;
  kind: Term['kind'];
}

const STOP = new Set(
  (
    'i im ive id ill me my we our us you your they them he she it its this that these those the a an and or but so if then also just ' +
    'monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december ' +
    'today tomorrow yesterday ok okay yes no hi hello hey thanks thank please sorry well right good great sure first second next last ' +
    'english american british canadian australian indian ' +
    'ceo cfo cto coo vp hr it qa ui ux ai api kpi okr roi q1 q2 q3 q4 eta asap fyi pm am us uk eu usa ' +
    'one two three four five six seven eight nine ten hundred thousand million billion percent ' +
    'mr mrs ms dr team company manager boss client customer everyone everybody someone god'
  ).split(' '),
);

const PROJECT_NOUNS = 'project|migration|launch|release|rollout|initiative|program|programme|account|deal|integration|dashboard|platform|redesign|upgrade|pilot|campaign|audit|report|roadmap|system|app|portal|pipeline|implementation|transformation|proposal|budget|review';
const PERSON_CUES = /\b(with|to|from|told|tell|asked|ask|thank|thanks|met|meet|call|called|email|emailed|ping|pinged|and|said|says|manager|boss|lead|director|colleague)\s+$/i;

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const isCap = (w: string) => /^[A-Z][a-zA-Z0-9&.-]*$/.test(w);
const isAcronym = (w: string) => /^[A-Z][A-Z0-9&]{1,5}$/.test(w);

/** Finds candidate names in one transcript. Each distinct name is returned once. */
export function extractTerms(transcript: string): Found[] {
  const out = new Map<string, Found>();
  const add = (text: string, kind: Found['kind']) => {
    const key = text.toLowerCase();
    const prev = out.get(key);
    // A project or person reading beats a plain term.
    if (!prev || prev.kind === 'term') out.set(key, { text, kind });
  };

  // "the Atlas migration", "the vendor onboarding project"
  const proj = new RegExp(`\\bthe\\s+((?:[A-Za-z0-9][\\w-]*\\s+){0,2}?)(${PROJECT_NOUNS})\\b`, 'gi');
  for (const m of transcript.matchAll(proj)) {
    const lead = m[1].trim();
    const words = lead.split(/\s+/).filter(Boolean);
    // Needs a distinctive word: a capitalized name or a specific noun, not "the new project".
    const useful = words.filter((w) => !STOP.has(norm(w)) && !/^(new|old|big|main|current|whole|last|next|other|same|this|that|first|second|final|whole)$/i.test(w));
    if (!useful.length) continue;
    if (!words.some(isCap) && useful.length < 2 && !/^(project|program|programme)$/i.test(m[2])) continue;
    add(`the ${lead} ${m[2].toLowerCase()}`.replace(/\s+/g, ' '), 'project');
  }

  // Capitalized names that aren't just the start of a sentence.
  const sentences = transcript.split(/(?<=[.!?])\s+|\n+/);
  for (const sent of sentences) {
    const words = sent.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const raw = words[i].replace(/[,;:!?.)"']+$/, '').replace(/^["'(]+/, '').replace(/'s$/, '');
      if (!raw || STOP.has(norm(raw))) continue;
      const acronym = isAcronym(raw);
      // At the start of a sentence a capital means nothing, unless the next word is capitalized too ("Northwind Bank").
      const nextWord = (words[i + 1] ?? '').replace(/[,;:!?.)"']+$/, '');
      const startsName = i === 0 && isCap(raw) && (isCap(nextWord) || isAcronym(nextWord)) && !STOP.has(norm(nextWord));
      if (!acronym && (!isCap(raw) || (i === 0 && !startsName))) continue;
      // Join following capitalized words: "Project Atlas", "Northwind Bank".
      let phrase = raw;
      let j = i + 1;
      while (j < words.length && j < i + 3) {
        const nx = words[j].replace(/[,;:!?.)"']+$/, '').replace(/'s$/, '');
        if (!(isCap(nx) || isAcronym(nx)) || STOP.has(norm(nx))) break;
        phrase += ` ${nx}`;
        j++;
      }
      const before = words.slice(0, i).join(' ') + ' ';
      const single = phrase === raw;
      if (/^project\s/i.test(phrase)) add(phrase, 'project');
      else if (single && !acronym && PERSON_CUES.test(before)) add(phrase, 'person');
      else add(phrase, 'term');
      i = j - 1;
    }
  }
  const all = [...out.values()];
  // "Atlas" alone is already covered by "the Atlas migration".
  const inProject = (f: Found) => f.kind === 'term' && all.some((p) => p.kind === 'project' && p !== f && new RegExp(`\\b${f.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(p.text));
  return all.filter((f) => f.text.length >= 2 && f.text.length <= 40 && !inProject(f));
}

/** Folds one round's findings into the known terms. Hidden terms are never re-learned. */
export function mergeTerms(terms: Term[], found: Found[], now: number): Term[] {
  const next = terms.map((t) => ({ ...t }));
  for (const f of found) {
    const key = f.text.toLowerCase();
    const hit = next.find((t) => t.text.toLowerCase() === key);
    if (hit) {
      if (hit.hidden) continue;
      hit.n += 1;
      hit.last = now;
      if (hit.kind === 'term' && f.kind !== 'term') hit.kind = f.kind;
    } else next.push({ text: f.text, kind: f.kind, n: 1, last: now, src: 'heard' });
  }
  // Keep the list small: drop one-off mentions that went stale.
  return next
    .filter((t) => t.hidden || t.src === 'told' || t.n >= 2 || now - t.last < 45 * 864e5)
    .sort((a, b) => b.last - a.last)
    .slice(0, 120);
}

/** Terms confident enough to put in practice content: told by the user, or heard in 2+ rounds. */
export function knownTerms(terms: Term[], kind?: Term['kind']): Term[] {
  return terms.filter((t) => !t.hidden && (t.src === 'told' || t.n >= 2) && (!kind || t.kind === kind)).sort((a, b) => b.n - a.n || b.last - a.last);
}
