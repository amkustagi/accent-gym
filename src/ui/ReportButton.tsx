import { useState } from 'react';
import { open } from '../lib/nav';
import { captureScreen } from '../lib/screenshot';
import { Icon } from './Icon';

/** The small flag in screen headers: snaps the screen, then opens the report. */
export function ReportButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="iconbtn ghost"
      data-noshot=""
      aria-label="Report a problem or idea"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const shot = await captureScreen();
        setBusy(false);
        open({ kind: 'report', shot });
      }}
    >
      <Icon name="flag" size={20} />
    </button>
  );
}

