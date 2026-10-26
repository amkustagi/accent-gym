import { set as idbSet } from 'idb-keyval';
import { useMemo, useState } from 'react';
import type { CaptureResult } from '../engine/capture';
import { backendEnabled } from '../lib/backend';
import { FEEDBACK_EMAIL, diagnostics, githubIssueUrl, mailtoUrl, reportBody, sendFeedback } from '../lib/feedback';
import { dataUrlToBlob } from '../lib/screenshot';
import { useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { MicStage } from '../ui/MicStage';
import { SessionShell, Switch, toast } from '../ui/ui';

type Kind = 'bug' | 'idea' | 'other';
const LABEL: Record<Kind, string> = { bug: 'Problem', idea: 'Idea', other: 'Question' };

export function VoiceReportScreen({ shot, type = 'bug', onClose }: { shot?: string; type?: Kind; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>(type);
  const [text, setText] = useState('');
  const [withShot, setWithShot] = useState(!!shot);
  const [withDiag, setWithDiag] = useState(true);
  const [showDiag, setShowDiag] = useState(false);
  const [sent, setSent] = useState(false);
  const diag = useMemo(() => diagnostics(), []);
  const all = useStore((s) => s.feedback);
  const mine = useMemo(() => all.filter((f) => f.kind === 'bug' || f.kind === 'idea' || f.kind === 'other').slice(-5).reverse(), [all]);
  const title = `${LABEL[kind]}: ${text.split('\n')[0].slice(0, 70)}`;
  const body = reportBody(LABEL[kind], text, withDiag);

  const heard = (r: CaptureResult) => {
    const t = r.transcript.trim();
    if (!t) return toast('I didn\'t catch that. Try again or type it.');
    setText((x) => (x.trim() ? `${x.trim()} ${t}` : t));
  };

  const submit = async () => {
    const f = sendFeedback(kind, { text: text.trim(), meta: { ...(withDiag ? diag : { version: __APP_VERSION__ }), screenshot: withShot && !!shot, via: 'report' } });
    if (withShot && shot) await idbSet(`shot:${f.id}`, shot).catch(() => undefined);
    setSent(true);
  };

  const share = async () => {
    const files = withShot && shot ? [new File([dataUrlToBlob(shot)], 'speakco-screenshot.jpg', { type: 'image/jpeg' })] : [];
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const data: ShareData = { title, text: `${body}\n\nSend to: ${FEEDBACK_EMAIL}`, ...(files.length ? { files } : {}) };
    try {
      if (nav.share && (!files.length || nav.canShare?.(data))) await nav.share(data);
      else location.href = mailtoUrl(title, body);
    } catch {
      /* cancelled */
    }
  };

  if (sent)
    return (
      <SessionShell title="Thanks" onClose={onClose} noReport>
        <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="ic" style={{ width: 60, height: 60, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--good-soft)', color: 'var(--good)' }}><Icon name="check" size={32} /></span>
          <h2>Got it</h2>
          <p className="muted">{backendEnabled ? 'Your report was sent. You can see it under Settings › Help us improve.' : 'Saved on this phone. Send it with your screenshot in one tap:'}</p>
        </section>
        {!backendEnabled && (
          <div className="stack">
            <button className="btn primary block" onClick={() => void share()}><Icon name="mail" />Send{withShot && shot ? ' with screenshot' : ''}</button>
            <a className="btn quiet block" href={githubIssueUrl(title, body)} target="_blank" rel="noreferrer">Open a GitHub issue</a>
            <p className="small muted" style={{ textAlign: 'center' }}>Choose Mail or any app. It goes to {FEEDBACK_EMAIL}.</p>
          </div>
        )}
        <div className="foot"><button className="btn block" onClick={onClose}>Done</button></div>
      </SessionShell>
    );

  return (
    <SessionShell title="Report or suggest" onClose={onClose} noReport>
      <div className="row" style={{ gap: 8 }}>
        {(Object.keys(LABEL) as Kind[]).map((k) => (
          <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{LABEL[k]}</button>
        ))}
      </div>
      <section className="card" style={{ alignItems: 'center' }}>
        <b>{kind === 'bug' ? 'Tell us what went wrong' : kind === 'idea' ? 'Tell us your idea' : 'Ask us anything'}</b>
        <MicStage maxSec={90} needsTranscript record={false} size="sm" showCanvas={false} showCounters={false} autoStopSilence={2.5} idleHint="Tap and talk, or type below" onDone={heard} />
      </section>
      <textarea className="input" style={{ minHeight: 110 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Your report" placeholder={kind === 'bug' ? 'e.g. The test kept going after 10 questions.' : 'e.g. Add practice for job interviews in finance.'} />
      {shot && (
        <section className="card">
          <div className="row spread">
            <b>Include screenshot</b>
            <Switch checked={withShot} onChange={setWithShot} label="Include screenshot" />
          </div>
          {withShot && <img src={shot} alt="Screenshot of the screen you were on" style={{ width: '45%', borderRadius: 10, border: '1px solid var(--line)' }} />}
          <span className="small muted">Anything you typed on that screen is blanked out.</span>
        </section>
      )}
      <section className="card">
        <div className="row spread">
          <div className="stack-sm grow">
            <b>Include device details</b>
            <span className="small muted">App version, phone, browser, the screens you just used, recent errors. No recordings, transcripts, name or location.</span>
          </div>
          <Switch checked={withDiag} onChange={setWithDiag} label="Include device details" />
        </div>
        {withDiag && <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDiag((v) => !v)}>{showDiag ? 'Hide' : 'See'} exactly what's sent</button>}
        {withDiag && showDiag && <pre className="small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, background: 'var(--sunken)', padding: 10, borderRadius: 10 }}>{JSON.stringify(diag, null, 2)}</pre>}
      </section>
      {mine.length > 0 && (
        <section className="card">
          <h3>Your recent reports</h3>
          <div className="stack-sm">
            {mine.map((f) => (
              <div key={f.id} className="row spread">
                <span className="small grow">{(f.text || '(no text)').slice(0, 60)}</span>
                <span className="pill">{f.synced ? 'Sent' : 'Saved'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="foot">
        <button className="btn signal block" disabled={text.trim().length < 3} onClick={() => void submit()}>Send</button>
      </div>
    </SessionShell>
  );
}
