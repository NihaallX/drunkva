# Drunkva — Comprehensive Codebase Audit

> Generated: April 30, 2026  
> Auditor: v0 (Vercel AI)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Directory Structure](#5-directory-structure)
6. [Database Schema](#6-database-schema)
7. [API Layer](#7-api-layer)
8. [Frontend & Pages](#8-frontend--pages)
9. [Core Business Logic](#9-core-business-logic)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [PWA & Offline Capabilities](#11-pwa--offline-capabilities)
12. [AI Integration](#12-ai-integration)
13. [Push Notifications](#13-push-notifications)
14. [Design System](#14-design-system)
15. [Performance](#15-performance)
16. [Security](#16-security)
17. [Technical Debt](#17-technical-debt)
18. [Issues & Bugs](#18-issues--bugs)
19. [Optimization Opportunities](#19-optimization-opportunities)
20. [Feature Gaps](#20-feature-gaps)
21. [Recommendations Priority Matrix](#21-recommendations-priority-matrix)

---

## 1. Executive Summary

Drunkva is a **mobile-first social drinking session tracker** — think Strava, but for nights out. It's a well-structured Next.js 16 PWA with a strong product identity, clean design system, and real-time session logging. The codebase is largely solid with several standout architectural decisions, but carries meaningful technical debt in the forms of duplicated type definitions, localStorage misuse, raw SQL without transactions, and a few security surface areas that need hardening before scaling.

**Overall Health: 7.5 / 10**

| Category | Rating | Notes |
|----------|--------|-------|
| Architecture | ✅ Good | App Router + RSC patterns used well |
| Code Quality | ⚠️ Fair | Duplicated types, any-casts, missing error handling |
| Security | ⚠️ Fair | Some unprotected routes, no rate limiting |
| Performance | ✅ Good | SSR + pagination + offline queue |
| Design System | ✅ Excellent | Consistent tokens, custom CSS classes |
| Testing | ❌ None | Zero test coverage |
| Database | ⚠️ Fair | Raw SQL, manual migration scripts, no transactions |
| PWA | ✅ Good | SW + push + install prompt |

---

## 2. Project Overview

**Product:** Drunkva — social drinking session tracker  
**Target:** Mobile-only (constrained to 390px max-width)  
**Deployment:** Vercel  
**Database:** Neon (PostgreSQL, serverless)  
**Auth:** Clerk (optional — toggleable via `NEXT_PUBLIC_CLERK_ENABLED`)

### Core User Flows

```
Sign Up / Sign In (Clerk)
  └─> Onboarding (set name + alias)
        └─> Active Session
              ├─> Log Drinks (beer / shot / wine / cocktail / spirit)
              ├─> Speed Timer (stopwatch for drink speed)
              ├─> Extras Sheet (washroom, burps, chakna level)
              ├─> Confidence Curve (live + historical Recharts)
              └─> End Session
                    └─> Morning Card (3-step share flow)
                          ├─> Refine venue
                          ├─> AI-generated title (Groq)
                          └─> Share overlay (html2canvas export)

Social Layer:
  ├─> Feed (following-only, paginated)
  ├─> Cheers (like-style toggle)
  ├─> Witness Tagging (up to 5, push notification, confirm/decline)
  ├─> Follow / Unfollow
  └─> Public Profile pages
```

---

## 3. Architecture

### Pattern
- **Next.js 16 App Router** with a mix of RSC pages (data-fetching pages) and `"use client"` interactive screens
- **Neon Serverless** for direct SQL via tagged template literals
- **Clerk** (conditional) for auth — cleanly abstracted behind `getOrCreateUser()` and a feature flag
- **Service Worker + IndexedDB** for offline drink queuing

### Request Flow

```
Browser → Middleware (Clerk guard) → Page/Route Handler
  → getOrCreateUser() → Neon SQL → JSON response
```

### Key Abstraction Points
- `lib/auth.ts` → `getOrCreateUser()` centralizes auth resolution for all API routes
- `lib/confidence.ts` → pure confidence curve math, shared between server (API) and client (live preview)
- `lib/db.ts` → single `sql` export used everywhere

### Dual-mode Auth (Clerk toggleable)
The `NEXT_PUBLIC_CLERK_ENABLED` flag allows running without real Clerk credentials. Each client page implements the same shim pattern:
```ts
let useUser = clerkEnabled ? useClerkUser : () => ({ user: MOCK_USER });
```
This is clean but repeated in 3+ files — an opportunity to consolidate.

---

## 4. Technology Stack

| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Framework | Next.js | 16.0.10 | App Router, Turbopack |
| Language | TypeScript | ^5 | |
| Runtime | React | 19.2.0 | |
| Database | Neon (PostgreSQL) | ^1.1.0 | Serverless driver |
| Auth | Clerk | ^7.2.7 | Optional via env flag |
| Styling | Tailwind CSS | ^4.1.9 | + tw-animate-css |
| UI Components | Radix UI + shadcn/ui | Various | Full component suite |
| AI | Groq SDK | ^1.1.2 | `llama-3.3-70b-versatile` |
| Charts | Recharts | 2.15.4 | Confidence curve |
| Push Notifications | web-push | ^3.6.7 | VAPID |
| Offline Queue | idb | ^8.0.3 | IndexedDB wrapper |
| Image Export | html2canvas | ^1.4.1 | Share overlay capture |
| Form Validation | react-hook-form + zod | 7.x / 3.x | |
| Analytics | Vercel Analytics | 1.3.1 | |
| Webhook Verification | svix | ^1.92.2 | Clerk webhooks |
| Cron | Vercel Cron | — | Morning card reminders |

---

## 5. Directory Structure

```
drunkva/
├── app/
│   ├── api/                        # 10 API routes
│   │   ├── cheers/route.ts         # Toggle cheers (POST)
│   │   ├── cron/morning-card/      # Daily session cleanup + push
│   │   ├── drinks/route.ts         # Log drink (POST)
│   │   ├── feed/route.ts           # Paginated social feed (GET)
│   │   ├── follow/route.ts         # Follow/unfollow toggle (POST)
│   │   ├── profile/route.ts        # Profile CRUD (GET/PATCH/DELETE)
│   │   ├── push/                   # Push subscription + send
│   │   ├── sessions/route.ts       # Session list + create
│   │   ├── sessions/[id]/route.ts  # Session CRUD (GET/PATCH/DELETE)
│   │   ├── title/route.ts          # AI title generation (POST)
│   │   ├── webhooks/clerk/         # Clerk user sync webhook
│   │   └── witnesses/              # Witness tag + confirm
│   ├── feed/                       # Social feed page
│   ├── morning-card/               # Post-session share flow
│   ├── onboarding/                 # Name + alias setup
│   ├── privacy/                    # Static privacy policy
│   ├── profile/                    # Own profile + edit
│   ├── profile/[userId]/           # Public user profile
│   ├── session/                    # Active session + view
│   ├── sign-in / sign-up/          # Clerk auth pages
│   ├── terms/                      # Static terms page
│   ├── globals.css                 # Design tokens + utility classes
│   ├── layout.tsx                  # Root layout + providers
│   ├── manifest.ts                 # PWA manifest
│   └── page.tsx                    # Landing / redirect
├── components/
│   ├── drunkva/                    # App-specific components (14 files)
│   └── ui/                         # shadcn/ui primitives (40+ files)
├── hooks/
│   ├── useOfflineQueue.ts          # IndexedDB offline action queue
│   └── useSessionTimer.ts          # Live session timer
├── lib/
│   ├── auth.ts                     # getOrCreateUser + requireOnboarding
│   ├── confidence.ts               # Confidence algorithm + curve
│   ├── db.ts                       # Neon SQL client + DB types
│   ├── drink-speed.ts              # Speed normalization + PR logic
│   ├── groq.ts                     # AI title generation
│   ├── mock-user.ts                # Dev mode mock user
│   ├── session-duration.ts         # Active / total duration calc
│   └── utils.ts                    # cn(), formatLiveDuration()
├── public/
│   ├── sw.js                       # Service Worker v2
│   └── icons/                      # PWA icons
├── scripts/
│   ├── migrate.mjs                 # DB migration runner
│   ├── backfill-pbs.mjs            # PB recalculation script
│   └── check-schema.mjs            # Schema inspection helper
├── middleware.ts                   # Clerk route protection
├── next.config.mjs
├── tailwind.config.ts
└── vercel.json                     # Cron config
```

---

## 6. Database Schema

Reconstructed from migration scripts and API queries:

```sql
-- Core user table
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id         TEXT UNIQUE NOT NULL,
  real_name        TEXT NOT NULL,
  alias            TEXT,
  avatar_url       TEXT,
  is_onboarded     BOOLEAN DEFAULT FALSE,
  -- Personal bests (speed in seconds)
  pb_beer_seconds      INT,
  pb_shot_seconds      INT,
  pb_wine_seconds      INT,
  pb_cocktail_seconds  INT,
  pb_spirit_seconds    INT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_name                 TEXT,
  location_lat               FLOAT,
  location_lng               FLOAT,
  start_time                 TIMESTAMPTZ DEFAULT NOW(),
  end_time                   TIMESTAMPTZ,
  total_duration_seconds     INT,
  active_duration_seconds    INT,
  session_title              TEXT,
  peak_confidence_pct        INT DEFAULT 10,
  peak_stage                 TEXT DEFAULT 'Baseline',
  washroom_count             INT DEFAULT 0,
  burp_count                 INT DEFAULT 0,
  chakna_level               TEXT DEFAULT 'none', -- 'none' | 'light' | 'heavy'
  is_verified                BOOLEAN DEFAULT FALSE,
  morning_card_notified_at   TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drinks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type             TEXT NOT NULL, -- 'beer' | 'shot' | 'spirit' | 'wine' | 'cocktail'
  logged_at        TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INT,           -- speed measurement (10–900s range)
  timing_method    TEXT DEFAULT 'gap' CHECK (timing_method IN ('gap', 'stopwatch'))
);

CREATE TABLE cheers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID REFERENCES sessions(id) ON DELETE CASCADE,
  from_user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, from_user_id)
);

CREATE TABLE follows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

CREATE TABLE session_witnesses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  confirmed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT UNIQUE NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE account_deletions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Indexes (from migrations)
```sql
CREATE INDEX idx_drinks_pr_lookup ON drinks (session_id, type, duration_seconds) WHERE duration_seconds IS NOT NULL;
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_open_start_time ON sessions (start_time) WHERE end_time IS NULL;
CREATE INDEX idx_drinks_session_logged_at ON drinks (session_id, logged_at);
```

**Missing Indexes:**
- `follows(following_id)` — heavily queried in feed for follower lookup
- `cheers(session_id)` — counted in every feed row
- `sessions(end_time)` — used in morning-card cron range queries
- `push_subscriptions(user_id)` — used in every push notification dispatch

---

## 7. API Layer

### Route Inventory

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/sessions` | GET, POST | ✅ | List own sessions / start new |
| `/api/sessions/[id]` | GET, PATCH, DELETE | GET public, others ✅ | Session CRUD |
| `/api/drinks` | POST | ✅ | Log drink + confidence recalc + PR check |
| `/api/feed` | GET | ✅ | Paginated following feed |
| `/api/cheers` | POST | ✅ | Toggle cheers on session |
| `/api/follow` | POST | ✅ | Follow/unfollow user |
| `/api/profile` | GET, PATCH, DELETE | ✅ | Profile + stats + account deletion |
| `/api/title` | POST | ✅ | AI session title via Groq |
| `/api/push/subscribe` | POST | ✅ | Register push subscription |
| `/api/push/send` | POST | Server-only | Internal push dispatch |
| `/api/witnesses` | POST, PATCH | ✅ | Tag + confirm witnesses |
| `/api/witnesses/search` | GET | ✅ | Search users to tag |
| `/api/webhooks/clerk` | POST | Svix signature | Clerk user sync |
| `/api/cron/morning-card` | GET | CRON_SECRET | Session cleanup + notifications |

### Notable API Patterns

**Good:**
- `ON CONFLICT DO NOTHING` used appropriately for idempotent inserts
- UUID validation regex in `sessions/[id]/route.ts` prevents SQL injection via path param
- PATCH uses `COALESCE` to allow partial updates cleanly
- Webhook uses Svix signature verification

**Issues:**
- `DELETE /api/profile` executes 7 sequential SQL statements with **no transaction** — partial deletion is possible on error
- PR updates in `/api/drinks` run up to 5 separate `UPDATE` statements instead of a single conditional one
- Internal push endpoint (`/api/push/send`) uses `CLERK_SECRET_KEY` as its auth token — leaks the purpose of that secret and it can't be rotated independently
- `GET /api/sessions/[id]` is **fully public** (no auth check) — leaks private session data

---

## 8. Frontend & Pages

### Page Architecture

| Page | Rendering | Data Strategy | Notes |
|------|-----------|--------------|-------|
| `/` | Server | Redirect logic | Landing / auth redirect |
| `/onboarding` | Client | fetch in useEffect | ⚠️ Direct fetch in effect |
| `/session` | Client | localStorage + API | Core live session |
| `/session/[id]` | Client | fetch in useEffect | Public session viewer |
| `/feed` | Client | Manual fetch + intersection observer | ⚠️ No SWR |
| `/morning-card` | Client (Suspense) | fetch in useEffect | Post-session share |
| `/profile` | Client | fetch in useEffect | ⚠️ Two parallel effects |
| `/profile/edit` | Client | fetch in useEffect | ⚠️ Direct fetch in effect |
| `/profile/[userId]` | Client | fetch in useEffect | Public profile |

**Issue:** All client pages use `fetch` inside `useEffect` directly, violating the guidelines that recommend SWR for data fetching. This leads to:
- No request deduplication
- No stale-while-revalidate behavior
- Manual loading/error state management everywhere

### Component Architecture

The `components/drunkva/` directory is well-structured:

```
DrunkvaLogo         — Brand mark
BottomNav           — Fixed navigation (4 tabs)
SessionStartScreen  — Pre-session setup
LiveSessionScreen   — Active tracking UI
QuickLogBar         — Drink logging buttons
ConfidenceBlock     — Stage + progress bar display
ConfidenceChart     — Recharts curve (session detail view)
StatGrid            — 4-stat summary grid
ExtrasSheet         — Burp/washroom/chakna drawer
WitnessSheet        — Witness tagging bottom sheet
FeedCard            — Social feed item with optimistic cheers
MorningCardInner    — 3-step post-session share flow
ShareOverlay/       — Two share templates (TemplateA, TemplateC)
InstallPrompt       — PWA install banner
```

### Duplicated Type Definitions ⚠️

`DrinkLog` and `SessionState` interfaces are **defined identically in both** `app/session/page.tsx` and `components/drunkva/LiveSessionScreen.tsx`. These should be extracted to a shared `types/` file.

---

## 9. Core Business Logic

### Confidence Algorithm (`lib/confidence.ts`)

A pure function that models intoxication as a number from 10–99:

```
Start at 10 → Add drink weight on each drink → Decay 5pts per 30min gap after 90min idle
```

**Drink Weights:**
| Type | Weight |
|------|--------|
| beer | +12 |
| wine | +10 |
| cocktail | +13 |
| spirit | +15 |
| shot | +18 |

**6 Named Stages:** Baseline → Bullish → Ascend → Climax → Half-life → Credits

**Issue:** The decay is applied **between consecutive drinks only** — if the last drink is 3 hours old, no decay is applied to the "current" confidence in `calculateConfidence()`. The `reconstructCurve()` function has the same gap. Real-time decay to "now" is only implemented in `LiveSessionScreen` via `useMemo`. The API endpoint's stored `peak_confidence_pct` also doesn't account for time decay.

### Session Duration (`lib/session-duration.ts`)

Clean separation of:
- `calculateTotalDurationSeconds` — wall clock start to end
- `calculateActiveDurationSeconds` — caps inter-drink gaps at 2h (prevents counting sleep as "session time")
- `calculateLiveActiveDuration` — live version with `isPaused` flag

### Drink Speed (`lib/drink-speed.ts`)

- Speed range: **10–900 seconds** (10s minimum realistic, 15min maximum)
- Two timing methods: `gap` (estimated from time between consecutive drinks) vs `stopwatch` (user-timed with in-app timer)
- `getPreferredFastestDrink()` always prefers stopwatch-timed entries over gap estimates

---

## 10. Authentication & Authorization

### Clerk Integration

- Conditional via `NEXT_PUBLIC_CLERK_ENABLED` — clever for local dev
- `clerkMiddleware` protects all private routes at the edge
- Webhook (`/api/webhooks/clerk`) syncs `user.created` and `user.updated` events

### `getOrCreateUser()` Pattern

Every API route calls `getOrCreateUser()` which:
1. Checks if Clerk is enabled
2. Gets Clerk `userId` from `auth()`
3. Looks up user in DB, creates if missing

**Issue:** This pattern hits the DB on **every single API request** to verify the user exists — even when auth is already confirmed by middleware. For high-traffic routes this adds latency. Consider caching the user lookup with Next.js `unstable_cache` or a request-scoped cache.

### Authorization Gaps

1. **`GET /api/sessions/[id]`** — fully public, no auth check. Anyone who knows a session UUID can read all session data including location coordinates.
2. **`/api/witnesses/search`** — not audited, but likely public-ish
3. **`/api/push/send`** — protected only by `CLERK_SECRET_KEY` comparison; this key is a long-lived secret that can't be rotated independently of Clerk

---

## 11. PWA & Offline Capabilities

### Service Worker (`public/sw.js`)

- Cache-first strategy for static icons + manifest
- Network-only for all other requests (navigation, API)
- Background Sync handler registered but uses a **different IndexedDB** (`drunkva-db` / `drunkva-offline-drinks`) than `useOfflineQueue.ts` (`drunkva-offline` / `action-queue`)
- Push notification display + notification click routing

**Critical Bug:** The SW `syncOfflineDrinks()` uses a different store name than `useOfflineQueue.ts`. Background Sync via the SW will **never find queued drinks** because they're stored in a different IDB store. The offline queue currently only syncs via the `window.addEventListener('online')` event in the hook — the SW background sync is effectively dead code.

### `useOfflineQueue.ts`

- Queues API actions to IndexedDB when offline
- Syncs on `online` event and on mount
- Properly handles 4xx (permanent fail = delete from queue) vs 5xx (retry)
- `justSynced` flash feedback is a nice UX touch

### Install Prompt (`InstallPrompt.tsx`)

- Intercepts `beforeinstallprompt` to show a custom install banner
- Persists dismissal to `localStorage` — fine for PWA UX patterns

---

## 12. AI Integration

### Groq (`lib/groq.ts`)

- Model: `llama-3.3-70b-versatile`
- 8-second timeout with `AbortController`
- Returns `null` on failure (graceful degradation)
- Called from `/api/title` route (server-side, key never exposed to client)

**Issues:**
- No rate limiting on `/api/title` — a user could spam title generation incurring Groq API costs
- The prompt hardcodes `max_tokens: 100` and `temperature: 0.9` without any quality guardrails
- Error swallowing: `catch {}` loses error details that could inform better fallback behavior

---

## 13. Push Notifications

### VAPID Setup
- `web-push` initialized conditionally (guards against build-time crash with missing keys)
- VAPID keys guarded against placeholder `"REPLACE_ME"` values

### Push Flow
1. `InstallPrompt` / settings → subscribe → `POST /api/push/subscribe`
2. Events (witness tag) → `POST /api/push/send` (server-to-server, internal)
3. Cron job → direct `webpush.sendNotification()` calls

### Morning Card Cron (vercel.json)
Schedule: `30 4 * * *` (4:30am UTC daily)

Three-tier session cleanup logic:
1. **Soft close**: no drink for 4h → auto-end at `last_drink + 4h`
2. **Hard cutoff**: session open > 12h → force-close at `start + 12h`
3. **Stale deletion**: no drinks, open > 48h → delete entirely

**Issue:** The cron runs at 4:30am UTC which is ~10am IST — not ideal for an Indian-market app. Most users would finish sessions between 11pm–3am IST (5:30pm–9:30pm UTC). The notification window `6–18 hours after session end` is reasonable but the single daily run means some sessions wait up to 24h for processing.

---

## 14. Design System

### Color Palette (Dark-only)
| Token | Value | Usage |
|-------|-------|-------|
| `--brand` / `--primary` | `#FC4C02` | CTA buttons, stage text, LIVE badge |
| `--background` | `#000000` | Page background |
| `--card` | `#1A1A1A` | Cards, inputs |
| `--bg-card-elevated` | `#2D2D2D` | Popovers, elevated surfaces |
| `--foreground` | `#ffffff` | Primary text |
| `--muted-foreground` | `#7A7A7A` | Secondary text |
| `--border` | `#4A4A4A` | Borders |

### Typography
- **Body:** Inter (variable font via Next.js `next/font/google`)
- **Headings/Display:** Space Grotesk (bound to `--font-heading`)

### Custom Utility Classes (`.dv-*`)
A well-thought-out set of semantic classes that encapsulate the design language:
- `.dv-page`, `.dv-nav`, `.dv-bottom-nav` — layout structure
- `.dv-stage`, `.dv-stage-xl` — confidence stage display
- `.dv-drink-btn`, `.dv-drink-btn--main` — drink logging buttons
- `.dv-cheers-btn`, `.dv-cheers-btn--active` — social interaction
- `.dv-bar-track`, `.dv-bar-fill`, `.dv-bar-dot` — confidence progress bar
- `.dv-animate-up`, `.dv-pop`, `.dv-pulse` — micro-animations

**Issue:** `globals.css` token values conflict — `--radius-sm/md/lg/xl` are defined both in `:root` (as px values) and in `@theme inline` (as `calc(var(--radius) ± Npx)` expressions). This creates two parallel radius systems.

---

## 15. Performance

### Strengths
- `html2canvas` dynamically imported (`await import(...)`) — keeps it out of the initial bundle
- `optimizePackageImports` for `@radix-ui/react-dialog` and `lucide-react`
- Paginated feed (20 items/page) with intersection observer for infinite scroll
- Confidence curve recalculated client-side from local state during live session (no extra API call)
- Parallel DB queries in complex endpoints (e.g., feed subqueries run in single SQL statement)

### Issues
- **`images.unoptimized: true`** — disables Next.js Image Optimization globally. All avatar URLs and share overlay images are unoptimized.
- **No SWR / React Query** — every page fetches independently, no shared caching layer
- **`html2canvas` scale: 5`** — 5x pixel ratio on export is very high memory usage on mobile. `scale: 2` would produce a 4K image still more than sufficient for mobile sharing.
- **Profile page**: two `useEffect` fetches fire sequentially instead of in parallel

### Bundle Analysis
Large dependencies to watch:
- `recharts` (2.15.4) — not tree-shaken, ~300KB minified
- `html2canvas` (~200KB) — only needed on morning-card page, lazy loaded ✅
- `@clerk/nextjs` (~150KB) — conditionally loaded, but always in SSR bundle

---

## 16. Security

### Strengths
- Svix webhook signature verification
- UUID regex validation on path params
- `ON CONFLICT DO NOTHING` prevents duplicate inserts
- Parameterized SQL via tagged template literals (Neon driver handles escaping)

### Vulnerabilities

| Severity | Issue | Location |
|----------|-------|----------|
| 🔴 HIGH | No transaction on account deletion — partial data loss possible | `DELETE /api/profile` |
| 🔴 HIGH | `GET /api/sessions/[id]` is fully public — leaks location lat/lng, drink details | `sessions/[id]/route.ts` |
| 🟡 MEDIUM | No rate limiting on any route — spam/abuse possible, AI cost exposure | All routes |
| 🟡 MEDIUM | Internal push auth uses `CLERK_SECRET_KEY` — can't rotate independently | `/api/push/send` |
| 🟡 MEDIUM | `VAPID_PRIVATE_KEY` placeholder check is loose (only checks `"REPLACE_ME"`) | Push routes |
| 🟠 LOW | `localStorage` for active session — persists across users on shared devices | `session/page.tsx` |
| 🟠 LOW | User photo uploaded as Data URL in `MorningCardInner` — no size validation | Morning card |

---

## 17. Technical Debt

### High Priority

1. **No database transactions** — `DELETE /api/profile` and multiple PR updates should use `BEGIN/COMMIT` blocks. Neon supports transactions via `sql.transaction()`.

2. **Duplicated `DrinkLog` / `SessionState` types** — defined identically in `app/session/page.tsx` and `components/drunkva/LiveSessionScreen.tsx`. Should be in `types/session.ts`.

3. **SW / useOfflineQueue IDB mismatch** — Background Sync never works because different DB/store names. Either align them or remove the dead SW sync code.

4. **`useEffect` data fetching** — All client pages violate the codebase's own implicit pattern. Should migrate to SWR for consistency and caching.

### Medium Priority

5. **Hardcoded `useUser` shim repeated 3 times** — `session/page.tsx`, `feed/page.tsx`, `profile/page.tsx` each duplicate the same Clerk/mock shim. Extract to `hooks/useCurrentUser.ts`.

6. **`any` type cast on `drinks`** in confidence.ts call: `calculateConfidence(allDrinks as any)` — should be properly typed.

7. **Migration system is ad-hoc** — Scripts read `.env.local` directly, hardcode schema changes, have no tracking of "applied" state. Consider adopting `drizzle-kit migrate` or `node-postgres-migrate`.

8. **`NEXT_PUBLIC_VAPID_PUBLIC_KEY` placeholder check** — Only guards against the string `"REPLACE_ME"`, not absent/empty strings.

9. **`html2canvas` export at `scale: 5`** — produces a ~10MB PNG in memory on mobile, extremely likely to OOM on low-end devices.

### Low Priority

10. **Emoji as icons** — `"🍻"` hardcoded in `FeedCard` cheers button and `"👁️"` in notification string. Should use Lucide icons for consistency.

11. **`Comment` button** in `FeedCard` is non-functional (no click handler, no route) — dead UI.

12. **`is_pr` not stored on drinks table** — Drinks don't have an `is_pr` column, yet `MorningCardInner` checks `d.is_pr === true`. This will always be `false`.

13. **`clerkEnabled` flag checked inconsistently** — in middleware it's `process.env.NEXT_PUBLIC_CLERK_ENABLED === "true"`, in `lib/auth.ts` it's the same, but in `lib/mock-user.ts` it's also exported. Three sources of truth.

14. **Radius token conflict** — `:root` defines `--radius-md: 10px` but `@theme inline` defines `--radius-md: calc(var(--radius) - 2px)` where `--radius: 0.625rem` = 10px, giving `8px`. Inconsistency in usage.

---

## 18. Issues & Bugs

| # | Severity | Description | File |
|---|----------|-------------|------|
| 1 | 🔴 | `is_pr` check in MorningCardInner always false — column doesn't exist on drinks | `MorningCardInner.tsx` |
| 2 | 🔴 | Account deletion not wrapped in transaction — partial data corruption possible | `api/profile/route.ts` |
| 3 | 🔴 | SW background sync uses different IDB store than `useOfflineQueue` | `sw.js` + `useOfflineQueue.ts` |
| 4 | 🟡 | Confidence decay doesn't apply to the interval between last drink and "now" server-side | `lib/confidence.ts` |
| 5 | 🟡 | Feed cheers polling (`refetchCheers`) fetches page 0 always but merges with potentially paginated local state — items on pages 2+ won't get cheers updates | `feed/page.tsx` |
| 6 | 🟡 | Session stored in `localStorage` after end is never cleared on sign-out — next user sees old session | `session/page.tsx` |
| 7 | 🟡 | `GET /api/sessions/[id]` public — exposes location coordinates and drink history | `api/sessions/[id]/route.ts` |
| 8 | 🟠 | `Comment` button in FeedCard is dead UI | `FeedCard.tsx` |
| 9 | 🟠 | `html2canvas` at `scale: 5` risks OOM on low-memory mobile devices | `MorningCardInner.tsx` |
| 10 | 🟠 | Cron runs at 4:30am UTC — suboptimal for IST users (runs ~10am IST, far from typical session end times) | `vercel.json` |
| 11 | 🟠 | `manifest.ts` references `/manifest.webmanifest` in metadata but app manifest file extension may differ | `app/layout.tsx` |
| 12 | 🟠 | Profile page fires two sequential `useEffect` fetches — should be parallel | `profile/page.tsx` |

---

## 19. Optimization Opportunities

### Database
- Add missing indexes on `follows(following_id)`, `cheers(session_id)`, `sessions(end_time)`, `push_subscriptions(user_id)`
- Batch PB updates in `/api/drinks` into a single conditional UPDATE
- Use transactions for multi-step writes
- Consider materialized stats view for profile page (avoids recounting on every visit)

### Frontend
- Migrate all `useEffect` fetches to **SWR** (`useSWR` / `useSWRInfinite`)
- Reduce `html2canvas` scale from `5` to `2` — still ~1080p output, 6x smaller memory footprint
- Consolidate the `useUser` shim into `hooks/useCurrentUser.ts`
- Extract shared types to `types/session.ts`
- Profile page: parallel fetch with `Promise.all()`

### PWA
- Fix SW / useOfflineQueue IDB alignment so Background Sync actually works
- Add `staleWhileRevalidate` strategy for `/api/feed` in the service worker

### AI / Groq
- Add rate limiting per user (e.g., Upstash Redis token bucket) on `/api/title`
- Cache generated titles by session ID to avoid regeneration costs

---

## 20. Feature Gaps

Based on the codebase, these features are **stubbed or partially implemented**:

| Feature | Status | Notes |
|---------|--------|-------|
| Comments | ❌ UI only | `FeedCard` shows "Comment" but no implementation |
| `is_pr` on drinks | ❌ Schema gap | Checked in MorningCard but not in DB |
| Search users | ⚠️ Partial | `witnesses/search` exists but no dedicated search page |
| Notifications inbox | ❌ Missing | Push delivered but no in-app notification list |
| Session edit post-end | ⚠️ Partial | PATCH allows title/venue but no UI after morning card |
| Dark/light mode toggle | ❌ Dark only | Theme is hardcoded dark, ThemeProvider `disableTransitionOnChange` |
| Drink undo | ❌ Missing | No way to delete a logged drink during session |
| Location map view | ❌ Missing | Location stored but never visualized |

---

## 21. Recommendations Priority Matrix

### Immediate (fix before next feature work)

1. **Wrap account deletion in a SQL transaction** — data integrity risk
2. **Fix `is_pr` column or remove the check** — silent bug that misleads users
3. **Align SW IDB store names with `useOfflineQueue`** — offline sync is broken
4. **Auth-protect `GET /api/sessions/[id]`** or explicitly redact sensitive fields (lat/lng) for public access

### Short-term (next sprint)

5. Add **missing DB indexes** (follows, cheers, sessions.end_time, push_subscriptions)
6. Migrate `useEffect` fetches to **SWR** across all pages
7. Extract shared types to `types/session.ts`
8. Consolidate `useUser` shim to `hooks/useCurrentUser.ts`
9. Add **rate limiting** to `/api/title` (Upstash Redis is already a suggested integration)
10. Reduce `html2canvas` scale to `2`

### Medium-term (next quarter)

11. Adopt a proper migration tool (Drizzle-kit or similar)
12. Add transaction support to multi-step DB writes
13. Implement comment functionality (partially stubbed)
14. Move cron to a more IST-friendly time (e.g., `30 20 * * *` UTC = 2am IST)
15. Add a proper internal secret for push (independent of `CLERK_SECRET_KEY`)

### Long-term

16. Add test coverage (at minimum: confidence algorithm, session duration, drink speed normalization — all pure functions, trivially testable)
17. Consider SSR for session detail and public profile pages (SEO + performance)
18. Evaluate SWR global provider vs per-page fetch patterns

---

*End of Audit Report*
