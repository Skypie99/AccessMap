# Feature Push — AccessMap — 2026-05-23

## Summary

Built the **Categories / severity legend on the Map** — the top item on
the AccessMap backlog. A new "?" button on the Map's top row opens a
bottom-sheet modal explaining the 1–5 severity scale (with color names
read aloud) and the six flag categories (with plain-language
descriptions). Born accessible — labels include color names so meaning
is never carried by color alone, section headers use the header role,
and the close target is a full-width 44pt+ button.

Typecheck green before and after. Feature is complete (not phase-1),
reachable from the Map.

## Feature spec (as built)

- **What it does:** Lets a user open a "Map legend" sheet that explains
  what the marker colors and category names on the map mean. Helps
  first-time users learn the encoding without trial-and-error.
- **Where it lives:** A new "?" icon button on the MapScreen top row,
  sitting between the status pill and the filter / refresh / recenter
  buttons. The sheet itself is `src/screens/LegendModal.tsx`.
- **User flow:**
  1. User taps the "?" button.
  2. Bottom-sheet slides up with title "Map legend" and a subtitle.
  3. **Severity** section: 5 rows, each with a colored numbered dot,
     the severity label ("3 — Moderate"), and a one-line meaning
     ("Hard for many users.").
  4. **Categories** section: 6 rows, each with a small glyph in a
     gray circle, the label, and a one-line description.
  5. A short footnote explains points are earned on verify/resolve.
  6. User taps "Close" or the backdrop to dismiss.
  7. No loading/error states — content is static.
- **Components & data:**
  - New file `src/screens/LegendModal.tsx`. Modeled on
    `ReportFlagModal`'s bottom-sheet (Modal + backdrop + card) pattern.
  - In `src/lib/flags.ts`: added `CATEGORY_DESCRIPTIONS`,
    `CATEGORY_ICONS`, `SEVERITY_ORDER`, `SEVERITY_LABELS`,
    `SEVERITY_COLOR_NAMES`, `SEVERITY_DESCRIPTIONS` — kept alongside
    the existing `CATEGORY_LABELS` so the lib remains the single source
    of truth for category display copy.
  - Reuses `severityColor()` from `ReportFlagModal`.
  - In `MapScreen`: one new `useState<boolean>` and one new icon button
    using the existing `iconBtn` style.
- **Accessibility plan (all implemented):**
  - Each severity row is grouped (`accessible`) with a composed label
    that names the color (`"Severity 3, Moderate. yellow. Hard for many
    users."`) — color is never the only signal.
  - Each category row is grouped with `"<label>. <description>."`.
  - The icon/dot glyphs are hidden from the screen reader so they
    don't speak as decorative characters.
  - Section headers use `accessibilityRole="header"`.
  - Trigger button: `accessibilityLabel="Map legend"` +
    `accessibilityHint="Opens a guide explaining flag categories and
    severity"`.
  - Close button is a full-width row, ≥44pt tall.
  - Backdrop tap dismisses; the card swallows taps so they don't
    accidentally close.
- **Assumptions** (resolved at the safest, most conventional choice):
  - **Trigger placement.** Putting the "?" first in the top row so a
    screen-reader user encounters the legend before the controls it
    explains. It uses the existing 36pt `iconBtn` style for visual
    parity with the other top-row buttons — see "Proposals" below for
    a separate touch-target item.
  - **Severity color names.** Used "green / light green / yellow /
    orange / red" — the closest plain-language names to the hex values
    in `severityColor()`.
  - **Category glyphs.** Used unicode glyphs that already render across
    iOS/Android/web without extra fonts. They're decorative, not
    load-bearing.
  - **Sheet height.** `maxHeight: '85%'` with an internal ScrollView so
    content survives large dynamic type without clipping.

## How to try it

```
cd ~/AccessMap
git checkout feat/legend-sheet-2026-05-23
npm start
```

In the running app:

1. Sign in (or stay signed in).
2. You land on the **Map** tab.
3. In the top row, you'll see a new round **?** button to the right of
   the status pill, before the filter (⌕) button.
4. Tap **?** → a sheet slides up titled "Map legend".
5. Scroll: you'll see five severity rows (green→red, "Minor"→"Severe")
   and six category rows.
6. Tap **Close**, or tap the dark area above the sheet, to dismiss.
7. Verify with VoiceOver/TalkBack: each row reads as one item, with
   the color name spoken; the "?" button announces "Map legend, button.
   Opens a guide explaining flag categories and severity."

## What was built (branch feat/legend-sheet-2026-05-23)

```
2c6e62c MapScreen: add "?" button that opens the LegendModal
24303bf add LegendModal and category/severity legend constants
```

- **`src/screens/LegendModal.tsx`** (new, 217 lines) — bottom-sheet
  Modal with Severity + Categories sections. Pattern: same Modal +
  backdrop + card as `ReportFlagModal`; an outer Pressable backdrop
  dismisses, an inner Pressable card with a no-op `onPress` swallows
  touches so card taps don't dismiss. ScrollView inside the card lets
  the sheet stay within a `maxHeight: '85%'` and not clip at large
  dynamic type.
- **`src/lib/flags.ts`** (+50 lines) — six new exported constants
  living next to `CATEGORY_LABELS` and `CATEGORY_ORDER`. No behavior
  change to any existing call site.
- **`src/screens/MapScreen.tsx`** (+16 lines) — imports `LegendModal`,
  adds a `legendOpen` state, adds the "?" icon button as the first
  control in the existing top row, renders the modal next to
  `ReportFlagModal` at the bottom of the screen.

### Patterns explained in plain language

- **The Modal pattern is the same one ReportFlagModal already uses.**
  A `<Modal animationType="slide" transparent>` with a translucent
  backdrop and a white card pinned to the bottom of the screen. Tapping
  the backdrop closes; tapping the card itself does nothing (a `<Pressable
  onPress={() => {}}>` "swallows" the press so it doesn't bubble up to
  the backdrop and dismiss).
- **The composed accessibility label is the standard React Native way
  to make a row read as one thing.** Setting `accessible` on a parent
  groups its children for the screen reader; the parent's
  `accessibilityLabel` becomes the single spoken string. The visual
  text inside is still there for sighted users.
- **The category and severity constants live in `lib/flags.ts`** because
  that's the convention here — `CATEGORY_LABELS` already lived there.
  This keeps display copy in one place so a future feature (e.g. the
  proposed list view, onboarding cards, marker tooltips) can reuse it
  without re-defining strings.

## Proposals (NOT applied — need your review)

1. **Top-row touch targets are 36pt; the accessibility baseline is
   44pt.** The new "?" button matches the existing `iconBtn` size for
   visual consistency, but every button on that row (filter, refresh,
   recenter, and now the new legend trigger) is below the iOS HIG
   target. Recommended fix: bump `iconBtn` to `width/height: 44, borderRadius:
   22` in `MapScreen.tsx`. One-line change, touches four buttons,
   improves accessibility globally on that row. Holding off because it
   straddles the boundary between "feature" and "polish" — Alex's
   territory.
2. **Lift the legend trigger to a shared header pattern.** Right now
   the "?" lives only on the Map. If the proposed list-view feature
   lands, it'll want the same legend. No action needed now, just worth
   knowing — `LegendModal` is already a stand-alone component, so any
   screen can render it with one `useState` and one button.
3. **Optional: move `severityColor()` from `ReportFlagModal` to
   `lib/flags.ts`.** The legend already imports it from
   `ReportFlagModal`, which is a little awkward (the function isn't
   really specific to that modal). Not blocking; just noting.

## Suggested next features (1–2)

1. **Persistent flag-load error banner on the Map** (next item in the
   backlog, proposal P-NEW-2 from the 2026-05-23 QA pass). Replaces the
   one-shot `Alert` in `refreshFlags()` with an in-screen banner the
   user can tap to retry. Smallest possible delta with a real UX win:
   when the network blips, an `Alert` disappears and the user is
   stranded; a banner stays put and is recoverable.
2. **Filter flags on the Map by status.** Adding a status-row to the
   existing filter panel (open / verified / resolved / rejected;
   default open+verified to match `listFlags`). Maps cleanly onto the
   existing chip pattern — no new component types needed.

## Verification

- **Typecheck before:** green (`tsc --noEmit` clean on `main`).
- **Typecheck after:** green (`tsc --noEmit` clean on
  `feat/legend-sheet-2026-05-23`).
- **Reachable via:** Map tab → top row → "?" button (first icon).
- **Matches house style:** uses `Modal + backdrop + card` from
  `ReportFlagModal`; reuses `iconBtn` and `iconText` styles from
  `MapScreen`; constants in `lib/flags.ts` alongside `CATEGORY_LABELS`.
- **Accessibility implemented:** yes — composed labels with color
  names, header roles on sections, decorative glyphs hidden,
  ≥44pt close button.
- **Gotchas:** none broken. `tsc --noEmit` clean (gotcha 1); no
  install (gotcha 2); no map-library imports outside `PlatformMap`
  (gotcha 3); no photo path changes (gotcha 4); no new tables or RLS
  (gotcha 5).
- **Commits:** 2 · **Files touched:** 3 · **+283 / -0**.
- **No secrets committed.**

## How to review

```
cd ~/AccessMap
git diff main..feat/legend-sheet-2026-05-23
# merge:   git checkout main && git merge feat/legend-sheet-2026-05-23
# discard: git branch -D feat/legend-sheet-2026-05-23
```

## Learnings & suggested skill updates

- **Composed `accessible` parent + `accessibilityElementsHidden` on
  decorative glyphs** is the cleanest way to make a "icon + title +
  desc" row read as one screen-reader item. Worth keeping as the
  default pattern for any future row-style list (the list-view
  feature, onboarding cards, etc.).
- **`lib/flags.ts` is the right place for display copy that's reused
  across screens.** This run added 6 constants there with no controversy
  because `CATEGORY_LABELS` had already established the pattern.
- The current `feat/my-reports-2026-05-23` and
  `feat/flag-detail-modal-2026-05-23` branches are still unmerged, and
  the canonical `FEATURES.md` lives only on those branches — so this
  feature couldn't update the backlog from `main`. Mention to Sky:
  when these branches land, the legend item needs to move from the
  "Now" section to "Shipped (unmerged)" with this branch name.
