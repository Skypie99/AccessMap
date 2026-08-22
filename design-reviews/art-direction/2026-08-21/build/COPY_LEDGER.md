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
