import { useSyncExternalStore } from 'react';
import type { DrillId } from '../content/catalog';

export type Tab = 'today' | 'practice' | 'speak' | 'accent' | 'progress';
export type Overlay =
  | { kind: 'drill'; id: DrillId; param?: string }
  | { kind: 'lesson'; id: string }
  | { kind: 'session'; id: string }
  | { kind: 'settings' }
  | { kind: 'account' }
  | { kind: 'paywall'; reason?: string }
  | { kind: 'feedback'; type?: 'bug' | 'idea' | 'other' }
  | { kind: 'profile' }
  | { kind: 'whatsnew' }
  | { kind: 'weekly' }
  | { kind: 'coach' }
  | { kind: 'course'; id: string }
  | { kind: 'clesson'; id: string }
  | { kind: 'challenges' }
  | { kind: 'report'; shot?: string }
  | null;

let tab: Tab = 'today';
let overlay: Overlay = null;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

/** Recent screens, for bug reports ("what was the user doing?"). Screen names only, no content. */
export const trail: { t: number; to: string }[] = [];
const crumb = (to: string) => {
  trail.push({ t: Date.now(), to });
  if (trail.length > 20) trail.shift();
};
export const screenName = (o: Overlay, t: Tab = tab): string => (!o ? `tab:${t}` : o.kind === 'drill' ? `drill:${o.id}${o.param ? `:${o.param}` : ''}` : 'id' in o ? `${o.kind}:${o.id}` : o.kind);
export const currentScreen = () => screenName(overlay);

export function go(t: Tab) {
  crumb(`tab:${t}`);
  tab = t;
  overlay = null;
  emit();
  window.scrollTo(0, 0);
}
export function open(o: Overlay) {
  if (o && o.kind !== 'report') crumb(screenName(o));
  overlay = o;
  emit();
}
export const close = () => open(null);

const sub = (l: () => void) => {
  ls.add(l);
  return () => ls.delete(l);
};
export const useTab = () => useSyncExternalStore(sub, () => tab);
export const useOverlay = () => useSyncExternalStore(sub, () => overlay);
