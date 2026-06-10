"use client";
// charts.tsx — lightweight inline data-viz (no chart lib).
// All colours come from the theme vars in design.tsx so they adapt to light/dark.
import React from "react";
import { TOK, Tnum } from "./design";

function niceRound(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0);
}

// ── BarsChart: labelled vertical bars (volume / sets) ───────────
export function BarsChart({
  bars, color = TOK.accent, height = 130, highlight,
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
