# GLASS FINALIZE REPORT — full wins, lite switch deleted, legend parity

**Run:** the map-chrome build's closing-TODO cleanup, executed in-session on Sky's verdict.
**Branch:** `cleanup/glass-full-final` — **base `d7cd907`** (the current `main` tip; it already contains the map-chrome merge `07f82bc` + a later `docs(qa)` commit). `main` untouched. No push, no EAS build, no deploy.

## Sky's decisions (this run)
- **`full` wins — the true-blur material — GLOBALLY**, not just Map + Tasks. (Scope surfaced mid-run: the switch was threaded through **all 7 screens**, not 2. Sky confirmed the **clean removal, all 7**.)
- **The heat-map legend reads at the exact same transparency collapsed and expanded.**

## A — the C-lite runtime switch is deleted, app-wide
`grep` confirmed **CLEAN** — zero switch consumers remain in `src` (non-test). Removed:
- **`src/lib/glassMode.ts` + `glassMode.test.ts`** — deleted (the store, `useGlassMode`/`hydrate`/`toggle`/`get`/`set`/`subscribe`).
- **Both long-press flip triggers** — Map bar (`handleGlassToggle` + the title `<Pressable>` wrapper → back to a bare `<AppText accessibilityRole="header">` + `barTitleWrap` style) and the Tasks header (`handleGlassToggle` + its `<Pressable>` wrap around `<ScreenHeader>`).
- **Every `forceEngineered={glassLite}` thread + the `glassLite` const/hook/props**, across **HomeScreen · ProfileScreen (`Stat`) · SettingsScreen (`SettingsRow` + ~13 rows) · ResourcesScreen · HowToHelpScreen · MapScreen (command bar + tool sheet + filter panel + both empty cards) · TasksScreen (`FlagCard` + `GlassSkeletonCard` + banner + empty + the `sheenActive` gate)**. Removing the thread makes each surface **blur on iOS by default, engineered on Android automatically** (GlassSurface's `Platform.OS === 'android'` arm).
- Stale comment ref in `statusLedge.ts` cleaned. Orphaned `useEffect` imports (Resources, HowToHelp) removed.

**Kept (deleting these would break Android or the FABs):** GlassSurface's engineered `*Lite` path · all `*Lite`/crystal tokens · **the command bar's `liteColors` + `floorColor`** (Android engineered gradient + the iOS blur floor) · **the crystal FABs' literal `forceEngineered`** (recenter/zoom/List — always engineered, 0 blur panes; NOT part of the A/B).

> **Note — no new behaviour.** `glassMode` **defaulted to `full`**, so full-everywhere was already the shipped default. This locks it in and removes the opt-in escape hatch; it does not change what a normal install rendered.

## B — legend transparency parity
Both the expanded legend and the collapsed "Legend" chip already used the identical 0.65 always-light pin, so their transparency already matched. Made it **drift-proof**: the floor/solid literals are now **single-sourced** (`PIN_TINT` / `PIN_SOLID` constants) and consumed by both branches, so they can never diverge. `HeatmapLegend.test` parity assertions still green.

## C — law + guards
- **GLASS.md §12.5 rewritten:** the single-pane-switch *exception* → the *ratified permanent rule* — the Explore command bar mounts live blur (i=12) + the crystal floor on iOS / engineered crystal on Android; the C-lite fold is retired app-wide; `full` is shipped; the bar counts as 1 permanent blur pane; RT remains the opaque fallback (the retired `lite` was the only lower-GPU middle option).
- **Guards updated in-spirit (no coverage deleted):**
  - `emptyCardGlass.guard.test.ts` — flipped from "uses `forceEngineered={glassLite}`" to "carries **NO** `forceEngineered` → blurs by default"; the anti-opaque-slab intent is preserved (any `forceEngineered` now fails it).
  - `MapScreen.headerActions.test.ts` — dropped the long-press + `glassLite`-threading assertions; added a guard that the switch **is gone** (no `glassLite`/`handleGlassToggle`/`barTitleWrap`) while `liteColors`/`floorColor` stay. Box-none / drawer / header-role / count-label pins untouched-green.
  - `TasksScreenFlagCard.test.tsx` — removed the `glassLite` render prop; the "material modes (switch)" test → "mounts the row BlurView by default" (the sheen is itself a LinearGradient, so glass-lite-gradient is not asserted absent).
  - `mapChromeBudget.guard.test.ts` — renamed the stale "threads the glass switch" test to pin the surviving crystal material (`liteColors` + `floorColor`).

## Gates (pasted)
- `npm run typecheck` → **0 errors**.
- Full `npx jest --ci -w 3` → **203 suites, 2967 passed, 32 todo, 0 fail**.
- `npm run lint` → **0 errors, 74 warnings** (== baseline, no new).
- Arbiter `contrast-check.mjs …/map-chrome-crystal-stacks.json` → **exit 0, ALL PASS** (floors + inks unchanged; the iOS blur uses the already-declared `floorColor` crystal floor — the conservative bound covers it).
- Quarter-budget unchanged (geometry identical): bar 52pt, band 12.8% / 14.0%, top safe-area+8.

## ⚠ PERFORMANCE FLAG (NEEDS-SKY-DEVICE)
`full` means a live `BlurView` now sits over the moving map — and over the Tasks/Home/Profile/Settings lists — **permanently, with no lite fallback**. You judged this acceptable during the A/B (you were in `full` globally), and the blur budget is virtualization-bounded + dev-warn-only. Still: confirm pan/scroll smoothness + battery once on-device, since there's no longer an escape hatch. (Reduce Transparency remains the opaque option for anyone who needs it.)

## DECISIONS FOR SKY
1. **FABs stay engineered (default kept).** The command bar blurs; the recenter/zoom/List crystal circles stay engineered (0 blur panes). If you want them to blur too, it's one line per FAB (+4 blur panes) — say the word.
2. **`lite` was the only lower-GPU middle mode.** It's gone; RT is the remaining opaque fallback.

## STOP
`cleanup/glass-full-final`, gated green, **stopped on the branch.** `main` untouched. You merge.

*Executed 2026-08-12 from the FINALIZE_PROMPT, adjusted to the real code (7 screens, not 2) with Sky's confirmation.*
