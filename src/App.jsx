import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, orderBy, query, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
    { name: "Russian Twists", sets: 3, reps: "15 each side", note: "Feet off floor for extra challenge, rotate fully", muscles: "Obliques · Core", subs: ["Cable Woodchops", "Dead Bug"] },
    { name: "Side Plank", sets: 3, duration: "25 sec each side", note: "Stack feet or stagger them, hips stay lifted", muscles: "Obliques · Hip Abductors", subs: ["Plank", "Cable Pallof Press"] },
    { name: "Lying Leg Raises", sets: 3, reps: 12, note: "Lower back pressed to floor, control the descent", muscles: "Lower Abs · Hip Flexors", subs: ["Hanging Knee Raises", "Dead Bug"] },
    { name: "Mountain Climbers", sets: 3, duration: "30 sec", note: "Drive knees to chest alternately, keep hips level", muscles: "Core · Shoulders · Hip Flexors", subs: ["Plank", "Bird Dog"] },
    { name: "Superman Hold", sets: 3, reps: 10, note: "Lift arms and legs simultaneously, 2 sec pause at top", muscles: "Lower Back · Glutes · Core", subs: ["Bird Dog", "Dead Bug"] },
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
    { name: "Pec Deck", sets: 3, reps: 12, note: "Keep slight bend in elbows, squeeze hard at center", muscles: "Chest · Front Delt", subs: ["Chest Press Machine", "Incline Dumbbell Press"] },
    { name: "Dumbbell Lateral Raise", sets: 3, reps: 12, note: "Lead with elbows, stop at shoulder height", muscles: "Shoulders · Traps", subs: ["Dumbbell Shoulder Press", "Face Pulls"] },
    { name: "Leg Extension Machine", sets: 3, reps: 12, note: "Full extension at top, slow on the way down", muscles: "Quads", subs: ["Goblet Squat", "Leg Press"] },
    { name: "Leg Curl Machine", sets: 3, reps: 12, note: "Full range, control the negative", muscles: "Hamstrings", subs: ["Dumbbell Romanian Deadlift", "Leg Press"] },
    { name: "Dumbbell Single-Arm Row", sets: 3, reps: "10 each side", note: "Support on bench, drive elbow to hip", muscles: "Mid Back · Biceps", subs: ["Seated Cable Row", "Lat Pulldown"] },
    { name: "Assisted Pull-Up Machine", sets: 3, reps: 10, note: "Full hang at bottom, chin over bar at top", muscles: "Lats · Biceps · Core", subs: ["Lat Pulldown", "Seated Cable Row"] },
    { name: "Dumbbell Hammer Curls", sets: 3, reps: 12, note: "Neutral grip, control both ways", muscles: "Biceps · Forearms", subs: ["Dumbbell Bicep Curls", "Seated Cable Row"] },
  ],
};

const byName = {};
Object.values(WORKOUTS).flat().forEach(e => { byName[e.name] = e; });

const AVOID_KEYWORDS = {
  legs:      ["Legs", "Quads", "Glutes", "Hamstrings", "Calves"],
  back:      ["Back"],
  shoulders: ["Shoulder", "Tricep", "Bicep", "Delt", "Trap"],
};

const TIMEFRAME_COUNTS = {
  quick:    { strength: 2, core: 1 },
  standard: { strength: 4, core: 2 },
  extended: { strength: 6, core: 3 },
};

const TIMEFRAME_LABELS = { quick: "~20 min", standard: "~35 min", extended: "~50 min" };

const GROUP_META = {
  "Upper Push": { color: "#0EA5E9", bg: "#F0F9FF" },
  "Upper Pull": { color: "#8B5CF6", bg: "#F5F3FF" },
  "Lower Body": { color: "#F97316", bg: "#FFF7ED" },
  "Core":       { color: "#16A34A", bg: "#F0FDF4" },
};

function classifyGroups(muscles) {
  const groups = [];
  if (/Chest|Tricep|Delt|Shoulder/.test(muscles)) groups.push("Upper Push");
  if (/Back|Lats|Bicep|Trap/.test(muscles))       groups.push("Upper Pull");
  if (/Quads|Glutes|Hamstrings|Calves|Legs/.test(muscles)) groups.push("Lower Body");
  if (/Core|Obliques|Abs/.test(muscles))           groups.push("Core");
  return groups;
}

function buildRecentNames(history, n = 4) {
  const recent = new Set();
  history.slice(-n).forEach(entry => entry.exercises?.forEach(ex => recent.add(ex.name)));
  return recent;
}

function buildGroupRecency(history, n = 3) {
  const counts = { "Upper Push": 0, "Upper Pull": 0, "Lower Body": 0, "Core": 0 };
  history.slice(-n).forEach(entry => {
    const seen = new Set();
    entry.exercises?.forEach(ex => {
      const obj = byName[ex.name];
      if (obj) classifyGroups(obj.muscles).forEach(g => seen.add(g));
    });
    seen.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
  });
  return counts;
}

function getRoutineGroups(routine) {
  const groups = new Set();
  ["cardio", "strength", "core"].forEach(cat =>
    routine[cat]?.forEach(ex => classifyGroups(ex.muscles).forEach(g => groups.add(g)))
  );
  return [...groups];
}

// Recency weight (3× for fresh exercises) × group freshness (2× for untrained groups)
function weightedPick(arr, n, recentNames = new Set(), groupRecency = {}) {
  const weighted = arr.flatMap(ex => {
    const recW = recentNames.has(ex.name) ? 1 : 3;
    const grpW = classifyGroups(ex.muscles).some(g => (groupRecency[g] ?? 0) === 0) ? 2 : 1;
    return Array(recW * grpW).fill(ex);
  });
  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  const seen = new Set();
  const result = [];
  for (const ex of shuffled) {
    if (!seen.has(ex.name)) { seen.add(ex.name); result.push(ex); }
    if (result.length === n) break;
  }
  return result;
}

function generateRoutine(checkin = null, blocked = new Set(), recentNames = new Set(), groupRecency = {}) {
  let cardioPool   = WORKOUTS.cardio.filter(ex => !blocked.has(ex.name));
  let strengthPool = WORKOUTS.strength.filter(ex => !blocked.has(ex.name));
  let corePool     = WORKOUTS.core.filter(ex => !blocked.has(ex.name));

  if (checkin?.avoidMuscles?.length > 0) {
    const excluded = checkin.avoidMuscles.flatMap(g => AVOID_KEYWORDS[g] || []);
    const ok = ex => !excluded.some(kw => ex.muscles.includes(kw));
    const fc  = cardioPool.filter(ok);   if (fc.length  >= 1) cardioPool   = fc;
    const fs  = strengthPool.filter(ok); if (fs.length  >= 3) strengthPool = fs;
    const fco = corePool.filter(ok);     if (fco.length >= 2) corePool     = fco;
  }

  const counts = TIMEFRAME_COUNTS[checkin?.timeframe] || TIMEFRAME_COUNTS.standard;
  const strengthCount = Math.max(1, counts.strength - (checkin?.energy === "low" ? 1 : 0));

  return {
    cardio:   checkin?.cardioDone ? [] : weightedPick(cardioPool, 1, recentNames, groupRecency),
    strength: weightedPick(strengthPool, strengthCount, recentNames, groupRecency),
    core:     weightedPick(corePool, counts.core, recentNames, groupRecency),
  };
}

const STORAGE_KEY       = "ymca_workout_v1";
const GUEST_HISTORY_KEY = "ymca_guest_history_v1";
const GUEST_BLOCKED_KEY = "ymca_guest_blocked_v1";
const GUEST_PREFS_KEY   = "ymca_guest_prefs_v1";

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function buildEntry(routine, checked, metrics, doneCount, totalCount, notes = "", checkin = null) {
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
    notes: notes.trim(),
    checkin: checkin ? { energy: checkin.energy, timeframe: checkin.timeframe, cardioDone: checkin.cardioDone } : null,
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

function showMetricInput(exercise, category) {
  if (category === "strength" || category === "cardio") return true;
  if (category === "core" && exercise.name.includes("Cable")) return true;
  return false;
}

function buildLastMetrics(history) {
  const last = {};
  [...history].reverse().forEach(entry => {
    entry.exercises?.forEach(ex => {
      if (ex.metric && !last[ex.name]) last[ex.name] = ex.metric;
    });
  });
  return last;
}

// ── Check-In Screen ───────────────────────────────────────────────────────────
function CheckIn({ onComplete, defaultTimeframe }) {
  const [energy, setEnergy]             = useState("good");
  const [timeframe, setTimeframe]       = useState(defaultTimeframe || "standard");
  const [cardioDone, setCardioDone]     = useState(false);
  const [avoidMuscles, setAvoidMuscles] = useState([]);

  const toggleAvoid = group =>
    setAvoidMuscles(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );

  const ENERGY_OPTIONS = [
    { key: "low",  icon: "😴", label: "Low"    },
    { key: "good", icon: "💪", label: "Good"   },
    { key: "high", icon: "⚡", label: "Pumped" },
  ];
  const AVOID_OPTIONS = [
    { key: "legs",      label: "Legs"             },
    { key: "back",      label: "Back"             },
    { key: "shoulders", label: "Shoulders & Arms" },
  ];

  const chip = selected => ({
    borderRadius: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, fontWeight: 600, transition: "all 0.15s",
    border: `1.5px solid ${selected ? "#0EA5E9" : "#E2E8F0"}`,
    background: selected ? "#F0F9FF" : "#FFFFFF",
    color: selected ? "#0EA5E9" : "#64748B",
  });

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <p style={{ margin: "0 0 28px", fontSize: 14, color: "#64748B", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
        Answer a couple of quick questions and we'll tailor today's routine to how you're feeling.
      </p>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>How's your energy today?</div>
        <div style={{ display: "flex", gap: 8 }}>
          {ENERGY_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setEnergy(opt.key)}
              style={{ ...chip(energy === opt.key), flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 8px" }}>
              <span style={{ fontSize: 22 }}>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>How long do you have?</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "quick",    icon: "⚡", label: "Quick",    sub: "~20 min" },
            { key: "standard", icon: "💪", label: "Standard", sub: "~35 min" },
            { key: "extended", icon: "🔥", label: "Extended", sub: "~50 min" },
          ].map(opt => (
            <button key={opt.key} onClick={() => setTimeframe(opt.key)}
              style={{ ...chip(timeframe === opt.key), flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 8px" }}>
              <span style={{ fontSize: 22 }}>{opt.icon}</span>
              <span>{opt.label}</span>
              <span style={{ fontSize: 10, fontWeight: 400, color: timeframe === opt.key ? "#0EA5E9" : "#94A3B8" }}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>Any cardio already today?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setCardioDone(false)} style={{ ...chip(!cardioDone), flex: 1, padding: "10px 0" }}>Nope</button>
          <button onClick={() => setCardioDone(true)}  style={{ ...chip(cardioDone),  flex: 1, padding: "10px 0" }}>Yes 🏃</button>
        </div>
      </div>

      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
          Anything to go easy on? <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>Select any that apply</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {AVOID_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => toggleAvoid(opt.key)}
              style={{ ...chip(avoidMuscles.includes(opt.key)), padding: "9px 14px" }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onComplete({ energy, timeframe, cardioDone, avoidMuscles })}
        style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", color: "#FFFFFF", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(15,23,42,0.25)", transition: "transform 0.15s, box-shadow 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(15,23,42,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(15,23,42,0.25)"; }}
      >
        Build My Workout →
      </button>
    </div>
  );
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
const CHECKIN_ENERGY_LABELS = { low: "Low energy", good: "Good energy", high: "High energy" };

function HistoryScreen({ history, loading, isGuest, onSignIn, onUpdateEntry }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId]   = useState(null);
  const [editDraft, setEditDraft]   = useState(null);

  const startEdit = (entry, e) => {
    e.stopPropagation();
    setExpandedId(entry.id);
    setEditingId(entry.id);
    setEditDraft({ ...entry, exercises: entry.exercises.map(ex => ({ ...ex })) });
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };

  const toggleDraftEx = (index) => {
    setEditDraft(prev => {
      const exercises = prev.exercises.map((ex, i) => i === index ? { ...ex, completed: !ex.completed } : ex);
      return { ...prev, exercises, completedCount: exercises.filter(e => e.completed).length };
    });
  };

  const removeDraftEx = (index) => {
    setEditDraft(prev => {
      const exercises = prev.exercises.filter((_, i) => i !== index);
      return { ...prev, exercises, completedCount: exercises.filter(e => e.completed).length, totalCount: exercises.length };
    });
  };

  const saveEdit = () => { onUpdateEntry(editDraft); setEditingId(null); setEditDraft(null); };

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
        <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 24px", fontFamily: "'DM Sans', sans-serif" }}>
          Finish a session on the Today tab to start building your history.
        </p>
        {isGuest && (
          <button onClick={onSignIn} style={{ padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", color: "#FFFFFF", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Sign in to sync across devices →
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {isGuest && (
        <div style={{ background: "#F0F9FF", border: "1.5px solid #BAE6FD", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0369A1", fontFamily: "'DM Sans', sans-serif" }}>Saved on this device only</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Sign in to sync across devices</div>
          </div>
          <button onClick={onSignIn} style={{ fontSize: 13, fontWeight: 600, color: "#0EA5E9", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 }}>Sign in →</button>
        </div>
      )}
      {[...history].reverse().map(entry => {
        const isExpanded = expandedId === entry.id;
        const isEditing  = editingId === entry.id;
        const display    = isEditing ? editDraft : entry;
        const pct        = display.totalCount > 0 ? Math.round((display.completedCount / display.totalCount) * 100) : 0;
        const allDone    = display.totalCount > 0 && display.completedCount === display.totalCount;
        const checkinParts = entry.checkin ? [
          entry.checkin.timeframe  ? TIMEFRAME_LABELS[entry.checkin.timeframe]       : null,
          entry.checkin.energy     ? CHECKIN_ENERGY_LABELS[entry.checkin.energy]     : null,
          entry.checkin.cardioDone ? "Cardio done"                                   : null,
        ].filter(Boolean) : [];

        return (
          <div key={entry.id} style={{ background: "#FFFFFF", borderRadius: 16, border: `1.5px solid ${isEditing ? "#BAE6FD" : "#E2E8F0"}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "border-color 0.2s" }}>
            {/* Header */}
            <div onClick={() => !isEditing && setExpandedId(isExpanded ? null : entry.id)}
              style={{ padding: "14px 16px", cursor: isEditing ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>{entry.date}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                  {display.completedCount} of {display.totalCount} completed
                  {checkinParts.length > 0 && <span style={{ color: "#CBD5E1" }}> · {checkinParts.join(" · ")}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {isExpanded && !isEditing && (
                  <button onClick={e => startEdit(entry, e)}
                    style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "2px 4px" }}>
                    Edit
                  </button>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: allDone ? "#DCFCE7" : "#F1F5F9", color: allDone ? "#15803D" : "#64748B", transition: "all 0.2s" }}>
                  {pct}%{allDone ? " ✓" : ""}
                </div>
                {!isEditing && <span style={{ fontSize: 11, color: "#CBD5E1" }}>{isExpanded ? "▲" : "▼"}</span>}
              </div>
            </div>

            {/* Expanded / edit content */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid #F1F5F9", padding: "12px 16px 16px" }}>
                {["cardio", "strength", "core"].map(cat => {
                  const catExercises = display.exercises
                    .map((ex, i) => ({ ...ex, _i: i }))
                    .filter(ex => ex.category === cat);
                  if (catExercises.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: meta.color, fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
                        {meta.icon} {meta.label}
                      </div>
                      {catExercises.map(ex => (
                        <div key={ex.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                          <div
                            onClick={() => isEditing && toggleDraftEx(ex._i)}
                            style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: ex.completed ? "#22C55E" : "transparent", border: `2px solid ${ex.completed ? "#22C55E" : "#CBD5E1"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, cursor: isEditing ? "pointer" : "default", transition: "all 0.15s" }}>
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
                          {isEditing && (
                            <button onClick={() => removeDraftEx(ex._i)}
                              style={{ width: 22, height: 22, borderRadius: 6, background: "#FEF2F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#EF4444", flexShrink: 0 }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Notes — editable in edit mode */}
                {isEditing ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>Session Notes</div>
                    <textarea
                      value={editDraft.notes || ""}
                      onChange={e => setEditDraft(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add notes…"
                      rows={3}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 13, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", background: "#F8FAFC", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5, transition: "border-color 0.15s" }}
                      onFocus={e => e.target.style.borderColor = "#94A3B8"}
                      onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                    />
                  </div>
                ) : entry.notes ? (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "#F8FAFC", borderRadius: 10, borderLeft: "3px solid #E2E8F0" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginBottom: 5 }}>Session Notes</div>
                    <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{entry.notes}</p>
                  </div>
                ) : null}

                {/* Edit actions */}
                {isEditing && (
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button onClick={cancelEdit}
                      style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#F1F5F9", color: "#64748B", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      Cancel
                    </button>
                    <button onClick={saveEdit}
                      style={{ flex: 2, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", color: "#FFFFFF", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      Save changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Picker Sheet ─────────────────────────────────────────────────────────────
function PickerSheet({ category, currentName, onSelect, onClose, blockedExercises, onToggleBlock, neverUsedSet, showNewBadge }) {
  const meta = CATEGORY_META[category];
  const current = byName[currentName];
  const suggestedNames = current?.subs || [];
  const options = WORKOUTS[category];
  const suggested = options.filter(e => suggestedNames.includes(e.name));
  const others    = options.filter(e => !suggestedNames.includes(e.name) && e.name !== currentName);

  const Row = ({ ex, badge }) => {
    const isCurrent = ex.name === currentName;
    const isBlocked = blockedExercises.has(ex.name);
    const isNew = showNewBadge && neverUsedSet.has(ex.name);

    const handleClick = () => {
      if (isCurrent) return;
      if (isBlocked) onToggleBlock(ex.name);
      onSelect(ex);
    };

    return (
      <div onClick={handleClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", background: isCurrent ? meta.bg : "transparent", borderBottom: "1px solid #F8FAFC", cursor: isCurrent ? "default" : "pointer", opacity: isCurrent ? 0.55 : isBlocked ? 0.65 : 1 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isCurrent ? meta.color : isBlocked ? "#F97316" : "#E2E8F0" }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>{ex.name}</span>
            {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, padding: "2px 6px", borderRadius: 10 }}>CURRENT</span>}
            {badge && !isCurrent && !isBlocked && <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: 10 }}>SUGGESTED</span>}
            {isBlocked && <span style={{ fontSize: 10, fontWeight: 700, color: "#F97316", background: "#FFF7ED", padding: "2px 6px", borderRadius: 10 }}>HIDDEN — tap to restore</span>}
            {isNew && !isBlocked && !isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", background: "#FFFBEB", padding: "2px 6px", borderRadius: 10 }}>Try it ✦</span>}
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
function ExerciseCard({ exercise, category, done, onToggle, onSwapRequest, onRemove, metric, lastMetric, onMetricChange, isBlocked, onToggleBlock, isNew }) {
  const meta = CATEGORY_META[category];
  const showInput = showMetricInput(exercise, category);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "14px", background: done ? "#F8FAFC" : "#FFFFFF", border: `1.5px solid ${done ? "#E2E8F0" : meta.color + "44"}`, transition: "all 0.2s ease", boxShadow: done ? "none" : "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div onClick={onToggle} style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 2, border: `2px solid ${done ? "#22C55E" : meta.color}`, background: done ? "#22C55E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: "pointer", userSelect: "none" }}>
        {done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, opacity: done ? 0.55 : 1, transition: "opacity 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }} onClick={onToggle}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: done ? "#94A3B8" : "#1E293B", fontFamily: "'DM Sans', sans-serif", textDecoration: done ? "line-through" : "none", letterSpacing: "-0.2px" }}>{exercise.name}</span>
            {isNew && <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", background: "#FFFBEB", padding: "2px 6px", borderRadius: 10, border: "1px solid #FDE68A" }}>Try it ✦</span>}
          </div>
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
        <button
          onClick={e => { e.stopPropagation(); onToggleBlock(); }}
          title={isBlocked ? "Hidden from future routines — click to restore" : "Hide from future routines"}
          style={{ width: 28, height: 28, borderRadius: 8, background: isBlocked ? "#FFF7ED" : "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: isBlocked ? "#F97316" : "#94A3B8", transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#FFF7ED"; e.currentTarget.style.color = "#F97316"; }}
          onMouseLeave={e => { e.currentTarget.style.background = isBlocked ? "#FFF7ED" : "#F1F5F9"; e.currentTarget.style.color = isBlocked ? "#F97316" : "#94A3B8"; }}
        >{isBlocked ? "⊕" : "⊖"}</button>
        <button onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove exercise" style={{ width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#94A3B8", transition: "background 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#94A3B8"; }}
        >✕</button>
      </div>
    </div>
  );
}

// ── Add Sheet ─────────────────────────────────────────────────────────────────
function AddSheet({ category, currentNames, onAdd, onClose, blockedExercises, neverUsedSet, showNewBadge }) {
  const meta = CATEGORY_META[category];
  const available = WORKOUTS[category].filter(ex => !currentNames.includes(ex.name) && !blockedExercises.has(ex.name));

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
          ) : available.map(ex => {
            const isNew = showNewBadge && neverUsedSet.has(ex.name);
            return (
              <div key={ex.name} onClick={() => onAdd(ex)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: "1px solid #F8FAFC", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = meta.bg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: "#E2E8F0" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>{ex.name}</span>
                    {isNew && <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", background: "#FFFBEB", padding: "2px 6px", borderRadius: 10, border: "1px solid #FDE68A" }}>Try it ✦</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                    {formatScheme(ex)} · {ex.muscles}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: meta.color, lineHeight: 1 }}>+</span>
              </div>
            );
          })}
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

// ── Preferences Sheet ─────────────────────────────────────────────────────────
function PrefsSheet({ onClose, blockedExercises, onToggleBlock, defaultTimeframe, onSetDefaultTimeframe }) {
  const blockedByCategory = ["cardio", "strength", "core"]
    .map(cat => ({ cat, meta: CATEGORY_META[cat], exercises: WORKOUTS[cat].filter(ex => blockedExercises.has(ex.name)) }))
    .filter(g => g.exercises.length > 0);
  const totalBlocked = blockedExercises.size;

  const chip = selected => ({
    borderRadius: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, fontWeight: 600, transition: "all 0.15s",
    border: `1.5px solid ${selected ? "#0EA5E9" : "#E2E8F0"}`,
    background: selected ? "#F0F9FF" : "#FFFFFF",
    color: selected ? "#0EA5E9" : "#64748B",
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#FFFFFF", borderRadius: "22px 22px 0 0", padding: "20px 0 40px", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", animation: "slideUp 0.25s ease" }}>
        <div style={{ width: 40, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ padding: "0 20px 14px", borderBottom: "1px solid #F1F5F9" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", fontFamily: "'DM Serif Display', serif" }}>Preferences</span>
        </div>

        <div style={{ overflowY: "auto", maxHeight: "65vh" }}>
          {/* Default Timeframe */}
          <div style={{ padding: "18px 20px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>Default Timeframe</div>
            <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", margin: "0 0 12px", lineHeight: 1.5 }}>
              Pre-selects your timeframe at check-in. You can always override it on the day.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { key: "quick",    icon: "⚡", label: "Quick",    sub: "~20 min" },
                { key: "standard", icon: "💪", label: "Standard", sub: "~35 min" },
                { key: "extended", icon: "🔥", label: "Extended", sub: "~50 min" },
              ].map(opt => (
                <button key={opt.key} onClick={() => onSetDefaultTimeframe(opt.key)}
                  style={{ ...chip(defaultTimeframe === opt.key), flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 8px" }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <span>{opt.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, color: defaultTimeframe === opt.key ? "#0EA5E9" : "#94A3B8" }}>{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hidden Exercises */}
          <div style={{ padding: "18px 20px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
              Hidden Exercises{totalBlocked > 0 ? ` (${totalBlocked})` : ""}
            </div>
            {totalBlocked === 0 ? (
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", margin: 0, lineHeight: 1.5 }}>
                No hidden exercises. Tap ⊖ on any exercise card to hide it from future routines.
              </p>
            ) : (
              blockedByCategory.map(({ cat, meta, exercises }) => (
                <div key={cat} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: meta.color, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
                    {meta.icon} {meta.label}
                  </div>
                  {exercises.map(ex => (
                    <div key={ex.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #F8FAFC" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>{ex.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{ex.muscles}</div>
                      </div>
                      <button onClick={() => onToggleBlock(ex.name)}
                        style={{ padding: "6px 14px", borderRadius: 8, background: "#F0FDF4", border: "1.5px solid #BBF7D0", color: "#15803D", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#F1F5F9", color: "#64748B", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ category, exercises, done, onToggle, onSwap, onRemove, onAddRequest, metrics, lastMetrics, onMetricChange, blockedExercises, neverUsedSet, showNewBadge, onToggleBlock }) {
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
            isBlocked={blockedExercises.has(ex.name)}
            isNew={showNewBadge && neverUsedSet.has(ex.name)}
            onToggleBlock={() => onToggleBlock(ex.name)}
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
  const [user, setUser]                 = useState(undefined);
  const [routine, setRoutine]           = useState(null);
  const [checked, setChecked]           = useState({});
  const [sessionCount, setSession]      = useState(0);
  const [animKey, setAnimKey]           = useState(0);
  const [picker, setPicker]             = useState(null);
  const [addPicker, setAddPicker]       = useState(null);
  const [tab, setTab]                   = useState("today");
  const [history, setHistory]           = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [metrics, setMetrics]           = useState({});
  const [lastMetrics, setLastMetrics]   = useState({});
  const [lastCheckin, setLastCheckin]   = useState(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [blockedExercises, setBlockedExercises]       = useState(new Set());
  const [defaultTimeframePref, setDefaultTimeframePref] = useState("standard");
  const [showPrefs, setShowPrefs]                     = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      try {
        const raw = localStorage.getItem(GUEST_HISTORY_KEY);
        const entries = raw ? JSON.parse(raw) : [];
        setHistory(entries);
        setLastMetrics(buildLastMetrics(entries));
      } catch {}
      try {
        const raw = localStorage.getItem(GUEST_BLOCKED_KEY);
        setBlockedExercises(new Set(raw ? JSON.parse(raw) : []));
      } catch {}
      try {
        const raw = localStorage.getItem(GUEST_PREFS_KEY);
        const prefs = raw ? JSON.parse(raw) : {};
        setDefaultTimeframePref(prefs.defaultTimeframe || "standard");
      } catch {}
      return;
    }
    setHistoryLoading(true);
    const q = query(collection(db, "users", user.uid, "history"), orderBy("id", "asc"));
    const prefsRef = doc(db, "users", user.uid, "preferences", "exercises");
    Promise.all([getDocs(q), getDoc(prefsRef)])
      .then(([snap, prefsSnap]) => {
        const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
        setHistory(entries);
        setLastMetrics(buildLastMetrics(entries));
        if (prefsSnap.exists()) {
          setBlockedExercises(new Set(prefsSnap.data().blocked || []));
          setDefaultTimeframePref(prefsSnap.data().defaultTimeframe || "standard");
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [user]);

  useEffect(() => {
    const saved = loadState();
    if (saved?.routine && saved?.checked !== undefined) {
      setRoutine(saved.routine);
      setChecked(saved.checked);
      setSession(saved.sessionCount || 0);
      setMetrics(saved.metrics || {});
      setSessionNotes(saved.notes || "");
    }
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    if (!routine) { try { localStorage.removeItem(STORAGE_KEY); } catch {} return; }
    saveState({ routine, checked, sessionCount, metrics, notes: sessionNotes });
  }, [routine, checked, sessionCount, metrics, sessionNotes]);

  const commitToHistory = async (currentRoutine, currentChecked, currentMetrics, doneCount, totalCount, notes, checkin) => {
    if (doneCount === 0) return;
    const entry = buildEntry(currentRoutine, currentChecked, currentMetrics, doneCount, totalCount, notes, checkin);
    if (user) {
      try {
        const docRef = await addDoc(collection(db, "users", user.uid, "history"), entry);
        const stored = { ...entry, _docId: docRef.id };
        setHistory(prev => { const next = [...prev, stored]; setLastMetrics(buildLastMetrics(next)); return next; });
        return;
      } catch {}
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) || "[]");
        localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify([...existing, entry]));
      } catch {}
    }
    setHistory(prev => { const next = [...prev, entry]; setLastMetrics(buildLastMetrics(next)); return next; });
  };

  const toggleBlock = async (exerciseName) => {
    const next = new Set(blockedExercises);
    if (next.has(exerciseName)) next.delete(exerciseName); else next.add(exerciseName);
    setBlockedExercises(next);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid, "preferences", "exercises"), { blocked: Array.from(next) }, { merge: true });
      } catch {}
    } else {
      try { localStorage.setItem(GUEST_BLOCKED_KEY, JSON.stringify(Array.from(next))); } catch {}
    }
  };

  const handleSetDefaultTimeframe = async (tf) => {
    setDefaultTimeframePref(tf);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid, "preferences", "exercises"), { defaultTimeframe: tf }, { merge: true });
      } catch {}
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem(GUEST_PREFS_KEY) || "{}");
        localStorage.setItem(GUEST_PREFS_KEY, JSON.stringify({ ...existing, defaultTimeframe: tf }));
      } catch {}
    }
  };

  const handleSignIn = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch {}
  };

  const handleUpdateEntry = async (updatedEntry) => {
    setHistory(prev => {
      const next = prev.map(e => e.id === updatedEntry.id ? updatedEntry : e);
      setLastMetrics(buildLastMetrics(next));
      if (!user) {
        try { localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(next)); } catch {}
      }
      return next;
    });
    if (user && updatedEntry._docId) {
      try {
        const { _docId, ...data } = updatedEntry;
        await updateDoc(doc(db, "users", user.uid, "history", _docId), data);
      } catch {}
    }
  };

  const totalEx   = routine ? routine.cardio.length + routine.core.length + routine.strength.length : 0;
  const doneCount = Object.values(checked).filter(Boolean).length;

  // Derived sets for "Try it" badges
  const usedNames    = new Set(history.flatMap(e => e.exercises?.map(ex => ex.name) || []));
  const neverUsedSet = new Set(Object.values(WORKOUTS).flat().map(ex => ex.name).filter(n => !usedNames.has(n)));
  const showNewBadge = history.length >= 2;

  const handleCheckinComplete = (checkin) => {
    setLastCheckin(checkin);
    setRoutine(generateRoutine(checkin, blockedExercises, buildRecentNames(history), buildGroupRecency(history)));
    setAnimKey(k => k + 1);
  };

  const handleFinish = async () => {
    await commitToHistory(routine, checked, metrics, doneCount, totalEx, sessionNotes, lastCheckin);
    setRoutine(null);
    setChecked({});
    setMetrics({});
    setSessionNotes("");
    setSession(s => s + 1);
    setTab("history");
  };

  const handleNew = async () => {
    await commitToHistory(routine, checked, metrics, doneCount, totalEx, sessionNotes, lastCheckin);
    setRoutine(null);
    setChecked({});
    setMetrics({});
    setSessionNotes("");
    setSession(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = (category, index) => {
    setChecked(prev => ({ ...prev, [`${category}-${index}`]: !prev[`${category}-${index}`] }));
  };

  const handleMetricChange = (exerciseName, value) => {
    setMetrics(prev => ({ ...prev, [exerciseName]: value }));
  };

  const handleAdd = (exercise) => {
    setRoutine(prev => ({ ...prev, [addPicker]: [...prev[addPicker], exercise] }));
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

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "#94A3B8", fontFamily: "sans-serif" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 100%)", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 20px 100px" }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "1.4px", textTransform: "uppercase", color: "#94A3B8" }}>
              Baseline · {lastCheckin?.timeframe ? TIMEFRAME_LABELS[lastCheckin.timeframe] : "30–45 min"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setShowPrefs(true)} title="Preferences"
                style={{ width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#64748B", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#E2E8F0"}
                onMouseLeave={e => e.currentTarget.style.background = "#F1F5F9"}
              >⚙</button>
              {user ? (
                <>
                  {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 24, height: 24, borderRadius: "50%", border: "1.5px solid #E2E8F0" }} />}
                  <button onClick={() => signOut(auth)} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0, fontWeight: 500 }}>Sign out</button>
                </>
              ) : (
                <button onClick={handleSignIn} style={{ fontSize: 12, fontWeight: 600, color: "#0EA5E9", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 }}>Sign in →</button>
              )}
            </div>
          </div>
          <h1 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 34, fontWeight: 400, color: "#0F172A", lineHeight: 1.15, letterSpacing: "-0.5px" }}>
            {tab === "today" ? (routine ? "Today's Workout" : "Quick Check-In") : "History"}
          </h1>
        </div>

        <TabBar tab={tab} onChange={setTab} historyCount={history.length} />

        {tab === "today" && (
          <>
            {!routine ? (
              <CheckIn onComplete={handleCheckinComplete} defaultTimeframe={defaultTimeframePref} />
            ) : (
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

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                  {getRoutineGroups(routine).map(group => {
                    const m = GROUP_META[group];
                    return <span key={group} style={{ fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, padding: "3px 10px", borderRadius: 20, fontFamily: "'DM Sans', sans-serif" }}>{group}</span>;
                  })}
                </div>

                <div key={animKey} style={{ animation: "fadeUp 0.35s ease both" }}>
                  {lastCheckin?.cardioDone && (
                    <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 12, padding: "10px 16px", marginBottom: 20, fontSize: 13, fontWeight: 500, color: "#15803D", fontFamily: "'DM Sans', sans-serif" }}>
                      🏃 Cardio skipped — you already got it in today!
                    </div>
                  )}
                  {routine.cardio.length > 0 && (
                    <Section category="cardio" exercises={routine.cardio} done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} onRemove={handleRemove} onAddRequest={() => setAddPicker("cardio")} metrics={metrics} lastMetrics={lastMetrics} onMetricChange={handleMetricChange} blockedExercises={blockedExercises} neverUsedSet={neverUsedSet} showNewBadge={showNewBadge} onToggleBlock={toggleBlock} />
                  )}
                  <Section category="strength" exercises={routine.strength} done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} onRemove={handleRemove} onAddRequest={() => setAddPicker("strength")} metrics={metrics} lastMetrics={lastMetrics} onMetricChange={handleMetricChange} blockedExercises={blockedExercises} neverUsedSet={neverUsedSet} showNewBadge={showNewBadge} onToggleBlock={toggleBlock} />
                  <Section category="core" exercises={routine.core} done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} onRemove={handleRemove} onAddRequest={() => setAddPicker("core")} metrics={metrics} lastMetrics={lastMetrics} onMetricChange={handleMetricChange} blockedExercises={blockedExercises} neverUsedSet={neverUsedSet} showNewBadge={showNewBadge} onToggleBlock={toggleBlock} />
                </div>

                <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
                    <strong>Rest tip:</strong> 45–60 sec between strength sets. Straight through core. 2–3 min between cardio and weights.
                  </p>
                </div>

                <textarea
                  value={sessionNotes}
                  onChange={e => setSessionNotes(e.target.value)}
                  placeholder="Session notes — how's it feeling? Anything to remember next time…"
                  rows={3}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", fontSize: 13, color: "#1E293B", fontFamily: "'DM Sans', sans-serif", background: "#F8FAFC", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6, marginBottom: 16, transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = "#94A3B8"}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                />

                {doneCount > 0 && (
                  <button onClick={handleFinish} style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", color: "#FFFFFF", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(22,163,74,0.3)", transition: "transform 0.15s, box-shadow 0.15s", marginBottom: 10 }}
                    onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(22,163,74,0.4)"; }}
                    onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(22,163,74,0.3)"; }}
                  >{user ? "✓ Finish & Save Workout" : "✓ Finish Workout"}</button>
                )}

                <button onClick={handleNew} style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", color: "#FFFFFF", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(15,23,42,0.25)", transition: "transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(15,23,42,0.3)"; }}
                  onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(15,23,42,0.25)"; }}
                >🔀 New Routine</button>
                <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 10, marginBottom: 0 }}>
                  {user ? "Your routine is saved and will be here when you return" : "Saved on this device · Sign in to sync across devices"}
                </p>
              </>
            )}
          </>
        )}

        {tab === "history" && <HistoryScreen history={history} loading={historyLoading} isGuest={!user} onSignIn={handleSignIn} onUpdateEntry={handleUpdateEntry} />}
      </div>

      {addPicker && routine && (
        <AddSheet
          category={addPicker}
          currentNames={routine[addPicker].map(ex => ex.name)}
          onAdd={handleAdd}
          onClose={() => setAddPicker(null)}
          blockedExercises={blockedExercises}
          neverUsedSet={neverUsedSet}
          showNewBadge={showNewBadge}
        />
      )}

      {showPrefs && (
        <PrefsSheet
          onClose={() => setShowPrefs(false)}
          blockedExercises={blockedExercises}
          onToggleBlock={toggleBlock}
          defaultTimeframe={defaultTimeframePref}
          onSetDefaultTimeframe={handleSetDefaultTimeframe}
        />
      )}

      {picker && routine && (
        <PickerSheet
          category={picker.category}
          currentName={routine[picker.category][picker.index].name}
          onSelect={handleSwapSelect}
          onClose={() => setPicker(null)}
          blockedExercises={blockedExercises}
          onToggleBlock={toggleBlock}
          neverUsedSet={neverUsedSet}
          showNewBadge={showNewBadge}
        />
      )}
    </div>
  );
}
