"use client";
// Loads the bundled exercise guide data (instructions, image, muscles) served
// from /public/exercise-db.json. Fetched once and cached for the session.

export type ExInfo = {
  steps: string[];
  image: string | null;
  // Raw fine-grained primary muscle from the source dataset (e.g. "lats",
  // "middle back", "traps") — feeds the target classifier in lib/targets.ts.
  primary?: string | null;
  secondary: string[];
  equipment: string;
  level: string | null;
};

let cache: Record<string, ExInfo> | null = null;
let pending: Promise<Record<string, ExInfo>> | null = null;

export function loadExerciseDB(): Promise<Record<string, ExInfo>> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch("/exercise-db.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: Record<string, ExInfo>) => {
        cache = j;
        return j;
      })
      .catch(() => ({}));
  }
  return pending;
}
