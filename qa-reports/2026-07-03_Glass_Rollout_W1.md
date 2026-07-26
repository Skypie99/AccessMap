# Glass Rollout — Wave 1: six surfaces on "Deep Field"

**Date:** 2026-07-03 · **Branch:** `overhaul/glass-rollout-w1` (off `main` @ `f0c47fc`)
**Author:** Shamus (Feature Pusher), Opus 4.8 max-effort per Sky's standing directive
**Status:** COMPLETE on branch — **NOT merged, NOT pushed, NOT built.** Stops for Sky's eye + device pass.

Material application only. Each of the six surfaces keeps its composition and behaviour;
what changed is **what it is made of** — following GLASS.md (Status: LAW) + the Tasks worked
example, not re-inventing it.

---

## 1. Outcome at a glance

| Gate | Baseline (main) | Wave 1 (HEAD) | Verdict |
|---|---|---|---|
| `tsc --noEmit` | 0 | **0** | ✅ |
| `jest` | 1737 pass / 108 suites / 84 todo | **1737 pass / 108 suites / 84 todo** | ✅ unchanged |
| `eslint src` | 0 errors, 77 warnings | **0 errors, 77 warnings** | ✅ no new warnings |
| `expo export --platform web` | — | **exit 0** | ✅ compiles |
| Arbiter (`contrast-check.mjs`) | — | **exit 0 · 56/56 pairs PASS** | ✅ declared == shipped |
| Fence (`git diff main...HEAD`) | — | **exactly the 6 component files** | ✅ |

Guard tests that could have tripped all pass untouched: `qaMergeConsolidation` (Settings
push-Switch anchor), `sharedModalsContext` (Feedback backdrop pin), `GlassSurface`/`glassMode`
(untouched files → untouched tests).

**Six commits, one screen each (banked wins):**

```
49b3269 w1-6: Feedback on Deep Field
5c2b072 w1-5: Drawer on Deep Field (dark overlay, hardcode idiom)
839fd36 w1-4: Settings on Deep Field
e384ea4 w1-3: How to Help on Deep Field
95fcbbc w1-2: Resources on Deep Field
328c346 w1-1: About on Deep Field
```

---

## 2. Fence (Const. safety — reversible, local only)

`git diff --stat main...HEAD` = exactly:

```
 src/components/FeedbackModal.tsx    |  79 +++--
 src/components/HamburgerDrawer.tsx  |  53 ++--
 src/screens/AboutScreen.tsx         |  45 ++-
 src/screens/HowToHelpScreen.tsx     | 130 +++++--
 src/screens/ResourcesScreen.tsx     | 126 +++++--
 src/screens/SettingsScreen.tsx      | 167 +++++++---
 6 files changed, 440 insertions(+), 160 deletions(-)
```

Zero data/auth/engine/handler changes. `GlassSurface.tsx`, `ScreenStage.tsx`, `theme.ts`,
`ThemeContext.tsx`, `TasksScreen.tsx`, `MapScreen.tsx` — all untouched. `qa-reports/` is
untracked, so the report, family-strip captures, arbiter JSON, and capture harness never
enter the diff.

---

## 3. Per-screen conformance

Legend — **RT** = Reduce-Transparency designed opaque state · **RM** = reduced-motion (no new
motion added by this pass) · **C-lite** = the runtime engineered fold (`forceEngineered`).

### w1-1 · About — Glass/Overlay (bulk) sheet
- **Tiers:** the bottom-sheet card → `GlassSurface variant="bulk"` (i=24 floor + top edge/specular
  + designed RT state). No stage, no chrome — it stays a sheet (composition locked).
- **New pairings:** `bulkSheet` surface — title `textStrong`, subtitle/section-headers `inkGlassMuted`,
  tagline `color.text`, close-X `color.text` (1.4.11); hero badge on `brandSofter` pill.
- **Forks:** section-header + body `textMuted → inkGlassMuted` (light #666 = 4.06:1 FAIL on the
  bulk worst-case → 6.24/6.51:1); body gains `bodyMedium` (≥500 on glass); hero MapIcon
  `brand → brandOnSoft` (dark 1.4.11: brand #4E89EF = 2.67:1 FAIL → 5.75:1).
- **Sheet-shadow deviation (flagged):** shadow moved OFF the GlassSurface style onto an outer
  `cardShadow` wrapper — the one sanctioned departure from GLASS.md do/don't #2 (the card's
  `overflow:'hidden'`, needed to round the top, would clip the shadow). Mode-aware up-shadow:
  light `shadowTint@0.12` / dark `#000@0.35`, negative height.
- **Blur budget:** **1** (single bulk sheet, only while open).
- **Conformance:** RT ✅ (GlassSurface auto opaque-bulk) · RM ✅ (untouched) · C-lite ✅ never
  (overlay keeps blur).

### w1-2 · Resources — Stage + Chrome pane + 6 row cards
- **Tiers:** root bg `stage1` + `<ScreenStage/>`; header → absolute `variant="chrome"` pane
  (onLayout reserve, anti-flash gate, `scrollIndicatorInsets`); 6 cards → `variant="row"`,
  `forceEngineered={glassLite}`; Pressable stays interactive root (linked cards), GlassSurface material only.
- **New pairings:** close-X `inkGlassMuted` on chrome (1.4.11); intro + footnote `inkOnStage`;
  card title `textStrong`, blurb `textMuted@≥500` on row (+ rowLite C-lite twin).
- **Forks:** close-X `textSubtle → inkGlassMuted` (forbidden on chrome); intro/footnote
  `textMuted → inkOnStage`; blurb → `bodyMedium`.
- **Inset correction (deviation from plan, flagged):** the plan's chrome recipe used
  `insets.top + spacing.sm`. Resources roots on **RN's built-in `SafeAreaView`**, which already
  applies the top inset as padding — an absolute pane at `top:0` sits *below* it, so adding
  `insets.top` again would **double-count** (worst in the iOS pageSheet, where `useSafeAreaInsets`
  leaks the device inset ~47pt). The pane uses only its own padding; SafeAreaView owns the inset.
- **Blur budget:** **7** (1 chrome + 6 rows).
- **Conformance:** RT ✅ · RM ✅ · C-lite ✅ (rows engineered; chrome keeps blur).

### w1-3 · How to Help — Stage + Chrome + 4 rows + 1 banner
- **Tiers:** stage + chrome pane; 4 stepCards → `variant="row"`; callout → `variant="banner"`;
  `forceEngineered={glassLite}` on rows + banner (chrome keeps blur).
- **New pairings:** intro `inkOnStage`; stepBody `textMuted@≥500` on row; callout `brandOnSoft`
  on banner; close-X `inkGlassMuted` on chrome.
- **Forks:** intro `textMuted → inkOnStage` (+ `bodyMedium`); stepBody → `bodyMedium`; calloutText
  `brandText → brandOnSoft` (+ `bodyMedium`); same SafeAreaView inset correction as Resources.
- **Decorative-icon exemption (flagged):** the 4 step-icon tints + the callout Heart are already
  `accessibilityElementsHidden` and every step's meaning is carried by the adjacent title text →
  under WCAG **1.4.11 they are decorative-exempt** and NOT arbiter-declared. Declaring them would
  force the light `success`/`accentOrange` tints (2.61 / 1.88:1 on row) to fail 3.0 and demand a
  palette-semantics swap. Exemption preserves the semantic palette; documented inline.
- **Blur budget:** **6** (1 chrome + 4 rows + 1 banner).
- **Conformance:** RT ✅ · RM ✅ · C-lite ✅ (rows + banner engineered).

### w1-4 · Settings — Stage + 11 row surfaces (shared nav header untouched)
- **Tiers:** ScrollView wrapped in a `stageRoot` View (bg `stage1`) with `<ScreenStage/>` behind
  (ScrollView → transparent); the shared **dark nav header is untouched — NO chrome pane**. 10
  `SettingsRow` + inline pushRow → `variant="row"` true blur, `forceEngineered={glassLite}` on all
  11; AppearanceControl track → engineered chip tint; 7 section labels → `inkOnStage`.
- **New pairings:** `chipOnStage` (unselected segment `glassChipInk`), `selectedSegment`
  (`brandText` on opaque pill), row title/subtitle/chevron/deco-icon, section labels `inkOnStage`.
- **Forks:** section labels `textMuted → inkOnStage`; row subtitles → `bodyMedium`; **Sign-out
  destructive title dark `color.error` (#C0392B = 2.86:1 on dark row glass, FAIL) → `errorFg`
  (8.18:1); light keeps `color.error` (4.93:1)** — mode-branched fork; `rowPressed` bg-swap →
  opacity-only (bg is invisible/illegal on glass).
- **Native Switch 1.4.11 (stated, not restyled):** the iOS/OS-default Switch keeps its native
  styling; its ≥3:1 track/thumb is an OS guarantee, asserted not measured — **NEEDS-DEVICE** confirm.
- **Blur budget:** **12** = 11 rows + the shared tab-bar pane = **exactly AT the ceiling** (law
  warns only when VISIBLE panes *exceed* 12, so steady-state does not warn). Honesty nuance:
  Settings is a plain ScrollView (not virtualized) → all 11 panes mount concurrently (constant, not
  a peak estimate). Two disclosed over-counts: (a) if `PUSH_NOTIF_TYPES_ENABLED` flips on → 12 rows +
  tab bar = 13 mounted → dev warn (telemetry only, never throws); (b) a glass sheet opened over
  Settings → +1 mounted (same known Tasks+sheet nuance). In C-lite all 11 rows drop their BlurViews →
  live-blur count = 1 (tab bar).
- **Conformance:** RT ✅ · RM ✅ · C-lite ✅ (rows engineered; the chip-tint track is already a
  static engineered tint, so the segmented control looks identical full vs lite — intended, not a bug).

### w1-5 · Drawer — dark OVERLAY via the hardcode idiom (NO GlassSurface)
- **Tiers:** the always-dark panel keeps its documented hardcode idiom — **no GlassSurface, no
  BlurView, no ScreenStage, no re-tokenized inks, footer stays in-flow** (`marginTop:'auto'`, M22).
  Material = the deep-field dark overlay analog, all dark literals: panel fill flat
  `rgba(8,10,20,0.96)` → near-opaque dark bulk-Lite tone `rgba(13,18,32,0.94)` (non-RT) / opaque
  `#0D1220` (RT — a **new** reduce-transparency branch for this surface); right edge white-alpha →
  cool `rgba(168,192,224,0.18)` + a 1px inner lip `rgba(168,192,224,0.14)`; web `backdropFilter`
  `blur(30px)`→`blur(20px) saturate(160%)` (~i=24), dropped under RT.
- **New pairings:** `drawerPanel` surface (declared under BOTH modes — always-dark): brand/labels
  `#f5f5f5`, muted `rgba(255,255,255,0.7)`, `labelMuted`, `footerText`, active nav icon `#4E89EF`.
- **Arbiter-forced alpha forks (still hardcoded dark literals, not tokens):** `footerText`
  `0.30 → 0.55` (0.30 = 2.67:1 FAIL → 6.05:1); `labelMuted` `0.45 → 0.48` (0.45 = 4.51:1
  knife-edge → 4.91:1 margin).
- **shadow.e3 KEPT (flagged):** deep-field dark normally retires drop shadows, but this slide-in
  overlay keeps `shadow.e3` for separation from the dimmed backdrop — an intentional exception, not
  a regression to "fix."
- **Deliberate deviation from the plan's LinearGradient child (flagged):** the plan asked for the
  bulk-Lite vertical gradient. A gradient reads as the fill only over a *transparent* panel bg, and
  a transparent bg **suppresses the iOS drop shadow** (the `shadow.e3` invariant). I used the
  spec-blessed solid fallback — `rgba(13,18,32,0.94)`, "~3% alpha apart on identical RGB" = visually
  equivalent — which keeps the shadow. NEEDS-DEVICE: confirm the near-opaque panel + web
  backdropFilter read as intended.
- **Blur budget:** **0** (no BlurView; a near-opaque gradient/solid + web-only backdropFilter).
- **Conformance:** RT ✅ (opaque `#0D1220`) · RM ✅ (snap effect untouched) · C-lite ✅ never
  (overlay is RT-driven only, never glass-mode).

### w1-6 · Feedback — Glass/Overlay (bulk) sheet + engineered chips
- **Tiers:** sheet body → `GlassSurface variant="bulk"`; category chips → engineered chip tint
  (fill/edge computed INLINE, RT-aware); inputs stay opaque `surfaceSoft`. All G9 Tier-2 structure
  preserved (maxHeight 90% on the card, body ScrollView `flexShrink:1`, header/actions pinned
  outside the scroll, KAV inside the backdrop, chips `minHeight:44`).
- **New pairings:** `chipOnBulkSheet` (label/glyph `glassChipInk`); selected chip = `ctaFill` +
  `textOnBrand`; sheet inks share `bulkSheet` with About.
- **Forks:** subtitle+labels `textMuted → inkGlassMuted`; inline error `color.error → errorFg`
  (3.84 light / 2.23 dark = FAIL both → ~6.4:1); Send button `brand → ctaFill` (dark brand+white =
  3.4:1 FAIL); selected chip = `ctaFill`/`textOnBrand`; body-on-glass → `bodyMedium`.
- **Sibling-consistency call (flagged):** the two sheet analysts proposed different shadows (About:
  mode-aware up-shadow; Feedback spec: `shadow.e3` light-only). I matched **About's recipe exactly**
  so the two sibling sheets are consistent (About is the designated pattern-setter).
- **Pinned backdrop untouched:** `testID="feedbackModal-backdrop"` + `accessibilityViewIsModal`
  stay on the backdrop `<View>` (`sharedModalsContext` green).
- **Blur budget:** **1** (single bulk sheet, only while open).
- **Conformance:** RT ✅ (auto opaque-bulk + chip fork via `useReduceTransparency`) · RM ✅ · C-lite
  ✅ never (bulk keeps blur; chips are already a static tint).

---

## 4. Arbiter — `qa-reports/assets/2026-07-03_glass_w1/`

`node <lab>/shared/contrast-check.mjs wave1-stacks.json` → **exit 0 · 0 FAILs · 56/56 pairs PASS**
(28 light + 28 dark). Self-contained wave declaration: reuses the Tasks shipped surfaces
(`row/chrome/stage/banner/rowLite/bannerLite/ctaFill`) and adds `bulkSheet`, `chipOnBulkSheet`,
`chipOnStage`, `selectedSegment`, `drawerPanel`. Result table: `wave1-contrast-result.txt`.

Tightest passing pairs (do not deepen the stage): dark chevron `textSubtle` on row **4.50:1**
(1.4.11 floor 3.0); drawer `labelMuted` 0.48 **4.91:1** (floor 4.5). Both above floor with margin.

---

## 5. Family strip (visual proof)

`qa-reports/assets/2026-07-03_glass_w1/family/family-strip.html` — Tasks reference + all six wave
screens, **light + dark @375** (expo web · Chromium 375×812@2x · guest path, no credentials), plus
the **C-lite spot-check** (Settings + Resources, both themes, engineered rows). 18 PNGs total.
Capture harness: `.../tools/capture-wave.mjs` (untracked, one screen per fresh session).

Confirmed by eye in every shot: the stage reads (light gradient + brand pool, dark deep field);
rows/cards float as glass panes with light-mode lift and dark cool `#A8C0E0`-family edge hairlines
(no dark shadows — luminosity-led); chrome panes frost the header; the About/Feedback sheets frost
over the dimmed backdrop; the drawer's dark overlay + cool right edge render; the Feedback selected
chip is the mode-independent `ctaFill`; the shared Settings nav header is untouched. C-lite rows are
the more-opaque engineered gradient (visually near-identical, blur cost dropped).

---

## 6. Blur-budget hand-count vs the law (`maxLivePanes = 12`)

| Screen | Panes | Note |
|---|---|---|
| About | 1 | single bulk sheet, only while open |
| Resources | 7 | chrome + 6 rows |
| How to Help | 6 | chrome + 4 rows + banner |
| Settings | **12** | 11 rows + tab bar = AT the ceiling (stated); +1 mounted if flag-row on / sheet over it |
| Drawer | 0 | no BlurView (gradient/solid + web backdropFilter) |
| Feedback | 1 | single bulk sheet, only while open |

All within the visible-pane law. Settings is the one at-ceiling case — disclosed in §3.

---

## 7. NEEDS-SKY-DEVICE (before merge/build)

Real-device iOS is the hard gate the web proxies cannot cover (GLASS.md §10: true blur FEEL +
scroll smoothness are device-only). Please check on device:

1. **Scroll feel per screen**, especially Settings' 11 blur rows (non-virtualized) — this is where
   C-lite would earn its keep. The **C-lite toggle lives on the Tasks header title (600ms
   long-press)** and is a **global** switch — flipping it there also lightens all six wave screens.
2. **Drawer material over live content** — the near-opaque panel + cool edge/lip + kept shadow +
   web backdropFilter, and the RT opaque `#0D1220` state.
3. **Settings scroll** + the native Switch's ≥3:1 (OS-drawn, asserted not measured).
4. **Feedback keyboard on iOS** — the KAV-inside-backdrop + pinned header/actions (G9) with the sheet
   now bulk-glass.
5. **Reduce Transparency on device** — the designed opaque states (bulk sheets, rows, chrome, drawer
   `#0D1220`). Verified here via the arbiter + `GlassSurface` RT-state tests + code; a *visual* RT
   capture was not run (the CI-mode metro won't hot-reload a forced-RT edit, and a tracked-file hack
   would risk the fence). Folded into this device pass.
6. **pageSheet top inset** on Resources/How-to-Help (the SafeAreaView inset correction) — confirm the
   header isn't jammed to the sheet top, and the `CHROME_FALLBACK` (~72) shows no cold-open jump.

---

## 8. Stop

Everything is on `overhaul/glass-rollout-w1`, six banked commits, gates green, arbiter green, family
strip + C-lite captures in place, fence clean. **DO NOT merge / push / build** — Sky merges, Sky
builds (GLASS.md §9). Wave 2 (Map, Home, Profile, tab bar) is a later pass per GLASS.md §8.
