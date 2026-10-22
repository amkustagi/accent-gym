import { useEffect } from 'react';
import { LESSONS } from '../content/lessons';
import { drillById } from '../content/catalog';
import { HearButton } from '../ui/TakeCompare';
import { open } from '../lib/nav';
import { markLesson } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell, skillName } from '../ui/ui';

export function LessonView({ id, onClose }: { id: string; onClose: () => void }) {
  const l = LESSONS.find((x) => x.id === id)!;
  useEffect(() => markLesson(id), [id]);
  const d = drillById(l.practice);
  return (
    <SessionShell title="Lesson" onClose={onClose}>
      <section className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{skillName(l.skill)}</span>
        <h1>{l.title}</h1>
      </section>
      <section className="card hero">
        <span className="eyebrow">The rule</span>
        <p style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', fontWeight: 600, lineHeight: 1.35 }}>{l.rule}</p>
      </section>
      <section className="stack-sm">
        <h3>Why it matters</h3>
        <p className="muted">{l.why}</p>
      </section>
      <section className="card">
        <h3>How to do it</h3>
        <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
          {l.points.map((p) => <li key={p}>{p}</li>)}
        </ol>
      </section>
      {l.examples && (
        <section className="card">
          <h3>Before and after</h3>
          {l.examples.map((e) => (
            <div key={e.weak} className="stack-sm">
              <p className="strike" style={{ fontSize: '1.05rem' }}>{e.weak}</p>
              <div className="row">
                <p className="grow" style={{ fontWeight: 700, color: 'var(--good)' }}>{e.strong}</p>
                <HearButton text={e.strong} label="" className="iconbtn" />
              </div>
            </div>
          ))}
        </section>
      )}
      <div className="foot">
        <button className="btn signal block" onClick={() => open({ kind: 'drill', id: l.practice })}>
          <Icon name="mic" />Practice: {d.name}
        </button>
      </div>
    </SessionShell>
  );
}
