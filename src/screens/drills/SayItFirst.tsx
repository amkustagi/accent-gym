// "Say it first" (tinyhustlers/hq#34): type the message you're about to deliver, get it point-first,
// then say it out loud twice. Nothing typed leaves the phone unless the user taps "Rewrite with AI".
import { useMemo, useState } from 'react';
import type { CaptureResult } from '../../engine/capture';
import { analyzeDirectness, type Directness } from '../../engine/direct';
import { pointFirst } from '../../engine/pointfirst';
import { countWords } from '../../engine/text';
import { aiAvailable, pointFirstAI } from '../../lib/ai';
import { canStartRound } from '../../lib/gate';
import { scoreAndSave, tooShort } from '../../lib/session';
import { useStore, type SessionRecord } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { Report } from '../../ui/Report';
import { HearButton, TakeCompare } from '../../ui/TakeCompare';
import { SessionShell } from '../../ui/ui';
import { DirectnessCard } from '../Courses';

/** Fictional examples (sample family: Arjun, Meera and Anya Rao). */
export const SAY_IT_FIRST_EXAMPLES = [
  { label: 'Push back a deadline', text: "Hi Meera, sorry to bother you. So I just wanted to give some context on the launch. The vendor sent the files late and testing found two bugs. I think we need two more weeks. Does that make sense?" },
  { label: 'Ask for budget', text: "Okay so, a lot has been going on with the budget review this quarter and the numbers kind of moved. Could you approve the extra $4,000 for the design contractor by Friday, if that's okay?" },
  { label: 'Bad news in stand-up', text: "Um, quick update. Sorry, I know this isn't great. The payment API is probably going to be a bit late. Maybe we could move the demo to Thursday." },
];

type Phase = 'write' | 'review' | 'take' | 'result';
interface Take { rec: SessionRecord; xp: number; d: Directness; audio: Blob | null }

export function SayItFirstDrill({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('write');
  const [draft, setDraft] = useState('');
  const [after, setAfter] = useState('');
  const [via, setVia] = useState<'rules' | 'ai'>('rules');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const ai = useStore((s) => aiAvailable(s));
  const rules = useMemo(() => pointFirst(draft), [draft]);
  const enough = countWords(draft) >= 4;
  const before = useMemo(() => analyzeDirectness(draft), [draft]);
  const planned = useMemo(() => analyzeDirectness(after), [after]);

  const makeRules = () => {
    setVia('rules');
    setAfter(rules.text || draft.trim());
    setErr(null);
    setPhase('review');
  };
  const makeAI = async () => {
    setBusy(true);
    setErr(null);
    try {
      setAfter(await pointFirstAI(draft));
      setVia('ai');
      setPhase('review');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'The AI coach is unavailable. The on-phone version still works.');
    } finally {
      setBusy(false);
    }
  };
  const startTake = () => {
    if (countWords(after) < 3 || !canStartRound()) return;
    setErr(null);
    setPhase('take');
  };
  const done = async (r: CaptureResult) => {
    const short = tooShort(r);
    if (short) {
      setErr(short);
      setPhase('review');
      return;
    }
    const n = takes.length + 1;
    const { rec, xp } = await scoreAndSave(r, { drill: 'sayitfirst', title: `Say it first · take ${n}`, extra: { take: n } });
    setTakes((t) => [...t, { rec, xp, d: analyzeDirectness(r.transcript), audio: r.audio }]);
    setPhase('result');
  };
  const restart = () => {
    setDraft('');
    setAfter('');
    setTakes([]);
    setErr(null);
    setPhase('write');
  };

  const last = takes[takes.length - 1];
  const first = takes[0];

  return (
    <SessionShell title="Say it first" onClose={onClose}>
      {phase === 'write' && (
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <span className="eyebrow">Before the real conversation</span>
            <h2>What do you need to say?</h2>
            <p className="small muted">Type or paste it the way you'd say it. You get it back point-first, then say it out loud twice. It stays on this phone.</p>
            <textarea id="sif-draft" aria-label="Your message" className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Sorry, I just wanted to flag that I think the launch will probably slip…" maxLength={2000} />
            <div className="chips wrap" aria-label="Examples">
              {SAY_IT_FIRST_EXAMPLES.map((x) => (
                <button key={x.label} className="chip" style={{ minHeight: 44 }} onClick={() => setDraft(x.text)}>{x.label}</button>
              ))}
            </div>
          </section>
          {err && <div className="note bad"><b>AI rewrite failed</b>{err}</div>}
          <div className="foot stack-sm">
            <button className="btn signal block" disabled={!enough} onClick={makeRules}><Icon name="scissors" />Make it point-first</button>
            {ai && <button className="btn quiet block" disabled={!enough || busy} onClick={() => void makeAI()}><Icon name="sparkle" />{busy ? 'Rewriting…' : 'Rewrite with AI'}</button>}
            {ai && <p className="small muted" style={{ margin: 0 }}>AI sends only this message to the coach{ai === 'key' ? ' with your own key' : ''}.</p>}
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <span className="eyebrow">Before · {countWords(draft)} words · point after {before.wordsToPoint ?? '–'}</span>
            <p className="small muted" style={{ margin: 0 }}>{draft}</p>
          </section>
          <section className="card" style={{ borderColor: 'var(--brand)' }}>
            <span className="eyebrow">Point-first · {countWords(after)} words · point after {planned.wordsToPoint ?? '–'}{via === 'ai' ? ' · AI' : ''}</span>
            <textarea id="sif-after" aria-label="Point-first version (you can edit it)" className="input" value={after} onChange={(e) => setAfter(e.target.value)} maxLength={2000} />
            {via === 'rules' && (rules.moved || rules.removed.length > 0) && (
              <ul className="small stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
                {rules.moved && <li>Moved your point to the front.</li>}
                {rules.removed.length > 0 && <li>Cut: {rules.removed.map((r) => `"${r}"`).join(', ')}.</li>}
              </ul>
            )}
            {via === 'rules' && !rules.moved && rules.removed.length === 0 && <p className="small">Already direct. Say it as it is.</p>}
            {via === 'rules' && !rules.point && <p className="small">I couldn't find the ask, decision or status. Add one sentence that says it, e.g. "We need two more weeks."</p>}
            <HearButton text={after} label="Hear it" className="btn quiet" />
          </section>
          {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
          <div className="foot stack-sm">
            <button className="btn signal block" disabled={countWords(after) < 3} onClick={startTake}><Icon name="mic" />Say it out loud</button>
            <button className="btn ghost block" onClick={() => setPhase('write')}>Edit my message</button>
          </div>
        </div>
      )}

      {phase === 'take' && (
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <span className="eyebrow">Take {takes.length + 1} of 2 · point first, then stop</span>
            <p style={{ margin: 0, fontSize: '1.05rem' }}>{after}</p>
          </section>
          <MicStage maxSec={60} onDone={(r) => void done(r)} needsTranscript autoStopSilence={3} />
        </div>
      )}

      {phase === 'result' && last && (
        <Report
          rec={last.rec}
          xp={last.xp}
          prompt={after}
          onRetry={takes.length < 2 ? undefined : startTake}
          onDone={restart}
          doneLabel="New message"
        >
          {takes.length === 1 && (
            <div className="note">
              <b>Once more</b>
              Say it again without looking. Beat {last.d.wordsToPoint === null ? 'your first take: say the point first' : `${last.d.wordsToPoint} words before your point`}.
              <button className="btn signal block" style={{ marginTop: 10 }} onClick={startTake}><Icon name="mic" />Take 2</button>
            </div>
          )}
          {takes.length >= 2 && first && <TakeDiff a={first} b={last} />}
          <DirectnessCard d={last.d} />
          <section className="card">
            <h3>Hear the difference</h3>
            <TakeCompare text={after} take={last.audio} modelLabel="Point-first" />
          </section>
        </Report>
      )}
    </SessionShell>
  );
}

function TakeDiff({ a, b }: { a: Take; b: Take }) {
  const row = (label: string, x: string, y: string) => (
    <div className="row spread small" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
      <span className="grow">{label}</span>
      <span style={{ width: 64, textAlign: 'right' }}>{x}</span>
      <span style={{ width: 64, textAlign: 'right' }}><b>{y}</b></span>
    </div>
  );
  const tp = (d: Directness) => (d.wordsToPoint === null ? '–' : String(d.wordsToPoint));
  const wpm = (t: Take) => (t.rec.metrics?.wpm ? String(Math.round(t.rec.metrics.wpm)) : '–');
  return (
    <section className="card">
      <div className="row spread small"><h3 className="grow">Take 1 → Take 2</h3><span style={{ width: 64, textAlign: 'right' }}>1</span><span style={{ width: 64, textAlign: 'right' }}>2</span></div>
      {row('Score', String(a.rec.overall), String(b.rec.overall))}
      {row('Words before your point', tp(a.d), tp(b.d))}
      {row('Hedges', String(a.d.hedges.length), String(b.d.hedges.length))}
      {row('Words per minute', wpm(a), wpm(b))}
    </section>
  );
}
