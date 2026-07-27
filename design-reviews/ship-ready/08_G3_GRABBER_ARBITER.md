# SHIP-READY Phase 3 — 08 · G3 pageSheet grabbers: THE ARBITER RAN FIRST

**Date:** 2026-07-27 · **Provenance:** Opus 5, ultracode max effort · **Status:** ⏸ **STOP — awaiting Sky's pick**
Proof set: `tools/shipready-grabber-stacks.json` · Raw output: `assets/arbiter/g3-grabber-run.txt`
Shipped-set re-run: `assets/arbiter/shipped-sets-rerun.txt` (**all four exit 0, ALL PASS**)

---

## The headline: this stopped being a taste call

03 §3 G3 said "add a grabber to the 3 pageSheets, reuse `ui/Sheet`'s pill verbatim". Phase 2 refused to build it
(J2-12) because that pill is `color.borderStrong`, declared in **zero** of the 19 existing proof sets, and an
indicative composite put it around 1.0–1.2 against a 3.0 floor. This run replaces that estimate with numbers, and
the numbers decide the ink:

**`color.inkGlassMuted` is the ONLY candidate that clears 3.0 on all five surface variants in both modes.**
Worst case **4.81:1** (light) / **5.43:1** (dark). It is also already the arbitrated chrome-glass ink on two of
the three surfaces (`ResourcesScreen.tsx:152` records 4.81 light / 5.43 dark for its close-X), so this is
consistency, not a new invention.

What is left for Sky is **not** which colour. It is **whether the grabber ships at all**, and **where it sits on
Nearby**.

## What the arbiter found — worst case per candidate

| Ink | chrome glass | chrome +RT | bulk glass | bulk +RT | Nearby's opaque header | verdict |
|---|---|---|---|---|---|---|
| **SHIPPED `borderStrong`** `#d0d4dc`/`#444` | **1.01** / **1.04** | **1.13** / **1.48** | **1.05** / **1.25** | **1.19** / **1.57** | **1.49** / **1.71** | ✗ FAILS everywhere |
| **A · `textSubtle`** `#707070`/`#8a8a8a` | **2.70** / **2.94** | 3.77 / 4.17 | 3.50 / 3.52 | 3.95 / 4.43 | 4.95 / 4.81 | ✗ fails the one that matters |
| **B · `inkGlassMuted`** `#414B5A`/`#B8BEC9` | 4.81 / 5.43 | 6.71 / 7.70 | 6.24 / 6.51 | 7.04 / 8.19 | 8.83 / 8.90 | ✓ **PASSES all ten** |
| *reference: shipped close-X* `#333`/`#ddd` | — | — | 8.93 / 8.94 | — | — | ✓ reproduces known-good |

*(light / dark · min 3.0 · worst-case backdrop chosen by the script from the ratified wave1 base sets — `#000`,
`#D92D20` (a sev-5 pin under the sheet), `#0B3D8F`, `#fff`. "+RT" = reduce-transparency on, which the user can
flip at any time, so both variants must clear.)*

The **reference row is the manifest's own self-check**: it reproduces the shipped close-X result exactly, so a
failure elsewhere in the table is a real finding rather than a broken proof set.

### Two corrections this run forces

1. **Nearby's opaque header does NOT rescue the shipped ink.** Phase 2 correctly found that Nearby's
   `styles.header` paints opaque `color.surface` over the bulk fill, and framed that as "a solid-chrome option
   the other two lack" — which reads as though `borderStrong` might be viable *there*. It is not: **1.49:1**
   light / **1.71:1** dark. Solid chrome is a *placement* option, not an ink rescue. The fork is still real; it
   just no longer touches the colour decision.
2. **Candidate A misses by a hair, on exactly the surface that counts.** `textSubtle` clears every variant except
   full-transparency chrome glass — 2.70 light / 2.94 dark, i.e. **0.30 and 0.06 short**. That is the default
   state of two of the three sheets. A "lighter, subtler grabber" is therefore not available at this floor.

---

## ⏸ THE FORK — Sky decides. No code was written.

### Decision 1 · Does the grabber ship?

Honest framing, because this cuts against the arbiter's tidiness: **iOS's own system grabber deliberately sits
around 1.3–1.6:1** — a pale gray bar on a pale sheet. Apple treats it as decorative, and so does this codebase
(`ui/Sheet.tsx` marks the pill `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`).
All three sheets also carry a **visible Close button**, so the grabber is never the only way out. So whether
WCAG 1.4.11 even applies is genuinely arguable, and 3.0 is the floor **this house** applies to sibling chrome
affordances rather than a citation anyone could hand you.

| Option | What ships | The case for it | The cost |
|---|---|---|---|
| **B-INK (recommended)** | grabber on all 3, ink = `inkGlassMuted` | Passes 3.0 with margin in both modes and both transparency states; reuses the ink already arbitrated on two of these three surfaces; the affordance becomes visible to low-vision users instead of decorative-in-practice | **Darker than platform convention.** It will read as a more deliberate, higher-contrast bar than the iOS system grabber. That is a real aesthetic change, not a neutral one |
| **CONVENTION** | grabber on all 3, ink = shipped `borderStrong` | Matches iOS exactly; the grabber is genuinely redundant (visible Close on every sheet) and already hidden from assistive tech, so 1.4.11 is arguable | Ships a 1.0–1.7:1 element on a train whose PROTECT list includes a WCAG 2.2 AA floor. Needs an explicit, recorded "this is decorative and redundant" ratification from you — I will not assume it |
| **NO-GRABBER** | nothing; the 3 sheets keep Close + the platform swipe | Zero risk, zero new pixels; swipe-to-dismiss still works on a pageSheet without a visible grabber, and D-B3 already device-checks that | The sheets stay slightly less obviously draggable than platform peers. 03 §3 G3 goes unclosed (recorded as a deferral, not a silent drop) |
| **PER-SURFACE** | A on the two solid/RT-safe spots, B on chrome glass | Lightest bar that clears everywhere | Two inks for one affordance — a fork with no user-visible benefit. **Not recommended** |

### Decision 2 · Where does Nearby's grabber sit? *(only if a grabber ships)*

Both placements pass with the arbitrated ink, so this is purely visual:

- **INSIDE `styles.header`** (opaque `color.surface`) → 8.83 light / 8.90 dark. Crispest, and it reads as part of
  the header block. The grabber sits *below* the sheet's true top edge.
- **ABOVE the header** (on bulk glass, matching the other two sheets) → 6.24 / 6.51. Consistent with
  Resources/HowToHelp; the grabber sits at the sheet's actual top edge, which is where the platform puts it.

**Recommendation: ABOVE the header** — platform-correct position, consistent across all three sheets, and 6.24
is not a close call. The solid-chrome option exists and is worth knowing about, but consistency wins here.

---

## What happens next

- **If B-INK:** the change is `ui/Sheet.tsx`'s `handle` style plus a `showHandle` pass on the three sheets, and it
  ships **with** this proof set re-run to exit 0 and the four shipped sets unchanged. `ui/Sheet`'s pill is shared,
  so changing it moves the Tasks filter sheet too — that surface belongs to the **device-tune** train, so it gets
  a SEAM note and a before/after re-render rather than a silent ride-along.
- **If CONVENTION or NO-GRABBER:** no code. The decision is recorded in `DECISIONS.md` and G3 closes as
  *ratified-as-is* or *deferred-with-reason*. Either is a legitimate close; neither is a silent drop.
- **Either way** this file and the banked arbiter output stay as the record, so nobody re-derives 1.01:1 by eye.

**Nothing in this document was applied, and no token was changed.** `GlassSurface.tsx`: 0 changed lines.
