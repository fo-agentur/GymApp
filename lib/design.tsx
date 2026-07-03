"use client";
// design.tsx — Design system ported from the Claude Design handoff (_design/).
// OLED black, lime accent, Geist fonts, inline styles. This is the contract.
import React from "react";

// ── Tokens ──────────────────────────────────────────────────────
// Values resolve to CSS variables defined in app/globals.css (dark by default,
// light under [data-theme="light"]). Flipping the theme is a pure var swap — no
// component edits. Concatenate with alpha is NOT possible on these; use a *-soft
// var or an explicit rgba() instead.
export const TOK = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  surface2: "var(--c-surface2)",
  surface3: "var(--c-surface3)",
  border: "var(--c-border)",
  text: "var(--c-text)",
  muted: "var(--c-muted)",
  dim: "var(--c-dim)",
  fail: "var(--c-fail)",
  pr: "var(--c-pr)",
  primarySoft: "var(--c-primary-soft)",
  // Coral-orange brand accent (MacroFactor). Carries highlights: charts, active
  // states, links, RIR target badges. The neutral primary (black/white) drives
  // solid buttons — the accent is never the button colour.
  accent: "var(--c-accent)",
  accentInk: "var(--c-accent-ink)",
  accentSoft: "var(--c-accent-soft)",
  // Bright blue used for the worked-muscle anatomy diagrams.
  muscle: "var(--c-muscle)",
  shadow: "var(--c-shadow)",
};

// Training set-type colour semantics (logging + analytics).
export const SET = {
  warmup: "var(--c-set-warmup)",
  drop: "var(--c-set-drop)",
  failure: "var(--c-set-failure)",
  myorep: "var(--c-set-myorep)",
  partial: "var(--c-set-partial)",
};

// Reps-in-Reserve colour scale (0 hard → 6+ easy), shown as a dot on every set.
// Clamps to 0..6; non-numeric / null → the neutral "unknown" grey.
export function rirColor(rir: number | null | undefined): string {
  if (rir == null || Number.isNaN(rir)) return "var(--c-rir-x)";
  const r = Math.max(0, Math.min(6, Math.round(rir)));
  return `var(--c-rir-${r})`;
}

// Body/UI typeface — clean and legible for lists, forms, running text.
export const FONT_DISPLAY = '"Hanken Grotesk", -apple-system, "Segoe UI", system-ui, sans-serif';
// Impact typeface — a tall, condensed, already-bold face used ONLY for screen
// titles, the home greeting and hero numbers (elapsed clock, PR weights,
// workout summary stats). It's what gives the app its "gym poster" edge
// instead of reading like a single-typeface macro-tracking app; everywhere
// else stays on FONT_DISPLAY for legibility.
export const FONT_IMPACT = '"Anton", "Hanken Grotesk", -apple-system, sans-serif';

export type Accent = { hex: string; name: string; ink: string };
// Lime primary: the one brand colour, carries every CTA (Start/Finish/+ tab
// button/checkmarks). Kept as an object because many components accept an
// `accent` prop.
export const ACCENT: Accent = { hex: "var(--c-primary)", name: "Primary", ink: "var(--c-primary-ink)" };
export const ACCENTS: Record<string, Accent> = { primary: ACCENT };

export const TYPE: Record<string, React.CSSProperties> = {
  display: { fontFamily: FONT_IMPACT, fontSize: 36, fontWeight: 400, letterSpacing: "0.005em", lineHeight: 1.02, textTransform: "uppercase" },
  h1: { fontFamily: FONT_IMPACT, fontSize: 27, fontWeight: 400, letterSpacing: "0.01em", lineHeight: 1.08, textTransform: "uppercase" },
  h2: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 },
  // Reserved for the handful of "look at this number" moments: the live
  // elapsed clock, workout-complete stats, PR weights.
  mega: { fontFamily: FONT_IMPACT, fontWeight: 400, letterSpacing: "0.01em", lineHeight: 1 },
  cardTitle: { fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 },
  body: { fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.4 },
  bodyEm: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
  caption: { fontSize: 13, fontWeight: 500, lineHeight: 1.35 },
  micro: { fontSize: 12, fontWeight: 500, lineHeight: 1.3 },
  eyebrow: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  col: { fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
};

// ── Helpers ─────────────────────────────────────────────────────
export function mmss(secs: number) {
  const m = Math.floor(Math.abs(secs) / 60);
  const s = Math.abs(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
export function hmm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
export function fmtW(n: number | null | undefined) {
  if (n == null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}
export function fmtVol(kg: number) {
  if (kg >= 1000) return (kg / 1000).toFixed(kg >= 10000 ? 0 : 1) + "k";
  return String(Math.round(kg));
}
export function daysAgo(iso: string, today: Date = new Date()) {
  const d = new Date(iso);
  const days = Math.floor((today.getTime() - d.getTime()) / (24 * 3600 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 14) return "1w ago";
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
export function epley1rm(weight: number, reps: number) {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}
// ── Icons ───────────────────────────────────────────────────────
type IconProps = { d?: string; size?: number; color?: string; w?: number; viewBox?: string };
export function Icon({ d, size = 18, color = "currentColor", w = 1.75, viewBox = "0 0 24 24" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" style={{ flexShrink: 0 }}>
      <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
type IP = Omit<IconProps, "d">;
export const I = {
  Check: (p: IP) => <Icon {...p} d="M5 12.5l4.5 4.5L19 7.5" w={2.5} />,
  Plus: (p: IP) => <Icon {...p} d="M12 5v14M5 12h14" w={2} />,
  Minus: (p: IP) => <Icon {...p} d="M5 12h14" w={2} />,
  ArrowR: (p: IP) => <Icon {...p} d="M5 12h14M13 6l6 6-6 6" w={2} />,
  ChevR: (p: IP) => <Icon {...p} d="M9 6l6 6-6 6" w={2} />,
  ChevL: (p: IP) => <Icon {...p} d="M15 6l-6 6 6 6" w={2} />,
  ChevD: (p: IP) => <Icon {...p} d="M6 9l6 6 6-6" w={2} />,
  ChevU: (p: IP) => <Icon {...p} d="M6 15l6-6 6 6" w={2} />,
  Search: (p: IP) => <Icon {...p} d="M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Zm5-2L20 19.5" />,
  More: (p: IP) => <Icon {...p} d="M5 12h0M12 12h0M19 12h0" w={3} />,
  Drag: (p: IP) => <Icon {...p} d="M8 6h0M16 6h0M8 12h0M16 12h0M8 18h0M16 18h0" w={3} />,
  Trash: (p: IP) => <Icon {...p} d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v7M14 11v7" />,
  Edit: (p: IP) => <Icon {...p} d="M4 20h4l10-10-4-4L4 16v4Zm10-14 4 4" />,
  Note: (p: IP) => <Icon {...p} d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5M8 12h8M8 16h5" />,
  User: (p: IP) => <Icon {...p} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0" />,
  Stats: (p: IP) => <Icon {...p} d="M4 20h16M7 16v-5M12 16V8M17 16v-9" />,
  Today: (p: IP) => <Icon {...p} d="M4 8h16M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8M4 8V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M8 3v4M16 3v4" />,
  History: (p: IP) => <Icon {...p} d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2" />,
  Routine: (p: IP) => <Icon {...p} d="M4 6h12M4 12h16M4 18h10M19 4l-1 4 3-1M19 15l-1 4 3-1" />,
  Logout: (p: IP) => <Icon {...p} d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11" />,
  X: (p: IP) => <Icon {...p} d="M6 6l12 12M18 6 6 18" w={2} />,
  Star: (p: IP) => <Icon {...p} d="m12 3 2.7 5.7L21 9.6l-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9L7.5 14 3 9.6l6.3-.9L12 3Z" />,
  Dumbbell: (p: IP) => <Icon {...p} d="M3 12h2M19 12h2M7 8v8M17 8v8M9 12h6" w={2} />,
  Food: (p: IP) => <Icon {...p} d="M12 9c-1.7-1.5-4.2-1.5-5.7 0C4.8 10.6 4.8 13.7 6.4 16.3c1 1.7 2.4 3.4 3.6 3.9.7.3 1.3.3 2 0 1.2-.5 2.6-2.2 3.6-3.9 1.6-2.6 1.6-5.7.1-7.3-1.5-1.5-4-1.5-5.7 0Z M12 9c0-1.6.9-3.1 2.6-3.6" />,
  Camera: (p: IP) => <Icon {...p} d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />,
  Scan: (p: IP) => <Icon {...p} d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 8v8M10 8v8M13 8v8M16 8v8" w={2} />,
  Grid: (p: IP) => <Icon {...p} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" w={1.75} />,
  Scale: (p: IP) => <Icon {...p} d="M5 7h14l2 11a1 1 0 0 1-1 1.2H4a1 1 0 0 1-1-1.2L5 7Zm7 0V4M9 11h6" />,
  Flame: (p: IP) => <Icon {...p} d="M12 3c.5 2.7-1.6 4-2.8 5.6C8 10.2 8 12 8 12s-1-.6-1.5-2C5 12 5 13.7 5 15a7 7 0 0 0 14 0c0-3.3-2.3-5.4-3.6-6.8C14 6.6 13 4.8 12 3Z" />,
};

// ── Tnum ────────────────────────────────────────────────────────
export function Tnum({ children, style, className }: { children?: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <span className={"tnum " + (className || "")} style={style}>{children}</span>;
}

// ── Button ──────────────────────────────────────────────────────
export function Btn({
  children, variant = "primary", size = "md", accent = ACCENT, onClick, style, full, leadIcon, trailIcon, disabled, type = "button",
}: {
  children?: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg"; accent?: Accent; onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties; full?: boolean; leadIcon?: React.ReactNode; trailIcon?: React.ReactNode;
  disabled?: boolean; type?: "button" | "submit";
}) {
  const h = size === "lg" ? 56 : size === "sm" ? 32 : 44;
  const fs = size === "lg" ? 16 : size === "sm" ? 12 : 14;
  let bg = "transparent", fg = TOK.text, br = "none";
  if (variant === "primary") { bg = accent.hex; fg = accent.ink; }
  if (variant === "secondary") { bg = TOK.surface2; fg = TOK.text; }
  if (variant === "ghost") { fg = TOK.muted; }
  if (variant === "outline") { fg = TOK.text; br = `1px solid ${TOK.border}`; }
  if (variant === "danger") { fg = TOK.fail; }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      width: full ? "100%" : undefined, height: h, padding: "0 16px", borderRadius: 14,
      background: bg, color: fg, border: br, fontSize: fs, fontWeight: 600, letterSpacing: "-0.01em",
      fontFamily: "inherit", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      WebkitTapHighlightColor: "transparent", ...style,
    }}>
      {leadIcon}<span>{children}</span>{trailIcon}
    </button>
  );
}

export function Chip({ children, selected, onClick, accent = ACCENT }: { children?: React.ReactNode; selected?: boolean; onClick?: () => void; accent?: Accent }) {
  return (
    <button type="button" onClick={onClick} style={{
      height: 32, padding: "0 14px", borderRadius: 999,
      background: selected ? accent.hex : "transparent", color: selected ? accent.ink : TOK.muted,
      border: selected ? "none" : `1px solid ${TOK.border}`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em",
      cursor: "pointer", WebkitTapHighlightColor: "transparent", whiteSpace: "nowrap", flexShrink: 0,
    }}>{children}</button>
  );
}

export function SectionHeader({ title, action, style }: { title?: React.ReactNode; action?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 16px 8px", ...style }}>
      <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>{title}</div>
      {action}
    </div>
  );
}

export function MetricStat({ label, value, unit, delta, deltaDir }: { label: string; value: React.ReactNode; unit?: string; delta?: string; deltaDir?: "up" | "down" }) {
  const positive = deltaDir === "up" || (typeof delta === "string" && delta.startsWith("+"));
  const dColor = positive ? TOK.pr : deltaDir === "down" ? TOK.fail : TOK.muted;
  return (
    <div style={{ flex: 1, padding: 14, background: TOK.surface, borderRadius: 16, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ ...TYPE.col, color: TOK.dim }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
        <Tnum style={{ fontSize: 22, fontWeight: 600, color: TOK.text, letterSpacing: "-0.02em" }}>{value}</Tnum>
        {unit && <span style={{ fontSize: 11, color: TOK.muted }}>{unit}</span>}
      </div>
      {delta != null && <Tnum style={{ fontSize: 12, color: dColor, fontWeight: 500 }}>{delta}</Tnum>}
    </div>
  );
}

export function SessionRow({ datePill, routine, volume, duration, top, onTap }: {
  datePill?: { dow: string; day: number | string }; routine: string; volume: string; duration: string; top?: string; onTap?: () => void;
}) {
  return (
    <button onClick={onTap} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px",
      background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, background: TOK.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Tnum style={{ fontSize: 10, color: TOK.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{datePill?.dow}</Tnum>
        <Tnum style={{ fontSize: 15, color: TOK.text, fontWeight: 600 }}>{datePill?.day}</Tnum>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.bodyEm, color: TOK.text }}>{routine}</div>
        <div style={{ fontSize: 12, color: TOK.muted, marginTop: 3, display: "flex", gap: 8, alignItems: "baseline" }}>
          <Tnum>{duration}</Tnum><span style={{ color: TOK.dim }}>·</span><Tnum>{volume}</Tnum>
          {top && <><span style={{ color: TOK.dim }}>·</span><Tnum style={{ color: TOK.text }}>{top}</Tnum></>}
        </div>
      </div>
      <I.ChevR size={16} color={TOK.dim} />
    </button>
  );
}

export function ExerciseRow({ img, name, muscle, equipment, onTap, trailing }: {
  img?: string | null; name: string; muscle?: string; equipment?: string; onTap?: () => void; trailing?: React.ReactNode;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  return (
    <button onClick={onTap} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px",
      background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", minHeight: 56, WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: img && imgOk ? "#fff" : TOK.surface2, border: `1px solid ${TOK.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: TOK.dim, fontSize: 14, fontWeight: 700 }}>
        {img && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" onError={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          (name?.[0] || "?").toUpperCase()
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 500 }}>{name}</div>
        {(muscle || equipment) && <div style={{ fontSize: 11, color: TOK.dim, marginTop: 2 }}>{[muscle, equipment].filter(Boolean).join(" · ")}</div>}
      </div>
      {trailing || <I.ChevR size={14} color={TOK.dim} />}
    </button>
  );
}

export type SetView = { idx: number | string; weight?: number | null; reps?: number | null; rpe?: number | null; status?: string; warmup?: boolean };
export function SetRow({ set, accent = ACCENT, readOnly, onTap }: { set: SetView; accent?: Accent; readOnly?: boolean; onTap?: () => void }) {
  const isDone = set.status === "done";
  const isNext = set.status === "next";
  const numColor = isDone || isNext ? TOK.text : TOK.dim;
  const labelColor = isDone || isNext ? TOK.muted : TOK.dim;
  return (
    <button onClick={readOnly ? undefined : onTap} disabled={readOnly} style={{
      display: "grid", gridTemplateColumns: "22px 1fr 1fr 38px 30px", alignItems: "center", gap: 12,
      width: "100%", height: 52, padding: "0 16px",
      background: isNext ? "rgba(255,255,255,0.025)" : "transparent",
      borderLeft: isNext ? `2px solid ${accent.hex}` : "2px solid transparent",
      border: "none", color: "inherit", textAlign: "left", cursor: readOnly ? "default" : "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent",
    }}>
      <Tnum style={{ color: TOK.dim, fontSize: 13, fontWeight: 500 }}>{set.warmup ? "W" : set.idx}</Tnum>
      <Tnum style={{ color: numColor, fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>
        {set.weight != null ? fmtW(set.weight) : "—"}
        <span style={{ color: labelColor, fontSize: 12, marginLeft: 4, fontWeight: 400 }}>kg</span>
      </Tnum>
      <Tnum style={{ color: numColor, fontSize: 17, fontWeight: 500 }}>
        {set.reps != null ? set.reps : "—"}
        <span style={{ color: labelColor, fontSize: 12, marginLeft: 4, fontWeight: 400 }}>reps</span>
      </Tnum>
      <Tnum style={{ color: isDone ? TOK.muted : TOK.dim, fontSize: 13, textAlign: "right" }}>{set.rpe != null ? `@${set.rpe}` : ""}</Tnum>
      <span style={{ display: "flex", justifyContent: "flex-end" }}>
        {isDone ? (
          <span style={{ width: 22, height: 22, borderRadius: 999, background: accent.hex, display: "flex", alignItems: "center", justifyContent: "center" }}><I.Check size={12} color={accent.ink} /></span>
        ) : (
          <span style={{ width: 20, height: 20, borderRadius: 999, border: `1.5px solid ${isNext ? TOK.muted : TOK.dim}` }} />
        )}
      </span>
    </button>
  );
}

export function EmptyState({ icon, title, description, cta }: { icon?: React.ReactNode; title: string; description?: string; cta?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 32px", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: TOK.surface, display: "flex", alignItems: "center", justifyContent: "center", color: TOK.dim }}>{icon}</div>
      <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{title}</div>
      {description && <div style={{ ...TYPE.caption, color: TOK.muted, maxWidth: 280 }}>{description}</div>}
      {cta && <div style={{ marginTop: 4 }}>{cta}</div>}
    </div>
  );
}

export function Sheet({ open, onClose, children, title, label }: { open: boolean; onClose: () => void; children?: React.ReactNode; title?: string; label?: string }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.55)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 220ms ease" }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 90, background: TOK.surface2,
        borderTopLeftRadius: 18, borderTopRightRadius: 18, transform: open ? "translateY(0)" : "translateY(110%)",
        // visibility guarantees the closed sheet is gone even if the transform can't
        // fully clear it in a given layout; delay hiding until the slide-out finishes.
        visibility: open ? "visible" : "hidden",
        transition: open
          ? "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s"
          : "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s 360ms",
        paddingBottom: 28,
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)", maxHeight: "calc(100% - 60px)", overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: TOK.border }} />
        </div>
        {/* explicit close — tall sheets leave almost no backdrop to tap */}
        <button onClick={onClose} aria-label="Schließen" style={{ position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 999, background: TOK.surface3, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent", zIndex: 1 }}>
          <I.X size={16} color={TOK.muted} />
        </button>
        {(title || label) && (
          <div style={{ padding: "6px 52px 8px 20px" }}>
            {label && <div style={{ ...TYPE.eyebrow, color: TOK.dim, marginBottom: 4 }}>{label}</div>}
            {title && <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{title}</div>}
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </>
  );
}

export function FAB({ children, onClick, accent = ACCENT }: { children?: React.ReactNode; onClick?: () => void; accent?: Accent }) {
  return (
    <button onClick={onClick} style={{
      position: "absolute", right: 16, bottom: 24, zIndex: 40, height: 52, minWidth: 52, borderRadius: 999, padding: "0 18px",
      background: accent.hex, color: accent.ink, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
      letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      boxShadow: `0 14px 34px ${TOK.shadow}, 0 0 26px var(--c-shadow-glow), 0 6px 14px rgba(0,0,0,0.35)`, WebkitTapHighlightColor: "transparent",
    }}>{children}</button>
  );
}

export function Toggle({ checked, onChange, accent = ACCENT }: { checked?: boolean; onChange?: (v: boolean) => void; accent?: Accent }) {
  return (
    <button onClick={() => onChange?.(!checked)} style={{ width: 44, height: 26, padding: 2, borderRadius: 999, background: checked ? accent.hex : TOK.surface3, border: "none", cursor: "pointer", display: "flex", alignItems: "center", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: checked ? accent.ink : "#fafafa", transform: `translateX(${checked ? 18 : 0}px)`, transition: "transform 180ms ease" }} />
    </button>
  );
}

export function Segmented({ value, options, onChange, accent = ACCENT }: { value: string; options: (string | { value: string; label: string })[]; onChange?: (v: string) => void; accent?: Accent }) {
  return (
    <div style={{ display: "flex", padding: 3, background: TOK.surface2, borderRadius: 10, gap: 2, width: "100%", boxSizing: "border-box" }}>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const l = typeof opt === "string" ? opt : opt.label;
        const selected = v === value;
        return (
          <button key={v} onClick={() => onChange?.(v)} style={{
            flex: 1, minWidth: 0, height: 32, borderRadius: 8, background: selected ? accent.hex : "transparent",
            color: selected ? accent.ink : TOK.muted, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em",
            cursor: "pointer", WebkitTapHighlightColor: "transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 8px",
          }}>{l}</button>
        );
      })}
    </div>
  );
}

const miniBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, background: TOK.surface2, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };
export function MiniStepper({ value, onChange, step = 1, min = 0, unit }: { value: number; onChange?: (v: number) => void; step?: number; min?: number; unit?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => onChange?.(Math.max(min, +(value - step).toFixed(2)))} style={miniBtn}><I.Minus size={14} color={TOK.text} /></button>
      <Tnum style={{ minWidth: 56, textAlign: "center", fontSize: 14, fontWeight: 600, color: TOK.text }}>
        {value}{unit && <span style={{ color: TOK.muted, marginLeft: 3, fontSize: 11 }}>{unit}</span>}
      </Tnum>
      <button onClick={() => onChange?.(+(value + step).toFixed(2))} style={miniBtn}><I.Plus size={14} color={TOK.text} /></button>
    </div>
  );
}

export function Row({ label, sublabel, trailing, onTap, chevron, danger }: { label: React.ReactNode; sublabel?: React.ReactNode; trailing?: React.ReactNode; onTap?: () => void; chevron?: boolean; danger?: boolean }) {
  const Tag: any = onTap ? "button" : "div";
  return (
    <Tag {...(onTap ? { onClick: onTap, type: "button" } : {})} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", boxSizing: "border-box", minHeight: 52, padding: "8px 16px",
      background: "transparent", border: "none", borderRadius: 0, cursor: onTap ? "pointer" : "default", fontFamily: "inherit", textAlign: "left", WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.body, color: danger ? TOK.fail : TOK.text, fontWeight: 500 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>{sublabel}</div>}
      </div>
      {trailing && <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{trailing}</div>}
      {chevron && <I.ChevR size={14} color={TOK.dim} />}
    </Tag>
  );
}

export function Card({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: TOK.surface, border: `1px solid ${TOK.border}`, borderRadius: 18, overflow: "hidden", ...style }}>{children}</div>;
}
export function Divider() {
  return <div style={{ height: 1, background: TOK.border, margin: "0 16px" }} />;
}

// ── ProgressRing: inline SVG arc, value/max. Renders children in the centre. ──
export function ProgressRing({
  value, max, size = 104, stroke = 9, color = ACCENT.hex, track = TOK.surface2, children, animate = true,
}: {
  value: number; max: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode; animate?: boolean;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const [mounted, setMounted] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);
  const offset = circ * (1 - (mounted ? pct : 0));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {children != null && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── WeekStrip: 7 dots Mon–Sun for the current week. Filled = trained, ring = today. ──
export function WeekStrip({ trained, accent = ACCENT }: { trained: Set<string>; accent?: Accent }) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const todayStr = today.toDateString();
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
      {labels.map((l, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const done = trained.has(d.toDateString());
        const isToday = d.toDateString() === todayStr;
        const future = d.getTime() > today.getTime() && !isToday;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? accent.hex : TOK.dim }}>{l}</span>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: done ? accent.hex : TOK.surface2,
              border: isToday ? `1.5px solid ${accent.hex}` : "1.5px solid transparent",
              opacity: future ? 0.35 : 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 300ms ease",
            }}>
              {done && <I.Check size={14} color={accent.ink} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Phone chrome ────────────────────────────────────────────────
function PhoneStatusBar() {
  const c = TOK.text;
  return (
    <div className="phone-status" style={{ color: c }}>
      <div className="time tnum">9:41</div>
      <div className="icons">
        <svg width="17" height="11" viewBox="0 0 17 11"><g fill={c}>
          <rect x="0" y="7" width="3" height="4" rx="0.6" /><rect x="4.5" y="5" width="3" height="6" rx="0.6" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.6" /><rect x="13.5" y="0" width="3" height="11" rx="0.6" />
        </g></svg>
        <svg width="25" height="12" viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={c} strokeOpacity="0.45" fill="none" />
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={c} />
          <path d="M23.5 4v4c0.7-0.2 1.2-0.9 1.2-2s-0.5-1.8-1.2-2Z" fill={c} fillOpacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

export function Phone({ children, bg = TOK.bg, tabBar, hideStatusBar }: { children?: React.ReactNode; bg?: string; tabBar?: React.ReactNode; hideStatusBar?: boolean }) {
  return (
    <div className="phone" style={{ background: bg, color: TOK.text }}>
      <div className="phone-dynamic-island" />
      {!hideStatusBar && <PhoneStatusBar />}
      <div className="phone-scroll-area" style={{ position: "absolute", inset: hideStatusBar ? 0 : "47px 0 0 0", bottom: 0, display: "flex", flexDirection: "column", background: bg }}>
        <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>{children}</div>
        {tabBar}
      </div>
      <div className="home-indicator" />
    </div>
  );
}

export type TabId = "home" | "train" | "stats" | "more";
export function TabBar({ active, onChange, onAdd, addOpen, accent = ACCENT }: { active: TabId | null; onChange?: (t: TabId) => void; onAdd?: () => void; addOpen?: boolean; accent?: Accent }) {
  const tabs: { id: TabId; label: string; icon: (p: IP) => React.ReactElement }[] = [
    { id: "home", label: "Home", icon: I.Grid },
    { id: "train", label: "Training", icon: I.Dumbbell },
    { id: "stats", label: "Statistik", icon: I.Stats },
    { id: "more", label: "Profil", icon: I.User },
  ];
  const tabBtn = (t: { id: TabId; label: string; icon: (p: IP) => React.ReactElement }) => {
    const sel = active === t.id;
    return (
      <button key={t.id} onClick={() => onChange?.(t.id)} style={{
        flex: 1, height: 64, paddingTop: 11, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5, color: sel ? TOK.text : TOK.dim, WebkitTapHighlightColor: "transparent",
      }}>
        <t.icon size={20} color={sel ? TOK.text : TOK.dim} w={sel ? 2.25 : 1.75} />
        <span style={{ fontSize: 10, fontWeight: sel ? 600 : 500, letterSpacing: "-0.01em" }}>{t.label}</span>
      </button>
    );
  };
  return (
    // position:relative + zIndex keep the protruding + above screen content
    // (pinned start buttons, FABs) so it is never clipped or covered.
    <div className="phone-tabbar" style={{ position: "relative", zIndex: 55, flexShrink: 0, borderTop: `1px solid ${TOK.border}`, background: TOK.surface, height: 64 + 24, paddingBottom: 24, display: "flex", alignItems: "flex-start" }}>
      {tabBtn(tabs[0])}
      {tabBtn(tabs[1])}
      {/* center add FAB */}
      <div style={{ width: 70, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 12 }}>
        <button onClick={onAdd} aria-label={addOpen ? "Schließen" : "Hinzufügen"} style={{
          width: 54, height: 54, borderRadius: 999, background: accent.hex, color: accent.ink, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: -20,
          boxShadow: `0 10px 26px ${TOK.shadow}, 0 0 20px var(--c-shadow-glow), 0 3px 8px rgba(0,0,0,0.35)`, WebkitTapHighlightColor: "transparent",
          transform: addOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
        }}>
          <I.Plus size={24} color={accent.ink} w={2.25} />
        </button>
      </div>
      {tabBtn(tabs[2])}
      {tabBtn(tabs[3])}
    </div>
  );
}

const iconBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TOK.text, WebkitTapHighlightColor: "transparent" };
export function ScreenHeader({ back, onBack, title, trailing, large = false }: { back?: boolean; onBack?: () => void; title?: React.ReactNode; trailing?: React.ReactNode; large?: boolean }) {
  if (large) {
    return (
      <div style={{ padding: "8px 16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", minHeight: 36 }}>
          {back && <button onClick={onBack} style={iconBtn} aria-label="Zurück"><I.ChevL size={20} color={TOK.text} /></button>}
          <div style={{ flex: 1 }} />
          {trailing}
        </div>
        {title && <div style={{ ...TYPE.h1, color: TOK.text, padding: "4px 0 0" }}>{title}</div>}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px", minHeight: 52 }}>
      {back && <button onClick={onBack} style={iconBtn} aria-label="Zurück"><I.ChevL size={20} color={TOK.text} /></button>}
      <div style={{ flex: 1, ...TYPE.cardTitle, color: TOK.text, padding: back ? "0 4px" : "0 12px" }}>{title}</div>
      {trailing}
    </div>
  );
}
