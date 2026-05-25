# QA Review — Features 1 + 2 — 2026-05-23

Independent agent review of:
* **Feature 1 — Activity Feed** (`feat/activity-feed-2026-05-23`, merged)
* **Feature 2 — Update banner** (`feat/update-banner-2026-05-23`, merged)

The reviewer had no context from the build conversation — pure code-pattern audit.

---

## Summary

Fix-before-ship — close on quality. The two features are well-structured (pure utilities,
sensible RLS posture, fail-soft AsyncStorage, defensive `accessibilityViewIsModal`), and
typecheck + 29/29 new tests pass. Two major bugs and a handful of A11y/UX nits should land
before final review: a stuck-filter state if the user signs out inside the modal, a
touch-target miss on the filter chips, and a missing `importantForAccessibility="no"` on the
decorative severity dot/thumb in the feed.

## Issues found

| # | Severity | Location | What's wrong |
|---|---|---|---|
| 1 | **major** | `src/components/ActivityFeedModal.tsx` (filter chip wiring) | Filter pinned to hidden value when user signs out. Chips render only "All" when `!user`, but `filter` state can still be `'mine'` or `'watched'` from before sign-out, leaving feed visibly empty with no way to reset. Fix: force `filter` back to `'all'` when `!user`. |
| 2 | **major** | `src/screens/ProfileScreen.tsx` (refreshUpdateCount + acknowledgeUpdates) | Race window: if user taps "View" while a second `refreshUpdateCount` is in flight, `trackedFlagsRef.current` is overwritten after `markAllSeen` reads it. Fix: snapshot `tracked` into a local const inside `acknowledgeUpdates` before awaiting. Consider request-id gating in `refreshUpdateCount`. |
| 3 | **major** | `src/components/ActivityFeedModal.tsx` (filterChip style) | Filter chips are 34pt tall with no `hitSlop`, below AccessMap's 44pt baseline for motor-impaired users. Bump `minHeight: 44` and add `hitSlop={8}`. |
| 4 | **minor** | `src/components/ActivityFeedModal.tsx` (sevDot, thumb) | Decorative elements use `accessibilityElementsHidden` (iOS) but skip `importantForAccessibility="no"` (Android). TalkBack will still read "3" and announce the image. Match the UpdateBanner pattern. |
| 5 | **minor** | `src/lib/flagUpdates.ts` (nextLastSeen trim) | The "most-recently-touched wins" trim claim is wrong — `Object.entries` preserves *original* insertion order, so re-assigning an existing key keeps its old position. A long-tracked flag whose status just changed could be trimmed. Fix: `delete merged[id]` before `merged[id] = f.status` to re-insert at the end. Currently masked by `MAX_TRACKED=500`. |
| 6 | **minor** | `src/lib/flags.ts` / `ActivityFeedModal.tsx` | `listRecentFlags(100)` runs unconditionally even when `!user`. RLS returns empty (no error) but it's wasteful. Guard with early-return. |
| 7 | **minor** | `src/screens/ProfileScreen.tsx` | Two separate `useFocusEffect` callbacks fire concurrent fetches on every focus. Consider merging. |
| 8 | **nit** | `src/components/UpdateBanner.tsx` | `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` is contradictory (alert ≈ assertive). Drop `role=alert`; the explicit `announceForAccessibility` already handles iOS. |
| 9 | **nit** | `src/lib/flagUpdates.ts` (diffUpdates) | Doesn't distinguish "tracked & deleted" from "tracked & unchanged". Watched-but-deleted flags accumulate in `lastSeen` forever (until MAX_TRACKED trim). Not user-facing — worth a comment. |
| 10 | **nit** | `src/lib/__tests__/flagUpdates.test.ts` | Happy-path heavy. Missing: concurrent `markAllSeen` calls, `setItem` rejection. dayGroup tests well-covered. |

## What's good (don't undo)

- `dayGroup.ts` is genuinely pure, locale-aware, handles invalid dates via an `__unknown__`
  bucket instead of dropping silently.
- `parseLastSeen` defends against arrays, primitives, and bogus status strings — with a test
  for each.
- `mountedRef` correctly guards every setState after await in `ActivityFeedModal`.
- First-launch seeding (`Object.keys(lastSeen).length === 0 && tracked.length > 0`)
  correctly prevents a noisy banner on first run.
- Storage key versioning (`@accessmap/flag_last_seen_v1:`) and per-user scoping match
  watchedFlags.
- `STATUS_COLORS` palette claims WCAG AA — verified at the bg/fg pairs.
- Fire-and-forget acknowledge with optimistic `setUpdateCount(0)` is the right UX for a
  non-critical preference write.

## Verification

- `npm run typecheck` → 0 errors.
- `npx jest` (full suite) → 262 tests across 19 suites, all passing.
- Reviewer read 8 referenced files plus `supabase/schema.sql`, `src/lib/watchedFlags.ts`,
  `src/lib/relativeTime.ts` for RLS / pattern alignment.
- Did NOT run the app under VoiceOver/TalkBack — accessibility findings are code-pattern
  based.

---

## Action plan

Polish loops PL1–PL5 below address all 3 majors and 4 of 5 actionables. Nits 9–10 are left
as backlog notes (cited for completeness but low-priority).

---

## Polish loops landed (response to this QA)

All 5 ran with merge-on-done discipline (small branch → tsc → jest → merge). Test count went
from 262 → 263 (a regression test for QA #5 was added; no other tests changed).

| Loop | Branch | Addresses | What changed |
|---|---|---|---|
| PL1 | `fix/feed-filter-signout-reset-2026-05-23` | QA #1 (major) | useEffect snaps `filter` back to `'all'` whenever `!user` — prevents the empty-list dead-end when a Mine/Watched chip is selected and the user signs out. |
| PL2 | `fix/profile-update-race-2026-05-23` | QA #2 (major) | `refreshUpdateCount` tags each call with a sequence id (`updateSeqRef`); only the most-recent call mutates state. `acknowledgeUpdates` snapshots `trackedFlagsRef.current` into a local const before awaiting `markAllSeen`. Closes the focus → blur → focus race. |
| PL3 | `fix/feed-a11y-touch-targets-2026-05-23` | QA #3, #4 (major + minor) | Filter chip `minHeight` 34 → 44 (AccessMap baseline). `sevDot` uses `importantForAccessibility="no-hide-descendants"` so its severity-number Text child is also hidden from Android TalkBack. |
| PL4 | `fix/last-seen-lru-and-anon-guard-2026-05-23` | QA #5, #6 (minors) | `nextLastSeen` deletes existing keys before re-assigning so the LRU trim treats updated entries as freshly touched. New regression test verifies the touched key lands at the end and survives the trim. `ActivityFeedModal.load()` skips the fetch entirely when `!user` (RLS would return empty anyway). |
| PL5 | `fix/banner-role-and-focus-consolidation-2026-05-23` | QA #7, #8 (minor + nit) | `UpdateBanner` dropped `accessibilityRole="alert"` (contradicted the polite live region). `ProfileScreen` merged the two `useFocusEffect` callbacks into one parallel `Promise.all`. |

**Untouched:** QA #9 (diffUpdates not distinguishing deleted-from-unchanged) is a documented
trade-off, masked by `MAX_TRACKED=500`. QA #10 (concurrent `markAllSeen` calls / `setItem`
rejection tests) is happy-path-extension work — a follow-up backlog item.

## Final verification

- `npx tsc --noEmit` → 0 errors.
- `npx jest` → **263 tests passing across 19 suites**.
- All 5 polish loops merged to `main` with `--no-ff`.
