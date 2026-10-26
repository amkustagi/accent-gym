import { useEffect } from 'react';
import { setState } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell } from '../ui/ui';

const ITEMS: [string, string, string][] = [
  ['sparkle', 'Speak Sharp is now Speakco', 'Same app, same progress, new name. Your history and settings are all still here.'],
  ['book', '6 courses, 36 lessons', 'Confidence, presence, storytelling, hard conversations, people skills and meetings, each practiced out loud.'],
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
