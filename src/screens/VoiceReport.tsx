import { set as idbSet } from 'idb-keyval';
import { useMemo, useState } from 'react';
import type { CaptureResult } from '../engine/capture';
import { diagnostics, githubIssueUrl, reportBody, sendFeedback } from '../lib/feedback';
import { fileReport, reportsOnline, type Ticket } from '../lib/report';
import { areaName, localTitle } from '../lib/ticket';
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
  const [stage, setStage] = useState<'edit' | 'sending' | 'sent' | 'saved' | 'setup'>('edit');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [pending, setPending] = useState<{ id: string; shot?: string } | null>(null);
  const diag = useMemo(() => diagnostics(), []);
  const all = useStore((s) => s.feedback);
  const mine = useMemo(() => all.filter((f) => f.kind === 'bug' || f.kind === 'idea' || f.kind === 'other').slice(-5).reverse(), [all]);
  const title = localTitle(text, areaName(diag.screen as string));
  const body = reportBody(LABEL[kind], text, withDiag);

  const heard = (r: CaptureResult) => {
    const t = r.transcript.trim();
    if (!t) return toast('I didn\'t catch that. Try again or type it.');
    setText((x) => (x.trim() ? `${x.trim()} ${t}` : t));
  };

  const deliver = async (f: Parameters<typeof fileReport>[0], img?: string) => {
    setStage('sending');
    try {
      setTicket(await fileReport(f, img));
      setStage('sent');
    } catch {
      setStage('saved');
    }
  };

  const submit = async () => {
    const f = sendFeedback(kind, { text: text.trim(), meta: { ...(withDiag ? diag : { version: __APP_VERSION__, screen: diag.screen }), screenshot: withShot && !!shot, via: 'report', autoFile: true } });
    const img = withShot ? shot : undefined;
    if (img) await idbSet(`shot:${f.id}`, img).catch(() => undefined);
    setPending({ id: f.id, shot: img });
    if (!reportsOnline) return setStage('setup');
    await deliver(f, img);
  };

  const retry = () => {
    const f = all.find((x) => x.id === pending?.id);
    if (f) void deliver(f, pending?.shot);
  };

  if (stage === 'sending')
    return (
      <SessionShell title="Sending" onClose={onClose} noReport>
        <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="spinner" aria-hidden="true" />
          <h2>Writing up your report</h2>
          <p className="muted">Turning what you said into a clear ticket for the team…</p>
        </section>
      </SessionShell>
    );

  if (stage !== 'edit')
    return (
      <SessionShell title="Thanks" onClose={onClose} noReport>
        <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="ic" style={{ width: 60, height: 60, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--good-soft)', color: 'var(--good)' }}><Icon name="check" size={32} /></span>
          <h2>{stage === 'sent' ? 'Sent' : 'Got it'}</h2>
          {stage === 'sent' && ticket && (
            <>
              <p className="muted">The team has it as ticket #{ticket.number}:</p>
              <p><b>{ticket.title}</b></p>
              {ticket.summary && <p className="small muted">{ticket.summary}</p>}
            </>
          )}
          {stage === 'saved' && <p className="muted">Saved on this phone. It sends by itself as soon as you're back online.</p>}
          {stage === 'setup' && <p className="muted">Saved on this phone. Automatic sending isn't switched on in this build yet.</p>}
        </section>
        <div className="stack">
          {stage === 'saved' && <button className="btn quiet block" onClick={retry}><Icon name="refresh" />Try sending now</button>}
          {stage === 'sent' && ticket && <a className="btn ghost block" href={ticket.url} target="_blank" rel="noreferrer">View ticket</a>}
          {stage === 'setup' && <a className="btn quiet block" href={githubIssueUrl(title, body)} target="_blank" rel="noreferrer">Send through GitHub instead</a>}
        </div>
        <div className="foot"><button className="btn primary block" onClick={onClose}>Done</button></div>
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
                <span className="small grow">{f.ticket?.title ?? (f.text || '(no text)').slice(0, 60)}</span>
                <span className="pill">{f.ticket ? `#${f.ticket.number}` : f.synced ? 'Sent' : 'Saved'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="foot">
        <button className="btn signal block" disabled={text.trim().length < 3} onClick={() => void submit()}><Icon name="send" />Send</button>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Goes straight to the Speakco team. AI writes it up as a ticket. Tickets are public; your name and email are never included.</p>
      </div>
    </SessionShell>
  );
}
