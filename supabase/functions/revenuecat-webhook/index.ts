// Receives RevenueCat events (App Store / Google Play purchases) and records the user's plan in the same
// `entitlements` table the Stripe webhook uses. Deploy with --no-verify-jwt; RevenueCat sends the shared
// secret REVENUECAT_WEBHOOK_AUTH as the Authorization header.
// The app logs in to RevenueCat with the Supabase user id, so event.app_user_id is that id.
import { admin } from '../_shared/common.ts';

type RcEvent = {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  product_id: string;
  store?: string;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function setPlan(userId: string, fields: Record<string, unknown>) {
  await admin().from('entitlements').upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() });
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('REVENUECAT_WEBHOOK_AUTH')}`) {
    return new Response('unauthorized', { status: 401 });
  }
  const { event } = (await req.json()) as { event: RcEvent };
  const uid = [event.app_user_id, event.original_app_user_id].find((x) => x && UUID.test(x));
  if (!uid) return new Response('ignored: anonymous user');
  const lifetime = /lifetime/i.test(event.product_id);
  const end = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const base = { store: event.store ?? null, store_product_id: event.product_id };
  const { data: ent } = await admin().from('entitlements').select('plan').eq('user_id', uid).maybeSingle();

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'NON_RENEWING_PURCHASE':
      await setPlan(uid, { ...base, plan: lifetime ? 'pro_lifetime' : 'pro_monthly', status: 'active', current_period_end: lifetime ? null : end });
      break;
    case 'CANCELLATION': // auto-renew turned off or refunded; access continues until expiration
      if (ent?.plan === 'pro_lifetime' && !lifetime) break;
      await setPlan(uid, { ...base, status: 'canceled', current_period_end: end });
      break;
    case 'BILLING_ISSUE':
      if (ent?.plan !== 'pro_lifetime') await setPlan(uid, { ...base, status: 'past_due' });
      break;
    case 'EXPIRATION':
      if (ent?.plan !== 'pro_lifetime') await setPlan(uid, { ...base, plan: 'free', status: 'expired', current_period_end: end });
      break;
  }
  return new Response('ok');
});
