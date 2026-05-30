export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          category: string
          created_at: string
          id: string
          is_unilateral: boolean
          name: string
          primary_muscle: string
          secondary_muscles: string[] | null
          tracks_reps: boolean
          tracks_weight: boolean
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_unilateral?: boolean
          name: string
          primary_muscle: string
          secondary_muscles?: string[] | null
          tracks_reps?: boolean
          tracks_weight?: boolean
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_unilateral?: boolean
          name?: string
          primary_muscle?: string
          secondary_muscles?: string[] | null
          tracks_reps?: boolean
          tracks_weight?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          exercise_id: string
          id: string
          pr_type: string
          set_id: string
          user_id: string
          value: number
        }
        Insert: {
          achieved_at?: string
          exercise_id: string
          id?: string
          pr_type: string
          set_id: string
          user_id: string
          value: number
        }
        Update: {
          achieved_at?: string
          exercise_id?: string
          id?: string
          pr_type?: string
          set_id?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bar_weight_kg: number
          created_at: string
          default_rest_seconds: number
          display_name: string | null
          equipment: Json
          id: string
          onboarding_completed: boolean
          units: string
        }
        Insert: {
          bar_weight_kg?: number
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          equipment?: Json
          id: string
          onboarding_completed?: boolean
          units?: string
        }
        Update: {
          bar_weight_kg?: number
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          equipment?: Json
          id?: string
          onboarding_completed?: boolean
          units?: string
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          position: number
          rest_seconds: number | null
          routine_id: string
          target_reps_max: number | null
          target_reps_min: number | null
          target_rpe: number | null
          target_sets: number
        }
        Insert: {
          exercise_id: string
          id?: string
          position: number
          rest_seconds?: number | null
          routine_id: string
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rpe?: number | null
          target_sets?: number
        }
        Update: {
          exercise_id?: string
          id?: string
          position?: number
          rest_seconds?: number | null
          routine_id?: string
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rpe?: number | null
          target_sets?: number
        }
        Relationships: []
      }
      routines: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          completed_at: string
          exercise_id: string
          id: string
          is_warmup: boolean
          reps: number | null
          rpe: number | null
          set_index: number
          weight_kg: number | null
          workout_session_id: string
        }
        Insert: {
          completed_at?: string
          exercise_id: string
          id?: string
          is_warmup?: boolean
          reps?: number | null
          rpe?: number | null
          set_index: number
          weight_kg?: number | null
          workout_session_id: string
        }
        Update: {
          completed_at?: string
          exercise_id?: string
          id?: string
          is_warmup?: boolean
          reps?: number | null
          rpe?: number | null
          set_index?: number
          weight_kg?: number | null
          workout_session_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          duration_seconds: number | null
          finished_at: string | null
          id: string
          name: string | null
          notes: string | null
          program_workout_id: string | null
          routine_id: string | null
          started_at: string
          total_sets: number | null
          total_volume_kg: number | null
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          program_workout_id?: string | null
          routine_id?: string | null
          started_at?: string
          total_sets?: number | null
          total_volume_kg?: number | null
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          program_workout_id?: string | null
          routine_id?: string | null
          started_at?: string
          total_sets?: number | null
          total_volume_kg?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      estimate_1rm: { Args: { reps: number; weight: number }; Returns: number }
      get_last_performance: {
        Args: { p_exercise_id: string; p_user_id: string }
        Returns: {
          best_reps: number
          best_rpe: number
          best_weight: number
          session_date: string
          total_volume: number
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Exercise = Tables<"exercises">
export type Routine = Tables<"routines">
export type RoutineExercise = Tables<"routine_exercises">
export type WorkoutSession = Tables<"workout_sessions">
export type SetRowDB = Tables<"sets">
export type Profile = Tables<"profiles">
