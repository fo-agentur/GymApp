"use client";
// Today — the MacroFactor Workouts "Dashboard": weekly rings (Muskeln / Sätze /
// Übungen vs. the active program's targets) + an Insights & Analytics row
// (Workouts bar spark + Gewichtstrend line), then recent sessions.
import React from "react";
import { useApp } from "../app-context";
import {
  fetchSessions, fetchWeightLogs, fetchActiveWorkoutProgram, fetchWorkoutProgramFull,
  type ProgramFull,
} from "@/lib/data";
import type { WorkoutSession, WeightLog } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, I, SectionHeader, SessionRow, EmptyState, ProgressRing, fmtVol, hmm } from "@/lib/design";
import { MiniLine } from "@/lib/charts";
import { trueWeight, latestTrendWeight, weeklyTrendChange } from "@/lib/coach";

const DAY_MS = 24 * 3600 * 1000;
type SetLite = { exercise_id: string; is_warmup: boolean; completed_at: string };

function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("de-DE", { weekday: "short" }).toUpperCase().replace(".", ""), day: d.getDate() };
}

export default function Today() {
  const { db, userId, exMap, goto } = useApp();
  const [weights, setWeights] = React.useState<WeightLog[]>([]);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [setRows, setSetRows] = React.useState<SetLite[]>([]);
  const [program, setProgram] = React.useState<ProgramFull | null>(null);
  const [basis, setBasis] = React.useState<"program" | "all">("program");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [wl, s, ap, sr] = await Promise.all([
          fetchWeightLogs(db),
          fetchSessions(db),
          fetchActiveWorkoutProgram(db, userId),
          db.from("sets").select("exercise_id,is_warmup,completed_at"),
        ]);
        setWeights(wl);
        setSessions(s);
        setSetRows((sr.data ?? []) as SetLite[]);
        if (ap) setProgram(await fetchWorkoutProgramFull(db, ap.program.id));
        else setBasis("all");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, userId, exMap]);

  const now = new Date();
  const weekStart = now.getTime() - 7 * DAY_MS;

  // ── this week's actuals from logged sets ──
  const week = React.useMemo(() => {
    const muscles = new Set<string>();
    const exercises = new Set<string>();
    let sets = 0;
    const daily = Array(7).fill(0) as number[];
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    for (const r of setRows) {
      if (r.is_warmup || !r.completed_at) continue;
      const t = new Date(r.completed_at).getTime();
      if (t < weekStart) continue;
      sets++;
      exercises.add(r.exercise_id);
      const m = exMap[r.exercise_id]?.primary_muscle;
      if (m) muscles.add(m);
      const dayIdx = 6 - Math.floor((todayStart.getTime() + DAY_MS - t) / DAY_MS);
      if (dayIdx >= 0 && dayIdx < 7) daily[dayIdx] += 1;
    }
    return { muscles: muscles.size, exercises: exercises.size, sets, daily };
  }, [setRows, exMap, weekStart]);

  // ── program-based weekly targets ──
  const targets = React.useMemo(() => {
    if (basis === "program" && program) {
      const exIds = new Set<string>();
      const mus = new Set<string>();
      let sets = 0;
      for (const w of program.program_workouts) {
        for (const pe of w.program_exercises) {
          exIds.add(pe.exercise_id);
          sets += pe.target_sets || 0;
          const m = exMap[pe.exercise_id]?.primary_muscle;
          if (m) mus.add(m);
        }
      }
      return { muscles: Math.max(1, mus.size), sets: Math.max(1, sets), exercises: Math.max(1, exIds.size) };
    }
    return { muscles: 11, sets: 60, exercises: 18 };
  }, [basis, program, exMap]);

  const thisWeekSessions = sessions.filter((s) => now.getTime() - new Date(s.started_at).getTime() < 7 * DAY_MS);
  const weekVolume = thisWeekSessions.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);

  const trendW = trueWeight(weights);
  const latestW = latestTrendWeight(trendW);
  const weeklyChange = weeklyTrendChange(trendW);

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 28px" }}>
      {/* Header */}
      <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>
        {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
      </div>
      <div style={{ ...TYPE.display, color: TOK.text, marginTop: 4 }}>Dashboard</div>

      {/* Weekly rings card */}
      <div style={{ marginTop: 16, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 20, padding: "18px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ ...TYPE.cardTitle, color: TOK.text }}>Diese Woche</div>
          <Tnum style={{ fontSize: 12, color: TOK.dim }}>{fmtVol(weekVolume)} kg Volumen</Tnum>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", gap: 4 }}>
          <Ring label="Muskeln" value={week.muscles} target={targets.muscles} color={TOK.muscle} />
          <Ring label="Sätze" value={week.sets} target={targets.sets} color={TOK.accent} />
          <Ring label="Übungen" value={week.exercises} target={targets.exercises} color="var(--c-pr)" />
        </div>
        {/* basis toggle */}
        <div style={{ display: "flex", gap: 4, marginTop: 16, padding: 3, background: TOK.surface2, borderRadius: 11 }}>
          {([["all", "Alle Workouts"], ["program", "Aktives Programm"]] as [typeof basis, string][]).map(([b, label]) => {
            const sel = basis === b;
            const disabled = b === "program" && !program;
            return (
              <button key={b} disabled={disabled} onClick={() => setBasis(b)} style={{ flex: 1, height: 32, borderRadius: 8, border: "none", background: sel ? TOK.surface : "transparent", color: disabled ? TOK.dim : sel ? TOK.text : TOK.muted, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: disabled ? "default" : "pointer", boxShadow: sel ? `0 1px 3px ${TOK.shadow}` : "none", opacity: disabled ? 0.5 : 1, WebkitTapHighlightColor: "transparent" }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* Insights & Analytics */}
      <SectionHeader title="Insights & Analytik" style={{ padding: "24px 2px 12px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Workouts spark */}
        <button onClick={() => goto("progress")} style={{ textAlign: "left", background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 16, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
          <div style={{ ...TYPE.bodyEm, color: TOK.text }}>Workouts</div>
          <div style={{ fontSize: 11, color: TOK.dim, marginBottom: 8 }}>Letzte 7 Tage</div>
          <DaySpark daily={week.daily} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
            <Tnum style={{ fontSize: 18, fontWeight: 800, color: TOK.text, letterSpacing: "-0.02em" }}>{week.sets}</Tnum>
            <span style={{ fontSize: 11, color: TOK.muted }}>Sätze</span>
          </div>
        </button>
        {/* Weight trend */}
        <button onClick={() => goto("progress")} style={{ textAlign: "left", background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 16, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
          <div style={{ ...TYPE.bodyEm, color: TOK.text }}>Gewichtstrend</div>
          <div style={{ fontSize: 11, color: TOK.dim, marginBottom: 8 }}>Letzte 7 Tage</div>
          <div style={{ height: 38 }}>
            {trendW.length > 1 ? <MiniLine data={trendW.map((p) => p.y)} color={TOK.accent} height={38} /> : <div style={{ height: 38, display: "flex", alignItems: "center", fontSize: 11, color: TOK.dim }}>Noch keine Daten</div>}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
            <Tnum style={{ fontSize: 18, fontWeight: 800, color: TOK.text, letterSpacing: "-0.02em" }}>{latestW != null ? latestW.toFixed(1) : "—"}</Tnum>
            <span style={{ fontSize: 11, color: TOK.muted }}>kg</span>
            {weeklyChange != null && <Tnum style={{ fontSize: 11, fontWeight: 700, color: weeklyChange < 0 ? "var(--c-pr)" : TOK.muted, marginLeft: 2 }}>{weeklyChange >= 0 ? "+" : ""}{weeklyChange.toFixed(2)}</Tnum>}
          </div>
        </button>
      </div>
      {/* Recent */}
      <SectionHeader title="Zuletzt" style={{ padding: "24px 2px 8px" }} action={
        sessions.length > 0 ? <button onClick={() => goto("history")} style={linkBtn}>Historie<I.ChevR size={12} color={TOK.dim} /></button> : undefined
      } />
      {sessions.length === 0 ? (
        <EmptyState icon={<I.History size={20} />} title="Noch keine Workouts" description="Starte dein erstes Training über das Training-Tab oder den + Button." />
      ) : (
        <div>
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

function Ring({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const left = Math.max(0, target - value);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <ProgressRing value={value} max={target} size={84} stroke={8} color={color}>
        <Tnum style={{ fontSize: 22, fontWeight: 800, color: TOK.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</Tnum>
        <Tnum style={{ fontSize: 10, color: TOK.dim, fontWeight: 600 }}>{left} übrig</Tnum>
      </ProgressRing>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TOK.text }}>{label}</div>
        <Tnum style={{ fontSize: 11, color: TOK.dim }}>Ziel {target}</Tnum>
      </div>
    </div>
  );
}

function DaySpark({ daily }: { daily: number[] }) {
  const max = Math.max(1, ...daily);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 38 }}>
      {daily.map((v, i) => (
        <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", height: `${Math.max(v > 0 ? 8 : 2, (v / max) * 100)}%`, background: v > 0 ? TOK.accent : TOK.surface2, borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}
