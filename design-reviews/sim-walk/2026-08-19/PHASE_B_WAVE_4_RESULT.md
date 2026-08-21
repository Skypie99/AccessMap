# PHASE B — WAVE 4 RESULT: the Low findings, and the programme close-out

**Brief:** `PHASE_B_WAVE_4_LOW.md` · **Plan:** `PHASE_B_MASTER_PLAN.md` (48 findings, 4 waves)
**Date:** 2026-08-21 · **Branch:** `fix/simwalk-w4-low-2026-08-21`, branched off the Wave 3 tip `303b005`
**`main` was not touched.** Six code commits (`9bb80a0` → the copy pass), not merged, not pushed. **Sky merges.**

| Cluster | Findings | Outcome |
|---|---|---|
| **1** safe area | SW-02 | ✅ **Already fixed in Wave 2** — verified, not re-edited. One residual reported. |
| **2** copy / label-vs-behaviour | SW-06, SW-17, SW-21, SW-34 | ✅ **ALL FOUR SHIPPED.** SW-06 in the first pass; SW-17 / SW-21 / SW-34 drafted, then **ratified by Sky 2026-08-21** and shipped in a sixth commit · **SW-34's premise did not hold** — the real defect underneath it was fixed instead |
| **3** Dynamic Type | SW-36 + SW-51 | ✅ **FIXED — in two passes.** The first was green on the gate and still shredded the word on the device |
| **4** onboarding coherence | SW-19 | ✅ **FIXED by subtraction** — per Sky's "keep both, make the copy honest" |
| **5** misc singles | SW-27, SW-41, SW-29, SW-07, SW-14 | ✅ SW-27 + SW-41 fixed · SW-29/07/14 **closed as Sky's decisions** |
| device-only | SW-03, SW-16 | ⛔ **Not fixed, by instruction** — read the code, report the intent |

---

## SKY'S FOUR RULINGS, TAKEN BEFORE THE FIRST EDIT

1. **Copy gate — reuse-only.** Ship only changes that invent no new wording; draft the rest.
2. **SW-19 — keep both onboarding surfaces, make the copy honest.**
3. **SW-07 and SW-14 — accepted as product choices**, closed as OBS.
4. **Re-walk — full, strictly sequential.** One simulator booted at a time.

---

## STEP 0 — the gate, measured on `303b005` before the first edit

**Wave 3's numbers could not be carried forward, and this is why the brief says to measure.**
The follow-up commit `ba0ea90` landed *after* Wave 3's result table was written, adding
`stripComments.guard.test.ts` and touching fifteen guard suites.

| Gate | Wave 3's doc said | **Measured baseline @ `303b005`** | Final | Δ |
|---|---|---|---|---|
| `npm run typecheck` | 0 errors | **0 errors** | 0 errors | — |
| `npx jest --ci -w 3` | 223 suites · 3232 passed | **224 suites · 3242 passed · 32 todo · 0 failed** | **230 suites · 3297 passed · 32 todo · 0 failed** | **+6 suites, +55 tests** |
| `npm run lint` | 0 errors / **78** warnings | **0 errors / 82 warnings** | 0 errors / 82 warnings | — |

**The lint baseline is 82, not 78** — the four extra all come from `ba0ea90`'s own new guard suite.
Had this wave trusted the recorded number it would have reported a warning regression it did not cause.

**No pre-existing test was lost and the warning count did not move.** `prettier --write src` was
never run. The +55 reconciles exactly: 45 in six new suites, 6 appended to `distance.test.ts`,
2 appended to `TasksScreenFlagCard.test.tsx`, and 2 added to the two comment-author suites that had
to change with SW-34.

### ⚠️ A flaky test, found by accident, worth knowing about

The first baseline run reported **1 failure** —
`ReportFlagModal.test.tsx › re-enables the form when the anon rate limit rejects the submit` —
and the suite took **150 seconds**. Re-run alone on the identical tree it passed in **4 seconds**.

It is a timing-sensitive `waitFor` that starves under parallel load.

> **Correction to my own first reading.** I initially attributed it to an eslint run I had left going
> alongside jest, and said so. That was too confident. It recurred later on an otherwise-idle machine,
> so the honest characterisation is **intermittent under `-w 3`, cause not isolated**: it failed on
> 2 of 5 full runs this wave and passed in isolation every time (6s vs 55s). Recorded so a future
> gate run does not mistake it for a regression — and so nobody inherits my wrong diagnosis.

Every new suite was verified as a real regression detector by running it against the pre-fix source:

| Suite | vs pre-fix |
|---|---|
| `flexBasisUnderLargeType.guard.test.ts` + `SeverityBadge.dynamicType.test.tsx` | **7 of 16 fail** |
| `ReportsBreakdownCard.barRow.test.tsx` | **3 of 5 fail** |
| `TasksScreenFlagCard.test.tsx` (appended) | **1 of 2 fail** |
| `profileProgressBars.guard.test.ts` | **2 of 6 fail** |
| `onboardingCoherence.guard.test.ts` | **6 of 9 fail** (9 of 11 after the SW-17 labels landed) |
| `oneNameOneThing.guard.test.ts` (SW-21 + SW-34) | **5 of 9 fail** |
| `distance.test.ts` (appended) | **3 of 6 fail** |

The assertions that pass both ways are self-tests, non-vacuity sentinels and must-not-regress pins,
and are labelled as such in each file.

---

## ★ FOUR OF THE BRIEF'S PREMISES DID NOT HOLD

This wave corrected more premises than it fixed defects. That is not a complaint about the walk —
Phase A was explicit that the AX tree is a proxy — but it is the wave's main finding, and it follows
the same pattern SW-48 set for SW-31 and Wave 3 set for SW-32.

### 1 · SW-34 — "pick one string" would have REGRESSED a deliberate fix

The brief reads: *"reporter attribution drifts between 'Another community member' and 'Anonymous'
for the same anonymized case. Pick one string."*

They are **not the same case.** `FlagDetailModal.tsx:1411-1429` renders three:

| Condition | Renders |
|---|---|
| `user_id === null` | **"Anonymous"** (a pill; VoiceOver hears "Reported anonymously") |
| a known account, yours | **"You"** |
| a known account, not yours | **"Another community member"** |

And this exact distinction was **already the subject of a fix**:
`qa-reports/2026-05-30_Alex_AnonReporting_A11y.md:47-55` records that showing "Another community
member" for a null-`user_id` flag was called semantically incorrect and corrected. The contract is
written down at `src/lib/hiddenContent.ts:23-26`. Collapsing them would have walked that back.

**The real drift is one layer down, and it is worth Sky's eye:** `'Anonymous'` does double duty —
anonymous-*by-choice* on flags, and *no display name / deleted account* on comments
(`FlagDetailModal.tsx:1889`, `HiddenCommentsModal.tsx:112`) — while the identical
no-display-name condition is called **`'Member'`** on the leaderboard (`LeaderboardScreen.tsx:175`)
and **`'(not set)'`** in data export (`dataExport.ts:89`). Three words, one condition, and one of
those words already means something else.

**No fix written.** Unifying them is new wording (copy gate), and
`commentAuthor.test.ts:125` + `hiddenComments.test.ts:60` pin the literal source
`"c.display_name ?? 'Anonymous'"`, so it must be a deliberate test change rather than a silent one.

### 2 · SW-41 — the two progress tracks genuinely diverge

The brief asked to *"check whether the two tracks can ever diverge before collapsing them."* They
can, and they do:

```
tier cutoffs    0 -> 100 -> 500 -> 1500      (REPUTATION_TIERS)
badge cutoffs   25 -> 100 -> 500 -> 1000     (points-category achievements)
```

They coincide **only in the 25–499 band** — which is exactly the band the walked account was in at
90 points. Below 25 and above 500 they target different numbers, and past 1000 the badge bar is
replaced by a top-milestone line while the tier bar keeps going. **The screenshot caught a
collision, not a duplication.** Collapsing to one bar would have been wrong, and the divergence is
now pinned against the real threshold tables so a later sweep cannot merge them on one screenshot.

**But a real defect sat beside it** — see Cluster 5.

### 3 · SW-36 / SW-51 — there is no shared row component

Wave 3's note called the list rows *"one shared row component, one fix."* There isn't one.
`hitTargetFrame.guard.test.ts:112-117` enumerates four separate files, and each row is its own
implementation. "Fix once" means one *treatment* applied deliberately, not one edit.

### 4 · SW-06 — a consistency nit, not a WCAG 2.5.3 failure

The brief calls the `"Open the map"` / `Open the Map` mismatch a label-in-name violation. This repo
**already enforces that criterion tree-wide** in `labelInName.guard.test.ts` — and it passed before
this fix and passes after, because its normalizer case-folds, under a docblock reading *"Fold both
sides to the form a voice-control engine would compare."*

That normalization is correct: 2.5.3 exists for speech input, and voice control is not
case-sensitive. So the criterion was satisfied all along. It is still two strings for one button and
still worth one character to fix — but it should not be reported as an accessibility failure, and
the fix did not turn a guard green.

---

## CLUSTER 3 — SW-36 + SW-51 · commit `9bb80a0`

The substantive code of the wave, and **the obvious fix would have shipped a no-op.**

Yoga decides both *"where does this line break"* and *"how wide is this child"* from the child's
flex **base size**.

- `TasksScreen` `cardTitle` declared `flex: 1` — shorthand for grow 1 / shrink 1 / **basis 0%**. A
  basis of zero contributes **nothing** to the wrap test, and the title's width was purely residual:
  whatever the two non-shrinking badges beside it left over. It could be narrower than the word
  inside it, and iOS `NSLineBreakByWordWrapping` character-breaks a word too wide for its box.
- `ReportsBreakdownCard` `barLabel` declared `flexBasis: 130` — the same bug written as a constant.
  A box pinned at 130pt at every text size while `variant="bodyMedium"` (uncapped by contract)
  scaled its glyphs past 2×. `barTrack` beside it is `flex: 1`, so the track took every spare point.

**So `flexWrap: 'wrap'` alone fixes nothing** — with basis 0% the wrap can never fire. Both halves
were needed on both surfaces, or the change looks like a fix and is not one.

| | before | after |
|---|---|---|
| `cardTitle` | `flex: 1` | `flexGrow: 1` + `flexShrink: 1`, **flexBasis left unwritten** so RN's `auto` measures the text |
| `cardHeader` | no wrap | `flexWrap: 'wrap'` (row direction + `minHeight` preserved — `hitTargetFrame.guard` pins both) |
| `barLabel` | `flexBasis: 130` | `minWidth: 130` — `max(text, 130)`, so still exactly 130 at normal sizes and never narrower than its own word |
| `barTrack` | `flex: 1` | `+ minWidth: 56`, so the row wraps rather than leaving an unreadable stub bar |

The 320pt arithmetic is deliberate: `130 + 56 + 36 + 16 = 238` against a ~240pt inner width, so
**nothing wraps at normal text sizes on any device**.

### The amplifier, which is not the root cause

`SeverityBadge` renders a digit and a word in one pill on two different Dynamic Type rules — the
digit `variant="label"` (capped 1.6), the word `variant="bodyMedium"` (**uncapped**). At AX-XL the
word rendered ~47% larger than its own digit and the pill grew without bound, taking exactly the
width the title needed. `StatusBadge` uses `label`, which is why the status pill held its size in
the walk's evidence and the severity pill did not.

Capped **per call site**, which is AppText's own documented escape hatch and the treatment
`SeverityDisc` already carries — **not** a variant swap, which would also force the 600SemiBold face
while `styles.label` still declares weight 500, changing how the pill *looks* to fix how it
*scales*. `body`/`bodyMedium` stay uncapped in AppText, which `AppText.dynamicType.test.tsx` calls
"the regression we most fear".

Capping returns ~60pt and the title still needed more. **Necessary, not sufficient** — stated
plainly so nobody reads the badge fix as the fix.

### What was NOT done, and why

- **`numberOfLines={1}`** — the reflex fix, and forbidden: `dynamicTypeGuard.test.ts:102-120` fails
  it on any `*Title` style, because truncating a title at large type *is* the defect.
- **`lineBreakStrategyIOS`** — zero occurrences in `src/`. It would have introduced a new pattern
  where the house already has one (`flexWrap` + a growable basis).
- **Shortening "Broken sidewalk" or "Significant"** — pinned by four tests, and it would be fixing
  the symptom by deleting the content.
- **The four sibling rows** (MyReports, ActivityFeed, MyWatched, NearbyFlags) — see below.

### The four rows deliberately not swept

They share the basis-zero title, so the class is real. They were left alone for reasons that are
facts, not caution:

1. **None renders a `SeverityBadge`** — that component has exactly **one** call site in the app.
   They use fixed-size discs and dots, which do not balloon with `fontScale`, so the amplifier that
   produced SW-36 is structurally absent.
2. **All three modal rows already carry `minWidth: 0`** on the row, which the Tasks header did not.
3. None was reported defective by the walk, and **all are behind auth** — so a shrink-distribution
   change beside their guard-pinned 44×44 "Show on the map" buttons could not be rendered or
   measured by me.

Recorded in the new guard's header so the class stays greppable rather than forgotten.

### ★ The new guard failed against the FIXED tree, and that was the useful part

Written as a raw-source scan, `flexBasisUnderLargeType.guard` matched **its own explanatory
comments** — which necessarily quote the very patterns it forbids ("`flex: 1` is shorthand for …
basis 0%", "was `flexBasis: 130`"). It now uses `ba0ea90`'s shared string-aware `stripComments`,
which is precisely what that helper exists for. **The same trap bit twice more in this wave** (see
Cluster 4), one layer up each time.

### The "Signific…" question, answered without a device

The walk recorded a trailing ellipsis, which reads like `numberOfLines={1}` truncation — but
`ReportsBreakdownCard.tsx` sets no `numberOfLines` and no `ellipsizeMode` anywhere, so source could
not account for it. **Nor could a device**: this card renders only for a signed-in user, and an
agent cannot enter a password.

So it is settled structurally instead. `ReportsBreakdownCard.barRow.test.tsx` asserts that nothing
in the render tree truncates — an assertion that deliberately passes both before and after — which
means the mark can only have been the character-break itself. **The same defect as its two
neighbours, not a second one.** If anyone later "fixes" it by adding `numberOfLines`, that suite
goes red and points at `dynamicTypeGuard`'s rule instead.

---

## CLUSTER 4 — SW-19 · commit `bd6939e` · per Sky's "keep both, make the copy honest"

The drift was wider than the brief recorded — **three copy sites plus a false comment** — and the
comment is the reason the rest went unnoticed:

| Site | Said | Truth |
|---|---|---|
| `SettingsScreen.tsx:720` | "Re-show the **3-card** welcome intro." | opens a **3-step** modal that never says "card" |
| `SettingsScreen.tsx:722` | "the welcome intro **you saw the first time you signed in**" | first launch shows a **different, 5-card** surface |
| `ProfileScreen.tsx:681` | "The **3-card** introduction will appear…" | `clearOnboarded()` brings back the **5-card** flow |
| `SettingsScreen.tsx:817` | "the same OnboardingModal **App.tsx mounts on first launch**" … "stays in **lockstep**" | **false** — `App.tsx:208` mounts `OnboardingCards` |

Two surfaces drifted apart behind a comment asserting they could not.

### Fixed by subtraction — which is how it cleared the copy gate

Under Sky's reuse-only ruling this wave ships no new wording. Every false claim was therefore
**removed** rather than reworded:

```
"Re-show the 3-card welcome intro."                  ->  "Re-show the welcome intro."
"Opens the welcome intro you saw the first time      ->  "Opens the welcome intro"
 you signed in"
"The 3-card introduction will appear..."             ->  "The introduction will appear..."
```

Deleting a false clause invents no vocabulary, and **every sentence is true afterwards**. Wording
that would actively *distinguish* the two surfaces is drafted below for §A.

The new guard pins the structural facts the false comment got wrong — `App.tsx` mounts
`OnboardingCards`, `SettingsScreen` is the **sole** mount point for `OnboardingModal`, and the two
surfaces still count themselves differently — so the claim cannot regenerate.

> **The stripComments trap, one layer up.** The corrective comment originally quoted the false claim
> verbatim in order to correct it, and the guard's raw-source check matched its own explanation. It
> is now phrased without the quotes, and says so in the comment.

---

## CLUSTER 5 — the singles

### SW-41 · commit `5d45800` — a bar drawn at 50% and announced as 60%

The two tracks diverge (above), so they were not collapsed. **What is broken is the badge bar's
honesty about itself.** It *fills* from the previous milestone — deliberate, so a user at 60 sees
the 50→100 segment half full rather than a sliver — but it *announced*
`accessibilityValue={{ min: 0, … }}`.

At 300 points: drawn at `(300-100)/(500-100)` = **50%**, announced as `300/500` = **60%**. The
picture a sighted user saw and the value a screen reader heard disagreed everywhere past the first
milestone (WCAG 1.3.1). `milestoneProgress` already computed that segment start and threw it away;
it now returns it.

**The tier bar beside it always got this right** and is untouched — pinned as a must-not-regress so
a later "make them consistent" edit cannot level the correct bar down to the broken one.

The visible label still reads "N of M points" against the milestone target, which is true and is
what the user is working toward. Changing it would be new wording.

### SW-27 · commit `2bfa84f` — a walking time that had stopped meaning anything

`279.2 km · 3351 min walk` — about 56 hours, in the same slot and the same voice as "4 min walk".

The arithmetic was right and the presentation was absurd, so the suppression lives in the
**formatter** and `walkingMinutes` is deliberately untouched (pinned by a test): anything that wants
the real number still gets it.

The threshold is **60 minutes**, which is not an arbitrary round number: at the module's own
`WALKING_KMH` it is exactly 5 km — both a real bucket in `DISTANCE_OPTIONS` and the case
`distance.test.ts` already pins as its reference (`walkingMinutes(5) === 60`). Expressed in minutes
so it keeps meaning "an hour on foot" if the pace constant ever changes. Inclusive: a 5 km walk is
long, not nonsensical.

Beyond it the function returns `''` — **the same empty string it already returned for a nonsense
distance** — so the single caller (`TasksScreen`'s meta line, which joins through `.filter(Boolean)`)
drops the segment cleanly. The distance still renders, which is the part carrying the information.
A "3 hr walk" rendering would have been new wording; suppression reuses shipped behaviour.

> Noted, not silently changed: `formatDistance` pairs value and unit with a **non-breaking** space
> (F2-13) and `formatWalkingEta` uses a plain one, though the two render side by side.

### SW-29, SW-07, SW-14 — closed as decisions, not omissions

- **SW-29** map markers 38×40 — **Sky accepted as map-marker convention in Wave 3.** Recorded, not
  re-litigated. For the record: 38×40 is the *bounding box*; the visible drop is 26×26, and web is a
  separate 30×30 `DivIcon` — the two are not shared and there is no size token.
- **SW-07** no "Forgot password" anywhere on the auth surface — **accepted as a product choice.**
- **SW-14** GuestProfile is a single CTA on an otherwise empty screen — **accepted as a product
  choice.**

---

## CLUSTER 1 — SW-02 · verified, not re-edited

Wave 2's `c0d3e8f` fixed both named halves as collateral of SW-01, and
`bottomInsetSafety.guard.test.ts` pins them:

- `OnboardingCards.tsx:570` — `marginBottom: Math.max(28, insets.bottom)` (was a hardcoded 28)
- `SignInScreen.tsx:336` — policy links moved outside the ScrollView into a footer carrying the
  home-indicator inset

**Nothing was re-edited.** The brief said verify first, and it was already fixed.

> **One residual, reported rather than fixed.** `OnboardingModal.tsx:257` uses
> `paddingBottom: insets.bottom + spacing.md` — *additive*, so it never intrudes into the home
> indicator and **SW-02 as worded does not apply to it**. But it has no floor, so a device reporting
> `insets.bottom === 0` gets 12pt where every sibling surface guarantees 8–36, and it reads insets
> through the throwing `useSafeAreaInsets()` (`:65`) rather than the house
> `SafeAreaInsetsContext ?? zeros` recipe its two siblings use. The guard test does not cover this
> file. Small, real, and outside SW-02's wording — so it is Sky's call whether it is worth a commit.

---

## NOT THIS WAVE'S TO FIX — the two device-only findings

The brief was explicit: *the AX tree is a proxy, not a screen reader. Do not write a fix from
simulator evidence.* Both were read in code instead.

### SW-03 — the duplicated scroll-bar nodes are describing something real

`OnboardingCards`' pager is a horizontal `ScrollView` with `pagingEnabled` and **no accessibility
props at all** (`:337-344`) — not `accessible`, not hidden. Each of the five cards then nests **its
own vertical `ScrollView`** (`:365-370`), added so long copy stays reachable at large type.

So WDA's *"Horizontal scroll bar, 1 page"* + *"Vertical scroll bar, 5 pages"* is a faithful
description of **1 horizontal + 5 vertical scrollers**. The counts are real; the *labelling* is
WDA's. Whether VoiceOver actually announces a vertical scroll bar on that surface is **unverified
and needs a real device**.

Worth noting the two surfaces diverge here deliberately and are documented as doing so:
`OnboardingModal` hides its pager with `decorativeProps` and compensates with the SR node below;
`OnboardingCards` leaves its pager visible to AT and lets each card's children be focusable.

### SW-16 — deliberate, load-bearing, and correctly guessed by the walk

`OnboardingModal.tsx:180-187` is a 1×1pt `View` with `accessible`, `accessibilityRole="text"`, a
composed `accessibilityLabel` of the card's title and body, and `accessibilityLiveRegion="polite"`.
Its own comment (`:176-179`) says why: **the pager below it is hidden from AT, so this node is the
ONLY way a screen-reader user hears the card content.**

It is not a defect. It is the surface's entire accessible content. **Removing or "fixing" it from
simulator evidence would have silenced the replay intro for screen-reader users** — which is exactly
what the brief was protecting against.

---

## ★ THE CONSERVATION CHECK — all 48 IDs

The universe is `SW-01`…`SW-53` minus the five never assigned (**04, 05, 15, 18, 24**) = **48
exactly.** Verified independently by sweeping every `SW-nn` across the review bundle: 49 unique
tokens appear, of which `SW-04` occurs only inside the two "never assigned" declarations.

| ID | Wave | Disposition |
|---|---|---|
| SW-01 | W2 | ✅ Fixed — consent line above the fold, measured on both devices |
| SW-02 | W2/W4 | ✅ Fixed in W2; **verified in W4**, not re-edited. One residual reported (OnboardingModal bottom pad) |
| SW-03 | W4 | ⛔ **Device-only** — nodes describe a real nested-scroller structure; VoiceOver verdict outstanding |
| SW-06 | W4 | ✅ Fixed (both sites). **Premise corrected:** not a WCAG 2.5.3 failure |
| SW-07 | W4 | 🔵 **Sky's decision** — accepted as a product choice |
| SW-08 | W3 | ✅ Fixed — peek fits the loaded reports |
| SW-09 | W3 | ⛔ Deliberately unchanged — documented `hitSlop={14}` idiom (Sky) |
| SW-10 | W3 | ✅ Fixed — 358×20 → 308×45 |
| SW-11 | W2 | ✅ Fixed — a denial is a settled answer, not "Waiting for location…" |
| SW-12 | W3 | ✅ Fixed — FAB 105×42 → 105×48 |
| SW-13 | W3 | ✅ Fixed with SW-38 — "1 of 3" |
| SW-14 | W4 | 🔵 **Sky's decision** — accepted as a product choice |
| SW-16 | W4 | ⛔ **Device-only** — deliberate SR pattern; the surface's only accessible content |
| SW-17 | W4 | ✅ **FIXED, both sites** — labels changed, behaviour deliberately not. First launch → **"Continue"**, replay → **"Done"**. Sky ratified 2026-08-21. **A second site was found**: the first-launch CTA had the same defect |
| SW-19 | W4 | ✅ Fixed by subtraction (Sky: keep both) + false comment corrected |
| SW-20 | W3 | ✅ Fixed with SW-49 — one class |
| SW-21 | W4 | ✅ **FIXED** — and the reported mismatch was the symptom. The sheet was titled **"Notifications"** while a separate push feature exists; it is now **"Updates"** across all three surfaces |
| SW-22 | W3 | ✅ Fixed — row titles to a real 44 |
| SW-23 | W2 | ⛔ **Device-only** — needs real VoiceOver |
| SW-25 | W3 | ✅ Fixed — 21×24 → 44×24 |
| SW-26 | W1 | ✅ Closed — **superseded by SW-46**, fixed there |
| SW-27 | W4 | ✅ Fixed — ETA suppressed past an hour on foot |
| SW-28 | W2 | ✅ Fixed — verified live, before and after |
| SW-29 | W3/W4 | 🔵 **Sky's decision** — 38×40 accepted as map-marker convention |
| SW-30 | W1 | ✅ Closed — **≡ SW-47**, fixed there |
| SW-31 | W2 | ✅ Fixed — the false "switch tabs" copy only; recovery path untouched per SW-48 |
| SW-32 | W3 | ⛔ **Not a fix — premise did not hold.** Ledger row corrected in `ba0ea90` |
| SW-33 | W3 | ⛔ Deliberately unchanged — 32+16=48, documented (Sky) |
| SW-34 | W4 | ✅ **Premise did not hold — and the real defect underneath it is FIXED.** Flags keep all three cases; comments' `?? 'Anonymous'` → **`?? 'Member'`**, so "Anonymous" now means only a deliberate choice |
| SW-35 | W3 | ✅ Fixed (legend close); heat-notice half stays on the idiom |
| SW-36 | W4 | ✅ **Fixed** — with SW-51, one treatment |
| SW-37 | W2 | ⚠️ **Partial, by Sky's decision** — fixed signed-in; for guests the block is now *stated*, not silent. Not closed as the finding words it |
| SW-38 | W3 | ✅ Fixed — the count no longer leaks admin role |
| SW-39 | W3 | ✅ Fixed — tiles are lifetime (Sky) |
| SW-40 | W3 | ✅ Field fixed (bordered-input border model); ⛔ tier pill deliberately unchanged (Sky) |
| SW-41 | W4 | ✅ **Fixed** — announced value now matches the drawn fill. **Premise corrected:** tracks diverge; bars NOT collapsed |
| SW-42 | W2 | ⚠️ **Partial** — content loss fixed; card height floored **without being explained**. Needs Sky's eyes |
| SW-43 | W3 | ✅ Fixed with SW-22 |
| SW-44 | W3 | ✅ Fixed — no more "ME" on other people |
| SW-45 | W3 | ✅ Fixed — sheets clear the tab bar (Sky) |
| SW-46 | W1 | ✅ **Fixed + verified on device** — the abuse-report path is reachable |
| SW-47 | W1 | ✅ **Fixed + verified on device** — 6 consecutive cross-parent opens, clean |
| SW-48 | W3 | ⛔ **Not a fix** — a correction to SW-31; respected, nothing written |
| SW-49 | W3 | ✅ Fixed with SW-20 — mechanism confirmed, not assumed |
| SW-50 | W3 | ✅ Fixed — remove-photo owns a real 44pt corner |
| SW-51 | W4 | ✅ **Fixed** — with SW-36. Ellipsis question retired structurally |
| SW-52 | W2 | ✅ Fixed — Sky approved before any edit |
| SW-53 | W3 | ✅ Fixed — the economy pays nine awards, not four |

**Tally: 48 accounted for.** **35 fixed** · 2 partial (SW-37, SW-42) · 5 deliberately unchanged on a
documented idiom or Sky's call · 3 not-a-fix because the premise did not hold (SW-32, SW-48, and
SW-26/SW-30 closed as duplicates) · 3 device-only (SW-03, SW-16, SW-23) · 3 Sky product decisions
(SW-07, SW-14, SW-29). **Nothing dropped, and nothing left behind the copy gate** — SW-17, SW-21 and
SW-34 were drafted, put to Sky, ratified 2026-08-21, and shipped.

### ⚠️ AND ONE THAT *WAS* DROPPED — N-2

Wave 1 found two findings outside the 48. **N-1** was correctly carried into the device-only bucket
by Waves 2 and 3. **N-2 was not carried anywhere.**

Wave 1 recorded it — the Report sheet's "Terms & Community Guidelines" link measured at
`[20, 810, 400, 44]` while the card ended at y≈813, *"present in the accessibility tree and invisible
on screen"*, **on the Apple Guideline 1.2(b) surface** — and explicitly recommended folding it into
Wave 2's sheet-geometry decision. It appears in **no** later document, and
`git log -- src/components/ReportContentModal.tsx` shows the file untouched since Wave 1's own
commit `bb39bc4`.

**This is exactly the failure mode the brief warned about** ("an earlier rollup lost SW-10 and SW-13
by accident — don't repeat it"), one level up: the rollups tracked the 48 faithfully and lost a
finding that was never numbered into them.

**Do not fix it from this paragraph.** Reading the source now, that Terms link sits *inside* the
sheet's `ScrollView` body (`:436-449`, `styles.body` has `flexShrink: 1`), which reads more like
"below the scroll fold" than "drawn outside the sheet" — and content below the fold in a scroller is
normal, not a defect. That is the same shape as SW-32's diagnosis error. **Re-verified on device
below.**

---

## ★ THE SIMULATOR RE-WALK — and the fix it caught mid-flight

**Rig rebuilt from nothing.** `appium-webdriveragent` (16.5.1) was gone again and the repo had no
`tools/`; the drivers survived only inside this bundle. Installed into a **scratch npm root with an
isolated cache** — never the repo, whose `package.json` and `package-lock.json` are untouched and
verified so. `xcodebuild build-for-testing` against Xcode 26.6 → `TEST BUILD SUCCEEDED` on both
devices. Incremental Release build from the branch: `Build Succeeded`, sim-release, same build type
as the walk.

**Strictly sequential, per Sky's ruling.** 17e first (light + dark), shut down, then Pro Max
(light + dark). One simulator booted at a time. Peak **61** CoreSimulator processes against Wave 2's
267-process wedge — the mitigation worked.

### ★★ THE DEVICE CAUGHT A FIX THAT WAS NOT ONE — commit `4b704de`

This is the most important thing in the wave.

After `9bb80a0`, the guard was green, 229 suites passed, and the reasoning was sound: free the flex
basis, add `flexWrap`, done. **The screenshot said otherwise.** At `accessibility-extra-large`, dark,
on the 17e:

```
3 · Moderate    Broken
                sidewal      • Open
                k
```

Still breaking mid-word. The title now wrapped to a second line — a real improvement — and
`flexShrink: 1` still let the two non-shrinking badges squeeze it below its own longest word before
the line ever broke. **Yoga prefers shrinking a shrinkable item to wrapping the line**, so the
`flexWrap` I had just added never fired.

Measured: a 326pt header, minus a ~125pt severity pill, a ~78pt status pill and their gaps, left the
title **~107pt**, while "sidewalk" at the capped 28.8pt needs **~127**.

`minWidth: 130` is the floor that makes the wrap fire. After it, on the same device and setting:

```
3 · Moderate    Broken
                sidewalk
• Open
```

The word is whole and the status badge has moved to its own line — the wrap doing exactly what it
was added for. **Source review got this wrong twice: it identified the cause correctly and concluded
the job was done, and the guard I wrote went green against a build that still shredded the word.**
The guard now pins the floor, so the same partial fix cannot pass again.

That is the argument for the device pass, stated as plainly as I can: **four suites and 44 tests did
not catch it, and one screenshot did.**

### ✅ Verified on device — before → after

| ID | Device | Walk measured | Now |
|---|---|---|---|
| **SW-36** | 17e + Pro Max, **both appearances**, AX-XL | "Broken sidewal / k" | **"Broken sidewalk"** whole; badge wraps to its own line |
| **SW-27** | 17e, the *same flag* the walk censused | `279.2 km · 3351 min walk` | **`279.2 km · 1d ago`** |
| **SW-27** (the other direction) | 17e + Pro Max | — | **`876 m · 11 min walk · 2d ago`** — a *useful* ETA is preserved; only the absurd case is suppressed |
| **SW-06** | 17e, both sites | label `Open the map` vs text `Open the Map` | **`Open the Map`** on the first-launch card 5 **and** the replay finisher |
| **SW-19** | 17e | "Re-show the 3-card welcome intro." | **"Re-show the welcome intro."** |
| **SW-02** | 17e | "Not now"/"Maybe later" 6pt past the inset | **`[151,766,88,44]` and `[139,766,112,44]` — both end at exactly 810**, the 17e boundary |
| **SW-01/02** | **both** | consent below the fold / off-screen entirely | 17e `[24,766,342,44]` ends at **810** · Pro Max `[24,878,392,44]` ends at **922** — at the boundary, not past it, at rest |

### ✅ The Wave 1–2 blockers, re-confirmed

- **SW-46** — the Apple 1.2(b) path. **Both** sheets present over the flag detail: `Report`
  (5 categories, reason field, Cancel/Send) and `Status history`. The mechanism that was 100% dead
  app-wide is live on the 17e.
- **SW-47** — three Tasks→detail→close→Home→Tasks cycles, detail opening cleanly each time, and
  **zero** matches for `after subscribe` / `ErrorBoundary` / `uncaught render` / `postgres_changes`
  across the captured console (`logs/console-wave4-17e.log`). **Scoped honestly:** Home's cards open
  the map rather than a detail, so my second host was Tasks again — this is repeated opens plus tab
  churn, **not** the strict two-parent repro. Wave 1's six consecutive cross-parent opens remain the
  stronger evidence.
- **Wave 3 confirmed in passing:** tab bar announces **"1 of 3"** (was "1 of 5"), the Report FAB
  measures **101×48** (was 105×42), Tasks "Search flags" **167×61** (was 43), and the guest push row
  is visibly dimmed with its explainer — *"Sign in to turn on push notifications — they follow your
  account, not this device."*

### ⛔ N-2 — the dropped finding, re-verified, and its premise does NOT hold

Measured on the **Pro Max, the device Wave 1 measured it on**, the frame reproduces **byte-identically**:

```
Terms & Community Guidelines   [20, 810, 400, 44]      ← Wave 1's exact numbers
```

**One scroll of the sheet body moves it to `[20, 682, 400, 45]`** — visible, underlined, above the
pinned Cancel/Send row. Same result on the 17e. It is the last item in a `ScrollView` body with
`flexShrink: 1`, and content below the fold in a scroller is normal, not a defect.

So Wave 1's *measurement* was correct and its *diagnosis* — "drawn outside the sheet … present in the
accessibility tree and invisible on screen" — was not. **No fix written.**

This is the **third** time this exact shape has appeared in the programme: a census taken at rest
read as a structural defect. SW-48 corrected SW-31, Wave 3 corrected SW-32, and now N-2. Worth
naming as a class: *a snapshot of a scrollable surface is a snapshot of its scroll position.*

### SW-03 — the duplication is a WDA artifact, and I can now show it

Every scroll-bar node in every census this wave came in **identical pairs**:

| Surface | scroll-bar nodes |
|---|---|
| OnboardingCards (5 cards) | 10 horizontal (5 × 2) + 2 vertical ("Vertical scroll bar, 5 pages" × 2) |
| SignInScreen — **one** ScrollView | "Horizontal scroll bar, 1 page" **× 2** |
| **iOS's own location permission alert** | "Vertical scroll bar, 1 page" × 2, "Horizontal scroll bar, 1 page" × 2 |

The last row settles it: the duplication appears inside **Apple's system alert**, which this codebase
does not author. **The duplication half of SW-03 is a WebDriverAgent representation artifact, not an
app defect.** The counts still describe something real — the pager genuinely nests five per-card
vertical scrollers for large-type reachability — and whether VoiceOver actually announces a vertical
scroll bar on a horizontal pager **still needs a real device**. Narrowed, not closed.

### SW-16 — confirmed deliberate, and confirmed load-bearing

The replay modal exposes **exactly three** elements:

```
StaticText  "Welcome to Flagstone. Drop a pin where you find an acces…"   [0,0,1,1]
Button      "Skip the introduction"
Button      "Next. Step 1 of 3."
```

That is the whole accessible surface. The pager is hidden with `decorativeProps`, so **the 1×1pt node
is the only way a screen-reader user hears the card content** — exactly what the code comment claims.
Removing or "fixing" it from simulator evidence would have silenced the replay intro for VoiceOver
users. This is the clearest vindication of the brief's instruction not to fix these two blind.

### SW-17 — confirmed live, on BOTH surfaces

Tapping the replay finisher labelled **"Open the Map"** landed on **SETTINGS**. Tapping the
first-launch card-5 CTA of the same name landed on **SignInScreen**. Neither opens the map. The
second site is new — the brief scoped SW-17 to the replay only.

### ⚠️ Declared limits of this walk

- **Guest only, both devices.** An agent cannot enter a password. That leaves **SW-51** (the Profile
  breakdown — the card renders only for a signed-in user), **SW-41** (the Profile progress bars),
  SW-42/SW-45 (the profile sheets) and the four un-swept sibling rows **unmeasured by me on device**.
  They are covered by tests proven to fail against the pre-fix source, which is evidence about
  structure, not about pixels. Wave 2 and Wave 3 hit the same wall and said so.
- **SW-51's "Signific…" could not be re-checked** for the same reason, which is why it was settled
  structurally instead (see Cluster 3).
- **The AX tree does not see overlays.** The drawer and the profile sheets returned the *underlying*
  screen in a census; screenshots were the reliable read. Worth recording for the next rig.
- **One card not staged.** I could not scroll the 17e list to a "Broken sidewalk" card while the
  search field held focus — the keyboard swallowed the swipes. It was captured on the second pass in
  both appearances, and on the Pro Max, so nothing is missing; the first attempt simply wasted time.
- **Backend untouched.** Guest throughout, every write flow walked to the edge and never submitted.
  Location was granted via `simctl privacy` (no dialog) and **revoked on both devices afterwards**;
  appearance and content size restored; both runners killed; the 17e left booted as found.

---

## DECISIONS FOR SKY

1. **Merge `fix/simwalk-w4-low-2026-08-21`** — five commits, `9bb80a0` → `4b704de`. Gate green.
   Nobody else merges.
2. ~~**`main` is 12 commits ahead of `origin/main`**~~ — **resolved mid-session, by someone else.**
   At STEP 0 local `main` (`303b005`) was 12 commits ahead of `origin/main` (`2ce6e6c`), carrying the
   Wave 1–3 merges unpushed. By the end of this wave `origin/main` **is** `303b005`. Verified against
   the remote itself (`git ls-remote`), not just the local ref, and `origin/main`'s reflog records it
   as `update by push`. Three peer Claude sessions were live on this machine throughout, so this was
   not me — **I pushed nothing.** Recorded because the earlier state was reported as a decision for
   you and is no longer true: **Waves 1–3 are now on the remote.**
3. ~~The copy this wave drafted rather than shipped~~ — **ratified by you 2026-08-21 and shipped.** See the copy pass below.
4. **N-2 needs no fix** — its ledger entry should be corrected the way SW-48 corrected SW-31, so a
   later wave does not "fix" a link that works.
5. ~~SW-17 is still live on two surfaces~~ — **fixed on both**, labels only.
6. **`OnboardingModal`'s bottom pad** has no floor and uses the throwing inset hook (Cluster 1).
   Small, real, outside SW-02's wording — your call whether it is worth a commit.

## ★ THE COPY PASS — drafted, put to Sky, ratified 2026-08-21, shipped

The first pass of this wave deliberately shipped no new wording. Sky reviewed the drafts and took
all three. What landed, and why each is what it is:

### SW-17 — labels moved, behaviour did not

| Surface | Was | Now |
|---|---|---|
| first-launch card 5 → SignIn | "Open the Map" | **"Continue"** |
| replay finisher → Settings | "Open the Map" | **"Done"** |

**Neither destination is wrong** — a replay opened from Settings belongs back in Settings, and the
auth gate cannot be skipped — so changing the behaviour would have created a real bug to fix a
cosmetic one. "Continue" is honest about a *step* rather than promising a *place*, and it is already
ratified vocabulary in that very file (`OnboardingCards.tsx:507` ships it as the web a11y label).
"Done" is the iOS convention for finishing a modal. The two `accessibilityHint`s that claimed the
button "opens the map" / "opens Flagstone" were corrected with them.

### SW-21 — the reported mismatch was the symptom; the collision was the defect

The finding was a subtitle disagreement. Underneath it, the sheet was titled **"Notifications"**
while `SettingsScreen` separately offers **"Push notification types"** — two unrelated features, one
word, and one of them really is notifications.

Named after its own artifact instead. The banner says *"N updates since your last visit"*, and
`UpdateBanner` renders **only** on Profile, so the sheet's existing purpose line was accurate all
along and survives untouched.

| Where | Was | Now |
|---|---|---|
| sheet title + `aria-label` | "Notifications" | **"Updates"** |
| sheet close button / hint | "Close notifications settings" | "Close updates settings" |
| sheet signed-out notice | "Sign in to save notification preferences." | "…save update preferences." |
| Settings row | "Update banner preferences" | **"Update preferences"** |
| Settings subtitle | "…in the in-app updates banner." | "Choose which flag changes appear in your updates." |
| Profile row | "Notifications" | **"Updates"** |

"Push notification types" is pinned as a must-not-regress: vacating the word is the whole point.

### SW-34 — the premise did not hold, so the fix went where the defect actually was

Flags keep **all three** cases — `user_id IS NULL` → "Anonymous", own flag → "You", another account
→ "Another community member" — because they are three different facts and all three are correct.
Collapsing them would have reverted a May 2026 fix.

What changed is comments: `display_name ?? 'Anonymous'` → **`?? 'Member'`**, in `FlagDetailModal`
and `HiddenCommentsModal`. A missing display name is not a privacy *choice* — the author never set
a name, or their account is gone (`flag_comments.user_id` is `ON DELETE SET NULL`) — and "Anonymous"
claimed a decision they never made. `'Member'` is the word the leaderboard already uses for exactly
this case, and SW-44's own fix comment calls it "correct and privacy-preserving".

**Two source-pinning tests changed deliberately**, not silently — `commentAuthor.test.ts:125` and
`hiddenComments.test.ts:60` both pinned the old literal, and each now records why. `copy.ts`'s
`unhideCommentA11yLabel` docblock and a `CommentBubble` note that quoted the old string were
corrected with them.

> **A correction I owe this document.** An earlier draft called this "three words, one condition",
> counting `dataExport.ts`'s `display_name ?? '(not set)'` as a third offender. Re-read in context it
> sits beside `email ?? '(no email on file)'` and describes **your own missing name in your own data
> export** — "you haven't set one", not a privacy placeholder for a stranger. Different condition,
> correct as it stands, **deliberately untouched**, and now pinned as such.

**New guard:** `oneNameOneThing.guard.test.ts` — 5 of its 9 assertions fail against the pre-fix
source; the rest pin what must NOT move (push notifications keeping its name, the leaderboard
keeping 'Member', flags keeping all three cases, the export keeping "(not set)").

### Verified on device — because this wave already learned that a green gate is not enough

Rebuilt and re-walked on the 17e after the copy pass. Every one of these strings is **shorter** than
what it replaced, so truncation risk was nil by construction — but the SW-36 lesson was fresh, so it
was checked rather than assumed.

| Change | On device |
|---|---|
| card 5 CTA | **"Continue"** — reads naturally under "You're all set"; label and visible text match |
| replay finisher | **"Done"** — and tapping it still returns to Settings, which is the point |
| Settings row | **"Update preferences" / "Choose which flag changes appear in your updates."** — no wrap, no clipping |
| the sheet | titled **"Updates"**, purpose line intact, notice reads "Sign in to save update preferences." |
| sheet close button | announces **"Close updates settings"** |

**SW-34 was NOT verified on device, and this is a real limit rather than an oversight.** The
`'Member'` fallback only renders for a comment whose author has **no display name** — a data
condition the live rows may simply not contain, and one I cannot create: an agent cannot sign in,
and the Production Law forbids writing to the live backend to manufacture one. It rests on the new
guard, the two source-pinning tests that changed with it, and the full gate. That is evidence about
structure, not about pixels — stated at the same volume as the passes above.

> **One residual, surfaced rather than silently fixed.** The Settings **section header** above the
> renamed row still reads **"NOTIFICATIONS"** (`SettingsScreen.tsx:583`), so a user scanning top-down
> sees "NOTIFICATIONS → Update preferences". Defensible as an umbrella — updates and push are both
> "how the app tells you things" — but it partially re-creates the conflation SW-21 exists to remove.
> Renaming a section header is a visible IA change Sky did not ratify, so it was **left alone and
> flagged**. Visible in `shots/wave4-verify/SW21_settings_update_prefs_17e.png`.

## DELIBERATELY NOT FIXED

- **SW-03, SW-16** — device-only; read in code, reported, not touched.
- **SW-34, SW-41's "collapse the bars", N-2** — premises did not hold.
- **SW-29, SW-07, SW-14** — Sky's decisions, on the record.
- **The four sibling list rows** — reasons in Cluster 3; recorded in the guard's header.

**Rollback:** each commit is independent and reverts cleanly, newest first. `4b704de` is a
follow-on to `9bb80a0`; reverting `9bb80a0` alone would leave the guard failing — revert the pair.

**Do not merge.**
