# Feature Push — AccessMap — 2026-05-23

## Summary

Shipped **Realtime flag updates** (client side) on
`feat/realtime-flag-updates-2026-05-23`. `FlagsProvider` now subscribes to
Supabase realtime for `public.flags` and merges INSERT/UPDATE/DELETE deltas
through a pure helper, so a flag created or triaged on another device
appears on yours without a manual refresh. Typecheck went green → stayed
green; test suite went 8 suites/108 tests → 9 suites/**119 tests** (added
11 unit tests for the merge helper). Complete vertical slice — UI consumers
(`MapScreen`, `TasksScreen`, modals) already read from `useFlags()`, so
they pick up live updates without any screen-level changes.

Stays quiet until Sky runs `supabase/realtime.sql` in the dashboard — see
"Proposals" below.

## Feature spec (as built)

- **What.** When another device creates a flag, or someone updates/deletes
  a flag's status, the change shows up in this device's list within
  seconds — no pull-to-refresh, no app reload.
- **Where it lives.** `src/lib/flagsStore.tsx` (new `useEffect` inside
  `FlagsProvider`) + a new pure helper at `src/lib/flagsRealtime.ts`.
  Reachable through *every* screen that already calls `useFlags()`:
  Map, Tasks, Nearby Flags modal, Flag Detail modal, My Reports.
- **User flow.** App open on the Tasks tab → another user verifies a
  flag on a different device → the verified badge swaps live in the
  card list. No loading state; no error UI (channel failures are silent
  — REST `listFlags` is the source of truth at refresh/launch). On
  status changes that move a flag in or out of the active Map filter,
  the row appears or disappears accordingly. Empty/loading/error states
  are inherited from existing FlagsProvider behavior.
- **Components & data.** Reuses `supabase` client and `FlagRow`/
  `FlagStatus` types. New `mergeFlagRealtimePayload(flags, payload,
  statuses)` is pure, exported, and unit-tested. The subscription
  effect is one channel (`'public-flags'`) listening for `*` events on
  `schema: 'public', table: 'flags'`. Cleanup calls
  `supabase.removeChannel(channel)` on unmount.
- **Accessibility plan (implemented).** Silent updates — no
  `AccessibilityInfo.announceForAccessibility`. A noisy realtime channel
  shouldn't yank a screen-reader user's focus mid-read. The underlying
  list re-renders, so VoiceOver/TalkBack pick up new content on the
  user's next gesture. No visual UI added → contrast/targets/dynamic
  type unaffected. No animation → reduced motion irrelevant. (If we
  later want optional "new nearby flag" announcements, that's a Profile
  toggle, not a default.)
- **Assumptions.** (1) `supabase/realtime.sql` (already committed on
  main) gets run in the Supabase dashboard — until then, the subscription
  is silent. (2) Realtime respects RLS, per the team's privacy analysis
  inline in that SQL file (Steve confirmed: same data surface as
  `listFlags`). (3) Server-side filter is `statuses` only; status
  transitions that move a row in/out of the filter are reconciled
  client-side by the merge helper. (4) The 500-row `listFlags` cap can
  drift upward in long sessions; the next REST refresh reconciles —
  acceptable at expected concurrency (single-digit users today).

## How to try it

**Two devices.** Realtime is impossible to feel with one.

1. **Run the SQL once** (see Proposals below — one button-press in the
   Supabase dashboard, idempotent).
2. `git checkout feat/realtime-flag-updates-2026-05-23 && npm install
   --legacy-peer-deps`.
3. Start the app on two devices (iOS sim + browser is fine):
   `npm start` for one, `npm run web` for the other. Sign in as the
   same or different accounts.
4. On device A → Map tab → tap the **Report** FAB → drop a flag.
5. On device B (without touching anything) → Tasks tab. The new flag
   should appear within ~1 second.
6. On device B → tap the flag → mark **Verified**. On device A's Map,
   the marker's status badge changes live.
7. To prove the filter-merge logic: on device A's Map filter panel,
   toggle off the "verified" status. Then on device B, verify another
   open flag. On device A, the flag disappears live (because its new
   status is no longer in A's filter).

**One device sanity check (without Supabase running):** the subscription
still mounts/unmounts cleanly — `npm run typecheck` is green and
`npm test` shows 9/9 suites and 119/119 tests passing.

## What was built (branch `feat/realtime-flag-updates-2026-05-23`)

- **`src/lib/flagsRealtime.ts`** (new, 50 LOC). Pure
  `mergeFlagRealtimePayload(flags, payload, statuses) → FlagRow[]` plus
  the `FlagRealtimePayload` union for clean payload typing. The function
  matches `listFlags`' ordering (created_at desc) and filter semantics.
- **`src/lib/flagsStore.tsx`** (+37 LOC). New `useEffect` mounts a
  `supabase.channel('public-flags').on('postgres_changes', ...)`
  subscription. The handler converts the raw Supabase payload into our
  typed shape and pushes it through the pure merge helper using
  `statusesRef.current` to respect whatever filter the Map currently
  drives. Cleanup removes the channel. Empty dep array — one
  subscription for the lifetime of the provider.
- **`src/lib/__tests__/flagsRealtime.test.ts`** (new, 160 LOC, **11
  tests**). Covers INSERT (filter-skip, dedupe, late-arrival re-sort),
  UPDATE (patch, status-out removal, status-in add, no-op outside
  filter), DELETE (id-from-old, missing-id no-op), and the
  unknown-eventType fallback.
- **`FEATURES.md`.** Moves "Realtime flag updates" out of the "Now"
  bucket — annotated as shipped client-side on the unmerged branch
  pending the SQL apply.
- **`LEARNINGS.md`.** New entry codifying the channel → typed payload
  → pure merge → setState pattern as the shape for future realtime
  table subscriptions.

### Plain-language note for the owner

The realtime path is two pieces that compose cleanly: a tiny *adapter*
in the provider that turns Supabase's payload into our shape, and a
*pure function* (no React, no Supabase) that decides what the new flag
list looks like. That separation is why the test file doesn't need to
mock Supabase or wrap things in `act()` — we just call the function with
inputs and assert the output. If you ever add another realtime table
(say, comments on flags), follow the same shape: channel subscribes,
adapter calls a pure merger, merger is unit-tested.

## Proposals (NOT applied — need your review)

### 1. Run `supabase/realtime.sql` in the dashboard

Already committed on main with full team analysis inline (Steve on RLS,
Dana on schema, Peter on perf, Alex on a11y). Until you run it, the
client subscribes successfully but receives zero events — safe, but
also not actually live.

**Steps (≤1 minute):**

1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/realtime.sql`.
3. **Run**.
4. Verify in **Database → Publications → `supabase_realtime`** that
   `public.flags` is listed under the publication's tables.

That's it. Idempotent — re-running is fine.

**Rollback:** in the same SQL editor, run
`ALTER PUBLICATION supabase_realtime DROP TABLE public.flags;`.

### 2. (Pre-existing, surfaced during this run) `node_modules` was stale

`npm test` and `tsc` were both red on a fresh checkout of main until
`npm install --legacy-peer-deps` ran — `jest` and `@types/jest` are in
`package.json` but weren't installed. Not a code change; just worth
noting so any teammate who lands on this repo runs install first.

## Suggested next features (1–2)

1. **Optional "new nearby flag" voice announcement.** Profile toggle
   that, when on AND realtime is connected, calls
   `AccessibilityInfo.announceForAccessibility` for INSERT events whose
   coordinates are within (say) 250m of the user. Builds directly on
   today's work + the existing `useUserLocation` hook + the existing
   distance utility. Born-accessible by design and uses the realtime
   path we just laid.
2. **Default filter set on launch.** Already on the FEATURES.md "Next"
   list — pairs naturally with the now-shipped saved filter sets + filter
   persistence. Small, complete, no propose-only blockers.

## Verification

- **Typecheck**: green before (with `npm install --legacy-peer-deps`),
  green after the three commits.
- **Tests**: 8 suites/108 tests before → **9 suites/119 tests after**
  (added 11). All passing.
- **Reachable via**: every existing screen that calls `useFlags()`
  (Map, Tasks, Nearby Flags, Flag Detail, My Reports) — no new
  nav/menu entry needed because the feature is a transparent extension
  of the shared state.
- **Accessibility implemented**: yes — silent updates by design;
  no new visual UI; existing announce/contrast/target patterns
  preserved.
- **Load-bearing gotchas**: none touched. DB types unchanged. No
  `react-leaflet` install bump. Map libraries untouched. Photo upload
  path unchanged. RLS unchanged (subscription rides existing
  `using (true)` SELECT policy on `flags`).
- **Commits**: 3 (`feat:`, `test:`, `docs:`).
- **Files touched**: 2 added (`src/lib/flagsRealtime.ts`,
  `src/lib/__tests__/flagsRealtime.test.ts`), 3 modified
  (`src/lib/flagsStore.tsx`, `FEATURES.md`, `LEARNINGS.md`).
- **Lines**: +276 / −8.

## How to review

```
git diff main..feat/realtime-flag-updates-2026-05-23
# merge:   git checkout main && git merge feat/realtime-flag-updates-2026-05-23
# discard: git branch -D feat/realtime-flag-updates-2026-05-23
```

## Notes from the run

- **Claim-conflict scan.** Two branches dated today, `feat/realtime-points-2026-05-23`
  and `feat/realtime-live-points-2026-05-23`, contain points-subscription
  work (already on main as commits `9a10eaa` and `937992f`) — different
  feature. No overlap with this branch.
- **Pre-existing repo state.** `npm test` reports 20 extra "failed
  suites" only because Jest also picks up duplicate test files in
  `.claude/worktrees/pm-merges/` (a sibling worktree). Ignored via
  `--testPathIgnorePatterns="/.claude/"`. Worth a one-line addition to
  `jest.config.js` to make that the default — flagging for a future PR;
  out of scope here.
- **Skill workflow worked cleanly.** Spec-first / pure-helper-with-tests
  / propose-the-SQL pattern from feature-development matched the
  codebase's existing conventions on the first pass.
