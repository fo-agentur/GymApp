# GymApp

**MacroFactor Nutrition + MacroFactor Workouts — in one app.**

A private PWA for Florian + ~10 friends that fuses both MacroFactor apps into a single
experience and matches them in design, feel, and functionality as closely as possible.
Next.js 15 + Supabase. Multi-user with **username + password**; every user's data is
isolated via Postgres Row Level Security. No paywall, no ads.

> Functionality-equivalent re-creation inspired by MacroFactor's UX and its publicly
> documented algorithms — not a pixel/IP copy.

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

## Built today

**Training**
- Active workout — start from a routine or empty, coach set suggestions, log sets live,
  rest timer, plate calculator, finish → totals + PR detection
- 873-exercise library with how-to guides, images, anatomical muscle map
- History + session detail, routines (create / edit / reorder / archive), progress charts

**Nutrition**
- Food log — search (Open Food Facts), barcode scan, **AI photo → macros**, manual entry
- Macro targets + day/meal logging

**Account** — profile, settings (units, bar weight, rest defaults)

## Building toward (MacroFactor parity)

Unified MacroFactor-style dashboard · weekly macro bar-grid · **adaptive nutrition coach**
(True-Weight trend + dynamic expenditure/TDEE + weekly target adjustment; Coached /
Collaborative / Manual) · weight + body-metrics tracking with trend charts · full
micronutrients · habits · **workout auto-progression** + program builder with RIR / drop /
failure / myorep sets · volume analytics · light + dark themes.

See `AGENTS.md` for the full spec, architecture, and the two adaptive engines.

## Architecture in one line

One client shell (`app/page.tsx` → `components/AppShell.tsx`) with a screen router; inline
-style components from `lib/design.tsx`; all data via `lib/data.ts` → Supabase. No
per-screen routes, no Tailwind.

## Deploy

Push to `main` → Vercel auto-deploys. Env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. The AI photo feature additionally needs the Supabase Edge
Function secret `OPENROUTER_API_KEY` (set in the Supabase Dashboard, never in code).
