// Meeting mode silence (tinyhustlers/hq#105): while a real meeting is being recorded the app makes
// no sound at all: no coach voice, no playback, no toasts. Kept free of imports so anything can check it.
let quiet = false;
const ls = new Set<(on: boolean) => void>();

export function setMeetingQuiet(on: boolean): void {
  quiet = on;
  ls.forEach((l) => l(on));
}

export const meetingQuiet = (): boolean => quiet;

export function onMeetingQuiet(l: (on: boolean) => void): () => void {
  ls.add(l);
  return () => ls.delete(l);
}
