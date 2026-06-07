"use client";
import React from "react";
import { useApp } from "../app-context";
import {
  fetchActiveWorkoutProgram, fetchWorkoutProgramFull,
  type ActiveProgram, type ProgramFull, type ProgramWorkoutFull,
} from "@/lib/data";
import { TOK, TYPE, Tnum, I, ScreenHeader, SectionHeader, Card, Row, Divider, Btn, EmptyState } from "@/lib/design";
import { IllPlanet } from "@/lib/illustrations";

const DOW = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default function Program() {
  const { db, userId, exMap, goto, startWorkout } = useApp();
  const [active, setActive] = React.useState<ActiveProgram | null>(null);
  const [full, setFull] = React.useState<ProgramFull | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const a = await fetchActiveWorkoutProgram(db, userId);
        setActive(a);
        if (a) setFull(await fetchWorkoutProgramFull(db, a.program.id));
      } finally {
        setLoading(false);
      }
    })();
  }, [db, userId]);

  const startDay = (w: ProgramWorkoutFull) =>
    startWorkout({ routineId: null, name: w.name, programWorkoutId: w.id });

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 32 }}>
      <ScreenHeader large title="Training" />

      {loading ? (
        <div style={{ padding: "8px 16px", color: TOK.dim, fontSize: 13 }}>Lädt…</div>
      ) : active && full ? (
        <>
          {/* Active program card */}
          <div style={{ margin: "0 12px 8px", borderRadius: 20, padding: "18px", background: `linear-gradient(150deg, ${TOK.accentSoft}, ${TOK.surface} 70%)`, border: `1px solid ${TOK.border}` }}>
            <div style={{ ...TYPE.eyebrow, color: TOK.accent }}>AKTIVES PROGRAMM</div>
            <div style={{ ...TYPE.h2, color: TOK.text, marginTop: 8 }}>{active.program.name}</div>
            {active.program.description && (
              <div style={{ ...TYPE.caption, color: TOK.muted, marginTop: 6 }}>{active.program.description}</div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
              <Metric label="Woche" value={`${active.userProgram.current_week}/${active.program.duration_weeks}`} />
              <Metric label="Tage/Wo." value={String(active.program.days_per_week)} />
              <Metric label="Workouts" value={String(full.program_workouts.length)} />
            </div>
            {full.program_weeks.find((w) => w.week_number === active.userProgram.current_week)?.is_deload && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 10, background: TOK.surface2, ...TYPE.caption, color: "var(--c-set-warmup)" }}>
                Deload-Woche — reduziertes Volumen zur Erholung.
              </div>
            )}
          </div>

          <SectionHeader title="Wöchentlicher Plan" style={{ padding: "16px 14px 8px" }} />
          <div style={{ padding: "0 12px" }}>
            {full.program_workouts.map((w) => {
              const muscles = Array.from(
                new Set(w.program_exercises.map((e) => exMap[e.exercise_id]?.primary_muscle).filter(Boolean) as string[]),
              ).slice(0, 4);
              return (
                <div key={w.id} style={{ background: TOK.surface, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: TOK.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TOK.accent }}>{DOW[w.day_of_week] ?? "—"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: TOK.muted, marginTop: 2 }}>
                        <Tnum>{w.program_exercises.length} Übungen</Tnum>
                      </div>
                    </div>
                    <Btn size="sm" variant="primary" onClick={() => startDay(w)}>Start</Btn>
                  </div>
                  {muscles.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                      {muscles.map((m) => (
                        <span key={m} style={{ fontSize: 11, color: TOK.muted, background: TOK.surface2, borderRadius: 6, padding: "3px 8px" }}>{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<IllPlanet size={72} />}
          title="Kein aktives Programm"
          description="Erstelle ein eigenes Workout oder lass dir ein Programm generieren."
          cta={<Btn variant="primary" onClick={() => goto("routine-editor")}>Workout erstellen</Btn>}
        />
      )}

      {/* Secondary entry points */}
      <SectionHeader title="Mehr" style={{ padding: "20px 14px 8px" }} />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row label="Eigene Workouts" sublabel="Manuelle Routinen" chevron onTap={() => goto("routines")} />
        <Divider />
        <Row label="Übungs-Bibliothek" sublabel="900+ Übungen & How-to" chevron onTap={() => goto("library")} />
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Tnum style={{ fontSize: 18, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em" }}>{value}</Tnum>
      <div style={{ ...TYPE.col, color: TOK.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
}
