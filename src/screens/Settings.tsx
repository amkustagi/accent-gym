import { useEffect, useRef, useState } from 'react';
import type { ListeningMode } from '../engine/capture';
import { NATURAL_VOICES, configureVoice, englishVoices, loadNatural, naturalState, onNaturalState, speak, systemVoiceIsBasic, type NaturalState } from '../engine/tts';
import { isIOS } from '../engine/speech';
import { testKey } from '../lib/ai';
import { backendEnabled, isPro, planName } from '../lib/backend';
import { open } from '../lib/nav';
import { exportData, importData, resetAll, updateProfile, updateSettings, useStore } from '../store/store';
import { Icon } from '../ui/Icon';
import { Seg, SessionShell, Switch, toast } from '../ui/ui';
import { AccentSetup } from './accent/AccentSetup';

export function download(name: string, type: string, text: string) {
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
  const url = location.href.split('#')[0].split('?')[0];
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Speakco//EN', 'BEGIN:VEVENT',
    `UID:speakco-daily-${Date.now()}@speakco`, `DTSTAMP:${start}`,
    `DTSTART:${start}`, `DTEND:${end}`, 'RRULE:FREQ=DAILY',
    'SUMMARY:Speakco practice (10 min)', `DESCRIPTION:Open Speakco: ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time to practice speaking', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

function useNatural(): NaturalState {
  const [s, set] = useState(naturalState());
  useEffect(() => onNaturalState(set), []);
  return s;
}

function VoiceSection() {
  const st = useStore((x) => x.settings);
  const natural = useNatural();
  const [voices, setVoices] = useState(englishVoices());
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const l = () => setVoices(englishVoices());
    speechSynthesis.addEventListener('voiceschanged', l);
    return () => speechSynthesis.removeEventListener('voiceschanged', l);
  }, []);
  const set = (p: Parameters<typeof updateSettings>[0]) => {
    updateSettings(p);
    configureVoice({ engine: p.voiceEngine, naturalVoice: p.naturalVoice, systemVoice: p.systemVoice });
  };
  const sample = 'Thanks for joining. Let\'s get started with the quarterly update.';
  return (
    <section className="card">
      <h3>Model voice</h3>
      <Seg label="Voice type" value={st.voiceEngine} onChange={(v) => set({ voiceEngine: v })} options={[{ v: 'natural', label: 'Natural (AI)' }, { v: 'system', label: 'Phone voice' }]} />
      {st.voiceEngine === 'natural' && (
        <div className="stack">
          {natural.status !== 'ready' && (
            <div className="note">
              <b>{natural.status === 'loading' ? `Downloading natural voice… ${Math.round(natural.progress * 100)}%` : 'Human-sounding voice, runs on your phone'}</b>
              {natural.status === 'loading' ? (
                <div className="progress" style={{ marginTop: 8 }}><i style={{ width: `${Math.round(natural.progress * 100)}%` }} /></div>
              ) : natural.status === 'error' ? (
                <span>{natural.message}</span>
              ) : (
                <span>A one-time download of about 90 MB (use Wi-Fi). After that it works offline. Until it's ready, the phone voice is used.</span>
              )}
              {natural.status !== 'loading' && (
                <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => void loadNatural().then(() => { toast('Natural voice ready'); void speak(sample); }).catch(() => undefined)}>
                  <Icon name="download" />{natural.status === 'error' ? 'Try again' : 'Download natural voice'}
                </button>
              )}
            </div>
          )}
          <div className="grid2">
            {NATURAL_VOICES.map((v) => (
              <button key={v.id} className={`opt${st.naturalVoice === v.id ? ' right' : ''}`} style={{ padding: '10px 12px' }} onClick={() => { set({ naturalVoice: v.id }); if (natural.status === 'ready') void speak(sample); }}>
                <b>{v.name}</b>
                <br />
                <span className="small muted">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {st.voiceEngine === 'system' && (
        <div className="field">
          <label htmlFor="sysvoice">Phone voice</label>
          <div className="row">
            <select id="sysvoice" className="input grow" value={st.systemVoice} onChange={(e) => set({ systemVoice: e.target.value })}>
              <option value="">Best available</option>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
            <button className="iconbtn" onClick={() => void speak(sample)} aria-label="Test voice"><Icon name="speaker" /></button>
          </div>
          {systemVoiceIsBasic() && (
            <span className="small muted">
              {isIOS() ? 'For a far better phone voice: iPhone Settings › Accessibility › Spoken Content › Voices › English › download "Ava (Premium)" or "Evan (Enhanced)", then reopen this app.' : 'Install a better voice in your phone\'s text-to-speech settings (Google: "Speech Services by Google").'}
            </span>
          )}
        </div>
      )}
      <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => void speak(sample)}><Icon name="speaker" />Test the voice</button>
    </section>
  );
}

export function Settings({ onClose }: { onClose: () => void }) {
  const s = useStore((x) => x);
  const [key, setKey] = useState(s.settings.aiKey);
  const [keyState, setKeyState] = useState<'idle' | 'testing' | 'ok' | 'bad'>('idle');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pro = isPro(s);
  const modes: { v: ListeningMode; label: string }[] = [{ v: 'full', label: 'Full' }, { v: 'transcript', label: 'Words only' }, { v: 'voice', label: 'Voice only' }];

  return (
    <SessionShell title="Settings" onClose={onClose}>
      <button className="card" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => open({ kind: 'account' })}>
        <div className="row">
          <span className="ic" style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', background: pro ? 'var(--signal-soft)' : 'var(--brand-soft)', color: pro ? 'var(--warn)' : 'var(--brand)' }}>
            <Icon name={pro ? 'crown' : 'user'} />
          </span>
          <span className="grow">
            <b>{s.account ? s.account.email : backendEnabled ? 'Sign in or create an account' : 'Account'}</b>
            <br />
            <span className="small muted">{!backendEnabled ? 'Owner mode: all Pro features unlocked' : s.account ? planName(s.account.plan) : 'Sync progress and unlock Pro'}</span>
          </span>
          <Icon name="chevron" className="chev" />
        </div>
      </button>

      <section className="card">
        <div className="row spread">
          <h3>Your profile</h3>
          <button className="btn quiet sm" onClick={() => open({ kind: 'profile' })}><Icon name="edit" />Edit</button>
        </div>
        <p className="small muted">Role, industry, situations and challenges shape your scenarios and daily plan.</p>
        <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => open({ kind: 'coach' })}><Icon name="sparkle" />What your coach knows</button>
        <div className="field">
          <label>Daily practice</label>
          <Seg label="Daily minutes" value={s.profile.minutes} onChange={(v) => updateProfile({ minutes: v })} options={[{ v: 5, label: '5 min' }, { v: 10, label: '10 min' }, { v: 15, label: '15 min' }]} />
        </div>
        <AccentSetup compact />
      </section>

      <VoiceSection />

      <section className="card">
        <h3>Listening</h3>
        <Seg label="Listening mode" value={s.settings.listening} onChange={(v) => updateSettings({ listening: v })} options={modes} />
        <p className="small muted">
          {s.settings.listening === 'full' && 'Transcript and voice analysis together. Best results.'}
          {s.settings.listening === 'transcript' && 'Only speech-to-text. Use this if your phone won\'t share the mic between the two. Pauses, pitch and playback are not available.'}
          {s.settings.listening === 'voice' && 'Only voice analysis (pauses, pitch, playback). Drills that need your words still turn on speech-to-text.'}
        </p>
      </section>

      <AccentScoringCard />

      <section className="card">
        <div className="row spread">
          <h3>AI coach</h3>
          <span className="pill">{pro && backendEnabled ? 'Included in Pro' : 'Optional'}</span>
        </div>
        <p className="small muted">Powers the AI coach, follow-up questions and fresh scenarios. {backendEnabled ? 'Included with Pro, or use' : 'Use'} your own Anthropic API key (about a cent per answer). The key stays on this phone.</p>
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
        <h3>Help us improve</h3>
        <div className="grid2">
          <button className="btn quiet" onClick={() => open({ kind: 'feedback', type: 'bug' })}><Icon name="info" />Report a problem</button>
          <button className="btn quiet" onClick={() => open({ kind: 'feedback', type: 'idea' })}><Icon name="sparkle" />Suggest an idea</button>
        </div>
        <div className="row spread">
          <div className="stack-sm grow">
            <b>Share anonymous usage</b>
            <span className="small muted">Counts of drills used and error messages, never your recordings or transcripts</span>
          </div>
          <Switch label="Share anonymous usage" checked={s.profile.consentAnalytics} onChange={(v) => updateProfile({ consentAnalytics: v })} />
        </div>
        <p className="small muted">{s.feedback.length} pieces of feedback given so far. Thank you.</p>
      </section>

      <section className="card">
        <h3>Daily reminder</h3>
        <p className="small muted">Adds a repeating 10-minute practice event to your calendar app, with an alert.</p>
        <div className="row">
          <input aria-label="Reminder time" type="time" className="input" style={{ maxWidth: 140 }} value={s.settings.reminderTime} onChange={(e) => updateSettings({ reminderTime: e.target.value })} />
          <button className="btn primary grow" onClick={() => download('speakco-reminder.ics', 'text/calendar', reminderIcs(s.settings.reminderTime))}>
            <Icon name="calendar" />Add to calendar
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Your data</h3>
        <p className="small muted">{s.account ? 'Progress syncs to your account. Recordings stay on this phone.' : 'Everything stays on this phone. Back it up before switching phones or clearing your browser.'}</p>
        <div className="row spread">
          <div className="stack-sm grow">
            <b>Keep recordings</b>
            <span className="small muted">Last 60 takes, for playback</span>
          </div>
          <Switch label="Keep recordings" checked={s.settings.keepRecordings} onChange={(v) => updateSettings({ keepRecordings: v })} />
        </div>
        <div className="grid2">
          <button className="btn quiet" onClick={() => download(`speakco-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', exportData())}>
            <Icon name="download" />Back up
          </button>
          <button className="btn quiet" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" />Restore
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          toast(importData(await f.text()) ? 'Backup restored' : 'That file isn\'t a Speakco backup');
          e.target.value = '';
        }} />
        {!confirmReset ? (
          <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => setConfirmReset(true)}>Erase all data on this phone</button>
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

      <button className="btn ghost" onClick={() => open({ kind: 'whatsnew' })}>What's new in v{__APP_VERSION__}</button>
      <p className="small muted" style={{ textAlign: 'center' }}>
        Speakco v{__APP_VERSION__} · Your voice is analyzed on this phone. Speech-to-text uses your phone's or browser's built-in service.
      </p>
      <p className="small muted" style={{ textAlign: 'center' }}>
        <a href="privacy.html" target="_blank" rel="noreferrer">Privacy</a> · <a href="terms.html" target="_blank" rel="noreferrer">Terms of use</a>
      </p>
    </SessionShell>
  );
}

function AccentScoringCard() {
  const st = useStore((x) => x.settings);
  const pro = useStore((x) => isPro(x) && !!x.account);
  const [key, setKey] = useState(st.azureKey);
  const [region, setRegion] = useState(st.azureRegion);
  return (
    <section className="card">
      <div className="row spread">
        <h3>Precise accent scoring</h3>
        <span className="pill">{pro ? 'Included in Pro' : st.azureKey ? 'Your key' : 'Off'}</span>
      </div>
      <p className="small muted">
        Scores every word (and, for American English, every sound) against native speakers, using Microsoft Azure Pronunciation Assessment.{' '}
        {backendEnabled ? 'Included with Pro. For testing you can also' : 'To test it now,'} add your own Azure Speech key: create a free Speech resource at portal.azure.com, then copy Key 1 and the region (for example "eastus").
      </p>
      <div className="field">
        <label htmlFor="az-key">Azure Speech key</label>
        <input id="az-key" className="input mono" type="password" value={key} onChange={(e) => setKey(e.target.value.trim())} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="az-region">Region</label>
        <input id="az-region" className="input mono" placeholder="eastus" value={region} onChange={(e) => setRegion(e.target.value.trim())} autoComplete="off" />
      </div>
      <div className="row">
        <button className="btn primary grow" disabled={!key || !region} onClick={() => { updateSettings({ azureKey: key, azureRegion: region }); toast('Precise scoring is on. Take the accent check to try it.'); }}>Save</button>
        {st.azureKey && <button className="btn quiet" onClick={() => { updateSettings({ azureKey: '', azureRegion: '' }); setKey(''); setRegion(''); toast('Key removed'); }}>Remove</button>}
      </div>
      <span className="small muted">The key stays on this phone. Microsoft bills per hour of scored speech (roughly $1–2) and offers a free tier; check current Azure pricing.</span>
    </section>
  );
}
