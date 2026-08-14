# BUILD PROMPT — Glass finalize (FULL wins · retire the lite switch · legend parity)
*Paste this whole block into a fresh Opus session. Sky-initiated — the model gate is satisfied by Sky starting it directly.*

---

RUN — GLASS FINALIZE: FULL WINS, DELETE THE LITE SWITCH + LEGEND PARITY [OPUS MAX EFFORT · ONE branch · NO merge, NO push, NO EAS build, NO deploy]

**Sky's on-device A/B verdict (2026-08-12): `full` wins — the true-blur material — globally (Map + Tasks).** `lite` loses. This run makes that FINAL and deletes the losing option: the entire C-lite runtime switch. It also fixes one thing Sky called out: the heat-map legend must read at the EXACT same transparency collapsed (chip) and expanded. This is the CLOSING TODO from the map-chrome build, now that Sky has named the winner.

**THE MATERIAL CHOICE IS MADE — do not re-open the A/B.** This is a deletion + consolidation run. Read these first, in order:
1. `~/AccessMap/design-reviews/map-chrome/2026-08-12/BUILD_REPORT.md` — the map-chrome build (Direction B-refined) is already MERGED to `main` (`07f82bc`). Its **CLOSING TODO** is your contract.
2. `~/AccessMap/src/lib/glassMode.ts` — the switch you are retiring (its docstring names every consumer class).
3. `~/AccessMap/GLASS.md` §12.5 — the law you rewrite (the switch *exception* becomes the permanent single-pane *rule*).
4. `~/AccessMap/src/components/HeatmapLegend.tsx` — the legend parity fix.

★ **BRANCH DISCIPLINE (house law).** Cut ONE branch from the CURRENT `main` tip — which MUST already contain the map-chrome merge (`git log --oneline -1` should show `07f82bc Merge branch 'design/map-chrome-b'…`; if it does NOT, STOP and tell Sky — the map-chrome merge is local/unpushed, so a fresh clone won't have it). Branch: `cleanup/glass-full-final`. **State the base SHA in your report. Never touch `main`. Sky merges. Sky builds the app.** No push, no EAS build, no deploy, no external send. Finish → STOP on the branch and report.

★ **THE VERDICT, PRECISELY.**
- **Winner = `full`** — iOS: true `BlurView` i=12 + the crystal floor; Android: engineered crystal (Android never blurs — unchanged).
- **Loser = `lite`** (the engineered-everywhere fold) **and the whole runtime switch** (`glassMode.ts`, both long-press triggers, every `forceEngineered={glassLite}` thread).
- After this run there is **no glass-mode toggle**. iOS blurs; Android engineers; Reduce Transparency → the designed opaque state (all unchanged mechanisms).

★ **WHAT YOU DELETE — grep for every consumer, miss none** (`grep -rn "glassMode\|useGlassMode\|glassLite\|toggleGlassMode\|hydrateGlassMode\|handleGlassToggle" src`):
- `src/lib/glassMode.ts` — the whole module + `src/lib/__tests__/glassMode.test.ts`.
- **Both long-press flip triggers:**
  - **Map bar** (`MapScreen.tsx`): `handleGlassToggle`, the `<Pressable onLongPress={handleGlassToggle} delayLongPress={600} accessible={false}>` wrapper around the title (unwrap it — the title returns to a bare `<AppText … accessibilityRole="header">`), the `barTitleWrap` style, and the now-unused `hapticSelection` / `toggleGlassMode` imports.
  - **Tasks header** (`TasksScreen.tsx`): `handleGlassToggle` (the TasksScreen.tsx:472-476 gesture) + its long-press wiring on the header-title zone.
- Every `forceEngineered={glassLite}` + the `glassLite` const + the `useGlassMode`/`hydrateGlassMode` imports/effects, in `MapScreen.tsx` (the **command bar** + the **filter panel**) and `TasksScreen.tsx` (rows / banner / empty / skeletons). Removing `forceEngineered={glassLite}` makes those surfaces BLUR on iOS (the winner) and stay engineered on Android automatically (GlassSurface's `Platform.OS === 'android'` arm).
- The persisted key `@accessmap/glass_mode_v1` is now orphaned — harmless, no migration needed (note it).

★ **WHAT YOU MUST KEEP — deleting these breaks Android or the FABs:**
- **The engineered material path in `GlassSurface.tsx`** (the `*Lite` `LinearGradient` arm) — Android renders engineered ALWAYS ("C-on-Android = B", GLASS §5). Untouched.
- **All `*Lite` / crystal tokens** (`glassRowLite*`, `glassMapCrystal0/1`, `glassBannerLite*`, `glassChromeLite*`, `glassBulkLite*`) — Android's engineered gradient AND the iOS blur floor both consume them. Untouched.
- **The command bar keeps `liteColors={[color.glassMapCrystal0, color.glassMapCrystal1]}` AND `floorColor={color.glassMapCrystal1}`.** `liteColors` = Android's engineered gradient stops; `floorColor` = the crystal worst-stop floor UNDER the iOS blur. **Only `forceEngineered={glassLite}` comes off** (so iOS blurs).
- **The crystal FABs' `forceEngineered` is a LITERAL, NOT the switch.** Recenter / zoom / List stay `forceEngineered` (always engineered crystal, **0 blur panes** — they were never part of the A/B). Do NOT touch them. (See the FAB DECISION below.)
- The `forceEngineered` PROP on GlassSurface itself (used by the literal-true FABs).

★ **FAB DECISION FOR SKY (default chosen — flag it, don't block).** After this run the command bar BLURS (iOS) but the recenter/zoom/List circles stay engineered crystal (they were deliberately 0-blur-pane). **Default = keep the FABs engineered** — it's the shipped state and keeps the blur budget low (4 live BlurViews over the moving map is real GPU cost). If Sky wants the FAB circles to blur too ("full everything"), it's a one-line change per FAB (drop their literal `forceEngineered`) but adds **4 blur panes** — recount the budget and re-confirm pan smoothness if so. State the default in your report and surface the option.

★ **LEGEND PARITY (Sky).** The heat-map legend must read at the EXACT same transparency collapsed and expanded. In `HeatmapLegend.tsx` both states already declare the 0.65 always-light pin (`tintColor="rgba(255,255,255,0.65)"`, `solidColor="rgba(255,255,255,0.95)"`), but the collapsed chip paints its glass as a `StyleSheet.absoluteFill` child of a `PressableScale` while the expanded is a direct `GlassSurface` container. **AUDIT both construction paths and make them render a byte-identical floor + blur**, so toggling the X ↔ chip shows ZERO transparency change (single-source the floor/solid literals so they can't drift). Verify by rendering both states. Rewrite the `HeatmapLegend.test` parity assertion to pin the shared floor used by BOTH branches.

★ **GLASS.md §12.5 — rewrite the exception into the ratified rule.** The single-pane-switch exception the prior run added is retired: Sky picked the material. Replace it with — *the single-pane Explore command bar is the RATIFIED exception to "persistent pan-time chrome never blurs": it mounts live blur (i=12) + the crystal floor on iOS, engineered crystal on Android. The C-lite runtime fold is retired app-wide; `full` is the shipped material.* Update the blur-budget note: the command bar is now ALWAYS 1 blur pane on iOS.

★ **BLUR BUDGET — recount the worst simultaneous iOS state and paste it:** command bar (1, now permanent) + filter panel OR tool sheet (1, mutually exclusive) + locating (1 legacy) + legend (1 legacy) + heat notice(s) (1–2 legacy) + tab bar (1, manual). (Tasks is a different screen — never simultaneous with Map.) Must be ≤ `glass.maxLivePanes` (12). Crystal FABs = engineered = 0 panes (unless Sky flips the FAB decision).

★ **⚠ PERFORMANCE FLAG — state it, do not silently pass.** `full` means a live `BlurView` sits over the MOVING map permanently — exactly what §12.5 originally cautioned against for pan performance. Sky judged it acceptable during the on-device A/B; this run REMOVES the fallback, so the blur is now permanent with no toggle. Re-flag as NEEDS-SKY-DEVICE: confirm pan smoothness + battery hold once more, because there's no lite escape hatch anymore. (`lite` was also the lower-GPU option; Reduce Transparency remains the opaque fallback for users who need it.)

★ **THE GATES (all green before done):**
- `npx jest --ci -w 3` — green. Update every guard that pins the switch, in the same spirit (never delete a guard to pass): delete `glassMode.test.ts`; `mapChromeBudget.guard.test.ts` — drop the `forceEngineered={glassLite}` assertion, **KEEP** the `floorColor` + `liteColors` pins + the four crystal literals + the band/formula/safe-area+8 pins; `MapScreen.headerActions.test.ts` — drop the long-press + `glassLite`-threading assertions, keep the box-none / drawer / header-role / count-label pins; grep the whole suite for any other `glassLite` / `glassMode` / long-press pin (Tasks guards included) and update.
- `npm run typecheck` — 0. `npm run lint` — 0 errors, **no new warnings** (watch for orphaned imports after the deletions — `hapticSelection`, `toggleGlassMode`, `useGlassMode`, `hydrateGlassMode`, `Pressable` if now unused).
- **Arbiter:** re-run `node ~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs design-reviews/map-chrome/2026-08-12/tools/map-chrome-crystal-stacks.json` — exit 0 (floors + inks unchanged; the iOS blur uses the same `floorColor` crystal floor already declared — the conservative bound covers it).
- **Quarter-budget** unchanged (geometry identical): bar 52pt, persistent band 12.8% (430×932) / 14.0% (393×852), bar top safe-area+8.

★ **HOUSE PROTOCOLS.** Phase it and bank a commit + HANDOFF per phase: (a) remove the global switch + both triggers; (b) legend parity; (c) GLASS.md rewrite + guard updates + full gate run. UNATTENDED: bank open questions, take the safest reversible path; if a spec line is wrong against the real code, follow the code and log the discrepancy as a DECISION FOR SKY.

★ **SIBLING-RUN NOTE.** The map-gestures run still stacks on `main`'s tip; nothing here changes its `dismissalStandard` law-F caveat. The map-bar long-press you're deleting was a plain `Pressable onLongPress` (never a banned gesture mechanism), so its removal is clean.

★ **REPORT** to `~/AccessMap/design-reviews/map-chrome/2026-08-12/GLASS_FINALIZE_REPORT.md`: base SHA · branch · every deleted consumer (paste the grep) · what stayed (the Android/FAB/token proof) · the legend-parity fix (before/after) · the GLASS.md §12.5 rewrite · the recounted blur budget · gate results pasted verbatim (jest counts, typecheck, lint, arbiter exit code) · the PERFORMANCE FLAG · DECISIONS FOR SKY (FABs stay engineered by default; `lite` was the low-GPU option) · NEEDS-SKY-DEVICE.

**Then STOP.** Do not merge, do not push, do not build the app.

---
*Authored 2026-08-12 as the map-chrome build's closing-TODO cleanup, from Sky's on-device A/B verdict (full wins) + her legend-parity note.*
