# AccessMap — App-Wide Visual Bug Sweep (overlap · clipping · collision · wrap · overflow)

**Date:** 2026-07-01 · **Mode:** READ-ONLY audit (no fixes, no builds, no app-code changes)
**Why:** Two build credits were burned and the live app still showed clipped/overlapping UI in components no pass had touched. This sweep finds EVERY findable visual bug across the whole app — statically root-caused + verified in the Chromium web render — so the next pass fixes them ALL in one branch and ONE build ships the lot.
**Method:** 7 parallel deep-read agents (every screen, modal, overlay, and shared primitive) + live web render (Expo web export exits 0; dev server + guest mode) with DOM-level measurements + token-faithful reconstructions for native-only/large-type states. Fonts verified against the actual bundled TTF metrics (Public Sans line box = ×1.175 of fontSize, Plus Jakarta ×1.26, JetBrains Mono ×1.32).
**Confidence tags:** `WEB-CONFIRMED` = reproduced & measured in Chromium · `code-CONFIRMED (native-only)` = conclusive pixel math, invisible on web by mechanism · `NATIVE-SUSPECTED` = code-inferred, needs device to be certain.
**Assets:** `qa-reports/assets/2026-07-01_visual_sweep/` —
live captures: `onboarding-s1…s5-375` (all slides) · `tasks-375-light/dark`, `tasks-320-light` (chip crush + clipped tab labels + truncated title, all visible) · `home-375-light/dark`, `home-320-light` · `map-375-light`, `map-filters-guest-375-light` · `flagdetail-375-light` · `profile-signedout-375-light` · `drawer-375-light` · `settings-375-light/dark` ·
**`reconstructions-native-largetype.png`** — token-faithful side-by-sides (app's actual TTFs) for the native-only/×1.6 cases: R1 CTA collapse ("Open the Map" clipped at 44pt vs whole on web) · R2 tab-bar 7px label squeeze vs fix · R3 pattern-B chip crush vs flexShrink:0 · R4 bulk bar behind the 96pt glass bar · R5 sevDot 24 at cap + 4-digit cluster clip · R6 hero 1,240 digit shave at lineHeight 60 vs 74 · R7 FlagCard 375pt guard gap · R8 "Resolve"/"Severity" overflow at 320+×1.6.

---

## THE TWO BUGS SKY SAW LIVE — root-caused

### BUG 1 — Onboarding CTA buttons clip their text ("Qpen the Map") — `code-CONFIRMED (native-only)` — GLARING
- **WHERE:** Onboarding carousel, all three primary CTAs — [OnboardingCards.tsx:683](src/components/OnboardingCards.tsx) `styles.primaryBtn` (used by "Open the Map" :395–410, "Allow Location"/"Turn on Notifications" :414–442, "Next"/"Continue" :446–463).
- **WHAT:** Bottom ~3.4pt of every glyph row cut — "Open" reads "Qpen", descenders amputated.
- **WHEN:** Every render on native iOS/Android, default font. Worse at large type (deficit grows to 18pt at ×1.6).
- **ROOT CAUSE:** **`flex: 1` on the LinearGradient inside an auto-height Pressable.** The Pressable has no size style, so Yoga resolves the grow-child to flexBasis 0, clamped up only by `minHeight: 44`. The button is exactly 44pt forever. Padding 16+16 leaves a **12pt content box** for an 18.8pt line box (Public Sans SemiBold @16pt × 1.175 hhea metrics). 44 − 32 = 12 < 18.8 → glyphs clipped top+bottom.
- **WHY THE WEB RENDER HIDES IT (measured):** CSS gives flex items an automatic min-content floor (`min-height: auto`); Yoga has none. Live web measurement: gradient computes `flex: 1 1 0%`, `min-height: 44px` — but renders **50.5px** tall (the label's 18.5px line + 32px padding). Native pins it at 44. The 6.5pt difference is exactly the clip.
- **PROOF-BY-CONTRAST (in-repo):** SignInScreen.tsx:349–362 — identical gradient-in-Pressable, no `flex:1`, `minHeight:56` → safe. OnboardingModal.tsx:351 puts `flex:1` on the *Pressable* (row axis) → safe, and shows the stretch the author probably intended.
- **FIX DIRECTION:** Delete `flex: 1` from `primaryBtn` (or move it to the Pressable's style array if row-stretch was intended, mirroring OnboardingModal's `primaryBtnFlex`). Keep `minHeight: 44`. Same-file hygiene: drop redundant `fontWeight:'700'` (family is already SemiBold; RN font resolution on expo-font faces is unreliable); delete dead styles `card`, `emoji`, `position`, `dotActive`, `btnPressed`.
- **WHY THE GUARD MISSED IT:** `dynamicTypeGuard` Cluster B only flags a literal `height:` on styles named `*Row|Label|Text|Title|Name`. This height is *emergent* (flex collapse), and the style is `primaryBtn`.

### BUG 2 — Tasks filter header cramped/colliding — `WEB-CONFIRMED` — GLARING
- **WHERE:** TasksScreen filter chrome — chip strip [TasksScreen.tsx:931](src/screens/TasksScreen.tsx) + `categoryScroll` :1908; colliding with the rows above/below.
- **WHAT (measured live in Chromium, 375×812, 4 flags):** intended strip height 62pt (44 chip + 2 + 8 + 8 padding) renders at **38.8px**; each 44px chip overflows the strip's clipped bottom edge by **13.2px**; the Sort row below sits directly on the chopped pills. `flexGrow:1, flexShrink:1` measured live on the strip. At 320pt the crush is worse — see `tasks-320-light.png` (chips lose ~40% of their height; `tasks-375-light/dark.png` show both themes).
- **WHEN:** Default settings, both themes, web AND native. Severity drifts with list content: more/taller cards ⇒ more crush (with 1–2 flags the math flips and the strip *balloons*). This intermittency is why it read as "sometimes overlapping".
- **ROOT CAUSE:** A `horizontal` ScrollView's base style in RN is `{flexGrow: 1, flexShrink: 1}` (react-native ScrollView.js `baseHorizontal`). `categoryScroll` only adds padding — so inside `screen:{flex:1}` the 62pt strip and the SectionList (flex-default, basis = full content height, ~1900pt at 10 cards) are the only two flexible children. Yoga shrinks proportionally to `flexShrink × basis` → strip loses ~44pt. Every other row is a plain View (`flexShrink: 0`) and keeps its height — which is why *only* the chip strip collapses.
- **HISTORY:** `22672d6` band-aided the symptom ("add paddingTop to filter rows to fix pill overlap") without touching flex; `355e993` (WCAG 36→44pt chips) made the crush visible.
- **FIX DIRECTION:** `flexGrow: 0, flexShrink: 0` on the ScrollView's `style`; move vertical padding into `contentContainerStyle`. Do NOT use a fixed height (chips legitimately grow at large type). Structural alternative: move the filter rows into the SectionList's `ListHeaderComponent` (no shrink pressure inside scroll content; ~370pt of fixed chrome also scrolls away — big win on small phones at large type).
- **RECURRENCES OF THE SAME PATTERN (fix in the same batch):**
  - [NearbyFlagsModal.tsx:223](src/screens/NearbyFlagsModal.tsx) — chip bar ScrollView with **no style prop at all**, direct sibling of a FlatList → identical latent crush. (Also: its surface color + bottom hairline are painted on `contentContainerStyle`, so the "bar" visually stops mid-screen when categories are few — move surface styling to the `style` prop in the same touch.)
  - [MyWatchedModal.tsx:464,468](src/components/MyWatchedModal.tsx) — BOTH chip rows (`statusScroll`, `sortScroll`) set `flexGrow: 0` but leave `flexShrink: 1`, inside a `maxHeight:'85%'` sheet beside a FlatList → crushed whenever the sheet clamps (long watch list, or short list + large type). Glaring when triggered — and the trigger is the feature's core use.
  - [MyFeedbackModal.tsx:153](src/components/MyFeedbackModal.tsx) — chip bar ScrollView with no style prop inside `maxHeight:'90%'` card beside a FlatList → same crush at ~7+ feedback rows (fewer at large type).
  - Fragile-but-currently-safe (harden in the same batch): PhotoGallery.tsx:142 FlatList (no style), RecentlyViewedRow.tsx:110, FlagDetailModal.tsx:1024 (`flexGrow:0` only), MapScreen.tsx:1481+1545 (inside auto-height panel today; the fix for M1 below will bound that panel and would crush these next).
- **PROJECT RULE for the fix pass:** any `horizontal` ScrollView/FlatList that is (or may become) a child of a bounded flex column MUST set `flexGrow: 0, flexShrink: 0` on its `style` prop, with vertical padding in `contentContainerStyle`.

---

## NEW GLARING FINDINGS (wrong at default settings)

### G3 — Tab bar labels are clipped in half — `WEB-CONFIRMED` at default; native on a knife edge
- **WHERE:** [RootNavigator.tsx:290](src/navigation/RootNavigator.tsx) `tabBarStyle: { height: 62 + insets.bottom, paddingBottom: 8 + insets.bottom, paddingTop: 6 }` + `tabBarLabelStyle { fontSize: 12 }` :307–312.
- **WHAT (measured):** inner content box = 48px on every platform (62−6−8, and on notch devices 96−6−42 — same 48). Icon block measures 28px; React Navigation's label wrapper is *shrinkable with `overflow: hidden`* and gets squeezed to **7.0px for a ~14.1px line** → the bottom half of "Home / Tasks / Profile" is cut. Visible in the live web render at default scale.
- **WHEN:** Web: always (default) — visible in `tasks-375-light.png` / `tasks-320-light.png` (bottom edge). Native: same 48px equation with marginally different icon metrics — knife-edge; any font scale ≥1.0–1.1 clips. **No `tabBarAllowFontScaling` cap exists anywhere**, so at OS accessibility sizes (2–3×) the 12pt label scales unbounded into a fixed bar → guaranteed native clip/collision with the icon. (Reconstruction: `reconstructions-native-largetype.png` §R2.)
- **ROOT CAUSE:** fixed bar height leaves zero headroom for the label's real line box; label wrapper is shrinkable + overflow hidden.
- **FIX DIRECTION:** raise height to ≥68 + insets (or drop the fixed height and let paddings define it), add explicit `tabBarLabelStyle.lineHeight`, and cap scaling (`tabBarAllowFontScaling: false` or a sized label component).
- **SEVERITY:** glaring (default, web-proven; high-confidence native).

### G4 — Tasks bulk-select bar renders under the frosted tab bar — `NATIVE-SUSPECTED` (geometry is conclusive)
- **WHERE:** [TasksScreen.tsx:2015–2033](src/screens/TasksScreen.tsx) `bulkBar: { position:'absolute', bottom: 0, paddingBottom: 24 }`.
- **WHAT:** The navigator's tab bar is absolute, frosted glass, `height: 62 + insets.bottom` ≈ 96pt on Face-ID phones and drawn ABOVE screen content. The bulk bar's button row occupies ≈24–68pt from the screen bottom — entirely inside the tab-bar zone: buttons render behind blur; taps land on the tabs.
- **PLUS:** `BULK_BAR_HEIGHT = 88` (:95) underestimates the real bar (~104pt default, ~120+ at ×1.6) so the list's reserved paddingBottom comes up short → last card partially hidden in selection mode. And the comment at :2010–2014 claiming "no safe-area lib in this project" is stale — the file already imports `useSafeAreaInsets` and has `tabBarHeight`.
- **FIX DIRECTION:** `bottom: tabBarHeight` on `bulkBar`; compute the reserved padding from measured bar height (or a generous inset-aware constant).
- **SEVERITY:** glaring on native (selection mode is a core flow).

### G5 — Map filter panel overflows the screen; Report/List FABs pushed off-screen — `WEB-VERIFIABLE`
- **WHERE:** [MapScreen.tsx:1425–1788](src/screens/MapScreen.tsx) panel JSX; `overlay` :2245–2250 (`absoluteFill`, `justifyContent:'space-between'`); `filterPanel` :2339–2350 (no maxHeight, no ScrollView).
- **WHAT:** Signed in with filters open, the panel stacks 8 sections of ≥44pt rows (+3-line wrapping "Who does this affect?" chips) ≈ 850–900pt at DEFAULT font vs ~550–650pt available → the bottom bar (List + Report FABs) is pushed below the screen / under the tab bar, and the lower sections (Status/Who/Distance/Presets) are clipped with **no way to scroll to them**.
- **FIX DIRECTION:** bound the panel (`maxHeight` from window height minus chrome) + wrap sections in a vertical ScrollView — and in the same touch give the two inner horizontal chip ScrollViews (:1481, :1545) `flexGrow:0, flexShrink:0` (bounding the panel would otherwise crush them — pattern B).
- **SEVERITY:** glaring (default font, signed-in filters open — a primary flow).

### G6 — Heatmap legend collides with / displaces the FABs — `WEB-VERIFIABLE`
- **WHERE:** [MapScreen.tsx:2530–2534](src/screens/MapScreen.tsx) `bottomBar` (row, `space-between`, no gap/shrink) holding `<HeatmapLegend />` (natural width ≈355–375pt) + FAB column (~115pt); [HeatmapLegend.tsx:76](src/components/HeatmapLegend.tsx) wrap is an accomplice — Yoga measures it against FULL row width, ignoring the FAB sibling.
- **WHAT:** Heatmap on → legend + FABs total ≈475pt in a ≤398pt row; both are `flexShrink: 0` → FABs overflow the right screen edge or draw on top of the swatches.
- **FIX DIRECTION:** give the legend slot `flex: 1` (+ margin) so its internal flexWrap wraps against the true remaining width, or stack legend above the FAB column.
- **SEVERITY:** glaring (heatmap-on state, default font).

### G7 — Flag-detail comment bubbles clipped 8pt on their aligned side — `WEB-VERIFIABLE`
- **WHERE:** [FlagDetailModal.tsx:1840–1843](src/components/FlagDetailModal.tsx) `commentsList: { marginHorizontal: -20 }` interacting with [CommentBubble.tsx:113–130](src/components/CommentBubble.tsx) `row: { paddingHorizontal: 12 }`.
- **WHAT:** The −20 bleed cancels the card's 20pt padding but the bubble row only re-insets 12 → own bubbles end 8pt PAST the body ScrollView's right clip edge (other-user bubbles 8pt past the left). The ScrollView clips → every bubble's 16pt rounded corner + 4pt accent corner is chopped to a flat edge (screaming on brand-blue own-bubbles). Text survives by 4pt.
- **WHEN:** default, any flag with ≥1 comment, both themes.
- **FIX DIRECTION:** hold the invariant `|negative margin| ≤ row padding` — either bleed −8, or drop the bleed and manage insets inside CommentBubble.
- **SEVERITY:** glaring.

### G8 — Saved Places beyond the sheet fold are unreachable — `WEB-VERIFIABLE` (state ≥ ~7 places)
- **WHERE:** [SavedPlacesModal.tsx:344–391](src/components/SavedPlacesModal.tsx) `listWrap` is a plain View (no ScrollView/FlatList) inside `card { maxHeight: '85%' }`; MAX_PLACES = 50.
- **WHAT:** ~7–8 rows fill the cap (5 at ×1.6); every additional place renders clipped below the card bound — cannot be jumped to or deleted from this UI.
- **FIX DIRECTION:** replace `listWrap` with a FlatList (exact pattern already in FilterPresetsModal).
- **SEVERITY:** glaring when hit; silent otherwise.

### G9 — FeedbackModal has no maxHeight and no scroll — title + ✕ leave the screen — `NATIVE-SUSPECTED` (×1.6), partially web-verifiable
- **WHERE:** [FeedbackModal.tsx:313–322](src/components/FeedbackModal.tsx) `card` — the only sheet in its family without `maxHeight:'90%'`/ScrollView/KeyboardAvoidingView.
- **WHAT:** At ×1.6 on ≤667pt screens content ≈700pt+; bottom-anchored sheet overflows out the TOP — the header and the labelled close button are the first to go. At default, opening the keyboard on short devices does the same.
- **FIX DIRECTION:** `maxHeight: '90%'` + scrollable body below the headerRow (+ KAV). Note in passing: its category chips are `minHeight: 36` — below the app's 44pt floor.
- **SEVERITY:** glaring at ×1.6 / moderate default.

### G10 — Onboarding slides clip their copy at large type (no vertical scroll) — `NATIVE-SUSPECTED`
- **WHERE:** [OnboardingCards.tsx:527–535](src/components/OnboardingCards.tsx) `cardOuter` (fixed page, centered column) + uncapped `body` :609; same class in [OnboardingModal.tsx:287–295](src/screens/OnboardingModal.tsx).
- **WHAT:** At ×1.6/320pt a slide needs ~640pt in a ~380–420pt page; `justifyContent:'center'` clips BOTH the icon top and the body bottom, unreachable.
- **FIX DIRECTION:** wrap each slide's content in a vertical ScrollView (`contentContainerStyle={{flexGrow:1, justifyContent:'center'}}`). Do NOT cap the body variant.
- **SEVERITY:** glaring at ×1.6, moderate from ~×1.3.

---

## MODERATE FINDINGS (narrow width / large type / specific state)

| # | Where | What / trigger | Root cause → fix direction | Confidence |
|---|---|---|---|---|
| M1 | [PlatformMap.tsx:139–143,318–325](src/components/PlatformMap.tsx) | Map cluster count clips in its circle at AX sizes; ≥4-digit counts clip at ANY scale (no "1k" abbrev on native, unlike the web twin) | raw `<Text>` (uncapped) in fixed 44×44 → cap ~1.2 + `minWidth/minHeight` + port web's `Nk` formatting | NATIVE-SUSPECTED |
| M2 | [ProfileScreen.tsx:1074](src/screens/ProfileScreen.tsx) | Point-history labels truncate AT DEFAULT on every phone width ("Your comment got a…") — worst meaning-loss truncation in the app | `numberOfLines={1}` + narrow flex slot → allow 2 lines (row already `minHeight:44`) | WEB-VERIFIABLE |
| M3 | [ProfileScreen.tsx:2298–2310](src/screens/ProfileScreen.tsx) | "REPORTED/VERIFIED/RESOLVED" stat labels overflow their cards at default ≤360pt; collide at ×1.6 | 11pt uppercase + letterSpacing 0.8 in `flex:1` thirds → `adjustsFontSizeToFit`/drop tracking at narrow | WEB-VERIFIABLE |
| M4 | [ProfileScreen.tsx:929–936,1947–1991](src/screens/ProfileScreen.tsx) | Avatar pencil badge permanently half-amputated (crescent) — always-on | redundant `overflow:'hidden'` on the 72×72 Pressable clips the corner badge → drop it (radius already on the image) | WEB-VERIFIABLE |
| M5 | [ProfileScreen.tsx:2006–2013](src/screens/ProfileScreen.tsx) | Hero points figure: lineHeight 60 vs JetBrains Mono's needed 73.9 (56×1.32) — ascender shave risk, Android worst; ratio persists at every scale | hand-tuned lineHeight below the font's box → `lineHeight: 74` or remove | NATIVE-SUSPECTED |
| M6 | [ProfileScreen.tsx:942–967](src/screens/ProfileScreen.tsx) | Hero row: 56pt number + tier pill can't shrink/wrap → pill spills past card edge (5-digit points @320 default; 4-digit at large type) | no flexShrink/wrap on either child → allow wrap or shrink+size fallback | WEB-VERIFIABLE |
| M7 | [ProfileScreen.tsx:1789–1859](src/screens/ProfileScreen.tsx) | Tier-explainer modal: no maxHeight/scroll → clips both ends at ×1.6 on ≤667pt (close button can leave screen). Same class (milder): delete-account modal :1653 — the *destructive action pair* is what slides off | centered auto-height sheet → `maxHeight:'85%'` + ScrollView | WEB-VERIFIABLE |
| M8 | [NotificationPrefsModal.tsx:141–232](src/components/NotificationPrefsModal.tsx) | No ScrollView inside `maxHeight:'85%'` card → at ≥~1.4× the "Rejected" toggle + footer are unreachable (functional Switches lost) | plain Views can't shrink/scroll → wrap list in ScrollView | WEB-VERIFIABLE (small viewport) |
| M9 | [MyReportsModal.tsx:572–576](src/components/MyReportsModal.tsx) | Sort chips row has no flexWrap (unlike its sibling) → "Severity" chip clipped at ≤360 + fontScale ≥~1.1 | add `flexWrap:'wrap'` (one line) | WEB-VERIFIABLE |
| M10 | [MapScreen.tsx:2245–2259](src/screens/MapScreen.tsx) | `justifyContent:'space-between'` on the overlay floats the Saved-Places chips / offline banner to MID-MAP instead of hugging the action bar | conditional children in a space-between column → group top cluster in one View | WEB-VERIFIABLE |
| M11 | [MapScreen.tsx:2314–2332](src/screens/MapScreen.tsx) | 7-button action tray is a fixed ≥322pt row → bleeds off-screen at 320pt (288 available), 6pt slack at 360 | seven fixed 44pt targets, no shrink/scroll → collapse low-priority buttons or allow horizontal scroll <350pt | WEB-VERIFIABLE |
| M12 | [FilterPresetsModal.tsx:281–336,678–714](src/components/FilterPresetsModal.tsx) | Preset rows: 3 fixed action buttons (~210–230pt) crush the name to a ~50pt sliver at 360pt; at ×1.6 the buttons alone exceed any phone width | fixed actions + no wrap → wrap actions to 2nd line or overflow menu | WEB-VERIFIABLE |
| M13 | [AddressSearchModal.tsx:232–274](src/components/AddressSearchModal.tsx) | Recents live OUTSIDE the FlatList in a `maxHeight:'85%'` card → clip with no scroll at ×1.6 on ≤667pt | move recents into the scrollable region | WEB-VERIFIABLE |
| M14 | Keyboard overlaps (3 sites) | [AddressSearchModal.tsx:194–230](src/components/AddressSearchModal.tsx) autoFocus input fully covered on open; [ReportFlagModal.tsx:643–666](src/screens/ReportFlagModal.tsx) description input + footer behind keyboard; [MapScreen.tsx:2077–2216](src/screens/MapScreen.tsx) name-prompt Save/Cancel behind keyboard on short phones | no KeyboardAvoidingView / `automaticallyAdjustKeyboardInsets` → one shared KAV recipe | NATIVE-SUSPECTED |
| M15 | [FlagDetailModal.tsx:1387–1456,1476–1485](src/components/FlagDetailModal.tsx) | Bottom action row sits inside the iOS home-indicator band (card `paddingBottom: 20` < 34pt inset; Delete is the bottom row) — the sheet is the app's safe-area outlier. Same class: StatusHistoryModal :217 (24pt, minor) | transparent Modal bypasses navigator insets → `paddingBottom: max(20, insets.bottom)` | NATIVE-SUSPECTED |
| M16 | [TasksScreen.tsx:112,1819–1838](src/screens/TasksScreen.tsx) | FlagCard tiered action row: guard is `width < 375` so an exactly-375pt device at fontScale 1.1–1.29 (below the 1.3 stack threshold) clips "Resolved" against the pill's 22pt corner curvature | boundary bug → `<= 375` + lower type threshold ~1.15, or small `paddingHorizontal` + `numberOfLines={1}` | WEB-VERIFIABLE @375 |
| M17 | [TasksScreen.tsx:2042–2051,1946–1955](src/screens/TasksScreen.tsx) | `bulkBtn` ×4 and `sortChip`: zero-padding equal-share pills → single words ("Resolve", "Severity") overflow pill bounds at 320pt + ≥1.4× | unbreakable word > share → min padding + `adjustsFontSizeToFit` or wrap allowance | WEB-VERIFIABLE |
| M18 | [ScreenHeader.tsx:55](src/components/ui/ScreenHeader.tsx) (3 screens) | 40pt display title `numberOfLines={1}` truncates at 320–360 default — **captured live**: Tasks renders "Review bar…" at 320 (`tasks-320-light.png`); always truncates at ≥1.3× (display cap) | fixed 40pt + 1 line + 2 fixed action buttons → `adjustsFontSizeToFit` + `minimumFontScale` or width-derived size | **WEB-CONFIRMED** |
| M19 | [ReportsBreakdownCard.tsx:87,339–344](src/components/ReportsBreakdownCard.tsx) | Bar labels fit at default (prior lead overstated) but truncate from ~1.25×; fixed `flexBasis:130, flexShrink:0` leaves the bar track 58pt at 320 | drop `numberOfLines`, allow label shrink; `barCount width:36` → `minWidth` (4-digit safety) | WEB-VERIFIABLE |
| M20 | [OnboardingCards.tsx:496](src/components/OnboardingCards.tsx) | `paddingTop: 48` hardcoded → Skip's top edge under the Dynamic Island on insets.top=59 devices (14 Pro+) | hardcoded inset → `Math.max(insets.top, 48)` (recipe already in OnboardingModal:119) | NATIVE-SUSPECTED |
| M21 | [PhotoGallery.tsx:136,306–320](src/components/PhotoGallery.tsx) | "No photos" placeholder: uncapped bodyMedium inside fixed 96×96 → squeeze/clip at AX sizes (~2×+) | fixed box + uncapped text → cap 1.4 or `minWidth/minHeight` | NATIVE-SUSPECTED |
| M22 | [HamburgerDrawer.tsx:350–359](src/components/HamburgerDrawer.tsx) | Absolute footer over a NON-scrolling menu → overlaps Sign-out row on 568pt-class devices at ×1.6, nothing can scroll past it | no ScrollView + absolute footer → scroll the menu (paddingBottom ~90) or footer in flow with `marginTop:'auto'` | NATIVE-SUSPECTED |

## MINOR FINDINGS (cramped / cosmetic / tight-margin)

- [TasksScreen.tsx:1987–1992](src/screens/TasksScreen.tsx) — `cardSelected` padding/border delta (16+1 vs 12+2) → content jumps ~3pt on every select toggle.
- [RecentlyViewedRow.tsx:179–190](src/components/RecentlyViewedRow.tsx) — sevDot 24×24 with 12pt bold label: **0.7pt total slack** at the 1.6 cap; goes negative on the pre-font-load system-font fallback (Roboto ≈23.4pt box) → intermittent top-shave. Fix: `min` dimensions or cap 1.3. (Family audit: ActivityFeedModal 28 OK-ish; NearbyFlags 32, Legend 32, MapScreen sevPill 44 = comfortable; ReportFlagModal :1036 and FlagDetailModal :1773 are the known-good reference implementations.)
- [LeaderboardScreen.tsx:525–542](src/screens/LeaderboardScreen.tsx) — text-as-pill "you"/"N verified" badges: corner radius (≈12pt) exceeds the 6pt horizontal padding → end-glyph shave inside the curvature (verifiedBadge currently dead — count hardcoded 0). :435 "Leaderboard" h1 can mid-word break at ×1.5/320. :505 `rank width:40` → "20th" wraps at mono ×1.4 (`minWidth` instead).
- [MyFeedbackModal.tsx:370–375](src/components/MyFeedbackModal.tsx) — header pill + timestamp can't shrink → date bleeds past card edge at ≤360 + ×1.6.
- [ProfileScreen.tsx:2313–2337](src/screens/ProfileScreen.tsx) — status pills wrap 3+1 with the 4th stretched full-width at 320 (`flexBasis:0, minWidth:70`); uppercase words spill at 320+×1.6. :797 signed-out center state has no horizontal padding. :1162 nearest-flag subtitle truncates its severity tail at ×1.6/≤360.
- [FlagDetailModal.tsx](src/components/FlagDetailModal.tsx) — :758–790 before/after columns lose top alignment when one caption wraps (arrow's `paddingTop:16` mispoints); :1387 empty action row leaves a 16pt dead band for resolved non-own flags.
- [CommentBubble.tsx:49–66](src/components/CommentBubble.tsx) — 44pt delete strip inflates own-bubbles with ~26pt phantom header (use hitSlop recipe like PhotoGallery's removeBtn); :68 author name `numberOfLines={1}` truncation (a11y label carries full name — sighted-only loss).
- [PhotoLightboxModal.tsx:86–88,130–139](src/components/PhotoLightboxModal.tsx) — caption `numberOfLines={2}` truncates at ×1.6/320; paddingBottom 32 is 2pt shy of the 34pt indicator.
- [ReportFlagModal.tsx:995–1006](src/screens/ReportFlagModal.tsx) — `card flex:1` forces the sheet to 88% even for the 3-field anon form (blank band); :1168 footer double-padding leaves an inset divider seam.
- [MapScreen.tsx:1379–1399](src/screens/MapScreen.tsx) — placesRow renders up to 50 wrapping chips over the map (cap or make single-line scroller).
- [FlashBanner.tsx:133](src/components/FlashBanner.tsx) — `top: 56` hardcoded (3pt into the unsafe zone on island devices) → inset-aware.
- [Sheet.tsx:143–144](src/components/ui/Sheet.tsx) — 40×40 close button (hitSlop rescues the target to 56 — consistency note only). FeedbackModal chips `minHeight:36` — below the app's 44 floor.
- [SettingsScreen.tsx:695–704](src/screens/SettingsScreen.tsx) — Appearance segments borderline-cramped at 320+×1.6 (no confirmed collision).
- Android lineHeight-crowding class (uncapped body + fixed lineHeight): TasksScreen `emptyBody` 13/19, NearbyFlagsModal `cardMeta` 12/16 — fine on iOS, historical Android lag risk.
- [StatusBadge.tsx:112,115](src/components/StatusBadge.tsx) — fontSize 11 = the app's legibility floor (4 sites; intentional but note).

## DEAD CODE TO DELETE IN THE FIX BRANCH (time bombs + noise)

- **Orphaned text styles with lineHeight ratio 1.11 (< Public Sans's 1.175 floor — guaranteed clip if ever used):** `closeBtnText` ×7 (AchievementsModal:104, ActivityFeedModal:360, FilterPresetsModal:561, MyReportsModal:474, MyWatchedModal:432, NotificationPrefsModal:264, SavedPlacesModal:432) + ProfileScreen:2132 `tierCloseBtnText`, TasksScreen:2004 `selectCheckMark`, ProfileScreen:1992 `avatarEditBadgeText` — all superseded by lucide icons.
- OnboardingCards dead styles: `card`, `emoji`, `position`, `dotActive`, `btnPressed`.
- Dead components (0 importers — verify then remove): LeaderboardModal.tsx (429 lines), RealtimePulse.tsx, RankBadge.tsx (hard height:28), HeatmapLayer.tsx, shared FlagCard.tsx. Also `ui/Button.tsx` has **zero usage sites** — decide: adopt it (it's the clean minHeight reference!) or remove.

## GUARD HARDENING (make the regression net catch this class)

`src/__tests__/dynamicTypeGuard.test.ts` misses every finding above (80+ hard-height styles evade the `*Row|Label|Text|Title|Name` suffix regex; ScreenHeader's `title` is lowercase; Bug 1's height is emergent). Highest-value additions for the fix pass:
1. Flag `flex: 1` in any style applied to a direct child of a Pressable (Bug 1's shape).
2. Flag explicit `lineHeight / fontSize < 1.18` (Public Sans's real floor; catches the dead time bombs and P1).
3. Flag a hard `height:` in styles co-used in a JSX element that contains text (name-independent).
4. Flag `horizontal` ScrollViews whose `style` doesn't set `flexGrow:0, flexShrink:0` (pattern B).

---

## PRIORITIZED FIX LIST (the one-branch batch)

**Tier 1 — shared/leveraged fixes (each fixes multiple screens or a whole class):**
1. **Pattern-B batch** (Bug 2 + all recurrences): TasksScreen categoryScroll, NearbyFlagsModal chip bar (+surface-on-style), MyWatchedModal ×2, MyFeedbackModal, + hardening on PhotoGallery/RecentlyViewedRow/FlagDetailModal/MapScreen ×2. One rule, 9 sites.
2. **Tab bar** (G3): height/lineHeight/scaling cap — fixes all 3 tabs everywhere.
3. **Bug 1** (onboarding CTA `flex:1`) — one-line + hygiene.
4. **ScreenHeader title** (M18) — fixes 3 screens.
5. **Sheet safe-area class** (M15 + R3 family): FlagDetailModal, StatusHistoryModal, MyReports/ActivityFeed/Achievements paddingBottom → inset-aware. One recipe, ~6 sheets.
6. **Keyboard class** (M14): KAV/adjust-insets on AddressSearch, ReportFlag, Map name prompts.
7. **Guard hardening** (4 rules above) — prevents the whole class recurring.

**Tier 2 — glaring singles:** G4 bulk bar (+BULK_BAR_HEIGHT), G5 map filter panel bound+scroll (+ inner chip rows), G6 heatmap legend flex, G7 comment bleed invariant, G8 SavedPlaces FlatList, G9 FeedbackModal maxHeight+scroll, G10 onboarding slide scroll (+ OnboardingModal), M4 avatar badge clip.

**Tier 3 — moderates:** M1 cluster cap+Nk, M2 point-history 2 lines, M3 stat labels, M5 hero lineHeight 74, M6 hero row shrink, M7 tier/delete sheets, M8 NotifPrefs scroll, M9 sortRow wrap, M10 overlay grouping, M11 action tray narrow strategy, M12 preset rows, M13 recents scroll, M16 FlagCard 375 guard, M17 bulk/sort pill padding, M19 breakdown labels, M20 Skip inset, M21 placeholder cap, M22 drawer scroll.

**Tier 4 — minors + dead-code deletion sweep** (list above).

## COVERAGE

- **Deep-read (line-level layout audit):** every screen, modal, overlay, and shared primitive listed in the inventory — 7 screens, ~30 modals/overlays, 20+ shared components, the navigator, both PlatformMap variants. Clean bills: LegendModal, AchievementsModal, PlatformMap.web, AboutScreen, Resources/HowToHelp, HelpModal, ChangelogModal, UpdateBanner, ErrorBoundary, AdminScreen, SignInScreen, NotificationPreferencesScreen, Input/Card/GlassSurface/Skeleton/PressableScale primitives.
- **Web-render verified live (Chromium, guest mode, real Supabase data):** onboarding all 5 slides + CTA geometry measured; Tasks with 4 real flags (chip crush measured to the decimal; tab bar measured); export builds clean (exit 0).
- **Honest limits:** Chromium-only (no Safari/WebKit); web can't express native fontScale — all ×1.6 claims are token-math + reconstruction, not device truth; signed-in-only surfaces (Profile stats, Admin, presets) audited by code + reconstruction, not live render.

## NEEDS-SKY-DEVICE (only her phone can confirm)

1. Bug 1 fix verification — the "Qpen" clip is native-only; after the fix pass, one onboarding walk-through.
2. G3 tab-bar labels on iOS at default + large Dynamic Type (web-proven; native assumed).
3. G4 bulk bar behind the tab bar (native blur stacking).
4. M15/M20/FlashBanner safe-area items (insets don't exist on web).
5. M1 cluster badge at iOS accessibility text sizes.
6. Any VoiceOver regression on the fixed filter header (the a11y tree changes when the strip stops clipping).

---

*Report generated by the app-wide visual sweep (read-only). Fix pass: one branch, verify in the web export + this report's reproduction steps, then ONE build.*
