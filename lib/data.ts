import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Exercise, Food, FoodLog, NutritionProgram, Routine, WeightLog, WorkoutSession } from "./supabase/types";
import type { MuscleGroup } from "./muscles";

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

// ── Weekly muscle volume (working-set count per primary muscle, last 7 days) ──
// Shared by Progress (full body map) and Today (Cockpit heatmap snapshot).
export async function weeklyMuscleSets(
  db: DB,
  exMap: Record<string, Exercise>
): Promise<Partial<Record<MuscleGroup, number>>> {
  const weekStart = Date.now() - 7 * 24 * 3600 * 1000;
  const { data, error } = await db.from("sets").select("is_warmup,exercise_id,completed_at");
  if (error) throw error;
  const agg: Record<string, number> = {};
  for (const s of data ?? []) {
    if (s.is_warmup) continue;
    if (s.completed_at && new Date(s.completed_at).getTime() >= weekStart) {
      const muscle = exMap[s.exercise_id]?.primary_muscle ?? "Other";
      agg[muscle] = (agg[muscle] ?? 0) + 1;
    }
  }
  return agg as Partial<Record<MuscleGroup, number>>;
}

// ── Nutrition: food_logs (per user/day) ─────────────────────────
export type NewFoodLog = {
  name: string;
  meal: string;
  food_id?: string | null;
  qty_g?: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: string;
  photo_path?: string | null;
};

export async function fetchFoodLogs(db: DB, loggedOn: string): Promise<FoodLog[]> {
  const { data, error } = await db
    .from("food_logs")
    .select("*")
    .eq("logged_on", loggedOn)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addFoodLog(db: DB, userId: string, loggedOn: string, e: NewFoodLog): Promise<FoodLog> {
  const { data, error } = await db
    .from("food_logs")
    .insert({
      user_id: userId,
      logged_on: loggedOn,
      meal: (e.meal || "other").toLowerCase(),
      food_id: e.food_id ?? null,
      name: e.name,
      qty_g: e.qty_g ?? null,
      kcal: e.kcal,
      protein_g: e.protein_g,
      carbs_g: e.carbs_g,
      fat_g: e.fat_g,
      source: e.source,
      photo_path: e.photo_path ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FoodLog;
}

export async function deleteFoodLog(db: DB, id: string) {
  const { error } = await db.from("food_logs").delete().eq("id", id);
  if (error) throw error;
}

// Search the shared foods cache (foods other users already looked up).
export async function searchFoodsCache(db: DB, query: string, limit = 15): Promise<Food[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await db.from("foods").select("*").ilike("name", `%${q}%`).limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Best-effort insert into the shared foods cache; returns the new id or null.
export async function cacheFood(
  db: DB,
  f: { source: string; barcode?: string | null; name: string; brand?: string | null; serving_g?: number | null; kcal: number; protein_g: number; carbs_g: number; fat_g: number }
): Promise<string | null> {
  const { data, error } = await db
    .from("foods")
    .insert({
      source: f.source,
      barcode: f.barcode ?? null,
      name: f.name,
      brand: f.brand ?? null,
      serving_g: f.serving_g ?? null,
      kcal: f.kcal,
      protein_g: f.protein_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
    })
    .select("id")
    .single();
  if (error) return null;
  return data?.id ?? null;
}

// ── Open Food Facts (live search + barcode). Macros are per 100g. ──
export type OffFood = {
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_g: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function offNum(v: unknown): number {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isFinite(x) ? x : 0;
}

function normalizeOff(p: any): OffFood | null {
  if (!p) return null;
  const name = (p.product_name_de || p.product_name || p.generic_name || "").toString().trim();
  if (!name) return null;
  const n = p.nutriments ?? {};
  return {
    name: name.slice(0, 80),
    brand: (p.brands ? String(p.brands).split(",")[0].trim() : null) || null,
    barcode: p.code ? String(p.code) : null,
    // Only trust serving_quantity when it's in grams (OFF also stores mL etc.).
    serving_g:
      p.serving_quantity && (!p.serving_quantity_unit || String(p.serving_quantity_unit).toLowerCase() === "g")
        ? offNum(p.serving_quantity)
        : null,
    kcal: Math.round(offNum(n["energy-kcal_100g"])),
    protein_g: Math.round(offNum(n.proteins_100g)),
    carbs_g: Math.round(offNum(n.carbohydrates_100g)),
    fat_g: Math.round(offNum(n.fat_100g)),
  };
}

const OFF_FIELDS = "product_name,product_name_de,generic_name,brands,code,serving_quantity,serving_quantity_unit,nutriments";

export async function offSearch(query: string, limit = 20): Promise<OffFood[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit}&fields=${OFF_FIELDS}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.products ?? []) as any[])
      .map(normalizeOff)
      .filter((f): f is OffFood => !!f && f.kcal > 0);
  } catch {
    return [];
  }
}

export async function offByBarcode(barcode: string): Promise<OffFood | null> {
  const code = barcode.trim();
  if (!code) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${OFF_FIELDS}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.product) return null;
    return normalizeOff(data.product);
  } catch {
    return null;
  }
}

// ── AI photo -> macros (via the analyze-meal edge function) ──
export type MealEstimate = { name: string; serving_g: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number };
export async function analyzeMealPhoto(
  db: DB,
  imageDataUrl: string,
  hint?: string
): Promise<{ ok: true; data: MealEstimate } | { ok: false; error: string }> {
  const { data, error } = await db.functions.invoke("analyze-meal", { body: { image: imageDataUrl, hint } });
  if (error) {
    // supabase-js surfaces non-2xx as a FunctionsHttpError; the helpful body
    // message (e.g. "OPENROUTER_API_KEY secret is not set") lives in .context.
    let msg = error.message ?? "Request failed";
    try {
      const ctx = (error as any).context;
      const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      if (body?.error) msg = body.error;
    } catch {
      /* keep generic message */
    }
    return { ok: false, error: msg };
  }
  if (!data || (data as any).error) return { ok: false, error: (data as any)?.error ?? "No result" };
  return { ok: true, data: data as MealEstimate };
}

// ── Dashboard: week macros (sum per day) for the bar-grid ──
export type DayMacros = { date: string; kcal: number; protein: number; carbs: number; fat: number };
export async function fetchWeekMacros(db: DB, dates: string[]): Promise<Record<string, DayMacros>> {
  const out: Record<string, DayMacros> = {};
  for (const d of dates) out[d] = { date: d, kcal: 0, protein: 0, carbs: 0, fat: 0 };
  if (!dates.length) return out;
  const { data, error } = await db
    .from("food_logs")
    .select("logged_on,kcal,protein_g,carbs_g,fat_g")
    .gte("logged_on", dates[0])
    .lte("logged_on", dates[dates.length - 1]);
  if (error) throw error;
  for (const r of data ?? []) {
    const o = out[r.logged_on as string];
    if (!o) continue;
    o.kcal += r.kcal ?? 0;
    o.protein += r.protein_g ?? 0;
    o.carbs += r.carbs_g ?? 0;
    o.fat += r.fat_g ?? 0;
  }
  return out;
}

// ── Weight logs + True-Weight inputs ──
export async function fetchWeightLogs(db: DB, sinceDays = 120): Promise<WeightLog[]> {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);
  const { data, error } = await db
    .from("weight_logs")
    .select("*")
    .gte("logged_on", since)
    .order("logged_on", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function logWeight(db: DB, userId: string, loggedOn: string, weightKg: number, bodyFatPct?: number | null) {
  const { error } = await db
    .from("weight_logs")
    .upsert({ user_id: userId, logged_on: loggedOn, weight_kg: weightKg, body_fat_pct: bodyFatPct ?? null }, { onConflict: "user_id,logged_on" });
  if (error) throw error;
}

// ── Adaptive nutrition program (the coach's current plan) ──
export async function fetchActiveProgram(db: DB): Promise<NutritionProgram | null> {
  const { data, error } = await db.from("nutrition_programs").select("*").eq("active", true).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveProgram(
  db: DB,
  userId: string,
  p: Partial<Database["public"]["Tables"]["nutrition_programs"]["Insert"]> & { id?: string }
): Promise<NutritionProgram> {
  if (p.id) {
    const { data, error } = await db
      .from("nutrition_programs")
      .update({ ...p, updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .select()
      .single();
    if (error) throw error;
    return data as NutritionProgram;
  }
  // deactivate any existing active program, then insert the new active one
  await db.from("nutrition_programs").update({ active: false }).eq("user_id", userId).eq("active", true);
  const { data, error } = await db
    .from("nutrition_programs")
    .insert({ ...p, user_id: userId, active: true })
    .select()
    .single();
  if (error) throw error;
  return data as NutritionProgram;
}
