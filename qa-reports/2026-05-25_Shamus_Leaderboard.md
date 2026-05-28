# Shamus QA Report — Community Leaderboard
**Date:** 2026-05-25
**Branch:** `feat/auto-2026-05-25-shamus-leaderboard` (commit `e7d0da0`)
**Engineer:** Shamus (Scheduled Feature Build — shamus-x3)
**Feature:** Community Leaderboard modal accessible from Profile screen

---

## Summary

Built the Community Leaderboard as a complete vertical slice: a new `LeaderboardEntry` type + `listLeaderboard()` function in `flags.ts`, a new `LeaderboardModal` component, and a Profile screen row that opens it. No schema changes, no new dependencies, no Jordan review required.

---

## Feature Spec

| Attribute | Detail |
|---|---|
| **Purpose** | Show top 10 contributors by points — drives community engagement and gives users a goal to work toward |
| **Entry point** | Profile screen → "Community Leaderboard" row (below Achievements, above Notification Settings) |
| **Data source** | `public.users` — authenticated-read RLS already in place; no migration needed |
| **Query** | `SELECT id, display_name, points FROM users ORDER BY points DESC LIMIT 10` |
| **Current user** | Row highlighted with `brandSofter` background; "you" badge shown; `display_name` falls back to "Member" if null |

---

## Files Changed

| File | Type | Description |
|---|---|---|
| `src/lib/flags.ts` | MODIFIED | Added `LeaderboardEntry` type + `listLeaderboard(limit = 10)` function |
| `src/components/LeaderboardModal.tsx` | NEW | Slide-up modal — loading/error/empty states, top-10 FlatList, current-user highlight |
| `src/screens/ProfileScreen.tsx` | MODIFIED | Import, `leaderboardOpen` state, row button, `<LeaderboardModal>` render |

---

## User Flow

1. User opens Profile tab.
2. Scrolls to "Community Leaderboard" row (below Achievements).
3. Taps → `LeaderboardModal` slides up.
4. Modal shows spinner while loading → top-10 list renders.
5. Current user's row is tinted blue with a "you" badge so they can immediately find their rank.
6. Error state shows message + Retry button.
7. Empty state: "No contributors yet. Be the first!"
8. Tap ✕ or swipe to dismiss.

---

## Accessibility

| Requirement | Implementation |
|---|---|
| Labels for all interactive elements | "Close leaderboard" button labelled; "Retry" button labelled |
| Each row announces rank + name + points | `accessibilityLabel="1st, Sky, 1,200 points, you"` |
| List semantics | `accessibilityRole="list"` on FlatList; `role="listitem"` on each row (matching existing codebase pattern) |
| Loading state | `accessibilityLiveRegion="polite"` on spinner |
| 44pt touch targets | `minHeight: 48` on rows; close button 36px with `hitSlop={8}` |
| Reduced motion | No animations inside the modal (only the slide-up Modal itself which React Native handles) |

---

## Quality Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm test -- --passWithNoTests --forceExit` | 789/789 passed (baseline unchanged — no new tests in this slice) |
| Branch | `feat/auto-2026-05-25-shamus-leaderboard` — NOT merged to main |

---

## Assumptions

1. `public.users` has an authenticated-read RLS policy (`users readable by authenticated`) — confirmed in `supabase/schema.sql`.
2. `display_name` can be null; falls back to "Member".
3. Points are non-negative integers.
4. Static snapshot (no real-time updates) is sufficient for a leaderboard.
5. Top 10 is an appropriate limit; easy to change via the `limit` param of `listLeaderboard()`.

---

## Backlog State Note

The current `FEATURES.md` on `main` is stale. The "Leaflet tile interception" item in the `Later` section is already shipped (commit `da54dd4` on main). Recommend running Morgan to reconcile the features file before the next Shamus cycle. The leaderboard branch should be added to the `Parked` section.

---

## Decisions for Sky

1. **Review + merge** `feat/auto-2026-05-25-shamus-leaderboard` when ready. No Supabase dashboard steps required.
2. **FEATURES.md cleanup** — the `Later` section has stale items. The `product/features-update-2026-05-25` branch has a more current version worth reviewing.
3. **Leaderboard limit** — currently hardcoded at 10. Can be changed by adjusting the `listLeaderboard(10)` call in `LeaderboardModal.tsx`.
