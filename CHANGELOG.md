# Changelog

## v0.15 (branch release_0.15): real back-and-forth, and a coach you can hear
- **Conversation works for everyone (Fix #17).** Practice › *AI conversation* showed "Unlock with Pro" even when everything was unlocked, and the button did nothing. It is now **Conversation**, and it always works: you answer, then the other person asks up to three follow-ups out loud. With AI (Pro or your own key) they can ask anything; without it the questions still react to what you said.
- **Follow-ups that react to your answer.** No point heard → "Sorry, I lost you. Are we on track or not?". Point after 20+ words → "Can you give me the short version?". Hedging → "You sound unsure. Is that a yes or a no?". No number → "Can you put a number on that?". No date → "By when?". Each shows *why they asked*. Also used by *Take a follow-up question* in the Meeting simulator.
- **Hands-free turns.** The mic opens by itself when they finish asking (or tap *Answer now*). After the last answer, a **conversation debrief** shows your average score, words before your point across the whole conversation, your best answer and the one thing to practice next.
- **Fix #20: the coach moved its mouth but made no sound on iPhone.** Two causes: the coach speaks a moment after the lesson ends, without a tap, which iPhone can refuse; and if the natural voice failed, the phone's own voice was used, which iPhone silently ignores without a tap and never says it finished, so the mouth kept moving. Now all playback goes through one audio element that your first tap unlocks, sound waits a moment for iPhone to move audio back to the speaker after the mic closes, the coach only animates once sound is really playing, and if the phone still won't play it after 3 seconds the coach stops and shows **Tap to hear Hustle**.
- 17 new tests (122 in total).
- Builds on v0.14 (security updates), now merged too.
- Version 0.1.5 (build 15) for the iPhone and Android apps.

## v0.14 (branch release_0.14): security updates
- **All 13 known package vulnerabilities fixed (2 critical, 4 high, 7 moderate).** Found by the new shared security check. Test and build tools updated: Vite 7.3, Vitest 4.1, the React plugin 5.2, the single-file plugin 2.3 and the Capacitor CLI 8.6. The image library `sharp` (pulled in by the voice engine but never used by the app) is pinned to 0.35.5, which fixes three image-format flaws. `npm audit`: 0 vulnerabilities.
- No change to what you see or hear. All 105 tests pass; the app and the single-file preview build as before.
- One test now stubs only `URL.createObjectURL`, which Vitest 4 needs.
- Version 0.1.4 (build 14) for the iPhone and Android apps.

## v0.13 (branch release_0.13): one-tap reports, and fixes from your reports
- **Report in one tap.** The flag → talk → **Send**. The report goes straight to the issue tracker: no email, no GitHub page to finish. A new `report` server function asks Claude (Haiku) to turn what you said, the screenshot and the screen you were on into a proper ticket (clear title, summary, steps, expected/actual), uploads the screenshot and opens the GitHub issue with labels `from-app` + `bug`/`enhancement`/`question`. The phone shows the ticket number and title. Offline reports are kept and sent automatically later. Crash screens send the same way. Turn it on once with the secrets in SETUP.md (step "In-app reports"); until then reports are saved and a "Send through GitHub instead" fallback is shown.
- **Better titles even without AI.** Spoken filler ("hey", "so", "basically") is dropped, the first sentence is used, the screen name is added ("Shadowing: …") and nothing is cut mid-word. Device details now record the screen you reported from, not the report screen.
- **Fix #15:** *Take a follow-up question* did nothing without AI. It now always asks one: from the AI when available, otherwise from a bank of realistic questions for each situation.
- **Fix #13 and #14:** in Shadowing and sound lessons the model voice could finish loading after the mic opened. It then played into your recording (#14) and, on iPhone, closed the mic so the next take recorded nothing (#13). No voice can start while you're recording now, and the Hear buttons are off during a take.
- **Fix #12:** the warm-up is no longer in the daily plan every day. It's still in Practice, and Settings › Your profile › *Warm-up in my daily plan* brings it back.
- Version 0.1.3 (build 13) for the iPhone and Android apps.

## v0.12 (branch release_0.12): your coach, and getting to the point
- **Tiny Hustler coaches.** Pick **Hustle** (the coach), **Mira** (the mentor) or **Pip** (the sidekick) during setup or in Settings › Your coach. Each is an animated character that breathes, blinks, listens while you speak and moves its mouth while it talks. Your coach greets you on Today and, after each course lesson, says what to fix in its own voice (natural voice when it's on). Settings can switch it to text only.
- **New course: Get to the point** (first in the list). Point first; point, reason, example; say it in half; yes or no first; the director's question (the ask, why, by when); rehearse your real meeting (type what it's about, then practice the opening line).
- **Directness on every answer.** A new check counts the words you say before your point (an answer, ask, decision or status), plus hedges and throat-clearing openers. Course results show a "Getting to the point" card; when the point comes late in the new course, the listener cuts in with "Sorry, what do you need from me?". Progress shows your average words-to-point and whether it is falling.
- Version 0.1.2 (build 12) for the iPhone and Android apps.

## v0.11 (branch release_0.11): launch-ready
- **Calmer Today.** The plan, your course, one setup card at a time (natural voice, then install) and the tip of the day. Level, weekly challenges and the six-skill profile moved to **Progress**, which now opens with a "Do your first scored round" card for new users.
- **Practice switcher.** Courses · Drills · Lessons at the top of Practice (sticky) instead of one long scroll; course rows show their area under the title.
- **Chips that fit.** Simulator categories and Progress trend chips wrap on phones instead of running off-screen; scrolling chip rows fade at the edge.
- **iPhone and Android apps (Capacitor 8).** `ios/` and `android/` projects with icons, splash screens, microphone, speech-recognition and camera permission texts, version 0.1.1 (build 11). Inside the app, speech-to-text falls back to the phone's own recognizer when the web view has none.
- **In-app purchases.** In the app, Pro is bought through the App Store / Google Play via RevenueCat (Apple and Google require it), with Restore purchases and store subscription management. The new `revenuecat-webhook` server function writes the same `entitlements` row as Stripe, so Pro works the same on web and phone. Migration `0004_store_billing.sql`.
- **Store basics.** Privacy policy and terms (`privacy.html`, `terms.html`, linked from Settings and the paywall), subscription terms on the paywall, opaque home-screen icon, store listing and launch checklist (`docs/`), App Store screenshots.

## v0.10 (branch release_0.10)
- **Voice feedback from any screen.** A flag button sits in every screen header and on Today. It takes a screenshot (anything typed is blanked out), then you talk or type. Device details go with it: app version, phone and browser, recent screens and errors, never recordings, transcripts, name or location, and you can see exactly what's sent. Reports are saved on the phone. With accounts on they upload; until then **Send with screenshot** opens the share sheet (Mail, Gmail…) with the image attached.
- **Video presence.** A new **Video presence** drill and an optional camera check in the presence lessons. The front camera measures eye contact with the lens, face in view, framing, lighting, head steadiness and smiling, with tips. Analysis runs on the phone with MediaPipe; the runtime is served from the app and the face model downloads once from Google, then works offline. Video is never recorded or uploaded.
- **Weekly challenges.** Three goals each week, one matched to your coach focus, tracked automatically, with XP rewards, badges, and a five-week XP chart.
- **Leaderboard.** Opt-in, first name and weekly XP only. Turns on when accounts are connected (run `supabase/migrations/0003_leaderboard.sql`).

## v0.09 (branch release_0.09)
- Renamed the app from Speak Sharp to **Speakco**: app name, home-screen name, page title, share card, reminders, backups and feedback emails. Older Speak Sharp backup files still restore. The repo and web address are unchanged.

## v0.08 (branch release_0.08)
**Courses**: 6 courses, 36 lessons, covering every part of speaking well at work:
- **Confidence from the inside** (mindset): nerves, speaking up, owning what you know, recovering from a blank mind, being wrong, talking about wins.
- **Presence and first impressions**: first impressions, body language, video calls, a trustworthy voice, the power of a pause, finishing strong.
- **Say it so it sticks** (message): bottom line first, storytelling, memorable numbers, persuasion, explaining simply, opening with a hook.
- **Hard conversations**: tough feedback, taking criticism, saying no, defusing conflict, difficult people, disagreeing with your boss.
- **People skills**: listening, reading the room, small talk, open questions, interrupting smoothly, networking.
- **Meetings that move**: 30-second updates, opening a meeting, the put-on-the-spot moment, Q&A, pushing back on deadlines, wrap-ups.

Each lesson: the idea, why it matters, how to do it, and a before/after example with the model voice. Then you practice it out loud and the app checks that lesson's specific skill (phrases, structure, pauses, pace, vocal variety, plus self-checks for body language), on top of the full voice report. A lesson completes when its checks pass. Courses show progress on the Practice tab, and Today shows the next lesson.

## v0.07 (branch release_0.07)
- Fix: the sound-lesson listening test never ended and its counter kept growing (5, 10, 20, 26…). It is now a round of 10 questions that cycles through every word pair, shows "It was ___" after a miss, and ends with a score, a next step, and **Another round**.

## v0.06 (branch release_0.06)
**Fixes**
- Microphone prompts every round: the microphone stayed closed between takes, so the phone asked again each time. It now stays open between takes and closes after 90 seconds of no use, when the app goes to the background, or (on iPhone) before playback, so the model voice stays loud.
- Two taps to record: after "I'm ready", the accent check Start, shadowing's "I'm ready to repeat", or the 10-second prepare countdown, the app now starts listening right away. The accent check moves to the next sentence and keeps listening. If the browser doesn't allow an automatic start, the mic button simply waits for a tap.
- If the app still has to ask more than once in a session, a one-time tip explains how to set the microphone to Allow permanently.
- Simulator tab: "A fresh scenario for a other / general" now reads "A fresh scenario about your work".

## v0.05 (branch release_0.05)
**A coach that gets to know you.** The coach learns in the background and adds no new steps:
- **Learns your world from what you say.** Projects ("the Atlas migration"), clients and products ("Northwind Bank") and people ("Priya") are picked up from free-speaking rounds. A name is used once it has come up in two rounds. Past rounds are learned from too.
- **Personal content.** Generated scenarios, read-aloud passages and AI prompts use your own projects and people about two times in three.
- **Weekly focus skill.** The coach focuses on one skill for at least a week. It moves on once that skill improves (by 8 points or to 80+), or after two weeks. The plan shows the progress ("up from 45 to 58").
- **Adapts to how you practice.** A drill you usually leave early is swapped for one that trains the same skill. The plan length follows how much you typically do. Scenario topics follow the situations you find hardest and the people you speak to.
- **One quick question, at most once a day,** at the end of a report, only when the answer fills a gap: a project, who you speak to, an upcoming meeting, your hardest moment. You can always skip it.
- **Upcoming meeting.** Mention one and the plan adds a practice round for it until it has passed.
- **Settings › What your coach knows.** See, add or remove anything. Removed names are never learned again. Everything stays on the device and syncs only if you sign in.

## v0.04 (branch release_0.04)
- Pace trainer and Pause power no longer open on the same passage. Each visit gives you a new script: either a hand-written one you haven't read in 3 weeks, or one generated for your role. There are 16 meeting situations (update, push back, stand-up, bad news, escalation, saying no and more) and thousands of combinations. You can also pick a topic or tap **New passage**.
- Tongue twisters and Vocal variety start at a random line.
- App updates apply automatically: a new version switches over the next time the app goes to the background, or at launch.

## v0.03 (branch release_0.03)
**New**
- Accent Coach tab: choose American, British, Australian or Canadian English and say how you speak English today (20 first-language profiles plus Indian, Nigerian, Filipino and other English accents). Your sound map puts the sounds that matter most for that pair first.
- 2-minute accent check: 9 sentences (10 for Canadian), each sound scored, "fix these first", tracked over time.
- 25 sound lessons with tips, minimal-pair listening tests, words and sentences written for each target accent. The model voice speaks in the accent you chose: natural voice for American, British and Canadian; system voice for Australian.
- Shadowing: hear a native line, repeat it, and see your melody drawn over the model's.
- Two levels of scoring: free clarity scoring, using a recognizer set to your target accent; Pro precise scoring using Microsoft Azure Pronunciation Assessment, word by word for every accent and sound by sound for American English.
- Weekly report card: your week compared with the previous one, with a shareable image.
- When you have an accent goal, the daily plan includes a sound lesson or shadowing.

**Changes**
- The old Pronunciation drill is replaced by Sound lessons in the Accent tab.
- Settings: accent goal and starting point; optional Azure key for precise scoring.

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
