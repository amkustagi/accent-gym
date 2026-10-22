// AI proxy for Pro users: coaching, follow-up questions, fresh scenarios. Keeps the API key on the server.
import { admin, cors, json, userFrom } from '../_shared/common.ts';

const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '60');
const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5-5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req);
  if (!user) return json({ error: 'Sign in first.' }, 401);

  const db = admin();
  const { data: ent } = await db.from('entitlements').select('plan,status,current_period_end').eq('user_id', user.id).maybeSingle();
  const pro = ent?.plan === 'pro_lifetime' || (ent?.plan === 'pro_monthly' && ['active', 'trialing'].includes(ent.status));
  if (!pro) return json({ error: 'AI features are part of Pro.' }, 402);

  const today = new Date().toISOString().slice(0, 10);
  const { data: use } = await db.from('ai_usage').select('calls').eq('user_id', user.id).eq('day', today).maybeSingle();
  if ((use?.calls ?? 0) >= DAILY_LIMIT) return json({ error: 'Daily AI limit reached. It resets tomorrow.' }, 429);
  await db.from('ai_usage').upsert({ user_id: user.id, day: today, calls: (use?.calls ?? 0) + 1 });

  const { system, user: prompt, max_tokens } = await req.json().catch(() => ({}));
  if (typeof system !== 'string' || typeof prompt !== 'string' || prompt.length > 12000) return json({ error: 'Bad request.' }, 400);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: Math.min(Number(max_tokens) || 700, 1200), system, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return json({ error: 'AI service error.' }, 502);
  const data = await res.json();
  return json({ text: data.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '' });
});
