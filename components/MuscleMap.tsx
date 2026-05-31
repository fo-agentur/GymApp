"use client";
import React from "react";
import { heatColor, intensity, type MuscleGroup } from "@/lib/muscles";

// Front + back body. Each muscle region is filled by how much it was trained
// this week (sets -> intensity -> lime heat). Tappable via onSelect.

type Sets = Partial<Record<MuscleGroup, number>>;

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
  const stroke = (m: MuscleGroup) => (selected === m ? "#fafafa" : "rgba(255,255,255,0.07)");
  const sw = (m: MuscleGroup) => (selected === m ? 1.6 : 0.6);

  function G({ m, children }: { m: MuscleGroup; children: React.ReactNode }) {
    return (
      <g
        fill={fill(m)}
        stroke={stroke(m)}
        strokeWidth={sw(m)}
        onClick={onSelect ? () => onSelect(m) : undefined}
        style={{ cursor: onSelect ? "pointer" : "default", transition: "fill 500ms ease" }}
      >
        {children}
      </g>
    );
  }

  const NEUTRAL = "#141414";

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
      {/* FRONT */}
      <svg width="148" height="320" viewBox="0 0 148 320" style={{ display: "block" }}>
        <circle cx={74} cy={24} r={15} fill={NEUTRAL} />
        <rect x={68} y={37} width={12} height={8} rx={3} fill={NEUTRAL} />
        <G m="Shoulders">
          <ellipse cx={48} cy={62} rx={13} ry={11} />
          <ellipse cx={100} cy={62} rx={13} ry={11} />
        </G>
        <G m="Chest">
          <rect x={56} y={66} width={17} height={26} rx={7} />
          <rect x={75} y={66} width={17} height={26} rx={7} />
        </G>
        <G m="Biceps">
          <rect x={33} y={82} width={13} height={34} rx={6} />
          <rect x={102} y={82} width={13} height={34} rx={6} />
        </G>
        <G m="Forearms">
          <rect x={28} y={118} width={12} height={40} rx={6} />
          <rect x={108} y={118} width={12} height={40} rx={6} />
        </G>
        <G m="Core">
          <rect x={60} y={94} width={28} height={56} rx={9} />
        </G>
        <G m="Quads">
          <rect x={56} y={158} width={16} height={70} rx={9} />
          <rect x={76} y={158} width={16} height={70} rx={9} />
        </G>
        <G m="Calves">
          <rect x={57} y={236} width={14} height={58} rx={8} />
          <rect x={77} y={236} width={14} height={58} rx={8} />
        </G>
        <text x={74} y={314} textAnchor="middle" fontSize="9" fill="#52525b" fontFamily="Geist Mono">FRONT</text>
      </svg>

      {/* BACK */}
      <svg width="148" height="320" viewBox="0 0 148 320" style={{ display: "block" }}>
        <circle cx={74} cy={24} r={15} fill={NEUTRAL} />
        <rect x={68} y={37} width={12} height={8} rx={3} fill={NEUTRAL} />
        <G m="Shoulders">
          <ellipse cx={48} cy={62} rx={13} ry={11} />
          <ellipse cx={100} cy={62} rx={13} ry={11} />
        </G>
        <G m="Back">
          <rect x={56} y={64} width={36} height={40} rx={10} />
          <rect x={59} y={104} width={30} height={36} rx={8} />
        </G>
        <G m="Triceps">
          <rect x={33} y={82} width={13} height={34} rx={6} />
          <rect x={102} y={82} width={13} height={34} rx={6} />
        </G>
        <G m="Forearms">
          <rect x={28} y={118} width={12} height={40} rx={6} />
          <rect x={108} y={118} width={12} height={40} rx={6} />
        </G>
        <G m="Glutes">
          <rect x={56} y={150} width={16} height={24} rx={8} />
          <rect x={76} y={150} width={16} height={24} rx={8} />
        </G>
        <G m="Hamstrings">
          <rect x={56} y={176} width={16} height={56} rx={9} />
          <rect x={76} y={176} width={16} height={56} rx={9} />
        </G>
        <G m="Calves">
          <rect x={57} y={238} width={14} height={56} rx={8} />
          <rect x={77} y={238} width={14} height={56} rx={8} />
        </G>
        <text x={74} y={314} textAnchor="middle" fontSize="9" fill="#52525b" fontFamily="Geist Mono">BACK</text>
      </svg>
    </div>
  );
}
