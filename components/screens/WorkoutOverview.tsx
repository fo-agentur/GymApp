"use client";
// WorkoutOverview — the MacroFactor Workouts "Workout A" screen: a pre-planned
// session you review before training. Target-muscle summary + every set laid out
// with its rep-range and RIR target, then Start Workout.
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutine, type RoutineFull, type RoutineExRow } from "@/lib/data";
import { TOK, TYPE, Tnum, I, MACRO } from "@/lib/design";
import { heatColor } from "@/lib/muscles";

// RIR target → colour (MacroFactor: 0 = red/hard, ~2 = amber, 3+ = green/easy).
function rirColor(rir: number): string {
  if (rir <= 0) return TOK.fail;
  if (rir <= 2) return MACRO.fat;
  return MACRO.carbs;
}
function repLabel(ex: RoutineExRow): string {
  const lo = ex.target_reps_min, hi = ex.target_reps_max;
  if (lo && hi) return lo === hi ? `${lo} Wdh` : `${lo}–${hi} Wdh`;
  if (lo) return `${lo}+ Wdh`;
  return "— Wdh";
}

export default function WorkoutOverview() {
  const { db, params, exMap, goto, startWorkout } = useApp();
  const [routine, setRoutine] = React.useState<RoutineFull | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        if (params.routineId) setRoutine(await fetchRoutine(db, params.routineId));
      } finally {
        setLoading(false);
      }
    })();
  }, [db, params.routineId]);

  const exs = routine?.routine_exercises ?? [];
  const totalSets = exs.reduce((n, e) => n + (e.target_sets || 0), 0);
  const estMin = Math.max(15, Math.round(totalSets * 3.5));

  // Target muscles: group by primary muscle → exercises + sets.
  const muscles = React.useMemo(() => {
    const agg: Record<string, { exercises: number; sets: number }> = {};
    for (const e of exs) {
      const m = exMap[e.exercise_id]?.primary_muscle ?? "Andere";
      if (!agg[m]) agg[m] = { exercises: 0, sets: 0 };
      agg[m].exercises += 1;
      agg[m].sets += e.target_sets || 0;
    }
    return Object.entries(agg).map(([m, v]) => ({ muscle: m, ...v })).sort((a, b) => b.sets - a.sets);
  }, [exs, exMap]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px", minHeight: 52 }}>
        <button onClick={() => goto("routines")} style={{ width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TOK.text }}>
          <I.ChevL size={20} color={TOK.text} />
        </button>
        <div style={{ flex: 1, ...TYPE.cardTitle, color: TOK.text, textAlign: "center" }}>{routine?.name ?? "Workout"}</div>
        <button onClick={() => routine && goto("routine-editor", routine.id)} style={{ width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TOK.muted }}>
          <I.Edit size={18} color={TOK.muted} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 110px" }}>
        {loading ? (
          <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>
        ) : !routine ? (
          <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Workout nicht gefunden.</div>
        ) : (
          <>
            {/* Target muscles */}
            {muscles.length > 0 && (
              <>
                <div style={{ ...TYPE.eyebrow, color: TOK.dim, margin: "8px 2px 10px" }}>Zielmuskeln</div>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px 8px", padding: "0 16px 4px" }}>
                  {muscles.map((m) => (
                    <div key={m.muscle} style={{ flexShrink: 0, minWidth: 150, background: TOK.surface, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: heatColor(Math.min(1, m.sets / 12)), flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...TYPE.bodyEm, color: TOK.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.muscle}</div>
                        <Tnum style={{ fontSize: 11, color: TOK.dim }}>{m.exercises} Üb. · {m.sets} Sätze</Tnum>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Exercise count + est time */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "18px 2px 12px" }}>
              <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{exs.length} Übungen</div>
              <Tnum style={{ fontSize: 12, color: TOK.dim }}>~{estMin} Min</Tnum>
            </div>

            {exs.length === 0 ? (
              <div style={{ color: TOK.dim, fontSize: 13, padding: "8px 2px" }}>Noch keine Übungen. Tippe oben rechts auf Bearbeiten.</div>
            ) : (
              exs.map((e) => {
                const ex = exMap[e.exercise_id];
                const rir = e.target_rir ?? 2;
                const secondary = ex?.secondary_muscles ?? [];
                const tags = [ex?.primary_muscle, ...secondary].filter(Boolean).slice(0, 4) as string[];
                return (
                  <div key={e.id} style={{ background: TOK.surface, borderRadius: 16, padding: "14px 14px 12px", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: TOK.surface2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: TOK.muted, fontSize: 16, fontWeight: 600 }}>
                        {(ex?.name?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, ...TYPE.bodyEm, color: TOK.text }}>{ex?.name ?? "Übung"}</div>
                    </div>
                    {/* Planned sets */}
                    <div>
                      {Array.from({ length: Math.max(1, e.target_sets || 1) }, (_, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr 26px", alignItems: "center", gap: 10, height: 30 }}>
                          <Tnum style={{ fontSize: 12, color: TOK.dim, fontWeight: 600 }}>{i + 1}</Tnum>
                          <Tnum style={{ fontSize: 14, color: TOK.text, fontWeight: 500 }}>{repLabel(e)}</Tnum>
                          <span style={{ justifySelf: "end", width: 24, height: 24, borderRadius: 999, background: rirColor(rir), color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} title="RIR">{rir}</span>
                        </div>
                      ))}
                    </div>
                    {tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {tags.map((t) => (
                          <span key={t} style={{ fontSize: 11, color: TOK.muted, background: TOK.surface2, borderRadius: 6, padding: "3px 8px" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Pinned Start */}
      {routine && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 16px 26px", background: "linear-gradient(to bottom, transparent 0%, var(--c-bg) 45%)" }}>
          <button
            onClick={() => startWorkout({ routineId: routine.id, name: routine.name })}
            style={{ width: "100%", height: 56, background: TOK.text, color: TOK.bg, border: "none", borderRadius: 24, fontFamily: "inherit", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            Workout starten <I.ArrowR size={16} color={TOK.bg} />
          </button>
        </div>
      )}
    </div>
  );
}
