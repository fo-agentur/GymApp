"use client";
// illustrations.tsx — original space-themed illustration kit for MacroFactor
// Workouts. Pentagram's new look uses an "adventurous, space-themed aesthetic";
// these are our own line/gradient SVGs (no third-party/brand assets) for
// onboarding screens and empty states. Accent-driven, theme-aware via TOK.
import React from "react";
import { TOK } from "./design";

type IllProps = { size?: number; accent?: string };

// Tiny scattered stars used as a backdrop layer inside the illustrations.
function Stars({ seed = 0 }: { seed?: number }) {
  const pts = [
    [14, 18], [86, 24], [22, 80], [78, 78], [50, 10], [10, 52], [90, 60], [62, 88],
  ];
  return (
    <g fill={TOK.dim}>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x + (seed % 3)} cy={y} r={i % 3 === 0 ? 1.6 : 1} opacity={0.5 + (i % 3) * 0.15} />
      ))}
    </g>
  );
}

// Orbit + core — the signature "science in motion" mark.
export function IllOrbit({ size = 120, accent = TOK.accent }: IllProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Stars />
      <ellipse cx="50" cy="50" rx="38" ry="16" stroke={accent} strokeOpacity="0.7" strokeWidth="2" transform="rotate(-24 50 50)" />
      <ellipse cx="50" cy="50" rx="38" ry="16" stroke={accent} strokeOpacity="0.3" strokeWidth="2" transform="rotate(36 50 50)" />
      <circle cx="50" cy="50" r="11" fill={accent} />
      <circle cx="50" cy="50" r="11" fill="white" fillOpacity="0.12" />
      <circle cx="84" cy="38" r="3.4" fill={accent} />
    </svg>
  );
}

// Planet with a ring — used on "your program" / goal screens.
export function IllPlanet({ size = 120, accent = TOK.accent }: IllProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Stars seed={1} />
      <circle cx="48" cy="46" r="22" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2" />
      <path d="M30 40c8 4 28 4 36 0" stroke={accent} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="48" cy="46" rx="34" ry="11" stroke={accent} strokeWidth="2.5" transform="rotate(-18 48 46)" />
      <circle cx="68" cy="22" r="2.6" fill={TOK.text} fillOpacity="0.6" />
    </svg>
  );
}

// Rocket — onboarding "let's go" / start moments.
export function IllRocket({ size = 120, accent = TOK.accent }: IllProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Stars seed={2} />
      <path d="M50 16c10 8 14 20 14 34l-6 8H42l-6-8c0-14 4-26 14-34Z" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="40" r="6" fill={TOK.bg} stroke={accent} strokeWidth="2" />
      <path d="M42 58l-8 10 10-3M58 58l8 10-10-3" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 70c2 6 6 9 6 9s4-3 6-9c-4 3-8 3-12 0Z" fill="var(--c-set-warmup)" />
    </svg>
  );
}

// Constellation / dumbbell — empty training states.
export function IllConstellation({ size = 120, accent = TOK.accent }: IllProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Stars seed={3} />
      <path d="M24 50h6M70 50h6M38 42v16M62 42v16M40 50h20" stroke={TOK.text} strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 30l14 16M70 30L56 46" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="2 4" />
      <circle cx="30" cy="30" r="2.4" fill={accent} />
      <circle cx="70" cy="30" r="2.4" fill={accent} />
    </svg>
  );
}

export const ILL = {
  orbit: IllOrbit,
  planet: IllPlanet,
  rocket: IllRocket,
  constellation: IllConstellation,
};
