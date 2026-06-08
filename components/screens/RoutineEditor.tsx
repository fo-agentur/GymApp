"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutine, createRoutine, updateRoutine, deleteRoutine, fetchRecentExerciseIds, type NewRoutineEx } from "@/lib/data";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Sheet, Btn, MiniStepper, I, mmss } from "@/lib/design";
import ExercisePicker from "./ExercisePicker";

type EditEx = NewRoutineEx;

export default function RoutineEditor() {
  const { db, userId, accent, exMap, exercises, params, goto } = useApp();
  const routineId = params.routineId;
  const [name, setName] = React.useState("New Routine");
  const [items, setItems] = React.useState<EditEx[]>([]);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [recentIds, setRecentIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetchRecentExerciseIds(db).then(setRecentIds).catch(() => {});
  }, [db]);
  const [loaded, setLoaded] = React.useState(!routineId);

  React.useEffect(() => {
    (async () => {
      if (!routineId) return;
      const r = await fetchRoutine(db, routineId);
      if (r) {
        setName(r.name);
        setItems(
          r.routine_exercises.map((re) => ({
            exercise_id: re.exercise_id,
            target_sets: re.target_sets,
            target_reps_min: re.target_reps_min,
            target_reps_max: re.target_reps_max,
            target_rpe: re.target_rpe,
            rest_seconds: re.rest_seconds,
          }))
        );
      }
      setLoaded(true);
    })();
  }, [db, routineId]);

  function update(i: number, patch: Partial<EditEx>) {
    setItems((arr) => arr.map((ex, j) => (j === i ? { ...ex, ...patch } : ex)));
  }
  function removeAt(i: number) {
    setItems((arr) => arr.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setItems((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    try {
      if (routineId) await updateRoutine(db, routineId, name.trim() || "Routine", items);
      else await createRoutine(db, userId, name.trim() || "Routine", items);
      goto("routines");
    } catch (e) {
      alert("Could not save: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!routineId) return goto("routines");
    if (!confirm("Archive this routine?")) return;
    await deleteRoutine(db, routineId);
    goto("routines");
  }

  if (!loaded) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 32, position: "relative" }}>
      <ScreenHeader back onBack={() => goto("routines")} title="" trailing={<Btn variant="primary" size="sm" accent={accent} disabled={saving} onClick={save}>{saving ? "…" : "Save"}</Btn>} />

      <div style={{ padding: "0 16px 18px" }}>
        <div style={{ ...TYPE.col, color: TOK.dim, marginBottom: 6 }}>Routine name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "4px 0", background: "transparent", border: "none", borderBottom: `1px solid ${TOK.border}`, color: TOK.text, fontFamily: "inherit", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", outline: "none" }} />
      </div>

      <SectionHeader title="Exercises" />
      <div style={{ padding: "0 12px" }}>
        {items.map((ex, i) => {
          const e = exMap[ex.exercise_id];
          return (
            <div key={`${ex.exercise_id}-${i}`} style={{ background: TOK.surface, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 12px 8px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button onClick={() => move(i, -1)} style={moveBtn}><I.ChevU size={14} color={TOK.dim} /></button>
                  <button onClick={() => move(i, 1)} style={moveBtn}><I.ChevD size={14} color={TOK.dim} /></button>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: TOK.surface2, border: `1px solid ${TOK.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: TOK.dim, fontSize: 14, fontWeight: 700 }}>{(e?.name ?? "?")[0]?.toUpperCase()}</div>
                <button onClick={() => setEditing(i)} style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 0 }}>
                  <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 500 }}>{e?.name ?? "Exercise"}</div>
                  <div style={{ fontSize: 11, color: TOK.muted, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Tnum>{ex.target_sets} sets</Tnum>
                    <span style={{ color: TOK.dim }}>·</span>
                    <Tnum>{ex.target_reps_min ?? 8}-{ex.target_reps_max ?? 10} reps</Tnum>
                    {ex.target_rpe != null && <><span style={{ color: TOK.dim }}>·</span><Tnum>@{ex.target_rpe}</Tnum></>}
                    <span style={{ color: TOK.dim }}>·</span>
                    <Tnum>{mmss(ex.rest_seconds ?? 120)} rest</Tnum>
                  </div>
                </button>
                <button onClick={() => removeAt(i)} style={moveBtn}><I.Trash size={16} color={TOK.dim} /></button>
              </div>
            </div>
          );
        })}

        <button onClick={() => setPickerOpen(true)} style={{ width: "100%", height: 48, background: "transparent", border: `1.5px dashed ${TOK.border}`, borderRadius: 12, color: TOK.muted, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
          <I.Plus size={14} color={TOK.muted} w={2} /> Add exercise
        </button>

        {routineId && (
          <div style={{ marginTop: 24 }}>
            <Btn variant="danger" full onClick={remove}>Archive routine</Btn>
          </div>
        )}
      </div>

      {/* Targets sheet */}
      <Sheet open={editing != null} onClose={() => setEditing(null)} label="Targets" title={editing != null ? exMap[items[editing]?.exercise_id]?.name ?? "" : ""}>
        {editing != null && items[editing] && (
          <div style={{ padding: "8px 20px 16px" }}>
            <TargetRow label="Sets" trailing={<MiniStepper value={items[editing].target_sets} min={1} step={1} onChange={(v) => update(editing, { target_sets: v })} />} />
            <TargetRow label="Reps min" trailing={<MiniStepper value={items[editing].target_reps_min ?? 8} min={1} step={1} onChange={(v) => update(editing, { target_reps_min: v })} />} />
            <TargetRow label="Reps max" trailing={<MiniStepper value={items[editing].target_reps_max ?? 10} min={1} step={1} onChange={(v) => update(editing, { target_reps_max: v })} />} />
            <TargetRow label="RPE target" trailing={<MiniStepper value={items[editing].target_rpe ?? 8} min={5} step={0.5} onChange={(v) => update(editing, { target_rpe: v })} />} />
            <TargetRow label="Rest" trailing={<MiniStepper value={items[editing].rest_seconds ?? 120} min={0} step={15} unit="s" onChange={(v) => update(editing, { rest_seconds: v })} />} />
            <Btn variant="primary" full size="lg" accent={accent} onClick={() => setEditing(null)} style={{ marginTop: 14 }}>Done</Btn>
          </div>
        )}
      </Sheet>

      {/* Picker sheet */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} label="Add exercise" title="">
        <ExercisePicker
          exercises={exercises}
          accent={accent}
          recentIds={recentIds}
          onPick={(e) => {
            setItems((arr) => [...arr, { exercise_id: e.id, target_sets: 3, target_reps_min: 8, target_reps_max: 10, target_rpe: 8, rest_seconds: 120 }]);
            setPickerOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}

const moveBtn: React.CSSProperties = { width: 28, height: 24, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };

function TargetRow({ label, trailing }: { label: string; trailing: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${TOK.border}` }}>
      <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 500 }}>{label}</div>
      {trailing}
    </div>
  );
}
