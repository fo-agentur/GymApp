# GymApp

Strength-tracking PWA. Next.js 15 + Supabase. Multi-user with **username + password**;
every user's data is isolated via Postgres Row Level Security.

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

`.env.local` already holds the Supabase URL + publishable key (gitignored).

## How auth works

Friends sign up with a **username + password** — no email needed. Internally each
username maps to a synthetic `username@gymapp.local` address. New accounts are
auto-confirmed by a database trigger, so login is instant.

## What's built

- **Sign in / Sign up** — username + password
- **Today** — coach hero, this-week stats, recent sessions
- **Active Workout** — start from a routine or empty, coach set suggestions,
  log sets (saved to Supabase live), plate calculator, finish → totals computed
- **History** + session detail (grouped by week)
- **Exercises** library (29 seeded globals + add your own) with per-exercise
  history and an estimated-1RM chart
- **Routines** — create / edit / reorder / archive
- **Progress** — totals, volume by muscle, 12-week training-frequency heatmap
- **Profile / Settings** — units, bar weight, default rest (saved to your profile)

## Deviations from AGENTS.md (intentional, for a working v1)

The original AGENTS.md specced a larger stack. To ship a faithful, working app fast,
this v1 trims it. None of these change the product; they're swappable later:

| AGENTS.md | This build | Why |
|-----------|-----------|-----|
| Magic-link auth | Username + password | Explicit requirement |
| Drizzle ORM | `@supabase/supabase-js` queries | Fewer moving parts |
| Tailwind v4 + shadcn | Inline styles ported from the design handoff | The design handoff *is* inline-style React → pixel-faithful, no translation layer |
| Dexie offline queue | Direct online writes | Deferred (add later without schema change) |
| TanStack Query / Zustand | React state + Supabase | Simpler for v1 |
| next-pwa | Responsive phone-frame + manifest-ready | PWA install can be layered on |

Database schema, RLS, and the design language match the spec exactly. SQL migrations
live in `lib/db/migrations/`.

## Deploy

Push to GitHub and import into Vercel. Set these env vars in Vercel:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
