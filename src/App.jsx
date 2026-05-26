import { useState, useEffect, useRef } from "react";

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
      <div
        onClick={() => !isCurrent && onSelect(ex)}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "13px 20px",
          background: isCurrent ? meta.bg : "transparent",
          borderBottom: "1px solid #F8FAFC",
          cursor: isCurrent ? "default" : "pointer",
          opacity: isCurrent ? 0.55 : 1,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isCurrent ? meta.color : "#E2E8F0" }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "'DM Sans', sans-serif" }}>
              {ex.name}
            </span>
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
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>
            Suggested swaps are highlighted first
          </p>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "58vh" }}>
          {suggested.length > 0 && (
            <>
              <div style={{ padding: "10px 20px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#059669", fontFamily: "'DM Sans', sans-serif" }}>
                Suggested
              </div>
              {suggested.map(ex => <Row key={ex.name} ex={ex} badge />)}
              <div style={{ padding: "10px 20px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>
                All Options
              </div>
            </>
          )}
          <Row ex={byName[currentName]} />
          {others.map(ex => <Row key={ex.name} ex={ex} />)}
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

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, category, done, onToggle, onSwapRequest }) {
  const meta = CATEGORY_META[category];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "14px", background: done ? "#F8FAFC" : "#FFFFFF", border: `1.5px solid ${done ? "#E2E8F0" : meta.color + "44"}`, transition: "all 0.2s ease", opacity: done ? 0.55 : 1, boxShadow: done ? "none" : "0 2px 8px rgba(0,0,0,0.06)" }}>
      {/* Check */}
      <div onClick={onToggle} style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 2, border: `2px solid ${done ? "#22C55E" : meta.color}`, background: done ? "#22C55E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: "pointer", userSelect: "none" }}>
        {done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }} onClick={onToggle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: done ? "#94A3B8" : "#1E293B", fontFamily: "'DM Sans', sans-serif", textDecoration: done ? "line-through" : "none", letterSpacing: "-0.2px" }}>
            {exercise.name}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: meta.color, background: meta.bg, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>
            {formatScheme(exercise)}
          </span>
        </div>
        {/* Muscles */}
        <div style={{ margin: "4px 0 3px", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 11, color: meta.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            {exercise.muscles}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
          {exercise.note}
        </p>
      </div>
      {/* Swap */}
      <button onClick={e => { e.stopPropagation(); onSwapRequest(); }} title="Swap exercise" style={{ flexShrink: 0, marginTop: 1, width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#94A3B8", transition: "background 0.15s, color 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.background = meta.bg; e.currentTarget.style.color = meta.color; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#94A3B8"; }}
      >↕</button>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ category, exercises, done, onToggle, onSwap }) {
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
          />
        ))}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [routine, setRoutine]       = useState(null);
  const [checked, setChecked]       = useState({});
  const [sessionCount, setSession]  = useState(0);
  const [animKey, setAnimKey]       = useState(0);
  const [picker, setPicker]         = useState(null);
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    if (saved?.routine && saved?.checked !== undefined) {
      setRoutine(saved.routine);
      setChecked(saved.checked);
      setSession(saved.sessionCount || 0);
    } else {
      const r = generateRoutine();
      setRoutine(r);
      setChecked({});
      saveState({ routine: r, checked: {}, sessionCount: 0 });
    }
    initialized.current = true;
  }, []);

  // Save whenever state changes (after init)
  useEffect(() => {
    if (!initialized.current || !routine) return;
    saveState({ routine, checked, sessionCount });
  }, [routine, checked, sessionCount]);

  const handleNew = () => {
    const r = generateRoutine();
    const c = {};
    setRoutine(r);
    setChecked(c);
    setSession(s => s + 1);
    setAnimKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = (category, index) => {
    const key = `${category}-${index}`;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSwapSelect = (newExercise) => {
    setRoutine(prev => {
      const updated = { ...prev };
      const arr = [...updated[picker.category]];
      arr[picker.index] = newExercise;
      updated[picker.category] = arr;
      return updated;
    });
    // Clear done state for swapped exercise
    setChecked(prev => {
      const next = { ...prev };
      delete next[`${picker.category}-${picker.index}`];
      return next;
    });
    setPicker(null);
  };

  const totalEx = routine ? routine.cardio.length + routine.core.length + routine.strength.length : 0;
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 100%)", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 20px 100px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "1.4px", textTransform: "uppercase", color: "#94A3B8" }}>YMCA · 30–45 min</span>
            {sessionCount > 0 && <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>Session #{sessionCount + 1}</span>}
          </div>
          <h1 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 34, fontWeight: 400, color: "#0F172A", lineHeight: 1.15, letterSpacing: "-0.5px" }}>Today's Workout</h1>

          {/* Progress bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}>
                {doneCount === totalEx && totalEx > 0 ? "🎉 Workout complete!" : `${doneCount} of ${totalEx} done`}
              </span>
              <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{totalEx > 0 ? Math.round((doneCount / totalEx) * 100) : 0}%</span>
            </div>
            <div style={{ height: 6, background: "#E2E8F0", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${totalEx > 0 ? (doneCount / totalEx) * 100 : 0}%`, background: doneCount === totalEx && totalEx > 0 ? "#22C55E" : "linear-gradient(90deg, #0EA5E9, #8B5CF6)", borderRadius: 10, transition: "width 0.4s ease" }} />
            </div>
          </div>
        </div>

        {routine && (
          <div key={animKey} style={{ animation: "fadeUp 0.35s ease both" }}>
            <Section category="cardio"   exercises={routine.cardio}   done={checked} onToggle={handleToggle} onSwap={setPicker} />
            <Section category="strength" exercises={routine.strength} done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} />
            <Section category="core"     exercises={routine.core}     done={checked} onToggle={handleToggle} onSwap={(cat, i) => setPicker({ category: cat, index: i })} />
          </div>
        )}

        {/* Tip */}
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
            <strong>Rest tip:</strong> 45–60 sec between strength sets. Straight through core. 2–3 min between cardio and weights.
          </p>
        </div>

        {/* New routine */}
        <button onClick={handleNew} style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", color: "#FFFFFF", fontSize: 15, fontWeight: 700, letterSpacing: "0.2px", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(15,23,42,0.25)", transition: "transform 0.15s, box-shadow 0.15s" }}
          onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(15,23,42,0.3)"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(15,23,42,0.25)"; }}
        >🔀 Generate New Routine</button>
        <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 10, marginBottom: 0 }}>Your routine is saved and will be here when you return</p>
      </div>

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
