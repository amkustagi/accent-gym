import { useMemo, useState } from 'react';
import { checkFor, featureById, soundMap, targetById, type FeatureId } from '../../content/accents';
import { mergeScores, scoreProbesFree, weakestPhoneme, type AzureResult, type FeatureScores } from '../../engine/assess';
import type { CaptureResult } from '../../engine/capture';
import { assessPrecise, precisionAvailable, preciseScores } from '../../lib/accentScore';
import { open } from '../../lib/nav';
import { getState, logActivity, saveAccentCheck, useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { ScoreRing, SessionShell, scoreTone } from '../../ui/ui';
import { useAccent } from './AccentHome';

interface Take {
  transcript: string;
  audio: Blob | null;
}

export function AccentCheckDrill({ onClose }: { onClose: () => void }) {
  const { target, from } = useAccent();
  const items = useMemo(() => (target ? checkFor(target) : []), [target]);
  const [i, setI] = useState(-1);
  const [takes, setTakes] = useState<Take[]>([]);
  const [phase, setPhase] = useState<'intro' | 'record' | 'scoring' | 'result'>('intro');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ scores: FeatureScores; overall: number; src: 'free' | 'pro'; azure: AzureResult[]; error?: string } | null>(null);
  const precision = useStore((s) => precisionAvailable(s));

  if (!target) {
    return (
      <SessionShell title="Accent check" onClose={onClose}>
        <p>Choose an accent goal first.</p>
      </SessionShell>
    );
  }
  const t = targetById(target);
  const locale = t.locale;

  const finish = async (all: Take[]) => {
    setPhase('scoring');
    // Skipped sentences don't count; a check where nothing was heard isn't saved.
    const done = all.map((tk, k) => ({ tk, item: items[k] })).filter((x) => x.tk.transcript.trim() || x.tk.audio);
    if (!done.some((x) => x.tk.transcript.trim()) && !(precisionAvailable(getState()) && done.some((x) => x.tk.audio))) {
      setResult({ scores: {}, overall: 0, src: 'free', azure: [], error: 'Speech recognition didn\'t hear any words, so nothing was scored. Check that the microphone and dictation are allowed (Settings › Listening), then try again.' });
      setPhase('result');
      return;
    }
    const free = mergeScores(done.filter((x) => x.tk.transcript.trim()).map(({ tk, item }) => scoreProbesFree(item.probes, item.text, tk.transcript)));
    let scores = free;
    let src: 'free' | 'pro' = 'free';
    const azure: AzureResult[] = [];
    let error: string | undefined;
    if (precisionAvailable(getState())) {
      try {
        const per: FeatureScores[] = [];
        for (let k = 0; k < done.length; k++) {
          setProgress(k / done.length);
          const audio = done[k].tk.audio;
          if (!audio) continue;
          const r = await assessPrecise(audio, done[k].item.text, target);
          azure.push(r);
          per.push(preciseScores(done[k].item.probes, r));
        }
        if (per.length) {
          scores = { ...free, ...mergeScores(per) };
          src = 'pro';
        }
      } catch (e) {
        error = `${(e as Error).message} Showing clarity scores instead.`;
      }
    }
    const vals = Object.values(scores) as number[];
    const overall = src === 'pro' && azure.length ? Math.round(azure.reduce((a, r) => a + r.pron, 0) / azure.length) : vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    saveAccentCheck({ target, src, overall, scores, fluency: azure.length ? Math.round(azure.reduce((a, r) => a + r.fluency, 0) / azure.length) : undefined, prosody: azure.find((r) => r.prosody !== null)?.prosody ?? null });
    logActivity('accentcheck', 20);
    setResult({ scores, overall, src, azure, error });
    setPhase('result');
  };

  const onTake = (r: CaptureResult) => {
    const next = [...takes, { transcript: r.transcript, audio: r.audio }];
    setTakes(next);
    if (i + 1 >= items.length) void finish(next);
    else setI(i + 1);
  };

  if (phase === 'intro')
    return (
      <SessionShell title="Accent check" onClose={onClose}>
        <section className="card">
          <span className="eyebrow">{items.length} sentences · about 2 minutes</span>
          <h2>Read each sentence out loud, in your normal voice</h2>
          <p className="muted">Don't try to sound {t.adjective} yet. This measures where you start. Find a quiet spot and hold the phone about 20 cm from your mouth.</p>
          <div className="note">
            <b>{precision ? 'Precise scoring' : 'Clarity scoring'}</b>
            {precision ? `Each word and sound is scored against native ${t.adjective} speakers.` : `A ${t.adjective} speech recognizer checks which words it understood. Pro adds sound-by-sound accent scoring.`}
          </div>
        </section>
        <div className="foot">
          <button className="btn signal block" onClick={() => { setI(0); setPhase('record'); }}><Icon name="mic" />Start</button>
        </div>
      </SessionShell>
    );

  if (phase === 'record' && i >= 0)
    return (
      <SessionShell title="Accent check" onClose={onClose} progress={i / items.length}>
        <section className="card">
          <span className="eyebrow">Sentence {i + 1} of {items.length}</span>
          <p className="script" style={{ color: 'var(--ink)' }}>{items[i].text}</p>
        </section>
        <MicStage key={i} autoStart maxSec={15} lang={locale} needsTranscript showCounters={false} showTranscript={false} autoStopSilence={1.8} idleHint="Tap the mic and read the sentence" onDone={onTake} />
        <button className="btn ghost" onClick={() => onTake({ transcript: '', durationSec: 0, frames: [], voice: null, audio: null })}>Skip this sentence</button>
      </SessionShell>
    );

  if (phase === 'scoring')
    return (
      <SessionShell title="Accent check" onClose={onClose} progress={progress}>
        <div className="empty" style={{ paddingTop: 60 }}>
          <Icon name="wave" />
          <h2>Scoring your accent…</h2>
          <p>{precision ? `Comparing each sound with native ${t.adjective} speakers.` : 'Checking what the recognizer understood.'}</p>
        </div>
      </SessionShell>
    );

  if (!result) return null;
  if (!Object.keys(result.scores).length)
    return (
      <SessionShell title="Accent check" onClose={onClose}>
        <div className="note bad"><b>Nothing was scored</b>{result.error}</div>
        <div className="foot">
          <button className="btn signal block" onClick={() => { setTakes([]); setI(0); setResult(null); setPhase('record'); }}><Icon name="refresh" />Try again</button>
          <button className="btn block" onClick={onClose}>Close</button>
        </div>
      </SessionShell>
    );
  const map = soundMap(from, target);
  const ranked = map.filter((e) => result.scores[e.feature.id] !== undefined);
  const toFix = [...ranked].sort((a, b) => result.scores[a.feature.id]! - result.scores[b.feature.id]! || map.indexOf(a) - map.indexOf(b)).slice(0, 3);
  const badWords = result.azure.flatMap((r) => r.words).filter((w) => w.accuracy < 60 && w.error !== 'Omission').slice(0, 8);

  return (
    <SessionShell title="Accent check" onClose={onClose} progress={1}>
      <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
        <ScoreRing value={result.overall} label={result.src === 'pro' ? 'accent' : 'clarity'} />
        <h2>{result.src === 'pro' ? `Your ${t.adjective} accent score` : `How well a ${t.adjective} listener understands you`}</h2>
        <p className="small muted">{result.src === 'pro' ? 'Compared with native speakers, sound by sound.' : 'Based on which words the recognizer understood. It doesn\'t judge accent itself.'}</p>
      </section>
      {result.error && <div className="note warn">{result.error}</div>}
      {toFix.length > 0 && (
        <section className="card">
          <h3>Fix these first</h3>
          <div className="list">
            {toFix.map((e) => (
              <button key={e.feature.id} className="item" onClick={() => open({ kind: 'drill', id: 'pronunciation', param: e.feature.id })}>
                <span className="grow">
                  <b>{e.feature.name}</b> <span className="mono small muted">{e.feature.ipa}</span>
                  <br />
                  <span className="small muted">{e.reason}</span>
                </span>
                <span className="pill" style={{ color: scoreTone(result.scores[e.feature.id]!) }}>{result.scores[e.feature.id]}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {badWords.length > 0 && (
        <section className="card">
          <h3>Words to work on</h3>
          <div className="row wrap" style={{ gap: 8 }}>
            {badWords.map((w, k) => {
              const p = weakestPhoneme(w);
              return (
                <span key={k} className="pill bad" title={p ? `Weakest sound: ${p.phoneme}` : undefined}>
                  {w.word}{p ? ` · /${p.phoneme}/` : ''} {Math.round(w.accuracy)}
                </span>
              );
            })}
          </div>
        </section>
      )}
      <section className="card">
        <h3>All sounds checked</h3>
        <div className="stack-sm">
          {ranked.map((e) => {
            const v = result.scores[e.feature.id as FeatureId]!;
            return (
              <div className="skillbar" key={e.feature.id}>
                <span>{featureById(e.feature.id).name}</span>
                <div className="bar"><i style={{ width: `${v}%`, background: scoreTone(v) }} /></div>
                <span className="v">{v}</span>
              </div>
            );
          })}
        </div>
      </section>
      <div className="foot">
        {toFix[0] && <button className="btn signal block" onClick={() => open({ kind: 'drill', id: 'pronunciation', param: toFix[0].feature.id })}><Icon name="target" />Practice {toFix[0].feature.name}</button>}
        <button className="btn block" onClick={onClose}>See my sound map</button>
      </div>
    </SessionShell>
  );
}
