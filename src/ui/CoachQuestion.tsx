import { useState } from 'react';
import { answerQuestion, pickQuestion, skipQuestion, type CoachQuestion } from '../learn/learner';
import { getState } from '../store/store';

/** The coach's one short question, shown at the end of a report at most once a day. */
export function CoachQuestionCard() {
  const [q] = useState<CoachQuestion | null>(() => pickQuestion(getState()));
  const [state, setState] = useState<'ask' | 'thanks' | 'gone'>('ask');
  const [text, setText] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  if (!q || state === 'gone') return null;
  if (state === 'thanks')
    return (
      <div className="note good" role="status">
        <b>Thanks</b>Your practice will use that from now on. You can change it anytime in Settings › What your coach knows.
      </div>
    );
  const save = () => {
    answerQuestion(q.id, q.kind === 'multi' ? sel : text);
    setState('thanks');
  };
  const ready = q.kind === 'multi' ? sel.length > 0 : text.trim().length >= 2;
  return (
    <section className="card" aria-label="A question from your coach">
      <span className="eyebrow">Quick question</span>
      <b>{q.ask}</b>
      {q.kind === 'multi' ? (
        <div className="row wrap" style={{ gap: 8 }}>
          {q.options!.map((o) => (
            <button key={o.id} className="chip sm" aria-pressed={sel.includes(o.id)} onClick={() => setSel((x) => (x.includes(o.id) ? x.filter((y) => y !== o.id) : [...x, o.id]))}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <input className="input" value={text} placeholder={q.placeholder} maxLength={80} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ready && save()} aria-label={q.ask} />
      )}
      <div className="row">
        <button className="btn primary sm" disabled={!ready} onClick={save}>Save</button>
        <button className="btn ghost sm" onClick={() => { skipQuestion(q.id); setState('gone'); }}>Not now</button>
      </div>
    </section>
  );
}
