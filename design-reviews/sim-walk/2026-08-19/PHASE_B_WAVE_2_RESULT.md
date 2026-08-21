# PHASE B — WAVE 2 RESULT: the High findings

**Brief:** `PHASE_B_WAVE_2_HIGH.md` · **Plan:** `PHASE_B_MASTER_PLAN.md` (48 findings, 4 waves)
**Date:** 2026-08-20 · **Branch:** `fix/simwalk-w2-high-2026-08-20`, branched off the Wave 1 tip `d2da5a5`
**`main` was not touched.** Seven commits, not merged. **Sky merges.**

| Finding | Outcome |
|---|---|
| **SW-01** + **SW-02** (SignIn half) | ✅ **FIXED — measured on device** |
| **SW-28** | ✅ **FIXED — reproduced live pre-fix, verified live post-fix** |
| **SW-37** + **SW-11** | ⚠️ **FIXED FOR SIGNED-IN USERS ONLY** — per Sky's decision; **not closed for guests** |
| **SW-42** | ⚠️ **PARTIAL** — the content loss is fixed; the undersized-card height is **not explained** |
| **SW-45** | ✅ **FIXED** — per Sky's "all sheets clear the tab bar" |
| **SW-52** (privacy) | ✅ **FIXED** — Sky approved before any edit |
| **SW-31** | ✅ **FIXED** — the false half only; SW-48's correction respected |
| **SW-23** | ⛔ **DELIBERATELY NOT FIXED** — needs real VoiceOver on a device |

---

## STEP 0 — the gate baseline, pinned before the first edit

Measured on the Wave 1 tip, not taken on trust.

| Gate | Baseline @ `d2da5a5` | Final | Δ |
|---|---|---|---|
| `npm run typecheck` | **0 errors** | 0 errors | — |
| `npx jest --ci -w 3` | **210 suites · 3079 passed · 32 todo · 0 failed** | **215 suites · 3118 passed · 32 todo · 0 failed** | +5 suites, +39 tests |
| `npm run lint` | **0 errors / 78 warnings** | 0 errors / 78 warnings | — |

The +39 are exactly the tests added by this wave (5+6+9+6+9+4). **No pre-existing test was lost and no warning count moved.** `prettier --write src` was never run.

Every new suite was verified as a **real regression detector** by running it against the pre-fix source. Assertions that pass both ways are non-vacuity or must-not-regress checks and are labelled as such in each file.

| Suite | vs pre-fix |
|---|---|
| `bottomInsetSafety.guard.test.ts` | 3 of 5 fail |
| `MapScreen.detailFocus.test.tsx` | 5 of 6 fail |
| `ReportFlagModal.test.tsx` (SW-37/SW-11) | 3 of 6 fail |
| `ReportFlagModal.test.tsx` (SW-52) | 2 of 3 fail |
| `sheetBodyScrolls.guard.test.ts` | 7 of 9 fail |
| `ErrorBoundary.fallbackCopy.test.tsx` | 2 of 4 fail |

---

## CLUSTER 1 — SW-01 + SW-02 · **commit `c0d3e8f`**

The Apple 1.2 UGC consent row was the last child of SignIn's ScrollView. At rest, signed out:

| Device | consent row | privacy link |
|---|---|---|
| 17 Pro Max (956pt, boundary 922) | y948–993 — below the fold | ends y929 — 7pt into the inset |
| 17e (844pt, boundary 810) | y933–978 — **fully off-screen** | y869–914 — **fully off-screen** |

The screen's own comment says consent "must be visible where the account is created". A line you must scroll to does not satisfy that, it got strictly worse as the screen shrank, and App Review walks this surface signed out.

**Fix:** both policy links moved OUTSIDE the scroller into a pinned footer that carries the home-indicator inset. Nothing above them can push them down, at any screen size or Dynamic Type size. Reading order is unchanged — still the last two elements, still below the two trust lines (PROTECT-11 holds, and its assertion still passes).

**SW-02** is the same defect one file over: `OnboardingCards`' decline link carried `marginBottom: 28`, a hardcoded guess 6pt short of the 34pt home indicator. 956 − 28 = 928, exactly where the walk measured its bottom edge. Its sibling action row three lines above already derived its pad from `insets.bottom`; this was the last hardcoded number in the family. 28 stays as the no-inset floor.

> **SW-02 is only half done.** The brief scopes SW-02 as a Wave 4 Low with two halves — onboarding cards 3+4 **and** the SignIn bottom links. Both are fixed here because they shared SW-01's root cause. Nothing else in the SW-02 class was swept.

## CLUSTER 2 — SW-28 · **commit `8e4871f`**

**Reproduced live before touching anything**, on the 17 Pro Max, by censusing every marker frame either side of the tap:

```
before   Broken sidewalk [201,472]   No ramp [350,69]   Steep grade [482,652]
after    Broken sidewalk [201,472]   No ramp [350,69]   Steep grade [482,652]
```

Byte-identical. No pan, no zoom — despite the move requesting `latitudeDelta: 0.005` from a city-wide view.

**Cause.** On the Map tab the camera move ran inline, in the same tick as `onClose()`. On iOS a full-screen RN `Modal` detaches the presenting view controller's view, so MKMapView drops `animateToRegion` on the floor, silently.

The walk had already isolated this to one call site. What it did not have was **why the other three work**: the Tasks card, Profile, and the deep link all run their move from a route-param effect AFTER arrival — after the sheet is gone. The fix is not a different `animateTo`, it is the same one at the moment the working paths already use. `FlagDetailModal` now forwards `Modal.onDismiss` (the dismissal-COMPLETE event, iOS-only by RN design — and iOS is exactly the platform that detaches); MapScreen records the intent on tap and spends it there, exactly once. The marker highlight stays eager: it is plain state, it survives the dismissal, and deferring it would trade one silent no-op for another.

## CLUSTER 3 — SW-37 + SW-11 · **commit `21d6eea`**

Deny location and the app's core action ended. "Waiting for location…" forever — true while the request is in flight, false the moment the user says no — and Submit disabled no matter how completely the form was filled.

**The finding's framing needed one correction.** Manual pin placement was **not missing**. A long-press on the map has always dropped a report pin (`dropLocation`, wired since before this walk). What was missing was any affordance pointing at it, so from inside the sheet — where the user is actually stuck — it may as well not have existed.

- **SW-11** — a denial is a settled answer, so the sheet says "Location is off for Flagstone". The honest in-flight "Waiting for location…" survives for when it is true.
- **SW-37** — "Place the pin on the map" hides the sheet, puts a crosshair at the map's centre with Cancel / "Put the pin here", and brings the sheet back with that coordinate filled in. `PlatformMap` gained a read-only `getCenter()` (native reads `getMapBoundaries`, which this file already trusts for viewport questions; web reads Leaflet's centre) — the map stays deliberately UNCONTROLLED, so nothing fights a gesture mid-pinch. A map that cannot answer leaves the location alone rather than guessing: a wrong pin is worse than no pin.

The round trip is **not** a cancel — the sheet is hidden without running `onClose`, so the draft survives, and it stays clear of the SW-52 reset by construction.

> ### ⚠️ SW-37 IS NOT CLOSED FOR GUESTS — and this is a decision, not an oversight
> The affordance is gated to signed-in users, mirroring `handleMapLongPress`' existing `if (!authUser) return`. **Sky decided this today** when I surfaced it: with GPS you can only report where you ARE; with manual placement you can report anywhere, and that is a different privacy question.
>
> **The reason it needed a decision at all is a finding in its own right.** That gate is annotated `// Jordan Condition 2: guests cannot create reports.` — and the shipped app contradicts it flatly. `isAnon = !user`, the sheet titles itself "Report anonymously", the button reads "Submit report anonymously", and the in-app Privacy Policy says in as many words: *"You can browse the map and submit barrier reports anonymously."* The comment was left in place rather than silently corrected, because which one is wrong — the comment or the gate — is Sky's and Jordan's call, not a fix's. **SW-37's headline is "anonymous report dead-ends", and for anonymous users it still does.**

## CLUSTER 4 — SW-42 + SW-45 · **commit `1810475`**

The family is Recipe F: `backdrop(flex:1) → KAV → cardWrap → card`, cap on the KAV (G6/SR-099), card free to `flexShrink` into it. The shrink is deliberate. What it means — and what two sheets forgot — is that the card is not guaranteed to be as tall as its content, and the card also sets `overflow:'hidden'`, so what does not fit is **clipped rather than scrolled**.

**The reference settles it.** `FeedbackModal` is Recipe F's pinned reference and carries the *same* four-layer stack including `cardWrap`. It never clipped, because its body is a `ScrollView` with `flexShrink: 1`. So this is the house pattern, applied to the two sheets that skipped it — not a new one.

That also explains why the two broke differently: C11's states live inside a `FlatList` (empty via `ListEmptyComponent`) and a FlatList scrolls, so it degraded; C12's empty state was a bare `<View>`, so it lost content outright.

**SW-45**, per Sky's decision that every sheet clears the tab bar: the leaderboard ran flush to the screen bottom and painted list rows over a ghosted "Home / Tasks / Profile" with the red Tasks badge showing through, while its four siblings stopped above the bar. Its card now reserves the tab bar height, read through `BottomTabBarHeightContext` with a fallback rather than `useBottomTabBarHeight()`, which throws with no navigator — the same reason this file already reads its insets that way.

> ### ⚠️ SW-42 IS PARTIAL — what I could not explain
> The **content loss is fixed**: C12's instruction line can no longer be clipped, at any card height.
>
> **Not fixed, and not explained:** why C11's card resolves to **500pt** when its cap allows 813, and C12's to **352pt**. C12's card measured 354pt on the 17e against 352pt on the Pro Max — essentially constant across a 112pt difference in screen height, which the brief correctly reads as a fixed/collapsed height rather than a mis-evaluated percentage. I chased it through the KAV cap, `cardWrap`, the percentage-resolution rule, and `GlassSurface`, and did not isolate it.
>
> **I could not measure it either: both sheets are behind auth, and an agent may not enter a password.** I did measure the same Recipe F stack on a guest-reachable sheet (`AddressSearchModal`), which showed the card sitting 34pt shorter than its wrapper with the keyboard up — the same shape, much milder. That is suggestive, not conclusive.
>
> Making the card claim its full cap is a one-line change (`flexGrow: 1` on the KAV, which `maxHeight` then clamps to exactly 85%), but it would fix every sheet in the family to a constant height, including short ones. That is a visual-design decision on two sheets I cannot see, so I did not take it. **Recommend it be re-measured on device before anyone changes the height.**

## CLUSTER 5 — SW-52 (privacy) · **commit `3455d0f`** · Sky approved before any edit

The modal is a persistent `visible`-prop component — it never unmounts, so every field survives a close. `reset()` only ran after a SUCCESSFUL submit, and said so in its own comment, so cancelling left the whole form loaded for the next session. Photos included. A user can attach something personal, think better of it, cancel — and have it published anyway, attached to a report they filed somewhere else.

**Fix:** reset bound to the explicit cancel doors only — the Cancel button, `onRequestClose`, the accessibility escape, and the pull-to-dismiss. Deliberately **not** bound to visibility or `onDismiss`, because three paths hide this sheet and all three must keep the draft:

1. a **failed** submit, so a network blip doesn't cost the user their photos (verified by test);
2. the **"Sign in" handoff**, which saves the draft and announces that it kept it (existing tests still pass);
3. the **SW-37 pin round trip**, which never closes at all.

Two comments were rewritten rather than left to regenerate the bug: `reset()`'s "only runs after a successful submit", and the pull-to-dismiss rationale, which justified its gating with *"a dismissed draft is not lost either way"*. That is no longer true — and it **raises** the stakes on those gates rather than lowering them, which is worth saying out loud: an accidental dismissal now costs real work.

## CLUSTER 6 — SW-31 · **commit `d5b5c76`**

The screen-level fallback read *"You can try again, or switch to another tab and come back."* That is advice to walk into the same wall — when the crashing state lives above the boundary (SW-47 was exactly that), the other tabs are already dead too. It now reads *"You can try again. If it keeps happening, close and reopen the app."*, the same honest fallback the app-level string beside it already gave.

**The recovery path was not touched.** SW-48 corrected SW-31's other half by showing a clean one-tap recovery, twice, under auth. The premise did not hold, so the new suite asserts "Try again" is still offered rather than removing it.

---

## THE THREE HOUSE GUARDS THIS WAVE COLLIDED WITH · **commit `694b903`**

Each fired on a **real** interaction, so each was reconciled by teaching the guard the new fact — never by loosening it.

| Guard | Collision | Resolution |
|---|---|---|
| `sheetPull.guard` | pinned the literal `onDismiss={onClose}`; after SW-52 the surface's own close path is `handleCancel`, and `onClose` alone is now the *incomplete* door | `ADOPTERS` gained an optional `closeHandler`; a named wrapper passes **only** if it is a real function in that file that calls `onClose()`. The bespoke inline arrow the rule was written against still fails. **Strengthened.** |
| `dismissalStandard.guard` rule J | nothing may carry `onDismiss` without a declared focus-return contract; SW-28's is a **camera-timing** hook | Declared in `FOCUS_RETURN_EXEMPT` with the boundary written out, claiming nothing about focus return. The scan reads the real RN prop on the Modal tag, so renaming could not dodge it — and should not; it is right to read that. |
| `bp3TrustEngineGuards` T4 | counted "9 chipPressed of 10 Pressables" as literals, so SW-37's new control failed it **even though correctly treated** | Count now derived from the Pressable census, which is what the rule always meant: no control on this surface answers the finger with nothing. |

---

## SIMULATOR RE-WALK

**Build:** `npx expo run:ios --configuration Release --no-bundler` on iPhone 17 Pro Max (`1AFA3DED…`), from the branch. **`Build Succeeded`**, same sim-release type as the walk.

### ✅ SW-01 — verified and MEASURED

Reinstalling cleared the session, so the app launched straight onto SignIn signed out — the exact surface and state App Review sees.

Both policy lines are **visible at rest, without scrolling**: "Privacy Policy" and "By creating an account you agree to the Terms & Community Guidelines."

Measured from the full-resolution screenshot: **the lowest text pixel sits at point 913.3, against the 922 safe-area boundary** — 8.7pt inside it. Before the fix the consent row ran y948–993 and the privacy link ended at y929.

### ✅ SW-28 — verified, with a deliberately unambiguous before/after

The first attempt was **not diagnostic and is not being counted**: I opened the sheet from a pin the map was already centred on, so a working camera move had nothing visible to do, and the callout that appeared afterwards may simply never have closed. Worth recording, because that null result would have read as a failure.

So the map was pinched out to a city-wide view first, and the sheet opened from *that* state. A working focus then has to travel.

| | evidence |
|---|---|
| **before** — city-wide: cluster badges "4" and "2", Kelowna General Hospital, Okanagan College, Capri Centre Mall | `shots/wave2-verify/SW28_before_wide_city_view.png` |
| sheet open over that wide map | `…/SW28_detail_sheet_over_wide_map.png` |
| **after** "View on Map" — street level: Martin Ave, Lawson Ave, Urban Massage Therapy, KSAN Kelowna, Knowles Heritage Park; the "Blocked path" pin centred **with its callout open** | `…/SW28_after_focused_with_callout.png` |

That is exactly `animateTo({ latitudeDelta: 0.005 }, { calloutClear: true })` followed by `showCallout` — and exactly what did not happen before the fix, where every marker frame was byte-identical either side of the tap.

**Also confirmed in passing:** Wave 1's SW-46 fix is live — the detail sheet renders History and Report, both reachable.

### ⚠️ Declared limits of this walk — read these before trusting the table above

- **The 17e is not yet re-verified.** SW-01's *worst* case is the small screen (both elements entirely off-screen), so this is the most valuable check still outstanding. Its first build wedged the machine and was killed; a clean rebuild is running.
- **The simulator subsystem wedged mid-walk and needed manual recovery** — worth recording for the next run. Two booted simulators plus a native build plus the sim MCP's video stream drove load average past 500 and left **267 CoreSimulator processes**, several at 60–144% CPU; `simctl` itself timed out at 240s while `git` stayed instant, which is how the fault was localised. Recovery was `killall Simulator` + `killall -9 com.apple.CoreSimulator.CoreSimulatorService` (267 → 5 processes, `simctl` back to 1.5s). **Build for one simulator at a time, and detach the video stream first.**
- **Guest only.** The app was signed out and an agent may not enter a password. That leaves **SW-42, SW-45 and SW-52 unverifiable by me on device**: the profile sheets and the leaderboard are behind auth, and the photo picker is signed-in only ("Sign in to add a photo"). All three are covered by tests proven to fail against the pre-fix source, which is evidence about structure, not about pixels.
- **SW-37's new control is signed-in only**, so it is also unreachable from a guest session — by design.
- **SW-31 was not triggered on device.** Forcing a render crash in a release build is not something I can do without shipping code to do it.
- **WebDriverAgent did not survive the reinstall**, and its build artifacts lived in an earlier session's scratchpad which has since been cleaned. The pre-fix SW-28 reproduction used it; afterwards I fell back to `simctl` screenshots plus the simulator MCP for taps.

---

## DECISIONS FOR SKY

1. **Merge `fix/simwalk-w2-high-2026-08-20`** — seven commits, `c0d3e8f` → `694b903`. Gate green. Nobody else merges.
2. **The "Jordan Condition 2" contradiction.** The long-press gate says *"guests cannot create reports"*; the app, its UI copy and its own Privacy Policy all say they can. One of the two is wrong and it is not a fix's call. **Until it is resolved, SW-37 remains open for anonymous users** — the finding's own headline case.
3. **SW-42's card height** — do you want the sheets to claim their full 85% cap? It is one line, it makes every sheet in the family a constant height, and it should be re-measured on device first. I could not measure it (auth) or explain it (see Cluster 4).
4. **`FlagDetailModal` has no focus-return contract on the Map tab.** A pre-existing gap; SW-28 did not create it and deliberately did not adopt it blind, because that sheet's VoiceOver behaviour is already queued for a device pass (Wave 1, N-1).
5. **The one owed device check** — the SignIn surface on the 17e (390×844), where the consent line and the privacy link were *both* entirely off-screen before this fix.

## DELIBERATELY NOT FIXED

- **SW-23** — marked PLAUSIBLE, and the AX tree is only a proxy for what VoiceOver actually announces. The brief says not to write a fix from simulator evidence, and I did not. **Needs real VoiceOver on a device.** It sits with SW-03, SW-16 and Wave 1's N-1 in the device-only bucket.
- **SW-31's recovery path** — falsified by SW-48; fixing it would have been fixing something that works.
- **SW-42's card height** — see above.

## NEXT

Per the master plan: **Wave 3 Cluster A+B** (the nine micro hit targets, then the tab-bar a11y count) → Wave 3 rest → Wave 4. Wave 3's brief is `PHASE_B_WAVE_3_MED.md`.

**Rollback:** each commit is independent and reverts cleanly, newest first. `git revert 694b903` alone would leave three guards failing — revert it with whichever fix commit it accompanies.
