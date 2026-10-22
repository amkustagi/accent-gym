import { useEffect } from 'react';
import { setState } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell } from '../ui/ui';

const ITEMS: [string, string, string][] = [
  ['ear', 'Listening tests have an end', 'Each test is now a round of 10 that covers every word pair, then shows your score and what to do next.'],
  ['mic', 'Fewer microphone prompts', 'The microphone stays ready between takes, and Ready or Start buttons begin listening right away.'],
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
