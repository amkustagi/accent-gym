import { useEffect, useMemo, useState } from 'react';
import { guessStarting, profileByKey, soundMap, startingById, targetById, type AccentId } from '../../content/accents';
import { nextSoundFor } from '../../learn/adapt';
import { accentVoiceInfo, loadNatural, naturalState, onNaturalState } from '../../engine/tts';
import { isIOS } from '../../engine/speech';
import { precisionAvailable } from '../../lib/accentScore';
import { backendEnabled } from '../../lib/backend';
import { open } from '../../lib/nav';
import { soundScore, useStore, type State } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { ScoreRing, scoreTone } from '../../ui/ui';
import { AccentSetup } from './AccentSetup';

export function useAccent() {
  const goal = useStore((s) => s.profile.accentGoal);
  const native = useStore((s) => s.profile.nativeLanguage);
  const from = useStore((s) => s.profile.accentFrom) || guessStarting(native);
  return { target: goal === 'none' ? null : (goal as AccentId), from };
}

export function mapWithScores(s: State, from: string, target: AccentId) {
  return soundMap(from, target).map((e) => ({ ...e, score: soundScore(s, e.feature.id) }));
}


function VoiceNote({ target }: { target: AccentId }) {
  const [, force] = useState(0);
  useEffect(() => onNaturalState(() => force((n) => n + 1)), []);
  const info = accentVoiceInfo(target);
  const t = targetById(target);
  if (info.kind === 'natural') return null;
  const canNatural = t.voice !== 'system';
  if (canNatural && naturalState().status !== 'ready')
    return (
      <div className="note">
        <b>Hear a natural {t.adjective} voice</b>
        Download the natural voice once (about 90 MB, best on Wi-Fi) for a human-sounding {t.adjective} model.
        <button className="btn primary sm" style={{ marginTop: 8 }} onClick={() => void loadNatural().catch(() => undefined)}>
          <Icon name="download" />{naturalState().status === 'loading' ? `Downloading ${Math.round(naturalState().progress * 100)}%` : 'Download'}
        </button>
      </div>
    );
  if (info.kind === 'missing')
    return (
      <div className="note warn">
        <b>No {t.adjective} voice on this phone</b>
        {isIOS()
          ? `Add one: iPhone Settings › Accessibility › Spoken Content › Voices › English › ${t.id === 'au' ? 'Australia (Karen or Lee)' : t.id === 'ca' ? 'United States' : 'United Kingdom'}, then reopen the app.`
          : `Add one in your phone's text-to-speech settings (Google Speech Services › English (${t.id === 'au' ? 'Australia' : t.id === 'ca' ? 'Canada' : 'UK'})).`}
      </div>
    );
  return null;
}

export function AccentHome() {
  const { target, from } = useAccent();
  const s = useStore((x) => x);
  const [changing, setChanging] = useState(false);
  const map = useMemo(() => (target ? mapWithScores(s, from, target) : []), [s, from, target]);

  if (!target)
    return (
      <div className="page">
        <header className="stack-sm">
          <span className="eyebrow">Accent Coach</span>
          <h1>Sound the way you want to sound</h1>
          <p className="muted">Pick an accent to aim for. You'll get a sound map built for your starting point, lessons in that accent, and scoring as you practice.</p>
        </header>
        <section className="card"><AccentSetup /></section>
      </div>
    );

  const t = targetById(target);
  const start = startingById(from);
  const label = start ? profileByKey(start.profile).label : 'your';
  const checks = s.accentChecks.filter((c) => c.target === target);
  const last = checks[checks.length - 1];
  const first = checks[0];
  const precision = precisionAvailable(s);
  const next = nextSoundFor(s);

  return (
    <div className="page">
      <header className="head">
        <div className="stack-sm">
          <span className="eyebrow">Accent Coach</span>
          <h1>Sound more {t.adjective}</h1>
        </div>
      </header>

      <button className="card tight" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }} onClick={() => setChanging((c) => !c)} aria-expanded={changing}>
        <div className="row spread">
          <span className="small"><span className="muted">From</span> <b>{start?.name ?? 'your English'}</b> <span className="muted">to</span> <b>{t.name}</b></span>
          <span className="small" style={{ color: 'var(--brand)', fontWeight: 700 }}>{changing ? 'Done' : 'Change'}</span>
        </div>
      </button>
      {changing && <section className="card"><AccentSetup compact /></section>}

      {!last ? (
        <section className="card hero" style={{ gap: 12 }}>
          <span className="eyebrow">Start here</span>
          <h2 style={{ color: '#fff' }}>Take the 2-minute accent check</h2>
          <p className="muted">Read 9 short sentences out loud. You'll see which sounds to fix first, scored in {t.adjective} English.</p>
          <button className="btn primary block" onClick={() => open({ kind: 'drill', id: 'accentcheck' })}><Icon name="mic" />Start the check</button>
        </section>
      ) : (
        <section className="card">
          <div className="row" style={{ gap: 16 }}>
            <ScoreRing value={last.overall} label={last.src === 'pro' ? 'accent' : 'clarity'} size={108} />
            <div className="stack-sm grow">
              <span className="eyebrow">{t.adjective} {last.src === 'pro' ? 'accent score' : 'clarity score'}</span>
              <span className="small muted">Last check {new Date(last.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{checks.length > 1 ? ` · ${last.overall - first.overall >= 0 ? '+' : ''}${last.overall - first.overall} since your first` : ''}</span>
              <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => open({ kind: 'drill', id: 'accentcheck' })}><Icon name="refresh" />Retake check</button>
            </div>
          </div>
        </section>
      )}

      <section className="card sunken tight">
        <div className="row spread">
          <span className="small">
            <b>{precision ? 'Precise accent scoring is on' : 'Clarity scoring'}</b>
            <br />
            <span className="muted">{precision ? 'Each word and sound is scored against native speakers by Microsoft.' : `Checks whether a ${t.adjective} speech recognizer understands you.`}</span>
          </span>
          {!precision && (
            <button className="btn sm signal" onClick={() => (backendEnabled ? open({ kind: 'paywall', reason: 'Precise accent scoring: every word and sound scored against native speakers.' }) : open({ kind: 'settings' }))}>
              {backendEnabled ? 'Go Pro' : 'Set up'}
            </button>
          )}
        </div>
      </section>

      <VoiceNote target={target} />

      {next && (
        <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', borderColor: 'var(--signal)' }} onClick={() => open({ kind: 'drill', id: 'pronunciation', param: next.feature.id })}>
          <span className="eyebrow">Practice next</span>
          <div className="row spread">
            <b style={{ fontFamily: 'var(--display)', fontSize: '1.25rem' }}>{next.feature.name}</b>
            <span className="mono small" style={{ color: 'var(--brand)', whiteSpace: 'nowrap' }}>{next.feature.ipa}</span>
          </div>
          <span className="small muted">{next.reason}</span>
        </button>
      )}

      <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }} onClick={() => open({ kind: 'drill', id: 'shadow' })}>
        <div className="row">
          <span className="ic" style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="wave" /></span>
          <span className="grow"><b>Shadowing</b><br /><span className="small muted">Repeat a native {t.adjective} speaker and match their melody</span></span>
          <Icon name="chevron" className="chev" />
        </div>
      </button>

      <section className="stack-sm">
        <div className="row spread" style={{ alignItems: 'baseline' }}>
          <h2>Your sound map</h2>
          <span className="small muted">most important first</span>
        </div>
        <div className="card" style={{ paddingBlock: 4 }}>
          <div className="list">
            {map.map((e) => (
              <button key={e.feature.id} className="item" onClick={() => open({ kind: 'drill', id: 'pronunciation', param: e.feature.id })}>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="row" style={{ gap: 8 }}>
                    <b>{e.feature.name}</b>
                    <span className="mono small muted" style={{ whiteSpace: 'nowrap' }}>{e.feature.ipa}</span>
                  </span>
                  <span className="small muted">{e.source === 'profile' ? `Common for ${label} speakers` : e.source === 'signature' ? `${t.adjective} signature sound` : 'Polish'}</span>
                  {e.score && (
                    <span className="bar" style={{ display: 'block', height: 6, background: 'var(--sunken)', borderRadius: 9, marginTop: 6, overflow: 'hidden' }}>
                      <i style={{ display: 'block', height: '100%', width: `${e.score.score}%`, background: scoreTone(e.score.score), borderRadius: 9 }} />
                    </span>
                  )}
                </span>
                {e.score ? <span className="pill" style={{ color: scoreTone(e.score.score) }}>{e.score.score}</span> : <span className="pill">New</span>}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
