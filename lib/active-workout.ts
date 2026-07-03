// Client-side persistence for the live workout session. Logged sets already
// commit to Supabase as you tick them off, but the in-progress prescription
// (planned sets, edited-but-not-yet-logged weights/reps, which exercise is
// active, the rest timer) used to live in React state only — a full page
// reload or the PWA being killed in the background lost it completely and
// left an orphaned `workout_sessions` row with finished_at = null. Snapshot
// that state here so a fresh load can rebuild the exact same screen instead
// of starting over.
const KEY = "gymapp.activeWorkout.v1";

export type ActiveWorkoutSnapshot = {
  userId: string;
  sessionId: string;
  workoutConfig: { routineId: string | null; name: string | null };
  startTs: number;
  barWeight: number;
  defaultRest: number;
  currentKey: string | null;
  // Kept untyped here (WEx lives in Workout.tsx) to avoid a circular import;
  // the caller casts it back to WEx[] on read.
  exs: unknown;
  restTimer: { total: number; endsAt: number; remaining: number } | null;
};

export function loadActiveWorkout(userId: string): ActiveWorkoutSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as ActiveWorkoutSnapshot;
    if (!snap || snap.userId !== userId || !snap.sessionId) return null;
    return snap;
  } catch {
    return null;
  }
}

export function hasActiveWorkout(userId: string): boolean {
  return loadActiveWorkout(userId) != null;
}

export function saveActiveWorkout(snap: ActiveWorkoutSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* storage full/unavailable — the session still lives in memory this tab */
  }
}

export function clearActiveWorkout() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
