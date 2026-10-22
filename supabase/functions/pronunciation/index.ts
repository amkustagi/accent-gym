// Precise accent scoring for Pro users: forwards a 16 kHz WAV clip to Microsoft Azure
// Pronunciation Assessment. The Azure key stays on the server.
import { admin, cors, json, userFrom } from '../_shared/common.ts';

const DAILY_LIMIT = Number(Deno.env.get('PRONUNCIATION_DAILY_LIMIT') ?? '400');
const LOCALES = new Set(['en-US', 'en-GB', 'en-AU', 'en-CA']);

function header(reference: string, locale: string) {
  const cfg: Record<string, string> = { ReferenceText: reference, GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: 'True' };
  if (locale === 'en-US') {
    cfg.PhonemeAlphabet = 'IPA';
    cfg.EnableProsodyAssessment = 'True';
  }
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(cfg))));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req);
  if (!user) return json({ error: 'Sign in first.' }, 401);

  const db = admin();
  const { data: ent } = await db.from('entitlements').select('plan,status').eq('user_id', user.id).maybeSingle();
  const pro = ent?.plan === 'pro_lifetime' || (ent?.plan === 'pro_monthly' && ['active', 'trialing'].includes(ent.status));
  if (!pro) return json({ error: 'Precise accent scoring is part of Pro.' }, 402);

  const { audio, reference, locale } = await req.json().catch(() => ({}));
  if (typeof audio !== 'string' || typeof reference !== 'string' || !LOCALES.has(locale) || reference.length > 600 || audio.length > 1_400_000) return json({ error: 'Bad request.' }, 400);

  // Daily cap per user to bound cost (each call is a few seconds of audio).
  const today = new Date().toISOString().slice(0, 10);
  const { data: use } = await db.from('pron_usage').select('calls').eq('user_id', user.id).eq('day', today).maybeSingle();
  if ((use?.calls ?? 0) >= DAILY_LIMIT) return json({ error: 'Daily limit reached.' }, 429);
  await db.from('pron_usage').upsert({ user_id: user.id, day: today, calls: (use?.calls ?? 0) + 1 });

  const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
  const region = Deno.env.get('AZURE_SPEECH_REGION')!;
  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=detailed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': Deno.env.get('AZURE_SPEECH_KEY')!,
      'Pronunciation-Assessment': header(reference, locale),
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json',
    },
    body: bytes,
  });
  if (!res.ok) return json({ error: `Scoring service error (${res.status}).` }, 502);
  return json(await res.json());
});
