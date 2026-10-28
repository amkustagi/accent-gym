import { useState } from 'react';
import { sendFeedback } from '../lib/feedback';
import { setState } from '../store/store';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/ui';

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
