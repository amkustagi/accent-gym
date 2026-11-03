// Meeting mode (tinyhustlers/hq#105): coach a real meeting after it ends.
// Pure functions only: speaker matching from small voice features, turns, labels and the debrief.
// No audio ever reaches this file; it works on transcript text and a few numbers per chunk.
import { analyzeDirectness } from './direct';
import { pointFirst } from './pointfirst';
import { analyzeText, countWords } from './text';
import { semitones, type Frame } from './voice';

/** A few numbers that describe a voice. No audio, nothing that can be played back. */
export interface VoiceFeatures {
  /** Median pitch in semitones above 100 Hz. */
  medianSt: number;
  /** Spread of pitch (25th–75th percentile) in semitones. */
  spreadSt: number;
  /** Voiced frames used, so tiny chunks can be ignored. */
  voiced: number;
}

export interface VoicePrint extends VoiceFeatures {
  v: 1;
  createdAt: number;
}

/** One stretch of speech between pauses, as transcribed on the phone. */
export interface Chunk {
  text: string;
  start: number;
  end: number;
  features: VoiceFeatures | null;
}

export const YOU = 'you';

export interface Turn {
  /** Speaker id: 'you' or 'p1', 'p2', … */
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface Meeting {
  turns: Turn[];
  /** Display names by speaker id ('you' → 'You', 'p1' → 'Person 1' or a name the user typed). */
  names: Record<string, string>;
  durationSec: number;
  source: 'live' | 'paste';
}

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/** Voice features from analyzer frames between two times (seconds), or null if too little voiced speech. */
export function featuresOf(frames: Frame[], start = -Infinity, end = Infinity, minVoiced = 6): VoiceFeatures | null {
  const st = frames.filter((f) => f.t >= start && f.t <= end && f.f0 !== null).map((f) => semitones(f.f0 as number)).sort((a, b) => a - b);
  if (st.length < minVoiced) return null;
  return { medianSt: round1(quantile(st, 0.5)), spreadSt: round1(quantile(st, 0.75) - quantile(st, 0.25)), voiced: st.length };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Distance between two voices in "tolerance units": under 1 means probably the same person. */
export function voiceDistance(a: VoiceFeatures, b: VoiceFeatures): number {
  return Math.hypot((a.medianSt - b.medianSt) / MATCH_TOL_ST, (a.spreadSt - b.spreadSt) / (MATCH_TOL_ST * 2));
}

/** Median pitch can drift about ±2 semitones for one speaker between calm and animated talk. */
export const MATCH_TOL_ST = 2.2;

/**
 * Tags each chunk as You (close to the voice print) or Person N (grouped by voice, in order of
 * first appearance). Chunks without enough voiced speech take the previous speaker.
 */
export function tagChunks(chunks: Chunk[], print: VoiceFeatures | null): Turn[] {
  const others: { id: string; f: VoiceFeatures; n: number }[] = [];
  const tagged: Turn[] = [];
  let prev = print ? YOU : 'p1';
  for (const c of chunks) {
    if (!c.text.trim()) continue;
    let speaker = prev;
    if (c.features) {
      if (print && voiceDistance(c.features, print) < 1) speaker = YOU;
      else {
        let best: { id: string; f: VoiceFeatures; n: number } | null = null;
        let bestD = Infinity;
        for (const o of others) {
          const d = voiceDistance(c.features, o.f);
          if (d < bestD) {
            bestD = d;
            best = o;
          }
        }
        if (best && bestD < 1) {
          // Running average keeps the group centred on that person's voice.
          best.f = { medianSt: (best.f.medianSt * best.n + c.features.medianSt) / (best.n + 1), spreadSt: (best.f.spreadSt * best.n + c.features.spreadSt) / (best.n + 1), voiced: best.f.voiced + c.features.voiced };
          best.n++;
          speaker = best.id;
        } else {
          const id = `p${others.length + 1}`;
          others.push({ id, f: c.features, n: 1 });
          speaker = id;
        }
      }
    }
    prev = speaker;
    tagged.push({ speaker, text: c.text.trim(), start: c.start, end: c.end });
  }
  return mergeTurns(tagged);
}

/** Joins back-to-back turns by the same speaker. */
export function mergeTurns(turns: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.speaker === t.speaker) out[out.length - 1] = { ...last, text: `${last.text} ${t.text}`, end: t.end };
    else out.push({ ...t });
  }
  return out;
}

/** Default names for every speaker id in the turns. */
export function defaultNames(turns: Turn[]): Record<string, string> {
  const names: Record<string, string> = {};
  turns.forEach((t) => {
    if (names[t.speaker]) return;
    names[t.speaker] = t.speaker === YOU ? 'You' : `Person ${t.speaker.slice(1)}`;
  });
  return names;
}

/** Renames a speaker for the whole meeting. */
export function renameSpeaker(m: Meeting, id: string, name: string): Meeting {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
  return { ...m, names: { ...m.names, [id]: clean || (id === YOU ? 'You' : `Person ${id.slice(1)}`) } };
}

/** Marks a speaker as you for the whole meeting (whoever was "You" before becomes a new Person). */
export function setAsYou(m: Meeting, id: string): Meeting {
  if (id === YOU) return m;
  const had = m.turns.some((t) => t.speaker === YOU);
  const freed = newPersonId(m);
  const swap = (s: string) => (s === id ? YOU : s === YOU ? freed : s);
  const names: Record<string, string> = {};
  Object.entries(m.names).forEach(([k, v]) => {
    if (k !== id && k !== YOU) names[k] = v;
  });
  names[YOU] = 'You';
  if (had) names[freed] = `Person ${freed.slice(1)}`;
  return { ...m, turns: mergeTurns(m.turns.map((t) => ({ ...t, speaker: swap(t.speaker) }))), names };
}

/** Changes who said one turn (the one-tap fix when the voice match was wrong). */
export function setTurnSpeaker(m: Meeting, index: number, id: string): Meeting {
  const turns = m.turns.map((t, i) => (i === index ? { ...t, speaker: id } : t));
  const names = { ...m.names };
  if (!names[id]) names[id] = id === YOU ? 'You' : `Person ${id.slice(1)}`;
  return { ...m, turns, names };
}

/** The next unused Person id. */
export function newPersonId(m: Meeting): string {
  const used = new Set([...m.turns.map((t) => t.speaker), ...Object.keys(m.names)]);
  let n = 1;
  while (used.has(`p${n}`)) n++;
  return `p${n}`;
}

// ---------- transcript paste (fallback) ----------

const TIME = /^\[?\(?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\)?\]?\s*/;

/**
 * Reads a pasted Zoom / Teams / Meet transcript: "Name: text" lines, WebVTT voice tags
 * (<v Name>text</v>) or "Name  0:12" header lines followed by text. Speakers become p1, p2, …
 * with their names kept; the person called `myName` (if given) becomes You.
 */
export function parseTranscript(raw: string, myName = ''): Meeting {
  const lines = raw.replace(/\r/g, '').split('\n').map((l) => l.trim());
  const rows: { name: string; text: string }[] = [];
  let pending: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line || line === 'WEBVTT' || /^\d+$/.test(line) || /-->/.test(line)) continue;
    const vtt = line.match(/^<v\s+([^>]+)>(.*?)(?:<\/v>)?$/i);
    if (vtt) {
      rows.push({ name: vtt[1].trim(), text: vtt[2].trim() });
      continue;
    }
    line = line.replace(TIME, '');
    const colon = line.match(/^([A-Za-z][\w .'’-]{0,38}?)\s*:\s+(.+)$/);
    if (colon && countWords(colon[1]) <= 4) {
      rows.push({ name: colon[1].trim(), text: colon[2].trim() });
      pending = null;
      continue;
    }
    // Teams/Meet style: "Meera Rao   0:12" on its own line, then the words.
    const header = lines[i].match(/^([A-Za-z][\w .'’-]{0,38}?)\s+\(?\d{1,2}:\d{2}(?::\d{2})?\)?$/);
    if (header) {
      pending = header[1].trim();
      continue;
    }
    if (pending) rows.push({ name: pending, text: line });
    else if (rows.length) rows[rows.length - 1].text += ` ${line}`;
    else rows.push({ name: 'Person 1', text: line });
  }
  const ids = new Map<string, string>();
  const names: Record<string, string> = {};
  const me = myName.replace(/\s+/g, ' ').trim().toLowerCase();
  // Your full name wins over a shared first name ("Arjun Mehta" speaking before "Arjun Rao": hq#159).
  const fullMatch = !!me && rows.some((r) => r.name.replace(/\s+/g, ' ').trim().toLowerCase() === me);
  const turns: Turn[] = [];
  let t = 0;
  for (const r of rows) {
    if (!r.text) continue;
    const key = r.name.replace(/\s+/g, ' ').trim().toLowerCase();
    let id = ids.get(key);
    if (!id) {
      const named = fullMatch ? key === me : key.split(' ')[0] === me.split(' ')[0];
      const isMe = !!me && named && ![...ids.values()].includes(YOU);
      id = isMe ? YOU : `p${[...ids.values()].filter((x) => x !== YOU).length + 1}`;
      ids.set(key, id);
      names[id] = isMe ? 'You' : r.name;
    }
    // About 150 words a minute gives each turn a rough length for talk share and monologues.
    const dur = Math.max(1, (countWords(r.text) / 150) * 60);
    turns.push({ speaker: id, text: r.text, start: t, end: t + dur });
    t += dur;
  }
  const merged = mergeTurns(turns);
  return { turns: merged, names, durationSec: Math.round(t), source: 'paste' };
}

// ---------- debrief ----------

export interface Moment {
  index: number;
  text: string;
  score: number;
  wordsToPoint: number | null;
  rewrite: string;
}

export interface MeetingDebrief {
  /** Your share of the words spoken, 0–100. */
  talkShare: number;
  yourWords: number;
  yourTurns: number;
  /** Median words before your point, over your turns long enough to have one. */
  wordsToPoint: number | null;
  fillers: number;
  hedges: number;
  apologies: number;
  /** Your longest turn. */
  longestSec: number;
  longestWords: number;
  /** 0–100 average directness of your longer turns. */
  directness: number | null;
  /** Your two weakest moments, with a point-first rewrite. */
  weakest: Moment[];
  /** One plain sentence about the main thing to change. */
  headline: string;
}

/** 91 → "1 min 31 s", 120 → "2 min" (hq#160: rounding to whole minutes said "2 minutes" for 91 s). */
const minSec = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s ? `${m} min ${s} s` : `${m} min`;
};

const median = (xs: number[]) => (xs.length ? quantile([...xs].sort((a, b) => a - b), 0.5) : null);

/** Coaching for your turns only. Other people's words are never scored. */
export function meetingDebrief(m: Meeting): MeetingDebrief {
  const all = m.turns.reduce((a, t) => a + countWords(t.text), 0);
  const mine = m.turns.map((t, index) => ({ t, index })).filter((x) => x.t.speaker === YOU);
  const myText = mine.map((x) => x.t.text).join(' ');
  const yourWords = countWords(myText);
  // One report over all your turns, so fillers and hedges are counted the same way as every drill.
  const txt = analyzeText(mine.map((x) => x.t.text).join('\n'));
  const cat = (c: string) => txt.weakByRule.filter((e) => e.rule.category === c).reduce((a, e) => a + e.count, 0);
  const longer = mine.filter((x) => countWords(x.t.text) >= 8).map((x) => ({ ...x, d: analyzeDirectness(x.t.text) }));
  const toPoint = median(longer.map((x) => x.d.wordsToPoint).filter((x): x is number => x !== null));
  const directness = longer.length ? Math.round(longer.reduce((a, x) => a + x.d.score, 0) / longer.length) : null;
  let longestSec = 0;
  let longestWords = 0;
  mine.forEach(({ t }) => {
    const w = countWords(t.text);
    if (w > longestWords) {
      longestWords = w;
      longestSec = Math.round(t.end - t.start);
    }
  });
  const weakest: Moment[] = [...longer]
    .sort((a, b) => a.d.score - b.d.score || a.index - b.index)
    .filter((x) => x.d.score < 85)
    .slice(0, 2)
    .map((x) => ({ index: x.index, text: x.t.text, score: x.d.score, wordsToPoint: x.d.wordsToPoint, rewrite: pointFirst(x.t.text).text || x.t.text }));
  const talkShare = all ? Math.round((yourWords / all) * 100) : 0;
  const apologies = cat('apology');
  const hedges = cat('hedge');
  let headline: string;
  if (!mine.length) headline = 'No turns are tagged as you yet. Tap a name and choose "This is me".';
  else if (toPoint !== null && toPoint > 15) headline = `You reached your point after about ${Math.round(toPoint)} words. Lead with it next time.`;
  else if (apologies >= 2) headline = `You said sorry ${apologies} times. Thank people instead.`;
  else if (hedges >= 3) headline = `${hedges} hedges made you sound unsure. State it as fact.`;
  else if (yourWords >= 40 && txt.fillerCount / Math.max(1, yourWords) > 0.04) headline = `${txt.fillerCount} fillers. Pause for a beat instead.`;
  else if (longestSec > 90) headline = `Your longest turn ran ${minSec(longestSec)}. Make the point, then stop.`;
  else headline = 'Direct and clear. Keep doing this.';
  return { talkShare, yourWords, yourTurns: mine.length, wordsToPoint: toPoint === null ? null : Math.round(toPoint), fillers: txt.fillerCount, hedges, apologies, longestSec, longestWords, directness, weakest, headline };
}

/** Plain text of the meeting with names, for the saved session ("You: …"). */
export function meetingText(m: Meeting): string {
  return m.turns.map((t) => `${m.names[t.speaker] ?? t.speaker}: ${t.text}`).join('\n');
}

/** Your words only, for the standard score report. */
export function yourText(m: Meeting): string {
  return m.turns.filter((t) => t.speaker === YOU).map((t) => t.text).join(' ');
}

/** Seconds you spoke (for words per minute). */
export function yourSeconds(m: Meeting): number {
  return m.turns.filter((t) => t.speaker === YOU).reduce((a, t) => a + Math.max(0, t.end - t.start), 0);
}
