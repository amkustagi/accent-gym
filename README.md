# Speak Sharp

A phone app that coaches you to speak with confidence in meetings, with an optional pronunciation track. It listens while you talk and scores **what you say** (fillers, hedges, apologies, regional phrases), **how your voice sounds** (pace, pauses, pitch variety, uptalk), and **how clearly you're understood**.

Installable web app (PWA): free, works offline, no App Store needed. All analysis runs on the phone.

## Features
- **Onboarding + 60-second baseline** that scores six skills and draws your starting profile
- **Today**: a daily plan built around your weakest skill, streak, XP and levels, swap of the day, 2-minute lessons
- **Practice**, organized by skill area:
  - Content: Word swaps (27 cards, quiz + say it), Structure (BLUF, PREP, STAR), Say it short (word budget)
  - Voice: Pace trainer (read along with a moving guide), Pause power (live silence meter), Vocal variety (flat vs. lively pitch comparison)
  - Articulation: guided Warm-up, Tongue twisters (15, three levels), Pronunciation (V/W, TH, soft T, R, vowels, stress, linking) with listening tests
  - Presence: Meeting simulator (34 scenarios in 7 categories), Pressure round
- **Report** after every round: overall score, six skill bars, prioritized tips, voice timeline (pitch, loudness, pauses), highlighted transcript, playback of your recording, optional AI coach rewrite
- **Progress**: trends per skill, now vs. baseline radar, full history with recordings
- **Settings**: listening mode, model voice, optional Claude API key for the AI coach, calendar reminder, backup/restore, erase

## Install on your phone
1. GitHub repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, Branch **gh-pages** / **(root)**, Save. (On a free GitHub plan the repo must be public.)
2. Open **https://amkustagi.github.io/accent-gym/** on your phone.
3. iPhone (Safari): Share → **Add to Home Screen**. Android (Chrome): ⋮ → **Install app**.
4. Allow the microphone when asked.

Every push to `main` runs the tests, builds, and republishes `gh-pages` automatically.

## Develop
```bash
npm install
npm run dev        # local dev server
npm test           # scoring + pitch-tracking tests (Vitest)
npm run build      # production build + service worker into dist/
```

Stack: React 18, TypeScript, Vite, IndexedDB (idb-keyval). Speech-to-text uses the browser's Web Speech API; voice analysis (loudness, pitch via normalized autocorrelation, pause detection) runs in Web Audio on the device.

### Project layout
```
src/engine/   speech-to-text, voice analyzer, scorer, capture session (+ tests)
src/content/  scenarios, swap cards, lessons, twisters, passages, pronunciation sets
src/store/    persisted app state, daily plan, streaks, levels
src/ui/       design system components, live mic stage, report
src/screens/  tabs, settings, onboarding, and the 11 drills
```
