import { useMemo, useState } from 'react';
import { SWAPS, type SwapCard } from '../../content/drills';
import { analyzeText, matchTarget, type MatchResult } from '../../engine/text';
import { speak } from '../../engine/speech';
import { logActivity, setBest } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { SessionShell, ScoreRing } from '../../ui/ui';

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const ROUND = 8;

export function SwapsDrill({ onClose }: { onClose: () => void }) {
  const [deck, setDeck] = useState<SwapCard[]>(() => shuffle(SWAPS).slice(0, ROUND));
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [spoken, setSpoken] = useState(0);
  const [finished, setFinished] = useState(false);

  const restart = () => {
    setDeck(shuffle(SWAPS).slice(0, ROUND));
    setI(0);
    setRight(0);
    setSpoken(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((right / deck.length) * 100);
    return (
      <SessionShell title="Word swaps" onClose={onClose} progress={1}>
        <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <ScoreRing value={pct} label="correct" />
          <h2>{right} of {deck.length} right</h2>
          <p className="muted">{spoken} said out loud. {pct === 100 ? 'Perfect round.' : 'Replay to lock these in. Repetition is what makes them automatic.'}</p>
        </section>
        <div className="foot">
          <button className="btn signal block" onClick={restart}><Icon name="refresh" />New round</button>
          <button className="btn block" onClick={onClose}>Done</button>
        </div>
      </SessionShell>
    );
  }

  return (
    <SessionShell title="Word swaps" onClose={onClose} progress={i / deck.length}>
      <Card
        key={i}
        card={deck[i]}
        onAnswer={(ok) => ok && setRight((r) => r + 1)}
        onSpoken={() => setSpoken((n) => n + 1)}
        onNext={() => {
          if (i + 1 >= deck.length) {
            const xp = right * 4 + spoken * 2 + 5;
            logActivity('swaps', xp);
            setBest('swaps', Math.round((right / deck.length) * 100));
            setFinished(true);
          } else setI(i + 1);
        }}
        last={i + 1 >= deck.length}
      />
    </SessionShell>
  );
}

function Card({ card, onAnswer, onSpoken, onNext, last }: { card: SwapCard; onAnswer: (ok: boolean) => void; onSpoken: () => void; onNext: () => void; last: boolean }) {
  const options = useMemo(() => shuffle([card.strong, ...card.wrong]), [card]);
  const [picked, setPicked] = useState<string | null>(null);
  const [speakMode, setSpeakMode] = useState(false);
  const [match, setMatch] = useState<(MatchResult & { slip: boolean }) | null>(null);
  const ok = picked === card.strong;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <span className="eyebrow">Instead of</span>
        <p className="strike">{card.weak}</p>
        <span className="eyebrow">Say</span>
        <div className="stack-sm" style={{ gap: 8 }}>
          {options.map((o) => (
            <button
              key={o}
              className={`opt${picked ? (o === card.strong ? ' right' : o === picked ? ' wrong' : ' dim') : ''}`}
              disabled={!!picked}
              onClick={() => {
                setPicked(o);
                onAnswer(o === card.strong);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </section>
      {picked && (
        <>
          <div className={`note ${ok ? 'good' : 'bad'}`}>
            <b>{ok ? 'Right.' : 'Not quite.'}</b>
            {card.why}
          </div>
          <div className="row">
            <button className="btn quiet grow" onClick={() => speak(card.strong)}><Icon name="speaker" />Hear it</button>
            <button className="btn quiet grow" onClick={() => { setSpeakMode(true); setMatch(null); }}><Icon name="mic" />Say it</button>
          </div>
          {speakMode && (
            <section className="card">
              <p className="script" style={{ fontSize: '1.2rem' }}>
                {match
                  ? match.words.map((w, k) => <span key={k} className={`w ${w.hit ? 'hit' : 'miss'}`}>{w.word} </span>)
                  : card.strong}
              </p>
              {match && (
                <p className="small">
                  <b>{match.accuracy}% match.</b> {match.slip ? 'You slipped a weak word back in.' : match.accuracy >= 85 ? 'Nicely done.' : 'Try once more, slower.'}
                </p>
              )}
              <MicStage
                size="sm"
                modeOverride="transcript"
                maxSec={10}
                record={false}
                showCanvas={false}
                showCounters={false}
                showTranscript={false}
                autoStopSilence={1.6}
                idleHint="Tap and say the strong version"
                onDone={(r) => {
                  const m = matchTarget(card.strong, r.transcript);
                  setMatch({ ...m, slip: analyzeText(r.transcript).weakCount > 0 });
                  if (m.accuracy >= 70) onSpoken();
                }}
              />
            </section>
          )}
          <div className="foot">
            <button className="btn primary block" onClick={onNext}>{last ? 'See results' : 'Next'}</button>
          </div>
        </>
      )}
    </div>
  );
}
