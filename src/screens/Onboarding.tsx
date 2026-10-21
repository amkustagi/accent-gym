import { useState } from 'react';
import { updateProfile, useStore, type Goal } from '../store/store';
import { Icon } from '../ui/Icon';
import { Seg, Switch } from '../ui/ui';
import { BaselineRound } from './drills/Simulator';

const GOALS: { v: Goal; label: string; sub: string }[] = [
  { v: 'meetings', label: 'Speak up in meetings', sub: 'Updates, opinions, pushback' },
  { v: 'interviews', label: 'Ace interviews', sub: 'Stories, answers under pressure' },
  { v: 'presenting', label: 'Present with impact', sub: 'Clear, lively delivery' },
  { v: 'everyday', label: 'Everyday confidence', sub: 'Calls, small talk, clarity' },
];

export function Onboarding() {
  const p = useStore((s) => s.profile);
  const [step, setStep] = useState(0);
  const finish = () => updateProfile({ onboarded: true, createdAt: Date.now() });
  const steps = 4;

  return (
    <div className="session" style={{ animation: 'none' }}>
      <div className="session-inner">
        <div className="steps" aria-hidden="true" style={{ marginTop: 8 }}>
          {Array.from({ length: steps }, (_, i) => <i key={i} className={i < step ? 'on' : i === step ? 'now' : ''} />)}
        </div>

        {step === 0 && (
          <>
            <div className="stack" style={{ gap: 18, paddingTop: 24 }}>
              <div className="ic" style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--hero)', color: 'var(--signal)', display: 'grid', placeItems: 'center' }}>
                <Icon name="wave" size={40} />
              </div>
              <h1 style={{ fontSize: '2.3rem' }}>Speak so people listen.</h1>
              <p className="muted" style={{ fontSize: '1.1rem' }}>Ten minutes a day. Speak Sharp listens while you talk and coaches what you say, how your voice sounds, and how clearly you come across.</p>
              <div className="stack-sm">
                {[['mic', 'Live feedback on fillers, weak words, pace and pitch'], ['target', 'A daily plan aimed at your weakest skill'], ['lock', 'Private: your voice is analyzed on this phone']].map(([i, t]) => (
                  <div key={t} className="row"><span className="ic" style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name={i} size={20} /></span><span>{t}</span></div>
                ))}
              </div>
            </div>
            <div className="foot"><button className="btn signal block" onClick={() => setStep(1)}>Get started</button></div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="stack" style={{ gap: 16 }}>
              <h1>What should we call you?</h1>
              <input className="input" aria-label="First name" placeholder="First name" value={p.name} onChange={(e) => updateProfile({ name: e.target.value.slice(0, 30) })} autoComplete="given-name" />
              <h2>What's your main goal?</h2>
              <div className="stack-sm">
                {GOALS.map((g) => (
                  <button key={g.v} className={`opt${p.goal === g.v ? ' right' : ''}`} onClick={() => updateProfile({ goal: g.v })}>
                    <b>{g.label}</b>
                    <br />
                    <span className="small muted">{g.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="foot"><button className="btn primary block" onClick={() => setStep(2)}>Continue</button></div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="stack" style={{ gap: 18 }}>
              <h1>Set up your practice</h1>
              <div className="field">
                <label>Time per day</label>
                <Seg label="Daily minutes" value={p.minutes} onChange={(v) => updateProfile({ minutes: v })} options={[{ v: 5, label: '5 min' }, { v: 10, label: '10 min' }, { v: 15, label: '15 min' }]} />
              </div>
              <div className="card">
                <div className="row spread">
                  <div className="stack-sm grow">
                    <b>Add the pronunciation track</b>
                    <span className="small muted">Sounds that often trip up non-native speakers: V/W, TH, R, soft T, vowels, word stress. Optional.</span>
                  </div>
                  <Switch label="Pronunciation track" checked={p.pronunciation} onChange={(v) => updateProfile({ pronunciation: v })} />
                </div>
              </div>
              <div className="note">
                <b>Next: a 60-second baseline</b>
                You'll answer one question out loud so we can measure where you start. Your browser will ask for the microphone. Tap Allow.
              </div>
            </div>
            <div className="foot">
              <button className="btn signal block" onClick={() => setStep(3)}><Icon name="mic" />Record my baseline</button>
              <button className="btn ghost block" onClick={finish}>Skip for now</button>
            </div>
          </>
        )}

        {step === 3 && <BaselineRound onDone={finish} />}
      </div>
    </div>
  );
}
