import { useEffect, useRef, useState } from 'react';
import { englishVoices, setPreferredVoice, speak } from '../engine/speech';
import type { ListeningMode } from '../engine/capture';
import { testKey } from '../lib/ai';
import { exportData, importData, resetAll, updateProfile, updateSettings, useStore, type Goal } from '../store/store';
import { Icon } from '../ui/Icon';
import { Seg, SessionShell, Switch, toast } from '../ui/ui';

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function reminderIcs(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
  const endD = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m + 10);
  const end = `${endD.getFullYear()}${pad(endD.getMonth() + 1)}${pad(endD.getDate())}T${pad(endD.getHours())}${pad(endD.getMinutes())}00`;
  const url = location.href.split('#')[0];
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Speak Sharp//EN', 'BEGIN:VEVENT',
    `UID:speak-sharp-daily-${Date.now()}@speak-sharp`, `DTSTAMP:${start}`,
    `DTSTART:${start}`, `DTEND:${end}`, 'RRULE:FREQ=DAILY',
    'SUMMARY:Speak Sharp practice (10 min)', `DESCRIPTION:Open Speak Sharp: ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time to practice speaking', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function Settings({ onClose }: { onClose: () => void }) {
  const s = useStore((x) => x);
  const [voices, setVoices] = useState(englishVoices());
  const [key, setKey] = useState(s.settings.aiKey);
  const [keyState, setKeyState] = useState<'idle' | 'testing' | 'ok' | 'bad'>('idle');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const l = () => setVoices(englishVoices());
    speechSynthesis.addEventListener('voiceschanged', l);
    return () => speechSynthesis.removeEventListener('voiceschanged', l);
  }, []);

  const modes: { v: ListeningMode; label: string }[] = [{ v: 'full', label: 'Full' }, { v: 'transcript', label: 'Words only' }, { v: 'voice', label: 'Voice only' }];

  return (
    <SessionShell title="Settings" onClose={onClose}>
      <section className="card">
        <h3>You</h3>
        <div className="field">
          <label htmlFor="name">First name</label>
          <input id="name" className="input" value={s.profile.name} onChange={(e) => updateProfile({ name: e.target.value.slice(0, 30) })} autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="goal">Main goal</label>
          <select id="goal" className="input" value={s.profile.goal} onChange={(e) => updateProfile({ goal: e.target.value as Goal })}>
            <option value="meetings">Speak up in meetings</option>
            <option value="interviews">Ace interviews</option>
            <option value="presenting">Present with impact</option>
            <option value="everyday">Everyday confidence</option>
          </select>
        </div>
        <div className="field">
          <label>Daily practice</label>
          <Seg label="Daily minutes" value={s.profile.minutes} onChange={(v) => updateProfile({ minutes: v })} options={[{ v: 5, label: '5 min' }, { v: 10, label: '10 min' }, { v: 15, label: '15 min' }]} />
        </div>
        <div className="row spread">
          <div className="stack-sm grow">
            <b>Pronunciation track</b>
            <span className="small muted">Adds a sound of the day (V/W, TH, R…) to your plan</span>
          </div>
          <Switch label="Pronunciation track" checked={s.profile.pronunciation} onChange={(v) => updateProfile({ pronunciation: v })} />
        </div>
      </section>

      <section className="card">
        <h3>Listening</h3>
        <Seg label="Listening mode" value={s.settings.listening} onChange={(v) => updateSettings({ listening: v })} options={modes} />
        <p className="small muted">
          {s.settings.listening === 'full' && 'Transcript and voice analysis together. Best results.'}
          {s.settings.listening === 'transcript' && 'Only speech-to-text. Use this if your phone won\'t share the mic between the two. Pauses and pitch are not measured.'}
          {s.settings.listening === 'voice' && 'Only voice analysis (pace from audio, pauses, pitch). No transcript, fillers or weak words.'}
        </p>
        <div className="field">
          <label htmlFor="voice">Model voice</label>
          <div className="row">
            <select id="voice" className="input grow" value={s.settings.voice} onChange={(e) => { updateSettings({ voice: e.target.value }); setPreferredVoice(e.target.value); }}>
              <option value="">Automatic (best available)</option>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
            <button className="iconbtn" onClick={() => speak('Thanks for joining. Let\'s get started.')} aria-label="Test voice"><Icon name="speaker" /></button>
          </div>
          <span className="small muted">On iPhone, download better voices in Settings › Accessibility › Spoken Content › Voices.</span>
        </div>
      </section>

      <section className="card">
        <div className="row spread">
          <h3>AI coach</h3>
          <span className="pill">Optional</span>
        </div>
        <p className="small muted">Adds a "Coach this answer" button to simulator reports: Claude rewrites your answer and gives three specific fixes. Uses your own Anthropic API key, billed per use (about a cent per answer). The key stays on this phone.</p>
        <div className="field">
          <label htmlFor="key">Anthropic API key</label>
          <input id="key" className="input mono" type="password" placeholder="sk-ant-…" value={key} onChange={(e) => { setKey(e.target.value.trim()); setKeyState('idle'); }} autoComplete="off" />
        </div>
        <div className="row">
          <button className="btn primary grow" disabled={!key || keyState === 'testing'} onClick={async () => {
            setKeyState('testing');
            const ok = await testKey(key);
            setKeyState(ok ? 'ok' : 'bad');
            if (ok) { updateSettings({ aiKey: key }); toast('AI coach is on'); }
          }}>
            {keyState === 'testing' ? 'Checking…' : 'Save and test'}
          </button>
          {s.settings.aiKey && <button className="btn quiet" onClick={() => { updateSettings({ aiKey: '' }); setKey(''); setKeyState('idle'); toast('Key removed'); }}>Remove</button>}
        </div>
        {keyState === 'bad' && <div className="note bad">That key didn't work. Check it at console.anthropic.com.</div>}
        {keyState === 'ok' && <div className="note good">Connected.</div>}
      </section>

      <section className="card">
        <h3>Daily reminder</h3>
        <p className="small muted">Adds a repeating 10-minute practice event to your calendar app, with an alert.</p>
        <div className="row">
          <input aria-label="Reminder time" type="time" className="input" style={{ maxWidth: 140 }} value={s.settings.reminderTime} onChange={(e) => updateSettings({ reminderTime: e.target.value })} />
          <button className="btn primary grow" onClick={() => download('speak-sharp-reminder.ics', 'text/calendar', reminderIcs(s.settings.reminderTime))}>
            <Icon name="calendar" />Add to calendar
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Your data</h3>
        <p className="small muted">Everything stays on this phone. Back it up before switching phones or clearing your browser.</p>
        <div className="row spread">
          <div className="stack-sm grow">
            <b>Keep recordings</b>
            <span className="small muted">Last 40 takes, for playback</span>
          </div>
          <Switch label="Keep recordings" checked={s.settings.keepRecordings} onChange={(v) => updateSettings({ keepRecordings: v })} />
        </div>
        <div className="grid2">
          <button className="btn quiet" onClick={() => download(`speak-sharp-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', exportData())}>
            <Icon name="download" />Back up
          </button>
          <button className="btn quiet" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" />Restore
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          toast(importData(await f.text()) ? 'Backup restored' : 'That file isn\'t a Speak Sharp backup');
          e.target.value = '';
        }} />
        {!confirmReset ? (
          <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => setConfirmReset(true)}>Erase all data</button>
        ) : (
          <div className="note bad">
            <b>Erase everything?</b>
            This deletes your history, recordings and settings from this phone. It can't be undone.
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="btn sm" style={{ background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' }} onClick={async () => { await resetAll(); onClose(); }}>Erase</button>
            </div>
          </div>
        )}
      </section>

      <p className="small muted" style={{ textAlign: 'center' }}>
        Speak Sharp {__APP_VERSION__} · Your voice is analyzed on this phone. Speech-to-text uses your browser's built-in service.
      </p>
    </SessionShell>
  );
}
