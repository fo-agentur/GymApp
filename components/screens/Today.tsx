"use client";
import React from "react";
import { useApp } from "../app-context";
import {
  fetchRoutines, fetchSessions, weeklyMuscleSets, fetchWeightLogs,
  type RoutineFull,
} from "@/lib/data";
import type { WorkoutSession, WeightLog } from "@/lib/supabase/types";
import {
  TOK, TYPE, Tnum, I, SectionHeader, SessionRow, EmptyState, ProgressRing,
  WeekStrip, Btn, fmtVol, hmm,
} from "@/lib/design";
import { TrendChart } from "@/lib/charts";
import { trueWeight, rawPoints, latestTrendWeight, weeklyTrendChange } from "@/lib/coach";
import { type MuscleGroup } from "@/lib/muscles";
import { IllConstellation } from "@/lib/illustrations";

// Weekly working-set target across all muscles (rough full-program landmark).
const WEEKLY_SET_TARGET = 80;
const DAY_MS = 24 * 3600 * 1000;

function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("de-DE", { weekday: "short" }).toUpperCase(), day: d.getDate() };
}
function estMinutes(r: RoutineFull) {
  const sets = r.routine_exercises.reduce((n, e) => n + (e.target_sets || 0), 0);
  return Math.max(15, Math.round(sets * 3.5));
}

export default function Today() {
  const { db, username, exMap, goto, startWorkout } = useApp();
  const [weights, setWeights] = React.useState<WeightLog[]>([]);
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [muscleSets, setMuscleSets] = React.useState<Partial<Record<MuscleGroup, number>>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [wl, r, s, m] = await Promise.all([
          fetchWeightLogs(db),
          fetchRoutines(db),
          fetchSessions(db),
          weeklyMuscleSets(db, exMap),
        ]);
        setWeights(wl);
        setRoutines(r);
        setSessions(s);
        setMuscleSets(m);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, exMap]);

  const now = new Date();

  // ── training week ──
  const nowMs = now.getTime();
  const thisWeek = sessions.filter((s) => nowMs - new Date(s.started_at).getTime() < 7 * DAY_MS);
  const weekVolume = thisWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const muscleSetTotal = Object.values(muscleSets).reduce((n, v) => n + (v ?? 0), 0);
  const weekSets = muscleSetTotal || thisWeek.reduce((n, s) => n + (s.total_sets ?? 0), 0);
  const trainedDays = React.useMemo(
    () => new Set(sessions.map((s) => new Date(s.started_at).toDateString())),
    [sessions],
  );

  // Suggested next workout: the routine least-recently trained (else the first).
  const suggested = React.useMemo(() => {
    if (!routines.length) return null;
    const lastByName: Record<string, number> = {};
    for (const s of sessions) {
      const key = s.name ?? "";
      if (!(key in lastByName)) lastByName[key] = new Date(s.started_at).getTime();
    }
    return [...routines].sort(
      (a, b) => (lastByName[a.name] ?? 0) - (lastByName[b.name] ?? 0),
    )[0];
  }, [routines, sessions]);

  const startSuggested = () =>
    suggested ? goto("workout-overview", suggested.id) : startWorkout({ routineId: null, name: "Quick Workout" });

  // ── body sync insight ──
  const rawW = rawPoints(weights);
  const trendW = trueWeight(weights);
  const latestW = latestTrendWeight(trendW);
  const weeklyChange = weeklyTrendChange(trendW);

  const hello = username ? username.charAt(0).toUpperCase() + username.slice(1) : "";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 28px" }}>
      {/* Header */}
      <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>
        {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
      </div>
      <div style={{ ...TYPE.display, color: TOK.text, marginTop: 6 }}>
        {hello ? `Hi, ${hello}` : "Heute"}
      </div>

      {/* ── Hero: today's training ── */}
      <div style={{ marginTop: 18 }}>
        {suggested ? (
          <TrainingHero
            routine={suggested}
            exMap={exMap}
            onStart={() => goto("workout-overview", suggested.id)}
            onEmpty={() => startWorkout({ routineId: null, name: "Quick Workout" })}
          />
        ) : (
          <div style={{ background: TOK.surface, borderRadius: 20, padding: "22px 18px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
              <IllConstellation size={92} />
            </div>
            <div style={{ ...TYPE.cardTitle, color: TOK.text }}>Bereit für den Start?</div>
            <div style={{ ...TYPE.caption, color: TOK.muted, marginTop: 4, marginBottom: 14, maxWidth: 260, marginInline: "auto" }}>
              Erstelle dein erstes Programm — oder starte direkt ein leeres Training.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" full onClick={() => goto("routine-editor")}>Programm erstellen</Btn>
              <Btn variant="primary" full onClick={() => startWorkout({ routineId: null, name: "Quick Workout" })}>Leeres Training</Btn>
            </div>
          </div>
        )}
      </div>

      {/* ── This week ── */}
      <SectionHeader title="Diese Woche" style={{ padding: "26px 2px 12px" }} action={
        <button onClick={() => goto("progress")} style={linkBtn}>Alle Stats<I.ChevR size={12} color={TOK.dim} /></button>
      } />
      <div style={{ background: TOK.surface, borderRadius: 20, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ProgressRing value={weekSets} max={WEEKLY_SET_TARGET} size={92} stroke={9} color={TOK.accent}>
            <Tnum style={{ fontSize: 24, fontWeight: 700, color: TOK.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{weekSets}</Tnum>
            <Tnum style={{ fontSize: 10, color: TOK.dim, fontWeight: 600 }}>Sätze</Tnum>
          </ProgressRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <Stat label="Volumen" value={`${fmtVol(weekVolume)} kg`} />
              <Stat label="Einheiten" value={String(thisWeek.length)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <WeekStrip trained={trainedDays} accent={{ hex: TOK.accent, name: "accent", ink: TOK.accentInk }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body sync insight ── */}
      <SectionHeader title="Körper" style={{ padding: "26px 2px 12px" }} />
      <button onClick={() => goto("progress")} style={{ width: "100%", background: TOK.surface, borderRadius: 18, padding: "14px 16px", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 14, WebkitTapHighlightColor: "transparent" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TYPE.col, color: TOK.dim }}>Gewichtstrend</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <Tnum style={{ fontSize: 22, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em" }}>
              {latestW != null ? latestW.toFixed(1) : "—"}
            </Tnum>
            <span style={{ fontSize: 11, color: TOK.muted }}>kg</span>
            {weeklyChange != null && (
              <Tnum style={{ fontSize: 11, fontWeight: 600, color: weeklyChange < 0 ? TOK.pr : TOK.muted, marginLeft: 4 }}>
                {weeklyChange >= 0 ? "+" : ""}{weeklyChange.toFixed(2)}/Wo
              </Tnum>
            )}
          </div>
          {weights.length === 0 && <div style={{ fontSize: 11, color: TOK.dim, marginTop: 4 }}>Gewicht loggen über +</div>}
        </div>
        {trendW.length > 1 ? (
          <div style={{ width: 120, height: 44 }}><TrendChart raw={rawW} trend={trendW} height={44} /></div>
        ) : <I.ChevR size={16} color={TOK.dim} />}
      </button>

      {/* ── Recent ── */}
      <SectionHeader title="Zuletzt" style={{ padding: "26px 2px 8px" }} action={
        sessions.length > 0 ? <button onClick={() => goto("history")} style={linkBtn}>Historie<I.ChevR size={12} color={TOK.dim} /></button> : undefined
      } />
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

const linkBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 2, background: "transparent", border: "none",
  cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: TOK.dim, padding: 0,
};

function TrainingHero({ routine, exMap, onStart, onEmpty }: {
  routine: RoutineFull; exMap: Record<string, { primary_muscle?: string }>; onStart: () => void; onEmpty: () => void;
}) {
  const muscles = Array.from(
    new Set(routine.routine_exercises.map((e) => exMap[e.exercise_id]?.primary_muscle).filter(Boolean) as string[]),
  ).slice(0, 4);
  return (
    <div style={{
      borderRadius: 20, padding: "18px 18px 16px",
      background: `linear-gradient(150deg, ${TOK.accentSoft}, ${TOK.surface} 65%)`,
      border: `1px solid ${TOK.border}`,
    }}>
      <div style={{ ...TYPE.eyebrow, color: TOK.accent }}>NÄCHSTES TRAINING</div>
      <div style={{ ...TYPE.h2, color: TOK.text, marginTop: 8 }}>{routine.name}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 6, fontSize: 13, color: TOK.muted }}>
        <Tnum>{routine.routine_exercises.length} Übungen</Tnum>
        <span style={{ color: TOK.dim }}>·</span>
        <Tnum>~{estMinutes(routine)} Min</Tnum>
      </div>
      {muscles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {muscles.map((m) => (
            <span key={m} style={{ fontSize: 11, color: TOK.muted, background: TOK.surface2, borderRadius: 6, padding: "3px 8px" }}>{m}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Btn variant="primary" full size="lg" onClick={onStart} leadIcon={<I.Dumbbell size={18} color="var(--c-primary-ink)" w={2} />}>
          Training starten
        </Btn>
        <Btn variant="secondary" size="lg" onClick={onEmpty}><I.Plus size={18} color={TOK.text} w={2} /></Btn>
      </div>
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
