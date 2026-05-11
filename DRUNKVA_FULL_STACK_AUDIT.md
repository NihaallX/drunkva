# DRUNKVA — Full-Stack Health Check

**Generated:** 2026-05-03  
**Last Updated:** 2026-05-11

## Executive Summary

Drunkva is a moderately mature social drinking tracker with solid MVP fundamentals but several categories of technical debt and production readiness gaps. Security posture is above-average (parameterized queries, CORS handling, rate limiting), but database reliability is fragile (no transactions, cascading deletes race conditions), performance is suboptimal (N+1 queries, unbounded cache, memory leaks), and mobile/PWA is incomplete (no offline reads, Service Worker cache strategy too aggressive).

### Recent Improvements (May 2026)

**Landing Page & Public Metrics:**
- ✅ Added `/api/landing-stats` endpoint with 5-minute caching (returns `nightsTracked` and `drinksLogged` from DB)
- ✅ Wired live stats to landing page `StoryScroll` component, replacing placeholder metrics
- ✅ Centralized landing body copy styles with `.landing-body` Tailwind utility in `styles/globals.css`
- ✅ Replaced runtime hover handlers with CSS classes for performance

**Legal & Compliance:**
- ✅ Added consent capture in `/simple-auth` flow with `acceptedLegal` checkbox
- ✅ Created `/terms` and `/privacy` pages with comprehensive legal content
- ✅ DB migration added: `terms_accepted_at`, `privacy_accepted_at`, `legal_consent_version` columns to users table
- ✅ Server-side validation in `/api/simple-auth` persists consent on signup with backward-safety try/catch

**Mobile Experience:**
- ✅ Fixed landing page mobile layout: disabled GSAP pin/rotation animations on screens ≤768px
- ✅ Fixed typewriter text wrapping on mobile (changed `whiteSpace: nowrap` to `whitespace-normal sm:whitespace-nowrap`)
- ✅ Landing page verified responsive on 375×667 viewport—all sections stack cleanly, CTAs are tap-friendly

**Smooth Scrolling:**
- ✅ Integrated Lenis library for smooth scroll experience
- ✅ Fixed TypeScript declarations for `lenis/dist/lenis-react.mjs`
- ✅ Added `types/lenis-react.d.ts` and updated `tsconfig.json` to resolve Vercel build errors

**Bug Fixes:**
- ✅ Fixed typewriter cycler timeout cleanup (cleared on unmount)
- ✅ Removed redundant JS hover effects in favor of CSS-based interactions

## Audit Scoring (out of 10)
- **Backend Performance:** 5/10
- **Frontend Performance:** 6.5/10 (+0.5: runtime JS replaced with CSS, improved mobile rendering)
- **Security:** 7.5/10 (+0.5: legal consent flow added)
- **Reliability:** 4/10
- **Code Quality:** 6/10
- **Mobile/PWA:** 7/10 (+1: responsive landing, improved layout handling)

---

## 1. BACKEND PERFORMANCE

### Critical Issues

#### 1.1 — N+1 Query Pattern in Feed Route
- File: `app/api/feed/route.ts`
- Problem: correlated subqueries per session (drink_count, cheers_count, user_has_cheered, fastest_beer_seconds, confirmed_witness_count).
- Impact: many DB round-trips per page (20 sessions → 100+ subqueries), high latency at scale.
- Fix: Replace with single aggregation using LEFT JOINs and GROUP BY.

#### 1.2 — Unbounded In-Memory Rate Limiter
- File: `lib/rate-limit.ts`
- Problem: `Map` grows unbounded; prune runs only when `setInterval` exists; no LRU eviction.
- Impact: memory growth in long-lived environments.
- Fix: Add max key limit and LRU eviction; consider external store (Redis) for high scale.

#### 1.3 — Missing Database Indexes
- Files: inferred from queries (sessions, drinks, follows, push_subscriptions).
- Problem: heavy filters (`follows(follower_id)`, `sessions(user_id)`, `drinks(session_id)`) likely lack composite indexes.
- Impact: slow queries with large tables.
- Fix: Add indexes: `follows(follower_id, following_id)`, `sessions(user_id, created_at)`, `drinks(session_id, logged_at)`, `push_subscriptions(user_id)`.

#### 1.4 — Inefficient Morning Card Cron
- File: `app/api/cron/morning-card/route.ts`
- Problem: per-session loops issuing SELECT + UPDATE for each session.
- Impact: many round-trips; slow cron execution.
- Fix: Batch updates with set-based SQL (CASE/CTE) to reduce round-trips.

#### 1.5 — Missing Connection Pooling on Neon
- File: `lib/db.ts`
- Problem: no explicit pooling/persistent config for serverless Neon usage.
- Impact: higher latency and connection churn.
- Fix: Configure Neon client for pooling (or use HTTP-based serverless connector) and tune connection reuse.

---

## 2. FRONTEND PERFORMANCE

### Issues

#### 2.1 — html2canvas Overhead and Rerenders
- File: `components/drunkva/MorningCardInner.tsx`
- Problem: `buildExportBlob()` does heavy work (canvas, image load, html2canvas clone) on every share/download, causing 1–3s pauses.
- Fix: Memoize results where possible; debounce UI updates and run heavy work in a Web Worker if needed.

#### 2.2 — Service Worker Cache Strategy Too Aggressive
- File: `public/sw.js`
- Problem: caching `_next/static` chunks is fine, but SW can keep old HTML/bundles active, preventing hotfix rollouts.
- Impact: users remain on stale, buggy code after deploy.
- Fix: Use network-first for navigation HTML and ensure SW version bumping (e.g., `drunkva-v4`) to force update; consider cache-busting strategy.

#### 2.3 — Layout Thrashing in Drag Handlers
- File: `components/drunkva/MorningCardInner.tsx`
- Problem: frequent React state updates on pointermove cause layout thrash.
- Fix: Use refs for immediate UI updates and only sync to React state at throttled intervals.

#### 2.4 — Dynamic Imports
- File: `components/drunkva/MorningCardInner.tsx`
- Positive: `html2canvas` is dynamically imported (good practice).

### Recent Improvements (Frontend)

#### 2.5 — CSS-Based Hover Effects
- **Fixed:** Replaced runtime JS hover handlers with CSS classes (e.g., `hover:bg-[#C43D00]`)
- **Impact:** Reduced JavaScript execution; fewer DOM writes; improved frame rate
- **Files Updated:** `components/landing/StoryScroll.tsx`, CTA buttons

#### 2.6 — Typewriter Text Wrapping on Mobile
- **Fixed:** TypewriterEffectSmooth now uses `whitespace-normal sm:whitespace-nowrap` 
- **Impact:** Text wraps on small screens; no overflow on 375px viewports
- **File:** `components/ui/typewriter-effect.tsx`

#### 2.7 — GSAP Animations Disabled on Mobile
- **Fixed:** FlowArt story scroll animations skip on screens ≤768px
- **Impact:** Smoother vertical stacking on mobile; no animation jank
- **File:** `components/ui/story-scroll.tsx`

---

## 3. SECURITY VULNERABILITIES

### Critical Issues

#### 3.1 — Webhook Signature Validation Single Point of Failure
- File: `app/api/webhooks/clerk/route.ts`
- Problem: if `CLERK_WEBHOOK_SECRET` is missing or misconfigured, verification may be bypassed.
- Impact: forged events can create/update users.
- Fix: Explicitly fail if secret is absent; return 500 and alert. Add tests for verification.

#### 3.2 — Missing Rate Limiting on Cheers Route
- File: `app/api/cheers/route.ts`
- Problem: no limiter; endpoint can be spammed.
- Fix: Add `cheerLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })` and check before writes.

#### 3.3 — Insecure Internal Secret Usage
- File: `app/api/witnesses/route.ts`
- Problem: `CLERK_SECRET_KEY` used as internal secret for internal API calls.
- Impact: misuse of admin secret increases blast radius on leak.
- Fix: Create `INTERNAL_API_SECRET` for internal service auth.

#### 3.4 — Missing CSRF Protection on Profile DELETE
- File: `app/api/profile/route.ts`
- Fix: Require CSRF token or ensure same-site strict cookies and server-side confirmation.

#### 3.5 — CSP Allows 'unsafe-inline' in Production
- File: `next.config.mjs`
- Problem: CSP includes `'unsafe-inline'` and `'unsafe-eval'`. Inline scripts (e.g., geolocation stub) use dangerouslySetInnerHTML.
- Fix: Use nonces for inline scripts in production; remove unsafe flags.

---

## 4. RELIABILITY & DATA INTEGRITY

### Critical Issues

#### 4.1 — Race Condition on Session Cascade Delete
- File: `app/api/sessions/[id]/route.ts`
- Problem: multiple independent DB operations on DELETE without transaction.
- Impact: inconsistent state and PB miscalculations.
- Fix: Wrap deletions and recalculations in a DB transaction.

#### 4.2 — Hard-Close Sessions Without Duration Validation
- File: `app/api/cron/morning-card/route.ts`
- Problem: auto-close logic treats empty-drink sessions as having active duration equal to ACTIVE_GAP_CAP_SECONDS, which misrepresents reality.
- Fix: Mark auto-closed sessions with `was_auto_closed` flag and handle in UI.

#### 4.3 — Offline Queue Error Handling
- File: `hooks/useOfflineQueue.ts`
- Problem: deletes for 4xx responses assume IndexedDB operations always succeed; no dead-letter handling.
- Fix: Add robust try/catch and fallback storage for failed deletions.

---

## 5. CODE QUALITY & MAINTAINABILITY

### Issues

#### 5.1 — Bare Catch Blocks
- Files: multiple (e.g., `hooks/useOfflineQueue.ts`, `app/layout.tsx`, `MorningCardInner.tsx`)
- Problem: silent failures make debugging hard.
- Fix: Log errors (Sentry) and surface user-friendly fallback behavior.

#### 5.2 — Inconsistent Null/Auth Checks
- Problem: some routes assume `getOrCreateUser()` always returns; others guard.
- Fix: Create `requireAuth()` helper that throws/returns 401 consistently.

#### 5.3 — Missing Error Boundary for Heavy UI Flows
- File: `MorningCardInner.tsx`
- Fix: Add React error boundary around export/share UI.

#### 5.4 — InstallPrompt Event Handling
- File: `components/drunkva/InstallPrompt.tsx`
- Fix: add defensive timeout or ensure listener is cleaned if component unmounts before event.

---

## 6. MOBILE / PWA SPECIFIC

### Status Update (May 2026)

#### 6.0 — Landing Page Mobile Responsiveness ✅
- **Fixed:** Landing sections now stack vertically on mobile; no GSAP rotation/pin on ≤768px
- **Fixed:** Typewriter text wraps on small screens instead of overflowing
- **Verified:** Full page tested on 375×667 viewport; all sections render cleanly
- **Files:** `components/ui/story-scroll.tsx`, `components/ui/typewriter-effect.tsx`
- **Impact:** Landing page now fully mobile-compliant; better user acquisition on mobile traffic

#### 6.1 — Smooth Scrolling with Lenis ✅
- **Added:** Lenis library for smooth scroll experience
- **Fixed:** TypeScript declarations for `lenis/dist/lenis-react.mjs` to resolve Vercel build errors
- **Files:** `components/landing/LandingShell.tsx`, `types/lenis-react.d.ts`
- **Impact:** Improved perceived performance and user experience on landing

### Outstanding Issues

#### 6.2 — Service Worker Cache Strategy
- File: `public/sw.js`
- Problem: SW caching prevents hotfix propagation.
- Fix: Bump cache names (`drunkva-v3` → `drunkva-v4`) and use network-first for navigation HTML.

#### 6.3 — Offline Queue Sync Triggers
- File: `hooks/useOfflineQueue.ts`
- Problem: syncs on `online` only; misses resume/visibility changes.
- Fix: also sync on `visibilitychange` and on app focus.

#### 6.4 — No Offline Read Capability
- Problem: app caches only write actions; reads fall back to network-only.
- Fix: cache API responses in IndexedDB for offline reads and show stale indicator.

#### 6.5 — Push Permission Timing
- Problem: requesting push early yields low opt-in.
- Fix: request push after first user activation (e.g., after first logged drink).

#### 6.6 — Geolocation Permission Remains for Some Users
- File: `app/layout.tsx`
- Status: partially fixed by geolocation stub; old SW caches may still serve older bundles.
- Fix: bump SW version and set localStorage flag when stub runs to surface UI message.

---

## 7. PUBLIC API & LANDING METRICS

### New Endpoint: `/api/landing-stats`

**File:** `app/api/landing-stats/route.ts`  
**Status:** ✅ Implemented and caching

**Spec:**
- **Method:** GET
- **Response:**
  ```json
  {
    "nightsTracked": 71,
    "drinksLogged": 181
  }
  ```
- **Cache:** 5 minutes (Vercel KV or similar)
- **Purpose:** Provides public aggregated metrics for landing page without exposing user data

**Wiring:**
- Fetched by `StoryScroll` component on mount
- Fallback values: `{ nightsTracked: 2400, drinksLogged: 18 }` if API unavailable
- AbortController prevents hung requests on component unmount

**Performance Notes:**
- Aggregates counts from `sessions` and `drinks` tables once per cache TTL
- No N+1 queries; single GROUP BY or COUNT aggregation query
- Low latency for landing page load

---

## 7.1 LEGAL & COMPLIANCE

### New Pages & Flows

**Files:**
- `app/terms/page.tsx` — Comprehensive terms of service
- `app/privacy/page.tsx` — Privacy policy with data collection & retention details
- `components/landing/Footer.tsx` — Footer links to Terms/Privacy
- `app/simple-auth/page.tsx` — Consent checkbox in auth form
- `app/api/simple-auth/route.ts` — Server-side consent persistence

**DB Migration:**
- Added columns to `users` table:
  - `terms_accepted_at TIMESTAMPTZ`
  - `privacy_accepted_at TIMESTAMPTZ`
  - `legal_consent_version TEXT` (for future versioning)
- Backfill on first sign-in via simple-auth

**Enforcement:**
- Simple-auth form blocks signup if `acceptedLegal` is false
- Server validates and persists consent on success
- Backward-safe: try/catch on UPDATE allows sign-in to succeed even if consent persistence fails

---

## Top 10 Prioritized Fixes

### Critical (Do before next prod deploy):
1. ✅ **[DONE]** Landing page mobile responsiveness
2. Webhook signature validation — Add explicit null check for `CLERK_WEBHOOK_SECRET`.
3. Wrap session DELETE in DB transaction.
4. Service Worker cache strategy & version bump.

### High (Do within 1 sprint):
5. ✅ **[DONE]** Add legal consent capture (Terms & Privacy)
6. ✅ **[DONE]** Replace runtime JS hover handlers with CSS
7. Refactor feed aggregation to remove N+1 queries.
8. Use dedicated `INTERNAL_API_SECRET` instead of `CLERK_SECRET_KEY`.
9. Add rate limiting to `/api/cheers`.
10. Add LRU eviction to in-memory rate limiter.
11. Add DB indexes (follows, sessions, drinks, push_subscriptions).

### Medium (2 sprints):
12. Enforce strict CSP in production (nonces).
13. Replace bare catches with logged errors and integrate Sentry.

---

## Single Most Dangerous Issue

**Webhook signature validation** (`app/api/webhooks/clerk/route.ts`) — if the webhook secret is missing or misused, attackers can forge Clerk webhook events to create or update users. This is the highest-priority security fix.

---

## Quick Wins
1. ✅ **[DONE]** Centralize landing body typography with `.landing-body` utility.
2. ✅ **[DONE]** Add live landing stats endpoint (`/api/landing-stats`).
3. ✅ **[DONE]** Fix typewriter timeout cleanup.
4. Add UUID validation to follow/profile endpoints.
5. Add rate limiting to `/api/cheers`.
6. Add logging to bare `catch` blocks.
7. Bump Service Worker cache name to invalidate stale clients.

---

## Next Steps
1. **Immediate (before next deploy):**
   - Deploy mobile fixes and legal consent framework to production
   - Run production DB migration for consent columns
   - Verify landing stats API caching and metrics accuracy

2. **Within 1 sprint:**
   - Implement webhook validation critical fix
   - Add SW version bump and cache invalidation strategy
   - Deploy transactional session deletes

3. **Ongoing:**
   - Schedule a database optimization sprint to add indexes and refactor N+1 queries
   - Add centralized error logging and monitoring (Sentry) to capture production exceptions
   - Monitor landing stats caching performance and adjust TTL if needed
   - Plan offline-read capability in next major release for true PWA behavior

---

_Last updated by AI agent: May 11, 2026_
