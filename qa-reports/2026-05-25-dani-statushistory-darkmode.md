# StatusHistoryModal — Dark-Mode Gap Fix

**Date:** 2026-05-25
**Role:** Dani (Design Token / Dark-Mode)
**Branch:** `fix/dani-statushistory-darkmode-2026-05-25`
**Status:** DONE — ready for Sky to merge

---

## Problem

Alex's a11y audit of `feat/perf-statushistory-2026-05-25` (merged to main) flagged
a dark-mode gap in `StatusHistoryModal.tsx`: the history card sheet used
`backgroundColor: '#fff'` hardcoded. In dark mode the card stayed white while the
rest of the app switched correctly.

Further inspection found all other text/surface colors in the component were also
raw hex literals — they would have rendered unreadably (near-black text on
near-black surface) once a user enabled dark mode.

---

## Changes — `src/components/StatusHistoryModal.tsx`

### Dark-mode token sweep (primary fix)

All raw hex literals in `makeStyles` replaced with `ColorTheme` tokens:

| Was | Now | Token |
|---|---|---|
| `backgroundColor: '#fff'` | `color.surface` | card sheet background |
| `color: '#222'` (title) | `color.textStrong` | heading text |
| `backgroundColor: '#eef1f5'` (close btn) | `color.surfaceNeutral` | close button bg |
| `color: '#333'` (close btn text) | `color.text` | close button ✕ |
| `color: '#555'` (loading text) | `color.textMuted` | "Loading history…" |
| `color: '#333'` (empty title) | `color.text` | "No history yet" |
| `color: '#444'` (empty body) | `color.textMuted` | empty-state body copy |
| `color: '#222'` (entry line) | `color.textStrong` | history row text |

`entryDot` already used `color.brandText` — no change needed there.

### Web a11y roles (non-blocking polish, Alex item)

Entry rows are now wrapped in a `<View accessibilityRole="list">` container, and
each row carries `accessibilityRole="listitem"`. Both roles are gated behind
`Platform.OS === 'web'` with an `as AccessibilityRole` cast — React Native's
`AccessibilityRole` union doesn't include these web-only values, so the guard
keeps the native bundle clean and typecheck green.

---

## Verification

- `npm run typecheck` → **0 errors**
- No test suite changes needed (no logic changed, styles only)
- Dark-mode rendering requires device/simulator toggle — visual spot-check
  recommended before merge

---

## DECISIONS FOR SKY

None. All changes are style-only, reversible, and scoped to a single component.

---

## Pre-existing floating changes (not part of this commit)

The working tree contains uncommitted changes from an earlier work session:
`LEARNINGS.md`, `PhotoLightboxModal.tsx`, `theme.ts`, `ThemeContext.tsx`
(adds `overlayBtnPressed` to both palettes). These were **not staged or committed**
here — they belong to a separate in-progress branch and should be handled
independently.
