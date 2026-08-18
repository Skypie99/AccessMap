# 01 — DIAGNOSIS (Phase A, read-only, 2026-08-18)

Evidence below is from main @ `68fce6b` and live Supabase project `kldlwszpfkdmsjrjhjym` ("Accessable City App"). Live reads were SELECT-only; the one role-simulation ran inside `begin … rollback`.

---

## A. BUG B — the delete chain, root-caused

### A1. The observed failure
Device: tap **Delete** on the Jun-2 "BUMBAKLOT" flag, which shows "Reported by: You" → alert **"Could not delete flag: You don't have permission."**

### A2. The client path (all healthy)
- `FlagDetailModal.tsx:802` `handleDelete` → `confirm()` → `deleteFlag(shownFlag.id)`; catch at `:820` → `Alert.alert('Could not delete flag', errorMessage(e))`.
- `flags.ts:1388` `deleteFlag`: gather photo paths (never throws) → `supabase.from('flags').delete().eq('id', flagId)` → `if (error) throw error` → best-effort Storage photo removal (SR-050).
- `errors.ts:60,62`: code `42501` **or** message matching `/violates row-level security|permission denied/` → `"You don't have permission to do that."` — the exact alert text.
- "Reported by: You" is `isOwn = shownFlag.user_id === user?.id` (`FlagDetailModal.tsx:513,1257`) — plain uid equality, no display-side fallback. **The attribution is trustworthy.**

### A3. The live rows (who owns what)
| account | uid | is_admin | points |
|---|---|---|---|
| skylerhalisky@gmail.com (Sky main, display "Jarvis Mckneil") | `8f99f7e0-bbad-4fd8-b3d0-4b6b99bdc8b2` | false | 90 |
| ranchin2023@gmail.com (test) | `7fe628a7-6483-411f-a67b-39d754f403b8` | false | 166 |
| gardenbeds2020@gmail.com (test) | `f4cf91d3-…` | false | 10 |
| reviewer@accessmap.com (App-Review account) | `cdea9c39-…` | false | 15 |

The flag: `af36e3bf-2423-4c00-9f30-dfe80ac658a2` — "BUMBAKLOT", category other, severity 5, status **resolved**, no photo, created 2026-06-03 03:59 UTC (= Jun 2 evening local), **user_id = `7fe628a7…` = ranchin2023**.

Since the UI said "You" and isOwn is uid-equality, the device session was **ranchin2023** — the flag's true owner. The owner delete failed anyway. (Also noteworthy: nobody has `is_admin = true`, confirming why the Admin tab renders for nobody *today* — but see A4 for why a grant alone wouldn't have fixed it.)

### A4. The root cause — a column grant missing under two RLS policy quals
Live DELETE policies on `public.flags` (all policies on the table are **PERMISSIVE** — verified via `pg_policies.permissive`):
- `flags delete own` (TO authenticated): `auth.uid() = user_id` — correct owner rule.
- `admin delete any flag` (TO authenticated): `(SELECT users.is_admin FROM users WHERE users.id = auth.uid())` — subselects `public.users`.
- `flags_user_scoped` (ALL, TO public): `user_id = auth.uid()` — legacy, redundant with the above; **not part of this bug, do not touch**.

Live grants on `public.users`: `authenticated` has **no table-level SELECT** (`information_schema.role_table_grants`). Its **column-level** SELECT list is exactly: `avatar_url, created_at, display_name, id, points` (`information_schema.column_privileges`). **`is_admin` is absent.** That list is verbatim the grant from `supabase/migrations/2026-05-27_users_email_privacy.sql:175-180` (`revoke select … ; grant select (id, display_name, avatar_url, points, created_at)`), which was written **three days before the `is_admin` column existed** (`2026-05-30_admin_role.sql`). When admin_role was later applied live (it is live: column + policy exist; per `qa-reports/2026-06-02_Dana_is_admin_bug_fix_proposal.md` it was NOT live on Jun 2, and memory records it applied 2026-06-03), nobody extended the column grant.

RLS policy quals evaluate **with the calling role's privileges**. Postgres includes every applicable permissive policy's qual in the statement plan — there is no "short-circuit if another policy matches." So for ANY `DELETE FROM public.flags …` issued by `authenticated`, the planner must read `users.is_admin`, the privilege check fails, and the **whole statement errors** — before ownership filtering happens.

**Live proof (rolled back):**
```
begin; set local role authenticated;
set local request.jwt.claims to '{"sub":"8f99f7e0-…","role":"authenticated"}';
select (select u.is_admin from public.users u where u.id = auth.uid());
→ ERROR 42501: permission denied for table users
```
42501 → errors.ts → the exact alert Sky saw.

### A5. Verdict — WORLD (b), stated plainly
**Owner-delete is broken for genuinely-owned flags, for every authenticated user, in production.** The BUMB flag being on a different account than Sky's main one is true but irrelevant to the failure — she *was* the owner in that session and it still denied. This is a shipping bug (and it breaks the SR-050 owner-takedown path that `flags.ts:1380` claims "now works end to end" — that claim does not hold against today's live catalog; the flags-side break most plausibly dates to the admin_role apply ~2026-06-03).

### A6. Blast radius of the same missing grant (all confirmed from live catalogs)
1. **Owner flag delete** — errors 42501 (this bug).
2. **Admin flag delete** — same statement, same error (and no admin exists yet anyway).
3. **Owner PHOTO delete on Storage** — `storage.objects` DELETE policy `flag-photos admin delete` (applied as §C-12 by Sky 2026-07-29, per `12_READY_OR_NOT.md` §SKY-7) has the same `users.is_admin` subselect → any authenticated `flag-photos` delete errors → SR-050's Storage half is dead too.
4. **Admin photo delete** — same.
5. **`useIsAdmin()` (`admin.ts:25-31`)** — `.select('is_admin')` returns error 42501; the hook's `data?.is_admin ?? false` swallows it → false forever, **even after is_admin=true is granted**. The client code shape is otherwise fine; the DB grant is the root cause. (The hook's silent swallow is worth a `console.warn` so this class of regression is visible in dev — see fix plan item 2.)

Not affected: `handle_flag_status_change()` (SECURITY DEFINER — runs as owner, reads is_admin fine); all SELECT/INSERT/UPDATE paths on flags (no other live policy references `users`); anon deletes (the admin policy is TO authenticated; anon deletes just match 0 rows).

---

## B. THE ADMIN CHAIN, end to end (read-only walk)

| Link | State | Evidence |
|---|---|---|
| `useIsAdmin()` gate | **Blocked by the missing column grant** (A6.5), not by the select shape | `admin.ts:25-31`; live 42501 simulation |
| Sky's account is_admin | `false` (everyone's is) | live users read |
| Self-promotion locked | ✅ `users update own row` WITH CHECK forbids changing own is_admin; SQL-editor (postgres) bypasses RLS, so Sky's grant works there | live pg_policies |
| Admin tab registration | ✅ healthy — drawer route only when `isAdmin === true` | `RootNavigator.tsx:398-401` |
| AdminScreen for non-admins | ✅ Lock state "Admin access required" | `AdminScreen.tsx:121-140` |
| AdminScreen offers (once rendered) | Recent 200 flags (`listRecentFlags`), per-flag **Remove** (= `deleteFlag`, permanent, confirm()-gated) and reject via `updateFlagStatus` | `AdminScreen.tsx:32-37,143+` |
| Admin DELETE policy on `flags` | ✅ **EXISTS live** (`admin delete any flag`, PERMISSIVE, TO authenticated) — the task's "may not exist" is answered: it exists | live pg_policies |
| Admin Storage delete (photos) | ✅ **EXISTS live** (`flag-photos admin delete`, §C-12 applied 2026-07-29) | live pg_policies; ship-ready ledger |
| Photo-cleanup ride-along | ✅ AdminScreen's Remove calls the same `deleteFlag` → SR-050 gather-then-remove; with A1 applied, admin delete removes row + photos end to end (the C-12 pairing) | `flags.ts:1361-1398` |
| DELETE-blocking triggers on flags | None (all 12 triggers are INSERT/UPDATE) | live pg_trigger |
| FK children of flags | All `ON DELETE CASCADE` (`flag_status_history`, `flag_edit_history`, `flag_comments`, `flag_photos`, `flag_verifications`); `point_events` `SET NULL` — deletes can't FK-fail | live pg_constraint |

**Net:** the entire admin chain needs exactly two Sky-applied statements — the A1 column grant + the A2 is_admin flag. Nothing else is missing.

---

## C. BUG A — the keyboard class census

### C1. The house pattern, named
**Recipe F — the FeedbackModal Bug-3 stack** (`d2a0991`, 2026-08-13 build 27; pinned by `src/__tests__/feedbackKeyboard.guard.test.ts`):
1. `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>` nested **inside** the backdrop (backdrop keeps `accessibilityViewIsModal`* / testID).
2. **The cap lives ON the KAV**: `maxHeight:'90%', flexShrink:1` (+ `width:'100%'`), because a percentage maxHeight only resolves against a parent with a *definite* height and only the `flex:1` backdrop is definite (G6/SR-099, spelled out at `FeedbackModal.tsx:422-430`). `cardWrap` and `card` get `flexShrink:1` so they shrink into it.
3. **Keyboard-up reclaim**: `kbVisible` via `keyboardDidShow/Hide` → `paddingBottom: kbVisible ? spacing.md : Math.max(spacing.xl, insets.bottom)` + a shorter writing box (`bodyInputKbUp`) — keyboard-up ONLY, so the card only ever gets shorter (never pushes the ✕ off-top).
4. Scrollable middle (`keyboardShouldPersistTaps="handled"`) between pinned header and pinned actions.

*(On surfaces where containment lives on the GlassSurface instead of the backdrop — MyWatched, SavedPlaces, FilterPresets, AddressSearch — the KAV nests around the existing containment node; the dismissalStandard guard verifies placement either way.)*

`ReportContentModal` already carries this stack verbatim ("FeedbackModal's stack, verbatim" — J2-5/G6 comment at `:278-281`).

**Recipe S — the scroll-inset answer** for pageSheet/full-height/screen surfaces where a KAV would fight the layout: `automaticallyAdjustKeyboardInsets` (iOS) on the body ScrollView/FlatList — the `FlagDetailModal` precedent (A11Y-228 guard), plus `ReportFlagModal` which pairs it with `useKeyboardVisible` + `keyboardDismissMode="on-drag"` for the SheetPull dismiss-vs-scroll gate.

### C2. Why this bit a third time (the two guard holes)
- `keyboardAvoidance.guard.test.ts` (A11Y-228) is a **hand allowlist of 3 files** asserting only that a `<KeyboardAvoidingView` **exists**. AddressSearchModal was even held up as the recipe source — but its KAV has no cap (`style={{width:'100%'}}`), so its card's `maxHeight:'85%'` never resolves and hardware geometry fails while the guard stays green. Presence ≠ geometry.
- Surfaces hosting inputs **indirectly** (via `SearchInputRow` or the `Input` primitive) never match a `TextInput` scan — `MyWatchedModal` was structurally invisible to the old census. The guard itself documents this blind spot ("source-pinned presence, not runtime geometry").

### C3. The census — every input-hosting surface app-wide (17)
| # | Surface | Input(s) | Mechanism today | Verdict | Prescribed fix (Phase B) |
|---|---|---|---|---|---|
| 1 | FeedbackModal | 2 × TextInput | Recipe F, full (cap+reclaim) | **PASS** (reference) | — |
| 2 | ReportContentModal | TextInput | Recipe F stack (no reclaim; short form) | **PASS** | — |
| 3 | ReportFlagModal | description TextInput | KAV + Recipe S + SheetPull on-drag gate | **PASS** | — |
| 4 | FlagDetailModal | comment box | Recipe S (guarded) + SheetPull G4 | **PASS** | — |
| 5 | SignInScreen | email + password | screen-level KAV + scroll | **PASS** | — |
| 6 | MapScreen "Name this preset" (~:2885) | TextInput (autoFocus) | centered card + KAV | **PASS** | — |
| 7 | MapScreen "Name this filter" (~:2982) | TextInput (autoFocus) | centered card + KAV | **PASS** | — |
| 8 | **AddressSearchModal** | search TextInput (**autoFocus**) | KAV **without the cap**; card `maxHeight:'85%'` unresolvable; no reclaim | **FAIL — device screenshot** (input half-cut) | Recipe F stack (cap on KAV + flexShrink chain) + reclaim; header+input pinned, results/recents scroll |
| 9 | SavedPlacesModal | add-place name (**autoFocus**) | KAV without the cap (card 85% @:471) | **FAIL (latent, same recipe gap)** | Recipe F stack |
| 10 | FilterPresetsModal | create + rename (**both autoFocus**) | KAV without the cap (card 85% @:558) | **FAIL (latent)** | Recipe F stack |
| 11 | **MyWatchedModal** | SearchInputRow | **nothing** (sheet 85% cap also unresolvable) | **FAIL — device screenshot** (field at keyboard edge, content below cut) | Recipe F stack + reclaim; FlatList scrolls above keyboard |
| 12 | MyReportsModal | SearchInputRow | nothing (card 85% @:516) | **FAIL** | Recipe F stack |
| 13 | MyFeedbackModal | SearchInputRow | height caps present (@:311,327) but no keyboard mechanism | **FAIL** | add KAV into the existing capped stack |
| 14 | HelpModal | SearchInputRow | height caps present (@:229-249, M13) but no keyboard mechanism | **FAIL** | add KAV into the existing capped stack |
| 15 | NearbyFlagsModal | SearchInputRow | **pageSheet**, nothing | **FAIL** | Recipe S on its FlatList (KAV fights pageSheet — FlagDetail precedent) |
| 16 | TasksScreen | inline search TextInput (@:969) | screen, nothing | **FAIL** (list rows under keyboard unreachable) | Recipe S on the Tasks FlatList |
| 17 | ProfileScreen | display-name `Input` (@:1508, low on the scroll) | nothing | **FAIL** (keyboard covers the focused field on small phones) | Recipe S on the Profile body ScrollView |

Excluded, verified inputless: AdminScreen, HiddenCommentsModal, ActivityFeedModal, PhotoLightbox/Gallery. `ui/Sheet.tsx` hosts no input today (a comment mentions SearchInputRow only); the class guard must still cover future `<Sheet>`-hosted inputs.

### C4. The escape law / dismiss-vs-scroll doctrine that must survive
- Every touched Modal keeps: `onRequestClose`, close ✕, Cancel where present, and `onAccessibilityEscape` on the **containment node** (not the `<Modal>` tag — RN drops it there). `src/__tests__/dismissalStandard.guard.test.ts` is a source-derived census that enforces this automatically — it must stay green at every commit.
- SheetPull surfaces (ReportFlagModal G3, FlagDetailModal G4): while the keyboard is up the pan is disabled (`useKeyboardVisible`) and the first drag drops the keyboard (`keyboardDismissMode="on-drag"`); the second drag dismisses the sheet. The sweep must not disturb this gate; `Sheet.dismissal.test.tsx` + gesture tests must stay green.
- `keyboardShouldPersistTaps="handled"` wherever rows must stay tappable with the keyboard up.
