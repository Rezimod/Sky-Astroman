# CLAUDE.md — Sky Astroman

## What this is
Gamified stargazing platform on Solana. Users log observations, complete night missions, earn XP and on-chain rewards. Think "Strava for astronomy." Built for Georgian market first, global second.

Live: https://sky-astroman.vercel.app
Store: https://astroman.ge

## Tech stack
- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS 4 with custom design tokens (see below)
- Supabase: auth, Postgres database, Storage for photos
- astronomy-engine: client-side planet/moon calculations
- Open-Meteo API: weather/cloud/visibility data (free, no key)
- Vercel: deployment (push to main = auto-deploy)

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build (run before every PR)
- `npm run lint` — ESLint check

## Project structure
```
src/
  app/
    api/sky/conditions/   — Open-Meteo weather fetch
    api/sky/moon/         — Moon phase via astronomy-engine
    api/observations/     — CRUD for photo uploads
    api/missions/         — Mission list + daily challenge
    api/leaderboard/      — Ranked users
    dashboard/            — Main authenticated page
    missions/             — Night mission list
    gallery/              — Community observation photos
    leaderboard/          — Rankings (all/month/week)
    sky-tools/conditions/ — Full sky intelligence dashboard
    profile/              — User profile + [username] public pages
    admin/observations/   — Admin review panel
    login/, register/     — Auth pages
  components/
    cards/                — Dashboard card components
    sky/                  — Weather/moon/planet widgets
    observations/         — Upload form, gallery cards
    layout/               — Navigation, DashboardGrid
    ui/                   — Badge, ProgressBar, Skeleton, ErrorState
  lib/
    astronomy.ts          — astronomy-engine helpers
    gamification.ts       — XP levels, badges, streak calc
    daily-challenge.ts    — Auto-generate tonight's challenge
    supabase.ts           — Supabase client
    night-mode.tsx        — Day/dark/night mode provider
```

## Database (Supabase)
Tables: profiles, observations, missions, mission_progress, teams, user_badges
- observations.status: 'pending' | 'approved' | 'rejected'
- profiles.is_admin: boolean (for /admin access)
- Default location: Tbilisi (41.7151, 44.8271), timezone Asia/Tbilisi

## Design system
Brand colors — NEVER use pure black, always space-navy:
- Backgrounds: #050810 (void), #0A0F1E (space), #111936 (cosmos), #1A2347 (nebula), #243059 (twilight)
- Accent: #6366F1 (indigo-500) for buttons/links
- Rewards: #F59E0B (gold-500) for XP/points numbers
- Solana: #14F195 (aurora green), #9945FF (sol purple)
- Text: #F1F5F9 (primary), #CBD5E1 (secondary), #94A3B8 (muted)
- Fonts: Space Grotesk (headings), JetBrains Mono (data/numbers), Noto Sans Georgian
- XP numbers always use JetBrains Mono, font-weight 700

## Code rules
- All user-facing text in Georgian. Component props/variables in English.
- Every page must handle 4 states: loading (skeleton), error (retry button), empty (CTA), data
- No eternal "loading..." text — always use animated skeletons
- Use next/image for all photos. Always include sizes prop.
- API routes return JSON with { data, error } shape
- Supabase queries: always handle .error case
- Mobile-first: test at 375px width. Touch targets minimum 44px.
- Bottom nav on mobile: 5 tabs max (მთავარი, მისიები, upload, ცა, პროფილი)

## Do NOT
- Use "Stellar" as brand name (conflicts with Stellar XLM blockchain)
- Use pure black (#000000) anywhere — use #050810 minimum
- Use Inter, Roboto, or system fonts — always Space Grotesk
- Delete existing pages/components without explicit instruction
- Use paid APIs — Open-Meteo and astronomy-engine are both free
- Add crypto jargon ("LFG", "wagmi", "wen") — keep it clean and professional
- Use localStorage for auth — always Supabase auth

## Current state
- Phase: 0 (fixing broken features)
- Sky conditions page: needs Open-Meteo API connection
- Missions: need seeding in Supabase
- Leaderboard: needs real data (currently hardcoded)
- Upload flow: not built yet
- Admin panel: not built yet

@package.json
@src/app/api/sky/conditions/route.ts
