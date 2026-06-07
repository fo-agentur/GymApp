// program-gen.ts — rule-based training program generator.
// MacroFactor Workouts builds a personalized program from a questionnaire using
// "rule-based logic … grounded in research-based training principles" (NOT
// generative AI). This module is that engine: deterministic, transparent rules
// over the local exercise table — split selection, exercise picking by
// muscle/role/equipment, and per-goal set/rep/RIR/rest prescription.
import type { Exercise } from "./supabase/types";
import type { MuscleGroup } from "./muscles";

export type Goal = "hypertrophy" | "strength";
export type Experience = "beginner" | "intermediate" | "advanced";
export type EquipmentKind = "full_gym" | "barbell_home" | "dumbbell" | "bodyweight";

export type OnboardingAnswers = {
  goal: Goal;
  experience: Experience;
  daysPerWeek: number; // 2..6
  sessionMinutes: number; // 45..90
  equipment: EquipmentKind;
};

export type GenExercise = {
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_rir: number;
  rest_seconds: number;
  superset_group: number | null;
  notes: string | null;
};
export type GenWorkout = { name: string; day_of_week: number; position: number; exercises: GenExercise[] };
export type ProgramSpec = {
  name: string;
  goal: Goal;
  difficulty: Experience;
  days_per_week: number;
  duration_weeks: number;
  description: string;
  weeks: { week_number: number; is_deload: boolean; volume_multiplier: number }[];
  workouts: GenWorkout[];
};

type Role = "compound" | "isolation";
type Slot = { muscle: MuscleGroup; role: Role };

// ── Equipment → allowed exercise categories (see scripts/generate-exercises) ──
const ALLOWED: Record<EquipmentKind, string[]> = {
  full_gym: ["barbell", "dumbbell", "machine", "cable", "bodyweight", "other"],
  barbell_home: ["barbell", "dumbbell", "bodyweight"],
  dumbbell: ["dumbbell", "bodyweight"],
  bodyweight: ["bodyweight", "other"],
};
const EQUIP_RANK: Record<string, number> = { barbell: 5, dumbbell: 4, machine: 3, cable: 3, bodyweight: 2, other: 1 };
const COMPOUND_KW = /press|squat|deadlift|\brow\b|pull-?up|pulldown|pull down|chin|lunge|\bdip\b|clean|thrust|push-?up|press up|hack|leg press|row/i;
const ISO_KW = /curl|extension|raise|fly|flye|crossover|pushdown|kickback|pull-?over|calf|crunch|lateral/i;

function isCompound(e: Exercise): boolean {
  const sec = e.secondary_muscles?.length ?? 0;
  if (ISO_KW.test(e.name) && sec < 2) return false;
  return sec >= 2 || COMPOUND_KW.test(e.name);
}

// ── Day templates: ordered slots, compounds first ──
const T = {
  fullbodyA: slots(["Quads:c", "Chest:c", "Back:c", "Shoulders:i", "Hamstrings:c", "Triceps:i", "Biceps:i", "Core:i"]),
  fullbodyB: slots(["Hamstrings:c", "Back:c", "Chest:c", "Quads:c", "Shoulders:i", "Biceps:i", "Triceps:i", "Calves:i"]),
  fullbodyC: slots(["Quads:c", "Chest:c", "Back:c", "Glutes:c", "Shoulders:i", "Core:i", "Calves:i", "Forearms:i"]),
  push: slots(["Chest:c", "Shoulders:c", "Chest:i", "Shoulders:i", "Triceps:i", "Triceps:i"]),
  pull: slots(["Back:c", "Back:c", "Back:i", "Biceps:i", "Biceps:i", "Forearms:i"]),
  legs: slots(["Quads:c", "Hamstrings:c", "Quads:i", "Glutes:c", "Hamstrings:i", "Calves:i", "Core:i"]),
  upper: slots(["Chest:c", "Back:c", "Shoulders:c", "Back:i", "Chest:i", "Biceps:i", "Triceps:i"]),
  lower: slots(["Quads:c", "Hamstrings:c", "Glutes:c", "Quads:i", "Hamstrings:i", "Calves:i", "Core:i"]),
};
function slots(spec: string[]): Slot[] {
  return spec.map((s) => {
    const [m, r] = s.split(":");
    return { muscle: m as MuscleGroup, role: r === "c" ? "compound" : "isolation" };
  });
}

type DayDef = { name: string; template: Slot[]; dow: number };
function buildSplit(days: number): DayDef[] {
  const dow = ({ 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] } as Record<number, number[]>)[days] ?? [1, 3, 5];
  let defs: { name: string; template: Slot[] }[];
  switch (days) {
    case 1: defs = [{ name: "Ganzkörper", template: T.fullbodyA }]; break;
    case 2: defs = [{ name: "Ganzkörper A", template: T.fullbodyA }, { name: "Ganzkörper B", template: T.fullbodyB }]; break;
    case 3: defs = [{ name: "Ganzkörper A", template: T.fullbodyA }, { name: "Ganzkörper B", template: T.fullbodyB }, { name: "Ganzkörper C", template: T.fullbodyC }]; break;
    case 4: defs = [{ name: "Oberkörper A", template: T.upper }, { name: "Unterkörper A", template: T.lower }, { name: "Oberkörper B", template: T.upper }, { name: "Unterkörper B", template: T.lower }]; break;
    case 5: defs = [{ name: "Oberkörper", template: T.upper }, { name: "Unterkörper", template: T.lower }, { name: "Push", template: T.push }, { name: "Pull", template: T.pull }, { name: "Beine", template: T.legs }]; break;
    default: defs = [{ name: "Push A", template: T.push }, { name: "Pull A", template: T.pull }, { name: "Beine A", template: T.legs }, { name: "Push B", template: T.push }, { name: "Pull B", template: T.pull }, { name: "Beine B", template: T.legs }]; break;
  }
  return defs.map((d, i) => ({ ...d, dow: dow[i] ?? i + 1 }));
}

// ── Prescription (sets / reps / RIR / rest) ──
function setsFor(role: Role, exp: Experience): number {
  if (role === "compound") return exp === "beginner" ? 3 : 4;
  return exp === "advanced" ? 4 : 3;
}
function repsFor(role: Role, goal: Goal): { min: number; max: number; rir: number } {
  if (goal === "strength") {
    return role === "compound" ? { min: 4, max: 6, rir: 2 } : { min: 8, max: 12, rir: 2 };
  }
  return role === "compound" ? { min: 6, max: 10, rir: 2 } : { min: 10, max: 15, rir: 1 };
}
function restFor(role: Role, goal: Goal): number {
  if (role === "compound") return goal === "strength" ? 180 : 120;
  return 75;
}
function exercisesPerDay(exp: Experience, sessionMinutes: number): number {
  const base = exp === "beginner" ? 5 : exp === "intermediate" ? 6 : 7;
  const cap = Math.max(4, Math.min(8, Math.floor(sessionMinutes / 9)));
  return Math.min(base, cap);
}

// ── Exercise pools by muscle + role, filtered by equipment, ranked best-first ──
function buildPools(exercises: Exercise[], allowed: string[]) {
  const pools: Record<string, { compound: Exercise[]; isolation: Exercise[] }> = {};
  const score = (e: Exercise) => (EQUIP_RANK[e.category] ?? 1) + (COMPOUND_KW.test(e.name) ? 1 : 0);
  for (const e of exercises) {
    if (!allowed.includes(e.category)) continue;
    const m = e.primary_muscle;
    if (!pools[m]) pools[m] = { compound: [], isolation: [] };
    (isCompound(e) ? pools[m].compound : pools[m].isolation).push(e);
  }
  for (const m of Object.keys(pools)) {
    pools[m].compound.sort((a, b) => score(b) - score(a));
    pools[m].isolation.sort((a, b) => score(b) - score(a));
  }
  return pools;
}

function pick(
  pools: ReturnType<typeof buildPools>,
  slot: Slot,
  usedGlobal: Set<string>,
  usedDay: Set<string>,
): Exercise | null {
  const p = pools[slot.muscle];
  if (!p) return null;
  const primary = slot.role === "compound" ? p.compound : p.isolation;
  const fallback = slot.role === "compound" ? p.isolation : p.compound;
  for (const list of [primary, fallback]) {
    const fresh = list.find((e) => !usedGlobal.has(e.id) && !usedDay.has(e.id));
    if (fresh) return fresh;
  }
  for (const list of [primary, fallback]) {
    const notToday = list.find((e) => !usedDay.has(e.id));
    if (notToday) return notToday;
  }
  return primary[0] ?? fallback[0] ?? null;
}

export function generateProgram(answers: OnboardingAnswers, exercises: Exercise[]): ProgramSpec {
  const days = Math.max(1, Math.min(6, answers.daysPerWeek));
  const pools = buildPools(exercises, ALLOWED[answers.equipment]);
  const split = buildSplit(days);
  const perDay = exercisesPerDay(answers.experience, answers.sessionMinutes);
  const usedGlobal = new Set<string>();

  const workouts: GenWorkout[] = split.map((day, di) => {
    const usedDay = new Set<string>();
    const template = day.template.slice(0, perDay);
    const exercises: GenExercise[] = [];
    template.forEach((slot, si) => {
      const ex = pick(pools, slot, usedGlobal, usedDay);
      if (!ex) return;
      usedDay.add(ex.id);
      usedGlobal.add(ex.id);
      const r = repsFor(slot.role, answers.goal);
      exercises.push({
        exercise_id: ex.id,
        position: si,
        target_sets: setsFor(slot.role, answers.experience),
        target_reps_min: r.min,
        target_reps_max: r.max,
        target_rir: r.rir,
        rest_seconds: restFor(slot.role, answers.goal),
        superset_group: null,
        notes: null,
      });
    });
    // If equipment was sparse and global de-dup starved a day, re-seed from day pool.
    return { name: day.name, day_of_week: day.dow, position: di, exercises };
  });

  const duration = 5;
  const weeks = Array.from({ length: duration }, (_, i) => ({
    week_number: i + 1,
    is_deload: i + 1 === duration,
    volume_multiplier: i + 1 === duration ? 0.5 : 1,
  }));

  const goalLabel = answers.goal === "strength" ? "Kraft" : "Hypertrophie";
  const expLabel = { beginner: "Anfänger", intermediate: "Fortgeschritten", advanced: "Profi" }[answers.experience];
  return {
    name: `${goalLabel}-Programm · ${days}× Woche`,
    goal: answers.goal,
    difficulty: answers.experience,
    days_per_week: days,
    duration_weeks: duration,
    description: `${expLabel} · ${goalLabel} · ${days} Tage/Woche · automatische Progression`,
    weeks,
    workouts,
  };
}
