"use client";
// Theme preference: light / dark / system. Applied as data-theme on <html>
// (globals.css defines both palettes). Persisted in localStorage so the right
// theme paints before any data loads, and mirrored to profiles.theme so it
// follows the user across devices.

export type ThemePref = "light" | "dark" | "system";

export const THEME_KEY = "gymapp-theme";

export function normalizeTheme(v: unknown): ThemePref {
  return v === "dark" || v === "light" || v === "system" ? v : "system";
}

function resolve(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function applyTheme(pref: ThemePref) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolve(pref);
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* private mode */
  }
}

export function storedTheme(): ThemePref {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

// Keep "system" users in sync when the OS theme flips while the app is open.
export function watchSystemTheme(): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (storedTheme() === "system") applyTheme("system");
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
