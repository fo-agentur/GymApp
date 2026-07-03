"use client";
// Today — the dashboard: this week's training at a glance (day strip + key
// numbers), a body-map snapshot of trained muscles, quick-start for your
// routines and the most recent sessions.
import React from "react";
import { useApp } from "../app-context";
import { fetchSessions, fetchRoutines, weeklyMuscleSets, fetchTodayNutrition, type RoutineFull, type TodayNutrition } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, I, Btn, SectionHeader, SessionRow, EmptyState, WeekStrip, fmtVol, hmm } from "@/lib/design";
import { deMuscle, type MuscleGroup } from "@/lib/muscles";
import MuscleMap from "../MuscleMap";

const DAY_MS = 24 * 3600 * 1000;

function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("de-DE", { weekday: "short" }).toUpperCase().replace(".", ""), day: d.getDate() };
}

export default function Today() {
  const { db, userId, username, exMap, goto, startWorkout, accent } = useApp();
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [muscleSets, setMuscleSets] = React.useState<Partial<Record<MuscleGroup, number>>>({});
  const [nutrition, setNutrition] = React.useState<TodayNutrition | null>(null);
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

  // Compact nutrition summary from the shared DB (logged via the nutrition app).
  React.useEffect(() => {
    fetchTodayNutrition(db, userId).then(setNutrition).catch(() => {});
  }, [db, userId]);

  const now = new Date();
  const thisWeek = sessions.filter((s) => now.getTime() - new Date(s.started_at).getTime() < 7 * DAY_MS);
  const weekVolume = thisWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0);
  const weekSets = thisWeek.reduce((n, s) => n + (s.total_sets ?? 0), 0);
  const weekMins = Math.round(thisWeek.reduce((n, s) => n + (s.duration_seconds ?? 0), 0) / 60);
  const trainedDays = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
  const anyMuscle = Object.values(muscleSets).some((v) => (v ?? 0) > 0);

  // Next training = the routine that hasn't been trained for the longest time
  // (never-trained routines first). Its hero card carries the primary CTA.
  const lastTrained: Record<string, number> = {};
  for (const s of sessions) {
    if (!s.routine_id) continue;
    const t = new Date(s.started_at).getTime();
    if (!lastTrained[s.routine_id] || t > lastTrained[s.routine_id]) lastTrained[s.routine_id] = t;
  }
  const ranked = [...routines].sort((a, b) => (lastTrained[a.id] ?? 0) - (lastTrained[b.id] ?? 0));
  const hero = ranked[0] ?? null;
  const heroLastSession = hero ? sessions.find((s) => s.routine_id === hero.id) ?? null : null;
  const heroMuscles = hero
    ? [...new Set(hero.routine_exercises.map((re) => exMap[re.exercise_id]?.primary_muscle).filter(Boolean))].slice(0, 3)
    : [];
  const others = ranked.slice(1, 4);

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 96px" }}>
      {/* Header */}
      <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>
        {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
      </div>
      <div style={{ ...TYPE.display, color: TOK.text, marginTop: 4 }}>Hey {username}</div>

      {/* Next training — primary CTA */}
      {hero && (
        <div style={{ marginTop: 16, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 20, padding: "18px 16px 16px", position: "relative", overflow: "hidden", boxShadow: "0 0 32px var(--c-shadow-glow)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.hex }} />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ ...TYPE.eyebrow, color: TOK.accent }}>Nächstes Training</div>
            <Tnum style={{ fontSize: 12, color: TOK.dim }}>
              {lastTrained[hero.id] ? `Zuletzt ${agoLabel(lastTrained[hero.id])}` : "Noch nie trainiert"}
            </Tnum>
          </div>
          <div style={{ ...TYPE.h2, color: TOK.text, marginTop: 8 }}>{hero.name}</div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            <span style={chip}><Tnum>{hero.routine_exercises.length}</Tnum>&nbsp;Übungen</span>
            {heroMuscles.map((m) => (
              <span key={m} style={chip}>{deMuscle(m as string)}</span>
            ))}
          </div>
          {heroLastSession && (
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 12, fontSize: 12, color: TOK.muted }}>
              <span style={{ fontWeight: 600 }}>Letzte Leistung</span>
              <Tnum>{fmtVol(heroLastSession.total_volume_kg ?? 0)} kg</Tnum>
              <span style={{ color: TOK.dim }}>·</span>
              <Tnum>{heroLastSession.total_sets ?? 0} Sätze</Tnum>
              <span style={{ color: TOK.dim }}>·</span>
              <Tnum>{hmm(Math.round((heroLastSession.duration_seconds ?? 0) / 60))}</Tnum>
            </div>
          )}
          <Btn
            variant="primary" size="lg" full accent={accent}
            onClick={() => startWorkout({ routineId: hero.id, name: hero.name })}
            style={{ marginTop: 14 }}
            trailIcon={<I.ArrowR size={16} color={accent.ink} />}
          >
            Training starten
          </Btn>
        </div>
      )}

      {/* This week — mega-number strip instead of boxed stat tiles */}
      <div style={{ marginTop: 16, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 16, padding: "18px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ ...TYPE.cardTitle, color: TOK.text }}>Diese Woche</div>
          <Tnum style={{ fontSize: 12, color: TOK.dim }}>{thisWeek.length} {thisWeek.length === 1 ? "Workout" : "Workouts"}</Tnum>
        </div>
        <WeekStrip trained={trainedDays} accent={accent} />
        <div style={{ display: "flex", marginTop: 18, background: TOK.bg, borderRadius: 12, padding: "14px 4px" }}>
          <MegaStat label="Sätze" value={String(weekSets)} />
          <div style={{ width: 1, background: TOK.border, margin: "2px 0" }} />
          <MegaStat label="Volumen" value={fmtVol(weekVolume)} unit="kg" />
          <div style={{ width: 1, background: TOK.border, margin: "2px 0" }} />
          <MegaStat label="Zeit" value={hmm(weekMins)} />
        </div>
      </div>

      {/* Nutrition snapshot (only when the shared account tracks food) */}
      {nutrition && (nutrition.entries > 0 || nutrition.targetKcal != null) && (
        <NutritionWidget n={nutrition} />
      )}

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

      {/* More routines */}
      {routines.length === 0 ? (
        <>
          <SectionHeader title="Schnellstart" style={{ padding: "24px 2px 8px" }} />
          <button onClick={() => goto("routine-editor")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: TOK.surface, border: `1.5px dashed ${TOK.border}`, borderRadius: 16, padding: "16px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: TOK.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I.Plus size={18} color={TOK.text} w={2} />
            </div>
            <div>
              <div style={{ ...TYPE.bodyEm, color: TOK.text }}>Erste Routine erstellen</div>
              <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>Eigener Plan mit Übungen, Sätzen & Pausen</div>
            </div>
          </button>
        </>
      ) : others.length > 0 ? (
        <>
          <SectionHeader title="Weitere Routinen" style={{ padding: "24px 2px 8px" }} action={
            <button onClick={() => goto("routines")} style={linkBtn}>Alle<I.ChevR size={12} color={TOK.dim} /></button>
          } />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {others.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 16, padding: "12px 12px 12px 16px" }}>
                <button onClick={() => goto("workout-overview", r.id)} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0, WebkitTapHighlightColor: "transparent" }}>
                  <div style={{ ...TYPE.bodyEm, color: TOK.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <Tnum style={{ fontSize: 12, color: TOK.dim, marginTop: 2, display: "block" }}>
                    {r.routine_exercises.length} Übungen{lastTrained[r.id] ? ` · ${agoLabel(lastTrained[r.id])}` : ""}
                  </Tnum>
                </button>
                <button onClick={() => startWorkout({ routineId: r.id, name: r.name })} style={{ flexShrink: 0, height: 38, padding: "0 16px", borderRadius: 999, background: TOK.surface2, color: TOK.text, border: `1px solid ${TOK.border}`, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}>
                  Start <I.ArrowR size={13} color={TOK.text} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

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

function agoLabel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / DAY_MS);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

const chip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, color: TOK.muted,
  background: TOK.surface2, borderRadius: 999, padding: "4px 10px", letterSpacing: "0.01em",
};

const linkBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 2, background: "transparent", border: "none",
  cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: TOK.dim, padding: 0,
};

// ── Nutrition widget ────────────────────────────────────────────
// Compact daily macros from the nutrition app. Read-only on purpose — the
// gym app stays a workout app, logging happens over there.
function MacroBar({ label, value, target, unit, color }: { label: string; value: number; target: number | null; unit: string; color: string }) {
  const pct = target && target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: TOK.dim }}>{label}</span>
        <Tnum style={{ fontSize: 13, fontWeight: 700, color: TOK.text, whiteSpace: "nowrap" }}>
          {value}
          {target != null && <span style={{ color: TOK.muted, fontWeight: 600 }}> / {target}</span>}
          <span style={{ fontSize: 10, color: TOK.muted, fontWeight: 600 }}> {unit}</span>
        </Tnum>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: TOK.surface2, marginTop: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.round(pct * 100)}%`, borderRadius: 3, background: color, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

function NutritionWidget({ n }: { n: TodayNutrition }) {
  return (
    <div style={{ marginTop: 12, background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 20, padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 9, background: TOK.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.Food size={14} color={TOK.accent} />
          </div>
          <div style={{ ...TYPE.cardTitle, color: TOK.text }}>Ernährung heute</div>
        </div>
        {n.entries === 0 && <span style={{ fontSize: 11, fontWeight: 600, color: TOK.dim }}>Noch nichts geloggt</span>}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <MacroBar label="Kalorien" value={n.kcal} target={n.targetKcal} unit="kcal" color={TOK.accent} />
        <MacroBar label="Protein" value={n.protein} target={n.targetProtein} unit="g" color={TOK.muscle} />
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
        <MacroBar label="Carbs" value={n.carbs} target={n.targetCarbs} unit="g" color={TOK.muted} />
        <MacroBar label="Fett" value={n.fat} target={n.targetFat} unit="g" color={TOK.muted} />
      </div>
    </div>
  );
}

function MegaStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
        <Tnum style={{ ...TYPE.mega, fontSize: 26, color: TOK.text }}>{value}</Tnum>
        {unit && <span style={{ fontSize: 11, color: TOK.muted, fontWeight: 600 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: TOK.dim, marginTop: 4 }}>{label}</div>
    </div>
  );
}
