# Gary — Sprint 3 Analytics Layer (Phase 5, Item 5)

**Date:** 2026-05-30
**Role:** Gary (QA / test + instrumentation)
**Branch:** `feat/sprint3-sentry-analytics`
**Decision applied (Sky):** Extend Sentry, do NOT add PostHog/Amplitude. Keep vendor footprint small.

---

## What was built

A thin, no-PII analytics wrapper over the already-wired Sentry SDK, plus
instrumentation of the key product events. Events become Sentry **breadcrumbs**;
the current screen becomes a Sentry **tag**. Everything is synchronous with no
network calls of its own.

### `src/lib/analytics.ts` (extended, not replaced — see Decision below)

New public API (the spec's three functions):
- `trackEvent(name, properties?)` → `Sentry.addBreadcrumb({ category: 'analytics', message, data })`
- `trackScreen(screenName)` → `Sentry.setTag('screen', name)` + navigation breadcrumb
- `trackError(error, context?)` → `Sentry.captureException(error, { extra })`

Supporting:
- `stripPII(props)` — the load-bearing PII guard. Single chokepoint. Drops
  forbidden keys (case-insensitive) and any non-primitive value.
  - **Exact-key denylist** (short/ambiguous names): `lat`, `lng`, `latitude`,
    `longitude`, `coords`, `coordinates`, `name`, `email`, `content`, `comment`,
    `description`, `address`, `phone`, `token`, `secret`, `password`.
  - **Substring denylist** (long/unambiguous): `user_id`, `userid`, `flag_id`,
    `flagid`, `display_name`, `displayname`, `username`, `email`, `description`,
    `password`, `secret`.
  - Deliberately does **not** substring-match `lat`/`comment` — that would wrongly
    strip the allowed `platform` and `comment_length_bucket`. (Covered by a
    regression test.)
- `commentLengthBucket(len)` → `'short' | 'medium' | 'long'` (so we log a bucket,
  never the comment text).
- Legacy `track()` + `AnalyticsEvent` catalog kept for backward-compat, now
  **routed through `trackEvent`** so the 4 pre-existing callsites
  (SignInScreen, TasksScreen, ReportFlagModal, PlatformMap.web) emit to Sentry
  *and* get PII-scrubbed (the old catalog had `flagId` in two events — now
  stripped automatically).
- `identifyUser` / `resetUser` kept but intentionally **never send the user id
  to Sentry** (that's exactly the PII we avoid) — dev-console only.

### Instrumented callsites

| Event | Location | Non-PII props logged |
|---|---|---|
| `flag_created` | `ReportFlagModal.tsx` (pre-existing `track`, now reaches Sentry) | category, severity, hasPhoto |
| `flag_status_updated` | `flags.ts › updateFlagStatus` (lib chokepoint — covers ALL status changes) | to_status, platform |
| `photo_added` | `photos.ts › addFlagPhoto` | photo_count, platform |
| `comment_added` | `comments.ts › addComment` | comment_length_bucket, platform |
| `app_session_started` | `App.tsx` (useEffect on mount) | platform |
| `onboarding_completed` | `OnboardingModal.tsx` ("Get started") | platform |
| `onboarding_skipped` | `OnboardingModal.tsx` (Skip / hardware back) | platform |

**Properties are non-PII only.** Never logged anywhere: `user_id`, `flag_id`,
`lat`, `lng`, `description` text, `display_name`, `email`.

### Tests
- `src/lib/__tests__/analytics.test.ts` — asserts (a) events reach Sentry
  (addBreadcrumb / setTag / captureException), (b) PII fields are stripped if
  accidentally passed, (c) the no-over-strip regression (platform /
  comment_length_bucket survive), (d) legacy `track()` strips `flagId`, (e)
  `stripPII` drops non-primitives + is case-insensitive, (f)
  `commentLengthBucket` boundaries.
- `jest.setup.js` — added a global `@sentry/react-native` mock so suites that now
  transitively import `analytics.ts` (photos, comments, flags) don't hit the
  native module. Methods are `jest.fn()`s for assertions.

---

## DECISIONS FOR SKY

1. **`src/lib/analytics.ts` already existed** (commit `a6fdb36`, a Phase-2 no-op
   `track()` scaffold) and was already imported by 4 files. The brief said
   "new file." I **extended** it rather than replacing it — lowest risk,
   preserves the 4 working callsites, and routing the legacy `track()` through
   the new PII chokepoint is a net privacy *improvement* (the old catalog logged
   `flagId`; it's now stripped). If you'd prefer a clean replacement (migrate the
   4 callsites to `trackEvent` and delete the legacy catalog), say so and I'll
   do that pass.

2. **`reopen_requested` has no client callsite to instrument.** The reopen
   mechanism (F10) is a propose-only migration
   (`2026-05-30_flag_reopen_requests.sql`, not applied); there is no RPC/lib
   function in the app that requests a reopen yet — only `reopen_requests`
   columns in `database.ts`. The event is ready to fire; I left the callsite
   **unwired and documented** rather than invent a call. Wire it where the
   reopen client function lands.

3. **Jordan gate (per PHASE5_STRATEGY §1 Item 5 + §4):** the no-PII event schema
   is a **Jordan privacy gate**, not just a guideline. This implementation
   enforces no-PII in code (the `stripPII` chokepoint), but Jordan should still
   review the event list + the Sentry `beforeSend` scrubber (separate config) for
   the privacy policy / disclosure obligation. Surfacing via this report for
   Morgan → Jordan.

4. **Ops note (Steve, per strategy):** no analytics write key is introduced —
   we reuse the existing `EXPO_PUBLIC_SENTRY_DSN`. No new secret to handle.

---

## Quality gates — PASS ✅

- **`npm run typecheck` → clean (exit 0).**
- **`npm test` → 84 suites passed, 1334 tests passed, 18 todo, 0 failed** (incl. the new `analytics.test.ts`).

### Concurrent-churn incident (resolved)
A parallel agent (Shamus, "App.tsx blocker") had an in-progress, broken
`App.tsx` in the shared working tree — a **duplicate `Sentry` import**
(`import { ... Sentry } from '@/lib/sentry'` *and* `import * as Sentry from
'@sentry/react-native'`) → `TS2300`. Two things went wrong because of it:
1. My two `App.tsx` edits initially failed ("File modified since read") — the
   file was being rewritten under me, so my `app_session_started`
   instrumentation didn't land on the first pass.
2. My first commit accidentally captured that broken `App.tsx` snapshot.

**Resolution:** once the working-tree `App.tsx` was clean again, I re-applied my
one-line instrumentation and **amended my commit** so it now carries a clean,
single-import, instrumented `App.tsx`. Verified: `git show HEAD:App.tsx` has
**zero** `@sentry/react-native` imports, the `@/lib/sentry` import on line 2,
`trackEvent` import, and the `app_session_started` call. Typecheck + tests
green afterward. (Reinforces the standing note: parallel agents churn the
shared tree — commit your own files fast, and re-verify `App.tsx` specifically.)

---

## Files changed (committed on `feat/sprint3-sentry-analytics`)
- `src/lib/analytics.ts` (extended)
- `src/lib/__tests__/analytics.test.ts` (new)
- `jest.setup.js` (added Sentry mock)
- `src/lib/photos.ts`, `src/lib/comments.ts`, `src/lib/flags.ts` (instrument)
- `App.tsx`, `src/screens/OnboardingModal.tsx` (instrument)
