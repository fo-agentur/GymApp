"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchFoodLogs, fetchProfile, deleteFoodLog } from "@/lib/data";
import type { FoodLog } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, ProgressRing, Card, EmptyState, FAB, I } from "@/lib/design";
import FoodAddSheet from "./FoodAddSheet";

const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack"];
const DEFAULT_KCAL = 2200;

// Local YYYY-MM-DD (not UTC) for the given date.
function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return localISO(dt);
}
function dayLabel(iso: string): string {
  const today = localISO(new Date());
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  if (iso === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

type Targets = { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };

export default function Food() {
  const { db, userId, accent, goto } = useApp();
  const [date, setDate] = React.useState(() => localISO(new Date()));
  const [logs, setLogs] = React.useState<FoodLog[]>([]);
  const [targets, setTargets] = React.useState<Targets>({ kcal: null, protein: null, carbs: null, fat: null });
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const today = localISO(new Date());
  const isToday = date === today;

  const refresh = React.useCallback(async () => {
    try {
      const rows = await fetchFoodLogs(db, date);
      setLogs(rows);
    } finally {
      setLoading(false);
    }
  }, [db, date]);

  // Targets load once (profile-level, not per-day).
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const p = await fetchProfile(db, userId).catch(() => null);
      if (!alive || !p) return;
      setTargets({ kcal: p.target_kcal, protein: p.target_protein_g, carbs: p.target_carbs_g, fat: p.target_fat_g });
    })();
    return () => {
      alive = false;
    };
  }, [db, userId]);

  React.useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  async function remove(id: string) {
    setLogs((cur) => cur.filter((l) => l.id !== id)); // optimistic
    try {
      await deleteFoodLog(db, id);
    } catch {
      refresh();
    }
  }

  const totals = logs.reduce(
    (a, l) => ({ kcal: a.kcal + l.kcal, protein: a.protein + l.protein_g, carbs: a.carbs + l.carbs_g, fat: a.fat + l.fat_g }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const kcalMax = targets.kcal && targets.kcal > 0 ? targets.kcal : DEFAULT_KCAL;
  const hasTargets = !!(targets.kcal || targets.protein || targets.carbs || targets.fat);

  const byMeal = MEAL_ORDER.map((m) => ({ meal: m, items: logs.filter((l) => l.meal === m) })).filter((g) => g.items.length > 0);
  // Any logs with an unrecognised meal name still get shown under "Other".
  const known = new Set(MEAL_ORDER);
  const others = logs.filter((l) => !known.has(l.meal));
  if (others.length) byMeal.push({ meal: "Other", items: others });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Day header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 8px" }}>
        <button onClick={() => setDate((d) => addDays(d, -1))} style={navBtn} aria-label="Previous day">
          <I.ChevL size={20} color={TOK.text} />
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{dayLabel(date)}</div>
          {!isToday && (
            <button onClick={() => setDate(today)} style={{ background: "none", border: "none", color: accent.hex, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 2 }}>
              Back to today
            </button>
          )}
        </div>
        <button onClick={() => setDate((d) => addDays(d, 1))} style={navBtn} aria-label="Next day" disabled={isToday}>
          <I.ChevR size={20} color={isToday ? TOK.dim : TOK.text} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
        {/* Macro summary */}
        <Card style={{ margin: "8px 12px 4px", padding: 18, display: "flex", alignItems: "center", gap: 18 }}>
          <ProgressRing value={totals.kcal} max={kcalMax} size={108} stroke={10} color={accent.hex}>
            <Tnum style={{ fontSize: 24, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em" }}>{Math.round(totals.kcal)}</Tnum>
            <span style={{ fontSize: 11, color: TOK.dim, fontWeight: 600 }}>{hasTargets ? `/ ${kcalMax}` : "kcal"}</span>
          </ProgressRing>

          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <MacroBar label="Protein" value={totals.protein} target={targets.protein} color="#f87171" />
            <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} color="#fbbf24" />
            <MacroBar label="Fat" value={totals.fat} target={targets.fat} color="#60a5fa" />
          </div>
        </Card>

        {!hasTargets && (
          <div style={{ padding: "2px 16px 0", textAlign: "center" }}>
            <button onClick={() => goto("settings")} style={{ background: "none", border: "none", color: TOK.dim, fontFamily: "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              Set daily targets →
            </button>
          </div>
        )}

        {/* Meal sections */}
        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div style={{ padding: 24, color: TOK.dim, fontSize: 13 }}>Loading…</div>
          ) : logs.length === 0 ? (
            <EmptyState icon={<I.Food size={20} />} title="Nothing logged yet" description={isToday ? "Tap + to add your first food of the day." : "No food logged for this day."} />
          ) : (
            byMeal.map((group) => {
              const mk = group.items.reduce((s, l) => s + l.kcal, 0);
              return (
                <div key={group.meal} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 16px 6px" }}>
                    <div style={{ ...TYPE.eyebrow, color: TOK.dim }}>{group.meal}</div>
                    <Tnum style={{ fontSize: 12, color: TOK.dim, fontWeight: 600 }}>{Math.round(mk)} kcal</Tnum>
                  </div>
                  <Card style={{ margin: "0 12px" }}>
                    {group.items.map((l, i) => (
                      <FoodRow key={l.id} log={l} divider={i > 0} onDelete={() => remove(l.id)} />
                    ))}
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>

      <FAB onClick={() => setAddOpen(true)} accent={accent}>
        <I.Plus size={18} color={accent.ink} /> Add food
      </FAB>

      <FoodAddSheet open={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} loggedOn={date} />
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: TOK.surface,
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  WebkitTapHighlightColor: "transparent",
};

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const pct = target && target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: TOK.muted, fontWeight: 500 }}>{label}</span>
        <Tnum style={{ fontSize: 12, color: TOK.text, fontWeight: 600 }}>
          {Math.round(value)}
          {target ? <span style={{ color: TOK.dim, fontWeight: 500 }}>{` / ${Math.round(target)}g`}</span> : <span style={{ color: TOK.dim, fontWeight: 500 }}> g</span>}
        </Tnum>
      </div>
      <div style={{ height: 5, background: TOK.surface2, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: target ? `${pct * 100}%` : "0%", background: color, borderRadius: 3, transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
    </div>
  );
}

function FoodRow({ log, divider, onDelete }: { log: FoodLog; divider: boolean; onDelete: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: divider ? `1px solid ${TOK.border}` : "none" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.name}</div>
        <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>
          {log.qty_g ? <><Tnum>{Math.round(log.qty_g)}</Tnum>g · </> : null}
          <Tnum>{Math.round(log.kcal)}</Tnum> kcal
          <span style={{ color: TOK.dim }}>
            {"  "}· P<Tnum>{Math.round(log.protein_g)}</Tnum> C<Tnum>{Math.round(log.carbs_g)}</Tnum> F<Tnum>{Math.round(log.fat_g)}</Tnum>
          </span>
        </div>
      </div>
      <button onClick={onDelete} aria-label="Delete" style={{ width: 36, height: 36, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
        <I.Trash size={16} color={TOK.dim} />
      </button>
    </div>
  );
}
