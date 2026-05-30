-- 0001_init.sql — GymApp initial schema
-- Tables, RLS policies, helper functions, and new-user trigger.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  units text not null default 'metric' check (units in ('metric','imperial')),
  bar_weight_kg numeric(5,2) not null default 20,
  default_rest_seconds int not null default 120,
  equipment jsonb not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade, -- null = global
  name text not null,
  category text not null check (category in
    ('barbell','dumbbell','machine','cable','bodyweight','cardio','other')),
  primary_muscle text not null,
  secondary_muscles text[] default '{}',
  is_unilateral boolean not null default false,
  tracks_weight boolean not null default true,
  tracks_reps boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade, -- null = global template
  name text not null,
  description text,
  goal text check (goal in ('strength','hypertrophy','general')),
  difficulty text check (difficulty in ('beginner','intermediate','advanced')),
  duration_weeks int not null default 6,
  days_per_week int not null default 3,
  is_template boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs on delete cascade,
  week_number int not null,
  volume_multiplier numeric(3,2) not null default 1.0,
  is_deload boolean not null default false,
  unique(program_id, week_number)
);

create table public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs on delete cascade,
  week_number int not null,
  day_of_week int not null check (day_of_week between 1 and 7),
  name text not null,
  position int not null
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_workout_id uuid not null references program_workouts on delete cascade,
  exercise_id uuid not null references exercises on delete restrict,
  position int not null,
  target_sets int not null default 3,
  target_reps_min int,
  target_reps_max int,
  target_rpe numeric(3,1),
  rest_seconds int
);

create table public.user_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  program_id uuid not null references programs on delete cascade,
  started_at timestamptz not null default now(),
  current_week int not null default 1,
  is_active boolean not null default true
);

-- Only one active program per user (partial unique index; inline partial
-- constraints are not valid Postgres, so this is expressed as an index).
create unique index user_programs_one_active
  on public.user_programs (user_id)
  where is_active;

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines on delete cascade,
  exercise_id uuid not null references exercises on delete restrict,
  position int not null,
  target_sets int not null default 3,
  target_reps_min int,
  target_reps_max int,
  target_rpe numeric(3,1),
  rest_seconds int,
  unique(routine_id, position)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  routine_id uuid references routines on delete set null,
  program_workout_id uuid references program_workouts on delete set null,
  name text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text,
  total_volume_kg numeric(10,2),
  total_sets int,
  duration_seconds int
);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references workout_sessions on delete cascade,
  exercise_id uuid not null references exercises on delete restrict,
  set_index int not null,
  weight_kg numeric(6,2),
  reps int,
  rpe numeric(3,1),
  is_warmup boolean not null default false,
  completed_at timestamptz not null default now()
);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  exercise_id uuid not null references exercises on delete cascade,
  set_id uuid not null references sets on delete cascade,
  pr_type text not null check (pr_type in ('1rm_estimated','heaviest','most_reps')),
  value numeric(10,2) not null,
  achieved_at timestamptz not null default now(),
  unique(user_id, exercise_id, pr_type)
);

-- RLS
alter table profiles enable row level security;
alter table exercises enable row level security;
alter table programs enable row level security;
alter table program_weeks enable row level security;
alter table program_workouts enable row level security;
alter table program_exercises enable row level security;
alter table user_programs enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table sets enable row level security;
alter table personal_records enable row level security;

-- Profiles
create policy "own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- Exercises: read global + own, write/delete only own
create policy "read exercises" on exercises for select
  using (user_id is null or user_id = auth.uid());
create policy "insert own exercises" on exercises for insert
  with check (auth.uid() = user_id);
create policy "update own exercises" on exercises for update
  using (auth.uid() = user_id);
create policy "delete own exercises" on exercises for delete
  using (auth.uid() = user_id);

-- Programs: same pattern as exercises
create policy "read programs" on programs for select
  using (user_id is null or user_id = auth.uid());
create policy "write own programs" on programs for insert
  with check (auth.uid() = user_id);
create policy "update own programs" on programs for update
  using (auth.uid() = user_id);
create policy "delete own programs" on programs for delete
  using (auth.uid() = user_id);

-- Program sub-tables: access if parent program is accessible
create policy "read program_weeks" on program_weeks for select
  using (exists (
    select 1 from programs p where p.id = program_id
    and (p.user_id is null or p.user_id = auth.uid())
  ));
create policy "write program_weeks" on program_weeks for all
  using (exists (
    select 1 from programs p where p.id = program_id
    and p.user_id = auth.uid()
  ));

create policy "read program_workouts" on program_workouts for select
  using (exists (
    select 1 from programs p where p.id = program_id
    and (p.user_id is null or p.user_id = auth.uid())
  ));
create policy "write program_workouts" on program_workouts for all
  using (exists (
    select 1 from programs p where p.id = program_id
    and p.user_id = auth.uid()
  ));

create policy "read program_exercises" on program_exercises for select
  using (exists (
    select 1 from program_workouts pw
    join programs p on p.id = pw.program_id
    where pw.id = program_workout_id
    and (p.user_id is null or p.user_id = auth.uid())
  ));

-- User programs, routines, sessions, sets, PRs: own only
create policy "own user_programs" on user_programs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own routines" on routines for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own routine_exercises" on routine_exercises for all
  using (exists (
    select 1 from routines r where r.id = routine_id and r.user_id = auth.uid()
  ));
create policy "own sessions" on workout_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sets" on sets for all
  using (exists (
    select 1 from workout_sessions s
    where s.id = workout_session_id and s.user_id = auth.uid()
  ));
create policy "own prs" on personal_records for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Helper functions
create or replace function estimate_1rm(weight numeric, reps int)
returns numeric language sql immutable as $$
  select case
    when reps <= 0 then 0
    when reps = 1 then weight
    else round(weight * (1 + reps::numeric / 30), 2)
  end;
$$;

create or replace function get_last_performance(
  p_exercise_id uuid, p_user_id uuid
) returns table (
  session_date timestamptz,
  best_weight numeric,
  best_reps int,
  best_rpe numeric,
  total_volume numeric
) language sql stable as $$
  select ws.started_at, max(s.weight_kg), max(s.reps),
         max(s.rpe), sum(s.weight_kg * s.reps)
  from sets s
  join workout_sessions ws on ws.id = s.workout_session_id
  where s.exercise_id = p_exercise_id
    and ws.user_id = p_user_id
    and ws.finished_at is not null
    and not s.is_warmup
  group by ws.id, ws.started_at
  order by ws.started_at desc limit 1;
$$;

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
