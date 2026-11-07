import { useState } from 'react';
import type { CaptureResult } from '../engine/capture';
import { FIRST_TAKE, FIRST_RUN_DEFAULTS, firstResult, onboardingSteps, type FirstResult } from '../learn/firstTake';
import { backendEnabled } from '../lib/backend';
import { scoreAndSave, tooShort } from '../lib/session';
import { setState, updateProfile, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { MicStage } from '../ui/MicStage';
import { HearButton } from '../ui/TakeCompare';
import { SignInForm } from './Account';
import { ProfileFields } from './Profile';

// First value before setup and sign-up (tinyhustlers/hq#398): Welcome → a 30-second first take → its result →
// optional personalising → (only with accounts on) save it. Coach, voice and sharing choices live in Settings.
export function Onboarding() {
  const p = useStore((s) => s.profile);
  const account = useStore((s) => s.account);
  const steps = onboardingSteps(backendEnabled);
  const [i, setI] = useState(0);
  const [result, setResult] = useState<FirstResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const step = steps[i];
  const go = (to: (typeof steps)[number]) => setI(Math.max(0, steps.indexOf(to)));
  const next = () => setI((k) => Math.min(steps.length - 1, k + 1));
  const finish = () => {
    updateProfile({ onboarded: true, createdAt: Date.now() });
    setState((s) => ({ ...s, lastSeenVersion: __APP_VERSION__ }));
  };
  // After personalising: save the result if accounts are on, otherwise start.
  const afterPersonalise = () => (steps.includes('account') ? go('account') : finish());
  const skipPersonalise = () => {
    if (!p.goal) updateProfile({ goal: FIRST_RUN_DEFAULTS.goal });
    if (!p.minutes) updateProfile({ minutes: FIRST_RUN_DEFAULTS.minutes });
    afterPersonalise();
  };
  const took = async (r: CaptureResult) => {
    const short = tooShort(r);
    if (short) return setErr(short);
    setErr(null);
    // The first take is the baseline round: scored on this phone, no audio kept unless Keep recordings is on.
    await scoreAndSave(r, { drill: 'baseline', title: FIRST_TAKE.prompt, itemId: FIRST_TAKE.id, category: FIRST_TAKE.category });
    setResult(firstResult(r.transcript));
    go('result');
  };

  return (
    <div className="session" style={{ animation: 'none' }}>
      <div className="session-inner">
        <div className="row" style={{ marginTop: 8 }}>
          {i > 0 && step !== 'result' && (
            <button className="iconbtn ghost" onClick={() => setI(step === 'personalise' && !result ? steps.indexOf('try') : i - 1)} aria-label="Back"><Icon name="back" /></button>
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
              <p className="muted" style={{ fontSize: '1.1rem' }}>Answer one question out loud and see how you come across, in 30 seconds. No setup, no account. Then ten minutes a day, built around your work.</p>
              <div className="stack-sm">
                {[['mic', 'Live feedback on fillers, weak words, pace and pitch'], ['target', 'Scenarios from your own job, getting harder as you improve'], ['lock', 'Private: your voice is analyzed on this phone']].map(([ic, t]) => (
                  <div key={t} className="row"><span className="ic" style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name={ic} size={20} /></span><span>{t}</span></div>
                ))}
              </div>
            </div>
            <div className="foot"><button className="btn signal block" onClick={next}><Icon name="mic" />Try it: 30 seconds</button></div>
          </>
        )}

        {step === 'try' && (
          <div className="stack" style={{ gap: 16 }}>
            <section className="card">
              <span className="eyebrow">{FIRST_TAKE.context} · 30 seconds</span>
              <h1 style={{ margin: 0 }}>{FIRST_TAKE.prompt}</h1>
              <p className="small muted" style={{ margin: 0 }}>Answer as you would in a stand-up. Your phone will ask for the microphone: Speakco needs it to hear your answer, and scores it on this phone.</p>
            </section>
            <MicStage maxSec={FIRST_TAKE.secs} onDone={(r) => void took(r)} needsTranscript idleHint="Tap the mic and answer out loud" />
            {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
            <button className="btn ghost block" style={{ minHeight: 44 }} onClick={() => go('personalise')}>Not now</button>
          </div>
        )}

        {step === 'result' && result && (
          <>
            <div className="stack" style={{ gap: 16 }}>
              <section className="card hero" aria-label="Your first result">
                <span className="eyebrow">Your first take</span>
                <h2 style={{ color: '#fff', margin: 0 }}>
                  {result.wordsToPoint === null ? 'No clear point yet. Lead with it.' : result.wordsToPoint <= 10 ? `Point after ${result.wordsToPoint} words. Good.` : `Your point came after ${result.wordsToPoint} words.`}
                </h2>
                <div className="row spread" style={{ flexWrap: 'wrap', gap: 12 }}>
                  {[['words before your point', result.wordsToPoint === null ? '–' : String(result.wordsToPoint)], ['fillers', String(result.fillers)], ['hedges and sorry', String(result.hedges + result.apologies)]].map(([l, v]) => (
                    <div key={l} className="stat" style={{ minWidth: 0 }}><b>{v}</b><span>{l}</span></div>
                  ))}
                </div>
              </section>
              <section className="card">
                <h3 style={{ margin: 0 }}>{result.changed ? 'Your answer, point-first' : 'Your answer'}</h3>
                <p style={{ margin: 0, fontSize: '1.05rem', overflowWrap: 'anywhere' }}>{result.rewrite}</p>
                <HearButton text={result.rewrite} label="Hear it" className="btn quiet" />
              </section>
            </div>
            <div className="foot"><button className="btn primary block" onClick={next}>Continue</button></div>
          </>
        )}

        {step === 'personalise' && (
          <>
            <div className="stack" style={{ gap: 16 }}>
              <h1>Want practice built around your job?</h1>
              <p className="muted">Your scenarios will use the projects, numbers and people from your world. Ten minutes a day; change it any time in Settings.</p>
              <div className="field">
                <label htmlFor="ob-name">First name</label>
                <input id="ob-name" className="input" value={p.name} onChange={(e) => updateProfile({ name: e.target.value.slice(0, 30) })} autoComplete="given-name" />
              </div>
              <ProfileFields part="work" />
              <ProfileFields part="needs" />
            </div>
            <div className="foot stack-sm">
              <button className="btn primary block" onClick={afterPersonalise}>Continue</button>
              <button className="btn ghost block" style={{ minHeight: 44 }} onClick={skipPersonalise}>Skip</button>
            </div>
          </>
        )}

        {step === 'account' && (
          <>
            <div className="stack" style={{ gap: 16 }}>
              <h1>{result ? 'Save this result and your plan' : 'Save your progress'}</h1>
              <p className="muted">A free account keeps your history safe and works on any device. Not now keeps everything on this phone.</p>
              {account ? <div className="note good"><b>Signed in</b>{account.email}</div> : <SignInForm onDone={finish} />}
            </div>
            <div className="foot">
              <button className="btn ghost block" style={{ minHeight: 44 }} onClick={finish}>{account ? 'Continue' : 'Not now'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
