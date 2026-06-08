"use client";
// Progress — the MacroFactor Workouts "Workouts" stats screen: a Sätze/Volumen
// toggle, average + total for the selected range, an orange bar chart over a
// range selector (1W/1M/3M/6M/1J/Alle), and a Top-Übungen list.
import React from "react";
import { useApp } from "../app-context";
import { fetchSessions } from "@/lib/data";
import type { WorkoutSession } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, ScreenHeader, EmptyState, I, fmtVol } from "@/lib/design";
import { BarsChart } from "@/lib/charts";

type SetRow = { weight_kg: number | null; reps: number | null; is_warmup: boolean; exercise_id: string; completed_at: string };
type Metric = "sets" | "volume";
type Range = "1W" | "1M" | "3M" | "6M" | "1J" | "Alle";
const RANGES: Range[] = ["1W", "1M", "3M", "6M", "1J", "Alle"];

const DOW_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MON_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

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
  const [metric, setMetric] = React.useState<Metric>("sets");
  const [range, setRange] = React.useState<Range>("1W");
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

  const earliest = React.useMemo(() => rows.reduce((min, r) => {
    const t = r.completed_at ? new Date(r.completed_at).getTime() : 0;
    return t && (min === 0 || t < min) ? t : min;
  }, 0), [rows]);

  const buckets = React.useMemo(() => buildBuckets(range, earliest), [range, earliest]);

  const value = (r: SetRow) => (metric === "sets" ? 1 : (r.weight_kg ?? 0) * (r.reps ?? 0));

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
  }, [buckets, rows, metric]);

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
  }, [rows, buckets, metric]);

  const fmtVal = (v: number) => (metric === "sets" ? Math.round(v).toLocaleString("de-DE") : fmtVol(v));
  const unit = metric === "sets" ? "Sätze" : "kg";

  if (loading) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Lädt…</div>;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 28 }}>
      <ScreenHeader large title="Statistik" />

      {sessions.length === 0 ? (
        <EmptyState icon={<I.Stats size={20} />} title="Noch keine Daten" description="Absolviere ein paar Workouts — Sätze, Volumen und Verlauf erscheinen dann hier." />
      ) : (
        <>
          {/* Metric tabs */}
          <div style={{ display: "flex", gap: 24, padding: "0 18px", borderBottom: `1px solid ${TOK.border}` }}>
            {([["sets", "Sätze"], ["volume", "Volumen"]] as [Metric, string][]).map(([m, label]) => {
              const sel = metric === m;
              return (
                <button key={m} onClick={() => setMetric(m)} style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "10px 0 12px", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: sel ? TOK.text : TOK.dim }}>
                  {label}
                  {sel && <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, background: TOK.text }} />}
                </button>
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

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0 4px" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: TOK.accent }} />
            <span style={{ fontSize: 12, color: TOK.muted, fontWeight: 600 }}>{metric === "sets" ? "Sätze" : "Volumen"}</span>
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
