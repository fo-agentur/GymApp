"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchExercises, fetchProfile, fetchRoutines, type RoutineFull } from "@/lib/data";
import type { Exercise } from "@/lib/supabase/types";
import { parseEquipment, type EquipmentId } from "@/lib/equipment";
import { applyTheme, normalizeTheme, watchSystemTheme } from "@/lib/theme";
import { loadActiveWorkout } from "@/lib/active-workout";
import { ACCENT, Phone, TabBar, Sheet, TOK, TYPE, Tnum, I, type TabId } from "@/lib/design";
import { AppContext, type AppCtxValue, type ScreenId, type ScreenParams, type WorkoutConfig } from "./app-context";

import Today from "./screens/Today";
import Workout from "./screens/Workout";
import History from "./screens/History";
import SessionDetail from "./screens/SessionDetail";
import Library from "./screens/Library";
import ExerciseDetail from "./screens/ExerciseDetail";
import Routines from "./screens/Routines";
import RoutineEditor from "./screens/RoutineEditor";
import WorkoutOverview from "./screens/WorkoutOverview";
import Progress from "./screens/Progress";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";

const TAB_TO_SCREEN: Record<TabId, ScreenId> = {
  home: "today",
  train: "routines",
  stats: "progress",
  more: "profile",
};
// Every screen belongs to a tab, so the bottom bar never disappears and the
// active tab stays highlighted on sub-screens.
const SCREEN_TO_TAB: Record<ScreenId, TabId> = {
  today: "home",
  routines: "train",
  "routine-editor": "train",
  "workout-overview": "train",
  library: "train",
  "exercise-detail": "train",
  progress: "stats",
  history: "stats",
  "session-detail": "stats",
  profile: "more",
  settings: "more",
};

type NavEntry = { screen: ScreenId; params: ScreenParams };

function paramsFor(screen: ScreenId, param?: string): ScreenParams {
  if (screen === "session-detail") return { sessionId: param };
  if (screen === "exercise-detail") return { exerciseId: param };
  if (screen === "routine-editor") return { routineId: param };
  if (screen === "workout-overview") return { routineId: param };
  return {};
}

export default function AppShell({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const db = React.useMemo(() => createClient(), []);
  const [stack, setStack] = React.useState<NavEntry[]>([{ screen: "today", params: {} }]);
  const [workoutConfig, setWorkoutConfig] = React.useState<WorkoutConfig | null>(null);
  const [exercises, setExercises] = React.useState<Exercise[]>([]);
  const [myEquipment, setMyEquipment] = React.useState<EquipmentId[]>([]);
  const [quickAdd, setQuickAdd] = React.useState(false);

  const top = stack[stack.length - 1];

  const reloadExercises = React.useCallback(async () => {
    try {
      setExercises(await fetchExercises(db));
    } catch {
      /* surfaced per-screen */
    }
  }, [db]);

  const reloadProfile = React.useCallback(async () => {
    try {
      const p = await fetchProfile(db, userId);
      setMyEquipment(parseEquipment(p?.equipment));
      // profiles.theme is the cross-device source of truth (synced since
      // migration 0008); localStorage only caches it for the pre-paint script.
      if (p?.theme) applyTheme(normalizeTheme(p.theme));
    } catch {
      /* non-blocking */
    }
  }, [db, userId]);

  React.useEffect(() => {
    reloadExercises();
    reloadProfile();
  }, [reloadExercises, reloadProfile]);

  // Reopen the live-workout overlay if a session was left running (app killed
  // or reloaded mid-workout) — Workout.tsx picks the rest of the state back
  // up from the same snapshot instead of starting a fresh session.
  React.useEffect(() => {
    const snap = loadActiveWorkout(userId);
    if (snap) setWorkoutConfig(snap.workoutConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "System" theme follows the OS while the app is open.
  React.useEffect(() => watchSystemTheme(), []);

  const exMap = React.useMemo(() => {
    const m: Record<string, Exercise> = {};
    for (const e of exercises) m[e.id] = e;
    return m;
  }, [exercises]);

  const goto = React.useCallback((screen: ScreenId, param?: string) => {
    setStack((s) => [...s, { screen, params: paramsFor(screen, param) }]);
  }, []);

  const goBack = React.useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const switchTab = React.useCallback((t: TabId) => {
    setStack([{ screen: TAB_TO_SCREEN[t], params: {} }]);
  }, []);

  const [pausedWorkout, setPausedWorkout] = React.useState<WorkoutConfig | null>(null);

  const startWorkout = React.useCallback((cfg: WorkoutConfig) => {
    setQuickAdd(false);
    setPausedWorkout(null);
    setWorkoutConfig(cfg);
  }, []);

  // Hide the overlay and return to normal navigation without ending the
  // session — Supabase row and the localStorage snapshot are untouched, so
  // this can happen any number of times.
  const minimizeWorkout = React.useCallback(() => {
    setPausedWorkout(workoutConfig);
    setWorkoutConfig(null);
  }, [workoutConfig]);

  const resumeWorkout = React.useCallback(() => {
    setWorkoutConfig(pausedWorkout);
    setPausedWorkout(null);
  }, [pausedWorkout]);

  const endWorkout = React.useCallback((dest: "today" | "history") => {
    setWorkoutConfig(null);
    setPausedWorkout(null);
    setStack(
      dest === "history"
        ? [{ screen: "today", params: {} }, { screen: "history", params: {} }]
        : [{ screen: "today", params: {} }]
    );
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
    myEquipment,
    accent: ACCENT,
    params: top.params,
    goto,
    goBack,
    startWorkout,
    endWorkout,
    workoutConfig,
    pausedWorkout,
    minimizeWorkout,
    resumeWorkout,
    reloadExercises,
    reloadProfile,
    signOut,
  };

  let body: React.ReactNode;
  switch (top.screen) {
    case "today": body = <Today />; break;
    case "history": body = <History />; break;
    case "session-detail": body = <SessionDetail />; break;
    case "library": body = <Library />; break;
    case "exercise-detail": body = <ExerciseDetail />; break;
    case "routines": body = <Routines />; break;
    case "routine-editor": body = <RoutineEditor />; break;
    case "workout-overview": body = <WorkoutOverview />; break;
    case "progress": body = <Progress />; break;
    case "profile": body = <Profile />; break;
    case "settings": body = <Settings />; break;
    default: body = <Today />;
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className="stage">
        {workoutConfig ? (
          <div className="phone" style={{ background: TOK.bg }}>
            <div className="phone-dynamic-island" />
            <Workout />
          </div>
        ) : (
          <Phone
            tabBar={
              <TabBar
                active={SCREEN_TO_TAB[top.screen]}
                accent={ACCENT}
                addOpen={quickAdd}
                onChange={(t) => { setQuickAdd(false); switchTab(t); }}
                onAdd={() => setQuickAdd((v) => !v)}
              />
            }
          >
            <div key={`${stack.length}-${top.screen}`} className="gym-fade" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {body}
            </div>
            <QuickStartSheet
              open={quickAdd}
              onClose={() => setQuickAdd(false)}
              db={db}
              goto={goto}
              startWorkout={startWorkout}
            />
            {pausedWorkout && <PausedWorkoutBar name={pausedWorkout.name ?? "Workout"} onResume={resumeWorkout} />}
          </Phone>
        )}
      </div>
    </AppContext.Provider>
  );
}

// ── Quick-start sheet opened by the center + in the tab bar ─────
function QuickStartSheet({
  open, onClose, db, goto, startWorkout,
}: {
  open: boolean;
  onClose: () => void;
  db: AppCtxValue["db"];
  goto: (s: ScreenId, param?: string) => void;
  startWorkout: (c: WorkoutConfig) => void;
}) {
  const [routines, setRoutines] = React.useState<RoutineFull[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchRoutines(db)
      .then((r) => { if (alive) setRoutines(r); })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [open, db]);

  return (
    <Sheet open={open} onClose={onClose} label="Training starten" title="Was möchtest du machen?">
      <div style={{ padding: "4px 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loaded && routines.slice(0, 4).map((r) => (
          <QuickRow
            key={r.id}
            icon={<I.Routine size={20} color={TOK.accent} />}
            title={r.name}
            sub={`${r.routine_exercises.length} Übungen · Routine starten`}
            onTap={() => { onClose(); startWorkout({ routineId: r.id, name: r.name }); }}
          />
        ))}
        <QuickRow
          icon={<I.Dumbbell size={20} color={TOK.text} />}
          title="Leeres Workout"
          sub="Übungen während des Trainings hinzufügen"
          onTap={() => { onClose(); startWorkout({ routineId: null, name: "Workout" }); }}
        />
        <QuickRow
          icon={<I.Plus size={20} color={TOK.text} />}
          title="Neue Routine erstellen"
          sub="Eigenen Trainingsplan zusammenstellen"
          onTap={() => { onClose(); goto("routine-editor"); }}
        />
      </div>
    </Sheet>
  );
}

// Persistent pill above the tab bar whenever a workout is paused (not
// ended) — visible on every screen so you can jump back in from wherever
// you wandered off to, as many times as you want.
function PausedWorkoutBar({ name, onResume }: { name: string; onResume: () => void }) {
  return (
    <button onClick={onResume} className="gym-glow" style={{
      position: "absolute", left: 12, right: 12, bottom: 100, zIndex: 45, height: 56, borderRadius: 16,
      background: TOK.text, color: "var(--c-bg)", border: "none", cursor: "pointer", fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: 12, padding: "0 16px", WebkitTapHighlightColor: "transparent",
      boxShadow: `0 14px 30px ${TOK.shadow}`,
    }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--c-primary)", flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6 }}>Pausiert</div>
        <div style={{ ...TYPE.bodyEm, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        Fortsetzen <I.ArrowR size={15} color="var(--c-bg)" />
      </span>
    </button>
  );
}

function QuickRow({ icon, title, sub, onTap }: { icon: React.ReactNode; title: string; sub: string; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 12, background: TOK.surface, border: "none", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: TOK.surface3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.bodyEm, color: TOK.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <Tnum style={{ fontSize: 12, color: TOK.dim, marginTop: 2, display: "block" }}>{sub}</Tnum>
      </div>
      <I.ChevR size={16} color={TOK.dim} />
    </button>
  );
}
