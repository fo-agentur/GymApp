// Transforms the free-exercise-db dump into (a) a Supabase seed statement and
// (b) a bundled guide file (instructions + image + muscles) read at runtime.
import fs from "node:fs";

const ex = JSON.parse(fs.readFileSync(new URL("../exdb.json", import.meta.url)));

const MUSCLE = {
  chest: "Chest",
  lats: "Back", "middle back": "Back", "lower back": "Back", traps: "Back",
  shoulders: "Shoulders", neck: "Shoulders",
  quadriceps: "Quads", adductors: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes", abductors: "Glutes",
  biceps: "Biceps", triceps: "Triceps",
  forearms: "Forearms",
  abdominals: "Core",
  calves: "Calves",
};
const EQUIP = {
  barbell: "barbell", "e-z curl bar": "barbell",
  dumbbell: "dumbbell", kettlebells: "dumbbell",
  machine: "machine", cable: "cable",
  "body only": "bodyweight",
  bands: "other", "medicine ball": "other", "exercise ball": "other", "foam roll": "other", other: "other",
};
const mus = (m) => MUSCLE[m] || "Core";
const cat = (e) => EQUIP[e] || "other";
const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const rows = [];
const guide = {};
const seen = new Set();

for (const e of ex) {
  const name = e.name.trim();
  if (seen.has(name)) continue;
  seen.add(name);
  const primary = mus((e.primaryMuscles || [])[0]);
  const category = cat(e.equipment);
  rows.push({ n: name, c: category, m: primary });
  const secondary = [...new Set((e.secondaryMuscles || []).map(mus))];
  guide[name] = {
    steps: e.instructions || [],
    image: (e.images && e.images[0]) ? BASE + e.images[0] : null,
    secondary,
    equipment: e.equipment || category,
    level: e.level || null,
  };
}

// (a) Seed SQL — single statement via jsonb_to_recordset (apostrophes doubled).
const json = JSON.stringify(rows).replace(/'/g, "''");
const sql =
  "delete from public.exercises where user_id is null;\n" +
  "insert into public.exercises (user_id, name, category, primary_muscle)\n" +
  "select null, n, c, m from jsonb_to_recordset('" + json + "'::jsonb) as x(n text, c text, m text);";
fs.writeFileSync(new URL("../seed-exercises.sql", import.meta.url), sql);

// (b) Bundled guide for the app (served from /public).
fs.mkdirSync(new URL("../public", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../public/exercise-db.json", import.meta.url), JSON.stringify(guide));

const byMuscle = {};
for (const r of rows) byMuscle[r.m] = (byMuscle[r.m] || 0) + 1;
console.log("rows:", rows.length);
console.log("byMuscle:", JSON.stringify(byMuscle));
console.log("seed sql bytes:", sql.length);
console.log("guide json bytes:", fs.statSync(new URL("../public/exercise-db.json", import.meta.url)).size);
