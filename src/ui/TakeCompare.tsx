import { useEffect, useState } from 'react';
import { playBlob, speak, stopSpeaking } from '../engine/tts';
import { Icon } from './Icon';

/** Side-by-side buttons: hear the model, hear your own last take. */
export function TakeCompare({ text, take, rate = 1, modelLabel = 'Model' }: { text: string; take: Blob | null; rate?: number; modelLabel?: string }) {
  const [playing, setPlaying] = useState<'model' | 'mine' | null>(null);
  useEffect(() => () => stopSpeaking(), []);
  const model = () => {
    if (playing === 'model') return stopSpeaking();
    setPlaying('model');
    void speak(text, { rate, onEnd: () => setPlaying(null) });
  };
  const mine = () => {
    if (!take) return;
    if (playing === 'mine') return stopSpeaking();
    setPlaying('mine');
    playBlob(take, { onEnd: () => setPlaying(null) });
  };
  return (
    <div className="row">
      <button className={`btn quiet grow${playing === 'model' ? ' on' : ''}`} onClick={model} aria-pressed={playing === 'model'}>
        <Icon name={playing === 'model' ? 'stop' : 'speaker'} />
        {modelLabel}
      </button>
      <button className={`btn quiet grow${playing === 'mine' ? ' on' : ''}`} onClick={mine} disabled={!take} aria-pressed={playing === 'mine'}>
        <Icon name={playing === 'mine' ? 'stop' : 'play'} />
        My take
      </button>
    </div>
  );
}

/** One "hear it" button that toggles. */
export function HearButton({ text, rate = 1, label = 'Hear it', className = 'btn quiet sm' }: { text: string; rate?: number; label?: string; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  return (
    <button
      className={className}
      style={{ alignSelf: 'flex-start' }}
      aria-pressed={on}
      onClick={() => {
        if (on) {
          stopSpeaking();
          setOn(false);
          return;
        }
        setOn(true);
        void speak(text, { rate, onEnd: () => setOn(false) });
      }}
    >
      <Icon name={on ? 'stop' : 'speaker'} />
      {label}
    </button>
  );
}
