// Feedback collection: diagnostics, automatic error capture, and delivery to the developer.
import { sttSupported, isIOS, isSafari } from '../engine/speech';
import { naturalState } from '../engine/tts';
import { addFeedback, getState, logError, type FeedbackKind } from '../store/store';
import { backendEnabled, flushFeedback } from './backend';

export const FEEDBACK_EMAIL = (import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined) || 'avinash.kustagi@gmail.com';
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
  };
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

/** Text for a bug report or idea, for email or GitHub when no backend is connected. */
export function reportBody(kind: string, text: string, includeDiag: boolean): string {
  return `${text}\n\n— ${kind} from Speak Sharp ${__APP_VERSION__}${includeDiag ? `\n\nDiagnostics:\n${JSON.stringify(diagnostics(), null, 2)}` : ''}`;
}

export function mailtoUrl(subject: string, body: string) {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
}

export function githubIssueUrl(title: string, body: string) {
  return `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body.slice(0, 6000))}`;
}

/** Weekly check-in is due 7 days after the last one, once the user has some history. */
export function checkinDue(): boolean {
  const s = getState();
  return s.sessions.length >= 3 && Date.now() - s.lastCheckin > 7 * 864e5 && Date.now() - s.profile.createdAt > 3 * 864e5;
}
