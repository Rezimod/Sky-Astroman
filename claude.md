# CLAUDE.md — Stellarr Sky Platform (Unified Build Spec)

## WHAT THIS IS

Merge two existing Astroman projects into one platform:
- **Stellarr Club** (stellarrclub.vercel.app) → provides UI system, gamification, leaderboard
- **Sky Tools** (sky.astroman.ge) → provides astronomy data, sky conditions, telescope recommendations

Result: A free social platform for stargazers. Think **Strava for astronomy**.

## CRITICAL RULES

1. **Keep the Stellarr UI as the design system.** Do not redesign. Use the same colors, card-based layout, component patterns.
2. **NO crypto. NO Solana. NO wallets. NO payments.** Strip all blockchain/payment code. This is a free community platform.
3. **Reward model: Upload → Admin Confirm → Points awarded.** Users submit observation photos, admins verify, then points/badges unlock.
4. **All new features are additional cards or pages within the existing Stellarr visual system.**
5. **Georgian context matters.** Default location: Tbilisi, Georgia. Support Georgian language strings where applicable.

## TECH STACK

- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS (match Stellarr theme tokens)
- TypeScript
- Supabase (auth, database, storage for photos)
- Open-Meteo API (weather/sky conditions)
- Claude API (AI astronomy assistant)
- Vercel (deployment)

## DATABASE SCHEMA (Supabase)

```sql
-- Users (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  level int default 1,
  points int default 0,
  observations_count int default 0,
  missions_completed int default 0,
  team_id uuid references teams(id),
  location_lat float,
  location_lng float,
  created_at timestamptz default now()
);

-- Observations (core content — user uploads)
create table observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  object_name text not null,
  description text,
  photo_url text,
  telescope_used text,
  location_lat float,
  location_lng float,
  observed_at timestamptz not null,
  status text default 'pending', -- pending | approved | rejected
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  points_awarded int default 0,
  created_at timestamptz default now()
);

-- Missions
create table missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  object_name text,
  reward_points int default 100,
  difficulty text default 'easy', -- easy | medium | hard
  is_daily boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

-- Mission Progress
create table mission_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  mission_id uuid references missions(id) not null,
  status text default 'active', -- active | completed
  completed_at timestamptz,
  unique(user_id, mission_id)
);

-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  avatar_url text,
  total_points int default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

## NAVIGATION STRUCTURE

```
/ (Dashboard — main page)
/missions
/leaderboard
/teams
/teams/[id]
/sky-tools
/sky-tools/conditions
/sky-tools/telescope-finder
/sky-tools/observation-tips
/profile
/profile/[username]
/admin/observations (review pending uploads)
```

---

# BUILD PHASES

## PHASE 1 — MVP (Build This First)

### 1.1 Dashboard Page (/)

A card grid using existing Stellarr card components. Cards:

**UserStatsCard**
- Level, Points, Rank, Missions Completed, Observations Logged
- Progress bar to next level
- Data from: `profiles` table

**TonightsSkyCard**
- Cloud cover %, visibility, moon phase, seeing conditions, best viewing time
- Data from: Open-Meteo API (https://api.open-meteo.com/v1/forecast)
- Use user's location or default to Tbilisi (41.7151, 44.8271)
- Refresh every 30 min

**ActiveMissionsCard**
- List 3 active missions with reward points + progress indicator
- Data from: `missions` + `mission_progress` tables

**TonightsChallengeCard**
- One daily challenge, auto-generated based on visible objects + user location
- Resets every 24h (UTC midnight)
- Extra points reward
- Example: "Photograph the Moon tonight — 200 pts"

**RecommendedObjectCard**
- Single suggested celestial object for tonight
- Show: object name, best viewing time, difficulty
- "View Guide" button → expand with: how to find it, equipment needed

**LeaderboardSnapshotCard**
- Top 5 users by points
- "View Full Leaderboard" link → /leaderboard

### 1.2 Sky Conditions Page (/sky-tools/conditions)

Full-page sky conditions dashboard. Cards:

- **HourlyForecastCard** — cloud cover + visibility hour by hour for tonight
- **MoonPhaseCard** — current phase, illumination %, rise/set times
- **SeeingConditionsCard** — atmospheric turbulence estimate
- **BestViewingWindowCard** — calculated optimal observation window
- **SunriseSunsetCard** — astronomical twilight times

API: Open-Meteo with parameters:
```
latitude=41.7151&longitude=44.8271
&hourly=cloud_cover,visibility,temperature_2m
&daily=sunrise,sunset
&timezone=Asia/Tbilisi
```

### 1.3 Observation Upload + Admin Review

**Upload Flow** (user-facing):
- Form: object name, description, photo upload, telescope used, date/time, location (auto-detect or manual)
- Photo stored in Supabase Storage bucket
- Status: "pending" — user sees "Awaiting Review" badge

**Admin Panel** (/admin/observations):
- List of pending observations with photos
- Admin can: Approve (set points) / Reject (with reason)
- On approval: points added to user profile, mission progress updated

### 1.4 Leaderboard Page (/leaderboard)

- Full ranked list: username, points, level, observations count
- Tabs: All Time | This Month | This Week
- Highlight current user's position

---

## PHASE 2 — Social + Teams (Build After Phase 1 Works)

- Team creation/joining
- Team leaderboard
- Team missions (collaborative goals)
- User profile pages with observation gallery
- Follow users
- Global observation map (markers on world map showing observations)

## PHASE 3 — AI + Advanced (Build After Phase 2)

- AI Astronomy Assistant (floating chat, Claude API)
- Telescope Finder tool (budget + interest → recommendation)
- Observation tips/guides library
- Push notifications for optimal sky conditions
- Georgian language toggle

---

# COMPONENT NAMING

Follow this pattern. All components go in `/components/`:

```
components/
  cards/
    UserStatsCard.tsx
    TonightsSkyCard.tsx
    ActiveMissionsCard.tsx
    TonightsChallengeCard.tsx
    RecommendedObjectCard.tsx
    LeaderboardSnapshotCard.tsx
  sky/
    HourlyForecastCard.tsx
    MoonPhaseCard.tsx
    SeeingConditionsCard.tsx
    BestViewingWindowCard.tsx
  observations/
    ObservationUploadForm.tsx
    ObservationCard.tsx
    AdminReviewPanel.tsx
  layout/
    Navigation.tsx
    DashboardGrid.tsx
    CardWrapper.tsx
  ui/
    ProgressBar.tsx
    Badge.tsx
    LevelIndicator.tsx
```

---

# API ROUTES

```
app/api/
  sky/
    conditions/route.ts     — fetch Open-Meteo data, transform for frontend
    moon/route.ts           — moon phase calculations
  observations/
    route.ts                — GET list, POST new observation
    [id]/route.ts           — GET single, PATCH approve/reject
    upload/route.ts         — handle photo upload to Supabase Storage
  missions/
    route.ts                — GET active missions
    daily/route.ts          — GET/generate daily challenge
    progress/route.ts       — POST mission completion
  leaderboard/
    route.ts                — GET ranked users with filters
  users/
    profile/route.ts        — GET/PATCH user profile
```

---

# DESIGN TOKENS (Match Stellarr)

Before building, inspect stellarrclub.vercel.app and extract:
- Background colors (likely dark theme)
- Card background + border radius + shadow
- Accent color (likely cosmic blue/purple)
- Font family + sizes
- Spacing system
- Button styles

Apply these as Tailwind theme extensions in `tailwind.config.ts`.

---

# EXECUTION ORDER FOR CLAUDE CODE

When working in terminal, follow this exact sequence:

1. Clone/init the repo, install deps
2. Set up Tailwind config matching Stellarr theme
3. Create Supabase schema (provide SQL above)
4. Build layout: Navigation + DashboardGrid + CardWrapper
5. Build UserStatsCard (mock data first)
6. Build TonightsSkyCard (integrate Open-Meteo API)
7. Build ActiveMissionsCard + TonightsChallengeCard
8. Build RecommendedObjectCard + LeaderboardSnapshotCard
9. Build Observation Upload form + Supabase Storage integration
10. Build Admin review panel
11. Build Leaderboard page
12. Build Sky Conditions full page
13. Connect all to Supabase (swap mock data for real queries)
14. Deploy to Vercel

---

# WHAT NOT TO BUILD

- No crypto/blockchain/wallet integration
- No payment processing
- No token minting or NFTs
- No complex auth — Supabase magic link or Google OAuth is enough
- No real-time WebSocket features in Phase 1
- No mobile app — responsive web only
