"use client";
// Program — the MacroFactor Workouts "Workout / Build Programs" screen: the active
// program with horizontal day tabs (Workout A / B / …), a gym-profile pill row,
// then the selected day's Target-Muscle anatomy cards + exercise list (photos,
// per-set rep-range with colour-coded RIR target) and a Start button.
import React from "react";
import { useApp } from "../app-context";
import {
  fetchActiveWorkoutProgram, fetchWorkoutProgramFull,
  type ActiveProgram, type ProgramFull,
} from "@/lib/data";
import { TOK, TYPE, Tnum, I, Btn, EmptyState, rirColor } from "@/lib/design";
import { loadExerciseDB } from "@/lib/exercise-db";
import { IllPlanet } from "@/lib/illustrations";
import MuscleThumb from "../MuscleThumb";

const DOW = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function repLabel(min: number | null, max: number | null) {
  if (min && max) return min === max ? `${min} Wdh` : `${min}–${max} Wdh`;
  if (min) return `${min}+ Wdh`;
  return "— Wdh";
}

export default function Program() {
  const { db, userId, exMap, goto, startWorkout, restartOnboarding } = useApp();
  const [active, setActive] = React.useState<ActiveProgram | null>(null);
  const [full, setFull] = React.useState<ProgramFull | null>(null);
  const [dayId, setDayId] = React.useState<string | null>(null);
  const [images, setImages] = React.useState<Record<string, string | null>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const a = await fetchActiveWorkoutProgram(db, userId);
        setActive(a);
        if (a) {
          const f = await fetchWorkoutProgramFull(db, a.program.id);
          setFull(f);
          setDayId(f?.program_workouts[0]?.id ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [db, userId]);

  const days = full?.program_workouts ?? [];
  const day = days.find((d) => d.id === dayId) ?? days[0] ?? null;

  React.useEffect(() => {
    if (!day) return;
    loadExerciseDB().then((dbx) => {
      const m: Record<string, string | null> = {};
      for (const e of day.program_exercises) {
        const nm = exMap[e.exercise_id]?.name;
        if (nm) m[e.exercise_id] = dbx[nm]?.image ?? null;
      }
      setImages((prev) => ({ ...prev, ...m }));
    });
  }, [day, exMap]);

  const muscles = React.useMemo(() => {
    if (!day) return [] as { muscle: string; exercises: number; sets: number }[];
    const agg: Record<string, { exercises: number; sets: number }> = {};
    for (const e of day.program_exercises) {
      const m = exMap[e.exercise_id]?.primary_muscle ?? "Andere";
      if (!agg[m]) agg[m] = { exercises: 0, sets: 0 };
      agg[m].exercises += 1;
      agg[m].sets += e.target_sets || 0;
    }
    return Object.entries(agg).map(([m, v]) => ({ muscle: m, ...v })).sort((a, b) => b.sets - a.sets);
  }, [day, exMap]);

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  if (!active || !full || !day) {
    return (
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 32 }}>
        <div style={{ padding: "8px 16px 4px", ...TYPE.h1, color: TOK.text }}>Training</div>
        <EmptyState
          icon={<IllPlanet size={72} />}
          title="Kein aktives Programm"
          description="Lass dir ein wissenschaftlich fundiertes Programm generieren — oder erstelle ein eigenes Workout."
          cta={<Btn variant="primary" onClick={restartOnboarding}>Programm generieren</Btn>}
        />
        <div style={{ padding: "8px 12px" }}>
          <button onClick={() => goto("routines")} style={linkRow}>Eigene Workouts <I.ChevR size={15} color={TOK.dim} /></button>
          <button onClick={() => goto("library")} style={linkRow}>Übungs-Bibliothek <I.ChevR size={15} color={TOK.dim} /></button>
        </div>
      </div>
    );
  }

  const curWeek = full.program_weeks.find((w) => w.week_number === active.userProgram.current_week);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 6px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TYPE.h2, color: TOK.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active.program.name}</div>
          <Tnum style={{ fontSize: 12, color: TOK.dim }}>Woche {active.userProgram.current_week}/{active.program.duration_weeks}{curWeek?.is_deload ? " · Deload" : ""}</Tnum>
        </div>
        <button onClick={restartOnboarding} style={{ ...iconBtn }} aria-label="Programm-Einstellungen"><I.More size={20} color={TOK.muted} /></button>
      </div>

      {/* Day tabs */}
      <div style={{ display: "flex", gap: 18, overflowX: "auto", padding: "4px 16px 0", borderBottom: `1px solid ${TOK.border}` }}>
        {days.map((w) => {
          const sel = w.id === day.id;
          return (
            <button key={w.id} onClick={() => setDayId(w.id)} style={{ position: "relative", flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 0 12px", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: sel ? TOK.text : TOK.dim, whiteSpace: "nowrap" }}>
              {w.name}
              {sel && <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, background: TOK.text }} />}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 110px" }}>
        {/* gym profile / actions pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
          <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${TOK.border}`, fontSize: 12.5, fontWeight: 600, color: TOK.text }}><I.Dumbbell size={14} color={TOK.muted} /> Standard-Gym</span>
          <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${TOK.border}`, fontSize: 12.5, fontWeight: 600, color: TOK.muted }}>{DOW[day.day_of_week] ?? "—"}</span>
        </div>

        {/* Target muscles */}
        {muscles.length > 0 && (
          <>
            <div style={{ ...TYPE.eyebrow, color: TOK.dim, margin: "0 2px 10px" }}>Zielmuskeln</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px 18px", padding: "0 16px 4px" }}>
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

        {/* Exercises */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 2px 12px" }}>
          <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{day.program_exercises.length} Übungen</div>
        </div>
        {day.program_exercises.map((e) => {
          const ex = exMap[e.exercise_id];
          const rir = e.target_rir ?? 2;
          const tags = [ex?.primary_muscle, ...(ex?.secondary_muscles ?? [])].filter(Boolean).slice(0, 4) as string[];
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
                <button onClick={() => goto("exercise-detail", e.exercise_id)} style={{ ...iconBtn, width: 30, height: 30 }} aria-label="Info"><I.ChevR size={16} color={TOK.dim} /></button>
              </div>
              <div>
                {Array.from({ length: Math.max(1, e.target_sets || 1) }, (_, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr 26px", alignItems: "center", gap: 10, height: 32, borderTop: i === 0 ? `1px solid ${TOK.border}` : "none" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: TOK.surface2, fontSize: 11, fontWeight: 700, color: TOK.muted }}><span className="tnum">{i + 1}</span></span>
                    <Tnum style={{ fontSize: 13.5, color: TOK.text, fontWeight: 500 }}>{repLabel(e.target_reps_min, e.target_reps_max)}</Tnum>
                    <span className="tnum" style={{ justifySelf: "end", width: 24, height: 24, borderRadius: 999, background: rirColor(rir), color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} title="RIR-Ziel">{rir}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* secondary links */}
        <button onClick={() => goto("routines")} style={linkRow}>Eigene Workouts <I.ChevR size={15} color={TOK.dim} /></button>
        <button onClick={() => goto("library")} style={linkRow}>Übungs-Bibliothek <I.ChevR size={15} color={TOK.dim} /></button>
        <button onClick={restartOnboarding} style={linkRow}>Programm neu generieren <I.ChevR size={15} color={TOK.dim} /></button>
      </div>

      {/* Pinned start */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 16px 26px", background: "linear-gradient(to bottom, transparent 0%, var(--c-bg) 45%)" }}>
        <button onClick={() => startWorkout({ routineId: null, name: day.name, programWorkoutId: day.id })} style={{ width: "100%", height: 56, background: TOK.text, color: "var(--c-bg)", border: "none", borderRadius: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {day.name} starten <I.ArrowR size={16} color="var(--c-bg)" />
        </button>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const linkRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 6px", background: "transparent", border: "none", borderTop: `1px solid ${TOK.border}`, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: TOK.text, textAlign: "left" };

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
