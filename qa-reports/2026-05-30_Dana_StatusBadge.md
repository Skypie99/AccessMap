# Dana — StatusBadge Component (2026-05-30)

## Component created: src/components/StatusBadge.tsx

**Props:**
- `status: FlagStatus` — `'open' | 'verified' | 'rejected' | 'resolved'`
- `size?: 'sm' | 'md'` — defaults to `'md'` (matches historical pill dimensions)
- `showLabel?: boolean` — defaults to `true`
- `accessibilityLabel?: string` — override (default: `"Flag status: {Status}"`)
- `style?: object` — extra View style applied to outer badge container

**Dark mode:** Uses `STATUS_COLORS` from `@/lib/flags`, which contains the same hex values as the theme's `statusOpen/Verified/Resolved/RejectedBg/Fg` tokens. No `useColor()` needed — the color source already handles both palettes via the token structure. Future dark-mode expansion can update STATUS_COLORS in one place.

**Accessibility:** `accessible={true}`, `accessibilityRole="text"`, `accessibilityLabel` on container. FlagDetailModal passes its existing `statusA11y(status)` string via the override prop to preserve exact a11y parity.

**Tests:** 6 tests in `src/components/__tests__/StatusBadge.test.tsx`
- Renders without crashing (all 4 statuses)
- Correct default accessibilityLabel per status
- Custom accessibilityLabel override
- showLabel=true renders text label
- showLabel=false renders no text
- accessible={true} on container

## Callsites migrated (3)

| File | Change |
|---|---|
| `src/components/FlagDetailModal.tsx` | Removed `STATUS_COLORS` import, removed `statusPalette` local var, replaced inline View+Text badge, removed `statusBadge`+`statusBadgeText` styles |
| `src/components/MyReportsModal.tsx` | Added StatusBadge import, removed `statusPalette` in renderItem, replaced inline badge, removed duplicate styles |
| `src/components/ActivityFeedModal.tsx` | Removed `STATUS_COLORS` import, added StatusBadge import, removed `statusPalette`, replaced inline badge, removed duplicate styles |

## Remaining callsites: 2 — tracked in COMPONENT_SPEC_StatusBadge.md

| File | Notes |
|---|---|
| `src/components/MyWatchedModal.tsx` | Has a custom `accessible` + `accessibilityLabel={statusA11y(...)}` pattern — straightforward migration, Sprint 2 |
| `src/components/NotificationPrefsModal.tsx` | Badge is intentionally `accessibilityElementsHidden` (see QA Pass-2 #4 note in file) — needs care to preserve that behavior, Sprint 2 |

## TypeScript: 0 errors

## Tests: 6/6 pass

## Branch: feat/shared-status-badge-2026-05-30

## Commits:
- `a0c6992` feat(ui): add shared StatusBadge component, replace 3 inline callsites
- `f3c2dd1` refactor(ui): migrate 3 inline status pills to StatusBadge

## Safe to merge: no auth changes, no RLS changes, no data changes, no new Supabase queries
