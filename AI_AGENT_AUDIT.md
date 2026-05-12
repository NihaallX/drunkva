# Drunkva — AI Agent Audit & Codebase Guide

**Last Updated:** May 11, 2026 (Landing Stats & Legal Framework)
**Consolidated From:** DRUNKVA_FULL_STACK_AUDIT.md, docs/AUDIT.md, docs/PERFORMANCE_AUDIT.md  
**Purpose:** Provide AI agents with complete context about project architecture, technical debt, security posture, and priorities.

### Latest Session Summary (May 11, 2026)
- ✅ **Landing stats API:** Deployed `/api/landing-stats` with 5-min caching (nightsTracked, drinksLogged)
- ✅ **Mobile responsiveness:** Fixed landing page layout on mobile; disabled GSAP animations ≤768px
- ✅ **Legal compliance:** Added Terms/Privacy pages, consent checkbox in `/simple-auth`, DB migration for consent tracking
- ✅ **Performance:** Replaced runtime hover handlers with CSS classes, fixed typewriter wrapping on mobile
- ✅ **Build fixes:** Added TypeScript declarations for lenis import, resolved Vercel build errors
- Commits: `feat(landing): live stats...`, `fix(landing): mobile-responsive layout...`, `docs(audit): update with latest improvements...`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Layer](#api-layer)
7. [Frontend Architecture](#frontend-architecture)
8. [Core Business Logic](#core-business-logic)
9. [Authentication & Authorization](#authentication--authorization)
10. [PWA & Offline Capabilities](#pwa--offline-capabilities)
11. [Performance Analysis](#performance-analysis)
12. [Security Posture](#security-posture)
13. [Reliability & Data Integrity](#reliability--data-integrity)
14. [Code Quality & Technical Debt](#code-quality--technical-debt)
15. [Prioritized Fix List](#prioritized-fix-list)
16. [Quick Wins](#quick-wins)
17. [Verified Status Update (May 8, 2026)](#verified-status-update-may-8-2026)

---

## Executive Summary

Drunkva is a **mobile-first social drinking session tracker** (Strava for nights out) built on Next.js 16 with PostgreSQL, Clerk auth, and PWA capabilities. It's a moderately mature MVP with solid architectural foundations but several categories of technical debt and production readiness gaps.

### Health Scorecard (out of 10)

| Category | Score | Status | Priority |
|----------|-------|--------|----------|
| **Backend Performance** | 5/10 | ⚠️ Concerning | N+1 queries, unbounded rate limiter, missing indexes |
| **Frontend Performance** | 6.5/10 | ⚠️ Fair | html2canvas overhead, aggressive SW caching; improved: CSS hover handlers, mobile wrapping |
| **Security** | 7.5/10 | ⚠️ Fair | Added: legal consent flow; remaining: webhook validation, rate limits, public routes |
| **Reliability** | 4/10 | 🔴 Critical | Race conditions, no transactions, offline queue sync bug |
| **Code Quality** | 6/10 | ⚠️ Fair | Duplicated types, bare catch blocks, inconsistent error handling |
| **Mobile/PWA** | 7/10 | ✅ Improved | Landing responsive ✅, Lenis smooth scroll ✅, GSAP disabled on mobile ✅ |

**Overall:** 6.4/10 — Solid MVP with critical issues blocking scale. Priority: fix reliability + security before 10k users.

---

## Verified Status Update (May 8, 2026)

This section is the source of truth when it conflicts with older findings below.

### Resolved since the earlier audit draft

- `GET /api/feed` no longer uses N+1 correlated subqueries; it uses a single aggregated query with joins and grouping.
- Rate limits are in place for:
  - `/api/cheers` (30/min/user)
  - `/api/title` (5/min/user)
  - `/api/drinks` (60/min/user)
- Clerk webhook now fails closed when `CLERK_WEBHOOK_SECRET` is missing.
- `/api/push/send` now uses `INTERNAL_API_SECRET` (no longer `CLERK_SECRET_KEY`).
- Feed rendering is optimized:
  - `FeedCard` is memoized with custom prop comparison.
  - Feed page uses SWR and 30s visible-tab revalidation.
- In-memory limiter now has bounded key count (`MAX_KEYS`) + pruning.
- Multiple performance indexes listed as missing in older notes are already present in migration scripts:
  - follows, sessions(user_id, created_at), drinks(session_id, logged_at), cheers(session_id, from_user_id), push_subscriptions(user_id)
- Service worker navigation strategy is network-first (not stale-HTML cache-first).

### Fixed in this update (flow-safe)

- `/api/sessions/[id]` `GET` is now authenticated and scoped:
  - Owner can view
  - Followers of the owner can view (preserves feed -> session detail flow)
  - Tagged witnesses can view
  - Others receive 404
- `/api/profile` `DELETE` is now transactional (`BEGIN/COMMIT/ROLLBACK`) and rejects cross-origin requests with a same-origin check to reduce CSRF risk.
- Offline queue background sync now uses the same IndexedDB names as the app queue:
  - DB: `drunkva-offline`
  - Store: `action-queue`
  - Added shared sync tag `sync-offline-queue`
  - Queue hook now attempts background sync registration where supported.
- Morning-card cron now batches drink lookups for hard-close and soft-close sessions instead of fetching drinks per session.
- Morning-card export now caches the font preload work instead of waiting on the 800ms font bootstrap delay on every share/download.
- Production CSP now omits `unsafe-eval` from `script-src` (dev retains it for HMR).
- Witness tagging is now surfaced after morning-card export/share and was verified in browser QA.

### Fixed in May 9, 2026 update (UI/UX & Morning Card)

- **Morning Card flow simplified:**
   - Merged steps 1 & 2: venue/generate + title display/edit are now a single unified step
   - Progress bar reduced from 3 steps to 2 (step 1: wrap-up, step 2: photo + share)
   - All wrap-up content visible at once: stats card, drink breakdown, venue field, title generation
   - Choose photo button now disabled until title is generated
- **Session duration display fixed:**
   - Duration now visible from session start (no longer hidden until first drink logged)
   - Client-side duration calculation added to morning card: if `total_duration_seconds` is null, calculates from `start_time` and `end_time`
   - Timer now updates in real-time during active session
- **StatGrid washroom interaction improved:**
   - Washroom stat cell now directly clickable with Popover UI showing +/− buttons
   - No longer requires accessing "More" menu; easier for tap-friendly mobile UX
   - Count updates immediately and syncs to database via PATCH /api/sessions/[id]
- **Morning card stats card redesigned:**
   - Changed from: Duration, Peak, Drinks, Witnesses
   - Changed to: Duration, Peak, Drinks, Washroom (all actual tracked data)
   - Hardcoded witnesses value (0) replaced with `session.washroom_count` (tracks actual trips)
   - Better session summary for users
- **Responsive viewport & safe-area improvements:**
   - Root container max-width expanded: 390px → 430px (better tablet support while keeping mobile-first)
   - Root container min-width set to 320px (safeguard for older phones)
   - All viewport height units migrated from `100vh` to `100dvh` (prevents zoom-on-scroll issues on mobile browsers)
   - Viewport meta updated with `viewport-fit: cover` (native notch/dynamic island support)
   - Safe-area inset environment variables integrated:
     - Root layout: `padding-top: env(safe-area-inset-top)` (reserves space for notch at top)
     - Bottom navigation: `padding-bottom: env(safe-area-inset-bottom)` (reserves space for gesture bar/home indicator)
   - Container width classes updated to `w-full` (responsive scaling) replacing hardcoded `max-w-[390px]` in FullInfoStatPicker and simple-auth pages
   - Share card export templates use internal fixed dimensions (not affected by viewport changes)

### Remaining high-priority issues

- html2canvas export path is still heavy and can cause perceived jank on low-end devices.
- CSP still allows `unsafe-inline` in production policy; removing it would require nonce-based script handling.
- Document still contains stale sections below that mention already-resolved issues; treat this update section as canonical.

### Recent Improvements (May 11, 2026)

#### Landing Stats API
- **File:** `app/api/landing-stats/route.ts` (new)
- **Purpose:** Public endpoint returning aggregated metrics for landing page
- **Response:** `{ nightsTracked: 71, drinksLogged: 181 }` (DB-driven, no user data exposed)
- **Caching:** 5-minute TTL to reduce DB load
- **Wiring:** Integrated into `components/landing/StoryScroll.tsx` with fallback values
- **Status:** ✅ Implemented, tested locally, deployed

#### Mobile Responsiveness
- **Files:** `components/ui/story-scroll.tsx`, `components/ui/typewriter-effect.tsx`
- **Changes:**
  - Disabled GSAP pin/rotation animations on screens ≤768px (prevents stacking issues)
  - Typewriter text now wraps on mobile (`whitespace-normal sm:whitespace-nowrap`)
  - Phone mockups properly sized for mobile viewport
- **Testing:** Verified on 375×667 viewport; all sections render cleanly
- **Status:** ✅ Fixed, committed, tested

#### Legal Compliance Framework
- **Files:** `app/terms/page.tsx`, `app/privacy/page.tsx`, `components/landing/Footer.tsx`, `app/simple-auth/page.tsx`, `app/api/simple-auth/route.ts`
- **DB Migration:** Added `terms_accepted_at`, `privacy_accepted_at`, `legal_consent_version` to `users` table
- **Consent Flow:** Checkbox in `/simple-auth` blocks signup if unchecked; server validates and persists on success
- **Backward Safety:** Try/catch on consent persistence allows sign-in to succeed even if DB update fails
- **Status:** ✅ Implemented, DB migrated locally, persists to production on next deploy

#### Performance & Build Fixes
- **CSS Hover Handlers:** Replaced runtime JS hover effects with `hover:bg-[#C43D00]` classes (reduced JS overhead)
- **Lenis Integration:** Added smooth scroll library with proper TypeScript declarations (`types/lenis-react.d.ts`)
- **Typewriter Timeout Cleanup:** Fixed memory leak by clearing timeout on unmount
- **Status:** ✅ Committed, passing local build
---

## Project Overview

### What is Drunkva?

A real-time social drinking tracker that logs drinks throughout your night, calculates a live "confidence curve" that maps to 6 intoxication stages, and generates a shareable AI-captioned photo card at the end of your session.

### Core User Flows

```
Sign Up/In (Clerk) → Onboarding → Start Session → Log Drinks
  ↓
Live Confidence Tracking (real-time curve + speed timer + extras)
  ↓
End Session → Morning Card 20px–430px viewport (mobile to tablet, responsive)
- **Viewport Units:** 100dvh (fixes zoom-on-scroll issues in mobile browsers)
- **Safe-Area Integration:** Full support for notches, dynamic islands, and gesture barsitle + html2canvas export)
  ↓
Social Feed (follow-only, 30s polling for cheers updates)
  ├─ Cheers (like-style toggle)
  ├─ Witness Tagging (push notification + confirm/decline)
  └─ Public Profile Pages
```

### Key Metrics

- **Target Form Factor:** 390px max-width (mobile-only)
- **Deployment:** Vercel (Edge middleware, serverless functions, cron)
- **Database:** Neon PostgreSQL (serverless, edge-ready)
- **Users:** MVP, ~100–1k range (not yet stress-tested at scale)

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js 16 (App Router) | 16.0.10 | Core + API routes + RSC |
| **Language** | TypeScript | ^5 | Type safety |
| **Runtime** | React | 19.2.0 | UI components + hooks |
| **Database** | Neon (PostgreSQL) | ^1.1.0 | Relational data store |
| **Auth** | Clerk | ^7.2.7 | User identity (optional via flag) |
| **Styling** | Tailwind CSS | ^4.1.9 | Utility-first CSS |
| **UI Kit** | shadcn/ui + Radix | Latest | Accessible components |
| **AI** | Groq SDK | ^1.1.2 | `llama-3.3-70b-versatile` title generation |
| **Charts** | Recharts | 2.15.4 | Confidence curve visualization |
| **Push** | web-push | ^3.6.7 | VAPID-based notifications |
| **Offline** | idb | ^8.0.3 | IndexedDB wrapper for offline queue |
| **Export** | html2canvas | ^1.4.1 | DOM-to-PNG for share cards |
| **Forms** | react-hook-form + zod | 7.x / 3.x | Type-safe form validation |
| **Cron** | Vercel Cron | — | Automated morning-card cleanup |
| **Webhook Verification** | svix | ^1.92.2 | Clerk webhook signature validation |

---

## Project Structure

```
drunkva/
├── app/
│   ├── api/                          # 11 route handlers
│   │   ├── cheers/route.ts           # Toggle cheers (POST, no rate limit ⚠️)
│   │   ├── cron/morning-card/        # Daily session cleanup + push (inefficient ⚠️)
│   │   ├── drinks/route.ts           # Log drink + confidence recalc + PR check
│   │   ├── feed/route.ts             # Paginated social feed (N+1 queries ⚠️)
│   │   ├── follow/route.ts           # Follow/unfollow (POST)
│   │   ├── profile/route.ts          # Profile CRUD (DELETE unprotected ⚠️)
│   │   ├── push/                     # Subscribe + send notifications
│   │   ├── sessions/route.ts         # Session list + create
│   │   ├── sessions/[id]/route.ts    # Session CRUD (GET public ⚠️)
│   │   ├── title/route.ts            # AI title via Groq (no rate limit ⚠️)
│   │   ├── webhooks/clerk/           # Clerk user sync (validation gap ⚠️)
│   │   └── witnesses/                # Tag + confirm witnesses (5-person limit)
│   ├── feed/                         # Social feed page (Client)
│   ├── morning-card/                 # Post-session share flow (Client + Suspense)
│   ├── onboarding/                   # Name + alias setup (Client)
│   ├── privacy/                      # Static privacy policy
│   ├── profile/                      # Own profile + edit
│   ├── profile/[userId]/             # Public user profile (Client)
│   ├── profile/edit/                 # Profile editor (Client)
│   ├── session/                      # Active session + view (Client)
│   ├── sign-in / sign-up/            # Clerk auth pages
│   ├── terms/                        # Static terms policy
│   ├── error.tsx                     # Error boundaries
│   ├── global-error.tsx              # Global error handler
│   ├── layout.tsx                    # Root layout + providers
│   ├── manifest.ts                   # PWA manifest
│   ├── globals.css                   # Design tokens + utilities
│   └── page.tsx                      # Landing / auth redirect
├── components/
│   ├── drunkva/                      # App-specific (14 files)
│   │   ├── BottomNav.tsx             # Fixed footer navigation
│   │   ├── SessionStartScreen.tsx    # Pre-session setup
│   │   ├── LiveSessionScreen.tsx     # Active tracking (main interaction)
│   │   ├── QuickLogBar.tsx           # Drink logging buttons
│   │   ├── ConfidenceBlock.tsx       # Stage + progress bar
│   │   ├── ConfidenceChart.tsx       # Recharts curve visualization
│   │   ├── StatGrid.tsx              # 4-stat summary
│   │   ├── ExtrasSheet.tsx           # Burp/washroom/chakna drawer
│   │   ├── WitnessSheet.tsx          # Witness tagging UI
│   │   ├── FeedCard.tsx              # Social feed item (memoization issue ⚠️)
│   │   ├── MorningCardInner.tsx      # 3-step share flow (html2canvas overhead ⚠️)
│   │   ├── ShareOverlay/             # Two template exports (A, C)
│   │   ├── InstallPrompt.tsx         # PWA install banner
│   │   └── DrunkvaLogo.tsx           # Brand mark
│   └── ui/                           # shadcn/ui primitives (40+ files)
├── hooks/
│   ├── useOfflineQueue.ts            # IndexedDB offline action queue (SW sync bug ⚠️)
│   ├── useSessionTimer.ts            # Live session timer
│   ├── useUser.ts                    # Clerk/mock auth shim
│   ├── use-mobile.ts                 # Mobile viewport detection
│   └── use-toast.ts                  # Toast notifications
├── lib/
│   ├── auth.ts                       # getOrCreateUser() + requireOnboarding
│   ├── confidence.ts                 # Confidence algorithm + curve math (decay gap ⚠️)
│   ├── db.ts                         # Neon SQL client + types
│   ├── drink-speed.ts                # Speed normalization + PR logic
│   ├── groq.ts                       # AI title generation
│   ├── mock-user.ts                  # Dev-mode mock user
│   ├── rate-limit.ts                 # In-memory rate limiter (unbounded ⚠️)
│   ├── session-duration.ts           # Duration calculation + pause logic
│   └── utils.ts                      # Helpers (cn, formatLiveDuration, etc)
├── public/
│   ├── sw.js                         # Service Worker v2 (cache strategy issues ⚠️)
│   ├── offline.html                  # Offline fallback page
│   └── icons/                        # PWA icons (192x192, 512x512, etc)
├── scripts/
│   ├── migrate.mjs                   # DB migration runner
│   ├── backfill-pbs.mjs              # Personal best recalculation
│   ├── check-schema.mjs              # Schema inspection
│   ├── generate-icons.mjs            # PWA icon generation
│   └── test-groq.mjs                 # Groq API test harness
├── styles/
│   └── globals.css                   # Global styles + tokens
├── docs/
│   ├── AUDIT.md                      # Previous comprehensive audit
│   ├── PERFORMANCE_AUDIT.md          # Frontend performance deep dive
│   └── screenshots/                  # UI screenshots
├── middleware.ts                     # Clerk route protection
├── next.config.mjs                   # Next.js config + CSP headers ⚠️
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies + scripts
├── pnpm-lock.yaml                    # Locked dependency tree
├── vercel.json                       # Cron job configuration
├── postcss.config.mjs                # PostCSS config
├── components.json                   # shadcn/ui config
└── README.md                         # Product overview
```

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id                TEXT UNIQUE NOT NULL,
  real_name               TEXT NOT NULL,
  alias                   TEXT,
  avatar_url              TEXT,
  is_onboarded            BOOLEAN DEFAULT FALSE,
  -- Personal bests (seconds)
  pb_beer_seconds         INT,
  pb_shot_seconds         INT,
  pb_wine_seconds         INT,
  pb_cocktail_seconds     INT,
  pb_spirit_seconds       INT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_name              TEXT,
  location_lat            FLOAT,
  location_lng            FLOAT,
  start_time              TIMESTAMPTZ DEFAULT NOW(),
  end_time                TIMESTAMPTZ,
  total_duration_seconds  INT,
  active_duration_seconds INT,
  session_title           TEXT,
  peak_confidence_pct     INT DEFAULT 10,
  peak_stage              TEXT DEFAULT 'Baseline',
  washroom_count          INT DEFAULT 0,
  burp_count              INT DEFAULT 0,
  chakna_level            TEXT DEFAULT 'none', -- 'none' | 'light' | 'heavy'
  is_verified             BOOLEAN DEFAULT FALSE,
  morning_card_notified_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Drinks (individual log entries)
CREATE TABLE drinks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type              TEXT NOT NULL, -- 'beer' | 'shot' | 'spirit' | 'wine' | 'cocktail'
  logged_at         TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds  INT, -- speed measurement (10–900s range)
  timing_method     TEXT DEFAULT 'gap' CHECK (timing_method IN ('gap', 'stopwatch'))
);

-- Cheers (social likes)
CREATE TABLE cheers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  from_user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, from_user_id)
);

-- Follows
CREATE TABLE follows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

-- Witness tagging
CREATE TABLE session_witnesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  confirmed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

-- Push subscriptions
CREATE TABLE push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint        TEXT UNIQUE NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Account deletion feedback
CREATE TABLE account_deletions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Existing Indexes (Good)

```sql
CREATE INDEX idx_drinks_pr_lookup ON drinks (session_id, type, duration_seconds) WHERE duration_seconds IS NOT NULL;
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_open_start_time ON sessions (start_time) WHERE end_time IS NULL;
CREATE INDEX idx_drinks_session_logged_at ON drinks (session_id, logged_at);
```

### Missing Indexes (Performance Risk) ⚠️

These are heavily used in queries but lack indexes:
- `follows(follower_id, following_id)` — feed lookup
- `follows(following_id)` — used in feed for follower checks
- `cheers(session_id)` — counted in every feed row
- `sessions(end_time)` — used in morning-card cron range queries
- `push_subscriptions(user_id)` — used in every push dispatch

---

## API Layer

### Route Inventory

| Route | Methods | Auth | Status | Notes |
|-------|---------|------|--------|-------|
| `GET /api/sessions` | GET | ✅ User | ✅ Good | List own sessions |
| `POST /api/sessions` | POST | ✅ User | ✅ Good | Start new session |
| `GET /api/sessions/[id]` | GET | ❌ Public | 🔴 CRITICAL | Leaks private session data (location, etc) — should be auth-protected or scoped |
| `PATCH /api/sessions/[id]` | PATCH | ✅ User | ✅ Good | Update session |
| `DELETE /api/sessions/[id]` | DELETE | ✅ User | ⚠️ Issue | No transaction — cascading delete not atomic |
| `POST /api/drinks` | POST | ✅ User | ⚠️ Issue | Updates PB up to 5 times with separate SQL calls instead of batch |
| `GET /api/feed` | GET | ✅ User | 🔴 CRITICAL | N+1 query pattern — 20 sessions = 100+ queries |
| `POST /api/cheers` | POST | ✅ User | 🔴 CRITICAL | No rate limiting — vulnerable to spam |
| `POST /api/follow` | POST | ✅ User | ✅ Good | Follow/unfollow toggle |
| `GET /api/profile` | GET | ✅ User | ✅ Good | Own profile + stats |
| `PATCH /api/profile` | PATCH | ✅ User | ✅ Good | Update profile (partial OK via COALESCE) |
| `DELETE /api/profile` | DELETE | ✅ User | 🔴 CRITICAL | 7 sequential SQL ops with no transaction — partial delete possible |
| `POST /api/title` | POST | ✅ User | 🔴 CRITICAL | No rate limiting — Groq API costs unbounded |
| `POST /api/push/subscribe` | POST | ✅ User | ✅ Good | Register push subscription |
| `POST /api/push/send` | POST | Internal | ⚠️ Issue | Auth via `CLERK_SECRET_KEY` comparison — poor secret management |
| `POST /api/witnesses` | POST | ✅ User | ✅ Good | Tag witness (max 5) |
| `PATCH /api/witnesses/[id]` | PATCH | ✅ User | ✅ Good | Confirm/decline witness |
| `GET /api/witnesses/search` | GET | ✅ User | ⓘ Untested | User search endpoint (auth status unknown) |
| `POST /api/webhooks/clerk` | POST | Svix | 🔴 CRITICAL | Validation gap — missing null check for secret |
| `GET /api/cron/morning-card` | GET | CRON_SECRET | ⚠️ Inefficient | Per-session loops instead of batch SQL |

---

## Frontend Architecture

### Page Rendering Strategy

| Page | Type | Data | Issues |
|------|------|------|--------|
| `/` | Server | Redirect | — |
| `/onboarding` | Client | `useEffect` → fetch | Direct fetch, no SWR ⚠️ |
| `/session` | Client | localStorage + API | ✅ Good pattern |
| `/session/[id]` | Client | `useEffect` → fetch | Public view, direct fetch ⚠️ |
| `/feed` | Client | Manual fetch + polling | No SWR, duplicate requests ⚠️ |
| `/morning-card` | Client | `useEffect` → fetch | Direct fetch, no SWR ⚠️ |
| `/profile` | Client | Two parallel effects | Fetch `/api/profile` + `/api/sessions` ⚠️ |
| `/profile/edit` | Client | `useEffect` → fetch | Direct fetch, no SWR ⚠️ |
| `/profile/[userId]` | Client | `useEffect` → fetch | Public view, direct fetch ⚠️ |

**Pattern Issue:** All client pages use raw `fetch()` in `useEffect` with manual loading/error state. No SWR/React Query means:
- No request deduplication (back-nav re-fetches from scratch)
- No stale-while-revalidate (stale data persists)
- Multiple tabs = duplicate requests
- **Recommendation:** Add SWR + configure `revalidateOnFocus` + `dedupingInterval`

### Component Tree Issues

**FeedCard Re-renders on Every Poll** ⚠️
- File: [components/drunkva/FeedCard.tsx](components/drunkva/FeedCard.tsx)
- Problem: Feed polls `/api/feed` every 30s → full `setFeed([...])` → all FeedCards re-render
- Impact: 20 cards on screen × 30s polling = 20 unnecessary lifecycle runs per poll
- Fix: Wrap in `React.memo` with custom comparison checking only session ID + drink count + peak stage

**Duplicated Type Definitions** ⚠️
- Files: [app/session/page.tsx](app/session/page.tsx) + [components/drunkva/LiveSessionScreen.tsx](components/drunkva/LiveSessionScreen.tsx)
- `DrinkLog` and `SessionState` defined identically in both
- Fix: Extract to shared `types/domain.ts`

**Duplicated Auth Shim** ⚠️
- Files: 3+ pages (`onboarding`, `profile`, `feed`)
- Pattern repeated: `const useUser = CLERK_ENABLED ? useClerkUser : () => ({ user: MOCK_USER })`
- Fix: Already exists in [hooks/useUser.ts](hooks/useUser.ts) — consolidate all pages to import from there

---

## Core Business Logic

### Confidence Algorithm ([lib/confidence.ts](lib/confidence.ts))

Pure function modeling intoxication (10–99 scale):

```
Start at 10% → Add drink weight on each → Decay 5% per 30min gap after 90min idle
```

**Drink Weights:**
- Beer: +12
- Wine: +10
- Cocktail: +13
- Spirit: +15
- Shot: +18

**6 Named Stages:** Baseline → Bullish → Ascend → Climax → Half-life → Credits

**Time Decay Gap** ⚠️
- Decay is applied **between consecutive drinks only**
- If last drink is 3 hours old, no real-time decay to "now"
- Real-time decay only in `LiveSessionScreen` via `useMemo`
- Stored `peak_confidence_pct` doesn't account for decay
- **Fix:** Apply decay in API responses to "now" time before returning to client

### Session Duration ([lib/session-duration.ts](lib/session-duration.ts))

Clean separation:
- `calculateTotalDurationSeconds` — wall clock (start to end)
- `calculateActiveDurationSeconds` — capped inter-drink gaps at 2h (prevents counting sleep)
- `calculateLiveActiveDuration` — live version with pause flag

✅ **Well-designed pattern.**

### Drink Speed ([lib/drink-speed.ts](lib/drink-speed.ts))

- Speed range: 10–900 seconds
- Two methods: `gap` (estimated) vs `stopwatch` (user-timed)
- `getPreferredFastestDrink()` prefers stopwatch entries

✅ **Clean logic.**

---

## Authentication & Authorization

### Clerk Integration ([lib/auth.ts](lib/auth.ts))

- Conditional via `NEXT_PUBLIC_CLERK_ENABLED` flag (good for dev)
- `clerkMiddleware` in [middleware.ts](middleware.ts) protects private routes at edge
- Webhook syncs `user.created` + `user.updated` events

### getOrCreateUser() Pattern

Every API route calls `getOrCreateUser()`:
1. Check if Clerk enabled
2. Get `userId` from `auth()`
3. Lookup user in DB, create if missing

**Issue:** Hits DB on **every single API request** even when auth is confirmed by middleware. For high-traffic routes this adds latency.

**Fix:** Cache user lookup with Next.js `unstable_cache` or request-scoped memory cache.

### Authorization Gaps 🔴 CRITICAL

1. **`GET /api/sessions/[id]`** — Fully public, no auth check. Anyone who knows a session UUID can read all data including location coordinates.
   - **Fix:** Require auth; only return if user is session owner or session is marked public.

2. **`/api/witnesses/search`** — Not audited; probably public-ish.
   - **Fix:** Audit and validate auth requirements.

3. **`/api/push/send`** — Protected only by `CLERK_SECRET_KEY` comparison.
   - **Problem:** This key is long-lived and can't be rotated independently.
   - **Fix:** Create dedicated `INTERNAL_API_SECRET`.

---

## PWA & Offline Capabilities

### Service Worker ([public/sw.js](public/sw.js))

- Cache-first for static icons + manifest ✅
- Network-only for navigation + API ✅
- **Critical Bug:** `syncOfflineDrinks()` uses different IDB store name than `useOfflineQueue.ts` — background sync dead code ⚠️

**Store Mismatch:**
- `useOfflineQueue.ts` uses: `drunkva-offline` / `action-queue`
- `public/sw.js` uses: `drunkva-db` / `drunkva-offline-drinks`
- **Result:** Background Sync will never find queued drinks
- **Fix:** Unify store names or remove dead SW code

### Offline Queue ([hooks/useOfflineQueue.ts](hooks/useOfflineQueue.ts))

✅ **Well-implemented:**
- Queues API actions to IndexedDB when offline
- Syncs on `online` event + on mount
- Handles 4xx (permanent fail, delete) vs 5xx (retry)
- `justSynced` flash feedback is nice UX

**Issue:** Only syncs via `window.addEventListener('online')` — no visibility/focus triggers.
- **Fix:** Also sync on `visibilitychange` + app focus to catch tab resumption

### Install Prompt ([components/drunkva/InstallPrompt.tsx](components/drunkva/InstallPrompt.tsx))

✅ **Solid:**
- Intercepts `beforeinstallprompt`
- Persists dismissal to localStorage
- Good UX timing (not on first visit)

---

## Performance Analysis

### Backend Performance (5/10)

#### Critical Issues

1. **N+1 Query Pattern in Feed** ([app/api/feed/route.ts](app/api/feed/route.ts)) 🔴
   - Correlated subqueries per session: `drink_count`, `cheers_count`, `user_has_cheered`, `fastest_beer_seconds`, `confirmed_witness_count`
   - 20 sessions → 100+ queries
   - **Fix:** Single aggregation with LEFT JOINs + GROUP BY

2. **Unbounded In-Memory Rate Limiter** ([lib/rate-limit.ts](lib/rate-limit.ts)) ⚠️
   - `Map` grows unbounded; prune runs only when interval exists
   - Memory growth in long-lived processes
   - **Fix:** Add max key limit + LRU eviction; consider Redis for scale

3. **Missing Database Indexes** (See schema section above) ⚠️
   - Add: `follows(follower_id, following_id)`, `sessions(user_id, created_at)`, `drinks(session_id, logged_at)`, `push_subscriptions(user_id)`

4. **Inefficient Morning Card Cron** ([app/api/cron/morning-card/route.ts](app/api/cron/morning-card/route.ts)) ⚠️
   - Per-session loops with SELECT + UPDATE for each
   - Many round-trips
   - **Fix:** Batch updates with CASE/CTE SQL

5. **Missing Neon Connection Pooling** ([lib/db.ts](lib/db.ts)) ⚠️
   - No explicit pooling config for serverless
   - **Fix:** Configure Neon client pooling or use HTTP connector

### Frontend Performance (6/10)

#### Critical Issues

1. **html2canvas Overhead** ([components/drunkva/MorningCardInner.tsx](components/drunkva/MorningCardInner.tsx)) ⚠️
   - `buildExportBlob()` does heavy work (canvas, html2canvas, image load) on every share
   - Causes 1–3s pauses
   - **Fix:** Memoize results; debounce updates; consider Web Worker

2. **Service Worker Cache Strategy Too Aggressive** ([public/sw.js](public/sw.js)) 🔴
   - Caches `_next/static` fine, but can keep old HTML/bundles active
   - Prevents hotfix rollouts
   - Users stuck on stale, buggy code after deploy
   - **Fix:** Network-first for navigation HTML; bump cache name version to force update

3. **Layout Thrashing in Drag Handlers** ([components/drunkva/MorningCardInner.tsx](components/drunkva/MorningCardInner.tsx)) ⚠️
   - Frequent React state updates on `pointermove` cause layout recalc on every pixel move
   - **Fix:** Use refs for immediate UI updates; sync to React state throttled

4. **FeedCard Re-renders on Every Poll** (See Frontend Architecture) ⚠️
   - 30s feed polling re-renders all visible cards unnecessarily
   - **Fix:** Wrap in `React.memo` with semantic comparison

5. **No SWR/React Query** ⚠️
   - All pages use raw fetch in useEffect
   - No request deduplication, stale-while-revalidate, focus revalidation
   - **Fix:** Add SWR with proper config

---

## Security Posture

### Score: 7/10 (Above Average but Needs Hardening)

### Critical Issues 🔴

1. **Webhook Signature Validation Gap** ([app/api/webhooks/clerk/route.ts](app/api/webhooks/clerk/route.ts)) 🔴
   - If `CLERK_WEBHOOK_SECRET` is missing/misconfigured, verification may be bypassed
   - Attackers could forge webhook events to create/update users
   - **Fix:** Explicitly fail if secret is absent; return 500 + alert; add tests for verification

2. **Missing Rate Limiting on Cheers** ([app/api/cheers/route.ts](app/api/cheers/route.ts)) 🔴
   - No limiter; endpoint can be spammed to inflate cheers counts
   - **Fix:** Add `cheerLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })`

3. **Missing Rate Limiting on Title Generation** ([app/api/title/route.ts](app/api/title/route.ts)) 🔴
   - No limit on Groq API calls → unbounded API costs
   - **Fix:** Add `titleLimiter = createRateLimiter({ windowMs: 3600_000, max: 10 })` (10 per hour)

4. **Unprotected Public Session Read** ([app/api/sessions/[id]/route.ts](app/api/sessions/[id]/route.ts)) 🔴
   - `GET /api/sessions/[id]` has no auth check
   - Leaks location coordinates + all session metadata
   - **Fix:** Require auth; only return if owner or session explicitly marked public

5. **Poor Secret Management** ([app/api/push/send/route.ts](app/api/push/send/route.ts)) ⚠️
   - Uses `CLERK_SECRET_KEY` as internal API auth token
   - Can't rotate independently; violates principle of least privilege
   - **Fix:** Create `INTERNAL_API_SECRET` for internal service calls

### Important Issues ⚠️

6. **CSP Allows `unsafe-inline`** ([next.config.mjs](next.config.mjs)) ⚠️
   - CSP includes `'unsafe-inline'` + `'unsafe-eval'`
   - Inline scripts use `dangerouslySetInnerHTML` (geolocation stub)
   - **Fix:** Use nonces for inline scripts; remove unsafe flags in production

7. **Missing CSRF Protection on Profile DELETE** ([app/api/profile/route.ts](app/api/profile/route.ts)) ⚠️
   - No CSRF token or SameSite cookie enforcement
   - **Fix:** Require CSRF token or ensure SameSite=Strict cookies + server-side confirmation

8. **No UUID Validation on Path Parameters** (Partial)
   - `sessions/[id]/route.ts` has UUID regex ✅
   - Other endpoints may not validate
   - **Fix:** Validate all UUID params consistently

### Positive Security Practices ✅

- Parameterized queries throughout (no SQL injection risk)
- CORS configured
- Clerk auth middleware at edge
- Webhook signature verification via Svix
- Push subscriptions properly scoped to user

---

## Reliability & Data Integrity

### Score: 4/10 (Critical Issues)

### Race Conditions & Transactions 🔴

1. **Session Cascade Delete Race Condition** ([app/api/sessions/[id]/route.ts](app/api/sessions/[id]/route.ts)) 🔴
   - Multiple independent DB operations with no transaction
   - Between step 1 (delete session) and step 2 (recalc PB), another query could read inconsistent state
   - Could result in stale PB values or orphaned records
   - **Fix:** Wrap in `BEGIN TRANSACTION ... COMMIT` or use Neon's transaction client

2. **Profile DELETE Not Transactional** ([app/api/profile/route.ts](app/api/profile/route.ts)) 🔴
   - 7 sequential SQL operations: delete cheers, drinks, sessions, witnesses, push_subscriptions, follows, user
   - If step 4 fails, steps 1–3 are already committed
   - **Fix:** Wrap entire delete logic in transaction

3. **Personal Best Updates** ([app/api/drinks/route.ts](app/api/drinks/route.ts)) ⚠️
   - Up to 5 separate UPDATE statements for PB recalculation (one per drink type)
   - **Fix:** Batch into single UPDATE with CASE expressions

---

## Prioritized Fix List (Updated May 11, 2026)

### Critical (Deploy Before Next Release)
1. ✅ **[MAY 11 DONE]** Landing page mobile responsiveness — disabled GSAP on ≤768px, fixed typewriter wrapping
2. ✅ **[MAY 11 DONE]** Legal consent framework — Terms/Privacy pages, consent checkbox, DB persistence
3. Webhook signature validation — Add explicit null check for `CLERK_WEBHOOK_SECRET`
4. Wrap session DELETE in DB transaction to prevent cascade race conditions
5. Service Worker cache strategy & version bump to prevent stale code propagation

### High Priority (Within 1 Sprint)
6. ✅ **[MAY 11 DONE]** Replace runtime hover handlers with CSS classes (performance improvement)
7. ✅ **[MAY 11 DONE]** Add landing stats endpoint (`/api/landing-stats`) for public metrics
8. Refactor feed aggregation to remove N+1 queries (20 sessions → 100+ queries currently)
9. Use dedicated `INTERNAL_API_SECRET` instead of `CLERK_SECRET_KEY`
10. Add rate limiting to `/api/cheers` (currently unprotected)
11. Add rate limiting to `/api/title` (Groq API costs unbounded)
12. Add LRU eviction to in-memory rate limiter (`lib/rate-limit.ts`)
13. Add missing database indexes: `follows(follower_id, following_id)`, `sessions(end_time)`, `push_subscriptions(user_id)`

### Medium Priority (2 Sprints)
14. Enforce strict CSP in production (nonces for inline scripts)
15. Replace bare catch blocks with Sentry logging and user-friendly fallbacks
16. Add SWR/React Query to all data-fetching pages (currently use raw fetch in useEffect)

---

## Quick Wins (Can Ship Today)
1. ✅ **[MAY 11 DONE]** Centralize landing body typography with `.landing-body` utility
2. ✅ **[MAY 11 DONE]** Add live landing stats endpoint
3. ✅ **[MAY 11 DONE]** Fix typewriter timeout cleanup
4. Add UUID validation to follow/profile endpoints
5. Add logging to bare `catch` blocks
6. Bump Service Worker cache name to invalidate stale clients

---

_This document is maintained for AI agent context. Updated May 11, 2026 with latest improvements from landing redesign sprint._
   - Could partially update if one fails
   - **Fix:** Batch into single UPDATE with CASE expressions

### Data Integrity Issues ⚠️

4. **Hard-Close Sessions Without Duration Validation** ([app/api/cron/morning-card/route.ts](app/api/cron/morning-card/route.ts)) ⚠️
   - Auto-close logic treats empty-drink sessions as having duration = ACTIVE_GAP_CAP_SECONDS
   - Misrepresents reality (user may have had drinks that failed to log)
   - **Fix:** Mark auto-closed sessions with `was_auto_closed` flag; handle in UI

5. **Offline Queue Error Handling** ([hooks/useOfflineQueue.ts](hooks/useOfflineQueue.ts)) ⚠️
   - Assumes IndexedDB deletes always succeed; no dead-letter queue for failed deletions
   - **Fix:** Add try/catch + fallback storage for permanent failures

---

## Code Quality & Technical Debt

### Score: 6/10 (Fair, Needs Cleanup)

### Issues

1. **Duplicated Type Definitions** ⚠️
   - `DrinkLog` + `SessionState` in both [app/session/page.tsx](app/session/page.tsx) and [components/drunkva/LiveSessionScreen.tsx](components/drunkva/LiveSessionScreen.tsx)
   - **Fix:** Create `lib/types.ts` and import from there

2. **Duplicated Auth Shim** ⚠️
   - Pattern repeated in 3+ pages (onboarding, profile, feed)
   - **Fix:** All pages already have [hooks/useUser.ts](hooks/useUser.ts) — consolidate imports

3. **Bare Catch Blocks** (Multiple files) ⚠️
   - Silent failures in [hooks/useOfflineQueue.ts](hooks/useOfflineQueue.ts), [app/layout.tsx](app/layout.tsx), [MorningCardInner.tsx](components/drunkva/MorningCardInner.tsx)
   - Makes debugging hard
   - **Fix:** Log errors to Sentry; surface fallback behavior

4. **Inconsistent Null/Auth Checks** ⚠️
   - Some routes assume `getOrCreateUser()` always returns; others guard
   - **Fix:** Create `requireAuth()` helper that throws 401 consistently

5. **Missing Error Boundary** ⚠️
   - File: [components/drunkva/MorningCardInner.tsx](components/drunkva/MorningCardInner.tsx)
   - No error boundary for heavy html2canvas flow
   - **Fix:** Add React error boundary around export UI

6. **InstallPrompt Event Listener Cleanup** ⚠️
   - File: [components/drunkva/InstallPrompt.tsx](components/drunkva/InstallPrompt.tsx)
   - May not clean up if component unmounts before event
   - **Fix:** Add defensive timeout + ensure cleanup in useEffect

---

## Prioritized Fix List

### Tier 1: Critical (Ship Before Next Deploy)

These **must** be fixed before prod release to prevent security/data loss:

1. **Webhook Signature Validation** ([app/api/webhooks/clerk/route.ts](app/api/webhooks/clerk/route.ts))
   - Add explicit null check for `CLERK_WEBHOOK_SECRET`
   - Return 500 if missing
   - Add test case
   - **Impact:** Prevents forged user creation/updates
   - **Time:** 1–2 hours

2. **Wrap Session DELETE in Transaction** ([app/api/sessions/[id]/route.ts](app/api/sessions/[id]/route.ts))
   - Use Neon transaction client for atomic operations
   - **Impact:** Prevents race conditions + data inconsistency
   - **Time:** 2–3 hours

3. **Bump Service Worker Cache Version** ([public/sw.js](public/sw.js))
   - Change cache name: `drunkva-v2` → `drunkva-v3`
   - Use network-first for navigation HTML
   - **Impact:** Forces update on next deploy; prevents stale code rollout
   - **Time:** 1 hour

### Tier 2: High Priority (Next Sprint)

These have significant performance/security impact:

4. **Refactor Feed Aggregation** ([app/api/feed/route.ts](app/api/feed/route.ts))
   - Replace N+1 subqueries with single LEFT JOIN + GROUP BY
   - **Impact:** 10–20x speedup on feed load
   - **Time:** 4–6 hours

5. **Add Rate Limiting** (Multiple routes)
   - Cheers: 30 per 60s per user
   - Title: 10 per hour per user
   - **Impact:** Protects against spam + API cost overruns
   - **Time:** 2–3 hours

6. **Use Dedicated Internal Secret** ([app/api/push/send/route.ts](app/api/push/send/route.ts))
   - Replace `CLERK_SECRET_KEY` with `INTERNAL_API_SECRET`
   - **Impact:** Better secret isolation + rotationability
   - **Time:** 1 hour

7. **Add Missing Database Indexes**
   - Composite indexes on `follows`, `sessions`, `drinks`, `push_subscriptions`
   - **Impact:** 2–5x speedup on filtered queries
   - **Time:** 2 hours

8. **LRU Eviction on Rate Limiter** ([lib/rate-limit.ts](lib/rate-limit.ts))
   - Prevent unbounded memory growth
   - **Impact:** Stability on long-running servers
   - **Time:** 2 hours

### Tier 3: Medium Priority (Next 2 Sprints)

9. **Enforce Strict CSP** ([next.config.mjs](next.config.mjs))
   - Remove `unsafe-inline` / `unsafe-eval`
   - Use nonces for inline scripts
   - **Impact:** Stronger XSS protection
   - **Time:** 3–4 hours

10. **Centralized Error Logging** (All files)
    - Integrate Sentry or similar
    - Replace bare catch blocks
    - **Impact:** Better debugging + monitoring
    - **Time:** 4–6 hours

11. **Add SWR to All Pages** (Multiple)
    - Replace manual fetch + useEffect pattern
    - **Impact:** Better UX (instant back-nav, no duplicate requests)
    - **Time:** 6–8 hours

12. **Fix SW Offline Queue Sync** ([hooks/useOfflineQueue.ts](hooks/useOfflineQueue.ts), [public/sw.js](public/sw.js))
    - Unify IDB store names or remove dead code
    - Add visibility/focus triggers
    - **Impact:** True offline capability
    - **Time:** 3–4 hours

---

## Quick Wins

These are high-impact, low-effort fixes:

1. **Add UUID Validation to Witness Routes**
   - Validate UUIDs in path params
   - **Time:** 30 min
   - **Impact:** Prevents invalid DB lookups

2. **Add Logging to Bare Catch Blocks**
   - Replace 3 `catch {}` with logged errors
   - **Time:** 1 hour
   - **Impact:** Better debugging

3. **Bump SW Cache Name**
   - Change version to invalidate stale clients
   - **Time:** 5 min
   - **Impact:** Forces app update on deploy

4. **Add Webhook Secret Null Check**
   - Explicit validation in Clerk webhook
   - **Time:** 30 min
   - **Impact:** Prevents security bypass

5. **Memoize FeedCard**
   - Wrap with `React.memo` + comparison function
   - **Time:** 45 min
   - **Impact:** 95% reduction in feed re-renders

6. **Extract Duplicated Types**
   - Create `lib/types.ts` with `DrinkLog`, `SessionState`
   - **Time:** 1 hour
   - **Impact:** Reduced duplication

---

## Conclusion

Drunkva is a **well-architected MVP** with solid foundations but needs focused work on:
1. **Reliability:** Transactions, race conditions, offline sync
2. **Security:** Rate limiting, webhook validation, public route protection
3. **Performance:** N+1 queries, indexes, caching strategy
4. **Code Quality:** Deduplication, error handling, testing

**Recommended Next Steps:**
1. Ship Tier 1 critical fixes immediately
2. Schedule 1-2 sprint focused on Tier 2 (feed performance + rate limiting)
3. Plan offline/caching improvements as part of PWA expansion
4. Add monitoring (Sentry) to catch production issues early

**For AI Agents:**
Use this document as your context. When implementing features or fixes, refer back to the Tier lists and Security section. Always wrap DB mutations in transactions. Add rate limiting to new public endpoints. Test auth boundaries.

---

**Last Reviewed:** May 8, 2026  
**Next Review:** August 8, 2026 (or after Tier 1/2 fixes complete)
