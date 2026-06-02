"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutines, type RoutineFull } from "@/lib/data";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Btn, FAB, EmptyState, I } from "@/lib/design";

export default function Routines() {
  const { db, accent, exMap, goto } = useApp();
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        setRoutines(await fetchRoutines(db));
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96, position: "relative" }}>
      <ScreenHeader large title="Training" />

      {/* Entry point to the exercise library + how-to guides */}
      <div style={{ padding: "0 12px 8px" }}>
        <button
          onClick={() => goto("library")}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: TOK.surface, border: "none", borderRadius: 14, padding: "14px 16px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: TOK.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I.Dumbbell size={18} color={accent.hex} w={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 600 }}>Übungs-Bibliothek</div>
            <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>How-to-Guides, Muskeln & deine Historie</div>
          </div>
          <I.ChevR size={16} color={TOK.dim} />
        </button>
      </div>

      <SectionHeader title="Meine Workouts" />
      {loading ? (
        <div style={{ padding: "8px 16px", color: TOK.dim, fontSize: 13 }}>Lädt…</div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<I.Routine size={20} />}
          title="Noch keine Workouts"
          description="Erstelle ein Workout, um deine Einheiten zu planen — oder starte vom Home ein leeres Training."
          cta={<Btn variant="primary" accent={accent} onClick={() => goto("routine-editor")}>Workout erstellen</Btn>}
        />
      ) : (
        <div style={{ padding: "0 12px" }}>
          {routines.map((r) => {
            const totalSets = r.routine_exercises.reduce((n, e) => n + (e.target_sets || 0), 0);
            const estMin = Math.max(15, Math.round(totalSets * 3.5));
            const muscles = Array.from(
              new Set(r.routine_exercises.map((e) => exMap[e.exercise_id]?.primary_muscle).filter(Boolean) as string[])
            ).slice(0, 4);
            return (
              <button
                key={r.id}
                onClick={() => goto("workout-overview", r.id)}
                style={{ width: "100%", textAlign: "left", background: TOK.surface, borderRadius: 16, border: "none", padding: 16, marginBottom: 10, cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: TOK.muted, marginTop: 4, display: "flex", gap: 8, alignItems: "baseline" }}>
                      <Tnum>{r.routine_exercises.length} Übungen</Tnum>
                      <span style={{ color: TOK.dim }}>·</span>
                      <Tnum>~{estMin} Min</Tnum>
                    </div>
                  </div>
                  <I.ChevR size={18} color={TOK.dim} />
                </div>
                {muscles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {muscles.map((m) => (
                      <span key={m} style={{ fontSize: 11, color: TOK.muted, background: TOK.surface2, borderRadius: 6, padding: "3px 8px" }}>{m}</span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <FAB accent={accent} onClick={() => goto("routine-editor")}>
        <I.Plus size={18} color={accent.ink} w={2.5} />
        <span>Neu</span>
      </FAB>
    </div>
  );
}
