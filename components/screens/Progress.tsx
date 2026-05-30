"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchSessions, fetchStats, type Stats } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Card, MetricStat, EmptyState, I, fmtVol } from "@/lib/design";

export default function Progress() {
  const { db, accent, exMap } = useApp();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [byMuscle, setByMuscle] = React.useState<{ muscle: string; kg: number }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [st, ss] = await Promise.all([fetchStats(db), fetchSessions(db)]);
        setStats(st);
        setSessions(ss);
        const { data } = await db.from("sets").select("weight_kg,reps,is_warmup,exercise_id");
        const agg: Record<string, number> = {};
        for (const s of data ?? []) {
          if (s.is_warmup || s.weight_kg == null || s.reps == null) continue;
          const muscle = exMap[s.exercise_id]?.primary_muscle ?? "Other";
          agg[muscle] = (agg[muscle] ?? 0) + s.weight_kg * s.reps;
        }
        setByMuscle(Object.entries(agg).map(([muscle, kg]) => ({ muscle, kg })).sort((a, b) => b.kg - a.kg));
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

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 24 }}>
      <ScreenHeader large title="Progress" />

      {sessions.length === 0 ? (
        <EmptyState icon={<I.Stats size={20} />} title="No data yet" description="Finish a few workouts and your stats, volume and training frequency show up here." />
      ) : (
        <>
          <div style={{ padding: "0 12px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <MetricStat label="Sessions" value={stats!.totalSessions} />
            <MetricStat label="Volume" value={fmtVol(stats!.totalVolume)} unit="kg" />
            <MetricStat label="Sets" value={stats!.totalSets.toLocaleString()} />
            <MetricStat label="Avg duration" value={stats!.avgDuration} unit="min" />
          </div>

          {byMuscle.length > 0 && (
            <>
              <SectionHeader title="Volume by Muscle" />
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
                        <div style={{ height: "100%", width: `${(m.kg / max) * 100}%`, background: accent.hex, opacity: 0.85 - (i / Math.max(1, byMuscle.length)) * 0.4, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          <SectionHeader title="Training Frequency" />
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
                      return <span key={r} style={{ height: 16, borderRadius: 3, background: on ? accent.hex : TOK.surface2, opacity: on ? 0.9 : 1 }} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "0 4px" }}>
              <Tnum style={{ fontSize: 11, color: TOK.dim }}>Last 12 weeks</Tnum>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
