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
  | null;

let tab: Tab = 'today';
let overlay: Overlay = null;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export function go(t: Tab) {
  tab = t;
  overlay = null;
  emit();
  window.scrollTo(0, 0);
}
export function open(o: Overlay) {
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
