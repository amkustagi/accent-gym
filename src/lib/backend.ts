// Accounts, cloud sync, purchases and feedback upload via Supabase (+ Stripe through server functions).
// Everything here is inert until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build time.
import type { SupabaseClient } from '@supabase/supabase-js';
import { getState, onChange, replaceState, setAccount, setState, type Account, type Plan, type State } from '../store/store';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const backendEnabled = !!(URL_ && KEY);

export const PRICE_LABELS = {
  monthly: (import.meta.env.VITE_PRICE_MONTHLY_LABEL as string | undefined) || '$7.99/month',
  lifetime: (import.meta.env.VITE_PRICE_LIFETIME_LABEL as string | undefined) || '$79 once',
};

let sb: SupabaseClient | null = null;
async function client(): Promise<SupabaseClient> {
  if (!backendEnabled) throw new Error('Accounts are not connected yet.');
  if (!sb) {
    const { createClient } = await import('@supabase/supabase-js');
    sb = createClient(URL_!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  }
  return sb;
}

// ---------- plan & limits ----------

export const FREE_DAILY_ROUNDS = 3;

/** Pro features are unlocked when payments aren't connected yet (owner testing) or the plan is active. */
export function isPro(s: State): boolean {
  if (!backendEnabled) return true;
  const a = s.account;
  if (!a || a.plan === 'free') return false;
  if (a.plan === 'pro_lifetime') return true;
  return a.planStatus === 'active' || a.planStatus === 'trialing' || (a.periodEnd ?? 0) > Date.now();
}

export const planName = (p: Plan | undefined) => (p === 'pro_lifetime' ? 'Pro lifetime' : p === 'pro_monthly' ? 'Pro monthly' : 'Free');

// ---------- auth ----------

export async function sendCode(email: string, name: string): Promise<void> {
  const c = await client();
  const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { name } } });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, code: string): Promise<void> {
  const c = await client();
  const { error } = await c.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error) throw new Error(error.message.includes('expired') ? 'That code expired. Send a new one.' : 'That code didn\'t match. Check it and try again.');
  await afterSignIn();
}

export async function signOut(): Promise<void> {
  if (!backendEnabled) return;
  await pushState().catch(() => undefined);
  const c = await client();
  await c.auth.signOut();
  setAccount(null);
}

async function afterSignIn() {
  await refreshAccount();
  await pullState();
  await pushState();
  await flushFeedback();
}

/** Reads the signed-in user and their purchase from the server. */
export async function refreshAccount(): Promise<Account | null> {
  if (!backendEnabled) return null;
  const c = await client();
  const { data } = await c.auth.getUser();
  const user = data.user;
  if (!user) {
    setAccount(null);
    return null;
  }
  const { data: ent } = await c.from('entitlements').select('plan,status,current_period_end').eq('user_id', user.id).maybeSingle();
  const acct: Account = {
    userId: user.id,
    email: user.email ?? '',
    plan: (ent?.plan as Plan) ?? 'free',
    planStatus: ent?.status ?? 'none',
    periodEnd: ent?.current_period_end ? Date.parse(ent.current_period_end) : null,
    syncedAt: getState().account?.syncedAt ?? 0,
  };
  setAccount(acct);
  const name = (user.user_metadata as { name?: string })?.name;
  if (name && !getState().profile.name) setState((s) => ({ ...s, profile: { ...s.profile, name } }));
  return acct;
}

// ---------- purchases ----------

export async function startCheckout(plan: 'monthly' | 'lifetime'): Promise<void> {
  const c = await client();
  const back = location.origin + location.pathname;
  const { data, error } = await c.functions.invoke('create-checkout', { body: { plan, return_url: back } });
  if (error || !data?.url) throw new Error('Couldn\'t open checkout. Try again in a moment.');
  location.href = data.url;
}

export async function openBillingPortal(): Promise<void> {
  const c = await client();
  const { data, error } = await c.functions.invoke('billing-portal', { body: { return_url: location.origin + location.pathname } });
  if (error || !data?.url) throw new Error('Couldn\'t open subscription settings.');
  location.href = data.url;
}

// ---------- sync ----------

/** Data synced to the account. Voice traces and recordings stay on the device. */
function syncPayload(s: State) {
  const { loaded: _l, account: _a, ...rest } = s;
  void _l;
  void _a;
  return { ...rest, settings: { ...rest.settings, aiKey: '' }, sessions: rest.sessions.map(({ trace: _t, ...x }) => (void _t, x)) };
}

/** Merges two states: union of history, max of counters, newer profile wins. */
export function mergeStates(local: State, remote: Partial<State>): State {
  const byId = new Map(local.sessions.map((x) => [x.id, x]));
  (remote.sessions ?? []).forEach((x) => !byId.has(x.id) && byId.set(x.id, { ...x, hasAudio: false }));
  const days = { ...local.days };
  Object.entries(remote.days ?? {}).forEach(([k, v]) => {
    const merged = { ...(days[k] ?? {}) };
    Object.entries(v).forEach(([d, n]) => (merged[d] = Math.max(merged[d] ?? 0, n)));
    days[k] = merged;
  });
  const fb = new Map(local.feedback.map((f) => [f.id, f]));
  (remote.feedback ?? []).forEach((f) => !fb.has(f.id) && fb.set(f.id, f));
  const srs = { ...(remote.srs ?? {}) };
  Object.entries(local.srs).forEach(([k, v]) => (!srs[k] || srs[k].seen <= v.seen) && (srs[k] = v));
  const remoteNewer = (remote.updatedAt ?? 0) > local.updatedAt;
  return {
    ...local,
    profile: remoteNewer && remote.profile ? { ...local.profile, ...remote.profile } : local.profile,
    settings: remoteNewer && remote.settings ? { ...local.settings, ...remote.settings, aiKey: local.settings.aiKey } : local.settings,
    xp: Math.max(local.xp, remote.xp ?? 0),
    days,
    sessions: [...byId.values()].sort((a, b) => a.t - b.t).slice(-500),
    best: { ...(remote.best ?? {}), ...local.best },
    lessonsDone: [...new Set([...local.lessonsDone, ...(remote.lessonsDone ?? [])])],
    adapt: { ...(remote.adapt ?? {}), ...local.adapt },
    srs,
    seen: { ...(remote.seen ?? {}), ...local.seen },
    votes: { ...(remote.votes ?? {}), ...local.votes },
    feedback: [...fb.values()].sort((a, b) => a.t - b.t).slice(-1000),
  };
}

export async function pullState(): Promise<void> {
  const a = getState().account;
  if (!backendEnabled || !a) return;
  const c = await client();
  const { data } = await c.from('user_state').select('state,updated_at').eq('user_id', a.userId).maybeSingle();
  if (data?.state) replaceState(mergeStates(getState(), data.state as Partial<State>));
}

let pushing = false;
export async function pushState(): Promise<void> {
  const s = getState();
  if (!backendEnabled || !s.account || pushing) return;
  pushing = true;
  try {
    const c = await client();
    await c.from('user_state').upsert({ user_id: s.account.userId, state: syncPayload(s), updated_at: new Date().toISOString() });
    setState((x) => ({ ...x, account: x.account ? { ...x.account, syncedAt: Date.now() } : null }));
  } finally {
    pushing = false;
  }
}

/** Uploads feedback and (with consent) anonymous usage counters. */
export async function flushFeedback(): Promise<number> {
  const s = getState();
  if (!backendEnabled || !s.account) return 0;
  const pending = s.feedback.filter((f) => !f.synced);
  const c = await client();
  if (pending.length) {
    const { error } = await c.from('feedback').insert(
      pending.map((f) => ({ id: f.id, user_id: s.account!.userId, created_at: new Date(f.t).toISOString(), kind: f.kind, target: f.target ?? null, rating: f.rating ?? null, tags: f.tags ?? [], text: f.text ?? null, meta: f.meta ?? {} })),
    );
    if (!error) {
      const ids = new Set(pending.map((f) => f.id));
      setState((x) => ({ ...x, feedback: x.feedback.map((f) => (ids.has(f.id) ? { ...f, synced: true } : f)) }));
    }
  }
  if (s.profile.consentAnalytics) {
    await c.from('usage').upsert({ user_id: s.account.userId, counters: s.counters, errors: s.errors.slice(-20), app_version: __APP_VERSION__, updated_at: new Date().toISOString() });
  }
  return pending.length;
}

let syncTimer: number | undefined;
/** Starts background sync: restores the session, then pushes changes every few seconds. */
export async function startBackend(): Promise<void> {
  if (!backendEnabled) return;
  try {
    const acct = await refreshAccount();
    if (acct) await pullState();
  } catch {
    /* offline: keep local data */
  }
  onChange((s) => {
    if (!s.account) return;
    clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      void pushState().catch(() => undefined);
      void flushFeedback().catch(() => undefined);
    }, 8000);
  });
  // Returning from Stripe Checkout.
  const q = new URLSearchParams(location.search);
  if (q.get('checkout') === 'success') {
    history.replaceState(null, '', location.pathname);
    for (let i = 0; i < 5; i++) {
      const a = await refreshAccount().catch(() => null);
      if (a && a.plan !== 'free') break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ---------- AI through the server (Pro accounts) ----------

export async function aiViaServer(system: string, user: string, maxTokens = 700): Promise<string> {
  const c = await client();
  const { data, error } = await c.functions.invoke('ai', { body: { system, user, max_tokens: maxTokens } });
  if (error) throw new Error('The AI service is unavailable right now.');
  return (data?.text as string) ?? '';
}

export async function deleteAccountRequest(reason: string): Promise<void> {
  const s = getState();
  if (!backendEnabled || !s.account) return;
  const c = await client();
  await c.from('feedback').insert({ user_id: s.account.userId, kind: 'other', target: 'account-deletion', text: reason || 'Please delete my account and data.', tags: ['delete-account'] });
}
