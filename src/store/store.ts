// App state: persisted to IndexedDB, exposed to React through useSyncExternalStore.
import { del, get, set, keys } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import type { ListeningMode } from '../engine/capture';
import type { VoiceEngine } from '../engine/tts';
import type { Metrics, Scores, Skill, Tip } from '../engine/score';
import type { DrillId } from '../content/catalog';

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
}

export interface Settings {
  voiceEngine: VoiceEngine;
  naturalVoice: string;
  systemVoice: string;
  listening: ListeningMode;
  aiKey: string;
  reminderTime: string;
  keepRecordings: boolean;
}

export interface SessionRecord {
  id: string;
  t: number;
  drill: DrillId | 'baseline';
  title: string;
  /** Content item this round used (scenario id, generated seed, card key). */
  itemId?: string;
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
  updatedAt: number;
  version: number;
}

export const DEFAULT_PROFILE: Profile = {
  name: '', goal: 'meetings', pronunciation: false, minutes: 10, onboarded: false, createdAt: 0,
  role: 'general', customRole: '', industry: '', seniority: 'mid', situations: [], challenges: [], nativeLanguage: '', consentAnalytics: true,
};

const DEFAULT: State = {
  loaded: false,
  profile: DEFAULT_PROFILE,
  settings: { voiceEngine: 'natural', naturalVoice: 'af_heart', systemVoice: '', listening: 'full', aiKey: '', reminderTime: '08:30', keepRecordings: true },
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
  updatedAt: 0,
  version: 2,
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
    profile: { ...DEFAULT_PROFILE, ...s.profile },
    settings,
    adapt: s.adapt ?? {},
    srs: s.srs ?? {},
    seen: s.seen ?? {},
    votes: s.votes ?? {},
    feedback: s.feedback ?? [],
    errors: s.errors ?? [],
    counters: s.counters ?? {},
    account: s.account ?? null,
    version: 2,
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
    return { ...s, xp: s.xp + xp, days: { ...s.days, [k]: day } };
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
  return JSON.stringify({ app: 'speak-sharp', exportedAt: new Date().toISOString(), ...snapshot(), settings: { ...state.settings, aiKey: '' }, account: null }, null, 2);
}

export function importData(json: string): boolean {
  try {
    const d = JSON.parse(json);
    if (d.app !== 'speak-sharp' || !Array.isArray(d.sessions)) return false;
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
