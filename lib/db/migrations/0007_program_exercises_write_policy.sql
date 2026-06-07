-- 0007_program_exercises_write_policy.sql
-- program_exercises shipped with only a SELECT policy, so inserts/updates were
-- blocked by RLS (403) when generating or editing a program. Add a write (ALL)
-- policy mirroring program_weeks / program_workouts: ownership is verified through
-- program_workouts -> programs (the user owns the parent program). Idempotent.

drop policy if exists "write program_exercises" on public.program_exercises;
create policy "write program_exercises" on public.program_exercises for all
  using (exists (
    select 1 from public.program_workouts pw
      join public.programs p on p.id = pw.program_id
    where pw.id = program_exercises.program_workout_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.program_workouts pw
      join public.programs p on p.id = pw.program_id
    where pw.id = program_exercises.program_workout_id and p.user_id = auth.uid()
  ));
