import { useState } from 'react';
import { CATEGORIES, SCENARIOS, type CategoryId } from '../content/scenarios';
import { roleById } from '../content/roles';
import { isPro } from '../lib/backend';
import { requirePro } from '../lib/gate';
import { open } from '../lib/nav';
import { useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { scoreTone } from '../ui/ui';

export function Speak() {
  const [cat, setCat] = useState<CategoryId>('update');
  const sessions = useStore((s) => s.sessions);
  const role = useStore((s) => s.profile.role);
  const custom = useStore((s) => s.profile.customRole);
  const pro = useStore((s) => isPro(s));
  const lastBy = new Map<string, number>();
  sessions.forEach((x) => x.itemId && lastBy.set(x.itemId, x.overall));
  const roleName = role === 'custom' ? custom || 'your role' : roleById(role).name.toLowerCase();
  return (
    <div className="page">
      <header className="stack-sm">
        <span className="eyebrow">Meeting simulator</span>
        <h1>Rehearse the moments that matter</h1>
      </header>
      <button className="card hero" style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit', gap: 8 }} onClick={() => (pro ? open({ kind: 'drill', id: 'simulator' }) : requirePro('Scenarios written for your role are part of Pro'))}>
        <div className="row spread">
          <span className="eyebrow">From your world</span>
          {!pro && <span className="pill">Pro</span>}
        </div>
        <b style={{ fontFamily: 'var(--display)', fontSize: '1.35rem', color: '#fff' }}>A fresh scenario for a {roleName}</b>
        <span className="small muted">Never the same twice. Gets harder as you improve.</span>
      </button>
      <section className="grid2">
        <button className="card" style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={() => open({ kind: 'drill', id: 'pressure' })}>
          <Icon name="bolt" size={26} />
          <b style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>Pressure round</b>
          <span className="small muted">Cold question, seconds to prepare</span>
        </button>
        <button className="card" style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={() => open({ kind: 'drill', id: 'roleplay' })}>
          <Icon name="chat" size={26} />
          <b style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>AI conversation</b>
          <span className="small muted">Handle follow-up questions{pro ? '' : ' · Pro'}</span>
        </button>
      </section>
      <div className="chips" role="group" aria-label="Category">
        {CATEGORIES.map((c) => (
          <button key={c.id} className="chip" aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: -6 }}>{CATEGORIES.find((c) => c.id === cat)!.blurb}</p>
      <div className="card" style={{ paddingBlock: 4 }}>
        <div className="list">
          {SCENARIOS.filter((s) => s.category === cat).map((s) => {
            const last = lastBy.get(s.id);
            return (
              <button key={s.id} className="item" onClick={() => open({ kind: 'drill', id: 'simulator', param: s.id })}>
                <span className="grow">
                  <span className="small muted">{s.context}</span>
                  <br />
                  <b>{s.prompt}</b>
                  <br />
                  <span className="small muted">{s.secs}s · {s.frame.join(' → ')}</span>
                </span>
                {last !== undefined ? <span className="pill" style={{ color: scoreTone(last) }}>{last}</span> : <Icon name="chevron" className="chev" />}
              </button>
            );
          })}
          <button className="item" onClick={() => (pro ? open({ kind: 'drill', id: 'simulator', param: `cat:${cat}` }) : requirePro('Endless scenarios are part of Pro'))}>
            <span className="ic"><Icon name="refresh" /></span>
            <span className="grow"><b>More like these, from your world</b><br /><span className="small muted">Endless {CATEGORIES.find((c) => c.id === cat)!.name.toLowerCase()} scenarios{pro ? '' : ' · Pro'}</span></span>
            <Icon name="chevron" className="chev" />
          </button>
        </div>
      </div>
    </div>
  );
}
