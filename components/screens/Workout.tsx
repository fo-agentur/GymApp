"use client";
import React from "react";
import { useApp } from "../app-context";
import {
  startSession,
  logSet,
  finishSession,
  discardSession,
  fetchRoutine,
  fetchProgramWorkoutExercises,
  fetchLastPerformance,
  fetchRecentExerciseIds,
  fetchProfile,
} from "@/lib/data";
import type { WorkoutSession, Exercise } from "@/lib/supabase/types";
import { TOK, Tnum, I, Sheet, fmtW, mmss, epley1rm, rirColor } from "@/lib/design";
import { loadExerciseDB } from "@/lib/exercise-db";
import ExercisePicker from "./ExercisePicker";

export type SetType = "normal" | "warmup" | "drop" | "failure" | "myorep" | "partial";

type WSet = {
  localId: string;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  partials: number | null;
  setType: SetType;
  warmup: boolean;
  status: "planned" | "done";
  dbId?: string;
};
type Suggestion = { weight: number; reps: number; rir: number };
type WEx = {
  key: string;
  exerciseId: string;
  name: string;
  muscle: string;
  category: string;
  image: string | null;
  last: string | null;
  targetReps: string;
  priorBest1rm: number;
  rest: number;
  suggestion: Suggestion;
  sets: WSet[];
};

let counter = 0;
const uid = () => `l${++counter}`;

// Which cell of a set the keypad is currently editing.
type Focus = { setId: string; field: "weight" | "reps" | "rir" } | null;

export default function Workout() {
  const { db, userId, accent, exMap, exercises, workoutConfig, goto } = useApp();
  const [session, setSession] = React.useState<WorkoutSession | null>(null);
  const [exs, setExs] = React.useState<WEx[]>([]);
  const [currentKey, setCurrentKey] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [focus, setFocus] = React.useState<Focus>(null);
  const [buffer, setBuffer] = React.useState("");
  const [platesOpen, setPlatesOpen] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState<"add" | "swap" | null>(null);
  const [finishing, setFinishing] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [restTimer, setRestTimer] = React.useState<{ total: number; remaining: number } | null>(null);
  const [recentIds, setRecentIds] = React.useState<string[]>([]);
  const [celebration, setCelebration] = React.useState<{ prs: { name: string; weight: number }[] } | null>(null);
  const [exitPrompt, setExitPrompt] = React.useState(false);
  const [barWeight, setBarWeight] = React.useState(20);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    fetchRecentExerciseIds(db).then(setRecentIds).catch(() => {});
  }, [db]);

  React.useEffect(() => {
    fetchProfile(db, userId)
      .then((p) => setBarWeight(p?.bar_weight_kg ?? 20))
      .catch(() => {});
  }, [db, userId]);

  // Create session + build exercises once.
  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const s = await startSession(db, userId, {
        routineId: workoutConfig?.routineId ?? null,
        programWorkoutId: workoutConfig?.programWorkoutId ?? null,
        name: workoutConfig?.name ?? "Workout",
      });
      setSession(s);
      const built: WEx[] = [];
      if (workoutConfig?.programWorkoutId) {
        const pexs = await fetchProgramWorkoutExercises(db, workoutConfig.programWorkoutId);
        for (const pe of pexs) {
          const ex = exMap[pe.exercise_id];
          if (!ex) continue;
          built.push(await buildEx(ex, pe.target_sets, pe.target_reps_min, pe.target_reps_max, pe.target_rir, pe.rest_seconds ?? 120));
        }
      } else if (workoutConfig?.routineId) {
        const routine = await fetchRoutine(db, workoutConfig.routineId);
        if (routine) {
          for (const re of routine.routine_exercises) {
            const ex = exMap[re.exercise_id];
            if (!ex) continue;
            built.push(await buildEx(ex, re.target_sets, re.target_reps_min, re.target_reps_max, re.target_rir, re.rest_seconds ?? 120));
          }
        }
      }
      setExs(built);
      setCurrentKey(built[0]?.key ?? null);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buildEx(ex: Exercise, targetSets = 3, repsMin: number | null = 8, repsMax: number | null = null, targetRir: number | null = 2, rest = 120): Promise<WEx> {
    const loMin = repsMin ?? 8;
    const loMax = repsMax ?? (repsMin ? repsMin + 4 : 12);
    const rirTarget = targetRir ?? 2;
    let suggestion: Suggestion = { weight: ex.category === "bodyweight" ? 0 : 20, reps: loMin, rir: rirTarget };
    let last: string | null = null;
    let priorBest1rm = 0;
    try {
      const perf = await fetchLastPerformance(db, ex.id, userId);
      if (perf && perf.best_weight != null) {
        priorBest1rm = epley1rm(perf.best_weight ?? 0, perf.best_reps ?? 0);
        const lastReps = perf.best_reps ?? loMin;
        const lastRir = perf.best_rpe != null ? 10 - perf.best_rpe : 2;
        const canLoad = ex.category !== "bodyweight";
        if (lastReps >= loMax && lastRir >= rirTarget) {
          suggestion = { weight: perf.best_weight + (canLoad ? 2.5 : 0), reps: loMin, rir: rirTarget };
        } else {
          suggestion = { weight: perf.best_weight, reps: Math.min(loMax, lastReps + 1), rir: rirTarget };
        }
        last = `${fmtW(perf.best_weight)}kg × ${lastReps}`;
      }
    } catch {
      /* no history yet */
    }
    let image: string | null = null;
    try {
      const dbx = await loadExerciseDB();
      image = dbx[ex.name]?.image ?? null;
    } catch {
      /* no image */
    }
    // Pre-fill every planned set with the coach suggestion so the table reads
    // like a prescription you tick off (MacroFactor "Auto" behaviour).
    const sets: WSet[] = Array.from({ length: Math.max(1, targetSets) }, () => ({
      localId: uid(),
      weight: suggestion.weight,
      reps: suggestion.reps,
      rir: suggestion.rir,
      partials: null,
      setType: "normal" as SetType,
      warmup: false,
      status: "planned" as const,
    }));
    return { key: uid(), exerciseId: ex.id, name: ex.name, muscle: ex.primary_muscle, category: ex.category, image, last, targetReps: loMin === loMax ? `${loMin}` : `${loMin}–${loMax}`, priorBest1rm, rest, suggestion, sets };
  }

  React.useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Rest countdown.
  React.useEffect(() => {
    if (!restTimer) return;
    if (restTimer.remaining <= 0) {
      notifyRestDone();
      const t = setTimeout(() => setRestTimer(null), 4000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRestTimer((r) => (r ? { ...r, remaining: r.remaining - 1 } : r)), 1000);
    return () => clearTimeout(t);
  }, [restTimer]);

  function adjustRest(delta: number) {
    setRestTimer((r) => {
      if (!r) return r;
      const remaining = Math.max(0, r.remaining + delta);
      return { total: Math.max(r.total, remaining), remaining };
    });
  }

  const current = exs.find((e) => e.key === currentKey) ?? null;
  const curIdx = exs.findIndex((e) => e.key === currentKey);
  const isLast = curIdx === exs.length - 1;

  const doneSets = exs.reduce((n, e) => n + e.sets.filter((s) => s.status === "done" && !s.warmup).length, 0);
  const totalPlanned = exs.reduce((n, e) => n + e.sets.length, 0);
  const volume = exs.reduce(
    (n, e) => n + e.sets.filter((s) => s.status === "done" && !s.warmup).reduce((m, s) => m + (s.weight ?? 0) * (s.reps ?? 0), 0),
    0
  );

  // ── Mutators ──────────────────────────────────────────────────
  function patchSet(setId: string, patch: Partial<WSet>) {
    setExs((prev) =>
      prev.map((e) =>
        e.key !== currentKey ? e : { ...e, sets: e.sets.map((s) => (s.localId === setId ? { ...s, ...patch } : s)) }
      )
    );
  }

  function focusCell(setId: string, field: "weight" | "reps" | "rir") {
    setFocus({ setId, field });
    const set = current?.sets.find((s) => s.localId === setId);
    const v = set ? (field === "weight" ? set.weight : field === "reps" ? set.reps : set.rir) : null;
    setBuffer(v != null ? String(fmtW(v)) : "");
  }

  function typeDigit(d: string) {
    if (!focus) return;
    let next = buffer + d;
    if (focus.field !== "weight" && d === ".") return;
    if (d === "." && buffer.includes(".")) return;
    if (next.length > 6) return;
    setBuffer(next);
    const num = parseFloat(next);
    patchSet(focus.setId, { [focus.field]: Number.isNaN(num) ? null : num } as Partial<WSet>);
  }

  function backspace() {
    if (!focus) return;
    const next = buffer.slice(0, -1);
    setBuffer(next);
    const num = parseFloat(next);
    patchSet(focus.setId, { [focus.field]: next === "" || Number.isNaN(num) ? null : num } as Partial<WSet>);
  }

  function setRir(setId: string, value: number) {
    patchSet(setId, { rir: value });
    if (focus?.setId === setId && focus.field === "rir") setBuffer(String(value));
  }

  // Commit (or re-save) a row, then advance to the next planned set.
  async function commitRow(setId: string) {
    if (!session || !current) return;
    const ex = current;
    const set = ex.sets.find((s) => s.localId === setId);
    if (!set) return;
    const weight = set.weight ?? ex.suggestion.weight;
    const reps = set.reps ?? ex.suggestion.reps;
    const rir = set.rir ?? ex.suggestion.rir;
    const isWarm = set.setType === "warmup";
    const setIndex = ex.sets.filter((s) => s.status === "done" && !s.warmup && s.localId !== setId).length + 1;
    const rpe = rir != null ? Math.max(0, Math.min(10, 10 - rir)) : null;
    try {
      const row = await logSet(db, session.id, {
        exercise_id: ex.exerciseId,
        set_index: setIndex,
        weight_kg: weight,
        reps,
        rpe,
        is_warmup: isWarm,
        set_type: set.setType,
        rir,
        partial_reps: set.partials,
      });
      patchSet(setId, { weight, reps, rir, status: "done", dbId: row.id });
      if (!isWarm) setRestTimer({ total: ex.rest, remaining: ex.rest });
    } catch (err) {
      alert("Could not save set: " + (err as Error).message);
      return;
    }
    // Advance focus to the next not-done set's weight cell.
    const nextSet = ex.sets.find((s) => s.localId !== setId && s.status !== "done");
    if (nextSet) focusCell(nextSet.localId, "weight");
    else setFocus(null);
  }

  function addSet() {
    if (!current) return;
    const s = current.suggestion;
    const newId = uid();
    setExs((prev) =>
      prev.map((e) =>
        e.key !== currentKey
          ? e
          : { ...e, sets: [...e.sets, { localId: newId, weight: s.weight, reps: s.reps, rir: s.rir, partials: null, setType: "normal" as SetType, warmup: false, status: "planned" as const }] }
      )
    );
  }

  function onPick(ex: Exercise) {
    const mode = pickerMode;
    setPickerMode(null);
    (async () => {
      const wex = await buildEx(ex, 3, 8, 8);
      if (mode === "swap" && currentKey) {
        setExs((prev) => prev.map((e) => (e.key === currentKey ? wex : e)));
        setCurrentKey(wex.key);
      } else {
        setExs((prev) => [...prev, wex]);
        setCurrentKey((k) => k ?? wex.key);
      }
      setFocus(null);
    })();
  }

  function gotoExercise(key: string) {
    setCurrentKey(key);
    setFocus(null);
  }

  function nextExercise() {
    const nxt = exs[curIdx + 1];
    if (nxt) gotoExercise(nxt.key);
  }

  async function finish() {
    if (!session) return;
    setFinishing(true);
    if (doneSets === 0) {
      await discardSession(db, session.id);
      goto("today");
      return;
    }
    await finishSession(db, session.id, {
      total_volume_kg: Math.round(volume * 100) / 100,
      total_sets: doneSets,
      duration_seconds: elapsed,
      notes: null,
    });
    const prs: { name: string; weight: number }[] = [];
    for (const e of exs) {
      const doneSetsEx = e.sets.filter((s) => s.status === "done" && !s.warmup);
      const sessionBest1rm = Math.max(0, ...doneSetsEx.map((s) => epley1rm(s.weight ?? 0, s.reps ?? 0)));
      const top = Math.max(0, ...doneSetsEx.map((s) => s.weight ?? 0));
      if (sessionBest1rm > e.priorBest1rm && e.priorBest1rm > 0) prs.push({ name: e.name, weight: top });
    }
    if (prs.length > 0) {
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);
      } catch {
        /* unsupported */
      }
      setFinishing(false);
      setCelebration({ prs });
      return;
    }
    goto("history");
  }

  async function exitWorkout() {
    if (!session) return goto("today");
    if (doneSets === 0) {
      await discardSession(db, session.id);
      return goto("today");
    }
    setExitPrompt(true);
  }
  async function exitSave() {
    if (!session) return goto("today");
    await finishSession(db, session.id, { total_volume_kg: Math.round(volume * 100) / 100, total_sets: doneSets, duration_seconds: elapsed, notes: null });
    goto("today");
  }
  async function exitDiscard() {
    if (!session) return goto("today");
    await discardSession(db, session.id);
    goto("today");
  }

  const setPos = current ? current.sets.findIndex((s) => s.status !== "done") : -1;
  const activeSetNo = setPos < 0 ? (current?.sets.length ?? 0) : setPos + 1;

  return (
    <>
      <PhoneStatus />
      <div className="phone-scroll-area" style={{ position: "absolute", inset: "47px 0 0 0", display: "flex", flexDirection: "column", background: TOK.bg }}>
        {/* Top bar: menu · elapsed · rest */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px 6px 10px" }}>
          <button onClick={exitWorkout} style={{ ...iconBtn }} aria-label="Beenden">
            <I.ChevL size={22} color={TOK.text} />
          </button>
          <Tnum style={{ fontSize: 17, fontWeight: 700, color: TOK.text, letterSpacing: "-0.01em" }}>{hhmmss(elapsed)}</Tnum>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: restTimer ? TOK.accentSoft : "transparent" }}>
            <I.History size={15} color={restTimer ? TOK.accent : TOK.dim} />
            <Tnum style={{ fontSize: 14, fontWeight: 700, color: restTimer ? TOK.accent : TOK.dim }}>{restTimer ? mmss(Math.max(0, restTimer.remaining)) : "0:00"}</Tnum>
          </div>
        </div>

        {!ready ? (
          <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Session startet…</div>
        ) : exs.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: TOK.muted, fontSize: 14, lineHeight: 1.6 }}>
            Leeres Workout.
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setPickerMode("add")} style={{ height: 44, padding: "0 18px", borderRadius: 999, background: accent.hex, color: accent.ink, border: "none", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Übung hinzufügen</button>
            </div>
          </div>
        ) : current ? (
          <>
            {/* Exercise thumbnail track */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 14px 8px", flexShrink: 0 }}>
              {exs.map((e) => {
                const sel = e.key === currentKey;
                const allDone = e.sets.every((s) => s.status === "done");
                return (
                  <button key={e.key} onClick={() => gotoExercise(e.key)} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                    <Thumb image={e.image} name={e.name} size={52} dim={!sel} done={allDone && !sel} />
                    <div style={{ width: 40, height: 2.5, borderRadius: 2, background: sel ? TOK.text : "transparent" }} />
                  </button>
                );
              })}
              <button onClick={() => setPickerMode("add")} style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 13, background: TOK.surface2, border: `1px solid ${TOK.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 0 }} aria-label="Übung hinzufügen">
                <I.Plus size={20} color={TOK.muted} w={2} />
              </button>
            </div>

            {/* Title */}
            <div style={{ padding: "2px 16px 10px" }}>
              <div style={{ fontSize: 21, fontWeight: 800, color: TOK.text, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{current.name}</div>
              <div style={{ fontSize: 13, color: TOK.muted, marginTop: 2 }}>Satz {Math.min(activeSetNo, current.sets.length)} von {current.sets.length}</div>
            </div>

            {/* Action chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 14px 12px", flexShrink: 0 }}>
              <ActionChip icon={<I.Note size={15} color={TOK.text} />} label="Info" onTap={() => goto("exercise-detail", current.exerciseId)} />
              <ActionChip icon={<I.Flame size={15} color={warmActive(current) ? "#fff" : TOK.text} />} label="Aufwärmen" active={warmActive(current)} onTap={() => toggleWarmup()} />
              <ActionChip icon={<I.Routine size={15} color={TOK.text} />} label="Tauschen" onTap={() => setPickerMode("swap")} />
              <ActionChip icon={<I.Grid size={15} color={TOK.text} />} label="Scheiben" onTap={() => setPlatesOpen(true)} />
            </div>

            {/* Set table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: TABLE_GRID, alignItems: "center", gap: 8, padding: "2px 8px 8px", ...colHead }}>
                <span>Satz</span>
                <span>Ziel</span>
                <span style={{ textAlign: "center" }}>kg</span>
                <span style={{ textAlign: "center" }}>Wdh</span>
                <span style={{ textAlign: "center" }}>✓</span>
              </div>
              {current.sets.map((s, i) => (
                <SetTableRow
                  key={s.localId}
                  no={i + 1}
                  set={s}
                  target={`${fmtW(current.suggestion.weight)} × ${current.targetReps}`}
                  focus={focus}
                  accentInk={accent.ink}
                  accentHex={accent.hex}
                  onFocusCell={(field) => focusCell(s.localId, field)}
                  onCheck={() => commitRow(s.localId)}
                />
              ))}
              <button onClick={addSet} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 44, marginTop: 4, background: "transparent", border: "none", color: TOK.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <I.Plus size={14} color={TOK.muted} w={2} /> Satz hinzufügen
              </button>
            </div>

            {/* Rest timer (floats above the keypad / action bar) */}
            {restTimer && (
              <RestTimerBar timer={restTimer} accentHex={accent.hex} accentInk={accent.ink} onAdjust={adjustRest} onSkip={() => setRestTimer(null)} />
            )}

            {/* Bottom: keypad when editing, else the advance/finish action */}
            {focus ? (
              <Keypad
                field={focus.field}
                rir={current.sets.find((s) => s.localId === focus.setId)?.rir ?? null}
                accentHex={accent.hex}
                accentInk={accent.ink}
                onDigit={typeDigit}
                onBackspace={backspace}
                onRir={(v) => setRir(focus.setId, v)}
                onRirMode={() => setFocus({ ...focus, field: "rir" })}
                onFailure={() => { patchSet(focus.setId, { setType: "failure", rir: 0 }); }}
                onPartial={() => { patchSet(focus.setId, { setType: "partial" }); }}
                onCollapse={() => setFocus(null)}
                onConfirm={() => commitRow(focus.setId)}
              />
            ) : (
              <div style={{ padding: "8px 12px 22px", flexShrink: 0, background: TOK.bg, borderTop: `1px solid ${TOK.border}` }}>
                <button
                  onClick={isLast ? finish : nextExercise}
                  disabled={finishing}
                  style={{ width: "100%", height: 54, background: accent.hex, color: accent.ink, border: "none", borderRadius: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: finishing ? 0.5 : 1 }}
                >
                  {isLast ? "Workout beenden" : "Nächste Übung"} <I.ArrowR size={16} color={accent.ink} />
                </button>
              </div>
            )}
          </>
        ) : null}

        {/* Plate calculator */}
        <PlatesSheet open={platesOpen} onClose={() => setPlatesOpen(false)} weight={current?.sets.find((s) => s.status !== "done")?.weight ?? current?.suggestion.weight ?? 100} barWeight={barWeight} accentHex={accent.hex} />

        {/* Exercise picker (add / swap) */}
        <Sheet open={pickerMode !== null} onClose={() => setPickerMode(null)} label={pickerMode === "swap" ? "Übung tauschen" : "Übung hinzufügen"} title="">
          <ExercisePicker exercises={exercises} accent={accent} onPick={onPick} recentIds={recentIds} />
        </Sheet>

        {/* Exit prompt */}
        <Sheet open={exitPrompt} onClose={() => setExitPrompt(false)} label="Workout beenden" title="">
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: TOK.text, letterSpacing: "-0.01em" }}>Workout beenden?</div>
            <div style={{ fontSize: 13, color: TOK.muted, marginTop: 6, lineHeight: 1.5 }}>In deinem Verlauf speichern – oder ganz verwerfen.</div>
            <button onClick={() => { setExitPrompt(false); exitSave(); }} style={{ width: "100%", height: 54, marginTop: 20, background: accent.hex, color: accent.ink, border: "none", borderRadius: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", cursor: "pointer" }}>Speichern</button>
            <button onClick={() => { setExitPrompt(false); exitDiscard(); }} style={{ width: "100%", height: 50, marginTop: 10, background: "transparent", color: TOK.fail, border: `1px solid ${TOK.border}`, borderRadius: 16, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Verwerfen</button>
            <button onClick={() => setExitPrompt(false)} style={{ width: "100%", height: 46, marginTop: 6, background: "transparent", color: TOK.muted, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Abbrechen</button>
          </div>
        </Sheet>

        {celebration && <PRCelebration prs={celebration.prs} accentHex={accent.hex} accentInk={accent.ink} onClose={() => goto("history")} />}
      </div>
      <div className="home-indicator" />
    </>
  );

  function toggleWarmup() {
    if (!current) return;
    const target = current.sets.find((s) => s.status !== "done") ?? current.sets[0];
    if (!target) return;
    patchSet(target.localId, { setType: target.setType === "warmup" ? "normal" : "warmup", warmup: target.setType !== "warmup" });
  }
}

function warmActive(ex: WEx) {
  const t = ex.sets.find((s) => s.status !== "done") ?? ex.sets[0];
  return t?.setType === "warmup";
}

// ── Exercise thumbnail ──────────────────────────────────────────
function Thumb({ image, name, size, dim, done }: { image: string | null; name: string; size: number; dim?: boolean; done?: boolean }) {
  const [ok, setOk] = React.useState(true);
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: 13, background: "#ffffff", border: `1px solid ${TOK.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", opacity: dim ? 0.55 : 1 }}>
      {image && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" onError={() => setOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: size * 0.36, fontWeight: 800, color: TOK.dim }}>{(name?.[0] ?? "?").toUpperCase()}</span>
      )}
      {done && (
        <span style={{ position: "absolute", right: 3, bottom: 3, width: 16, height: 16, borderRadius: 999, background: "var(--c-pr)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I.Check size={10} color="#fff" />
        </span>
      )}
    </div>
  );
}

function ActionChip({ icon, label, active, onTap }: { icon: React.ReactNode; label: string; active?: boolean; onTap?: () => void }) {
  return (
    <button onClick={onTap} style={{
      flexShrink: 0, display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 13px", borderRadius: 999,
      background: active ? TOK.text : "transparent", color: active ? "var(--c-bg)" : TOK.text,
      border: active ? "none" : `1px solid ${TOK.border}`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent",
    }}>
      {icon}<span>{label}</span>
    </button>
  );
}

// ── Set table row ───────────────────────────────────────────────
const TABLE_GRID = "30px 1fr 62px 54px 34px";
const colHead: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: TOK.dim };

function SetTableRow({ no, set, target, focus, accentInk, accentHex, onFocusCell, onCheck }: {
  no: number; set: WSet; target: string; focus: Focus; accentInk: string; accentHex: string;
  onFocusCell: (f: "weight" | "reps" | "rir") => void; onCheck: () => void;
}) {
  const done = set.status === "done";
  const isW = focus?.setId === set.localId && focus.field === "weight";
  const isR = focus?.setId === set.localId && focus.field === "reps";
  const numCircle = set.setType === "warmup" ? "W" : set.setType === "failure" ? "F" : set.setType === "partial" ? "P" : String(no);

  return (
    <div style={{ display: "grid", gridTemplateColumns: TABLE_GRID, alignItems: "center", gap: 8, height: 50, padding: "0 8px" }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 999, background: TOK.surface2, fontSize: 12, fontWeight: 700, color: set.setType !== "normal" ? accentHex : TOK.muted }}>
        <span className="tnum">{numCircle}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <Tnum style={{ fontSize: 12.5, color: TOK.dim, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{target}</Tnum>
        {set.rir != null && <span className="tnum" style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 999, background: rirColor(set.rir), color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{set.rir}</span>}
      </span>
      <Cell value={set.weight} focused={isW} done={done} onTap={() => onFocusCell("weight")} />
      <Cell value={set.reps} focused={isR} done={done} onTap={() => onFocusCell("reps")} />
      <button onClick={onCheck} aria-label="Satz abhaken" style={{ justifySelf: "center", width: 26, height: 26, borderRadius: 8, background: done ? accentHex : "transparent", border: done ? "none" : `1.5px solid ${TOK.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}>
        {done && <I.Check size={15} color={accentInk} />}
      </button>
    </div>
  );
}

function Cell({ value, focused, done, onTap }: { value: number | null; focused: boolean; done: boolean; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{
      height: 36, borderRadius: 9, background: TOK.surface2,
      border: focused ? `2px solid ${TOK.text}` : `1px solid ${TOK.border}`,
      color: done ? TOK.text : TOK.muted, fontFamily: "inherit", cursor: "pointer", WebkitTapHighlightColor: "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span className="tnum" style={{ fontSize: 15, fontWeight: 600 }}>{value != null ? fmtW(value) : "—"}</span>
      {focused && <span style={{ width: 1.5, height: 16, background: TOK.text, marginLeft: 1, animation: "gymFade 600ms steps(1) infinite alternate" }} />}
    </button>
  );
}

// ── Custom numeric keypad ───────────────────────────────────────
const RIR_DOTS = [0, 1, 2, 3, 4, 5, 6];
function Keypad({ field, rir, accentHex, accentInk, onDigit, onBackspace, onRir, onRirMode, onFailure, onPartial, onCollapse, onConfirm }: {
  field: "weight" | "reps" | "rir"; rir: number | null; accentHex: string; accentInk: string;
  onDigit: (d: string) => void; onBackspace: () => void; onRir: (v: number) => void; onRirMode: () => void;
  onFailure: () => void; onPartial: () => void; onCollapse: () => void; onConfirm: () => void;
}) {
  const key: React.CSSProperties = { height: 52, borderRadius: 12, background: TOK.surface, border: `1px solid ${TOK.border}`, color: TOK.text, fontFamily: "inherit", fontSize: 22, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };
  const sideKey: React.CSSProperties = { ...key, fontSize: 14, fontWeight: 700, background: TOK.surface2 };
  return (
    <div style={{ flexShrink: 0, background: TOK.bg, borderTop: `1px solid ${TOK.border}`, padding: "10px 10px 18px" }}>
      {/* RIR dot scale */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4, padding: "0 2px 10px" }}>
        {RIR_DOTS.map((v) => {
          const sel = rir === v;
          return (
            <button key={v} onClick={() => onRir(v)} style={{ width: 34, height: 34, borderRadius: 999, background: rirColor(v), color: "#fff", border: sel ? `2.5px solid ${TOK.text}` : "2.5px solid transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}>
              {v}{v === 6 ? "+" : ""}
            </button>
          );
        })}
        <button onClick={onRirMode} style={{ width: 34, height: 34, borderRadius: 999, background: TOK.surface2, color: field === "rir" ? accentHex : TOK.dim, border: field === "rir" ? `2.5px solid ${accentHex}` : `2.5px solid transparent`, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>?</button>
      </div>

      {/* Keys: 3 number columns + 1 side column */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 7 }}>
        <button style={key} onClick={() => onDigit("1")}>1</button>
        <button style={key} onClick={() => onDigit("2")}>2</button>
        <button style={key} onClick={() => onDigit("3")}>3</button>
        <button style={sideKey} onClick={onCollapse} aria-label="Tastatur schließen"><I.ChevD size={20} color={TOK.muted} /></button>

        <button style={key} onClick={() => onDigit("4")}>4</button>
        <button style={key} onClick={() => onDigit("5")}>5</button>
        <button style={key} onClick={() => onDigit("6")}>6</button>
        <button style={sideKey} onClick={onRirMode}>RIR</button>

        <button style={key} onClick={() => onDigit("7")}>7</button>
        <button style={key} onClick={() => onDigit("8")}>8</button>
        <button style={key} onClick={() => onDigit("9")}>9</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          <button style={{ ...sideKey, background: TOK.text, color: "var(--c-bg)" }} onClick={onFailure}>F</button>
          <button style={sideKey} onClick={onPartial}>P</button>
        </div>

        <button style={key} onClick={() => onDigit(".")}>.</button>
        <button style={key} onClick={() => onDigit("0")}>0</button>
        <button style={sideKey} onClick={onBackspace} aria-label="Löschen"><I.X size={18} color={TOK.text} /></button>
        <button style={{ ...key, background: accentHex, border: "none" }} onClick={onConfirm} aria-label="Satz bestätigen"><I.Check size={22} color={accentInk} /></button>
      </div>
    </div>
  );
}

function PRCelebration({ prs, accentHex, accentInk, onClose }: { prs: { name: string; weight: number }[]; accentHex: string; accentInk: string; onClose: () => void }) {
  const confetti = React.useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      left: (i * 37) % 100,
      delay: (i % 5) * 0.12,
      dur: 1.6 + (i % 4) * 0.3,
      color: [accentHex, "#22c55e", "#f5a623", "#3b82f6"][i % 4],
      size: 6 + (i % 4) * 2,
    })),
    [accentHex]
  );
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(10,10,12,0.86)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, overflow: "hidden" }}>
      {confetti.map((c, i) => (
        <span key={i} style={{ position: "absolute", top: -20, left: `${c.left}%`, width: c.size, height: c.size, borderRadius: 2, background: c.color, animation: `gymConfetti ${c.dur}s ${c.delay}s ease-in forwards` }} />
      ))}
      <div className="gym-pop" style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Neuer Rekord{prs.length > 1 ? "e" : ""}!</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4, marginBottom: 20 }}>Du hast deinen Bestwert geknackt</div>
      <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
        {prs.slice(0, 4).map((p, i) => (
          <div key={i} className="gym-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 12, animationDelay: `${i * 90}ms` }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>{p.name}</span>
            <Tnum style={{ fontSize: 15, fontWeight: 800, color: accentHex, flexShrink: 0 }}>{fmtW(p.weight)} kg</Tnum>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ marginTop: 24, width: "100%", maxWidth: 300, height: 52, background: "#fff", color: "#0a0a0b", border: "none", borderRadius: 16, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Weiter</button>
    </div>
  );
}

// ── Plate calculator ────────────────────────────────────────────
const PLATES = [
  { kg: 25, color: "#ef4444" },
  { kg: 20, color: "#3b82f6" },
  { kg: 15, color: "#facc15" },
  { kg: 10, color: "#22c55e" },
  { kg: 5, color: "#e5e5e5" },
  { kg: 2.5, color: "#a1a1aa" },
  { kg: 1.25, color: "#71717a" },
];
function PlatesSheet({ open, onClose, weight, barWeight, accentHex }: { open: boolean; onClose: () => void; weight: number; barWeight: number; accentHex: string }) {
  const perSide = (weight - barWeight) / 2;
  const plates: { kg: number; color: string }[] = [];
  let rem = perSide;
  if (perSide > 0) {
    for (const p of PLATES) {
      while (rem >= p.kg - 1e-9) {
        plates.push(p);
        rem = +(rem - p.kg).toFixed(4);
      }
    }
  }
  const counts = new Map<number, { kg: number; count: number; color: string }>();
  plates.forEach((p) => {
    if (!counts.has(p.kg)) counts.set(p.kg, { kg: p.kg, count: 0, color: p.color });
    counts.get(p.kg)!.count++;
  });
  return (
    <Sheet open={open} onClose={onClose} label="Hantelscheiben" title="">
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: TOK.muted }}>{fmtW(barWeight)} kg Stange · pro Seite</div>
          <Tnum style={{ fontSize: 26, fontWeight: 800, color: accentHex }}>
            {fmtW(weight)}<span style={{ fontSize: 14, color: TOK.muted, marginLeft: 4, fontWeight: 400 }}>kg</span>
          </Tnum>
        </div>
        <div style={{ background: TOK.surface2, borderRadius: 12, padding: "24px 16px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 150 }}>
          {perSide <= 0 ? (
            <div style={{ color: TOK.dim, fontSize: 13 }}>Nur Stange</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {plates.map((p, i) => (
                <div key={i} className="tnum" style={{ width: Math.max(14, 10 + p.kg * 0.6), height: Math.max(60, 50 + p.kg * 2.5), borderRadius: 3, background: p.color, border: "1px solid rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a0a", fontSize: 9, fontWeight: 800 }}>
                  {p.kg}
                </div>
              ))}
              <div style={{ width: 56, height: 8, background: TOK.dim, marginLeft: 4, borderRadius: 2 }} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {[...counts.values()].map((p) => (
            <div key={p.kg} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: TOK.surface2, borderRadius: 8, fontSize: 12, color: TOK.text }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, border: "1px solid rgba(0,0,0,0.15)" }} />
              <Tnum>{p.count} × {p.kg}</Tnum>
            </div>
          ))}
          {rem > 0.01 && <div style={{ padding: "6px 10px", background: "rgba(229,72,77,0.14)", color: TOK.fail, borderRadius: 8, fontSize: 12 }}>−{rem.toFixed(2)} kg zu wenig</div>}
        </div>
        <button onClick={onClose} style={{ width: "100%", height: 50, marginTop: 18, background: TOK.surface2, color: TOK.text, border: `1px solid ${TOK.border}`, borderRadius: 16, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Fertig</button>
      </div>
    </Sheet>
  );
}

// ── Rest timer bar ──────────────────────────────────────────────
const timerBtn: React.CSSProperties = { flex: 1, height: 38, borderRadius: 12, background: TOK.surface2, color: TOK.text, border: `1px solid ${TOK.border}`, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
function RestTimerBar({ timer, accentHex, accentInk, onAdjust, onSkip }: { timer: { total: number; remaining: number }; accentHex: string; accentInk: string; onAdjust: (d: number) => void; onSkip: () => void }) {
  const done = timer.remaining <= 0;
  const pct = timer.total > 0 ? Math.max(0, Math.min(1, timer.remaining / timer.total)) : 0;
  return (
    <div style={{ flexShrink: 0, margin: "0 12px 8px", background: TOK.surface, borderRadius: 18, padding: "12px 14px 14px", boxShadow: `0 8px 24px ${TOK.shadow}`, border: `1px solid ${done ? "var(--c-pr)" : TOK.border}`, animation: "gymUp 280ms cubic-bezier(0.22,1,0.36,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: done ? "var(--c-pr)" : accentHex }}>{done ? "Pause vorbei" : "Pause"}</span>
        <Tnum style={{ fontSize: 24, fontWeight: 800, color: TOK.text, letterSpacing: "-0.02em" }}>{mmss(Math.max(0, timer.remaining))}</Tnum>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: TOK.surface2, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, background: done ? "var(--c-pr)" : accentHex, borderRadius: 999, transition: "width 1s linear" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onAdjust(-15)} style={timerBtn}>−15s</button>
        <button onClick={() => onAdjust(15)} style={timerBtn}>+15s</button>
        <button onClick={onSkip} style={{ ...timerBtn, background: accentHex, color: accentInk, border: "none" }}>{done ? "Schließen" : "Überspringen"}</button>
      </div>
    </div>
  );
}

function notifyRestDone() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([120, 60, 120]);
  } catch {
    /* not supported */
  }
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.42);
    o.onended = () => ctx.close();
  } catch {
    /* audio blocked */
  }
}

const iconBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };

function hhmmss(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PhoneStatus() {
  const c = TOK.text;
  return (
    <div className="phone-status" style={{ color: c }}>
      <div className="time tnum">9:41</div>
      <div className="icons">
        <svg width="17" height="11" viewBox="0 0 17 11"><g fill={c}><rect x="0" y="7" width="3" height="4" rx="0.6" /><rect x="4.5" y="5" width="3" height="6" rx="0.6" /><rect x="9" y="2.5" width="3" height="8.5" rx="0.6" /><rect x="13.5" y="0" width="3" height="11" rx="0.6" /></g></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={c} strokeOpacity="0.45" fill="none" /><rect x="2" y="2" width="19" height="8" rx="1.5" fill={c} /></svg>
      </div>
    </div>
  );
}
