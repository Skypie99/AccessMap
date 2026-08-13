# SPEC — Map + Sheet Gestures (build-ready, **AWAITING SKY'S RULING — nothing here is built**)

**Authored 2026-08-12 (Fable 5, spec run — zero code changes).** Ground truth: `00_INVENTORY.md` (verified against `main` @ `07f82bc`, the merged map-chrome tip). Interaction diagrams: `diagrams/gesture-flows.html`. Sky's rules honored throughout: **gestures AUGMENT, never replace — every dismissible keeps its visible close affordance**, and gestures done wrong are worse than none, so every trap is named next to its rule.

---

## §1 PINCH-TO-ZOOM — verdict: ALREADY NATIVE. The work is verification + two taste knobs, not code.

### 1.1 The Step-0 verdict (Case A)
Pinch-zoom is **already enabled on both platforms** and nothing in the app fights it:
- **Native:** react-native-maps defaults `zoomEnabled`/`scrollEnabled`/`zoomTapEnabled` to true and `PlatformMap` never overrides them (`PlatformMap.tsx:287-353`). Provider is Apple Maps (`PROVIDER_DEFAULT`), whose own recognizers deliver spread-in/pinch-out **centered on the gesture focal point**, simultaneous with one-finger pan — the exact behaviors Sky asked for, implemented by the platform.
- **The camera is uncontrolled** (`initialRegion` only; imperative moves via `animateToRegion`) — the classic failure where a controlled `region` prop snaps the camera back mid-pinch is *structurally absent*. Do not "improve" this into a controlled prop, ever.
- **The chrome can't eat the touches:** the whole overlay honors the box-none law (INVENTORY §3, guard law G). Pinches that start on the command bar's pannable gaps, between FABs, or over banners' dead space all reach the map.
- **Web:** Leaflet's `touchZoom`/`scrollWheelZoom`/`doubleClickZoom`/`dragging` defaults are on; the visual zoom control is deliberately replaced by the app's 44pt FABs (`PlatformMap.web.tsx:1032-1051`).
- **WCAG 2.5.7 stands satisfied** independently of the pinch: single-pointer zoom in/out via the crystal FABs → `zoomBy(±1)` (`MapScreen.tsx:2576-2616`). The pinch is an additive gesture over an accessible path, exactly the right dependency direction.

**If pinch has ever *felt* missing, the likely culprits are environmental, not code:** the iOS Simulator requires ⌥-drag to synthesize two fingers (and lies about feel), and the web build maps pinch to trackpad-gesture/scroll-zoom. That is why §1.4 routes the proof to a device pass instead of claiming it here.

### 1.2 What the build actually does for pinch
**Nothing mandatory.** Two optional, one-line taste knobs — both banked as questions (QUESTIONS.md Q1/Q2) with recommendations, neither blocking:
- **Zoom clamps:** `minZoomLevel={3}` (world view; stops disorienting infinite zoom-out where every pin clusters into one dot) and `maxZoomLevel={20}` on the `ClusteredMapView` (props pass through to MapView). Web twin: `minZoom={3}`/`maxZoom={19}` on `MapContainer` to match. Recommendation: ADD the min clamp only, skip max (Apple Maps' own ceiling is fine; Supercluster's index already caps at 16 for cluster math, unrelated to camera).
- **Rotate/pitch:** two-finger rotate and pitch are currently ON (platform defaults). Recommendation: LEAVE THEM — they are platform muscle memory, iOS shows its native compass re-set affordance when rotated, and disabling them would be the only place the app *removes* a standard map gesture. If Sky finds rotation disorienting on device, the off-switch is `rotateEnabled={false}` `pitchEnabled={false}` on ClusteredMapView — a 2-prop follow-up, not a redesign.

### 1.3 Traps named (pinch)
1. **Never add a second zoom source of truth.** No `onRegionChange` per-frame listeners (there are none today — keep it that way; `MapScreen.tsx:1479`), no state mirror of the camera, no "sync" effect. The map owns its camera between imperative moves. PROTECT.
2. **Never wrap `PlatformMap` or the overlay in any gesture handler.** Law F's origin is exactly this trap ("a gesture responder over the map's box-none overlay reopens a settled law"). Pinch needs zero handlers; adding one can only break pan/pinch arbitration the SDK already does right.
3. **`zoomBy` FABs and pinch coexist by design** — both end in native camera ops; no shared state to corrupt. Don't "unify" them.
4. **The map surface NEVER pull-dismisses** (see §2.2 class MAP): a downward drag on the map is a pan, full stop. No dismiss gesture may ever mount over map tiles.
5. Android-only footnote: react-native-maps renders Google's built-in zoom buttons on Android by default (`zoomControlEnabled`). The app is iOS-first (EAS iOS profiles only); if an Android build ever ships, set `zoomControlEnabled={false}` to avoid doubled zoom UI with the crystal FABs. Noted, not scheduled.

### 1.4 Device-pass items (simulators lie about touch)
- Real pinch in/out: smooth, focal point stays under the fingers, no snap-back at gesture end (uncontrolled camera proof).
- Pinch DURING a one-finger pan (add second finger mid-drag) — must transition to zoom without a jump.
- Pinch starting with one finger on a marker/cluster — SDK arbitration should still zoom (markers claim taps, not pinches).
- Double-tap zoom-in and two-finger-tap zoom-out (iOS map conventions — both currently enabled).
- Rotate + the native compass affordance; pitch; then Sky's taste ruling on Q2.
- Under VoiceOver: map is skipped in favor of the auto-opened Nearby list (existing behavior); VO's own zoom via the FABs still works.

---

## §2 PULL-DOWN-TO-DISMISS — per-class spec

### 2.1 The classes (every surface classified — INVENTORY §5 is the census)

| Class | Members (on Explore) | Pull-to-dismiss? | Mechanism |
|---|---|---|---|
| **MAP** — the map surface itself | PlatformMap | **NEVER.** Downward drag = pan. | none — and law F keeps it that way |
| **PS — pageSheet** | NearbyFlagsModal (elsewhere: Resources, HowToHelp) | **YES — Tier 1, ship first** | native UIKit: `allowSwipeDismissal={true}` (one prop; INVENTORY §7) |
| **HS — transparent half-sheets** | ReportFlagModal (flagship), FlagDetailModal, LegendModal, AddressSearchModal, SavedPlacesModal, FilterPresetsModal (+ `Sheet` primitive → Tasks filter sheet, Changelog ride along) | **YES — Tier 2** | ONE shared primitive: RNGH `PanGestureHandler` + core `Animated` (native driver), under the law-F amendment (§3.2) |
| **CD — centered dialogs** | save-set + preset name dialogs, PhotoLightbox | **NO.** Centered dialogs don't drag on any platform; Lightbox keeps tap-anywhere + X (its pinch-zoom is a separately-deferred polish item, out of scope) | — |
| **IP — inline panels** | filter panel, ⋯ tool sheet | **NO.** Popover-class, anchored to bar buttons, dismissed by their toggles; a drag would fight the panel's inner scroll + rails for no idiom gain | — |
| **DR — drawer** | HamburgerDrawer | **NOT in this run.** The analogous gesture is a horizontal swipe-left; law H freezes its Modal tag, so it needs its own deliberate amendment. Banked (Q6) | — |
| banners/callouts | heat notice, map callout | NO — keep X / map-tap | — |

**Close buttons: unconditionally retained on every surface, all classes** (Sky's rule). The census in INVENTORY §5 lists each one; the guard in §3.4 makes removal a test failure.

### 2.2 Tier 1 — NearbyFlagsModal (native pageSheet swipe): the one-prop fix

```
NearbyFlagsModal.tsx:206-212 — the Modal tag gains ONE prop:
  allowSwipeDismissal={true}
```
- Today: drag down → sheet resists, rubber-bands, THEN closes (blocked-attempt path fires `onRequestClose` → `onClose`). State-safe but feels broken.
- After: the real iOS finger-tracking sheet dismissal — track, threshold, velocity, spring-back on cancel, all UIKit. On completion RN fires `onRequestClose` → `onClose` → `nearbyTrigger.release()` runs exactly as today; iOS `onDismiss` → `restore()` unchanged. **No focus-return, escape-parity, or law-J change.**
- The grabber it already wears (`:227`) finally tells the truth.
- **Reduce Motion:** UIKit honors the system setting for its own transitions; the tracking itself is direct manipulation (exempt by 2.3.3's own terms). No code.
- **VoiceOver:** the escape scrub (`onAccessibilityEscape={onClose}`, `:219`) and the X (`:234`) remain the AT doors; VO users never perform the drag. Unchanged.
- Guard delta: dismissalStandard laws A–J all keep passing (the new prop is not `onDismiss`; law H pins only the drawer's tag). Add the Tier-1 case to `Sheet.dismissal`-adjacent coverage per §3.4.
- Ride-along option (Sky's call, Q5): the same one prop on the Resources/HowToHelp pageSheets for app-wide consistency. Recommended YES — identical mechanics, zero new code.
- **Android footnote:** `allowSwipeDismissal` is iOS-only (Android pageSheet ≈ fullscreen; hardware back already covered by law D). No Android delta.

### 2.3 Tier 2 — the half-sheet primitive (Report is the flagship)

**One new component owns ALL custom gesture code in the app:** `src/components/ui/SheetPull.tsx` (name final at build; the law-F amendment in §3.2 scopes the ban exception to exactly this file). Sheets adopt it by wrapping their existing card — no sheet re-architecture, no `<Modal>` changes, containment nodes untouched.

**Why this mechanism (and not the alternatives):**
- RNGH is already installed; **`PanGestureHandler` (the v2 "old" API) pairs with core `Animated.event` + `useNativeDriver: true`**, so the finger-tracking runs on the native thread with NO Reanimated dependency. The new `GestureDetector` API would run per-frame callbacks on the JS thread without Reanimated (jank risk on a busy thread) *and* is a law-F banned identifier. `PanResponder` is banned and JS-thread-only. Converting half-sheets to pageSheets would get UIKit swipe free but destroys the designed half-height glass sheets — rejected (named as the zero-amendment alternative in QUESTIONS Q3).
- Prereq (one line): wrap the app root in `<GestureHandlerRootView style={{flex:1}}>` in `App.tsx` — without it RNGH gestures silently no-op (INVENTORY §2).

**The component contract:**
```tsx
<SheetPull
  enabled={boolean}          // e.g. Report passes !submitting && !keyboardVisible
  onDismiss={() => void}     // MUST be the surface's existing onClose — same handler as X/Cancel/escape (law B parity)
  scrollRef={ref}            // the sheet's inner vertical ScrollView/FlatList (optional — omit for non-scrolling sheets)
  atTopRef={ref}             // boolean ref maintained by the sheet's onScroll (offset <= 0); SheetPull reads it at gesture-arm time
  showGrabber={boolean}      // renders the existing SheetGrabber above children (adds it to Report/FlagDetail/etc. — affordance honesty)
>
  {card}
</SheetPull>
```
Internals: `PanGestureHandler` → `Animated.event([{nativeEvent: {translationY}}], {useNativeDriver: true})` driving `translateY = clamp(gesture, 0, ∞)` on the card wrapper (upward drags clamp to 0 — the sheet never lifts); `simultaneousHandlers={scrollRef}` so the pan can observe without stealing; the scrim (where the sheet owns one) fades on an interpolation of the same value.

### 2.4 THE DISMISS-VS-SCROLL RULE (the make-or-break) — stated precisely

A sheet with scrollable content (Report's form) must never trap the user out of scrolling their own form. The rule, exactly:

> **The pan may ARM only when, at gesture start: (a) `enabled` is true, (b) the content is scrolled to its top (`atTopRef.current === true`, i.e. scroll offset ≤ 0), and (c) the drag is deliberately vertical-downward — `activeOffsetY={16}` (the pan activates only after 16pt of downward travel) with `failOffsetX={[-14, 14]}` (14pt of horizontal travel fails the pan so the chip rails and horizontal scrolls inside sheets always win) and `failOffsetY={-1}` (any upward start fails it — upward belongs to the content).**
> **Otherwise the content ScrollView owns the touch and scrolls normally. Mid-content downward drags scroll; only a top-of-scroll deliberate downward drag begins a dismiss.**

Implementation notes that make this true rather than aspirational:
- `atTopRef` is maintained by the sheet's existing `onScroll` (`scrollEventThrottle={16}`) — a ref, not state, so no re-renders. At gesture-arm (`onHandlerStateChange` BEGAN→ACTIVE) the pan checks it and **fails itself** (sets an internal `enabled=false` for that gesture) when not at top. RNGH's `simultaneousHandlers` keeps the ScrollView live throughout, so a failed pan costs nothing.
- iOS bounce: `offset ≤ 0` (not `=== 0`) so the rubber-banded-at-top state still arms.
- The 16pt activation distance is also the accidental-touch filter: taps, 15pt wobbles, and horizontal rail swipes never move the sheet.

### 2.5 Thresholds, tracking, and the cancel (numbers proposed — device pass tunes them)

| Parameter | Value | Why |
|---|---|---|
| Activation distance | **16pt down** (`activeOffsetY={16}`) | Below iOS's ~20pt sheet feel but above tap wobble; the sheet answers quickly without arming on noise |
| Horizontal fail | **±14pt** (`failOffsetX`) | Chip rails inside Report/panel win any sideways intent |
| Tracking | **1:1 with the finger**, `translateY` clamped ≥ 0, native driver | Rubber-band feel; direct manipulation (not "animation" — WCAG 2.3.3-exempt, so tracking survives Reduce Motion) |
| Commit threshold | **translationY > max(120pt, 30% of measured card height)** (card height via `onLayout`) | Short sheets need the 120pt floor so a half-drag on a small card isn't instant dismissal; tall sheets use the fraction |
| Velocity commit | **velocityY > 700pt/s with translationY > 24pt** | The flick path — deliberate, but a 24pt minimum so a twitch can't commit |
| Cancel (below both) | spring back to 0 with the house `motion.spring.sheet` (`{speed:18, bounciness:4}`) | Matches every sheet entrance in the app |
| Commit animation | `Animated.timing` to off-screen, `motion.duration.base` (180ms), `Easing.bezier(...motion.easing.accelerate)` ("things that leave"), THEN call `onDismiss()` | The Modal's own exit is `animationType` — already at current position, so no double-slide; the card is off-screen when `visible` flips |
| Reduce Motion | tracking unchanged; **cancel = instant snap to 0; commit = `motion.duration.instant` (0ms) then `onDismiss()`** | Mirrors the estate's `animationType={reducedMotion ? 'none' : 'slide'}` law C |
| Haptic | optional `hapticSelection()` on first crossing INTO the commit zone (and none on re-crossing out) | Sky-taste toggle, default proposed ON (Q4) |
| Post-dismiss state | the card's `translateY` resets to 0 when `visible` goes false → next open is clean | prevents the half-dragged ghost on reopen |

State machine (rendered): `diagrams/gesture-flows.html` — IDLE → (arm checks) → TRACKING → {release < threshold → SPRING-BACK → IDLE · release ≥ threshold or flick → DISMISSING → onClose} with the RM branch annotated.

### 2.6 Per-sheet application (Tier 2 rollout order + per-surface notes)

1. **ReportFlagModal (flagship, ships with the primitive):** wrap the GlassSurface card (`:564`); `enabled={!submitting && !keyboardVisible}`; `atTopRef` from the form ScrollView (`:582`); `showGrabber` — Report finally gets the pill (it's the app's most-used sheet and had no affordance). Extra rules:
   - **Keyboard interplay:** while the keyboard is up, the pan is DISABLED (a `Keyboard.addListener` show/hide boolean). Recommend also adding `keyboardDismissMode="on-drag"` to the form ScrollView so drag #1 drops the keyboard, drag #2 (from top) dismisses — banked as Q7 with that recommendation.
   - **Mid-flight guard parity:** `!submitting` joins the exact guard set Cancel/back/escape already share (`:551,:576-578`) — the gesture can never be the one door that closes a submitting sheet.
   - **Data-loss honesty:** the sheet is always-mounted and only `reset()`s after a successful submit — an accidental dismiss loses nothing; reopening restores the draft. (Verified `MapScreen.tsx:121-127`, `ReportFlagModal.tsx:205-215`.) No confirm-on-dismiss needed.
2. **FlagDetailModal:** wrap card at `:1026`; `atTopRef` from body ScrollView `:1053`; grabber ON. Note its nested modals (StatusHistory/ReportContent/Lightbox) present OVER it — the pan must not arm while a child modal is open (RN Modals swallow touches naturally; no extra code expected, verify on device).
3. **LegendModal:** wrap the card shell `:61`; scrim tap-dismiss already exists and stays; grabber ON.
4. **AddressSearchModal:** `enabled={!keyboardVisible}` matters most here (search = keyboard-first); `atTopRef` from the results FlatList. Grabber ON.
5. **SavedPlacesModal / FilterPresetsModal:** straightforward; FlatList `atTopRef`; grabber ON.
6. **`Sheet` primitive:** add `SheetPull` inside the primitive LAST, once the pattern is device-proven — it rides into the Tasks filter sheet + Changelog (recorded ride-along, device-tune seam per `Sheet.tsx:63-78`; note it in the build report exactly like G3 did).

Each adoption is its own small commit with its own test delta — never one mega-commit across seven sheets.

---

## §3 ESCAPE-LAW + A11Y INTEGRATION (hard requirements, with their tests)

### 3.1 The five invariants every gesture ships under
1. **Same-handler law (extends guard law B):** a gesture dismiss calls the surface's existing `onClose` — the byte-same handler as `onRequestClose`, the X/Cancel, and `onAccessibilityEscape`. Never a parallel close path; the focus-return choreography (`release()` in onClose, `restore()` on onDismiss) is inherited, not re-implemented.
2. **Close button always stays:** every adopting surface keeps its labelled close control (census: INVENTORY §5). The gesture is a shortcut, not the only door.
3. **Reduce Motion:** tracking is direct manipulation and stays; every settle (spring-back, commit slide) branches to instant via `useReducedMotion()` + `motion.duration.instant`. New animation literals must ride `motion.*` tokens (satisfies `reduceMotion.modalGate.test.ts`'s scan).
4. **VoiceOver:** the gestures stand aside — VO intercepts touches, so VO users dismiss via the escape scrub (two-finger Z, wired estate-wide on containment nodes) and the close buttons. The `SheetPull` wrapper adds NO accessible node (plain View, `accessible` unset), the grabber stays AT-hidden (`Sheet.tsx:79-88` props), and focus-on-open (`useFocusOnOpen` → title) is untouched. No announcements change.
5. **Mid-flight guards propagate:** wherever a surface guards its close (`!submitting`, `!savingSet`), the same expression gates `enabled`. The guard census (law B parity) is the checklist.

### 3.2 THE LAW-F AMENDMENT (deliberate, Sky-gated — the sibling SPEC §8's hard warning)
`dismissalStandard.guard.test.ts` law F currently reads *"swipe stays UIKit-only — no custom gesture code anywhere"* and bans `PanResponder`/`GestureDetector`/`Swipeable` across src/. Tier 1 satisfies it as written. Tier 2 cannot — so the build's FIRST commit (after Sky approves this spec, which IS the sign-off artifact) amends the law, never silently:
- **New law F wording (proposed):** "swipe is UIKit-native OR rides the one ratified pull primitive. Banned identifiers: `PanResponder`, `GestureDetector`, `Swipeable` everywhere; `PanGestureHandler` everywhere EXCEPT `src/components/ui/SheetPull.tsx`. The map overlay estate (`MapScreen.tsx`, `PlatformMap*.tsx`) admits NO gesture handler of any kind."
- The exception is a **single-file allowlist with drain discipline** (same style as the guard's ALLOWED list): any second file importing `PanGestureHandler` fails the sweep.
- Law E (fullScreen surfaces add no swipe) is untouched. Law H (drawer frozen) untouched. Law J untouched (no new `onDismiss` claimants — assert in review).
- The amendment commit contains: the guard edit + the docblock note "amended 2026-08-XX with Sky's sign-off (map-gestures SPEC §3.2)" + `SheetPull.tsx` + its new guard (§3.4). Nothing else.

### 3.3 Platform boundaries stated honestly
- **iOS:** full behavior (Tier 1 + Tier 2).
- **Android:** Tier 2 works identically via RNGH; Tier 1 is a no-op (pageSheet is iOS); hardware back stays law-D covered.
- **Web:** v1 ships NO pull-to-dismiss (desktop pointer ≠ sheet-drag idiom; RNGH-web adds surface area for zero user demand). `SheetPull` renders children pass-through on web. Banked Q8.

### 3.4 Guard tests (non-vacuous, named)
New file `src/__tests__/sheetPull.guard.test.ts` (house static-scan idiom):
1. **Close-button parity (the Sky rule as a test):** for every file importing `SheetPull`, assert the file (or its declared close-owner) still contains a labelled close control (`accessibilityLabel="Close …"` / `"Cancel and close"` census — sourced from INVENTORY §5, drain-style list so removal fails by name).
2. **Threshold non-vacuity:** import the exported constants from `SheetPull` and assert `COMMIT_FRACTION ∈ (0.15, 0.5]`, `COMMIT_FLOOR_PT ∈ [80, 200]`, `COMMIT_VELOCITY ∈ [400, 1200]`, `ACTIVATION_PT ∈ [8, 24]` — a refactor that zeroes a threshold (dismiss-on-touch) or infinities it (gesture dead) fails loudly.
3. **Same-handler law:** static-assert every `<SheetPull` call site passes `onDismiss={onClose}` (the exact expression its Modal's `onRequestClose` uses — reuse the dismissalStandard `prop()` parser).
4. **RM branch present:** `SheetPull.tsx` consumes `useReducedMotion` and contains no bare duration literals (motion tokens only).
5. **Law-F residual scope:** re-assert `MapScreen.tsx`/`PlatformMap*.tsx` contain no gesture-handler identifiers at all (belt to the amended sweep's suspenders).
Plus behavioral tests (`SheetPull.test.tsx`, RTL + RNGH's jest utilities — add `react-native-gesture-handler/jestSetup` to `jest.config.js` setupFiles): fire the handler state machine and assert (a) below-threshold release calls NO onDismiss and animates back, (b) past-threshold release calls onDismiss exactly once, (c) `enabled=false` never arms, (d) not-at-top never arms. And one Tier-1 test: Nearby's Modal tag carries `allowSwipeDismissal` + `onRequestClose={onClose}` (parity pin).

Existing suites the build must keep green untouched: the full `dismissalStandard` suite (post-amendment), `Sheet.dismissal.test.tsx` (+ additive cases when the primitive adopts), `reduceMotion.modalGate`, `focusOnOpen.guard`, the announce/perception guards. Gate law: `npx jest --ci -w 3` + `npm run typecheck` + `npm run lint`.

### 3.5 Device-pass items (a simulator lies about touch — honest routing)
Pull-feel rows: Report drag-from-top vs mid-form scroll (the §2.4 rule, both directions) · the 120pt floor on the short anon form vs 30% on the tall signed-in form · flick-dismiss velocity feel · spring-back feel (and its instant RM twin) · keyboard-up drag (disabled) → keyboard-drop → dismiss · grabber discoverability · Nearby's native tracking after `allowSwipeDismissal` (+ bounce-regression check: the old resist-then-close jank is gone) · VO escape scrub on every adopter · TalkBack pass on Android for Tier 2 · large-Dynamic-Type sheets still dismissible with the same thresholds (fraction uses measured height, so it scales — verify).
