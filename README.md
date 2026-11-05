# Speakco

A phone coach for speaking confidently, directly and concisely at work. Speakco listens while you talk and
coaches **what you say** (getting to the point, fillers, hedges, over-apologising), **how you sound** (pace,
pauses, pitch variety) and, if you want, **how clearly you're understood** (an optional accent track).
Part of Tiny Hustlers.

**Try it:** https://amkustagi.github.io/accent-gym/   ·   **What's new:** [CHANGELOG.md](CHANGELOG.md)

## What it does
- **Meeting mode**: put the phone on the table during a real meeting. Speakco stays silent, turns speech into
  text on the phone, keeps no audio, and afterwards coaches your turns only, with one goal for your next meeting.
- **Say it first**: paste what you're about to say (push back, ask for budget, give bad news) and get it back
  point-first, then say it out loud and compare takes.
- **Practice**: meeting simulator, conversations with follow-up questions, word swaps, structure, pace and pause
  drills, courses such as *Get to the point*, each with a scored report.
- **Daily habit**: a short plan built from your weakest skill and your last real meeting, streaks, a weekly report.
- **Accent coach (optional)**: sound map, accent check, sound lessons and shadowing.
- **A coach you can hear**: pick Hustle, Mira or Pip; feedback is spoken after each lesson.

## Privacy
Scoring runs on the phone. Microphone audio stays on the device; meeting audio is never recorded. Nothing you
say leaves the phone unless you choose an AI rewrite or precise accent scoring.

## Install on your phone
Open the link above. iPhone (Safari): Share → **Add to Home Screen**. Android (Chrome): ⋮ → **Install app**.
Allow the microphone when asked. iPhone and Android store builds are set up in [SETUP.md](SETUP.md).

## Run it locally
```bash
npm ci
npm test              # Vitest
npm run dev           # local dev server
npm run build         # production build + service worker into dist/
npm run build:single  # one-file preview into dist-single/
```

Stack: React 18, TypeScript, Vite, IndexedDB, Web Audio and on-device speech recognition; Capacitor for iPhone
and Android; optional Supabase (accounts, sync, payments). Accounts, payments and precise accent scoring are
off until configured: see [SETUP.md](SETUP.md).

## How we work
Branches `dev → qa → main`; one release PR per version (`release_X.Y.Z` → `dev`), described in
[CHANGELOG.md](CHANGELOG.md). Every PR must pass the **Merge gate** and **Security** checks in `.github/`.
Pushes to `main` run the tests and republish the site.
