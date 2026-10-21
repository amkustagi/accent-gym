import { SCENARIOS } from '../content/scenarios';
import { useStore } from '../store/store';
import { Report } from '../ui/Report';
import { SessionShell } from '../ui/ui';

export function SessionView({ id, onClose }: { id: string; onClose: () => void }) {
  const rec = useStore((s) => s.sessions.find((x) => x.id === id));
  if (!rec) return null;
  const sc = SCENARIOS.find((s) => s.prompt === rec.title);
  return (
    <SessionShell title={new Date(rec.t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} onClose={onClose}>
      <Report rec={rec} prompt={sc?.prompt ?? (rec.drill === 'baseline' ? rec.title : undefined)} frame={sc?.frame} onDone={onClose} doneLabel="Close" />
    </SessionShell>
  );
}
