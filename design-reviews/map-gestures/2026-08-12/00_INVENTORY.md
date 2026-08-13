# 00 — THE GESTURE INVENTORY (Step 0 ground truth, verified 2026-08-12)

**Repo state at audit:** `main` @ `07f82bc` — which IS the merged map-chrome compaction (B-refined, Phases 1–6). Every line number below is against this SHA. Working tree dirty with untracked design-review artifacts only.

> ⚠ **Sibling-run reality check:** the map-chrome run's SPEC §1 said "chrome lands FIRST, gestures stack on its tip." That has ALREADY HAPPENED — `07f82bc` is the chrome merge. So the gesture build branches from the then-current `main` tip (state the SHA in the build report) and this spec is written against the POST-chrome geometry: one crystal command bar, crystal zoom/recenter/List FABs, ⋯ tool sheet, filter panel, translucent legend.

---

## 1. The map stack (pinch verdict input)

| Fact | Value | Receipt |
|---|---|---|
| Native map | react-native-maps **1.20.1** via `react-native-map-clustering` (`ClusteredMapView`) | `package.json:54-55`, `src/components/PlatformMap.tsx:7-8` |
| Provider | `PROVIDER_DEFAULT` → **Apple Maps on iOS** | `PlatformMap.tsx:292` |
| Camera model | **UNCONTROLLED** — `initialRegion` only; all programmatic moves via imperative `animateToRegion`/`animateCamera` through the handle (`animateTo`/`zoomBy`/`snapToRegion`) | `PlatformMap.tsx:293,226-284` |
| `zoomEnabled` / `scrollEnabled` / `zoomTapEnabled` / `rotateEnabled` / `pitchEnabled` | **ALL UNSET → native defaults = every gesture ENABLED** | `PlatformMap.tsx:287-353` (absence) |
| `minZoomLevel` / `maxZoomLevel` | UNSET → no zoom clamps | same |
| Per-frame region listeners | **NONE** — no `onRegionChange`/`onRegionChangeComplete` on native; viewport ref syncs from `location` only | `MapScreen.tsx:1479` comment admits it |
| Reduce-motion | `animationEnabled={!reducedMotion}` kills the cluster spring; camera moves ride duration-0 | `PlatformMap.tsx:306,245,261` |
| Web twin | react-leaflet 5 `MapContainer` — `touchZoom`/`dragging`/`doubleClickZoom`/`scrollWheelZoom` left at **Leaflet defaults = ON**; `zoomControl={false}` (app FABs replace it); `zoomAnimation`/`fadeAnimation` RM-gated | `PlatformMap.web.tsx:1032-1051` |
| Single-pointer zoom alternative (WCAG 2.5.7) | Already shipped — 44pt crystal Zoom in/out FABs drive `zoomBy(±1)` | `MapScreen.tsx:2576-2616`, `PlatformMap.tsx:251-267` |

**⇒ STEP-0 VERDICT (pinch): CASE A — pinch-zoom is ALREADY NATIVE AND ENABLED on both platforms.** Spread = zoom in, pinch = zoom out, focal point under the fingers — all owned by the SDK (Apple Maps recognizers / Leaflet touchZoom). Nothing in the codebase disables, wraps, or re-implements it, and the uncontrolled-camera design means no controlled-`region` prop exists to fight the gesture (the classic RN-maps jitter bug is structurally absent). The overlay chrome cannot eat the touches — see §3.

## 2. Gesture infrastructure

| Fact | Value | Receipt |
|---|---|---|
| react-native-gesture-handler | **~2.28.0 installed**; side-effect import present at `App.tsx:1` | `package.json:53` |
| RNGH consumers | **ZERO live consumers.** PhotoLightboxModal only *mentions* it in a comment ("deferred to a polish loop") | `PhotoLightboxModal.tsx:10-12` |
| `GestureHandlerRootView` | **ABSENT from the root.** Required by RNGH v2 (Expo SDK 54 / new architecture) before any RNGH gesture fires — a one-line wrap in `App.tsx`, and named build step | `App.tsx` (absence) |
| react-native-reanimated | **NOT INSTALLED** | `package.json` (absence) |
| PanResponder | ZERO usages (and banned — §4) | repo grep |
| Animation system | RN core `Animated` + house `motion` tokens (`duration.instant/fast/base/slow`, `easing.standard/decelerate/accelerate`, `spring.press/sheet/drawer`) | `src/theme.ts:526-550` |
| Haptics | `@/lib/haptics` (`hapticSelection`, `hapticNotify`) via expo-haptics | e.g. `MapScreen.tsx:363` |
| Jest | jest-expo preset; `setupFiles: ['./jest.setup.js']` — **no RNGH jestSetup wired yet** (needed if the build renders RNGH handlers in tests) | `jest.config.js` |

**Long-press already has three meanings on Explore** (arbitration context for anything new):
1. Map surface long-press → drop-a-flag confirm (`PlatformMap.tsx:345-352` → `MapScreen.tsx:1525-1560`)
2. Command-bar title 600ms long-press → glass A/B flip (`MapScreen.tsx:1692-1707`, GLASS §12.5 exception)
3. Saved-set chip long-press → set menu (`MapScreen.tsx:1982`)

## 3. The box-none gesture law (why chrome can't eat pinch)

The entire overlay is `pointerEvents="box-none"` at every layer: the absolute-fill overlay (`MapScreen.tsx:1638-1642`), the top group (`:1649`), the command bar's GlassSurface AND its inner row AND the title cluster AND the trailing spacer (`:1666,1668,1685,1756`), the zoom group (`:2576`). Only actual controls take touches; map pan/pinch passes through every gap. Guard-enforced: `dismissalStandard.guard.test.ts` law G requires ≥6 `pointerEvents="box-none"` in MapScreen (`src/__tests__/dismissalStandard.guard.test.ts:377-382`). **PROTECT: gestures must never add a touch-opaque wrapper over the map.**

## 4. The escape law + the dismissal-standard guard (the legal landscape)

**AVM = `accessibilityViewIsModal`.** The law: containment props (`accessibilityViewIsModal`, `onAccessibilityEscape`) ride the child View INSIDE `<Modal>`, never the Modal tag — RN 0.81.5 forwards an explicit prop allowlist to RCTModalHostView and `onAccessibilityEscape` is not in it (receipt with RN source line numbers: `src/components/ui/Sheet.tsx:177-188`).

`src/__tests__/dismissalStandard.guard.test.ts` is a **source-derived census over every `<Modal>` in src/ (~33 surfaces)**. The laws the gesture work interacts with:

| Law | What it pins | Gesture impact |
|---|---|---|
| **B/B2** (:266-324) | Every surface's `onAccessibilityEscape` lives on the containment node and is **byte-identical** to `onRequestClose` | A gesture dismiss must route through the SAME close handler — never a parallel path |
| **C** (:326-336) | Every Modal's `animationType` is reduced-motion gated | New settle animations must be RM-gated too (plus `reduceMotion.modalGate.test.ts` scans for bare literals) |
| **D** (:338-345) | `onRequestClose` present class-wide (Android back) | Unchanged; gesture is additive |
| **E** (:347-357) | `presentationStyle="fullScreen"` surfaces add NO swipe gesture (scans those files for the banned identifiers) | Full-screen class stays gesture-free |
| **F** (:359-375) | **"swipe stays UIKit-only — no custom gesture code anywhere"**: bans the identifiers `PanResponder`, `GestureDetector`, `Swipeable` in ALL of src/ + App.tsx (comments stripped, runtime-assembled so it can't self-match). Rationale: "adding a gesture responder over the map's box-none overlay reopens a settled law" (03 §2.6) | **THE law this run must amend deliberately** — see SPEC §3.2. Note: `allowSwipeDismissal` (Tier 1) is UIKit swipe — it SATISFIES law F as written. Note also: `PanGestureHandler` is not in the banned list, but using it without amending the law would honor the letter and violate the spirit — the sibling SPEC §8 explicitly forbids a silent workaround |
| **G** (:377-382) | Box-none ≥6 in MapScreen | Never wrap the map |
| **H** (:384-419) | The drawer's Modal prop-name set is FROZEN (exactly `animationType, aria-label, onDismiss, onRequestClose, visible`) | Drawer gets NO new props → drawer swipe-close is out of scope without a guard amendment |
| **J** (:421-542) | `onDismiss` census: any Modal carrying `onDismiss` must be declared in FOCUS_RETURN (currently exactly 3: Nearby, Report, Legend), every `useSurfaceTrigger` call site counted | Gesture dismissal must NOT add `onDismiss` wiring anywhere new; it routes through `onClose` (the intent event), so the release()/restore() choreography is untouched |

## 5. The dismissible census on Explore (classification input)

Presentation key: **HS** = transparent Modal, JS slide, bottom half-sheet · **PS** = `presentationStyle="pageSheet"` · **CD** = transparent Modal, fade, centered dialog · **FS-t** = transparent full-screen · **IP** = inline panel (not a Modal) · **DR** = drawer.

| # | Surface | Class | Structure (receipts) | Scrollable content | Close affordance | Grabber? |
|---|---|---|---|---|---|---|
| 1 | **ReportFlagModal** | HS | Modal slide `:551` → scrim backdrop `:552` → KAV 88% cap `:560` → bulk-glass card = containment + escape, ALL dismissals guarded `!submitting` (`:568-578`) | YES — form ScrollView `:582-590` (+2 horizontal chip rails inside), `automaticallyAdjustKeyboardInsets`, sticky footer OUTSIDE scroll | **Cancel** btn, sticky footer `:1158-1167` (no X, no grabber) | NO |
| 2 | **FlagDetailModal** | HS | Modal slide `:1014`, containment card `:1026-1027`; null-stub `<Modal visible={false}>` at `:501` (ALLOWED-listed) | YES — body ScrollView `:1053` + nested comment scroll `:1337` | **X** "Close flag details" `:1045` | NO |
| 3 | **NearbyFlagsModal** | **PS** | `presentationStyle="pageSheet"` `:211`, `onRequestClose={onClose}` `:209`, bulk-glass fill → SafeAreaView containment + escape `:219` | YES — chips ScrollView `:266` + FlatList `:310` | **X** "Close nearby flags list" `:234` | **YES** `:227` |
| 4 | **LegendModal** | HS (bottom card) | Modal slide `:46`, backdrop `flex-end` (`:237`), sighted-only scrim tap-dismiss `:54-60`, tap-swallow shell = containment + escape `:61-74` | YES — ScrollView `:82` | scrim tap + in-card **Close** `:219-221` | NO |
| 5 | **AddressSearchModal** | HS | Modal slide `:203`, bulk-glass card containment + escape `:215` | YES — FlatList results `:354` + recents ScrollView `:268`; TextInput + keyboard | **X** "Close address search" `:225` | NO |
| 6 | **SavedPlacesModal** | HS | Modal slide `:269`, containment `:283` | YES — FlatList `:439`; add-place TextInput | **X** "Close saved places" `:295` | NO |
| 7 | **FilterPresetsModal** | HS | Modal slide `:363`, containment `:377` | YES — FlatList `:526` | **X** "Close filter presets" `:414` | NO |
| 8 | Save-set name dialog | CD | inline Modal fade `MapScreen.tsx:2988-2996`, KAV, containment card + escape `:3004-3011`, `!savingSet` guard | no | Cancel btn | NO |
| 9 | Preset name dialog | CD | inline Modal fade `MapScreen.tsx:2884-2892`, containment + escape `:2900-2910`, `!savingPreset` guard | no | Cancel btn | NO |
| 10 | **Filter panel** | IP | `filtersOpen &&` GlassSurface in the box-none overlay `MapScreen.tsx:1884-2292`; internal vertical ScrollView `:1943` + 2 horizontal rails | YES | bar Filters button toggles (`a11yToggle expanded`) | NO |
| 11 | **⋯ tool sheet** | IP | `toolsOpen &&` GlassSurface `MapScreen.tsx:1825-1882`; "NOT a Modal, so it never joins the dismissal-standard Modal census" (`:1820-1824`) | no | bar ⋯ button toggles | NO |
| 12 | **HamburgerDrawer** | DR | Modal `animationType="none"` + custom Animated translateX/fade (`HamburgerDrawer.tsx:93-94,278-310`); containment on panel; **law H freezes its Modal tag** | YES (drawer scroll) | scrim tap + close affordance; escape `closeDrawer` | NO |
| 13 | Heat notice | banner | dismissible X, session-scoped (`MapScreen.tsx:2482-2512`) | no | **X** "Dismiss heat map notice" | — |
| 14 | Map callout | native | Marker `Callout` `PlatformMap.tsx:451`; dismissed by map tap (SDK-owned) | no | map tap | — |
| 15 | PhotoLightboxModal (via FlagDetail) | FS-t | fade, backdrop-tap dismiss + X (`PhotoLightboxModal.tsx:45-56,105-118`) | no | **X** "Close photo" | — |
| 16 | Nested under FlagDetail: StatusHistoryModal `:1927`, ReportContentModal `:1940` | HS | own containment (ReportContentModal `:49,265`) | varies | own close buttons | NO |

Ride-along seam (not on Explore but structurally coupled): the **`Sheet` primitive** (`src/components/ui/Sheet.tsx`) is consumed by exactly **TasksScreen filter sheet (`TasksScreen.tsx:1086`) and ChangelogModal (`ChangelogModal.tsx:91`)** — a pull-to-dismiss added to the primitive rides into BOTH (the Tasks sheet belongs to the device-tune train; same recorded-ride-along discipline as G3's grabber, `Sheet.tsx:63-78`). The three pageSheets sharing Nearby's class elsewhere: ResourcesScreen, HowToHelpScreen (+ Terms/Privacy as sheet scenes).

## 6. The grabber affordance gap (why this run exists)

`SheetGrabber` (36×4pt pill, arbitrated ink, hidden from AT — `Sheet.tsx:79-88`) already ships on: the Sheet primitive (Tasks filter sheet, Changelog), Nearby, Resources, HowToHelp. **It advertises a drag that NO surface implements** — the pill is currently a decorative lie. On Nearby (pageSheet) the native swipe attempt is BLOCKED by RN's default and resolves as bounce-then-close (see §7). This run's job is to make the promise true, without breaking a single law in §4.

## 7. The pageSheet finding (Tier 1 is one prop)

RN 0.81.5 defaults every Modal's view controller to `modalInPresentation = YES` (`node_modules/react-native/React/Views/RCTModalHostView.m:38`) — the iOS 13 interactive sheet swipe is **blocked by default**. Two delegate hooks govern what happens (`RCTModalHostView.m:75-87`):
- Swipe attempt while blocked → `presentationControllerDidAttemptToDismiss` → fires `onRequestClose` → **Nearby TODAY: drag down hard = the sheet rubber-bands (won't follow), then JS closes it via `onClose`.** State-safe but janky — the sheet resists, snaps back, THEN slides away.
- With **`allowSwipeDismissal={true}`** (`Modal.js:155`, exported at `RCTModalHostViewManager.m:122`): `modalInPresentation = NO` → the REAL UIKit finger-tracking dismissal, and completion fires `onRequestClose` for state sync. RN dev-invariants that `onRequestClose` must be present ("prevent state corruption", `Modal.js:204-208`) — Nearby already has it.

**⇒ STEP-0 VERDICT (pull-to-dismiss, pageSheet class): one prop per surface, zero custom gesture code, satisfies law F as written ("swipe stays UIKit-only").**

For the transparent half-sheet class there is no UIKit dismissal to unlock (the sheet look is JS-drawn), so that class needs the custom implementation — and the law-F amendment — specced in SPEC §2/§3.
