import { CHALLENGES, INDUSTRIES, ROLES, SITUATIONS } from '../content/roles';
import { updateProfile, useStore, type Goal, type Profile } from '../store/store';
import { SessionShell } from '../ui/ui';

const GOALS: { v: Goal; label: string }[] = [
  { v: 'meetings', label: 'Speak up in meetings' },
  { v: 'interviews', label: 'Ace interviews' },
  { v: 'presenting', label: 'Present with impact' },
  { v: 'everyday', label: 'Everyday confidence' },
];

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** The parts of the profile that personalize content. Shared by onboarding and Settings. */
export function ProfileFields({ part = 'all' }: { part?: 'all' | 'work' | 'needs' }) {
  const p = useStore((s) => s.profile);
  const set = (x: Partial<Profile>) => updateProfile(x);
  return (
    <div className="stack" style={{ gap: 18 }}>
      {(part === 'all' || part === 'work') && (
        <>
          <div className="field">
            <label htmlFor="pf-role">Your role</label>
            <select id="pf-role" className="input" value={p.role} onChange={(e) => set({ role: e.target.value })}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              <option value="custom">Something else…</option>
            </select>
            {p.role === 'custom' && <input className="input" aria-label="Your job title" placeholder="Your job title" value={p.customRole} onChange={(e) => set({ customRole: e.target.value.slice(0, 50) })} />}
          </div>
          <div className="field">
            <label htmlFor="pf-ind">Industry</label>
            <select id="pf-ind" className="input" value={p.industry} onChange={(e) => set({ industry: e.target.value })}>
              <option value="">Choose…</option>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Experience</label>
            <div className="seg" role="group" aria-label="Experience">
              {(['early', 'mid', 'senior', 'lead'] as const).map((x) => (
                <button key={x} aria-pressed={p.seniority === x} onClick={() => set({ seniority: x })}>
                  {x === 'early' ? 'Early' : x === 'mid' ? 'Mid' : x === 'senior' ? 'Senior' : 'Leader'}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pf-lang">First language</label>
            <input id="pf-lang" className="input" list="langs" placeholder="e.g. Hindi, Tamil, Spanish" value={p.nativeLanguage} onChange={(e) => set({ nativeLanguage: e.target.value.slice(0, 30) })} />
            <datalist id="langs">
              {['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Mandarin', 'Spanish', 'Portuguese', 'Arabic', 'French', 'Tagalog', 'Vietnamese', 'Korean', 'Japanese'].map((l) => <option key={l} value={l} />)}
            </datalist>
          </div>
        </>
      )}
      {(part === 'all' || part === 'needs') && (
        <>
          <div className="field">
            <label>Main goal</label>
            <div className="stack-sm">
              {GOALS.map((g) => (
                <button key={g.v} className={`opt${p.goal === g.v ? ' right' : ''}`} style={{ padding: '11px 14px' }} onClick={() => set({ goal: g.v })}>{g.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Where do you need to speak well? <span className="muted small">(pick any)</span></label>
            <div className="row wrap" style={{ gap: 8 }}>
              {SITUATIONS.map((x) => (
                <button key={x.id} className="chip" aria-pressed={p.situations.includes(x.id)} onClick={() => set({ situations: toggle(p.situations, x.id) })}>{x.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>What feels hardest? <span className="muted small">(pick any)</span></label>
            <div className="stack-sm">
              {CHALLENGES.map((x) => (
                <button key={x.id} className={`opt${p.challenges.includes(x.id) ? ' right' : ''}`} style={{ padding: '11px 14px' }} onClick={() => set({ challenges: toggle(p.challenges, x.id) })}>{x.label}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ProfileScreen({ onClose }: { onClose: () => void }) {
  const name = useStore((s) => s.profile.name);
  return (
    <SessionShell title="Your profile" onClose={onClose}>
      <div className="field">
        <label htmlFor="pf-name">First name</label>
        <input id="pf-name" className="input" value={name} onChange={(e) => updateProfile({ name: e.target.value.slice(0, 30) })} autoComplete="given-name" />
      </div>
      <ProfileFields />
      <div className="foot"><button className="btn primary block" onClick={onClose}>Save</button></div>
    </SessionShell>
  );
}
