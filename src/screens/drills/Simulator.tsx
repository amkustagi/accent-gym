import { useEffect, useMemo, useState } from 'react';
import { BASELINE, SCENARIOS, type CategoryId, type Scenario } from '../../content/scenarios';
import type { CaptureResult } from '../../engine/capture';
import { STT_HELP } from '../../engine/speech';
import { speak, stopSpeaking } from '../../engine/tts';
import { LEVEL_LABEL, levelFor, nextScenario, recordScore } from '../../learn/adapt';
import { upcomingScenario } from '../../learn/learner';
import { aiAvailable, followUp, freshScenarios } from '../../lib/ai';
import { isPro } from '../../lib/backend';
import { canStartRound, requirePro } from '../../lib/gate';
import { scoreAndSave, tooShort } from '../../lib/session';
import { getState, skillAverages, useStore, type SessionRecord } from '../../store/store';
import { ContentVote } from '../../ui/Feedback';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { Report } from '../../ui/Report';
import { SessionShell, scoreTone } from '../../ui/ui';

type RoundDrill = 'simulator' | 'pressure' | 'structure' | 'baseline' | 'roleplay';

function ScenarioCard({ scenario, drill }: { scenario: Scenario; drill: RoundDrill }) {
  const generated = scenario.id.startsWith('g:') || scenario.id.startsWith('ai:');
  return (
    <section className="card">
      <div className="row spread">
        <span className="eyebrow">{scenario.secs} seconds</span>
        {generated && <span className="pill brand">{scenario.id.startsWith('ai:') ? 'Fresh from AI' : scenario.category === 'impromptu' || scenario.category === 'interview' ? 'New for you' : 'From your world'}</span>}
      </div>
      <p className="small muted" style={{ marginTop: -4 }}>{scenario.context}</p>
      <h2>{scenario.prompt}</h2>
      <div className="stack-sm">
        <span className="eyebrow">Structure</span>
        <div className="row wrap" style={{ gap: 6 }}>
          {scenario.frame.map((f, i) => (
            <span key={f} className="pill brand">{i + 1}. {f}</span>
          ))}
        </div>
      </div>
      {drill !== 'baseline' && <ContentVote id={scenario.id} drill={drill === 'structure' ? 'structure' : 'simulator'} />}
    </section>
  );
}

/** Speaking round: prompt → (prep) → record → report → optional AI follow-ups. */
export function SpeakRound({ scenario, pressure, drill, onClose, onNext, closeLabel }: { scenario: Scenario; pressure?: boolean; drill: RoundDrill; onClose: () => void; onNext?: () => void; closeLabel?: string }) {
  const [phase, setPhase] = useState<'brief' | 'prep' | 'speak' | 'report' | 'followup'>(pressure ? 'prep' : 'brief');
  const [prepLeft, setPrepLeft] = useState(pressure ? Math.max(5, 12 - levelFor(getState(), 'pressure') * 2) : 10);
  const [result, setResult] = useState<{ rec: SessionRecord; xp: number; note: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const compare = useMemo(() => skillAverages(getState()), []);
  const ai = useStore((s) => aiAvailable(s));

  useEffect(() => {
    if (phase !== 'prep') return;
    const id = setInterval(() => setPrepLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === 'prep' && prepLeft === 0) {
      setPhase('speak');
      setPrepLeft(10);
    }
  }, [phase, prepLeft]);

  const begin = (next: 'speak' | 'prep') => {
    if (drill !== 'baseline' && !canStartRound()) return;
    setPhase(next);
  };

  const done = async (r: CaptureResult) => {
    const short = tooShort(r);
    if (short) {
      setError(short);
      return;
    }
    setError(null);
    const { rec, xp } = await scoreAndSave(r, { drill, title: scenario.prompt, itemId: scenario.id, category: scenario.category });
    if (drill !== 'baseline') recordScore(drill === 'roleplay' ? 'simulator' : drill, rec.overall);
    const note = r.sttError ? `${STT_HELP[r.sttError]} Voice metrics were still measured.` : !r.voice ? 'Voice metrics (pauses, pitch) need the full listening mode.' : null;
    setResult({ rec, xp, note });
    setPhase('report');
  };

  if (phase === 'followup' && result) return <FollowUps scenario={scenario} firstAnswer={result.rec.transcript} onFinish={onNext ?? onClose} />;

  if (phase === 'report' && result)
    return (
      <Report
        rec={result.rec}
        xp={result.xp}
        prompt={scenario.prompt}
        frame={scenario.frame}
        compare={compare}
        sttNote={result.note}
        extraAction={
          drill !== 'baseline' && result.rec.metrics.words >= 15 ? (
            <section className="card sunken">
              <div className="row spread">
                <h3>Handle a follow-up</h3>
                {!ai && <span className="pill">Pro</span>}
              </div>
              <p className="small muted">The other person asks a realistic follow-up question out loud. Answer it like you would in the room.</p>
              <button className="btn primary" onClick={() => (ai ? setPhase('followup') : requirePro('Follow-up questions use AI'))}>
                <Icon name="chat" />Take a follow-up question
              </button>
            </section>
          ) : undefined
        }
        onRetry={() => {
          setResult(null);
          begin('speak');
        }}
        onDone={onNext ?? onClose}
        doneLabel={closeLabel ?? (onNext ? 'Next scenario' : 'Done')}
      />
    );

  return (
    <div className="stack" style={{ gap: 16 }}>
      <ScenarioCard scenario={scenario} drill={drill} />
      {phase === 'brief' && (
        <div className="stack">
          <div className="note">
            <b>Before you start</b>
            Plan your first sentence. Speak to one person. Pause instead of saying "um".
          </div>
          <button className="btn signal block" onClick={() => begin('speak')}>
            <Icon name="mic" />I'm ready
          </button>
          <button className="btn quiet block" onClick={() => begin('prep')}>Give me 10 seconds to prepare</button>
          {onNext && <button className="btn ghost block" onClick={onNext}>Skip this one</button>}
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
          <MicStage maxSec={scenario.secs} onDone={done} needsTranscript autoStart idleHint="Tap the mic and answer out loud" />
          {error && <div className="note bad"><b>Let's try that again</b>{error}</div>}
        </>
      )}
    </div>
  );
}

/** AI role-play: the other person asks follow-up questions; each answer is scored. */
function FollowUps({ scenario, firstAnswer, onFinish }: { scenario: Scenario; firstAnswer: string; onFinish: () => void }) {
  const [turns, setTurns] = useState<{ q: string; a: string; score?: number }[]>([{ q: scenario.prompt, a: firstAnswer }]);
  const [current, setCurrent] = useState<{ question: string; persona: string } | null>(null);
  const [state, setState] = useState<'loading' | 'ask' | 'scored' | 'error'>('loading');
  const [last, setLast] = useState<{ rec: SessionRecord } | null>(null);
  const [err, setErr] = useState('');
  const MAX = 3;

  const ask = async (history: typeof turns) => {
    setState('loading');
    try {
      const q = await followUp({ scenario, turns: history.map(({ q, a }) => ({ q, a })) });
      setCurrent(q);
      setState('ask');
      void speak(q.question);
    } catch (e) {
      setErr((e as Error).message);
      setState('error');
    }
  };
  useEffect(() => {
    void ask(turns);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answered = async (r: CaptureResult) => {
    if (!current) return;
    const short = tooShort(r);
    if (short) {
      setErr(short);
      return;
    }
    setErr('');
    const { rec } = await scoreAndSave(r, { drill: 'roleplay', title: `Follow-up: ${current.question}`, itemId: `${scenario.id}:f${turns.length}`, category: scenario.category });
    const next = [...turns, { q: current.question, a: r.transcript, score: rec.overall }];
    setTurns(next);
    setLast({ rec });
    setState('scored');
  };

  const followups = turns.slice(1);
  return (
    <div className="stack" style={{ gap: 14 }}>
      <section className="card sunken tight">
        <span className="eyebrow">Your answer</span>
        <p className="small">{scenario.prompt}</p>
      </section>
      {followups.map((t, i) => (
        <section key={i} className="card tight">
          <div className="row spread">
            <span className="eyebrow">Follow-up {i + 1}</span>
            {t.score !== undefined && <span className="pill" style={{ color: scoreTone(t.score) }}>{t.score}</span>}
          </div>
          <p><b>{t.q}</b></p>
        </section>
      ))}
      {state === 'loading' && <div className="note">They're thinking of a question…</div>}
      {state === 'error' && <div className="note bad"><b>Couldn't get a question</b>{err}</div>}
      {state === 'ask' && current && (
        <>
          <section className="card hero">
            <span className="eyebrow">{current.persona} asks</span>
            <p style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', fontWeight: 600, lineHeight: 1.35 }}>{current.question}</p>
            <button className="btn sm" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,.15)', color: '#fff', border: 0 }} onClick={() => void speak(current.question)}>
              <Icon name="speaker" />Hear again
            </button>
          </section>
          <MicStage maxSec={60} onDone={answered} needsTranscript idleHint="Tap and answer" autoStopSilence={4} />
          {err && <div className="note bad">{err}</div>}
        </>
      )}
      {state === 'scored' && last && (
        <section className="card">
          <div className="row spread">
            <h3>Answer scored</h3>
            <span className="pill" style={{ color: scoreTone(last.rec.overall) }}>{last.rec.overall}</span>
          </div>
          {(last.rec.tips ?? []).filter((t) => t.severity !== 'good').slice(0, 2).map((t, i) => (
            <p key={i} className="small"><b>{t.title}.</b> {t.body}</p>
          ))}
        </section>
      )}
      <div className="foot">
        {state === 'scored' && followups.length < MAX && (
          <button className="btn signal block" onClick={() => void ask(turns)}><Icon name="chat" />Next question</button>
        )}
        <button className="btn block" onClick={onFinish}>{followups.length >= MAX ? 'Finish conversation' : 'Done'}</button>
      </div>
    </div>
  );
}

export function SimulatorDrill({ param, pressure, onClose }: { param?: string; pressure?: boolean; onClose: () => void }) {
  const pro = useStore((s) => isPro(s));
  const first = (): Scenario => {
    if (param === 'upcoming') {
      const up = upcomingScenario(getState().learner);
      if (up) return up;
    }
    if (param && !param.startsWith('cat:')) {
      const found = SCENARIOS.find((s) => s.id === param);
      if (found) return found;
    }
    const category = param?.startsWith('cat:') ? (param.slice(4) as CategoryId) : undefined;
    return nextScenario({ category, allowGenerated: pro, drill: pressure ? 'pressure' : 'simulator' });
  };
  const [scenario, setScenario] = useState<Scenario>(first);
  const [key, setKey] = useState(0);
  const level = useStore((s) => levelFor(s, pressure ? 'pressure' : 'simulator'));
  return (
    <SessionShell title={pressure ? 'Pressure round' : 'Meeting simulator'} onClose={onClose} right={<span className="pill" title="Difficulty adapts to your scores">{LEVEL_LABEL[level - 1]}</span>}>
      <SpeakRound
        key={key}
        scenario={scenario}
        pressure={pressure}
        drill={pressure ? 'pressure' : 'simulator'}
        onClose={onClose}
        onNext={() => {
          const category = param?.startsWith('cat:') ? (param.slice(4) as CategoryId) : undefined;
          setScenario(nextScenario({ category, allowGenerated: pro, drill: pressure ? 'pressure' : 'simulator', exclude: scenario.id }));
          setKey((k) => k + 1);
        }}
      />
    </SessionShell>
  );
}

/** Standalone AI conversation: one scenario, then up to three follow-up questions. */
export function RolePlayDrill({ onClose }: { onClose: () => void }) {
  const ai = useStore((s) => aiAvailable(s));
  const [scenario, setScenario] = useState<Scenario>(() => nextScenario({ allowGenerated: true, drill: 'simulator' }));
  const [key, setKey] = useState(0);
  const [fresh, setFresh] = useState<'idle' | 'loading' | 'error'>('idle');
  if (!ai)
    return (
      <SessionShell title="AI conversation" onClose={onClose}>
        <section className="card">
          <h2>Practice real back-and-forth</h2>
          <p className="muted">You answer a scenario, then an AI plays your manager, client or interviewer and asks follow-up questions out loud. Every answer is scored.</p>
          <button className="btn signal" onClick={() => requirePro('AI conversations')}>Unlock with Pro</button>
          <p className="small muted">Or add your own Anthropic API key in Settings › AI coach.</p>
        </section>
      </SessionShell>
    );
  return (
    <SessionShell title="AI conversation" onClose={onClose}>
      <button
        className="btn quiet sm"
        style={{ alignSelf: 'flex-start' }}
        disabled={fresh === 'loading'}
        onClick={async () => {
          setFresh('loading');
          try {
            const [s] = await freshScenarios(1);
            setScenario(s);
            setKey((k) => k + 1);
            setFresh('idle');
          } catch {
            setFresh('error');
          }
        }}
      >
        <Icon name="sparkle" />{fresh === 'loading' ? 'Writing a scenario…' : 'Write me a fresh scenario'}
      </button>
      {fresh === 'error' && <div className="note bad">Couldn't write a new scenario. Using one from the library.</div>}
      <SpeakRound key={key} scenario={scenario} drill="roleplay" onClose={onClose} onNext={() => { setScenario(nextScenario({ allowGenerated: true, exclude: scenario.id })); setKey((k) => k + 1); }} />
    </SessionShell>
  );
}

export function BaselineRound({ onDone }: { onDone: () => void }) {
  return <SpeakRound scenario={BASELINE} drill="baseline" onClose={onDone} closeLabel="Continue" />;
}
