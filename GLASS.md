# GLASS.md — "Deep Field": AccessMap's liquid-glass material system

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

- **Map** — its five legacy `GlassSurface` sites (status pill, action bar, filter panel,
  locating banner, heatmap legend) keep the legacy path today; migrate composition-
  untouched to `variant="chrome"`/`"banner"` recipes in a Map pass. The map itself is
  the stage — `ScreenStage` is NOT for map screens.
- **Home** — the search pill upgrades to the chrome material (one pane); the screen wash
  adopts `ScreenStage`.
- **Profile** — `ScreenStage` + cards on `variant="row"`.
- **Tab bar** — already speaks the language (i=24 + floor, RT-aware); a later cleanup
  can collapse `TabBarGlass` into `variant="chrome"`. Untouched by this pass.

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
