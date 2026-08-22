# BUILD REPORT — Prompt 01 · Phase 1a (Dynamic Type that keeps its hierarchy)

**Flagstone art-direction build series · Direction 1 "Ground · Stone · Path"**
2026-08-21 · iPhone 17e sim-release · six rules, seven commits.

---

## 1. Branch

| | |
|---|---|
| Branch | `design/gsp-01-type-rules-2026-08-21` |
| Base | `4dcc8f9a34b84bc733734408dfb8803942cc6ae1` — the tip of `design/gsp-00-phase0-2026-08-21` |
| Basing | **STACKED on Phase 0 with Sky's say-so**, which is the alternative the prompt's PREREQUISITE line allows. Phase 1a genuinely needs Phase 0 underneath: 1.1 wraps the `ScreenHeader` that 0.3 changed, and 1.2 opens by treating the map bar and the subtitles as already done. |
| `main` | still `a27864b`. Untouched by either branch. |

## 2. Gates — measured

| Gate | Baseline (branch time) | Final | Verdict |
|---|---|---|---|
| `npm run typecheck` | 0 errors | 0 errors | holds |
| `npx jest --ci -w 3` | **231 suites · 3315 passed · 32 todo · 0 failed** | **232 suites · 3370 passed · 32 todo · 0 failed** | +1 suite, +55 tests, **0 lost** |
| `npm run lint` | **0 errors · 82 warnings** | **0 errors · 82 warnings** | holds exactly |

22 source + test files, 962 insertions / 57 deletions.

## 3. The six rules

### 1.1 — Caps belong to containers (T3) · `cdc166b`
New primitive `src/components/ui/TypeBlock.tsx` + `TYPE_BLOCK` (header 1.6 /
chrome 1.3 / content uncapped), exported from `@/components/ui`. Resolution is
**explicit prop > nearest block > variant table**; the table stays the default
outside a block, so un-adopted screens render byte-identical. TypeBlock renders
no View, so wrapping a tree in one cannot move a pixel.

Adopted: `ScreenHeader` (header) · `SettingsRow` (content) · Nearby card
(content) · Legend sheet (content) · the report form's title/coordinates and its
severity meaning line (header).

**Two couplings this would have broken silently, fixed in the same commit:**
- `ScreenHeader.DISPLAY_MAX_FONT_SCALE` was 1.3 and its own comment said it
  mirrors AppText's display cap. The block renders the title at 1.6, so the
  auto-fit was about to estimate widths at a scale the title no longer renders
  at. It now reads `TYPE_BLOCK.header`, pinned by guard.
- `SeverityDisc` left its cap undefined, falling through to the label variant's
  1.6. Inside a content block that fallback disappears and the digit would have
  gone **uncapped inside a fixed 24 or 32pt circle**. It now states
  `DISC_MAX_FONT_SCALE = 1.6` — byte-identical today, immune to any block.

**Deliberately not capped:** the report form's honest prose (anon banner, photo
nudge, submission explainer). Capping body copy at 1.6 stops it short of the
200% WCAG 1.4.4 asks for, so only the form's chrome joined the block.

**One deviation:** the Legend took ONE block over the sheet rather than per-row.
Per-row fixes the rows and leaves the section headings ("Severity", "Status",
"Categories", heading 1.5) inverted one level up over uncapped row text. One
block fixes both, and every row is still inside a content block.

### 1.2 — Nothing clamps to one line (T4) · `4e299d1`
Swept all 15 `numberOfLines={1}` sites. Fixed five that carry content or a name:
the Leaderboard title, the comment byline, Home's search summary, the
filter-preset summary, and the lightbox caption (cap removed entirely).

Kept and now **written down** rather than assumed: the map-callout title (T4
allow-lists it), Tasks' sort chip and four bulk buttons, the RecentlyViewed chip,
Profile's status pill and stat label, MyFeedback's date, and MapScreen's
"Explore" — which since Phase 0 only renders below the recomposition point.

**Deviation:** the prompt asked for the lightbox caption to SCROLL. That bar is
`pointerEvents="none"` precisely so a tap anywhere dismisses the lightbox; a
ScrollView there would swallow the tap and break the escape path, which is on
the PROTECT list. The cap is simply removed.

### 1.3 — The width rule (T5) · `01ff321`
Four rows had the geometry that character-broke "Broken sidewal / k": a text box
sized by what a non-shrinking sibling left over, in a row that could not wrap.
Both halves applied each time — wrap on the row AND a floor on the text, the
half that was missed the first time SW-36 was called fixed.
`tierHeaderRow` (minWidth 140) · `filterTriggerRow` · `searchRow` (minWidth 200)
· onboarding's actions row. For onboarding's body, T5 says widen the column
before capping the text, so at the recomposition point the card gives its side
padding back and the body's own `maxWidth: 360` lifts with it.

### 1.4 — Home recomposes (F4, board 01) · `6c3b222` + `d55c78b`
`SeverityDisc` gains `scaleWithType` (circle and digit grow together, ceiling 2x;
off by default). Home rows wrap so the disc takes the line above a full-width
text block; the census breaks at the "·" before the status word into two
AppTexts with the same strings — the row's single accessibilityLabel is
untouched. The Report pill becomes a 56pt round FAB. A 47pt status-bar ledge on
Home and Settings.

**One deliberate narrowing, and it is an a11y call.** The board asks the search
control to become a 44x44 icon-only pill. The AppText inside it is the element
carrying `accessible`, the button role, the 44pt frame and the accessible name
(SW-10 / A11Y-214, pinned by `hitTargetFrame.guard`). Rebuilding the control
around the icon moves all four onto a different node to save a wrapper. The
label's *characters* go and the node stays: visually icon-only, structurally
untouched.

### 1.5 — SignIn at large type (X1, board 11) · `42f5c81`
The hero compacts to one row (mark 84 -> 32), the tagline stands down, and the
pinned policy footer takes the chrome cap so Apple 1.2's consent stays visible
at rest. The guest block was **already** the next sibling after the form card —
no change was needed and none was invented.

### 1.6 — Legend (X6, board 06) · `647ae0b`
The blocks landed in 1.1; this adds the subtitle standing down at the
recomposition point (it restates the title and cost two or three lines of the
surface whose rows are the actual lesson).

**Not done, banked:** splitting the status paragraph into three rows at the em
dashes. That is not a layout change — it turns one authored paragraph into three
fragments and drops three em dashes from ratified teaching copy. Logged in
`../COPY_LEDGER.md` for Sky.

## 4. Simulator evidence (iPhone 17e, sim-release rebuilt from this branch)

| Proof | File |
|---|---|
| Home at AXL — title > subtitle, disc 48 above the text, two-line census, icon search, round FAB | `_cmp_home_axl.png` |
| Settings at AXL — **X10 inversion fixed**: the row title is now larger than its subtitle | `_cmp_settings_axl.png` |
| Legend at AXL — **X6 fixed**: "1 — Minor" now reads larger than "Inconvenient but usable.", and dropping the subtitle gained a whole row | `_cmp_legend_axl.png` |
| Report form at AXL — **X7 fixed**: the severity meaning line no longer outgrows the title | `_cmp_report_axl.png` |
| Dark at AXL | `17e_dark_axl_A3_home.png`, `17e_dark_axl_A6_map.png` |
| **Medium is unchanged** | `17e_light_m_A3_home.png` |

**The medium check is the important one.** A pixel diff of Home at default text
size against the Phase 0 build shows exactly two differing bands: the status
ledge (which 1.4 deliberately added) and the live map tiles. The rows, the
search bar, the Report pill and the chevrons are pixel-identical — every
recomposition is correctly gated behind the threshold.

## 5. One defect found on the device and fixed here · `d55c78b`

The status ledge shipped as `colors={[color.stage0, 'transparent']}`. RN's
`'transparent'` is **rgba(0,0,0,0)**, so the gradient interpolated through BLACK
and laid a grey veil over the top of Home and Settings. Measured on the 17e: the
stage reads `#A6C8FB`, and under the first draft it read `#89A0C1`. The second
stop is now `${color.stage0}00` — the same colour at zero alpha, which is the
only version that actually disappears. Re-measured after the fix: `#A7C7FB`,
identical to before. Guarded.

This one is worth noting because the gates were **green** for it. Typecheck,
3,366 tests and lint all passed a change that visibly dirtied two screens. The
simulator caught it; nothing else would have.

## 6. Guards — extended and re-pinned, none deleted

| Suite | Change |
|---|---|
| `typeBlock.guard.test.tsx` | **NEW, 41 tests.** Variant table unchanged outside a block (all 8 variants + the literal values); every variant takes the block's cap inside one; `content` overrides the table to uncapped; explicit props win; nearest block wins nested; host tree shape identical with and without; ScreenHeader mounts exactly one block enclosing all three texts; the auto-fit constant tracks the block; and a **nesting-aware** scan proves no call site inside a block hands back a smaller explicit cap |
| `dynamicTypeGuard.test.ts` | +3. Cluster A only ever caught `numberOfLines={1}` paired with a `*Title` style **on the same line** — exactly how "Ex…" shipped. The surviving clamps are now an inventory with reasons, plus a staleness check so a fixed file cannot keep a standing permission |
| `flexBasisUnderLargeType.guard.test.ts` | +11. The four width-rule sites, and the ledge gradient + its pointer-inert/decorative props |
| `hitTargetFrame.guard.test.ts` | **RE-PINNED.** Its "searchText is the accessible element" assertion matched raw source in a 200-character window — measuring the gap between two props in *bytes*, comments and indentation included. A three-line note pushed the role out of the window and failed a guard whose subject had not moved. `stripComments` alone does not fix it (it blanks comments in place to keep offsets line-accurate, so the gap stays the same width in spaces); collapsing whitespace afterwards makes the window measure code rather than formatting |

`npx prettier --write src` was never run.

## 7. Copy

One new user-facing string: **W-02 `See all {n} on the map`** (Home, board 01
placeholder), logged in `../COPY_LEDGER.md` for Sky's ratification. The Legend
status-paragraph split is banked there too. Nothing else adds or edits a word;
strings hidden by the recomposition each keep their words as the control's
accessible name.

## 8. Residuals

1. **Phase 0's residual #1 is resolved by construction.** The signed-in Profile
   subtitle truncated at AXL because two lines could not hold a long email. It
   now sits in the header block at 1.6 rather than scaling uncapped, so it needs
   far less room — verified in the AXL Settings/Profile walk.
2. **SignIn is still unverified on the simulator.** The app is signed in against
   the live backend and I did not sign out (I cannot sign back in). Same
   NEEDS-GUEST row as Phase 0. Item 1.5 is covered by source and by the
   unchanged-below-threshold rule, not by a capture.
3. **Onboarding is unverified for the same reason** — it only shows on a fresh
   install, and reinstalling would clear Sky's session.
4. The search control is icon-only-by-content, not the board's 44x44 pill (§3,
   1.4). Board 01's full Home layout is a later prompt.

## 9. Rollback

```bash
git -C ~/AccessMap revert --no-edit cdc166b^..d55c78b
```

Or drop the branch. `main` was never touched. Reverting Phase 1a alone leaves
Phase 0 intact, since 1.x sits entirely on top of it.
