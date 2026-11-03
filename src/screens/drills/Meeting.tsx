// Meeting mode (tinyhustlers/hq#105): record a real meeting in silence on the phone, tag who spoke,
// then coach your turns afterwards. No audio is kept; only the transcript and scores are saved.
import { useEffect, useMemo, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';
import { CaptureSession } from '../../engine/capture';
import { evaluate } from '../../engine/score';
import {
  YOU, featuresOf, meetingDebrief, meetingText, newPersonId, parseTranscript, renameSpeaker, setAsYou, setTurnSpeaker, yourSeconds, yourText,
  type Meeting, type MeetingDebrief, type VoicePrint,
} from '../../engine/meeting';
import { deleteVoicePrint, loadVoicePrint, saveVoicePrint, startMeeting, type LiveMeeting } from '../../lib/meeting';
import { open } from '../../lib/nav';
import { getState, saveSession, updateLearner, updateSession, useStore, type Learner, type SessionRecord } from '../../store/store';
import { goalChoices, goalDef, goalMet, goalPending, goalTrend, suggestGoals, type MeetingGoalId } from '../../learn/meetingGoal';
import { Icon } from '../../ui/Icon';
import { SessionShell } from '../../ui/ui';

type Phase = 'home' | 'enrol' | 'rec' | 'paste' | 'label' | 'debrief';

/** Fictional lines for the voice print (read aloud once, about 15 seconds). */
export const ENROL_LINES = [
  'Here is where the project stands: the design is done, testing starts Monday, and we launch on the twelfth.',
  'I recommend we keep the scope as it is and review the numbers with Meera on Friday.',
];

const CONSENT_KEY = 'meeting:consentSeen';
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function MeetingDrill({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('home');
  const [print, setPrint] = useState<VoicePrint | null>(null);
  const [consent, setConsent] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const myName = useStore((s) => s.profile.name);
  const savedId = useRef<string | null>(null);
  // The goal this meeting is judged on: the one still waiting for a real meeting when Meeting mode opened (hq#142).
  const judged = useRef<Learner['meetingGoal']>(goalPending(getState()) ? getState().learner.meetingGoal : null);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    void loadVoicePrint().then(setPrint);
    void get(CONSENT_KEY).then((x) => setConsent(!!x)).catch(() => setConsent(true));
  }, []);

  // Each step starts at the top (the label list is long, so the debrief used to open half-scrolled).
  useEffect(() => {
    document.querySelector('.session')?.scrollTo?.(0, 0);
  }, [phase]);

  const gotIt = () => {
    setConsent(true);
    void set(CONSENT_KEY, true).catch(() => undefined);
  };
  const finished = (m: Meeting, note?: string) => {
    setMeeting(m);
    setErr(note ?? (m.turns.length ? null : 'No speech was transcribed. Check that speech recognition is on, or paste a transcript.'));
    setPhase(m.turns.length ? 'label' : 'home');
  };

  if (phase === 'rec') return <Recording print={print} onDone={finished} onError={(e) => { setErr(e); setPhase('home'); }} />;

  return (
    <SessionShell title="Meeting mode" onClose={onClose} noReport={phase === 'enrol'}>
      {phase === 'home' && (
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <span className="eyebrow">Your real meeting, coached after</span>
            <h2>Put the phone on the table and press Start</h2>
            <p className="small muted" style={{ margin: 0 }}>
              Speakco stays completely silent while it listens: no voice, sounds or pop-ups. Words are turned into text on this phone and the audio is thrown away as it goes. Afterwards you see who spoke and get coaching on your turns only.
            </p>
          </section>
          {judged.current && (
            <p className="small" style={{ margin: 0 }}><b>Goal for this meeting:</b> {goalDef(judged.current.id).short}</p>
          )}
          {!consent && (
            <div className="note warn">
              <b>Tell people you're taking notes</b>
              Recording rules differ by place and workplace. Say "I'm using an app to take notes on my own speaking" before you start.
              <button className="btn quiet block" style={{ marginTop: 10 }} onClick={gotIt}>Got it</button>
            </div>
          )}
          <section className="card">
            <div className="row spread">
              <span className="grow">
                <b>Your voice</b>
                <br />
                <span className="small muted">{print ? 'Set. Speakco tags your turns as You.' : 'Read two sentences once so Speakco can tell which turns are yours.'}</span>
              </span>
              <button className="btn sm quiet" onClick={() => setPhase('enrol')}>{print ? 'Redo' : 'Set up'}</button>
            </div>
            {print && (
              <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => void deleteVoicePrint().then(() => setPrint(null))}>Delete my voice print</button>
            )}
          </section>
          {err && <div className="note bad"><b>That didn't work</b>{err}</div>}
          <div className="foot stack-sm">
            <button className="btn signal block" disabled={!consent} onClick={() => { setErr(null); setPhase('rec'); }}><Icon name="mic" />Start meeting</button>
            <button className="btn ghost block" onClick={() => { setErr(null); setPhase('paste'); }}>Paste a transcript instead</button>
          </div>
        </div>
      )}

      {phase === 'enrol' && <Enrol onSaved={(p) => { setPrint(p); setPhase('home'); }} onCancel={() => setPhase('home')} />}

      {phase === 'paste' && <Paste myName={myName} onDone={(m) => finished(m)} onCancel={() => setPhase('home')} />}

      {phase === 'label' && meeting && <Label m={meeting} onChange={setMeeting} onDone={() => setPhase('debrief')} />}

      {phase === 'debrief' && meeting && <Debrief m={meeting} savedId={savedId} goal={judged.current} openedAt={openedAt.current} onRelabel={() => setPhase('label')} onClose={onClose} />}
    </SessionShell>
  );
}

/** The black "Recording" screen. Nothing moves except the clock, so it draws no attention. */
function Recording({ print, onDone, onError }: { print: VoicePrint | null; onDone: (m: Meeting, note?: string) => void; onError: (e: string) => void }) {
  const live = useRef<LiveMeeting | null>(null);
  const [sec, setSec] = useState(0);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let alive = true;
    void startMeeting(print, undefined).then((r) => {
      if (!alive) return r.live?.cancel();
      if (r.error || !r.live) return onError(r.error ?? 'Could not start.');
      live.current = r.live;
    });
    const tick = setInterval(() => setSec(live.current?.elapsed() ?? 0), 1000);
    // The phone closes the microphone when Speakco goes to the background; keep what was heard.
    const hidden = () => document.visibilityState === 'hidden' && void stop('Speakco was closed, so recording stopped there. Keep it open (the screen stays dark) for the whole meeting.');
    document.addEventListener('visibilitychange', hidden);
    return () => {
      alive = false;
      clearInterval(tick);
      document.removeEventListener('visibilitychange', hidden);
      live.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = async (note?: string) => {
    const l = live.current;
    if (!l) return;
    live.current = null;
    setStopping(true);
    onDone(await l.stop(), note);
  };

  return (
    <div className="session" role="dialog" aria-modal="true" aria-label="Recording meeting" style={{ background: '#000', color: '#8a8a8a' }}>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '24px 16px' }}>
        <div className="small" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span aria-hidden="true" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#a33', marginRight: 8 }} />
          Recording · {clock(sec)}
        </div>
        <p className="small" style={{ maxWidth: 300, textAlign: 'center', margin: 0, color: '#666' }}>Silent. Keep Speakco open; the screen stays dark. Audio is never saved.</p>
        <button className="btn block" style={{ maxWidth: 240, minHeight: 56, background: '#1a1a1a', color: '#ddd', border: '1px solid #333' }} disabled={stopping} onClick={() => void stop()}>
          <Icon name="stop" />{stopping ? 'Finishing…' : 'Stop'}
        </button>
      </div>
    </div>
  );
}

function Enrol({ onSaved, onCancel }: { onSaved: (p: VoicePrint) => void; onCancel: () => void }) {
  const cap = useRef<CaptureSession | null>(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => () => cap.current?.cancel(), []);
  const start = async () => {
    setErr(null);
    const c = new CaptureSession('voice', {}, { record: false });
    const r = await c.start();
    if (!r.ok) return setErr(r.error ?? 'Could not open the microphone.');
    cap.current = c;
    setOn(true);
  };
  const done = async () => {
    const c = cap.current;
    cap.current = null;
    setOn(false);
    if (!c) return;
    const res = await c.stop();
    const f = featuresOf(res.frames, -Infinity, Infinity, 40);
    if (!f) return setErr('I couldn\'t hear enough of your voice. Read both sentences at a normal volume, close to the phone.');
    const p: VoicePrint = { ...f, v: 1, createdAt: Date.now() };
    await saveVoicePrint(p).catch(() => undefined);
    onSaved(p);
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <span className="eyebrow">Your voice print · about 15 seconds</span>
        <h2>Read these out loud</h2>
        {ENROL_LINES.map((l) => <p key={l} style={{ margin: 0, fontSize: '1.05rem' }}>{l}</p>)}
        <p className="small muted" style={{ margin: 0 }}>Speakco keeps three numbers about your pitch, only on this phone. No recording is saved, and it's never in backups or sync.</p>
      </section>
      {err && <div className="note bad"><b>Try again</b>{err}</div>}
      <div className="foot stack-sm">
        {on ? (
          <button className="btn signal block" onClick={() => void done()}><Icon name="check" />Done reading</button>
        ) : (
          <button className="btn signal block" onClick={() => void start()}><Icon name="mic" />Start reading</button>
        )}
        <button className="btn ghost block" onClick={() => { cap.current?.cancel(); onCancel(); }}>Cancel</button>
      </div>
    </div>
  );
}

function Paste({ myName, onDone, onCancel }: { myName: string; onDone: (m: Meeting) => void; onCancel: () => void }) {
  const [raw, setRaw] = useState('');
  const [name, setName] = useState(myName);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <span className="eyebrow">Zoom, Teams or Meet transcript</span>
        <h2>Paste the transcript</h2>
        <textarea aria-label="Meeting transcript" className="input" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'Meera Rao: Where are we on the launch?\nArjun Rao: We need two more weeks.'} maxLength={200000} />
        <label className="small" htmlFor="mt-name">Your name in the transcript</label>
        <input id="mt-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arjun" maxLength={40} />
        <p className="small muted" style={{ margin: 0 }}>It stays on this phone.</p>
      </section>
      <div className="foot stack-sm">
        <button className="btn signal block" disabled={raw.trim().length < 10} onClick={() => onDone(parseTranscript(raw, name))}>Read it</button>
        <button className="btn ghost block" onClick={onCancel}>Back</button>
      </div>
    </div>
  );
}

function Label({ m, onChange, onDone }: { m: Meeting; onChange: (m: Meeting) => void; onDone: () => void }) {
  const speakers = useMemo(() => Object.keys(m.names).filter((id) => m.turns.some((t) => t.speaker === id)), [m]);
  const hasYou = m.turns.some((t) => t.speaker === YOU);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <span className="eyebrow">Who spoke · {clock(m.durationSec)}</span>
        <h2>Check the names</h2>
        <p className="small muted" style={{ margin: 0 }}>Rename anyone, or fix a turn that was tagged wrong. Changes apply to the whole meeting.</p>
        {speakers.map((id) => (
          <div key={id} className="row" style={{ gap: 8 }}>
            <input
              aria-label={`Name for ${m.names[id]}`}
              className="input grow"
              value={m.names[id]}
              disabled={id === YOU}
              maxLength={40}
              onChange={(e) => onChange(renameSpeaker(m, id, e.target.value))}
            />
            {id !== YOU && <button className="btn sm quiet" style={{ minHeight: 44 }} onClick={() => onChange(setAsYou(m, id))}>This is me</button>}
          </div>
        ))}
      </section>
      <section className="card" aria-label="Turns">
        {m.turns.map((t, i) => (
          <div key={i} className="stack-sm" style={{ borderTop: i ? '1px solid var(--line)' : undefined, paddingTop: i ? 10 : 0 }}>
            <select
              aria-label={`Who said turn ${i + 1}`}
              className="input"
              style={{ minHeight: 44, width: 'auto', maxWidth: '100%', fontWeight: 700, color: t.speaker === YOU ? 'var(--brand)' : undefined }}
              value={t.speaker}
              onChange={(e) => onChange(setTurnSpeaker(m, i, e.target.value === '+' ? newPersonId(m) : e.target.value))}
            >
              {Object.keys(m.names).map((id) => <option key={id} value={id}>{m.names[id]}</option>)}
              {!m.names[YOU] && <option value={YOU}>You</option>}
              <option value="+">New person</option>
            </select>
            <p className="small" style={{ margin: 0, overflowWrap: 'anywhere' }}>{t.text}</p>
          </div>
        ))}
      </section>
      <div className="foot stack-sm">
        <button className="btn signal block" disabled={!hasYou} onClick={onDone}><Icon name="sparkle" />Coach my turns</button>
        {!hasYou && <p className="small muted" style={{ margin: 0 }}>Choose "This is me" next to your name first.</p>}
      </div>
    </div>
  );
}

/** Saves the meeting once as a "Real meeting" session; fixing names afterwards updates the same session. */
export function meetingRecord(m: Meeting, d: MeetingDebrief, goal?: MeetingGoalId | null): Omit<SessionRecord, 'id' | 't' | 'hasAudio'> {
  const ev = evaluate({ transcript: yourText(m), durationSec: Math.max(1, yourSeconds(m)) });
  const extra: Record<string, number | string> = {
    talkShare: d.talkShare, turns: d.yourTurns, longestSec: d.longestSec, toPoint: d.wordsToPoint ?? -1,
    // Counts for the meeting-goal trend (hq#142). Numbers only, never the words.
    apologies: d.apologies, hedges: d.hedges, fillers: d.fillers,
  };
  if (d.directness !== null) extra.direct = d.directness;
  if (goal) {
    const met = goalMet(goal, goalDef(goal).value(d));
    if (met !== null) {
      extra.goal = goal;
      extra.goalMet = met ? 1 : 0;
    }
  }
  return { drill: 'meeting', title: 'Real meeting', overall: ev.overall, scores: ev.scores, metrics: ev.metrics, transcript: meetingText(m), durationSec: m.durationSec, tips: ev.tips, extra };
}

function Debrief({ m, savedId, goal, openedAt, onRelabel, onClose }: { m: Meeting; savedId: { current: string | null }; goal: Learner['meetingGoal']; openedAt: number; onRelabel: () => void; onClose: () => void }) {
  const d: MeetingDebrief = useMemo(() => meetingDebrief(m), [m]);
  useEffect(() => {
    const rec = meetingRecord(m, d, goal?.id);
    // Text and scores only: the audio Blob is null, so nothing playable is stored.
    if (savedId.current) updateSession(savedId.current, rec);
    else {
      savedId.current = 'pending';
      void saveSession(rec, null, 15).then((r) => (savedId.current = r.id));
    }
  }, [m, d, savedId, goal]);
  const stat = (label: string, v: string) => (
    <div className="stat" style={{ minWidth: 0 }}><b>{v}</b><span>{label}</span></div>
  );
  return (
    <div className="stack" style={{ gap: 16 }}>
      {goal && <GoalResult goal={goal.id} d={d} />}
      <section className="card hero">
        <span className="eyebrow">Your turns · {d.yourTurns}</span>
        <h2 style={{ color: '#fff' }}>{d.headline}</h2>
        <div className="row spread" style={{ flexWrap: 'wrap', gap: 12 }}>
          {stat('talk share', `${d.talkShare}%`)}
          {stat('words to point', d.wordsToPoint === null ? '–' : String(d.wordsToPoint))}
          {stat('longest turn', clock(d.longestSec))}
        </div>
      </section>
      <section className="card">
        <h3>What you said</h3>
        <div className="row spread small"><span>Fillers</span><b>{d.fillers}</b></div>
        <div className="row spread small"><span>Hedges</span><b>{d.hedges}</b></div>
        <div className="row spread small"><span>Apologies</span><b>{d.apologies}</b></div>
        {d.directness !== null && <div className="row spread small"><span>Directness</span><b>{d.directness}</b></div>}
      </section>
      {d.weakest.map((w, i) => (
        <section key={w.index} className="card">
          <span className="eyebrow">Weakest moment {i + 1}{w.wordsToPoint !== null ? ` · point after ${w.wordsToPoint} words` : ' · no clear point'}</span>
          <p className="small muted" style={{ margin: 0, overflowWrap: 'anywhere' }}>{w.text}</p>
          <span className="eyebrow">Point-first</span>
          <p style={{ margin: 0, overflowWrap: 'anywhere' }}>{w.rewrite}</p>
          <button className="btn quiet block" onClick={() => open({ kind: 'drill', id: 'sayitfirst', param: w.rewrite })}><Icon name="mic" />Say it again</button>
        </section>
      ))}
      {!d.weakest.length && <div className="note good"><b>No weak moments</b>Every longer turn got to the point.</div>}
      <NextGoal d={d} openedAt={openedAt} />
      <div className="foot stack-sm">
        <button className="btn ghost block" onClick={onRelabel}>Fix who said what</button>
        <button className="btn signal block" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

/** "Goal met / Not yet" for the goal this meeting was held under, with its last 5 real meetings. */
function GoalResult({ goal, d }: { goal: MeetingGoalId; d: MeetingDebrief }) {
  const g = goalDef(goal);
  const v = g.value(d);
  const met = goalMet(goal, v);
  const trend = goalTrend(useStore((s) => s.sessions), goal);
  const unit = goal === 'talk' ? '%' : '';
  return (
    <section className="card" aria-label="Meeting goal">
      <span className="eyebrow">Your goal · {g.short}</span>
      <h3 style={{ margin: 0, color: met ? 'var(--good)' : undefined }}>
        {met === null ? 'Not measured this time' : met ? `Goal met: ${v}${unit}` : `Not yet: ${v}${unit}`}
      </h3>
      {trend.length >= 2 && <p className="small muted" style={{ margin: 0 }}>Last {trend.length} real meetings: {trend.map((x) => `${x}${unit}`).join(' → ')}</p>}
    </section>
  );
}

/** Suggests one goal for the next real meeting from this one's worst number; tap to accept or pick another. */
function NextGoal({ d, openedAt }: { d: MeetingDebrief; openedAt: number }) {
  const current = useStore((s) => s.learner.meetingGoal);
  const [picking, setPicking] = useState(false);
  const suggested = suggestGoals(d)[0];
  const chosen = current && current.setAt >= openedAt ? current : null;
  const choose = (id: MeetingGoalId) => {
    updateLearner((l) => ({ ...l, meetingGoal: { id, setAt: Date.now(), from: goalDef(id).value(d) } }));
    setPicking(false);
  };
  if (!d.yourTurns) return null;
  return (
    <section className="card" aria-label="Goal for your next meeting">
      <span className="eyebrow">Your next real meeting</span>
      {chosen && !picking ? (
        <>
          <h3 style={{ margin: 0 }}>Goal: {goalDef(chosen.id).label}</h3>
          <p className="small muted" style={{ margin: 0 }}>It's first in Today's plan until your next real meeting.</p>
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start', minHeight: 44 }} onClick={() => setPicking(true)}>Change goal</button>
        </>
      ) : (
        <>
          <h3 style={{ margin: 0 }}>{suggested ? 'One goal to work on' : 'Everything is on target. Pick a goal if you like.'}</h3>
          {suggested && !picking && (
            <button className="btn primary block" style={{ minHeight: 44 }} onClick={() => choose(suggested)}><Icon name="target" />{goalDef(suggested).label}</button>
          )}
          {(picking || !suggested) ? (
            <div className="chips wrap" role="group" aria-label="Pick a goal">
              {goalChoices(d).map((id) => (
                <button key={id} className="chip" style={{ minHeight: 44 }} aria-pressed={chosen?.id === id} onClick={() => choose(id)}>{goalDef(id).short}</button>
              ))}
            </div>
          ) : (
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start', minHeight: 44 }} onClick={() => setPicking(true)}>Pick another</button>
          )}
        </>
      )}
    </section>
  );
}
