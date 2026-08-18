# 02 — THE FIX PLAN (banked by Phase A for Phase B / Opus)

Build order as listed. One commit per item. Pin the gate baseline first (`npm test`, `npm run typecheck`, `npm run lint` from the repo root — record the numbers). Branch, don't touch main; Sky merges. Honor the ONE-WRITER check in HANDOFF before the first commit.

---

## Item 1 — THE KEYBOARD SWEEP + THE CLASS GUARD (one commit; the guard ships WITH the sweep)

**Root cause:** two sanctioned mechanisms exist on main but 10 of 17 input-hosting surfaces carry neither in full — see `01_DIAGNOSIS.md` §C3 for the per-surface table and prescribed recipe (Recipe F = the FeedbackModal d2a0991 stack; Recipe S = `automaticallyAdjustKeyboardInsets`).

**The fix:** apply the prescribed recipe to surfaces 8–17 exactly as the census table says. Rules:
- Recipe F surfaces (8–14): the cap goes **on the KAV** (`maxHeight` + `flexShrink:1` + `width:'100%'`), `cardWrap`/`card` get `flexShrink:1`, list/body scrolls between pinned header (+input) and pinned actions, `keyboardShouldPersistTaps="handled"`. Add the kbVisible bottom-inset reclaim where the sheet has a bottom safe-area pad (MyWatched, AddressSearch at minimum — the two device offenders; small phones are the hard case).
- Recipe S surfaces (15–17): `automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}` on the body FlatList/ScrollView. No KAV on pageSheet (it fights the presentation — FlagDetail precedent).
- Do NOT touch the four PASS modals or the SheetPull gating; `dismissalStandard.guard`, `Sheet.dismissal`, and both existing keyboard guards must stay green at every commit.
- No new user-visible strings (SKY-WORDS-REQUIRED otherwise). AutoFocus stays as-is on every surface (behavior change = scope smuggling).

**THE CLASS GUARD** — `src/__tests__/keyboardClass.guard.test.ts`, in the `dismissalStandard.guard.test.ts` idiom (source-derived census, comment-stripping, anti-self-match — NOT a hand allowlist):
1. Walk every `.tsx` under `src/` + `App.tsx`.
2. A file **hosts an input** if it renders `<TextInput`, `<SearchInputRow`, or `<Input` (word-boundary; exclude the definitions `ui/Input.tsx`, `SearchInputRow.tsx`). This closes the indirect-input hole that hid MyWatchedModal.
3. A file **hosts a sheet** if it renders `<Modal` or `<Sheet`.
4. Every file that is both must show a sanctioned mechanism: (a) `<KeyboardAvoidingView` with the iOS-padding behavior AND a percentage `maxHeight` reachable from the KAV's style (literal or a named style defined in-file with `maxHeight` + `flexShrink`) — presence of KAV alone must NOT pass (that's the hole that let AddressSearchModal through); or (b) `automaticallyAdjustKeyboardInsets`.
5. Input-hosting **screens** (no Modal in-file): a small in-test table with per-screen mechanism assertions (SignInScreen → KAV; TasksScreen, ProfileScreen → insets-adjust). New unlisted screens fail loudly.
6. Exemptions: an explicit in-test list with a written reason each (start empty).
7. Retire `keyboardAvoidance.guard.test.ts` into this (its three pins become census rows); keep `feedbackKeyboard.guard.test.ts` (it pins the reference implementation deeper).
8. **Non-vacuity proven:** strip one surface's mechanism → guard fails; restore → green. Note the proof in the close-out.

---

## Item 2 — THE ADMIN GATE (own commit)

**Root cause (honest finding):** `admin.ts:27` was never the code bug — the select shape is fine. The DB grant (Artifact A1) is the fix for the gate. But the hook **silently swallows** the 42501 that has been telling us this since ~June: `const { data } = …` drops the error, so the gate degrades to false with zero signal.

**The fix:** capture `error` in `useIsAdmin()`; `console.warn('[admin] is_admin read failed:', error.message)` before resolving false. No UI change, no copy.
**The guard:** unit tests for the hook (mock supabase): is_admin=true → true; false → false; error → false + warn called. Plus the existing behavior: `RootNavigator` registers Admin only on `isAdmin === true` (renders for true, never for false) — assert via the nav gate test if one exists, else a source pin.

---

## Item 3 — THE ARTIFACT PACKET (authored, never applied — Sky's per-statement yes)

Apply order matters: **A1 first, then A2.** (A2 without A1 changes nothing visible — the gate can't read the column.) Both run in the Supabase SQL editor (postgres role, bypasses RLS — that's by design; the client-side self-promotion lock stays intact).

### A1 — restore the `is_admin` column read to the `authenticated` role
*Fixes, in one statement: owner flag delete (Bug B), admin flag delete, owner photo delete, admin photo delete, and the useIsAdmin gate. Privacy note: exposes only the boolean admin bit to signed-in clients (rows were already readable; the 2026-05-27 email protection is untouched).*

```sql
-- PRE-STATE (run first, keep the output)
select grantee, column_name, privilege_type
  from information_schema.column_privileges
 where table_schema='public' and table_name='users'
   and grantee='authenticated' and privilege_type='SELECT'
 order by column_name;
-- Expected today: avatar_url, created_at, display_name, id, points  (is_admin ABSENT)

-- THE CHANGE
grant select (is_admin) on public.users to authenticated;

-- VERIFY (read-only)
--   1. Re-run the pre-state query → is_admin now appears.
--   2. On device (any signed-in account): delete one of YOUR OWN junk flags → succeeds.
--      (This was Bug B; before the grant it errors "You don't have permission.")

-- ROLLBACK (returns to today's broken-but-known state)
revoke select (is_admin) on public.users from authenticated;
```

### A2 — the is_admin GRANT for Sky's account
*Main account only (`skylerhalisky@gmail.com`). ranchin2023 stays non-admin — it's junk-slated. Decision noted: the Admin tab will appear only when the device is signed in as skylerhalisky.*

```sql
-- PRE-STATE
select id, email, is_admin from public.users
 where id = '8f99f7e0-bbad-4fd8-b3d0-4b6b99bdc8b2';
-- Expected: skylerhalisky@gmail.com, is_admin = false

-- THE CHANGE
update public.users set is_admin = true
 where id = '8f99f7e0-bbad-4fd8-b3d0-4b6b99bdc8b2';
-- Expected: UPDATE 1

-- VERIFY
select id, is_admin from public.users
 where id = '8f99f7e0-bbad-4fd8-b3d0-4b6b99bdc8b2';   -- → true
-- App (A1 applied, signed in as skylerhalisky, relaunch): drawer shows Admin; flag list loads.

-- ROLLBACK
update public.users set is_admin = false
 where id = '8f99f7e0-bbad-4fd8-b3d0-4b6b99bdc8b2';
```

### A3 — admin DELETE policy on flags: **NOT NEEDED**
Phase A found it **already live**: `admin delete any flag` on `public.flags` AND `flag-photos admin delete` on `storage.objects` (§C-12, applied by Sky 2026-07-29). The deliberate decision stands as designed and already-built: **admin deletes remove the row AND its photos** (AdminScreen → `deleteFlag` → SR-050 gather-then-remove; the Storage policy permits the admin's photo removal). No new policy artifact.

---

## Item 4 — owner-delete broken for genuinely-owned flags: CONFIRMED, and the fix is A1
Phase A proved world (b) — but the defect is **database-side** (the missing grant), not client code, so the "own commit" this item earmarked converts to A1 above, which outranks everything (it hits every real user).

**Optional hardening, flagged as deferrable (Opus's call, small):** after A1, a non-owner/non-admin delete returns **0 rows silently** (RLS filter, no error) — `deleteFlag` would "succeed," `onDeleted()` fires, and the UI hides a flag that still exists. Add `.select('id')` to the delete and throw the house permission error on 0 rows, with a unit test. Real correctness hole, tiny diff; skip if the sprint's one-writer window is tight.

---

## CLOSE-OUT REQUIREMENTS (Phase B report)
- The census with before/after per surface (the §C3 table + what changed).
- The Bug-B verdict stated plainly: **world (b)** — owner-delete broken live for all users via the 42501 policy-qual chain; the BUMB flag additionally belongs to ranchin2023, and "You" attribution was correct for that session.
- The artifact packet in one place (this file §Item 3), routed to Sky: apply in the live Sprint session's Phase 4 or the Supabase dashboard, per-statement yes.
- **New DEVICE ROWS for Sky's checklist** (small phone):
  1. Watched Flags: open, tap search, type — field AND rows stay visible/reachable above the keyboard; pull-to-refresh + Close ✕ still work.
  2. Search by address: open (autoFocus) — the whole input clears the keyboard; results tappable with keyboard up; ✕ reachable.
  3. Saved Places (the census pick): tap Add, name field + Save/Cancel visible above the keyboard.
  4. After A1: delete one of your own junk flags → row disappears, no error.
  5. After A1+A2 (signed in as skylerhalisky): Admin appears in the drawer → Remove the BUMBAKLOT flag end-to-end (row gone; for a photo flag, photos gone too).
- Gate numbers at baseline and at every commit. Report and STOP on the branch.
