# BP11 — One press vocabulary · verification evidence

**Branch:** `r2/bp11-press-vocab` · **base (rollback anchor):** `d0ed1b1` (tip of `r2/bp10-severity-grammar`) · **tip:** `8acb184` · **date:** 2026-07-17 · **STOPPED on branch — never merged/pushed/deployed.**

> **⚠️ CONCURRENCY NOTE (for Sky):** a **concurrent BP12 agent** (`r2/bp12-status-ledge`, T6 status-ledge) checked out its own branch in this **shared working tree** and made 3 commits; the delegated **completion commit** (`eafd20e`) then landed on *its* branch by mistake. I recovered it via an **isolated worktree** — cherry-picked it onto `r2/bp11-press-vocab` (now tip `8acb184`, typecheck 0), **without touching the main tree or the BP12 agent** (which had uncommitted work). **Left for Sky:** `r2/bp12-status-ledge` still carries the duplicate `eafd20e` on top of its BP12 work — drop it when the BP12 agent is idle: `git rebase --onto 7de1f34 eafd20e r2/bp12-status-ledge`.
**Closes:** T3 — F1-02, F1-05, F1-06, F1-07, F1-10, F1-11, F1-12, F1-13, F1-14 (in full).
**Model law (S-10):** phase doc authored on Fable 5 (2026-07-15); this build executed on **Opus 4.8, ultracode, max effort**, all sub-agents max — Sky-initiated + plan-approved via ExitPlanMode.
**Thesis made literal:** one press dialect app-wide — a static, motion-free **fill-swap** dim (the control's backgroundColor swaps to a house token; label/icon ink stays full opacity), **never a group opacity on a text-bearing control**. The spring is a garnish; the haptic is OS-governed; the dim is the truth layer and survives Reduce Motion by construction.

---

## §0 · The load-bearing decision (recorded so no reviewer rejects against the stale spec, and no later hand reverts it)

The phase doc's §1 "S-1 absorbed-FIX law" says to borrow `opacity: 0.85` from FlagCard cardPressed. **That wording is SUPERSEDED — BP11 builds the FILL-SWAP** (Sky's explicit planning decision, AskUserQuestion #1 = "Fill-swap (house idiom)"). Justification, all recorded at plan time: (a) the phase doc was authored 2026-07-15, **two days before** BP3 (2026-07-17) established the test-enforced house idiom — `chipPressed: { backgroundColor: color.borderPressed }`, never group opacity, guarded by `bp3TrustEngineGuards.test.ts`; (b) the arbiter's own "label-ink vs dimmed-**fill**" framing only type-checks for a fill-swap; (c) both PROTECT "seeds" the doc blesses are fill-swaps (drawer-row `itemPressed: { backgroundColor }`, header `feedbackBtnPressed: { backgroundColor }`); (d) group opacity at 0.85 drops knife-edge inks below AA. **Scope** (AskUserQuestion #2 = "Unify within edited files"): convert the enumerated same-file group-opacity dims, leave `cardPressed` (the borrow-model).

---

## §1 · What shipped, per commit-plan item

| # | Commit | What landed | Tag |
|---|---|---|---|
| 1 | `5ebe5cf` | PressableScale internal pressed/hover **fill-swap** dim via `useState` (no Animated → survives RM); new props `dimOnPress` (default true) + `pressedTint`; JSDoc rewritten; ~11 brand/active call-sites opt out or deepen; dead `fabPressed` opacity removed. Closes F1-02. | [verified] |
| 1b | `0fed1eb` | **`ctaFillPressed`** token (mode-independent `#0F53BE`) added to both palettes — the pressed companion to `ctaFill`; the 8 white-on-brand controls repoint to it (brandText is a *lighter* blue in dark mode → white would fail). | [verified] |
| 2 | `1a917dd` → `3adb974` | Custom `tabBarButton` (extracted module) with the selection haptic + full a11y-prop forwarding. **Final: haptic-only** (see §2 / §0-tab). a11y regression test locks `accessibilityState.selected`. | [verified] |
| 3 | `67706c5` | Filter language: Map filter panel (collapse header, Clear, saved pills, category/severity/status/affects/distance chips, +Save-current, presets) + Tasks mine/category/sort chips answer via `borderPressed` (inactive) / `ctaFillPressed` (brand-filled). Converts enumerated same-file opacity dims (presetBtn/emptyCardBtn → ctaFillPressed, placeChip literal-minus-opacity). Closes F1-05/06/07. | [verified] |
| 4 | `3b8b0bd` | Sheet close fill-swap (cascades to Sheet consumers) + the 7 named modal closes; FlagDetailModal's ~19 silent controls by family (neutral→borderPressed, brand→ctaFillPressed, Resolve→successStrong, Delete→error) + converts its 4 same-file opacity dims. Closes F1-11/12. | [verified] |
| 5 | `9af7373` | Home search pill + clear-search (radius-matched borderPressed); map-peek dims the **mapPeekHint chip only** (ctaFillPressed) via a children render-prop — tiles stay pointer-inert (S17); list paddingBottom 96→108 (F1-10 rider). Web hover (F1-13) rides the primitive. | [verified] |
| 6 | `18feda9` | Web callout "Open details": `minHeight: 44` + centered (F1-14); hover/active/focus-visible moved to `.am-callout-btn` behind a single id-guarded injected `<style>` (background moved out of inline so `:hover` wins); deepen `#0F53BE`. | [verified] |
| 7 | `3adb974` | Arbiter `r2-press-vocab-stacks.json` (exit 0, ALL PASS both schemes) + `bp11PressVocabGuards` source contracts. Two arbiter-surfaced AA fixes: tab → haptic-only; Tasks Details → `dimOnPress=false`. | [verified] |
| 7b | `9d1ff85` | **Adversarial-verify fix (blocker):** the custom tabBarButton had dropped v7's `aria-selected` (screen-reader active-tab announcement) — rebuilt on React Navigation's own `PlatformPressable` with `{...rest}` forwarding, still haptic-only (`pressOpacity={1}`); the a11y test rewritten to feed the real v7 shape. +4 arbiter completeness pairs (all PASS). | [verified] |

---

## §2 · Gate results

| Gate | Result | Tag |
|---|---|---|
| `npm run typecheck` | **0 errors** | [verified] |
| `npm test` (serial, `--runInBand`) | **1979 passed / 0 failed** (84 todo) — deterministic, at tip `9d1ff85` = baseline **1966** + 13 BP11 guards (tab-a11y 5 + press-vocab 8). The completion pass adds **+2 press-vocab guards** (→ 1981 expected); those + the affected suites verified green at `eafd20e` (identical diff; 47 passed across bp11-guards/MapScreen/Tasks/FlagDetail) and typecheck 0 on `8acb184`. The full serial re-run on `8acb184` was not executed — the shared working tree is held by the active BP12 agent, so switching to it would disrupt that agent (the completion's changes are self-contained: a token + style-value swaps + guards). | [verified / completion code-inferred] |
| `npm test` (parallel) note | 3–4 intermittent flakes under parallel worker load (MyReportsModal, ReportFlagModal, flagsStoreSwr, a StatusHistory timeline test) — all in files BP11 didn't touch (or unrelated tests), each **passes in isolation** (54/54). Pre-existing infra flakiness (worker-teardown), not a BP11 regression. | [verified] |
| `npm run lint` | **0 errors, 0 NEW warnings** (77 pre-existing baseline; the 2 warnings in touched files — NearbyFlagsModal:182 useCallback-deps, FlagDetail:210 useEffect-dep — are pre-existing hook-dep lines, not my edits; my new files 0). | [verified] |
| **Arbiter** `r2-press-vocab-stacks.json` | `contrast-check.mjs` **exit 0 — RESULT: ALL PASS**, both schemes. Worst margins: successStrong white 4.72, brandText-dark-on-borderPressed 5.07, coordsCopy glyph 3.33 (icon, min 3). | [verified] |
| Diff scope | **exactly 20 tracked files** (18 src + 2 tests) + untracked `design-reviews/` artifacts. Nothing stray. | [verified] |
| 7 immutable prior stacks | untouched (git-tracked `map-stacks.json` = 0 diff-lines; the 6 untracked never edited). | [verified] |

### The two AA findings the arbiter surfaced (both fixed in commit 7)
- **Tab bar → haptic-only.** `color.headerBtnBgPressed` on the tab cell dropped the near-floor tab labels below AA: **light-inactive 3.81, dark-active 4.03, dark-inactive 4.37** (arbiter output before removal). The bottom-tab labels sit at the AA floor (inactive slate ~4.8 at rest), so *any* visible pressed bg tint fails. The tab answers with the selection haptic + its visible active-state switch; no tab pair is modelled (it never dims). **Final implementation** (after the §6 adversarial catch): built on React Navigation's own `PlatformPressable` with `{...rest}` so `aria-selected`/`aria-label`/`role`/`href` forward verbatim, `pressOpacity={1}` + `pressColor="transparent"` for true haptic-only.
- **Tasks "Details" → `dimOnPress=false`.** `inkDetailsGhost` is **`#1466E0` in light** (arbitrated 4.75 on the row glass) → **4.03:1 on borderPressed**. Threaded `dimOnPress` through `CardAction`; Details keeps spring + haptic, no fill dim.

---

## §3 · Drift reconciliations (spec-vs-reality, all adapted + noted)

- Jest baseline **1857 (stale, `a8549ff`) → 1966** (`d0ed1b1`); BP11 lands **1979**.
- `cardPressed` anchor `~:2103 → :2128`; web callout `:471–488 → ~:519–536` (the cited lines were the `<Popup>` container). Re-grepped every anchor before editing.
- `presetBtnPressed` was NOT on the chips (only the 2 preset buttons) — spread the fill-swap (not the opacity) to the chip families.
- **Sheet "cascade" is nearly moot** — only `ChangelogModal` consumes `<Sheet>`; all 7 named modals hand-roll their close, so each was hand-fixed (the Sheet dim benefits *other* Sheet consumers).
- **FlagDetailModal uses PressableScale zero times** — all ~23 controls bespoke; the ~19 silent ones were the bulk hand-fix.
- wave1/wave2 immutable paths are `2026-07-03_glass_w1/` `_w2/` (doc wrote `_glass_w1`).

---

## §4 · New tokens / strings

- **New token `ctaFillPressed` = `#0F53BE`** (mode-independent, both palettes). Not a taste choice — an AA-mechanics necessity: `ctaFill` is deliberately mode-independent because white-on-dark-brand fails, so its pressed companion must be too; deepening to `brandText` (a lighter blue in dark mode) breaks white text. Reuses the existing brand deep-end value; mirrors how `borderPressed`/`successStrong` companion their families. Flagged for Sky's eye; trivially revertible.
- **PROPOSED user-facing strings: NONE.** BP11 ships no new copy (the web callout label "Open details" pre-existed). No honesty-fence surface touched.
- **1 rest-ink alignment:** `savedAddPillText` `color.brand` → `color.brandText` — matches its sibling `presetBtnSecondaryText` (which uses brandText for the same AA reason), so it survives the neutral pressed dim. Reuses an existing token; noted.

---

## §5 · PROTECT preservation (firsthand)

| PROTECT surface | How preserved | Tag |
|---|---|---|
| `GlassSurface.tsx` (DO-NOT-EDIT) | `git diff d0ed1b1..HEAD` = **0 lines** | [verified] |
| `src/lib/haptics.ts` (RM-independence) | `git diff` = **0 lines** — the tab/all haptics ride the existing exports | [verified] |
| Drawer-row pressed dim + FlagCard layering (the two seeds) | untouched; the fill-swap is spread FROM them, not diluted | [verified] |
| S17 pointer-inert map peek | tiles stay `pointerEvents="none"`; the tint lands on the `mapPeekHint` chip only (children render-prop) | [verified] |
| MapScreen `pointerEvents="box-none"` overlay law | 5 wrappers intact; chip pressed styles added only to the inner Pressables | [verified] |
| 7 immutable prior stacks + blur budget | untouched; blur budget +0 (fill-swaps add no BlurView; tab adds none) | [verified] |
| `cardPressed` (borrow-model) | intentionally left as-is (Sky's scope decision) | [verified] |

---

## §6 · Adversarial verification

Workflow-orchestrated 4-skeptic pass (Opus 4.8 max, each reading committed source + independently recomputing WCAG). **3 UPHELD, 1 REFUTED → the refutation was a real blocker, fixed in `9d1ff85`.**

| Lens | Verdict | Result |
|---|---|---|
| AA coverage / missed pairs | **UPHELD** | Walked the full diff, resolved every pressed ink+fill to hex both schemes, recomputed WCAG — numbers match the arbiter exactly. Every white/light ink routes to a deepen token, never the neutral grey. Two minor notes: (a) the decorative Watch `<Star>` (accentOrange on borderPressed = 1.60:1 light) — **exempt**, it's `accessibilityElementsHidden` + purely decorative, the watched state is carried by the text label + border + fill; (b) 4 real pressed pairs weren't modelled (inkGlassMuted 6.84/6.09, warningFg 6.00/6.81, textStrong 12.3/10.4, placeChip glyph 4.63) — all PASS, a proof-completeness gap → **now added to the arbiter** (exit 0 holds). |
| Reduce-motion survival | **UPHELD** | The fill-swap is a static backgroundColor (no Animated node), applied unconditionally on pressed/hovered; RM gates only the scale spring; `reduceMotion.primitives.test.tsx` spring-skip intact; `haptics.ts` byte-untouched. |
| Active / brand chips never grey | **UPHELD** | Every chip's dim is `!active`-guarded (correct per-chip variable); every white-on-brand control deepens to `ctaFillPressed` (mode-independent), never `brandText`; Resolve=successStrong, Delete=error. No active/brand control greys or deepens sub-AA. |
| Structural / behavioural regression | **REFUTED → FIXED** | **CONFIRMED blocker:** the custom tabBarButton dropped v7's `aria-selected` (screen-reader active-tab announcement), and the a11y test was falsely green because it hand-fed `accessibilityState` (a shape v7 never emits). Proven from installed `@react-navigation/bottom-tabs@7.16.2` source + a concrete render. **Fixed `9d1ff85`:** PlatformPressable + `{...rest}` forwarding; test rewritten to the real `aria-selected` shape (now fails the old drop, passes the fix). All other structural checks passed: map-peek tiles stay pointer-inert, box-none wrappers untouched, GlassSurface 0-diff, web callout `:hover` works (background moved to the class). |

The verify pass did exactly its job — it caught the one real defect (a screen-reader regression in this app's core audience) that every green gate had missed, and exposed that the guarding test was testing the wrong thing.

---

## §7 · Web / device

- **Web RENDER** verified via the full jest suite mounting every screen (1979/0) + `PlatformMapWeb.*` suites (37/37). A fresh static-export probe was NOT run this pass (the on-disk `dist` is pre-BP11; no lightweight export script) — coverage is jest + the arbiter contrast proof + the self-contained CSS injection (code-inspected). [verified / web-inferred]
- **NEEDS-SKY-DEVICE (R2-D13):** press-and-hold a drawer row, a Map tool, a filter chip → one felt dialect; a tab press fires the selection haptic (tabs are haptic-only by design); Reduce-Motion ON → the fill-swap dims still answer (motionless). Web callout `:hover`/`:active`/`:focus-visible` in a real browser. Transient press-state feel is inherently device/browser-gated (per BP3 precedent). [NEEDS-SKY-DEVICE]

---

## §PARKING-LOT / flags for Sky

- **Completion pass (`8acb184`, on Sky's "I trust your recommendation"):** the same-file residuals I'd flagged now answer in-dialect — TasksScreen `suggestedRow` / `loadMore` / `selectEntry` → borderPressed; the error-load banners (Map + Tasks) + FlagDetail comment **Retry** ×2 (red + white) → a new mode-independent **`errorPressed`** (#9e2a1e, white 7.49:1 both schemes; the red-family sibling to ctaFillPressed/successStrong). `cardPressed` stays (borrow-model).
- **STILL flagged — genuine design decisions, NOT builder cleanup:**
  - **Bulk-select action bar** (`bulkBtnPressed`, still group-opacity 0.85): 4 mixed-colour buttons (ctaFill / successStrong / accentPurple / neutral) share one pressed style; `successStrong` + `accentPurple` have no darker companion token, so a clean conversion needs per-button threading + 2 more tokens (or a scrim refactor of the bar) — a distinct sub-feature, left for a scoped follow-up.
  - **Submit-reopen** (`reopenSubmitBtn`, silent): white on the light amber `accentOrange` (#f1a520) = **~1.8:1 — a PRE-EXISTING rest-state AA failure**, pre-BP11. A press dim can't fix a rest bug; the fix is an ink/fill decision (Sky/Dani). Flagged as a rest-AA fork.
- **Two new tokens to confirm/revert** (both AA-mechanics necessities, 1 line each in `theme.ts` + `ThemeContext.tsx`): `ctaFillPressed` (#0F53BE) and `errorPressed` (#9e2a1e).
