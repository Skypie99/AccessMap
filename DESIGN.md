# AccessMap — Design System

The single source of truth for how AccessMap looks and feels.
Tokens live in [`src/theme.ts`](src/theme.ts); this file explains how to use
them and the reasoning behind each decision. If you change either file, change
both.

> **Design philosophy.** AccessMap exists to help people who navigate the
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
| Text — tertiary | `color.textSubtle` | `#999` | disabled, large-text-only |
| Text — on brand | `color.textOnBrand` | `#fff` | text on the brand blue / severity colors |
| Brand | `color.brand` | `#2f80ed` | primary action color, links |
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
| Border | `color.border` | `#e5e5e5` | default divider / outline |

### Color pairings — contrast checklist

The pairings we actually ship hit WCAG 2.2 AA (4.5:1 normal text, 3:1 large
text / UI components). Don't introduce a new fg/bg pair without checking it.

| Foreground | Background | Ratio | Pass |
|---|---|---|---|
| `text` (#333) | `surface` (#fff) | 12.6:1 | AAA |
| `textStrong` (#222) | `surface` | 16:1 | AAA |
| `textMuted` (#666) | `surface` | 5.7:1 | AA |
| `textSubtle` (#999) | `surface` | 2.8:1 | **fails normal text** — use only ≥18pt or non-essential |
| `brand` (#2f80ed) | `surface` | 3.3:1 | AA large / UI only |
| `textOnBrand` (#fff) | `brand` | 3.3:1 | AA large / UI only (use ≥16pt bold) |
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
helper `severityColor()` in `src/screens/ReportFlagModal.tsx` for legacy call
sites. **Always render the severity color with the number AND a word**
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
| `md` | 8 | **default for cards and buttons** |
| `lg` | 12 | panels, modal sheets |
| `xl` | 16 | full-screen sheet headers |
| `full` | 999 | pills, FABs, round icon buttons |

---

## 5. Shadow

Three tiers. Pick by perceived elevation, not by pixel-exact replication.

| Token | Use |
|---|---|
| `shadow.e1` | gentle lift — round icon buttons sitting on the map |
| `shadow.e2` | floating panel / banner / FAB |
| `shadow.e3` | modal sheet, error banner over the map |

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

---

## 8. Motion

Currently minimal — modal slide-in/out, callout reveal. Any future motion
**must respect Reduce Motion** (`AccessibilityInfo.isReduceMotionEnabled()`).
Default duration ≤ 200ms; cross-fade as fallback when motion is reduced.

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
  streaks, badges — always on ink text (`PointsChip`, profile hero, leaderboard).

## 11. Outstanding proposals

(See the latest design report under `qa-reports/design-YYYY-MM-DD.md`.)

- ✅ Done: dedicated category icon set — now `CategoryIcon` (SVG, not emoji).
- ✅ Done: dark-mode token layer — `src/theme/ThemeContext.tsx`.
- ✅ Done: `severityColor()` now sources from `theme.severity` (one ramp).
- Native map pin: render the white category glyph inside the marker (needs
  on-device verification of the `react-native-maps` custom-marker view).
- Refresh §1–§7 sample values if they drift from `src/theme.ts` (the tokens in
  code are the source of truth).
