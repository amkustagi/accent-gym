import { useEffect, useMemo, useRef, useState } from 'react';
import { featureById, hintFor, soundMap, targetById, tipFor, type AccentId, type FeatureId, type SoundFeature } from '../../content/accents';
import { scoreProbesAzure, weakestPhoneme, type AzureResult } from '../../engine/assess';
import { speak } from '../../engine/tts';
import { heardWord, matchTarget, tokenize, type MatchResult } from '../../engine/text';
import { reviewCard } from '../../learn/adapt';
import { assessPrecise, precisionAvailable } from '../../lib/accentScore';
import { open } from '../../lib/nav';
import { logActivity, recordSounds, soundScore, useStore } from '../../store/store';
import { ContentVote } from '../../ui/Feedback';
import { Icon } from '../../ui/Icon';
import { MicStage } from '../../ui/MicStage';
import { HearButton, TakeCompare } from '../../ui/TakeCompare';
import { ScoreRing, Seg, SessionShell, scoreTone } from '../../ui/ui';
import { useAccent } from './AccentHome';

type Tab = 'listen' | 'words' | 'lines';

/** Collects scores during a lesson and saves one averaged score per source when the lesson closes. */
function useLessonScores(id: FeatureId) {
  const free = useRef<number[]>([]);
  const pro = useRef<number[]>([]);
  useEffect(
    () => () => {
      const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
      if (pro.current.length) recordSounds({ [id]: avg(pro.current) }, 'pro');
      else if (free.current.length >= 2) recordSounds({ [id]: avg(free.current) }, 'free');
      const n = free.current.length + pro.current.length;
      if (n) logActivity('pronunciation', Math.min(30, 6 + n * 2));
    },
    [id],
  );
  return { addFree: (n: number) => free.current.push(n), addPro: (n: number) => pro.current.push(n) };
}

export function SoundLessonDrill({ param, onClose }: { param?: string; onClose: () => void }) {
  const { target, from } = useAccent();
  if (!target || !param) {
    return (
      <SessionShell title="Sound lesson" onClose={onClose}>
        <p className="muted">Choose an accent goal on the Accent tab first.</p>
      </SessionShell>
    );
  }
  return <Lesson key={`${param}-${target}`} f={featureById(param as FeatureId)} target={target} from={from} onClose={onClose} />;
}

function Lesson({ f, target, from, onClose }: { f: SoundFeature; target: AccentId; from: string; onClose: () => void }) {
  const t = targetById(target);
  const entry = soundMap(from, target).find((e) => e.feature.id === f.id);
  const [tab, setTab] = useState<Tab>(f.pairs.length ? 'listen' : 'words');
  const [rate, setRate] = useState(1);
  // Derive outside the selector: returning a new object from a selector re-renders forever.
  const st = useStore((x) => x);
  const score = useMemo(() => soundScore(st, f.id), [st, f.id]);
  const sc = useLessonScores(f.id);
  return (
    <SessionShell title={f.name} onClose={onClose}>
      <section className="card">
        <div className="row spread">
          <span className="eyebrow">How to say it in {t.adjective} English</span>
          <span className="mono small" style={{ color: 'var(--brand)', whiteSpace: 'nowrap', flex: '0 0 auto' }}>{f.ipa}</span>
        </div>
        <p>{tipFor(f, target)}</p>
        {entry && entry.source === 'profile' && <p className="small muted"><b>Why it's on your map:</b> {entry.reason}</p>}
        <div className="row spread">
          <Seg label="Model speed" value={rate} onChange={setRate} options={[{ v: 1, label: 'Normal' }, { v: 0.7, label: 'Slow' }]} />
          {score && <span className="pill" style={{ color: scoreTone(score.score) }}>Your score {score.score}</span>}
        </div>
      </section>
      <Seg
        label="Section"
        value={tab}
        onChange={setTab}
        options={[...(f.pairs.length ? [{ v: 'listen' as const, label: 'Listen' }] : []), { v: 'words' as const, label: 'Words' }, { v: 'lines' as const, label: 'Sentences' }]}
      />
      {tab === 'listen' && <ListenTest f={f} rate={rate} target={target} />}
      {tab === 'words' && <WordSay f={f} rate={rate} target={target} sc={sc} />}
      {tab === 'lines' && <LineSay f={f} rate={rate} target={target} sc={sc} />}
      <button className="btn quiet" onClick={() => open({ kind: 'drill', id: 'shadow', param: f.id })}><Icon name="wave" />Shadow sentences with this sound</button>
      <ContentVote id={`sound:${f.id}:${target}`} label="this lesson" />
    </SessionShell>
  );
}

const ROUND = 10;

/** A round of 10 questions that cycles through every pair before repeating one. */
function questions(pairs: [string, string][]): { pair: [string, string]; answer: string }[] {
  const out: { pair: [string, string]; answer: string }[] = [];
  while (out.length < ROUND) {
    const deck = [...pairs].sort(() => Math.random() - 0.5);
    for (const pair of deck) if (out.length < ROUND) out.push({ pair, answer: pair[Math.random() < 0.5 ? 0 : 1] });
  }
  return out;
}

function ListenTest({ f, rate, target }: { f: SoundFeature; rate: number; target: AccentId }) {
  const [qs, setQs] = useState<{ pair: [string, string]; answer: string }[] | null>(null);
  const [n, setN] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const q = qs && n < qs.length ? qs[n] : null;
  const done = !!qs && n >= qs.length;
  const say = (w: string) => setTimeout(() => void speak(w, { rate, accent: target }), 150);
  const start = () => {
    const list = questions(f.pairs);
    setQs(list);
    setN(0);
    setRight(0);
    setPicked(null);
    say(list[0].answer);
  };
  const next = () => {
    setPicked(null);
    const k = n + 1;
    setN(k);
    if (qs && k < qs.length) say(qs[k].answer);
  };
  return (
    <div className="stack">
      <section className="card">
        <h3>Hear the difference</h3>
        <p className="small muted">Tap any word to hear it. Then take the test: you hear one word and pick which.</p>
        <div className="stack-sm">
          {f.pairs.map(([a, b]) => (
            <div className="row" key={a}>
              <button className="btn quiet pairbtn" onClick={() => void speak(a, { rate, accent: target })}>{a}</button>
              <span className="muted small">vs</span>
              <button className="btn quiet pairbtn" onClick={() => void speak(b, { rate, accent: target })}>{b}</button>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="row spread">
          <h3>Listening test</h3>
          {qs && !done && <span className="pill brand">{Math.min(n + 1, ROUND)} of {ROUND}</span>}
        </div>
        {!qs && <button className="btn signal block" onClick={start}><Icon name="ear" />Start the test</button>}
        {q && (
          <>
            <div className="row">
              {q.pair.map((w) => (
                <button key={w} className={`btn pairbtn ${picked ? (w === q.answer ? 'opt right' : w === picked ? 'opt wrong' : '') : ''}`} disabled={!!picked} onClick={() => {
                  setPicked(w);
                  if (w === q.answer) setRight((r) => r + 1);
                }}>{w}</button>
              ))}
            </div>
            {picked && picked !== q.answer && <p className="small muted">It was <b>{q.answer}</b>. Tap both words above to compare them.</p>}
            <div className="row">
              <button className="btn quiet grow" onClick={() => void speak(q.answer, { rate, accent: target })}><Icon name="speaker" />Play again</button>
              {picked && <button className="btn primary grow" onClick={next}>{n + 1 >= ROUND ? 'See result' : 'Next'}</button>}
            </div>
          </>
        )}
        {done && (
          <div className="stack-sm">
            <div className="row spread">
              <b className="num" style={{ fontSize: '1.6rem' }}>{right} / {ROUND}</b>
              <span className={`pill ${right >= 9 ? 'good' : right >= 7 ? 'brand' : 'warn'}`}>{right >= 9 ? 'You hear it' : right >= 7 ? 'Almost there' : 'Keep listening'}</span>
            </div>
            <p className="small muted">
              {right >= 9
                ? 'Your ear has it. Next, practice saying it in Words.'
                : right >= 7
                  ? 'Close. Replay the pairs above, then try another round.'
                  : 'These sound alike at first. Play each pair a few times, slowly, then try again.'}
            </p>
            <button className="btn quiet" style={{ alignSelf: 'flex-start' }} onClick={start}><Icon name="refresh" />Another round</button>
          </div>
        )}
      </section>
    </div>
  );
}

function PreciseWords({ r }: { r: AzureResult }) {
  return (
    <div className="stack-sm">
      <p className="script" style={{ fontSize: '1.15rem' }}>
        {r.words.map((w, k) => (
          <span key={k} style={{ color: w.error === 'Omission' ? 'var(--faint)' : scoreTone(w.accuracy), textDecoration: w.error === 'Omission' ? 'line-through' : undefined }}>{w.word} </span>
        ))}
      </p>
      {r.words.filter((w) => w.accuracy < 70 && w.error !== 'Omission').slice(0, 3).map((w, k) => {
        const p = weakestPhoneme(w);
        return (
          <p key={k} className="small">
            <b>{w.word}</b>: {Math.round(w.accuracy)}{p ? `, weakest sound /${p.phoneme}/ (${Math.round(p.accuracy)})` : ''}
          </p>
        );
      })}
      <div className="row wrap small muted" style={{ gap: 12 }}>
        <span>Accuracy {Math.round(r.accuracy)}</span>
        <span>Fluency {Math.round(r.fluency)}</span>
        {r.prosody !== null && <span>Melody {Math.round(r.prosody)}</span>}
      </div>
    </div>
  );
}

function WordSay({ f, rate, target, sc }: { f: SoundFeature; rate: number; target: AccentId; sc: ReturnType<typeof useLessonScores> }) {
  const targets = [...f.words.map((w) => ({ w: w.w, hint: hintFor(w.hint, target) })), ...f.pairs.flat().map((w) => ({ w, hint: undefined as string | undefined }))];
  const [i, setI] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; heard: string } | null>(null);
  const [precise, setPrecise] = useState<{ r?: AzureResult; err?: string; busy?: boolean } | null>(null);
  const [take, setTake] = useState<Blob | null>(null);
  const alts = useRef<string[]>([]);
  const precision = useStore((s) => precisionAvailable(s));
  const tw = targets[i % targets.length];
  const locale = targetById(target).locale;
  return (
    <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
      <span className="eyebrow">Word {(i % targets.length) + 1} of {targets.length}</span>
      <div className="bigword">{tw.w}</div>
      {tw.hint && <span className="pill brand">{tw.hint}</span>}
      {take ? <TakeCompare text={tw.w} take={take} rate={rate} accent={target} /> : <HearButton text={tw.w} rate={rate} accent={target} className="btn quiet sm" />}
      {result && (
        <div className={`note ${result.ok ? 'good' : 'warn'}`} style={{ width: '100%', textAlign: 'left' }}>
          <b>{result.ok ? 'Understood.' : 'Not quite.'}</b>
          {result.ok ? `A ${targetById(target).adjective} recognizer heard exactly that word.` : `It heard "${result.heard || '…'}". Check the tip and try again.`}
        </div>
      )}
      {precise?.busy && <p className="small muted">Scoring sound by sound…</p>}
      {precise?.err && <div className="note warn" style={{ width: '100%' }}>{precise.err}</div>}
      {precise?.r && <div style={{ width: '100%', textAlign: 'left' }}><PreciseWords r={precise.r} /></div>}
      <MicStage
        key={`${i}-${result ? 1 : 0}`}
        size="sm"
        maxSec={6}
        lang={locale}
        needsTranscript
        showCanvas={false}
        showCounters={false}
        showTranscript={false}
        continuous={false}
        autoStopSilence={1.2}
        onStart={() => (alts.current = [])}
        onAlternatives={(a) => (alts.current = [...alts.current, ...a])}
        onDone={async (r) => {
          const ok = heardWord(tw.w, [...alts.current, r.transcript]) || tokenize(r.transcript).join(' ') === tokenize(tw.w).join(' ');
          setTake(r.audio);
          reviewCard(`word:${target}:${tw.w}`, ok);
          sc.addFree(ok ? 100 : 0);
          setResult({ ok, heard: r.transcript });
          if (precision && r.audio) {
            setPrecise({ busy: true });
            try {
              const res = await assessPrecise(r.audio, tw.w, target);
              setPrecise({ r: res });
              const s = scoreProbesAzure({ [f.id]: [tw.w] }, res)[f.id];
              if (s !== undefined) sc.addPro(s);
            } catch (e) {
              setPrecise({ err: (e as Error).message });
            }
          } else setPrecise(null);
        }}
        idleHint="Tap and say the word"
      />
      <button className="btn block" onClick={() => { setI(i + 1); setResult(null); setTake(null); setPrecise(null); }}>Next word</button>
    </section>
  );
}

function LineSay({ f, rate, target, sc }: { f: SoundFeature; rate: number; target: AccentId; sc: ReturnType<typeof useLessonScores> }) {
  const [i, setI] = useState(0);
  const [m, setM] = useState<MatchResult | null>(null);
  const [precise, setPrecise] = useState<{ r?: AzureResult; err?: string; busy?: boolean } | null>(null);
  const [take, setTake] = useState<Blob | null>(null);
  const precision = useStore((s) => precisionAvailable(s));
  const line = f.sentences[i % f.sentences.length];
  const probeWords = f.words.map((w) => w.w).concat(f.pairs.flat());
  return (
    <section className="card">
      <p className="script" style={{ color: 'var(--ink)' }}>
        {m && !precise?.r ? m.words.map((w, k) => <span key={k} className={`w ${w.hit ? 'hit' : 'miss'}`}>{w.word} </span>) : line}
      </p>
      {take ? <TakeCompare text={line} take={take} rate={rate} accent={target} /> : <HearButton text={line} rate={rate} accent={target} />}
      {m && !precise?.r && (
        <div className="row">
          <ScoreRing value={m.accuracy} label="understood" size={96} />
          <p className="small grow">{m.accuracy >= 90 ? 'Clear. Now try it at full speed.' : 'Red words weren\'t understood. Say them slowly, then the whole line.'}</p>
        </div>
      )}
      {precise?.busy && <p className="small muted">Scoring sound by sound…</p>}
      {precise?.err && <div className="note warn">{precise.err}</div>}
      {precise?.r && <PreciseWords r={precise.r} />}
      <MicStage
        key={`${i}-${m ? 1 : 0}`}
        size="sm"
        maxSec={14}
        lang={targetById(target).locale}
        needsTranscript
        showCanvas={false}
        showCounters={false}
        showTranscript={false}
        autoStopSilence={1.5}
        onDone={async (r) => {
          setTake(r.audio);
          const res = matchTarget(line, r.transcript);
          setM(res);
          sc.addFree(res.accuracy);
          if (precision && r.audio) {
            setPrecise({ busy: true });
            try {
              const pr = await assessPrecise(r.audio, line, target);
              setPrecise({ r: pr });
              const lineProbes = probeWords.filter((w) => tokenize(line).includes(tokenize(w).join('')));
              const s = scoreProbesAzure({ [f.id]: lineProbes.length ? lineProbes : tokenize(line) }, pr)[f.id];
              sc.addPro(s ?? Math.round(pr.pron));
            } catch (e) {
              setPrecise({ err: (e as Error).message });
            }
          } else setPrecise(null);
        }}
        idleHint="Tap and say the sentence"
      />
      <button className="btn block" onClick={() => { setI(i + 1); setM(null); setTake(null); setPrecise(null); }}>Next sentence</button>
    </section>
  );
}
