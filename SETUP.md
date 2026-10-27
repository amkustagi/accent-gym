# Turning on accounts and payments

Speakco runs fully on the phone without any server. In that mode every feature is unlocked, which is how the owner build works today. Follow these steps when you're ready for other people to sign up and pay. Budget about 45 minutes.

## What you need
- A **Supabase** account (free tier is fine to start): accounts, database, server functions.
- A **Stripe** account: payments. Use test mode first.
- Optional: an **Anthropic API key** so Pro users get the AI coach without bringing their own key.

## 1. Create the Supabase project
1. Go to supabase.com → New project. Note the **Project URL** and the **anon public key** (Settings → API).
2. SQL editor → paste `supabase/migrations/0001_init.sql` → Run, then `supabase/migrations/0002_accent.sql` → Run, then `supabase/migrations/0003_leaderboard.sql` → Run.
3. Authentication → Providers → Email: enable, turn **off** "Confirm email" link sign-in, keep OTP.
4. Authentication → Email Templates → "Magic Link": make the body show the code, for example:
   `Your Speakco code is {{ .Token }}`
   (The app signs people in with this 6-digit code, which works inside an installed phone app.)
5. Authentication → URL Configuration → Site URL: `https://amkustagi.github.io/accent-gym/`.

## 2. Create the Stripe products
1. Stripe dashboard (test mode) → Products → **Speakco Pro**.
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
supabase functions deploy pronunciation
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

## 7. Precise accent scoring (Azure)
Pro users get word-by-word scoring for every accent, plus sound-by-sound scoring for American English. This uses Microsoft Azure Pronunciation Assessment.
1. portal.azure.com → Create a resource → **Speech** (Azure AI services). The free F0 tier allows 5 audio hours a month; standard S0 is billed per audio hour. Note the **Key** and the **Region** (e.g. `eastus`).
2. Store them on the server and deploy the function:
   ```bash
   supabase secrets set AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=eastus PRONUNCIATION_DAILY_LIMIT=400
   supabase functions deploy pronunciation
   ```
   `PRONUNCIATION_DAILY_LIMIT` caps the number of sentences each user can score per day. It defaults to 400.
3. Make sure migration `0002_accent.sql` has been run, because it creates the daily counter table.

**Owner build (no server):** Settings → Precise accent scoring → paste the key and region. The key stays on your phone. If the browser blocks direct calls to Azure, use the server route above.

## Reading feedback
Supabase → Table editor:
- `feedback`: every rating, thumbs, transcript fix, check-in, bug report and idea, with device details.
- `feedback_summary`: daily counts and average ratings by type.
- `usage`: anonymous drill counters and recent errors (users who allowed it).
- `plan_summary`: how many users are on each plan.

## Before charging real customers
You'll also need a privacy policy and terms of service page, sales-tax settings in Stripe (Stripe Tax), and a support email. A lawyer or a service like Termly can draft the policies.

## 6. In-app purchases for the iPhone and Android apps

Apple and Google require their own billing for subscriptions bought inside an app, so the store apps use
**RevenueCat** (free up to $2,500/month in revenue) on top of App Store / Google Play billing. Stripe stays for the web.

1. **App Store Connect** → your app → Subscriptions: group "Speakco Pro", product `speakco_pro_monthly` (auto-renewable,
   1 month). In-App Purchases: non-consumable `speakco_pro_lifetime`. Fill in the review screenshot and description.
2. **Google Play Console** → Monetize: subscription `speakco_pro_monthly` and in-app product `speakco_pro_lifetime`.
3. **RevenueCat** (app.revenuecat.com): create the project, add the iOS app (App Store Connect API key) and Android app
   (Play service account). Entitlement **`pro`** with both products. Offering **default** with packages **Monthly**
   (`$rc_monthly`) and **Lifetime** (`$rc_lifetime`).
4. RevenueCat → Integrations → Webhooks: URL `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization header value `Bearer <a long random secret>`. Then:
   ```bash
   supabase secrets set REVENUECAT_WEBHOOK_AUTH='<the same secret>'
   supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```
   and run `supabase/migrations/0004_store_billing.sql` in the SQL editor.
5. Build the apps with the RevenueCat public SDK keys:
   `VITE_REVENUECAT_IOS_KEY=appl_… VITE_REVENUECAT_ANDROID_KEY=goog_… npm run cap:sync` (plus the Supabase variables from step 5).
6. Server functions called from the apps come from the origins `capacitor://localhost` (iPhone) and `https://localhost`
   (Android): leave `APP_ORIGIN` unset (allows any origin; every call still needs the user's sign-in token) or set it to `*`.
