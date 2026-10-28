// Feedback collection: diagnostics, automatic error capture, and delivery to the developer.
import { sttSupported, isIOS, isSafari } from '../engine/speech';
import { naturalState } from '../engine/tts';
import { addFeedback, getState, logError, type FeedbackKind } from '../store/store';
import { backendEnabled, flushFeedback } from './backend';
import { currentScreen, screenName, trail } from './nav';

export const ISSUES_URL = 'https://github.com/amkustagi/accent-gym/issues/new';

export function diagnostics(): Record<string, unknown> {
  const s = getState();
  return {
    version: __APP_VERSION__,
    userAgent: navigator.userAgent,
    platform: isIOS() ? 'iOS' : /android/i.test(navigator.userAgent) ? 'Android' : navigator.platform,
    safari: isSafari(),
    standalone: matchMedia('(display-mode: standalone)').matches,
    speechRecognition: sttSupported(),
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    audioSession: 'audioSession' in navigator,
    naturalVoice: naturalState().status,
    listening: s.settings.listening,
    voiceEngine: s.settings.voiceEngine,
    sessions: s.sessions.length,
    recentErrors: s.errors.slice(-5),
    screen: originScreen(),
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    recentScreens: trail.slice(-12).map((c) => `${new Date(c.t).toISOString().slice(11, 19)} ${c.to}`),
  };
}

/** The screen the user was on when they tapped the flag (the report screen itself isn't useful). */
export function originScreen(): string {
  const now = currentScreen();
  if (now !== 'report') return now;
  return trail.length ? trail[trail.length - 1].to : screenName(null);
}

export function installErrorCapture() {
  window.addEventListener('error', (e) => logError(`${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => logError(`Unhandled: ${String((e.reason as Error)?.message ?? e.reason)}`));
}

/** Records feedback and, when accounts are connected, uploads it in the background. */
export function sendFeedback(kind: FeedbackKind, data: { target?: string; rating?: number; tags?: string[]; text?: string; meta?: Record<string, unknown> } = {}) {
  const f = addFeedback({ kind, ...data });
  if (backendEnabled) void flushFeedback().catch(() => undefined);
  return f;
}

/** Text for a bug report or idea, for the GitHub fallback when automatic sending isn't set up. */
export function reportBody(kind: string, text: string, includeDiag: boolean): string {
  return `${text}\n\n— ${kind} from Speakco ${__APP_VERSION__}${includeDiag ? `\n\nDiagnostics:\n${JSON.stringify(diagnostics(), null, 2)}` : ''}`;
}

export function githubIssueUrl(title: string, body: string) {
  return `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body.slice(0, 6000))}`;
}

/** Weekly check-in is due 7 days after the last one, once the user has some history. */
export function checkinDue(): boolean {
  const s = getState();
  return s.sessions.length >= 3 && Date.now() - s.lastCheckin > 7 * 864e5 && Date.now() - s.profile.createdAt > 3 * 864e5;
}
