import { useEffect } from 'react';
import { setState } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell } from '../ui/ui';

const ITEMS: [string, string, string][] = [
  ['home', 'A calmer Today', 'Just your plan, your next lesson and one tip. Level, challenges and your skill profile now live in Progress.'],
  ['book', 'Practice, sorted', 'Switch between Courses, Drills and Lessons at the top instead of scrolling one long list.'],
  ['mic', 'Speakco for iPhone and Android', 'Speakco is ready to install from the App Store and Google Play, with the phone\'s own speech recognition and in-app purchases.'],
]

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
