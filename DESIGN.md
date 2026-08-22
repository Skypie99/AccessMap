# Flagstone — Design System

The single source of truth for how Flagstone looks and feels.
Tokens live in [`src/theme.ts`](src/theme.ts); this file explains how to use
them and the reasoning behind each decision. If you change either file, change
both.

> **Design philosophy.** Flagstone exists to help people who navigate the
> physical world differently. The visual language has to be *born accessible*:
> high contrast, generous targets, clear typography, color that's never the
> only signal. Beauty that excludes people is a defect — especially here.

---

## 1. Color

### Palette

Colors are grouped by role, not by hue. Pick the role first; the hex is
implementation detail.

| Role | Token | Hex | Where it belongs |
|---|---|---|---|
| Primary surface | `color.surface` | `#fff` | screen / card background, text on brand |
| Subtle screen wash | `color.surfaceMuted` | `#f7f9fc` | gray screen background |
| Input / soft card | `color.surfaceSoft` | `#f7f8fa` | input fields, secondary cards |
| Pill / neutral chip | `color.surfaceNeutral` | `#eef1f5` | inactive filter pills |
| Floating panel | `color.overlay` | `rgba(255,255,255,0.97)` | filter / banner over map |
| Modal backdrop | `color.scrim` | `rgba(0,0,0,0.4)` | sheet backdrops |
| Text — heading | `color.textStrong` | `#222` | titles, emphasized labels |
| Text — body | `color.text` | `#333` | default copy |
| Text — secondary | `color.textMuted` | `#666` | meta, descriptions |
| Text — tertiary | `color.textSubtle` | `#707070` | faint tertiary meta (dates, counts, hints) — now AA at any size |
| Text — on brand | `color.textOnBrand` | `#fff` | text on the brand blue; on severity fills only sev-5 red — sev 1–4 use ink `#0F1B2D` (AA audit 2026-07-02) |
| Brand | `color.brand` | `#1466E0` | primary action color, links ("Wayfinder Blue", 2026-05-30) |
| Brand soft (bg) | `color.brandSoft` | `#d6e6f9` | verified-status pill background |
| Brand on soft | `color.brandOnSoft` | `#1c4f99` | text on `brandSoft` |
| Open status bg/fg | `statusOpenBg/Fg` | `#fdebd0` / `#8a4b00` | open status pill |
| Verified status bg/fg | `statusVerifiedBg/Fg` | `#d6e6f9` / `#1c4f99` | verified status pill |
| Resolved status bg/fg | `statusResolvedBg/Fg` | `#d4ecdb` / `#1b6b34` | resolved status pill |
| Success | `color.success` | `#27ae60` | Resolve buttons (text-on-it = white) |
| Warning bg/fg | `warningBg/Fg` | `#fff7e6` / `#714b00` | notice banners |
| Error | `color.error` | `#c0392b` | primary error banner |
| Error strong | `color.errorStrong` | `#e74c3c` | destructive button (Delete) |
| Error bg/fg | `errorBg/Fg` | `#fdecea` / `#8a1f1f` | inline error message |
| Fixed-dark surfaces | `fixedDark.*` + `errorOnDark/Bg/Border` | `#fca5a5` / `rgba(239,68,68,0.15)` / `rgba(239,68,68,0.3)` | covers that paint their own dark background (the sign-in wall) and therefore have ONE appearance in both palettes. `fixedDark` (theme.ts) holds the field fill/outline/focus/ink/label; the error trio is re-exported through both palettes as `color.errorOnDark*` so the themed `Input` primitive can reach it from `useColor()`. `errorFg`/`errorBg` above are the light palette's card pair and are illegible on a navy cover — do not substitute them. `errorOnDark` on the error box over the form card over the cover (composite ≈ `#3B2A39`) = 7.0:1, AAA. |
| Border | `color.border` | `#e5e5e5` | default divider / outline |

### Color pairings — contrast checklist

The pairings we actually ship hit WCAG 2.2 AA (4.5:1 normal text, 3:1 large
text / UI components). Don't introduce a new fg/bg pair without checking it.

| Foreground | Background | Ratio | Pass |
|---|---|---|---|
| `text` (#333) | `surface` (#fff) | 12.6:1 | AAA |
| `textStrong` (#222) | `surface` | 16:1 | AAA |
| `textMuted` (#666) | `surface` | 5.7:1 | AA |
| `textSubtle` (#707070) | `surface` | 4.95:1 | AA at any size (darkened from #999 in the Phase 6 a11y pass) |
| `brand` (#1466E0) | `surface` | 5.2:1 | AA at any size ("Wayfinder Blue" is darker than the old #2f80ed) |
| `textOnBrand` (#fff) | `ctaFill` (#1466E0) | 5.24:1 | AA — the mode-independent CTA fill; prefer over themed `brand` (dark `#4E89EF` = 3.42:1, fails small text) for any white-on-blue |
| `statusOpenFg` | `statusOpenBg` | 6.5:1 | AA |
| `statusVerifiedFg` | `statusVerifiedBg` | 7.6:1 | AAA |
| `statusResolvedFg` | `statusResolvedBg` | 6.4:1 | AA |
| `warningFg` | `warningBg` | 8.3:1 | AAA |
| `errorFg` | `errorBg` | 7.4:1 | AAA |
| `textOnBrand` | `error` (#c0392b) | 5.0:1 | AA |
| `textOnBrand` | `success` (#27ae60) | 2.7:1 | **large text only**; pair with icon |

**Rules of thumb**
- Body text on white → use `text` or `textStrong`. Never `textSubtle`.
- Text *on* `brand` should be ≥ 16pt bold (the FAB labels qualify).
- Severity bars / status pills always carry text + icon too — color is never the sole cue (WCAG 1.4.1).

### Severity ramp

Defined once in `src/theme.ts` as `severity[1..5]`. Mirrored by the runtime
helper `severityColor()` in `src/lib/flags.ts` (moved there from
ReportFlagModal) for legacy call sites. **Always render the severity color with the number AND a word**
("Severe (5)") — colorblind users and screen-reader users both need the
redundant signal.

---

## 2. Type

A focused scale. Body default is `font.size.base` (14pt).

| Token | Size | Use |
|---|---|---|
| `caption` | 11 | tiny meta, hint text — pair with `textMuted` |
| `xs` | 12 | pill labels |
| `sm` | 13 | dense card body, banner copy |
| `base` | 14 | **default body** |
| `md` | 15 | FAB label, emphasized body |
| `lg` | 16 | input text, subtitle |
| `xl` | 18 | section title |
| `xxl` | 20 | screen title |
| `h2` | 24 | modal heading |
| `h1` | 28 | screen-level heading |
| `display`, `displayLg` | 48 / 72 | empty-state numerals (Profile points) |

Weights live in `font.weight` (`regular | medium | semibold | bold`). For
emphasis prefer weight + size over color.

**Dynamic Type.** React Native scales text by default. Don't pin a `height` on
any text container — let it grow. Don't use `numberOfLines={1}` on content
text (titles, banner messages should allow at least 2 lines).

---

## 3. Spacing

4pt grid. Use the named tokens; don't introduce raw integers.

| Token | px | Use |
|---|---|---|
| `tight` | 4 | gap between text + adjacent icon |
| `xs` | 6 | small chip padding |
| `sm` | 8 | most common gap |
| `md` | 12 | most common padding, comfortable gap |
| `lg` | 16 | section padding, card padding |
| `xl` | 20 | generous padding |
| `xxl` | 24 | screen padding |
| `xxxl` | 32 | section break |

---

## 4. Radius

| Token | px | Use |
|---|---|---|
| `xs` | 4 | inline tags |
| `sm` | 6 | tight chips |
| `md` | 12 | **default for inputs and buttons** |
| `lg` | 16 | cards, floating panels |
| `xl` | 20 | sheet headers, hero cards |
| `sheet` | 28 | bottom-sheet top corners |
| `full` | 999 | pills, FABs, round icon buttons |
| `circle` | 9999 | perfectly circular (avatars) |

---

## 5. Shadow & elevation

Pick by perceived elevation, not by pixel-exact replication.

| Token | Use |
|---|---|
| `shadow.e1` | gentle lift — round icon buttons sitting on the map |
| `shadow.e2` | floating panel / banner / FAB |
| `shadow.e3` | modal sheet, error banner over the map |

### The 4-tier elevation language

Elevation is a vocabulary, not a free dial. Every surface speaks in one of four
tiers, and the tier is chosen by the surface's **semantic role** — how far it
sits from the base plane in the user's mental model — never to chase a look.
Depth is always carried by **shadow + position** (the surface lifts *and* floats
above what it covers); **never by color alone**, because color-only depth
vanishes for low-vision and color-blind users and breaks in dark mode.

| Tier | Token | Role — what lives here |
|---|---|---|
| **Flat** | _no shadow_ | In-flow content on the base plane — list rows, inline cards, section bodies, anything that scrolls *with* the page. Reads as part of the surface, not on top of it. |
| **Lifted** | `shadow.e1` | A control that nudges off its surface — round icon buttons on the map, a pressable chip that wants a hairline of separation. The smallest "I'm tappable / I'm above the wash" cue. |
| **Floating** | `shadow.e2` | Persistent UI that hovers over content but doesn't seize the screen — the filter panel, the update banner, the FAB, the heatmap legend. It coexists with the map/list beneath it. |
| **Prominent** | `shadow.e3` (+ optional `shadow.glowBrand` / `shadow.glowGold`) | Surfaces that command the moment — modal sheets, the error/offline banner over the map, a celebratory gamification card. `e3` is the structural depth; an *optional* colored glow adds expressive lift on brand/reward surfaces only. The glow is decorative — it layers **on top of** `e3`, never replaces it, and is never the only depth cue. |

**Rules of the language:**

- One tier per surface. Don't stack `e2` on an already-`e3` sheet to "make it pop."
- Move up a tier only when the role changes (a banner that escalates from
  informational `e2` to an urgent `e3` alert), not for visual variety.
- Reduced-transparency and dark mode must preserve the *order* of the tiers —
  Prominent always reads as deeper than Floating — even if absolute shadow
  values are tuned per palette.
- A glow (`glowBrand` / `glowGold`) is reserved for **Prominent** brand/reward
  surfaces and always sits beneath AA-contrast content; it decorates depth, it
  never signals state.

---

## 6. Touch targets

All interactive elements must hit `a11y.minTargetSize` (44pt). Use
`minHeight` + `minWidth`, not just visual size — a 24pt icon inside a 44pt
hit area is fine. Pills and small chips should set `minHeight: 44` *or* live
inside a wrapper that does.

---

## 7. Component patterns

### Status pill
- Background = `statusXxxBg`, foreground = `statusXxxFg`.
- Padding `horizontal: md, vertical: xs`, radius `full`, font `xs` semibold.
- Always paired with status text — the color alone is not enough.

### Filter chip
- Inactive: `surfaceNeutral` bg, `text` fg.
- Active: `brand` bg, `textOnBrand` fg.
- Padding `horizontal: md, vertical: sm`, radius `full`, font `xs` semibold.
- `minHeight: 32` is current — bump to 44 in a wrapper Pressable.

### Primary button (FAB)
- `brand` bg, `textOnBrand` fg, `shadow.e2`, radius `full`.
- Label `md` (15pt) bold for AA on brand.
- `minHeight: 44`.

### Resolve button (destructive-positive)
- `success` bg (#27ae60), `textOnBrand`.
- Always paired with the icon and the word "Resolve" — color alone fails AA.

### Delete button
- `errorStrong` bg, `textOnBrand`, requires a confirmation step.

### Banner — info / warning / error
- Pattern: **color + icon + text**, never color alone.
- `minHeight: 44`, `numberOfLines={2}` on the message (long copy must wrap, not get clipped).
- Use the `errorBanner` in `MapScreen.tsx` as the canonical example.
- See `LEARNINGS.md` (2026-05-23) for the cross-platform live-region recipe.

### UI primitives (`src/components/ui/`)
Prefer these over re-rolling layout. All are themed via `useColor()` and a11y-wired:
- **`AppText`** — the type primitive. Always use it (not raw `<Text>`) so the brand
  fonts render. Picks the family by `variant`; derives tight tracking from `size` for
  display/heading; caps Dynamic Type per variant (`body`/`bodyMedium` stay uncapped so
  essential text always scales — WCAG 1.4.4).
- **`Button`** — primary / secondary / ghost × sm / md / lg; press-scale spring (reduced-motion-gated).
- **`Input`** — themed single-line field: default / focus / error / disabled, optional
  label / helper / error / left-icon / right-slot, ≥44pt, error as a polite live region.
- **`Card`** — surface primitive.
- **`Skeleton` / `SkeletonRow` / `SkeletonCard`** — content-shaped loading placeholders
  with a reduced-motion-gated shimmer. Prefer over a bare `ActivityIndicator` for
  content that has a shape.
- **`Sheet` / `SheetHeader`** — bottom-sheet scaffold (scrim + rounded card + drag handle
  + titled, labelled close). Reduced-motion aware. Adopt for new modals.
- **`GlassSurface`** — the frosted-glass material primitive. Legacy call (no `variant`):
  the 2026-06-17 map-overlay glass (blur + `overlayGlass` AA floor, opaque under Reduce
  Transparency). **Deep Field variants** (`variant="row" | "chrome" | "banner" | "bulk"`,
  2026-07-03): the liquid-glass tiers with per-tier floors/edges/speculars, engineered
  (Android / C-lite) and designed Reduce-Transparency materials, and a `__DEV__`
  blur-budget counter. Full law: `GLASS.md` (§13 below).
- **`ScreenStage`** — the Deep Field designed screen background (165° wash + radial
  brand pools + 2.5% grain; dark is the luminous single-pool variant). Decorative,
  a11y-hidden. Pair with screen `backgroundColor: color.stage1`.

### Haptics
`@/lib/haptics` — `hapticSelection` / `hapticImpact` / `hapticNotify`. No-ops on web and
if the module is unavailable. Use a light `hapticSelection()` on key picks (category,
severity, segmented controls). The OS-level haptic setting is honored natively — do
**not** gate on reduce-motion (a separate concern).

### Appearance (dark mode)
The app ships light + dark palettes (`ThemeContext`) and follows the OS by default. A
**Light / Dark / System** control in Settings (`useThemeMode()`) lets users override; the
choice persists in AsyncStorage. Always consume colors via `useColor()` so both palettes
work. Fixed-background exceptions (do NOT theme): the dark sign-in splash, the always-dark
**tab bar**, and the always-light map overlays (heatmap legend, locating banner,
saved-place chips). **First-launch onboarding is no longer one** — as of the 2026-08-22
board-05 pass (Sky's ruling Q4) `OnboardingCards` mounts the real `ScreenStage` and follows
the OS like the rest of the app. Worth recording honestly: this list never *named*
onboarding, but the code had treated it as an exception for months (a bespoke gradient, a
glow orb, ~15 hardcoded inks with their own inline WCAG comments), so the doc and the app
disagreed in the direction that hides work. The app's own Settings replay had already been
themed, which is what made the dark first launch read as a different product. The hamburger
**drawer is no longer an exception** either — as of the
2026-07-25 device-tune D2 pass it is scheme-bound chrome-Lite glass (GLASS.md §8), because
a dark drawer over the light app read as two different apps on device. As of the 2026-07-04 Map pass (GLASS.md §8 + §12), Map's status pill / action bar /
filter panel are THEMED Deep Field row-tier — dark chrome in dark mode; only the pinned
overlays above stay always-light.

---

## 8. Motion

Motion tokens live in `theme.ts` as `motion` (added 2026-06-01):

| Group | Tokens | Use |
|---|---|---|
| `motion.duration` | `instant 0` / `fast 120` / `base 180` / `slow 320` (ms) | never exceed `base` for micro-interactions |
| `motion.easing` | `standard` / `decelerate` / `accelerate` (cubic-bezier control points) | build with `Easing.bezier(...motion.easing.standard)` at the call site |
| `motion.spring` | `press` / `pressOut` / `sheet` / `drawer` | spread into `Animated.spring(...)`; set `useNativeDriver` per call |

Rules:
- **Always gate non-trivial motion** behind `useReducedMotion()` (`@/lib/accessibility`) —
  snap to the end state when reduced (WCAG 2.3.3). See `Button`, `HamburgerDrawer`, `Skeleton`.
- Default duration ≤ 200ms; the bottom-sheet slide and drawer are the only longer moves.
- `Sheet` sets `animationType="none"` under reduced motion automatically.

---

## 9. Decision log

A short, dated record of design decisions so future-you knows why a value is
what it is. Append-only.

- **2026-05-23 — Tokens established.** Inventoried 47 distinct hex/rgba
  literals across screens (`#fff` × 47, `#2f80ed` × 22, `#eef1f5` × 23, …).
  Bundled them into 6 roles (surface, text, brand, status, semantic, border)
  with WCAG-verified pairings. Set `font.size.base = 14` since 14 (×25) and
  13 (×24) dominate body copy. Severity ramp kept identical to existing
  `severityColor()` so no behavior changed.
- **2026-06-01 — UI/UX polish pass.** Completed + enforced the system: added
  motion tokens, `font.tracking`, and medal/anon color tokens; gave `AppText`
  managed Dynamic Type (per-variant caps); built the `Input`, `Skeleton`, and
  `Sheet`/`SheetHeader` primitives; installed `expo-haptics` + a safe wrapper;
  added the Light/Dark/System appearance toggle; fixed the tab bar's bottom
  safe-area inset and reduced-motion gaps (Button, HamburgerDrawer). On branch
  `ui-polish/auto-2026-06-01` (not merged). Why: take the app from functional to
  premium — where "premium" and "accessible" are the same goal.
- **2026-06-03 — More-expressive elevation pass.** Sky asked for a bolder, more
  overtly "designed" feel across the whole app while keeping accessibility a hard
  floor. Added (extend-don't-fork): **focus ring** (`a11y.focusRingWidth/Offset`,
  ring colour = `color.brand`, WCAG 2.4.7/2.4.11); an **info/tip** pairing
  (`color.infoBg/infoFg`, both palettes) so helpful nudges stop reading as
  warnings; a **`gradient`** group (`brand` / `brandHero` / `gold`) for CTAs +
  gamification surfaces (mode-independent, like the sign-in hero); and soft
  **colored glows** (`shadow.glowBrand/glowGold`). Primitives gained: `AppText`
  auto header-role, `Pill` 44pt hit-area, `Card` press-haptic + `elevated`
  variant, `Button` gradient + glow + focus ring + press haptic. Screens lifted:
  Admin (full token migration), Tasks (severity stripe + photo shimmer +
  StatusBadge), Report (info/tip nudge + gradient submit + success haptic),
  Profile (gradient hero + gold progress), Settings (lifted segmented control),
  Map (crisper floating chrome). Finished the icon system — the app is now 100%
  Lucide/SVG (the last Ionicons were converted). Every gradient/glow is held to
  AA contrast and reduced-motion. On branch `ui-polish/accessmap-2026-06-03`
  (not merged — Sky's gate).
- **2026-06-19 — Severity-label unification + doc reconcile (overhaul Phase 2).**
  Standardized the severity scale to a single source. `theme.severity` labels
  (Minor / Mild / Moderate / Significant / Severe) are now canonical; both
  `SEVERITY_LABELS` (`flags.ts`) and `heatmapSeverity` derive from them, and
  `SeverityBadge` reads them — so every surface names a severity identically.
  Previously the badge showed Low / High / Critical while the report form, legend,
  map callouts and a11y text showed Mild / Significant / Severe. Also reconciled
  docs to reality: the `Pill` and `PointsChip` primitives were dropped as unused
  (commit `fbbdc44`, 2026-06-18), so the 2026-06-03 entry above and `CLAUDE.md`
  reference primitives that no longer exist; the current `src/components/ui/` set
  is AppText / Button / Input / Card / GlassSurface / Skeleton / Sheet. On branch
  `overhaul/phase2-design-system` (Sky's gate).
- **2026-08-01 — Pre-ship consistency polish (ui-polish/accessmap-preship-2026-08-01).**
  The system was mature; the pass killed the places that never adopted it. Tokens
  gained `bulkGlassShadow()` (the 16-file hand-copied modal up-shadow, hoisted),
  the completed `font.lineHeight` family, `font.tracking.eyebrow` (1.2) +
  `font.tracking.section` (0.8) naming the two established uppercase practices,
  and `icon.inline`/`icon.stroke` (18/2.2) naming the de-facto icon standard.
  Estate convergence: content-shaped Skeleton loading in the 6 list modals
  (SkeletonCard's first adopters) + inked spinners + tinted RefreshControls both
  platforms; the press vocabulary completed (~30 static Pressables gained pressed
  states from the existing pressed tokens; HeaderActions + drawer gained the tab
  bar's hapticSelection); inset-aware bottom padding on 11 sheets + SignIn +
  the lightbox counter (non-throwing SafeAreaInsetsContext, the M15 recipe);
  the estate Switch recipe (brand track, themed false-track); empty states on one
  grammar (icon + heading + body; the last emoji glyph retired); STATUS_COLORS'
  light-only consumers moved to themed statusPalette (real dark-mode bug); map
  callout parity (severity bar + filled CTA on both platforms) + the true-zero
  empty card. Full ledger: `design-reviews/ui-polish/2026-08-01/`.
- **2026-07-03 — "Deep Field" liquid glass ships on Tasks (the benchmark).** Sky chose
  Candidate C from the Material Lab's three live candidates (Pass 1,
  `qa-reports/2026-07-02_Tasks_MaterialLab_Direction.md`) for its identity in motion;
  the build pass (`overhaul/tasks-glass`) made the Tasks screen BE that mockup: stage +
  row glass i=12 + chrome pane i=24 + scrolling banner + conditional bulk pane, all
  inks script-arbitrated by `contrast-check.mjs` (the passing floors ARE the tokens —
  incl. the mode-independent `ctaFill #1466E0`, `inkGlassMuted`, `inkOnStage`). Blur
  budget = 12 VISIBLE panes, bounded by default list virtualization (never tune
  windowSize / removeClippedSubviews). C-lite ships as a persisted RUNTIME switch
  (long-press the Tasks header) so one TestFlight build carries both material modes;
  Android is all-engineered ("C-on-Android = B"). Dark mode is luminosity-led — drop
  shadows retired except the bulk bar's up-shadow. Full law + rollout recipe:
  **GLASS.md** (§13). Composition stayed locked (FlagCard pin test added). On Sky's
  gate — the device scroll test is THE acceptance gate.

---

## 10. Iconography (Claude Design — 2026-06-01)

The product UI uses **SVG icons only — no emoji, no Unicode-glyph icons.**

- **General UI icons:** [Lucide](https://lucide.dev) via `lucide-react-native`
  (2px stroke, round cap) — every control, list affordance, banner, chevron,
  close (X), check, etc.
- **Brand mark:** `src/components/LogoMark.tsx` — the Wayfinder-Blue pin + white
  striding figure (`color` / `white` / `mono`), via `react-native-svg`.
- **Category icons:** `src/components/CategoryIcon.tsx` — a bespoke 24/2px SVG
  glyph per `FlagCategory`, `stroke="currentColor"` so it tints with any token.
- **Tier badges:** `src/components/TierIcon.tsx` — Medal (bronze/silver/gold) +
  Gem (platinum) in tier colors. Achievements use Lucide icons via a name map.
- **Map pins:** a teardrop in the severity color with a white ring, a
  Wayfinder-Blue glow, and the white category glyph inside (a check when
  resolved) — see `PlatformMap.web.tsx`. (Native renders a colored marker; the
  in-pin glyph is a device-verified follow-up.)
- **Civic Gold** (`color.goldAccent`) stays reserved for gamification — points,
  streaks, badges — always on ink text (profile hero, leaderboard, points/streak chips).

## 11. Outstanding proposals

(See the latest design report under `qa-reports/design-YYYY-MM-DD.md`.)

- ✅ Done: dedicated category icon set — now `CategoryIcon` (SVG, not emoji).
- ✅ Done: dark-mode token layer — `src/theme/ThemeContext.tsx`.
- ✅ Done: `severityColor()` now sources from `theme.severity` (one ramp).
- ✅ Done (2026-06-01): motion tokens, Dynamic Type, dark-mode toggle, and the
  `Input` / `Skeleton` / `Sheet` primitives.
- ✅ Done (2026-06-03): focus-ring, info/tip, gradient + glow tokens (see §12);
  app is now 100% Lucide/SVG (last Ionicons converted).
- **Brand-font follow-up:** ~17 secondary/modal files still use raw `<Text>`
  (system font) instead of `<AppText>` — a mechanical, ~200-node consistency
  cleanup. Convert in a focused pass (pick the variant that matches each Text's
  intended weight: heading/label/bodyMedium/body).
- **Sheet adoption:** the `Sheet` primitive is for *bottom-sheets*; most existing
  modals are intentionally full-screen page-sheets / lightboxes / drawers and
  should NOT be converted. Adopt `Sheet` for new bottom-sheets only.
- Native map pin: render the white category glyph inside the marker (needs
  on-device verification of the `react-native-maps` custom-marker view).
- Refresh §1–§7 sample values where they still drift from `src/theme.ts` (the
  tokens in code are the source of truth). The brand hex is now reconciled
  (`#1466E0`, "Wayfinder Blue"); a remaining sweep covers the status/brandSoft
  background samples in §1 and the stale `#2f80ed` brand mentions in code
  comments (the brand *value* is already correct everywhere — only comments lag).

---

## 12. Gradients, glows & focus (more-expressive — 2026-06-03)

These extend the system for the bolder visual direction. Every one is held to the
same AA / reduced-motion floor as the rest of the system.

| Token | Value | Use |
|---|---|---|
| `gradient.brand` | blue → deeper blue | primary buttons / FAB (white label ≥16pt bold — same AA-large/UI posture as solid `brand`) |
| `gradient.brandHero` | 3-stop brand wash | Profile hero / feature heroes |
| `gradient.gold` | Civic Gold ramp | gamification accents — **ink text only**, never white |
| `shadow.glowBrand` | soft blue glow | primary CTAs, the Profile hero |
| `shadow.glowGold` | soft gold glow | celebratory gamification surfaces |
| `a11y.focusRingWidth` / `a11y.focusRingOffset` | 2 / 2 | visible focus ring (WCAG 2.4.7/2.4.11), drawn in `color.brand` as a no-layout-shift overlay |
| `color.infoBg` / `color.infoFg` | calm blue (both palettes) | helpful *tips* (e.g. the "add a photo" nudge) — distinct from warning amber and status-open blue |

**Rules.** Gradients are *mode-independent* (a brand-blue gradient is brand-blue
in light and dark — like the sign-in hero and map overlays; a DESIGN.md
"fixed-background exception"). Feed them to `expo-linear-gradient`. The gradient
self-rounds via its own `borderRadius` so you never need `overflow:hidden` (which
on iOS would clip the glow shadow). Glows are decorative only — never the sole
signal. The focus ring appears on keyboard / switch-control focus.

---

## 13. Liquid glass — "Deep Field" (2026-07-03)

The app's material system, chosen by eye from the Material Lab's three live
candidates and shipped first on the Tasks screen (the benchmark every screen
pass copies). **The full law lives in [GLASS.md](GLASS.md)** — surface tiers
with exact shipped tokens, the blur-budget law (`glass.maxLivePanes = 12`,
VISIBLE panes, bounded by default list virtualization), the arbitrated on-glass
inks (incl. the mode-independent `ctaFill`), the C-lite runtime switch, the
all-engineered Android strategy, the designed Reduce-Transparency states, five
do/don'ts, the application map, and the step-by-step ROLLOUT RECIPE
(stage → chrome → rows → completions, with the gates per step).

One rule worth repeating here: **every floor/edge/ink pair on glass is
script-arbitrated** (`contrast-check.mjs`) — never tuned by eye, never changed
without re-running the arbiter.
