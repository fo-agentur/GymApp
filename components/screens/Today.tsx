"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutines, fetchSessions, type RoutineFull } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, I, SectionHeader, SessionRow, EmptyState, fmtVol, hmm } from "@/lib/design";
import { useCountUp } from "@/lib/anim";

function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(), day: d.getDate() };
}

export default function Today() {
  const { db, accent, username, exMap, goto, startWorkout } = useApp();
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [r, s] = await Promise.all([fetchRoutines(db), fetchSessions(db)]);
        setRoutines(r);
        setSessions(s);
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  const suggested = routines[0] ?? null;
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  // This week's volume from real sessions
  const weekMs = 7 * 24 * 3600 * 1000;
  const thisWeek = sessions.filter((s) => now.getTime() - new Date(s.started_at).getTime() < weekMs);
  const weekVolume = thisWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const weekSets = thisWeek.reduce((n, s) => n + (s.total_sets ?? 0), 0);

  const estMin = suggested ? Math.max(20, suggested.routine_exercises.reduce((n, e) => n + e.target_sets * 3, 0)) : 0;

  // Streak = consecutive calendar days (ending today or yesterday) with a workout.
  const streak = (() => {
    const days = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
    if (days.size === 0) return 0;
    const d = new Date();
    // allow the streak to count even if today isn't trained yet
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days.has(d.toDateString())) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  })();
  const totalWorkouts = sessions.length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 28px" }}>
      {/* Coach hero */}
      <div className="gym-hero" style={{ background: TOK.surface, borderRadius: 24, padding: 22 }}>
        <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>
          {greeting}, {username} · {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </div>
        {!loading && (streak > 0 || totalWorkouts > 0) && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {streak > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: `${accent.hex}1f` }}>
                <span style={{ fontSize: 13 }}>🔥</span>
                <Tnum style={{ fontSize: 12, fontWeight: 600, color: accent.hex }}>{streak}-day streak</Tnum>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: TOK.surface2 }}>
              <Tnum style={{ fontSize: 12, fontWeight: 600, color: TOK.muted }}>{totalWorkouts} workout{totalWorkouts === 1 ? "" : "s"}</Tnum>
            </div>
          </div>
        )}
        <div style={{ fontSize: 28, fontWeight: 600, color: TOK.text, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: 12 }}>
          {suggested ? suggested.name : "Ready to train?"}
        </div>
        <div style={{ ...TYPE.body, color: TOK.muted, marginTop: 6 }}>
          {suggested
            ? `${suggested.routine_exercises.length} exercises${estMin ? ` · ~${estMin}m` : ""}`
            : "Start a session and log your sets — everything saves to your account."}
        </div>
        <div style={{ height: 1, background: TOK.border, margin: "18px 0" }} />
        <button
          onClick={() =>
            suggested
              ? startWorkout({ routineId: suggested.id, name: suggested.name })
              : startWorkout({ routineId: null, name: "Quick Workout" })
          }
          className="gym-glow"
          style={{
            width: "100%", height: 56, background: accent.hex, color: accent.ink, border: "none", borderRadius: 24,
            fontFamily: "inherit", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent",
          }}
        >
          {suggested ? "Start Workout" : "Start Empty Workout"} <I.ArrowR size={17} color={accent.ink} w={2.5} />
        </button>
        {suggested && (
          <button
            onClick={() => startWorkout({ routineId: null, name: "Quick Workout" })}
            style={{ width: "100%", marginTop: 10, background: "transparent", border: "none", color: TOK.muted, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 6 }}
          >
            or start an empty workout
          </button>
        )}
      </div>

      {/* This week */}
      <div style={{ ...TYPE.eyebrow, color: TOK.dim, margin: "26px 4px 14px" }}>This Week</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <WeekStat label="Sessions" value={thisWeek.length} />
        <WeekStat label="Volume" value={weekVolume} unit="kg" format={fmtVol} />
        <WeekStat label="Working sets" value={weekSets} />
        <WeekStat label="Routines" value={routines.length} />
      </div>

      {/* Recent */}
      <SectionHeader title="Recent" style={{ padding: "28px 4px 10px" }} />
      {loading ? (
        <div style={{ padding: "8px 4px", color: TOK.dim, fontSize: 13 }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<I.History size={20} />}
          title="No workouts yet"
          description="Start your first session above — it'll show up here once you finish."
        />
      ) : (
        <div>
          {sessions.slice(0, 6).map((s) => (
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

function WeekStat({ label, value, unit, format }: { label: string; value: number; unit?: string; format?: (n: number) => string }) {
  const v = useCountUp(value);
  const shown = format ? format(Math.round(v)) : Math.round(v).toString();
  return (
    <div style={{ padding: 14, background: TOK.surface, borderRadius: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ ...TYPE.col, color: TOK.dim }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
        <Tnum style={{ fontSize: 22, fontWeight: 600, color: TOK.text, letterSpacing: "-0.02em" }}>{shown}</Tnum>
        {unit && <span style={{ fontSize: 11, color: TOK.muted }}>{unit}</span>}
      </div>
    </div>
  );
}
