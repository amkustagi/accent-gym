// Sends problem reports and ideas straight to the issue tracker through the `report` server function.
// One tap: no email, no GitHub page. Reports that can't go out yet stay on the phone and retry.
import { get as idbGet, del as idbDel } from 'idb-keyval';
import { getState, setState, type FeedbackItem } from '../store/store';
import { areaName, localTitle } from './ticket';

const SB = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const REPORT_URL = (import.meta.env.VITE_REPORT_URL as string | undefined) || (SB ? `${SB.replace(/\/$/, '')}/functions/v1/report` : '');
/** Reports go straight to the tracker. Off until the server function is deployed. */
export const reportsOnline = !!REPORT_URL;

const REPORT_KINDS = new Set(['bug', 'idea', 'other']);
export type Ticket = NonNullable<FeedbackItem['ticket']> & { summary?: string };

function markFiled(id: string, ticket: Ticket) {
  setState((s) => ({ ...s, feedback: s.feedback.map((f) => (f.id === id ? { ...f, ticket: { number: ticket.number, url: ticket.url, title: ticket.title } } : f)) }));
}

/** Files one report. Resolves with the ticket, or throws with a message for the user. */
export async function fileReport(f: FeedbackItem, shot?: string): Promise<Ticket> {
  if (!REPORT_URL) throw new Error('offline-setup');
  const meta = (f.meta ?? {}) as Record<string, unknown>;
  const { screenshot: _s, via: _v, autoFile: _a, ...diagnostics } = meta;
  void _s;
  void _v;
  void _a;
  const area = areaName(typeof meta.screen === 'string' ? meta.screen : undefined);
  const res = await fetch(REPORT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(ANON ? { apikey: ANON, authorization: `Bearer ${ANON}` } : {}) },
    body: JSON.stringify({ id: f.id, kind: f.kind, text: f.text ?? '', fallbackTitle: localTitle(f.text ?? '', area), area, diagnostics, screenshot: shot }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.number) throw new Error(data.error || `Couldn't send (${res.status}).`);
  const t: Ticket = { number: data.number, url: data.url, title: data.title, summary: data.summary };
  markFiled(f.id, t);
  void idbDel(`shot:${f.id}`).catch(() => undefined);
  return t;
}

let flushing = false;
/** Sends anything saved while offline. Runs at start-up and when the phone comes back online. */
export async function flushReports(): Promise<void> {
  if (!reportsOnline || flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const pending = getState().feedback.filter((f) => REPORT_KINDS.has(f.kind) && !f.ticket && (f.meta as { autoFile?: boolean } | undefined)?.autoFile === true && (f.text ?? '').trim().length >= 3 && Date.now() - f.t < 30 * 864e5);
    for (const f of pending.slice(-5)) {
      const shot = (await idbGet<string>(`shot:${f.id}`).catch(() => undefined)) ?? undefined;
      await fileReport(f, shot).catch(() => undefined);
    }
  } finally {
    flushing = false;
  }
}

export function startReportSync() {
  if (!reportsOnline) return;
  setTimeout(() => void flushReports(), 4000);
  window.addEventListener('online', () => void flushReports());
}
