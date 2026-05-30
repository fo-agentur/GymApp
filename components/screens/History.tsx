"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchSessions } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, ScreenHeader, SectionHeader, SessionRow, EmptyState, I, fmtVol, hmm } from "@/lib/design";

function datePill(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(), day: d.getDate() };
}

export default function History() {
  const { db, goto } = useApp();
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        setSessions(await fetchSessions(db));
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const groups: { label: string; sessions: WorkoutSession[] }[] = [];
  for (const s of sessions) {
    const diff = now - new Date(s.started_at).getTime();
    let label: string;
    if (diff < 7 * dayMs) label = "This Week";
    else if (diff < 14 * dayMs) label = "Last Week";
    else {
      const d = new Date(s.started_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      label = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    const g = groups.find((x) => x.label === label);
    if (g) g.sessions.push(s);
    else groups.push({ label, sessions: [s] });
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 24 }}>
      <ScreenHeader large title="History" />
      {loading ? (
        <div style={{ padding: "8px 16px", color: TOK.dim, fontSize: 13 }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={<I.History size={20} />} title="No sessions yet" description="Sessions you complete will appear here, grouped by week." />
      ) : (
        groups.map((g) => (
          <div key={g.label} style={{ marginBottom: 4 }}>
            <SectionHeader title={g.label} style={{ padding: "14px 16px 6px" }} />
            <div>
              {g.sessions.map((s) => (
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
          </div>
        ))
      )}
    </div>
  );
}
