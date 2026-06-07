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
      body_metrics: {
        Row: {
          created_at: string
          id: string
          logged_on: string
          metric: string
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_on?: string
          metric: string
          unit?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_on?: string
          metric?: string
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
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
      food_favorites: {
        Row: {
          created_at: string
          food_id: string
          id: string
          last_meal: string | null
          last_qty_g: number | null
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          id?: string
          last_meal?: string | null
          last_qty_g?: number | null
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string
          id?: string
          last_meal?: string | null
          last_qty_g?: number | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_favorites_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      food_logs: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          id: string
          kcal: number
          logged_on: string
          meal: string
          micros: Json
          name: string
          photo_path: string | null
          protein_g: number
          qty_g: number | null
          sat_fat_g: number | null
          sodium_mg: number | null
          source: string
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          id?: string
          kcal?: number
          logged_on?: string
          meal?: string
          micros?: Json
          name: string
          photo_path?: string | null
          protein_g?: number
          qty_g?: number | null
          sat_fat_g?: number | null
          sodium_mg?: number | null
          source?: string
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          id?: string
          kcal?: number
          logged_on?: string
          meal?: string
          micros?: Json
          name?: string
          photo_path?: string | null
          protein_g?: number
          qty_g?: number | null
          sat_fat_g?: number | null
          sodium_mg?: number | null
          source?: string
          sugar_g?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          carbs_g: number
          created_at: string
          created_by: string | null
          fat_g: number
          fiber_g: number | null
          id: string
          kcal: number
          micros: Json
          name: string
          protein_g: number
          sat_fat_g: number | null
          serving_g: number | null
          serving_label: string | null
          sodium_mg: number | null
          source: string
          sugar_g: number | null
          verified: boolean
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          carbs_g?: number
          created_at?: string
          created_by?: string | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          kcal?: number
          micros?: Json
          name: string
          protein_g?: number
          sat_fat_g?: number | null
          serving_g?: number | null
          serving_label?: string | null
          sodium_mg?: number | null
          source?: string
          sugar_g?: number | null
          verified?: boolean
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          carbs_g?: number
          created_at?: string
          created_by?: string | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          kcal?: number
          micros?: Json
          name?: string
          protein_g?: number
          sat_fat_g?: number | null
          serving_g?: number | null
          serving_label?: string | null
          sodium_mg?: number | null
          source?: string
          sugar_g?: number | null
          verified?: boolean
        }
        Relationships: []
      }
      gym_profiles: {
        Row: {
          active: boolean
          bar_weight_kg: number
          created_at: string
          id: string
          name: string
          plates: Json
          user_id: string
        }
        Insert: {
          active?: boolean
          bar_weight_kg?: number
          created_at?: string
          id?: string
          name: string
          plates?: Json
          user_id: string
        }
        Update: {
          active?: boolean
          bar_weight_kg?: number
          created_at?: string
          id?: string
          name?: string
          plates?: Json
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          logged_on: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          logged_on?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          logged_on?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived: boolean
          cadence: string
          color: string | null
          created_at: string
          emoji: string | null
          id: string
          name: string
          position: number
          target_per_week: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          cadence?: string
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          position?: number
          target_per_week?: number
          user_id: string
        }
        Update: {
          archived?: boolean
          cadence?: string
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          position?: number
          target_per_week?: number
          user_id?: string
        }
        Relationships: []
      }
      nutrition_checkins: {
        Row: {
          adherence_days: number | null
          avg_intake_kcal: number | null
          created_at: string
          id: string
          message: string | null
          new_expenditure: number | null
          new_kcal_target: number | null
          prev_expenditure: number | null
          prev_kcal_target: number | null
          program_id: string | null
          trend_change_kg: number | null
          trend_weight_kg: number | null
          user_id: string
          week_start: string
        }
        Insert: {
          adherence_days?: number | null
          avg_intake_kcal?: number | null
          created_at?: string
          id?: string
          message?: string | null
          new_expenditure?: number | null
          new_kcal_target?: number | null
          prev_expenditure?: number | null
          prev_kcal_target?: number | null
          program_id?: string | null
          trend_change_kg?: number | null
          trend_weight_kg?: number | null
          user_id: string
          week_start: string
        }
        Update: {
          adherence_days?: number | null
          avg_intake_kcal?: number | null
          created_at?: string
          id?: string
          message?: string | null
          new_expenditure?: number | null
          new_kcal_target?: number | null
          prev_expenditure?: number | null
          prev_kcal_target?: number | null
          program_id?: string | null
          trend_change_kg?: number | null
          trend_weight_kg?: number | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_checkins_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "nutrition_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_programs: {
        Row: {
          active: boolean
          carbs_g: number | null
          created_at: string
          diet_style: string
          expenditure_kcal: number | null
          fat_g: number | null
          goal_rate_kg_per_week: number
          goal_type: string
          id: string
          kcal_target: number | null
          mode: string
          protein_g: number | null
          start_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          carbs_g?: number | null
          created_at?: string
          diet_style?: string
          expenditure_kcal?: number | null
          fat_g?: number | null
          goal_rate_kg_per_week?: number
          goal_type?: string
          id?: string
          kcal_target?: number | null
          mode?: string
          protein_g?: number | null
          start_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          carbs_g?: number | null
          created_at?: string
          diet_style?: string
          expenditure_kcal?: number | null
          fat_g?: number | null
          goal_rate_kg_per_week?: number
          goal_type?: string
          id?: string
          kcal_target?: number | null
          mode?: string
          protein_g?: number | null
          start_weight_kg?: number | null
          updated_at?: string
          user_id?: string
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
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          bar_weight_kg: number
          birth_date: string | null
          created_at: string
          default_rest_seconds: number
          display_name: string | null
          equipment: Json
          goal_weight_kg: number | null
          height_cm: number | null
          id: string
          onboarding_completed: boolean
          sex: string | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_kcal: number | null
          target_protein_g: number | null
          theme: string
          units: string
        }
        Insert: {
          activity_level?: string | null
          bar_weight_kg?: number
          birth_date?: string | null
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          equipment?: Json
          goal_weight_kg?: number | null
          height_cm?: number | null
          id: string
          onboarding_completed?: boolean
          sex?: string | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          theme?: string
          units?: string
        }
        Update: {
          activity_level?: string | null
          bar_weight_kg?: number
          birth_date?: string | null
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          equipment?: Json
          goal_weight_kg?: number | null
          height_cm?: number | null
          id?: string
          onboarding_completed?: boolean
          sex?: string | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          theme?: string
          units?: string
        }
        Relationships: []
      }
      program_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          program_workout_id: string
          rest_seconds: number | null
          superset_group: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_rir: number | null
          target_rpe: number | null
          target_sets: number
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          program_workout_id: string
          rest_seconds?: number | null
          superset_group?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          target_sets?: number
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          program_workout_id?: string
          rest_seconds?: number | null
          superset_group?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_workout_id_fkey"
            columns: ["program_workout_id"]
            isOneToOne: false
            referencedRelation: "program_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          id: string
          is_deload: boolean
          program_id: string
          volume_multiplier: number
          week_number: number
        }
        Insert: {
          id?: string
          is_deload?: boolean
          program_id: string
          volume_multiplier?: number
          week_number: number
        }
        Update: {
          id?: string
          is_deload?: boolean
          program_id?: string
          volume_multiplier?: number
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_workouts: {
        Row: {
          day_of_week: number
          id: string
          name: string
          position: number
          program_id: string
          week_number: number
        }
        Insert: {
          day_of_week: number
          id?: string
          name: string
          position: number
          program_id: string
          week_number: number
        }
        Update: {
          day_of_week?: number
          id?: string
          name?: string
          position?: number
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          archived: boolean
          created_at: string
          days_per_week: number
          description: string | null
          difficulty: string | null
          duration_weeks: number
          goal: string | null
          id: string
          is_template: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          days_per_week?: number
          description?: string | null
          difficulty?: string | null
          duration_weeks?: number
          goal?: string | null
          id?: string
          is_template?: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          days_per_week?: number
          description?: string | null
          difficulty?: string | null
          duration_weeks?: number
          goal?: string | null
          id?: string
          is_template?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          path: string
          pose: string | null
          taken_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          pose?: string | null
          taken_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          pose?: string | null
          taken_on?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          rest_seconds: number | null
          routine_id: string
          superset_group: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_rir: number | null
          target_rpe: number | null
          target_sets: number
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          rest_seconds?: number | null
          routine_id: string
          superset_group?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          target_sets?: number
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          routine_id?: string
          superset_group?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
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
          partial_reps: number | null
          reps: number | null
          rir: number | null
          rpe: number | null
          set_index: number
          set_type: string
          side: string
          weight_kg: number | null
          workout_session_id: string
        }
        Insert: {
          completed_at?: string
          exercise_id: string
          id?: string
          is_warmup?: boolean
          partial_reps?: number | null
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_index: number
          set_type?: string
          side?: string
          weight_kg?: number | null
          workout_session_id: string
        }
        Update: {
          completed_at?: string
          exercise_id?: string
          id?: string
          is_warmup?: boolean
          partial_reps?: number | null
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_index?: number
          set_type?: string
          side?: string
          weight_kg?: number | null
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_programs: {
        Row: {
          current_week: number
          id: string
          is_active: boolean
          program_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          current_week?: number
          id?: string
          is_active?: boolean
          program_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          current_week?: number
          id?: string
          is_active?: boolean
          program_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          id: string
          logged_on: string
          note: string | null
          source: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          logged_on?: string
          note?: string | null
          source?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          logged_on?: string
          note?: string | null
          source?: string
          user_id?: string
          weight_kg?: number
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
        Relationships: [
          {
            foreignKeyName: "workout_sessions_program_workout_id_fkey"
            columns: ["program_workout_id"]
            isOneToOne: false
            referencedRelation: "program_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
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
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]

// ── Convenience row aliases ──
export type Exercise = Tables<"exercises">
export type Routine = Tables<"routines">
export type RoutineExercise = Tables<"routine_exercises">
export type WorkoutSession = Tables<"workout_sessions">
export type SetRowDB = Tables<"sets">
export type Profile = Tables<"profiles">
export type Food = Tables<"foods">
export type FoodLog = Tables<"food_logs">
export type FoodFavorite = Tables<"food_favorites">
export type WeightLog = Tables<"weight_logs">
export type BodyMetric = Tables<"body_metrics">
export type ProgressPhoto = Tables<"progress_photos">
export type NutritionProgram = Tables<"nutrition_programs">
export type NutritionCheckin = Tables<"nutrition_checkins">
export type Habit = Tables<"habits">
export type HabitLog = Tables<"habit_logs">
export type GymProfile = Tables<"gym_profiles">
export type Program = Tables<"programs">
export type ProgramWeek = Tables<"program_weeks">
export type ProgramWorkout = Tables<"program_workouts">
export type ProgramExercise = Tables<"program_exercises">
export type UserProgram = Tables<"user_programs">
