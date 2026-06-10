"use client";
import { createContext, useContext } from "react";
import type { DB } from "@/lib/data";
import type { Exercise } from "@/lib/supabase/types";
import type { Accent } from "@/lib/design";
import type { EquipmentId } from "@/lib/equipment";

export type ScreenId =
  | "today"
  | "history"
  | "session-detail"
  | "library"
  | "exercise-detail"
  | "routines"
  | "routine-editor"
  | "workout-overview"
  | "progress"
  | "profile"
  | "settings";

export type ScreenParams = { sessionId?: string; exerciseId?: string; routineId?: string };

export type WorkoutConfig = { routineId: string | null; name: string | null };

export type AppCtxValue = {
  db: DB;
  userId: string;
  username: string;
  exercises: Exercise[];
  exMap: Record<string, Exercise>;
  myEquipment: EquipmentId[];
  accent: Accent;
  params: ScreenParams;
  // Navigation: goto pushes onto a back stack, goBack pops it. Tab taps reset
  // the stack, so "back" always leads somewhere sensible.
  goto: (screen: ScreenId, param?: string) => void;
  goBack: () => void;
  startWorkout: (cfg: WorkoutConfig) => void;
  endWorkout: (dest: "today" | "history") => void;
  workoutConfig: WorkoutConfig | null;
  reloadExercises: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AppContext = createContext<AppCtxValue | null>(null);

export function useApp(): AppCtxValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppShell");
  return ctx;
}
