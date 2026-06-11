"use client";
import React from "react";
import { TOK } from "@/lib/design";
import { intensity, type MuscleGroup } from "@/lib/muscles";
import { BODY_FRONT, BODY_BACK, FRONT_VIEWBOX, BACK_VIEWBOX, type BodyPart } from "@/lib/body-paths";

// Anatomical front + back muscle heatmap. Each muscle region tints brand-blue
// by how much it was worked (weekly sets → intensity); neutral body parts
// (head, hands, knees, …) stay in the surface tone. Tappable via onSelect.

type Sets = Partial<Record<MuscleGroup, number>>;
const NEUTRAL = "var(--c-surface2)";
const UNWORKED = "var(--c-surface3)";

// Worked muscles glow brand-blue, scaled by weekly set intensity.
function heat(sets: number): string {
  const t = intensity(sets);
  if (t <= 0) return UNWORKED;
  const a = 0.3 + 0.7 * t;
  return `rgba(47, 107, 255, ${a.toFixed(2)})`;
}

function Figure({
  parts, viewBox, height, sets, onSelect, selected, label,
}: {
  parts: BodyPart[]; viewBox: string; height: number; sets: Sets;
  onSelect?: (m: MuscleGroup) => void; selected?: MuscleGroup | null; label?: string;
}) {
  // source figures are 642×1264 → keep the aspect ratio
  const w = Math.round((height * 642) / 1264);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={w} height={height} viewBox={viewBox} style={{ display: "block" }}>
        {parts.map((part, i) =>
          part.d.map((d, j) => (
            <path
              key={`${i}-${j}`}
              d={d}
              fill={part.group ? heat(sets[part.group] ?? 0) : NEUTRAL}
              stroke={part.group && selected === part.group ? TOK.text : "none"}
              strokeWidth={6}
              onClick={part.group && onSelect ? () => onSelect(part.group as MuscleGroup) : undefined}
              style={{
                cursor: part.group && onSelect ? "pointer" : "default",
                transition: "fill 500ms ease",
              }}
            />
          ))
        )}
      </svg>
      {label && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: TOK.dim }}>{label}</span>}
    </div>
  );
}

export default function MuscleMap({
  sets,
  onSelect,
  selected,
  height = 330,
  labels = true,
}: {
  sets: Sets;
  onSelect?: (m: MuscleGroup) => void;
  selected?: MuscleGroup | null;
  height?: number;
  labels?: boolean;
}) {
  const h = labels ? height - 18 : height;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
      <Figure parts={BODY_FRONT} viewBox={FRONT_VIEWBOX} height={h} sets={sets} onSelect={onSelect} selected={selected} label={labels ? "VORNE" : undefined} />
      <Figure parts={BODY_BACK} viewBox={BACK_VIEWBOX} height={h} sets={sets} onSelect={onSelect} selected={selected} label={labels ? "HINTEN" : undefined} />
    </div>
  );
}
