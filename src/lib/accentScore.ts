// Chooses how to score accent: precise (Azure) when available, otherwise free recognition-based.
import type { AccentId, FeatureId } from '../content/accents';
import { assessDirect, azureLocale, blobToBase64, parseAzure, scoreProbesAzure, toWav16k, type AzureResult, type FeatureScores } from '../engine/assess';
import { getState, type State } from '../store/store';
import { assessViaServer, backendEnabled, isPro } from './backend';

export type Precision = 'key' | 'server' | null;

export function precisionAvailable(s: State): Precision {
  if (s.settings.azureKey && s.settings.azureRegion) return 'key';
  if (backendEnabled && s.account && isPro(s)) return 'server';
  return null;
}

/** Scores one recorded clip against its reference text with Azure. */
export async function assessPrecise(audio: Blob, reference: string, target: AccentId): Promise<AzureResult> {
  const s = getState();
  const via = precisionAvailable(s);
  if (!via) throw new Error('Precise accent scoring needs Pro or your own Microsoft key.');
  let wav: Blob;
  try {
    wav = await toWav16k(audio);
  } catch {
    throw new Error('This phone couldn\'t convert the recording for scoring.');
  }
  const locale = azureLocale(target);
  if (via === 'key') return assessDirect(wav, reference, locale, s.settings.azureKey, s.settings.azureRegion);
  return parseAzure(await assessViaServer(await blobToBase64(wav), reference, locale));
}

export function preciseScores(probes: Partial<Record<FeatureId, string[]>>, r: AzureResult): FeatureScores {
  return scoreProbesAzure(probes, r);
}
