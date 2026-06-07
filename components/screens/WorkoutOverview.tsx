"use client";
// WorkoutOverview — the MacroFactor Workouts "Workout A" screen: a pre-planned
// session you review before training. Target-muscle anatomy cards + every
// exercise with a photo, its planned sets (rep-range + colour-coded RIR target)
// and muscle tags, then a black Start Workout button. Works for both a saved
// routine (params.routineId) and a program day (params.programWorkoutId).
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutine, fetchProgramWorkoutExercises } from "@/lib/data";
import { TOK, TYPE, Tnum, I, rirColor } from "@/lib/design";
import { loadExerciseDB } from "@/lib/exercise-db";
import MuscleThumb from "../MuscleThumb";

type PlanRow = {
  id: string;
  exercise_id: string;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_rir: number | null;
};

function repLabel(e: PlanRow): string {
  const lo = e.target_reps_min, hi = e.target_reps_max;
  if (lo && hi) return lo === hi ? `${lo} Wdh` : `${lo}–${hi} Wdh`;
  if (lo) return `${lo}+ Wdh`;
  return "— Wdh";
}

export default function WorkoutOverview() {
  const { db, params, exMap, goto, startWorkout } = useApp();
  const [name, setName] = React.useState("Workout");
  const [rows, setRows] = React.useState<PlanRow[]>([]);
  const [images, setImages] = React.useState<Record<string, string | null>>({});
  const [loading, setLoading] = React.useState(true);
  const source = params.programWorkoutId
    ? { kind: "program" as const, id: params.programWorkoutId }
    : { kind: "routine" as const, id: params.routineId };

  React.useEffect(() => {
    (async () => {
      try {
        if (source.kind === "program" && source.id) {
          const [pexs, { data: pw }] = await Promise.all([
            fetchProgramWorkoutExercises(db, source.id),
            db.from("program_workouts").select("name").eq("id", source.id).maybeSingle(),
          ]);
          setName(pw?.name ?? "Workout");
          setRows(pexs.map((e) => ({ id: e.id, exercise_id: e.exercise_id, target_sets: e.target_sets, target_reps_min: e.target_reps_min, target_reps_max: e.target_reps_max, target_rir: e.target_rir })));
        } else if (source.id) {
          const routine = await fetchRoutine(db, source.id);
          setName(routine?.name ?? "Workout");
          setRows((routine?.routine_exercises ?? []).map((e) => ({ id: e.id, exercise_id: e.exercise_id, target_sets: e.target_sets, target_reps_min: e.target_reps_min, target_reps_max: e.target_reps_max, target_rir: e.target_rir })));
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, params.routineId, params.programWorkoutId]);

  React.useEffect(() => {
    loadExerciseDB().then((dbx) => {
      const m: Record<string, string | null> = {};
      for (const r of rows) {
        const nm = exMap[r.exercise_id]?.name;
        if (nm) m[r.exercise_id] = dbx[nm]?.image ?? null;
      }
      setImages(m);
    });
  }, [rows, exMap]);

  const totalSets = rows.reduce((n, e) => n + (e.target_sets || 0), 0);
  const estMin = Math.max(15, Math.round(totalSets * 3.5));

  const muscles = React.useMemo(() => {
    const agg: Record<string, { exercises: number; sets: number }> = {};
    for (const e of rows) {
      const m = exMap[e.exercise_id]?.primary_muscle ?? "Andere";
      if (!agg[m]) agg[m] = { exercises: 0, sets: 0 };
      agg[m].exercises += 1;
      agg[m].sets += e.target_sets || 0;
    }
    return Object.entries(agg).map(([m, v]) => ({ muscle: m, ...v })).sort((a, b) => b.sets - a.sets);
  }, [rows, exMap]);

  const start = () => {
    if (source.kind === "program") startWorkout({ routineId: null, name, programWorkoutId: source.id });
    else if (source.id) startWorkout({ routineId: source.id, name });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px", minHeight: 52 }}>
        <button onClick={() => goto(source.kind === "program" ? "program" : "routines")} style={hIcon} aria-label="Zurück">
          <I.ChevL size={20} color={TOK.text} />
        </button>
        <div style={{ flex: 1, ...TYPE.cardTitle, color: TOK.text, textAlign: "center" }}>{name}</div>
        {source.kind === "program" ? <div style={{ width: 36 }} /> : (
          <button onClick={() => source.id && goto("routine-editor", source.id)} style={hIcon} aria-label="Bearbeiten">
            <I.Edit size={18} color={TOK.muted} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 110px" }}>
        {loading ? (
          <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Keine Übungen.</div>
        ) : (
          <>
            {/* Target muscles */}
            {muscles.length > 0 && (
              <>
                <div style={{ ...TYPE.eyebrow, color: TOK.dim, margin: "8px 2px 10px" }}>Zielmuskeln</div>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px 8px", padding: "0 16px 4px" }}>
                  {muscles.map((m) => (
                    <div key={m.muscle} style={{ flexShrink: 0, minWidth: 156, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: TOK.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MuscleThumb muscle={m.muscle} size={40} />
                      </div>
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
              <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{rows.length} Übungen</div>
              <Tnum style={{ fontSize: 12, color: TOK.dim }}>~{estMin} Min</Tnum>
            </div>

            {rows.map((e) => {
              const ex = exMap[e.exercise_id];
              const rir = e.target_rir ?? 2;
              const secondary = ex?.secondary_muscles ?? [];
              const tags = [ex?.primary_muscle, ...secondary].filter(Boolean).slice(0, 4) as string[];
              return (
                <div key={e.id} style={{ background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 16, padding: "14px 14px 12px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <ExThumb image={images[e.exercise_id] ?? null} name={ex?.name ?? "?"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TYPE.bodyEm, color: TOK.text, lineHeight: 1.2 }}>{ex?.name ?? "Übung"}</div>
                      {tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                          {tags.map((t) => (
                            <span key={t} style={{ fontSize: 10.5, color: TOK.muted, background: TOK.surface2, borderRadius: 6, padding: "2px 7px" }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => goto("exercise-detail", e.exercise_id)} style={{ ...hIcon, width: 30, height: 30 }} aria-label="Info"><I.ChevR size={16} color={TOK.dim} /></button>
                  </div>
                  {/* Planned sets */}
                  <div>
                    {Array.from({ length: Math.max(1, e.target_sets || 1) }, (_, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr 26px", alignItems: "center", gap: 10, height: 32, borderTop: i === 0 ? `1px solid ${TOK.border}` : "none" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: TOK.surface2, fontSize: 11, fontWeight: 700, color: TOK.muted }}><span className="tnum">{i + 1}</span></span>
                        <Tnum style={{ fontSize: 13.5, color: TOK.text, fontWeight: 500 }}>{repLabel(e)}</Tnum>
                        <span className="tnum" style={{ justifySelf: "end", width: 24, height: 24, borderRadius: 999, background: rirColor(rir), color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} title="RIR-Ziel">{rir}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pinned Start */}
      {!loading && rows.length > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 16px 26px", background: "linear-gradient(to bottom, transparent 0%, var(--c-bg) 45%)" }}>
          <button onClick={start} style={{ width: "100%", height: 56, background: TOK.text, color: "var(--c-bg)", border: "none", borderRadius: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Workout starten <I.ArrowR size={16} color="var(--c-bg)" />
          </button>
        </div>
      )}
    </div>
  );
}

const hIcon: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

function ExThumb({ image, name }: { image: string | null; name: string }) {
  const [ok, setOk] = React.useState(true);
  return (
    <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fff", border: `1px solid ${TOK.border}`, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {image && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" onError={() => setOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: 18, fontWeight: 800, color: TOK.dim }}>{(name?.[0] ?? "?").toUpperCase()}</span>
      )}
    </div>
  );
}
