# Launch checklist: Speakco v0.11

Done in code (this release): phone polish, native iPhone/Android projects, speech recognition in the app, in-app purchases
(RevenueCat) next to Stripe, privacy/terms, store text, screenshots.

## You (Avinash): one time
- [ ] Replace `[LEGAL COMPANY NAME]` and `[CONTACT EMAIL]` in `public/privacy.html` and `public/terms.html`.
- [ ] Supabase + Stripe for the web: `SETUP.md` steps 1–5.
- [ ] Apple Developer Program ($99 USD/yr, enrol as the corporation; needs a free D-U-N-S number) and Google Play Console
      ($25 USD once, organization account).
- [ ] Store products and RevenueCat: `SETUP.md` step 6.
- [ ] Prices: the web shows `VITE_PRICE_*_LABEL`; the app shows the store's local prices automatically.

## Build and test on your iPhone (needs a Mac with Xcode)
```bash
npm ci
VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… VITE_REVENUECAT_IOS_KEY=appl_… npm run cap:ios
```
In Xcode: Signing & Capabilities → your team; add the **In-App Purchase** capability; run on your iPhone; then
Product → Archive → upload to TestFlight. Test purchases with a Sandbox Apple ID.

## Android
```bash
VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… VITE_REVENUECAT_ANDROID_KEY=goog_… npm run cap:android
```
Android Studio → Build → Generate Signed Bundle → Play Console internal testing.

## Check on a real phone before submitting
- Microphone and speech-to-text in a meeting-simulator round (iPhone: native recognizer fallback; Android: Chrome engine or native).
- Model voice: the 60 MB natural-voice engine is bundled in the app; the voice data downloads on first use.
- Camera check in Video presence.
- Buy monthly and lifetime with sandbox accounts; Restore purchases; cancel monthly in the store and confirm Pro ends at period end.
- Delete account (Apple requires in-app deletion; it's in Account).

## Store submission
Listing text, keywords, privacy answers: `docs/store-listing.md`. Screenshots: `docs/store/screenshots/`.
Version: marketing 0.1.1 (= v0.11), build 11. Bump both with every upload.

## Known limits in v0.11
- Native projects generated and synced, **not compiled** here (no Xcode / Android SDK). Compile once in Xcode / Android Studio.
- Using the phone's microphone recorder and the native speech recognizer at the same time may need tuning on some phones; test
  the "Words + voice" listening mode on your iPhone first.
