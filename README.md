# Accent Gym

A phone-first web app for daily American English articulation practice: warm-up tongue twisters, minimal pairs (V/W, TH, vowels), soft T/D, American R, word stress, linking, and common meeting phrases. Each item plays a model US English voice (your device's text-to-speech), and you can record takes to compare.

## Run it
- **On your phone:** open the GitHub Pages URL, then *Add to Home Screen*. It installs like an app and works offline after the first visit.
- **Locally:** `python3 -m http.server` in this folder, then open http://localhost:8000.

## Enable GitHub Pages
Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.

No build step, no dependencies. Progress is stored in the browser's localStorage.
