# Changelog

## v0.02 (branch release_0.02)
**Fixes**
- iPhone: model voice and playback were silent or very quiet after recording (audio session stayed in record mode).
- iPhone: recordings saved as WebM couldn't play back; Safari now records MP4/AAC.
- "Say it" drills didn't keep your voice; every take is now recorded with Play mine / Play model.
- Transcript could repeat words when recognition restarted.
- Robotic voice: novelty system voices (Albert, Zarvox…) could be chosen; voices are now ranked.
- The model voice could leak into your transcript; it stops when recording starts.
- Recording now stops cleanly when you switch apps; data saves immediately when the app is hidden.

**New**
- Natural AI voice (Kokoro, on-device, ~90 MB one-time download), six voices.
- Never-ending content: scenario generator built from 14 role packs (thousands of prompts), 12 categories, 54 hand-written scenarios, 93 swap cards, 45 twisters, 20 passages, 12 pronunciation modules.
- Self-learning: profile (role, industry, experience, first language, situations, challenges), adaptive difficulty per drill, spaced repetition, "your habits" from your own transcripts, smarter daily plan, weekly progress.
- AI conversation: realistic follow-up questions spoken out loud; AI coach and fresh AI scenarios.
- Feedback everywhere: rate each report, thumbs on tips/questions/cards, fix the transcript, too easy/too hard, weekly check-in, bug reports with diagnostics, automatic error log.
- Accounts (email + 6-digit code), cloud sync, Pro monthly and lifetime via Stripe, free tier of 3 speaking rounds a day. Dormant until the server is configured (see SETUP.md).
- What's new screen; version shown as v0.02.

## v0.01
First React + TypeScript release: live voice analysis, 11 drills, simulator, reports, progress, offline install.
