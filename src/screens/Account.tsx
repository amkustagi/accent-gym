import { useEffect, useState } from 'react';
import { MANAGE_SUBSCRIPTION_URL, buyInStore, loadStorePrices, mustUseStoreBilling, restoreStorePurchases, storeBillingEnabled } from '../lib/storePurchases';
import { FREE_DAILY_ROUNDS, PRICE_LABELS, backendEnabled, deleteAccountRequest, isPro, openBillingPortal, planName, pushState, sendCode, signOut, startCheckout, verifyCode } from '../lib/backend';
import { open } from '../lib/nav';
import { scoredToday, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell, toast } from '../ui/ui';

/** Email + 6-digit code sign-in. Used by the account screen and onboarding. */
export function SignInForm({ onDone }: { onDone?: () => void }) {
  const profileName = useStore((s) => s.profile.name);
  const [name, setName] = useState(profileName);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!backendEnabled)
    return (
      <div className="note">
        <b>Accounts aren't switched on yet</b>
        This build runs on your phone only, with every feature unlocked. Accounts, sync and payments turn on once the server is connected (see the setup guide in the repo).
      </div>
    );

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr('');
        setBusy(true);
        try {
          if (step === 'email') {
            await sendCode(email.trim().toLowerCase(), name.trim());
            setStep('code');
          } else {
            await verifyCode(email.trim().toLowerCase(), code);
            toast('Signed in');
            onDone?.();
          }
        } catch (x) {
          setErr((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {step === 'email' ? (
        <>
          <div className="field">
            <label htmlFor="acc-name">Name</label>
            <input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="acc-email">Email</label>
            <input id="acc-email" className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
          </div>
          <button className="btn primary block" disabled={!validEmail || busy}>{busy ? 'Sending…' : 'Email me a sign-in code'}</button>
          <p className="small muted">No password. We'll email you a 6-digit code.</p>
        </>
      ) : (
        <>
          <p>We sent a 6-digit code to <b>{email}</b>.</p>
          <div className="field">
            <label htmlFor="acc-code">Code</label>
            <input id="acc-code" className="input mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: '1.4rem', letterSpacing: '0.3em' }} />
          </div>
          <button className="btn primary block" disabled={code.length < 6 || busy}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button type="button" className="btn ghost" onClick={() => { setStep('email'); setCode(''); }}>Use a different email</button>
        </>
      )}
      {err && <div className="note bad">{err}</div>}
    </form>
  );
}

export function AccountScreen({ onClose }: { onClose: () => void }) {
  const s = useStore((x) => x);
  const a = s.account;
  const pro = isPro(s);
  const [busy, setBusy] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  return (
    <SessionShell title="Account" onClose={onClose}>
      {!a ? (
        <>
          <section className="stack-sm">
            <h1>{backendEnabled ? 'Sign in' : 'Your account'}</h1>
            <p className="muted">Keep your progress safe, use Speakco on any device, and unlock Pro.</p>
          </section>
          <SignInForm />
          {!backendEnabled && (
            <section className="card">
              <div className="row spread"><h3>Plan</h3><span className="pill good">All features unlocked</span></div>
              <p className="small muted">You're running the owner build. Pricing shown to users will be {PRICE_LABELS.monthly} or {PRICE_LABELS.lifetime}.</p>
              <button className="btn quiet" onClick={() => open({ kind: 'paywall' })}>Preview the upgrade screen</button>
            </section>
          )}
        </>
      ) : (
        <>
          <section className="card">
            <div className="row">
              <span className="ic" style={{ width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="user" /></span>
              <div className="grow stack-sm">
                <b>{s.profile.name || 'Signed in'}</b>
                <span className="small muted">{a.email}</span>
              </div>
            </div>
            <p className="small muted">Progress synced {a.syncedAt ? new Date(a.syncedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'soon'}.</p>
            <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={async () => { await pushState(); toast('Synced'); }}><Icon name="refresh" />Sync now</button>
          </section>
          <section className="card">
            <div className="row spread">
              <h3>Plan</h3>
              <span className={`pill ${pro ? 'good' : ''}`}>{planName(a.plan)}</span>
            </div>
            {a.plan === 'pro_monthly' && a.periodEnd && <p className="small muted">Renews {new Date(a.periodEnd).toLocaleDateString()}.</p>}
            {a.plan === 'pro_lifetime' && <p className="small muted">Yours forever. Thank you.</p>}
            {a.plan === 'free' && (
              <>
                <p className="small muted">{scoredToday(s)} of {FREE_DAILY_ROUNDS} free speaking rounds used today.</p>
                <button className="btn signal" onClick={() => open({ kind: 'paywall' })}><Icon name="crown" />Upgrade to Pro</button>
              </>
            )}
            {a.plan === 'pro_monthly' && (mustUseStoreBilling() ? (
              <a className="btn quiet" href={MANAGE_SUBSCRIPTION_URL()} target="_blank" rel="noreferrer">Manage subscription</a>
            ) : (
              <button className="btn quiet" disabled={busy} onClick={async () => { setBusy(true); try { await openBillingPortal(); } catch (e) { toast((e as Error).message); setBusy(false); } }}>
                Manage subscription
              </button>
            ))}
            {mustUseStoreBilling() && storeBillingEnabled() && a.plan === 'free' && (
              <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={async () => { const ok = await restoreStorePurchases().catch(() => false); toast(ok ? 'Purchase restored' : 'No purchase found for this store account'); }}>Restore purchases</button>
            )}
          </section>
          <button className="btn quiet" onClick={async () => { await signOut(); toast('Signed out'); }}>Sign out</button>
          {!askDelete ? (
            <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => setAskDelete(true)}>Delete my account</button>
          ) : (
            <div className="note bad">
              <b>Delete your account?</b>
              We'll remove your account and synced data within 30 days. Active subscriptions should be cancelled first.
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => setAskDelete(false)}>Cancel</button>
                <button className="btn sm" style={{ background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' }} onClick={async () => { await deleteAccountRequest(''); await signOut(); toast('Deletion requested'); onClose(); }}>Request deletion</button>
              </div>
            </div>
          )}
        </>
      )}
    </SessionShell>
  );
}

const BENEFITS: [string, string][] = [
  ['mic', 'Unlimited speaking rounds and simulator scenarios'],
  ['globe', 'Precise accent scoring, word by word and sound by sound'],
  ['refresh', 'Never-ending scenarios written for your role'],
  ['chat', 'AI conversations with follow-up questions'],
  ['sparkle', 'AI coach: rewrites of your answers'],
  ['chart', 'Full history and progress across devices'],
];

export function Paywall({ reason, onClose }: { reason?: string; onClose: () => void }) {
  const s = useStore((x) => x);
  const [busy, setBusy] = useState<'monthly' | 'lifetime' | null>(null);
  const [err, setErr] = useState('');
  const store = mustUseStoreBilling();
  const [prices, setPrices] = useState<{ monthly?: string; lifetime?: string }>({});
  useEffect(() => {
    if (store && storeBillingEnabled()) loadStorePrices().then(setPrices).catch(() => undefined);
  }, [store]);
  const buy = async (plan: 'monthly' | 'lifetime') => {
    setErr('');
    if (!backendEnabled || (store && !storeBillingEnabled())) {
      setErr(backendEnabled ? 'In-app purchases aren\'t connected in this build yet.' : 'Payments aren\'t connected in this build yet. Everything is already unlocked for you.');
      return;
    }
    if (!s.account) {
      open({ kind: 'account' });
      return;
    }
    setBusy(plan);
    try {
      if (store) {
        const ok = await buyInStore(plan);
        setBusy(null);
        if (ok) { toast('Welcome to Speakco Pro'); onClose(); }
      } else await startCheckout(plan);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  };
  const restore = async () => {
    setErr('');
    try {
      if (await restoreStorePurchases()) { toast('Purchase restored'); onClose(); } else setErr('No Speakco purchase found for this store account.');
    } catch {
      setErr('Couldn\'t reach the store. Try again.');
    }
  };
  return (
    <SessionShell title="Speakco Pro" onClose={onClose}>
      <section className="card hero" style={{ gap: 14 }}>
        <Icon name="crown" size={34} />
        <h1 style={{ color: '#fff' }}>Speak with confidence, every day</h1>
        {reason && <p className="muted">{reason}</p>}
        <div className="stack-sm">
          {BENEFITS.map(([i, t]) => (
            <div key={t} className="row"><Icon name={i} size={20} /><span>{t}</span></div>
          ))}
        </div>
      </section>
      <div className="grid2">
        <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }} disabled={!!busy} onClick={() => void buy('monthly')}>
          <span className="eyebrow">Monthly</span>
          <b className="num" style={{ fontSize: '1.5rem' }}>{prices.monthly ?? PRICE_LABELS.monthly}</b>
          <span className="small muted">Cancel anytime</span>
          <span className="btn primary sm">{busy === 'monthly' ? 'Opening…' : 'Choose monthly'}</span>
        </button>
        <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', borderColor: 'var(--signal)', borderWidth: 2 }} disabled={!!busy} onClick={() => void buy('lifetime')}>
          <span className="eyebrow">Lifetime</span>
          <b className="num" style={{ fontSize: '1.5rem' }}>{prices.lifetime ?? PRICE_LABELS.lifetime}</b>
          <span className="small muted">Pay once, own it forever</span>
          <span className="btn signal sm">{busy === 'lifetime' ? 'Opening…' : 'Buy lifetime'}</span>
        </button>
      </div>
      {err && <div className="note warn">{err}</div>}
      {store && storeBillingEnabled() && <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={() => void restore()}>Restore purchases</button>}
      <p className="small muted" style={{ textAlign: 'center' }}>
        Free plan: {FREE_DAILY_ROUNDS} speaking rounds a day, all practice drills, natural voice.{' '}
        {store
          ? 'Payment is charged to your App Store or Google Play account. The monthly plan renews automatically unless cancelled at least 24 hours before the end of the period; manage it in your store account settings.'
          : 'Payments are handled securely by Stripe.'}
      </p>
      <p className="small muted" style={{ textAlign: 'center' }}>
        <a href="privacy.html" target="_blank" rel="noreferrer">Privacy</a> · <a href="terms.html" target="_blank" rel="noreferrer">Terms of use</a>
      </p>
    </SessionShell>
  );
}
