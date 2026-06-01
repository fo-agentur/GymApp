"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutines, fetchSessions, weeklyMuscleSets, type RoutineFull } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, I, SectionHeader, SessionRow, EmptyState, ProgressRing, WeekStrip, fmtVol, hmm } from "@/lib/design";
import MuscleMap from "../MuscleMap";
import { statusLabel, type MuscleGroup } from "@/lib/muscles";

const WEEKLY_SET_TARGET = 80;
const WEEKLY_DAY_TARGET = 4;
const DAY_MS = 24 * 3600 * 1000;

function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(), day: d.getDate() };
}

export default function Today() {
  const { db, accent, exMap, goto, startWorkout } = useApp();
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [muscleSets, setMuscleSets] = React.useState<Partial<Record<MuscleGroup, number>>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [r, s, m] = await Promise.all([fetchRoutines(db), fetchSessions(db), weeklyMuscleSets(db, exMap)]);
        setRoutines(r);
        setSessions(s);
        setMuscleSets(m);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, exMap]);

  const suggested = routines[0] ?? null;
  const now = new Date();
  const estMin = suggested ? Math.max(20, suggested.routine_exercises.reduce((n, e) => n + e.target_sets * 3, 0)) : 0;

  // ── Windows: this week (0–7d) vs prior week (8–14d) ──
  const nowMs = now.getTime();
  const thisWeek = sessions.filter((s) => nowMs - new Date(s.started_at).getTime() < 7 * DAY_MS);
  const priorWeek = sessions.filter((s) => {
    const age = nowMs - new Date(s.started_at).getTime();
    return age >= 7 * DAY_MS && age < 14 * DAY_MS;
  });

  // Total working sets this week — prefer the per-muscle aggregate, fall back to session totals.
  const muscleSetTotal = Object.values(muscleSets).reduce((n, v) => n + (v ?? 0), 0);
  const sessionSetTotal = thisWeek.reduce((n, s) => n + (s.total_sets ?? 0), 0);
  const weekSets = muscleSetTotal || sessionSetTotal;

  const weekVolume = thisWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const priorVolume = priorWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const volDeltaPct = priorVolume > 0 ? Math.round(((weekVolume - priorVolume) / priorVolume) * 100) : null;

  // ── Streak: consecutive calendar days ending today/yesterday ──
  const trainedDays = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
  const streak = (() => {
    if (trainedDays.size === 0) return 0;
    const d = new Date();
    if (!trainedDays.has(d.toDateString())) d.setDate(d.getDate() - 1);
    let n = 0;
    while (trainedDays.has(d.toDateString())) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  })();

  // ── Days trained this calendar week (Mon–Sun) for the consistency line ──
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const trainedThisWeek = (() => {
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      if (trainedDays.has(d.toDateString())) n++;
    }
    return n;
  })();

  // ── Headline derived from data ──
  const headline = (() => {
    if (streak > 0) return `Day ${streak} of your streak.`;
    if (thisWeek.length === 0) return "Fresh week — let's start.";
    // a muscle trained this week that's lagging on volume
    const lagging = (Object.keys(muscleSets) as MuscleGroup[])
      .map((m) => ({ m, n: muscleSets[m] ?? 0 }))
      .filter((e) => e.n > 0)
      .sort((a, b) => a.n - b.n)[0];
    if (lagging) return `${lagging.m} needs a push — ${lagging.n} set${lagging.n === 1 ? "" : "s"}.`;
    return "Back at it.";
  })();

  // ── Muscle-balance auto-insight ──
  const insight = (() => {
    const entries = (Object.keys(muscleSets) as MuscleGroup[])
      .map((m) => ({ m, n: muscleSets[m] ?? 0 }))
      .filter((e) => e.n > 0)
      .sort((a, b) => b.n - a.n);
    if (entries.length === 0) return "No working sets logged this week yet.";
    const isStrong = (n: number) => ["on track", "high", "very high"].includes(statusLabel(n).text);
    const onTrack = entries.filter((e) => isStrong(e.n));
    const weakest = entries[entries.length - 1];
    const weakStatus = statusLabel(weakest.n).text;
    const lead = onTrack.length
      ? `${onTrack.slice(0, 2).map((e) => e.m).join(" & ")} on track`
      : `${entries[0].m} leading`;
    // Only call out a lagging muscle when there's more than one and it's genuinely low.
    const showLagging = entries.length > 1 && (weakStatus === "low" || weakStatus === "untrained");
    return showLagging ? `${lead} · ${weakest.m} lagging (${weakest.n} set${weakest.n === 1 ? "" : "s"})` : lead;
  })();

  const startSuggested = () =>
    suggested
      ? startWorkout({ routineId: suggested.id, name: suggested.name })
      : startWorkout({ routineId: null, name: "Quick Workout" });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 28px" }}>
      {/* 1 ── Editorial header (plain type on black) */}
      <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>
        TODAY · {now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} {now.getDate()}{" "}
        {now.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
      </div>
      <div style={{ ...TYPE.h1, color: TOK.text, marginTop: 8, maxWidth: 320 }}>{headline}</div>

      {/* 2 ── Compact Start bar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12, marginTop: 18,
          background: TOK.surface, borderRadius: 16, padding: "0 12px 0 16px", height: 64,
        }}
      >
        <button
          onClick={startSuggested}
          style={{
            flex: 1, minWidth: 0, height: "100%", background: "transparent", border: "none",
            textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: 0,
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>Next</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
            <span style={{ ...TYPE.bodyEm, color: TOK.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {suggested ? suggested.name : "Quick workout"}
            </span>
            {suggested && (
              <Tnum style={{ fontSize: 12, color: TOK.muted, flexShrink: 0 }}>
                {suggested.routine_exercises.length} ex · ~{estMin}m
              </Tnum>
            )}
          </div>
        </button>
        <button
          onClick={startSuggested}
          style={{
            flexShrink: 0, width: 44, height: 44, borderRadius: 999, background: accent.hex, color: accent.ink,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Start workout"
        >
          <I.ArrowR size={18} color={accent.ink} w={2.5} />
        </button>
      </div>
      {suggested && (
        <button
          onClick={() => startWorkout({ routineId: null, name: "Quick Workout" })}
          style={{
            marginTop: 8, marginLeft: 2, background: "transparent", border: "none", color: TOK.muted,
            fontFamily: "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "2px 0", WebkitTapHighlightColor: "transparent",
          }}
        >
          or start an empty workout
        </button>
      )}

      {/* 3 ── Weekly Volume Ring (hero) */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 20, marginTop: 22,
          background: TOK.surface, borderRadius: 24, padding: "20px 22px",
        }}
      >
        <ProgressRing value={weekSets} max={WEEKLY_SET_TARGET} size={116} stroke={10} color={accent.hex}>
          <Tnum style={{ fontSize: 30, fontWeight: 700, color: TOK.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{weekSets}</Tnum>
          <Tnum style={{ fontSize: 11, color: TOK.dim, fontWeight: 600 }}>/ {WEEKLY_SET_TARGET} sets</Tnum>
        </ProgressRing>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <Readout
            label="Volume"
            value={`${fmtVol(weekVolume)} kg`}
            delta={volDeltaPct != null ? `${volDeltaPct >= 0 ? "+" : ""}${volDeltaPct}% vs last wk` : undefined}
            deltaUp={volDeltaPct != null ? volDeltaPct >= 0 : undefined}
          />
          <Readout label="Sessions" value={String(thisWeek.length)} />
          <Readout label="Streak" value={`${streak}d`} />
        </div>
      </div>

      {/* 4 ── Muscle balance snapshot */}
      <SectionHeader title="Muscle Balance" style={{ padding: "26px 4px 12px" }} />
      <button
        onClick={() => goto("progress")}
        style={{
          width: "100%", background: TOK.surface, borderRadius: 24, padding: "16px 12px 14px",
          border: "none", cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent",
        }}
      >
        <div style={{ transform: "scale(0.86)", transformOrigin: "center top" }}>
          <MuscleMap sets={muscleSets} />
        </div>
        <div style={{ ...TYPE.caption, color: TOK.muted, marginTop: 8, textAlign: "center", padding: "0 8px" }}>{insight}</div>
      </button>

      {/* 5 ── Consistency */}
      <SectionHeader title="Consistency" style={{ padding: "26px 4px 12px" }} />
      <div style={{ background: TOK.surface, borderRadius: 24, padding: "18px 18px 16px" }}>
        <WeekStrip trained={trainedDays} accent={accent} />
        <div style={{ ...TYPE.caption, color: TOK.muted, marginTop: 14, textAlign: "center" }}>
          <Tnum style={{ color: TOK.text, fontWeight: 600 }}>{trainedThisWeek}</Tnum> of your {WEEKLY_DAY_TARGET}-day target
        </div>
      </div>

      {/* 6 ── Recent */}
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

function Readout({ label, value, delta, deltaUp }: { label: string; value: string; delta?: string; deltaUp?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
      <span style={{ ...TYPE.col, color: TOK.dim }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        {delta && (
          <Tnum style={{ fontSize: 11, fontWeight: 500, color: deltaUp ? TOK.pr : TOK.fail }}>{delta}</Tnum>
        )}
        <Tnum style={{ fontSize: 17, fontWeight: 600, color: TOK.text, letterSpacing: "-0.01em" }}>{value}</Tnum>
      </div>
    </div>
  );
}
