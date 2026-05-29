import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const WORKOUTS = {
  cardio: [
    { name: "Treadmill Intervals", duration: "8 min", note: "Alternate 1 min jog / 1 min brisk walk", muscles: "Heart · Legs", subs: ["Stationary Bike", "Elliptical"] },
    { name: "Rowing Machine", duration: "8 min", note: "Steady moderate pace, focus on form", muscles: "Full Body · Cardio", subs: ["Elliptical", "Treadmill Intervals"] },
    { name: "Stationary Bike", duration: "8 min", note: "Moderate resistance, 80–90 RPM", muscles: "Quads · Cardio", subs: ["Treadmill Intervals", "Elliptical"] },
    { name: "Elliptical", duration: "8 min", note: "Moderate resistance, arms engaged", muscles: "Full Body · Low Impact", subs: ["Stationary Bike", "Rowing Machine"] },
    { name: "Stair Climber", duration: "6 min", note: "Steady pace, don't hold the rails", muscles: "Glutes · Quads · Cardio", subs: ["Treadmill Intervals", "Stationary Bike"] },
    { name: "Jump Rope", duration: "5 min", note: "3 rounds of 90 sec with 30 sec rest", muscles: "Calves · Cardio · Coordination", subs: ["Treadmill Intervals", "Stair Climber"] },
  ],
  core: [
    { name: "Plank", sets: 3, duration: "30 sec", note: "Neutral spine, breathe steadily", muscles: "Deep Core · Shoulders", subs: ["Dead Bug", "Bird Dog"] },
    { name: "Cable Woodchops", sets: 3, reps: "10 each side", note: "Rotate from the hips, not just arms", muscles: "Obliques · Core", subs: ["Cable Pallof Press", "Bird Dog"] },
    { name: "Ab Wheel Rollouts", sets: 3, reps: 10, note: "Slow and controlled both ways", muscles: "Deep Core · Shoulders", subs: ["Plank", "Dead Bug"] },
    { name: "Dead Bug", sets: 3, reps: "8 each side", note: "Press lower back into floor the whole time", muscles: "Deep Core · Hip Flexors", subs: ["Bird Dog", "Plank"] },
    { name: "Cable Pallof Press", sets: 3, reps: "10 each side", note: "Anti-rotation — resist the cable pulling you", muscles: "Obliques · Anti-Rotation Core", subs: ["Cable Woodchops", "Plank"] },
    { name: "Hanging Knee Raises", sets: 3, reps: 12, note: "Control the descent, no swinging", muscles: "Lower Abs · Hip Flexors", subs: ["Stability Ball Crunches", "Dead Bug"] },
    { name: "Bird Dog", sets: 3, reps: "10 each side", note: "Pause 2 sec at full extension", muscles: "Lower Back · Glutes · Core", subs: ["Dead Bug", "Plank"] },
    { name: "Stability Ball Crunches", sets: 3, reps: 15, note: "Full range of motion over the ball", muscles: "Upper Abs · Core", subs: ["Hanging Knee Raises", "Ab Wheel Rollouts"] },
  ],
  strength: [
    { name: "Goblet Squat", sets: 3, reps: 12, note: "Dumbbell at chest, sit into your hips", muscles: "Quads · Glutes · Core", subs: ["Leg Press", "Dumbbell Lunges"] },
    { name: "Dumbbell Romanian Deadlift", sets: 3, reps: 12, note: "Hinge at the hips, slight knee bend", muscles: "Hamstrings · Glutes · Lower Back", subs: ["Leg Press", "Goblet Squat"] },
    { name: "Chest Press Machine", sets: 3, reps: 12, note: "Elbows slightly below shoulders", muscles: "Chest · Triceps · Front Delt", subs: ["Incline Dumbbell Press", "Dumbbell Shoulder Press"] },
    { name: "Lat Pulldown", sets: 3, reps: 12, note: "Pull to upper chest, full stretch at top", muscles: "Lats · Biceps · Upper Back", subs: ["Seated Cable Row", "Face Pulls"] },
    { name: "Seated Cable Row", sets: 3, reps: 12, note: "Drive elbows back, squeeze shoulder blades", muscles: "Mid Back · Biceps · Rear Delt", subs: ["Lat Pulldown", "Face Pulls"] },
    { name: "Dumbbell Shoulder Press", sets: 3, reps: 12, note: "Don't lock out elbows at top", muscles: "Shoulders · Triceps", subs: ["Chest Press Machine", "Face Pulls"] },
    { name: "Leg Press", sets: 3, reps: 12, note: "Feet shoulder-width, don't lock knees", muscles: "Quads · Glutes · Hamstrings", subs: ["Goblet Squat", "Dumbbell Lunges"] },
    { name: "Cable Tricep Pushdown", sets: 3, reps: 15, note: "Keep elbows pinned at sides", muscles: "Triceps", subs: ["Dumbbell Shoulder Press", "Incline Dumbbell Press"] },
    { name: "Dumbbell Bicep Curls", sets: 3, reps: 12, note: "Full range, no momentum swinging", muscles: "Biceps", subs: ["Lat Pulldown", "Seated Cable Row"] },
    { name: "Dumbbell Lunges", sets: 3, reps: "10 each leg", note: "Keep front knee over ankle", muscles: "Quads · Glutes · Balance", subs: ["Goblet Squat", "Leg Press"] },
    { name: "Incline Dumbbell Press", sets: 3, reps: 12, note: "30–45° incline, neutral wrist", muscles: "Upper Chest · Front Delt · Triceps", subs: ["Chest Press Machine", "Dumbbell Shoulder Press"] },
    { name: "Face Pulls", sets: 3, reps: 15, note: "Pull to forehead level, great for posture", muscles: "Rear Delt · Rotator Cuff · Traps", subs: ["Seated Cable Row", "Lat Pulldown"] },
  ],
};

const byName = {};
Object.values(WORKOUTS).flat().forEach(e => { byName[e.name] = e; });

function pick(arr, n, exclude = []) {
  const available = arr.filter(e => !exclude.includes(e.name));
  return [...available].sort(() => Math.random() - 0.5).slice(0, n);
}

function generateRoutine() {
  return {
    cardio:   pick(WORKOUTS.cardio, 1),
    strength: pick(WORKOUTS.strength, 4),
    core:     pick(WORKOUTS.core, 2),
  };
}

const STORAGE_KEY = "ymca_workout_v1";

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function buildEntry(routine, checked, metrics, doneCount, totalCount) {
  const exercises = ["cardio", "strength", "core"].flatMap(cat =>
    routine[cat].map((ex, i) => ({
      name: ex.name,
      category: cat,
      completed: checked[`${cat}-${i}`] || false,
      metric: metrics[ex.name] || null,
    }))
  );
  return {
    id: Date.now(),
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    exercises,
    completedCount: doneCount,
    totalCount,
  };
}

const CATEGORY_META = {
  cardio:   { label: "Cardio Warmup", color: "#F97316", icon: "🏃", bg: "#FFF7ED" },
  core:     { label: "Core Work",     color: "#8B5CF6", icon: "⚡", bg: "#F5F3FF" },
  strength: { label: "Strength",      color: "#0EA5E9", icon: "💪", bg: "#F0F9FF" },
};

function formatScheme(ex) {
  if (ex.duration && ex.sets) return `${ex.sets} × ${ex.duration}`;
  if (ex.duration) return ex.duration;
  return `${ex.sets} × ${ex.reps}`;
}

const METRIC_PLACEHOLDER = {
  cardio:   "Speed, distance, or level (e.g. 6.5 mph)",
  strength: "Weight used (e.g. 30 lbs)",
  core:     "Weight used (e.g. 15 lbs)",
};

// Only show a metric input for exercises where tracking a number makes sense
function showMetricInput(exercise, category) {
  if (category === "strength" || category === "cardio") return true;
  if (category === "core" && exercise.name.includes("Cable")) return true;
  return false;
}

// Walk history newest-first and grab the last recorded metric per exercise name
function buildLastMetrics(history) {
  const last = {};
  [...history].reverse().forEach(entry => {
    entry.exercises?.forEach(ex => {
      if (ex.metric && !last[ex.name]) last[ex.name] = ex.metric;
    });
  });
  return last;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🏋️</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: "#0F172A", margin: "0 0 10px", letterSpacing: "-0.5px", fontWeight: 400 }}>Baseline</h1>
        <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 36px", lineHeight: 1.6 }}>
          Sign in to save your workout history and access it from any device.
        </p>
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: "1.5px solid #E2E8F0", background: "#FFFFFF", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 15, fontWeight: 600, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "box-shadow 0.15s", opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/><path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.3-5l-6.6-5.4C29.8 37.3 27 38 24 38c-5.9 0-10.9-4-12.7-9.4l-7 5.4C7.9 41.9 15.4 46 24 46z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 3-3.3 5.4-6.1 7l6.6 5.4c4-3.7 6.7-9.3 6.7-16 0-1.3-.2-2.7-.5-4z"/></svg>
          {loading ? "Signing in…" : "Sign in with Google"}
        </button>
        {error && <p style={{ marginTop: 14, fontSize: 13, color: "#EF4444" }}>{error}</p>}
      </div>
    </div>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
function TabBar({ tab, onChange, historyCount }) {
  return (
    <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 12, padding: 4, marginBottom: 24 }}>
      {[
        { key: "today",   label: "Today" },
        { key: "history", label: `History${historyCount > 0 ? ` (${historyCount})` : ""}` },
      ].map(({ key, label }) => (
        <button key={key} onClick={() => onChange(key)} style={{
          flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
          background: tab === key ? "#FFFFFF" : "transparent",
          color: tab === key ? "#0F172A" : "#94A3B8",
          fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
          boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
          transition: "all 0.2s",
        }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── History Screen ────────────────────────────────────────────────────────────
function HistoryScreen({ history, loading }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <p style={{ fontSize: 14, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>Loading history…</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1E293B", margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" }}>No workouts logged yet</p>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
          Finish a session on the Today tab to start building your history.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[...history].reverse().map(entry => {
        const pct = Math.round((entry.completedCount / entry.totalCount) * 100);
        const allDone = entry.completedCount === entry.totalCount;
        return (
          <div key={entry.id} style={{ background: "#FFFFFF", borderRadius: 16, border: "1.5px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>{entry.date}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                  {entry.completedCount} of {entry.totalCount} exercises completed
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: allDone ? "#DCFCE7" : "#F1F5F9", color: allDone ? "#15803D" : "#64748B" }}>
                {pct}%{allDone ? " ✓" : ""}
              </div>
            </div>
            <div style={{ padding: "10px 16px 14px" }}>
              {["cardio", "strength", "core"].map(cat => {
                const catExercises = entry.exercises.filter(e => e.category === cat);
                if (catExercises.length === 0) return null;
                const meta = CATEGORY_META[cat];
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: meta.color, fontFamily: "'DM Sans', sans-serif", marginBottom: 5 }}>
                      {meta.icon} {meta.label}
                    </div>
                    {catExercises.map(ex => (
                      <div key={ex.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: ex.completed ? "#22C55E" : "#F1F5F9", border: `1.5px solid ${ex.completed ? "#22C55E" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                          {ex.completed ? "✓" : ""}
                        </div>
                        <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: ex.completed ? "#1E293B" : "#94A3B8", textDecoration: ex.completed ? "none" : "line-through", flex: 1 }}>
                          {ex.name}
                        </span>
                        {ex.metric && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, padding: "2px 7px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                            {ex.metric}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Picker Sheet ─────────────────────────────────────────────────────────────
function PickerSheet({ category, currentName, onSelect, onClose }) {
  const meta = CATEGORY_META[category];
  const current = byName[currentName];
  const suggestedNames = current?.subs || [];
  const options = WORKOUTS[category];
  const suggested = options.filter(e => suggestedNames.includes(e.name));
  const others    = options.filter(e => !suggestedNames.includes(e.name) && e.name !== currentName);

  const Row = ({ ex, badge }) => {
    const isCurrent = ex.name === currentName;
    return (
      <div onClick={() => !isCurrent && onSelect(ex)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", background: isCurrent ? meta.bg : "transparent", borderBottom: "1px solid #F8FAFC", cursor: isCurrent ? "default" : "pointer", opacity: isCurrent ? 0.55 : 1 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isCurrent ? meta.color : "#E2E8F0" }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>{ex.name}</span>
            {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, padding: "2px 6px", borderRadius: 10 }}>CURRENT</span>}
            {badge && !isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: 10 }}>SUGGESTED</span>}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
            {formatScheme(ex)} · {ex.muscles}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#FFFFFF", borderRadius: "22px 22px 0 0", padding: "20px 0 40px", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", animation: "slideUp 0.25s ease" }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ width: 40, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ padding: "0 20px 14px", borderBottom: "1px solid #F1F5F9" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: meta.color, fontFamily: "'DM Sans', sans-serif" }}>
            {meta.icon} Swap — {currentName}
          </span>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>Suggested swaps are highlighted first</p>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "58vh" }}>
          {suggested.length > 0 && (
            <>
              <div style={{ padding: "10px 20px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#059669", fontFamily: "'DM Sans', sans-serif" }}>Suggested</div>
              {suggested.map(ex => <Row key={ex.name} ex={ex} badge />)}
              <div style={{ padding: "10px 20px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>All Options</div>
            </>
          )}
          <Row ex={byName[currentName]} />
          {others.map(ex => <Row key={ex.name} ex={ex} />)}
        </div>
        <div style={{ padding: "16px 20px 0" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#F1F5F9", color: "#64748B", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, category, done, onToggle, onSwapRequest, onRemove, metric, lastMetric, onMetricChange }) {
  const meta = CATEGORY_META[category];
  const showInput = showMetricInput(exercise, category);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "14px", background: done ? "#F8FAFC" : "#FFFFFF", border: `1.5px solid ${done ? "#E2E8F0" : meta.color + "44"}`, transition: "all 0.2s ease", boxShadow: done ? "none" : "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div onClick={onToggle} style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 2, border: `2px solid ${done ? "#22C55E" : meta.color}`, background: done ? "#22C55E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: "pointer", userSelect: "none" }}>
        {done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, opacity: done ? 0.55 : 1, transition: "opacity 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }} onClick={onToggle}>
          <span style={{ fontSize: 15, fontWeight: 700, color: done ? "#94A3B8" : "#1E293B", fontFamily: "'DM Sans', sans-serif", textDecoration: done ? "line-through" : "none", letterSpacing: "-0.2px" }}>{exercise.name}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: meta.color, background: meta.bg, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>{formatScheme(exercise)}</span>
        </div>
        <div style={{ margin: "4px 0 3px" }} onClick={onToggle}>
          <span style={{ fontSize: 11, color: meta.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{exercise.muscles}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }} onClick={onToggle}>{exercise.note}</p>
        {showInput && (
          <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
            {lastMetric && (
              <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>Last time:</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: meta.color, background: meta.bg, padding: "2px 8px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif" }}>{lastMetric}</span>
              </div>
            )}
            <input
              type="text"
              value={metric || ""}
              onChange={e => onMetricChange(e.target.value)}
              placeholder={METRIC_PLACEHOLDER[category]}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 12, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", background: "#F8FAFC", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor = meta.color}
              onBlur={e => e.target.style.borderColor = "#E2E8F0"}
            />
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, marginTop: 1 }}>
        <a
          href={`https://www.youtube.com/results?search_query=how+to+do+${encodeURIComponent(exercise.name)}+exercise+form`}
          target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          title="Watch how-to on YouTube"
          style={{ width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#94A3B8", textDecoration: "none", transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#94A3B8"; }}
        >▶</a>
        <button onClick={e => { e.stopPropagation(); onSwapRequest(); }} title="Swap exercise" style={{ width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#94A3B8", transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = meta.bg; e.currentTarget.style.color = meta.color; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#94A3B8"; }}
        >↕</button>
        <button onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove exercise" style={{ width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#94A3B8", transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#94A3B8"; }}
        >✕</button>
      </div>
    </div>
  );
}

// ── Add Sheet ─────────────────────────────────────────────────────────────────
function AddSheet({ category, currentNames, onAdd, onClose }) {
  const meta = CATEGORY_META[category];
  const available = WORKOUTS[category].filter(ex => !currentNames.includes(ex.name));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#FFFFFF", borderRadius: "22px 22px 0 0", padding: "20px 0 40px", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", animation: "slideUp 0.25s ease" }}>
        <div style={{ width: 40, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ padding: "0 20px 14px", borderBottom: "1px solid #F1F5F9" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: meta.color, fontFamily: "'DM Sans', sans-serif" }}>
            {meta.icon} Add — {meta.label}
          </span>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>
            Tap an exercise to add it to today's workout
          </p>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "58vh" }}>
          {available.length === 0 ? (
            <p style={{ padding: "24px 20px", fontSize: 13, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", textAlign: "center", margin: 0 }}>
              All {meta.label.toLowerCase()} exercises are already in your routine.
            </p>
          ) : available.map(ex => (
            <div key={ex.name} onClick={() => onAdd(ex)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: "1px solid #F8FAFC", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = meta.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: "#E2E8F0" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                  {formatScheme(ex)} · {ex.muscles}
                </div>
              </div>
              <span style={{ fontSize: 18, color: meta.color, lineHeight: 1 }}>+</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 20px 0" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#F1F5F9", color: "#64748B", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ category, exercises, done, onToggle, onSwap, onRemove, onAddRequest, metrics, lastMetrics, onMetricChange }) {
  const meta = CATEGORY_META[category];
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: meta.color, fontFamily: "'DM Sans', sans-serif" }}>{meta.label}</span>
        <div style={{ flex: 1, height: 1, background: meta.color + "33", marginLeft: 4 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exercises.map((ex, i) => (
          <ExerciseCard key={ex.name} exercise={ex} category={category}
            done={done[`${category}-${i}`] || false}
            onToggle={() => onToggle(category, i)}
            onSwapRequest={() => onSwap(category, i)}
            onRemove={() => onRemove(category, i)}
            metric={metrics[ex.name] || ""}
            lastMetric={lastMetrics[ex.name] || null}
            onMetricChange={val => onMetricChange(ex.name, val)}
          />
        ))}
      </div>
      <button onClick={onAddRequest} style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 10, background: "transparent", border: `1.5px dashed ${meta.color}44`, color: meta.color, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = meta.bg}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        + Add exercise
      </button>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]            = useState(undefined); // undefined = checking, null = logged out
  const [routine, setRoutine]      = useState(null);
  const [checked, setChecked]      = useState({});
  const [sessionCount, setSession] = useState(0);
  const [animKey, setAnimKey]      = useState(0);
  const [picker, setPicker]        = useState(null);
  const [addPicker, setAddPicker]  = useState(null);
  const [tab, setTab]              = useState("today");
  const [history, setHistory]      = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [metrics, setMetrics]      = useState({}); // keyed by exercise name
  const [lastMetrics, setLastMetrics] = useState({});
  const initialized = useRef(false);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null));
    return unsub;
  }, []);

  // Load history from Firestore when user signs in
  useEffect(() => {
    if (!user) { setHistory([]); return; }
    setHistoryLoading(true);
    const q = query(collection(db, "users", user.uid, "history"), orderBy("id", "asc"));
    getDocs(q)
      .then(snap => {
        const entries = snap.docs.map(d => d.data());
        setHistory(entries);
        setLastMetrics(buildLastMetrics(entries));
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [user]);

  // Load current session from localStorage
  useEffect(() => {
    const saved = loadState();
    if (saved?.routine && saved?.checked !== undefined) {
      setRoutine(saved.routine);
      setChecked(saved.checked);
      setSession(saved.sessionCount || 0);
      setMetrics(saved.metrics || {});
    } else {
      const r = generateRoutine();
      setRoutine(r);
      setChecked({});
      setMetrics({});
      saveState({ routine: r, checked: {}, sessionCount: 0, metrics: {} });
    }
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current || !routine) return;
    saveState({ routine, checked, sessionCount, metrics });
  }, [routine, checked, sessionCount, metrics]);

  const commitToHistory = async (currentRoutine, currentChecked, currentMetrics, doneCount, totalCount) => {
    if (doneCount === 0 || !user) return;
    const entry = buildEntry(currentRoutine, currentChecked, currentMetrics, doneCount, totalCount);
    try {
      await addDoc(collection(db, "users", user.uid, "history"), entry);
      setHistory(prev => {
        const next = [...prev, entry];
        setLastMetrics(buildLastMetrics(next));
        return next;
      });
    } catch {}
  };

  const totalEx   = routine ? routine.cardio.length + routine.core.length + routine.strength.length : 0;
  const doneCount = Object.values(checked).filter(Boolean).length;

  const handleFinish = async () => {
    await commitToHistory(routine, checked, metrics, doneCount, totalEx);
    const r = generateRoutine();
    setRoutine(r);
    setChecked({});
    setMetrics({});
    setSession(s => s + 1);
    setAnimKey(k => k + 1);
    setTab("history");
  };

  const handleNew = async () => {
    await commitToHistory(routine, checked, metrics, doneCount, totalEx);
    const r = generateRoutine();
    setRoutine(r);
    setChecked({});
    setMetrics({});
    setSession(s => s + 1);
    setAnimKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = (category, index) => {
    setChecked(prev => ({ ...prev, [`${category}-${index}`]: !prev[`${category}-${index}`] }));
  };

  const handleMetricChange = (exerciseName, value) => {
    setMetrics(prev => ({ ...prev, [exerciseName]: value }));
  };

  const handleAdd = (exercise) => {
    setRoutine(prev => ({
      ...prev,
      [addPicker]: [...prev[addPicker], exercise],
    }));
    setAddPicker(null);
  };

  const handleRemove = (category, index) => {
    setRoutine(prev => {
      const updated = { ...prev };
      const arr = [...updated[category]];
      arr.splice(index, 1);
      updated[category] = arr;
      return updated;
    });
    // Remove the deleted key and shift subsequent indices down by one
    setChecked(prev => {
      const next = {};
      Object.entries(prev).forEach(([key, val]) => {
        const [cat, i] = key.split("-");
        const idx = parseInt(i);
        if (cat !== category) { next[key] = val; return; }
        if (idx < index) { next[key] = val; return; }
        if (idx > index) { next[`${cat}-${idx - 1}`] = val; }
      });
      return next;
    });
  };

  const handleSwapSelect = (newExercise) => {
    setRoutine(prev => {
      const updated = { ...prev };
      const arr = [...updated[picker.category]];
      arr[picker.index] = newExercise;
      updated[picker.category] = arr;
      return updated;
    });
    setChecked(prev => {
      const next = { ...prev };
      delete next[`${picker.category}-${picker.index}`];
      return next;
    });
    setPicker(null);
  };

  // Still checking auth state
  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "#94A3B8", fontFamily: "sans-serif" }}>Loading…</p>
      </div>
    );
  }

  if (user === null) return <LoginScreen />;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 100%)", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 20px 100px" }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "1.4px", textTransform: "uppercase", color: "#94A3B8" }}>Baseline · 30–45 min</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 24, height: 24, borderRadius: "50%", border: "1.5px solid #E2E8F0" }} />}
              <button onClick={() => signOut(auth)} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0, fontWeight: 500 }}>
                Sign out
              </button>
            </div>
          </div>
          <h1 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 34, fontWeight: 400, color: "#0F172A", lineHeight: 1.15, letterSpacing: "-0.5px" }}>
            {tab === "today" ? "Today's Workout" : "History"}
          </h1>
        </div>

        <TabBar tab={tab} onChange={setTab} historyCount={history.length} />

        {tab === "today" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "#64748B" }}>
                  {doneCount === totalEx && totalEx > 0 ? "🎉 Workout complete!" : `${doneCount} of ${totalEx} done`}
                </span>
                <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{totalEx > 0 ? Math.round((doneCount / totalEx) * 100) : 0}%</span>
              </div>
              <div style={{ height: 6, background: "#E2E8F0", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${totalEx > 0 ? (doneCount / totalEx) * 100 : 0}%`, background: doneCount === totalEx && totalEx > 0 ? "#22C55E" : "linear-gradient(90deg, #0EA5E9, #8B5CF6)", borderRadius: 10, transition: "width 0.4s ease" }} />
              </div>
            </div>

            {routine && (
              <div key={animKey} style={{ animation: "fadeUp 0.35s ease both" }}>
                <Section category="cardio"   exercises={routine.cardio}   done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} onRemove={handleRemove} onAddRequest={() => setAddPicker("cardio")}   metrics={metrics} lastMetrics={lastMetrics} onMetricChange={handleMetricChange} />
                <Section category="strength" exercises={routine.strength} done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} onRemove={handleRemove} onAddRequest={() => setAddPicker("strength")} metrics={metrics} lastMetrics={lastMetrics} onMetricChange={handleMetricChange} />
                <Section category="core"     exercises={routine.core}     done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} onRemove={handleRemove} onAddRequest={() => setAddPicker("core")}     metrics={metrics} lastMetrics={lastMetrics} onMetricChange={handleMetricChange} />
              </div>
            )}

            <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
                <strong>Rest tip:</strong> 45–60 sec between strength sets. Straight through core. 2–3 min between cardio and weights.
              </p>
            </div>

            {doneCount > 0 && (
              <button onClick={handleFinish} style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", color: "#FFFFFF", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(22,163,74,0.3)", transition: "transform 0.15s, box-shadow 0.15s", marginBottom: 10 }}
                onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(22,163,74,0.4)"; }}
                onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(22,163,74,0.3)"; }}
              >✓ Finish &amp; Save Workout</button>
            )}

            <button onClick={handleNew} style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", color: "#FFFFFF", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(15,23,42,0.25)", transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(15,23,42,0.3)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(15,23,42,0.25)"; }}
            >🔀 Generate New Routine</button>
            <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 10, marginBottom: 0 }}>Your routine is saved and will be here when you return</p>
          </>
        )}

        {tab === "history" && <HistoryScreen history={history} loading={historyLoading} />}
      </div>

      {addPicker && routine && (
        <AddSheet
          category={addPicker}
          currentNames={routine[addPicker].map(ex => ex.name)}
          onAdd={handleAdd}
          onClose={() => setAddPicker(null)}
        />
      )}

      {picker && routine && (
        <PickerSheet
          category={picker.category}
          currentName={routine[picker.category][picker.index].name}
          onSelect={handleSwapSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
