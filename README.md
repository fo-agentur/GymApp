# GymApp

**Deine Pläne. Dein Training. Sauber getrackt.**

A private workout-tracking PWA for Florian + ~10 friends. You build your own
routines, log workouts with a fast set-by-set flow (RIR, rest timer, plate
calculator), and review history + statistics including a body-map muscle
heatmap. Next.js 15 + Supabase. Multi-user with **username + password**; every
user's data is isolated via Postgres Row Level Security. No paywall, no ads.

No nutrition tracking, no generated programs — by design. The app does one
thing well: tracking your own training.

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

`.env.local` already holds the Supabase URL + publishable key (gitignored);
working fallbacks are baked into `lib/supabase/config.ts`.

## How auth works

Friends sign up with a **username + password** — no email needed. Each username
maps to a synthetic `username@gymapp.local` address; a database trigger
auto-confirms accounts, so login is instant.

## What it does

- **Own routines** — build training plans yourself: exercises, sets, rep range,
  RIR target, rest. Swap an exercise in place without losing its targets.
- **Logging** — prescription pre-filled from your routine + a
  double-progression suggestion from last time; custom keypad, RIR dots,
  warmup/failure/partial sets, rest timer with vibration + beep, plate
  calculator, swap/add/remove exercises mid-session.
- **History & stats** — sessions grouped by week, session detail, sets/volume
  charts (1W…all time), top exercises, and a front/back body heatmap of the
  muscle groups you trained in the last 7 days.
- **Equipment profiles** — tell the app what you train with (e.g. *Atletica
  Multipresse* = smith machine + cable + bench, dumbbells, …) and the
  873-exercise library filters itself to what you can actually do. Custom
  exercises supported.

## Architecture in one line

One client shell (`app/page.tsx` → `components/AppShell.tsx`) with a screen
router + navigation stack; inline-style components from `lib/design.tsx`; all
data via `lib/data.ts` → Supabase. No per-screen routes, no Tailwind. See
`AGENTS.md` for the full spec.

## Deploy

Push to `main` → Vercel auto-deploys. Env vars in Vercel:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
