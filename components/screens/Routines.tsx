"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchRoutines, type RoutineFull } from "@/lib/data";
import { TOK, TYPE, Tnum, ScreenHeader, SectionHeader, Btn, FAB, EmptyState, I, daysAgo } from "@/lib/design";

export default function Routines() {
  const { db, accent, exMap, goto, startWorkout } = useApp();
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
      <ScreenHeader large title="Routines" />

      {/* Entry point to the exercise library + how-to guides */}
      <div style={{ padding: "0 12px 8px" }}>
        <button
          onClick={() => goto("library")}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: TOK.surface, border: "none", borderRadius: 12, padding: "14px 16px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: TOK.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I.Dumbbell size={18} color={accent.hex} w={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 600 }}>Exercise library</div>
            <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>How-to guides, muscles & your history</div>
          </div>
          <I.ChevR size={16} color={TOK.dim} />
        </button>
      </div>

      <SectionHeader title="My Routines" />
      {loading ? (
        <div style={{ padding: "8px 16px", color: TOK.dim, fontSize: 13 }}>Loading…</div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<I.Routine size={20} />}
          title="No routines yet"
          description="Create a routine to plan your sessions — or just start an empty workout from Today."
          cta={<Btn variant="primary" accent={accent} onClick={() => goto("routine-editor")}>New routine</Btn>}
        />
      ) : (
        <div style={{ padding: "0 12px" }}>
          {routines.map((r) => {
            const estMin = Math.max(20, r.routine_exercises.reduce((n, e) => n + e.target_sets * 3, 0));
            return (
              <button key={r.id} onClick={() => goto("routine-editor", r.id)} style={{ width: "100%", textAlign: "left", background: TOK.surface, borderRadius: 12, border: "none", padding: 16, marginBottom: 10, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: TOK.muted, marginTop: 4, display: "flex", gap: 8, alignItems: "baseline" }}>
                      <Tnum>{r.routine_exercises.length} exercises</Tnum>
                      <span style={{ color: TOK.dim }}>·</span>
                      <Tnum>~{estMin}m</Tnum>
                      <span style={{ color: TOK.dim }}>·</span>
                      <span>{daysAgo(r.created_at)}</span>
                    </div>
                  </div>
                  <Btn variant="primary" size="sm" accent={accent} onClick={(e) => { e.stopPropagation(); startWorkout({ routineId: r.id, name: r.name }); }}>
                    Use
                  </Btn>
                </div>
                {r.routine_exercises.length > 0 && (
                  <div style={{ fontSize: 11, color: TOK.dim, marginTop: 8, paddingTop: 12, borderTop: `1px solid ${TOK.border}` }}>
                    {r.routine_exercises.slice(0, 4).map((ex) => exMap[ex.exercise_id]?.name ?? "?").join(" · ")}
                    {r.routine_exercises.length > 4 && ` +${r.routine_exercises.length - 4}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <FAB accent={accent} onClick={() => goto("routine-editor")}>
        <I.Plus size={18} color={accent.ink} w={2.5} />
        <span>New</span>
      </FAB>
    </div>
  );
}
