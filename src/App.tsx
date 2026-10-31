import { useEffect, type ReactNode } from 'react';
import { close, go, useOverlay, useTab, type Tab } from './lib/nav';
import { configureVoice } from './engine/tts';
import { open as openOverlay } from './lib/nav';
import { sameVersion } from './lib/version';
import { noteDrillOpened, useStore } from './store/store';
import { CoachScreen } from './screens/CoachScreen';
import { CourseLessonView, CourseView } from './screens/Courses';
import { CameraDrill } from './screens/drills/Camera';
import { ChallengesScreen } from './screens/Challenges';
import { VoiceReportScreen } from './screens/VoiceReport';
import { Icon } from './ui/Icon';
import { ToastHost } from './ui/ui';
import { Today } from './screens/Today';
import { Practice } from './screens/Practice';
import { Speak } from './screens/Speak';
import { Progress } from './screens/Progress';
import { AccentHome } from './screens/accent/AccentHome';
import { AccentCheckDrill } from './screens/accent/AccentCheck';
import { SoundLessonDrill } from './screens/accent/SoundLesson';
import { ShadowDrill } from './screens/accent/Shadow';
import { WeeklyReport } from './screens/WeeklyReport';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { LessonView } from './screens/Lesson';
import { SessionView } from './screens/SessionView';
import { RolePlayDrill, SimulatorDrill } from './screens/drills/Simulator';
import { AccountScreen, Paywall } from './screens/Account';
import { ProfileScreen } from './screens/Profile';
import { WhatsNew } from './screens/WhatsNew';
import { SwapsDrill } from './screens/drills/Swaps';
import { ConcisionDrill, StructureDrill } from './screens/drills/Content';
import { SayItFirstDrill } from './screens/drills/SayItFirst';
import { PaceDrill, PausesDrill, VarietyDrill } from './screens/drills/Voice';
import { ClarityDrill, WarmupDrill } from './screens/drills/Articulation';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'practice', label: 'Practice', icon: 'grid' },
  { id: 'speak', label: 'Simulator', icon: 'mic' },
  { id: 'accent', label: 'Accent', icon: 'globe' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
];

function OverlayHost() {
  const o = useOverlay();
  useEffect(() => {
    if (!o) return;
    const onPop = () => close();
    history.pushState({ overlay: true }, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [o]);
  useEffect(() => {
    if (o?.kind === 'drill') noteDrillOpened(o.id);
  }, [o]);
  if (!o) return null;
  const done = () => {
    if (history.state?.overlay) history.back();
    else close();
  };
  let el: ReactNode = null;
  if (o.kind === 'settings') el = <Settings onClose={done} />;
  else if (o.kind === 'lesson') el = <LessonView id={o.id} onClose={done} />;
  else if (o.kind === 'session') el = <SessionView id={o.id} onClose={done} />;
  else if (o.kind === 'account') el = <AccountScreen onClose={done} />;
  else if (o.kind === 'paywall') el = <Paywall reason={o.reason} onClose={done} />;
  else if (o.kind === 'feedback') el = <VoiceReportScreen type={o.type} onClose={done} />;
  else if (o.kind === 'report') el = <VoiceReportScreen shot={o.shot} onClose={done} />;
  else if (o.kind === 'profile') el = <ProfileScreen onClose={done} />;
  else if (o.kind === 'whatsnew') el = <WhatsNew onClose={done} />;
  else if (o.kind === 'weekly') el = <WeeklyReport onClose={done} />;
  else if (o.kind === 'coach') el = <CoachScreen onClose={done} />;
  else if (o.kind === 'course') el = <CourseView key={o.id} id={o.id} onClose={done} />;
  else if (o.kind === 'clesson') el = <CourseLessonView key={o.id} id={o.id} onClose={done} />;
  else if (o.kind === 'challenges') el = <ChallengesScreen onClose={done} />;
  else if (o.kind === 'drill') {
    const k = `${o.id}-${o.param ?? ''}`;
    switch (o.id) {
      case 'simulator': el = <SimulatorDrill key={k} param={o.param} onClose={done} />; break;
      case 'pressure': el = <SimulatorDrill key={k} pressure onClose={done} />; break;
      case 'swaps': el = <SwapsDrill key={k} param={o.param} onClose={done} />; break;
      case 'roleplay': el = <RolePlayDrill key={k} onClose={done} />; break;
      case 'structure': el = <StructureDrill key={k} onClose={done} />; break;
      case 'concision': el = <ConcisionDrill key={k} onClose={done} />; break;
      case 'sayitfirst': el = <SayItFirstDrill key={k} onClose={done} />; break;
      case 'pace': el = <PaceDrill key={k} onClose={done} />; break;
      case 'pauses': el = <PausesDrill key={k} onClose={done} />; break;
      case 'variety': el = <VarietyDrill key={k} onClose={done} />; break;
      case 'warmup': el = <WarmupDrill key={k} onClose={done} />; break;
      case 'clarity': el = <ClarityDrill key={k} onClose={done} />; break;
      case 'pronunciation': el = <SoundLessonDrill key={k} param={o.param} onClose={done} />; break;
      case 'accentcheck': el = <AccentCheckDrill key={k} onClose={done} />; break;
      case 'shadow': el = <ShadowDrill key={k} param={o.param} onClose={done} />; break;
      case 'camera': el = <CameraDrill key={k} onClose={done} />; break;
    }
  }
  return <>{el}</>;
}

export function App() {
  const loaded = useStore((s) => s.loaded);
  const onboarded = useStore((s) => s.profile.onboarded);
  const voiceEngine = useStore((s) => s.settings.voiceEngine);
  const naturalVoice = useStore((s) => s.settings.naturalVoice);
  const systemVoice = useStore((s) => s.settings.systemVoice);
  const lastSeen = useStore((s) => s.lastSeenVersion);
  const tab = useTab();
  useEffect(() => configureVoice({ engine: voiceEngine, naturalVoice, systemVoice }), [voiceEngine, naturalVoice, systemVoice]);
  useEffect(() => {
    // Existing users see what changed once after an update.
    if (loaded && onboarded && !sameVersion(lastSeen, __APP_VERSION__)) openOverlay({ kind: 'whatsnew' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, onboarded]);

  if (!loaded)
    return (
      <div className="splash" aria-busy="true">
        <Icon name="wave" size={44} />
      </div>
    );
  if (!onboarded) return <Onboarding />;

  return (
    <div className="app">
      <main>
        {tab === 'today' && <Today />}
        {tab === 'practice' && <Practice />}
        {tab === 'speak' && <Speak />}
        {tab === 'accent' && <AccentHome />}
        {tab === 'progress' && <Progress />}
      </main>
      <div className="tabbar">
        <nav aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={`tab${t.id === 'speak' ? ' tab-mic' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
              {t.id === 'speak' ? (
                <span className="bubble"><Icon name="mic" /></span>
              ) : (
                <Icon name={t.icon} />
              )}
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <OverlayHost />
      <ToastHost />
    </div>
  );
}
