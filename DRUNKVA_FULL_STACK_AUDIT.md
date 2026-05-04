# DRUNKVA — Full-Stack Health Check

**Generated:** 2026-05-03

## Executive Summary

Drunkva is a moderately mature social drinking tracker with solid MVP fundamentals but several categories of technical debt and production readiness gaps. Security posture is above-average (parameterized queries, CORS handling, rate limiting), but database reliability is fragile (no transactions, cascading deletes race conditions), performance is suboptimal (N+1 queries, unbounded cache, memory leaks), and mobile/PWA is incomplete (no offline reads, Service Worker cache strategy too aggressive).

## Audit Scoring (out of 10)
- **Backend Performance:** 5/10
- **Frontend Performance:** 6/10
- **Security:** 7/10
- **Reliability:** 4/10
- **Code Quality:** 6/10
- **Mobile/PWA:** 6/10

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

### Issues

#### 6.1 — Service Worker Cache Strategy
- File: `public/sw.js`
- Problem: SW caching prevents hotfix propagation.
- Fix: Bump cache names (`drunkva-v3` → `drunkva-v4`) and use network-first for navigation HTML.

#### 6.2 — Offline Queue Sync Triggers
- File: `hooks/useOfflineQueue.ts`
- Problem: syncs on `online` only; misses resume/visibility changes.
- Fix: also sync on `visibilitychange` and on app focus.

#### 6.3 — No Offline Read Capability
- Problem: app caches only write actions; reads fall back to network-only.
- Fix: cache API responses in IndexedDB for offline reads and show stale indicator.

#### 6.4 — Push Permission Timing
- Problem: requesting push early yields low opt-in.
- Fix: request push after first user activation (e.g., after first logged drink).

#### 6.5 — Geolocation Permission Remains for Some Users
- File: `app/layout.tsx`
- Status: partially fixed by geolocation stub; old SW caches may still serve older bundles.
- Fix: bump SW version and set localStorage flag when stub runs to surface UI message.

---

## Top 10 Prioritized Fixes

### Critical (Do before next prod deploy):
1. Webhook signature validation — Add explicit null check for `CLERK_WEBHOOK_SECRET`.
2. Wrap session DELETE in DB transaction.
3. Service Worker cache strategy & version bump.

### High (Do within 1 sprint):
4. Refactor feed aggregation to remove N+1 queries.
5. Use dedicated `INTERNAL_API_SECRET` instead of `CLERK_SECRET_KEY`.
6. Add rate limiting to `/api/cheers`.
7. Add LRU eviction to in-memory rate limiter.
8. Add DB indexes (follows, sessions, drinks, push_subscriptions).

### Medium (2 sprints):
9. Enforce strict CSP in production (nonces).
10. Replace bare catches with logged errors and integrate Sentry.

---

## Single Most Dangerous Issue

**Webhook signature validation** (`app/api/webhooks/clerk/route.ts`) — if the webhook secret is missing or misused, attackers can forge Clerk webhook events to create or update users. This is the highest-priority security fix.

---

## Quick Wins
1. Add UUID validation to follow/profile endpoints.
2. Add rate limiting to `/api/cheers`.
3. Add logging to bare `catch` blocks.
4. Bump Service Worker cache name to invalidate stale clients.

---

## Next Steps
1. Implement critical fixes (webhook validation, transactional deletes, SW version bump) before next prod deploy.
2. Schedule a database optimization sprint to add indexes and refactor N+1 queries.
3. Add centralized error logging and monitoring (Sentry) to capture production exceptions.
4. Plan offline-read capability in next major release for true PWA behavior.

---

_If you'd like, I can open `DRUNKVA_FULL_STACK_AUDIT.md` in the editor, run tests, or start implementing the top critical fix (webhook validation) now._
