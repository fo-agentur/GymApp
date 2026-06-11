"use client";
import React from "react";
import { TOK } from "@/lib/design";
import type { MuscleGroup } from "@/lib/muscles";
import { BODY_FRONT, BODY_BACK, FRONT_VIEWBOX, BACK_VIEWBOX } from "@/lib/body-paths";

// Compact anatomical thumbnail: a single body figure (front or back, whichever
// shows the muscle) with the target group highlighted in brand blue — the
// "Target Muscles" diagram. Shares the path data with MuscleMap.

const BACK_SIDE: Set<string> = new Set(["Back", "Triceps", "Glutes", "Hamstrings", "Calves"]);

export default function MuscleThumb({ muscle, size = 46 }: { muscle: string; size?: number }) {
  const back = BACK_SIDE.has(muscle as MuscleGroup);
  const parts = back ? BODY_BACK : BODY_FRONT;
  const viewBox = back ? BACK_VIEWBOX : FRONT_VIEWBOX;
  return (
    <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
      {parts.map((part, i) =>
        part.d.map((d, j) => (
          <path key={`${i}-${j}`} d={d} fill={part.group === muscle ? TOK.muscle : TOK.surface3} />
        ))
      )}
    </svg>
  );
}
