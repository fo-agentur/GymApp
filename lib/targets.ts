// Fine-grained muscle targets — a client-side layer on top of the 11 coarse
// MUSCLE_GROUPS stored in the database. The heatmap/statistics keep using the
// coarse groups; the library/picker uses these targets for precise filtering
// ("Latissimus" vs. just "Rücken") and richer row subtitles.
//
// Classification combines the raw source muscle from the bundled guide
// (lats / middle back / traps / …, see lib/exercise-db.ts) with name patterns,
// so custom exercises without guide data still get sensible targets.

import type { MuscleGroup } from "./muscles";

export type TargetId =
  | "chest_upper" | "chest_mid" | "chest_lower"
  | "lats" | "upper_back" | "rhomboids" | "traps_upper" | "traps_mid" | "lower_back"
  | "delts_front" | "delts_side" | "delts_rear" | "neck"
  | "bi_long" | "bi_short" | "brachialis"
  | "tri_long" | "tri_lat"
  | "abs_upper" | "abs_lower" | "obliques" | "core_stab"
  | "quads" | "adductors"
  | "glute_max" | "glute_med"
  | "calves_gastro" | "calves_soleus";

export type Target = { id: TargetId; label: string; groups: MuscleGroup[] };

// Order matters: this is the chip order in the picker, and the first matching
// target of an exercise is used as its subtitle.
export const TARGETS: Target[] = [
  { id: "chest_upper", label: "Obere Brust", groups: ["Chest"] },
  { id: "chest_mid", label: "Mittlere Brust", groups: ["Chest"] },
  { id: "chest_lower", label: "Untere Brust", groups: ["Chest"] },

  { id: "lats", label: "Latissimus", groups: ["Back"] },
  { id: "upper_back", label: "Oberer Rücken", groups: ["Back"] },
  { id: "rhomboids", label: "Rhomboiden", groups: ["Back"] },
  { id: "traps_upper", label: "Trapez (oben)", groups: ["Back"] },
  { id: "traps_mid", label: "Trapez (Mitte/unten)", groups: ["Back"] },
  { id: "delts_rear", label: "Hintere Schulter", groups: ["Shoulders", "Back"] },
  { id: "lower_back", label: "Unterer Rücken", groups: ["Back"] },

  { id: "delts_front", label: "Vordere Schulter", groups: ["Shoulders"] },
  { id: "delts_side", label: "Seitliche Schulter", groups: ["Shoulders"] },
  { id: "neck", label: "Nacken", groups: ["Shoulders"] },

  { id: "bi_long", label: "Bizeps (langer Kopf)", groups: ["Biceps"] },
  { id: "bi_short", label: "Bizeps (kurzer Kopf)", groups: ["Biceps"] },
  { id: "brachialis", label: "Brachialis", groups: ["Biceps"] },

  { id: "tri_long", label: "Trizeps (langer Kopf)", groups: ["Triceps"] },
  { id: "tri_lat", label: "Trizeps (seitlich)", groups: ["Triceps"] },

  { id: "abs_upper", label: "Obere Bauchmuskeln", groups: ["Core"] },
  { id: "abs_lower", label: "Untere Bauchmuskeln", groups: ["Core"] },
  { id: "obliques", label: "Seitliche Bauchmuskeln", groups: ["Core"] },
  { id: "core_stab", label: "Stabilität", groups: ["Core"] },

  { id: "quads", label: "Quadrizeps", groups: ["Quads"] },
  { id: "adductors", label: "Adduktoren", groups: ["Quads"] },

  { id: "glute_max", label: "Gluteus Maximus", groups: ["Glutes"] },
  { id: "glute_med", label: "Abduktoren (Gluteus Medius)", groups: ["Glutes"] },

  { id: "calves_gastro", label: "Wade (stehend)", groups: ["Calves"] },
  { id: "calves_soleus", label: "Soleus (sitzend)", groups: ["Calves"] },
];

const TARGET_BY_ID = new Map(TARGETS.map((t) => [t.id, t]));
export const targetLabel = (id: TargetId) => TARGET_BY_ID.get(id)?.label ?? id;

export function targetsForGroup(group: string): Target[] {
  return TARGETS.filter((t) => t.groups.includes(group as MuscleGroup));
}

// ── Classifier ─────────────────────────────────────────────────
// `raw` is the fine source muscle from the guide (may be missing for custom
// exercises). Returns an ordered list — first entry is the dominant region.

export function targetsFor(name: string, group: string, raw?: string | null): TargetId[] {
  const n = name.toLowerCase();
  const has = (re: RegExp) => re.test(n);
  const out: TargetId[] = [];
  const add = (...ids: TargetId[]) => {
    for (const id of ids) if (!out.includes(id)) out.push(id);
  };

  switch (group) {
    case "Chest":
      if (has(/incline|pike/)) add("chest_upper");
      else if (has(/decline|\bdips?\b/)) add("chest_lower");
      else add("chest_mid");
      break;

    case "Back":
      // Name patterns first — they are more specific than the raw muscle.
      if (has(/face pull/)) add("traps_mid", "delts_rear", "rhomboids");
      else if (has(/shrug/)) add("traps_upper");
      else if (has(/y-?raise/)) add("traps_mid", "delts_rear");
      else if (has(/upright row/)) add("traps_upper", "delts_side");
      else if (has(/pulldown|pull-?down|pull-?ups?\b|pullups?\b|chin-?ups?\b|chins\b|pullover|straight-?arm/)) add("lats");
      else if (has(/\brows?\b|rowing/)) add("upper_back", "lats", "rhomboids", "traps_mid");
      else if (has(/deadlift|rack pull|good morning|hyperextension|back extension|superman/)) add("lower_back");
      // Raw source muscle as fallback when no name pattern matched.
      if (out.length === 0) {
        if (raw === "lats") add("lats");
        else if (raw === "middle back") add("upper_back", "rhomboids", "traps_mid");
        else if (raw === "lower back") add("lower_back");
        else if (raw === "traps" || raw === "neck") add("traps_upper");
        else add("upper_back");
      }
      break;

    case "Shoulders":
      if (raw === "neck" || has(/\bneck\b/)) add("neck");
      else if (has(/rear|reverse.*fl|face pull|bent over.*(lateral|raise)/)) add("delts_rear", "traps_mid");
      else if (has(/lateral|side lateral|upright row|\bside\b/)) add("delts_side");
      else if (has(/front raise|front.*raise/)) add("delts_front");
      else if (has(/press|jerk|pike push/)) add("delts_front", "delts_side");
      break;

    case "Biceps":
      if (has(/hammer|zottman|cross body/)) add("brachialis", "bi_long");
      else if (has(/reverse (curl|grip)|reverse-grip/)) add("brachialis");
      else if (has(/incline|drag|behind.*back/)) add("bi_long");
      else if (has(/preacher|spider|concentration|high curl|wide/)) add("bi_short");
      else add("bi_long", "bi_short");
      break;

    case "Triceps":
      if (has(/overhead|french|skull|behind|incline.*extension|lying.*extension|seated.*extension/)) add("tri_long");
      else if (has(/pushdown|push-?down|kickback|close-?grip|\bdips?\b|press/)) add("tri_lat");
      else add("tri_long", "tri_lat");
      break;

    case "Core":
      if (has(/leg raise|knee raise|reverse crunch|hip raise|scissor|leg lift|dragon|hanging/)) add("abs_lower");
      if (has(/twist|side bend|oblique|woodchop|wood chop|side bridge|side plank|windmill|landmine 180/)) add("obliques");
      if (has(/plank|rollout|roll-?out|walkout|bird dog|dead bug|pallof|ab roller|wheel|stabili/)) add("core_stab");
      if (has(/crunch|sit-?up|situp|v-?up|jackknife/)) add("abs_upper");
      if (out.length === 0) add("abs_upper");
      break;

    case "Quads":
      if (raw === "adductors" || has(/adduct|sumo|side lunge|side split/)) add("adductors");
      if (out.length === 0 || has(/squat|leg press|leg extension|lunge|step-?up/)) add("quads");
      break;

    case "Glutes":
      if (raw === "abductors" || has(/abduct|clam|fire hydrant|band walk/)) add("glute_med");
      else add("glute_max");
      break;

    case "Calves":
      if (has(/seated/)) add("calves_soleus");
      else add("calves_gastro");
      break;
  }

  return out;
}

// ── Search synonyms ────────────────────────────────────────────
// German gym vocabulary → tokens that actually appear in the (English)
// exercise names or the German labels. A query token matches an exercise if
// the token itself OR any expansion is found in the exercise's haystack.
// Keys must be in normalized form (lowercase, umlauts stripped: ü → u).

export const SEARCH_SYNONYMS: Record<string, string[]> = {
  // back
  rudern: ["row"], ruder: ["row"],
  klimmzug: ["pull up", "pullup", "chin up", "chinup"], klimmzuge: ["pull up", "pullup", "chin up", "chinup"],
  pullup: ["pull up"], chinup: ["chin up"],
  latzug: ["pulldown", "pull up"], latziehen: ["pulldown"], lat: ["pulldown", "pull up", "chin up"],
  uberzug: ["pullover"], uberzuge: ["pullover"],
  kreuzheben: ["deadlift"],
  ruckenstrecker: ["hyperextension", "back extension", "good morning"],
  hyperextension: ["hyperextension", "back extension"],
  // chest
  bankdrucken: ["bench press"], brustpresse: ["chest press", "bench press", "machine bench"],
  schragbank: ["incline"], negativbank: ["decline"],
  fliegende: ["fly", "flyes", "crossover"], butterfly: ["butterfly", "fly", "pec"],
  pec: ["butterfly", "fly", "flyes", "pec"], deck: ["butterfly", "fly", "flyes", "pec"],
  liegestutz: ["push up"], liegestutze: ["push up"], pushup: ["push up"], pushups: ["push up"],
  // shoulders
  schulterdrucken: ["shoulder press", "military press", "overhead"],
  seitheben: ["lateral raise", "side lateral"], frontheben: ["front raise"],
  vorgebeugt: ["bent over"], nackendrucken: ["behind the neck", "behind neck"],
  // arms
  bizeps: ["curl", "bicep"], trizeps: ["tricep", "pushdown", "extension"],
  hammercurls: ["hammer curl"], unterarm: ["wrist", "forearm"],
  // legs
  kniebeuge: ["squat"], kniebeugen: ["squat"], beuge: ["squat"],
  beinpresse: ["leg press"], beinstrecker: ["leg extension"], beinbeuger: ["leg curl"],
  wadenheben: ["calf raise", "calf press"], wade: ["calf"], waden: ["calf"],
  ausfallschritt: ["lunge", "split squat"], ausfallschritte: ["lunge", "split squat"],
  huftheben: ["hip thrust", "glute bridge"], hufte: ["hip"],
  rumanisches: ["romanian"], rumanische: ["romanian"],
  gesass: ["glute", "hip thrust"], po: ["glute", "butt", "hip thrust"],
  // core
  bauch: ["crunch", "sit-up", "ab", "plank", "leg raise"],
  beinheben: ["leg raise", "knee raise"], unterarmstutz: ["plank"],
  // equipment
  maschine: ["machine", "leverage", "smith"], gerat: ["machine", "leverage"],
  kabelzug: ["cable"], kabel: ["cable"], seilzug: ["cable", "rope"],
  kurzhantel: ["dumbbell"], kurzhanteln: ["dumbbell"],
  langhantel: ["barbell"], langhanteln: ["barbell"],
  korpergewicht: ["body", "bodyweight"],
  machine: ["machine", "leverage", "maschine"],
};

// Normalize for search: lowercase, strip diacritics (ü→u), unify separators.
export function normSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[-_/(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Word-prefix match: "row" hits "Rows" and "Rowing" but not "naRROW"/"thROW".
function hayHas(haystack: string, term: string): boolean {
  return (" " + haystack).includes(" " + term);
}

// Expansions for one normalized query token (prefix-tolerant, so "rudern",
// "klimmzuege" or truncated input still hit their synonym entries).
export function expandToken(tok: string): string[] {
  const out: string[] = [];
  for (const [key, alts] of Object.entries(SEARCH_SYNONYMS)) {
    if (tok.startsWith(key) || (tok.length >= 3 && key.startsWith(tok))) out.push(...alts);
  }
  return out;
}

// True if every query token matches the haystack directly or via synonyms.
// Multi-word queries also match as one joined word ("pull ups" → "Pullups").
export function matchesQuery(haystack: string, tokens: string[]): boolean {
  if (tokens.length > 1 && hayHas(haystack, tokens.join(""))) return true;
  return tokens.every((tok) => {
    if (hayHas(haystack, tok)) return true;
    return expandToken(tok).some((alt) => hayHas(haystack, normSearch(alt)));
  });
}
