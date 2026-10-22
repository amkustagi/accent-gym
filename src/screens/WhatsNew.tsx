import { useEffect } from 'react';
import { setState } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell } from '../ui/ui';

const ITEMS: [string, string, string][] = [
  ['globe', 'Accent Coach', 'Pick American, British, Australian or Canadian English and say how you speak today. You get a sound map built for your starting point.'],
  ['mic', '2-minute accent check', 'Read 9 short sentences and see which sounds to fix first, scored in your target accent.'],
  ['mouth', 'Two dozen sound lessons per accent', 'How to make each sound in that accent, listening tests, words and sentences, with a model voice in the accent you chose.'],
  ['wave', 'Shadowing', 'Repeat a native speaker and see your melody drawn over theirs.'],
  ['target', 'Precise accent scoring (Pro)', 'Every word, and for American English every sound, scored against native speakers by Microsoft.'],
  ['trophy', 'Weekly report card', 'Your week in one shareable image: progress, habits, sounds and next week\'s focus.'],
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
