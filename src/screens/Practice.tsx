import { AREAS, DRILLS } from '../content/catalog';
import { LESSONS } from '../content/lessons';
import { go, open } from '../lib/nav';
import { useStore } from '../store/store';
import { isPro } from '../lib/backend';
import { Icon } from '../ui/Icon';
import { skillName } from '../ui/ui';

export function Practice() {
  const done = useStore((s) => s.lessonsDone);
  const pron = useStore((s) => s.profile.pronunciation);
  const pro = useStore((s) => isPro(s));
  return (
    <div className="page">
      <header className="stack-sm">
        <span className="eyebrow">Practice</span>
        <h1>Train one skill at a time</h1>
      </header>
      {AREAS.map((a) => (
        <section key={a.id} className="stack-sm">
          <div className="row spread" style={{ alignItems: 'baseline' }}>
            <h2>{a.name}</h2>
            <span className="small muted">{a.question}</span>
          </div>
          <div className="card" style={{ paddingBlock: 4 }}>
            <div className="list">
              {DRILLS.filter((d) => d.area === a.id).map((d) => (
                <button key={d.id} className="item" onClick={() => (d.id === 'pronunciation' ? go('accent') : open({ kind: 'drill', id: d.id }))}>
                  <span className="ic" style={d.area === 'presence' ? { background: 'var(--signal-soft)', color: 'var(--warn)' } : undefined}>
                    <Icon name={d.icon} />
                  </span>
                  <span className="grow">
                    <b>{d.name}</b>
                    {d.optional && <span className="pill" style={{ marginLeft: 8 }}>{pron ? 'Your track' : 'Optional'}</span>}
                    {d.pro && !pro && <span className="pill" style={{ marginLeft: 8 }}>Pro</span>}
                    <br />
                    <span className="small muted">{d.blurb}</span>
                  </span>
                  <Icon name="chevron" className="chev" />
                </button>
              ))}
            </div>
          </div>
        </section>
      ))}
      <section className="stack-sm">
        <div className="row spread" style={{ alignItems: 'baseline' }}>
          <h2>Lessons</h2>
          <span className="small muted">{done.length}/{LESSONS.length} read</span>
        </div>
        <div className="card" style={{ paddingBlock: 4 }}>
          <div className="list">
            {LESSONS.map((l) => (
              <button key={l.id} className="item" onClick={() => open({ kind: 'lesson', id: l.id })}>
                <span className="ic" style={done.includes(l.id) ? { background: 'var(--good-soft)', color: 'var(--good)' } : { background: 'var(--sunken)', color: 'var(--muted)' }}>
                  <Icon name={done.includes(l.id) ? 'check' : 'book'} />
                </span>
                <span className="grow">
                  <b>{l.title}</b>
                  <br />
                  <span className="small muted">{skillName(l.skill)}</span>
                </span>
                <Icon name="chevron" className="chev" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
