# BUILD REPORT — Prompt 03, Phase 1c: THE MAP

**Branch** `design/gsp-03-map-2026-08-21` · **base** `main` @ `2c631e7`
(Prompt 00 merged as `ceef880`, Prompt 01 as `7141a33`.)
**Six commits, all on the branch. `main` untouched. Sky merges.**

---

## 1. Gates — measured, not quoted

| Gate | Baseline (before the first edit) | Final | Delta |
|---|---|---|---|
| `npm run typecheck` | 0 errors | **0 errors** | — |
| `npx jest --ci -w 3` | 232 suites · 3370 passed · 32 todo · **0 failed** | **235 suites · 3408 passed · 32 todo · 0 failed** | +3 suites, +38 tests |
| `npm run lint` | 0 errors · 82 warnings | **0 errors · 82 warnings** | exactly baseline |
| Pin arbiter (`pin-arbiter.mjs`) | n/a (new) | **exit 0**, worst union 3.15:1 | — |

The known `ReportFlagModal` flake did not appear in any run.

Lint went to 85 warnings mid-build and was brought back to 82 by moving
`filtersOpen` up beside `toolsOpen` so `clearMapSurfaces` could be a real hook
dependency instead of three `eslint-disable` lines. Warnings are at baseline, not
merely "close to it".

---

## 2. The six commits

| # | Item | Commit | Files |
|---|---|---|---|
| 3.1 | POIs off (M1) | `a84fa09` | `PlatformMap.tsx` |
| 3.2 | The first frame (M2) | `607ea7e` | `distance.ts`, `MapScreen.tsx`, +1 suite |
| 3.3 | The pin: 44pt target, lighter drawing, D16 (M3/Q9) | `5071476` | `PlatformMap.tsx`, `hitTargetFrame.guard` |
| 3.4 | The Legend button (M4/Q10) | `eeeccad` | `MapScreen.tsx`, `dismissalStandard.guard`, +1 suite, COPY_LEDGER |
| 3.6 | One surface at a time (S4/D6) | `2d369b5` | `MapScreen.tsx`, both `PlatformMap` variants, `MapScreen.detail`, +1 suite |
| 3.2b | **The fix the simulator forced** | `d446499` | `MapScreen.tsx` |

**3.5 needed no work.** `barTitleHidden = isAxRecompose(fontScale)` is live at
`MapScreen.tsx:365` and branches inside `barCenter`; Prompt 00 shipped it and it
survived the merge. Verified on the device at AXL: the bar reads
`☰ · 13 flags · ⌕ ⚟ •••` with no title and no "Ex…"
(`after/17e_light_axl_A6_map.png`).

---

## 3. THE POI FILTER FINDING (Q8)

**A category filter is not available at this version, so fallback A shipped:
`showsPointsOfInterest={false}`.**

- `react-native-maps` **1.20.1**.
- `showsPointsOfInterest` is a plain BOOL bridge — `ios/AirMaps/AIRMapManager.m:92`
  (`RCT_EXPORT_VIEW_PROPERTY(showsPointsOfInterest, BOOL)`), typed at
  `lib/MapView.d.ts:465`.
- **No `pointOfInterestFilter` / `MKPointOfInterestFilter` anywhere in the
  package** — grepped `lib/`, `src/`, `ios/`, `android/`: zero hits. MapKit's
  iOS-13 category filter is simply not exposed, so "keep transit, parks,
  hospitals, schools; drop food, hotels, shops" cannot be expressed.
- `poiClickEnabled` (`lib/MapView.d.ts:59`) is the Google/Android *tap* toggle,
  not a filter.

Revisit if the library ever bridges `pointOfInterestFilter`; the change would be
one prop at the same call site.

Scope of the prop: it is an AIRMap (Apple) property, so **Android is unaffected**,
and the **web** arm cannot be filtered at all — CartoDB bakes POI labels into the
raster tiles. `PlatformMap` is shared, so the **Home peek inherits it** in the
same edit (verified on the device: the peek's tiles are clean).

---

## 4. Deviations from the prompt, and why

**(a) §3.6's stated fallback would not have worked, so the other branch was taken.**
The prompt said: hide the callout with `mapRef.current?.hideCallout?.()` *if the
handle has it*, otherwise clear `focusedFlagId`. The handle did not have it — and
clearing `focusedFlagId` does **not** hide a callout: that prop only drives marker
`opacity` (`PlatformMap.tsx:461`). Taking the fallback literally would have
shipped a green gate and a failed acceptance. `hideCallout` was therefore added to
`PlatformMapHandle` and implemented on both platforms (native sweeps the mounted
marker refs; web calls Leaflet's `closePopup`). Proven on the device — §6.

**(b) "Send feedback" also clears.** The rule is "any sheet"; the prompt's
parenthetical named seven and this is an eighth door out of the same tool sheet.
Leaving it out would have kept one ghost.

**(c) The pin-placement return path does NOT clear.** `handleConfirmPin` /
`handleCancelPin` re-present an existing Report draft rather than opening a sheet,
and placement has its own bar. Deliberate.

**(d) The anonymous provenance ring was not retuned.** §3.3 named the white ring
and the navy hairline. `pinRotAnon`'s 1.5pt double ring is a semantic encoding
(S1/L8-7 — provenance, never a colour swap), not outline weight, so it was left
alone. This has a visible consequence — see §7.

---

## 5. Guards: 3 re-pinned, 3 added, 0 deleted

| Guard | Why it moved |
|---|---|
| `hitTargetFrame.guard` | Its docblock recorded "SW-29's 38x40 map markers stay on the documented idiom" as a deliberate exclusion (Sky, 2026-08-20). **Q9 supersedes that.** The prose is corrected and four real assertions replace it: the 44pt box *references* `a11y.minTargetSize` rather than typing it, the drop is still 26, the anchor is derived (and re-derived independently in the test, not pinned as a magic number), and both regimes of the GLASS §12.4 union survive as mode-independent literals. |
| `dismissalStandard.guard` | Its focus-return census said "the header help button opens it" — stale twice over. Rewritten to the real contract now that the Legend pill holds the trigger ref. Laws **F2** (no gesture handler in the map estate) and **G** (box-none ≥ 6) pass **untouched**; the box-none count went 8 → 9. |
| `MapScreen.detail` | Pinned `onOpenDetails={setSelectedFlag}` literally. It is a named handler now, because opening the sheet has to put the callout away first. The assertion pins the same meaning plus the ordering that makes it work. |

**Added:** `regionForNearestFlags.test.ts` (9) · `MapScreen.legendButton.test.tsx`
(8) · `MapScreen.oneSurface.test.ts` (17).

`MapScreen.arrival` and `classA` were **not** touched: the 3.2 restructure was
shaped specifically so `didInitialFitRef.current = true` still appears at exactly
the two sites `arrival` counts, and so the done-flag still sits after the
readiness check inside `commitFit`, which is what `classA` pins.

**PROTECT held:** the command bar's single live-blur pane and its crystal inks ·
the FAB crystal literals · PROTECT-15 (`tracksViewChanges={false}` + `pinKey`) ·
PROTECT-16 (pin literals stayed literal and mode-independent — only the numbers
moved) · the guest Report-FAB gate `{authUser && …}` · the heat layer ·
`HeatmapLegend`.

---

## 6. What the simulator changed — and it changed the outcome twice

iPhone 17e `9C9D3ED6…`, sim-release (`Build Succeeded`, `.app` rebuilt each time),
light + dark, medium + accessibility-extra-large. **Production law observed: no
report submitted, no sign-in, no user content touched. The report sheet was
walked to its edge and cancelled.**

### 6.1 The first frame was built correctly, then thrown away — twice over

Gates green, POIs off, Legend pill up, and the first frame **still showed zero
flags**. Two independent causes, neither visible to jest. Found by instrumenting
the effect and reading the device log, not by re-reading the source:

```
GSP03FIT    {done:false, loadingFlags:false, n:13, loc:FALSE, seed:true}
GSP03COMMIT {lat 49.883, lng -119.431, latDelta 0.024, lngDelta 0.203}
GSP03FIT    {done:TRUE,  ...,                loc:true}
```

1. **The fallback fit won a race it should not have entered.** `flags` come from
   the shared provider, so arriving from Home they are *already loaded* while
   `location` is still ~200 ms away. The no-location branch fitted all 13 flags
   and **spent the one-time latch**, so the located fit never ran. A resolved
   location is not a user gesture, so it may now upgrade the frame exactly once:
   `didInitialFitRef` means "the FINAL frame is claimed"; the provisional
   no-location frame latches its own `didFallbackFitRef`, and is not painted at
   all while a location read is in flight.
2. **The arrival camera move overwrote the fit anyway.** `requestLocation` is both
   the automatic arrival read and the Recenter button, and it animated over 600 ms
   either way — so the fit's instant snap landed first and the animation, finishing
   later, put the camera back on a street-level box. Last write wins; the animation
   always writes last. Before the first frame is claimed that move *is* the initial
   paint, so it now cuts instantly; afterwards it is Recenter and it still animates.

**Result, verified:** `after/17e_light_m_A6_map_first.png` — seven pins plus the
user dot, unclustered, no POI badges. The before
(`captures/17e_light_m_A6_map_first.png`) is the same city, same camera, **zero
pins** under a chip reading "13 flags".

### 6.2 The stacking, reproduced and then fixed

`after/_cmp_S4_stacked_before.png` is the walk's §16 finding, live: with the
callout open under the filter panel, "Blocked path" ghosts through the header and
the callout's blue "Open details" button reads as a blue band behind CATEGORIES.

`after/17e_light_m_C7_report_1.png` is the same sequence one tap later: **the
report sheet sits on a clean map** — no panel, no callout.

`after/_cmp_D3_return_after_blur.png` closes the other half: panel open → Home →
back, and the panel is gone while the camera is unchanged. The callout survives,
which is correct — §3.6 asks blur to close the panel and tool sheet and keep the
camera, and says nothing about the callout.

### 6.3 The pin

- **Tappable at 44pt, anchor correct.** A direct tap on a pin opens that pin's
  callout, correctly anchored (`after/17e_dark_m_A6_map_callout.png`). Early taps
  in this walk missed because my coordinate estimates were off, not because the
  target moved — recorded here because I briefly suspected the opposite.
- **The outline retune landed, measured.** Horizontal pixel scan through the same
  class of pin: hairline **3 px at #0F1B2D (full strength) → 2 px at ~#7B818B**
  (the 0.6-alpha composite). See `after/_cmp_pin_outline.png`.
- **The callout is unchanged** — stripe · title · census · time · description ·
  one action, light and dark. It is still the model.

### 6.4 AXL and dark

`after/17e_light_axl_A6_map.png` — the bar drops its word, no "Ex…"; the fitted
first frame holds at AXL; the pins hold their fixed boxes while the List pill and
Report grow; the Legend pill grows its label and keeps its discs.
`after/17e_dark_m_A6_map.png` / `17e_dark_axl_A6_map.png` — POI badges gone from
Apple's dark tiles (the loudest surface in the app in the walk's D3), pins carried
by the white ring exactly as the §12.4 union predicts, Legend pill on the dark
crystal.

---

## 7. Residuals, honestly

1. **The retune is nearly invisible on ANONYMOUS pins.** Their provenance
   double-ring (`pinRotAnon`, 1.5pt opaque #0F1B2D) is heavier than the hairline it
   surrounds, so it now dominates the drawing. On non-anonymous pins the retune is
   the whole change. Retuning the provenance ring was out of scope and is a
   semantic encoding — **Sky's call**, one line if she wants it.
2. **The pin-on-heat worst case tightened.** The arbiter's worst union fell from
   6.21:1 to **3.15:1** over a fully saturated sev-3 heat cell (floor 3:1, still
   passing). That number is conservative — heat fills paint at 0.65 alpha, so a real
   cell composites toward its tile and the hairline does better — but pin-on-heat
   legibility is **NEEDS-DEVICE**.
3. **No ceiling on the first frame's span.** M2 specifies a 0.02° floor and no cap.
   In a city whose five nearest flags are far apart, the first frame will be
   correspondingly wide. Kelowna fits comfortably; a sparse city is unverified.
4. **The camera "no-gesture" proxy is still a proxy.** The map is deliberately
   uncontrolled (no `onRegionChange`), so a user pan in the ~1 s before the first
   flags-load cannot be seen. Pre-existing shape; searches and saved-place jumps now
   claim the camera explicitly, which is strictly better than before.
5. **Two controls can read "Legend" at once** (heat on + heat legend collapsed).
   Logged as **W-12** in the COPY_LEDGER with a one-word recommendation. Screen
   readers hear two distinct names, so the floor holds; this is clarity, not a
   barrier.

---

## 8. ⚠ OUT-OF-SCOPE DEFECT FOUND (not fixed — reporting only)

**The map's own `+` / `−` zoom buttons do nothing on iOS.**

They were added as the single-pointer zoom affordance iOS otherwise lacks
(WCAG 2.5.7). `PlatformMap.tsx` `zoomBy` reads `getCamera()` and then calls
`animateCamera({ ...cam, zoom: (cam.zoom ?? 12) + delta })`. On iOS:

- `getCamera` resolves **`{center, pitch, heading, altitude}`** — there is no
  `zoom` key (`node_modules/react-native-maps/ios/AirMaps/AIRMapManager.m:215-227`);
- `setCamera` / `animateCamera` merge the JSON into an `MKMapCamera`, which has no
  `zoom` property, so the key is ignored and `altitude` is preserved.

Net effect: **`zoomBy` is a no-op on iOS.** `cam.zoom` is always `undefined`, so
the `?? 12` fallback also hides it. Observed on the device: repeated taps on both
buttons produced byte-identical frames (292 differing pixels out of 2.46 M, i.e.
antialiasing), while the List pill directly beneath them responded normally.

**Untouched by this phase** — pre-existing, in code this prompt did not name. The
fix direction is `altitude` (halve/double it) or `getMapBoundaries()` +
`animateToRegion` with scaled deltas, which is the primitive `animateTo` already
uses. Routing to Sky rather than fixing it here.

---

## 9. NEEDS-DEVICE (real hardware, not the simulator)

1. **Pin legibility zoomed out**, both tile regimes — the retuned 0.5pt @ 0.6
   hairline is 1.5 px at @3x and the arbiter's tightest union is 3.15:1.
2. **Pin on the heat layer** (§7.2) — the one place the union got tighter.
3. **How the map FEELS without POIs.** It is quieter and it is also emptier;
   whether Kelowna reads as "calm" or as "missing its landmarks" is a judgment
   only Sky on a real device can make.
4. **VoiceOver on the Legend pill's focus return** — `useSurfaceTrigger` is a no-op
   on web and jest can only prove the call was made with the right handle.
5. The zoom-button defect in §8, once fixed.

---

## 10. COPY_LEDGER

**No new strings.** "Legend", "Map legend" and the hint are reused byte for byte
from `HeatmapLegend` and the ⋯ row. One entry added — **W-12**, the "Legend"
collision — with three options and a recommendation.

---

## 11. Rollback

```
git revert --no-edit a84fa09^..d446499
```

Or simply do not merge the branch: `main` is untouched at `2c631e7`.

**Sibling note for whoever merges second:** Prompt 02
(`design/gsp-02-flagdetail-2026-08-21` @ `858f89a`, unmerged) also touches
`src/screens/MapScreen.tsx` — one `distanceKm` prop on `<FlagDetailModal>`. This
phase edits that file heavily but nowhere near that JSX block, so expect a clean
merge; verify rather than assume.

**STOP. Sky merges.**
