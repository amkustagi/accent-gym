// Opens Stripe's customer portal so subscribers can update payment details or cancel.
import { admin, cors, json, safeReturn, stripe, userFrom } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req);
  if (!user) return json({ error: 'Sign in first.' }, 401);
  const { return_url } = await req.json().catch(() => ({}));
  const { data: ent } = await admin().from('entitlements').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!ent?.stripe_customer_id) return json({ error: 'No subscription found.' }, 404);
  const portal = await stripe().billingPortal.sessions.create({ customer: ent.stripe_customer_id, return_url: safeReturn(return_url) });
  return json({ url: portal.url });
});
