# PHASE B — WAVE 3 RESULT: the MED findings

**Brief:** `PHASE_B_WAVE_3_MED.md` · **Plan:** `PHASE_B_MASTER_PLAN.md` (48 findings, 4 waves)
**Date:** 2026-08-20 · **Branch:** `fix/simwalk-w3-med-2026-08-20`, branched off `main` @ `2ce6e6c`
**`main` was not touched.** Eight code commits (`34e636d` → the SW-32 finding), not merged. **Sky merges.**
**Six were the clusters; two came out of the device walk** — and one of those is a correction to my own earlier claim.

| Cluster | Findings | Outcome |
|---|---|---|
| **A** hit targets | SW-09/10/12/22/25/33/35/40/43/50 | ✅ **7 fixed** · **4 deliberately left on the house idiom** (Sky's call) |
| **B** tab-bar count | SW-13 + SW-38 | ✅ **FIXED** — everyone hears "1 of 3", role no longer audible |
| **C** Profile tiles | SW-39 | ✅ **FIXED** — tiles are lifetime, per Sky |
| **D** Leaderboard | SW-44 | ✅ **FIXED** — and the F59 emoji bug with it |
| **E** inert controls | SW-49 (+ SW-20) | ✅ **FIXED as one class** — mechanism confirmed, not assumed |
| **F** singles | SW-08, SW-53 | ✅ **FIXED** (viewport + the whole points economy) |
| | SW-32 | ⛔ **NOT A FIX — walked, and the premise did not hold.** See the re-walk. |
| | SW-48 | ✅ **Not a fix** — Wave 2 respected it; confirmed, nothing written. |

---

## STEP 0 — the gate, pinned before the first edit

| Gate | Baseline @ `2ce6e6c` | Final | Δ |
|---|---|---|---|
| `npm run typecheck` | **0 errors** | 0 errors | — |
| `npx jest --ci -w 3` | **215 suites · 3127 passed · 32 todo · 0 failed** | **223 suites · 3232 passed · 32 todo · 0 failed** | **+8 suites, +105 tests** |
| `npm run lint` | **0 errors / 78 warnings** | 0 errors / 78 warnings | — |

The baseline matched the brief's prediction exactly. **No pre-existing test was lost and the
warning count did not move.** `prettier --write src` was never run.

Every new suite was checked against the pre-fix source and shown to fail:

| Suite | vs pre-fix |
|---|---|
| `hitTargetFrame.guard.test.ts` | 16 of 24 fail |
| `tabBarCount.guard.test.ts` | 5 of 12 fail |
| `pointEvents.lifetime.test.ts` + `profileStatsSemantics.guard.test.ts` | 10 of 13 fail |
| `LeaderboardScreen.monogram.test.tsx` | 2 of 6 fail |
| `inertControlVisual.guard.test.ts` | 23 of 25 fail |
| `regionFittingPoints.test.ts` | 8 of 10 fail |
| `pointsSqlParity.test.ts` + `accessibleParentTrap` extension | 9 of 21 fail |

The assertions that pass both ways are non-vacuity guards and must-not-regress checks, and are
labelled as such in each file.

---

## ★ THE FINDING UNDERNEATH CLUSTER A

**`hitSlop` does not appear in the accessibility frame the census measures.**

Proven, not assumed: `ProfileScreen`'s tier pill carries `hitSlop={8}` on an 87×33 box — 49pt of
real touch target — and the census still reports **87×33**.

That matters because this repo has a *documented, guard-pinned* small-target idiom — *"24pt glyph
box + hitSlop 10 = 44 effective (the house small-target idiom)"* — and
`accessibleParentTrap.guard` **asserts** `hitSlop={14}` on the very clear-search button SW-09
reports as 16×17, with a written reason: a real 44 box would eat 28px of the search bar's text
width.

Both standards are real and they are not the same standard. WCAG 2.5.5 / 2.5.8 are about the
**pointer** target, and slop satisfies them — the app's own `removeBtn` comment cites 2.5.8 by
number. But the **accessibility frame** is what VoiceOver draws its focus rectangle around and what
touch-to-explore hit-tests, so a 20pt-tall labelled node is a real barrier even where a finger lands
fine.

So Cluster A was never one sweep of nine. It is three groups, and Sky ruled on 2026-08-20: fix the
frames that have no floor at all, fix the two where the slop math actually fails, leave the
documented idiom alone.

### Fixed — genuine frame failures

| ID | Control | Was | Cause |
|---|---|---|---|
| **SW-12** | Home "Report a barrier" FAB | **105×42** | no `minHeight`; 12 + 12 + ~18pt of ink = 42. The **primary CTA**, 2pt under. MapScreen's own FAB already carried 48. |
| **SW-10** | Home search summary | **358×20** | the bar *is* 48 — but A11Y-214/SR-040 puts the label on the inner `Text`, so the frame was the text. The pad moved onto the labelled node; **the bar is still 48 and nothing moved visually.** |
| **SW-22 + SW-43** | list-row titles ×4 | **376×22 · 318×21 · 320×29 · 326×22** (17e) | four copies of one de-flattened row pattern, none with a height floor. The "Show on the map" button beside each is a correct 44×45 — which is what made the title read as an oversight. |
| **SW-40** (field) | display-name field | **286×39** | the 44 is on `Input`'s **wrapper**; the accessible element is the inner `TextInput`, which had no floor of its own. |
| **SW-25** | copy-coordinates | **21×24** | slop reached exactly 44 tall and only 41 wide. More slop was unavailable — the left neighbour is selectable coordinate text, a real target — so it took a width floor. |
| *(sweep)* | MyWatched "All" chip | **41×45** | had `minHeight`, no `minWidth`. Found in the census, not in the brief. |

> ### ⚠️ A CORRECTION I OWE THE FIRST COMMIT
>
> `34e636d` claimed the `Input`-primitive edit closed **three** census misses at once — the
> display-name field, Tasks "Search flags" and Feedback "Reply email". It closed **one**.
> **`Input` has exactly one call site in the whole app** (that display-name field); the other two are
> raw `TextInput`s with their own styles, which that edit never touched. I asserted a shared
> primitive without checking who used it, and **the device census is what caught it** — both fields
> still measured short on the rebuilt app.
>
> They needed a separate fix, and finding out why produced a rule worth keeping:
>
> **A bordered `TextInput` reports its accessibility frame INSIDE its own border.** Measured:
> "Search flags" `minHeight: 44` → **43**; "Reply email" `minHeight: 44` → **42**. Both already
> carried the project's 44. No 44 written on a bordered input can satisfy a census that reads the
> AX frame. The fix is `+ 2 × borderWidth`, and the model predicted the result exactly — 42 → **44**,
> 43 → **45**. A plain `View` is unaffected: the row titles fixed in the same wave land on **44**
> exactly.
>
> The `Input` edit itself still stands, and this strengthens rather than weakens it — its border is
> on the wrapper `row` and the inner `TextInput` is borderless, so its 44 is a real 44 and no
> headroom was added there. A third field, MapScreen's `nameInput` (**308×43**), turned up in the
> same class while walking SW-32 and is fixed with it.

### Fixed — where the slop math actually failed, and the number was never the point

- **SW-50** remove-photo badge (**28×29**). Its *"28 + hitSlop 8 = 44 effective (WCAG 2.5.8)"*
  comment was true only in theory. The badge was a **child of the thumbnail Pressable**, which sets
  `overflow:'hidden'` — so the top/right 8pt of that slop is clipped on Android — and it sat inside
  the lightbox's own tap area, which **is** the reported symptom: a miss opened the photo instead of
  removing it. Remove is now a sibling in a non-clipping wrapper owning a real 44pt corner. The
  visible disc is still 28 and still at `top:4/right:4`.
- **SW-35** legend close (24×24 + `hitSlop={12}`). Pinned at `top:2/right:2`, so **10pt of that slop
  fell outside the GlassSurface entirely.** The box is a real 44 now and reaches *inward* over the
  legend's non-interactive labels — the same reasoning A11Y-223 uses, applied in the direction that
  exists. **The heat-notice half is in-bounds and stays on the idiom.**

### Deliberately NOT changed — recorded, not overlooked

**SW-09** clear-search (guard-pinned at `hitSlop={14}`), **SW-33** filter-panel collapse (32+16 =
48, documented), **SW-40 tier pill** (33+16 = 49, documented), **SW-29** map markers (Sky's decision
#4, native convention).

Two more the census reports as failures that are **not ours to size**: the 63×28 `Switch` elements
(that is the native `UISwitch`) and the map's 29×11 **"Legal"** link (Apple's own MapKit attribution
control — it is not in this codebase at all).

> One false comment corrected in passing: `tierPill`'s claimed *"44pt min height"* while its style
> has always said `minHeight: 32`. The slop makes the control fine; the comment would have
> mis-guided the next edit.

---

## CLUSTER B — SW-13 + SW-38 · `3cc06e7`

The count is not ours. `@react-navigation/bottom-tabs` 7.16.2 builds each tab's iOS label in
`BottomTabBar` as `` `${label}, tab, ${index + 1} of ${routes.length}` ``, and `routes.length`
counts every registered screen — including the three with `tabBarButton: () => null`.
`tabBarItemStyle: { display: 'none' }` changes neither number; the label is computed before the
button function is called and returns `null`.

SW-38's half is the one worth naming: `Admin` is registered only when `useIsAdmin()` resolves true,
and that hook starts at `null`. So the count was wrong for everyone **and** disclosed account role —
audibly, and visibly flipping 5 → 6 a moment after the screen settled.

Fixed with `tabBarAccessibilityLabel`, the one hook the library offers to short-circuit its own
string, **derived from a single `VISIBLE_TABS` list** so the count cannot drift from the bar again.
iOS-only, matching the library's own gating — overriding everywhere would invent a new Android/web
announcement no walk has looked at.

---

## CLUSTER C — SW-39 · `86636d8`

The tiles read **6 REPORTED · 0 VERIFIED · 3 RESOLVED** two inches under a feed saying *"Your report
was verified · +10 pts"* twice. `reported` is a lifetime total; `verified`/`resolved` read
`flags.status`, a current-status snapshot. A report verified and then resolved leaves the verified
bucket. Every number true, the row not.

**The fact that decided Sky's call:** the snapshot is *already rendered, correctly, one row further
down* — the per-status pill row shows open / verified / resolved / rejected, all four, and always
did. Relabelling the tiles as current-status and adding a Rejected tile would have made four tiles
duplicating the row beneath them. So the tiles now answer *"what have I done, ever"* and the pills
answer *"where do my reports stand"*.

Counted from `point_events` — append-only, so an award is written on the transition and never
revoked, which is exactly the question. Server-side (`head: true`), deliberately **not** derived
from `getPointEventHistory`, which caps at 50 rows and would under-count silently.

> **Known limit, stated rather than hidden:** `point_events` begins at the 2026-05-30 trust-score
> migration and was not backfilled, so a report verified before that date does not count. If the
> table is missing entirely the tiles fall back to the snapshot — what this screen showed
> yesterday — rather than a confident zero.

**The points trigger was not touched.** The brief was explicit and right: nothing here is a question
about what earns points.

---

## CLUSTER D — SW-44 · `ec328bf`

`displayName ?? 'Member'` then `.slice(0, 2).toUpperCase()` → **"ME"** on every anonymized row. On
screen: 1st, 3rd and 4th all wearing a badge reading *me*, while the row that actually **was** the
signed-in user wore "JA".

The `'Member'` label is right and stays — it is the privacy-preserving name for someone who has not
set one, and it is what a screen reader announces. Only the derived letters were wrong. No name, no
initials: an anonymized row draws a person glyph, following the icon-fallback idiom `RemoteImage`
already uses one component up.

Named rows now go through `getInitials()` — the tested helper ProfileScreen has always used. **Two
deliberate consequences:**

1. A two-word name's monogram changes. "Jarvis Mckneil" was **JA** (first two characters) and is now
   **JM** (one code point per word). The leaderboard was the odd one out; it matches Profile now.
2. The **F59 surrogate-pair bug is fixed here too** — `.slice(0, 2)` counts UTF-16 code units, so an
   emoji-leading name was cut in half and rendered as mojibake.

This is the screen's **first behavioural test**. Two harness facts are written into it because both
would have made it pass against the broken code: monograms carry `decorativeProps`, so RNTL hides
them from queries unless asked (a bare `queryAllByText('ME')` returns `[]` either way), and the
rendered list does not survive past the `waitFor` that finds it.

---

## CLUSTER E — SW-49 + SW-20 · `f11451b`

**The mechanism, confirmed rather than assumed.** The brief said the walk established the symptom,
not the cause, and asked for the cause first. It is this: `AuthProvider` starts at
`{ user: null, loading: true }` and resolves `getSession()` async. `SettingsScreen` destructured
`{ user }` and **never `loading`**, so for the frames before that lands a *signed-in* user's push row
is indistinguishable from a guest's — `disabled`, undimmed, unexplained, and `handlePushToggle`
returning through `if (!user || pushBusy) return;`, the one silent path in that handler.

Which makes **SW-49 and SW-20 the same bug from two ends.** For a guest that window never closes.

**Both handlers the brief named were already honest.** `handlePushToggle`'s Switch is *replaced* by
an `ActivityIndicator` while `pushBusy` — so that half of its guard is unreachable — and
`runStatusChange`'s five triage buttons swap in spinners too. The defect was in their **neighbours**,
sharing the same busy flag with no visual treatment at all:

| Surface | Controls | State while busy |
|---|---|---|
| `FlagDetailModal` | **11**, Close (✕) included | pixel-identical to live. The sheet could not be dismissed and nothing said why. |
| `ReportFlagModal` | severity discs, category pills, template chips, tag chips | `disabled={submitting}` with `submitting` absent from every style array — five full-saturation severity buttons answering nothing. |
| `ProfileScreen` | realtime Switch | `disabled={savingRealtime}`, no dim. |

The house pattern already existed and this restores it: `SettingsRow` applies
`disabled && styles.rowDisabled` plus a busy spinner. **The push row is the one row in that file
that does not go through `SettingsRow`** — which is exactly how it missed both halves.

The signed-out explainer says what push needs and why (it follows the account, not the device) and
feeds the subtitle **and** the `accessibilityHint` from one constant so the two cannot drift. It
appears only once auth has **settled**: while `loading` the row dims and waits, because telling a
signed-in user to sign in would be a new wrong answer replacing the old silent one.

---

## CLUSTER F — SW-08 + SW-53 · `051ebd1`

### SW-08 — the framing needed a correction before the fix

**The copy was telling the truth.** `emptyLocal` is gated on `hasCenter`, so that caption cannot
appear on the fallback at all — the walk was on a simulator located in San Francisco, where "no
reports here" was exactly right, and distances were correct throughout, as the finding itself noted.

What *was* wrong sits underneath: `FALLBACK_PEEK_REGION` hardcodes San Francisco, so a user with no
location and no search — the case the fallback exists **for** — saw an empty map of a city this app
has never held a report in.

Sky took the fork. **Not the swap the fork-brief proposed:** a second hardcoded city is the same
mistake with better coordinates and goes stale the day there is a report anywhere else. The peek
**fits the loaded reports**. That claims nothing about where the user is, so the honesty fence
`regionContainsPoint` documents still holds and distances stay gated on a real centre. The SF
constant does not move — it is the last resort for the one case that cannot be fitted (no centre
**and** no data), where no viewport can be honest anyway.

**The ratified copy was not touched**, per Sky, and its byte-pinned test still passes untouched.

### SW-53 — bigger than the brief said

CLAUDE.md documented four awards. **The app pays nine.** Five awarding triggers live *only* in
`supabase/migrations/2026-05-30_trust_score_system.sql` and were never folded back into
`schema.sql`, so every reader downstream inherited the gap — CLAUDE.md, `src/lib/points.ts` (whose
own docblock calls itself *"the single source of truth for any UI copy that states point values"*),
and at the end of that chain **the in-app Help FAQ**, which told users they earn 10/15/3/7 and never
mentioned the +5 for filing, +3 for a photo, or +1 for a comment.

Reconciled against the SQL, not the prose:

| Trigger | Award | The condition that matters |
|---|---|---|
| `handle_flag_submitted` | **+5** | skipped entirely when `user_id IS NULL` — **anonymous reports earn nothing** |
| `handle_flag_photo_added` | **+3** | paid to the **flag owner**, **once per flag** however many photos |
| `handle_comment_added` | **+1** | no dedupe, no cap, no self-check |
| `handle_comment_vote_added` | **+2** | paid to the **comment author**, first 10 votes only |
| `handle_point_event_streak` | **+5** | every completed 7-day multiple |
| `handle_flag_status_change` | +10/+15 reporter, +3/+7 actor, −20 admin reject | the four this repo already knew |

`POINTS` now carries all of them **with each award's real conditions written beside it** — "+3 for a
photo" without "once per flag, to the owner" is how the next piece of copy gets it wrong. CLAUDE.md
gets the full table; `schema.sql` gets a warning at the top of its trigger, because a reader who
opens only that file will conclude it is the whole economy.

**No SQL was applied. Files only.**

And a test now pins the app's numbers to the SQL that pays them, reading the real migration files.
**Nothing in this repo did that before** — the only cross-check was CLAUDE.md's own prose warning
that the Tasks flash strings are *"coupled to the trigger"*, and prose is exactly what drifted.

### Found while verifying SW-32 — an unpinned A11Y-213 instance

`FilterPresetsModal`'s preset row wrapped **five real controls** — Apply, Rename, Delete, and
mid-rename a `TextInput` with Cancel and Save — in a `View` carrying `accessibilityRole="button"`
and a label, over a container with no press handler. Wrong under both readings and there is no
third: on web `role="button"` makes descendants presentational and they leave the tree; on iOS the
props are inert without `accessible`, so the row announced an identity it never had. Made plain and
added to `accessibleParentTrap.guard`. Nothing is lost — the name and summary are visible text, and
every control already carries its own label.

---

## THE HOUSE GUARDS THIS WAVE COLLIDED WITH

Each fired on a real change, and each was reconciled by teaching the guard the new fact.

| Guard | Collision | Resolution |
|---|---|---|
| `dismissalStandard`, `sheetPull`, `keyboardClass`, `accessibleParentTrap` (**four at once**) | see below — a doc block detonated a landmine in the shared source scanner | Comments converted to `//` form, per a rule **already written in the codebase** that I had not read. |
| `HomeScreen.peekLocale` "Fork 1 fence" | pinned the SF fallback as a **fork reserved for Sky**, and pinned `peek:default` + a `[center]` memo | **Sky took the fork on 2026-08-20.** The byte-for-byte SF pin **survives unchanged** — the answer was not to move the constant. The two structural assertions were updated and a new one pins fit-before-fallback, which is the fork's actual content. |

### ★ The landmine, because it will fire again

Three files — `FlagDetailModal`, `ReportFlagModal`, `ProfileScreen` — set the web picker's MIME
filter to a string whose last two characters are a slash and a star. The guards' `stripComments`
regex does not know about string literals, so it reads that as an **unclosed comment**. Harmless
only while no closing pair follows it in the same file.

My disabled-style notes were written as doc blocks. Each supplied one. That blanked ~1,900 lines
from those scans — `<Modal>` tags included — and four unrelated guards went red at once.

**`FlagDetailModal` already carried a warning about this**, written after the same trap was hit
twice before. It was right and I did not read it first. Its stale *"line 377"* pointer is corrected
to name the assignment instead (the line had drifted to 496 — the one part of that warning that
could rot), and the third occurrence is recorded in it.

**Fifteen guard files carry their own copy of that regex.** Teaching all of them about string
literals is a real fix and a separate one — a prototype string-aware version was written and
verified to strip correctly on all three files while preserving line counts, but replacing fifteen
copies is not a MED-wave change. **`ProfileScreen` carries no such warning and should get one.**

---

## SIMULATOR RE-WALK

**Build:** `npx expo run:ios --configuration Release --no-bundler` on **iPhone 17e**
(`9C9D3ED6…`), from the branch. `Build Succeeded`, same sim-release type as the walk. **The 17e is
the smaller phone — the one every geometry finding was worse on.**

**The measurement layer had to be rebuilt first.** Wave 2 recorded that WebDriverAgent did not
survive the reinstall, and it was gone from this Mac entirely — no source tree, no DerivedData. It
is the only thing on this machine that can read an AX tree *with frames*, and the census **is** the
verification for Cluster A, so: `npm i appium-webdriveragent` (16.5.1) + `xcodebuild
build-for-testing` with Xcode 26.6 → `TEST BUILD SUCCEEDED`, runner on port 8100, driven by the
in-repo `tools/wda.py`. **It survived two app reinstalls this session**, contra Wave 2's experience.

### ✅ Measured, before → after

| ID | Control | Walk | Now (17e) |
|---|---|---|---|
| **SW-12** | "Report a barrier" FAB | **105×42** | **105×48** |
| **SW-10** | Home search summary | **358×20** | **308×45** |
| **SW-22/43** | Tasks row titles | **326×22** | **44** (n=13, shortest) |
| **SW-25** | Copy coordinates | **21×24** | **44×24** (width was the short axis) |
| **SW-35** | Collapse heat map legend | **24×24** | **45×44** |
| **SW-40** | Tasks "Search flags" | **224×43** | **224×45** |
| **SW-40** | Feedback "Reply email" | **398×42** | **348×44** |
| *(SW-32)* | "Filter set name" | **308×43** | see below |

**On Home, Tasks and Feedback the census now reports ZERO interactive elements under 44** in either
axis — not just the ones on the list.

### ✅ Unchanged, and that is the point

| Control | Walk | Now | Why |
|---|---|---|---|
| Dismiss heat map notice | 24×24 | **24×24** | in-bounds; stays on the documented idiom |
| Collapse filter panel (SW-33) | 90×32 | **90×32** | 32 + 16 = 48 effective, documented |

Its sibling *is* fixed and it is not — which is exactly the split Sky ruled on, visible in one
census.

### ✅ Cluster B — verified as a guest

```
Home, tab, 1 of 3      Tasks, tab, 2 of 3      Profile, tab, 3 of 3
```

Was "1 of 5". **The admin case cannot be verified by me** — it needs a signed-in admin account — but
the count is now derived from `VISIBLE_TABS`, which `isAdmin` does not touch, so the two roles read
the same list by construction.

### ✅ SW-20 / SW-49 — verified as a guest, on screen and in the tree

The push row now reads **"Sign in to turn on push notifications — they follow your account, not this
device."** (was "Get notified when your flag is verified or resolved.") and the whole row is
visibly dimmed against the un-dimmed banner-preferences row directly above it. The switch reports
`enabled=0`. **Tapped it immediately on mount:** no state change, no alert — and now the row says
why, in text and in its `accessibilityHint`. Evidence: `shots/wave3-verify/SW20_push_row_guest_explained_17e.png`.

Compare the walk's own evidence for the same control: *"switch renders ON, undimmed, full opacity"*.

### ⛔ SW-32 — walked, and the premise did not hold

Detailed in `75701e0`. Both halves fail on the smaller phone:

| Claim | Result |
|---|---|
| "Save absent from the AX tree" | **Present** — `Save filter set` 149×45, alongside the header, the TextField and Cancel. |
| "sits under the keyboard" | **Clear of it** — the dialog is centred with the keyboard ~135pt below the button. |

Save reports **`enabled=0`** with an empty draft, which is correct and is *announced* — so it is not
a silent no-op either.

> **The observation was real; the diagnosis was not.** My own first census — 5 s after the tap —
> contained none of the dialog, only the map beneath it. A re-census 3 s later had all four
> elements. It is a transparent `Modal` with a fade, and a snapshot taken across that transition
> reads the layer below. Same shape as SW-48's correction to SW-31: **re-verify before anyone writes
> a fix here.**

### Confirmed not-ours, on the map

The census reports a **"Legal" link at 29×11**. It is MapKit's own attribution control — it is not
in this codebase. Recorded so a future sweep does not chase it.

### ⚠️ Declared limits — read before trusting the table

- **Guest only. An agent may not enter a password.** That leaves **SW-39** (Profile tiles),
  **SW-44** (leaderboard), **SW-40's display-name field**, **SW-50** (the photo picker is signed-in
  only — *"Sign in to add a photo"*) and the MyWatched "All" chip **unmeasured by me on device.**
  All are covered by tests proven to fail against the pre-fix source, which is evidence about
  structure, not about pixels.
- **`Input` has exactly one call site in the app — that display-name field** — so the one place the
  primitive is used is the one place I cannot reach. Its fix rests on the border model, which two
  independent fields on two different screens both fit, plus the guard.
- **17e only.** The Pro Max was left shut down deliberately: Wave 2 recorded that two booted
  simulators plus a native build drove load average past 500 and left 267 CoreSimulator processes.
  Every finding here is worse on the smaller screen, so this is the harder case, not the easier one.
- **Cluster E's `FlagDetailModal` and `ReportFlagModal` dims were not caught mid-flight.** Producing
  a `busy` window long enough to census means holding a real network write open, which I cannot
  stage against production. Structural, and tested.
- The OS location dialog fired on the Tasks tab and was **declined**, per the walk's deny-first
  strategy, leaving the simulator's permissions as they were found.

---

## DECISIONS FOR SKY

1. **Merge `fix/simwalk-w3-med-2026-08-20`** — eight commits, `34e636d` → the SW-32 finding. Gate
   green. Nobody else merges.
2. **SW-32 needs no fix.** Its ledger row should be corrected the way SW-48 corrected SW-31, so a
   later wave does not pick it up and "fix" a dialog that works.
3. **The `stripComments` landmine** — fix all fifteen guard copies, or add the warning comment to
   `ProfileScreen` and `ReportFlagModal` and leave it? A prototype fix exists and is verified.
4. **SW-29 (map markers 38×40)** stays accepted as convention, per your call. Recorded here so it is
   a decision on the record rather than an omission.

## DELIBERATELY NOT FIXED

- **SW-32** — walked on the 17e, and **neither half held**. Save is present in the AX tree (149×45),
  the dialog sits clear of the keyboard, and Save is correctly `enabled=0` with an empty draft —
  announced, so not a silent no-op. The hypothesis before the walk was exactly that empty-draft
  disabled state, and it was right, but that is correct behaviour rather than a defect. **The
  "absent from the AX tree" observation was real and I reproduced it** — as a snapshot taken across
  the modal's fade. Full detail in the re-walk. Same shape as SW-48's correction to SW-31.
- **SW-09, SW-33, the SW-40 tier pill, SW-29** — on the documented house idiom, per Sky's call.
- **SW-48** — not a fix. Wave 2 left the recovery path alone, which is what it asked for. Confirmed.

**Rollback:** each commit is independent and reverts cleanly, newest first.
