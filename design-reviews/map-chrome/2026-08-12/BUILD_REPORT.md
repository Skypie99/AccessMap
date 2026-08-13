# BUILD REPORT — Map-chrome compaction (Direction B-refined)

**Run:** RUN — MAP CHROME COMPACTION BUILD [Opus 4.8 max effort · build from locked spec · ONE branch · NO merge/push] · Sky-initiated (model gate satisfied).
**Contract:** `SPEC.md` (§0 pick, §0.5 refinements, §11 B-deltas) + governing visual `mockups/B2_command-bar-refined.html` + `01_CHROME_INVENTORY.md`.

## Branch discipline
- **Base SHA (then-current `main` tip): `242c3d6edbd72c8c5d8149e7310ae070a9b15fac`** (`242c3d6` — "docs(code-qa): the handoff says MERGED, because it is").
- **Branch: `design/map-chrome-b`** (cut from that tip). `main` never touched. No push, no EAS build, no deploy, no external send.
- Sibling map-gestures run stacks on THIS branch's tip (see §Sibling-run warning).

## Baseline (on branch, before any change)
- `npx jest --ci -w 3` → **199 suites, 2939 passed, 32 todo (0 fail)**.
- `npm run typecheck` → **0 errors**. `npm run lint` → **0 errors, 74 warnings** (all pre-existing).

---

## Phase 1 — Crystal tokens + additive GlassSurface props + arbiter ✅ (commit 1)
**What changed**
- `src/theme.ts` (light) + `src/theme/ThemeContext.tsx` (dark): NEW tokens
  - `glassMapCrystal0` = light `rgba(255,255,255,0.70)` / dark `rgba(30,34,46,0.80)` (bar gradient top; also the count-pill fill).
  - `glassMapCrystal1` = light `rgba(255,255,255,0.60)` / dark `rgba(30,34,46,0.70)` (bar gradient bottom; **also the blur-mode floorColor** — mode-independent floor math).
  - These are the **four new floor literals** the `mapChromeBudget` guard will pin. No shared token edited (`glassChromeLite0` dark byte-frozen — untouched).
- `src/components/ui/GlassSurface.tsx`: two **additive** props — `liteColors?: readonly [string,string]` (overrides the engineered `*Lite` gradient stops) and `floorColor?: string` (overrides the blur-mode floor). Both default to the recipe's own values, so every existing `GlassSurface.test` assertion passes verbatim.
- NEW arbiter declaration `tools/map-chrome-crystal-stacks.json` (crystalBar / countChip / pin065 surfaces × light+dark).

**Gate results (pasted)**
- Arbiter: `node ~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs …/map-chrome-crystal-stacks.json` → **RESULT: ALL PASS, exit 0**. Worst ratios: bar title #222/#F5F5F5 **5.58 / 5.40**; tool icons #0E4499/#B4CFFA **3.20 / 3.71** (≥3); count pill **9.61 / 12.21**; pin-0.65 legend #222 **6.52**; close-X #414B5A **3.62** (≥3); locating #333 **5.17**. (Matches SPEC §0.5 minimums.)
- `npm run typecheck` → 0. Full `jest --ci -w 3` → **2939 passed, 32 todo, 0 fail**. `npm run lint` → 0 errors, no new warnings.

---

## Phase 2 — The command bar (four top layers → one) ✅ (commit 2)
**What changed** (`src/screens/MapScreen.tsx`)
- The old two chrome rows — editorial title chip + menu/Feedback circles, then the count pill + 7-tool scrolling tray — collapse into **ONE crystal command bar**: `☰ · Explore · [count pill] · «pannable gap» · Search · Filters · ⋯`. It's a `GlassSurface variant="row"` with `liteColors`/`floorColor` = the crystal tokens, `pointerEvents="box-none"` (map still pans through the title + spacer; only buttons + count take touches).
- **Overlay raised** to `insets.top + OVERLAY_TOP_PAD (8)` (was +16) — Sky's refinement ①; `chromeInsetTop` uses the same pad so callout clearance tracks the raised bar.
- **Menu** inlined with its own `useDrawerTrigger` (Home/Profile idiom) — feedback left the bar. **Count pill** carries the 4-arm honesty ternary **verbatim + contiguous** (bp13/arrival green) + `accessibilityLiveRegion="polite"`; title keeps `accessibilityRole="header"`.
- **⋯ tool sheet**: an **inline** panel (`variant="row" forceEngineered={glassLite}` + `glassMapWash`), NOT a Modal — so it never enters the dismissal-standard Modal census and adds no `useSurfaceTrigger`. Rows: Send feedback · Map legend · Refresh flags · Save a place. Filters ⇄ ⋯ are mutually exclusive.
- **Recenter** demoted to the top of the FAB column as a crystal circle. **Severity/category quick-cycles deleted** (`cycleSeverity`/`cycleCategory`/`catCycleActive*` + orphaned `CATEGORY_CYCLE`/`CategoryIcon`/`Shapes`/`SEVERITY_LABELS`) — their home is the filter panel discs/chips. **Saved-places chip row deleted** (Q4 → SavedPlacesModal via the sheet).
- **chromeBandPx** measure = the ONE bar height (`onCommandBarLayout`); the old two-row measure (`mapHeaderRowH`/`topRowH`/`MAP_HEADER_ROW_MARGIN_BOTTOM`) + the tray overflow-fade chain retired.
- Legend focus-return preserved: `legendTrigger.ref` now on the ⋯ button; all 5 dismissal-standard strings intact.

**Guard rewritten (authorized):** `MapScreen.headerActions.test.ts` — repointed from the old two-row regroup to the command-bar structure in the same spirit (bar is box-none / never a full-width opaque strip · menu keeps the drawer trigger · title header role · count live region). 6/6 pass.

**Gate results (pasted)**
- `pointerEvents="box-none"` count in MapScreen = **7** (dismissalStandard G needs ≥6 ✓).
- `npm run typecheck` → 0. Full `jest --ci -w 3` → **199 suites, 2942 passed, 32 todo, 0 fail** (only the authorized headerActions guard changed; bp13/arrival/announceCoverage/dismissalStandard/qaMerge/calloutRhythm/MapScreen.detail all green untouched). `npm run lint` → 0 errors, 74 warnings (== baseline, no new).

---

## Phase 3 — Crystal floating controls + ink swaps ✅ (commit 3)
**What changed** (`src/screens/MapScreen.tsx`)
- **Zoom + / −** and the **List** FAB go crystal (Sky Q3): each gets a `GlassSurface variant="row" forceEngineered` absolute-fill child (crystal tokens) behind the glyph, replacing the solid `ctaFill`/`overlay` fills. Glyphs → `barIconColor` (#0E4499/#B4CFFA); the **List word** darkens `color.brand → textStrong` because a 15px-bold label is NOT WCAG-large, so it needs the 4.5 floor (arbiter 5.58/5.40). `dimOnPress={false}` — the glass hides a bg dim, so feedback is the scale spring + haptic (existing List-FAB precedent).
- **Report FAB stays SOLID `ctaFill`** — Sky's one anchor. Recenter already crystal (Phase 2).
- Orphaned styles removed (`zoomBtn`, `fabSecondary`, `fabSecondaryText`); `fabCrystalPill` + `fabCrystalText` added. `forceEngineered` (literal) on all FAB glass → **zero blur-budget panes**.

**Superseded rationale (noted):** the zoom buttons' old "opaque so map tiles are unreachable beneath them" reasoning yields to Sky's explicit crystal Q3 call. Flagged for her device eyes.

**Gate results:** `typecheck` 0 · arbiter **ALL PASS** (unchanged pairs) · `jest` **2942 passed, 0 fail** · `lint` 0 err / 74 warn (== baseline).

---
*(Phases 4–6 appended as they bank.)*
