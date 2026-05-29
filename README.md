# Baseline

A smart, personalized gym workout tracker built for folks who are just looking to keep a solid baseline. Baseline generates a fresh routine each session, learns from your history, and adapts to how you're feeling that day.

**Live app → [blairhperry.github.io/baseline](https://blairhperry.github.io/baseline/)**

---

## Features

### Pre-workout check-in
Before each session, Baseline asks three quick questions:
- **Energy level** — Low, Good, or Pumped (adjusts workout volume)
- **Cardio already done?** — Skips the cardio warmup if you've already been active
- **Anything to go easy on?** — Filters out exercises targeting sore or injured muscle groups (Legs, Back, Shoulders & Arms)

### Smart exercise selection
Exercises from your last 4 sessions are de-weighted so the app naturally rotates through the full pool. Exercises you've never done surface a **Try it ✦** badge to nudge you toward new movements.

### Per-user exercise blocking
Each user can permanently hide exercises they can't do (e.g. no Ab Wheel at your gym). Tap **⊖** on any card to hide it from future routines — it's synced to your account so it works across devices. Tap **⊕** to restore it, or tap it in the swap picker to unblock and use it in one step.

### Workout management
- Swap any exercise for a suggested alternative or anything else in the pool
- Add extra exercises to any category
- Remove exercises from the current session
- Log weights, distances, or levels for each exercise
- "Last time" reminder shows what you logged previously for each movement

### History
Every completed session is saved to your account with a full breakdown of exercises, completions, and logged metrics — accessible from any device.

---

## Tech Stack

- **React 18** + **Vite**
- **Firebase Auth** — Google sign-in
- **Firestore** — workout history and per-user preferences
- Deployed to **GitHub Pages** via a custom `npm run deploy` script

---

## Development

```bash
npm install
npm run dev       # dev server with hot reload
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run deploy    # build and push to gh-pages branch
```

Requires a Firebase project. The config lives in `src/firebase.js`.

---

## Exercise Library

| Category | Count |
|---|---|
| Cardio | 6 |
| Strength | 19 |
| Core | 13 |

A routine generates 1 cardio + 4 strength + 2 core exercises per session (3 strength on low-energy days). Blocked or muscle-group-filtered exercises are excluded before selection.
