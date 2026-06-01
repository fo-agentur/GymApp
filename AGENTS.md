# AGENTS.md — GymApp

## North Star (the goal — read this first)

**GymApp = MacroFactor Nutrition + MacroFactor Workouts, fused into ONE app.**

MacroFactor ships two separate apps (Nutrition, and Workouts launched Jan 2026).
The goal of GymApp is to have **both of those apps in a single PWA**, and to match
MacroFactor **in design, in feel, and — above all — in functionality, as closely as
possible (1:1)**. Same screens, same interactions, same charts, and the same two
"magic" algorithms (see *Adaptive Engines* below).

Audience: Florian + ~10 friends. No paywall, no ads, no social feed. Multi-user,
each user's data isolated via Postgres Row Level Security.

Repo: https://github.com/fo-agentur/GymApp

> This is a faithful, functionality-equivalent re-creation inspired by MacroFactor's
> UX and its **publicly documented** algorithms — not a pixel/IP copy of their app.

## Reference: what we are matching

Two MacroFactor apps, both with light + dark themes:

- **Nutrition** — fast food logging (search, barcode, label scan, **AI photo→macros**,
  recipe-by-URL, favorites, speech), a **1.36M-entry verified food database**, full
  micronutrients, weight tracking with a smoothed **True-Weight** trend, period &
  habit tracking, body metrics & progress photos, a **customizable dashboard**, and
  the **adaptive nutrition coach** (Coached / Collaborative / Manual) that re-estimates
  expenditure and adjusts calorie + macro targets every week.
- **Workouts** — structured program tracker & coach: rest timers, drop sets, partial
  reps, myoreps, failure sets, **RIR**, left/right tracking, supersets, smart warm-ups,
  exercise notes, **smart auto-progression** that learns your rate of progress, program
  builder + periodization, custom exercises, multiple gym profiles, plate calculator,
  900+ exercises with demo videos, volume/sets charts, PR tracking.

**Signature UI to replicate:** the weekly **macro bar-grid** (7 days × 4 macros,
selected day boxed, Consumed/Remaining toggle), dual **insight cards** (Expenditure
line + Weight-Trend line), the **expenditure** area chart, the **weight-trend**
scatter+smoothed line, **goal-progress** waterfall, and per-set rows with rep targets +
RIR pills + failure markers. Bottom nav = 5 slots with a central round **+** FAB.

## Tech stack (as actually built — this is reality, not aspiration)

- **Next.js 15** App Router, **TypeScript strict**, **React 19**
- **Inline-style React components** (NOT Tailwind/shadcn). The whole design system lives
  in `lib/design.tsx` and is the contract.
- **Supabase**: `@supabase/ssr` (browser/server clients + middleware auth guard) and
  `@supabase/supabase-js` for all queries (NOT Drizzle). Postgres + Auth + Storage + Edge
  Functions (Deno).
- **State**: plain React state + Supabase. No TanStack/Zustand/Dexie (yet).
- **Charts**: lightweight inline SVG (no chart lib).
- **Food data**: Open Food Facts **live** API + organic caching into Postgres; barcode via
  `@zxing/browser`.
- **AI**: Supabase Edge Function `analyze-meal` → OpenRouter vision model.
- **PWA**: `app/manifest.ts` + apple-web-app meta. **pnpm**. Hosted on **Vercel**.

## Architecture — client-side screen router (important)

There is **no per-screen Next.js route**. The whole app is one client shell:

- `app/page.tsx` → renders `components/AppShell.tsx`.
- `components/AppShell.tsx` is the router: it holds the active `ScreenId` and swaps the
  body via a `goto(screen)` call. Bottom `TabBar` maps tabs → screens.
- `components/app-context.ts` defines `ScreenId` + the navigation context.
- Each screen is a component in `components/screens/*.tsx`.
- Active Workout renders **outside** the screen-fade wrapper (full-screen overlay).

When adding a screen: add the `ScreenId`, add a `case` in `AppShell`, wire any tab in
`TabBar` (in `lib/design.tsx`).

## Repository structure (real)

```
app/                  page.tsx (→ AppShell), layout.tsx, manifest.ts, sign-in/page.tsx
components/
  AppShell.tsx        screen router + active-workout overlay
  app-context.ts      ScreenId + nav context
  MuscleMap.tsx       anatomical SVG muscle heatmap
  screens/            Today, Workout, Food, FoodAddSheet, Library, ExercisePicker,
                      ExerciseDetail, Progress, History, SessionDetail, Routines,
                      RoutineEditor, Profile, Settings
lib/
  design.tsx          DESIGN SYSTEM — tokens, icons, all UI atoms, TabBar, Phone chrome
  data.ts             all Supabase queries + Open Food Facts + analyze-meal calls
  supabase/           client.ts, server.ts, middleware.ts, config.ts, types.ts
  db/migrations/      0001_init … 0005_fix_last_performance (mirror of applied SQL)
  muscles.ts, exercise-db.ts, exercise-guide.ts, anim.ts, username.ts
supabase/functions/analyze-meal/index.ts   Deno edge fn (OpenRouter vision)
```

## Design system (MacroFactor-faithful)

`lib/design.tsx` is the single source of truth. Direction for the redesign:

- **Themes:** dark + light (MacroFactor supports both). **Dark is primary** (matches their
  Nutrition hero and our existing base); light is a token-swap fast-follow. Implement via
  CSS custom properties so components don't change when the theme flips.
- **Primary / neutral:** white pill buttons + white active states in dark mode (black on
  white in light mode). The old single lime accent is retired.
- **Macro color semantics (data viz):** energy/kcal **blue** `#4d8dff`, protein
  **coral** `#ff7043`, fat **amber** `#ffc24b`, carbs **green** `#3ddc84`.
- **Font:** Geist / Geist Mono (kept — it matches MacroFactor's geometric sans). Tabular
  numbers for all stats.
- **Shape:** rounded cards (~18px), full-radius pills, generous spacing.

## Adaptive Engines (the core functionality — match these)

1. **Nutrition coach**
   - *True-Weight*: smoothed weight trend (EWMA) that filters daily scale noise.
   - *Adaptive expenditure (TDEE)*: rolling energy-balance estimate —
     `expenditure ≈ mean(intake) − (Δ trend-weight × kcal/kg) / days`, with smoothing to
     avoid over-correction. Improves as more data lands.
   - *Weekly check-in*: given goal + target rate, adjust daily calorie + macro targets.
     Modes: **Coached** (auto), **Collaborative** (suggest, user tweaks), **Manual** (fixed).
2. **Workout auto-progression**
   - Per-exercise e1RM trend + **double-progression**: at target RIR and top of the rep
     range → add weight; otherwise add reps. Program targets evolve from logged sets.

Start client-side (computed on app open, results persisted); a scheduled Edge Function is
an optional later upgrade.

## Database (Supabase)

- Project ref `aiptokxagqthzhpmtjyk` (free tier — pauses when idle; `restore_project` and
  wait for `ACTIVE_HEALTHY` before SQL). Managed via the **Supabase MCP connector**, not
  the CLI.
- Migrations live in `lib/db/migrations/` and must mirror what's applied. All tables have
  **RLS enabled**; run `get_advisors(security)` after DDL and fix warnings.
- Auth = **username + password** (synthetic `<username>@gymapp.local`; a trigger
  auto-confirms accounts so login is instant — no email).

## Security & data rules (hard constraints — do not break)

- **Never** paste/accept the Supabase `sbp_…` personal access token in chat. Use the MCP
  connector.
- **Never** put the OpenRouter API key in chat or in code. It is a Supabase Edge Function
  secret `OPENROUTER_API_KEY` (set in the Dashboard). The app must degrade gracefully when
  it's absent (barcode/search/manual still work).
- **Never** commit `SUPABASE_SERVICE_ROLE_KEY`. Only the public URL + anon/publishable key
  ship to the client (RLS protects data).
- **Real users exist** — never delete accounts or user data.

## Build / verify / deploy

- `pnpm dev` (http://localhost:3000) · `pnpm build` + `pnpm typecheck` must be green at the
  end of every phase.
- `supabase/functions` is excluded from tsc (Deno globals).
- Verify visually at the 390 px mobile size (Playwright) — especially any bottom sheet
  inside a tab screen (see *gotchas*).
- Vercel auto-deploys on push to `main`. Production:
  `gym-app-fo-agenturs-projects.vercel.app` (old `gym-app-psi-liart.vercel.app` still
  aliased). Live stays untouched until a deploy is explicitly approved.

## Working rules

- Inline styles only; match `lib/design.tsx`. No Tailwind, no new heavy deps without reason.
- Surgical changes; keep TypeScript strict (no unexplained `any`).
- **OneDrive worktree caution:** do NOT fire many parallel Bash/PowerShell/browser calls —
  they collide (`Device busy`). Work sequentially. `git` via PowerShell prints stderr in red
  even on success — check the actual ref line.
- **CSS gotcha (learned the hard way):** the `.gym-fade` screen wrapper must stay
  **opacity-only**. Any `transform` on it (even an identity matrix under
  `animation-fill-mode: both`) creates a containing block that mis-anchors
  `position:absolute` bottom sheets. Closed `Sheet`s also set `visibility:hidden`.
- Commit per phase: `feat: phase X — …`. Branch off; the current live snapshot is on
  `backup/launch-v1`.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # publishable/anon — safe in client (RLS protects data)
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never committed
```
`.env.local` is gitignored. The OpenRouter key is a Supabase Edge Function secret, not an
app env var.
