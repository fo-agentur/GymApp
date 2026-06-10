"use client";
// Progress — the stats screen. Two views:
// "Muskeln": the MacroFactor-style body heatmap — front/back silhouette with
//   muscle groups tinted by this week's working sets, plus a tappable
//   per-muscle breakdown.
// "Verlauf": Sätze/Volumen bar chart over 1W…Alle, plus Top-Übungen.
import React from "react";
import { useApp } from "../app-context";
import { fetchSessions } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, ScreenHeader, EmptyState, I, fmtVol } from "@/lib/design";
import { BarsChart } from "@/lib/charts";
import { MUSCLE_GROUPS, deMuscle, statusLabel, intensity, type MuscleGroup } from "@/lib/muscles";
import MuscleMap from "../MuscleMap";

type SetRow = { weight_kg: number | null; reps: number | null; is_warmup: boolean; exercise_id: string; completed_at: string };
type View = "muscles" | "trend";
type Metric = "sets" | "volume";
type Range = "1W" | "1M" | "3M" | "6M" | "1J" | "Alle";
const RANGES: Range[] = ["1W", "1M", "3M", "6M", "1J", "Alle"];

const DOW_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MON_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const DAY_MS = 24 * 3600 * 1000;

type Bucket = { start: number; end: number; label: string };

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

// Build the time buckets (and their labels) for a given range.
function buildBuckets(range: Range, earliest: number): Bucket[] {
  const now = new Date();
  const today = startOfDay(now);
  const buckets: Bucket[] = [];
  if (range === "1W") {
    for (let i = 6; i >= 0; i--) {
      const s = new Date(today); s.setDate(today.getDate() - i);
      const e = new Date(s); e.setDate(s.getDate() + 1);
      buckets.push({ start: s.getTime(), end: e.getTime(), label: DOW_DE[s.getDay()] });
    }
  } else if (range === "1M") {
    // last 5 weeks, Monday-aligned
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    for (let i = 4; i >= 0; i--) {
      const s = new Date(monday); s.setDate(monday.getDate() - i * 7);
      const e = new Date(s); e.setDate(s.getDate() + 7);
      buckets.push({ start: s.getTime(), end: e.getTime(), label: `${s.getDate()}.${s.getMonth() + 1}` });
    }
  } else {
    const months = range === "3M" ? 3 : range === "6M" ? 6 : range === "1J" ? 12 : Math.max(1, Math.min(18, monthsSince(earliest) + 1));
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = months - 1; i >= 0; i--) {
      const s = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const e = new Date(base.getFullYear(), base.getMonth() - i + 1, 1);
      buckets.push({ start: s.getTime(), end: e.getTime(), label: MON_DE[s.getMonth()] });
    }
  }
  return buckets;
}
function monthsSince(ts: number) {
  if (!ts) return 0;
  const a = new Date(ts), b = new Date();
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
function fmtRange(buckets: Bucket[]): string {
  if (!buckets.length) return "";
  const s = new Date(buckets[0].start);
  const e = new Date(buckets[buckets.length - 1].end - 1);
  const f = (d: Date) => `${d.getDate()}. ${MON_DE[d.getMonth()]}`;
  return `${f(s)} – ${f(e)}`;
}

export default function Progress() {
  const { db, exMap } = useApp();
  const [rows, setRows] = React.useState<SetRow[]>([]);
  const [sessions, setSessions] = React.useState<WorkoutSession[]>([]);
  const [view, setView] = React.useState<View>("muscles");
  const [metric, setMetric] = React.useState<Metric>("sets");
  const [range, setRange] = React.useState<Range>("1M");
  const [selMuscle, setSelMuscle] = React.useState<MuscleGroup | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [{ data }, ss] = await Promise.all([
          db.from("sets").select("weight_kg,reps,is_warmup,exercise_id,completed_at"),
          fetchSessions(db),
        ]);
        setRows((data ?? []) as SetRow[]);
        setSessions(ss);
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  // ── This week's per-muscle working sets (body map) ──
  const muscleSets = React.useMemo(() => {
    const weekStart = Date.now() - 7 * DAY_MS;
    const agg: Partial<Record<MuscleGroup, number>> = {};
    for (const r of rows) {
      if (r.is_warmup || !r.completed_at) continue;
      if (new Date(r.completed_at).getTime() < weekStart) continue;
      const m = exMap[r.exercise_id]?.primary_muscle as MuscleGroup | undefined;
      if (!m) continue;
      agg[m] = (agg[m] ?? 0) + 1;
    }
    return agg;
  }, [rows, exMap]);

  const muscleList = React.useMemo(
    () =>
      MUSCLE_GROUPS.map((m) => ({ muscle: m, sets: muscleSets[m] ?? 0 }))
        .sort((a, b) => b.sets - a.sets),
    [muscleSets]
  );

  const earliest = React.useMemo(() => rows.reduce((min, r) => {
    const t = r.completed_at ? new Date(r.completed_at).getTime() : 0;
    return t && (min === 0 || t < min) ? t : min;
  }, 0), [rows]);

  const buckets = React.useMemo(() => buildBuckets(range, earliest), [range, earliest]);

  const value = React.useCallback(
    (r: SetRow) => (metric === "sets" ? 1 : (r.weight_kg ?? 0) * (r.reps ?? 0)),
    [metric]
  );

  const bars = React.useMemo(() => {
    const out = buckets.map((b) => ({ label: b.label, value: 0 }));
    for (const r of rows) {
      if (r.is_warmup || !r.completed_at) continue;
      const t = new Date(r.completed_at).getTime();
      for (let i = 0; i < buckets.length; i++) {
        if (t >= buckets[i].start && t < buckets[i].end) { out[i].value += value(r); break; }
      }
    }
    return out;
  }, [buckets, rows, value]);

  const total = bars.reduce((n, b) => n + b.value, 0);
  const avg = bars.length ? total / bars.length : 0;

  // Top exercises by the active metric, within the visible range.
  const topEx = React.useMemo(() => {
    const lo = buckets[0]?.start ?? 0, hi = buckets[buckets.length - 1]?.end ?? Date.now();
    const agg: Record<string, number> = {};
    for (const r of rows) {
      if (r.is_warmup || !r.completed_at) continue;
      const t = new Date(r.completed_at).getTime();
      if (t < lo || t >= hi) continue;
      agg[r.exercise_id] = (agg[r.exercise_id] ?? 0) + value(r);
    }
    return Object.entries(agg).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v).slice(0, 5);
  }, [rows, buckets, value]);

  const fmtVal = (v: number) => (metric === "sets" ? Math.round(v).toLocaleString("de-DE") : fmtVol(v));
  const unit = metric === "sets" ? "Sätze" : "kg";

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
      <ScreenHeader large title="Statistik" />

      {sessions.length === 0 ? (
        <EmptyState icon={<I.Stats size={20} />} title="Noch keine Daten" description="Absolviere ein paar Workouts — Muskeln, Sätze und Volumen erscheinen dann hier." />
      ) : (
        <>
          {/* View tabs */}
          <div style={{ display: "flex", gap: 24, padding: "0 18px", borderBottom: `1px solid ${TOK.border}` }}>
            {([["muscles", "Muskeln"], ["trend", "Verlauf"]] as [View, string][]).map(([v, label]) => {
              const sel = view === v;
              return (
                <button key={v} onClick={() => setView(v)} style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "10px 0 12px", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: sel ? TOK.text : TOK.dim }}>
                  {label}
                  {sel && <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, background: TOK.text }} />}
                </button>
              );
            })}
          </div>

          {view === "muscles" ? (
            <>
              {/* Body heatmap card */}
              <div style={{ margin: "16px 12px 0", background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 20, padding: "16px 12px 14px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 6px 12px" }}>
                  <div style={{ ...TYPE.cardTitle, color: TOK.text }}>Letzte 7 Tage</div>
                  <Tnum style={{ fontSize: 12, color: TOK.dim }}>{Object.values(muscleSets).reduce((a, b) => a + (b ?? 0), 0)} Sätze</Tnum>
                </div>
                <MuscleMap sets={muscleSets} selected={selMuscle} onSelect={(m) => setSelMuscle((cur) => (cur === m ? null : m))} />
                {/* legend */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: TOK.dim }}>wenig</span>
                  <div style={{ width: 110, height: 7, borderRadius: 4, background: "linear-gradient(to right, var(--c-surface3), rgba(47,107,255,0.45), rgba(47,107,255,1))" }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: TOK.dim }}>viel</span>
                </div>
              </div>

              {/* Per-muscle breakdown */}
              <div style={{ margin: "12px 12px 0", background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 20, padding: "6px 0" }}>
                {muscleList.map(({ muscle, sets }, i) => {
                  const st = statusLabel(sets);
                  const sel = selMuscle === muscle;
                  return (
                    <button
                      key={muscle}
                      onClick={() => setSelMuscle((cur) => (cur === muscle ? null : muscle))}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", background: sel ? TOK.primarySoft : "transparent", border: "none", borderTop: i === 0 ? "none" : `1px solid ${TOK.border}`, cursor: "pointer", fontFamily: "inherit", textAlign: "left", WebkitTapHighlightColor: "transparent" }}
                    >
                      <span style={{ width: 90, fontSize: 13.5, fontWeight: 600, color: sets > 0 ? TOK.text : TOK.dim, flexShrink: 0 }}>{deMuscle(muscle)}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 4, background: TOK.surface2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(intensity(sets) * 100)}%`, background: "var(--c-muscle)", borderRadius: 4, transition: "width 500ms cubic-bezier(0.22,1,0.36,1)" }} />
                      </div>
                      <Tnum style={{ width: 52, textAlign: "right", fontSize: 12.5, fontWeight: 700, color: sets > 0 ? TOK.text : TOK.dim, flexShrink: 0 }}>{sets} {sets === 1 ? "Satz" : "Sätze"}</Tnum>
                      <span style={{ width: 78, textAlign: "right", fontSize: 11, fontWeight: 700, color: st.color, flexShrink: 0 }}>{st.text}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: "10px 20px 0", fontSize: 11.5, color: TOK.dim, lineHeight: 1.5 }}>
                Arbeitssätze der letzten 7 Tage pro Muskelgruppe. Ab ~10 Sätzen pro Woche wächst ein Muskel zuverlässig.
              </div>
            </>
          ) : (
            <>
              {/* Metric segmented */}
              <div style={{ display: "flex", gap: 4, margin: "16px 18px 0", padding: 3, background: TOK.surface2, borderRadius: 11 }}>
                {([["sets", "Sätze"], ["volume", "Volumen"]] as [Metric, string][]).map(([m, label]) => {
                  const sel = metric === m;
                  return (
                    <button key={m} onClick={() => setMetric(m)} style={{ flex: 1, height: 32, borderRadius: 8, border: "none", background: sel ? TOK.surface : "transparent", color: sel ? TOK.text : TOK.muted, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: sel ? `0 1px 3px ${TOK.shadow}` : "none", WebkitTapHighlightColor: "transparent" }}>{label}</button>
                  );
                })}
              </div>

              {/* Average + Total + range label */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 26, padding: "16px 18px 4px" }}>
                <Stat label={metric === "sets" ? "Ø Sätze" : "Ø Volumen"} value={fmtVal(avg)} unit={unit} />
                <Stat label="Gesamt" value={fmtVal(total)} unit={unit} />
              </div>
              <div style={{ padding: "0 18px 10px", fontSize: 12, color: TOK.dim }}>
                <Tnum>{fmtRange(buckets)}</Tnum>
              </div>

              {/* Bar chart */}
              <div style={{ padding: "6px 16px 0" }}>
                <BarsChart bars={bars} color={TOK.accent} height={150} />
              </div>

              {/* Range chips */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "14px 16px 6px" }}>
                {RANGES.map((r) => {
                  const sel = range === r;
                  return (
                    <button key={r} onClick={() => setRange(r)} style={{ flexShrink: 0, minWidth: 44, height: 32, padding: "0 12px", borderRadius: 999, background: sel ? TOK.text : "transparent", color: sel ? "var(--c-bg)" : TOK.muted, border: sel ? "none" : `1px solid ${TOK.border}`, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>{r}</button>
                  );
                })}
              </div>

              {/* Top exercises */}
              {topEx.length > 0 && (
                <>
                  <div style={{ ...TYPE.cardTitle, color: TOK.text, padding: "20px 18px 2px" }}>Top-Übungen</div>
                  <div style={{ ...TYPE.caption, color: TOK.dim, padding: "0 18px 10px" }}>nach {metric === "sets" ? "Sätzen" : "Volumen"} · {range === "Alle" ? "gesamt" : `letzte ${range}`}</div>
                  <div style={{ padding: "0 12px" }}>
                    {topEx.map((e, i) => {
                      const ex = exMap[e.id];
                      const max = topEx[0].v || 1;
                      return (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: i === topEx.length - 1 ? "none" : `1px solid ${TOK.border}` }}>
                          <span style={{ width: 22, height: 22, borderRadius: 999, background: TOK.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Tnum style={{ fontSize: 11, fontWeight: 700, color: TOK.muted }}>{i + 1}</Tnum>
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: TOK.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex?.name ?? "Übung"}</div>
                            <div style={{ height: 5, background: TOK.surface2, borderRadius: 3, overflow: "hidden", marginTop: 5 }}>
                              <div style={{ height: "100%", width: `${(e.v / max) * 100}%`, background: TOK.accent, borderRadius: 3 }} />
                            </div>
                          </div>
                          <Tnum style={{ fontSize: 13, fontWeight: 700, color: TOK.text, flexShrink: 0 }}>{fmtVal(e.v)}</Tnum>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div style={{ ...TYPE.col, color: TOK.dim }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 3 }}>
        <Tnum style={{ fontSize: 24, fontWeight: 800, color: TOK.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</Tnum>
        <span style={{ fontSize: 12, color: TOK.muted, fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  );
}
