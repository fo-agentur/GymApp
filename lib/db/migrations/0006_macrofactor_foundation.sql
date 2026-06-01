-- 0006_macrofactor_foundation.sql
-- MacroFactor parity foundation: onboarding/coach inputs, weight & body tracking,
-- the adaptive nutrition program + weekly check-ins, habits, micronutrients,
-- favorites, gym profiles, and workout set-type/RIR/partials/side extensions.
-- Idempotent (if not exists / drop policy if exists) so it can be re-applied safely.

-- ── profiles: onboarding + coaching inputs + theme preference ──
alter table public.profiles
  add column if not exists sex text check (sex in ('male','female','other')),
  add column if not exists birth_date date,
  add column if not exists height_cm numeric(5,1),
  add column if not exists activity_level text
    check (activity_level in ('sedentary','light','moderate','very','extra')),
  add column if not exists goal_weight_kg numeric(6,2),
  add column if not exists theme text not null default 'dark'
    check (theme in ('dark','light','system'));

-- ── foods: micronutrients + nicer serving labels ──
alter table public.foods
  add column if not exists fiber_g numeric(7,2),
  add column if not exists sugar_g numeric(7,2),
  add column if not exists sat_fat_g numeric(7,2),
  add column if not exists sodium_mg numeric(8,2),
  add column if not exists serving_label text,
  add column if not exists verified boolean not null default false,
  add column if not exists micros jsonb not null default '{}';

-- ── food_logs: denormalized micros for the logged quantity ──
alter table public.food_logs
  add column if not exists fiber_g numeric(7,2),
  add column if not exists sugar_g numeric(7,2),
  add column if not exists sat_fat_g numeric(7,2),
  add column if not exists sodium_mg numeric(8,2),
  add column if not exists micros jsonb not null default '{}';

-- ── food_favorites: staple foods with a preferred serving ──
create table if not exists public.food_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  food_id uuid not null references public.foods on delete cascade,
  last_qty_g numeric(8,2),
  last_meal text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, food_id)
);
create index if not exists food_favorites_user_idx on public.food_favorites (user_id, position);

-- ── weight_logs: scale weight (True-Weight trend is computed from these) ──
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  logged_on date not null default ((now() at time zone 'utc')::date),
  weight_kg numeric(6,2) not null,
  body_fat_pct numeric(4,1),
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique(user_id, logged_on)
);
create index if not exists weight_logs_user_day_idx on public.weight_logs (user_id, logged_on);

-- ── body_metrics: waist / hips / arm / etc. ──
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  logged_on date not null default ((now() at time zone 'utc')::date),
  metric text not null,
  value numeric(8,2) not null,
  unit text not null default 'cm',
  created_at timestamptz not null default now(),
  unique(user_id, logged_on, metric)
);
create index if not exists body_metrics_user_idx on public.body_metrics (user_id, metric, logged_on);

-- ── progress_photos (files live in the private progress-photos bucket) ──
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  taken_on date not null default ((now() at time zone 'utc')::date),
  path text not null,
  pose text,
  created_at timestamptz not null default now()
);
create index if not exists progress_photos_user_idx on public.progress_photos (user_id, taken_on);

-- ── nutrition_programs: the coach's current plan (one active per user) ──
create table if not exists public.nutrition_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  mode text not null default 'coached' check (mode in ('coached','collaborative','manual')),
  goal_type text not null default 'maintain' check (goal_type in ('lose','maintain','gain')),
  goal_rate_kg_per_week numeric(4,3) not null default 0,
  diet_style text not null default 'balanced'
    check (diet_style in ('balanced','lowcarb','keto','highprotein','lowfat')),
  start_weight_kg numeric(6,2),
  expenditure_kcal numeric(7,1),
  kcal_target int,
  protein_g int,
  carbs_g int,
  fat_g int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists nutrition_programs_one_active
  on public.nutrition_programs (user_id) where active;

-- ── nutrition_checkins: weekly adjustment history ──
create table if not exists public.nutrition_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  program_id uuid references public.nutrition_programs on delete cascade,
  week_start date not null,
  prev_expenditure numeric(7,1),
  new_expenditure numeric(7,1),
  prev_kcal_target int,
  new_kcal_target int,
  avg_intake_kcal numeric(7,1),
  trend_weight_kg numeric(6,2),
  trend_change_kg numeric(5,2),
  adherence_days int,
  message text,
  created_at timestamptz not null default now(),
  unique(user_id, week_start)
);

-- ── habits ──
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  emoji text,
  color text,
  cadence text not null default 'daily' check (cadence in ('daily','weekly')),
  target_per_week int not null default 7,
  archived boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  logged_on date not null default ((now() at time zone 'utc')::date),
  value int not null default 1,
  created_at timestamptz not null default now(),
  unique(habit_id, logged_on)
);
create index if not exists habit_logs_user_idx on public.habit_logs (user_id, logged_on);

-- ── gym_profiles: equipment sets for the plate calculator ──
create table if not exists public.gym_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  bar_weight_kg numeric(5,2) not null default 20,
  plates jsonb not null default '[]',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── sets: MacroFactor set types + RIR + partial reps + unilateral side ──
alter table public.sets
  add column if not exists set_type text not null default 'normal'
    check (set_type in ('normal','warmup','drop','failure','myorep','partial')),
  add column if not exists rir numeric(3,1),
  add column if not exists partial_reps int,
  add column if not exists side text not null default 'both'
    check (side in ('both','left','right'));
update public.sets set set_type = 'warmup' where is_warmup and set_type = 'normal';

-- ── program / routine exercises: supersets, RIR targets, per-exercise notes ──
alter table public.program_exercises
  add column if not exists target_rir numeric(3,1),
  add column if not exists superset_group int,
  add column if not exists notes text;
alter table public.routine_exercises
  add column if not exists target_rir numeric(3,1),
  add column if not exists superset_group int,
  add column if not exists notes text;

-- ════════════════════════ RLS ════════════════════════
alter table public.food_favorites    enable row level security;
alter table public.weight_logs       enable row level security;
alter table public.body_metrics      enable row level security;
alter table public.progress_photos   enable row level security;
alter table public.nutrition_programs enable row level security;
alter table public.nutrition_checkins enable row level security;
alter table public.habits            enable row level security;
alter table public.habit_logs        enable row level security;
alter table public.gym_profiles      enable row level security;

drop policy if exists "own food_favorites" on public.food_favorites;
create policy "own food_favorites" on public.food_favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own weight_logs" on public.weight_logs;
create policy "own weight_logs" on public.weight_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own body_metrics" on public.body_metrics;
create policy "own body_metrics" on public.body_metrics for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own progress_photos" on public.progress_photos;
create policy "own progress_photos" on public.progress_photos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own nutrition_programs" on public.nutrition_programs;
create policy "own nutrition_programs" on public.nutrition_programs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own nutrition_checkins" on public.nutrition_checkins;
create policy "own nutrition_checkins" on public.nutrition_checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own habits" on public.habits;
create policy "own habits" on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own habit_logs" on public.habit_logs;
create policy "own habit_logs" on public.habit_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own gym_profiles" on public.gym_profiles;
create policy "own gym_profiles" on public.gym_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── private storage bucket for progress photos, RLS by {user_id}/ path prefix ──
insert into storage.buckets (id, name, public) values ('progress-photos','progress-photos', false)
  on conflict (id) do nothing;

drop policy if exists "own progress photos read" on storage.objects;
create policy "own progress photos read" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own progress photos insert" on storage.objects;
create policy "own progress photos insert" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own progress photos delete" on storage.objects;
create policy "own progress photos delete" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
