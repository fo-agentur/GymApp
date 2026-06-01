-- Bugfix: get_last_performance returned max(weight) and max(reps) independently,
-- producing impossible "best" combos. Return the reps/rpe of the actual heaviest set
-- of the most recent finished session, plus that session's working-set volume.
create or replace function public.get_last_performance(p_exercise_id uuid, p_user_id uuid)
returns table (
  session_date timestamptz,
  best_weight numeric,
  best_reps int,
  best_rpe numeric,
  total_volume numeric
)
language sql
stable
set search_path = public
as $$
  with last_session as (
    select ws.id, ws.started_at
    from workout_sessions ws
    join sets s on s.workout_session_id = ws.id
    where s.exercise_id = p_exercise_id
      and ws.user_id = p_user_id
      and ws.finished_at is not null
      and not s.is_warmup
    group by ws.id, ws.started_at
    order by ws.started_at desc
    limit 1
  ),
  top_set as (
    select s.weight_kg, s.reps, s.rpe
    from sets s
    join last_session ls on ls.id = s.workout_session_id
    where s.exercise_id = p_exercise_id
      and not s.is_warmup
    order by s.weight_kg desc nulls last, s.reps desc nulls last
    limit 1
  )
  select
    ls.started_at,
    ts.weight_kg,
    ts.reps,
    ts.rpe,
    (select sum(coalesce(s.weight_kg, 0) * coalesce(s.reps, 0))
       from sets s
      where s.workout_session_id = ls.id and not s.is_warmup)
  from last_session ls
  cross join top_set ts;
$$;
