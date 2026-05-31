---
report: 2026-05-30_Shamus_RileyWaveC
project: AccessMap
date: 2026-05-30
type: IMPLEMENTATION
authored_by: Shamus
model_tier: Sonnet
features: [F9, F10]
branches:
  - feat/riley-f9-severity-guidance-2026-05-30
  - feat/riley-f10-reopen-2026-05-30
tsc_errors: 0
---

# Shamus — Riley Wave C QA Report

**Date:** 2026-05-30  
**Features:** F9 (severity guidance text) + F10 (reopen mechanism)

---

## F9 — Severity Guidance Text

**Branch:** `feat/riley-f9-severity-guidance-2026-05-30`  
**Commit:** `7be281f`  
**File changed:** `src/screens/ReportFlagModal.tsx`

### What was built

Added a single static `<Text>` element between the severity button row and the dynamic `sevHint` line in `ReportFlagModal`. Copy:

> "Rate for the most-affected person you know of, not just yourself."

### Style decisions

- `fontSize: 12` (`font.size.xs`) — smallest readable token in the type scale, keeps it visually subordinate to the button row and the dynamic hint below.
- `color: color.textMuted` — low visual weight; reads as a tip, not a form label.
- `lineHeight: 17` — consistent with other helper text in the form.
- `marginTop: -4` — pulls up slightly to close the visual gap vs. the button row, same technique used by `sevHint`.

### Accessibility

- Plain `<Text>` — no `accessibilityRole` needed (it's not a heading or interactive element). Screen readers will pick it up as static text in reading order, which is the correct behavior.
- No live region — it never changes, so no announcement needed.

### What was NOT done (by design)

- No migration, no new data, no backend changes.
- No "full disability-type tag field" (Quinn deferred to v0.3.0).

### Typecheck result

```
npm run typecheck → 0 errors
```

---

## F10 — Reopen Mechanism

**Branch:** `feat/riley-f10-reopen-2026-05-30`  
**Commit:** `ec97933`  
**File changed:** `src/components/FlagDetailModal.tsx`

### What was built

An inline "reopen request" flow in `FlagDetailModal`:

1. **Reopen button** — shown ONLY when `status === 'resolved'` AND `!isOwn`. Styled with an amber-orange outline (`color.accentOrange`) to differentiate it from the primary action row. Accessibility: `accessibilityRole="button"`, `accessibilityLabel="Request flag reopen"`, `accessibilityHint="Opens a form to explain why this barrier is still present"`.

2. **Inline form** — appears when the button is tapped:
   - `TextInput` (multiline, `maxLength={280}`) for the description.
   - Character counter appears once typing starts.
   - "Submit reopen request" button + "Cancel" button.
   - Description is required — empty submit shows an Alert.

3. **Threshold logic** (`handleReopenSubmit`):
   - Imports `getTier` from `src/lib/reputationTier.ts`.
   - Threshold by tier: Bronze=3, Silver=2, Gold/Platinum=1 (Quinn product decision).
   - Count read from `(shownFlag as any).reopen_requests ?? 0` — intentional scaffolding; typed column lands with Dana's migration.
   - If `count + 1 >= threshold`: calls `updateFlagStatus(flag.id, 'open')` → `onChanged` → modal closes.
   - If below threshold: shows inline `reopenMessage` text ("Reopen request noted. N more needed."), form collapses, button disappears.

4. **State reset** — reopen form state is cleared on modal close and on flag-swap (two `useEffect` guards, matching the existing lightbox/history pattern).

### Privacy compliance — Jordan F10 gate

- No `user_id` is stored or transmitted in the reopen flow.
- The `flag_reopen_log` table (Dana's migration) stores only `(flag_id, created_at)` — no user linkage.
- The UI reads only the aggregate `reopen_requests` count — no per-user query.
- Jordan gate: SATISFIED.

### Scaffolding TODOs (to resolve when Dana's migration lands)

1. **`(shownFlag as any).reopen_requests`** — replace with the typed column once `flag_reopen_count` (or equivalent) is added to `FlagRow` in `src/types/database.ts`.
2. **`getTier(null)`** — the Supabase `User` object from `useAuth()` doesn't carry `public.users.points`. Once profile data flows through `AuthContext` or a `ProfileContext`, pass the real points value. Until then, defaults conservatively to Bronze (threshold=3), which is the most cautious behavior and never incorrectly reopens a flag that didn't reach the real threshold.

### What was NOT done (by design)

- No SQL written or applied. Dana owns the migration.
- No `user_id` linkage anywhere.
- No "Disputed" status — Quinn confirmed reopen goes back to `'open'`.

### Typecheck result

```
npm run typecheck → 0 errors (on feat/riley-f10-reopen-2026-05-30)
```

---

## Branch cleanup note

During F10 implementation, the commit `592e1be` was accidentally placed on `feat/riley-f10-schema-2026-05-30` (Dana's migration branch) before being cherry-picked to the correct branch. The extraneous commit `592e1be` remains on Dana's branch — Sky should run `git reset --hard HEAD~1` on `feat/riley-f10-schema-2026-05-30` to remove it before that branch is merged. The correct F10 commit on `feat/riley-f10-reopen-2026-05-30` is `ec97933`.

---

## Decisions for Sky

None required. Both features shipped as scoped. F10 threshold constants are hardcoded (Bronze=3, Silver=2, Gold/Platinum=1) — Quinn's open question about making them configurable is deferred and not blocking.

---

## Status

| Feature | Status | Branch | Commit | TSC |
|---|---|---|---|---|
| F9 severity guidance | DONE | `feat/riley-f9-severity-guidance-2026-05-30` | `7be281f` | 0 errors |
| F10 reopen mechanism | DONE (scaffolded) | `feat/riley-f10-reopen-2026-05-30` | `ec97933` | 0 errors |
