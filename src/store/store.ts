// App state: persisted to IndexedDB, exposed to React through useSyncExternalStore.
import { del, get, set, keys } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import type { ListeningMode } from '../engine/capture';
import type { Metrics, Scores, Skill, Tip } from '../engine/score';
import { DRILL_FOR_SKILL, type DrillId } from '../content/catalog';
import { SOUNDS } from '../content/drills';

export type Goal = 'meetings' | 'interviews' | 'presenting' | 'everyday';

export interface Profile {
  name: string;
  goal: Goal;
  pronunciation: boolean;
  minutes: 5 | 10 | 15;
  onboarded: boolean;
  createdAt: number;
}

export interface Settings {
  voice: string;
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
  overall: number;
  scores: Scores;
  metrics: Metrics;
  transcript: string;
  durationSec: number;
  hasAudio: boolean;
  /** Compact voice trace for the report chart: [t, db, semitone|null][] at 0.1 s steps. */
  trace?: [number, number, number | null][];
  pauses?: { start: number; dur: number }[];
  tips?: Tip[];
  /** Extra drill-specific numbers shown on the report. */
  extra?: Record<string, number | string>;
}

export interface State {
  loaded: boolean;
  profile: Profile;
  settings: Settings;
  xp: number;
  /** date → drill → count */
  days: Record<string, Partial<Record<DrillId | 'lesson', number>>>;
  sessions: SessionRecord[];
  best: Record<string, number>;
  lessonsDone: string[];
  version: number;
}

const DEFAULT: State = {
  loaded: false,
  profile: { name: '', goal: 'meetings', pronunciation: false, minutes: 10, onboarded: false, createdAt: 0 },
  settings: { voice: '', listening: 'full', aiKey: '', reminderTime: '08:30', keepRecordings: true },
  xp: 0,
  days: {},
  sessions: [],
  best: {},
  lessonsDone: [],
  version: 1,
};

let state: State = DEFAULT;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let saveTimer: number | undefined;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const { loaded: _loaded, ...rest } = state;
    void _loaded;
    set('state', rest).catch(() => undefined);
  }, 150);
}

export function setState(fn: (s: State) => State) {
  state = fn(state);
  emit();
  persist();
}

export async function loadState(): Promise<void> {
  try {
    const saved = (await get('state')) as Partial<State> | undefined;
    state = {
      ...DEFAULT,
      ...saved,
      profile: { ...DEFAULT.profile, ...saved?.profile },
      settings: { ...DEFAULT.settings, ...saved?.settings },
      loaded: true,
    };
  } catch {
    state = { ...DEFAULT, loaded: true };
  }
  emit();
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
  // Each level needs 50 more XP than the last: 100, 150, 200, …
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

export const LEVEL_NAMES = ['Starter', 'Speaker', 'Clear', 'Composed', 'Confident', 'Persuasive', 'Commanding', 'Leader', 'Orator'];
export const levelName = (lvl: number) => LEVEL_NAMES[Math.min(lvl, LEVEL_NAMES.length) - 1];

// ---------- actions ----------

export function logActivity(drill: DrillId | 'lesson', xp: number) {
  setState((s) => {
    const k = todayKey();
    const day = { ...(s.days[k] ?? {}) };
    day[drill] = (day[drill] ?? 0) + 1;
    return { ...s, xp: s.xp + xp, days: { ...s.days, [k]: day } };
  });
}

export function setBest(key: string, value: number): boolean {
  const prev = state.best[key];
  if (prev !== undefined && prev >= value) return false;
  setState((s) => ({ ...s, best: { ...s.best, [key]: value } }));
  return true;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function saveSession(rec: Omit<SessionRecord, 'id' | 't' | 'hasAudio'>, audio: Blob | null, xp: number): Promise<SessionRecord> {
  const keep = state.settings.keepRecordings && !!audio;
  const full: SessionRecord = { ...rec, id: uid(), t: Date.now(), hasAudio: keep };
  if (keep && audio) await set(`rec:${full.id}`, audio).catch(() => undefined);
  setState((s) => ({ ...s, sessions: [...s.sessions, full].slice(-300) }));
  if (rec.drill !== 'baseline') logActivity(rec.drill, xp);
  else logActivity('simulator', xp);
  void pruneRecordings();
  return full;
}

/** Keep audio for the 40 most recent sessions. */
async function pruneRecordings() {
  const withAudio = state.sessions.filter((x) => x.hasAudio);
  const drop = withAudio.slice(0, Math.max(0, withAudio.length - 40));
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

export function exportData(): string {
  const { loaded: _l, ...rest } = state;
  void _l;
  return JSON.stringify({ app: 'speak-sharp', exportedAt: new Date().toISOString(), ...rest, settings: { ...rest.settings, aiKey: '' } }, null, 2);
}

export function importData(json: string): boolean {
  try {
    const d = JSON.parse(json);
    if (d.app !== 'speak-sharp' || !Array.isArray(d.sessions)) return false;
    setState((s) => ({
      ...s,
      profile: { ...s.profile, ...d.profile },
      settings: { ...s.settings, ...d.settings, aiKey: s.settings.aiKey },
      xp: d.xp ?? s.xp,
      days: d.days ?? s.days,
      sessions: (d.sessions as SessionRecord[]).map((x) => ({ ...x, hasAudio: false })),
      best: d.best ?? s.best,
      lessonsDone: d.lessonsDone ?? s.lessonsDone,
    }));
    return true;
  } catch {
    return false;
  }
}

export async function resetAll() {
  const ks = await keys().catch(() => [] as IDBValidKey[]);
  await Promise.all(ks.map((k) => del(k).catch(() => undefined)));
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

export interface PlanItem {
  drill: DrillId;
  reason: string;
  target: number;
  done: number;
  param?: string;
}

/** Today's plan: warm-up, the weakest skill, word swaps, a simulator round; more items for longer sessions. */
export function todayPlan(s: State): PlanItem[] {
  const avgs = skillAverages(s);
  const order = (['language', 'fillers', 'pace', 'pauses', 'variety', ...(s.profile.pronunciation ? ['clarity'] : [])] as Skill[])
    .filter((k) => avgs[k] !== undefined)
    .sort((a, b) => avgs[a]! - avgs[b]!);
  const weakest = order[0];
  const today = s.days[todayKey()] ?? {};
  const items: { drill: DrillId; reason: string; target?: number; param?: string }[] = [{ drill: 'warmup', reason: 'Wake up your voice' }];
  const focus = weakest ? DRILL_FOR_SKILL[weakest] : 'pace';
  items.push({ drill: focus, reason: weakest ? `Your lowest skill lately` : 'Find your speaking pace' });
  if (focus !== 'swaps') items.push({ drill: 'swaps', reason: 'Build confident wording' });
  if (s.profile.pronunciation && s.profile.minutes >= 10) {
    const sound = SOUNDS[Math.floor(Date.now() / 864e5) % SOUNDS.length];
    items.push({ drill: 'pronunciation', reason: `Sound of the day: ${sound.name}`, param: sound.id });
  }
  if (s.profile.minutes >= 15) {
    const second = order[1] ? DRILL_FOR_SKILL[order[1]] : 'variety';
    if (!items.some((i) => i.drill === second)) items.push({ drill: second, reason: 'Second focus skill' });
  }
  items.push({ drill: 'simulator', reason: 'Put it together under real conditions' });
  const max = s.profile.minutes === 5 ? 3 : s.profile.minutes === 10 ? 4 : 6;
  const trimmed = items.length > max ? [...items.slice(0, max - 1), items[items.length - 1]] : items;
  return trimmed.map((i) => ({ drill: i.drill, reason: i.reason, target: i.target ?? 1, done: today[i.drill] ?? 0, param: i.param }));
}
