// Turns a spoken report into a tidy ticket title on the phone. The server's AI write-up replaces it
// when available; this is what's used offline or if the AI is down.
import { DRILLS, type DrillId } from '../content/catalog';

const TABS: Record<string, string> = { today: 'Today', practice: 'Practice', speak: 'Speak', accent: 'Accent', progress: 'Progress' };
const SCREENS: Record<string, string> = {
  settings: 'Settings', account: 'Account', paywall: 'Paywall', profile: 'Profile', whatsnew: "What's new", weekly: 'Weekly report',
  coach: 'Coach', challenges: 'Challenges', course: 'Course', clesson: 'Course lesson', lesson: 'Lesson', session: 'Session report', feedback: 'Feedback',
};

/** Human name of a screen id like "drill:shadow:td" or "tab:today". */
export function areaName(screen: string | undefined): string {
  if (!screen) return '';
  const [kind, id] = screen.split(':');
  if (kind === 'tab') return TABS[id] ?? '';
  if (kind === 'drill') return DRILLS.find((d) => d.id === (id as DrillId))?.name ?? '';
  return SCREENS[kind] ?? '';
}

const LEAD = /^(?:hey|hi|hello|so|um+|uh+|erm|okay|ok|well|basically|actually|like|yeah|yes|please|alright|right|listen|you know|i mean|i think|i feel like|i noticed that|i noticed|i see that|i found that|there is an issue where|there's an issue where|the problem is that|the problem is|issue|bug|problem)\b[\s,:-]*/i;

/** A short, readable title: first sentence, no filler, cut at a word, capitalized. */
export function localTitle(text: string, area = '', max = 60): string {
  let t = text.replace(/\s+/g, ' ').trim();
  t = (t.split(/(?<=[.!?])\s|\n/)[0] ?? t).trim();
  for (let i = 0; i < 6; i++) {
    const n = t.replace(LEAD, '');
    if (n === t) break;
    t = n;
  }
  t = t.replace(/[\s.,;:!?-]+$/, '');
  const room = area ? max - area.length - 2 : max;
  if (t.length > room) {
    const cut = t.slice(0, room + 1);
    const sp = cut.lastIndexOf(' ');
    t = `${(sp > room * 0.5 ? cut.slice(0, sp) : cut.slice(0, room)).replace(/[\s,;:-]+$/, '')}…`;
  }
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!t) t = 'Report from the app';
  return area ? `${area}: ${t}` : t;
}
