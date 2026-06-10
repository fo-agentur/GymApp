"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchSessionDetail, discardSession, type SessionDetail as Detail, type LoggedSet } from "@/lib/data";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Card, SetRow, I, fmtVol, hmm } from "@/lib/design";
import { deMuscle } from "@/lib/muscles";

export default function SessionDetail() {
  const { db, params, exMap, accent, goBack } = useApp();
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

  async function removeSession() {
    if (!params.sessionId) return;
    if (!confirm("Dieses Workout endgültig löschen? Alle Sätze gehen verloren.")) return;
    await discardSession(db, params.sessionId);
    goBack();
  }

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;
  if (!detail) {
    return (
      <div style={{ flex: 1 }}>
        <ScreenHeader back onBack={goBack} title="" />
        <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Workout nicht gefunden.</div>
      </div>
    );
  }

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
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
      <ScreenHeader
        back
        onBack={goBack}
        title=""
        trailing={
          <button onClick={removeSession} style={{ width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Workout löschen">
            <I.Trash size={18} color={TOK.dim} />
          </button>
        }
      />
      <div style={{ padding: "4px 16px 18px" }}>
        <div style={{ ...TYPE.col, color: TOK.dim, marginBottom: 6 }}>
          {d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}
        </div>
        <div style={{ ...TYPE.h1, color: TOK.text }}>{session.name ?? "Workout"}</div>
        <div style={{ display: "flex", gap: 14, alignItems: "baseline", marginTop: 10, fontSize: 12, color: TOK.muted }}>
          <Tnum><span style={{ color: TOK.text, fontWeight: 600 }}>{hmm(Math.round((session.duration_seconds ?? 0) / 60))}</span> Dauer</Tnum>
          <span style={{ color: TOK.dim }}>·</span>
          <Tnum><span style={{ color: TOK.text, fontWeight: 600 }}>{fmtVol(session.total_volume_kg ?? 0)} kg</span> Volumen</Tnum>
          <span style={{ color: TOK.dim }}>·</span>
          <Tnum><span style={{ color: TOK.text, fontWeight: 600 }}>{sets.length}</span> Sätze</Tnum>
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
                  <div style={{ ...TYPE.bodyEm, color: TOK.text }}>{ex?.name ?? "Übung"}</div>
                  <div style={{ fontSize: 11, color: TOK.dim, marginTop: 2 }}>{ex ? deMuscle(ex.primary_muscle) : ""}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 38px 30px", gap: 12, padding: "4px 16px", fontSize: 10, fontWeight: 600, color: TOK.dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <span>Satz</span><span>Gewicht</span><span>Wdh</span><span style={{ textAlign: "right" }}>RPE</span><span />
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
          <SectionHeader title="Notizen" style={{ padding: "20px 16px 8px" }} />
          <Card style={{ margin: "0 12px" }}>
            <div style={{ padding: 16, fontSize: 13, color: TOK.text, lineHeight: 1.5 }}>{session.notes}</div>
          </Card>
        </>
      )}
    </div>
  );
}
