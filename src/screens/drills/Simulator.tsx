import { useEffect, useMemo, useState } from 'react';
import { BASELINE, SCENARIOS, type Scenario } from '../../content/scenarios';
import type { CaptureResult } from '../../engine/capture';
import { STT_HELP } from '../../engine/speech';
import { scoreAndSave, tooShort } from '../../lib/session';
import { getState, skillAverages, type SessionRecord } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { Report } from '../../ui/Report';
import { SessionShell } from '../../ui/ui';

const pick = (exclude?: string) => {
  const pool = SCENARIOS.filter((s) => s.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
};

/** Speaking round: prompt → (prep) → record → report. Used by the simulator, pressure round, structure drill and baseline. */
export function SpeakRound({ scenario, pressure, drill, onClose, onNext, closeLabel }: { scenario: Scenario; pressure?: boolean; drill: 'simulator' | 'pressure' | 'structure' | 'baseline'; onClose: () => void; onNext?: () => void; closeLabel?: string }) {
  const [phase, setPhase] = useState<'brief' | 'prep' | 'speak' | 'report'>(pressure ? 'prep' : 'brief');
  const [prepLeft, setPrepLeft] = useState(10);
  const [result, setResult] = useState<{ rec: SessionRecord; xp: number; note: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const compare = useMemo(() => skillAverages(getState()), []);

  useEffect(() => {
    if (phase !== 'prep') return;
    setPrepLeft(10);
    const id = setInterval(() => setPrepLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === 'prep' && prepLeft === 0) {
      setPhase('speak');
      setPrepLeft(10);
    }
  }, [phase, prepLeft]);

  const done = async (r: CaptureResult) => {
    const short = tooShort(r);
    if (short) {
      setError(short);
      return;
    }
    setError(null);
    const { rec, xp } = await scoreAndSave(r, { drill, title: scenario.prompt });
    const note = r.sttError ? `${STT_HELP[r.sttError]} Voice metrics were still measured.` : !r.voice ? 'Voice metrics (pauses, pitch) need the full listening mode.' : null;
    setResult({ rec, xp, note });
    setPhase('report');
  };

  if (phase === 'report' && result)
    return (
      <Report
        rec={result.rec}
        xp={result.xp}
        prompt={scenario.prompt}
        frame={scenario.frame}
        compare={compare}
        sttNote={result.note}
        onRetry={() => {
          setResult(null);
          setPhase('speak');
        }}
        onDone={onNext ?? onClose}
        doneLabel={closeLabel ?? (onNext ? 'Next scenario' : 'Done')}
      />
    );

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <span className="eyebrow">{scenario.context} · {scenario.secs} seconds</span>
        <h2>{scenario.prompt}</h2>
        <div className="stack-sm">
          <span className="eyebrow">Structure</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {scenario.frame.map((f, i) => (
              <span key={f} className="pill brand">
                {i + 1}. {f}
              </span>
            ))}
          </div>
        </div>
      </section>
      {phase === 'brief' && (
        <div className="stack">
          <div className="note">
            <b>Before you start</b>
            Plan your first sentence. Speak to one person. Pause instead of saying "um".
          </div>
          <button className="btn signal block" onClick={() => setPhase('speak')}>
            <Icon name="mic" />
            I'm ready
          </button>
          <button className="btn quiet block" onClick={() => setPhase('prep')}>
            Give me 10 seconds to prepare
          </button>
        </div>
      )}
      {phase === 'prep' && (
        <div className="stage">
          <span className="eyebrow">Prepare</span>
          <div className="bigword num">{prepLeft}</div>
          <p className="muted small" style={{ textAlign: 'center' }}>Decide your first sentence. The mic opens automatically.</p>
          <button className="btn quiet" onClick={() => setPhase('speak')}>Start now</button>
        </div>
      )}
      {phase === 'speak' && (
        <>
          <MicStage maxSec={scenario.secs} onDone={done} idleHint="Tap the mic and answer out loud" />
          {error && <div className="note bad"><b>Let's try that again</b>{error}</div>}
        </>
      )}
    </div>
  );
}

export function SimulatorDrill({ param, pressure, onClose }: { param?: string; pressure?: boolean; onClose: () => void }) {
  const [scenario, setScenario] = useState<Scenario>(() => (param ? SCENARIOS.find((s) => s.id === param) ?? pick() : pick()));
  const [key, setKey] = useState(0);
  return (
    <SessionShell title={pressure ? 'Pressure round' : 'Meeting simulator'} onClose={onClose}>
      <SpeakRound
        key={key}
        scenario={scenario}
        pressure={pressure}
        drill={pressure ? 'pressure' : 'simulator'}
        onClose={onClose}
        onNext={() => {
          setScenario(pick(scenario.id));
          setKey((k) => k + 1);
        }}
      />
    </SessionShell>
  );
}

export function BaselineRound({ onDone }: { onDone: () => void }) {
  return <SpeakRound scenario={BASELINE} drill="baseline" onClose={onDone} closeLabel="Continue" />;
}
