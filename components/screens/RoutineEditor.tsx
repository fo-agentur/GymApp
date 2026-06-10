"use client";
// RoutineEditor — create / edit a training plan. Structure matters here: the
// root does NOT scroll (only the inner list does), so the picker/targets
// sheets anchor to the screen instead of jumping with the scroll position.
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutine, createRoutine, updateRoutine, deleteRoutine, fetchRecentExerciseIds, type NewRoutineEx } from "@/lib/data";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Sheet, Btn, MiniStepper, I, mmss, rirColor } from "@/lib/design";
import { deMuscle } from "@/lib/muscles";
import { loadExerciseDB, type ExInfo } from "@/lib/exercise-db";
import ExercisePicker from "./ExercisePicker";

type EditEx = NewRoutineEx;
// null = closed · "add" = append · number = replace that index
type PickerTarget = null | "add" | number;

export default function RoutineEditor() {
  const { db, userId, accent, exMap, exercises, params, goBack, myEquipment } = useApp();
  const routineId = params.routineId;
  const [name, setName] = React.useState("Neue Routine");
  const [items, setItems] = React.useState<EditEx[]>([]);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [picker, setPicker] = React.useState<PickerTarget>(null);
  const [saving, setSaving] = React.useState(false);
  const [recentIds, setRecentIds] = React.useState<string[]>([]);
  const [images, setImages] = React.useState<Record<string, ExInfo>>({});
  const [dirty, setDirty] = React.useState(false);
  const [loaded, setLoaded] = React.useState(!routineId);

  React.useEffect(() => {
    fetchRecentExerciseIds(db).then(setRecentIds).catch(() => {});
    loadExerciseDB().then(setImages).catch(() => {});
  }, [db]);

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
            target_rir: re.target_rir,
            rest_seconds: re.rest_seconds,
          }))
        );
      }
      setLoaded(true);
    })();
  }, [db, routineId]);

  function update(i: number, patch: Partial<EditEx>) {
    setDirty(true);
    setItems((arr) => arr.map((ex, j) => (j === i ? { ...ex, ...patch } : ex)));
  }
  function removeAt(i: number) {
    setDirty(true);
    setItems((arr) => arr.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setItems((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      setDirty(true);
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function onPick(exId: string) {
    const target = picker;
    setPicker(null);
    setDirty(true);
    if (typeof target === "number") {
      // Replace: keep the slot's targets, only the exercise changes.
      setItems((arr) => arr.map((ex, j) => (j === target ? { ...ex, exercise_id: exId } : ex)));
    } else {
      setItems((arr) => [...arr, { exercise_id: exId, target_sets: 3, target_reps_min: 8, target_reps_max: 12, target_rir: 2, rest_seconds: 120 }]);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (routineId) await updateRoutine(db, routineId, name.trim() || "Routine", items);
      else await createRoutine(db, userId, name.trim() || "Routine", items);
      setDirty(false);
      goBack();
    } catch (e) {
      alert("Speichern fehlgeschlagen: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function leave() {
    if (dirty && !confirm("Änderungen verwerfen?")) return;
    goBack();
  }

  async function remove() {
    if (!routineId) return goBack();
    if (!confirm("Diese Routine wirklich löschen?")) return;
    await deleteRoutine(db, routineId);
    goBack();
  }

  if (!loaded) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
      <ScreenHeader
        back
        onBack={leave}
        title={routineId ? "Routine bearbeiten" : "Neue Routine"}
        trailing={<Btn variant="primary" size="sm" accent={accent} disabled={saving} onClick={save}>{saving ? "…" : "Speichern"}</Btn>}
      />

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
        <div style={{ padding: "0 16px 18px" }}>
          <div style={{ ...TYPE.col, color: TOK.dim, marginBottom: 6 }}>Name der Routine</div>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            style={{ width: "100%", padding: "4px 0", background: "transparent", border: "none", borderBottom: `1px solid ${TOK.border}`, color: TOK.text, fontFamily: "inherit", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", outline: "none" }}
          />
        </div>

        <SectionHeader title="Übungen" />
        <div style={{ padding: "0 12px" }}>
          {items.length === 0 && (
            <div style={{ padding: "8px 6px 16px", color: TOK.muted, fontSize: 13, lineHeight: 1.5 }}>
              Noch keine Übungen. Füge unten deine erste Übung hinzu — Sätze, Wiederholungen und Pause stellst du danach pro Übung ein.
            </div>
          )}
          {items.map((ex, i) => {
            const e = exMap[ex.exercise_id];
            const img = e ? images[e.name]?.image : null;
            return (
              <div key={`${ex.exercise_id}-${i}`} style={{ background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 14, marginBottom: 8, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 10px 6px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <button onClick={() => move(i, -1)} style={moveBtn} aria-label="Nach oben"><I.ChevU size={14} color={i === 0 ? TOK.surface3 : TOK.dim} /></button>
                    <button onClick={() => move(i, 1)} style={moveBtn} aria-label="Nach unten"><I.ChevD size={14} color={i === items.length - 1 ? TOK.surface3 : TOK.dim} /></button>
                  </div>
                  <ExImg img={img ?? null} name={e?.name ?? "?"} />
                  <button onClick={() => setEditing(i)} style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 0, padding: 0 }}>
                    <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 600 }}>{e?.name ?? "Übung"}</div>
                    <div style={{ fontSize: 11.5, color: TOK.muted, marginTop: 4, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                      <Tnum>{ex.target_sets} × {ex.target_reps_min ?? 8}–{ex.target_reps_max ?? 12} Wdh</Tnum>
                      {ex.target_rir != null && (
                        <span className="tnum" style={{ width: 17, height: 17, borderRadius: 999, background: rirColor(ex.target_rir), color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="RIR-Ziel">{ex.target_rir}</span>
                      )}
                      <span style={{ color: TOK.dim }}>·</span>
                      <Tnum>{mmss(ex.rest_seconds ?? 120)} Pause</Tnum>
                    </div>
                  </button>
                  <button onClick={() => setPicker(i)} style={moveBtn} aria-label="Übung tauschen" title="Übung tauschen"><I.Routine size={16} color={TOK.dim} /></button>
                  <button onClick={() => removeAt(i)} style={moveBtn} aria-label="Übung entfernen"><I.Trash size={16} color={TOK.dim} /></button>
                </div>
              </div>
            );
          })}

          <button onClick={() => setPicker("add")} style={{ width: "100%", height: 48, background: "transparent", border: `1.5px dashed ${TOK.border}`, borderRadius: 12, color: TOK.muted, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
            <I.Plus size={14} color={TOK.muted} w={2} /> Übung hinzufügen
          </button>

          {routineId && (
            <div style={{ marginTop: 24 }}>
              <Btn variant="danger" full onClick={remove}>Routine löschen</Btn>
            </div>
          )}
        </div>
      </div>

      {/* Targets sheet */}
      <Sheet open={editing != null} onClose={() => setEditing(null)} label="Vorgaben" title={editing != null ? exMap[items[editing]?.exercise_id]?.name ?? "" : ""}>
        {editing != null && items[editing] && (
          <div style={{ padding: "8px 20px 16px" }}>
            <TargetRow label="Sätze" trailing={<MiniStepper value={items[editing].target_sets} min={1} step={1} onChange={(v) => update(editing, { target_sets: v })} />} />
            <TargetRow label="Wdh. min" trailing={<MiniStepper value={items[editing].target_reps_min ?? 8} min={1} step={1} onChange={(v) => update(editing, { target_reps_min: v, target_reps_max: Math.max(v, items[editing].target_reps_max ?? v) })} />} />
            <TargetRow label="Wdh. max" trailing={<MiniStepper value={items[editing].target_reps_max ?? 12} min={items[editing].target_reps_min ?? 1} step={1} onChange={(v) => update(editing, { target_reps_max: v })} />} />
            <TargetRow label="RIR-Ziel" sub="Wiederholungen in Reserve" trailing={<MiniStepper value={items[editing].target_rir ?? 2} min={0} step={1} onChange={(v) => update(editing, { target_rir: Math.min(6, v) })} />} />
            <TargetRow label="Pause" trailing={<MiniStepper value={items[editing].rest_seconds ?? 120} min={0} step={15} unit="s" onChange={(v) => update(editing, { rest_seconds: v })} />} />
            <Btn variant="primary" full size="lg" accent={accent} onClick={() => setEditing(null)} style={{ marginTop: 14 }}>Fertig</Btn>
          </div>
        )}
      </Sheet>

      {/* Picker sheet (add or replace) */}
      <Sheet
        open={picker !== null}
        onClose={() => setPicker(null)}
        label={typeof picker === "number" ? "Übung tauschen" : "Übung hinzufügen"}
        title={typeof picker === "number" ? `Ersetzt: ${exMap[items[picker]?.exercise_id]?.name ?? ""}` : ""}
      >
        <ExercisePicker
          exercises={exercises}
          accent={accent}
          recentIds={recentIds}
          myEquipment={myEquipment}
          onPick={(e) => onPick(e.id)}
        />
      </Sheet>
    </div>
  );
}

const moveBtn: React.CSSProperties = { width: 30, height: 26, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };

function ExImg({ img, name }: { img: string | null; name: string }) {
  const [ok, setOk] = React.useState(true);
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: img && ok ? "#fff" : TOK.surface2, border: `1px solid ${TOK.border}`, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: TOK.dim, fontSize: 14, fontWeight: 700 }}>
      {img && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" loading="lazy" onError={() => setOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        (name[0] ?? "?").toUpperCase()
      )}
    </div>
  );
}

function TargetRow({ label, sub, trailing }: { label: string; sub?: string; trailing: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${TOK.border}` }}>
      <div>
        <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: TOK.dim, marginTop: 2 }}>{sub}</div>}
      </div>
      {trailing}
    </div>
  );
}
