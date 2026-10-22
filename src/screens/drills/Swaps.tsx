import { useEffect, useMemo, useState } from 'react';
import { swapKey, type SwapCard } from '../../content/drills';
import { analyzeText, matchTarget, type MatchResult } from '../../engine/text';
import { prefetch } from '../../engine/tts';
import { buildSwapDeck, reviewCard, ruleLabel } from '../../learn/adapt';
import { getState, logActivity, setBest, useStore } from '../../store/store';
import { ContentVote } from '../../ui/Feedback';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { HearButton, TakeCompare } from '../../ui/TakeCompare';
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

export function SwapsDrill({ param, onClose }: { param?: string; onClose: () => void }) {
  const focus = param?.startsWith('habit:') ? param.slice(6) : undefined;
  const [deck, setDeck] = useState<SwapCard[]>(() => buildSwapDeck(getState(), ROUND, focus));
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [spoken, setSpoken] = useState(0);
  const [finished, setFinished] = useState(false);
  const mastered = useStore((s) => Object.entries(s.srs).filter(([k, v]) => k.startsWith('swap:') && v.box >= 4).length);

  useEffect(() => prefetch(deck.slice(i, i + 3).map((c) => c.strong)), [deck, i]);

  const restart = () => {
    setDeck(buildSwapDeck(getState(), ROUND, focus));
    setI(0);
    setRight(0);
    setSpoken(0);
    setFinished(false);
  };

  const title = focus ? `Habit: "${ruleLabel(focus)}"` : 'Word swaps';

  if (finished) {
    const pct = Math.round((right / deck.length) * 100);
    return (
      <SessionShell title={title} onClose={onClose} progress={1}>
        <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <ScoreRing value={pct} label="correct" />
          <h2>{right} of {deck.length} right</h2>
          <p className="muted">{spoken} said out loud. {mastered} cards mastered so far. Cards you missed come back sooner.</p>
        </section>
        <div className="foot">
          <button className="btn signal block" onClick={restart}><Icon name="refresh" />New round</button>
          <button className="btn block" onClick={onClose}>Done</button>
        </div>
      </SessionShell>
    );
  }

  return (
    <SessionShell title={title} onClose={onClose} progress={i / deck.length}>
      <Card
        key={i}
        card={deck[i]}
        onAnswer={(ok) => {
          reviewCard(swapKey(deck[i]), ok);
          if (ok) setRight((r) => r + 1);
        }}
        onSpoken={() => setSpoken((n) => n + 1)}
        onNext={() => {
          if (i + 1 >= deck.length) {
            logActivity('swaps', right * 4 + spoken * 2 + 5);
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
  const [take, setTake] = useState<Blob | null>(null);
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
          {!speakMode ? (
            <div className="row">
              <HearButton text={card.strong} className="btn quiet grow" />
              <button className="btn quiet grow" onClick={() => { setSpeakMode(true); setMatch(null); }}><Icon name="mic" />Say it</button>
            </div>
          ) : (
            <section className="card">
              <p className="script" style={{ fontSize: '1.2rem', color: 'var(--ink)' }}>
                {match ? match.words.map((w, k) => <span key={k} className={`w ${w.hit ? 'hit' : 'miss'}`}>{w.word} </span>) : card.strong}
              </p>
              {match && (
                <p className="small">
                  <b>{match.accuracy}% match.</b> {match.slip ? 'You slipped a weak word back in.' : match.accuracy >= 85 ? 'Nicely done.' : 'Try once more, slower.'}
                </p>
              )}
              <TakeCompare text={card.strong} take={take} />
              <MicStage
                size="sm"
                maxSec={10}
                needsTranscript
                showCanvas={false}
                showCounters={false}
                showTranscript={false}
                autoStopSilence={1.6}
                idleHint={match ? 'Tap to try again' : 'Tap and say the strong version'}
                onDone={(r) => {
                  setTake(r.audio);
                  const m = matchTarget(card.strong, r.transcript);
                  setMatch({ ...m, slip: analyzeText(r.transcript).weakCount > 0 });
                  if (m.accuracy >= 70) onSpoken();
                }}
              />
            </section>
          )}
          <ContentVote id={swapKey(card)} label="this card" />
          <div className="foot">
            <button className="btn primary block" onClick={onNext}>{last ? 'See results' : 'Next'}</button>
          </div>
        </>
      )}
    </div>
  );
}
