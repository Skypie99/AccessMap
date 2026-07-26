# BP6 / MP2 — Profile list sheets join the bulk material (M-39 · M-40 · M-38) — Verification Evidence

**Phase:** BP6 / MP2 (T2 material-migration train, phase 3 of 6)
**Branch:** `r2/mp2-profile-lists` · **base** `31086fd` (`r2/mp1-home-stage` tip) → **tip** `828f736` · **date** 2026-07-17
**Provenance (S-10):** spec authored on Claude Fable 5 max (2026-07-15); executed on **Opus 4.8, ultracode, max effort** (S-10 / S-11, Sky's standing direction for this train), all sub-agents max effort.
**Result:** ✅ Built + green + **STOPPED on branch**. Not merged / pushed / built / deployed (Sky's hands).

Closes break **B6** ("one hallway, two buildings"): Profile's My Reports / My Watched / Activity sheets stop opening opaque paper while their sibling *About* opens bulk glass — all three now converge on the one shipped bulk material.

---

## 1 · What shipped (per commit-plan item)

Three tracked source commits (one per M-id), 107 insertions / 22 deletions across exactly 3 files. The shared **B4-engineered bulk recipe** applied three times + one bundled honesty repair.

| Commit | File | Change |
|---|---|---|
| `dc581d0` | `MyReportsModal.tsx` (M-39) | container → `cardWrap` + `<GlassSurface variant="bulk" borderRadius={0} forceEngineered>` (a11yViewIsModal moved onto it); `card` drops `backgroundColor` + gains `overflow:hidden`; on-glass `subtitle`/`emptyBody` → `inkGlassMuted` + ≥500 |
| `19cc058` | `MyWatchedModal.tsx` (M-40) | same recipe, **no** a11yViewIsModal (carried gap, S-11 L7); transparent-row `rowDate`→`inkGlassMuted`+≥500, Star icon + `emptySubtitle`→`inkGlassMuted`; **error repair** below |
| `828f736` | `ActivityFeedModal.tsx` (M-38) | same recipe (drops the `surfaceMuted` wash); `sectionHeaderCount`→`inkGlassMuted` (block-named); `subtitle`/`emptyBody`→`inkGlassMuted`+≥500 |

**The shared recipe (from the shipped B4 precedent — AddressSearch/Feedback/Help/About):**
`<View cardWrap>` (top-radii + up-shadow, verbatim from the sibling: `#000`/`shadowTint` per scheme, `shadowRadius:14`, offset `{0,-4}`, elevation 5) → `<GlassSurface variant="bulk" borderRadius={0} forceEngineered style={card}>`; `card`/`sheet` loses its `backgroundColor` (the variant owns the surface) and gains `overflow:'hidden'` (clips the square material to the rounded top).

**M-40 error-state repair (commit `19cc058`):** MyWatched's full-screen load-error rendered **bare `color.error` text directly on the sheet** (`:369`) — now on glass after migration. It adopts the sibling **`errorBanner` pattern**: a self-contained solid `errorBg` banner (`errorBg` bg, `errorFg` text, `error`-fill retry with `textOnBrand`) — identical to what MyReports/ActivityFeed already ship. Self-contained pin → **no new arbiter pair** (registered in the stacks `_doc`). The Retry label + handler are byte-identical (only the surrounding container + the 3 error-only styles changed; those styles have no other consumer).

Machinery **threaded, not modified:** `GlassSurface` (`variant="bulk"` + `forceEngineered`) — the primitive is never touched.

---

## 2 · Hard gates — ALL GREEN

| Gate | Result | Tag |
|---|---|---|
| `npm run typecheck` | **0 errors** | verified |
| `npm run lint` | **0 errors / 77 warnings** = the baseline exactly. The 2 warnings under the touched files (`ActivityFeedModal:207`, `MyWatchedModal:267`) are **pre-existing** `react-hooks/exhaustive-deps` on the `renderItem` callbacks (never touched); MyReportsModal has none → **no new warnings** | verified |
| `npm test` | **131/131 suites · 1944 passed / 0 failed / 84 todo** (2028 total) = baseline unchanged, no guards needed. Clean run, no flake this pass (the known MyReports `initialStatus` waitFor flake passes on clean re-run/isolation) | verified |
| arbiter | `node ~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs r2-material-stacks.json` → **exit 0 · RESULT: ALL PASS · 80 pairs**. MP2 `profileSheet` inks pass both palettes: titles 11.24/11.14 · body 8.93/8.94 · muted→`inkGlassMuted` 6.24/6.51 · links→`brandText` 4.95/5.42. **No drift → no sibling** `r2-mp2-stacks.json` (shipped tokens resolve to the exact declared hexes). Proof: `evidence/BP06/r2-material-arbiter-mp2.txt` | verified |
| diff scope | tracked stack diff (`31086fd..828f736`) = **the 3 modals only**; zero `theme.ts`/`ThemeContext.tsx`; `GlassSurface.tsx` untouched; 7 immutable prior stacks files untouched; `.claude/launch.json` deletion NOT staged (pre-existing) | verified |
| RT + C-lite | as specced, not deferred: RT = the `variant="bulk"` primitive's designed opaque state (overlay 0.97 + `borderStrong` top edge, automatic); C-lite = engineered-literal via `forceEngineered` | verified (arbiter passes; the primitive owns both states) |
| blur budget | **+0 live panes** — `forceEngineered` ships the engineered gradient, never a BlurView. Profile's worst simultaneous state unchanged | verified (code-inferred; mechanism is `material==='blur'`-gated in GlassSurface) |

---

## 3 · PROTECT / byte-identity — held (firsthand diff-check)

- **MyWatched `accessibilityViewIsModal` gap preserved (S-11 L7):** the only occurrence in the file is the explanatory **comment** (`:278`) — **no actual prop added**. MyReports + ActivityFeed keep their one prop each (moved onto the GlassSurface). Grep-verified.
- **All a11y strings/props byte-identical:** no `accessibilityLabel` / `accessibilityHint` / `accessibilityRole` / `testID` / `placeholder` line removed. The single "removed" `accessibilityLabel="Retry loading watched flags"` line is a **re-indent only** (2 spaces, from nesting into `errorBanner`) — content identical.
- **The `a11yToggle({selected})` chips are byte-identical** (no `+/-` on any `a11yToggle` line) — the parked F1-03 aria-selected sweep is **not** touched (out of MP2 scope).
- **Opaque inner row cards kept** (`surface`/`surfaceMuted` + `shadow.e1`) for M-39/M-38 (B4e "cards stay opaque on the glass sheet"); their row text is unchanged (not on glass). Only MyWatched's genuinely-transparent rows re-ink.
- **Semantic surfaces kept:** MyReports/ActivityFeed `errorBanner` (already `errorBg`/`errorFg`); MyWatched Clear-all chip (`errorBg`/`color.error`) + `missingBanner` (warning) — untouched.
- **PROTECT-21** (bulk tier — the sheets JOIN, don't fork it) · **PROTECT-27** (ThemeContext total default — untouched) · **PROTECT-5** (arbiter decides, never the eye) — all preserved.

---

## 4 · Deliberate defaults flagged for Sky (revertible — Sky's call at merge)

- **cardWrap up-shadow (default applied).** The three sheets carried **no shadow** before; the recipe text + all four shipped bulk siblings (About/Feedback/Help/AddressSearch) carry an up-shadow on the wrapper, so applying it completes the convergence on the About/Feedback material. Values copied **verbatim** from the sibling (`HelpModal.tsx:224`). It is a visible change beyond pure ink → flagged, one-line revertible (delete `cardWrap` and put the top-radii back on `card`). *(BP5 D1/D2 pattern.)*
- **`forceEngineered` (engineered-literal, per §2a/§2f).** MP2 sheets ship engineered, unlike the round-1 **blurred** siblings — deliberate so Profile's blur budget stays **+0**. Identical declared AA floors; the frost-feel delta over live content is a device read (R2-D14).

## 5 · NEEDS-SKY-DEVICE (R2-D14) — nothing to eyeball on the web

The material feel (expo-blur / expo-linear-gradient engineered gradient, the bulk top edge/specular, the RT designed opaque state) is **native-render territory** — a web-probe approximation would misrepresent it, so per the evidence-honesty rail none is attached. The contrast floor IS proven (arbiter). Device gate: the three sheets read as the house bulk material over live Profile content in **both palettes**; an **RT sweep** (OS Reduce Transparency + Settings toggle) confirming the designed opaque state (overlay 0.97 + borderStrong top edge), not a low-contrast smear; a VoiceOver pass confirming the sheets read exactly as before (a11y byte-identical). No DECISIONS-FOR-SKY blockers; no privacy-sensitive logic touched (material + ink only).
