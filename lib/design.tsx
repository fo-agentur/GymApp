"use client";
// design.tsx — Design system ported from the Claude Design handoff (_design/).
// OLED black, lime accent, Geist fonts, inline styles. This is the contract.
import React from "react";

// ── Tokens ──────────────────────────────────────────────────────
export const TOK = {
  bg: "#000000",
  surface: "#0a0a0a",
  surface2: "#141414",
  surface3: "#1c1c1c",
  border: "#1f1f1f",
  text: "#fafafa",
  muted: "#a1a1aa",
  dim: "#52525b",
  fail: "#ef4444",
  pr: "#22c55e",
};

export type Accent = { hex: string; name: string; ink: string };
export const ACCENTS: Record<string, Accent> = {
  lime: { hex: "#bef264", name: "Electric lime", ink: "#0a0a0a" },
  orange: { hex: "#fb923c", name: "Hot orange", ink: "#0a0a0a" },
  cyan: { hex: "#22d3ee", name: "Signal cyan", ink: "#0a0a0a" },
};
export const ACCENT = ACCENTS.lime;

export const TYPE: Record<string, React.CSSProperties> = {
  h1: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 },
  h2: { fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15 },
  cardTitle: { fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2 },
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
export const muscleTone = (m: string) =>
  (({
    Chest: "linear-gradient(135deg, #44403c, #18181b)",
    Back: "linear-gradient(135deg, #3f3f46, #18181b)",
    Shoulders: "linear-gradient(135deg, #57534e, #18181b)",
    Quads: "linear-gradient(135deg, #44403c, #1c1917)",
    Hamstrings: "linear-gradient(135deg, #3f3f46, #1c1917)",
    Glutes: "linear-gradient(135deg, #525252, #1c1917)",
    Biceps: "linear-gradient(135deg, #4b5563, #18181b)",
    Triceps: "linear-gradient(135deg, #404040, #18181b)",
    Forearms: "linear-gradient(135deg, #4b5563, #18181b)",
    Core: "linear-gradient(135deg, #44403c, #18181b)",
    Calves: "linear-gradient(135deg, #3f3f46, #1c1917)",
  } as Record<string, string>)[m] || "linear-gradient(135deg, #3f3f46, #18181b)");

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
      width: full ? "100%" : undefined, height: h, padding: "0 16px", borderRadius: 12,
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
      background: selected ? accent.hex : TOK.surface, color: selected ? accent.ink : TOK.muted,
      border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em",
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
    <div style={{ flex: 1, padding: 14, background: TOK.surface, borderRadius: 12, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
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

export function ExerciseRow({ thumb, name, muscle, equipment, onTap, trailing }: {
  thumb?: string; name: string; muscle?: string; equipment?: string; onTap?: () => void; trailing?: React.ReactNode;
}) {
  return (
    <button onClick={onTap} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px",
      background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", minHeight: 56, WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, background: thumb || "linear-gradient(135deg, #3f3f46, #18181b)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600 }}>
        {(name?.[0] || "?").toUpperCase()}
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
        transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)", paddingBottom: 28,
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)", maxHeight: "calc(100% - 60px)", overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: TOK.border }} />
        </div>
        {(title || label) && (
          <div style={{ padding: "6px 20px 8px" }}>
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
      boxShadow: `0 12px 32px ${accent.hex}44, 0 4px 10px rgba(0,0,0,0.4)`, WebkitTapHighlightColor: "transparent",
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
  return <div style={{ background: TOK.surface, borderRadius: 12, overflow: "hidden", ...style }}>{children}</div>;
}
export function Divider() {
  return <div style={{ height: 1, background: TOK.border, margin: "0 16px" }} />;
}

// ── Phone chrome ────────────────────────────────────────────────
function PhoneStatusBar({ light = true }: { light?: boolean }) {
  const c = light ? "#fafafa" : "#0a0a0a";
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

export type TabId = "today" | "plan" | "stats" | "profile";
export function TabBar({ active, onChange, accent = ACCENT }: { active: TabId | null; onChange?: (t: TabId) => void; accent?: Accent }) {
  const tabs: { id: TabId; label: string; icon: (p: IP) => React.ReactElement }[] = [
    { id: "today", label: "Today", icon: I.Today },
    { id: "plan", label: "Plan", icon: I.Routine },
    { id: "stats", label: "Stats", icon: I.Stats },
    { id: "profile", label: "Profile", icon: I.User },
  ];
  return (
    <div className="phone-tabbar" style={{ flexShrink: 0, borderTop: "1px solid #1a1a1a", background: TOK.surface, height: 64 + 24, paddingBottom: 24, display: "flex", alignItems: "flex-start" }}>
      {tabs.map((t) => {
        const sel = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            flex: 1, height: 64, paddingTop: 11, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5, color: sel ? accent.hex : TOK.dim, WebkitTapHighlightColor: "transparent",
          }}>
            <t.icon size={20} color={sel ? accent.hex : TOK.dim} w={sel ? 2.25 : 1.75} />
            <span style={{ fontSize: 10, fontWeight: sel ? 600 : 500, letterSpacing: "-0.01em" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const iconBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TOK.text, WebkitTapHighlightColor: "transparent" };
export function ScreenHeader({ back, onBack, title, trailing, large = false }: { back?: boolean; onBack?: () => void; title?: React.ReactNode; trailing?: React.ReactNode; large?: boolean }) {
  if (large) {
    return (
      <div style={{ padding: "8px 16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", minHeight: 36 }}>
          {back && <button onClick={onBack} style={iconBtn}><I.ChevL size={20} color={TOK.text} /></button>}
          <div style={{ flex: 1 }} />
          {trailing}
        </div>
        {title && <div style={{ ...TYPE.h1, color: TOK.text, padding: "4px 0 0" }}>{title}</div>}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px", minHeight: 52 }}>
      {back && <button onClick={onBack} style={iconBtn}><I.ChevL size={20} color={TOK.text} /></button>}
      <div style={{ flex: 1, ...TYPE.cardTitle, color: TOK.text, padding: back ? "0 4px" : "0 12px" }}>{title}</div>
      {trailing}
    </div>
  );
}
