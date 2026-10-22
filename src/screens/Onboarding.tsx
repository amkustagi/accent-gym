import { useState } from 'react';
import { backendEnabled } from '../lib/backend';
import { setState, updateProfile, updateSettings, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { Seg, Switch } from '../ui/ui';
import { SignInForm } from './Account';
import { ProfileFields } from './Profile';
import { BaselineRound } from './drills/Simulator';

type Step = 'welcome' | 'work' | 'needs' | 'setup' | 'account' | 'baseline';

export function Onboarding() {
  const p = useStore((s) => s.profile);
  const st = useStore((s) => s.settings);
  const account = useStore((s) => s.account);
  const steps: Step[] = ['welcome', 'work', 'needs', 'setup', ...(backendEnabled ? (['account'] as Step[]) : []), 'baseline'];
  const [i, setI] = useState(0);
  const step = steps[i];
  const next = () => setI((k) => Math.min(steps.length - 1, k + 1));
  const finish = () => {
    updateProfile({ onboarded: true, createdAt: Date.now() });
    setState((s) => ({ ...s, lastSeenVersion: __APP_VERSION__ }));
  };

  return (
    <div className="session" style={{ animation: 'none' }}>
      <div className="session-inner">
        <div className="row" style={{ marginTop: 8 }}>
          {i > 0 && step !== 'baseline' && (
            <button className="iconbtn ghost" onClick={() => setI(i - 1)} aria-label="Back"><Icon name="back" /></button>
          )}
          <div className="steps grow" aria-hidden="true">
            {steps.map((_, k) => <i key={k} className={k < i ? 'on' : k === i ? 'now' : ''} />)}
          </div>
        </div>

        {step === 'welcome' && (
          <>
            <div className="stack" style={{ gap: 18, paddingTop: 20 }}>
              <div className="ic" style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--hero)', color: 'var(--signal)', display: 'grid', placeItems: 'center' }}>
                <Icon name="wave" size={40} />
              </div>
              <h1 style={{ fontSize: '2.3rem' }}>Speak so people listen.</h1>
              <p className="muted" style={{ fontSize: '1.1rem' }}>Ten minutes a day. Speak Sharp listens while you talk and coaches what you say, how your voice sounds, and how clearly you come across. It learns what you need and adapts.</p>
              <div className="stack-sm">
                {[['mic', 'Live feedback on fillers, weak words, pace and pitch'], ['target', 'Scenarios from your own job, getting harder as you improve'], ['lock', 'Private: your voice is analyzed on this phone']].map(([ic, t]) => (
                  <div key={t} className="row"><span className="ic" style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name={ic} size={20} /></span><span>{t}</span></div>
                ))}
              </div>
            </div>
            <div className="foot"><button className="btn signal block" onClick={next}>Get started</button></div>
          </>
        )}

        {step === 'work' && (
          <>
            <div className="stack" style={{ gap: 16 }}>
              <h1>Tell us about your work</h1>
              <p className="muted">Your scenarios will use the projects, numbers and people from your world.</p>
              <div className="field">
                <label htmlFor="ob-name">First name</label>
                <input id="ob-name" className="input" value={p.name} onChange={(e) => updateProfile({ name: e.target.value.slice(0, 30) })} autoComplete="given-name" />
              </div>
              <ProfileFields part="work" />
            </div>
            <div className="foot"><button className="btn primary block" onClick={next}>Continue</button></div>
          </>
        )}

        {step === 'needs' && (
          <>
            <div className="stack" style={{ gap: 16 }}>
              <h1>What do you want to get better at?</h1>
              <ProfileFields part="needs" />
            </div>
            <div className="foot"><button className="btn primary block" onClick={next}>Continue</button></div>
          </>
        )}

        {step === 'setup' && (
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
                    <b>Pronunciation track</b>
                    <span className="small muted">Sounds that often trip up non-native speakers: V/W, TH, R, soft T, vowels, word stress. Optional.</span>
                  </div>
                  <Switch label="Pronunciation track" checked={p.pronunciation} onChange={(v) => updateProfile({ pronunciation: v })} />
                </div>
              </div>
              <div className="card">
                <div className="row spread">
                  <div className="stack-sm grow">
                    <b>Natural AI voice</b>
                    <span className="small muted">A human-sounding model voice. You'll download it once (about 90 MB, best on Wi-Fi) from the Today screen.</span>
                  </div>
                  <Switch label="Natural voice" checked={st.voiceEngine === 'natural'} onChange={(v) => updateSettings({ voiceEngine: v ? 'natural' : 'system' })} />
                </div>
              </div>
              <div className="card">
                <div className="row spread">
                  <div className="stack-sm grow">
                    <b>Help improve Speak Sharp</b>
                    <span className="small muted">Share anonymous usage counts and error messages. Never your recordings or transcripts.</span>
                  </div>
                  <Switch label="Share anonymous usage" checked={p.consentAnalytics} onChange={(v) => updateProfile({ consentAnalytics: v })} />
                </div>
              </div>
            </div>
            <div className="foot">
              <button className="btn primary block" onClick={next}>Continue</button>
            </div>
          </>
        )}

        {step === 'account' && (
          <>
            <div className="stack" style={{ gap: 16 }}>
              <h1>Save your progress</h1>
              <p className="muted">Create a free account to keep your history safe and use Speak Sharp on any device.</p>
              {account ? <div className="note good"><b>Signed in</b>{account.email}</div> : <SignInForm onDone={next} />}
            </div>
            <div className="foot">
              <button className="btn ghost block" onClick={next}>{account ? 'Continue' : 'Skip for now'}</button>
            </div>
          </>
        )}

        {step === 'baseline' && (
          <>
            <div className="note">
              <b>60-second baseline</b>
              Answer out loud so we can measure where you start. Your browser will ask for the microphone. Tap Allow.
            </div>
            <BaselineRound onDone={finish} />
            <button className="btn ghost block" onClick={finish}>Skip for now</button>
          </>
        )}
      </div>
    </div>
  );
}
