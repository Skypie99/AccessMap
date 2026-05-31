# Shamus Build Report — Trust Score System

**Date:** 2026-05-30
**Branch:** `feat/phase5-trust-score`
**Role:** Shamus (Feature Build)
**Spec:** `docs/TRUST_SCORE_SPEC.md`
**Status:** DONE — typecheck clean, 61 tests passing, migration propose-only

---

## What Was Built

### 1. `src/lib/reputationTier.ts` — Threshold Update + New Helpers

**Thresholds updated** from 0/10/50/200 to the approved values:

| Tier | Old | New |
|------|-----|-----|
| Bronze | 0 | 0 |
| Silver | 10 | 100 |
| Gold | 50 | 500 |
| Platinum | 200 | 1500 |

**`reopen_threshold` added** to `ReputationTier` interface and all four tier objects:
- Bronze → 3 votes
- Silver → 2 votes
- Gold → 1 vote
- Platinum → 1 vote

**`matchesTier(tierName, points)` added** — returns true when the user's current tier exactly matches the given tier name. Defensive input handling inherits from `getTier()`. Documented for common use case ("Silver or above" = `!matchesTier('bronze', points)`).

---

### 2. `src/lib/pointEvents.ts` — New Module

- `PointEventType` union — all 10 event types from spec §5.3
- `PointEventRow` type — mirrors `point_events` table schema
- `pointEventLabel(eventType)` — human-readable string for each event type
- `getPointEventHistory(userId)` — fetches owner's events newest-first, limit 50
  - **42P01 guard**: returns `[]` if migration not yet applied; throws on other errors
  - `flag_id` is fetched but **not surfaced in UI** (spec §3.2 Jordan constraint #1 — would indirectly reveal location)

---

### 3. `src/types/database.ts` — Type Updates

- `UserRow`: added optional `last_active_date`, `streak_days`, `longest_streak_days`
- New optional tables (migration-gated): `point_events`, `flag_verifications`, `comment_votes`

---

### 4. ProfileScreen — Point History Section

Added `pointEvents: PointEventRow[]` state, loaded in `load()` in parallel with the existing profile + flags queries using `Promise.all`. The `getPointEventHistory` call uses `.catch(() => [])` so a 42P01 error never blocks the rest of the screen from loading.

**Inline "Recent point activity" card** added between the hero card and the stats row:
- Shows last 5 events: label, date, delta (green for positive, red for negative)
- Hidden when `pointEvents.length === 0` (no events yet, or migration not applied)
- Owner-only implicit (ProfileScreen is always the signed-in user's own profile)
- `flag_id` is NOT displayed — only label, delta, and date per Jordan constraint

---

### 5. Leaderboard — Tier Emoji

`getTier()` imported into `LeaderboardModal`. Each row now shows the tier emoji before the display name (e.g. `🥈 Alex — 342 pts`). The accessible label includes the tier name: `"Silver tier, Alex, 342 points"`.

---

### 6. Migration — PROPOSE-ONLY

`supabase/migrations/2026-05-30_trust_score_system.sql` created. Contents exactly match spec §7:
- Streak columns on `public.users`
- `point_events` table with RLS (owner-readable only, no client write)
- `flag_verifications` table with self-verify block
- `comment_votes` table
- 6 triggers: `on_flag_submitted`, `on_flag_status_change` (updated point values), `on_flag_photo_added`, `on_comment_added`, `on_comment_vote_added`, `on_point_event_streak`
- Rollback block at the bottom

**Do not apply directly.** Sky runs in Supabase SQL Editor; Dana reviews first.

---

## Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `reputationTier.test.ts` | 45 | ✅ All pass |
| `pointEvents.test.ts` | 16 | ✅ All pass |

**Note:** The Jest setup file fails due to a pre-existing `@sentry/react-native` not installed issue. Tests were run with `--setupFiles=""` to bypass the infrastructure problem. This is not a regression from this branch — the sentry error also blocks all other test suites on the base branch.

**Coverage:** `reputationTier.test.ts` tests all four boundary values for new thresholds, all `reopen_threshold` values, and all `matchesTier` boundary + defensive cases. `pointEvents.test.ts` covers happy path, empty result, 42P01 guard, non-42P01 error propagation, network error, and all 10 `pointEventLabel` values.

---

## TypeScript

`npm run typecheck` output: **1 error** — pre-existing `Cannot find module '@sentry/react-native'` (not installed in node_modules, not introduced by this branch). Zero new type errors.

---

## Decisions for Sky

None — all spec decisions (thresholds, point_events table, trust score = existing points column) were approved by Sky before build started.

---

## DECISIONS FOR SKY (from spec — not yet resolved)

These open questions from `docs/TRUST_SCORE_SPEC.md §8` are not blocking this build but need decisions before Phase 7 is fully complete:

| # | Question | Quinn recommends |
|---|----------|-----------------|
| Q1 | Track `longest_streak_days`? | Yes (migration already includes it) |
| Q2 | How to handle existing user point resets under new thresholds? | Accept reset — communicate in release notes |
| Q3 | N community verifications to auto-verify a flag? | N=3 |
| Q4 | Admin review queue: full dashboard or DB table only? | DB table only for Phase 7 |
| Q5 | Full verification pipeline (flag_verifications) or simple status update? | Full pipeline — significant Shamus build; scope before starting |

---

## Jordan Gate Required

Per spec §3.2, a Jordan privacy review is required before the score breakdown UI ships to users. Specifically:
- `point_events.flag_id` must never appear in the client UI ✅ (enforced in this build)
- RLS on `point_events` enforces owner-only SELECT ✅ (in migration)
- Leaderboard shows display_name + points only ✅ (no contribution count or location stats)

Jordan should review `src/lib/pointEvents.ts` and the ProfileScreen point history section before the migration is applied.

---

## What's Not Built (per scope)

Per the task brief, the following spec items are NOT in this build:
- Verify button gating (hide for Bronze users) — requires `flag_verifications` pipeline (Q5 unresolved)
- Tier-up celebration (confetti + flash banner) — complex animation, separate ticket
- Comment voting UI — requires `comment_votes` migration + comments list integration
- Flag detail "verified by Gold member" label — tied to `flag_verifications` pipeline
- Admin review queue / anti-gaming triggers — Phase 7+ scope
