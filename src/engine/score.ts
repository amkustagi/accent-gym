// Turns transcript + voice measurements into six skill scores and prioritized coaching tips.
import { analyzeText, type TextReport } from './text';
import type { VoiceSummary } from './voice';

export type Skill = 'fillers' | 'language' | 'pace' | 'pauses' | 'variety' | 'clarity';

export const SKILLS: { id: Skill; name: string; short: string; target: string }[] = [
  { id: 'fillers', name: 'Filler-free', short: 'Fillers', target: 'Under 2 a minute' },
  { id: 'language', name: 'Confident words', short: 'Words', target: 'No hedges or apologies' },
  { id: 'pace', name: 'Pace', short: 'Pace', target: '130–160 words/min' },
  { id: 'pauses', name: 'Pauses', short: 'Pauses', target: 'Short, deliberate pauses' },
  { id: 'variety', name: 'Vocal variety', short: 'Variety', target: '5+ semitone range' },
  { id: 'clarity', name: 'Clarity', short: 'Clarity', target: '90%+ understood' },
];

export type Scores = Partial<Record<Skill, number>>;

export interface Metrics {
  words: number;
  durationSec: number;
  wpm: number | null;
  fillers: number;
  fillersPerMin: number | null;
  weak: number;
  pauses: number | null;
  longPauses: number | null;
  avgPauseSec: number | null;
  pitchRangeSt: number | null;
  uptalkRatio: number | null;
  trailOffDb: number | null;
  clarity: number | null;
}

export interface Tip {
  skill: Skill;
  severity: 'good' | 'fix' | 'focus';
  title: string;
  body: string;
}

export interface Evaluation {
  overall: number;
  scores: Scores;
  metrics: Metrics;
  text: TextReport;
  tips: Tip[];
}

const clamp = (x: number) => Math.round(Math.max(0, Math.min(100, x)));

export const WEIGHTS: Record<Skill, number> = { fillers: 0.2, language: 0.25, pace: 0.18, pauses: 0.15, variety: 0.17, clarity: 0.2 };

export function overallOf(scores: Scores): number {
  let s = 0;
  let w = 0;
  (Object.keys(scores) as Skill[]).forEach((k) => {
    const v = scores[k];
    if (v === undefined) return;
    s += v * WEIGHTS[k];
    w += WEIGHTS[k];
  });
  return w ? clamp(s / w) : 0;
}

export function scorePace(wpm: number): number {
  if (wpm >= 130 && wpm <= 165) return 100;
  if (wpm < 130) return clamp(100 - (130 - wpm) * 1.6);
  return clamp(100 - (wpm - 165) * 1.8);
}

export function scorePauses(goodPauses: number, longPauses: number, speakingSec: number): number {
  const perMin = goodPauses / Math.max(speakingSec / 60, 0.25);
  let s = 100;
  if (perMin < 4) s -= (4 - perMin) * 14;
  if (perMin > 16) s -= (perMin - 16) * 5;
  s -= longPauses * 12;
  return clamp(s);
}

export function scoreVariety(rangeSt: number): number {
  return clamp(25 + rangeSt * 12.5);
}

export interface EvaluateInput {
  transcript: string;
  durationSec: number;
  voice?: VoiceSummary | null;
  /** 0–100 match against a script, for reading drills. */
  clarity?: number | null;
  /** Skip language/filler scoring (e.g. when reading a fixed script). */
  scripted?: boolean;
}

export function evaluate({ transcript, durationSec, voice, clarity, scripted }: EvaluateInput): Evaluation {
  const text = analyzeText(transcript);
  const speakingSec = voice?.hadSpeech ? voice.speakingSec : durationSec;
  const minutes = Math.max(speakingSec / 60, 0.1);
  const hasWords = text.words >= 8;
  const wpm = hasWords ? Math.round(text.words / Math.max(speakingSec, 3) * 60) : null;
  const fillersPerMin = hasWords ? Math.round((text.fillerCount / minutes) * 10) / 10 : null;

  const scores: Scores = {};
  if (hasWords && !scripted) {
    scores.fillers = clamp(100 - (fillersPerMin ?? 0) * 11);
    scores.language = clamp(100 - (text.weakCount / Math.max(minutes, 0.5)) * 16);
  }
  if (wpm !== null) scores.pace = scorePace(wpm);
  if (voice?.hadSpeech && speakingSec >= 6) scores.pauses = scorePauses(voice.goodPauses, voice.longPauses, speakingSec);
  if (voice?.pitchRangeSt != null) scores.variety = scoreVariety(voice.pitchRangeSt);
  if (clarity != null) scores.clarity = clarity;

  const metrics: Metrics = {
    words: text.words,
    durationSec: Math.round(durationSec),
    wpm,
    fillers: text.fillerCount,
    fillersPerMin,
    weak: text.weakCount,
    pauses: voice?.hadSpeech ? voice.goodPauses : null,
    longPauses: voice?.hadSpeech ? voice.longPauses : null,
    avgPauseSec: voice?.hadSpeech ? voice.avgPauseSec : null,
    pitchRangeSt: voice?.pitchRangeSt ?? null,
    uptalkRatio: voice?.uptalkRatio ?? null,
    trailOffDb: voice?.trailOffDb ?? null,
    clarity: clarity ?? null,
  };

  return { overall: overallOf(scores), scores, metrics, text, tips: buildTips(scores, metrics, text) };
}

function buildTips(scores: Scores, m: Metrics, text: TextReport): Tip[] {
  const tips: Tip[] = [];
  const top = text.weakByRule.slice(0, 3);
  top.forEach(({ rule, count }) =>
    tips.push({ skill: 'language', severity: 'fix', title: `"${rule.label}" ×${count}`, body: rule.fix }),
  );
  if (m.fillers > 0 && scores.fillers !== undefined && scores.fillers < 90)
    tips.push({
      skill: 'fillers',
      severity: 'fix',
      title: `${m.fillers} filler${m.fillers > 1 ? 's' : ''}: ${text.fillerByRule.map((f) => f.rule.label).join(', ')}`,
      body: 'When you feel a filler coming, close your mouth and pause for one beat. Silence sounds confident.',
    });
  if (m.wpm !== null && scores.pace !== undefined && scores.pace < 85)
    tips.push(
      m.wpm > 165
        ? { skill: 'pace', severity: 'fix', title: `Fast: ${m.wpm} words/min`, body: 'Slow to 130–160. Speed reads as nerves; a slower pace reads as authority.' }
        : { skill: 'pace', severity: 'fix', title: `Slow: ${m.wpm} words/min`, body: 'Pick up to 130–160. Plan your first sentence before you start so you don\'t search for words.' },
    );
  if (m.longPauses)
    tips.push({ skill: 'pauses', severity: 'fix', title: `${m.longPauses} long hesitation${m.longPauses > 1 ? 's' : ''}`, body: 'Gaps over 2.5 seconds read as lost. Use a frame like Point, Reason, Example so you always know what comes next.' });
  else if (scores.pauses !== undefined && scores.pauses < 75)
    tips.push({ skill: 'pauses', severity: 'fix', title: 'Few pauses', body: 'Pause for about one second after each key point. It lets the point land and gives you time to think.' });
  if (m.pitchRangeSt !== null && m.pitchRangeSt < 4.5)
    tips.push({ skill: 'variety', severity: 'fix', title: 'Flat voice', body: `Your pitch moved ${m.pitchRangeSt} semitones. Lift the key word in each sentence and drop your pitch at the end of statements.` });
  if (m.uptalkRatio !== null && m.uptalkRatio >= 0.4)
    tips.push({ skill: 'variety', severity: 'fix', title: 'Statements sound like questions', body: 'Your pitch rose at the end of many phrases. End statements by dropping your pitch.' });
  if (m.trailOffDb !== null && m.trailOffDb <= -6)
    tips.push({ skill: 'variety', severity: 'fix', title: 'Volume trails off', body: 'You got quieter toward the end. Keep your energy through the final sentence; it\'s the one people remember.' });
  if (m.clarity !== null && m.clarity < 85)
    tips.push({ skill: 'clarity', severity: 'fix', title: `${m.clarity}% understood`, body: 'Slow down and finish every consonant, especially word endings.' });

  // Strengths, so the report isn't only criticism.
  (Object.keys(scores) as Skill[])
    .filter((k) => (scores[k] ?? 0) >= 90)
    .slice(0, 2)
    .forEach((k) => {
      const s = SKILLS.find((x) => x.id === k)!;
      tips.push({ skill: k, severity: 'good', title: `Strong: ${s.name}`, body: 'Keep doing exactly this.' });
    });
  return tips;
}

/** The skill most worth practicing next, from recent per-skill averages. */
export function weakestSkill(avgs: Scores, includeClarity: boolean): Skill {
  const order: Skill[] = ['language', 'fillers', 'pace', 'pauses', 'variety', ...(includeClarity ? (['clarity'] as Skill[]) : [])];
  let best: Skill = 'language';
  let low = Infinity;
  order.forEach((k) => {
    const v = avgs[k];
    if (v !== undefined && v < low) {
      low = v;
      best = k;
    }
  });
  return best;
}
