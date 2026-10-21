import { useState } from 'react';
import { CONCISION, SCENARIOS, type Scenario } from '../../content/scenarios';
import type { CaptureResult } from '../../engine/capture';
import { overallOf } from '../../engine/score';
import { scoreAndSave, tooShort } from '../../lib/session';
import type { SessionRecord } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { Report } from '../../ui/Report';
import { Seg, SessionShell } from '../../ui/ui';
import { SpeakRound } from './Simulator';

const FRAMEWORKS = [
  { id: 'bluf', name: 'BLUF', full: 'Bottom line up front', steps: ['Answer first', 'Two supporting points', 'Restate the ask'], when: 'Updates, decisions, bad news', cats: ['update', 'problem'] },
  { id: 'prep', name: 'PREP', full: 'Point, Reason, Example, Point', steps: ['Point', 'Reason', 'Example', 'Point again'], when: 'Opinions, "what do you think?"', cats: ['impromptu', 'influence'] },
  { id: 'star', name: 'STAR', full: 'Situation, Task, Action, Result', steps: ['Situation', 'Task', 'Action', 'Result'], when: 'Stories, interviews, examples', cats: ['interview'] },
] as const;

type Fw = (typeof FRAMEWORKS)[number];

export function StructureDrill({ onClose }: { onClose: () => void }) {
  const [fwId, setFwId] = useState<Fw['id']>('bluf');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [n, setN] = useState(0);
  const fw = FRAMEWORKS.find((f) => f.id === fwId)!;
  const pick = () => {
    const pool = SCENARIOS.filter((s) => (fw.cats as readonly string[]).includes(s.category));
    const s = pool[Math.floor(Math.random() * pool.length)];
    setScenario({ ...s, frame: [...fw.steps] });
    setN((k) => k + 1);
  };

  return (
    <SessionShell title="Structure" onClose={onClose}>
      {!scenario ? (
        <div className="stack" style={{ gap: 16 }}>
          <Seg label="Framework" value={fwId} onChange={setFwId} options={FRAMEWORKS.map((f) => ({ v: f.id, label: f.name }))} />
          <section className="card">
            <span className="eyebrow">{fw.when}</span>
            <h2>{fw.full}</h2>
            <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
              {fw.steps.map((s) => <li key={s}><b>{s}</b></li>)}
            </ol>
            <p className="small muted">You'll get a real scenario. Follow the steps in order, out loud. Keep each step to one or two sentences.</p>
          </section>
          <div className="foot">
            <button className="btn signal block" onClick={pick}><Icon name="mic" />Give me a scenario</button>
          </div>
        </div>
      ) : (
        <SpeakRound key={n} scenario={scenario} drill="structure" onClose={onClose} onNext={pick} closeLabel="Another scenario" />
      )}
    </SessionShell>
  );
}

export function ConcisionDrill({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * CONCISION.length));
  const [res, setRes] = useState<{ rec: SessionRecord; xp: number; words: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const c = CONCISION[idx];

  const done = async (r: CaptureResult) => {
    const short = tooShort(r);
    if (short) return setErr(short);
    setErr(null);
    const words = r.transcript.trim().split(/\s+/).filter(Boolean).length;
    const over = Math.max(0, words - c.maxWords);
    const { rec, xp } = await scoreAndSave(r, {
      drill: 'concision',
      title: c.prompt,
      extra: { 'word budget': `${words}/${c.maxWords}` },
      adjust: (ev) => {
        const scores = { ...ev.scores, language: Math.max(0, (ev.scores.language ?? 100) - over * 3) };
        const tips = over
          ? [{ skill: 'language' as const, severity: 'fix' as const, title: `${over} words over budget`, body: 'Cut the warm-up. Start with the point and stop when it\'s made.' }, ...ev.tips]
          : [{ skill: 'language' as const, severity: 'good' as const, title: 'Inside the word budget', body: 'Short and complete. That\'s the skill.' }, ...ev.tips];
        return { ...ev, scores, overall: overallOf(scores), tips };
      },
    });
    setRes({ rec, xp, words });
  };

  return (
    <SessionShell title="Say it short" onClose={onClose}>
      {res ? (
        <Report
          rec={res.rec}
          xp={res.xp}
          prompt={c.prompt}
          onRetry={() => setRes(null)}
          onDone={() => {
            setIdx((idx + 1) % CONCISION.length);
            setRes(null);
          }}
          doneLabel="Next challenge"
        >
          <section className="card">
            <span className="eyebrow">Word budget</span>
            <div className="progress" style={{ height: 14 }}>
              <i style={{ width: `${Math.min(100, (res.words / c.maxWords) * 100)}%`, background: res.words > c.maxWords ? 'var(--bad)' : 'var(--good)' }} />
            </div>
            <p className="small">{res.words} words used of {c.maxWords}.</p>
          </section>
        </Report>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <span className="eyebrow">{c.secs} seconds · max {c.maxWords} words</span>
            <h2>{c.prompt}</h2>
            <p className="small muted">Point first. One reason. Stop.</p>
          </section>
          <MicStage maxSec={c.secs} onDone={done} />
          {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
        </div>
      )}
    </SessionShell>
  );
}
