// Regression tests for tinyhustlers/hq#90: keys the user types in (Claude and Azure) never leave the phone.
import { describe, expect, it } from 'vitest';
import { backupOf, keepDeviceKeys, migrate } from '../store/store';
import { mergeStates, syncPayload } from './backend';

const withKeys = () => {
  const s = migrate({});
  return { ...s, settings: { ...s.settings, aiKey: 'test-claude-key', azureKey: 'test-azure-key', azureRegion: 'canadacentral' } };
};

describe('device-only keys (hq#90)', () => {
  it('are blanked in the account sync payload', () => {
    const p = syncPayload(withKeys());
    expect(p.settings.aiKey).toBe('');
    expect(p.settings.azureKey).toBe('');
    expect(JSON.stringify(p)).not.toContain('test-azure-key');
  });
  it('are blanked in backup files', () => {
    const json = backupOf(withKeys());
    expect(json).not.toContain('test-azure-key');
    expect(json).not.toContain('test-claude-key');
    expect(JSON.parse(json).settings.azureRegion).toBe('canadacentral');
  });
  it('are kept on this phone when a newer cloud copy is merged', () => {
    const local = { ...withKeys(), updatedAt: 10 };
    const remote = { ...migrate({}), updatedAt: 20, settings: { ...migrate({}).settings, aiKey: '', azureKey: 'old-cloud-key', coach: 'pip' as const } };
    const m = mergeStates(local, remote);
    expect(m.settings.azureKey).toBe('test-azure-key');
    expect(m.settings.aiKey).toBe('test-claude-key');
    expect(m.settings.coach).toBe('pip');
  });
  it('are kept on this phone when a backup is restored', () => {
    const restored = keepDeviceKeys({ azureKey: 'key-from-file', aiKey: '', coach: 'mira' }, withKeys().settings);
    expect(restored.azureKey).toBe('test-azure-key');
    expect(restored.aiKey).toBe('test-claude-key');
    expect(restored.coach).toBe('mira');
  });
});
