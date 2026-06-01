"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchExercises, logWeight } from "@/lib/data";
import type { Exercise } from "@/lib/supabase/types";
import { ACCENT, Phone, TabBar, Sheet, Btn, I, TOK, TYPE, MACRO, type TabId } from "@/lib/design";
import { AppContext, type AppCtxValue, type ScreenId, type WorkoutConfig } from "./app-context";

import Today from "./screens/Today";
import Workout from "./screens/Workout";
import History from "./screens/History";
import SessionDetail from "./screens/SessionDetail";
import Library from "./screens/Library";
import ExerciseDetail from "./screens/ExerciseDetail";
import Routines from "./screens/Routines";
import RoutineEditor from "./screens/RoutineEditor";
import Progress from "./screens/Progress";
import Food from "./screens/Food";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";

const TAB_TO_SCREEN: Record<TabId, ScreenId> = {
  home: "today",
  food: "food",
  train: "routines",
  more: "profile",
};
const SCREEN_TO_TAB: Partial<Record<ScreenId, TabId>> = {
  today: "home",
  food: "food",
  routines: "train",
  progress: "more",
  profile: "more",
};

export default function AppShell({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const db = React.useMemo(() => createClient(), []);
  const [active, setActive] = React.useState<ScreenId>("today");
  const [params, setParams] = React.useState<{ sessionId?: string; exerciseId?: string; routineId?: string }>({});
  const [workoutConfig, setWorkoutConfig] = React.useState<WorkoutConfig | null>(null);
  const [exercises, setExercises] = React.useState<Exercise[]>([]);
  const [quickAdd, setQuickAdd] = React.useState(false);

  const reloadExercises = React.useCallback(async () => {
    try {
      setExercises(await fetchExercises(db));
    } catch {
      /* surfaced per-screen */
    }
  }, [db]);

  React.useEffect(() => {
    reloadExercises();
  }, [reloadExercises]);

  const exMap = React.useMemo(() => {
    const m: Record<string, Exercise> = {};
    for (const e of exercises) m[e.id] = e;
    return m;
  }, [exercises]);

  const goto = React.useCallback((screen: ScreenId, param?: string) => {
    setParams((prev) => {
      if (screen === "session-detail") return { ...prev, sessionId: param };
      if (screen === "exercise-detail") return { ...prev, exerciseId: param };
      if (screen === "routine-editor") return { ...prev, routineId: param };
      return prev;
    });
    setActive(screen);
  }, []);

  const startWorkout = React.useCallback((cfg: WorkoutConfig) => {
    setWorkoutConfig(cfg);
    setActive("workout");
  }, []);

  const signOut = React.useCallback(async () => {
    await db.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }, [db, router]);

  const ctx: AppCtxValue = {
    db,
    userId,
    username,
    exercises,
    exMap,
    accent: ACCENT,
    params,
    goto,
    startWorkout,
    workoutConfig,
    reloadExercises,
    signOut,
  };

  const activeTab = SCREEN_TO_TAB[active] ?? null;
  const showTabBar = activeTab !== null;

  let body: React.ReactNode;
  switch (active) {
    case "today": body = <Today />; break;
    case "history": body = <History />; break;
    case "session-detail": body = <SessionDetail />; break;
    case "library": body = <Library />; break;
    case "exercise-detail": body = <ExerciseDetail />; break;
    case "routines": body = <Routines />; break;
    case "routine-editor": body = <RoutineEditor />; break;
    case "progress": body = <Progress />; break;
    case "food": body = <Food />; break;
    case "profile": body = <Profile />; break;
    case "settings": body = <Settings />; break;
    default: body = <Today />;
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className="stage">
        {active === "workout" ? (
          <div className="phone" style={{ background: TOK.bg }}>
            <div className="phone-dynamic-island" />
            <Workout />
          </div>
        ) : (
          <Phone
            tabBar={
              showTabBar ? (
                <TabBar active={activeTab} accent={ACCENT} onChange={(t) => goto(TAB_TO_SCREEN[t])} onAdd={() => setQuickAdd(true)} />
              ) : undefined
            }
          >
            <div key={active} className="gym-fade" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {body}
            </div>
            <QuickAddSheet
              open={quickAdd}
              onClose={() => setQuickAdd(false)}
              db={db}
              userId={userId}
              goto={goto}
              startWorkout={startWorkout}
            />
          </Phone>
        )}
      </div>
    </AppContext.Provider>
  );
}

// ── Quick-add sheet opened by the center + in the tab bar ──
function QuickAddSheet({
  open, onClose, db, userId, goto, startWorkout,
}: {
  open: boolean;
  onClose: () => void;
  db: AppCtxValue["db"];
  userId: string;
  goto: (s: ScreenId) => void;
  startWorkout: (c: WorkoutConfig) => void;
}) {
  const [mode, setMode] = React.useState<"menu" | "weight">("menu");
  const [w, setW] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setMode("menu");
      setW("");
    }
  }, [open]);

  const saveWeight = async () => {
    const val = parseFloat(w.replace(",", "."));
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await logWeight(db, userId, new Date().toISOString().slice(0, 10), val);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label="Schnell hinzufügen" title={mode === "weight" ? "Gewicht eintragen" : "Was willst du loggen?"}>
      {mode === "menu" ? (
        <div style={{ padding: "4px 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <QuickRow icon={<I.Food size={20} color={MACRO.carbs} />} title="Essen loggen" sub="Suche · Barcode · Foto · manuell" onTap={() => { onClose(); goto("food"); }} />
          <QuickRow icon={<I.Scale size={20} color={MACRO.kcal} />} title="Gewicht eintragen" sub="Heutige Wiegung" onTap={() => setMode("weight")} />
          <QuickRow icon={<I.Dumbbell size={20} color={MACRO.protein} />} title="Workout starten" sub="Leeres Training" onTap={() => { onClose(); startWorkout({ routineId: null, name: "Quick Workout" }); }} />
        </div>
      ) : (
        <div style={{ padding: "8px 16px 18px" }}>
          <input
            autoFocus
            inputMode="decimal"
            value={w}
            onChange={(e) => setW(e.target.value)}
            placeholder="z. B. 82.4 kg"
            style={{ width: "100%", height: 54, borderRadius: 14, background: TOK.surface, border: `1px solid ${TOK.border}`, color: TOK.text, fontSize: 18, fontWeight: 600, padding: "0 16px", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" full onClick={() => setMode("menu")}>Zurück</Btn>
            <Btn variant="primary" full onClick={saveWeight} disabled={saving || !w}>Speichern</Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function QuickRow({ icon, title, sub, onTap }: { icon: React.ReactNode; title: string; sub: string; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 12, background: TOK.surface, border: "none", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: TOK.surface3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.bodyEm, color: TOK.text }}>{title}</div>
        <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>{sub}</div>
      </div>
      <I.ChevR size={16} color={TOK.dim} />
    </button>
  );
}
