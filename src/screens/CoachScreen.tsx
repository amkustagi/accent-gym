import { useMemo, useState } from 'react';
import { DRILLS } from '../content/catalog';
import { SKILLS } from '../engine/score';
import { knownTerms } from '../learn/extract';
import { QUESTIONS, answerQuestion, clearUpcoming, finishRate, forgetTerm, tellTerm, upcoming } from '../learn/learner';
import { skillAverages, useStore, type Term } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell } from '../ui/ui';

function TermList({ terms, empty }: { terms: Term[]; empty: string }) {
  if (!terms.length) return <p className="small muted">{empty}</p>;
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {terms.map((t) => (
        <span key={t.text} className="pill" style={{ gap: 6 }}>
          {t.text}
          <button className="btn ghost sm" style={{ padding: 0, minHeight: 0, height: 'auto' }} aria-label={`Forget ${t.text}`} onClick={() => forgetTerm(t.text)}>
            <Icon name="close" size={14} />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddTerm({ kind, placeholder }: { kind: Term['kind']; placeholder: string }) {
  const [v, setV] = useState('');
  const add = () => {
    if (v.trim().length < 2) return;
    tellTerm(v, kind);
    setV('');
  };
  return (
    <div className="row">
      <input className="input grow" value={v} placeholder={placeholder} maxLength={60} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label={placeholder} />
      <button className="btn quiet sm" disabled={v.trim().length < 2} onClick={add}>Add</button>
    </div>
  );
}

function Choice({ id, value }: { id: 'audience' | 'hardest'; value: string[] }) {
  const q = QUESTIONS.find((x) => x.id === id)!;
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {q.options!.map((o) => (
        <button key={o.id} className="chip sm" aria-pressed={value.includes(o.id)} onClick={() => answerQuestion(id, value.includes(o.id) ? value.filter((x) => x !== o.id) : [...value, o.id])}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Everything the coach has learned about the user, in one place they can correct. */
export function CoachScreen({ onClose }: { onClose: () => void }) {
  const s = useStore((x) => x);
  const l = s.learner;
  const avgs = useMemo(() => skillAverages(s), [s]);
  const projects = [...knownTerms(l.terms, 'project'), ...knownTerms(l.terms, 'term')];
  const people = knownTerms(l.terms, 'person');
  const soon = upcoming(l);
  const [upText, setUpText] = useState('');
  const focusName = l.focus ? SKILLS.find((k) => k.id === l.focus!.skill)?.name : null;
  const drillName = (id: string) => DRILLS.find((d) => d.id === id)?.name ?? id;
  const uses = Object.entries(l.drills)
    .map(([id, u]) => ({ id, rate: finishRate(l, id as never), n: u!.finished }))
    .filter((x) => x.n > 0 || x.rate !== null);
  const favorites = [...uses].sort((a, b) => b.n - a.n).slice(0, 3).filter((x) => x.n >= 2);
  const skipped = uses.filter((x) => x.rate !== null && x.rate < 0.34);

  return (
    <SessionShell title="What your coach knows" onClose={onClose}>
      <p className="small muted">The coach learns from how you practice and what you say in free-speaking rounds, then writes your scenarios and passages around it. Everything stays on your phone. Remove anything and it won't be used again.</p>

      <section className="card">
        <h3>Focus right now</h3>
        {l.focus && focusName ? (
          <p>
            <b>{focusName}</b>, since {new Date(l.focus.since).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.{' '}
            {avgs[l.focus.skill] !== undefined && avgs[l.focus.skill] !== l.focus.start ? `Started at ${l.focus.start}, now ${avgs[l.focus.skill]}.` : `Score: ${l.focus.start}.`} The coach moves on once this skill clearly improves.
          </p>
        ) : (
          <p className="small muted">Picked automatically after a few scored rounds.</p>
        )}
      </section>

      <section className="card">
        <h3>Your work</h3>
        <TermList terms={projects} empty="Nothing yet. Projects, clients and products you mention in the simulator show up here after you mention them twice." />
        <AddTerm kind="project" placeholder="Add a project, client or product" />
      </section>

      <section className="card">
        <h3>People</h3>
        <TermList terms={people} empty="Nothing yet. Names you mention show up here." />
        <AddTerm kind="person" placeholder="Add a name" />
      </section>

      <section className="card">
        <h3>Who you speak to</h3>
        <Choice id="audience" value={l.audience} />
        <h3 style={{ marginTop: 6 }}>Hardest moments</h3>
        <Choice id="hardest" value={l.hardest} />
      </section>

      <section className="card">
        <h3>Coming up</h3>
        {soon ? (
          <div className="row spread">
            <span>{soon}</span>
            <button className="btn ghost sm" onClick={clearUpcoming}>Remove</button>
          </div>
        ) : (
          <div className="row">
            <input className="input grow" value={upText} maxLength={80} placeholder="An important meeting this week" onChange={(e) => setUpText(e.target.value)} aria-label="Upcoming meeting" />
            <button className="btn quiet sm" disabled={upText.trim().length < 3} onClick={() => { answerQuestion('upcoming', upText); setUpText(''); }}>Add</button>
          </div>
        )}
        <p className="small muted">Your daily plan includes a practice round for it until it's past.</p>
      </section>

      {(favorites.length > 0 || skipped.length > 0) && (
        <section className="card">
          <h3>How you practice</h3>
          {favorites.length > 0 && <p className="small">You finish <b>{favorites.map((f) => drillName(f.id)).join(', ')}</b> most.</p>}
          {skipped.length > 0 && <p className="small">You often leave <b>{skipped.map((f) => drillName(f.id)).join(', ')}</b> early, so the plan swaps in a drill for the same skill when it can.</p>}
        </section>
      )}
    </SessionShell>
  );
}
