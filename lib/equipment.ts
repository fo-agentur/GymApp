// Equipment profile: what gear a user has access to, and which exercises in
// the library make sense with it. Stored in profiles.equipment as
// { items: EquipmentId[] }. An empty selection means "no filter" (show all).

import type { Exercise } from "./supabase/types";

export type EquipmentId = "full_gym" | "multipress" | "barbell" | "dumbbell" | "machines";

export const EQUIPMENT_OPTIONS: { id: EquipmentId; title: string; sub: string }[] = [
  { id: "multipress", title: "Atletica Multipresse", sub: "Smith-Maschine, Kabelzug & Bank" },
  { id: "dumbbell", title: "Kurzhanteln", sub: "Kurzhanteln, Kettlebells & Bank" },
  { id: "barbell", title: "Langhantel & Rack", sub: "Freie Langhantel mit Scheiben" },
  { id: "machines", title: "Geräte / Maschinen", sub: "Beinpresse, Brustpresse & Co." },
  { id: "full_gym", title: "Voll ausgestattetes Gym", sub: "Alles verfügbar — kein Filter" },
];

// Legacy onboarding stored { kind: "full_gym" | "barbell_home" | "dumbbell" | "bodyweight" }.
const LEGACY_KIND: Record<string, EquipmentId[]> = {
  full_gym: ["full_gym"],
  barbell_home: ["barbell", "dumbbell"],
  dumbbell: ["dumbbell"],
  bodyweight: [],
};

export function parseEquipment(json: unknown): EquipmentId[] {
  if (!json || typeof json !== "object") return [];
  const o = json as { items?: unknown; kind?: unknown };
  if (Array.isArray(o.items)) {
    const valid = new Set(EQUIPMENT_OPTIONS.map((e) => e.id));
    return o.items.filter((i): i is EquipmentId => typeof i === "string" && valid.has(i as EquipmentId));
  }
  if (typeof o.kind === "string") return LEGACY_KIND[o.kind] ?? [];
  return [];
}

// A fully equipped multipress = smith machine + dual cable pulleys + bench:
// every smith-machine movement plus all cable work (pulldowns, rows, curls,
// pushdowns, flys, face pulls, …). Bodyweight is always possible.
const SMITH_RE = /smith/i;

export function matchesEquipment(ex: Pick<Exercise, "category" | "name">, items: EquipmentId[]): boolean {
  if (items.length === 0 || items.includes("full_gym")) return true;
  if (ex.category === "bodyweight") return true;
  if (items.includes("dumbbell") && ex.category === "dumbbell") return true;
  if (items.includes("barbell") && ex.category === "barbell") return true;
  if (items.includes("machines") && ex.category === "machine") return true;
  if (items.includes("multipress") && (ex.category === "cable" || SMITH_RE.test(ex.name))) return true;
  return false;
}

// German display names for the exercise categories in the database.
export const CATEGORY_DE: Record<string, string> = {
  barbell: "Langhantel",
  dumbbell: "Kurzhantel",
  machine: "Maschine",
  cable: "Kabelzug",
  bodyweight: "Körpergewicht",
  cardio: "Cardio",
  other: "Sonstiges",
};
export const deCategory = (c: string) => CATEGORY_DE[c] ?? c;

// ── Relevance ranking for the library / picker ─────────────────
// The free-exercise-db dump has 870+ entries; most people use a few dozen.
// Score core movements up so the obvious choices surface first.
const CORE_PATTERNS: [RegExp, number][] = [
  [/bench press/i, 50],
  [/\bsquat\b/i, 48],
  [/deadlift/i, 46],
  [/pulldown/i, 44],
  [/pull-?ups?\b/i, 44],
  [/chin-?ups?\b/i, 40],
  [/\brows?\b/i, 42],
  [/shoulder press|overhead press|military press/i, 42],
  [/lateral raise/i, 40],
  [/\bcurls?\b/i, 38],
  [/pushdown|push-down/i, 38],
  [/triceps extension|skullcrusher/i, 34],
  [/\bdips?\b/i, 34],
  [/\bflyes?\b|\bfly\b|crossover/i, 34],
  [/face pull/i, 32],
  [/hip thrust|glute bridge/i, 32],
  [/lunge/i, 30],
  [/leg press/i, 30],
  [/leg extension|leg curl/i, 30],
  [/calf raise/i, 28],
  [/romanian|rdl|stiff-?leg/i, 28],
  [/shrug/i, 24],
  [/crunch|plank|leg raise|sit-?up/i, 24],
  [/push-?ups?\b/i, 24],
  [/pullover/i, 20],
];
// Long, exotic names (kettlebell windmills, band work, …) sink to the bottom.
export function relevanceScore(ex: Pick<Exercise, "name" | "category">): number {
  let s = 0;
  for (const [re, pts] of CORE_PATTERNS) {
    if (re.test(ex.name)) { s += pts; break; }
  }
  if (ex.category === "other") s -= 30;
  if (/kettlebell|band|sled|plyo|isometric|stretch/i.test(ex.name)) s -= 16;
  s -= Math.min(12, Math.max(0, ex.name.length - 18) * 0.4);
  return s;
}
