import { useState } from 'react';
import type { DrillId } from '../content/catalog';
import { nudgeLevel } from '../learn/adapt';
import { sendFeedback } from '../lib/feedback';
import { updateSession, useStore, vote } from '../store/store';
import { Icon } from './Icon';
import { toast } from './ui';

const FACES = ['😣', '😕', '😐', '🙂', '🤩'];
const REPORT_TAGS = ['Score felt wrong', 'Transcript was wrong', 'Tips were useful', 'Too hard', 'Too easy', 'Loved it'];

/** "How useful was this?" with quick tags. Shown at the bottom of every report. */
export function RateReport({ sessionId, drill }: { sessionId: string; drill: string }) {
  const rec = useStore((s) => s.sessions.find((x) => x.id === sessionId));
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const rating = rec?.rating;
  if (!rec) return null;
  const rate = (r: number) => updateSession(sessionId, { rating: r });
  const submit = () => {
    sendFeedback('report_rating', { target: sessionId, rating, tags, text: text.trim() || undefined, meta: { drill, overall: rec.overall, scores: rec.scores } });
    if (tags.includes('Too hard')) nudgeLevel(drill as DrillId, -1);
    if (tags.includes('Too easy')) nudgeLevel(drill as DrillId, 1);
    setSent(true);
    toast('Thanks. This makes your coaching better.');
  };
  if (sent)
    return (
      <div className="note good">
        <b>Feedback saved</b>
        {tags.includes('Too hard') ? 'We\'ll make the next ones a bit easier.' : tags.includes('Too easy') ? 'We\'ll turn up the difficulty.' : 'Thanks for helping improve Speakco.'}
      </div>
    );
  return (
    <section className="card">
      <h3>How useful was this feedback?</h3>
      <div className="row" style={{ justifyContent: 'space-between' }} role="radiogroup" aria-label="Rating">
        {FACES.map((f, i) => (
          <button key={i} className={`face${rating === i + 1 ? ' on' : ''}`} role="radio" aria-checked={rating === i + 1} aria-label={`${i + 1} of 5`} onClick={() => rate(i + 1)}>
            {f}
          </button>
        ))}
      </div>
      {rating !== undefined && (
        <>
          <div className="row wrap" style={{ gap: 6 }}>
            {REPORT_TAGS.map((t) => (
              <button key={t} className="chip sm" aria-pressed={tags.includes(t)} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>
                {t}
              </button>
            ))}
          </div>
          <textarea className="input" style={{ minHeight: 70 }} placeholder="Anything else? (optional)" value={text} onChange={(e) => setText(e.target.value)} aria-label="Comment" />
          <button className="btn primary" onClick={submit}>Send feedback</button>
        </>
      )}
    </section>
  );
}

/** Thumbs on a single coaching tip. */
export function TipThumbs({ tip, sessionId }: { tip: string; sessionId: string }) {
  const [v, setV] = useState<1 | -1 | 0>(0);
  const click = (n: 1 | -1) => {
    setV(n);
    sendFeedback('tip', { target: tip, rating: n, meta: { sessionId } });
  };
  return (
    <span className="thumbs" aria-label="Was this tip helpful?">
      <button className={v === 1 ? 'on' : ''} onClick={() => click(1)} aria-label="Helpful" aria-pressed={v === 1}>👍</button>
      <button className={v === -1 ? 'on' : ''} onClick={() => click(-1)} aria-label="Not helpful" aria-pressed={v === -1}>👎</button>
    </span>
  );
}

/** Thumbs and difficulty on a piece of content (scenario, card). Feeds content selection. */
export function ContentVote({ id, label = 'this question', drill }: { id: string; label?: string; drill?: DrillId }) {
  const current = useStore((s) => s.votes[id]);
  const [diff, setDiff] = useState<'easy' | 'hard' | null>(null);
  const click = (n: 1 | -1) => {
    const next = current === n ? 0 : n;
    vote(id, next);
    if (next) sendFeedback('content', { target: id, rating: next });
  };
  const difficulty = (d: 'easy' | 'hard') => {
    setDiff(d);
    sendFeedback('difficulty', { target: id, tags: [d] });
    if (drill) nudgeLevel(drill, d === 'easy' ? 1 : -1);
    toast(d === 'easy' ? 'Got it: harder ones coming.' : 'Got it: we\'ll ease off a little.');
  };
  return (
    <div className="row wrap small muted" style={{ gap: 6 }}>
      <span>Rate {label}:</span>
      <span className="thumbs">
        <button className={current === 1 ? 'on' : ''} onClick={() => click(1)} aria-label="Good" aria-pressed={current === 1}>👍</button>
        <button className={current === -1 ? 'on' : ''} onClick={() => click(-1)} aria-label="Don't show again" aria-pressed={current === -1}>👎</button>
      </span>
      {drill && (
        <>
          <button className="chip sm" aria-pressed={diff === 'easy'} onClick={() => difficulty('easy')}>Too easy</button>
          <button className="chip sm" aria-pressed={diff === 'hard'} onClick={() => difficulty('hard')}>Too hard</button>
        </>
      )}
    </div>
  );
}

/** Lets the user correct the speech-to-text result; the report re-scores from the corrected words. */
export function FixTranscript({ value, onSave }: { value: string; onSave: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  if (!open)
    return (
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setText(value); setOpen(true); }}>
        <Icon name="edit" />Fix transcript
      </button>
    );
  return (
    <div className="stack-sm">
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} aria-label="Corrected transcript" />
      <div className="row">
        <button className="btn sm" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn primary sm" onClick={() => { onSave(text.trim()); setOpen(false); }}>Save and re-score</button>
      </div>
      <span className="small muted">Corrections teach the app which words your phone mishears.</span>
    </div>
  );
}
