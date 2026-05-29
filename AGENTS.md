# AGENTS.md — GymApp

## Project Overview
Strength tracking PWA for personal use + small group of friends (~10 users). 
MacroFactor Workouts-inspired. No paywall, no social feed. Multi-user via 
Supabase Auth (each user has their own data, isolated via RLS).

Repo: https://github.com/fo-agentur/GymApp

## First Thing — Fetch the Design
Before writing any UI code, extract the design reference:

```bash
curl -L -o _design/design.gz \
  "https://api.anthropic.com/v1/design/h/otFyDx-kD0ND3m4FJUsgkA?open_file=index.html"
cd _design && gunzip design.gz || tar -xzf design.gz 2>/dev/null || true
```

Read every file in `_design/`. Extract all CSS variables, color values, 
component patterns, and spacing into `_design/tokens.md`. This file is 
your design contract — every component you build must match it.

## Tech Stack (non-negotiable)
- **Framework:** Next.js 15, App Router, TypeScript strict
- **Styling:** Tailwind CSS v4 (use `@theme` block for design tokens)
- **Components:** shadcn/ui as primitive base, customized to design
- **Database:** Supabase (Postgres + Auth + Storage)
- **ORM:** Drizzle ORM (NOT supabase-js for queries — only for auth)
- **Server State:** TanStack Query v5
- **Local State:** Zustand (active workout session only)
- **Offline:** Dexie.js (IndexedDB queue, sync to Supabase when online)
- **Sheets:** Vaul
- **Charts:** Recharts (use inline SVG only for sparklines)
- **PWA:** next-pwa
- **Package Manager:** pnpm (never npm or yarn)
- **Hosting:** Vercel

## Repository Structure
```
/
├── AGENTS.md                    ← this file
├── _design/                     ← design reference (gitignored from deploy)
│   ├── index.html               ← extracted design file
│   └── tokens.md                ← extracted design tokens
├── app/
│   ├── (auth)/
│   │   └── sign-in/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx           ← app shell + bottom nav
│   │   ├── today/page.tsx
│   │   ├── plan/
│   │   │   ├── page.tsx         ← program list + active program
│   │   │   └── [id]/page.tsx    ← program detail
│   │   ├── stats/page.tsx
│   │   ├── history/
│   │   │   ├── page.tsx
│   │   │   └── [sessionId]/page.tsx
│   │   ├── workout/
│   │   │   └── [sessionId]/page.tsx   ← active workout (full-screen)
│   │   ├── exercises/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── routines/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── profile/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/callback/route.ts
│   │   └── webhook/strava/route.ts    ← placeholder for later
│   ├── globals.css
│   └── layout.tsx               ← root layout
├── components/
│   ├── ui/                      ← shadcn primitives (auto-generated)
│   ├── app/
│   │   ├── bottom-nav.tsx
│   │   ├── phone-frame.tsx
│   │   ├── coach-card.tsx
│   │   ├── set-row.tsx
│   │   ├── session-row.tsx
│   │   ├── exercise-row.tsx
│   │   ├── metric-stat.tsx
│   │   ├── recovery-strip.tsx
│   │   ├── volume-targets.tsx
│   │   ├── mesocycle-bar.tsx
│   │   └── empty-state.tsx
│   ├── charts/
│   │   ├── strength-chart.tsx   ← 1RM with confidence band
│   │   └── volume-bars.tsx
│   └── sheets/
│       ├── set-logger.tsx
│       ├── plate-calculator.tsx
│       ├── coach-override.tsx
│       └── smart-sub.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts            ← Drizzle schema
│   │   ├── client.ts
│   │   ├── queries/
│   │   │   ├── workouts.ts
│   │   │   ├── exercises.ts
│   │   │   ├── stats.ts
│   │   │   └── programs.ts
│   │   └── migrations/
│   ├── supabase/
│   │   ├── client.ts            ← browser client
│   │   └── server.ts            ← server client
│   ├── offline/
│   │   ├── db.ts                ← Dexie instance
│   │   └── sync.ts              ← queue + sync logic
│   └── utils/
│       ├── epley.ts             ← 1RM estimation
│       └── plates.ts            ← plate calculator logic
├── hooks/
│   ├── use-workout-session.ts
│   ├── use-rest-timer.ts
│   └── use-offline-sync.ts
├── stores/
│   └── workout.ts               ← Zustand active workout store
├── types/
│   └── index.ts
└── middleware.ts                ← auth redirect
```

## Database Schema

```sql
-- Run this as Supabase migration
-- File: lib/db/migrations/0001_init.sql

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
  is_active boolean not null default true,
  unique(user_id, is_active) where is_active = true -- only 1 active program
);

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
```

## Multi-User Architecture

Every user who signs up via magic link gets:
1. A row in `auth.users` (Supabase managed)
2. A row in `public.profiles` (created via DB trigger on user signup)
3. Full data isolation via RLS — users can ONLY see their own data
4. Access to global exercises and program templates (`user_id IS NULL`)

```sql
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
```

Friends just sign up with their email, they get their own isolated account. 
No invite system needed — open registration. Restrict to specific emails 
in Supabase Auth settings if needed.

## Design Tokens (from _design/ reference)

```css
/* globals.css — @theme block for Tailwind v4 */
@theme {
  --color-bg: #000000;
  --color-surface: #0a0a0a;
  --color-elevated: #141414;
  --color-accent: #bef264;
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-tertiary: #52525b;
  --color-semantic-red: #ef4444;
  --color-semantic-green: #22c55e;
  --color-border-subtle: #1a1a1a;
  --color-border-coach: #bef264; /* ONLY for coach suggestion box */

  --font-sans: 'Geist', sans-serif;
  --font-mono: 'Geist Mono', monospace;

  --radius-card: 1.5rem;
  --radius-button: 1.5rem;
  --radius-chip: 2rem;

  --bottom-nav-height: 64px;
}
```

After extracting the design file, override any of these values that 
conflict with what you find in `_design/tokens.md`.

## Implementation Phases

### Phase 1 — Foundation
1. Extract design file → `_design/tokens.md`
2. `pnpm create next-app@latest . --typescript --tailwind --app --src-dir no`
3. Configure Tailwind v4 with design tokens from above
4. Install all dependencies:
```
   pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres
   pnpm add @tanstack/react-query zustand dexie vaul recharts
   pnpm add next-pwa
   pnpm add -D drizzle-kit @types/pg
   npx shadcn@latest init
```
5. Set up Supabase clients (browser + server)
6. Configure middleware for auth redirect
7. Run migration SQL in Supabase dashboard
8. Build app shell: root layout, `(app)/layout.tsx` with bottom nav, 
   phone-frame component for ≥768px
9. Auth screen (magic link sign-in)
10. Verify: sign in, land on /today, profile auto-created

**Checkpoint: pnpm build passes, pnpm lint passes, auth works**

### Phase 2 — Active Workout (Core Feature)
This is the most important screen. Highest quality bar.

1. Workout session creation (from routine or empty)
2. Active workout page `/workout/[sessionId]`
3. Zustand store for in-progress sets
4. Set logger bottom sheet (weight/reps/RPE steppers via Vaul)
5. Coach suggestion: simple double-progression heuristic
   - If last session: all reps hit + avg RPE ≤ 8 → suggest +2.5kg, same reps
   - Else: suggest same weight, same reps
   - Show coach reasoning string
6. Rest timer: Web Notifications API for background, vibration, sound
7. Plate calculator sheet
8. "Last time" display via `get_last_performance()` function
9. Offline: writes → Dexie first, background sync to Supabase
10. Finish workout: compute total volume + PR detection in server action
11. Long-press exercise → Smart Sub sheet (UI only for now, logic phase 3)

**Checkpoint: full workout start→log→finish flow working offline**

### Phase 3 — Today + Plan
1. Today page with Coach Card, Recovery Strip, Volume This Week
2. Recovery calculation: days since last session per muscle group
3. Volume targets: configurable per muscle (hardcoded defaults, user-editable later)
4. Plan page with active program hero + mesocycle bar
5. Program library (seed 8 global program templates)
6. Program detail page
7. User can start a program → creates `user_programs` row

**Checkpoint: Today shows real data, Program can be started**

### Phase 4 — Stats + History
1. History timeline page, grouped by week
2. Session detail read-only view
3. Stats page: volume targets bars, 1RM charts with confidence band
4. 1RM confidence: use standard deviation of last 5 Epley estimates
5. Date range selector (4W / 12W / 1Y / All)
6. Exercise library + exercise detail with charts

**Checkpoint: all data screens show real computed data**

### Phase 5 — Routines + Profile + Settings
1. Routine CRUD with drag-to-reorder (dnd-kit)
2. Profile page: avatar (initials), display name edit, stats
3. Settings: units, bar weight, rest defaults, theme, coach mode
4. Equipment profile (onboarding step + settings edit)
5. Smart Substitution logic: filter exercise alternatives by equipment profile
6. Export to CSV (all sessions, all sets)

**Checkpoint: full app usable end-to-end for real training**

### Phase 6 — Onboarding + PWA
1. Onboarding flow (4 steps: experience, goal, equipment, pick program)
2. Redirect to onboarding after first sign-in if not completed
3. next-pwa: service worker, manifest, icons
4. Offline shell caching
5. iOS install instructions (in Settings)
6. Lighthouse audit: target ≥ 90 PWA, ≥ 85 Performance

**Checkpoint: installable on iOS + Android home screen, offline capable**

## Working Rules

- Read `_design/tokens.md` before writing any component
- `pnpm lint` and `pnpm typecheck` must pass at the end of each phase
- No `any` types without explanation comment
- Server Components by default. Mark `'use client'` with reason in comment.
- Mobile-first: 390px is primary viewport. Desktop shows phone-frame.
- Never use `localStorage` or `sessionStorage` — use Dexie for offline, 
  Supabase for persistence
- All Supabase writes go through server actions or API routes, never 
  directly from client to avoid RLS bypasses
- Commit after each phase: `git commit -m "feat: phase X — description"`
- If a dependency version conflicts, use `pnpm why` to debug — don't 
  downgrade silently
- Report the checkpoint status before moving to next phase

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side only, never exposed
```

Florian provides these. Do not hardcode. Create `.env.local.example` 
with empty values as documentation.