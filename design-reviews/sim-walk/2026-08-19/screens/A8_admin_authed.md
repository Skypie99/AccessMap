# A8 — AdminScreen (SIGNED IN, is_admin = true) · Pro Max · sim-release @ bc91789

**Phase A recorded A8 as role-gated / census-complete / walk N/A. It is now WALKED** — because the account turned out to be admin (see the SW-38 caveat block).

## WALKED READ-ONLY — nothing tapped
Header "Admin" + "**32 recent flags · pull to refresh**". Each row: category, `Flag status: Open`, severity word + number, coordinates, description, and two action buttons.
- **Remove <category> flag** — 179×45 ✓
- **Dismiss <category> report** — 181×45 ✓
- Both carry the flag's category in the accessible name, so they are unambiguous to a screen reader ✓

**No admin action was fired on any row.** Remove/Dismiss act on real users' content and, as admin, rejection carries a −20 spam penalty against a real reporter — squarely inside the Production Law's prohibition. Verified their safety by CODE READ instead of by tapping.

## VERIFIED-GOOD (code read, `AdminScreen.tsx`)
- **Both destructive actions are `confirm()`-guarded**: `handleRemove` → `confirm('Remove flag?', …)` (:145) and `handleDismiss` → `confirm('Dismiss report?', 'This marks the flag as rejected.')` (:169), using `@/lib/confirm` — exactly the policy CLAUDE.md mandates for destructive confirmations.
- **Double-tap protection is deliberate**: `setActioningId` is set only AFTER the confirm resolves, so a rapid double-tap or Remove+Dismiss on one row can't double-fire (:57-58).
- Errors surface via `Alert.alert('Error', errorMessage(e))` rather than being swallowed.

## OBSERVATION (not a defect)
The admin list shows **32** recent flags while the map header reads "13 of 13 shown" — different scopes (map is viewport-filtered, admin is recent-global). Consistent, not contradictory.

## NOT COVERED (deliberate)
The actual behaviour of Remove/Dismiss — including whether the confirm dialogs render correctly and whether the −20 penalty fires — is **untested by design**. It needs a disposable flag owned by the tester, which is part of the write-action escalation to Sky.

## ELEMENTS
Found 30+ rows in the first viewport · exercised: open, full census, screenshot, code-verified safety of both destructive paths. Zero taps on row actions.
