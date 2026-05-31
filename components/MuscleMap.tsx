"use client";
import React from "react";
import { heatColor, intensity, type MuscleGroup } from "@/lib/muscles";

// Front + back anatomical silhouette. A connected body outline (neutral) with
// muscle regions layered on top, each filled by how much it was trained this
// week (sets -> intensity -> lime heat). Tappable via onSelect.

type Sets = Partial<Record<MuscleGroup, number>>;
const BODY = "#1a1a1a"; // neutral silhouette
const OUTLINE = "#262626";

export default function MuscleMap({
  sets,
  onSelect,
  selected,
}: {
  sets: Sets;
  onSelect?: (m: MuscleGroup) => void;
  selected?: MuscleGroup | null;
}) {
  const fill = (m: MuscleGroup) => heatColor(intensity(sets[m] ?? 0));
  const stroke = (m: MuscleGroup) => (selected === m ? "#fafafa" : "rgba(0,0,0,0.45)");
  const sw = (m: MuscleGroup) => (selected === m ? 1.4 : 0.5);

  function M({ m, d }: { m: MuscleGroup; d: string }) {
    return (
      <path
        d={d}
        fill={fill(m)}
        stroke={stroke(m)}
        strokeWidth={sw(m)}
        onClick={onSelect ? () => onSelect(m) : undefined}
        style={{ cursor: onSelect ? "pointer" : "default", transition: "fill 500ms ease" }}
      />
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
      {/* ---------- FRONT ---------- */}
      <svg width="150" height="330" viewBox="0 0 160 360" style={{ display: "block" }}>
        {/* silhouette outline */}
        <path
          fill={BODY}
          stroke={OUTLINE}
          strokeWidth="1"
          d="M80 8
             c10 0 17 8 17 19 c0 8 -3 12 -6 16 c8 2 14 6 19 12
             c7 8 9 18 11 30 c2 11 4 20 8 30 c2 6 0 10 -4 11 c-4 1 -7 -2 -9 -7
             c-2 -6 -4 -12 -6 -17 c1 14 2 28 1 40 c-1 10 -3 19 -5 27
             c3 18 4 38 3 56 c-1 16 -4 31 -7 44 c-2 9 -3 17 -2 24
             c1 6 2 12 1 16 c-1 4 -5 5 -9 4 c-4 -1 -6 -5 -7 -11
             c-1 -8 -2 -17 -4 -27 c-2 -12 -4 -24 -5 -36 c-1 12 -3 24 -5 36
             c-2 10 -3 19 -4 27 c-1 6 -3 10 -7 11 c-4 1 -8 0 -9 -4
             c-1 -4 0 -10 1 -16 c1 -7 0 -15 -2 -24 c-3 -13 -6 -28 -7 -44
             c-1 -18 0 -38 3 -56 c-2 -8 -4 -17 -5 -27 c-1 -12 0 -26 1 -40
             c-2 5 -4 11 -6 17 c-2 5 -5 8 -9 7 c-4 -1 -6 -5 -4 -11
             c4 -10 6 -19 8 -30 c2 -12 4 -22 11 -30 c5 -6 11 -10 19 -12
             c-3 -4 -6 -8 -6 -16 c0 -11 7 -19 17 -19 z"
        />
        {/* shoulders */}
        <M m="Shoulders" d="M52 56 c-8 -2 -16 1 -20 8 c-2 4 -1 9 4 10 c6 1 13 -3 18 -8 z" />
        <M m="Shoulders" d="M108 56 c8 -2 16 1 20 8 c2 4 1 9 -4 10 c-6 1 -13 -3 -18 -8 z" />
        {/* chest */}
        <M m="Chest" d="M62 62 c6 -3 14 -3 16 1 l0 22 c-6 4 -15 3 -19 -3 c-3 -6 -2 -15 3 -20 z" />
        <M m="Chest" d="M98 62 c-6 -3 -14 -3 -16 1 l0 22 c6 4 15 3 19 -3 c3 -6 2 -15 -3 -20 z" />
        {/* biceps */}
        <M m="Biceps" d="M40 76 c-5 1 -8 6 -8 14 c0 9 2 18 5 24 c2 3 6 2 7 -2 c2 -10 2 -24 0 -33 c-1 -3 -2 -4 -4 -3 z" />
        <M m="Biceps" d="M120 76 c5 1 8 6 8 14 c0 9 -2 18 -5 24 c-2 3 -6 2 -7 -2 c-2 -10 -2 -24 0 -33 c1 -3 2 -4 4 -3 z" />
        {/* forearms */}
        <M m="Forearms" d="M34 116 c-3 0 -5 4 -5 11 c0 11 1 22 3 30 c1 4 5 4 6 0 c2 -9 3 -22 2 -33 c-1 -6 -3 -8 -6 -8 z" />
        <M m="Forearms" d="M126 116 c3 0 5 4 5 11 c0 11 -1 22 -3 30 c-1 4 -5 4 -6 0 c-2 -9 -3 -22 -2 -33 c1 -6 3 -8 6 -8 z" />
        {/* abs / core */}
        <M m="Core" d="M66 90 c8 -3 20 -3 28 0 c2 14 1 34 -4 50 c-3 9 -7 12 -10 12 c-3 0 -7 -3 -10 -12 c-5 -16 -6 -36 -4 -50 z" />
        {/* quads */}
        <M m="Quads" d="M60 156 c6 -2 12 -2 17 0 c2 24 0 52 -4 72 c-2 9 -5 13 -8 13 c-3 0 -5 -6 -7 -16 c-4 -22 -3 -50 2 -69 z" />
        <M m="Quads" d="M100 156 c-6 -2 -12 -2 -17 0 c-2 24 0 52 4 72 c2 9 5 13 8 13 c3 0 5 -6 7 -16 c4 -22 3 -50 -2 -69 z" />
        {/* calves */}
        <M m="Calves" d="M60 250 c5 -1 10 -1 14 1 c2 18 0 40 -4 56 c-1 6 -4 8 -6 8 c-2 0 -4 -4 -6 -12 c-3 -17 -2 -40 2 -53 z" />
        <M m="Calves" d="M100 250 c-5 -1 -10 -1 -14 1 c-2 18 0 40 4 56 c1 6 4 8 6 8 c2 0 4 -4 6 -12 c3 -17 2 -40 -2 -53 z" />
        <text x="80" y="352" textAnchor="middle" fontSize="9" fill="#52525b" fontFamily="Geist Mono">FRONT</text>
      </svg>

      {/* ---------- BACK ---------- */}
      <svg width="150" height="330" viewBox="0 0 160 360" style={{ display: "block" }}>
        <path
          fill={BODY}
          stroke={OUTLINE}
          strokeWidth="1"
          d="M80 8
             c10 0 17 8 17 19 c0 8 -3 12 -6 16 c8 2 14 6 19 12
             c7 8 9 18 11 30 c2 11 4 20 8 30 c2 6 0 10 -4 11 c-4 1 -7 -2 -9 -7
             c-2 -6 -4 -12 -6 -17 c1 14 2 28 1 40 c-1 10 -3 19 -5 27
             c3 18 4 38 3 56 c-1 16 -4 31 -7 44 c-2 9 -3 17 -2 24
             c1 6 2 12 1 16 c-1 4 -5 5 -9 4 c-4 -1 -6 -5 -7 -11
             c-1 -8 -2 -17 -4 -27 c-2 -12 -4 -24 -5 -36 c-1 12 -3 24 -5 36
             c-2 10 -3 19 -4 27 c-1 6 -3 10 -7 11 c-4 1 -8 0 -9 -4
             c-1 -4 0 -10 1 -16 c1 -7 0 -15 -2 -24 c-3 -13 -6 -28 -7 -44
             c-1 -18 0 -38 3 -56 c-2 -8 -4 -17 -5 -27 c-1 -12 0 -26 1 -40
             c-2 5 -4 11 -6 17 c-2 5 -5 8 -9 7 c-4 -1 -6 -5 -4 -11
             c4 -10 6 -19 8 -30 c2 -12 4 -22 11 -30 c5 -6 11 -10 19 -12
             c-3 -4 -6 -8 -6 -16 c0 -11 7 -19 17 -19 z"
        />
        {/* rear delts */}
        <M m="Shoulders" d="M52 56 c-8 -2 -16 1 -20 8 c-2 4 -1 9 4 10 c6 1 13 -3 18 -8 z" />
        <M m="Shoulders" d="M108 56 c8 -2 16 1 20 8 c2 4 1 9 -4 10 c-6 1 -13 -3 -18 -8 z" />
        {/* upper back / traps */}
        <M m="Back" d="M64 58 c10 -3 22 -3 32 0 c3 6 4 14 2 20 c-3 8 -10 12 -18 12 c-8 0 -15 -4 -18 -12 c-2 -6 -1 -14 2 -20 z" />
        {/* lats */}
        <M m="Back" d="M62 92 c6 -2 12 -1 16 2 c0 14 -2 28 -6 38 c-2 5 -5 6 -8 4 c-4 -3 -6 -10 -6 -20 c0 -9 1 -18 4 -24 z" />
        <M m="Back" d="M98 92 c-6 -2 -12 -1 -16 2 c0 14 2 28 6 38 c2 5 5 6 8 4 c4 -3 6 -10 6 -20 c0 -9 -1 -18 -4 -24 z" />
        {/* triceps */}
        <M m="Triceps" d="M40 76 c-5 1 -8 6 -8 14 c0 9 2 18 5 24 c2 3 6 2 7 -2 c2 -10 2 -24 0 -33 c-1 -3 -2 -4 -4 -3 z" />
        <M m="Triceps" d="M120 76 c5 1 8 6 8 14 c0 9 -2 18 -5 24 c-2 3 -6 2 -7 -2 c-2 -10 -2 -24 0 -33 c1 -3 2 -4 4 -3 z" />
        {/* forearms */}
        <M m="Forearms" d="M34 116 c-3 0 -5 4 -5 11 c0 11 1 22 3 30 c1 4 5 4 6 0 c2 -9 3 -22 2 -33 c-1 -6 -3 -8 -6 -8 z" />
        <M m="Forearms" d="M126 116 c3 0 5 4 5 11 c0 11 -1 22 -3 30 c-1 4 -5 4 -6 0 c-2 -9 -3 -22 -2 -33 c1 -6 3 -8 6 -8 z" />
        {/* glutes */}
        <M m="Glutes" d="M64 142 c6 -3 12 -3 15 0 c2 5 2 14 -1 20 c-3 6 -8 8 -12 6 c-4 -2 -6 -8 -6 -15 c0 -5 1 -9 4 -11 z" />
        <M m="Glutes" d="M96 142 c-6 -3 -12 -3 -15 0 c-2 5 -2 14 1 20 c3 6 8 8 12 6 c4 -2 6 -8 6 -15 c0 -5 -1 -9 -4 -11 z" />
        {/* hamstrings */}
        <M m="Hamstrings" d="M61 166 c5 -2 11 -2 16 0 c2 22 0 46 -4 64 c-2 8 -5 11 -8 11 c-3 0 -5 -5 -7 -14 c-4 -20 -3 -44 3 -61 z" />
        <M m="Hamstrings" d="M99 166 c-5 -2 -11 -2 -16 0 c-2 22 0 46 4 64 c2 8 5 11 8 11 c3 0 5 -5 7 -14 c4 -20 3 -44 -3 -61 z" />
        {/* calves */}
        <M m="Calves" d="M60 250 c5 -1 10 -1 14 1 c2 18 0 40 -4 56 c-1 6 -4 8 -6 8 c-2 0 -4 -4 -6 -12 c-3 -17 -2 -40 2 -53 z" />
        <M m="Calves" d="M100 250 c-5 -1 -10 -1 -14 1 c-2 18 0 40 4 56 c1 6 4 8 6 8 c2 0 4 -4 6 -12 c3 -17 2 -40 -2 -53 z" />
        <text x="80" y="352" textAnchor="middle" fontSize="9" fill="#52525b" fontFamily="Geist Mono">BACK</text>
      </svg>
    </div>
  );
}
