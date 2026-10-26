// Shared helpers for Speakco server functions (Deno, Supabase Edge Functions).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import Stripe from 'npm:stripe@14.25.0';

export const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export const stripe = () =>
  new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });

/** Returns the signed-in user from the request's Authorization header, or null. */
export async function userFrom(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return null;
  const { data } = await admin().auth.getUser(jwt);
  return data.user ?? null;
}

/** Only allow redirects back to the app itself. */
export function safeReturn(url: unknown): string {
  const fallback = Deno.env.get('APP_URL') ?? 'https://amkustagi.github.io/accent-gym/';
  if (typeof url !== 'string') return fallback;
  try {
    const u = new URL(url);
    const allowed = new URL(fallback);
    return u.origin === allowed.origin ? u.toString() : fallback;
  } catch {
    return fallback;
  }
}
