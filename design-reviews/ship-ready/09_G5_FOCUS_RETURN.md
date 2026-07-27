# SHIP-READY Phase 3 — 09 · G5 focus-return: what shipped, what the skeptics caught

**Date:** 2026-07-27 · **Provenance:** Opus 5, ultracode max effort (build + 3-lens adversarial verify)
**Status:** ✅ built · ⚠ one item deliberately SURFACED, not fixed · device proof outstanding

---

## What shipped — 3 adoptions, not 4

`useSurfaceTrigger()` in `src/lib/accessibility.ts`, additive, no provider. Adopted on
**NearbyFlagsModal → ReportFlagModal → LegendModal**, in Sky's picked order.

| Commit | Item |
|---|---|
| `1d8237c` | the hook + 10 unit tests |
| `cf0aff9` | `PressableScale` forwards a ref (the primitive IS the button; wrapping in a `<View>` would break on Android, whose view-hierarchy optimizer deletes layout-only Views) |
| `47a4810` `4e8e229` `4e653cc` | Nearby · Report · Legend |
| `0e27df2` | guard assertion **J** |
| `2129fbe` `65dd85e` `dfebc65` `b9a74a8` `79c1b86` | the adversarial-pass fixes below |

**FlagDetailModal was re-deferred with its reason** (Sky's call, §SKY-3h). All four of its openers are
already focus-managed or unmount their own trigger: the pin callout closes when the sheet presents · the
Nearby row path deliberately leaves the list mounted so the platform already restores · TasksScreen's card is
a `React.memo` row in a virtualized `SectionList`, where one shared ref is won by the last-mounted card ·
ProfileScreen's `handleDetailClose` **reopens** the list modal, which runs its own `useFocusOnOpen`, so a
restore would fight it. Guard J pins the count at 3 with those reasons in the test, so raising it to 4 means
answering them. Census `06 §3` reports **3 adopted / 1 re-deferred with reason / 27 remainder** — a counted
residue, never a green.

---

## The adversarial pass earned its cost

Three independent lenses (correctness · regression · accessibility) reviewed the shipped diff. **All three
converged on the same high-severity defect, and it was mine** — the design I approved shipped it.

### FIXED · `release()` returned focus at close INTENT (`2129fbe`)

`release()` called `restore()` synchronously from the opener's `onClose`, beside the `setState` that closes
the surface — so the focus call was dispatched before React had committed `visible=false`, let alone before
the native Dialog was torn down. That breaks the law stated in the hook's **own docblock**, and because
`release()` is the only path on Android, the cursor was left stranded exactly where G5 exists to stop it
being stranded — with every jest gate green, because jest only proves the call happened.

The docblock also claimed this was "the same split as the drawer's `releaseDrawer`". **False:**
`releaseDrawer` runs from the exit-animation *completion* callback; `useFocusOnOpen`, the other in-repo
precedent, defers 150ms. G5's non-iOS path waited zero frames while citing both.

Now: `release()` is **Android-only** (iOS and rn-web both fire a real `onDismiss`, and firing early consumed
the armed latch and made the correct event a no-op), and on Android it defers by `ANDROID_DIALOG_EXIT_MS`,
superseding any pending wait and cleared on unmount. Tests assert the deferral is *real* by advancing 319ms
and expecting no focus call.

### FIXED · guard J's mirror hole (`65dd85e`)

J's reverse check keyed on `onDismiss`, so it caught an adoption dead on Android but was blind to the exact
mirror — hook + ref + `register()` + `release()` but **no** `onDismiss`, dead on iOS *and* web. It also only
read the openers named in `FOCUS_RETURN`, so a trigger in TasksScreen or ProfileScreen was invisible. New
check **(c)** counts `= useSurfaceTrigger` call sites repo-wide; every one must be a declared opener and the
count must equal the declared surfaces. Proven non-vacuous against both regressions.

### FIXED · the screen-reader auto-open had no focus return (`dfebc65`)

The **one Nearby session every screen-reader user is guaranteed to get** was the one session G5 did not
cover: the auto-open has no press, so `register()` never ran and `restore()` early-returned. The C3 commit
had described this as the armed latch correctly preventing a stale-handle steal — true, and a coverage gap
reported as a safety property. Now armed explicitly. `useSurfaceTrigger` also memoizes its return object, so
consumers can depend on it (caught because the warning count moved 79 → 80).

### FIXED · two tests that were not testing (`b9a74a8`)

`drawerTrigger.test.tsx`'s "a working handle IS recorded" asserted `.not.toBeNull()` on a value that is
`undefined` under react-test-renderer — **vacuous**, so the drawer's handle capture had no coverage at all.
And `useComments.test.ts` carries an intermittent load-timing flake (13 `waitFor`s on a 1000ms wall-clock
budget in a file measured at 9.3s under a full parallel run) — one reviewer hit it while four of my own runs
came back clean. The honest gate statement for this branch *was* "170 suites, one intermittent pre-existing
flake", not a flat 0 failed. Both fixed; it is now actually 0 failed.

### FIXED · doc truth (`79c1b86`)

The "17 ref-less call sites" figure was stale (**14** — three now carry refs) and had already travelled as
fact. Plus a `newArchEnabled` warning: on Fabric, RN's modal already saves and restores accessibility focus,
so flipping that flag would put two competing focus commands milliseconds apart and silently invert
`markHandoff`.

---

## ⚠ SURFACED, NOT FIXED — the Report submit handoff

**The finding (2 of 3 lenses):** `reportTrigger.markHandoff()` on the submit-success path suppresses the
focus return unconditionally, and it hands off to `LiveStatusRegion` — a `polite` live region that **never
takes focus**. So after a successful report nobody owns the cursor: the user gets an announcement instead of
a deterministic WCAG 2.4.3 destination, and if VoiceOver drops that announcement (it is posted during a
screen change, the classic case where iOS swallows `announceForAccessibility`) they get neither.

**Why it is not fixed here, and not just deferred:**

1. **PROTECT-18 / SEAM.** The clean fix is `announceForAccessibilityWithOptions(msg, { queue: true })` plus
   the return — which edits `LiveStatusRegion`, whose announce law is byte-preserved and which belongs to the
   in-flight **R2 BP12** train. Two trains reworking one surface is exactly what the seam rule forbids.
2. **Half the original objection is already gone.** One lens argued the suppression's rationale was
   impossible on Android/web because `release()` ran *before* the announcement posted. After `2129fbe` that
   is no longer true — the Android restore now defers past the exit, so the announcement posts first on every
   platform. What remains is a genuine trade-off, not a contradiction.
3. **It is a taste/judgment call on assistive-tech behaviour**, and which is better — a heard confirmation or
   a known cursor position — is a listening judgement on a device, not something jest or a reviewer can
   settle from source.

**Route:** device row **D-B15** below, plus a fork for Sky if the device pass shows the announcement being
dropped. The comment at the `markHandoff` site also misstated its own timing ("as the sheet slides out") —
the conclusion survives but the mechanism does not; corrected in `2129fbe`.

---

## Device rows this adds (the standing list ends at D-B12)

| ID | Check |
|---|---|
| **D-B11** | Focus return on all 3 surfaces × every dismissal path (close button · two-finger-Z scrub · Android back): the cursor lands **on the trigger**, not the screen root. Also the one thing guard J cannot see — that each `release()` is wired to *its own* surface's `onClose` (presence is checked; placement is not) |
| **D-B13** | `onDismiss` actually fires for Nearby's **pageSheet** on iOS — the drawer only proves `overFullScreen` |
| **D-B14** | Our restore **wins the race** against UIKit's own post-dismiss VoiceOver restoration. The load-bearing unknown: nothing off-device can answer it |
| **D-B15** | Report submit-success — is the "Report filed" announcement **heard in full**, and does the cursor end somewhere sane? This is the SURFACED finding's decider |
| **D-B16** | TalkBack on Android: after the 320ms exit wait, does focus land on the trigger? The deferral is a *bound on someone else's animation*; only a device says whether 320 is enough |
| **D-B17** | The screen-reader **auto-opened** Nearby session (`dfebc65`) — dismissing it returns the cursor to the List FAB |

**Honesty:** rn-web stubs `setAccessibilityFocus` to an empty body and drops `accessibilityViewIsModal`, so
**this entire work item has zero web-observable delta.** Every gate here proves the call was made with the
right handle at the right moment — nothing more. Its first real proof is Sky's device pass.

**Gate at this stop:** typecheck 0 · lint 0 errors / 79 warnings · jest **170 suites / 2338 passed / 0 failed
/ 84 todo** · `GlassSurface.tsx` 0 changed lines · box-none 6 sites · drawer contract untouched.
