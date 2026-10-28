import { useMemo, useRef, useState } from 'react';
import { COURSES, courseById, courseLessonById, lessonPassed, runChecks, type Course, type CourseLesson } from '../content/courses';
import type { CaptureResult } from '../engine/capture';
import { scoreAndSave, tooShort } from '../lib/session';
import { open } from '../lib/nav';
import { getState, markLesson, setBest, useStore, type SessionRecord, type State } from '../store/store';
import { Icon } from '../ui/Icon';
import { MicStage } from '../ui/MicStage';
import { Report } from '../ui/Report';
import { HearButton } from '../ui/TakeCompare';
import { SessionShell } from '../ui/ui';
import { CameraPanel, PresenceResult, type CameraHandle } from '../ui/CameraPanel';
import type { PresenceSummary } from '../engine/face';
import { analyzeDirectness, coachLine, type Directness } from '../engine/direct';
import { coachById } from '../content/coaches';
import { CoachSays } from '../ui/CoachSays';
import { CoachAvatar } from '../ui/CoachAvatar';

const doneIn = (s: State, c: Course) => c.lessons.filter((l) => s.lessonsDone.includes(l.id)).length;

/** The next lesson to take: the next one in a started course, else the first lesson of the first course. */
export function nextCourseLesson(s: State): { course: Course; lesson: CourseLesson; started: boolean } {
  for (const c of COURSES) {
    const n = doneIn(s, c);
    if (n > 0 && n < c.lessons.length) return { course: c, lesson: c.lessons.find((l) => !s.lessonsDone.includes(l.id))!, started: true };
  }
  for (const c of COURSES) {
    const l = c.lessons.find((x) => !s.lessonsDone.includes(x.id));
    if (l) return { course: c, lesson: l, started: doneIn(s, c) > 0 };
  }
  return { course: COURSES[0], lesson: COURSES[0].lessons[0], started: true };
}

function Bar({ value }: { value: number }) {
  return (
    <div className="progress" style={{ height: 6 }}>
      <i style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

/** Course cards for the Practice tab. */
export function CoursesSection() {
  const s = useStore((x) => x);
  const total = COURSES.reduce((a, c) => a + c.lessons.length, 0);
  const done = COURSES.reduce((a, c) => a + doneIn(s, c), 0);
  return (
    <section className="stack-sm">
      <div className="row spread" style={{ alignItems: 'baseline' }}>
        <h2>Courses</h2>
        <span className="small muted">{done}/{total} lessons</span>
      </div>
      <div className="card" style={{ paddingBlock: 4 }}>
        <div className="list">
          {COURSES.map((c) => {
            const n = doneIn(s, c);
            return (
              <button key={c.id} className="item" onClick={() => open({ kind: 'course', id: c.id })}>
                <span className="ic" style={n === c.lessons.length ? { background: 'var(--good-soft)', color: 'var(--good)' } : undefined}>
                  <Icon name={n === c.lessons.length ? 'check' : c.icon} />
                </span>
                <span className="grow stack-sm" style={{ gap: 4 }}>
                  <b>{c.title}</b>
                  <span className="small muted"><span style={{ textTransform: 'capitalize' }}>{c.area}</span> · {c.blurb}</span>
                  {n > 0 && <Bar value={n / c.lessons.length} />}
                </span>
                <span className="small muted">{n}/{c.lessons.length}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** "Continue your course" card for Today. */
export function ContinueCourseCard() {
  const s = useStore((x) => x);
  const { course, lesson, started } = useMemo(() => nextCourseLesson(s), [s]);
  return (
    <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }} onClick={() => open({ kind: 'clesson', id: lesson.id })}>
      <span className="eyebrow">{started ? 'Continue your course' : 'Start a course'} · {course.title}</span>
      <div className="row spread">
        <b>{lesson.title}</b>
        <Icon name="chevron" className="chev" />
      </div>
      <span className="small muted">2 minutes to learn, then say it out loud.</span>
    </button>
  );
}

export function CourseView({ id, onClose }: { id: string; onClose: () => void }) {
  const c = courseById(id)!;
  const done = useStore((s) => s.lessonsDone);
  const best = useStore((s) => s.best);
  const next = c.lessons.find((l) => !done.includes(l.id));
  return (
    <SessionShell title={c.title} onClose={onClose}>
      <section className="stack-sm">
        <span className="eyebrow">{c.area} · {c.lessons.length} lessons</span>
        <p className="muted">{c.blurb}</p>
        <Bar value={c.lessons.filter((l) => done.includes(l.id)).length / c.lessons.length} />
      </section>
      <div className="card" style={{ paddingBlock: 4 }}>
        <div className="list">
          {c.lessons.map((l, i) => {
            const ok = done.includes(l.id);
            return (
              <button key={l.id} className="item" onClick={() => open({ kind: 'clesson', id: l.id })}>
                <span className="ic" style={ok ? { background: 'var(--good-soft)', color: 'var(--good)' } : l === next ? undefined : { background: 'var(--sunken)', color: 'var(--muted)' }}>
                  {ok ? <Icon name="check" /> : <b>{i + 1}</b>}
                </span>
                <span className="grow">
                  <b>{l.title}</b>
                  <br />
                  <span className="small muted">{l.idea}</span>
                </span>
                {best[`course:${l.id}`] !== undefined && <span className="pill good">{best[`course:${l.id}`]}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {next && (
        <div className="foot">
          <button className="btn signal block" onClick={() => open({ kind: 'clesson', id: next.id })}><Icon name="play" />{done.some((d) => c.lessons.some((l) => l.id === d)) ? 'Continue' : 'Start'}: {next.title}</button>
        </div>
      )}
    </SessionShell>
  );
}

export function CourseLessonView({ id, onClose }: { id: string; onClose: () => void }) {
  const l = courseLessonById(id)!;
  const [phase, setPhase] = useState<'learn' | 'speak' | 'result'>('learn');
  const [res, setRes] = useState<{ rec: SessionRecord; xp: number } | null>(null);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const cam = useRef<CameraHandle>(null);
  const [camRes, setCamRes] = useState<PresenceSummary | null>(null);
  const usesCamera = l.checks.some((c) => c.t === 'self' && c.camera);
  const lessonsDone = useStore((s) => s.lessonsDone);
  const coach = coachById(useStore((s) => s.settings.coach));
  const [custom, setCustom] = useState('');

  const idx = l.course.lessons.findIndex((x) => x.id === l.id);
  const nextLesson = l.course.lessons[idx + 1];

  const results = useMemo(() => {
    if (!res) return [];
    const m = res.rec.metrics;
    return runChecks(l.checks, { transcript: res.rec.transcript, words: m.words, wpm: m.wpm, pauses: m.pauses, pitchRangeSt: m.pitchRangeSt, fillersPerMin: m.fillersPerMin }, ticks, camRes);
  }, [res, ticks, l.checks, camRes]);
  const passed = res ? lessonPassed(results, res.rec.overall) : false;
  const selfPending = results.some((r) => r.self && r.pass === null);
  const direct = useMemo(() => (res ? analyzeDirectness(res.rec.transcript) : null), [res]);
  const leadMissed = results.some((r, i) => l.checks[i]?.t === 'lead' && r.pass === false);
  const prompt = custom.trim() ? `${l.practice.prompt} (Their real situation: ${custom.trim()})` : l.practice.prompt;

  // Completing the lesson is recorded once the take passes (self-checks don't block it).
  if (res && passed && !lessonsDone.includes(l.id)) queueMicrotask(() => !getState().lessonsDone.includes(l.id) && markLesson(l.id));

  const done = async (r: CaptureResult) => {
    setCamRes(cam.current?.end() ?? null);
    const short = tooShort(r);
    if (short) return setErr(short);
    setErr(null);
    const out = await scoreAndSave(r, { drill: 'course', title: l.title, itemId: l.id });
    setBest(`course:${l.id}`, out.rec.overall);
    setTicks({});
    setRes(out);
    setPhase('result');
  };

  if (phase === 'result' && res)
    return (
      <SessionShell title={l.course.title} onClose={onClose}>
        {direct && <CoachSays text={coachLine(direct, coach, res.rec.overall)} autoSpeak />}
        {leadMissed && l.course.id === 'direct' && (
          <div className="note warn"><b>{l.id === 'd-ask' || l.id === 'd-yesno' ? 'Your director' : 'Your listener'}, {direct?.wordsToPoint ?? 'many'} words in:</b>"Sorry, what do you need from me?" That is what a busy leader thinks when the point comes late. Try again with it first.</div>
        )}
        <Report
          rec={res.rec}
          xp={res.xp}
          prompt={prompt}
          frame={l.practice.frame}
          onRetry={() => { setRes(null); setPhase('speak'); }}
          onDone={nextLesson && passed ? () => open({ kind: 'clesson', id: nextLesson.id }) : onClose}
          doneLabel={nextLesson && passed ? `Next lesson: ${nextLesson.title}` : 'Done'}
        >
          {camRes && <PresenceResult s={camRes} />}
          {direct && direct.words > 0 && <DirectnessCard d={direct} />}
          <section className="card">
            <div className="row spread">
              <h3>Lesson checks</h3>
              <span className={`pill ${passed ? 'good' : 'warn'}`}>{passed ? 'Lesson complete' : 'Try once more'}</span>
            </div>
            <div className="stack-sm">
              {results.map((r) => (
                <div key={r.label} className="row" style={{ alignItems: 'flex-start' }}>
                  {r.self ? (
                    <span className="row" style={{ gap: 6 }}>
                      <button className="chip sm" aria-pressed={ticks[r.label] === true} onClick={() => setTicks((t) => ({ ...t, [r.label]: true }))}>Yes</button>
                      <button className="chip sm" aria-pressed={ticks[r.label] === false} onClick={() => setTicks((t) => ({ ...t, [r.label]: false }))}>Not yet</button>
                    </span>
                  ) : (
                    <span className="pill" style={{ color: r.pass === null ? 'var(--muted)' : r.pass ? 'var(--good)' : 'var(--bad)', minWidth: 28, justifyContent: 'center' }}>
                      {r.pass === null ? '–' : r.pass ? '✓' : '✗'}
                    </span>
                  )}
                  <span className="grow small" style={{ paddingTop: 4 }}>{r.label}</span>
                </div>
              ))}
            </div>
            {selfPending && <p className="small muted">Rate yourself on the checks only you can see.</p>}
            {!passed && <p className="small muted">Look at the ✗ checks, read the example again, and give it another go.</p>}
          </section>
        </Report>
      </SessionShell>
    );

  return (
    <SessionShell title={l.course.title} onClose={onClose} progress={idx / l.course.lessons.length}>
      <section className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">Lesson {idx + 1} of {l.course.lessons.length}</span>
        <h1>{l.title}</h1>
      </section>
      {phase === 'learn' && (
        <>
          <section className="card hero">
            <span className="eyebrow">The idea</span>
            <p style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 }}>{l.idea}</p>
          </section>
          <p className="muted">{l.why}</p>
          <section className="card">
            <h3>How to do it</h3>
            <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
              {l.how.map((p) => <li key={p}>{p}</li>)}
            </ol>
          </section>
          <section className="card">
            <h3>Before and after</h3>
            <p className="strike">{l.example.weak}</p>
            <div className="row">
              <p className="grow" style={{ fontWeight: 700, color: 'var(--good)' }}>{l.example.strong}</p>
              <HearButton text={l.example.strong} label="" className="iconbtn" />
            </div>
          </section>
          <div className="foot">
            <button className="btn signal block" onClick={() => setPhase('speak')}><Icon name="mic" />Practice it out loud</button>
          </div>
        </>
      )}
      {phase === 'speak' && (
        <>
          {l.practice.custom && (
            <section className="card">
              <label className="field" style={{ margin: 0 }}>
                <span><b>{l.practice.custom.label}</b></span>
                <textarea className="input" rows={2} maxLength={200} value={custom} placeholder={l.practice.custom.placeholder} onChange={(e) => setCustom(e.target.value)} />
              </label>
              <span className="small muted">Stays on your phone. Leave out names you don't want saved.</span>
            </section>
          )}
          <section className="card">
            <span className="eyebrow">{custom.trim() || l.practice.context}</span>
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: coach.color }}><CoachAvatar id={coach.id} mode="listening" size={52} /></span>
              <p className="grow" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{l.practice.prompt}</p>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {l.practice.frame.map((f, i) => <span key={f} className="pill">{i + 1}. {f}</span>)}
            </div>
            <span className="small muted">Checked: {l.checks.map((c) => c.label).join(' · ')}</span>
          </section>
          {usesCamera && <CameraPanel ref={cam} compact />}
          <MicStage maxSec={l.practice.secs + 20} needsTranscript autoStart={!usesCamera && !l.practice.custom} autoStopSilence={3.5} idleHint="Tap the mic and say it" onStart={() => void cam.current?.begin()} onDone={done} />
          {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
          <button className="btn ghost" onClick={() => setPhase('learn')}>Back to the lesson</button>
        </>
      )}
    </SessionShell>
  );
}

/** How fast the take got to the point, and what slowed it down. */
export function DirectnessCard({ d }: { d: Directness }) {
  const tone = d.score >= 80 ? 'good' : d.score >= 55 ? 'warn' : 'bad';
  return (
    <section className="card">
      <div className="row spread">
        <h3>Getting to the point</h3>
        <span className={`pill ${tone}`}>{d.score}</span>
      </div>
      <div className="grid2">
        <div className="stat"><b>{d.wordsToPoint === null ? '–' : d.wordsToPoint}</b><span>{d.wordsToPoint === null ? 'no clear point heard' : 'words before your point'}</span></div>
        <div className="stat"><b>{d.words}</b><span>words in total</span></div>
      </div>
      {d.hedges.length > 0 && <p className="small">Hedges: {d.hedges.map((h) => `"${h}"`).join(', ')}</p>}
      {d.opener && <p className="small">Opened with "{d.opener}" before the point.</p>}
      <p className="small muted">Aim: point within 10 words, no hedges. Directness is a guide from your words; the AI coach can check the meaning.</p>
    </section>
  );
}
