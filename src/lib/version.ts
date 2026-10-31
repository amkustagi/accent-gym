/** Semantic Versioning helpers. Speakco switched from "0.16" to "0.16.0" on 2026-10-30. */

/** "0.16" (old format) -> "0.16.0"; "0.16.1" stays; anything else is returned unchanged. */
export function normalizeVersion(v: string): string {
  const m = /^v?(\d+)\.(\d+)$/.exec(v.trim());
  return m ? `${Number(m[1])}.${Number(m[2])}.0` : v.trim().replace(/^v/, '');
}

/** True when the user already saw this version's "What's new" (old and new formats compare equal). */
export function sameVersion(a: string, b: string): boolean {
  return normalizeVersion(a) === normalizeVersion(b);
}
