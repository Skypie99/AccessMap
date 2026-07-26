# Glass Rollout — Wave 2: Profile (Deep Field)

**Date:** 2026-07-03
**Branch:** `overhaul/glass-rollout-w2-profile` (stacked on `overhaul/glass-rollout-w1`, which is 6 commits ahead of `main` and NOT merged — Wave 2 correctly stacks on Wave 1)
**Status:** COMPLETE on branch · gates green · arbiter exit 0 · **NOT merged / NOT pushed / NOT built** (Sky merges, Sky builds)
**Scope:** the Profile *screen* only — material/presentation pass, composition unchanged, reuse-only.

---

## What shipped (tiers applied)

| Surface | Tier | Blur? |
|---|---|---|
| Screen wash + both center states (auth-loading, signed-out) | `stageRoot` (bg stage1) + `<ScreenStage/>`; scroll transparent | — |
| Header | `ScreenHeader` on stage, eyebrow/subtitle → `inkOnStage` (no chrome pane — it scrolls, mirrors Settings) | — |
| **Hero card** | `<GlassSurface variant="row" forceEngineered={glassLite}>` | **true blur** |
| Stat cards ×3 | `variant="row" forceEngineered={glassLite}` | **true blur** |
| Point-history card | `variant="row" forceEngineered={glassLite}` | **true blur** |
| Nearest-unresolved | `variant="banner" forceEngineered={glassLite}` (brand edge replaces the left-accent bar) | **true blur** |
| RecentlyViewedRow, ReportsBreakdownCard (Sky: include) | `variant="row" forceEngineered` (literal) + inner chips → chip tint | engineered |
| 7 nav rows + 3 about rows + errorCard | `variant="row" forceEngineered` (literal) | engineered |
| Tab pill (segmented) + intro link | engineered chip tint (`glassChipFill`+edge); selected tab / save / sign-in / retry → `ctaFill` | — |
| tierPill, status pills, streak card, sign-out, severity dots | **kept semantic/opaque** (text-on-opaque, not text-on-glass) | — |

**Pressable stays the interactive/a11y root everywhere; `GlassSurface` is material only.** Press feedback is opacity-only (a bg swap is invisible under glass).

### Blur budget (the non-virtualized ScrollView point)
Only the 4 blur-cluster declarations mount a BlurView in full mode: hero (1) + `Stat` ×3 (3) + point-history (1) + nearest-banner (1) = **6 live panes**, + the persistent tab-bar chrome (1) = **7 ≤ 12** (`glass.maxLivePanes`), headroom 5. Every other `GlassSurface` uses the **literal `forceEngineered`** → engineered `*Lite` gradient, never counts (verified: `grep forceEngineered={glassLite}` = 4 declarations; all others literal). All-blur would have mounted 19 (over ceiling) → the literal is load-bearing.

---

## Pairings added (arbiter)

`node contrast-check.mjs wave2-stacks.json` → **exit 0 · 34/34 PASS** (17 light + 17 dark).
Artifacts: `qa-reports/assets/2026-07-03_glass_w2/wave2-stacks.json` + `wave2-contrast-result.txt`.

- **Reused (Tasks/Wave-1) surfaces:** `row`, `banner`, `stage`, `ctaFill`, `chipOnStage`.
- **New surface:** `chipOnStage` also gains a sibling **`chipOnRow`** = an engineered chip tint sitting on a row-glass card (RecentlyViewed chips + breakdown total chip): stack `[row-floor, chipFill]` over the stage-darkest bases.
- **Backdrop reasoning:** Profile cards are in normal flow over the stage (never overlap app content), so a row card's worst case is the **stage's darkest stop**, not `#000` — the same bases Wave-1 used for `row`. Engineered rows carry a *more* opaque floor than the true-blur `row` floor declared here, so declaring against `row` is the conservative bound covering both.

### Two arbiter-forced fixes (flagged)
1. **Delete-account text → `errorFg` in BOTH themes.** `color.error` (#c0392b) measured **3.88:1** on the light stage's darkest stop (fails 4.5). Wave-1's "light keeps color.error" held on the *row*; on the *stage* light must also fork. `errorFg` passes both ways (light #8a1f1f ≈ 8:1, dark #fca5a5 = 7.7:1) — still unmistakably red.
2. **Point-delta NUMBER → neutral `textStrong`.** The semantic gain green (`successStrong` #1e8449) measured **4.28:1** on the light row-over-stage worst case (fails 4.5) — no darker green token exists, and adding one would breach the fence. So the **number** takes the high-contrast neutral ink and the **gain/loss color moves to the decorative arrow** (declared 1.4.11 graphic, min 3 — passes 4.28 light / 5.40 dark). Direction is still carried by the arrow shape **and** the `+`/`−` sign, so color is never the sole signal. *Sky decision:* if you want the colored number back, it needs a darker-green on-glass token (a separate, theme-file change).

### Other deliberate deltas
- **CTA fills → `ctaFill`** (save / sign-in / retry / selected-tab): mode-independent brand (#1466E0), because dark `color.brand` + white = 3.4:1 fails. Fixes a latent dark-mode issue.
- **Dark hero number → `inkDetailsGhost` (#84AEF6):** raw brand fails on dark glass; light stays visually the same Wayfinder blue (#1466E0, 4.75:1).
- **Nearest banner:** left-accent bar dropped (the banner variant supplies the brand edge); subtitle `opacity: 0.85` removed (a translucent ink over glass hazes below AA); title/subtitle/MapPin/chevron → `brandOnSoft`.

---

## Sweep fixes preserved (LAW — verified byte-for-byte)
M4 (avatar no-overflow, edit badge intact) · M5 (heroValue `lineHeight:74` + weight 800) · M6 (heroValueRow `flexWrap`) · M2 (statusPill `maxWidth:'48%'` + label autofit) · M19 (statLabel autofit/`numberOfLines:1`) · M3 (pointHistoryLabel `numberOfLines:2`) · M7 (nearestBtnSubtitle `numberOfLines:2`). The pass changed only background→`GlassSurface`, border, shadow, text color, and text weight — no layout/typography touched. Dynamic-type guard green.

---

## RT / RM / C-lite conformance
- **Reduce Transparency:** every `GlassSurface` variant auto-renders its designed opaque state (`overlay` 0.97 + `borderStrong`; banner → `brandSofter` + brand border) — free by using the variant. Arbitrated inks hold on the opaque fills (higher contrast than the glass floors). Semantic surfaces were already opaque.
- **Reduced Motion:** no new motion added. The existing tier-progress animation stays `reduceMotion`-gated; no press sheen added (matches Wave-1 rows — only the Tasks FlagCard has one).
- **C-lite:** `glassLite = useGlassMode() === 'lite'` threaded to the 4 blur-cluster surfaces (`forceEngineered={glassLite}`); `hydrateGlassMode()` on mount; **no toggle affordance on Profile** (Tasks header owns the long-press). Engineered rows are mode-independent.

---

## Gates
- `npm run typecheck` → **0**
- `npm test` → **1737 passed** / 84 todo (unchanged; guards `dynamicTypeGuard` + `GlassSurface` budget unedited)
- `npm run lint` → **0 errors, 77 warnings** (baseline; no new)
- `npx expo export --platform web` → **exit 0**
- arbiter → **exit 0, 34/34 PASS**
- **FENCE:** `git diff overhaul/glass-rollout-w1...HEAD` = exactly `ProfileScreen.tsx` + `RecentlyViewedRow.tsx` + `ReportsBreakdownCard.tsx`. Zero handler/data churn (the only added `useEffect` is `hydrateGlassMode`). No other screens.

Commits: `w2-1` STAGE · `w2-2` HERO · `w2-3` ROWS · `w2-4` COMPLETIONS.

---

## NEEDS-SKY-DEVICE
The pixel render-compare + true-blur *feel* are Chromium-proxy-only and were **not** run live here (running the app would make external Supabase auth calls). The arbiter is the numeric AA proof; the following need your eye on a real device:
1. **Hero legibility** — the `inkDetailsGhost` points number on glass in sunlight-ish brightness, at @375 / @320 / ×1.6 large type especially.
2. **Real scroll on the activity/point-history list with ~7 live blur panes** — the key perf question. If it hitches, **C-lite is one long-press away** on the Tasks header (drops all row blur to the engineered gradient).
3. **Avatar/photo glass feel** and the hero card beside the Tasks screen (the cohesion pair) — material should read identical.
4. **Native `Switch`** 1.4.11 (OS guarantee, asserted not measured) and the **RT designed-opaque states** toggled live.

## Pre-existing observation (out of scope)
`RecentlyViewedRow` renders its severity dot with **white text on every severity color**, including the light sev-1 yellow — a potential contrast concern that predates this pass (the dot is an opaque colored chip, not glass, and was untouched here). Worth a look in a separate a11y pass.

## Out of scope — next mini-wave (overlay tier)
The child modals were deliberately deferred: `MyReportsModal`, `MyWatchedModal`, `ActivityFeedModal`, `AchievementsModal`, `LeaderboardScreen`, `NotificationPrefsModal`, `AboutScreen`, `FlagDetailModal`, the inline Tier-explainer + Delete-account modals, `SignInScreen`.
