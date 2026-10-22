# Turning on accounts and payments

Speak Sharp runs fully on the phone without any server. In that mode every feature is unlocked, which is how the owner build works today. Follow these steps when you're ready for other people to sign up and pay. Budget about 45 minutes.

## What you need
- A **Supabase** account (free tier is fine to start): accounts, database, server functions.
- A **Stripe** account: payments. Use test mode first.
- Optional: an **Anthropic API key** so Pro users get the AI coach without bringing their own key.

## 1. Create the Supabase project
1. Go to supabase.com → New project. Note the **Project URL** and the **anon public key** (Settings → API).
2. SQL editor → paste `supabase/migrations/0001_init.sql` → Run.
3. Authentication → Providers → Email: enable, turn **off** "Confirm email" link sign-in, keep OTP.
4. Authentication → Email Templates → "Magic Link": make the body show the code, for example:
   `Your Speak Sharp code is {{ .Token }}`
   (The app signs people in with this 6-digit code, which works inside an installed phone app.)
5. Authentication → URL Configuration → Site URL: `https://amkustagi.github.io/accent-gym/`.

## 2. Create the Stripe products
1. Stripe dashboard (test mode) → Products → **Speak Sharp Pro**.
2. Add two prices: **Monthly** recurring (e.g. $7.99) and **Lifetime** one-time (e.g. $79). Copy both **price IDs** (`price_…`).
3. Settings → Billing → Customer portal: turn it on (lets subscribers cancel or update cards).

## 3. Deploy the server functions
Install the Supabase CLI, then from the repo folder:
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PRICE_MONTHLY=price_... \
  STRIPE_PRICE_LIFETIME=price_... \
  APP_URL=https://amkustagi.github.io/accent-gym/ \
  APP_ORIGIN=https://amkustagi.github.io \
  ANTHROPIC_API_KEY=sk-ant-...        # optional, for Pro AI features
supabase functions deploy create-checkout
supabase functions deploy billing-portal
supabase functions deploy ai
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 4. Connect Stripe to the webhook
1. Stripe → Developers → Webhooks → Add endpoint:
   `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
2. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`.
3. Copy the **signing secret** (`whsec_…`) and run `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.

## 5. Tell the app about the server
GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public key |
| `VITE_PRICE_MONTHLY_LABEL` | e.g. `$7.99/month` |
| `VITE_PRICE_LIFETIME_LABEL` | e.g. `$79 once` |
| `VITE_FEEDBACK_EMAIL` | where bug reports go without an account |

Push any commit to `main` (or re-run the workflow). The new build shows sign-in, the free limit (3 speaking rounds a day) and the upgrade screen.

## 6. Test a purchase
Use Stripe's test card `4242 4242 4242 4242`, any future date, any CVC. After checkout the app returns and unlocks Pro within a few seconds. When it all works, switch Stripe to live mode, create live prices, and update the secrets.

## Reading feedback
Supabase → Table editor:
- `feedback`: every rating, thumbs, transcript fix, check-in, bug report and idea, with device details.
- `feedback_summary`: daily counts and average ratings by type.
- `usage`: anonymous drill counters and recent errors (users who allowed it).
- `plan_summary`: how many users are on each plan.

## Before charging real customers
You'll also need a privacy policy and terms of service page, sales-tax settings in Stripe (Stripe Tax), and a support email. A lawyer or a service like Termly can draft the policies.
