import { Component, type ReactNode } from 'react';
import { logError } from '../store/store';
import { diagnostics, githubIssueUrl, reportBody, sendFeedback } from '../lib/feedback';
import { fileReport, reportsOnline } from '../lib/report';

/** Shows a recovery screen instead of a blank page if a screen crashes, and records the error. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; sent: string }> {
  state = { error: null as Error | null, sent: '' };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    logError(`Crash: ${error.message}`);
  }

  async report(e: Error) {
    this.setState({ sent: 'Sending…' });
    const f = sendFeedback('bug', { text: `The app crashed: ${e.message}`, meta: { ...diagnostics(), stack: (e.stack ?? '').slice(0, 2000), via: 'crash', autoFile: true } });
    try {
      const t = await fileReport(f);
      this.setState({ sent: `Sent as ticket #${t.number}. Thank you.` });
    } catch {
      this.setState({ sent: 'Saved. It sends by itself when you\'re back online.' });
    }
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
        {this.state.sent ? (
          <p className="small muted" style={{ textAlign: 'center' }}>{this.state.sent}</p>
        ) : reportsOnline ? (
          <button className="btn quiet block" onClick={() => void this.report(e)}>Send this to the team</button>
        ) : (
          <a className="btn quiet block" href={githubIssueUrl(`Crash: ${e.message.slice(0, 60)}`, reportBody('Crash', e.stack ?? e.message, true))} target="_blank" rel="noreferrer">Report this problem</a>
        )}
      </div>
    );
  }
}
