import type { Skill } from '../engine/score';

export type DrillId = 'swaps' | 'structure' | 'concision' | 'pace' | 'pauses' | 'variety' | 'warmup' | 'clarity' | 'pronunciation' | 'simulator' | 'pressure' | 'roleplay' | 'accentcheck' | 'shadow' | 'course' | 'camera' | 'sayitfirst';
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
  /** Needs Pro (or the owner build with payments not connected). */
  pro?: boolean;
  /** Not listed on the Practice screen (reached another way). */
  hidden?: boolean;
}

export type IconName = 'swap' | 'blocks' | 'scissors' | 'metronome' | 'pause' | 'wave' | 'flame' | 'sparkle' | 'mouth' | 'mic' | 'bolt' | 'chat' | 'globe' | 'book' | 'user';

export const AREAS: { id: Area; name: string; question: string }[] = [
  { id: 'content', name: 'Content', question: 'What you say' },
  { id: 'voice', name: 'Voice', question: 'How it sounds' },
  { id: 'articulation', name: 'Articulation', question: 'How clearly you\'re understood' },
  { id: 'presence', name: 'Presence', question: 'How you hold up under pressure' },
];

export const DRILLS: DrillInfo[] = [
  { id: 'swaps', name: 'Word swaps', area: 'content', skill: 'language', blurb: 'Trade weak phrases for strong ones, then say them.', minutes: 3, icon: 'swap' },
  { id: 'structure', name: 'Structure', area: 'content', skill: 'language', blurb: 'Answer with BLUF, PREP or STAR.', minutes: 3, icon: 'blocks' },
  { id: 'sayitfirst', name: 'Say it first', area: 'content', skill: 'language', blurb: 'Paste what you need to say. Get it point-first, then say it twice.', minutes: 2, icon: 'scissors' },
  { id: 'concision', name: 'Say it short', area: 'content', skill: 'language', blurb: 'Make your point inside a word budget.', minutes: 2, icon: 'scissors' },
  { id: 'pace', name: 'Pace trainer', area: 'voice', skill: 'pace', blurb: 'Read along with a guide at 130–160 words/min.', minutes: 2, icon: 'metronome' },
  { id: 'pauses', name: 'Pause power', area: 'voice', skill: 'pauses', blurb: 'Hold a real pause at every marker.', minutes: 2, icon: 'pause' },
  { id: 'variety', name: 'Vocal variety', area: 'voice', skill: 'variety', blurb: 'Flat vs. lively: see your pitch move.', minutes: 2, icon: 'wave' },
  { id: 'warmup', name: 'Warm-up', area: 'articulation', skill: 'clarity', blurb: 'Two guided minutes before any meeting.', minutes: 2, icon: 'flame' },
  { id: 'clarity', name: 'Tongue twisters', area: 'articulation', skill: 'clarity', blurb: 'Scored on how clearly you\'re understood.', minutes: 2, icon: 'sparkle' },
  { id: 'accentcheck', name: 'Accent check', area: 'articulation', skill: 'clarity', blurb: 'Find the sounds to fix for your target accent.', minutes: 2, icon: 'globe' },
  { id: 'pronunciation', name: 'Sound lessons', area: 'articulation', skill: 'clarity', blurb: 'American, British, Australian or Canadian sounds.', minutes: 4, icon: 'mouth', optional: true },
  { id: 'shadow', name: 'Shadowing', area: 'articulation', skill: 'variety', blurb: 'Repeat a native speaker and match their melody.', minutes: 3, icon: 'wave' },
  { id: 'simulator', name: 'Meeting simulator', area: 'presence', skill: 'language', blurb: 'Endless scenarios from your own job, with a full voice report.', minutes: 2, icon: 'mic' },
  { id: 'pressure', name: 'Pressure round', area: 'presence', skill: 'language', blurb: 'Random question, 10 seconds to prepare.', minutes: 2, icon: 'bolt' },
  { id: 'camera', name: 'Video presence', area: 'presence', skill: 'language', blurb: 'Talk to the camera: eye contact, framing, light and steadiness.', minutes: 2, icon: 'user' },
  { id: 'course', name: 'Course lesson', area: 'presence', skill: 'language', blurb: 'A lesson from a course, practiced out loud.', minutes: 3, icon: 'book', hidden: true },
  { id: 'roleplay', name: 'Conversation', area: 'presence', skill: 'language', blurb: 'Back-and-forth: they ask follow-ups out loud that react to your answer.', minutes: 4, icon: 'chat' },
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
