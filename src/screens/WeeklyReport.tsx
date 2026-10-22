import { useMemo, useState } from 'react';
import { targetById, type AccentId } from '../content/accents';
import { weeklyStats, type WeeklyStats } from '../lib/weekly';
import { sendFeedback } from '../lib/feedback';
import { open } from '../lib/nav';
import { DRILL_FOR_SKILL } from '../content/catalog';
import { useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { SessionShell, scoreTone, toast } from '../ui/ui';

const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const delta = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

/** Draws the report card as a 1080×1350 image for sharing. */
async function renderCard(w: WeeklyStats, name: string, accent: string | null): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext('2d')!;
  const display = '"Bricolage Grotesque", "Avenir Next", system-ui, sans-serif';
  const body = '"Atkinson Hyperlegible", system-ui, sans-serif';
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts optional */
  }
  const bg = g.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#155049');
  bg.addColorStop(1, '#0B2B28');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#F2AE2E';
  g.fillRect(80, 96, 64, 8);
  g.fillStyle = 'rgba(244,247,242,0.72)';
  g.font = `700 30px ${body}`;
  g.fillText(`SPEAK SHARP · ${fmt(w.from).toUpperCase()} – ${fmt(w.to).toUpperCase()}`, 80, 160);
  g.fillStyle = '#F4F7F2';
  g.font = `800 76px ${display}`;
  g.fillText(name ? `${name}'s week` : 'My week', 80, 250);
  g.font = `400 34px ${body}`;
  g.fillStyle = 'rgba(244,247,242,0.8)';
  g.fillText(accent ? `Speaking with confidence · ${accent} accent` : 'Speaking with confidence', 80, 304);

  const tiles: [string, string][] = [
    [String(w.daysActive), 'days practiced'],
    [String(w.rounds), 'speaking rounds'],
    [w.avg === null ? '–' : String(w.avg), 'average score'],
    [String(w.streak), 'day streak'],
  ];
  tiles.forEach(([v, l], i) => {
    const x = 80 + (i % 2) * 470;
    const y = 360 + Math.floor(i / 2) * 210;
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.beginPath();
    g.roundRect(x, y, 440, 180, 28);
    g.fill();
    g.fillStyle = '#F4F7F2';
    g.font = `800 88px ${display}`;
    g.fillText(v, x + 36, y + 106);
    g.fillStyle = 'rgba(244,247,242,0.72)';
    g.font = `400 30px ${body}`;
    g.fillText(l, x + 36, y + 152);
  });
  const d = delta(w.avg, w.prevAvg);
  if (d !== null && d !== 0) {
    g.fillStyle = d > 0 ? '#7BE0A4' : '#F5A08C';
    g.font = `700 30px ${body}`;
    // Beside the "average score" number (third tile).
    g.fillText(`${d > 0 ? '▲' : '▼'} ${Math.abs(d)} vs last week`, 80 + 220, 570 + 100);
  }

  let y = 840;
  const line = (label: string, value: string, color = '#F4F7F2') => {
    g.fillStyle = 'rgba(244,247,242,0.75)';
    g.font = `400 32px ${body}`;
    g.fillText(label, 80, y);
    g.fillStyle = color;
    g.font = `700 32px ${body}`;
    const wv = g.measureText(value).width;
    g.fillText(value, 1000 - wv, y);
    y += 56;
  };
  const up = w.skills.filter((x) => x.now > x.prev).sort((a, b) => b.now - b.prev - (a.now - a.prev))[0];
  if (up) line(`Most improved skill: ${up.name}`, `+${up.now - up.prev}`, '#7BE0A4');
  w.sounds.slice(0, 2).forEach((x) => line(`Sound: ${x.name}`, `${x.before} → ${x.now}`, x.now >= x.before ? '#7BE0A4' : '#F5A08C'));
  w.habits.slice(0, 2).forEach((h) => line(`"${h.label}"`, `${h.lastWeek} → ${h.thisWeek}`, h.thisWeek <= h.lastWeek ? '#7BE0A4' : '#F5A08C'));
  if (w.minutes) line('Time speaking', `${w.minutes} min`);

  g.fillStyle = '#F2AE2E';
  g.beginPath();
  g.roundRect(80, 1170, 920, 104, 26);
  g.fill();
  g.fillStyle = '#3A2600';
  g.font = `700 36px ${body}`;
  g.fillText(w.focusSkill ? `Next week's focus: ${w.focusSkill.name}` : 'Next week: keep the streak going', 116, 1236);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('render failed'))), 'image/png'));
}

export function WeeklyReport({ onClose }: { onClose: () => void }) {
  const s = useStore((x) => x);
  const w = useMemo(() => weeklyStats(s), [s]);
  const [busy, setBusy] = useState(false);
  const goal = s.profile.accentGoal;
  const accent = goal !== 'none' ? targetById(goal as AccentId).adjective : null;
  const d = delta(w.avg, w.prevAvg);

  const share = async () => {
    setBusy(true);
    try {
      const blob = await renderCard(w, s.profile.name, accent);
      const file = new File([blob], `speak-sharp-week-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'My week with Speak Sharp' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('Image saved');
      }
      sendFeedback('other', { target: 'weekly-share', tags: ['shared'] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Couldn\'t create the image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SessionShell title="Weekly report card" onClose={onClose}>
      <section className="card hero" style={{ gap: 14 }}>
        <span className="eyebrow">{fmt(w.from)} – {fmt(w.to)}</span>
        <h1 style={{ color: '#fff' }}>{w.daysActive >= 5 ? 'A strong week.' : w.daysActive >= 3 ? 'A solid week.' : w.daysActive ? 'A start. Build on it.' : 'A quiet week.'}</h1>
        <div className="grid2">
          <div className="stat"><b>{w.daysActive}<span style={{ fontSize: '1rem', opacity: 0.7 }}>/7</span></b><span>days practiced</span></div>
          <div className="stat"><b>{w.rounds}</b><span>speaking rounds{w.prevRounds ? ` (${w.prevRounds} before)` : ''}</span></div>
          <div className="stat">
            <b>{w.avg ?? '–'}</b>
            <span>average score{d ? <span style={{ color: d > 0 ? '#7BE0A4' : '#F5A08C', fontWeight: 700 }}> {d > 0 ? '▲' : '▼'}{Math.abs(d)}</span> : null}</span>
          </div>
          <div className="stat"><b>{w.streak}</b><span>day streak</span></div>
        </div>
      </section>

      {w.skills.length > 0 && (
        <section className="card">
          <h3>Skills vs last week</h3>
          <div className="stack-sm">
            {w.skills.map((x) => (
              <div key={x.skill} className="row spread small">
                <span>{x.name}</span>
                <span style={{ fontWeight: 700, color: x.now > x.prev ? 'var(--good)' : x.now < x.prev ? 'var(--bad)' : 'var(--muted)' }}>{x.prev} → {x.now}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {w.sounds.length > 0 && (
        <section className="card">
          <h3>{accent ? `${accent} sounds` : 'Sounds'}</h3>
          <div className="stack-sm">
            {w.sounds.map((x) => (
              <div key={x.name} className="row spread small">
                <span>{x.name}</span>
                <span style={{ fontWeight: 700, color: x.now >= x.before ? 'var(--good)' : 'var(--bad)' }}>{x.before} → {x.now}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {w.habits.length > 0 && (
        <section className="card">
          <h3>Habits in your words</h3>
          <div className="stack-sm">
            {w.habits.map((h) => (
              <div key={h.label} className="row spread small">
                <span>"{h.label}"</span>
                <span style={{ fontWeight: 700, color: h.thisWeek <= h.lastWeek ? 'var(--good)' : 'var(--bad)' }}>{h.lastWeek} → {h.thisWeek}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {w.best && (
        <section className="card tight">
          <span className="eyebrow">Best round</span>
          <div className="row spread">
            <span className="small" style={{ minWidth: 0 }}>{w.best.title}</span>
            <span className="pill" style={{ color: scoreTone(w.best.score) }}>{w.best.score}</span>
          </div>
        </section>
      )}

      {w.focusSkill && (
        <button className="card" style={{ cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', borderColor: 'var(--signal)' }} onClick={() => open({ kind: 'drill', id: DRILL_FOR_SKILL[w.focusSkill!.skill] })}>
          <span className="eyebrow">Next week's focus</span>
          <b style={{ fontFamily: 'var(--display)', fontSize: '1.25rem' }}>{w.focusSkill.name}</b>
          <span className="small muted">Your lowest skill lately ({w.focusSkill.score}). Start with one drill now.</span>
        </button>
      )}

      <div className="foot">
        <button className="btn signal block" disabled={busy} onClick={() => void share()}><Icon name="upload" />{busy ? 'Making the image…' : 'Share my report card'}</button>
        <button className="btn block" onClick={onClose}>Done</button>
      </div>
    </SessionShell>
  );
}
