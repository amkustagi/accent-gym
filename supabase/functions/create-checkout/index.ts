// Starts Stripe Checkout for Pro monthly (subscription) or Pro lifetime (one payment).
import { admin, cors, json, safeReturn, stripe, userFrom } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req);
  if (!user) return json({ error: 'Sign in first.' }, 401);
  const { plan, return_url } = await req.json().catch(() => ({}));
  if (plan !== 'monthly' && plan !== 'lifetime') return json({ error: 'Unknown plan.' }, 400);

  const db = admin();
  const s = stripe();
  const { data: ent } = await db.from('entitlements').select('stripe_customer_id, plan').eq('user_id', user.id).maybeSingle();
  if (ent?.plan === 'pro_lifetime') return json({ error: 'You already own Pro.' }, 400);

  let customer = ent?.stripe_customer_id as string | undefined;
  if (!customer) {
    const c = await s.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customer = c.id;
    await db.from('entitlements').upsert({ user_id: user.id, stripe_customer_id: customer, updated_at: new Date().toISOString() });
  }

  const back = safeReturn(return_url);
  const sep = back.includes('?') ? '&' : '?';
  const session = await s.checkout.sessions.create({
    customer,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    mode: plan === 'monthly' ? 'subscription' : 'payment',
    line_items: [{ price: Deno.env.get(plan === 'monthly' ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_LIFETIME')!, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${back}${sep}checkout=success`,
    cancel_url: back,
    ...(plan === 'monthly' ? { subscription_data: { metadata: { user_id: user.id } } } : {}),
  });
  return json({ url: session.url });
});
