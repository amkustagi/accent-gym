import { STARTING, TARGETS, guessStarting, type AccentGoal } from '../../content/accents';
import { updateProfile, useStore } from '../../store/store';

/** Pick the accent to aim for and where you're starting from. Used in onboarding, Settings and the Accent tab. */
export function AccentSetup({ compact }: { compact?: boolean }) {
  const p = useStore((s) => s.profile);
  const from = p.accentFrom || guessStarting(p.nativeLanguage);
  const pick = (g: AccentGoal) => updateProfile({ accentGoal: g, pronunciation: g !== 'none', accentFrom: from });
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="field">
        <label>Accent goal</label>
        <div className={compact ? 'grid2' : 'stack-sm'}>
          {TARGETS.map((t) => (
            <button key={t.id} className={`opt${p.accentGoal === t.id ? ' right' : ''}`} style={{ padding: '11px 14px' }} onClick={() => pick(t.id)} aria-pressed={p.accentGoal === t.id}>
              <b>{t.name}</b>
              {!compact && (
                <>
                  <br />
                  <span className="small muted">{t.desc}</span>
                </>
              )}
            </button>
          ))}
          <button className={`opt${p.accentGoal === 'none' ? ' right' : ''}`} style={{ padding: '11px 14px' }} onClick={() => pick('none')} aria-pressed={p.accentGoal === 'none'}>
            <b>Keep my accent</b>
            {!compact && (
              <>
                <br />
                <span className="small muted">Just be clearly understood. Skip accent training.</span>
              </>
            )}
          </button>
        </div>
      </div>
      {p.accentGoal !== 'none' && (
        <div className="field">
          <label htmlFor="acc-from">How you speak English today</label>
          <select id="acc-from" className="input" value={from} onChange={(e) => updateProfile({ accentFrom: e.target.value })}>
            <optgroup label="English with an accent from…">
              {STARTING.filter((x) => x.group === 'english').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </optgroup>
            <optgroup label="My first language is…">
              {STARTING.filter((x) => x.group === 'language').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </optgroup>
          </select>
          <span className="small muted">This decides which sounds you practice first.</span>
        </div>
      )}
    </div>
  );
}
