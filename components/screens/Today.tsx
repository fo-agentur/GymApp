"use client";
// Today — the dashboard: this week's training at a glance (day strip + key
// numbers), a body-map snapshot of trained muscles, quick-start for your
// routines and the most recent sessions.
import React from "react";
import { useApp } from "../app-context";
import { fetchSessions, fetchRoutines, weeklyMuscleSets, type RoutineFull } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, I, SectionHeader, SessionRow, EmptyState, WeekStrip, fmtVol, hmm } from "@/lib/design";
import type { MuscleGroup } from "@/lib/muscles";
import MuscleMap from "../MuscleMap";

const DAY_MS = 24 * 3600 * 1000;

function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("de-DE", { weekday: "short" }).toUpperCase().replace(".", ""), day: d.getDate() };
}

export default function Today() {
  const { db, username, exMap, goto, startWorkout, accent } = useApp();
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [muscleSets, setMuscleSets] = React.useState<Partial<Record<MuscleGroup, number>>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([fetchSessions(db), fetchRoutines(db)]);
        setSessions(s);
        setRoutines(r);
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  // Muscle snapshot needs the exercise map — load when it is ready.
  React.useEffect(() => {
    if (!Object.keys(exMap).length) return;
    weeklyMuscleSets(db, exMap).then(setMuscleSets).catch(() => {});
  }, [db, exMap]);

  const now = new Date();
  const thisWeek = sessions.filter((s) => now.getTime() - new Date(s.started_at).getTime() < 7 * DAY_MS);
  const weekVolume = thisWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const weekSets = thisWeek.reduce((n, s) => n + (s.total_sets ?? 0), 0);
  const weekMins = Math.round(thisWeek.reduce((n, s) => n + (s.duration_seconds ?? 0), 0) / 60);
  const trainedDays = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
  const anyMuscle = Object.values(muscleSets).some((v) => (v ?? 0) > 0);

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 96px" }}>
      {/* Header */}
      <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>
        {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
      </div>
      <div style={{ ...TYPE.display, color: TOK.text, marginTop: 4 }}>Hey {username}</div>

      {/* This week */}
      <div style={{ marginTop: 16, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 20, padding: "18px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ ...TYPE.cardTitle, color: TOK.text }}>Diese Woche</div>
          <Tnum style={{ fontSize: 12, color: TOK.dim }}>{thisWeek.length} {thisWeek.length === 1 ? "Workout" : "Workouts"}</Tnum>
        </div>
        <WeekStrip trained={trainedDays} accent={accent} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <WeekStat label="Sätze" value={String(weekSets)} />
          <WeekStat label="Volumen" value={fmtVol(weekVolume)} unit="kg" />
          <WeekStat label="Zeit" value={hmm(weekMins)} />
        </div>
      </div>

      {/* Muscle snapshot */}
      {anyMuscle && (
        <button onClick={() => goto("progress")} style={{ width: "100%", marginTop: 12, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 20, padding: "16px 16px 8px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ ...TYPE.cardTitle, color: TOK.text }}>Trainierte Muskeln</div>
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600, color: TOK.dim }}>Details <I.ChevR size={13} color={TOK.dim} /></span>
          </div>
          <div style={{ padding: "4px 0 8px" }}>
            <MuscleMap sets={muscleSets} height={250} labels={false} />
          </div>
        </button>
      )}

      {/* Quick start */}
      <SectionHeader title="Schnellstart" style={{ padding: "24px 2px 8px" }} action={
        routines.length > 0 ? <button onClick={() => goto("routines")} style={linkBtn}>Alle<I.ChevR size={12} color={TOK.dim} /></button> : undefined
      } />
      {routines.length === 0 ? (
        <button onClick={() => goto("routine-editor")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: TOK.surface, border: `1.5px dashed ${TOK.border}`, borderRadius: 16, padding: "16px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: TOK.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I.Plus size={18} color={TOK.text} w={2} />
          </div>
          <div>
            <div style={{ ...TYPE.bodyEm, color: TOK.text }}>Erste Routine erstellen</div>
            <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>Eigener Plan mit Übungen, Sätzen & Pausen</div>
          </div>
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {routines.slice(0, 3).map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 16, padding: "12px 12px 12px 16px" }}>
              <button onClick={() => goto("workout-overview", r.id)} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0, WebkitTapHighlightColor: "transparent" }}>
                <div style={{ ...TYPE.bodyEm, color: TOK.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <Tnum style={{ fontSize: 12, color: TOK.dim, marginTop: 2, display: "block" }}>{r.routine_exercises.length} Übungen</Tnum>
              </button>
              <button onClick={() => startWorkout({ routineId: r.id, name: r.name })} style={{ flexShrink: 0, height: 38, padding: "0 16px", borderRadius: 999, background: accent.hex, color: accent.ink, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}>
                Start <I.ArrowR size={13} color={accent.ink} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent */}
      <SectionHeader title="Zuletzt" style={{ padding: "24px 2px 8px" }} action={
        sessions.length > 0 ? <button onClick={() => goto("history")} style={linkBtn}>Historie<I.ChevR size={12} color={TOK.dim} /></button> : undefined
      } />
      {sessions.length === 0 ? (
        <EmptyState icon={<I.History size={20} />} title="Noch keine Workouts" description="Starte dein erstes Training über den + Button unten." />
      ) : (
        <div style={{ margin: "0 -16px" }}>
          {sessions.slice(0, 4).map((s) => (
            <SessionRow
              key={s.id}
              onTap={() => goto("session-detail", s.id)}
              datePill={datePill(s.started_at)}
              routine={s.name ?? "Workout"}
              duration={hmm(Math.round((s.duration_seconds ?? 0) / 60))}
              volume={`${fmtVol(s.total_volume_kg ?? 0)} kg`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 2, background: "transparent", border: "none",
  cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: TOK.dim, padding: 0,
};

function WeekStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ flex: 1, background: TOK.surface2, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <Tnum style={{ fontSize: 18, fontWeight: 800, color: TOK.text, letterSpacing: "-0.02em" }}>{value}</Tnum>
        {unit && <span style={{ fontSize: 11, color: TOK.muted, fontWeight: 600 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: TOK.dim, marginTop: 3 }}>{label}</div>
    </div>
  );
}
