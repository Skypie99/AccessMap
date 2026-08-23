# COPY LEDGER — Flagstone art-direction build series (2026-08-21)

Every new or altered user-facing string across the build prompts, for Sky to ratify
before anything merges. Columns: string · screen · board / rule · replaces.

Guarded strings a builder never edits: Terms · Privacy · the moderation texts ·
"Continue" · the Replay-tutorial row · the Legend row rhythm · the mission statement.
Zero em dashes in new copy.

---

## Prompt 00 — Phase 0 (PRE-SUBMISSION)

**No entries. Phase 0 changed no user-facing string.**

All six items are geometry, colour or line-count changes. The words that pass
through them are byte-identical to `main a27864b`:

| Item | String involved | Status |
|---|---|---|
| 0.1 | "Explore" | unchanged — dropped from view at >=1.5x, still the bar's accessible name |
| 0.2 | flag descriptions (user data) | unchanged — no longer clipped |
| 0.3 | every `ScreenHeader` subtitle | unchanged — no longer clipped |
| 0.4 | "Your anonymous report still counts. Sign in to add a photo and help verifiers act faster." | unchanged, word for word, including the inline "Sign in" |
| 0.5 | "Verify" / "Directions" / "Save" | unchanged — fill colour only |
| 0.6 | the Tasks badge count | unchanged — badge colour only |

### SKY-WORDS-REQUIRED (banked, not blocking Phase 0)

**W-01 · the report form's guest sign-in nudge.** Item 0.4 met the 44pt floor by
promoting the whole sentence to the control, because "Sign in" was a nested
`<Text onPress>` and nested text can carry neither hitSlop nor padding. The
*preferred* composition is the one the anon banner three sections above uses — a
standalone sentence with a discrete padded "Sign in" link beside it — and that
needs the sentence re-worded so it reads whole without the link inside it
(today's sentence breaks in half around it). Wanted: one nudge sentence that
stands alone. Not urgent; the floor is met either way.

---

## Prompt 01 — Phase 1a (Dynamic Type rules)

### New user-facing strings — PLACEHOLDERS, awaiting Sky's ratification

| # | String | Screen | Board / rule | Replaces |
|---|---|---|---|---|
| W-02 | `See all {n} on the map` | Home, at the end of the CLOSEST card | Board 01 | nothing — the list previously just stopped |

**W-02 detail.** Rendered as both the visible label and the accessible name, with
the live flag count interpolated ("See all 13 on the map"). It navigates to
`FullMap`. Placeholder taken from board 01; alternatives Sky may prefer: "See all
13 on the map" / "Open the full map" / "View all 13 barriers". Sentence case, no
em dash, consistent with the house voice. **Nothing else in Phase 1a adds or
edits a user-facing word.**

### Strings deliberately NOT changed in Phase 1a
- The Legend's status paragraph was left whole. Item 1.6 proposed splitting
  "Open — reported, not yet checked. Verified — … Resolved — …" into three rows
  at the em dashes; that rewrites ratified teaching copy, so it is banked for
  Sky rather than done. See the Phase 1a build report.
- Every string touched by the recomposition work (the Home census, "Report",
  "Search a place", the severity meanings) is byte-identical; only which of them
  is VISIBLE at a given text size changed, and each hidden one keeps its words as
  the control's accessible name.

---

## Prompt 02 — Phase 1b (FlagDetail + the sheet material)

### New user-facing strings — PLACEHOLDERS, awaiting Sky's ratification

| # | String | Screen | Board / rule | Replaces |
|---|---|---|---|---|
| W-03 | `Severity {n} of 5 · {word} · {status}` | FlagDetail header (visible, uppercase) | Board 03, rule F2 | the amber "Severity {n} · {word}" pill and the "• Open" status pill |
| W-04 | `Reported by {attribution} · {when} · {distance} away · {n} min walk` | FlagDetail meta | Board 03 item 3 | the four tracked-caps labels REPORTED BY / DATE / LOCATION and their values |
| W-05 | `Copy coordinates` (visible link text) | FlagDetail meta | Board 03, Q17 | the raw coordinate string `49.87435, -119.35882` plus a bare ⧉ glyph button |
| W-06 | `Community check` | FlagDetail, read mode only | Board 03 variation B | nothing — the triage row carried no label |
| W-07 | `Something wrong with this report?` | FlagDetail, end of the body | Board 03 item 9 | nothing — Report was a bare pill in the navigation row |
| W-08 | `Map` · `Directions` · `Share` · `History` · `Watch` / `Watching` · `Edit` · `Delete` | FlagDetail More row (12pt labels under the circles) | Board 03 item 7 | the full pill labels "View on Map", "Share", "History", "Watch"/"Watching", "Edit", "Delete" — each survives verbatim as the control's ACCESSIBLE NAME |
| W-09 | `Why Flagstone` | About, section heading | Q11 | nothing — new section |

**W-03 detail.** The words are the shipped ones (`SEVERITY_LABELS`,
`STATUS_LABELS`); what is new is the ORDER and the sentence that joins them, plus
the "of 5" which the pill only ever said to screen readers. Uppercase is
presentation; the spoken label is composed from `severityA11y` + `statusA11y`, so
what VoiceOver reads is byte-identical to what the two pills said.

**W-04 detail.** Every attribution string is verbatim from `main` — "Anonymous"
(a choice, `user_id IS NULL`), "You", "Another community member". `relativeTime`,
`formatDistance` and `formatWalkingEta` are the shipped helpers, so "2d ago",
"433 m" and "11 min walk" are the same words the Tasks and Nearby cards already
use. The walk segment suppresses itself past an hour on foot, which is shipped
behaviour (SW-27). The spoken version keeps the full timestamp and
`speakDistance`, so nothing the eye gets is lost to the ear.

**W-08 detail.** These are the SHORT forms under the circle icons. The long
labels are unchanged and still carry the meaning for assistive tech ("View on
Map", "Get directions to this flag", "Share this flag", "View status history",
"Watch this flag" / "Stop watching this flag", "Edit this flag", "Delete this
flag"). WCAG 2.5.3 holds in every case: each accessible name contains its visible
word.

### SKY-WORDS-REQUIRED — two decisions, both one-line

**W-10 · "Report it".** Board 03 writes the abuse path as
*"Something wrong with this report? **Report it**"*. **Not built as written.** The
link's visible word is `REPORT_CONTROL_LABEL`, so the sentence currently reads
*"Something wrong with this report? **Report**"*.

Why: "Report it" would have to become the control's accessible NAME as well
(WCAG 2.5.3 — a voice-control user says what they see, and a name of "Report"
under visible text of "Report it" makes the control inert to them). That name is
Sky's ratified §SKY-3c word, and RAILS 6 forbids a builder editing ratified copy.
Building the sentence and leaving the name behind would have shipped a known
voice-control failure to satisfy the letter of the board.

To take the board's wording, change one line in `src/lib/copy.ts`:

```ts
export const REPORT_CONTROL_LABEL = 'Report it';
```

That is single-sourced, so the link, its accessible name and the report sheet's
own title all follow. `reportControl.guard` polices the NEW word automatically.
(If the sheet title should stay "Report" while only the link says "Report it",
that is a second constant and a slightly larger change — say so and it is done.)

**W-11 · the mission statement says "AccessMap".** Shipped **verbatim**, as
instructed, and pinned character for character by `mission.guard.test.ts`:

> "The goal of AccessMap is to make the community and environment better for
> everyone, through those who have the capacity to help. Progress happens in the
> background for everyone's benefit, because accessibility benefits everyone."

The app is called Flagstone. About now reads "Why Flagstone" and then a sentence
naming AccessMap, one line apart. **This is deliberate and it is your call** —
the rename sweep must not reach into ratified copy on autopilot. If it should
follow the rename, edit `MISSION_STATEMENT` in `src/lib/copy.ts` and the matching
`RATIFIED` line in `src/__tests__/mission.guard.test.ts`; both surfaces follow.

### Strings deliberately NOT changed in Phase 1b
- **"Resolved", not "Mark resolved".** Board 03 draws the segmented cell as "Mark
  resolved"; the prompt says use "Resolved" unless you ratify the change, so the
  shipped word stands. Its accessible name is still "Mark this flag resolved".
- **"Flag as wrong"** (`DISPUTE_CONTROL_LABEL`) and **"Report"**
  (`REPORT_CONTROL_LABEL`) are untouched — §SKY-3c wording, both still
  single-sourced from `copy.ts`.
- **"No description provided."**, the comments empty states, the reopen flow, the
  photo strings, Terms, Privacy and every moderation text: byte-identical.
- **"No photos"** still exists and is unchanged — it just no longer renders on the
  detail sheet, where it reported an absence. It stays in the report form, where
  it is an invitation.

---

## Prompt 03 — Phase 1c (THE MAP)

**No new strings. Every word on the new control already exists in the app**, reused
byte for byte:

| String | Where it comes from | Now also used by |
|---|---|---|
| `Legend` (visible label) | `HeatmapLegend.tsx` collapsed chip | the persistent Legend pill |
| `Map legend` (accessible name) | the ⋯ tool-sheet row, `MapScreen.tsx` | the persistent Legend pill |
| `Opens a guide explaining flag categories and severity` (hint) | the ⋯ tool-sheet row | the persistent Legend pill |

### SKY-WORDS-REQUIRED — one collision, created by the reuse

**W-12 · Two controls can now read "Legend" at the same time.**
When the heat layer is ON *and* the user has collapsed the heat legend to its
chip, the map's bottom-left slot stacks two pills both showing the word
**Legend**: the heat chip (accessible name "Show heat map legend") above the new
severity Legend pill (accessible name "Map legend"). They explain different
things — one is the heat ramp, one is the severity grammar and the categories.

Sighted users see one word twice; screen-reader users hear two distinct names, so
the accessibility floor holds and this is a clarity defect, not a barrier. It is
narrow: it needs heat on AND the heat legend collapsed.

Not fixed here, because fixing it means writing a word, and this prompt writes
none. Sky's call. The options, cheapest first:

1. Rename the heat chip to `Heat` or `Heat map` (it is the newer, narrower
   object, and its own accessible name already says "heat map"). One string.
2. Rename the new pill to `Severity` or `What the colours mean`. Loses the
   plain word for the product's teaching surface, which is the thing M4 was
   trying to make findable.
3. Leave it. Two "Legend" pills in one rare state.

Recommendation: **option 1** — it is one word, on the object whose name is
already qualified everywhere else it is spoken.

---

## Prompt 04 — Phase 2a (ONE FLAG FAMILY + the Tasks chrome)

Most of this phase moves words rather than writing them. The severity pill and
the status pill are retired, and the words they carried (`SEVERITY_LABELS`,
`STATUS_LABELS`) move into the census sentence unchanged. Three strings are
genuinely new, all of them on the ⋯ tool sheet, and all three are modelled on
the map's already-shipped equivalents.

### New user-facing strings — PLACEHOLDERS, awaiting Sky's ratification

| # | String | Screen | Board / rule | Replaces |
|---|---|---|---|---|
| W-13 | `Task tools` | Tasks, ⋯ sheet title | Board 09 | nothing — new surface |
| W-14 | `More task tools` (accessible name of the ⋯ circle) | Tasks control row | Board 09 | nothing — new control |
| W-15 | `Select multiple flags, or clear the active filters` (hint on the ⋯ circle) | Tasks control row | Board 09 | nothing — new control |

**W-13/14/15 detail.** All three mirror the map's shipped ⋯, which is
`More map tools` with the hint `Send feedback, open the map legend, refresh
flags, or save a place`. Keeping the same shape means a user who has met one ⋯
meets the same object here, and rule W3 (one name per destination) holds
because the two sheets are different destinations with different contents.
The map's own tool sheet has no visible title (it is an inline panel); this one
is a `Sheet`, and `Sheet` renders a title, so `Task tools` had to exist. If you
would rather it read `Tools`, `More`, or `Task options`, it is one string in
`TasksScreen.tsx`.

### Format changes — same words, different arrangement

| # | Was | Is | Where |
|---|---|---|---|
| F-01 | `OPEN` + a separate count pill reading `9` | `OPEN · 9` (count in mono) | Tasks section header |
| F-02 | `Nearest open barrier · Broken sidewalk · Severity 4 · 433 m` on one wrapping line | two deliberate lines: `Nearest open barrier` / `Broken sidewalk · Severity 4 · 433 m` | Tasks banner |
| F-03 | `Severity 4 of 5 · Significant · Verified · 2d ago` | `Severity 4 · Significant · Verified · 2d ago` | Nearby card census |
| F-04 | an amber pill `4 · Significant`, a pale pill `Open`, and a meta line `876 m · 11 min walk · 2d ago` | one census sentence: `Severity 3 · Moderate · Open · 876 m · 11 min walk · 2d ago` | Tasks card |

**F-01 detail.** One "9" per screen. The tab badge keeps its own, because it
counts for a user who is looking at a different tab; two objects saying the same
number a thumb's width apart was the pair worth collapsing.

**F-03 detail — the one place a word actually disappears.** Nearby's visible
census said "of 5" and Home's never did. The family now speaks one sentence, and
Home's is the one Q7 ratified (variation A), so Nearby drops the two words. The
SPOKEN label is untouched: `severityA11y` still says "severity 4 of 5,
Significant" everywhere it is used, and Nearby's own PROTECT-1 label is pinned
byte-for-byte by its test. **If you would rather the family kept "of 5"
visibly**, it is one template in `FlagCard.tsx` and every surface follows.

### Strings deliberately NOT changed in Phase 2a
- **"Verify" / "Resolved" / "Reject" / "Details"** — unchanged, as instructed.
  Board 09 draws the segmented cell as "Mark resolved"; the prompt says keep
  "Resolved" unless you ratify the rename, so the shipped word stands. Its
  accessible name is still "Mark this flag resolved". **To take the board's
  wording**, it is the `label` on the `resolved` descriptor in `TasksScreen.tsx`
  — but note the visible word must then also lead its accessible name (WCAG
  2.5.3), so "Mark resolved" / "Mark resolved — {flag}" go together.
- **"Filter & sort"** — the chip is gone but the word is not: it was already the
  title of the sheet the chip opened, and that is now where it lives.
- **"Select multiple"**, its hint, **"Clear filters"**, its hint, **"Clear
  search"**, **"Search flags"** and the search placeholder: byte-identical. Only
  the placeholder's VISIBILITY changes, and only at large type, where the
  control keeps the same words as its accessible name.

---

## Prompt 05 — Phase 2b (onboarding in the light + sign-in on the primitives)

**Nothing in this phase shipped a new user-facing word.** Board 05's five cards
are drawn with the copy that is on `main` today, verbatim, including its three
em dashes. Everything the board rewrites is banked below.

Two things WERE changed, and both were ruled in the prompt's DECISIONS block
rather than invented by the builder:

| Change | Where | Ruling |
|---|---|---|
| `Maybe later` -> `Not now` | onboarding card 4's decline link (visible label and accessible name) | Q12 — one decline word. The same gesture said two different words two cards apart. |
| `Allow Location` -> `Allow location` · `Turn on Notifications` -> `Turn on notifications` | onboarding cards 3 and 4, visible CTA only | Q12 — sentence case on CTAs. The accessible names ("Allow location access" / "Turn on notifications") are unchanged and still CONTAIN the visible string, so WCAG 2.5.3 holds; `labelInName.guard` passes. |

### ✅ RATIFIED BY SKY 2026-08-22 — all eight shipped, one part declined

Sky took the board's onboarding rewrite on `design/gsp-05b-copy-2026-08-22`.
**Declined:** W-07's `users` → `members`. That is a house-vocabulary change
reaching well past this card, and "users" appears elsewhere; it gets its own
decision if it is ever wanted. Everything else below is now the shipped copy.

**Still open:** the two card-1 sentences at the bottom of this section. Only the
first-launch surface was ratified, and reconciling those two needs one ruling
covering both.

### The eight, as ratified (was: SKY-WORDS-REQUIRED)

Every onboarding string the board draws is a placeholder. Where the board kept
today's sentence it is listed as unchanged; where it rewrites, both are given.

| # | Card | Shipped today | Board 05 proposes | What actually changes |
|---|---|---|---|---|
| W-05 | 1 body | `See an accessibility barrier — a missing ramp, a broken sidewalk, a blocked path? Put it on the map so others know, and so it gets fixed.` | `See an accessibility barrier? A missing ramp, a broken sidewalk, a blocked path. Put it on the map so others know, and so it gets fixed.` | the em dash becomes the question mark, and the question moves to the front. The first sentence a new user reads currently breaks the house zero-em-dash rule. |
| W-06 | 2 title | `Here's how it works` | `Rate how hard it is to get past` | the title stops being a generic table-of-contents line and names the thing the five discs beneath it are teaching. |
| W-07 | 2 body | `Find the spot on the map and add the barrier there, then rate how bad it is. Others verify it or mark it resolved once the issue is fixed. (Signed-in users can add a photo, too.)` | `Every barrier gets a number from 1, inconvenient, to 5, impassable. Others verify it or mark it resolved once it is fixed. Signed-in members can add a photo too.` | three ideas in four lines become the severity grammar plus the loop; the parenthetical becomes a sentence. Note `users` -> `members`, which is a house-vocabulary decision beyond this card. |
| W-08 | 3 body | `We'll use your location to show nearby barriers and place your reports accurately. It's only used while the app is open — never tracked or stored on our servers.` | same sentence, `open, never tracked` | em dash -> comma only. |
| W-09 | 4 title | `Stay in the loop` | `Hear when things change` | the chummiest line in the app becomes plain. This is the "third voice in four screens" the critic pass named. |
| W-10 | 4 body | `Get a heads-up when flags near you are verified or resolved. Totally optional — you can turn this on later in Settings.` | `Get a heads-up when flags near you are verified or resolved. Optional. You can turn this on later in Settings.` | em dash -> stop; `Totally optional` -> `Optional`. |
| W-11 | 5 body | `Go explore your neighbourhood. Every barrier you flag helps someone navigate the world a little easier.` | `Flagstone is built one flag at a time, by people like you. Every barrier you flag helps someone navigate the world a little easier.` | the first sentence borrows How To Help's "one flag at a time" so the finisher says what the NAME means. The second sentence is untouched and is the warmest line in the flow. |
| W-12 | 3 and 4, granted state | `Location is on — you're all set.` / `Notifications are on — you're all set.` | not drawn on the board | two more em dashes, in copy only a returning user sees. Suggested: `Location is on. You're all set.` |

### The two card-1 sentences that describe the same product differently

Not a board proposal — a divergence found in the source and left alone
deliberately, because reconciling it means choosing words.

| Surface | Card 1 body |
|---|---|
| first launch (`OnboardingCards`) | `See an accessibility barrier — a missing ramp, a broken sidewalk, a blocked path? Put it on the map so others know, and so it gets fixed.` |
| Settings replay (`OnboardingModal`) | `Drop a pin where you find an accessibility issue — a missing ramp, a broken sidewalk, a blocked path — so others can plan around it, or help fix it.` |

Same title, same three examples, two different promises about what happens next
("so it gets fixed" against "plan around it, or help fix it") and two different
verbs for the same act ("put it on the map" against "drop a pin"). These two
files already have a guard test dedicated to copy coherence (SW-06 / SW-19), and
this is the one divergence that guard does not cover, because Sky's SW-19 ruling
was that the two surfaces stay different and their copy be honest — which is a
ruling about card COUNT, not about this pair of sentences. **Wanted: one promise
and one verb, said twice, or a recorded decision that the replay speaks to
returning users differently on purpose.**

### Strings deliberately NOT changed in Phase 2b
- **"Continue"** (first launch) and **"Done"** (replay) — guard-pinned, Sky
  ratified 2026-08-21, untouched.
- **"Skip"**, "Skip the tutorial" / "Skip the introduction", "Back", "Next", and
  every permission hint — byte-identical. Skip's VISIBILITY changes (it leaves
  the last card of both surfaces, where there is nothing left to skip); the word
  does not.
- **The Settings replay row**, the Profile reset-intro confirm, and every
  string `onboardingCoherence.guard` pins — untouched.
- **SignIn**: the tagline, both trust lines, the guest link and its hint, the
  guest note, both validation messages, both server-error templates, the
  sign-up confirmation, "Sign in", "Create account", "or", "← Back", and both
  legal labels (which come from `copy.ts`) — every one byte-identical. The
  footer's LAYOUT changed; not one word of it did.

---

## Prompt 06 — Phase 2c (THE REPORT FORM · SETTINGS · PROFILE · EMPTY STATES)

### ✅ RATIFIED BY SKY 2026-08-22 — all 21 strings, and both reversals upheld

Sky reviewed the full list plus the two ⚠ decisions and answered "looks good".
So, recorded explicitly so a later reader does not have to infer it:

- **W-16 through W-36 are the shipped copy.** No longer placeholders.
- **F-05 stands** — Home's list card speaks the ratified A-5 sentence.
- **§SKY-7 section pick S1 is superseded.** Hidden comments and Blocked people
  stay in their own Moderation section. Findability beat the "records of things
  you did" grouping.
- **§C6: a failed refresh is RED**, in MyWatched and HiddenComments, even though
  their rows remain on screen. The rule's own sentence still says amber for
  stale-but-present data; the ruling here is that a failed OPERATION is red and
  an informational notice is amber. **§C6 should gain that sentence** the next
  time the design-system doc is edited.

Still open from this phase, and NOT ratified by the above (they are questions,
not strings): the lock banner's em dash, "Update preferences" -> "Which updates
to show", and the "Your reports" heading colliding with ReportsBreakdownCard's
own title.

---


This phase writes the most placeholders in the series. Nothing below is
shipped-as-final: every row is a builder's draft awaiting Sky's ratification,
and each one names the single place it changes.

Guarded copy that was NOT touched, verified: Terms · Privacy · every moderation
text (`HIDDEN_COMMENTS_*`, `BLOCKED_PEOPLE_*`, `UNBLOCK_ALL_LABEL`) · the
Replay-tutorial row (title, subtitle, hint — `onboardingCoherence.guard` passes
unchanged) · the Legend row rhythm · `MISSION_STATEMENT` (rendered verbatim from
the one exported constant, `mission.guard` passes unchanged) · the report form's
two privacy paragraphs, the EXIF promise, the anon rate-limit strings and the
per-photo alt field · `PUSH_SIGNED_OUT_SUBTITLE` · the §SKY-6 export row ·
`REPORT_CONTROL_LABEL` and `DISPUTE_CONTROL_LABEL`. Zero em dashes written.

### New user-facing strings — PLACEHOLDERS, awaiting Sky's ratification

| # | String | Screen | Board / rule | Replaces |
|---|---|---|---|---|
| W-16 | `At your current location` | Report form, location line | Board 04, Q17 | `at 49.88800, -119.49600` (the raw coordinate, as the sheet's second line) |
| W-17 | `At the pin you placed` | Report form, location line, members placing a pin | Board 04, Q17 | the same raw coordinate |
| W-18 | `Show` / `Hide` (visible link; spoken `Show coordinates` / `Hide coordinates`) | Report form, location line | Board 04, Q17 | nothing — new control |
| W-19 | `Copy` (visible; spoken `Copy coordinates {lat} latitude, {lng} longitude`) | Report form, revealed coordinate | Board 04, Q17 | nothing — new control |
| W-20 | `Choose how hard this makes the path to use.` | Report form, severity meaning line, before a choice | Board 04, Q5 | nothing — the line previously stated severity 3's meaning, because 3 was pre-selected |
| W-21 | `Choose a severity from 1 to 5 to submit this report.` | Report form, Submit's accessibility hint | Board 04, Q5 | nothing — Submit had no hint once a location existed |
| W-22 | `Submit anonymously` | Report form, guest submit (visible AND spoken) | Board 04, Q6 | visible `Submit report` + spoken `Submit report anonymously` |
| W-23 | `FLAGSTONE` | Settings eyebrow | Board 07 | `SETTINGS` (which repeated the title one line below it) |
| W-24 | `Moderation` | Settings, new section heading | Board 07 | nothing — the two rows sat under `Feedback` |
| W-25 | `Sign in` + `Report with a photo, verify other reports, and earn points.` | Settings ACCOUNT row, guests | Board 07, Q15 | `Sign out` / `End your session on this device.` — offered to guests |
| W-26 | `Add photos to your reports` | Guest Profile, "With an account" | Board 08, Q11 | nothing — new card |
| W-27 | `Verify and resolve barriers near you` | Guest Profile, "With an account" | Board 08, Q11 | nothing — new card |
| W-28 | `Earn points and badges` | Guest Profile, "With an account" | Board 08, Q11 | nothing — new card |
| W-29 | `With an account` | Guest Profile, section heading | Board 08, Q11 | nothing — new section |
| W-30 | `Your reports` | Profile, first nav group heading | Board 08 | nothing — the seven rows had no headings |
| W-31 | `Community & account` | Profile, second nav group heading | Board 08 | nothing — see W-30 |
| W-32 | `No badges to show yet` + `Report, verify and resolve barriers to start earning them.` | Achievements sheet, empty catalog | Board 10, §W5 | nothing — the sheet rendered a title over an empty scroll |
| W-33 | `Couldn't load your breakdown` + `Try again` | Profile, ReportsBreakdownCard error | Board 10 | nothing — the card returned `null` and vanished |
| W-34 | `Open Settings` (visible and spoken) + hint `Opens this app's settings, where location access can be turned back on` | Map, denied banner + recenter button, LOCKED denial only | D26 | nothing — new control |
| W-35 | `Location is off and this app can no longer ask. Opens this app's settings.` | Map, recenter button hint, LOCKED denial only | D26 | nothing — the button had no hint |
| W-36 | `Dimmed until location is on. Turn it on in Settings, then report a flag here.` | Map, Report FAB hint, LOCKED denial only | D26 | `Dimmed until location is on. Use the recenter button to turn on location, then report a flag here.` — which survives for every user who CAN still be re-asked |

**W-16/17 detail.** The sheet cannot tell which of the two answers the
coordinate is — `MapScreen` hands it `dropLocation ?? location` and both arrive
as the same object — so a `locationSource` prop now carries the distinction.
Guests only ever see W-16: manual pin placement is a signed-in path by design.

**W-22 detail.** The store dossier (2026-08-05) praised this button for
restating the contract at the moment of commitment. It was praising the
`accessibilityLabel`; sighted users only ever saw "Submit report". One constant
now serves both channels, which is also the only shape that keeps WCAG 2.5.3
once the visible word changes: "Submit report anonymously" does not contain
"Submit anonymously". Members keep "Submit report" unchanged.

**W-25 detail.** The words are the drawer's own ("Sign in"); the subtitle is new
and is the only invented line in that row. If you would rather it ship
title-only, like the privacy and terms rows, delete one prop.

### Format changes — same words, different arrangement

| # | Was | Is | Where |
|---|---|---|---|
| F-05 | `No barriers reported yet.` | `No reports here yet.` / `You could add the first.` (the RATIFIED A-5 sentence, split into the recipe's heading + body) | Home, list card, true zero |

**F-05 detail — one screen was saying two different things about the same
nothing.** The map peek two inches above the list card already spoke Sky's
ratified sentence (`EMPTY_LOCAL_INVITE`) for this exact condition; the card
underneath said something else. The ratified one wins, and the two halves are
DERIVED from that same constant rather than retyped, so the A-5 note's promise
that a rewording stays a one-line swap still holds. **If you would rather the
card kept "No barriers reported yet."**, it is two props on one component.

### Strings deliberately NOT changed in Phase 2c

- **The anon lock banner** keeps its em dash: *"Reporting anonymously — your
  identity is not stored."* The prompt allows removing it "only if Sky
  ratifies", so it stands. The `flexBasis: 60%` reflow is untouched. **To take
  the board's version**, it is one literal in `ReportFlagModal.tsx`:
  `Reporting anonymously. Your identity is not stored.`
- **"Update preferences"** — board 07 drafts "Which updates to show" for the
  verb/noun ambiguity the critic named ("update your preferences" vs
  "preferences for Updates"). Not built: it is a rename of a shipped row with no
  defect behind it, and this phase already writes twenty-odd placeholders. Sky's
  call; it is one string.
- **Tasks' five empty-state branches, MyReports' three, MyWatched's two,
  ActivityFeed's three, HiddenComments' pair** — every word verbatim through the
  EmptyState adoption, including "That's everything nearby — you're up to date",
  which is a list FOOTER and was never part of the empty state.
- **"Your reports"** as the ReportsBreakdownCard's own title is unchanged and is
  a different object from W-30, which is a section heading further down the same
  screen. They do not collide on screen (the card carries its title inside its
  own surface) but they are the same two words twice — flagged rather than
  renamed, because renaming either is Sky's call.

### ⚠ TWO DECISIONS THAT REVERSE AN EARLIER SKY RULING

Both were instructed by the prompt. Both are one-line reverts.

**1. §SKY-7 section pick S1 — Hidden comments moves out of Feedback.**
Sky filed Hidden comments (and later Blocked people) under FEEDBACK on the
reasoning that all four rows are "records of things you did". The critic's
objection is about FINDING them: a user looking for "who did I block" does not
look under Feedback, and these two are the only rows on the screen that control
what other people's content can reach this device. Board 07 gives them their own
section, and this build does. The rows' own copy is untouched; only the heading
above them is new. **To revert:** move the two `<SettingsRow>`s back into the
Feedback `<SettingsGroup>` and delete the heading.

**2. §C6's wording vs. the two failed-refresh banners.**
Rule §C6 as written says: *red when the failure left nothing to show; amber when
stale-but-present data remains.* MyWatched and HiddenComments both show a failed
REFRESH while their rows remain, so by the letter of the rule they were already
correct in amber. The prompt names both files and instructs red. Built as
instructed, because it resolves a real incoherence the rule does not address:
MyWatched rendered its refresh FAILURE in the same amber banner as its
informational notice ("N flags have been removed by their author"), so a failure
and an FYI were the same object; and MyReports and ActivityFeed — the two modals
§C6 cites as already right — render any load failure in `errorBg` regardless of
what remains on screen. The change makes four modals agree.
**The rule may want one more sentence:** amber is an informational notice ABOUT
the data, red is an operation that FAILED. **To revert either banner:** one
style swap (`refreshErrorBanner` -> `missingBanner` in MyWatchedModal;
`errorBg`/`errorFg` -> `warningBg`/`warningFg` in HiddenCommentsModal).
