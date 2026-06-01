// coach.ts — MacroFactor-equivalent nutrition coaching math (publicly documented
// approach): smooth the scale weight into a True-Weight trend, estimate energy
// expenditure from intake + trend change, and derive macro targets for a goal.
// Pure functions, no I/O — used by the dashboard, the Coach screen, and check-ins.

export type TrendPoint = { x: number; y: number }; // x = epoch days, y = kg
type WLog = { logged_on: string; weight_kg: number };

const KCAL_PER_KG = 7700; // energy density of body-mass change (~1 kg ≈ 7700 kcal)
const epochDays = (iso: string) => Date.parse(iso) / 86400000;

// Raw scale points (for the scatter).
export function rawPoints(logs: WLog[]): TrendPoint[] {
  return [...logs]
    .sort((a, b) => a.logged_on.localeCompare(b.logged_on))
    .map((l) => ({ x: epochDays(l.logged_on), y: l.weight_kg }));
}

// True-Weight: exponentially-weighted moving average over daily weigh-ins, which
// filters day-to-day water/food noise to reveal the real trend.
export function trueWeight(logs: WLog[], alpha = 0.12): TrendPoint[] {
  const sorted = [...logs].sort((a, b) => a.logged_on.localeCompare(b.logged_on));
  const out: TrendPoint[] = [];
  let ewma: number | null = null;
  for (const l of sorted) {
    ewma = ewma == null ? l.weight_kg : alpha * l.weight_kg + (1 - alpha) * ewma;
    out.push({ x: epochDays(l.logged_on), y: Math.round(ewma * 100) / 100 });
  }
  return out;
}

export function latestTrendWeight(trend: TrendPoint[]): number | null {
  return trend.length ? trend[trend.length - 1].y : null;
}

// Rate of change of the trend in kg/week (negative = losing).
export function weeklyTrendChange(trend: TrendPoint[]): number | null {
  if (trend.length < 2) return null;
  const a = trend[0], b = trend[trend.length - 1];
  const days = b.x - a.x || 1;
  return ((b.y - a.y) / days) * 7;
}

// Mifflin-St Jeor TDEE — the cold-start estimate before adaptive data exists.
export function mifflinTDEE(
  p: { sex?: string | null; height_cm?: number | null; birth_date?: string | null; activity_level?: string | null },
  weightKg: number
): number | null {
  if (!weightKg || !p.height_cm) return null;
  const age = p.birth_date ? Math.floor((Date.now() - Date.parse(p.birth_date)) / (365.25 * 86400000)) : 30;
  const s = p.sex === "female" ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * p.height_cm - 5 * age + s;
  const act = ({ sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 } as Record<string, number>)[
    p.activity_level || "moderate"
  ] ?? 1.55;
  return Math.round(bmr * act);
}

// Adaptive expenditure: over a window, expenditure ≈ mean intake − energy stored as
// weight change. Needs enough days of both intake and trend to be meaningful.
export function adaptiveExpenditure(avgIntake: number, trend: TrendPoint[]): number | null {
  if (!avgIntake || trend.length < 2) return null;
  const a = trend[0], b = trend[trend.length - 1];
  const days = b.x - a.x || 1;
  const dailyBalance = ((b.y - a.y) * KCAL_PER_KG) / days; // + = surplus
  return Math.round(avgIntake - dailyBalance);
}

// Daily calorie target for a goal rate (kg/week; negative to lose).
export function targetCalories(expenditure: number, goalRateKgPerWeek: number): number {
  const dailyDelta = (goalRateKgPerWeek * KCAL_PER_KG) / 7;
  return Math.max(1200, Math.round(expenditure + dailyDelta));
}

// Split calories into macros for a diet style. Protein scales with body weight.
export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
export function macroSplit(kcal: number, weightKg: number, style = "balanced"): Macros {
  const proteinPerKg = style === "highprotein" ? 2.2 : style === "lowcarb" || style === "keto" ? 2.0 : 1.8;
  const protein_g = Math.round((weightKg || 75) * proteinPerKg);
  const proteinKcal = protein_g * 4;
  const rest = Math.max(0, kcal - proteinKcal);
  // fraction of the *remaining* calories that go to fat
  const fatFrac = style === "keto" ? 0.75 : style === "lowcarb" ? 0.5 : style === "lowfat" ? 0.2 : 0.35;
  const fat_g = Math.round((rest * fatFrac) / 9);
  const carbs_g = Math.round((rest * (1 - fatFrac)) / 4);
  return { kcal: Math.round(kcal), protein_g, carbs_g, fat_g };
}
