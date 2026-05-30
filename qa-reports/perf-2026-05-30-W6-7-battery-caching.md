# Performance Pass — AccessMap — 2026-05-30 (Wave 6, W6-7: battery + network caching)

**Role:** Peter (Performance Engineer)
**Branch:** `feat/phase4-battery-caching` (do NOT merge — Sky merges)
**Quality gates:** `tsc --noEmit` ✅ exit 0 · `jest` ✅ 1150/1150 (93 suites) · `eslint` ✅ clean on touched files

---

## Summary

W6-7 asked for four things. Two were **already done** in prior phases, one was a
**real improvement** I committed, and one needs **new dependencies** so it's
**propose-only**. Net: 3 code-only commits, no schema/dep/build changes, all gates green.

| # | Ask | State found | Action |
|---|---|---|---|
| 1 | Stale-while-revalidate for flags | Cache only shown on network **failure** — cold opens still waited for the network | **Committed** — true cache-first paint on cold start |
| 2 | Throttle location (Balanced, longer interval) | Already `Accuracy.Balanced`; **no `watchPositionAsync`** anywhere (one-shot only) | **Committed** a related win — `maximumAge` so a recent fix is reused instead of a fresh GPS lock |
| 3 | Re-fetch only when stale (TTL) | 24h read-TTL existed, but every Tasks→Map tap re-fetched **all** flags | **Committed** — `refreshIfStale` freshness gate (30s) |
| 4 | Network-aware fetching (skip on cellular + battery<20%) | `@react-native-community/netinfo` **not installed**; battery needs `expo-battery` (also not installed) | **Propose-only** (new deps) — see below |

---

## Baseline (what I measured/reasoned)

- `flags` table is still ~0 rows in practice, so this is a **growth-curve + battery** pass, not a "it's slow now" pass.
- **Cold-open flag load:** `FlagsProvider.refresh()` fired the network + a cache read in parallel via `Promise.allSettled`, but **awaited both** and only used the cache if the network *rejected*. So on a slow/cold network the user saw a spinner for the full network latency even when a perfectly good cached first page sat on disk. That's offline-fallback, not stale-while-revalidate.
- **Redundant fetches:** `MapScreen`'s focus effect called `refreshFlags()` on **every** Tasks-card tap (`MapScreen.tsx:803`), re-downloading the whole first page just to center the map on a flag already in memory. Realtime + the cache already keep the list current.
- **GPS:** `location.ts` (Tasks) and `MapScreen.requestLocation` both already use `Accuracy.Balanced` and are **one-shot** `getCurrentPositionAsync` calls — there is no continuous `watchPositionAsync` loop, so there was no tight polling interval to lengthen. The remaining lever was `maximumAge` (reuse a recent fix vs. powering the GPS for a fresh lock). The web path already had `maximumAge: 60_000`; the native paths had none.

Profiling is now built in via `__DEV__` `console.log` timing (cache-hit vs cache-miss), satisfying the profile-check ask. Observed in the new test run:
```
[flagsStore] SWR cache paint: 2 rows in 3ms (cache hit)
[flagsStore] network refresh: 3 rows in 9ms (revalidate)
[flagsStore] network refresh: 1 rows in 4ms (cache miss)
[flagsStore] refreshIfStale: skipped — data 1ms old (< 30000ms)
```
The cache-hit path paints in **single-digit ms** (local AsyncStorage) vs. the network path which pays full round-trip latency. On-device, cache-hit perceived load goes from *network-latency* → *~tens of ms*.

---

## Optimizations made (committed)

### 1. True stale-while-revalidate on cold start — `src/lib/flagsStore.tsx`
- **Cost before:** first paint blocked on the network even with a valid cache.
- **Fix:** `refresh()` now fires the network without awaiting, reads the (fast, local) cache, and on a **cold start** (`hasHydratedRef`) paints the cached first page the moment it resolves — typically well before the network. The network result then reconciles and rewrites the cache. Gated to cold start so we never flicker live rows with a staler cache. Offline-failure fallback and the `fetchSeqRef` stale-response guard are preserved.
- **Impact:** perceived cold-open flag load drops from *network latency* to *~AsyncStorage read time* (single-digit ms in tests) whenever a cache exists. Zero extra network cost.

### 2. Freshness gate to kill redundant fetches — `flagsStore.tsx` + `MapScreen.tsx`
- **Cost before:** every Tasks→Map card tap = one full first-page network fetch.
- **Fix:** new `refreshIfStale(maxAgeMs = FLAGS_FRESH_MS=30s)` skips the network when the last *successful* fetch is under the window. `MapScreen`'s focus effect now calls `refreshFlagsIfStale()` instead of `refreshFlags()`. Explicit user refresh (pull-to-refresh, the ⟳ button) still calls `refresh()` and always fetches.
- **Impact:** round-trips per session for "tap card → view on map" navigation: **N taps → ~1 per 30s**. Direct radio/battery saving on the most common navigation path.

### 3. Location `maximumAge` (battery) — `location.ts` + `MapScreen.tsx`
- **Cost before:** native one-shot location forced a fresh GPS fix every call.
- **Fix:** `maximumAge: 60_000` on the Tasks location hook (rough distance sort — a recent fix is plenty; mirrors the existing web path), `maximumAge: 30_000` on `MapScreen.requestLocation` (recenter/initial-locate — recent enough to center accurately).
- **Impact:** lets the OS return a cached position instead of spinning up the GPS chip on repeat locates — the single biggest per-call battery item for a one-shot fix. Accuracy unchanged (still `Balanced`, fix ≤30–60s old).

### Test added — `src/lib/__tests__/flagsStoreSwr.test.tsx`
Locks in (a) cache-first paint before the network resolves, then reconcile, and (b) `refreshIfStale` no-op while fresh / forced through at `maxAgeMs=0`. +2 tests (1148→1150).

---

## Proposals (NOT applied — need your review)

### P1 — Network/battery-aware background refresh (W6-7 #4)
**Why it matters:** on cellular with a low battery, a background revalidate is exactly the fetch a user doesn't want to pay for. Today we can't detect either condition.

**Needs two new deps** (both expo-managed, install with `--legacy-peer-deps` per the project rule):
```bash
npx expo install @react-native-community/netinfo expo-battery
# or, if expo install resolves a bad peer set:
npm install @react-native-community/netinfo expo-battery --legacy-peer-deps
```

**Proposed `src/hooks/useNetworkState.ts`** (sketch):
```ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Battery from 'expo-battery';

export interface NetworkState {
  isConnected: boolean;
  isCellular: boolean;   // metered connection
  batteryLevel: number;  // 0..1
  /** True when a *background* (non-user) fetch should be skipped to save
   *  data + battery: on cellular AND battery < 20%. */
  shouldDeferBackgroundFetch: boolean;
}

export function useNetworkState(): NetworkState { /* subscribe to NetInfo + Battery, derive the flag */ }
```

**Wiring:** `refreshIfStale` already centralizes non-user-initiated refreshes — the gate would live there (or be passed in), so user-initiated `refresh()` is never blocked. Pseudo:
```ts
const refreshIfStale = useCallback(async (maxAgeMs = FLAGS_FRESH_MS) => {
  if (shouldDeferBackgroundFetchRef.current) return;        // P1 gate
  if (fresh(maxAgeMs)) return;                              // shipped this pass
  return refresh();
}, [refresh]);
```

**Impact estimate:** eliminates background revalidation traffic for low-battery cellular users; no effect on Wi-Fi or explicit refresh. **Risk:** low (additive, behind a flag) but adds two native deps → needs an EAS rebuild, which is why it's propose-only this pass.

### P2 — (carried from the hotspot map, FYI not part of W6-7)
Viewport/bbox-bounded flag reads + the RLS `(select auth.uid())` rewrite remain the #1 *scaling* items as the table grows. Schema/RPC work → separate Dana/Steve pass. Listed here only so it isn't lost.

---

## Suggested next improvements (1–2)

1. **Land P1 (network/battery gate)** in the next EAS-rebuild window — it's the only remaining piece of the W6-7 brief and the wiring point (`refreshIfStale`) already exists.
2. **A "last updated / offline" affordance.** Now that cold opens can show cached data, a small "Updated 2m ago" / "Offline — showing saved flags" line (the store already exposes `isOfflineCache`) would make the SWR behavior legible instead of silent.

---

## Verification
- **Typecheck:** before ✅ / after ✅ (`tsc --noEmit`, exit 0)
- **Tests:** before 1148/1148 ✅ / after 1150/1150 ✅ (93 suites)
- **Lint:** ✅ clean on all touched files
- **Files touched:** `src/lib/flagsStore.tsx`, `src/lib/location.ts`, `src/screens/MapScreen.tsx`, `src/lib/__tests__/flagsStoreSwr.test.tsx`
- **No** schema / dependency / build / RLS changes. No secrets. Branch not merged.

## How to review
```bash
git diff main..feat/phase4-battery-caching -- src/lib/flagsStore.tsx src/lib/location.ts src/screens/MapScreen.tsx src/lib/__tests__/flagsStoreSwr.test.tsx
# merge:   git checkout main && git merge feat/phase4-battery-caching   (Sky only)
# discard: git branch -D feat/phase4-battery-caching
```
