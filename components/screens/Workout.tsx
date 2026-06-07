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
import { TOK, MACRO, Tnum, I, Sheet, fmtW, mmss, epley1rm, rirColor } from "@/lib/design";
import ExercisePicker from "./ExercisePicker";

export type SetType = "normal" | "warmup" | "drop" | "failure" | "myorep" | "partial";
const SET_TYPES: { id: SetType; label: string; mark: string; color: string }[] = [
  { id: "normal", label: "Normal", mark: "", color: TOK.muted },
  { id: "warmup", label: "Aufwärmen", mark: "W", color: MACRO.kcal },
  { id: "drop", label: "Dropsatz", mark: "D", color: MACRO.protein },
  { id: "failure", label: "Versagen", mark: "F", color: TOK.fail },
  { id: "myorep", label: "Myo-Reps", mark: "M", color: MACRO.carbs },
  { id: "partial", label: "Partials", mark: "P", color: MACRO.fat },
];
const setMark = (t: SetType, idx: number) => (t === "normal" ? String(idx) : SET_TYPES.find((x) => x.id === t)?.mark ?? String(idx));
const setColor = (t: SetType) => SET_TYPES.find((x) => x.id === t)?.color ?? TOK.muted;

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
  last: string | null;
  targetReps: string;
  priorBest1rm: number;
  rest: number;
  suggestion: Suggestion;
  sets: WSet[];
};

let counter = 0;
const uid = () => `l${++counter}`;

export default function Workout() {
  const { db, userId, accent, exMap, exercises, workoutConfig, goto } = useApp();
  const [session, setSession] = React.useState<WorkoutSession | null>(null);
  const [exs, setExs] = React.useState<WEx[]>([]);
  const [currentKey, setCurrentKey] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [override, setOverride] = React.useState<{ exKey: string; setId: string; weight: number; reps: number; rir: number; partials: number | null; setType: SetType } | null>(null);
  const [platesOpen, setPlatesOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
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
        // Program-driven: load the day's prescribed exercises + targets.
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
        // Double progression: hit the top of the rep range with reps to spare → add load
        // and reset to the bottom of the range; otherwise hold load and add a rep.
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
    const sets: WSet[] = Array.from({ length: Math.max(1, targetSets) }, () => ({
      localId: uid(),
      weight: null,
      reps: null,
      rir: null,
      partials: null,
      setType: "normal" as SetType,
      warmup: false,
      status: "planned" as const,
    }));
    return { key: uid(), exerciseId: ex.id, name: ex.name, muscle: ex.primary_muscle, category: ex.category, last, targetReps: loMin === loMax ? `${loMin}` : `${loMin}–${loMax}`, priorBest1rm, rest, suggestion, sets };
  }

  React.useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Rest countdown — ticks down each second; fires a cue + auto-hides at 0.
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

  const doneSets = exs.reduce((n, e) => n + e.sets.filter((s) => s.status === "done" && !s.warmup).length, 0);
  const totalPlanned = exs.reduce((n, e) => n + e.sets.length, 0);
  const volume = exs.reduce(
    (n, e) => n + e.sets.filter((s) => s.status === "done" && !s.warmup).reduce((m, s) => m + (s.weight ?? 0) * (s.reps ?? 0), 0),
    0
  );

  async function commit(exKey: string, setId: string, vals: { weight: number; reps: number; rir: number; partials: number | null; setType: SetType }) {
    if (!session) return;
    const ex = exs.find((e) => e.key === exKey);
    if (!ex) return;
    const isWarm = vals.setType === "warmup";
    const setIndex = ex.sets.filter((s) => s.status === "done" && !s.warmup).length + 1;
    // Store RPE too (= 10 − RIR) so existing 1RM/last-performance logic keeps working.
    const rpe = vals.rir != null ? Math.max(0, Math.min(10, 10 - vals.rir)) : null;
    try {
      const row = await logSet(db, session.id, {
        exercise_id: ex.exerciseId,
        set_index: setIndex,
        weight_kg: vals.weight,
        reps: vals.reps,
        rpe,
        is_warmup: isWarm,
        set_type: vals.setType,
        rir: vals.rir,
        partial_reps: vals.partials,
      });
      setExs((prev) =>
        prev.map((e) =>
          e.key !== exKey
            ? e
            : { ...e, sets: e.sets.map((s) => (s.localId === setId ? { ...s, weight: vals.weight, reps: vals.reps, rir: vals.rir, partials: vals.partials, setType: vals.setType, warmup: isWarm, status: "done" as const, dbId: row.id } : s)) }
        )
      );
      // Kick off the rest timer for this exercise.
      setRestTimer({ total: ex.rest, remaining: ex.rest });
    } catch (err) {
      alert("Could not save set: " + (err as Error).message);
    }
  }

  function addSet(exKey: string) {
    setExs((prev) =>
      prev.map((e) => (e.key !== exKey ? e : { ...e, sets: [...e.sets, { localId: uid(), weight: null, reps: null, rir: null, partials: null, setType: "normal" as SetType, warmup: false, status: "planned" as const }] }))
    );
  }

  function addExercise(ex: Exercise) {
    setPickerOpen(false);
    (async () => {
      const wex = await buildEx(ex, 3, 8, 8);
      setExs((prev) => [...prev, wex]);
      if (!currentKey) setCurrentKey(wex.key);
    })();
  }

  function nextExercise() {
    const idx = exs.findIndex((e) => e.key === currentKey);
    const nxt = exs[idx + 1];
    if (nxt) setCurrentKey(nxt.key);
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
    // PR detection: best estimated 1RM this session beats the prior best 1RM.
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
    if (!session) {
      goto("today");
      return;
    }
    if (doneSets === 0) {
      await discardSession(db, session.id);
      goto("today");
      return;
    }
    // With logged sets, ask whether to save or discard.
    setExitPrompt(true);
  }

  async function exitSave() {
    if (!session) {
      goto("today");
      return;
    }
    await finishSession(db, session.id, {
      total_volume_kg: Math.round(volume * 100) / 100,
      total_sets: doneSets,
      duration_seconds: elapsed,
      notes: null,
    });
    goto("today");
  }

  async function exitDiscard() {
    if (!session) {
      goto("today");
      return;
    }
    await discardSession(db, session.id);
    goto("today");
  }

  const isLast = currentKey != null && exs.findIndex((e) => e.key === currentKey) === exs.length - 1;

  return (
    <>
      <PhoneStatus />
      <div className="phone-scroll-area" style={{ position: "absolute", inset: "47px 0 0 0", display: "flex", flexDirection: "column", background: TOK.bg }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px 8px 6px" }}>
          <button
            onClick={exitWorkout}
            style={{ display: "flex", alignItems: "center", gap: 2, background: "transparent", border: "none", color: TOK.muted, fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: 8 }}
          >
            <I.ChevL size={18} color={TOK.muted} /> Beenden
          </button>
          <Tnum style={{ fontSize: 15, fontWeight: 600, color: TOK.text, padding: "0 12px", letterSpacing: "-0.01em" }}>{mmss(elapsed)}</Tnum>
        </div>

        {/* Info strip */}
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "0 16px 12px", fontSize: 12, color: TOK.muted, borderBottom: `1px solid ${TOK.border}` }}>
          <span style={{ color: TOK.muted, fontWeight: 500 }}>{workoutConfig?.name ?? "Workout"}</span>
          <span style={{ color: TOK.dim }}>·</span>
          <Tnum>{fmtW(Math.round(volume))} kg Vol</Tnum>
          <span style={{ color: TOK.dim }}>·</span>
          <Tnum>
            {doneSets} / {totalPlanned} Sätze
          </Tnum>
        </div>

        {/* Exercise list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0 96px" }}>
          {!ready && <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Session startet…</div>}
          {ready && exs.length === 0 && (
            <div style={{ padding: "32px 24px", textAlign: "center", color: TOK.muted, fontSize: 14, lineHeight: 1.6 }}>
              Leeres Workout. Füge eine Übung hinzu, um loszulegen.
            </div>
          )}
          {exs.map((ex) => (
            <ExerciseCard
              key={ex.key}
              ex={ex}
              isCurrent={ex.key === currentKey}
              accentHex={accent.hex}
              accentInk={accent.ink}
              onLog={(setId) => {
                const s = ex.suggestion;
                commit(ex.key, setId, { weight: s.weight, reps: s.reps, rir: s.rir, partials: null, setType: "normal" });
              }}
              onAdjust={(setId) => {
                const set = ex.sets.find((x) => x.localId === setId);
                setOverride({
                  exKey: ex.key, setId,
                  weight: set?.weight ?? ex.suggestion.weight,
                  reps: set?.reps ?? ex.suggestion.reps,
                  rir: set?.rir ?? ex.suggestion.rir,
                  partials: set?.partials ?? null,
                  setType: set?.setType ?? "normal",
                });
              }}
              onAddSet={() => addSet(ex.key)}
              onSelect={() => setCurrentKey(ex.key)}
            />
          ))}

          {ready && (
            <button
              onClick={() => setPickerOpen(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "calc(100% - 24px)", margin: "4px 12px 0", height: 48, background: "transparent", border: `1.5px dashed ${TOK.border}`, borderRadius: 12, color: TOK.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <I.Plus size={14} color={TOK.muted} w={2} /> Übung hinzufügen
            </button>
          )}
        </div>

        {/* Rest timer */}
        {restTimer && (
          <RestTimerBar timer={restTimer} accentHex={accent.hex} accentInk={accent.ink} onAdjust={adjustRest} onSkip={() => setRestTimer(null)} />
        )}

        {/* Pinned action */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 12px 26px", background: "linear-gradient(to bottom, transparent 0%, var(--c-bg) 45%)", pointerEvents: "none" }}>
          <button
            onClick={isLast || exs.length === 0 ? finish : nextExercise}
            disabled={finishing}
            style={{ width: "100%", height: 56, background: accent.hex, color: accent.ink, border: "none", borderRadius: 24, fontFamily: "inherit", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer", pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: finishing ? 0.5 : 1 }}
          >
            {isLast || exs.length === 0 ? "Workout beenden" : "Nächste Übung"} <I.ArrowR size={16} color={accent.ink} />
          </button>
        </div>

        {/* Override / set logger sheet */}
        <SetLoggerSheet
          open={!!override && !platesOpen}
          draft={override}
          accentHex={accent.hex}
          accentInk={accent.ink}
          onClose={() => setOverride(null)}
          onChange={setOverride}
          onPlates={() => setPlatesOpen(true)}
          onLog={() => {
            if (!override) return;
            commit(override.exKey, override.setId, { weight: override.weight, reps: override.reps, rir: override.rir, partials: override.partials, setType: override.setType });
            setOverride(null);
          }}
        />
        <PlatesSheet open={platesOpen} onClose={() => setPlatesOpen(false)} weight={override?.weight ?? 100} barWeight={barWeight} accentHex={accent.hex} />

        <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} label="Übung hinzufügen" title="">
          <ExercisePicker exercises={exercises} accent={accent} onPick={addExercise} recentIds={recentIds} />
        </Sheet>

        <Sheet open={exitPrompt} onClose={() => setExitPrompt(false)} label="Workout beenden" title="">
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: TOK.text, letterSpacing: "-0.01em" }}>Workout beenden?</div>
            <div style={{ fontSize: 13, color: TOK.muted, marginTop: 6, lineHeight: 1.5 }}>
              In deinem Verlauf speichern – oder ganz verwerfen.
            </div>
            <button
              onClick={() => { setExitPrompt(false); exitSave(); }}
              style={{ width: "100%", height: 56, marginTop: 20, background: accent.hex, color: accent.ink, border: "none", borderRadius: 24, fontFamily: "inherit", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer" }}
            >
              Speichern
            </button>
            <button
              onClick={() => { setExitPrompt(false); exitDiscard(); }}
              style={{ width: "100%", height: 52, marginTop: 10, background: "transparent", color: TOK.fail, border: `1px solid ${TOK.border}`, borderRadius: 24, fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              Verwerfen
            </button>
            <button
              onClick={() => setExitPrompt(false)}
              style={{ width: "100%", height: 48, marginTop: 6, background: "transparent", color: TOK.muted, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Abbrechen
            </button>
          </div>
        </Sheet>

        {celebration && (
          <PRCelebration prs={celebration.prs} accentHex={accent.hex} accentInk={accent.ink} onClose={() => goto("history")} />
        )}
      </div>
      <div className="home-indicator" />
    </>
  );
}

function PRCelebration({ prs, accentHex, accentInk, onClose }: { prs: { name: string; weight: number }[]; accentHex: string; accentInk: string; onClose: () => void }) {
  const confetti = React.useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.6 + Math.random() * 1.2,
      color: [accentHex, "#22c55e", "#fb923c", "#fafafa"][i % 4],
      size: 6 + Math.random() * 6,
    })),
    [accentHex]
  );
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, overflow: "hidden" }}>
      {confetti.map((c, i) => (
        <span key={i} style={{ position: "absolute", top: -20, left: `${c.left}%`, width: c.size, height: c.size, borderRadius: 2, background: c.color, animation: `gymConfetti ${c.dur}s ${c.delay}s ease-in forwards` }} />
      ))}
      <div className="gym-pop" style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em" }}>Neuer Rekord{prs.length > 1 ? "e" : ""}!</div>
      <div style={{ fontSize: 13, color: TOK.muted, marginTop: 4, marginBottom: 20 }}>Du hast deinen Bestwert geknackt</div>
      <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
        {prs.slice(0, 4).map((p, i) => (
          <div key={i} className="gym-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: TOK.surface, borderRadius: 12, animationDelay: `${i * 90}ms` }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: TOK.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>{p.name}</span>
            <Tnum style={{ fontSize: 15, fontWeight: 700, color: accentHex, flexShrink: 0 }}>{fmtW(p.weight)} kg</Tnum>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ marginTop: 24, width: "100%", maxWidth: 300, height: 52, background: accentHex, color: accentInk, border: "none", borderRadius: 24, fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
        Weiter
      </button>
    </div>
  );
}

const GRID = "24px 1fr 1fr 44px 30px";
const colHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TOK.dim };

function ExerciseCard({
  ex,
  isCurrent,
  accentHex,
  accentInk,
  onLog,
  onAdjust,
  onAddSet,
  onSelect,
}: {
  ex: WEx;
  isCurrent: boolean;
  accentHex: string;
  accentInk: string;
  onLog: (setId: string) => void;
  onAdjust: (setId: string) => void;
  onAddSet: () => void;
  onSelect: () => void;
}) {
  const doneCount = ex.sets.filter((s) => s.status === "done" && !s.warmup).length;
  const totalCount = ex.sets.filter((s) => !s.warmup).length;
  const coachId = isCurrent ? ex.sets.find((s) => s.status !== "done")?.localId : undefined;

  return (
    <div style={{ background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 24, overflow: "hidden", marginBottom: 12, marginLeft: 12, marginRight: 12 }}>
      <button
        onClick={onSelect}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px 11px", width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: TOK.surface2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: TOK.muted, fontSize: 15, fontWeight: 600 }}>
          {ex.name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: TOK.text, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{ex.name}</div>
          <div style={{ fontSize: 12, color: TOK.dim, marginTop: 3 }}>Ziel {ex.targetReps} Wdh · {ex.suggestion.rir} RIR{ex.last ? <> · zuletzt <span className="tnum">{ex.last}</span></> : ""}</div>
        </div>
        <span className="tnum" style={{ fontSize: 13, color: isCurrent ? accentHex : TOK.dim, fontWeight: 600 }}>
          {doneCount}/{totalCount}
        </span>
      </button>

      <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, padding: "2px 16px 6px", ...colHead }}>
        <span>Satz</span>
        <span>Gewicht</span>
        <span>Wdh</span>
        <span style={{ textAlign: "right" }}>RIR</span>
        <span />
      </div>

      <div>
        {ex.sets.map((s, i) => {
          if (s.localId === coachId) {
            return (
              <CoachBox
                key={s.localId}
                idx={i + 1}
                suggestion={ex.suggestion}
                onLog={() => onLog(s.localId)}
                onAdjust={() => onAdjust(s.localId)}
              />
            );
          }
          return <LocalSetRow key={s.localId} idx={i + 1} set={s} accentHex={accentHex} accentInk={accentInk} onTap={() => onAdjust(s.localId)} />;
        })}
      </div>

      <button
        onClick={onAddSet}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 46, background: "transparent", border: "none", color: TOK.muted, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
      >
        <I.Plus size={14} color={TOK.muted} w={2} /> Satz hinzufügen
      </button>
    </div>
  );
}

function LocalSetRow({ idx, set, accentHex, accentInk, onTap }: { idx: number; set: WSet; accentHex: string; accentInk: string; onTap: () => void }) {
  const done = set.status === "done";
  const numColor = done ? TOK.text : TOK.dim;
  const labelColor = done ? TOK.muted : TOK.dim;
  const typed = set.setType !== "normal";
  return (
    <button onClick={done ? undefined : onTap} disabled={done} style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 12, width: "100%", height: 56, padding: "0 16px", background: "transparent", border: "none", textAlign: "left", cursor: done ? "default" : "pointer", fontFamily: "inherit" }}>
      <span className="tnum" style={{ color: typed ? setColor(set.setType) : done ? TOK.muted : TOK.dim, fontSize: 13, fontWeight: typed ? 700 : 500 }}>{setMark(set.setType, idx)}</span>
      <span className="tnum" style={{ color: numColor, fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>
        {fmtW(set.weight)}
        {set.weight != null && <span style={{ color: labelColor, fontSize: 12, marginLeft: 4, fontWeight: 400 }}>kg</span>}
      </span>
      <span className="tnum" style={{ color: numColor, fontSize: 17, fontWeight: 500 }}>
        {set.reps != null ? set.reps : "—"}
        {set.partials ? <span style={{ color: setColor("partial"), fontSize: 12, marginLeft: 2, fontWeight: 600 }}>+{set.partials}</span> : null}
        {set.reps != null && <span style={{ color: labelColor, fontSize: 12, marginLeft: 4, fontWeight: 400 }}>Wdh</span>}
      </span>
      <span style={{ display: "flex", justifyContent: "flex-end" }}>
        {set.rir != null ? (
          <span className="tnum" style={{ minWidth: 22, height: 22, padding: "0 6px", borderRadius: 999, background: rirColor(set.rir), color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{set.rir}</span>
        ) : null}
      </span>
      <span style={{ display: "flex", justifyContent: "flex-end" }}>
        {done ? (
          <span className="gym-pop" style={{ width: 24, height: 24, borderRadius: 999, background: accentHex, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.Check size={14} color={accentInk} />
          </span>
        ) : (
          <span style={{ width: 22, height: 22, borderRadius: 999, border: `1.5px solid ${TOK.dim}` }} />
        )}
      </span>
    </button>
  );
}

function CoachBox({ idx, suggestion, onLog, onAdjust }: { idx: number; suggestion: Suggestion; onLog: () => void; onAdjust: () => void }) {
  return (
    <div style={{ border: `1px solid ${TOK.accent}`, background: TOK.accentSoft, borderRadius: 18, margin: "6px 12px 12px", overflow: "hidden" }}>
      <button onClick={onAdjust} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "13px 16px 12px", fontFamily: "inherit" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TOK.accent }}>Coach-Vorschlag</div>
        <div style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "baseline", gap: 12, marginTop: 9 }}>
          <span className="tnum" style={{ color: TOK.muted, fontSize: 13, fontWeight: 500 }}>{idx}</span>
          <span className="tnum" style={{ color: TOK.text, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {fmtW(suggestion.weight)}
            <span style={{ color: TOK.muted, fontSize: 12, marginLeft: 4, fontWeight: 400 }}>kg</span>
          </span>
          <span className="tnum" style={{ color: TOK.text, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {suggestion.reps}
            <span style={{ color: TOK.muted, fontSize: 12, marginLeft: 4, fontWeight: 400 }}>Wdh</span>
          </span>
          <span className="tnum" style={{ color: TOK.muted, fontSize: 13, textAlign: "right" }}>{suggestion.rir} RIR</span>
          <span />
        </div>
      </button>
      <div style={{ padding: "0 12px 12px" }}>
        <button onClick={onLog} style={{ width: "100%", height: 48, background: TOK.accent, color: TOK.accentInk, border: "none", borderRadius: 14, fontFamily: "inherit", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Satz loggen <I.ArrowR size={15} color={TOK.accentInk} />
        </button>
      </div>
    </div>
  );
}

// ── Set logger sheet ────────────────────────────────────────────
const stepBtn: React.CSSProperties = { width: 64, background: TOK.surface, border: "none", borderRadius: 16, color: TOK.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" };
function Stepper({ label, unit, value, step, onChange, onTapValue }: { label: string; unit?: string; value: number; step: number; onChange: (v: number) => void; onTapValue?: () => void }) {
  const display = Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, "");
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ ...colHead, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))} style={stepBtn}>
          <I.Minus size={20} color={TOK.text} />
        </button>
        <button onClick={onTapValue} disabled={!onTapValue} style={{ flex: 1, height: 76, background: TOK.surface, border: "none", borderRadius: 16, color: TOK.text, fontFamily: "inherit", cursor: onTapValue ? "pointer" : "default", display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
          <span className="tnum" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em" }}>{display}</span>
          {unit && <span style={{ fontSize: 14, color: TOK.muted, fontWeight: 500 }}>{unit}</span>}
        </button>
        <button onClick={() => onChange(+(value + step).toFixed(2))} style={stepBtn}>
          <I.Plus size={20} color={TOK.text} />
        </button>
      </div>
    </div>
  );
}

function SetLoggerSheet({
  open,
  draft,
  accentHex,
  accentInk,
  onClose,
  onChange,
  onLog,
  onPlates,
}: {
  open: boolean;
  draft: { exKey: string; setId: string; weight: number; reps: number; rir: number; partials: number | null; setType: SetType } | null;
  accentHex: string;
  accentInk: string;
  onClose: () => void;
  onChange: (d: { exKey: string; setId: string; weight: number; reps: number; rir: number; partials: number | null; setType: SetType }) => void;
  onLog: () => void;
  onPlates: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      {draft && (
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: TOK.text, letterSpacing: "-0.01em" }}>Satz loggen</div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: TOK.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>Abbrechen</button>
          </div>
          {/* Set-type selector */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", margin: "14px -20px 0", padding: "0 20px 2px" }}>
            {SET_TYPES.map((t) => {
              const sel = draft.setType === t.id;
              return (
                <button key={t.id} onClick={() => onChange({ ...draft, setType: t.id })} style={{
                  flexShrink: 0, height: 34, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
                  background: sel ? (t.id === "normal" ? TOK.text : t.color) : TOK.surface,
                  border: sel ? "none" : `1px solid ${TOK.border}`,
                  color: sel ? (t.id === "normal" ? "var(--c-primary-ink)" : "#fff") : TOK.muted,
                }}>{t.label}</button>
              );
            })}
          </div>
          <Stepper label="Gewicht" unit="kg" value={draft.weight} step={2.5} onChange={(v) => onChange({ ...draft, weight: v })} onTapValue={onPlates} />
          <Stepper label="Wiederholungen" value={draft.reps} step={1} onChange={(v) => onChange({ ...draft, reps: v })} />
          {draft.setType === "partial" && (
            <Stepper label="Partial-Wdh" value={draft.partials ?? 0} step={1} onChange={(v) => onChange({ ...draft, partials: Math.max(0, v) })} />
          )}
          <Stepper label="RIR · Wdh in Reserve" value={draft.rir} step={1} onChange={(v) => onChange({ ...draft, rir: Math.max(0, Math.min(10, v)) })} />
          <button onClick={onLog} style={{ width: "100%", height: 56, marginTop: 22, background: accentHex, color: accentInk, border: "none", borderRadius: 24, fontFamily: "inherit", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Satz speichern <I.ArrowR size={16} color={accentInk} />
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ── Plate calculator ────────────────────────────────────────────
const PLATES = [
  { kg: 25, color: "#ef4444" },
  { kg: 20, color: "#3b82f6" },
  { kg: 15, color: "#facc15" },
  { kg: 10, color: "#22c55e" },
  { kg: 5, color: "#fafafa" },
  { kg: 2.5, color: "#71717a" },
  { kg: 1.25, color: "#52525b" },
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
          <Tnum style={{ fontSize: 26, fontWeight: 600, color: accentHex }}>
            {fmtW(weight)}<span style={{ fontSize: 14, color: TOK.muted, marginLeft: 4, fontWeight: 400 }}>kg</span>
          </Tnum>
        </div>
        <div style={{ background: TOK.bg, borderRadius: 12, padding: "24px 16px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 150 }}>
          {perSide <= 0 ? (
            <div style={{ color: TOK.dim, fontSize: 13 }}>Nur Stange</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {plates.map((p, i) => (
                <div key={i} className="tnum" style={{ width: Math.max(14, 10 + p.kg * 0.6), height: Math.max(60, 50 + p.kg * 2.5), borderRadius: 3, background: p.color, border: p.color === "#fafafa" ? "1px solid #d4d4d8" : "none", display: "flex", alignItems: "center", justifyContent: "center", color: p.color === "#facc15" || p.color === "#fafafa" ? "#0a0a0a" : "#fff", fontSize: 9, fontWeight: 700 }}>
                  {p.kg}
                </div>
              ))}
              <div style={{ width: 56, height: 8, background: "#3f3f46", marginLeft: 4, borderRadius: 2 }} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {[...counts.values()].map((p) => (
            <div key={p.kg} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: TOK.surface, borderRadius: 8, fontSize: 12, color: TOK.text }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, border: p.color === "#fafafa" ? "1px solid #d4d4d8" : "none" }} />
              <Tnum>{p.count} × {p.kg}</Tnum>
            </div>
          ))}
          {rem > 0.01 && <div style={{ padding: "6px 10px", background: "rgba(239,68,68,0.15)", color: TOK.fail, borderRadius: 8, fontSize: 12 }}>−{rem.toFixed(2)} kg zu wenig</div>}
        </div>
        <button onClick={onClose} style={{ width: "100%", height: 52, marginTop: 18, background: TOK.surface, color: TOK.text, border: "none", borderRadius: 24, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Fertig</button>
      </div>
    </Sheet>
  );
}

// ── Rest timer bar ──────────────────────────────────────────────
const timerBtn: React.CSSProperties = { flex: 1, height: 38, borderRadius: 12, background: TOK.surface, color: TOK.text, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
function RestTimerBar({ timer, accentHex, accentInk, onAdjust, onSkip }: { timer: { total: number; remaining: number }; accentHex: string; accentInk: string; onAdjust: (d: number) => void; onSkip: () => void }) {
  const done = timer.remaining <= 0;
  const pct = timer.total > 0 ? Math.max(0, Math.min(1, timer.remaining / timer.total)) : 0;
  return (
    <div style={{ position: "absolute", left: 12, right: 12, bottom: 96, zIndex: 35, background: TOK.surface, borderRadius: 18, padding: "12px 14px 14px", boxShadow: `0 16px 50px ${TOK.shadow}`, border: `1px solid ${done ? TOK.pr : TOK.border}`, animation: "gymUp 280ms cubic-bezier(0.22,1,0.36,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: done ? TOK.pr : accentHex }}>
          {done ? "Pause vorbei — nächster Satz" : "Pause"}
        </span>
        <Tnum style={{ fontSize: 24, fontWeight: 600, color: TOK.text, letterSpacing: "-0.02em" }}>{mmss(Math.max(0, timer.remaining))}</Tnum>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: TOK.bg, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, background: done ? TOK.pr : accentHex, borderRadius: 999, transition: "width 1s linear" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onAdjust(-15)} style={timerBtn}>−15s</button>
        <button onClick={() => onAdjust(15)} style={timerBtn}>+15s</button>
        <button onClick={onSkip} style={{ ...timerBtn, background: accentHex, color: accentInk }}>{done ? "Schließen" : "Überspringen"}</button>
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
