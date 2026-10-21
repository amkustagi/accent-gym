import type { Skill } from '../engine/score';

export type DrillId = 'swaps' | 'structure' | 'concision' | 'pace' | 'pauses' | 'variety' | 'warmup' | 'clarity' | 'pronunciation' | 'simulator' | 'pressure';
export type Area = 'content' | 'voice' | 'articulation' | 'presence';

export interface DrillInfo {
  id: DrillId;
  name: string;
  area: Area;
  skill: Skill;
  blurb: string;
  minutes: number;
  icon: IconName;
  optional?: boolean;
}

export type IconName = 'swap' | 'blocks' | 'scissors' | 'metronome' | 'pause' | 'wave' | 'flame' | 'sparkle' | 'mouth' | 'mic' | 'bolt';

export const AREAS: { id: Area; name: string; question: string }[] = [
  { id: 'content', name: 'Content', question: 'What you say' },
  { id: 'voice', name: 'Voice', question: 'How it sounds' },
  { id: 'articulation', name: 'Articulation', question: 'How clearly you\'re understood' },
  { id: 'presence', name: 'Presence', question: 'How you hold up under pressure' },
];

export const DRILLS: DrillInfo[] = [
  { id: 'swaps', name: 'Word swaps', area: 'content', skill: 'language', blurb: 'Trade weak phrases for strong ones, then say them.', minutes: 3, icon: 'swap' },
  { id: 'structure', name: 'Structure', area: 'content', skill: 'language', blurb: 'Answer with BLUF, PREP or STAR.', minutes: 3, icon: 'blocks' },
  { id: 'concision', name: 'Say it short', area: 'content', skill: 'language', blurb: 'Make your point inside a word budget.', minutes: 2, icon: 'scissors' },
  { id: 'pace', name: 'Pace trainer', area: 'voice', skill: 'pace', blurb: 'Read along with a guide at 130–160 words/min.', minutes: 2, icon: 'metronome' },
  { id: 'pauses', name: 'Pause power', area: 'voice', skill: 'pauses', blurb: 'Hold a real pause at every marker.', minutes: 2, icon: 'pause' },
  { id: 'variety', name: 'Vocal variety', area: 'voice', skill: 'variety', blurb: 'Flat vs. lively: see your pitch move.', minutes: 2, icon: 'wave' },
  { id: 'warmup', name: 'Warm-up', area: 'articulation', skill: 'clarity', blurb: 'Two guided minutes before any meeting.', minutes: 2, icon: 'flame' },
  { id: 'clarity', name: 'Tongue twisters', area: 'articulation', skill: 'clarity', blurb: 'Scored on how clearly you\'re understood.', minutes: 2, icon: 'sparkle' },
  { id: 'pronunciation', name: 'Pronunciation', area: 'articulation', skill: 'clarity', blurb: 'V/W, TH, R, soft T, vowels, stress.', minutes: 4, icon: 'mouth', optional: true },
  { id: 'simulator', name: 'Meeting simulator', area: 'presence', skill: 'language', blurb: '34 real scenarios with a full voice report.', minutes: 2, icon: 'mic' },
  { id: 'pressure', name: 'Pressure round', area: 'presence', skill: 'language', blurb: 'Random question, 10 seconds to prepare.', minutes: 2, icon: 'bolt' },
];

export const drillById = (id: DrillId) => DRILLS.find((d) => d.id === id)!;

/** Drill that best trains each skill, used by the daily plan. */
export const DRILL_FOR_SKILL: Record<Skill, DrillId> = {
  language: 'swaps',
  fillers: 'pauses',
  pace: 'pace',
  pauses: 'pauses',
  variety: 'variety',
  clarity: 'clarity',
};
