-- 0009_exercise_expansion.sql — 10 curated global exercises that are missing
-- from the free-exercise-db dump (popular rows / lat / machine variants).
-- Mirrors scripts/extra-exercises.mjs; guide data (instructions, secondary
-- muscles) ships in public/exercise-db.json. Idempotent via NOT EXISTS.

insert into public.exercises (user_id, name, category, primary_muscle)
select null, x.n, x.c, x.m
from (values
  ('Meadows Row',                  'barbell',  'Back'),
  ('Chest Supported Dumbbell Row', 'dumbbell', 'Back'),
  ('Seal Row',                     'barbell',  'Back'),
  ('Machine Assisted Pull-Up',     'machine',  'Back'),
  ('Prone Y-Raise',                'dumbbell', 'Back'),
  ('Bulgarian Split Squat',        'dumbbell', 'Quads'),
  ('Cable Lateral Raise',          'cable',    'Shoulders'),
  ('Machine Lateral Raise',        'machine',  'Shoulders'),
  ('Dumbbell Romanian Deadlift',   'dumbbell', 'Hamstrings'),
  ('Kettlebell Swing',             'dumbbell', 'Glutes')
) as x(n, c, m)
where not exists (
  select 1 from public.exercises e
  where e.user_id is null and e.name = x.n
);
