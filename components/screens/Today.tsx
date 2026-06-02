"use client";
import React from "react";
import { useApp } from "../app-context";
import {
  fetchRoutines, fetchSessions, weeklyMuscleSets, fetchProfile, fetchActiveProgram,
  fetchWeekMacros, fetchWeightLogs, type RoutineFull, type DayMacros,
} from "@/lib/data";
import type { WorkoutSession, Profile, NutritionProgram, WeightLog } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, I, MACRO, SectionHeader, SessionRow, EmptyState, ProgressRing, Segmented, fmtVol, hmm } from "@/lib/design";
import { MacroBarGrid, MiniLine, TrendChart, type MacroDay } from "@/lib/charts";
import { trueWeight, rawPoints, latestTrendWeight, weeklyTrendChange, mifflinTDEE } from "@/lib/coach";
import { type MuscleGroup } from "@/lib/muscles";

const WEEKLY_SET_TARGET = 80;
const DAY_MS = 24 * 3600 * 1000;
const DEFAULT_TARGETS = { kcal: 2200, protein: 160, carbs: 220, fat: 70 };

function localISO(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("de-DE", { weekday: "short" }).toUpperCase(), day: d.getDate() };
}

export default function Today() {
  const { db, userId, exMap, goto, startWorkout } = useApp();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [program, setProgram] = React.useState<NutritionProgram | null>(null);
  const [weekMap, setWeekMap] = React.useState<Record<string, DayMacros>>({});
  const [weights, setWeights] = React.useState<WeightLog[]>([]);
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [muscleSets, setMuscleSets] = React.useState<Partial<Record<MuscleGroup, number>>>({});
  const [loading, setLoading] = React.useState(true);

  // ── current week (Mon–Sun) ──
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekDates = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => localISO(new Date(monday.getTime() + i * DAY_MS))),
    [monday.getTime()],
  );
  const todayISO = localISO(now);
  const todayIdx = Math.max(0, weekDates.indexOf(todayISO));
  const [selected, setSelected] = React.useState(todayIdx);
  const [mode, setMode] = React.useState<"consumed" | "remaining">("consumed");

  React.useEffect(() => {
    (async () => {
      try {
        const [p, prog, wm, wl, r, s, m] = await Promise.all([
          fetchProfile(db, userId),
          fetchActiveProgram(db),
          fetchWeekMacros(db, weekDates),
          fetchWeightLogs(db),
          fetchRoutines(db),
          fetchSessions(db),
          weeklyMuscleSets(db, exMap),
        ]);
        setProfile(p);
        setProgram(prog);
        setWeekMap(wm);
        setWeights(wl);
        setRoutines(r);
        setSessions(s);
        setMuscleSets(m);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, userId, exMap]);

  // ── targets (program → profile → default) ──
  const targets = {
    kcal: program?.kcal_target ?? profile?.target_kcal ?? DEFAULT_TARGETS.kcal,
    protein: program?.protein_g ?? profile?.target_protein_g ?? DEFAULT_TARGETS.protein,
    carbs: program?.carbs_g ?? profile?.target_carbs_g ?? DEFAULT_TARGETS.carbs,
    fat: program?.fat_g ?? profile?.target_fat_g ?? DEFAULT_TARGETS.fat,
  };

  const week: MacroDay[] = weekDates.map((d) => {
    const m = weekMap[d];
    return {
      kcal: m?.kcal ?? 0, protein: m?.protein ?? 0, carbs: m?.carbs ?? 0, fat: m?.fat ?? 0,
      future: d > todayISO,
    };
  });

  // ── weight trend ──
  const rawW = rawPoints(weights);
  const trendW = trueWeight(weights);
  const latestW = latestTrendWeight(trendW);
  const weeklyChange = weeklyTrendChange(trendW);
  const latestScale = weights.length ? weights[weights.length - 1].weight_kg : null;
  const expenditure = program?.expenditure_kcal ?? (latestScale ? mifflinTDEE(profile ?? {}, latestScale) : null);
  const intakeSeries = week.filter((d) => !d.future).map((d) => d.kcal);

  // ── training ──
  const nowMs = now.getTime();
  const thisWeek = sessions.filter((s) => nowMs - new Date(s.started_at).getTime() < 7 * DAY_MS);
  const weekVolume = thisWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const muscleSetTotal = Object.values(muscleSets).reduce((n, v) => n + (v ?? 0), 0);
  const weekSets = muscleSetTotal || thisWeek.reduce((n, s) => n + (s.total_sets ?? 0), 0);
  const suggested = routines[0] ?? null;
  const startSuggested = () =>
    suggested ? goto("workout-overview", suggested.id) : startWorkout({ routineId: null, name: "Quick Workout" });

  const dayLabels = ["M", "D", "M", "D", "F", "S", "S"];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 28px" }}>
      {/* Header */}
      <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>
        {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
      </div>
      <div style={{ ...TYPE.h1, color: TOK.text, marginTop: 6 }}>Dashboard</div>

      {/* Nutrition & Targets */}
      <SectionHeader title="Ernährung & Ziele" style={{ padding: "22px 2px 12px" }} />
      <div style={{ background: TOK.surface, borderRadius: 20, padding: "16px 16px 14px" }}>
        <MacroBarGrid week={week} targets={targets} selected={selected} onSelect={setSelected} mode={mode} dayLabels={dayLabels} />
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <div style={{ width: 188 }}>
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as "consumed" | "remaining")}
              options={[{ value: "consumed", label: "Gegessen" }, { value: "remaining", label: "Übrig" }]}
            />
          </div>
        </div>
      </div>

      {/* Insights & Analytics */}
      <SectionHeader title="Insights" style={{ padding: "24px 2px 12px" }} />
      <div style={{ display: "flex", gap: 12 }}>
        <InsightCard
          label="Verbrauch"
          onTap={() => goto("progress")}
          value={expenditure != null ? String(Math.round(expenditure)) : "—"}
          unit="kcal"
          empty={expenditure == null ? "Profil ausfüllen für Schätzung" : undefined}
          chart={intakeSeries.length > 1 ? <MiniLine data={intakeSeries} color={MACRO.kcal} height={42} /> : undefined}
        />
        <InsightCard
          label="Gewichtstrend"
          onTap={() => goto("progress")}
          value={latestW != null ? latestW.toFixed(1) : "—"}
          unit="kg"
          delta={weeklyChange != null ? `${weeklyChange >= 0 ? "+" : ""}${weeklyChange.toFixed(2)}/Wo` : undefined}
          deltaDown={weeklyChange != null ? weeklyChange < 0 : undefined}
          empty={weights.length === 0 ? "Gewicht loggen über +" : undefined}
          chart={trendW.length > 1 ? <TrendChart raw={rawW} trend={trendW} height={42} /> : undefined}
        />
      </div>

      {/* Training */}
      <SectionHeader title="Training" style={{ padding: "24px 2px 12px" }} />
      <div style={{ background: TOK.surface, borderRadius: 20, padding: "18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ProgressRing value={weekSets} max={WEEKLY_SET_TARGET} size={92} stroke={9} color={MACRO.protein}>
            <Tnum style={{ fontSize: 24, fontWeight: 700, color: TOK.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{weekSets}</Tnum>
            <Tnum style={{ fontSize: 10, color: TOK.dim, fontWeight: 600 }}>Sätze</Tnum>
          </ProgressRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ ...TYPE.col, color: TOK.dim }}>Diese Woche</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <Stat label="Volumen" value={`${fmtVol(weekVolume)} kg`} />
              <Stat label="Einheiten" value={String(thisWeek.length)} />
            </div>
            <button
              onClick={startSuggested}
              style={{ marginTop: 14, width: "100%", height: 44, borderRadius: 12, background: TOK.primarySoft, color: TOK.text, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent" }}
            >
              <I.Dumbbell size={16} color={TOK.text} w={2} />
              {suggested ? suggested.name : "Workout starten"}
            </button>
          </div>
        </div>
      </div>

      {/* Recent */}
      <SectionHeader title="Zuletzt" style={{ padding: "26px 2px 8px" }} />
      {loading ? (
        <div style={{ padding: "8px 4px", color: TOK.dim, fontSize: 13 }}>Lädt…</div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={<I.History size={20} />} title="Noch keine Workouts" description="Starte oben dein erstes Training — es erscheint hier, sobald du fertig bist." />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Tnum style={{ fontSize: 18, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em" }}>{value}</Tnum>
      <div style={{ ...TYPE.col, color: TOK.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function InsightCard({
  label, value, unit, delta, deltaDown, chart, empty, onTap,
}: {
  label: string; value: string; unit: string; delta?: string; deltaDown?: boolean;
  chart?: React.ReactNode; empty?: string; onTap?: () => void;
}) {
  return (
    <button
      onClick={onTap}
      style={{ flex: 1, minWidth: 0, background: TOK.surface, borderRadius: 18, padding: "14px 14px 12px", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", gap: 8, WebkitTapHighlightColor: "transparent" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...TYPE.col, color: TOK.dim }}>{label}</span>
        <I.ChevR size={13} color={TOK.dim} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <Tnum style={{ fontSize: 22, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em" }}>{value}</Tnum>
        <span style={{ fontSize: 11, color: TOK.muted }}>{unit}</span>
        {delta && <Tnum style={{ fontSize: 11, fontWeight: 600, color: deltaDown ? TOK.pr : TOK.muted, marginLeft: "auto" }}>{delta}</Tnum>}
      </div>
      <div style={{ height: 42, display: "flex", alignItems: "center" }}>
        {empty ? <span style={{ fontSize: 11, color: TOK.dim }}>{empty}</span> : chart}
      </div>
    </button>
  );
}
