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

## Phase 4 — Disclosure surfaces (heat notice → glass + X · legend → 0.65 + close-X → chip) ✅ (commit 4)
**What changed**
- **Heat notice** (`MapScreen.tsx`): the black `#1a1a1a` slab (both the Art. 7 rule notice + the "no zones qualify" outcome line) becomes a **translucent always-light 0.65 pin** legacy `GlassSurface` (the map glows through). Ink `#222` at **weight 500** (glass type law). **Copy byte-frozen** (Jordan LENS6 C2 — unchanged). Q1: the main notice gains a **session-dismiss X** (`heatNoticeDismissed`, reset by an effect keyed on `heatmapEnabled` → **re-shows on every heat re-enable**). A11Y-213: GlassSurface is not an accessible leaf — the text node carries role + live region, the X is its own reachable button. The heat-empty companion keeps its condition + copy + live region (MapScreenHeatEmpty green).
- **HeatmapLegend** rebuilt: floor **0.82 → 0.65**, inks **→ #222** (arbiter 6.52), **close-X** (own reachable button, "Collapse heat map legend") **→ collapses to a min-44pt "Legend" chip** ("Show heat map legend"). **Auto re-expand on heat re-toggle falls out for free** — MapScreen only mounts `<HeatmapLegend/>` while heat is on, so an off→on cycle remounts it and the local `collapsed` state resets. A11Y-213 restructure: non-accessible container, accessible summary node (image role + label), separate collapsed branch.
- **Locating banner** joins the 0.65 pin family (§0.5③); ink `#333` = 5.17 on the thinner floor (arbiter).

**Guard rewritten (authorized):** `HeatmapLegend.test.tsx` — repinned to the new structure (6 text nodes expanded · summary carries image role/accessible/label · close-X its own button · separate collapse-to-chip branch that re-expands). 7/7 pass.

**Gate results:** `typecheck` 0 · arbiter **ALL PASS** (pin065: #222 6.52, #414B5A 3.62, #333 5.17) · `jest` **199 suites, 2939 passed, 0 fail** (MapScreenHeatEmpty untouched-green) · `lint` 0 err / 74 warn (== baseline).

---

## Phase 5 — Glass switch threading + bar long-press + GLASS.md §12.5 amendment ✅ (commit 5)
**What changed**
- The command bar already threads the switch (Phase 2): `forceEngineered={glassLite}` (full → true blur i=12; lite → engineered crystal) + `floorColor={color.glassMapCrystal1}` so the **blur floor == the engineered bottom stop** (mode-independent floor math). This commit adds the **trigger**.
- **Bar long-press flip** (`MapScreen.tsx`): the title is wrapped in a `<Pressable onLongPress={handleGlassToggle} delayLongPress={600} accessible={false}>`. `handleGlassToggle` = `hapticSelection()` → `toggleGlassMode()` (the TasksScreen gesture). `accessible={false}` keeps the SR tree + tap targets unchanged; the wrapper holds **only the title** (the menu/search/filter/⋯ buttons are its siblings, so their taps aren't swallowed), and the header role rides the AppText inside. The switch is **GLOBAL** (flipping on Map re-materialises Tasks + the filter panel) and persists (`@accessmap/glass_mode_v1`) — two doors, one switch.
- **GLASS.md §12.5 amended** with Sky's exception clause **verbatim** ("a SINGLE-pane persistent chrome may thread the glass-mode switch for an on-device A/B; the losing mode is removed in a later cleanup commit") + the map-bar long-press trigger note + the global/iOS-only/cleanup facts.

**Blur budget (worst simultaneous, mode=full):** bar (1) + filter-panel-OR-tool-sheet (1, mutually exclusive) + locating (1) + legend (1) + heat notice(s) (1–2 legacy) + tab bar (1) = **≤7 ≤ 12 ✓**. The crystal FABs (recenter/zoom×2/List) are `forceEngineered` literal → **0 panes**.

**Guard:** added long-press + threading assertions to `MapScreen.headerActions.test.ts` (widened the header-role window for the new wrapper). 9/9 pass.

**Gate results:** `typecheck` 0 · `jest` **199 suites, 2941 passed, 0 fail** · `lint` 0 err / 74 warn (== baseline).

**DECISION FOR SKY (flash):** SPEC §0 says copy `TasksScreen.tsx:472-476` *verbatim*, incl. its `showFlash("Glass effects: …")`. **MapScreen has no flash pill** (that's a TasksScreen primitive), so the verbatim copy isn't possible. I kept the load-bearing halves — `hapticSelection` + `toggleGlassMode` — and the store's SR announce; the **visible confirmation is the bar re-materialising under the press** (the stated purpose of the gesture). Adding a flash toast to MapScreen would be new scope — flag if you want it.

---

## Phase 6 — Guards + verification + report ✅ (commit 6)
**Count pill Q2 (verification-driven).** The live render showed the full "Showing 8 flags" pill squeezing the title to "Expl…" at 430px. Sky's Q2 (§0) is *visible "8 flags", full "Showing 8 flags" as the a11y label*, so I implemented it: the count chip's **visible** text is the SHORT 4-arm form ("8 flags" / "8 of 20" / "Loading…" / "—"), and the **accessibilityLabel** carries the FULL honesty sentence verbatim (the "—" error count is HomeScreen's established honest-zero idiom). The full 4-arm ternary stays one contiguous block **as the label** — so bp13 + arrival read every pinned string there and pass **unchanged**. The visible AppText is `{...decorativeProps}` (A11Y-234: web-safe hiding, decorativeHiding guard green). Confirmed live: `barVisibleText='Explore 8 flags'`, `countA11yLabel='Showing 8 flags'`, and **"Explore" now renders in full**.

**New guard — `mapChromeBudget.guard.test.ts`** (SPEC §6c, adapted for the one-bar B layout): (a) exactly one measured chrome row feeds `chromeBandPx` (the command bar), the old two-row chain never resurrected; (a) the bar sits in `overlayTopGroup` ahead of the conditional layers; (b) the **four crystal floor literals** pinned (light + dark); (c) `chromeBandPx = Math.round(commandBarH.current)` and the bar hugs safe-area + 8; (c) the glass switch + crystal `floorColor` override are threaded. 5/5 pass.

**Quarter-budget measure (SPEC §7.3)** — live Expo web build driven in-session via the Claude Browser pane (numbers in `evidence/MEASUREMENT.json`; tool `tools/measure-mapchrome.mjs` for Sky to re-run):

| Device | Bar top (device) | Persistent band | % of viewport | ≤ 25%? |
|---|---|---|---|---|
| 430×932 | **67pt** (= safe-area 59 + 8 ✓) | 119pt | **12.8%** | ✓ |
| 393×852 | **67pt** ✓ | 119pt | **14.0%** | ✓ |

The rendered build **equals the governing mockup exactly** (119pt · 12.8%). Today's band was 231pt · 24.8%.

**Render-compare (honesty-tagged Chromium proxy)** — captured in-session:
- **Light × light tiles:** one crystal command bar (`☰ · Explore · 8 flags · search · filters · ⋯`); zoom/recenter/List crystal circles read through the map; the ⋯ sheet (Send feedback / Map legend / Refresh flags / Save a place) drops from the active ⋯ button.
- **Dark × light tiles (the cross / "mud test"):** the dark crystal bar (white "Explore", `#B4CFFA` icons) + dark crystal FAB circles are legible over light tiles.
- The remaining combos (light/dark-tiles, dark/dark-tiles) are arbiter-proved (all bases, both modes, exit 0) + shown in the mockup frames.

**Final gate run (all green):**
- Full `npx jest --ci -w 3` → **200 suites, 2946 passed, 32 todo, 0 fail** (baseline was 199/2939; +1 suite = mapChromeBudget, net test delta from the three authorized guard rewrites).
- `npm run typecheck` → **0 errors**. `npm run lint` → **0 errors, 74 warnings** (== baseline, no new).
- Arbiter `contrast-check.mjs …/map-chrome-crystal-stacks.json` → **exit 0, ALL PASS**.
- `pointerEvents="box-none"` in MapScreen = **7** (≥6 ✓).

---

## CLOSING TODO (for the cleanup commit, once Sky names the material winner)
Sky lives in one glass mode on-device (long-press the map title or the Tasks header), then names the winner. The **one cleanup commit** then:
1. Removes the losing mode's tokens/branches (the C-lite pattern) — if **lite** wins, drop the blur arm; the bar becomes literal `forceEngineered` and `floorColor` is unused. If **full** wins, the crystal gradient `liteColors` stays for Android + RT but the switch stops toggling it.
2. Removes **the map-bar long-press flip trigger** (`handleGlassToggle` + the title `Pressable` wrapper + the `barTitleWrap` style) — the switch is scaffolding, not a feature (GLASS §4). The Tasks long-press decision is Sky's separately.
3. Reverts the GLASS.md §12.5 exception to a plain statement of the winning material if the switch is fully retired.

## DECISIONS FOR SKY
1. **Glass-flip flash (§0 "copy TasksScreen verbatim").** MapScreen has **no `showFlash` primitive** (it's a TasksScreen pill), so the verbatim copy is impossible. I kept the load-bearing halves — `hapticSelection` + `toggleGlassMode` — plus the store's SR announce; the **visible confirmation is the bar re-materialising under the press** (the stated purpose). Want a flash toast added to MapScreen (new scope), or is the material flip enough?
2. **Count pill short wording (Q2 = SKY-WORDS).** Implemented placeholders: default `"8 flags"` (matches the mockup), filtered `"8 of 20"`, loading `"Loading…"` / `"Updating…"`, settled-error `"—"` (HomeScreen's honest-zero idiom). Full sentences live in the a11y label. Confirm or reword.
3. **⋯ tool-sheet labels (§9 SKY-WORDS).** Reused today's exact labels: "Send feedback", "Map legend", "Refresh flags", and **"Save a place" / "Saved places"** (empty vs has-places). Confirm.
4. **Legend focus-return lands on ⋯.** Opening the legend from the sheet arms `legendTrigger.ref` on the persistent ⋯ button (the sheet row unmounts on close), so VoiceOver returns to ⋯ ("More map tools") after the legend closes — the tool that surfaced it. Acceptable, or would you rather the legend keep a persistent trigger elsewhere?
5. **Count-chip dark fill = a dark veil, not the mockup's white-0.10.** The mockup's `rgba(255,255,255,.10)` dark count fails 4.5 on the thin crystal bar (arbiter), so the count reuses `glassMapCrystal0` (a faint darker pill in dark mode). This is exactly the "ink price" the mockup warns about — arbiter-forced, not eye-tuned.

## NEEDS-SKY-DEVICE (iPhone truths a Chromium proxy cannot prove)
- **Blur feel of the `full` glass mode** (i=12 BlurView over the moving map) + **pan smoothness** — the whole point of the on-device A/B. Long-press the map title to flip; live in each mode for a bit.
- **Reduce Transparency** → the designed opaque states (bar, count, FABs, sheet, legend, heat notice) — verify once visually.
- **Reduce Motion** → the bar has no new animation; confirm the long-press flip + crystal circle scale-spring behave (haptic is the RM-safe ack).
- **Large Dynamic Type** → the bar re-measures taller (chromeBandPx re-renders); confirm no clip and the title truncates gracefully.
- **VoiceOver / TalkBack** → the header-role rotor landmark on the long-press-wrapped title; the count live region re-announcing "Showing N flags"; the ⋯-anchored legend focus-return; the legend/heat-notice close-X reachability.
- The two theme×tile combos not capturable on web (web couples tiles to the app scheme; iOS Apple tiles follow the OS independently).
- **T1 callout clearance:** open a pin callout from Tasks→Map focus and confirm it clears the (now shorter, 119pt) chrome band.

## SIBLING-RUN WARNING (map-gestures)
Chrome landed FIRST, on `design/map-chrome-b`. The map-gestures run **stacks on THIS branch's tip**, never a parallel MapScreen fix-branch. **Hard blocker for that run:** `dismissalStandard.guard.test.ts` **law F bans `PanResponder` / `GestureDetector` / `Swipeable` anywhere in `src/`** — the gestures work must confront that law with **Sky's explicit sign-off** (amend the law deliberately), never silently. Also inherited-untouched by this run and pinned: the box-none overlay law (now 7 in MapScreen), `calloutScheduler.schedule(` = 4, `iconLabelRow` = 3, the FlagCard locked direction. The command bar's own long-press uses a plain `Pressable onLongPress` (allowed — not a banned gesture mechanism).

## THE STATE — STOPPED ON THE BRANCH
`design/map-chrome-b` @ 6 phase commits on base `242c3d6`. **`main` never touched. No merge, no push, no EAS build, no deploy, no external send.** Sky merges; Sky builds the app.

*Built 2026-08-12 by the Opus map-chrome build run, from the locked SPEC. This run built to the spec + the code; discrepancies (the flash primitive, the count-chip dark fill, the §6c formula adapting from A's two rows to B's one bar) are logged above as DECISIONS FOR SKY.*
