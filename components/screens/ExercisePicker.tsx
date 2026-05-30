"use client";
import React from "react";
import type { Exercise } from "@/lib/supabase/types";
import { TOK, Chip, SectionHeader, ExerciseRow, I, muscleTone, type Accent } from "@/lib/design";

export const EQUIPMENT_FILTERS = ["All", "Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight"];
export const MUSCLE_ORDER = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Biceps", "Triceps", "Core", "Calves"];

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ExercisePicker({
  exercises,
  accent,
  onPick,
}: {
  exercises: Exercise[];
  accent: Accent;
  onPick: (ex: Exercise) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [equip, setEquip] = React.useState("All");

  const filtered = exercises.filter((e) => {
    if (equip !== "All" && cap(e.category) !== equip) return false;
    if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const grouped = MUSCLE_ORDER.map((m) => ({ muscle: m, items: filtered.filter((e) => e.primary_muscle === m) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <div>
      <div style={{ padding: "8px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 38, background: TOK.surface, borderRadius: 10 }}>
          <I.Search size={15} color={TOK.dim} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            autoCapitalize="none"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TOK.text, fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}
          />
        </div>
      </div>
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, overflowX: "auto" }}>
        {EQUIPMENT_FILTERS.map((f) => (
          <Chip key={f} accent={accent} selected={equip === f} onClick={() => setEquip(f)}>
            {f}
          </Chip>
        ))}
      </div>
      {grouped.map((g) => (
        <div key={g.muscle}>
          <SectionHeader title={g.muscle} style={{ padding: "10px 16px 4px" }} />
          {g.items.map((e) => (
            <ExerciseRow
              key={e.id}
              thumb={muscleTone(e.primary_muscle)}
              name={e.name}
              muscle={e.primary_muscle}
              equipment={cap(e.category)}
              onTap={() => onPick(e)}
            />
          ))}
        </div>
      ))}
      {grouped.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: TOK.dim, fontSize: 13 }}>No exercises match.</div>}
    </div>
  );
}
