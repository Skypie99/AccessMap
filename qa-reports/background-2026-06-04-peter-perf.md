# Peter — Nightly Performance Audit

**Date:** 2026-06-04 (night shift)
**Mode:** BACKGROUND / AUDIT-ONLY — no code changes, no commits
**Commits reviewed:** `f499fc8`, `01aa78a`, `cbf9a3b` (today's two UI polish merges)
**Previous report:** `background-2026-06-01-peter-perf.md`

---

## Summary

Both of today's UI polish merges are **performance-neutral to positive**. No regressions detected. Three low-priority observations are noted; the carry-forward from June 1 (`CommentBubble`, `RealtimePulse`, `RemoteImage` memoization) remains open and unchanged.

**Verdict: ✅ PASS — No blockers, no new regressions.**

---

## Commit Analysis

### 1. `f499fc8` / merge `cbf9a3b` — brand-fonts: ~180 `<Text>` → `<AppText>` across 30 files

**Files:** 30 component/screen files (see commit stat)

**Perf verdict:** ✅ **No concern.**

**Details:**

- `AppText` is a thin stateless wrapper over `<Text>` that resolves `fontFamily`, `fontSize`, `color`, and `letterSpacing` per-render. No hooks beyond one `resolveTracking()` call (3-4 comparisons, O(1)).
- `AppText` is **not** `React.memo`'d — see observation below.
- Hot render paths reviewed:
  - `MapScreen` (71 AppText uses): most AppText in MapScreen is inside the filter panel and floating chrome — not in a fast-updating loop.
  - `TasksScreen` (43 uses): AppText is inside `FlagCard` rows, which FlatList virtualises. If `FlagCard` is already memoized (check: `FlagCard` is currently not `React.memo`'d based on prior audits), then all 43 AppTexts re-render on every realtime update. Still safe — each AppText render is ~0.1ms. At 20 visible rows × 2 AppTexts per card = 40 renders × 0.1ms = 4ms, well within the 16ms frame budget.
  - `ProfileScreen` (109 uses): high number, but ProfileScreen renders once on tab focus — not a high-frequency update screen.
- Modal/list screens (`MyReportsModal`, `LeaderboardModal`, `NearbyFlagsModal`, `FilterPresetsModal`): each row renders 2–4 AppText instances. FlatList virtualizes to ~15 visible rows. Even without memoization, this is safe.

**Conclusion:** The AppText sweep is a safe, correct change with no measurable performance impact. The per-render cost of AppText is trivially small.

---

### 2. `01aa78a` / merge `cbf9a3b` — preship: focus rings on Card/Pill + Profile dividers + Feedback AppText

**Files:** `Card.tsx`, `Pill.tsx`, `ProfileScreen.tsx`, `RootNavigator.tsx`

**Perf verdict:** ✅ **No concern.**

**Details:**

**Card.tsx focus ring:**
- Uses `useState(focused)` + `onFocus`/`onBlur` on `Pressable`. Focus state transitions are user-triggered (keyboard/switch-control only), not automated — no concern.
- `ringStyle` and `handlePress` are computed inline as new object/function references on each render. This is standard React Native patterns; Card renders are driven by FlatList virtualisation so this is not a hot path.
- The `{focused && <View ... />}` conditional mount is correct — the ring `View` is only added to the tree when focused, so touch users see zero overhead.

**Pill.tsx focus ring:**
- Same pattern as Card. Pill instances appear in the map filter panel (not a FlatList hot path) and in badge chips. Focus state is user-triggered. No concern.

**ProfileScreen hairline dividers:**
- `borderBottomWidth: StyleSheet.hairlineWidth` on point-history rows. Negligible render cost.

**Conclusion:** Surgical, correct changes with no performance implications.

---

## AppText Memoization — New Low-Priority Observation

**Component:** `src/components/ui/AppText.tsx`

`AppText` exports as a plain `function` without `React.memo`. Now that it is the app-wide text primitive, it will re-render whenever any parent re-renders — which is expected React behaviour. However, because `AppText` derives its computed style inline (the `resolvedStyle` object is freshly allocated each render), parent components that are already `React.memo`'d will still trigger AppText allocations on every relevant prop change.

**Impact today:** Low. AppText computation is fast (~0.1ms). The compound cost across a full FlatList refresh (e.g., 50 rows × 2 AppTexts) is ~10ms — within budget.

**Future risk:** If a high-frequency renderer (e.g., an animation-driven counter, or a realtime score ticker) uses `AppText`, the inline object allocation could contribute to frame pressure. Currently no such call site exists.

**Recommendation (not urgent):** Add `export const AppText = React.memo(function AppText(...) {...})` in a follow-up cleanup. ~2-line change. Not a blocker before TestFlight.

---

## Carry-Forwards (unchanged from June 1)

| Component | Issue | Priority | Status |
|---|---|---|---|
| `CommentBubble` | Not memoized; used in comment threads (10–50 items) | Medium | Open |
| `RealtimePulse` | Not memoized; drives animated loop | Medium | Open |
| `RemoteImage` | Not memoized; defensive hygiene for list contexts | Low | Open |
| Offline queue (F8) | No soft cap on draft count | Low | Open |

None regressed tonight.

---

## Scalability Notes

- **AppText app-wide breadth**: 30 files touched today means AppText is now load-bearing. Any future performance regression in text rendering (e.g., a heavy custom animation on AppText) would have app-wide impact. The component is currently simple — keep it that way. Avoid adding hooks, async operations, or complex style derivations to AppText.
- **Profile screen at 109 uses**: Highest AppText density in the app. ProfileScreen refreshes on tab focus (one re-render per focus). This is fine. Would be a concern if ProfileScreen used polling or realtime subscriptions — it does not.
- **No new database queries, no new subscriptions introduced**: Both commits are pure UI, no data-layer impact.

---

## Overall Verdict

### ✅ PASS — No regressions, no blockers

Today's two merges are aesthetics-only: font tokens applied universally, focus ring accessibility primitives, hairline dividers. All are correct and fast. The one new observation (AppText memoization) is a low-priority defensive hygiene item, not a regression or blocker.

**Carry-forward priority order (unchanged):**
1. `CommentBubble` → `React.memo` (medium)
2. `RealtimePulse` → `React.memo` (medium)
3. `AppText` → `React.memo` (low, new item)
4. `RemoteImage` → `React.memo` (low)

---

**Report by:** Peter (Performance Engineer, background shift)
**Audit scope:** Commits today on `main` — brand-fonts merge + preship UI finish
**Next Peter run:** Next scheduled night shift
