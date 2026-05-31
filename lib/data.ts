import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Exercise, Routine, WorkoutSession } from "./supabase/types";

// Browser/server clients from @supabase/ssr resolve their Schema generic
// concretely; keep this alias permissive on that 3rd generic so both are assignable.
export type DB = SupabaseClient<Database, "public", any>;

export type RoutineExRow = {
  id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_rpe: number | null;
  rest_seconds: number | null;
};
export type RoutineFull = Routine & { routine_exercises: RoutineExRow[] };

export type NewRoutineEx = {
  exercise_id: string;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_rpe: number | null;
  rest_seconds: number | null;
};

export type LoggedSet = {
  id: string;
  exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
};

// ── Exercises ───────────────────────────────────────────────────
export async function fetchExercises(db: DB): Promise<Exercise[]> {
  const { data, error } = await db.from("exercises").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

// Distinct exercise IDs the user has logged recently (most recent first).
export async function fetchRecentExerciseIds(db: DB, limit = 8): Promise<string[]> {
  const { data, error } = await db
    .from("sets")
    .select("exercise_id, completed_at")
    .order("completed_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const seen: string[] = [];
  for (const r of data ?? []) {
    if (!seen.includes(r.exercise_id)) seen.push(r.exercise_id);
    if (seen.length >= limit) break;
  }
  return seen;
}

export async function createCustomExercise(
  db: DB,
  userId: string,
  e: { name: string; category: string; primary_muscle: string }
): Promise<Exercise> {
  const { data, error } = await db
    .from("exercises")
    .insert({ user_id: userId, name: e.name, category: e.category, primary_muscle: e.primary_muscle })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Profile ─────────────────────────────────────────────────────
export async function fetchProfile(db: DB, userId: string) {
  const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  db: DB,
  userId: string,
  patch: Partial<Database["public"]["Tables"]["profiles"]["Update"]>
) {
  const { error } = await db.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

// ── Routines ────────────────────────────────────────────────────
export async function fetchRoutines(db: DB): Promise<RoutineFull[]> {
  const { data, error } = await db
    .from("routines")
    .select("*, routine_exercises(*)")
    .eq("archived", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as RoutineFull[];
  rows.forEach((r) => r.routine_exercises.sort((a, b) => a.position - b.position));
  return rows;
}

export async function fetchRoutine(db: DB, id: string): Promise<RoutineFull | null> {
  const { data, error } = await db
    .from("routines")
    .select("*, routine_exercises(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as unknown as RoutineFull;
  r.routine_exercises.sort((a, b) => a.position - b.position);
  return r;
}

export async function createRoutine(db: DB, userId: string, name: string, exercises: NewRoutineEx[]) {
  const { data: r, error } = await db.from("routines").insert({ user_id: userId, name }).select().single();
  if (error) throw error;
  if (exercises.length) await replaceRoutineExercises(db, r.id, exercises);
  return r.id;
}

export async function updateRoutine(db: DB, id: string, name: string, exercises: NewRoutineEx[]) {
  const { error } = await db.from("routines").update({ name }).eq("id", id);
  if (error) throw error;
  await replaceRoutineExercises(db, id, exercises);
}

async function replaceRoutineExercises(db: DB, routineId: string, exercises: NewRoutineEx[]) {
  await db.from("routine_exercises").delete().eq("routine_id", routineId);
  if (!exercises.length) return;
  const rows = exercises.map((ex, i) => ({
    routine_id: routineId,
    exercise_id: ex.exercise_id,
    position: i,
    target_sets: ex.target_sets,
    target_reps_min: ex.target_reps_min,
    target_reps_max: ex.target_reps_max,
    target_rpe: ex.target_rpe,
    rest_seconds: ex.rest_seconds,
  }));
  const { error } = await db.from("routine_exercises").insert(rows);
  if (error) throw error;
}

export async function deleteRoutine(db: DB, id: string) {
  const { error } = await db.from("routines").update({ archived: true }).eq("id", id);
  if (error) throw error;
}

// ── Sessions + sets ─────────────────────────────────────────────
export async function startSession(
  db: DB,
  userId: string,
  opts: { routineId?: string | null; name?: string | null }
): Promise<WorkoutSession> {
  const { data, error } = await db
    .from("workout_sessions")
    .insert({ user_id: userId, routine_id: opts.routineId ?? null, name: opts.name ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function logSet(
  db: DB,
  sessionId: string,
  s: { exercise_id: string; set_index: number; weight_kg: number | null; reps: number | null; rpe: number | null; is_warmup: boolean }
): Promise<LoggedSet> {
  const { data, error } = await db
    .from("sets")
    .insert({
      workout_session_id: sessionId,
      exercise_id: s.exercise_id,
      set_index: s.set_index,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe,
      is_warmup: s.is_warmup,
    })
    .select()
    .single();
  if (error) throw error;
  return data as LoggedSet;
}

export async function deleteSet(db: DB, setId: string) {
  const { error } = await db.from("sets").delete().eq("id", setId);
  if (error) throw error;
}

export async function finishSession(
  db: DB,
  sessionId: string,
  totals: { total_volume_kg: number; total_sets: number; duration_seconds: number; notes: string | null }
) {
  const { error } = await db
    .from("workout_sessions")
    .update({
      finished_at: new Date().toISOString(),
      total_volume_kg: totals.total_volume_kg,
      total_sets: totals.total_sets,
      duration_seconds: totals.duration_seconds,
      notes: totals.notes,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function discardSession(db: DB, sessionId: string) {
  const { error } = await db.from("workout_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export type SessionSummary = WorkoutSession;

export async function fetchSessions(db: DB): Promise<SessionSummary[]> {
  const { data, error } = await db
    .from("workout_sessions")
    .select("*")
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type SessionDetail = {
  session: WorkoutSession;
  sets: LoggedSet[];
};
export async function fetchSessionDetail(db: DB, id: string): Promise<SessionDetail | null> {
  const { data: session, error } = await db.from("workout_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!session) return null;
  const { data: sets, error: e2 } = await db
    .from("sets")
    .select("id, exercise_id, set_index, weight_kg, reps, rpe, is_warmup")
    .eq("workout_session_id", id)
    .order("completed_at", { ascending: true });
  if (e2) throw e2;
  return { session, sets: (sets ?? []) as LoggedSet[] };
}

export type LastPerf = {
  best_weight: number | null;
  best_reps: number | null;
  best_rpe: number | null;
  session_date: string | null;
  total_volume: number | null;
} | null;

export async function fetchLastPerformance(db: DB, exerciseId: string, userId: string): Promise<LastPerf> {
  const { data, error } = await db.rpc("get_last_performance", {
    p_exercise_id: exerciseId,
    p_user_id: userId,
  });
  if (error) throw error;
  const row = (data as LastPerf[] | null)?.[0];
  return row ?? null;
}

export type Stats = { totalSessions: number; totalVolume: number; totalSets: number; avgDuration: number };
export async function fetchStats(db: DB): Promise<Stats> {
  const sessions = await fetchSessions(db);
  const totalSessions = sessions.length;
  const totalVolume = sessions.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const totalSets = sessions.reduce((n, s) => n + (s.total_sets ?? 0), 0);
  const durations = sessions.map((s) => s.duration_seconds ?? 0).filter((d) => d > 0);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60) : 0;
  return { totalSessions, totalVolume, totalSets, avgDuration };
}
