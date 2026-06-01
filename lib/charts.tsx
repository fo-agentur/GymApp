"use client";
// charts.tsx — lightweight inline data-viz (no chart lib), MacroFactor-style.
// All colours come from the theme vars in design.tsx so they adapt to light/dark.
import React from "react";
import { TOK, MACRO, Tnum } from "./design";

// ── helpers ─────────────────────────────────────────────────────
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
function niceRound(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0);
}
function Flame({ size = 12, color = TOK.dim }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 3c.5 2.5-1.5 3.7-2.6 5.2C8 10 8 12 8 12s-1-.6-1.4-1.8C5.2 12 5 13.6 5 15a7 7 0 0 0 14 0c0-3.2-2.2-5.2-3.4-6.6C14 6.6 13 4.8 12 3Z"
        fill={color} opacity={0.9} />
    </svg>
  );
}

// ── MacroBarGrid: the signature 7-day × 4-macro grid ────────────
export type MacroDay = { kcal: number; protein: number; carbs: number; fat: number; future?: boolean };
type RowDef = { key: keyof Omit<MacroDay, "future">; label: string; color: string };
const ROWS: RowDef[] = [
  { key: "kcal", label: "", color: MACRO.kcal },
  { key: "protein", label: "P", color: MACRO.protein },
  { key: "fat", label: "F", color: MACRO.fat },
  { key: "carbs", label: "C", color: MACRO.carbs },
];
const BAR_H = 40;
const ROW_GAP = 9;

export function MacroBarGrid({
  week, targets, selected, onSelect, mode = "consumed", dayLabels = ["M", "T", "W", "T", "F", "S", "S"],
}: {
  week: MacroDay[];
  targets: { kcal: number; protein: number; carbs: number; fat: number };
  selected: number;
  onSelect?: (i: number) => void;
  mode?: "consumed" | "remaining";
  dayLabels?: string[];
}) {
  const sel = week[selected];
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {/* grid area */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* selected-day outline */}
        <div style={{
          position: "absolute", top: -5, height: ROWS.length * BAR_H + (ROWS.length - 1) * ROW_GAP + 10,
          left: `calc(${selected} * 100% / 7)`, width: `calc(100% / 7)`,
          border: `1.5px solid ${TOK.muted}`, borderRadius: 9, pointerEvents: "none", boxSizing: "border-box",
        }} />
        {ROWS.map((row) => {
          const target = targets[row.key] || 0;
          return (
            <div key={row.key} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", height: BAR_H, marginBottom: ROW_GAP }}>
              {week.map((d, i) => {
                const consumed = d[row.key] || 0;
                const value = mode === "consumed" ? consumed : Math.max(0, target - consumed);
                const frac = target > 0 ? clamp01(value / target) : 0;
                const over = target > 0 && consumed > target * 1.02 && mode === "consumed";
                return (
                  <button key={i} onClick={() => onSelect?.(i)} style={{
                    border: "none", background: "transparent", padding: "0 3px", cursor: onSelect ? "pointer" : "default",
                    display: "flex", alignItems: "flex-end", justifyContent: "center", WebkitTapHighlightColor: "transparent",
                  }}>
                    <div style={{ width: "100%", maxWidth: 12, height: BAR_H, borderRadius: 4, background: TOK.surface2, position: "relative", overflow: "hidden" }}>
                      <div style={{
                        position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.max(d.future ? 0 : 3, frac * 100)}%`,
                        background: over ? TOK.fail : row.color, opacity: d.future ? 0.18 : 1, borderRadius: 4,
                        transition: "height 500ms cubic-bezier(0.22,1,0.36,1)",
                      }} />
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
        {/* day labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {dayLabels.map((l, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: i === selected ? TOK.text : TOK.dim }}>{l}</div>
          ))}
        </div>
      </div>
      {/* values column for the selected day */}
      <div style={{ width: 74, display: "flex", flexDirection: "column", gap: ROW_GAP }}>
        {ROWS.map((row) => {
          const target = targets[row.key] || 0;
          const consumed = sel ? sel[row.key] || 0 : 0;
          const shown = mode === "consumed" ? consumed : Math.max(0, target - consumed);
          return (
            <div key={row.key} style={{ height: BAR_H, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <Tnum style={{ fontSize: 15, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em" }}>{Math.round(shown)}</Tnum>
                {row.key === "kcal" ? <Flame /> : <span style={{ fontSize: 11, fontWeight: 600, color: TOK.muted }}>{row.label}</span>}
              </div>
              <Tnum style={{ fontSize: 11, color: TOK.dim }}>of {Math.round(target)}</Tnum>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MiniLine: small area+line spark for insight cards ───────────
export function MiniLine({
  data, color = MACRO.kcal, height = 46, area = true, strokeWidth = 2,
}: { data: number[]; color?: string; height?: number; area?: boolean; strokeWidth?: number }) {
  const W = 300;
  if (!data.length) return <div style={{ height }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pad = 4;
  const xs = (i: number) => (data.length === 1 ? W / 2 : (i / (data.length - 1)) * W);
  const ys = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(" ");
  const fill = `${line} L${W} ${height} L0 ${height} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {area && <path d={fill} fill={color} opacity={0.13} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── TrendChart: raw scatter + smoothed trend (weight) ───────────
export function TrendChart({
  raw, trend, height = 150, color = "#a78bfa", goal,
}: {
  raw: { x: number; y: number }[];
  trend: { x: number; y: number }[];
  height?: number;
  color?: string;
  goal?: number;
}) {
  const W = 320;
  const all = [...raw.map((p) => p.y), ...trend.map((p) => p.y), ...(goal != null ? [goal] : [])];
  if (!all.length) return <div style={{ height }} />;
  const xsAll = [...raw.map((p) => p.x), ...trend.map((p) => p.x)];
  const xMin = Math.min(...xsAll), xMax = Math.max(...xsAll);
  const xSpan = xMax - xMin || 1;
  let yMin = Math.min(...all), yMax = Math.max(...all);
  const yPadVal = (yMax - yMin) * 0.15 || 1;
  yMin -= yPadVal; yMax += yPadVal;
  const ySpan = yMax - yMin || 1;
  const pad = 6;
  const X = (x: number) => pad + ((x - xMin) / xSpan) * (W - pad * 2);
  const Y = (y: number) => pad + (1 - (y - yMin) / ySpan) * (height - pad * 2);
  const trendLine = trend.map((p, i) => `${i === 0 ? "M" : "L"}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
  const trendArea = trend.length ? `${trendLine} L${X(trend[trend.length - 1].x).toFixed(1)} ${height} L${X(trend[0].x).toFixed(1)} ${height} Z` : "";
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {goal != null && (
        <line x1={0} x2={W} y1={Y(goal)} y2={Y(goal)} stroke={TOK.dim} strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      )}
      {trendArea && <path d={trendArea} fill={color} opacity={0.1} />}
      {raw.map((p, i) => (
        <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={2.4} fill={TOK.dim} />
      ))}
      <path d={trendLine} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── BarsChart: labelled vertical bars (volume / sets) ───────────
export function BarsChart({
  bars, color = MACRO.kcal, height = 130, highlight,
}: { bars: { label: string; value: number }[]; color?: string; height?: number; highlight?: number }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <Tnum style={{ fontSize: 10, color: TOK.dim }}>{b.value > 0 ? niceRound(b.value) : ""}</Tnum>
          <div style={{
            width: "100%", maxWidth: 26, height: `${(b.value / max) * 100}%`, minHeight: b.value > 0 ? 3 : 0,
            background: color, opacity: highlight == null || highlight === i ? 1 : 0.4, borderRadius: 5,
            transition: "height 500ms cubic-bezier(0.22,1,0.36,1)",
          }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: TOK.dim }}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
