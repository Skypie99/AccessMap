# GLASS.md — "Deep Field": Flagstone's liquid-glass material system

**Status: LAW** (referenced from DESIGN.md §13). Shipped on the Tasks screen 2026-07-03
(branch `overhaul/tasks-glass`), chosen by Sky's eye from the Material Lab's three live
candidates (Candidate C — `qa-reports/2026-07-02_Tasks_MaterialLab_Direction.md`).
Every number below is **script-arbitrated**: the Material Lab's `contrast-check.mjs`
measured each ink over its worst-case backdrop, both themes, and the passing floors ARE
these tokens. **Do not tune any floor/edge/ink by eye — re-run the arbiter**
(`qa-reports/assets/2026-07-03_tasks_glass/shipped-stacks.json` is the shipped pairing
set; `node <lab>/shared/contrast-check.mjs <stacks.json>` must exit 0).

---

## 1. The system in one paragraph

Deep Field is **true material everywhere it earns its cost**: a luminous gradient
**stage** is the screen's light source; **rows** are real blur panes (i=12) floating in
that field; the **chrome** (header zone) is one deeper pane (i=24) the content visibly
frosts beneath; everything smaller (chips, pills, search) is an **engineered tint** that
lets the pane beneath do the blurring. Light mode is shadow-assisted (e1); **dark mode is
luminosity-led** — floors LIFT above the stage, edges become cool `#A8C0E0`-family
hairlines, and drop shadows retire (the bulk bar's up-shadow is the one deliberate
exception). The glass is **decorative only**: every mode keeps AA floors, so removing
blur (Android, Reduce Transparency, C-lite) never loses information or contrast.

## 2. Surface tiers (exact shipped tokens)

All tokens live in `src/theme.ts` (light) + `src/theme/ThemeContext.tsx` (dark mirror);
the machine-readable spec is `theme.ts` → `export const glass`.

### Glass/Stage — `<ScreenStage />` (`src/components/ui/ScreenStage.tsx`)
| | Light | Dark |
|---|---|---|
| Base (165°) | `stage0 #E7F0FD → stage1 #F6F9FE (52%) → stage2 #F1F5FB` | `#0E1220 → #14151A` (2-stop) |
| Pool A (90%×58% @ 14%,4%) | `rgba(46,124,246,0.12)` | `rgba(20,102,224,0.16)` |
| Pool B (86%×54% @ 88%,98%) | `rgba(15,83,190,0.06)` | none (`stagePoolB: 'transparent'`) |
| Grain | 2.5% feTurbulence tile (128px) | same |

### Glass/Row — `variant="row"`, **i=12** (FlagCards, empty card, skeletons)
| | Light | Dark |
|---|---|---|
| Floor | `rgba(255,255,255,0.70)` | `rgba(30,34,46,0.72)` |
| Edge (1px border) | `rgba(255,255,255,0.62)` | `rgba(168,192,224,0.16)` |
| Specular (inner top 1px) | `rgba(255,255,255,0.90)` | `rgba(168,192,224,0.25)` |
| Lift | `shadow.e1` | none (luminosity-led) |
| Engineered (*Lite) | `0.92 → 0.84` white | `rgba(30,34,46) 0.94 → 0.88` |

### Glass/Chrome — `variant="chrome"`, **i=24** (the absolute header pane)
| | Light | Dark |
|---|---|---|
| Floor | `rgba(255,255,255,0.75)` | `rgba(13,18,32,0.80)` |
| Bottom edge | `rgba(15,40,90,0.10)` | `rgba(168,192,224,0.18)` |
| Inner lip (above edge) | `rgba(255,255,255,0.70)` | `rgba(168,192,224,0.14)` |

### Glass/Banner — `variant="banner"`, **i=12**, scrolls WITH the list
Floor `rgba(217,231,253,0.70)` / `rgba(14,68,153,0.70)` · edge `rgba(20,102,224,0.35)` /
`rgba(78,137,239,0.45)` · specular `rgba(255,255,255,0.65)` / `rgba(168,192,224,0.22)` ·
ink = `brandOnSoft`.

### Glass/Overlay (bulk bar) — `variant="bulk"`, **i=24**, select-mode only
Floor 0.85 both (`rgba(13,18,32,0.85)` dark) · top edge = chrome edge token · specular
`rgba(255,255,255,0.80)` / `rgba(168,192,224,0.18)` · up-shadow on the OUTER style:
light `shadowTint@0.12`, dark `#000@0.35` (the one dark shadow kept).

### Engineered chip tint (NO blur of its own — the pane blurs, the chip tints)
Fill `glassChipFill rgba(255,255,255,0.60)` / `rgba(255,255,255,0.10)` · edge
`glassChipEdge rgba(22,33,58,0.10)` / `rgba(168,192,224,0.16)` · label `glassChipInk
#333/#F5F5F5` · active = `ctaFill` + `textOnBrand`.

### Inks on glass (every fork was script-decided; the loser is noted)
| Token | Light / Dark | Beats |
|---|---|---|
| `inkGlassMuted` (eyebrow/subtitle/sort-label on chrome) | `#414B5A` / `#B8BEC9` | `textSubtle #707070` = 2.69:1 worst-case |
| `inkOnStage` (section headers, footer on the stage) | `#525C6B` / `#AAAAAA` | `textMuted #666` = 4.10:1 on the pool's darkest stop |
| `inkSelect` ("Select multiple", load-more) | `#0F53BE` / `#B4CFFA` | `brand #1466E0` = 4.17:1 on chip-over-worst |
| `inkDetailsGhost` (Details ghost) | `#1466E0` / `#84AEF6` | — (4.75:1 on row glass) |
| **`ctaFill`** (Verify, active chips, bulk Verify) | **`#1466E0` MODE-INDEPENDENT** | dark `brand #4E89EF` + white = 3.4:1 FAILS |
| `glassPlaceholder` | `#5B6470` / `#C9CFD9` | dark `#9ca3af` on the chip stack |
| Severity 1–4 ink / 5 | `#0F1B2D` / white | white on sev 2–4 = 2.1–3.4:1 (shipped 92a2be6) |

Type law on translucency: **body text on glass carries ≥500 weight**
(`font.family.bodyMedium`) — the 400 face hazes against moving content.

## 3. The blur-budget law

```
glass.maxLivePanes = 12       // ceiling on concurrently VISIBLE BlurViews
glass.intensity = { row: 12, chrome: 24, banner: 12, bulk: 24 }
```

- Budget arithmetic (Tasks): ~9–10 visible rows + chrome + banner = 12; select mode
  swaps per-card action rows for ONE bulk pane; first-load = 6 skeletons + chrome.
- **True blur may live ONLY in `GlassSurface` variants.** Chips/pills/search/section
  headers/badges never blur — engineered tints only.
- **The list's virtualization is the enforcement.** Never defeat it: `windowSize` stays
  at the RN default, no `removeClippedSubviews` tricks, never render/measure all rows.
  (The Material Lab noted windowSize tuning as an option; the build ratified the
  stronger rule — defaults + the visible-pane budget.)
- `__DEV__` telemetry: `GlassSurface` counts live BlurViews and `console.warn`s past the
  budget (`__getLiveBlurPaneCount()`); mounted count may briefly exceed VISIBLE count
  under default windowing on long lists — the budget is about what's on screen.

## 4. The C-lite runtime switch (`src/lib/glassMode.ts`)

- `'full'` (default) = Candidate C as designed. `'lite'` = rows/banner/empty/skeletons
  drop to the engineered `*Lite` micro-gradients; **chrome + bulk keep blur** (B's
  architecture wearing C's stage and floors).
- **Flip it: long-press the Tasks header title (600ms).** Haptic + flash + SR announce
  confirm; persisted under `@accessmap/glass_mode_v1`. Programmatic path:
  `toggleGlassMode()` / `setGlassMode()`.
- Deliberately **NOT `__DEV__`-gated** — Sky's ONE TestFlight build carries both modes
  for the on-device scroll A/B. **When to flip:** any visible hitching while scrolling
  the Tasks list with full C, or on older hardware. If C-lite wins on device, the losing
  mode is removed in a later cleanup commit (this switch is scaffolding, not a feature).
- The long-press wrapper is `accessible={false}` (taps and the SR tree are unchanged);
  SR users get the announce, and the store API is the documented path.

## 5. Android strategy — "C-on-Android = B" (ratified: all-engineered)

`GlassSurface` variants render the **engineered** material on Android unconditionally
(rows, banner, chrome, bulk — `Platform.OS === 'android'` branch). C's row-blur
personality is iOS-only, stated plainly. The optional
`experimentalBlurMethod="dimezisBlurView"` single-pane chrome fork was **NOT taken**
(Sky's call to make, later, device in hand). The legacy no-variant GlassSurface keeps
its existing behavior everywhere.

## 6. Reduce-Transparency — the designed opaque state (never a smear)

Wired via `useReduceTransparency()` (AccessibilityInfo, iOS listener):

| Surface | RT state |
|---|---|
| Row / empty / skeleton | `color.overlay` (0.97) fill + 1px `borderStrong`, no blur |
| Chrome | `overlay` fill + 1px `borderStrong` bottom edge |
| Bulk | `overlay` fill + 1px `borderStrong` top edge, up-shadow dropped |
| **Banner** | **`brandSofter` fill + 1px `brand` border** |
| Chips / search / pills | `surfaceNeutral` + `borderSubtle`; **active keeps `ctaFill`** |
| Selected card | `brandSofter` fill + 2px `brand` border |
| Press sheen | not mounted |
| Stage | **stays** (only glass goes opaque — the mockup's rule) |

Reduced-motion: the press sheen and skeleton pulse are RM-gated (`useReducedMotion()`);
the glass itself carries no motion.

## 7. Five do / don'ts

1. **DO** put every new floor/edge/ink pair through `contrast-check.mjs` before
   shipping — the arbiter decides, not your eye. **DON'T** darken the stage pools
   without re-running it (the AA floors were measured at the pools' darkest stops).
2. **DO** put shadows/margins on the style you pass to `GlassSurface` (the outer view);
   the clip layer would swallow them. **DON'T** put a `backgroundColor` there — the
   variant supplies the surface.
3. **DO** use engineered chip tints for anything smaller than a row. **DON'T** mount a
   BlurView outside a `GlassSurface` variant — the budget counter can't see it and the
   RT/Android/C-lite modes won't apply.
4. **DO** keep text on glass ≥500 weight and use the arbitrated inks (`inkGlassMuted`,
   `inkOnStage`, `ctaFill`…). **DON'T** use `textSubtle`/`textMuted`/`brand` on glass or
   the stage — all three measured below AA on worst-case backdrops.
5. **DO** trust list virtualization to bound row panes. **DON'T** touch `windowSize` /
   `removeClippedSubviews`, and don't hide the one dark shadow exception (bulk bar) —
   it's deliberate.

## 8. Application map (how the rest of the app wears Deep Field)

- **Map** (shipped 2026-07-04, `overhaul/glass-map`) — status pill / action bar / filter
  panel ride `variant="row"`, the floating-pane tier: its radius + full hairline + i=12
  shape is the right language for chrome floating over live tiles. (Chrome/bulk are
  *structural-shape* tiers — radius 0, single-edge hairlines — wrong for a floating pane.
  This is a shape choice, NOT a C-lite constraint: `forceEngineered` is variant-agnostic
  in the primitive, so any variant can thread it.) Pill + bar are **literal**
  `forceEngineered` (always the engineered gradient, never live blur — the budget win);
  the filter panel **threads** `forceEngineered={glassLite}` (true blur i=12 = the one
  frost moment on Map, F3). The locating banner + heatmap legend + saved-place chips stay
  LEGACY, pinned always-light by literals (AA-by-construction over any tile — that legacy
  pin is also why they still mount a BlurView, the accepted cost). Map-internal surfaces
  (cluster, heat badge, callout) get token/ink harmonization only, never a BlurView. The
  map itself is the stage — `ScreenStage` is NOT for map screens. Full rules: §12.
- **Home** — the search pill rides `variant="row"` (shipped in MP1, `HomeScreen.tsx`);
  the screen wash adopts `ScreenStage`.
- **Profile** — `ScreenStage` + cards on `variant="row"`.
- **Tab bar** — already speaks the language (i=24 + floor, RT-aware). **Do NOT "clean
  this up" by collapsing `TabBarGlass` into `variant="chrome"`** — that was tried and
  killed (M-48): on the true chrome floor the 12px tab labels fail WCAG AA on all four
  active/inactive × light/dark pairs, because the chrome primitive's floor is thinner
  than `tabBarGlassFloor` (the thicker floor 12px labels need). The mechanism stays
  byte-identical; R2/T15 repaired only the light inactive-label ink (#6B7280 → #515964,
  which had failed AA at 3.17:1 on the 0.82 floor over #000).
- **Drawer** (HamburgerDrawer) — the **chrome-Lite tier, scheme-bound**, not a
  `GlassSurface` variant. Panel + scrim leave as one welded object, and it drives its own
  `Animated` slide with `animationType="none"` so Reduce Motion is honored by
  construction. Fill = `glassChromeLite0`, right edge + header rule + divider =
  `glassChromeEdge`, inner lip = `glassChromeLip`, scrim = `scrim`, inks = `textStrong` /
  `inkGlassMuted` / `brand`. RT → the designed opaque state: dark keeps the flattened
  `#0D1220`, light takes `overlay`.
  **This entry replaced an "always-dark navigation rail" (M-45).** Sky's device read on
  2026-07-25 was that a dark drawer over a light app reads as two different apps, and her
  D2 phase prompt superseded the ratification. The earlier re-tokenize (`271e8ec`) that
  "broke light mode" was a **partial** binding — inks tokenized on a still-hardcoded dark
  panel. Surfaces and inks must move together; bound that way the same tokens pass the
  arbiter 32/32 (`design-reviews/device-tune/tools/devicetune-drawer-material-stacks.json`).
  **Do not "restore" the always-dark drawer** — see `design-reviews/device-tune/DECISIONS.md`
  §S S-4 and §F F-8.
- **Dialogs** — the four-dialog tier (Map "Name this preset" / "Name this filter" prompts
  + Profile tier-explainer + delete-account) is a solid-surface tier, not glass, ratified
  to land identically: shared fill / radius / centering / scrim, `shadow.e3` four-of-four,
  and the RM-gated **fade** entrance four-of-four (unified in R2/T20).

## 9. ROLLOUT RECIPE — how to apply Deep Field to a new screen

The Tasks build (`overhaul/tasks-glass`, commits A→D) is the worked example. Copy the
recipe, not the vibe — one stage-commit each, gates green at every step
(`npm run typecheck` 0 · `npm test` green, guards unedited · `npm run lint` 0 errors,
no new warnings · render-compare vs the mockup/spec before committing):

1. **STAGE** — screen root `backgroundColor: color.stage1`, mount `<ScreenStage />`
   first child. Verify: stage reads in light + dark, pools fall off smoothly, grain
   present (web uses the SVG data-URI path — check it tiles).
2. **CHROME** — move the header zone into an absolute `variant="chrome"` pane;
   `onLayout` → content top reserve (+10); anti-flash opacity gate until measured;
   `scrollIndicatorInsets` + `RefreshControl progressViewOffset`; restyle pills/chips to
   the chip tint with arbitrated inks. Verify: content visibly frosts under the pane
   mid-scroll; VoiceOver reads the header first; keyboard/scroll still behave.
3. **ROWS / CONTENT** — cards to `variant="row"` (Pressable stays the interactive root;
   GlassSurface is material only); selected state via `edgeColor/edgeWidth/overlayTint/
   solidColor`; 500-weight body; arbitrated action inks. Verify: 50-row scroll sanity
   (Chromium proxy, honestly tagged), blur count within budget, dark titles legible.
4. **COMPLETIONS** — section headers/footers to `inkOnStage`; empty/loading states on
   the row material; RT designed states verified; thread `useGlassMode()` →
   `forceEngineered` to every row-tier surface (chrome/bulk never); re-run the arbiter
   against shipped values (exit 0) and update `shipped-stacks.json` if any pairing
   changed. THEN the report: conformance table, defaulted forks, honesty tags,
   NEEDS-DEVICE list. **Sky merges. Sky builds.**

## 10. Honesty-tag register (web/RN translation deltas, all deliberate)

- Grain is plain-alpha 2.5%, not `mix-blend-mode: overlay` (RN/web support uneven;
  imperceptible at this opacity — the arbiter's 3% grain bound covers it). Native tiles
  a pre-rendered PNG (`assets/textures/noise-128.png`); web uses the mockup's exact SVG
  data-URI (RNW ignores `Image resizeMode="repeat"`).
- Speculars/lips/edges are 1px hairline Views (RN has no inset box-shadow) — sub-pixel
  corner delta vs the mockup's inset shadows.
- The per-chip specular inset was omitted (per-side border colors glitch on
  `radius.circle`); imperceptible at a 60% fill.
- The press sheen is a linear top-wash, not the mockup's radial (a per-card SVG isn't
  worth its cost); 120ms, RM-gated.
- expo-blur has no `saturate()` — intensities 12/24 only (declared in the mockup's own
  honesty map: `blur(10px) sat(140%)` ≈ i=12, `blur(20px) sat(160%)` ≈ i=24).
- True blur FEEL and scroll smoothness are NEEDS-SKY-DEVICE — the web numbers are
  Chromium proxies, directional only.

## 11. Open item flagged for Sky

- `src/components/ui/Button.tsx` — zero call sites app-wide. Left untouched by this
  pass per the brief (adopt-or-remove is Sky's decision; the lab recommended adopt).

## 12. LIVE-BACKDROP ADDENDUM (what the Map pass taught the system)

Everything above assumes a *designed* backdrop (a `ScreenStage` you control). Map is the
first surface whose backdrop is a live, moving, unbounded map. These rules govern any
future map-class screen:

1. **No stage — the live surface IS the stage.** Map-class screens mount no `ScreenStage`.
   No scrim substitutes unless Sky picks one; if picked it must be `pointerEvents="none"`,
   edge-weighted, occlude no pin, and be excluded from the arbiter stacks. (Sky picked
   NONE for Map.)
2. **Bases are `#000` + `#FFF` in BOTH modes** (+ documented domain saturants — here the 5
   heat-ramp colors). Tiles and theme are independent axes: the JS theme is app-only, iOS
   Apple tiles follow the OS, web CartoDB `dark_all` is always dark. Never assume tile and
   theme match.
3. **Window rule.** Extremes are the worst case *iff* the ink's luminance lies outside
   `[Y(stack over #000), Y(stack over #FFF)]`. Let the arbiter probe every base and take
   the true minimum — an inside-window ink can hit 1:1 on some mid-tone pixel and no floor
   fixes it.
4. **Boundary colors can't span the range alone** — a white ring vanishes on white tiles.
   Use regime-decomposed unions (paired light + dark rings/edges) and prove the union
   covers all backdrop luminances. Never reuse a 3.0 boundary union as a 4.5 text
   guarantee.
5. **Blur only where the backdrop is quasi-static while the surface is up** (sheet/panel-
   class — the filter panel). Persistent pan-time chrome = **literal `forceEngineered`**
   (budget-free by mechanism — no BlurView ever mounts).
   - **Ratified exception (Sky, 2026-08-12): the SINGLE-pane Explore command bar mounts
     live blur.** The on-device A/B is over — Sky picked `full`, so **the C-lite runtime
     switch is retired app-wide** (`glassMode.ts` + both long-press triggers + every
     `forceEngineered={glassLite}` thread deleted) and `full` is the shipped material. The
     command bar (the one persistent pane) mounts live blur (i=12) + the crystal worst-stop
     floor via the additive `floorColor` override on iOS, and the engineered crystal
     gradient (`liteColors`) on Android (§5 — Android never blurs). No `forceEngineered`
     thread, no long-press toggle: those were the A/B scaffolding, now gone. Every OTHER
     persistent map control stays engineered — the crystal FAB circles (recenter/zoom/List)
     are **literal `forceEngineered`**, 0 blur panes. Count the bar as **1 permanent blur
     pane** (rule 7). Reduce Transparency still drops the whole estate to the designed
     opaque state; the retired `lite` mode was the only lower-GPU middle option.
6. **Map-internal world** (markers, cluster children, callouts, heat badges) = tokens/inks
   only, never a BlurView. Snapshot flags (`tracksViewChanges={false}`) require a
   content-derived key (`cluster-${id}-${count}`) and a fully mode-independent bubble, or
   the snapshot goes stale on theme flip.
7. **Count the blur budget at the worst SIMULTANEOUS state**, and add the tab bar manually
   (its BlurView is invisible to `__getLiveBlurPaneCount`).
8. **Always-light pins are literals + static inks, never themed tokens** (a themed token
   renders dark in dark mode). Semantic alert banners stay solid (reaffirmed).
