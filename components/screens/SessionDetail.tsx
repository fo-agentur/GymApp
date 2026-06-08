"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchSessionDetail, type SessionDetail as Detail, type LoggedSet } from "@/lib/data";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Card, SetRow, fmtVol, hmm } from "@/lib/design";

export default function SessionDetail() {
  const { db, params, exMap, accent, goto } = useApp();
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      if (!params.sessionId) return;
      try {
        setDetail(await fetchSessionDetail(db, params.sessionId));
      } finally {
        setLoading(false);
      }
    })();
  }, [db, params.sessionId]);

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Loading…</div>;
  if (!detail) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Session not found.</div>;

  const { session, sets } = detail;

  // Group sets by exercise (in order of first appearance)
  const order: string[] = [];
  const byEx: Record<string, LoggedSet[]> = {};
  for (const s of sets) {
    if (!byEx[s.exercise_id]) {
      byEx[s.exercise_id] = [];
      order.push(s.exercise_id);
    }
    byEx[s.exercise_id].push(s);
  }

  const d = new Date(session.started_at);
  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 32 }}>
      <ScreenHeader back onBack={() => goto("history")} title="" />
      <div style={{ padding: "4px 16px 18px" }}>
        <div style={{ ...TYPE.col, color: TOK.dim, marginBottom: 6 }}>
          {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
        </div>
        <div style={{ ...TYPE.h1, color: TOK.text }}>{session.name ?? "Workout"}</div>
        <div style={{ display: "flex", gap: 14, alignItems: "baseline", marginTop: 10, fontSize: 12, color: TOK.muted }}>
          <Tnum><span style={{ color: TOK.text, fontWeight: 600 }}>{hmm(Math.round((session.duration_seconds ?? 0) / 60))}</span> duration</Tnum>
          <span style={{ color: TOK.dim }}>·</span>
          <Tnum><span style={{ color: TOK.text, fontWeight: 600 }}>{fmtVol(session.total_volume_kg ?? 0)} kg</span> volume</Tnum>
          <span style={{ color: TOK.dim }}>·</span>
          <Tnum><span style={{ color: TOK.text, fontWeight: 600 }}>{sets.length}</span> sets</Tnum>
        </div>
      </div>

      <div style={{ padding: "0 12px" }}>
        {order.map((exId) => {
          const ex = exMap[exId];
          const exSets = byEx[exId];
          return (
            <div key={exId} style={{ background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 8px" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: TOK.surface2, border: `1px solid ${TOK.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: TOK.dim, fontSize: 14, fontWeight: 700 }}>
                  {(ex?.name ?? "?")[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...TYPE.bodyEm, color: TOK.text }}>{ex?.name ?? "Exercise"}</div>
                  <div style={{ fontSize: 11, color: TOK.dim, marginTop: 2 }}>{ex?.primary_muscle}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 38px 30px", gap: 12, padding: "4px 16px", fontSize: 10, fontWeight: 600, color: TOK.dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <span>Set</span><span>Weight</span><span>Reps</span><span style={{ textAlign: "right" }}>RPE</span><span />
              </div>
              {exSets.map((s, i) => (
                <SetRow key={s.id} accent={accent} readOnly set={{ idx: s.set_index || i + 1, weight: s.weight_kg, reps: s.reps, rpe: s.rpe, warmup: s.is_warmup, status: "done" }} />
              ))}
            </div>
          );
        })}
      </div>

      {session.notes && (
        <>
          <SectionHeader title="Notes" style={{ padding: "20px 16px 8px" }} />
          <Card style={{ margin: "0 12px" }}>
            <div style={{ padding: 16, fontSize: 13, color: TOK.text, lineHeight: 1.5 }}>{session.notes}</div>
          </Card>
        </>
      )}
    </div>
  );
}
