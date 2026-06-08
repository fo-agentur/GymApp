"use client";
import React from "react";
import type { Exercise } from "@/lib/supabase/types";
import { TOK, Chip, SectionHeader, ExerciseRow, I, type Accent } from "@/lib/design";

export const EQUIPMENT_FILTERS = ["All", "Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight"];
export const MUSCLE_ORDER = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Biceps", "Triceps", "Forearms", "Core", "Calves"];
const MUSCLE_FILTERS = ["All", ...MUSCLE_ORDER];

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ExercisePicker({
  exercises,
  accent,
  onPick,
  recentIds = [],
}: {
  exercises: Exercise[];
  accent: Accent;
  onPick: (ex: Exercise) => void;
  recentIds?: string[];
}) {
  const [query, setQuery] = React.useState("");
  const [muscle, setMuscle] = React.useState("All");
  const [equip, setEquip] = React.useState("All");

  const filtered = exercises.filter((e) => {
    if (muscle !== "All" && e.primary_muscle !== muscle) return false;
    if (equip !== "All" && cap(e.category) !== equip) return false;
    if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const showRecent = recentIds.length > 0 && !query && muscle === "All" && equip === "All";
  const recent = showRecent
    ? recentIds.map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => !!e).slice(0, 6)
    : [];

  // When a single muscle is selected we show a flat list; otherwise group by muscle.
  const grouped =
    muscle === "All"
      ? MUSCLE_ORDER.map((m) => ({ muscle: m, items: filtered.filter((e) => e.primary_muscle === m) })).filter((g) => g.items.length > 0)
      : [{ muscle, items: filtered }];

  return (
    <div>
      {/* Search */}
      <div style={{ padding: "8px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 40, background: TOK.surface, borderRadius: 10 }}>
          <I.Search size={15} color={TOK.dim} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
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
        {MUSCLE_FILTERS.map((m) => (
          <Chip key={m} accent={accent} selected={muscle === m} onClick={() => setMuscle(m)}>
            {m}
          </Chip>
        ))}
      </div>

      {/* Equipment chips — secondary refinement */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, overflowX: "auto" }}>
        {EQUIPMENT_FILTERS.map((f) => (
          <Chip key={f} accent={accent} selected={equip === f} onClick={() => setEquip(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {/* Recent — one-tap re-add */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <SectionHeader title="Recent" style={{ padding: "6px 16px 4px" }} />
          {recent.map((e) => (
            <ExerciseRow
              key={"r-" + e.id}
              name={e.name}
              muscle={e.primary_muscle}
              equipment={cap(e.category)}
              onTap={() => onPick(e)}
              trailing={<I.Plus size={16} color={accent.hex} w={2.5} />}
            />
          ))}
        </div>
      )}

      {/* Result count when filtering */}
      {(muscle !== "All" || equip !== "All" || query) && (
        <div style={{ padding: "2px 16px 4px", fontSize: 11, color: TOK.dim }}>
          {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
        </div>
      )}

      {/* Grouped / flat list */}
      {grouped.map((g) => (
        <div key={g.muscle}>
          {muscle === "All" && <SectionHeader title={g.muscle} style={{ padding: "10px 16px 4px" }} />}
          {g.items.map((e) => (
            <ExerciseRow
              key={e.id}
              name={e.name}
              muscle={e.primary_muscle}
              equipment={cap(e.category)}
              onTap={() => onPick(e)}
              trailing={<I.Plus size={16} color={TOK.dim} w={2.5} />}
            />
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ padding: "28px 24px", textAlign: "center", color: TOK.dim, fontSize: 13 }}>
          No exercises match. Try another muscle or clear the search.
        </div>
      )}
    </div>
  );
}
