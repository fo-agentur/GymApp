"use client";
// ExercisePicker — shared exercise browser for the library, the routine editor
// and the active workout. Search + muscle/equipment filters, a "my equipment"
// toggle fed by the profile, relevance-ranked results (core lifts first) and
// collapsed groups so the 870-entry database stays scannable.
import React from "react";
import type { Exercise } from "@/lib/supabase/types";
import { TOK, Chip, SectionHeader, ExerciseRow, I, type Accent } from "@/lib/design";
import { MUSCLE_GROUPS, deMuscle } from "@/lib/muscles";
import { deCategory, matchesEquipment, relevanceScore, type EquipmentId } from "@/lib/equipment";
import { loadExerciseDB, type ExInfo } from "@/lib/exercise-db";

const EQUIPMENT_CATEGORIES = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];
export const MUSCLE_ORDER = [...MUSCLE_GROUPS];

const COLLAPSED_COUNT = 6;

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default function ExercisePicker({
  exercises,
  accent,
  onPick,
  recentIds = [],
  myEquipment = [],
  variant = "add",
}: {
  exercises: Exercise[];
  accent: Accent;
  onPick: (ex: Exercise) => void;
  recentIds?: string[];
  myEquipment?: EquipmentId[];
  // "add" shows a + (picker sheets), "browse" a chevron (library navigation).
  variant?: "add" | "browse";
}) {
  const hasEquipmentProfile = myEquipment.length > 0 && !myEquipment.includes("full_gym");
  const [query, setQuery] = React.useState("");
  const [muscle, setMuscle] = React.useState("All");
  const [cat, setCat] = React.useState("All");
  const [mineOnly, setMineOnly] = React.useState(hasEquipmentProfile);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [images, setImages] = React.useState<Record<string, ExInfo>>({});

  React.useEffect(() => {
    loadExerciseDB().then(setImages).catch(() => {});
  }, []);

  const tokens = norm(query).split(/\s+/).filter(Boolean);
  const filtered = exercises.filter((e) => {
    if (muscle !== "All" && e.primary_muscle !== muscle) return false;
    if (cat !== "All" && e.category !== cat) return false;
    if (mineOnly && !matchesEquipment(e, myEquipment)) return false;
    if (tokens.length) {
      const n = norm(e.name);
      if (!tokens.every((t) => n.includes(t))) return false;
    }
    return true;
  });

  const byScore = (a: Exercise, b: Exercise) =>
    relevanceScore(b) - relevanceScore(a) || a.name.localeCompare(b.name);

  const showRecent = recentIds.length > 0 && !query && muscle === "All" && cat === "All";
  const recent = showRecent
    ? recentIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter((e): e is Exercise => !!e && (!mineOnly || matchesEquipment(e, myEquipment)))
        .slice(0, 6)
    : [];

  // Single-muscle view: flat ranked list. Otherwise group by muscle, each group
  // collapsed to the most relevant entries.
  const grouped =
    muscle === "All"
      ? MUSCLE_ORDER.map((m) => ({ muscle: m as string, items: filtered.filter((e) => e.primary_muscle === m).sort(byScore) })).filter((g) => g.items.length > 0)
      : [{ muscle, items: [...filtered].sort(byScore) }];

  const filtering = muscle !== "All" || cat !== "All" || tokens.length > 0;

  const trailing = variant === "add" ? <I.Plus size={16} color={accent.hex} w={2.5} /> : <I.ChevR size={14} color={TOK.dim} />;
  const row = (e: Exercise) => (
    <ExerciseRow
      key={e.id}
      name={e.name}
      img={images[e.name]?.image ?? null}
      muscle={deMuscle(e.primary_muscle)}
      equipment={deCategory(e.category)}
      onTap={() => onPick(e)}
      trailing={trailing}
    />
  );

  return (
    <div>
      {/* Search */}
      <div style={{ padding: "8px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 40, background: TOK.surface, borderRadius: 10, border: `1px solid ${TOK.border}` }}>
          <I.Search size={15} color={TOK.dim} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Übung suchen…"
            autoCapitalize="none"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TOK.text, fontFamily: "inherit", fontSize: 16, fontWeight: 500 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <I.X size={14} color={TOK.dim} />
            </button>
          )}
        </div>
      </div>

      {/* Muscle group chips — the primary way to pick */}
      <div style={{ padding: "0 16px 8px", display: "flex", gap: 6, overflowX: "auto" }}>
        <Chip accent={accent} selected={muscle === "All"} onClick={() => setMuscle("All")}>Alle</Chip>
        {MUSCLE_ORDER.map((m) => (
          <Chip key={m} accent={accent} selected={muscle === m} onClick={() => setMuscle(m)}>
            {deMuscle(m)}
          </Chip>
        ))}
      </div>

      {/* Equipment chips — secondary refinement */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, overflowX: "auto" }}>
        {hasEquipmentProfile && (
          <Chip accent={accent} selected={mineOnly} onClick={() => setMineOnly((v) => !v)}>
            ★ Mein Equipment
          </Chip>
        )}
        <Chip accent={accent} selected={cat === "All"} onClick={() => setCat("All")}>Alle Geräte</Chip>
        {EQUIPMENT_CATEGORIES.map((c) => (
          <Chip key={c} accent={accent} selected={cat === c} onClick={() => setCat(c)}>
            {deCategory(c)}
          </Chip>
        ))}
      </div>

      {/* Recent — one-tap re-add */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <SectionHeader title="Zuletzt verwendet" style={{ padding: "6px 16px 4px" }} />
          {recent.map((e) => (
            <ExerciseRow
              key={"r-" + e.id}
              name={e.name}
              img={images[e.name]?.image ?? null}
              muscle={deMuscle(e.primary_muscle)}
              equipment={deCategory(e.category)}
              onTap={() => onPick(e)}
              trailing={trailing}
            />
          ))}
        </div>
      )}

      {/* Result count when filtering */}
      {filtering && (
        <div style={{ padding: "2px 16px 4px", fontSize: 11, color: TOK.dim }}>
          {filtered.length} {filtered.length === 1 ? "Übung" : "Übungen"}
        </div>
      )}

      {/* Grouped / flat list */}
      {grouped.map((g) => {
        const isOpen = expanded.has(g.muscle) || tokens.length > 0 || muscle !== "All";
        const items = isOpen ? g.items : g.items.slice(0, COLLAPSED_COUNT);
        const hidden = g.items.length - items.length;
        return (
          <div key={g.muscle}>
            {muscle === "All" && <SectionHeader title={deMuscle(g.muscle)} style={{ padding: "10px 16px 4px" }} />}
            {items.map(row)}
            {hidden > 0 && (
              <button
                onClick={() => setExpanded((s) => new Set(s).add(g.muscle))}
                style={{ display: "block", width: "100%", padding: "8px 16px 10px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: TOK.muted, textAlign: "left" }}
              >
                + {hidden} weitere anzeigen
              </button>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: "28px 24px", textAlign: "center", color: TOK.dim, fontSize: 13 }}>
          Keine Übung gefunden. Andere Suche oder Filter probieren.
        </div>
      )}
      <div style={{ height: 16 }} />
    </div>
  );
}
