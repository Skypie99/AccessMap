# AccessMap UPLIFT — P4 "Motion Parity" (S12) — Verification Evidence

**Branch:** `uplift/p4-motion` (1 commit off P3 tip `b584747`). **STOPPED on the branch — NOT merged, NOT pushed, NOT built.** Sky merges; one EAS build carries everything; the device gate is hers.
**Model:** Opus 4.8 ultracode, max effort (authorized by the audit's model-provenance note; Fable exhausted).
**Green bar:** typecheck **0 errors** · lint **0 errors / 77 warnings** (pre-existing baseline, **0 new**) · jest — **10 new S12 guard tests pass** (both reduce-motion states × 5 camera paths). Full suite: **1789 passed / 84 todo / 1 failed / 1874 total**. The single failure is the known `TasksScreenFlagCard` `/ago$/` **date time-bomb** (see *Pre-existing baseline* below) — untouched by S12 and failing identically on the P3 base.

## What S12 fixes (one sentence)
A user who asked their OS for **less** motion was handed the app's **largest** motion — Leaflet's ~1–4s signature flight — on the core FIND payoff, because the web camera passed `flyTo(…, { duration: reducedMotion ? 0 : 0.6 })` and Leaflet treats `0` as **falsy** → its distance-based default flight. The fix routes **every** web camera path to the non-animated form (`{ animate: false }` → Leaflet short-circuits to an instant `setView`) under Reduce Motion, never a numeric-zero duration. Native already did this right and is **untouched**. Resolves **L4-01** (main), **L4-02** (cluster leg), **L4-04** (Leaflet built-ins), **L4-09** (the stale doc-comment that seeded the hole). WCAG **2.3.3** (Animation from Interactions).

---

## Per-proposal — what changed · verification

### S12 — Bring the web map camera up to the native reduce-motion standard · **code-verified + NEEDS-SKY-DEVICE**

**Files (3):** `src/components/PlatformMap.web.tsx` (all 5 camera paths + 1 comment) · `src/lib/accessibility.ts` (doc-comment rewrite) · new `src/components/__tests__/PlatformMapWeb.reduceMotion.test.tsx` (the guard test). **No native path, no `MapContainer` per-instance control config (clean seam left for S17), no DB/schema.**

**Every RM-gated camera path changed — the un-trap-able form (`reducedMotion ? { animate: false } : …`):**

| # | Path | Before | After |
|---|---|---|---|
| a | Main camera `flyTo` (imperative `animateTo`) | `{ duration: reducedMotion ? 0 : 0.6 }` | `reducedMotion ? { animate: false } : { duration: 0.6 }` |
| b | `ClusteredMarkers` prop | (no `reducedMotion` prop) | `reducedMotion?: boolean` threaded interface → destructure → instantiation |
| c | Cluster-expansion `flyTo` (marker click) | `{ duration: 0.4 }` (ungated) | `reducedMotion ? { animate: false } : { duration: 0.4 }` |
| d | `<Popup autoPan>` | (default `true`) | `autoPan={!reducedMotion}` |
| e | `<MapContainer>` init | only `zoomControl={false}` | `+ zoomAnimation={!reducedMotion}` `+ fadeAnimation={!reducedMotion}` |
| — | `zoomBy` (`setZoom`) | `{ animate: !reducedMotion }` | **unchanged** — was already correct |
| f | Comment @ main `flyTo` | "Instant jump when Reduce Motion is on" | now **names the falsy-zero trap** so no future reader re-introduces it |
| g | `accessibility.ts` doc-comment | "Web/unsupported platforms quietly resolve to `false`" (the lie) | now states the **web-RM truth**: RN-web `isReduceMotionEnabled()` resolves from `prefers-reduced-motion` (it does not reject) → the gating is load-bearing on web |

Only the two init gates the report named (`zoomAnimation`, `fadeAnimation`) — **not** `markerZoomAnimation` or anything else.

**Grep-proof (post-fix, `PlatformMap.web.tsx`):**
- executable bare `duration: 0` (not a decimal, excluding comments) → **NONE**.
- the two executable camera options → both `reducedMotion ? { animate: false } : { duration: 0.4 | 0.6 }` (lines 387, 736).
- native `PlatformMap.tsx` still `reducedMotion ? 0 : 600` / `{ duration: reducedMotion ? 0 : 300 }` — **present & correct** (react-native-maps, where `0` genuinely means instant).

**Guard test — the real deliverable (10/10 pass, both RM states):**
Renders `PlatformMap.web.tsx` with a test-local mock of `react-leaflet` (one shared fake Leaflet map handed to both the `MapContainer` ref and `useMap()`, so main + cluster `flyTo` land on the same spy), `leaflet` (only `TileLayer` + `divIcon`), and `supercluster` (a stub that always yields one cluster + one lone pin so the **real** `ClusteredMarkers` click handler fires). `reducedMotion` is driven purely as a **prop**. For each of `reducedMotion ∈ {true,false}` it asserts:
1. **main flyTo** → `{ animate: false }` under RM / `{ duration: 0.6 }` otherwise, `.not.toHaveProperty('duration')` under RM.
2. **cluster flyTo** (found by the cluster marker's `title`, its real `eventHandlers.click()` fired) → `{ animate: false }` / `{ duration: 0.4 }`.
3. **MapContainer** `zoomAnimation`/`fadeAnimation` === `!reducedMotion`.
4. **Popup** `autoPan` === `!reducedMotion`.
5. **regression sweep** — over every `flyTo` call, `not.toEqual({ duration: 0 })`, and under RM `not.toHaveProperty('duration')`.

**Mutation proof (the test bites):** temporarily reverting the main `flyTo` to the buggy `{ duration: reducedMotion ? 0 : 0.6 }` makes exactly the **RM=true main-camera** test and the **RM=true regression-sweep** test fail (opts become `{duration:0}`), while the non-RM tests stay green. Fix restored; re-run 10/10 green.

**Probe (`rm-flight`):** correctness is **code-verified**, deterministically: the guard test proves our code emits `{ animate: false }` (never `duration: 0`) on every RM path, and Leaflet's own source (`animate === false → return this.setView(...)`, confirmed in the audit's S12 verdict against `leaflet-src.js:3474–3476`) makes that an instant cut. A live Chromium frame-capture would only add the **felt** "instant cut vs. arc," which is inherently the device/visual gate — and reaching the live web map requires standing up Expo-web past the Supabase auth gate, high-effort and flaky against the deterministic proof already in hand. So the felt result stays **NEEDS-SKY-DEVICE (D5)**; the earlier audit `rm-flight` probe already caught the *bug* at HEAD.

**PROTECT-7 re-confirmed (unregressed):** the diff touches **only** `PlatformMap.web.tsx` + `accessibility.ts` (+ the new test). The 32 gated Modal sites, the FlagCard sheen (`TasksScreen.tsx`), and the web splash `prefers-reduced-motion` media query (`public/index.html`) are **byte-unchanged** (none appear in `git diff --name-only`). The map overlay `pointerEvents="box-none"` gesture law is untouched (no `pointerEvents`/pane/stacking change in the diff). This EXTENDS PROTECT-7 to the last surface that escaped it; non-RM users are untouched (the 0.6s / 0.4s flights stay).

---

## Deviation from the approved plan (one, justified)
The plan anticipated keeping `supercluster` **real** via a one-line `moduleNameMapper` in `jest.config.js`. In practice `supercluster`'s `package.json` is `"type": "module"` and its UMD dist does **not** `require()` cleanly under jest (it resolves to an empty object, not the constructor), making the real-dist mapping fragile. **Resolution:** mock `supercluster` inside the test file instead. The clustering *algorithm* is irrelevant to S12 — the **real** `ClusteredMarkers` click handler (the edited code) still fires with a real `reducedMotion`, so the assertion value is fully preserved. Upside: **`jest.config.js` is untouched** and the change stays entirely test-file-local (smaller, safer diff — matches AccessMap's "small, understandable diffs" ethos).

## Pre-existing baseline (flag for Sky — NOT S12)
`src/screens/__tests__/TasksScreenFlagCard.test.tsx:117` (`expect(getByText(/ago$/))`) fails on the P3 base and on this branch alike. Cause: `relativeTime()` caps relative strings at **30 days**, then returns an absolute date; the fixture `created_at: '2026-06-05'` is now ~31 days before today (2026-07-06), so it renders "Jun 5, 2026" — no `…ago`. It's a **time-bomb in the test fixture**, not a product bug. A durable fix would pin `now` (pass the 2nd `now` arg to `relativeTime`) or use a relative `created_at` in the fixture. Out of scope for S12; left untouched to keep the diff clean.

## Commit (on the branch only)
```
uplift/p4-motion — S12: kill the falsy-zero reduce-motion trap on the web map camera (Motion Parity)
```
1 commit off P3 tip `b584747`. Rollback anchor: `b584747`.

## S12 status: **CLOSED**
All 5 RM-gated camera paths gated to the un-trap-able form; both comment lies corrected; 10/10 guard tests pass (both RM states + no-`duration:0` sweep + mutation-proven); grep-clean; PROTECT-7 + box-none + native path unregressed. STOPPED on `uplift/p4-motion` — Sky merges, one build carries it, device-feel gate is hers.
