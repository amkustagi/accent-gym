// App state: persisted to IndexedDB, exposed to React through useSyncExternalStore.
import type { CoachId } from '../content/coaches';
import { del, get, set, keys } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import type { ListeningMode } from '../engine/capture';
import type { VoiceEngine } from '../engine/tts';
import type { Metrics, Scores, Skill, Tip } from '../engine/score';
import type { DrillId } from '../content/catalog';
import type { AccentGoal, FeatureId } from '../content/accents';

export type Goal = 'meetings' | 'interviews' | 'presenting' | 'everyday';
export type Plan = 'free' | 'pro_monthly' | 'pro_lifetime';

export interface Profile {
  name: string;
  goal: Goal;
  pronunciation: boolean;
  minutes: 5 | 10 | 15;
  onboarded: boolean;
  createdAt: number;
  /** Role pack id from content/roles, or 'custom'. */
  role: string;
  customRole: string;
  industry: string;
  seniority: 'early' | 'mid' | 'senior' | 'lead';
  situations: string[];
  challenges: string[];
  nativeLanguage: string;
  consentAnalytics: boolean;
  /** Accent the user wants to sound like, or 'none' to keep their own. */
  accentGoal: AccentGoal;
  /** Starting point id from content/accents STARTING. */
  accentFrom: string;
}

export interface Settings {
  voiceEngine: VoiceEngine;
  naturalVoice: string;
  systemVoice: string;
  listening: ListeningMode;
  aiKey: string;
  reminderTime: string;
  keepRecordings: boolean;
  /** Show my first name and weekly XP on the leaderboard (needs an account). */
  leaderboard: boolean;
  /** Owner testing: own Microsoft Azure Speech key and region for precise accent scoring. */
  azureKey: string;
  azureRegion: string;
  /** Which Tiny Hustler coach gives feedback. */
  coach: CoachId;
  /** The coach reads feedback out loud after each take. */
  coachSpeaks: boolean;
}

export interface SessionRecord {
  id: string;
  t: number;
  drill: DrillId | 'baseline';
  title: string;
  /** Content item this round used (scenario id, generated seed, card key). */
  itemId?: string;
  /** Scenario category, for learning which situations the user practices. */
  category?: string;
  overall: number;
  scores: Scores;
  metrics: Metrics;
  transcript: string;
  /** Transcript as corrected by the user, if they fixed recognition errors. */
  correctedFrom?: string;
  durationSec: number;
  hasAudio: boolean;
  /** Compact voice trace for the report chart: [t, db, semitone|null][] at 0.1 s steps. */
  trace?: [number, number, number | null][];
  pauses?: { start: number; dur: number }[];
  tips?: Tip[];
  /** Extra drill-specific numbers shown on the report. */
  extra?: Record<string, number | string>;
  /** User's rating of how useful this report was (1–5). */
  rating?: number;
}

export interface AdaptState {
  /** Difficulty 1 (easiest) … 5 (hardest). */
  level: number;
  recent: number[];
}

export interface CardState {
  box: number;
  due: number;
  seen: number;
  right: number;
}

export type FeedbackKind = 'report_rating' | 'tip' | 'content' | 'difficulty' | 'transcript_fix' | 'checkin' | 'bug' | 'idea' | 'other';

export interface FeedbackItem {
  id: string;
  t: number;
  kind: FeedbackKind;
  /** What it is about: session id, scenario id, tip title, screen… */
  target?: string;
  rating?: number;
  tags?: string[];
  text?: string;
  meta?: Record<string, unknown>;
  synced?: boolean;
}

export interface Account {
  userId: string;
  email: string;
  plan: Plan;
  planStatus: string;
  periodEnd: number | null;
  syncedAt: number;
}

export interface SoundScore {
  t: number;
  score: number;
  src: 'free' | 'pro';
}

export interface AccentCheckRecord {
  t: number;
  target: string;
  src: 'free' | 'pro';
  overall: number;
  scores: Partial<Record<FeatureId, number>>;
  fluency?: number;
  prosody?: number | null;
}

/** Something the coach learned about the user's world: a project, a person, a product. */
export interface Term {
  text: string;
  kind: 'project' | 'person' | 'term';
  /** Number of separate rounds it was heard in (told terms start at 2). */
  n: number;
  last: number;
  src: 'heard' | 'told';
  /** The user removed it; never use or re-learn it. */
  hidden?: boolean;
}

export interface DrillUse {
  opened: number;
  finished: number;
  last: number;
}

/** What the coach learns over time, quietly, from use. Everything stays on the device. */
export interface Learner {
  terms: Term[];
  /** Who they speak to most (answer ids from the coach questions). */
  audience: string[];
  /** Moments they find hardest (answer ids). */
  hardest: string[];
  /** An important meeting coming up, if they mentioned one. */
  upcoming: { text: string; t: number } | null;
  answered: Record<string, number>;
  skipped: Record<string, number>;
  lastAsked: number;
  drills: Partial<Record<DrillId | 'lesson', DrillUse>>;
  /** The skill the coach is focusing on this stretch, with the score it started from. */
  focus: { skill: Skill; since: number; start: number } | null;
  /** Time of the newest session already mined for terms. */
  minedAt: number;
}

export const DEFAULT_LEARNER: Learner = { terms: [], audience: [], hardest: [], upcoming: null, answered: {}, skipped: {}, lastAsked: 0, drills: {}, focus: null, minedAt: 0 };

export interface State {
  loaded: boolean;
  profile: Profile;
  settings: Settings;
  xp: number;
  /** date → activity → count */
  days: Record<string, Record<string, number>>;
  sessions: SessionRecord[];
  best: Record<string, number>;
  lessonsDone: string[];
  adapt: Partial<Record<DrillId, AdaptState>>;
  srs: Record<string, CardState>;
  /** Content id → last time shown. */
  seen: Record<string, number>;
  votes: Record<string, 1 | -1>;
  feedback: FeedbackItem[];
  errors: { t: number; msg: string }[];
  counters: Record<string, number>;
  lastCheckin: number;
  lastSeenVersion: string;
  account: Account | null;
  /** Score history per sound. */
  sounds: Partial<Record<FeatureId, SoundScore[]>>;
  accentChecks: AccentCheckRecord[];
  learner: Learner;
  /** XP earned per day (for weekly totals and the leaderboard). */
  xpByDay: Record<string, number>;
  /** Week key → challenge ids already completed and rewarded. */
  challenges: Record<string, string[]>;
  updatedAt: number;
  version: number;
}

export const DEFAULT_PROFILE: Profile = {
  name: '', goal: 'meetings', pronunciation: false, minutes: 10, onboarded: false, createdAt: 0,
  role: 'general', customRole: '', industry: '', seniority: 'mid', situations: [], challenges: [], nativeLanguage: '', consentAnalytics: true,
  accentGoal: 'none', accentFrom: '',
};

const DEFAULT: State = {
  loaded: false,
  profile: DEFAULT_PROFILE,
  settings: { voiceEngine: 'natural', naturalVoice: 'af_heart', systemVoice: '', listening: 'full', aiKey: '', reminderTime: '08:30', keepRecordings: true, leaderboard: false, azureKey: '', azureRegion: '', coach: 'hustle', coachSpeaks: true },
  xp: 0,
  days: {},
  sessions: [],
  best: {},
  lessonsDone: [],
  adapt: {},
  srs: {},
  seen: {},
  votes: {},
  feedback: [],
  errors: [],
  counters: {},
  lastCheckin: 0,
  lastSeenVersion: '',
  account: null,
  sounds: {},
  accentChecks: [],
  learner: DEFAULT_LEARNER,
  xpByDay: {},
  challenges: {},
  updatedAt: 0,
  version: 5,
};

let state: State = DEFAULT;
const listeners = new Set<() => void>();
const changeHooks = new Set<(s: State) => void>();
const emit = () => listeners.forEach((l) => l());
let saveTimer: number | undefined;

const snapshot = () => {
  const { loaded: _loaded, ...rest } = state;
  void _loaded;
  return rest;
};

function persist(now = false) {
  clearTimeout(saveTimer);
  const write = () => void set('state', snapshot()).catch(() => undefined);
  if (now) write();
  else saveTimer = window.setTimeout(write, 120);
}

if (typeof window !== 'undefined') {
  // Save immediately when the app is hidden, so a result is never lost if the app closes.
  const flush = () => state.loaded && persist(true);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('pagehide', flush);
}

export function setState(fn: (s: State) => State) {
  state = { ...fn(state), updatedAt: Date.now() };
  emit();
  persist();
  changeHooks.forEach((h) => h(state));
}

/** Subscribe to every state change (used by cloud sync). */
export function onChange(h: (s: State) => void) {
  changeHooks.add(h);
  return () => void changeHooks.delete(h);
}

/** Upgrades data saved by older versions. */
export function migrate(saved: Record<string, unknown> | undefined): State {
  const s = (saved ?? {}) as Partial<State> & { settings?: Partial<Settings> & { voice?: string } };
  const settings = { ...DEFAULT.settings, ...s.settings };
  if (s.settings?.voice && !s.settings.systemVoice) settings.systemVoice = s.settings.voice;
  delete (settings as { voice?: string }).voice;
  return {
    ...DEFAULT,
    ...s,
    profile: {
      ...DEFAULT_PROFILE,
      ...s.profile,
      // v0.02 had a pronunciation on/off switch (American sounds); carry it over as the accent goal.
      accentGoal: s.profile?.accentGoal ?? (s.profile?.pronunciation ? 'us' : 'none'),
    },
    settings,
    adapt: s.adapt ?? {},
    srs: s.srs ?? {},
    seen: s.seen ?? {},
    votes: s.votes ?? {},
    feedback: s.feedback ?? [],
    errors: s.errors ?? [],
    counters: s.counters ?? {},
    account: s.account ?? null,
    sounds: s.sounds ?? {},
    accentChecks: s.accentChecks ?? [],
    learner: { ...DEFAULT_LEARNER, ...s.learner },
    xpByDay: s.xpByDay ?? {},
    challenges: s.challenges ?? {},
    version: 5,
    loaded: true,
  } as State;
}

export async function loadState(): Promise<void> {
  try {
    state = migrate((await get('state')) as Record<string, unknown> | undefined);
  } catch {
    state = { ...DEFAULT, loaded: true };
  }
  emit();
}

export function replaceState(next: State) {
  state = { ...next, loaded: true };
  emit();
  persist(true);
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
  );
}

export const getState = () => state;

// ---------- dates & streaks ----------

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const todayKey = () => dayKey(Date.now());

const active = (s: State, k: string) => !!s.days[k] && Object.values(s.days[k]).some((n) => (n ?? 0) > 0);

export function streak(s: State): number {
  let n = 0;
  let t = Date.now();
  if (!active(s, dayKey(t))) t -= 864e5;
  while (active(s, dayKey(t))) {
    n++;
    t -= 864e5;
  }
  return n;
}

export function bestStreak(s: State): number {
  const ks = Object.keys(s.days).filter((k) => active(s, k)).sort();
  let best = 0;
  let run = 0;
  let prev = 0;
  ks.forEach((k) => {
    const t = new Date(`${k}T12:00:00`).getTime();
    run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  });
  return best;
}

export const level = (xp: number) => {
  let lvl = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    lvl++;
    need += 50;
  }
  return { lvl, into: rest, need };
};

export const LEVEL_NAMES = ['Starter', 'Speaker', 'Clear', 'Composed', 'Confident', 'Persuasive', 'Commanding', 'Leader', 'Orator', 'Keynote'];
export const levelName = (lvl: number) => LEVEL_NAMES[Math.min(lvl, LEVEL_NAMES.length) - 1];

// ---------- actions ----------

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function logActivity(drill: DrillId | 'lesson', xp: number) {
  setState((s) => {
    const k = todayKey();
    const day = { ...(s.days[k] ?? {}) };
    day[drill] = (day[drill] ?? 0) + 1;
    const use = s.learner.drills[drill] ?? { opened: 0, finished: 0, last: 0 };
    const drills = { ...s.learner.drills, [drill]: { ...use, finished: use.finished + 1, last: Date.now() } };
    return { ...s, xp: s.xp + xp, xpByDay: { ...s.xpByDay, [k]: (s.xpByDay[k] ?? 0) + xp }, days: { ...s.days, [k]: day }, learner: { ...s.learner, drills } };
  });
}

export function count(name: string, by = 1) {
  setState((s) => ({ ...s, counters: { ...s.counters, [name]: (s.counters[name] ?? 0) + by } }));
}

export function setBest(key: string, value: number): boolean {
  const prev = state.best[key];
  if (prev !== undefined && prev >= value) return false;
  setState((s) => ({ ...s, best: { ...s.best, [key]: value } }));
  return true;
}

export function markSeen(id: string) {
  setState((s) => {
    const seen = { ...s.seen, [id]: Date.now() };
    const ids = Object.keys(seen);
    if (ids.length > 1500) ids.sort((a, b) => seen[a] - seen[b]).slice(0, ids.length - 1200).forEach((k) => delete seen[k]);
    return { ...s, seen };
  });
}

export async function saveSession(rec: Omit<SessionRecord, 'id' | 't' | 'hasAudio'>, audio: Blob | null, xp: number): Promise<SessionRecord> {
  const keep = state.settings.keepRecordings && !!audio;
  const full: SessionRecord = { ...rec, id: uid(), t: Date.now(), hasAudio: keep };
  if (keep && audio) await set(`rec:${full.id}`, audio).catch(() => undefined);
  setState((s) => ({ ...s, sessions: [...s.sessions, full].slice(-500) }));
  logActivity(rec.drill === 'baseline' ? 'simulator' : rec.drill, xp);
  if (rec.itemId) markSeen(rec.itemId);
  void pruneRecordings();
  return full;
}

export function updateSession(id: string, patch: Partial<SessionRecord>) {
  setState((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
}

async function pruneRecordings() {
  const withAudio = state.sessions.filter((x) => x.hasAudio);
  const drop = withAudio.slice(0, Math.max(0, withAudio.length - 60));
  if (!drop.length) return;
  await Promise.all(drop.map((x) => del(`rec:${x.id}`).catch(() => undefined)));
  const ids = new Set(drop.map((x) => x.id));
  setState((s) => ({ ...s, sessions: s.sessions.map((x) => (ids.has(x.id) ? { ...x, hasAudio: false } : x)) }));
}

export const loadRecording = (id: string) => get(`rec:${id}`) as Promise<Blob | undefined>;

export function updateLearner(fn: (l: Learner) => Learner) {
  setState((s) => ({ ...s, learner: fn(s.learner) }));
}

/** A drill screen was opened (finishing it is counted by logActivity). */
export function noteDrillOpened(drill: DrillId) {
  updateLearner((l) => {
    const use = l.drills[drill] ?? { opened: 0, finished: 0, last: 0 };
    return { ...l, drills: { ...l.drills, [drill]: { ...use, opened: use.opened + 1 } } };
  });
}

export function updateProfile(p: Partial<Profile>) {
  setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));
}
export function updateSettings(p: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));
}
export function markLesson(id: string) {
  if (state.lessonsDone.includes(id)) return;
  setState((s) => ({ ...s, lessonsDone: [...s.lessonsDone, id] }));
  logActivity('lesson', 5);
}

export function addFeedback(f: Omit<FeedbackItem, 'id' | 't'>): FeedbackItem {
  const item: FeedbackItem = { ...f, id: uid(), t: Date.now() };
  setState((s) => ({ ...s, feedback: [...s.feedback, item].slice(-1000) }));
  return item;
}

export function vote(id: string, v: 1 | -1 | 0) {
  setState((s) => {
    const votes = { ...s.votes };
    if (v === 0) delete votes[id];
    else votes[id] = v;
    return { ...s, votes };
  });
}

export function logError(msg: string) {
  if (!state.loaded) return;
  setState((s) => ({ ...s, errors: [...s.errors, { t: Date.now(), msg: msg.slice(0, 500) }].slice(-50) }));
}

export function setAccount(a: Account | null) {
  setState((s) => ({ ...s, account: a }));
}

export function exportData(): string {
  return JSON.stringify({ app: 'speakco', exportedAt: new Date().toISOString(), ...snapshot(), settings: { ...state.settings, aiKey: '' }, account: null }, null, 2);
}

export function importData(json: string): boolean {
  try {
    const d = JSON.parse(json);
    if ((d.app !== 'speakco' && d.app !== 'speak-sharp') || !Array.isArray(d.sessions)) return false;
    const next = migrate({ ...d, settings: { ...d.settings, aiKey: state.settings.aiKey }, account: state.account });
    replaceState({ ...next, sessions: next.sessions.map((x) => ({ ...x, hasAudio: false })) });
    return true;
  } catch {
    return false;
  }
}

export async function resetAll() {
  const ks = await keys().catch(() => [] as IDBValidKey[]);
  await Promise.all(ks.filter((k) => !String(k).startsWith('tts:')).map((k) => del(k).catch(() => undefined)));
  state = { ...DEFAULT, loaded: true };
  emit();
}

// ---------- insights ----------

export function skillAverages(s: State, last = 8, before?: number): Scores {
  const out: Scores = {};
  const pool = s.sessions.filter((x) => (before === undefined ? true : x.t < before));
  (['fillers', 'language', 'pace', 'pauses', 'variety', 'clarity'] as Skill[]).forEach((k) => {
    const vals = pool.filter((x) => x.scores[k] !== undefined).slice(-last).map((x) => x.scores[k]!);
    if (vals.length) out[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  });
  return out;
}

export const baseline = (s: State) => s.sessions.find((x) => x.drill === 'baseline');

/** Speaking rounds that count toward the free daily limit. */
export const SCORED_DRILLS: (DrillId | 'baseline')[] = ['simulator', 'pressure', 'structure', 'concision', 'roleplay'];
export function scoredToday(s: State): number {
  const k = todayKey();
  return SCORED_DRILLS.reduce((a, d) => a + (s.days[k]?.[d] ?? 0), 0);
}

// ---------- accent ----------

export function recordSounds(scores: Partial<Record<FeatureId, number>>, src: 'free' | 'pro') {
  setState((s) => {
    const sounds = { ...s.sounds };
    (Object.keys(scores) as FeatureId[]).forEach((k) => {
      sounds[k] = [...(sounds[k] ?? []), { t: Date.now(), score: scores[k]!, src }].slice(-30);
    });
    return { ...s, sounds };
  });
}

export function saveAccentCheck(c: Omit<AccentCheckRecord, 't'>) {
  setState((s) => ({ ...s, accentChecks: [...s.accentChecks, { ...c, t: Date.now() }].slice(-50) }));
  recordSounds(c.scores, c.src);
}

/** Current score for a sound: a recent precise score wins; otherwise the average of the last three. */
export function soundScore(s: State, id: FeatureId): { score: number; src: 'free' | 'pro'; first: number } | null {
  const h = s.sounds[id];
  if (!h?.length) return null;
  const recentPro = [...h].reverse().find((x) => x.src === 'pro' && Date.now() - x.t < 14 * 864e5);
  const last = h.slice(-3);
  const score = recentPro ? recentPro.score : Math.round(last.reduce((a, x) => a + x.score, 0) / last.length);
  return { score, src: recentPro ? 'pro' : 'free', first: h[0].score };
}
