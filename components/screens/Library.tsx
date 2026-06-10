"use client";
// Library — browse the exercise database. Same filter engine as the picker
// (search, muscle, equipment, "my equipment"), rows navigate to the detail
// screen. The FAB and the custom-exercise sheet live OUTSIDE the scroll
// container so they stay fixed while the list scrolls.
import React from "react";
import { useApp } from "../app-context";
import { createCustomExercise } from "@/lib/data";
import { TOK, TYPE, ScreenHeader, Chip, FAB, Sheet, Btn, Segmented, I } from "@/lib/design";
import { MUSCLE_GROUPS, deMuscle } from "@/lib/muscles";
import { deCategory } from "@/lib/equipment";
import ExercisePicker from "./ExercisePicker";

export default function Library() {
  const { exercises, accent, goto, goBack, reloadExercises, db, userId, myEquipment } = useApp();
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
      <ScreenHeader back onBack={goBack} title="Übungs-Bibliothek" />
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
        <ExercisePicker
          exercises={exercises}
          accent={accent}
          myEquipment={myEquipment}
          variant="browse"
          onPick={(e) => goto("exercise-detail", e.id)}
        />
      </div>

      <FAB accent={accent} onClick={() => setAddOpen(true)}>
        <I.Plus size={18} color={accent.ink} w={2.5} />
        <span>Eigene Übung</span>
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
  const [category, setCategory] = React.useState("dumbbell");
  const [busy, setBusy] = React.useState(false);
  const cats = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];

  return (
    <Sheet open={open} onClose={onClose} label="Neue Übung" title="Eigene Übung anlegen">
      <div style={{ padding: "4px 20px 16px" }}>
        <div style={{ ...TYPE.col, color: TOK.dim, marginBottom: 8 }}>Name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Multipresse Schrägbank" style={{ width: "100%", height: 48, padding: "0 14px", background: TOK.surface, border: "none", borderRadius: 10, color: TOK.text, fontFamily: "inherit", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
        <div style={{ ...TYPE.col, color: TOK.dim, margin: "16px 0 8px" }}>Muskelgruppe</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m} selected={muscle === m} onClick={() => setMuscle(m)}>{deMuscle(m)}</Chip>
          ))}
        </div>
        <div style={{ ...TYPE.col, color: TOK.dim, margin: "16px 0 8px" }}>Gerät</div>
        <Segmented value={category} onChange={setCategory} options={cats.map((c) => ({ value: c, label: deCategory(c) }))} />
        <Btn variant="primary" full size="lg" style={{ marginTop: 20 }} disabled={!name.trim() || busy} onClick={async () => { setBusy(true); try { await onCreate(name.trim(), muscle, category); setName(""); } finally { setBusy(false); } }}>
          {busy ? "Speichert…" : "Übung erstellen"}
        </Btn>
      </div>
    </Sheet>
  );
}
