import { useRef, useState } from 'react';
import type { CaptureResult } from '../../engine/capture';
import type { PresenceSummary } from '../../engine/face';
import { scoreAndSave, tooShort } from '../../lib/session';
import { setBest, type SessionRecord } from '../../store/store';
import { CameraPanel, PresenceResult, presenceScore, type CameraHandle } from '../../ui/CameraPanel';
import { MicStage } from '../../ui/MicStage';
import { Report } from '../../ui/Report';
import { SessionShell } from '../../ui/ui';

const PROMPTS = [
  { context: 'Weekly video call with your team', prompt: 'Give a 30-second status update, looking at the lens.' },
  { context: 'First video call with a new client', prompt: 'Introduce yourself and what you\'ll do for them.' },
  { context: 'Remote interview', prompt: '"Tell me about yourself." Answer in 45 seconds.' },
  { context: 'Leadership review on video', prompt: 'Share one result and what you need next.' },
  { context: 'Video call, someone joins late', prompt: 'Catch them up in 20 seconds.' },
];

export function CameraDrill({ onClose }: { onClose: () => void }) {
  const cam = useRef<CameraHandle>(null);
  const [p, setP] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [res, setRes] = useState<{ rec: SessionRecord; xp: number; cam: PresenceSummary | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const done = async (r: CaptureResult) => {
    const summary = cam.current?.end() ?? null;
    const short = tooShort(r);
    if (short) return setErr(short);
    setErr(null);
    const out = await scoreAndSave(r, {
      drill: 'camera',
      title: `On camera: ${p.context}`,
      extra: summary ? { 'eye contact': `${summary.eyeContactPct}%`, 'camera score': presenceScore(summary) } : undefined,
    });
    if (summary) setBest('camera', presenceScore(summary));
    setRes({ ...out, cam: summary });
  };

  if (res)
    return (
      <SessionShell title="Video presence" onClose={onClose}>
        <Report rec={res.rec} xp={res.xp} prompt={p.prompt} onRetry={() => setRes(null)} onDone={onClose}>
          {res.cam ? <PresenceResult s={res.cam} /> : <div className="note">Turn on the camera check next time to see eye contact, framing and lighting.</div>}
        </Report>
      </SessionShell>
    );

  return (
    <SessionShell title="Video presence" onClose={onClose}>
      <section className="card">
        <span className="eyebrow">{p.context}</span>
        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.prompt}</p>
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setP(PROMPTS[(PROMPTS.indexOf(p) + 1) % PROMPTS.length])}>Another prompt</button>
      </section>
      <CameraPanel ref={cam} />
      <MicStage maxSec={60} needsTranscript size="sm" autoStopSilence={4} idleHint="Tap the mic and talk to the camera" onStart={() => void cam.current?.begin()} onDone={done} showTranscript={false} />
      {err && <div className="note bad"><b>Let's try that again</b>{err}</div>}
    </SessionShell>
  );
}
