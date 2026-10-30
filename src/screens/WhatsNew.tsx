import { useEffect } from 'react';
import { setState } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell } from '../ui/ui';

const ITEMS: [string, string, string][] = [
  ['home', 'A calmer Today', 'Today is now your plan and one suggestion for what to do next. Setup is one card, and your stats moved to Progress.'],
  ['chat', 'Real back-and-forth', 'Practice › Conversation now works for everyone. They ask a follow-up out loud, the mic opens when they finish, and the questions react to what you said: no point, hedging, no number or date. You end with a debrief of the whole conversation.'],
  ['speaker', 'Your coach is heard, not just seen', 'On iPhone the coach could move its mouth with no sound. It now only animates when its voice is really playing, and shows "Tap to hear" when the phone needs a tap first.'],
  ['send', 'Report in one tap', 'Tap the flag, say what happened, tap Send. AI writes it up as a clear ticket and it goes straight to the team, with your screenshot.'],
  ['user', 'Meet your coach', 'Pick Hustle, Mira or Pip in Settings. Your coach greets you on Today and tells you, out loud, what to fix after each lesson.'],
  ['target', 'New course: Get to the point', 'Six lessons on saying the important thing first: point first, point–reason–example, say it in half, yes or no first, the director\'s ask, and rehearsing your real meeting.'],
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
