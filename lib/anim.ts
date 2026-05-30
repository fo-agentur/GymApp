"use client";
import React from "react";

// Smoothly counts a number up from 0 to `target` on mount / when target changes.
export function useCountUp(target: number, durationMs = 750): number {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === "undefined") {
      setVal(target);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

// Flips to true shortly after mount — drives CSS width/opacity transitions
// (e.g. progress bars filling from 0).
export function useMounted(delayMs = 40): boolean {
  const [m, setM] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setM(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return m;
}
