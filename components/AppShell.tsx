"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchExercises } from "@/lib/data";
import type { Exercise } from "@/lib/supabase/types";
import { ACCENT, Phone, TabBar, TOK, type TabId } from "@/lib/design";
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
  today: "today",
  plan: "routines",
  food: "food",
  stats: "progress",
  profile: "profile",
};
const SCREEN_TO_TAB: Partial<Record<ScreenId, TabId>> = {
  today: "today",
  routines: "plan",
  food: "food",
  progress: "stats",
  profile: "profile",
};

export default function AppShell({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const db = React.useMemo(() => createClient(), []);
  const [active, setActive] = React.useState<ScreenId>("today");
  const [params, setParams] = React.useState<{ sessionId?: string; exerciseId?: string; routineId?: string }>({});
  const [workoutConfig, setWorkoutConfig] = React.useState<WorkoutConfig | null>(null);
  const [exercises, setExercises] = React.useState<Exercise[]>([]);

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
                <TabBar active={activeTab} accent={ACCENT} onChange={(t) => goto(TAB_TO_SCREEN[t])} />
              ) : undefined
            }
          >
            <div key={active} className="gym-fade" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {body}
            </div>
          </Phone>
        )}
      </div>
    </AppContext.Provider>
  );
}
