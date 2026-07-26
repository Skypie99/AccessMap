# Peter — Nightly Performance Audit

**Date:** 2026-06-01 (night shift)
**Mode:** BACKGROUND / AUDIT-ONLY — no code changes, no commits
**Branch scoped:** `claude/beautiful-kalam-193d43` (Steve hardening pass)
**Commits reviewed:** `02b6317` → `ebfb57c` (5 commits, all tonight)

---

## Summary

All 5 hardening commits are **performance-neutral or positive**. No regressions found.
One minor observation on `RemoteImage` (not memoized itself) is noted below — it is not a blocker because parent list components are already memoized correctly.

**Carry-forwards from Phase 6 audit still open:** CommentBubble and RealtimePulse not memoized (medium priority, not blockers).

---

## Commit-by-Commit Analysis

### 1. `ebfb57c` — harden(input): validate category/severity + normalize description

**Files:** `src/lib/flags.ts`

**Perf verdict:** ✅ **No concern.**

- `assertValidCategoryAndSeverity()` does one `Object.prototype.hasOwnProperty.call` on a 6-key dict. O(1), microseconds. The flag-submission path runs once per user action — not a hot loop.
- `normalizeFlagDescription()` does `String.trim()` + length check. O(n) on description length, capped at 2000 chars. Negligible.
- Both functions are called once per flag create. No performance implication.

---

### 2. `0cbab5f` — harden(map): offline banner for stale cached flags

**Files:** `src/screens/MapScreen.tsx`

**Perf verdict:** ✅ **No concern.**

- Reads the `isOfflineCache` boolean already produced by `useFlags()`. No new computation — just a conditional render of one `View` + `AppText`. No additional hook, no new subscription, no new query.
- Pattern matches the existing `TasksScreen` offline banner exactly. Already validated as acceptable.

---

### 3. `5b6c59e` — harden(boundaries): per-tab error boundaries

**Files:** `src/components/ErrorBoundary.tsx`, `src/navigation/RootNavigator.tsx`

**Perf verdict:** ✅ **No concern.**

- `screenLayout` wraps each tab's content in `<ErrorBoundary variant="screen">`. This adds one React class component per tab to the component tree — 3 extra class component nodes (Map, Tasks, Profile). Negligible overhead.
- `makeStyles(color)` inside `ErrorFallback` calls `StyleSheet.create` inline on every render. **This only renders when an error is thrown** — which is an exceptional, rare code path. Not a hot render path. No optimization needed.
- New `variant` and `label` props are passed through with no computation.

---

### 4. `6d435b1` — harden(images): fail-safe RemoteImage

**Files:** `src/components/ui/RemoteImage.tsx` + 10 call-site files

**Perf verdict:** ✅ **No concern, with one low-priority observation.**

**What's good:**
- `RemoteImage` uses the React "adjust state during render" pattern (`uri !== prevUri` → reset `failed`). This is React's documented approach for state reset on prop change — no extra render cycle, no `useEffect`.
- `onError` is defined inline as `() => setFailed(true)`. This creates a new function reference on every render. For most call sites (modal avatars, profile header, lightbox) this is irrelevant — they render rarely.
- **In FlatList contexts:** `FlagCard` is already `memo()`'d and `LeaderboardRow` is already `React.memo()`'d, so `RemoteImage` inside them only re-renders when the parent's props change. No amplification.
- `NearbyFlagsModal`'s renderItem is `useCallback`'d and `distanceMap` is pre-computed via `useMemo` (Peter Wave 6 fix already in place). FlatList manages recycling — each visible cell's `RemoteImage` gets its own state but doesn't cause unusual re-renders.

**Low-priority observation:**
- `RemoteImage` itself is **not memoized** (`React.memo` not applied). This is fine for the current call sites because parents in list contexts are already memoized. If a future call site puts `RemoteImage` inside an un-memoized parent that re-renders frequently, the image state would re-run the `uri !== prevUri` comparison every render. Not a bug — just a note for if we ever add un-memoized high-frequency parents.
- **Recommendation (not urgent):** Add `React.memo` to `RemoteImage` as defensive hygiene. ~2-line change. No blocker.

---

### 5. `02b6317` — a11y(nearby-list): heading role moved to title Text

**Files:** `src/screens/NearbyFlagsModal.tsx`

**Perf verdict:** ✅ **No concern.** Pure accessibility fix — zero performance implications.

---

## Carry-Forwards from Phase 6 Audit (still open)

These were flagged in `2026-06-01_Peter_Phase6PerformanceAudit.md` and are unchanged:

| Component | Issue | Priority |
|---|---|---|
| `CommentBubble` | Not memoized; used in comment threads (10–50 items) | Medium |
| `RealtimePulse` | Not memoized; drives an animated loop | Medium |
| Offline queue (F8) | No soft cap on draft count | Low |
| F10 reopen voting | Button debounce not confirmed at UI layer | Low |

None of these are regressions tonight — they are carry-forward items from Phase 6.

---

## Overall Verdict

### ✅ PASS — No regressions, no blockers

The Steve hardening pass is clean from a performance perspective. All 5 commits are either neutral or improvements (error boundary isolation actually *improves* perceived performance by preventing cascading failures from affecting the tab bar).

**One actionable low-priority note:** Consider adding `React.memo` to `RemoteImage` as defensive hygiene before this branch merges. 2-line change, zero risk.

---

**Report by:** Peter (Performance Engineer, background shift)
**Audit scope:** Commits `02b6317`–`ebfb57c` on `claude/beautiful-kalam-193d43`
**Next Peter run:** Next scheduled night shift
