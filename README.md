# MacroFactor Workouts

**Science-based training that adapts. Your coach in your pocket.**

A private PWA for Florian + ~10 friends — a faithful, training-first re-creation of the
**MacroFactor Workouts** app: a structured program tracker & rule-based coach. Next.js 15 +
Supabase. Multi-user with **username + password**; every user's data is isolated via Postgres
Row Level Security. No paywall, no ads.

> Functionality-equivalent re-creation inspired by MacroFactor Workouts' UX and its publicly
> documented training principles — **own assets** (logo, fonts, illustrations), not an IP copy.

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

`.env.local` already holds the Supabase URL + publishable key (gitignored).

## How auth works

Friends sign up with a **username + password** — no email needed. Each username maps to a
synthetic `username@gymapp.local` address; a database trigger auto-confirms accounts, so
login is instant.

## What it is

A training-first coach that **programs, logs, progresses, and analyzes**:

- **Programming** — onboarding questionnaire → personalized rule-based program; custom
  program builder + periodization; templates.
- **Logging** — rest timers, **RIR**, drop sets, failure, partial reps, myoreps, unilateral
  L/R, supersets, smart warm-ups, custom exercises, exercise notes, plate calculator.
- **Smart auto-progression** — per-exercise e1RM trend + double progression; targets evolve
  from your logged sets, "like a coach would manage a program."
- **Analytics** — volume by muscle group, strength (e1RM) trends, PR tracker, anatomical
  muscle heatmap, workout history, a customizable dashboard.
- **Body & sync** — scale weight + smoothed **True-Weight** trend, body metrics, progress
  photos — the shared bridge to the nutrition side.

900+ exercise library with how-to guides and an anatomical muscle map. Privacy-first:
data is yours, with export.

## Design

A dark-first **"space" identity** inspired by MacroFactor's Pentagram new look — deep-space
near-black, a periwinkle signature accent, **Space Grotesk** display headlines, training
set-type colour semantics, and an original space-themed illustration kit (`lib/illustrations.tsx`).
Light + dark via CSS custom properties (token swap, no component edits).

## Architecture in one line

One client shell (`app/page.tsx` → `components/AppShell.tsx`) with a screen router; inline
-style components from `lib/design.tsx`; all data via `lib/data.ts` → Supabase. No
per-screen routes, no Tailwind. See `AGENTS.md` for the full spec and `WORKOUTS_PLAN.md` for
the rebuild roadmap.

## Deploy

Push to `main` → Vercel auto-deploys. Env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
