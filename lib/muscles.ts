// Maps the app's 11 muscle groups to a weekly-volume heatmap colour.
// "Sets this week" per group drives how brightly that muscle lights up on the
// body map. Landmarks: ~10 sets = enough to maintain, ~18+ = high volume.

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Sets at which a muscle is considered "fully" worked for the week (full colour).
export const FULL_SETS = 16;

// Returns 0..1 intensity for a given weekly set count.
export function intensity(sets: number): number {
  if (sets <= 0) return 0;
  return Math.min(1, sets / FULL_SETS);
}

// Heatmap colour from a 0..1 intensity, blended over the OLED surface.
// 0 -> faint surface, low -> deep lime, high -> bright electric lime.
export function heatColor(t: number): string {
  if (t <= 0) return "#181818";
  // interpolate between a dim olive and bright lime
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const from = [40, 46, 24]; // #282e18-ish dim
  const to = [190, 242, 100]; // #bef264 lime
  const r = lerp(from[0], to[0]);
  const g = lerp(from[1], to[1]);
  const b = lerp(from[2], to[2]);
  return `rgb(${r}, ${g}, ${b})`;
}

export function statusLabel(sets: number): { text: string; color: string } {
  if (sets <= 0) return { text: "untrained", color: "#52525b" };
  if (sets < 6) return { text: "low", color: "#a1a1aa" };
  if (sets < 12) return { text: "on track", color: "#bef264" };
  if (sets <= 22) return { text: "high", color: "#22c55e" };
  return { text: "very high", color: "#fb923c" };
}
