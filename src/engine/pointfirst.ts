// "Say it first": rewrites a message you're about to deliver so the point comes first.
// Pure, on-phone rules (no AI): find the sentence that holds the ask, decision or status, move it to
// the front, and cut throat-clearing openers, hedges, apologies and permission-seeking.
import { countWords } from './text';
import { pointIndex } from './direct';

export interface PointFirst {
  /** The rewritten message. */
  text: string;
  /** The sentence that carries the point, as rewritten, or null if none was found. */
  point: string | null;
  /** True if the point sentence was moved to the front. */
  moved: boolean;
  /** Phrases that were cut, in order, without duplicates (for "what changed"). */
  removed: string[];
  wordsBefore: number;
  wordsAfter: number;
}

/** Openers cut at the start of a sentence. Longest first so "okay so" wins over "okay". */
const OPENERS: RegExp[] = [
  /^(?:i'?m |i am )?(?:so |really |very )?sorry (?:to (?:bother|disturb|interrupt) you|for (?:bothering|disturbing|interrupting) you)(?: but)?[,.]?\s*/i,
  /^(?:i'?m |i am )?(?:so |really |very )?sorry(?: but)?,\s*/i,
  // Greeting, with an optional name (case-sensitive so "hi we need…" keeps "we").
  /^(?:[Hh]i|[Hh]ey|[Hh]ello)(?: (?:[A-Z][a-z]+|team|all|everyone|there|guys))?[,!.]?\s+(?=\S)/,
  /^(?:so|um+|uh+|well|okay|ok|alright|right),?\s+(?:so,?\s+)?/i,
  /^(?:basically|honestly|to be honest|as you (?:all )?know|first of all|just to give (?:you )?some (?:context|background)),?\s*/i,
  /^(?:i (?:just )?wanted to (?:quickly )?(?:say|mention|let you know|tell you|flag|share)|i (?:just )?want to (?:say|mention|let you know|flag))(?: that)?,?\s*/i,
  /^(?:just )?(?:a )?(?:quick|small|little) (?:question|thing|update|note|point)[:,.]?\s*/i,
];

/** Hedges and minimizers cut anywhere in a sentence. */
const HEDGES: { re: RegExp; label: string }[] = [
  { re: /\bi (?:just )?(?:think|feel like|guess|believe)(?: that)?,?\s+/gi, label: 'I think' },
  { re: /\bi'?m not (?:really |totally |100% )?sure,? but\s+/gi, label: "I'm not sure, but" },
  { re: /\bi could be wrong,? but\s+/gi, label: 'I could be wrong, but' },
  { re: /\b(?:kind|sort) of\s+/gi, label: 'kind of' },
  { re: /\bjust\s+/gi, label: 'just' },
  { re: /\bmaybe\s+/gi, label: 'maybe' },
  { re: /\b(?:probably|possibly|perhaps),?\s+/gi, label: 'probably' },
  { re: /\bhopefully,?\s+/gi, label: 'hopefully' },
  { re: /\ba (?:little )?bit\s+(?=(?:late|behind|delayed|over|early|concerned|worried)\b)/gi, label: 'a bit' },
  { re: /,?\s*if (?:that'?s|that is|it'?s|it is) (?:ok|okay|alright|all right|fine)(?: with you)?(?=[.!?]|$)/gi, label: "if that's okay" },
];

/** Whole sentences dropped: permission-seeking and pure apologies with no content. */
const DROP: { re: RegExp; label: string }[] = [
  { re: /^(?:does|did) (?:that|this|it) make sense\??$/i, label: 'Does that make sense?' },
  { re: /^(?:i (?:just )?(?:wanted|want|need) to |let me )?(?:give|share|provide) (?:you |everyone )?(?:some |a (?:bit of |little )?|quick )?(?:context|background)(?: (?:on|about|for) [^.!?]*)?[.!]?$/i, label: 'context warm-up' },
  { re: /^(?:i )?hope (?:that'?s|this is|that is) (?:ok|okay|alright|fine)[.!?]?$/i, label: "Hope that's okay" },
  { re: /^(?:i'?m |i am )?(?:so |really |very )?sorry(?: to (?:bother|disturb|interrupt) you| (?:about|for) (?:this|that|the (?:trouble|inconvenience|confusion)|bothering you|interrupting))?[.!]?$/i, label: 'sorry' },
  { re: /^(?:i )?(?:apologi[sz]e|my apologies)(?: for (?:this|that|the (?:trouble|inconvenience|confusion)))?[.!]?$/i, label: 'apology' },
];

/** "Sorry for the delay" becomes "Thanks for your patience": the app's own advice. */
const THANK_INSTEAD = /^(?:i'?m |i am )?(?:so |really |very )?sorry (?:for|about) (?:the |my )?(?:delay|late (?:reply|response)|wait(?:ing)?)[.!]?$/i;

function sentences(raw: string): string[] {
  const text = raw.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  if (!text) return [];
  return (text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function tidy(s: string): string {
  let t = s.replace(/\s+([,.!?])/g, '$1').replace(/,{2,}/g, ',').replace(/^[,;:\s-]+/, '').replace(/\s{2,}/g, ' ').trim();
  if (t && !/[.!?]$/.test(t)) t += '.';
  return cap(t);
}

/** Rewrites a message point-first. */
export function pointFirst(raw: string): PointFirst {
  const removed: string[] = [];
  const note = (label: string) => !removed.includes(label) && removed.push(label);
  const out: string[] = [];
  for (const original of sentences(raw)) {
    let s = original;
    // Openers first (a greeting can hide a whole-sentence apology: "Hi Meera, sorry to bother you.").
    for (let changed = true; changed; ) {
      changed = false;
      for (const re of OPENERS) {
        const m = s.match(re);
        if (m && m[0].trim() && s.length > m[0].length) {
          const cut = m[0].replace(/[,.:!]+\s*$/, '').trim().toLowerCase();
          note(/^(?:hi|hey|hello)\b/.test(cut) ? 'greeting' : /\bsorry\b/.test(cut) ? 'sorry' : cut);
          s = s.slice(m[0].length);
          changed = true;
        }
      }
    }
    if (THANK_INSTEAD.test(s)) {
      note('sorry');
      out.push('Thanks for your patience.');
      continue;
    }
    const drop = DROP.find((d) => d.re.test(s));
    if (drop) {
      note(drop.label);
      continue;
    }
    for (const h of HEDGES) {
      const before = s;
      s = s.replace(h.re, '');
      if (s !== before) note(h.label);
    }
    const t = tidy(s);
    if (countWords(t) > 0) out.push(t);
  }
  const idx = out.findIndex((s) => pointIndex(s) !== null && (pointIndex(s) ?? 99) <= 6);
  const any = idx >= 0 ? idx : out.findIndex((s) => pointIndex(s) !== null);
  let moved = false;
  if (any > 0) {
    const [p] = out.splice(any, 1);
    out.unshift(p);
    moved = true;
  }
  const text = out.join(' ');
  return { text, point: any >= 0 ? out[0] : null, moved, removed, wordsBefore: countWords(raw), wordsAfter: countWords(text) };
}
