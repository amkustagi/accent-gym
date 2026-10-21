// Transcript analysis: fillers, weak language, word matching. Pure functions, no DOM.

export type WeakCategory = 'apology' | 'hedge' | 'minimizer' | 'permission' | 'regional' | 'overpolite';

export interface Rule {
  id: string;
  label: string;
  re: RegExp;
  fix: string;
  category?: WeakCategory;
  /** Occurrences allowed before it counts (e.g. one "please" is fine). */
  allow?: number;
}

export const WEAK_RULES: Rule[] = [
  { id: 'sorry', label: 'sorry', category: 'apology', re: /\b(?:i'?m |i am )?(?:so |very |really )?sorry\b/gi, fix: 'Thank instead of apologizing: "Thanks for waiting" beats "Sorry for the delay."' },
  { id: 'apologize', label: 'apologize', category: 'apology', re: /\b(?:my )?apolog(?:y|ies|ise|ize)\b/gi, fix: 'Save apologies for real mistakes.' },
  { id: 'just', label: 'just', category: 'minimizer', re: /\bjust\b/gi, fix: 'Cut it. "I just wanted to check" becomes "I\'m checking on…"' },
  { id: 'quick', label: 'quick / small', category: 'minimizer', re: /\b(?:quick|small|little) (?:question|thing|point|update)\b/gi, fix: 'Don\'t shrink your point before you make it. "One question:" works.' },
  { id: 'think', label: 'I think', category: 'hedge', re: /\bi (?:just )?think\b/gi, fix: 'State it: "I recommend…" or "The data shows…"' },
  { id: 'feel', label: 'I feel like', category: 'hedge', re: /\bi feel like\b/gi, fix: '"My view is…", or simply say the point.' },
  { id: 'kindof', label: 'kind of / sort of', category: 'hedge', re: /\b(?:kind|sort) of\b/gi, fix: 'Drop the softener.' },
  { id: 'maybe', label: 'maybe', category: 'hedge', re: /\bmaybe\b/gi, fix: '"Maybe we could…" becomes "Let\'s…"' },
  { id: 'guess', label: 'I guess', category: 'hedge', re: /\bi guess\b/gi, fix: 'Commit to the statement or give your reason.' },
  { id: 'probably', label: 'probably / possibly', category: 'hedge', re: /\b(?:probably|possibly|perhaps)\b/gi, allow: 1, fix: 'One qualifier is honest. Several sound unsure.' },
  { id: 'hopefully', label: 'hopefully', category: 'hedge', re: /\bhopefully\b/gi, fix: '"We will…", then name the real risk.' },
  { id: 'try', label: "I'll try", category: 'hedge', re: /\b(?:i'?ll|i will|we'?ll|we will) try\b/gi, fix: '"I will…" plus a date.' },
  { id: 'doubt', label: 'self-doubt', category: 'hedge', re: /\b(?:i'?m not (?:an )?expert|i could be wrong|i'?m not (?:really )?sure|this (?:might|may) be (?:a )?(?:stupid|dumb|silly))\b/gi, fix: '"My best read is…" Lead with the point.' },
  { id: 'sense', label: 'make sense?', category: 'permission', re: /\bdoes (?:that|this|it) make sense\b/gi, fix: '"What questions do you have?"' },
  { id: 'okay', label: "if that's okay", category: 'permission', re: /\bif (?:that'?s|that is|it'?s|it is) (?:ok|okay|alright|all right|fine)\b/gi, fix: 'Ask directly. You don\'t need permission.' },
  { id: 'canijust', label: 'can I just', category: 'permission', re: /\bcan i (?:just|quickly)\b/gi, fix: '"I\'d like to add one point."' },
  { id: 'kindly', label: 'kindly', category: 'regional', re: /\bkindly\b/gi, fix: '"Could you…" sounds natural in North American offices.' },
  { id: 'needful', label: 'do the needful', category: 'regional', re: /\bdo the needful\b/gi, fix: 'Name the action: "Could you approve it by Friday?"' },
  { id: 'revert', label: 'revert', category: 'regional', re: /\brevert(?:ed|ing)?(?: back)?\b/gi, fix: 'Here "revert" means undo. Say "reply" or "get back to me."' },
  { id: 'prepone', label: 'prepone', category: 'regional', re: /\bprepone[sd]?\b/gi, fix: '"Move it earlier" or "move it up."' },
  { id: 'isit', label: 'is it?', category: 'regional', re: /\bis it\?/gi, fix: '"Really?" or "Got it."' },
  { id: 'doubt2', label: 'I have a doubt', category: 'regional', re: /\bi have (?:a|one|some) doubts?\b/gi, fix: '"I have a question." In US English, "doubt" means disbelief.' },
  { id: 'noproblem', label: 'no problem', category: 'overpolite', re: /\bno (?:problem|issues?|worries)\b/gi, fix: '"Happy to" or "Glad to."' },
  { id: 'please', label: 'please (repeated)', category: 'overpolite', re: /\bplease\b/gi, allow: 1, fix: 'One "please" is polite. Repeated, it sounds like pleading.' },
];

export const FILLER_RULES: Rule[] = [
  { id: 'um', label: 'um / uh', re: /\b(?:u+m+|u+h+|uhm+|e+r+m+|hmm+|ah+)\b/gi, fix: '' },
  { id: 'like', label: 'like', re: /\b(?:was|is|it'?s|and|but|so|just) like\b|\blike,/gi, fix: '' },
  { id: 'youknow', label: 'you know', re: /\byou know(?! (?:what|how|why|when|where|that|the|if|whether))\b/gi, fix: '' },
  { id: 'basically', label: 'basically', re: /\bbasically\b/gi, fix: '' },
  { id: 'actually', label: 'actually', re: /\bactually\b/gi, fix: '' },
  { id: 'literally', label: 'literally', re: /\bliterally\b/gi, fix: '' },
  { id: 'imean', label: 'I mean', re: /\bi mean\b/gi, fix: '' },
  { id: 'soyeah', label: 'so yeah', re: /\bso yeah\b|\byeah so\b/gi, fix: '' },
  { id: 'okayso', label: 'okay so', re: /\b(?:okay|ok|alright) so\b/gi, fix: '' },
];

export interface Hit {
  rule: Rule;
  kind: 'weak' | 'filler';
  start: number;
  end: number;
}

export interface TextReport {
  words: number;
  hits: Hit[];
  weakCount: number;
  fillerCount: number;
  weakByRule: { rule: Rule; count: number }[];
  fillerByRule: { rule: Rule; count: number }[];
  sentences: number;
  avgSentenceWords: number;
}

export const tokenize = (s: string): string[] =>
  s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);

export function countWords(s: string): number {
  return tokenize(s).length;
}

function scan(text: string, rules: Rule[], kind: Hit['kind']): Hit[] {
  const out: Hit[] = [];
  for (const rule of rules) {
    const re = new RegExp(rule.re.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      out.push({ rule, kind, start: m.index, end: m.index + m[0].length });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return out;
}

/** Removes overlaps, preferring the longer match (e.g. "so sorry" over "sorry"). */
function dedupe(hits: Hit[]): Hit[] {
  const sorted = [...hits].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const out: Hit[] = [];
  for (const h of sorted) {
    const last = out[out.length - 1];
    if (last && h.start < last.end) {
      if (h.end - h.start > last.end - last.start) out[out.length - 1] = h;
      continue;
    }
    out.push(h);
  }
  return out;
}

function tally(hits: Hit[]): { rule: Rule; count: number }[] {
  const map = new Map<string, { rule: Rule; count: number }>();
  hits.forEach((h) => {
    const e = map.get(h.rule.id) ?? { rule: h.rule, count: 0 };
    e.count++;
    map.set(h.rule.id, e);
  });
  return [...map.values()]
    .map((e) => ({ ...e, count: Math.max(0, e.count - (e.rule.allow ?? 0)) }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function analyzeText(raw: string): TextReport {
  const text = raw.replace(/[’‘]/g, "'");
  const hits = dedupe([...scan(text, WEAK_RULES, 'weak'), ...scan(text, FILLER_RULES, 'filler')]);
  const weakByRule = tally(hits.filter((h) => h.kind === 'weak'));
  const fillerByRule = tally(hits.filter((h) => h.kind === 'filler'));
  const words = countWords(text);
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
  return {
    words,
    hits,
    weakCount: weakByRule.reduce((a, e) => a + e.count, 0),
    fillerCount: fillerByRule.reduce((a, e) => a + e.count, 0),
    weakByRule,
    fillerByRule,
    sentences,
    avgSentenceWords: Math.round((words / sentences) * 10) / 10,
  };
}

export interface Segment {
  text: string;
  kind?: Hit['kind'];
  label?: string;
}

/** Splits text into plain and highlighted segments for rendering. */
export function segments(raw: string): Segment[] {
  const text = raw.replace(/[’‘]/g, "'");
  const hits = dedupe([...scan(text, WEAK_RULES, 'weak'), ...scan(text, FILLER_RULES, 'filler')]);
  const out: Segment[] = [];
  let i = 0;
  for (const h of hits) {
    if (h.start > i) out.push({ text: text.slice(i, h.start) });
    out.push({ text: text.slice(h.start, h.end), kind: h.kind, label: h.rule.label });
    i = h.end;
  }
  if (i < text.length) out.push({ text: text.slice(i) });
  return out;
}

export interface MatchResult {
  accuracy: number;
  /** Target words in display form with whether each was recognized. */
  words: { word: string; hit: boolean }[];
}

/** Longest-common-subsequence match of recognized speech against a target script. */
export function matchTarget(target: string, heard: string): MatchResult {
  const display = target.split(/\s+/).filter(Boolean);
  const a = display.map((w) => tokenize(w).join(''));
  const b = tokenize(heard);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] && a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const hit = new Array(a.length).fill(false);
  let i = a.length;
  let j = b.length;
  while (i && j) {
    if (a[i - 1] && a[i - 1] === b[j - 1]) {
      hit[i - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  const scored = a.filter(Boolean).length;
  const got = hit.filter(Boolean).length;
  return {
    accuracy: scored ? Math.round((100 * got) / scored) : 0,
    words: display.map((word, k) => ({ word, hit: hit[k] })),
  };
}

/** True when any alternative heard for a single word matches the target word. */
export function heardWord(target: string, alternatives: string[]): boolean {
  const t = tokenize(target).join(' ');
  return alternatives.some((alt) => {
    const toks = tokenize(alt);
    return toks.join(' ') === t || toks.includes(t);
  });
}
