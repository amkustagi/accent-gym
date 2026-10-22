import { Component, type ReactNode } from 'react';
import { logError } from '../store/store';
import { mailtoUrl, reportBody } from '../lib/feedback';

/** Shows a recovery screen instead of a blank page if a screen crashes, and records the error. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    logError(`Crash: ${error.message}`);
  }

  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    return (
      <div className="page" style={{ paddingTop: 60 }}>
        <h1>Something went wrong</h1>
        <p className="muted">That screen hit an error. Your progress is saved.</p>
        <div className="note bad mono">{e.message}</div>
        <button className="btn primary block" onClick={() => location.reload()}>Reload the app</button>
        <a className="btn quiet block" href={mailtoUrl('Speak Sharp crash', reportBody('Crash', e.stack ?? e.message, true))}>Report this problem</a>
      </div>
    );
  }
}
