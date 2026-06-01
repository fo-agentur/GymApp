-- Nutrition tracking: foods (shared cache) + food_logs (per-user) + profile macro targets + meal photo storage.
create extension if not exists pg_trgm;

-- ── foods: cached OFF/USDA products, AI-derived, and user custom foods. Macros stored per 100g. ──
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'off' check (source in ('off','usda','ai','custom')),
  barcode text,
  name text not null,
  brand text,
  serving_g numeric(8,2),
  kcal numeric(7,2) not null default 0,
  protein_g numeric(7,2) not null default 0,
  carbs_g numeric(7,2) not null default 0,
  fat_g numeric(7,2) not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index if not exists foods_name_trgm_idx on public.foods using gin (name gin_trgm_ops);

-- ── food_logs: one row per logged item; macros denormalized for the logged quantity. ──
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  logged_on date not null default ((now() at time zone 'utc')::date),
  meal text not null default 'other' check (meal in ('breakfast','lunch','dinner','snack','other')),
  food_id uuid references public.foods on delete set null,
  name text not null,
  qty_g numeric(8,2),
  kcal numeric(7,2) not null default 0,
  protein_g numeric(7,2) not null default 0,
  carbs_g numeric(7,2) not null default 0,
  fat_g numeric(7,2) not null default 0,
  source text not null default 'search' check (source in ('search','barcode','photo','manual','custom')),
  photo_path text,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_day_idx on public.food_logs (user_id, logged_on);

-- ── profile macro targets ──
alter table public.profiles
  add column if not exists target_kcal int,
  add column if not exists target_protein_g int,
  add column if not exists target_carbs_g int,
  add column if not exists target_fat_g int;

-- ── RLS ──
alter table public.foods enable row level security;
alter table public.food_logs enable row level security;

drop policy if exists "read foods" on public.foods;
create policy "read foods" on public.foods for select using (true);
drop policy if exists "insert foods" on public.foods;
create policy "insert foods" on public.foods for insert with check (auth.uid() is not null);
drop policy if exists "update own foods" on public.foods;
create policy "update own foods" on public.foods for update using (created_by = auth.uid());
drop policy if exists "delete own foods" on public.foods;
create policy "delete own foods" on public.foods for delete using (created_by = auth.uid());

drop policy if exists "own food_logs" on public.food_logs;
create policy "own food_logs" on public.food_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── private storage bucket for meal photos, RLS by {user_id}/ path prefix ──
insert into storage.buckets (id, name, public) values ('meal-photos','meal-photos', false)
  on conflict (id) do nothing;

drop policy if exists "own meal photos read" on storage.objects;
create policy "own meal photos read" on storage.objects for select
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own meal photos insert" on storage.objects;
create policy "own meal photos insert" on storage.objects for insert
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own meal photos delete" on storage.objects;
create policy "own meal photos delete" on storage.objects for delete
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
