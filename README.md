# Baseline

A smart gym workout tracker for people who want to show up consistently and make steady progress — no program obsession required. Baseline generates a fresh, personalized routine each session, learns from your history, and adapts to how you're feeling that day.

**Live app → [blairhperry.github.io/baseline](https://blairhperry.github.io/baseline/)**

---

## Philosophy

Baseline is built for people who aren't training for a competition or following a rigid program — they just want to get to the gym regularly, work hard, and not think too hard about what to do when they get there. The app handles the planning so you can focus on the work.

---

## Features

### No account required
Jump straight into a workout without signing in. History and preferences are saved on your device. Sign in with Google at any point to sync across devices.

### Pre-workout check-in
Before each session, Baseline asks four quick questions to tailor the routine:
- **Energy level** — Low, Good, or Pumped (adjusts workout volume)
- **How long do you have?** — Quick (~20 min), Standard (~35 min), or Extended (~50 min)
- **Any cardio already today?** — Skips the cardio warmup if you've already been active
- **Anything to go easy on?** — Filters out exercises targeting sore or recovering muscle groups (Legs, Back, Shoulders & Arms)

### Smart exercise selection
Two layers of intelligence work together to keep routines fresh:
- **Recency weighting** — exercises from your last 4 sessions are 3× less likely to appear, so the app naturally rotates through the full pool
- **Muscle balance** — exercises targeting groups you haven't hit in the last 3 sessions get extra weight, nudging the app toward balance without being rigid about it

A **Today's focus** chip row shows which muscle groups (Upper Push, Upper Pull, Lower Body, Core) the generated routine covers at a glance.

### Per-user exercise blocking
Hide exercises you can't do at your gym. Tap **⊖** on any card to remove it from future routines — it's saved to your account and works across devices. Tap **⊕** to restore it, or find it in the swap picker and tap to unblock and use it in one step.

### Try it ✦
After a couple of sessions, exercises you've never done surface a **Try it ✦** badge on the card, in the swap picker, and in the add sheet — a gentle nudge to expand your repertoire.

### Workout management
- Swap any exercise for a suggested alternative or anything else in the pool
- Add extra exercises to any category mid-session
- Remove exercises from today's routine without affecting future ones
- Log weights, distances, or levels for each exercise
- **Last time** reminder shows what you logged previously for every movement

### History
Every completed session is saved with a full breakdown — exercises, completions, and logged metrics — accessible from any device when signed in.

---

## Exercise Library

| Category | Exercises |
|---|---|
| Cardio | 6 |
| Strength | 19 |
| Core | 13 |

A routine generates **1 cardio + 4 strength + 2 core** by default. Timeframe and energy level adjust the counts; blocked and muscle-group-filtered exercises are excluded before selection.

---

## Tech Stack

- **React 18** + **Vite**
- **Firebase Auth** — optional Google sign-in
- **Firestore** — cross-device history and preferences for signed-in users
- **Firebase Analytics** — usage tracking
- Deployed to **GitHub Pages**

---

## Development

```bash
npm install
npm run dev       # dev server with hot reload
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run deploy    # build and push to gh-pages branch
```

Firebase config lives in `src/firebase.js`.
