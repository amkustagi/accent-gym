import { useEffect, type ReactNode } from 'react';
import { close, go, useOverlay, useTab, type Tab } from './lib/nav';
import { setPreferredVoice } from './engine/speech';
import { useStore } from './store/store';
import { Icon } from './ui/Icon';
import { ToastHost } from './ui/ui';
import { Today } from './screens/Today';
import { Practice } from './screens/Practice';
import { Speak } from './screens/Speak';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { LessonView } from './screens/Lesson';
import { SessionView } from './screens/SessionView';
import { SimulatorDrill } from './screens/drills/Simulator';
import { SwapsDrill } from './screens/drills/Swaps';
import { ConcisionDrill, StructureDrill } from './screens/drills/Content';
import { PaceDrill, PausesDrill, VarietyDrill } from './screens/drills/Voice';
import { ClarityDrill, PronunciationDrill, WarmupDrill } from './screens/drills/Articulation';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'practice', label: 'Practice', icon: 'grid' },
  { id: 'speak', label: 'Simulator', icon: 'mic' },
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
  if (!o) return null;
  const done = () => {
    if (history.state?.overlay) history.back();
    else close();
  };
  let el: ReactNode = null;
  if (o.kind === 'settings') el = <Settings onClose={done} />;
  else if (o.kind === 'lesson') el = <LessonView id={o.id} onClose={done} />;
  else if (o.kind === 'session') el = <SessionView id={o.id} onClose={done} />;
  else if (o.kind === 'drill') {
    const k = `${o.id}-${o.param ?? ''}`;
    switch (o.id) {
      case 'simulator': el = <SimulatorDrill key={k} param={o.param} onClose={done} />; break;
      case 'pressure': el = <SimulatorDrill key={k} pressure onClose={done} />; break;
      case 'swaps': el = <SwapsDrill key={k} onClose={done} />; break;
      case 'structure': el = <StructureDrill key={k} onClose={done} />; break;
      case 'concision': el = <ConcisionDrill key={k} onClose={done} />; break;
      case 'pace': el = <PaceDrill key={k} onClose={done} />; break;
      case 'pauses': el = <PausesDrill key={k} onClose={done} />; break;
      case 'variety': el = <VarietyDrill key={k} onClose={done} />; break;
      case 'warmup': el = <WarmupDrill key={k} onClose={done} />; break;
      case 'clarity': el = <ClarityDrill key={k} onClose={done} />; break;
      case 'pronunciation': el = <PronunciationDrill key={k} param={o.param} onClose={done} />; break;
    }
  }
  return <>{el}</>;
}

export function App() {
  const loaded = useStore((s) => s.loaded);
  const onboarded = useStore((s) => s.profile.onboarded);
  const voice = useStore((s) => s.settings.voice);
  const tab = useTab();
  useEffect(() => setPreferredVoice(voice), [voice]);

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
