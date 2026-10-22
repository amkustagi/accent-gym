import { useEffect } from 'react';
import { setState } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell } from '../ui/ui';

const ITEMS: [string, string, string][] = [
  ['speaker', 'A human-sounding voice', 'A natural AI voice that runs on your phone, plus playback that now works on iPhone after you record.'],
  ['play', 'Hear yourself next to the model', 'Every "say it" drill records your take: tap My take, then Model, and compare.'],
  ['refresh', 'Never-ending scenarios', 'Thousands of prompts written for your role and industry, and 12 meeting categories.'],
  ['target', 'It learns you', 'Difficulty adapts to your scores, cards you miss come back sooner, and your own habits ("just", "basically") become targeted drills.'],
  ['chat', 'AI conversations', 'Answer, then handle realistic follow-up questions spoken out loud.'],
  ['message', 'Tell us what you think', 'Rate every report, thumbs on tips and questions, fix a transcript, report problems with one tap.'],
  ['user', 'Accounts and Pro', 'Sign in with your email to sync across devices. Pro monthly or lifetime.'],
];

export function WhatsNew({ onClose }: { onClose: () => void }) {
  useEffect(() => setState((s) => ({ ...s, lastSeenVersion: __APP_VERSION__ })), []);
  return (
    <SessionShell title={`What's new in v${__APP_VERSION__}`} onClose={onClose}>
      <div className="stack" style={{ gap: 14 }}>
        {ITEMS.map(([icon, title, body]) => (
          <div key={title} className="row" style={{ alignItems: 'flex-start' }}>
            <span className="ic" style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)', flex: '0 0 auto' }}>
              <Icon name={icon} size={22} />
            </span>
            <div className="stack-sm">
              <b>{title}</b>
              <span className="small muted">{body}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="foot"><button className="btn primary block" onClick={onClose}>Got it</button></div>
    </SessionShell>
  );
}
