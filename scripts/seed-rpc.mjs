// One-shot seeder: reads the local dataset, maps it, and pushes all rows to
// Supabase via the temporary bulk_seed_exercises RPC. Run once, then the RPC
// is dropped. Keeps the bulk payload out of the agent transcript.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ex = JSON.parse(fs.readFileSync(new URL("../exdb.json", import.meta.url)));

const MUSCLE = {
  chest: "Chest", lats: "Back", "middle back": "Back", "lower back": "Back", traps: "Back",
  shoulders: "Shoulders", neck: "Shoulders", quadriceps: "Quads", adductors: "Quads",
  hamstrings: "Hamstrings", glutes: "Glutes", abductors: "Glutes", biceps: "Biceps",
  triceps: "Triceps", forearms: "Forearms", abdominals: "Core", calves: "Calves",
};
const EQUIP = {
  barbell: "barbell", "e-z curl bar": "barbell", dumbbell: "dumbbell", kettlebells: "dumbbell",
  machine: "machine", cable: "cable", "body only": "bodyweight", bands: "other",
  "medicine ball": "other", "exercise ball": "other", "foam roll": "other", other: "other",
};
const mus = (m) => MUSCLE[m] || "Core";
const cat = (e) => EQUIP[e] || "other";

const seen = new Set();
const rows = [];
for (const e of ex) {
  const n = e.name.trim();
  if (seen.has(n)) continue;
  seen.add(n);
  rows.push({ n, c: cat(e.equipment), m: mus((e.primaryMuscles || [])[0]) });
}

const db = createClient(
  "https://aiptokxagqthzhpmtjyk.supabase.co",
  "sb_publishable_eTGcjafyoyj__-qE57nFAA_V0HkoY2j"
);
const { data, error } = await db.rpc("bulk_seed_exercises", { payload: rows });
if (error) {
  console.error("SEED ERROR:", error.message);
  process.exit(1);
}
console.log("seeded rows:", data);
