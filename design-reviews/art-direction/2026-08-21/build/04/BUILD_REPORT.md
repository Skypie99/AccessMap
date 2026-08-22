# BUILD REPORT — GSP-04 · Phase 2a · one flag family + the Tasks chrome

**Prompt:** `build-prompts/04_phase2a_flagcard_family.md`
**Branch:** `design/gsp-04-flagcard-2026-08-21`
**Base:** `fefcffc` — `main 2c631e7` + `design/gsp-02-flagdetail-2026-08-21` + `design/gsp-03-map-2026-08-21`
**Device:** iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC`, iOS 26.5, sim-Release
**Status:** built, gated, walked. STOP — Sky merges.

---

## 0. READ THIS FIRST — the base is not `main`

Prompt 04 opens with "PREREQUISITES: Prompts 00, 01, 02 merged". When this run
started, **only 00 and 01 were merged.** 02 and 03 were built and reported and
still sitting on their own branches.

Branching off bare `main` would have put this phase's rewrite of
`TasksScreen.tsx`, `hitTargetFrame.guard.test.ts` and `build/COPY_LEDGER.md` on
a base that had neither — and handed you three-way conflicts in exactly the
files 04 rewrites. So the branch starts from an integration of the series so
far. One conflict arose, in `COPY_LEDGER.md` only (both sections kept, in
numeric order); every source file auto-merged.

**Merge order is therefore 02 → 03 → 04.** If you would rather 04 sat somewhere
else:

```bash
git -C ~/AccessMap rebase --onto <newbase> fefcffc design/gsp-04-flagcard-2026-08-21
```

---

## 1. Gates

| Gate | Baseline (on `fefcffc`, before the first edit) | Final |
|---|---|---|
| `npm run typecheck` | clean | clean |
| `npm run lint` | **0 errors**, 82 warnings | **0 errors**, 82 warnings |
| `npx jest --ci -w 3` | 236 suites · 3414 passed · 32 todo · **0 failed** | 236 suites · **3447 passed** · 32 todo · **0 failed** |

No suite was deleted. The suite count is identical because one retired
(`SeverityBadge.dynamicType`, 5 tests) and one arrived (`FlagCard.dynamicType`,
26). The +33 tests are that swap plus the assertions the re-pinned guards
gained on the way.

One lint warning was introduced and removed inside the run (a `require()` in the
new test file); the final count is the baseline's.

## 2. The commits

| # | SHA | What |
|---|---|---|
| 4.1 | `427e2d9` | `src/components/ui/FlagCard.tsx` — one drawing, two densities |
| 4.2a | `0d1a712` | Home rows adopt it |
| 4.2b | `5ba89ca` | Nearby cards adopt it; PROTECT-1 label pinned |
| 4.2c | `8b0b871` | Tasks card adopts it; the action row re-ranked |
| 4.2d | `218512d` | `SeverityBadge` retired (Q20) |
| 4.3 | `f992b7b` | The Tasks chrome compacted to one row |
| 4.4 | `eb5f6c1` | The mono-space defect the simulator caught + 4 guard re-pins |
| 4.5 | `1425214` | The mono-CAP defect, the card recomposition, the sheet gutter |

Rollback is a contiguous range:

```bash
git -C ~/AccessMap revert --no-commit fefcffc..design/gsp-04-flagcard-2026-08-21
```

---

## 3. What changed, per list

### Home (`HomeScreen.tsx`)
Seventy lines of row markup become four props. The disc, both census branches,
the chevron and the composite spoken label all moved into the component
verbatim — FlagCard builds that label **by default**, which is the check that it
is the same sentence rather than a lookalike, since the call site passes none.
Five style keys and six imports retired with the markup. The "See all" link from
Phase 1a is untouched.

### Nearby (`NearbyFlagsModal.tsx`)
Same component, card density. **The visible order changes, deliberately:** the
census used to sit BELOW the description, under the thumbnail, so the line that
says what the flag IS arrived after the sentence a stranger wrote about it. It
now rides under the title.

Two things are held byte-for-byte and both are pinned in the existing test:

- **PROTECT-1's one-breath label.** This card's spoken sentence is older than
  the family's and deliberately different ("severity 2", not "severity 2 of 5",
  with the description on the end). The test now asserts the literal sentence
  AND that no second labelled node exists inside the card to split it —
  FlagCard's header summary node is opt-in exactly so this list can decline it.
- **The uncapped description.** Phase 0 item 0.2 removed `numberOfLines={2}`
  here because this list is the map's accessible equal (T4/D2). The card
  density's own 3-line rule would have quietly put that clip back, so this call
  site passes `clampDescription={false}`.

### Tasks (`TasksScreen.tsx`)
Five objects announcing one flag — amber severity pill, title, status pill,
photo, 2-line description, meta line — become the shared drawing plus one census
sentence. The status word moved into the sentence (C3) and the severity colour
is drawn once, on the disc (C2).

**The action row (F3).** It ran Verify (filled) · Resolved (neutral fill) ·
Reject (ghost) · Details (ghost): four controls in three styles, and a verb, an
adjective, a verb and a noun all dressed alike. Now one filled verb, its
siblings inside ONE ghost segmented control, and Details demoted to a text link.
Same descriptors, same handlers, same `confirm()` gate upstream, same labels and
hints.

> **A defect the test caught before the device did.** The first cut declared the
> fill on the `verify` descriptor. That is right until the flag is already
> verified — then the lead verb is Resolved, the fill sits on a control that no
> longer renders, and the card has ZERO filled controls where the rule asks for
> exactly one. "The lead is filled" is a fact about the POSITION, so the
> position now states it, and `ctaFillPressed` travels with it so Resolved obeys
> `brandInkAA` on the day it leads.

Details takes `inkSelect` from `inkDetailsGhost` — the ink every other text link
on this screen carries, and the higher-contrast of the two in **both** modes
(#0F53BE is darker than #1466E0 on the light floor; #B4CFFA is lighter than
#84AEF6 on the dark one), so the swap moves away from the mid-tone either way.

The local component is `TaskCard` now. Two `FlagCard`s in one screen — one glass
and selection and a lightbox, the other a disc and a sentence — is a name
collision waiting to be read wrong.

---

## 4. The Tasks chrome (board 09)

| | Before | After |
|---|---|---|
| control rows | 2 (search + "Select multiple"; "Filter & sort" chip + "Clear filters") | **1** (search pill · filter circle · ⋯ circle) |
| `CHROME_FALLBACK_HEIGHT` | 210 | **146** (8 + 78 + 60) |
| section header | `OPEN` + a count pill `9` | `OPEN · 9` |
| banner | one wrapping line, orphaning "4 · 433 m" | two deliberate lines; hides at ≥2× |
| cards at rest on the 17e | 1 | **2 whole, and the third begun** |

Nothing had to be invented to drop the words. "Filter & sort" was already the
title of the sheet the chip opened. "Select multiple" keeps its label, hint and
handler byte-identical as a row inside a ⋯ tool sheet — the map's tool-sheet
*recipe* (icon, label, one 44pt target per row) inside this screen's own `Sheet`
primitive, because the map's version is an overlay in its absolute stack and a
third shell here would break S5.

**The honest cost, and it is written into the guard rather than smoothed over:**
"Select multiple" is now two taps from the chrome instead of one, behind a ⋯
that does not name it. Its discoverable twin — long-press any card — is
unchanged and is how most users reach selection mode.

**Two gates the move could have dropped, and did at first:**

- The old truth table was `flags.length > 0 && !selection.active`. The ⋯ circle
  inherits the first half from the search row's wrapper; the row inside the
  sheet carries the second. Without it, a user already in selection mode could
  tap "Select multiple" again and `enterSelectionEmpty` would silently discard
  the selection they had built.
- Both rows in the sheet are conditional, so the ⋯ itself is gated on their
  union. A ⋯ that opens an empty drawer is worse than no ⋯ at all.

An active filter still cannot hide behind a closed sheet: the circle takes the
active fill AND the Clear chip mounts, now wearing the ✕ that says what tapping
it does. Clear leads the ⋯ sheet as well, for a user who went looking in the
drawer rather than noticing the chip.

The conditional Clear row is deliberately **not** in the seed height. Seeding the
filtered height would leave a 52pt gap under the chrome on every unfiltered
first paint, which is the visible jump the constant exists to prevent.

---

## 5. Guards: eight re-pinned, none deleted

| Guard | Why it tripped | How it was re-pinned |
|---|---|---|
| `flexBasisUnderLargeType` | `cardTitle` / `cardHeader` moved into the component | re-aimed at `components/ui/FlagCard.tsx`; assertions unchanged, including the `minWidth: 130` floor only the device ever found |
| `hitTargetFrame` | same header, same 44pt frame, new file | re-aimed at the same path |
| `TasksScreenFlagCard` | the composition it locked is the one that was replaced | contract re-stated for the new composition; every handler, name and hint assertion kept |
| `SeverityBadge.dynamicType` | the component retired | replaced by `FlagCard.dynamicType` (26 tests) |
| `tasksHeaderReclaim` | "Select multiple" moved again | re-aimed at the ⋯ sheet, plus the honest VoiceOver-depth note |
| `tasksFilterSheet` | the trigger became a circle; the seed changed | active ink asserted on the icon fork; seed re-pinned to 146 |
| `bp11PressVocabGuards` | the chip's hand-declared pressed fill went away | see below |
| `bp10SeverityGrammarGuards`, `announceCoverage` (SR-042), `bp3TrustEngineGuards` (T8/F4-10) | each pinned Home's or Nearby's copy of something the component now owns | re-aimed at the component **and** each gained an assertion that the screen no longer builds a second, drifting version |

Two of these are worth reading rather than skimming:

- **`bp11`** — the pressed fill did not change token. It moved from a
  hand-declared `selectEntryBtnPressed` to `PressableScale`'s own default, which
  *is* `color.borderPressed`. The law is now inherited rather than repeated, and
  what the guard asserts instead is that the control did not become a bare
  `Pressable` with an opacity dim on the way.
- **`typeBlock.guard`** — this one was a real rule violation, and it was fixed
  rather than exempted. FlagCard's row disc carried `maxFontSizeMultiplier={1.3}`,
  inherited from Home. T3 says a fixed box carries its cap WITH it, and
  `SeverityDisc` does (`DISC_MAX_FONT_SCALE`, derived from the box). The
  per-site cap was never load-bearing: above 1.5× `scaleWithType` grows the
  circle with the digit, so it only ever governed below that point, where the
  effective multiplier tops out at 1.5 and a 12pt digit reaches 18pt inside a
  24pt circle — inside the envelope `SeverityDisc`'s own docblock states.

`grep -rn "SeverityBadge" src` → **0** outside explanatory comments in the tests
that describe the retirement. `StatusBadge` survives at all six status-as-subject
call sites (admin queue, My reports, watched flags, notification preferences, and
`statusPalette` in Profile).

---

## 6. WHAT THE SIMULATOR CAUGHT — two defects the gates could not

Both are the same shape, and it is the shape this component exists to end: **one
line, two typographic rules.** A green gate means nothing about either.

### 6.1 A mono space is not a body space (`eb5f6c1`)

Built with `formatDistance`'s whole output in JetBrains Mono, which is what
board 01 draws. On the 17e every row read **"314   m"**.

One character explains it. `formatDistance` joins value and unit with U+00A0 —
deliberately, so the unit can never orphan across a wrap (F2-13) — and in a
monospace face that character takes a full character advance, roughly twice the
body face's space. Three lists showed a gap that reads as a typo.

T1 asks for mono on "every *numeral* that is data". A unit is a word and the
joiner belongs to the sentence, so `MonoDistance` puts only the value in mono.
One helper, three call sites, so the fork cannot drift apart again.

### 6.2 The numeral scaled on a different rule from its own sentence (`1425214`)

At accessibility-extra-large the Home row rendered **"Verified · 314 m" with the
314 roughly 40% smaller than the words either side of it.**

`variant="mono"` brings the mono row of `AppText`'s variant table with it, and
that row caps at 1.4 while `body` is uncapped by contract. Inside a `content`
`TypeBlock` this never surfaces — the block caps everything beneath it equally,
which is precisely what T3 is for. The **card** density had a block. The **row**
density did not, because I only wrapped one of the two.

This is SW-36's defect wearing different clothes: a digit capped at 1.6 beside a
word that was not, in a pill, is the same failure as a numeral capped at 1.4
beside a sentence that is not, in a row. Both densities now sit in a content
block, and the Tasks banner — which is chrome, not content, and caps its words
at 1.6 — states that cap explicitly on its numeral.

### 6.3 The card's recomposition did not fire, and the styles were right (`1425214`)

At the recomposition point the disc is supposed to take a line of its own above
a full-width text block. The **row** density does that with `flexWrap` plus a
100% flex basis, and on the device it works. The **card** header carries the
same shape — I probed the resolved styles rather than assuming, so this is not a
guess about which rule applied — and on the 17e it rendered the disc and the
title side by side at accessibility-extra-large.

**I could not find the reason.** So rather than ship a composition that depends
on a line-break I cannot explain, the card now STATES the recomposition: a
column of two rows, so "the disc is above the text" is structure rather than an
outcome. The trailing slot and the header accessory ride with the disc, which
keeps Nearby's distance and Tasks' selection checkmark at the top of the card
where a thumb expects them. The test pins the two shapes by `flexDirection`, so
a later "simplification" back to one wrapping row trips.

### 6.4 The ⋯ sheet's rows were not on the sheet's gutter (`1425214`)

The row's icon sat flush against the screen edge while the sheet's own title sat
16pt in. `Sheet` gutters its header and leaves its body to the content, which is
why every sibling row in the filter sheet carries `paddingHorizontal:
spacing.lg`. Mine did not.

**None of these four is reachable from a unit test.** Jest cannot measure a glyph
advance, and it renders at whatever `fontScale` the stub reports. Both suites
now pin the *properties* that produce the geometry — which node carries the mono
face, what multiplier each node resolves to, which direction the header runs on
each side of the recomposition point. That is the most a source or render test
can do, and it is the argument for the device pass rather than against it.

---

## 7. The sim walk

Light and dark × medium and accessibility-extra-large, on the rebuilt Release
binary. Captures in `after/`. Five builds in total: the base one and one per
device finding.

| Screen | Result |
|---|---|
| **Home** light/medium | one family with Nearby and Tasks. `Severity 2 · Mild · Verified · 314 m`, distance in mono, no gap |
| **Home** light/AXL | disc takes its own line above a full-width text block; census breaks before the status word; chevron dropped; search icon-only; Report becomes a round FAB; nothing clipped; the numeral now scales with its sentence |
| **Tasks** light/medium | one control row; **two cards whole at rest and the third begun** (was one); `OPEN · 9`; banner two deliberate lines; action row = one filled verb + segmented pair + link |
| **Tasks** dark/medium | the segmented hairline and the `inkSelect` link both hold on the dark floor; no ghosting |
| **Tasks** light/AXL | search icon-only; **banner stands down** as designed; disc above the text; title no longer breaks mid-phrase; description whole; Verify full-width with the segmented pair below it; nothing clipped |
| **Tasks** dark/AXL | same, and the glass card reads cleanly against the dark stage |
| **Tasks** ⋯ sheet | opens with `Select multiple` only — "Clear filters" correctly absent with no filter active, which is the gate that keeps the drawer from being empty. Its row now sits on the sheet's own gutter (a third device finding, §6.4) |
| **Nearby** light/medium | the family at card density; distances form a clean right-aligned column (`314 m · 433 m · 513 m · 560 m`) — tabular figures doing the work they exist for; descriptions uncapped |
| **Nearby** light/AXL | disc and distance on the top line, title full-width beneath, census recomposed, **description still uncapped and running past the fold** — Phase 0 item 0.2 intact |

### The pane, measured rather than asserted

The prompt asked for `onLayout`; the capture gives the same number without a
temporary instrument. Reading the chrome pane's bottom hairline out of the
before and after screenshots at the same x:

| | boundary from the top of the screen | pane, excluding the safe-area inset |
|---|---|---|
| before (`captures/17e_light_m_A4_tasks_first.png`) | **257pt** | 210 |
| after (`after/17e_light_m_A4_tasks.png`) | **193pt** | **146** |

The before capture is the calibration: the pane was the known 210, so the 17e's
top inset is 257 − 210 = 47pt, and 193 − 47 = 146 — exactly the constant's
arithmetic. The 64pt difference is precisely the filter-trigger row that went
away. Target was ≈170; it lands at 146.

## 8. COPY_LEDGER

Three genuinely new strings, all on the ⋯ tool sheet, all modelled on the map's
shipped equivalents: **`Task tools`**, **`More task tools`**, and the ⋯ hint.
Four format changes where the words are the same and the arrangement is not,
including the one place a word actually disappears (Nearby's visible census
drops "of 5" to speak the family's one sentence — the SPOKEN label is
untouched). Verbs stay `Verify / Resolved / Reject`; "Mark resolved" is banked
for your ruling with the exact edit written out.

Full entries: `build/COPY_LEDGER.md` §"Prompt 04".

---

## 9. Residuals and decisions for Sky

1. **`9 . 9 km` — the decimal point is a full mono advance.** Not a bug I can
   fix without touching a ratified rule: JetBrains Mono is monospace, so its
   period is as wide as its digits, and §T1/Q21 puts data numerals in it. The
   app already renders coordinates this way and it shipped. It only shows on
   distances ≥ 1 km (`formatDistance` uses `toFixed(1)` below that threshold
   there is no decimal). **Your call.** The cheap option, if it bothers you, is
   to leave the separator in the body face the way the unit already is — one
   line in `MonoDistance`.
2. **"Mark resolved"** — board 09 draws the segmented cell that way; the shipped
   word stands until you ratify. If you take it, the accessible name goes with
   it (WCAG 2.5.3).
3. **"Select multiple" is two taps deep now.** Recorded as an honest cost, not a
   silent one. If it should come back to the chrome, the ⋯ circle is where it
   would live as a second row of the control bar — and the pane goes back to
   ~200pt.
4. **The three new strings** (§8) need your word.

## 10. NEEDS-DEVICE

Nothing is blocked on real hardware. The simulator walk is the proof for
everything in §7; a real-device pass would add VoiceOver focus order through the
new segmented control and the ⋯ sheet, which is a Phase 3 device-gate item
rather than a Phase 2a acceptance one.
