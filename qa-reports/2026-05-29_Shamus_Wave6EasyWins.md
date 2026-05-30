# Shamus QA Report — Wave 6 Easy Wins
**Date:** 2026-05-29
**Branch:** `feat/wave6-easy-wins`
**Engineer:** Shamus (Phase 4 green-lit)

---

## Summary

Three features shipped in three separate commits. No SQL migrations required. TypeScript clean. All 1240 tests pass (80 suites).

---

## Feature 1: Leaderboard Screen

**Commits:** `93b65c3`
**Files changed:**
- `src/lib/flags.ts` — `LeaderboardEntry` + `listLeaderboard()` + `getUserLeaderboardRank()`
- `src/screens/LeaderboardScreen.tsx` — NEW full-page modal screen
- `src/screens/ProfileScreen.tsx` — import swap + button label update

### What shipped

| Attribute | Detail |
|---|---|
| Top N | 20 (was 10) |
| New fields | `avatar_url`, `verified_count` |
| Avatar | Circular image if `avatar_url` exists, initials fallback |
| Verified badge | Muted pill "N verified" shown on rows with verified_count > 0 |
| Current user | Blue highlight + "you" badge in the list |
| Outside top 20 | Sticky footer showing "Your rank: Nth · X pts · Y verified" |
| Entry point | Profile → "See leaderboard" button (was "Community Leaderboard", was "top 10") |

### Data fetch strategy

- Query 1: `SELECT id, display_name, avatar_url, points FROM users ORDER BY points DESC LIMIT 20`
- Query 2 (batch, not N+1): `SELECT user_id FROM flags WHERE user_id IN (...ids) AND status IN ('verified','resolved')`
- Merge client-side into `verified_count` per user
- If current user not in list: `getUserLeaderboardRank()` runs two more `COUNT` queries to return `{ rank, points, verified_count }` for the footer

### Accessibility

| Requirement | Implementation |
|---|---|
| `accessibilityRole="list"` | On `FlatList` |
| Per-row label | `"1st, Sky, 1,200 points, 5 verified, you"` |
| Loading | `accessibilityLiveRegion="polite"` + `accessibilityLabel="Loading leaderboard"` |
| Error state | `accessibilityLiveRegion="polite"` on error view; Retry button labelled |
| Footer | `accessibilityLabel="Your rank: 21st, 42 points, 0 verified"` |
| Touch targets | Rows `minHeight: 54`, close button 36px + `hitSlop={8}` |

---

## Feature 2: Flag Comment Stubs (UI only)

**Commit:** `cdc55fd`
**File changed:** `src/components/FlagDetailModal.tsx`

### What shipped

- `comments: string[]` local state + `commentDraft: string` local state
- Section label "Comments" added to the ScrollView body (above the secondaryRow buttons)
- Empty state: "No comments yet." (italic, muted, `accessibilityLiveRegion="polite"`)
- When comments exist: `accessibilityRole="list"` wrapper, each comment a `role="listitem"` card
- TextInput (max 500 chars) + Send button
  - Send disabled and styled muted when draft is empty
  - Submit on `returnKeyType="send"` keyboard action too
  - Send clears the draft and appends to the local list
- **No Supabase.** All local-state only. Comments table + persistence ship in a later migration.

### Accessibility

- Comment list: `accessibilityRole="list"` + label e.g. `"3 comments"`
- Each item: `role="listitem"` + `accessibilityLabel="Comment 1: <text>"`
- Send button: `accessibilityLabel="Send comment"` + `accessibilityState={{ disabled: !draft.trim() }}`

---

## Feature 3: Realtime Flag Updates — Client Activation

**Commit:** `f8ce5ed`
**File changed:** `src/lib/featureFlags.ts`

### What shipped

- `HEATMAP_ENABLED` default flipped from `false` → `true`

### Investigation finding

The realtime subscription in `flagsStore.tsx` is **already fully implemented and active** — it was not commented out or behind `HEATMAP_ENABLED`. The subscription:
- Uses `supabase.channel('flags-status').on('postgres_changes', ...)` on the `flags` table
- Re-fetches full rows via the RLS-gated REST endpoint on each event (Option 2 / Dana spec)
- Applies the viewport geofence (Safeguard #1) delegated to MapScreen
- Logs subscribe/unsubscribe events via `logRealtimeEvent` (Safeguard #3)
- Is gated by `loadRealtimeEnabled()` (user's AsyncStorage opt-in via `realtimePrefs.ts`, default `false`)

`HEATMAP_ENABLED` was defined but not consumed anywhere in the src tree. It is now `true` as instructed; the heatmap UI paths (HeatmapLayer, MapScreen) drive off their own `DEFAULT_HEATMAP_MODE` / `heatmap.ts` logic, not this flag. Enabling it is a forward-compatibility signal for when a flag-gated code path is wired up.

---

## Quality Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm test -- --passWithNoTests --forceExit` | 1240 passed, 80 suites |
| Branch | `feat/wave6-easy-wins` — NOT merged to `main` |

---

## Decisions for Sky

1. **LeaderboardModal.tsx** in `src/components/` is now unused — `ProfileScreen` switched to `LeaderboardScreen`. Safe to delete in a cleanup pass, or leave. Does not cause any type/test errors.
2. **Comment persistence** — currently local only. When the `comments` table migration ships, the UI stub in `FlagDetailModal` is the place to wire `listComments(flagId)` / `createComment()`.
3. **HEATMAP_ENABLED=true** — flag is now live but not gating anything. If you want a hard on/off switch for the heatmap layer, `HeatmapLayer` and `MapScreen` should read `useFeatureFlag('HEATMAP_ENABLED')` to conditionally render.
