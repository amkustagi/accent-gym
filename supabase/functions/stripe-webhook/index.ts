// Receives Stripe events and records the user's plan. Deploy with --no-verify-jwt.
import Stripe from 'npm:stripe@14.25.0';
import { admin, stripe } from '../_shared/common.ts';

const crypto = Stripe.createSubtleCryptoProvider();

async function userIdFor(customer: string | null, fallback?: string | null) {
  if (fallback) return fallback;
  if (!customer) return null;
  const { data } = await admin().from('entitlements').select('user_id').eq('stripe_customer_id', customer).maybeSingle();
  return (data?.user_id as string) ?? null;
}

async function setPlan(userId: string, fields: Record<string, unknown>) {
  await admin().from('entitlements').upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() });
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, crypto);
  } catch (e) {
    return new Response(`Bad signature: ${(e as Error).message}`, { status: 400 });
  }

  const s = stripe();
  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session;
      const uid = await userIdFor(cs.customer as string, cs.client_reference_id ?? cs.metadata?.user_id);
      if (!uid) break;
      if (cs.mode === 'payment' && cs.payment_status === 'paid') {
        await setPlan(uid, { plan: 'pro_lifetime', status: 'active', stripe_customer_id: cs.customer, current_period_end: null });
      } else if (cs.mode === 'subscription' && cs.subscription) {
        const sub = await s.subscriptions.retrieve(cs.subscription as string);
        await setPlan(uid, { plan: 'pro_monthly', status: sub.status, stripe_customer_id: cs.customer, stripe_subscription_id: sub.id, current_period_end: new Date(sub.current_period_end * 1000).toISOString() });
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const uid = await userIdFor(sub.customer as string, sub.metadata?.user_id);
      if (!uid) break;
      const { data: ent } = await admin().from('entitlements').select('plan').eq('user_id', uid).maybeSingle();
      if (ent?.plan === 'pro_lifetime') break; // lifetime never downgrades
      const ended = event.type === 'customer.subscription.deleted' || ['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status);
      await setPlan(uid, {
        plan: ended ? 'free' : 'pro_monthly',
        status: sub.status,
        stripe_subscription_id: sub.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      });
      break;
    }
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge;
      const uid = await userIdFor(ch.customer as string);
      if (uid && ch.refunded) await setPlan(uid, { plan: 'free', status: 'refunded' });
      break;
    }
  }
  return new Response('ok');
});
