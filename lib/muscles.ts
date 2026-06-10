// The app's 11 muscle groups + helpers for the weekly-volume body heatmap.
// "Sets this week" per group drives how strongly that muscle lights up.
// Landmarks: ~10 sets ≈ maintenance, ~16+ ≈ high volume.

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

export const MUSCLE_LABELS_DE: Record<MuscleGroup, string> = {
  Chest: "Brust",
  Back: "Rücken",
  Shoulders: "Schultern",
  Biceps: "Bizeps",
  Triceps: "Trizeps",
  Forearms: "Unterarme",
  Core: "Rumpf",
  Quads: "Oberschenkel",
  Hamstrings: "Beinbeuger",
  Glutes: "Gesäß",
  Calves: "Waden",
};
export const deMuscle = (m: string) => MUSCLE_LABELS_DE[m as MuscleGroup] ?? m;

// Sets at which a muscle is considered "fully" worked for the week (full colour).
export const FULL_SETS = 16;

// Returns 0..1 intensity for a given weekly set count.
export function intensity(sets: number): number {
  if (sets <= 0) return 0;
  return Math.min(1, sets / FULL_SETS);
}

export function statusLabel(sets: number): { text: string; color: string } {
  if (sets <= 0) return { text: "nicht trainiert", color: "var(--c-dim)" };
  if (sets < 6) return { text: "wenig", color: "var(--c-muted)" };
  if (sets < 12) return { text: "solide", color: "var(--c-pr)" };
  if (sets <= 22) return { text: "viel", color: "var(--c-pr)" };
  return { text: "sehr viel", color: "var(--c-accent)" };
}
