# Design spec — Profile editing

**Status:** spec only — Shamus's `feat/profile-edit-2026-05-23` branch
implements a version of this; this spec is the visual+a11y target to align
to before merge.
**Source:** `FEATURES.md` → Next → "Profile editing."
**Tokens:** all values reference `src/theme.ts`.
**Accessibility bar:** 44pt tap targets, 4.5:1 text contrast, every field
has a label, keyboard's `returnKeyType` chains fields sensibly.

---

## Why

Profile is read-only today: name, points, counts. Users have asked to:
- Change their display name.
- Pick which tab opens at app launch (Map vs. Tasks).
- Set a "prefer list view" preference (screen-reader users routing around
  the map).

These are all preferences, not data — fast to design, fast to build,
high-value for accessibility users.

## Behavior in one paragraph

A pencil/Edit affordance on the Profile screen header opens an "Edit
profile" sheet. Inside: a single text input for display name, two
single-choice rows for landing-tab and list-view preference, a Save button
that writes to `public.users` and `AsyncStorage`, and a Cancel button that
discards. On save, the sheet closes and Profile re-renders with the new
values.

## Visual — Profile screen header (Edit affordance)

```
┌────────────────────────────────────────────────┐
│  Skyler Halisky                          ✏️    │  ← header row
│  ┌──────────────┐                              │
│  │     128      │   points                     │
│  └──────────────┘                              │
└────────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| Edit icon | 24pt pencil glyph inside a 44 × 44 tap area, right-aligned to the header |
| Icon color | `color.brand` |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | `"Edit profile"` |
| `accessibilityHint` | `"Opens a sheet to change your display name and preferences"` |

## Visual — Edit Profile sheet

Bottom-sheet modal, same `radius.lg` + `shadow.e3` family as
`MyReportsModal` and `FlagDetailModal`.

```
┌────────────────────────────────────────────────┐
│  Edit profile                              ✕   │  header row
│ ──────────────────────────────────────────────│
│                                                 │
│  DISPLAY NAME                                  │
│  ┌──────────────────────────────────────────┐ │
│  │ Skyler Halisky                           │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  LANDING TAB                                   │
│  ┌──────────────┐  ┌──────────────┐           │
│  │   Map  ●     │  │  Tasks  ○    │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  ACCESSIBILITY                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ Prefer list view              [  on  ]  │ │
│  └──────────────────────────────────────────┘ │
│  Opens the nearby-flags list automatically     │
│  when the screen reader is on.                 │
│                                                 │
│  ┌──────────────────────────────────────────┐ │
│  │            Save                          │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │           Cancel                         │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Section headers (DISPLAY NAME, LANDING TAB, ACCESSIBILITY)

| Token | Value |
|---|---|
| Color | `color.textMuted` |
| Size | `font.size.xs` (12) |
| Weight | `font.weight.semibold` (600) |
| Letter spacing | 1.0 |
| Transform | uppercase |
| Margin top | `spacing.lg` (16) |
| Margin bottom | `spacing.sm` (8) |

### Text input — display name

| Token | Value |
|---|---|
| Background | `color.surfaceSoft` (#f7f8fa) |
| Border | 1pt solid `color.border` |
| Border (focused) | 1pt solid `color.brand` |
| Radius | `radius.md` (8) |
| Padding | horizontal `spacing.md`, vertical `spacing.md` |
| Text size | `font.size.lg` (16) — readable; never below 16 for inputs |
| Text color | `color.textStrong` |
| `placeholder` | "Your display name" |
| `placeholderTextColor` | `color.textMuted` |
| `minHeight` | 44 |
| `returnKeyType` | `"done"` |
| `accessibilityLabel` | `"Display name"` |

### Single-choice row (LANDING TAB)

Two side-by-side pills.

| State | Background | Foreground |
|---|---|---|
| Selected | `color.brand` | `color.textOnBrand` |
| Unselected | `color.surfaceNeutral` | `color.text` |

| Token | Value |
|---|---|
| Padding | horizontal `spacing.lg`, vertical `spacing.md` |
| Radius | `radius.md` |
| `minHeight` | 44 |
| Gap between pills | `spacing.sm` |
| `accessibilityRole` | `"radio"` |
| `accessibilityState` | `{ selected: true|false }` |

### Toggle row (ACCESSIBILITY → prefer list view)

Native `<Switch>` on the right; label text on the left.

| Token | Value |
|---|---|
| Row padding | horizontal `spacing.lg`, vertical `spacing.md` |
| Row background | `color.surfaceSoft` |
| Radius | `radius.md` |
| `minHeight` | 44 |
| Label color | `color.textStrong` |
| Label size | `font.size.lg` (16) |
| Help text (below row) | `color.textMuted`, `font.size.sm` (13) |
| Switch tint (active) | `color.brand` |
| `accessibilityRole` | `"switch"` (the Switch component supplies this) |
| `accessibilityLabel` | `"Prefer list view"` |

### Buttons — Save / Cancel

| Button | bg | fg | weight | size |
|---|---|---|---|---|
| Save | `color.brand` | `color.textOnBrand` | `bold` | `font.size.md` (15) |
| Cancel | transparent | `color.brand` | `semibold` | `font.size.md` |

| Token | Value |
|---|---|
| Padding (Save) | vertical `spacing.md` |
| Radius | `radius.md` |
| Margin top (Save) | `spacing.xl` (20) |
| Margin top (Cancel) | `spacing.sm` |
| `minHeight` | 44 |

### Loading / disabled state

While saving:
- Save shows `<ActivityIndicator color={color.textOnBrand} />` in place of text.
- Cancel disabled (`opacity: 0.5`), `accessibilityState={ disabled: true }`.
- Inputs `editable={false}`.

### Error state

If save fails, an inline error banner appears above the buttons:

| Token | Value |
|---|---|
| Background | `color.errorBg` |
| Foreground | `color.errorFg` |
| Icon | ⚠ glyph in `color.errorFg` |
| Padding | `spacing.md` |
| Radius | `radius.md` |
| `accessibilityLiveRegion` | `"polite"` + `AccessibilityInfo.announceForAccessibility(message)` |

(Same recipe as the `MapScreen` error banner — see
`LEARNINGS.md` 2026-05-23.)

## Accessibility

- Each section header is announced once when focused (set `accessibilityRole="header"`).
- Field order matches visual order; `returnKeyType="done"` on the lone input.
- `<Modal accessibilityViewIsModal>` ✓ (already the pattern in other modals).
- Sheet has an obvious close button (top-right ✕, 44 × 44 hit area, label "Close edit profile").
- `<KeyboardAvoidingView>` so the Save button never hides behind the keyboard.

## Open questions for Shamus

1. **Persistence.** `display_name` writes to `public.users`. The two
   preferences (landing tab, prefer list view) are local-device only — store in
   AsyncStorage via `src/lib/preferences.ts` (already exists).
2. **First-launch default for "prefer list view"**: detect with
   `AccessibilityInfo.isScreenReaderEnabled()` on first open and default to ON
   if a screen reader is active. Subsequent launches respect the user's
   explicit choice.
3. **Display name uniqueness.** Not enforced today; this spec doesn't add a
   check. If a future change adds one, surface the conflict in the same
   inline error banner.

## Definition of done

- Tokens used; no fresh hex literals.
- Typecheck green.
- VoiceOver / TalkBack traverse the sheet in visual order, announce every label.
- Save persists; Cancel discards; both close the sheet.
- Saving while offline shows the error banner; retrying after reconnecting succeeds.
