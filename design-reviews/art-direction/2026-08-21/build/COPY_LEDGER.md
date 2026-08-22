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
