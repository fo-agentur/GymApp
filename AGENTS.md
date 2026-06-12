# AGENTS.md — GymApp

## North Star (read this first)

**GymApp = a lean, personal workout tracker.** Users create their OWN routines
(no generated programs), track workouts cleanly (sets, RIR, rest timer, plate
calculator), and review history + statistics (including a body-map muscle
heatmap, MacroFactor-Workouts-style).

Explicitly **out of scope** (removed in v2.0): nutrition/food tracking, body
weight logging, auto-generated training programs, onboarding questionnaires.
The owner uses a separate app for nutrition. Do not re-add these.

Audience: Florian + ~10 friends. No paywall, no ads, no social feed. Multi-user,
each user's data isolated via Postgres Row Level Security.

Repo: https://github.com/fo-agentur/GymApp · UI language: **German**.

## Feature set (v2.0)

- **Auth**: username + password (synthetic `<username>@gymapp.local`, trigger
  auto-confirms; no e-mail). Sign-in page at `/sign-in`.
- **Home (Dashboard)**: week strip + sets/volume/time, muscle-map snapshot,
  quick-start for routines, recent sessions.
- **Training tab (Routines)**: create/edit/start own routines. Editor supports
  add, swap-in-place (targets kept), reorder, per-exercise targets
  (sets, rep range, RIR, rest).
- **Live workout** (full-screen overlay): pre-filled prescription from the
  routine + double-progression suggestion from last performance, custom keypad,
  RIR dots, warmup/failure/partial set types, rest timer (±15s/skip, vibration
  + beep), plate calculator, swap/add/remove exercise mid-session, un-check a
  logged set (deletes the row), info sheet (never navigates away — that would
  kill the session), workout-complete screen with muscle map + PRs.
- **History**: sessions grouped by week → session detail (delete possible).
- **Statistik**: "Muskeln" = body heatmap (front/back SVG, working sets last
  7 days, per-muscle breakdown) · "Verlauf" = sets/volume bars over
  1W…Alle + top exercises.
- **Exercise library**: 883 exercises, search (German-synonym aware: "Rudern"
  → row, "Latzug" → pulldown; see `lib/targets.ts`) + muscle/equipment chips,
  fine-grained target filter per group (Latissimus, oberer Rücken, Trapez,
  hintere Schulter, … — client-side layer over the 11 coarse DB groups, which
  the heatmap keeps using), relevance-ranked (core lifts first), collapsed
  groups, custom exercises.
- **Equipment profiles** (`lib/equipment.ts`, stored in `profiles.equipment`
  as `{ items: EquipmentId[] }`): `multipress` (Atletica Multipresse = smith
  machine + cable + bench), `dumbbell`, `barbell`, `machines`, `full_gym`.
  Drives the default "★ Mein Equipment" filter in library/picker. Selected in
  Settings.

## Tech stack (reality)

- **Next.js 15** App Router, **TypeScript strict**, **React 19**
- **Inline-style React components** (NOT Tailwind/shadcn). Design system =
  `lib/design.tsx`; theme tokens = CSS vars in `app/globals.css`
  (light default, dark under `[data-theme="dark"]`).
- **Supabase**: `@supabase/ssr` (browser/server clients + middleware auth
  guard) and `@supabase/supabase-js` for queries. Postgres + Auth.
- **State**: plain React state. **Charts**: inline SVG. **PWA**:
  `app/manifest.ts`. **pnpm**. Hosted on **Vercel**.

## Architecture — client-side screen router

No per-screen Next.js routes. `app/page.tsx` → `components/AppShell.tsx`,
which holds a **navigation stack** (`goto` pushes, `goBack` pops, tab taps
reset). The bottom `TabBar` (4 tabs + center "+" quick-start sheet) stays
visible on every screen; the active workout renders as a full-screen overlay
outside the router. Screens live in `components/screens/*.tsx`; ScreenIds in
`components/app-context.ts`.

When adding a screen: add the `ScreenId`, a `case` in `AppShell`, and a
`SCREEN_TO_TAB` entry (so the tab bar highlights correctly).

## Database (Supabase)

- Project ref `aiptokxagqthzhpmtjyk` (free tier — pauses when idle;
  `restore_project` and wait for `ACTIVE_HEALTHY` before SQL). Managed via the
  **Supabase MCP connector**, not the CLI.
- Active tables: `profiles`, `exercises` (883 global rows with
  `user_id IS NULL` + per-user custom), `routines`, `routine_exercises`,
  `workout_sessions`, `sets`. All RLS-scoped to `auth.uid()`.
- Legacy tables from v1 (foods, food_logs, weight_logs, programs, …) still
  exist with data but are no longer referenced by the app. Don't drop them
  without explicit approval — real users exist.
- Migrations live in `lib/db/migrations/` and must mirror what's applied.

## Security & data rules (hard constraints)

- **Never** paste/accept the Supabase `sbp_…` personal access token in chat.
- **Never** commit `SUPABASE_SERVICE_ROLE_KEY`. Only the public URL +
  anon/publishable key ship to the client (RLS protects data).
- **Real users exist** — never delete accounts or user data.

## Build / verify / deploy

- `pnpm dev` (http://localhost:3000) · `pnpm typecheck` + `pnpm build` must be
  green before any push.
- Verify visually at the 390 px mobile size (Playwright) — especially bottom
  sheets (see gotchas).
- Vercel auto-deploys on push to `main`. Production:
  `gym-app-fo-agenturs-projects.vercel.app`.

## Gotchas (learned the hard way)

- **`.gym-fade` must stay opacity-only.** Any `transform` on the screen
  wrapper creates a containing block that mis-anchors `position:absolute`
  bottom sheets.
- **Sheets must NOT live inside a scrolling container** — they anchor to the
  scroll content and jump around. Pattern: screen root = non-scrolling flex
  column, inner `overflowY:auto` list, `Sheet`s as siblings of the scroll div.
- **The tab bar needs `position:relative; zIndex`** — the center "+" protrudes
  above it and positioned screen content paints over it otherwise.
- `supabase/functions` is excluded from tsc (Deno globals) — currently empty.

## Working rules

- Inline styles only; match `lib/design.tsx`. No new heavy deps without reason.
- UI copy in German; code/comments in English.
- Surgical changes; keep TypeScript strict (no unexplained `any`).

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # publishable/anon — safe in client (RLS protects data)
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never committed
```
`.env.local` is gitignored. Fallbacks for URL + anon key are baked into
`lib/supabase/config.ts` so the deployed app works out of the box.
