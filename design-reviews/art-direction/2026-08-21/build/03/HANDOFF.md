# HANDOFF — Prompt 03, Phase 1c (the map)

**Branch** `design/gsp-03-map-2026-08-21` · **base** `main` @ `2c631e7`
(Prompt 00 merged as `ceef880`, Prompt 01 as `7141a33`; Prompt 02 sits UNMERGED on
`design/gsp-02-flagdetail-2026-08-21` @ `858f89a` — see "Sibling" below.)

## Measured baselines (before the first edit)
- `npm run typecheck` → 0 errors
- `npx jest --ci -w 3` → **232 suites / 3370 passed / 32 todo / 0 failed**
- `npm run lint` → **0 errors / 82 warnings**

## Scope (this prompt only)
3.1 POIs · 3.2 first frame · 3.3 pin (44pt wrap + lighter outline + D16) ·
3.4 Legend button · 3.5 verify bar-at-AXL survived · 3.6 one surface at a time.

## State — ALL CODE ITEMS COMMITTED
- [x] Handshake, branch, baselines
- [x] 3.5 VERIFIED (nothing to build): `barTitleHidden = isAxRecompose(fontScale)`
      is live at `MapScreen.tsx:365` and branches in `barCenter`. Prompt 00
      shipped it; it survived the merge.
- [x] 3.1 POIs off — `a84fa09`
- [x] 3.2 first frame — `607ea7e`
- [x] 3.3 pin (44pt wrap, retuned outline, D16) — `5071476`
- [x] 3.4 Legend button — `eeeccad`
- [x] 3.6 one surface at a time — `2d369b5`
- [x] sim-release build + re-walk + captures (17e, light/dark, medium/AXL)
- [x] 3.2b THE FIX THE SIMULATOR FORCED — `d446499`
- [x] BUILD_REPORT.md

## DONE. Nothing in flight. Sky merges.
Six commits, `main` untouched at `2c631e7`. Read `BUILD_REPORT.md` — §3 (the POI
finding), §6 (what the device changed), §8 (an out-of-scope defect found: the
map's +/- zoom buttons are a no-op on iOS), §9 (NEEDS-DEVICE).

## Gates as of the last commit
typecheck 0 · jest **235 suites / 3408 passed / 32 todo / 0 failed** ·
lint **0 errors / 82 warnings** (= baseline exactly).
Arbiter: `build/03/pin-arbiter.txt`, exit 0, worst union 3.15:1.

## Guards re-pinned (never deleted) — 3
`hitTargetFrame` (its docblock recorded the 38x40 marker as a deliberate
exclusion; Q9 supersedes that, and four real assertions replace the prose) ·
`dismissalStandard` (the focus-return census named the wrong opener) ·
`MapScreen.detail` (`onOpenDetails` is a named handler now).
Guards ADDED — 3: `regionForNearestFlags`, `MapScreen.legendButton`,
`MapScreen.oneSurface`. None deleted.

## Deviations from the prompt, with reasons (carry into the report)
1. **§3.6's fallback would not have worked.** `hideCallout` was added to
   `PlatformMapHandle` (both platforms) rather than clearing `focusedFlagId`,
   which only drives marker opacity. See the 3.6 commit body.
2. **Send feedback also clears** — the rule is "any sheet"; the prompt's
   parenthetical enumerated seven and this is an eighth door from the same
   tool sheet.
3. **The pin-placement return path (`handleConfirmPin` / `handleCancelPin`) does
   NOT clear** — it re-presents an existing Report draft rather than opening a
   sheet, and placement has its own bar.

## Findings already banked (carry these into the report)
- **POI category filter is UNAVAILABLE (Q8 fallback A).** `react-native-maps`
  **1.20.1**. `showsPointsOfInterest` is a plain BOOL bridge
  (`ios/AirMaps/AIRMapManager.m:92`, typed at `lib/MapView.d.ts:465`). There is
  **no** `pointOfInterestFilter` / `MKPointOfInterestFilter` anywhere in the
  package (grepped `lib/`, `src/`, `ios/`, `android/` — zero hits), so MapKit's
  iOS-13 category filter is simply not exposed. `poiClickEnabled` (:59) is the
  Google/Android tap toggle, not a filter. → `showsPointsOfInterest={false}`.
- **`PlatformMapHandle` has no `hideCallout`.** §3.6's fallback ("otherwise clear
  `focusedFlagId`") does NOT hide a native callout — `focusedFlagId` only drives
  marker `opacity` (`PlatformMap.tsx:461`). Taking the prompt's preferred branch
  instead: add `hideCallout()` to the handle (both platforms), mirroring the
  existing `showCallout(flagId)` over the same `markerRefs`. Reason recorded in
  the report.

## Sibling / one-writer
Only this window is live (`git worktree list` → three STALE detached HEADs from
Aug 19-20, no gsp branch). Prompt 02 touched `src/screens/MapScreen.tsx` in ONE
place — a `distanceKm` prop on `<FlagDetailModal>` at :2892 — so 02 and 03 are
one-writer-safe in practice; flag the textual adjacency for whoever merges second.

## Sim state
iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC`, sim-release built from
`d446499` and installed. Left in **light + medium**, on the map, one callout open.
Temporary `GSP03*` instrumentation was removed before `d446499` was committed
(grep the tree for `GSP03` — zero hits).
