# BUILD REPORT — Map + Sheet Gestures

**Built 2026-08-12 (Opus 5, Sky-initiated) from the spec in this folder, after Sky ruled option A on Q3.**

- **Branch:** `feat/map-gestures` — **NOT merged, NOT pushed.** Sky merges.
- **Base SHA:** `07f82bc` (`main` tip = the merged map-chrome compaction). Sibling-run law satisfied: chrome first, gestures stacked on its tip.
- **Head:** `6153ed9` · 7 commits, each independently green.
- **Gate:** `npx jest --ci -w 3` → **203 suites / 3,004 tests, 0 failures** · `npm run typecheck` → **0** · `npm run lint` → **0 errors, 74 warnings = the pre-change baseline exactly** (verified by stashing and re-running).

## What shipped

| Slice | Commit | What |
|---|---|---|
| G0 | `7a173fe` | `GestureHandlerRootView` at the app root · RNGH jestSetup · **law F amended (Sky-signed)** + **new law F2** |
| G1 | `4f188a7` | **Tier 1:** `allowSwipeDismissal` on all 5 pageSheets + new `pageSheetSwipe.guard.test.ts` |
| G2 | `38468b5` | **`SheetPull` primitive** + 14 behavioural tests + `sheetPull.guard.test.ts` |
| G3 | `4f941d0` | **Report adopts** (the flagship) + new `useKeyboardVisible` hook |
| G4 | `4de56ef` | FlagDetail adopts |
| G5 | `f1a7c3a` | Legend adopts |
| G6 | `6153ed9` | Zoom floor `minZoomLevel/minZoom = 3` on both maps (Q1) |

## The rulings, as built
Q1 min-zoom floor **yes**, no ceiling · Q2 rotate/pitch **kept** · **Q3 = option A** (amend + primitive) · Q4 haptic **yes, with one honest deviation — see below** · Q5 pageSheet ride-along **yes, and wider than asked**: Privacy and Terms are the same class as Resources/How-to-help, so all five got it rather than leaving two sheets behaving differently · Q6 drawer **deferred** · Q7 `keyboardDismissMode="on-drag"` **yes** (Report and FlagDetail) · Q8 web **no** (`SheetPull` passes children through) · Q9 v1 scope **Report + FlagDetail + Legend**; address search, saved places, filter presets and the shared `Sheet` primitive deliberately left for after the device pass.

## Deviations from the spec — stated, not buried

1. **Haptic fires at COMMIT, not at threshold-crossing.** The spec proposed a tick when the drag first crosses into the commit zone. Detecting that requires `rawY.addListener` on a **native-driven** value, which pushes ~60 bridge events per second during the drag — exactly the cost the native driver exists to avoid, on the sheet most likely to be open while flags are loading. It fires on commit instead. Recorded in the code comment; the device pass can say whether the crossing tick is worth buying back.
2. **`showGrabber` prop dropped from `SheetPull`.** It would have rendered the pill *outside* the glass card (above it, on the scrim). Each adopter renders `<SheetGrabber />` as its own first child inside the card instead — one line per sheet, correct placement.
3. **Five pageSheets, not three** (see Q5 above).
4. **`atTop` is state, not a ref.** The spec proposed a ref read at arm-time; RNGH's `enabled` prop must re-render to change, so a ref would never have disarmed the handler. It only ever sets on a *transition*, so a long scroll costs one render at the top edge and nothing after.

## Guards added (all verified non-vacuous by breaking them and watching them fail by name)
- `pageSheetSwipe.guard.test.ts` — parses the pageSheet census from source (so a future sheet joins automatically): opts into the swipe · routes through `onRequestClose` · **keeps a labelled Close**. Proved by deleting the prop from TermsScreen → failed with file and line.
- `sheetPull.guard.test.ts` — threshold sanity bands · reduce-motion branch · motion tokens over bare durations · native driver · two-way ADOPTERS census · same-handler law · **no adopter traded its close button**. Proved in both directions: an undeclared adopter and a deleted "Cancel and close" each failed by name.
- `dismissalStandard` law **F2** (new) — the map estate admits no gesture handler of any kind, asserted independently so a future sheet amendment can't dilute it.

## The law-F amendment, in full
Old: *"swipe stays UIKit-only — no custom gesture code anywhere."* New: `PanResponder` / `GestureDetector` / `Swipeable` stay banned **everywhere including the new file**; `PanGestureHandler` is banned everywhere **except `src/components/ui/SheetPull.tsx`**; the map estate is separately locked by F2. Drain discipline: a second importer fails the sweep. The docblock cites Sky's sign-off and this folder.

## ⚠️ What is NOT proven — the device pass
Every test above is a wiring and decision guard. **None of them can prove feel, and a simulator lies about touch.** Nothing here should be called shipped until Sky runs the checklist in `INTEGRATION-MAP.md §5`. The rows that matter most:
- **Report: drag from the top vs. drag mid-form.** The make-or-break rule. Mid-form must scroll, every time.
- **Report with the keyboard up:** first drag drops the keyboard, second dismisses.
- Threshold feel: the 120pt floor on the short anonymous form vs. 30% on the tall signed-in form; flick velocity; spring-back.
- **Nearby:** the old resist-then-close jank is gone and the drag now tracks the finger.
- FlagDetail with a child modal open — the pan must not fire underneath it.
- VoiceOver escape scrub on all three adopters; TalkBack on Android for Tier 2.
- Real pinch: focal point under the fingers, pan→pinch mid-gesture, and the new zoom floor at level 3.

## Repo state
Working tree clean apart from this run's own design-review artifacts. `main` untouched. No push.
