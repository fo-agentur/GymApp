"use client";
import React from "react";
import { useApp } from "../app-context";
import { TOK, TYPE, Tnum, ScreenHeader, Card, EmptyState, I, fmtW, epley1rm } from "@/lib/design";

type ExSet = {
  id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
  session: { started_at: string; name: string | null; finished_at: string | null } | null;
};
type SessionGroup = { date: string; name: string | null; sets: ExSet[]; e1rm: number; top: ExSet | null };

export default function ExerciseDetail() {
  const { db, params, exMap, accent, goto } = useApp();
  const exId = params.exerciseId;
  const ex = exId ? exMap[exId] : undefined;
  const [tab, setTab] = React.useState<"history" | "charts">("history");
  const [groups, setGroups] = React.useState<SessionGroup[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      if (!exId) return;
      try {
        const { data } = await db
          .from("sets")
          .select("id,set_index,weight_kg,reps,rpe,is_warmup, workout_sessions(started_at,name,finished_at)")
          .eq("exercise_id", exId)
          .order("completed_at", { ascending: false });
        const rows = (data ?? []).map((r: any) => ({ ...r, session: r.workout_sessions })) as ExSet[];
        const map: Record<string, SessionGroup> = {};
        const ord: string[] = [];
        for (const s of rows) {
          if (!s.session || !s.session.finished_at) continue;
          const key = s.session.started_at;
          if (!map[key]) {
            map[key] = { date: key, name: s.session.name, sets: [], e1rm: 0, top: null };
            ord.push(key);
          }
          map[key].sets.push(s);
        }
        const gs = ord.map((k) => {
          const g = map[k];
          for (const s of g.sets) {
            if (s.is_warmup || s.weight_kg == null || s.reps == null) continue;
            const e = epley1rm(s.weight_kg, s.reps);
            if (e > g.e1rm) g.e1rm = e;
            if (!g.top || (s.weight_kg ?? 0) > (g.top.weight_kg ?? 0)) g.top = s;
          }
          return g;
        });
        setGroups(gs);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, exId]);

  if (!ex) return <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Exercise not found.</div>;

  const chartData = [...groups].reverse().filter((g) => g.e1rm > 0).map((g, i) => ({ x: i, y: g.e1rm }));

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 24 }}>
      <ScreenHeader back onBack={() => goto("library")} title="" />
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ ...TYPE.h1, color: TOK.text }}>{ex.name}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
          <span style={tag}>{ex.primary_muscle}</span>
          <span style={tag}>{ex.category[0].toUpperCase() + ex.category.slice(1)}</span>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${TOK.border}`, padding: "0 16px", gap: 24 }}>
        {(["history", "charts"] as const).map((t) => {
          const sel = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "12px 0", position: "relative", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: sel ? TOK.text : TOK.dim, letterSpacing: "-0.01em" }}>
              {t === "history" ? "History" : "Charts"}
              {sel && <span style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: accent.hex, borderRadius: 999 }} />}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Loading…</div>
      ) : groups.length === 0 ? (
        <EmptyState icon={<I.History size={20} />} title="No history yet" description="Log this exercise in a workout and it'll show up here." />
      ) : tab === "history" ? (
        <div>
          {groups.map((g) => (
            <div key={g.date} style={{ padding: "12px 16px 8px", borderBottom: `1px solid ${TOK.border}` }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 600 }}>{new Date(g.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                {g.top && <Tnum style={{ fontSize: 12, color: TOK.muted }}>top <span style={{ color: TOK.text }}>{fmtW(g.top.weight_kg)}kg × {g.top.reps}</span></Tnum>}
              </div>
              {g.sets.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TOK.muted, padding: "3px 0" }}>
                  <span style={{ width: 14, color: TOK.dim }}>{s.is_warmup ? "W" : s.set_index}</span>
                  <Tnum style={{ color: TOK.text, fontWeight: 500 }}>{fmtW(s.weight_kg)}<span style={{ color: TOK.dim, marginLeft: 2 }}>kg</span></Tnum>
                  <span style={{ color: TOK.dim }}>×</span>
                  <Tnum style={{ color: TOK.text, fontWeight: 500 }}>{s.reps ?? "—"}</Tnum>
                  {s.rpe != null && <span style={{ marginLeft: "auto" }}><Tnum style={{ color: TOK.dim }}>@{s.rpe}</Tnum></span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "16px 12px" }}>
          {chartData.length < 2 ? (
            <div style={{ padding: "24px", textAlign: "center", color: TOK.dim, fontSize: 13 }}>Need at least 2 sessions to chart progress.</div>
          ) : (
            <Card style={{ padding: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ ...TYPE.col, color: TOK.dim }}>Estimated 1RM</div>
                <Tnum style={{ ...TYPE.h2, color: TOK.text }}>
                  {Math.round(chartData[chartData.length - 1].y)}
                  <span style={{ fontSize: 13, color: TOK.muted, marginLeft: 4, fontWeight: 400 }}>kg</span>
                </Tnum>
              </div>
              <LineChart data={chartData} accentHex={accent.hex} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

const tag: React.CSSProperties = { padding: "4px 10px", borderRadius: 999, background: TOK.surface, color: TOK.muted, fontSize: 11, fontWeight: 600, letterSpacing: "-0.01em" };

function LineChart({ data, accentHex, width = 322, height = 120 }: { data: { x: number; y: number }[]; accentHex: string; width?: number; height?: number }) {
  const pad = { l: 32, r: 8, t: 12, b: 22 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys) * 0.96;
  const maxY = Math.max(...ys) * 1.02;
  const X = (x: number) => pad.l + (x / Math.max(1, data.length - 1)) * w;
  const Y = (y: number) => pad.t + (1 - (y - minY) / Math.max(0.001, maxY - minY)) * h;
  const path = data.map((d, i) => (i === 0 ? "M" : "L") + X(d.x) + "," + Y(d.y)).join(" ");
  const area = path + ` L${X(data.length - 1)},${pad.t + h} L${X(0)},${pad.t + h} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {[maxY, (maxY + minY) / 2, minY].map((v, i) => (
        <g key={i}>
          <text x={pad.l - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" fill={TOK.dim} fontFamily="Geist Mono">{Math.round(v)}</text>
          <line x1={pad.l} x2={pad.l + w} y1={Y(v)} y2={Y(v)} stroke={TOK.border} strokeWidth="1" strokeDasharray={i === 1 ? "2 3" : ""} />
        </g>
      ))}
      <path d={area} fill={accentHex} opacity="0.12" />
      <path d={path} stroke={accentHex} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={X(data.length - 1)} cy={Y(data[data.length - 1].y)} r="3" fill={accentHex} />
    </svg>
  );
}
