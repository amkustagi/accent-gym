// The user's Tiny Hustler coach saying something: animated avatar, a speech bubble, and its voice.
import { useEffect, useRef, useState } from 'react';
import { COACHES, coachById, type CoachId } from '../content/coaches';
import { speak, stopSpeaking } from '../engine/tts';
import { updateSettings, useStore } from '../store/store';
import { CoachAvatar, type CoachMode } from './CoachAvatar';
import { Icon } from './Icon';

/** Avatar + bubble. Speaks the line once when `autoSpeak` is on and the user allows it. */
export function CoachSays({ text, autoSpeak = false, mode, size = 84, children }: { text: string; autoSpeak?: boolean; mode?: CoachMode; size?: number; children?: React.ReactNode }) {
  const id = useStore((s) => s.settings.coach);
  const allowSpeak = useStore((s) => s.settings.coachSpeaks);
  const c = coachById(id);
  const [talking, setTalking] = useState(false);
  const spoke = useRef<string | null>(null);
  const mine = useRef(false);

  const say = () => {
    mine.current = true;
    void speak(text, { voice: c.voice, onStart: () => setTalking(true), onEnd: () => setTalking(false) });
  };

  useEffect(() => {
    if (!autoSpeak || !allowSpeak || !text || spoke.current === text) return;
    spoke.current = text;
    const t = window.setTimeout(say, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoSpeak, allowSpeak]);

  useEffect(() => () => {
    if (mine.current) stopSpeaking();
  }, []);

  return (
    <section className="coach-says" style={{ ['--coach' as string]: c.color }}>
      <button type="button" className="coach-avatar" onClick={talking ? () => stopSpeaking() : say} aria-label={talking ? `Stop ${c.name}` : `Hear ${c.name} say it`}>
        <CoachAvatar id={c.id} mode={talking ? 'talking' : mode ?? 'idle'} size={size} />
      </button>
      <div className="coach-bubble">
        <span className="eyebrow">{c.name}</span>
        <p aria-live="polite">{text}</p>
        {children}
        <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start', paddingInline: 0 }} onClick={talking ? () => stopSpeaking() : say}>
          <Icon name={talking ? 'stop' : 'play'} size={16} />{talking ? 'Stop' : 'Hear it'}
        </button>
      </div>
    </section>
  );
}

/** Three coach cards to choose from. */
export function CoachPicker({ onPick }: { onPick?: (id: CoachId) => void }) {
  const current = useStore((s) => s.settings.coach);
  return (
    <div className="coach-grid" role="radiogroup" aria-label="Choose your coach">
      {COACHES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={current === c.id}
          className="coach-card"
          style={{ ['--coach' as string]: c.color }}
          onClick={() => {
            updateSettings({ coach: c.id });
            onPick?.(c.id);
            void speak(c.hello[0], { voice: c.voice });
          }}
        >
          <CoachAvatar id={c.id} size={72} />
          <b>{c.name}</b>
          <span className="small muted">{c.role}</span>
        </button>
      ))}
    </div>
  );
}
