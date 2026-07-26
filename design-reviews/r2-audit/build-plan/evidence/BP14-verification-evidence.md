# BP14 — verification evidence (T13 editorial frame + T14 overflow scent)

**Branch:** `r2/bp14-editorial-frame` · **base** `6e8e636` (bp13 tip) → **tip** `edfcb08` · **2026-07-18**
**Provenance:** spec authored on Claude Fable 5 max (2026-07-15); executed on **Opus 4.8 ultracode, max effort** (S-10, Sky-initiated + plan-approved via ExitPlanMode). All sub-agents (3 adversarial skeptics) ran on Opus max.
**STOP:** built + green + STOPPED on branch. NOT merged / pushed / built / deployed — Sky's hands.

---

## Gates (all hard — all PASS)

| Gate | Result |
|---|---|
| `npm run typecheck` | **0 errors** (verified after every commit; skeptic re-ran independently, clean) |
| `npm test` | **2029 passed / 0 failed / 84 todo, 139/139 suites** — CLEAN full run. Baseline 2014 (bp13) + 15 BP14 guards. |
| `npm run lint` | **0 errors, 77 warnings** = the BP13 baseline (77) — **0 NEW** warnings. |
| 7 immutable stacks files | **0-diff** (`git diff 6e8e636 HEAD --name-only | grep -i stacks` → empty). |
| Arbiter | **NOT required** — see F2-08 decision below. |
| Diff scope | **exactly 14 tracked files**, all in the permitted set (verified `--name-only`). `.claude/launch.json` deletion is in NO commit. |

**Flake note (honest):** two parallel-run failures surfaced on an intermediate full run — `StatusHistoryModal.test.tsx` and `MyReportsModal.test.tsx`, each ~44s (worker-teardown timeout under parallel load). Both **pass in isolation (10/10)** and have **zero references** to any BP14-changed module. Confirmed pre-existing environmental flakes; the clean re-run is 2029/0. Not papered over.

**Jest guard tally (15 new):** wrap at-rest pin + starved-width wrap (2) · distance NBSP + speakDistance-ASCII (2) · Settings inset-override (1) · Map pair-container source-scan (3) · `computeOverflowHasMore` pure-fn table (7).

---

## What shipped, per commit

### C1 `ed406f0` — T13/wrap (F2-02 HIGH)
`src/components/ui/ScreenHeader.tsx`: the **one** functional change is `numberOfLines={1}` → `numberOfLines={2}` on the display title. At the M18 auto-fit 0.6 floor, a still-overflowing title now **wraps to a second line instead of tail-ellipsizing** — WCAG 1.4.4 restored on the shipping web export. Everything else byte-identical: the `handleTitleLayout` estimate, `MIN_TITLE_SCALE=0.6`, `CHAR_WIDTH_RATIO`, `DISPLAY_MAX_FONT_SCALE`, `adjustsFontSizeToFit`/`minimumFontScale`, and all styles (`title` marginTop:2/flex:1, `titleRow`, `header` paddings). Guards: an at-rest structural pin (fitting title stays 40pt one line, protected margins intact) + a starved-width wrap (floors to 24, `numberOfLines 2`, no ellipsize, full string). *verified*

### C2 `3e49c39` — T13/unit (F2-13)
`src/lib/distance.ts`: `formatDistance` joins value+unit with **U+00A0** in all 3 branches, written as the grep-visible ` ` escape (**0 raw NBSP** in the file — byte-scanned). "297 m" can no longer orphan its unit. `speakDistance` is **byte-identical** (plain ASCII, full words) → VoiceOver wording unchanged; `formatWalkingEta` left ASCII (out of T13/unit scope → parking-lot). 8 test assertions updated + 2 guards (formatDistance carries NBSP / never an ASCII space before the unit; speakDistance stays ASCII, "500 meters away" pinned). No consumer splits/regexes on the distance space (census: all 6 consumers interpolate/render). *verified*

### C3 `37616f3` — T13/insets (S-3 cheap-win)
- **F2-05** `src/screens/MapScreen.tsx`: `<HeaderActions>` (a bare 2-Pressable fragment) wrapped in ONE `<View style={styles.mapHeaderActions} pointerEvents="box-none">` (`{flexDirection:'row', alignItems:'center', gap: spacing.xs}`). The space-between `mapHeaderRow` now has 2 children (chip-left / actions-right) — the menu circle no longer strands mid-air. box-none law preserved (wrapper hugs content; the only fall-through is the 6px inter-button gap; both 44pt targets discrete; SR order [chip, menu, feedback] unchanged).
- **F2-06** `src/screens/SettingsScreen.tsx`: `<ScreenHeader style={styles.settingsHeader}>` + `settingsHeader: {paddingHorizontal: 0}` → eyebrow drops from 44 (container xxl 24 + header xl 20) to a single 24, flush with the section rows. **Horizontal-only** (vertical rhythm intact); **Profile untouched** (S-3).
- **F2-12** chip `mapHeaderChip.paddingHorizontal 14 → spacing.md` (width-only, does not feed T1's chrome-band height). **`MAP_HEADER_ROW_MARGIN_BOTTOM = 10` PARKED** (see §A).
- **F2-11** NO CODE — registered on the device gate (§D). Guards: Settings inset-override pin + Map pair-container source-scan. *verified*

### C4 `edfcb08` — T14/scent (F2-07 + F2-08)
- New `src/hooks/useHorizontalOverflowFade.ts`: the pure `computeOverflowHasMore(contentW, viewW, offsetX)` (byte-identical `overflow>1 && !atEnd`, `atEnd = offsetX >= overflow-1`) + the hook returning `{hasMore, scrollHandlers:{scrollEventThrottle:16, onScroll, onLayout, onContentSizeChange}}`.
- New `src/components/ui/OverflowFade.tsx`: the **single source of the ink** (light `rgba(15,27,45,0)→0.22`, dark `0→0.38`; start/end/pointerEvents/a11y props identical to the shipped gradient; `edge`/`width` props; `visible={false}`→null). Barrel-exported.
- Grafted onto the **6 silent chip rails / 5 surfaces**, each in a `position:relative` wrapper (shared `filterRow`/`row`/`chipScroll`/`categoryScroll`/`chipBarScroll` untouched): Map filter Categories + Saved-sets, Report templates + categories, Tasks strip, Nearby tablist. **Saved-Places quick-jump row NOT touched** (out of scope).
- Action bar **RETROFITTED** to the same `OverflowFade edge="pill"` + `computeOverflowHasMore` (ink + algorithm single-sourced); the dead inline `LinearGradient`, the `actionBarFade` style, and the now-unused `LinearGradient` import all retired (0 remaining refs). Guard: the 7-case pure-fn table covers all 7 fade sites. Blur budget **+0** (gradients, not BlurViews). *verified*

---

## F2-08 efficacy decision — **SHIP UNCHANGED, no arbiter** (code-inferred + device-gated)

The T14 fade ink is the **already-shipped, ratified S16 affordance** reused with **zero value change**. Per the recon layering analysis, every graft backdrop is ≥ the action bar's own floored engineered-glass over near-white Positron, so if the shipped ink reads on the action bar (it ships in production) it reads on all six rails. The plan's empirical live-probe **could not run in this environment** (Playwright is not installed; the capture rig is a Playwright client), so the decision is **code-inferred** and grounded in the shipped-ratified status, with the light-theme "does the fade read over Positron" eye check folded into the device gate (§D-d). Because the ink is unchanged (no new pair), the **conditional arbiter gate does not fire** — no `r2-chip-fade-stacks.json` this phase.

## Captures — DEFERRED to the device/eye gate (honest)

The static-export capture rig needs Playwright (absent here), and the on-disk `dist/` predates BP14. So the planned frames — home/nearby `zoom200` re-shoots, Settings header before/after, chip-fade forced-overflow — were **not produced this session**. They fold into Sky's device/eye gate (§D). The **code** is proven by typecheck 0 + jest 2029/0 + the 15 structural guards + the 3/3 adversarial UPHELD below; PROTECT invariants are proven by construction (below), which is stronger than a screenshot for the byte-identical claims.

## PROTECT — held (proven by guards + diff, not frames)

- **ScreenHeader at-rest rhythm / M18 floor** — the at-rest structural pin proves fontSize 40 + margins unchanged; `git show ed406f0` proves the only functional line is `numberOfLines`. `MIN_TITLE_SCALE=0.6`, `CHAR_WIDTH_RATIO`, `DISPLAY_MAX_FONT_SCALE` untouched.
- **M16 compact-stack** — `isCompactLayout` (`≤375 || ≥1.15`) not in the diff.
- **box-none overlay law** — the Map pair-container carries `pointerEvents="box-none"`; source-scan guard pins it; existing overlay structure untouched.
- **Fork 9** — `HeaderActions` is not `ui/Button`; `Button.tsx` not in the diff.
- **T1 chrome-band** — the chip snap is horizontal-only; `paddingVertical` and `MAP_HEADER_ROW_MARGIN_BOTTOM` untouched (parked).
- **S18 closed 200% legs** — not reopened (Home zoom-2 out of scope).

## Adversarial verify — **3/3 UPHELD, 0 defects** (Opus max, S-10)

Three parallel skeptics, each tasked to refute a claim:
1. **T14 graft correctness** — UPHELD (6/6): clean 1:1:1 hook→spread→fade with zero cross-wiring, all hooks unconditional (no Rules-of-Hooks violation), wrappers balanced, shared styles untouched, Saved-Places landmine avoided, action-bar retrofit behavior-identical, OverflowFade ink exact. Ran an independent `tsc --noEmit` clean.
2. **T13 correctness + PROTECT** — UPHELD (5/5): wrap provably cannot shrink/reflow a fitting title, distance NBSP correct + speakDistance byte-identical + 0 raw NBSP + no consumer breaks, box-none/SR-order preserved, Settings vertical rhythm intact + Profile untouched, token snap width-only + T1 untouched.
3. **Scope / gates / completeness** — UPHELD (6/6): diff = exactly 14 in-set files, launch.json in no commit, 7 immutable stacks untouched, all 5 commit-plan items closed (7 OverflowFade renders = 6 grafts + 1 retrofit), 4 guard suites faithful, commit hygiene clean, no dead code, no new user-facing strings.

One non-defect noted: the `settingsHeader` comment "adopt Profile's convention" is horizontal-only where Profile zeros all three — comment-only; the code matches the claim.

## For Sky to eyeball (NEEDS-SKY-DEVICE — see §D)

- T13: the two-line headline wrap at real Dynamic Type ~1.3; the F2-11 "Resolved" window (376–390pt @ 1.10–1.14); Map header pair + Settings inset alignment, both themes.
- T14: each chip rail's overflow fade appearing/hiding on a narrow width; **the F2-08 light-theme read over the Positron action bar**.
- PROPOSED strings: **none** (BP14 introduces no new user-facing copy).
