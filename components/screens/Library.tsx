"use client";
import React from "react";
import { useApp } from "../app-context";
import { createCustomExercise } from "@/lib/data";
import { TOK, TYPE, ScreenHeader, SectionHeader, ExerciseRow, Chip, EmptyState, FAB, Sheet, Btn, Segmented, I, muscleTone } from "@/lib/design";
import { EQUIPMENT_FILTERS, MUSCLE_ORDER, cap } from "./ExercisePicker";

export default function Library() {
  const { exercises, accent, goto, reloadExercises, db, userId } = useApp();
  const [query, setQuery] = React.useState("");
  const [muscle, setMuscle] = React.useState("All");
  const [equip, setEquip] = React.useState("All");
  const [addOpen, setAddOpen] = React.useState(false);

  const filtered = exercises.filter((e) => {
    if (muscle !== "All" && e.primary_muscle !== muscle) return false;
    if (equip !== "All" && cap(e.category) !== equip) return false;
    if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const grouped =
    muscle === "All"
      ? MUSCLE_ORDER.map((m) => ({ muscle: m, items: filtered.filter((e) => e.primary_muscle === m) })).filter((g) => g.items.length > 0)
      : [{ muscle, items: filtered }];

  return (
    <div style={{ flex: 1, overflowY: "auto", position: "relative", paddingBottom: 96 }}>
      <ScreenHeader large back onBack={() => goto("routines")} title="Exercises" />
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 42, background: TOK.surface, borderRadius: 10 }}>
          <I.Search size={16} color={TOK.dim} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises…" autoCapitalize="none" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TOK.text, fontFamily: "inherit", fontSize: 16, fontWeight: 500 }} />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <I.X size={14} color={TOK.dim} />
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "0 12px 12px", display: "flex", gap: 6, overflowX: "auto" }}>
        {EQUIPMENT_FILTERS.map((f) => (
          <Chip key={f} accent={accent} selected={equip === f} onClick={() => setEquip(f)}>{f}</Chip>
        ))}
      </div>
      {grouped.map((g) => (
        <div key={g.muscle} style={{ marginBottom: 8 }}>
          <SectionHeader title={g.muscle} style={{ padding: "14px 16px 6px" }} />
          {g.items.map((e) => (
            <ExerciseRow key={e.id} thumb={muscleTone(e.primary_muscle)} name={e.name} muscle={e.primary_muscle} equipment={cap(e.category)} onTap={() => goto("exercise-detail", e.id)} />
          ))}
        </div>
      ))}
      {grouped.length === 0 && <EmptyState icon={<I.Search size={20} />} title="No exercises match" description={query ? `Nothing contains "${query}".` : "No exercises match this filter."} />}

      <FAB accent={accent} onClick={() => setAddOpen(true)}>
        <I.Plus size={18} color={accent.ink} w={2.5} />
        <span>Custom</span>
      </FAB>

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={async (name, muscle, category) => {
          await createCustomExercise(db, userId, { name, primary_muscle: muscle, category });
          await reloadExercises();
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function AddExerciseSheet({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, muscle: string, category: string) => Promise<void> }) {
  const [name, setName] = React.useState("");
  const [muscle, setMuscle] = React.useState("Chest");
  const [category, setCategory] = React.useState("barbell");
  const [busy, setBusy] = React.useState(false);
  const cats = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "other"];

  return (
    <Sheet open={open} onClose={onClose} label="New exercise" title="Add a custom exercise">
      <div style={{ padding: "4px 20px 16px" }}>
        <div style={{ ...TYPE.col, color: TOK.dim, marginBottom: 8 }}>Name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spoto Press" style={{ width: "100%", height: 48, padding: "0 14px", background: TOK.surface, border: "none", borderRadius: 10, color: TOK.text, fontFamily: "inherit", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
        <div style={{ ...TYPE.col, color: TOK.dim, margin: "16px 0 8px" }}>Muscle</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MUSCLE_ORDER.map((m) => (
            <Chip key={m} selected={muscle === m} onClick={() => setMuscle(m)}>{m}</Chip>
          ))}
        </div>
        <div style={{ ...TYPE.col, color: TOK.dim, margin: "16px 0 8px" }}>Equipment</div>
        <Segmented value={category} onChange={setCategory} options={cats.map((c) => ({ value: c, label: cap(c) }))} />
        <Btn variant="primary" full size="lg" style={{ marginTop: 20 }} disabled={!name.trim() || busy} onClick={async () => { setBusy(true); try { await onCreate(name.trim(), muscle, category); setName(""); } finally { setBusy(false); } }}>
          {busy ? "Saving…" : "Create exercise"}
        </Btn>
      </div>
    </Sheet>
  );
}
