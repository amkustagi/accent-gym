import { useMemo, useState } from 'react';
import { backendEnabled } from '../lib/backend';
import { FEEDBACK_EMAIL, diagnostics, githubIssueUrl, mailtoUrl, reportBody, sendFeedback } from '../lib/feedback';
import { setState, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { Seg, SessionShell, Switch, toast } from '../ui/ui';

type Kind = 'bug' | 'idea' | 'other';

export function FeedbackScreen({ type = 'bug', onClose }: { type?: Kind; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>(type);
  const [text, setText] = useState('');
  const [diag, setDiag] = useState(true);
  const [sent, setSent] = useState(false);
  // Select the stable array, derive in render: a selector returning a new array loops forever.
  const all = useStore((s) => s.feedback);
  const mine = useMemo(() => all.filter((f) => f.kind === 'bug' || f.kind === 'idea' || f.kind === 'other').slice(-5).reverse(), [all]);
  const label = kind === 'bug' ? 'Problem' : kind === 'idea' ? 'Idea' : 'Feedback';
  const body = reportBody(label, text, diag);
  const title = `${label}: ${text.split('\n')[0].slice(0, 70)}`;

  const submit = () => {
    sendFeedback(kind, { text, meta: diag ? diagnostics() : undefined });
    setSent(true);
  };

  if (sent)
    return (
      <SessionShell title="Feedback" onClose={onClose}>
        <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="ic" style={{ width: 60, height: 60, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--good-soft)', color: 'var(--good)' }}><Icon name="check" size={32} /></span>
          <h2>Thank you</h2>
          <p className="muted">{backendEnabled ? 'Your message was sent to the team.' : 'Saved on this phone. Send it to the developer with one of these:'}</p>
        </section>
        {!backendEnabled && (
          <div className="stack">
            <a className="btn primary block" href={mailtoUrl(title, body)}><Icon name="mail" />Send by email</a>
            <a className="btn quiet block" href={githubIssueUrl(title, body)} target="_blank" rel="noreferrer">Open a GitHub issue</a>
            <button className="btn quiet block" onClick={async () => {
              try { await navigator.clipboard.writeText(body); toast('Copied'); } catch { toast('Copy failed'); }
            }}>Copy text</button>
            <p className="small muted" style={{ textAlign: 'center' }}>Email goes to {FEEDBACK_EMAIL}</p>
          </div>
        )}
        <div className="foot"><button className="btn block" onClick={onClose}>Done</button></div>
      </SessionShell>
    );

  return (
    <SessionShell title="Feedback" onClose={onClose}>
      <Seg label="Type" value={kind} onChange={setKind} options={[{ v: 'bug', label: 'Problem' }, { v: 'idea', label: 'Idea' }, { v: 'other', label: 'Other' }]} />
      <div className="field">
        <label htmlFor="fb-text">{kind === 'bug' ? 'What went wrong? What did you expect?' : kind === 'idea' ? 'What would make Speakco better for you?' : 'Tell us anything'}</label>
        <textarea id="fb-text" className="input" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'bug' ? 'e.g. The voice didn\'t play after I recorded on the Swaps screen.' : 'e.g. Add practice for job interviews in finance.'} />
      </div>
      <div className="row spread">
        <div className="stack-sm grow">
          <b>Include device details</b>
          <span className="small muted">Phone, browser, app version, recent errors. No recordings.</span>
        </div>
        <Switch label="Include device details" checked={diag} onChange={setDiag} />
      </div>
      <div className="foot">
        <button className="btn primary block" disabled={text.trim().length < 5} onClick={submit}>Send</button>
      </div>
      {mine.length > 0 && (
        <section className="stack-sm">
          <span className="eyebrow">Your recent feedback</span>
          {mine.map((f) => (
            <div key={f.id} className="card tight">
              <span className="small muted">{new Date(f.t).toLocaleDateString()} · {f.kind}{f.synced ? ' · sent' : ''}</span>
              <p className="small">{f.text}</p>
            </div>
          ))}
        </section>
      )}
    </SessionShell>
  );
}

/** Weekly two-question check-in shown on Today. */
export function CheckinCard() {
  const [score, setScore] = useState<number | null>(null);
  const [text, setText] = useState('');
  const close = () => setState((s) => ({ ...s, lastCheckin: Date.now() }));
  return (
    <section className="card" style={{ borderColor: 'var(--brand)' }}>
      <div className="row spread">
        <h3>Weekly check-in</h3>
        <button className="iconbtn ghost" style={{ width: 36, height: 36 }} onClick={close} aria-label="Skip"><Icon name="close" size={18} /></button>
      </div>
      <p className="small">How likely are you to recommend Speakco to a colleague?</p>
      <div className="nps" role="radiogroup" aria-label="0 to 10">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} role="radio" aria-checked={score === i} className={score === i ? 'on' : ''} onClick={() => setScore(i)}>{i}</button>
        ))}
      </div>
      {score !== null && (
        <>
          <textarea className="input" style={{ minHeight: 70 }} placeholder={score >= 9 ? 'What do you love most?' : 'What would make it a 10?'} value={text} onChange={(e) => setText(e.target.value)} aria-label="Comment" />
          <button className="btn primary" onClick={() => { sendFeedback('checkin', { rating: score, text: text.trim() || undefined }); close(); toast('Thanks for the check-in'); }}>Send</button>
        </>
      )}
    </section>
  );
}
