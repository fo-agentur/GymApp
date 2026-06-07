"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchSessions, fetchStats, type Stats } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Card, MetricStat, EmptyState, I, fmtVol } from "@/lib/design";
import { useMounted } from "@/lib/anim";
import MuscleMap from "../MuscleMap";
import { statusLabel, heatColor, type MuscleGroup } from "@/lib/muscles";

export default function Progress() {
  const { db, exMap } = useApp();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [byMuscle, setByMuscle] = React.useState<{ muscle: string; kg: number }[]>([]);
  const [weeklySets, setWeeklySets] = React.useState<Partial<Record<MuscleGroup, number>>>({});
  const [selMuscle, setSelMuscle] = React.useState<MuscleGroup | null>(null);
  const [loading, setLoading] = React.useState(true);
  const mounted = useMounted();

  React.useEffect(() => {
    (async () => {
      try {
        const [st, ss] = await Promise.all([fetchStats(db), fetchSessions(db)]);
        setStats(st);
        setSessions(ss);
        const { data } = await db.from("sets").select("weight_kg,reps,is_warmup,exercise_id,completed_at");
        const agg: Record<string, number> = {};
        const weekAgg: Record<string, number> = {};
        const weekStart = Date.now() - 7 * 24 * 3600 * 1000;
        for (const s of data ?? []) {
          if (s.is_warmup) continue;
          const muscle = exMap[s.exercise_id]?.primary_muscle ?? "Other";
          if (s.weight_kg != null && s.reps != null) {
            agg[muscle] = (agg[muscle] ?? 0) + s.weight_kg * s.reps;
          }
          // weekly working-set count per muscle (for the body map)
          if (s.completed_at && new Date(s.completed_at).getTime() >= weekStart) {
            weekAgg[muscle] = (weekAgg[muscle] ?? 0) + 1;
          }
        }
        setByMuscle(Object.entries(agg).map(([muscle, kg]) => ({ muscle, kg })).sort((a, b) => b.kg - a.kg));
        setWeeklySets(weekAgg as Partial<Record<MuscleGroup, number>>);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, exMap]);

  // 12-week training-day heatmap (7 rows x 12 cols), real session dates
  const trainedDays = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const cols = 12;
  function cellTrained(c: number, r: number) {
    const d = new Date(monday);
    d.setDate(monday.getDate() - (cols - 1 - c) * 7 + r);
    return trainedDays.has(d.toDateString());
  }

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 24 }}>
      <ScreenHeader large title="Statistik" />

      {sessions.length === 0 ? (
        <EmptyState icon={<I.Stats size={20} />} title="Noch keine Daten" description="Absolviere ein paar Workouts — Statistiken, Volumen und Trainingsfrequenz erscheinen dann hier." />
      ) : (
        <>
          <div style={{ padding: "0 12px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <MetricStat label="Einheiten" value={stats!.totalSessions} />
            <MetricStat label="Volumen" value={fmtVol(stats!.totalVolume)} unit="kg" />
            <MetricStat label="Sätze" value={stats!.totalSets.toLocaleString()} />
            <MetricStat label="Ø Dauer" value={stats!.avgDuration} unit="min" />
          </div>

          {/* Muscle map — what you trained this week */}
          <SectionHeader title="Diese Woche trainiert" />
          <Card style={{ margin: "0 12px 22px", padding: "16px 12px 14px" }}>
            <MuscleMap sets={weeklySets} selected={selMuscle} onSelect={(m) => setSelMuscle((p) => (p === m ? null : m))} />
            {/* Selected muscle detail */}
            {selMuscle ? (
              (() => {
                const n = weeklySets[selMuscle] ?? 0;
                const st = statusLabel(n);
                return (
                  <div style={{ textAlign: "center", marginTop: 6 }}>
                    <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{selMuscle}</div>
                    <div style={{ fontSize: 12, marginTop: 3 }}>
                      <Tnum style={{ color: TOK.text, fontWeight: 600 }}>{n}</Tnum>
                      <span style={{ color: TOK.muted }}> Sätze · </span>
                      <span style={{ color: st.color, fontWeight: 600 }}>{st.text}</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: TOK.dim }}>Tippe einen Muskel für Details</div>
            )}
            {/* Legend */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 10, color: TOK.dim }}>Wenig</span>
              {[0.05, 0.35, 0.65, 1].map((t, i) => (
                <span key={i} style={{ width: 14, height: 10, borderRadius: 2, background: heatColor(t) }} />
              ))}
              <span style={{ fontSize: 10, color: TOK.dim }}>Viel</span>
            </div>
          </Card>

          {byMuscle.length > 0 && (
            <>
              <SectionHeader title="Volumen pro Muskel" />
              <Card style={{ margin: "0 12px 22px", padding: "14px 16px" }}>
                {byMuscle.map((m, i) => {
                  const max = byMuscle[0].kg;
                  return (
                    <div key={m.muscle} style={{ marginBottom: i === byMuscle.length - 1 ? 0 : 10 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: TOK.text, fontWeight: 500 }}>{m.muscle}</span>
                        <Tnum style={{ color: TOK.muted }}>{fmtVol(m.kg)} kg</Tnum>
                      </div>
                      <div style={{ height: 6, background: TOK.surface2, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: mounted ? `${(m.kg / max) * 100}%` : "0%", background: TOK.accent, opacity: 0.85 - (i / Math.max(1, byMuscle.length)) * 0.4, borderRadius: 4, transition: "width 750ms cubic-bezier(0.22,1,0.36,1)", transitionDelay: `${i * 45}ms` }} />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          <SectionHeader title="Trainingsfrequenz" />
          <Card style={{ margin: "0 12px 22px", padding: "14px 12px 12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
                  <span key={i} style={{ fontSize: 9, color: TOK.dim, height: 16, lineHeight: "16px", width: 8 }}>{l}</span>
                ))}
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4 }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <div key={c} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {Array.from({ length: 7 }).map((__, r) => {
                      const on = cellTrained(c, r);
                      return <span key={r} style={{ height: 16, borderRadius: 3, background: on ? TOK.accent : TOK.surface2, opacity: on ? 0.9 : 1 }} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "0 4px" }}>
              <Tnum style={{ fontSize: 11, color: TOK.dim }}>Letzte 12 Wochen</Tnum>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
