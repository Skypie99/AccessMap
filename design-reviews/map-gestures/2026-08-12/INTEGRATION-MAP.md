# INTEGRATION MAP — every file the gesture build touches (and what it must not)

Ground truth SHA for every line anchor: `main` @ `07f82bc`.

## 1. Build order + branch discipline (the sibling-run law, updated to reality)
- The map-chrome compaction is **ALREADY MERGED** (`07f82bc` = the `design/map-chrome-b` merge). The "chrome first, gestures second" ordering is satisfied by history.
- **At build time: cut ONE branch from the then-current `main` tip and state its SHA in the build report** (per chrome SPEC §1 discipline). Suggested name: `feat/map-gestures`.
- Sky merges. Sky builds. No agent pushes this.
- Commit slices, in order — each independently green (`npx jest --ci -w 3` + typecheck + lint):
  1. **G0 · law amendment + rails:** amend dismissalStandard law F per SPEC §3.2 (docblock cites Sky's sign-off) · add `GestureHandlerRootView` wrap in `App.tsx` · add `react-native-gesture-handler/jestSetup` to `jest.config.js` setupFiles · new `sheetPull.guard.test.ts` (guards land BEFORE the code they guard).
  2. **G1 · Tier 1:** `allowSwipeDismissal={true}` on NearbyFlagsModal (+ Resources/HowToHelp if Q5 = yes) + the parity test.
  3. **G2 · the primitive:** `src/components/ui/SheetPull.tsx` + `SheetPull.test.tsx` (behavioral) — no adopters yet.
  4. **G3 · Report adopts** (the flagship — SPEC §2.6.1, keyboard + `!submitting` gates + grabber).
  5. **G4+ · one adopter per commit:** FlagDetail → Legend → AddressSearch → SavedPlaces → FilterPresets → (LAST, after device proof) the `Sheet` primitive.
  6. **G-final · pinch knobs** per Sky's Q1/Q2 rulings (may be a zero-commit).

## 2. File-by-file touch list

| File | Change | Anchors |
|---|---|---|
| `App.tsx` | Wrap root in `<GestureHandlerRootView style={{flex:1}}>` (import from RNGH). Without it every RNGH gesture silently no-ops | `:1` import already present; wrap the outermost render |
| `src/__tests__/dismissalStandard.guard.test.ts` | Law F amendment ONLY (banned list + single-file exception + docblock sign-off note). Laws A–E, G–J byte-untouched | `:359-375` |
| `jest.config.js` | `setupFiles: ['./jest.setup.js', 'react-native-gesture-handler/jestSetup']` | setupFiles line |
| `src/__tests__/sheetPull.guard.test.ts` | NEW — the 5 static assertions of SPEC §3.4 | new file |
| `src/screens/NearbyFlagsModal.tsx` | `allowSwipeDismissal={true}` on the Modal tag. NOTHING else | `:206-212` |
| `src/screens/ResourcesScreen.tsx`, `src/screens/HowToHelpScreen.tsx` | (Q5) same one prop on their pageSheet Modals | their Modal tags |
| `src/components/ui/SheetPull.tsx` | NEW — the ONLY file allowed to import `PanGestureHandler`. Exports the threshold constants for the guard | new file |
| `src/components/ui/__tests__/SheetPull.test.tsx` | NEW — behavioral suite (arm/track/commit/cancel/enabled/at-top) | new file |
| `src/screens/ReportFlagModal.tsx` | Wrap the card in `<SheetPull>`; add `atTopRef` onScroll to the form ScrollView; keyboard listener boolean; `enabled={!submitting && !keyboardVisible}`; grabber; (Q7) `keyboardDismissMode="on-drag"` | card `:564-579`, ScrollView `:582-590` |
| `src/components/FlagDetailModal.tsx` | Same adoption | card `:1026`, ScrollView `:1053` |
| `src/screens/LegendModal.tsx` | Same (keep scrim tap-dismiss) | shell `:61-74`, ScrollView `:82` |
| `src/components/AddressSearchModal.tsx` | Same; keyboard gate primary | card `:215`, FlatList `:354` |
| `src/components/SavedPlacesModal.tsx` | Same | card `:283`, FlatList `:439` |
| `src/components/FilterPresetsModal.tsx` | Same | card `:377`, FlatList `:526` |
| `src/components/ui/Sheet.tsx` | LAST: primitive adopts SheetPull internally (`glass` + opaque paths) | card render `:168-221` |
| `PlatformMap.tsx` / `PlatformMap.web.tsx` | (Q1/Q2 only) zoom clamp props / rotate-pitch props on ClusteredMapView + MapContainer. **No gesture code, ever** | `:287-353` / `:1032-1051` |

## 3. Surfaces shared with the map-chrome train (flag-and-respect list)
The chrome run's SPEC §8 named the overlap; now that chrome is merged these are LIVE surfaces the gesture build sits on top of:
- **The command bar** (`MapScreen.tsx:1658-1802`): carries the 600ms long-press glass flip (GLASS §12.5 exception). Gestures add NOTHING to the bar; pull-to-dismiss exists only inside Modals, so no arbitration overlap. The glass-flip trigger is SCAFFOLDING slated for removal after Sky's A/B verdict — do not couple anything to it.
- **The ⋯ tool sheet + filter panel** (`:1825-1882`, `:1884-2292`): inline panels, deliberately NOT Modals ("never joins the dismissal-standard Modal census"). They stay outside the pull system — do not "upgrade" them to Modals to give them a gesture.
- **`chromeInsetTop` chain** (`commandBarH → chromeBandPx → PlatformMap.chromeInsetTop`, `:530-535`, `:1635`): PROTECT — untouched by gestures.
- **Crystal zoom/recenter/List FABs** (`:2547-2651`): the pinch's single-pointer alternative — untouched.
- **Heat notice Q1 dismiss-X** (`:2482-2512`): stays X-only (chrome SPEC §8 flagged a would-be gesture-dismiss here; ruled out of scope).

## 4. PROTECT (union of the chrome run's list + this run's additions)
Box-none law (≥6, law G) · uncontrolled camera — no `region` prop, no per-frame region listeners · `calloutScheduler.schedule(` count pinned at 4 · focus-return triple (register/release/restore) and the law-J census of exactly 3 `onDismiss` claimants · escape parity (law B) on every containment node · `!submitting`-class guards on every dismissal path · GlassSurface defaults · the 4-arm honesty ternary · Jordan k≥3 + Art. 7 notice copy (byte-frozen) + Condition 2 (guest FAB hidden) · drawer Modal tag (law H, frozen) · FlagCard redesign direction (separate LOCKED program — untouched) · `SheetGrabber` ink (G3-arbitrated — reuse, never restyle) · always-mounted lazy sheets (`visible`-prop controlled — adoption must not flip them to conditional mounts).

## 5. Only-a-device-can-prove list (consolidated; the simulator lies about touch)
**Pinch (SPEC §1.4):** real pinch in/out smoothness + focal-under-fingers · pan→pinch mid-gesture transition · pinch starting over a marker/cluster · double-tap + two-finger-tap zoom · rotate/pitch feel → Q2 ruling · no snap-back at gesture end.
**Pull (SPEC §3.5):** Report top-drag vs mid-form scroll in both directions · 120pt floor (short anon form) vs 30% (tall form) · flick velocity feel · spring-back + its instant RM twin · keyboard-up drag disabled → drop keyboard → dismiss · Nearby native tracking (and the old bounce-jank confirmed gone) · grabber discoverability · VO escape scrub every adopter · TalkBack on Android · large-Dynamic-Type sheet dismissal.
**Format:** run these as a device-pass checklist appended to the build report; nothing above counts as shipped on simulator evidence alone.

## 6. Gate law
`npx jest --ci -w 3` green · `npm run typecheck` 0 · `npm run lint` 0 errors/no new warnings · every commit slice independently green · guards land before or with the code they police, never after.
