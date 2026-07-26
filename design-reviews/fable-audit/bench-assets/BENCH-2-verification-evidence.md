# BENCH-2 — Honesty & Resilience Polish · Verification Evidence

**Branch:** `bench/2-honesty` (4 stacked commits off the BENCH-1 tip `9e7f251`) · **STOPPED on branch — not merged, not pushed, not built.**
**Model:** Opus 4.8, max effort. No arbiter (bench/polish tier — render + guard tests). Diff also run through an adversarial 3-lens review (see below).
**Members:** B9 (offline data-age + Home refresh-failure · L7-02), B10 (web locate-failure · L7-07), B7 (heat "no zones" companion + iOS cluster-spring gate · L7-11 + L4-03).
**Date:** 2026-07-06

---

## Gate status (all green, held at every commit)

| Gate | Baseline (fresh branch @ `9e7f251`) | Final (HEAD `1682a69`) |
|---|---|---|
| `tsc --noEmit` | 0 errors | **0 errors** |
| `npm run lint` | 0 errors / 77 warnings | **0 errors / 77 warnings** (no new) |
| `jest` | 115 suites · 1804 pass / 0 fail / 84 todo | **121 suites · 1826 pass / 0 fail / 84 todo** |

**+22 tests / +6 suites** — all net-new guard tests (no existing test edited except one additive assertion in `flagsStoreSwr.test.tsx`).
**Diffstat vs `9e7f251`:** 14 files, **+501 / −18** (6 source, 8 test). Four commits (B9, B10, B7, B10-follow-up); every gate green at each.

---

## Adversarial review (post-build)

The full diff was run through a 3-lens adversarial review (correctness · PROTECT-regression · honesty/a11y), each finding independently refuted-or-confirmed. Result: **1 CONFIRMED (fixed) · 2 refuted.**

- **CONFIRMED → FIXED (commit `1682a69`):** B10 set a *persistent* locate-failure banner but nothing cleared it, so after a successful Retry the map recentered while the stale "Couldn't find your location" banner lingered (it had copied S11's *set* half, not its *clear* half). **Fix:** every locate attempt message-targeted-clears its own prior failure banner at the start (web-only) via a new `clearLiveStatusMessage(msg)` that clears the shared slot only when it still shows *that* message — so a successful retry leaves it cleared, and it never clobbers an S10/S11 data banner that has since taken the slot. Covered by a new `liveStatus` unit test (match / no-clobber / idle-safe).
- **Refuted — B7-A copy** ("insufficient reports" ignores that an active filter can thin data below k≥3): not false — the copy is honest that more reports create zones and the empty-filters recovery card (PROTECT-2) owns the filter angle. *Copy remains Sky-tunable (flagged below).*
- **Refuted — B7-A double live-region** (disclaimer + companion both polite): both are relevant (rule + outcome), polite announcements queue and don't interrupt; not a defect.

**Web smoke (expo web, Chromium preview):** the app boots clean — Home ("9 barriers"), Map ("Explore"), and the Nearby list all render, **zero console errors**, Supabase fetch succeeds. The **S4 permission-denied arrival banner** renders on the Map ("Location is off, so the map shows the most recent flags…") — visual confirmation that B10's locate-*failure* surface is a distinct state. The conditional states themselves (offline-cache fallback, a locate *exception*, heat-on-with-no-cluster) can't be induced in the sandboxed preview (they need offline / geolocation-throw / a specific data shape), so they are **test-verified** below, not screenshotted.

---

## B9 — Data-age on the offline banner + Home refresh-failure (L7-02) — CLOSED

Commit `0bc6694`. **UI/read half only.** `cachedAt` already existed in the cache entry but was read for the TTL check and thrown away.

**B9a — banner states its age.**
- `flagsStore.tsx`: `readFlagsCache()` now returns `{ rows, cachedAt }`; a new `offlineCachedAt` context field is set in lock-step with `isOfflineCache` (true on the network-failure→cache fallback; nulled on every recovery path). The `__readFlagsCache` test wrapper keeps its rows-only shape via an adapter, so `offlineCache.test.ts` stays green untouched.
- `copy.ts`: new `offlineBannerText(cachedAt)` composes the age via the **existing** `relativeTime()` — `"Showing saved data from 2h ago — connect for the latest."` — falling back to the plain string when unknown.
- Home / Map / Tasks banners now render (and announce) the age. Map/Tasks `accessibilityLabel`s updated so spoken == visible.

**B9b — surface the silent Home refresh-failure.**
- Home's error card only renders when the list is empty (`error && flags.length === 0`), so a no-cache refresh failure that lands while barriers are on screen was swallowed. Added a sibling, live, tappable notice gated `error && flags.length > 0 && !isOfflineCache` ("Couldn't refresh — showing older data. Tap to try again." → `refresh()`), ceding to the offline banner when we actually fell back to cache. Chosen **inline** (Home-scoped) over the shared `LiveStatusRegion` to avoid cross-tab announcements and collisions with S10/S11 (whose `refresh()` `finally` clears the region).

**Verification:** `offlineBannerText` unit test (base string with no timestamp; `"from Nh ago"` with one); `flagsStoreSwr.test.tsx` renders the provider, forces a network failure over a warm cache, and asserts `offlineCachedAt` is a valid ISO string then clears to `null` on recovery; Home B9b source invariants (guard condition + copy + live-region + `refresh` retry). *[test-verified · code-inferred on device]*

**FORK 4 (left for Sky):** guests get no offline cache (a deliberate privacy choice). B9 ships only the age-display + failure-surfacing halves — both correct under either fork branch. **Not touched:** no cache-scope / RLS / schema change.

---

## B10 — Web locate-failure gets a visible + spoken outcome (L7-07) — CLOSED

Commit `a656b67`. `Alert.alert` is a no-op on react-native-web, so a web "locate me" failure was fully silent.

- `MapScreen.tsx`: the `requestLocation` catch is now platform-branched — **web** routes through the persistent `LiveStatusRegion` (`setLiveStatus`, `tone:'info'`, `action: Retry`) — visible + live; **native** keeps its working, announced `Alert.alert` dialog. Reuses the P5 mechanism — **no new region, no component change**.
- The Retry re-runs the locate via a stable `requestLocationRef` (mirrors S11's `refreshRef`) so the closure doesn't make `requestLocation` depend on itself — **no new `exhaustive-deps` warning**.
- **Clear-on-retry (`1682a69`):** every locate attempt message-targeted-clears its own prior failure banner at the start (web-only), so a successful Retry dismisses the error and the catch only re-shows it if *this* attempt also fails. `clearLiveStatusMessage` clears the shared slot only when it still shows *our* message → never clobbers an S10/S11 data banner.
- **Distinct from S4:** S4's arrival banner fires on mount for a *denied permission* (non-throwing); B10 fires only in the catch of an *action-initiated* locate exception. Different node, copy, trigger. (S4 banner confirmed rendering in the web smoke.)

**Verification:** source invariants — web branch calls `setLiveStatus` with the message + Retry via `requestLocationRef.current()`; native branch retains `Alert.alert`; `setLiveStatus` imported. `LiveStatusRegion`'s own render/announce/Retry behaviour is covered by `LiveStatusRegion.test.tsx`. *[test-verified · web on-screen render needs a geolocation-throw the sandbox can't force → code-inferred]*

**PROTECT held:** PROTECT-6 (the locating fix, `location.test.ts`, the 15s race — untouched), box-none gesture law (LiveStatusRegion is already `box-none`), PROTECT-1/3.

---

## B7 — Heat "no zones" companion + iOS cluster-spring gate (L7-11 + L4-03) — CLOSED

Commit `01df333`. Two independent motion/UI legs.

**B7-A — heat empty-in-view companion (L7-11).**
The disclaimer states the k≥3 RULE but is silent about the OUTCOME; heat-on with no qualifying cluster renders blank, which reads as broken. Added a complementary live line after the disclaimer — **"No heat zones qualify yet — coverage grows as more reports come in."** — gated `heatmapEnabled && heatCells.length === 0 && filteredFlags.length > 0`. Reuses the `heatmapDisclaimer` styling (forced dark, AA-by-construction). *Honesty note:* `heatCells` is the global loaded set, not a viewport query (that's Fork 1 / L7-03), so the copy speaks to coverage, not literal "in view." **Copy is tunable — a genuinely-open wording choice for Sky's eye.**

**B7-B — gate the un-gated iOS cluster spring (L4-03).**
`react-native-map-clustering@4` fires a global `LayoutAnimation.spring` per pan-settle, guarded only by `animationEnabled && Platform.OS === 'ios'` — no reduce-motion check (`ClusteredMapView.js:139`). `PlatformMap` now passes **`animationEnabled={!reducedMotion}`**, short-circuiting that one call under RM. App-level prop — **no patch-package** (the repo has none). Mirrors S12's web-camera gate; extends PROTECT-7. `tracksViewChanges={false}` untouched (PROTECT-15).

**Verification:** B7-B RM **guard test renders the real `PlatformMap`** (clustering + maps mocked to capture props) and asserts `animationEnabled === false` under RM and `true` without — the ★ requirement. B7-A source invariants (condition + copy + live-region); the empty-when-no-cluster data condition is already covered by the k-anonymity tests in `MapScreen.heatmap.test.tsx`. *[test-verified]*

**NEEDS-SKY-DEVICE:** (1) the iOS cluster-spring **amplitude/feel** once gated; (2) the **L4-02-native `fitToCoordinates`** cluster-expansion leg — no `animated` override without flipping `preserveClusterPressBehavior` (changes press semantics, risks a UX regression), matching the motion-inventory's existing NEEDS-SKY-DEVICE disposition. Left as a flagged follow-up, not forced.

---

## Confirmation

- **B9 — CLOSED** (UI age + Home failure surfaced; Fork 4 left for Sky).
- **B10 — CLOSED** (web → LiveStatusRegion + Retry; native dialog kept; distinct from S4).
- **B7 — CLOSED** (heat companion + iOS spring gated; iOS amplitude + `fitToCoordinates` leg NEEDS-SKY-DEVICE).

All three CLOSED. Gates green at every commit. Reused (never duplicated): `relativeTime`, `LiveStatusRegion`/`setLiveStatus`, `useReducedMotion`, the Home retry idiom, the `heatmapDisclaimer` styles. No DB/RLS/schema/query-scope/external-send changes. **STOPPED on `bench/2-honesty` — Sky merges; one build carries the tier.**
