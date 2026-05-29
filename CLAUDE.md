# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, hot-reload)
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
npm run deploy    # Build and force-push dist/ to gh-pages branch on GitHub
```

No test suite or linter is configured.

## Architecture

**Baseline** is a single-page YMCA workout tracker. The entire app lives in `src/App.jsx` — there are no separate component files.

**Tech stack**: React 18 + Vite, Firebase Auth (Google sign-in) + Firestore, deployed to GitHub Pages at `/baseline/`.

**Data flow**:
- Workout catalog (`WORKOUTS`) is a static constant at the top of `App.jsx` — cardio, strength, and core exercises with substitution suggestions.
- Current session state (`routine`, `checked`, `metrics`) is persisted to `localStorage` under key `ymca_workout_v1` so the session survives page reloads.
- Workout history is stored in Firestore at `users/{uid}/history` (one document per finished session), loaded on sign-in, and displayed on the History tab.
- `lastMetrics` is derived at load time by walking history newest-first to find the most recent metric per exercise name — used to show "Last time: X lbs" on each card.

**Auth**: Firebase Google sign-in via popup. `user === undefined` means auth is still initializing; `user === null` means logged out; a user object means authenticated.

**Styling**: All styles are inline — no CSS files or CSS-in-JS libraries.

**Key component tree** (all in `App.jsx`):
- `App` — auth gating, state root, Firestore reads/writes
  - `LoginScreen` — shown when `user === null`
  - `TabBar` — Today / History tabs
  - `Section` → `ExerciseCard` — renders one category's exercises
  - `PickerSheet` — bottom-sheet modal for swapping an exercise
  - `AddSheet` — bottom-sheet modal for adding an exercise to a category
  - `HistoryScreen` — read-only view of past sessions

**Firebase config** lives in `src/firebase.js` (project: `ymca-workout`). The API key is a browser-safe Firebase key — it is not a secret but is scoped to this project in the Firebase console.

**Deployment**: `npm run deploy` builds to `dist/`, then inits a fresh git repo inside `dist/`, force-pushes to the `gh-pages` branch of `https://github.com/blairhperry/baseline.git`. Vite's `base: "/baseline/"` ensures asset paths work under the GitHub Pages subpath.
