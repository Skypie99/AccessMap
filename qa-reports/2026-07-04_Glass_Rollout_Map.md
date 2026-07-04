# Glass Rollout — Map screen (Deep Field) — BUILD REPORT

**2026-07-04 · branch `overhaul/glass-map` (stacked on `overhaul/glass-rollout-w2-profile` @ `a1dc9f3`) · Opus 4.8 ultracode · NOT merged, NOT built.**

Map is the last surface to wear Deep Field, and the only one over a live, moving, unbounded backdrop. This build re-tiers the top chrome to themed Deep Field, harmonizes every map-internal + overlay ink to survive any tile, adds one new wash token, and CUTS the live-blur budget. Executed against the Stage-0 plan (session handoff) after Sky ratified the fork picks.

**Verdict: 4 staged commits, gates green at each, arbiter exit 0 (68 pairs, both modes), fence exact. Stop on branch.**

---

## 1. Sky's Stage-0 decisions (ratified)

| Fork | Decision |
|---|---|
| Preview #0 — themed dark chrome in dark mode | **Ratify** (pill/bar/panel go dark in dark mode; legend/chips stay pinned-light) |
| F2/F3 — material | **Engineered default + true blur only on the filter panel** |
| F5 — saved-place chips | **Pin ink light** |
| F1 — stage scrim | **None** |
| F4 — List FAB (build guard, not asked) | Keep solid on `color.brand` — NOT swapped to ctaFill |

## 2. Stage-0 verification corrections folded into the build

The plan was independently verified against the live repo before any code (8 auditors + arbiter reproduction + 2 adversarial recomputes). Corrections applied:

- **Paths:** GlassSurface is `src/components/ui/GlassSurface.tsx`; dark tokens live in `src/theme/ThemeContext.tsx` (a real second file, added to the fence for the new token).
- **`forceEngineered` is variant-agnostic** (not row-only). GLASS.md §8 was written to justify `variant="row"` on *shape* grounds, NOT the plan's incorrect "chrome can't thread C-lite."
- **Ink labels:** legend title / web popup were themed *tokens* (`color.textMuted`), not literals `#666`/`#aaa`; fixes target the right styles.
- **Guard reality:** the dynamic-type guard is one CI Jest test (`src/__tests__/dynamicTypeGuard.test.ts`), not a `.mjs`. Rule 3 = hard-`height` on Text styles; Rule 4 = horizontal-scroller flex-pins. Honored (no hard height added to Text; no new scroller).
- **"5 legacy sites" is correct** (4 in MapScreen + HeatmapLegend); an auditor's "only 4" was a file-scoping artifact — not propagated.

## 3. Commits (fence-exact)

| Commit | Scope | Files |
|---|---|---|
| `map-1` INK-FIXES | cluster, heat badge, web popup, place chips, Report FAB | PlatformMap.tsx, PlatformMap.web.tsx, MapScreen.tsx |
| `map-2` PILL+BAR | status pill + action bar → row-tier + ink forks | MapScreen.tsx |
| `map-3` PANEL | filter panel → row-tier + true blur + new `glassMapWash` token + widget ink forks | MapScreen.tsx, theme.ts, theme/ThemeContext.tsx |
| `map-4` PINS+COMPLETIONS | locating banner literals, legend title, docs delta, arbiter stacks, this report | MapScreen.tsx, HeatmapLegend.tsx, GLASS.md, DESIGN.md, qa-reports/assets/…, this file |

Fence total: `MapScreen.tsx`, `PlatformMap.tsx`, `PlatformMap.web.tsx`, `HeatmapLegend.tsx`, `theme.ts`, `theme/ThemeContext.tsx`, `GLASS.md`, `DESIGN.md`, `qa-reports/assets/2026-07-04_glass_map/*`, this report. Tab bar, nav header, `GlassSurface.tsx`, stage tokens — untouched.

## 4. Contrast (P2) — arbiter

`node <material-lab>/2026-07-02/shared/contrast-check.mjs qa-reports/assets/2026-07-04_glass_map/map-stacks.json` → **exit 0, ALL PASS, 68 pairs (34 light + 34 dark).** Declared == shipped (values copied from shipped code). Result committed at `…/map-stacks-result.txt`.

Tightest survivors (the canaries): cluster white ring vs dark-regime `#A4922E` **3.12** · cluster hairline vs disc **3.30** · action-bar icons inkSelect **3.32 L** · heat badge sev4 ink **4.59** · warningFg hint **4.70 L** · sev4 pill **4.79** · sev5 **4.83** · dark panel muted **4.85**. Pill/panel text take `textStrong` → 5.77/7.55, dodging the thin-margin class.

The one new token: **`glassMapWash`** (light `rgba(255,255,255,0.30)` / dark `rgba(13,18,32,0.30)`), painted as the filter panel's `overlayTint`. Load-bearing — unwashed, `inkGlassMuted` measured 4.19:1. Added to BOTH palettes (`satisfies typeof lightColor` enforces the mirror). RT never paints it (the 0.97 opaque fill out-contrasts it).

## 5. Blur budget (P3) — it went DOWN

Live blur panes at each state (iOS full-C, tab bar counted manually — invisible to `__getLiveBlurPaneCount`):

| State | Before | After |
|---|---|---|
| Worst simultaneous (panel + locating + heatmap on) | 6 | **4** (panel + locating + legend + tab bar) |
| Panning, heatmap on, panel closed | 5 | **2** |
| Panning, heatmap off (typical) | 4 | **1** (tab bar only) |

Pill + bar are literal `forceEngineered` (no BlurView ever mounts). The panel is the one true-blur surface (F3) — its backdrop is quasi-static while you're reading it. The two always-light KEEPs (legend, locating) still mount a BlurView — the accepted cost of pinning light without editing the DO-NOT-EDIT primitive. Bonus: the cluster Marker now `tracksViewChanges={false}` (fully mode-independent bubble) to kill per-pan re-rasterization.

## 6. Preserved rails (guard-green)

- M10 overlay wrapper `box-none` + `flexShrink:1` — untouched.
- M11 action-bar inner ScrollView + `actionBar flexShrink:1` + Pattern-B pins (`actionBarScroll`) — intact.
- G5 panel `maxHeight`/`flexShrink` + inner ScrollView + `filterScroll` pins — intact.
- G6 legend `flex:1` slot beside the FAB column — intact.
- M1 native cluster formatter + `minWidth/minHeight` (no hard `height` on Text) + `maxFontSizeMultiplier` — untouched.
- `// dynamic-type-ok` adjacency on the callout — untouched.
- No new horizontal scroller (Rule 4 safe). Shared `styles.bannerText` untouched (permission banner still themed).

## 7. Deferrals & deviations (disclosed)

- **`bodyMedium` ≥500 weight on panel body text (plan contract #6): DEFERRED.** Not AA (every AA ink fork landed and passed the arbiter); the `AppText` variants already set weight; applying a fontFamily override risks metric shifts I can't device-verify. Flagged for a device-eyes follow-up.
- **Optional legend swatch hairline: SKIPPED** — the 10×10 severity swatches are color samples (1.4.11 exemption); the title-ink fix is the required legend change.
- **Density heat mode ink** handled defensively (white) but density is unreachable — `HEATMAP_MODE` is a hardcoded `gradient` const.

## 8. Honesty tags & NEEDS-SKY-DEVICE

- **Contrast:** arbiter-math-proven (exit 0), twice-verified in Stage 0. Solid.
- **NEEDS-SKY-DEVICE (unchanged from every wave):**
  1. True-blur FEEL over live moving tiles + pan/scroll smoothness (the filter panel).
  2. RT visual over tiles; the themed dark chrome beside the pinned-light legend (preview #0) on a real screen.
  3. Cluster `tracksViewChanges={false}` snapshot behavior + custom marker/callout rasterization on-device.
  4. Safari/WebKit (web numbers are Chromium proxies only).
- Web CartoDB `dark_all` basemap under the pinned-light legend is now correct-by-construction (dark ink on a light-pinned floor); the stale "basemap is always light" comment was fixed.

## 9. Out-of-fence findings (surfaced, NOT touched — for separate passes)

Carried from the plan §9, re-verified:
1. **Locating state-machine hole** — `locating` inits `true` and nothing clears it when permission is undetermined; first-run users can see "Finding your location…" indefinitely (`MapScreen.tsx:249,1026,1034-1040`). *Real bug, out of fence.*
2. Viewport gate reads the seed/resolve region, never the panned one — no `onRegionChange` handler exists (`:444-456`).
3. Web `flyTo(…, 0.4s)` on cluster expansion ignores reduced motion (`PlatformMap.web.tsx:346`).
4. `HEATMAP_FILL_OPACITY` confirmed `0.65` (`src/lib/heatmap.ts:211`).

## 10. DECISIONS FOR SKY

- **Device gate:** this build wants a real-device pass (§8) before merge — same tag as Tasks/W1/W2.
- **`bodyMedium` deferral (§7):** accept as-is, or request it in a follow-up with device eyes.
- **Merge order:** `overhaul/glass-map` stacks on w2-profile → Tasks. The single EAS TestFlight build then carries Tasks + W1 + W2 + Map for one on-device gate. **Sky merges. Sky builds.**

## 11. Gates (every commit)

`npm run typecheck` → 0 · `npm test` → 1737 passed / 108 suites (guards green) · `npm run lint` → 0 errors / 77 warnings (baseline, none in touched files) · arbiter → exit 0 · fence exact per commit. **No merge, no push, no EAS build.**
