# BP2 — Perception Floor (T11 + T16) — Verification Evidence

**Branch:** `r2/bp2-perception-floor` (base `3d13c8b` = BP1 tip on `r2/bp1-callout-true`).
**Model law (S-10):** executed on Opus 4.8 ultracode max effort. Phase file authored Fable 5 max (2026-07-15) — provenance disclosed.
**Date:** 2026-07-17.
**Tag legend:** `verified` = observed in a run/probe here · `web-approximated` = static-export/Chromium probe (Safari pass deferred) · `code-inferred` = from source, not executed · `NEEDS-SKY-DEVICE` = requires a real device.

---

## What shipped (per commit-plan item)

### Commit 1 — T11 / SR-state (F1-03): `a11yToggle` `pressed` intent + migrate 9 chip families
- `src/lib/accessibility.ts`: `a11yToggle` gains a `pressed` intent — an **early-return** branch that emits web `aria-pressed`, mirrors the value into nested `accessibilityState.selected` (native VoiceOver parity), does **not** emit `aria-selected`, and preserves co-passed flags (`disabled`). The non-pressed branch is byte-identical, so the ~90 other call sites and the `toBe(state)` object-identity contract are untouched.
- Migrated `{selected}`→`{pressed}` on the named `role=button` chips only: **Map** saved-set / category / min-severity / status / affects / distance (`MapScreen.tsx`), **Report** template / category / severity (`ReportFlagModal.tsx`).
- **Left untouched** (already valid & AX-exposed): Report tags (`checkbox`+`checked`), Map heatmap (`switch`+`checked`), Tasks *sort* chips (`role=tab` — `aria-selected` is valid there).

**Why `pressed` for exclusive pickers too (executor decision, logged DECISIONS §A):** the spec offered exclusive pickers "tab/checked OR label-baked fallback." A red-team showed `pressed` is strictly better — it keeps the native `selected` trait (so the existing `ReportFlagModal` severity `.accessibilityState.selected` tests stay green), gives web a real cross-browser state, avoids the Firefox `aria-selected`+baked-label double-announce, and needs no `Platform.OS` branching; while a bare `role=tab`/`radio` carries the same roving-tabindex/keyboard-mismatch problem the skeptic rejected for `radio`. One mechanism = more "one voice."

**Verification — `verified` (CDP AX-tree re-probe, `design-reviews/r2-audit/tools/probe-bp2-perception.mjs`, static export :8082):**
- **Mechanism proof (deterministic):** an injected bare `<div role=button aria-selected=true>` shows **NO `selected`** in the CDP AX tree (`verdict_aria_selected_DROPPED_on_button: true`); an injected `<div role=button aria-pressed=true>` shows `pressed:"true"` (`verdict_aria_pressed_KEPT_on_button: true`). This is the F1-03 mechanism (skeptic's CDP finding) reproduced first-hand: on `role=button` Chromium drops `aria-selected` but keeps `aria-pressed`.
- **Live state:** after activating a Map category chip, the AX tree shows **5 chips exposing `pressed`** (`Minimum severity 1`=pressed:true with 2–5=false → the exclusive picker reports exactly one; `Filter by Open`, `Filter by Verified`, etc.). Where these chips previously announced no state on `role=button`, they now do.
- Guard suite `src/lib/__tests__/accessibility.test.ts` (`a11yToggle — pressed intent`): emits `aria-pressed`; mirrors `accessibilityState.selected`; NOT `aria-selected`; no phantom `pressed` key; keeps `aria-disabled` when co-passed; non-pressed path keeps object identity.
- **NEEDS-SKY-DEVICE:** iOS VoiceOver on the Report severity row + Map category chips — hears role + state on focus, live-region hint speaks once (no double-speak), state flip heard on re-focus. → DECISIONS §D (folds toward R2-D3).

### Commit 2 — T11 / focus-visible (F1-04): inert the occluded scene + un-clip the chip ring
- **Inert leg** (`src/navigation/RootNavigator.tsx` + `perceptionHelpers.ts`): a `ScreenInertLayer` wraps `screenLayout` and mirrors each scene's `useIsFocused()` → DOM `inert` (via `applySceneInert`). Web-only, additive.
  - **Probe-driven correction:** static analysis suggested react-native-screens `display:none`s inactive web scenes (which would make inert unnecessary). The probe **disproved** that — react-native-screens does NOT `display:none` the tab siblings here; the whole occluded Home scene (13 focusables: "Open the full map", the barrier cards) stayed in the Tab order under an `aria-hidden` (not display:none) ancestor. `aria-hidden` alone leaves tab stops (exactly the skeptic's warning), so `inert` is required.
  - **Verification — `verified` (probe):** after the fix — `inertAttrCount: 1` (the inactive scene), `leak_reachableUnderAriaHidden: 0`, `inertProtected_ariaHiddenAndInert: 13`. Guard: `perceptionGuards` (`applySceneInert` sets `inert` on web / no-op native / null-safe) + a source guard that RootNavigator wires `inert` off `useIsFocused`.
- **Ring-clip leg** (`MapScreen.tsx` `filterScroll` + `ReportFlagModal.tsx` `chipScroll`): the horizontal chip `ScrollView`s have `overflow-y:hidden`, clipping the `:focus-visible` ring (2px + 2px offset) to two vertical slivers. The ring **cannot** move inside the chip — active chips are filled brand blue `#1466E0` = the ring colour, so an inset ring would vanish (evidence-grounded override of the skeptic's "prefer inside"). Fix: the shared strip styles get 4px vertical headroom cancelled by a matching negative margin — the **outside** halo renders whole at **zero net layout cost**.
  - **Verification — `web-approximated` (geometric probe, ring reach = 4px):** on the named filter/category strips, **0 defect-clips** (tight strip + clipped) both screens; Report category chips `defectClip:false`. Screenshots `evidence/BP02/map-filter-panel.png` + `report-modal.png` show **no visual collision** from the negative margins (chip strips sit normally between their headings).
  - **Arbiter (`verified`, exit 0):** `r2-focus-net-stacks.json` — ring `#1466E0` vs the filter-panel/report-sheet glass + page grounds, both schemes, `min:3` (WCAG 1.4.11): light **3.70 / 5.24**, dark **3.24 / 3.40** → ALL PASS. The un-clipped ring is a visible non-text indicator in both light and dark.
  - **Scope note (documented follow-up):** the map **action-bar cycle button** (`actionBarScroll`, a distinct tuned surface — S16 scroll-fade) still clips its ring. It keeps a visible L/R indicator on an identifiable control, which meets the Map end-state ("a visible indicator on an identifiable on-screen control"); the stronger "complete four-edged ring" requirement is scoped to the Report chips (met). Full four-edged ring on the action bar / saved-places row = parked (DECISIONS §PARKING-LOT).
- `public/index.html` net: verified present, **zero edits** (the clip was the container's, not the net's).

### Commit 3 — T16 / badge (F3-03): one writer, one meaning
- Deleted writer 2 (`TasksScreen.tsx` `navigation.setOptions({tabBarBadge})`, open+verified/uncapped). Writer 1 (`RootNavigator.tsx`, open-only/capped-99, extracted to `computeTasksBadge`) is the sole writer + definition. **S-7 default applied** (open-only, GLOBAL/unfiltered — never filter-aware). Self-consistency scoped to the unfiltered/default arrival + the tab cut (the section "OPEN n" pill is `displayFlags`-filtered, so it legitimately diverges under a Tasks filter).
- **Verification — `verified`:** `perceptionGuards` — `computeTasksBadge` (undefined at zero; counts only open; caps at 99; stable pre-mount→post-triage) + a source guard that `TasksScreen` sets no `tabBarBadge`. `code-inferred`: on the Map screen the badge reads "6" (open count) = writer 1.

### Commit 4 — guards + evidence (this file)
- New guard suites: `accessibility.test.ts` (`pressed` intent, +6), `src/navigation/__tests__/perceptionGuards.test.ts` (+10: badge formula, inert helper, 3 source contracts).
- `perceptionHelpers.ts` — **testability extraction** (deviation from the literal file list, noted): the pure `computeTasksBadge` + `applySceneInert` had to leave `RootNavigator.tsx` because importing it into jest transitively loads `react-native-map-clustering` (a native module jest can't resolve). The helper is light (only `Platform`), so the mandated formula/inert unit tests can import it. RootNavigator imports from it.
- New tools (untracked `design-reviews/` tree): `probe-bp2-perception.mjs` (CDP AX + geometry + inert probe), `r2-focus-net-stacks.json` (arbiter sibling). Screenshots under `evidence/BP02/`.

---

## Gate results
- `npm run typecheck` → **0 errors** (`verified`).
- `npm run lint` → **0 errors / 77 warnings** = exact baseline, **no new warnings** (`verified`).
- `npm test` → **1929 passed / 0 failed / 84 todo, 130 suites** (`verified`; baseline 1913 at BP1 + 16 new guards). A first parallel run showed 2 flaky fails; a clean isolated re-run and a second full run both returned 0 fails — the documented parallel-load `waitFor` flake, not a regression.
- 7 immutable prior stacks files — **untouched** (`verified`): `map-stacks.json` tracked-diff empty; the other 6 (at real paths incl. `…/2026-07-03_glass_w1|w2/`) never edited.
- Arbiter `r2-focus-net-stacks.json` → **exit 0** (`verified`).
- Diff scope: `src/lib/accessibility.ts`, `src/screens/{MapScreen,ReportFlagModal,TasksScreen}.tsx`, `src/navigation/RootNavigator.tsx` + new `src/navigation/perceptionHelpers.ts` + test files. `public/index.html` — zero edits. All `design-reviews/` artifacts untracked. No other tracked file touched.
- Hard territory intact: `GlassSurface.tsx` untouched; `box-none` overlay law untouched; blur budget not exceeded; zero Supabase writes; no merge/push/build/deploy.

## PROTECT surfaces
- The audible filter-acknowledgment loop (count pill + the two `cycleSeverity`/`cycleCategory` `announceForAccessibility` calls) — untouched; no new live regions, no double-speak (the SR-state leg adds no announce strings).
- The web announce shim (`src/lib/announce.ts`, the mechanism the spec calls "PROTECT-26" — the literal tag doesn't exist in the repo) — untouched.
- Fork 8 (saved-set pills gain state semantics only, zero dark restyle) — honored. Fork 9 (`Button.tsx` untouched) — honored. S17 peek (Home mini-map goes inert under Map, no visible change) — honored.
- Screenshots (map-filter-panel.png, report-modal.png) are the before/after render proofs; no PROTECT surface changed visually.

## Pre-existing (not BP2's, surfaced honestly)
- `findNodeHandle is not supported on web` — a console warning from `useFocusOnOpen` (accessibility.ts, unchanged by BP2) when a modal opens on web. Out of scope; noted for a future SR-focus-on-open web pass.

## For Sky to eyeball
- The two screenshots (no visual regression; the negative-margin headroom is invisible).
- NEEDS-SKY-DEVICE: the VoiceOver SR-state device leg (§D).
- The `pressed`-for-exclusive-pickers executor decision (§A) — vetoable.
- Parked: action-bar/saved-places ring (full four-edged); the ~90 other `role=button` `{selected}` sites app-wide still carry the dropped channel (out of this phase's named scope); the Tasks catChip `:1005` native double-speak (baked ", selected" + trait).
