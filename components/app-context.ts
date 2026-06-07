"use client";
import { createContext, useContext } from "react";
import type { DB } from "@/lib/data";
import type { Exercise } from "@/lib/supabase/types";
import type { Accent } from "@/lib/design";

export type ScreenId =
  | "today"
  | "workout"
  | "history"
  | "session-detail"
  | "library"
  | "exercise-detail"
  | "program"
  | "routines"
  | "routine-editor"
  | "workout-overview"
  | "progress"
  | "food"
  | "profile"
  | "settings";

export type WorkoutConfig = { routineId: string | null; name: string | null; programWorkoutId?: string | null };

export type AppCtxValue = {
  db: DB;
  userId: string;
  username: string;
  exercises: Exercise[];
  exMap: Record<string, Exercise>;
  accent: Accent;
  params: { sessionId?: string; exerciseId?: string; routineId?: string; programWorkoutId?: string };
  goto: (screen: ScreenId, param?: string, kind?: "program" | "routine") => void;
  startWorkout: (cfg: WorkoutConfig) => void;
  workoutConfig: WorkoutConfig | null;
  reloadExercises: () => Promise<void>;
  restartOnboarding: () => void;
  signOut: () => Promise<void>;
};

export const AppContext = createContext<AppCtxValue | null>(null);

export function useApp(): AppCtxValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppShell");
  return ctx;
}
