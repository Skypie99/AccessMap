# Flagstone — App Store Readiness Audit

> ## ⚑ STATUS UPDATE — 2026-08-18, same day, post-fix
>
> Three blockers were found. **All three are now addressed in code**; one needs a
> single action from Sky to complete.
>
> | | Blocker | State |
> |---|---|---|
> | **B1** | Hosted privacy policy claimed crash reporting / analytics that do not exist | ✅ **CLOSED + VERIFIED LIVE.** `fix/remove-sentry` merged (`f939046`). The hosted page now reads *"There is no usage analytics and no crash reporting in the app"* — re-fetched and confirmed. The dead `src/lib/sentry.ts` stub is deleted. |
> | **B2** | Production has zero `open`/`verified` flags — app renders empty to a reviewer | 🟡 **SQL WRITTEN, AWAITING SKY.** `supabase/migrations/2026-08-18_seed_reviewer_flags.sql` — 8 open + 4 verified near Kelowna, guarded against double-paste, tagged for exact rollback. **No agent may apply it (Const. Art. 1).** |
> | **B3** | No way to block an abusive user | ✅ **CLOSED.** `feat/block-abusive-users-2026-08-18` merged (`2163265`). Author-level block on comments, device-local, with the read-side filter that makes it real. Built behind Jordan's Phase-0 privacy gate. |
>
> Also fixed the same day: **S1** (reviewer notes described a "Skip" button and a
> "+" button that guests cannot see), **S2** (`guestMode` never reset), **S3**
> (display names bypassed the content filter), **S19** (`getUserLeaderboardRank`
> failed 42501 against live grants).
>
> Gates on `main` @ `2163265`: **tsc 0 · jest 207 suites / 3061 passed / 0 failed ·
> eslint 0 errors.** Rollback tags: `backup/pre-remove-sentry-merge-2026-08-18`,
> `backup/pre-block-merge-2026-08-18`.
>
> **One finding below is now obsolete and corrected by the work:** §B3's premise
> that a server-side block list was barred by "Jordan's hard condition" was
> **wrong** — that condition covers user↔*location* linkage and admin
> enumeration, not this. See the commit message on `2c93390`.
>
> Everything else below is the audit as originally written, unedited.

**Date:** 2026-08-18 · **Branch:** `main` @ `189bf5a` · **Method:** read-only. No code was changed.
**Live backend checked:** Supabase project `kldlwszpfkdmsjrjhjym` ("Accessable City App", us-west-2, ACTIVE_HEALTHY), matched from `.env`. Read-only queries only.

Every finding below was produced by one auditor and then independently re-checked by a second agent
instructed to refute it. Four claims were refuted and are recorded at the bottom so they are not
re-raised later. Where I could not verify something, it is marked UNKNOWN with the exact check needed.

---

## BLOCKER — will get rejected

Ordered by how fast you can clear them.

### B1 · The hosted privacy policy claims crash reporting and usage analytics the app does not do
**~30 min · `docs/privacy/index.html`**

`app.json:5` points App Store Connect at `https://skypie99.github.io/AccessMap/privacy/`. That page is
live, correctly Flagstone-branded, and says the app collects **"Crash reports — via Sentry"**
(`docs/privacy/index.html:114`, `:216`, `:229-230`) and **"Device type ... for bug fixing"** (`:112`).

None of that is true, and three independent sources say so:
- `src/lib/sentry.ts` is four lines of empty-body no-ops. No `@sentry/*` package in `package.json`. No Sentry plugin in `app.json`.
- `src/lib/analytics.ts:87-110` — `trackEvent`/`trackScreen`/`trackError` only `console.log` under `__DEV__`. No network call.
- The **in-app** policy says the opposite: `src/lib/copy.ts:710` — *"There is no advertising, no analytics, no crash reporting."*
- `app.json:28-96` `NSPrivacyCollectedDataTypes` declares **no** Diagnostics type, and `src/__tests__/appConfig.guard.test.ts:55-61` asserts that absence.

So the policy a reviewer opens from App Store Connect describes a **more** data-collecting app than the
binary, and contradicts your own App Privacy labels. Reviewers cross-read those two; a policy asserting
crash-report collection against labels that declare none is the standard metadata rejection.

**Why the test suite can't catch this:** `privacy.guard.test.ts` pins the *in-app* copy to
`design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md`, and `privacyLink.guard.test.ts` only checks the URL
*string*. Neither can see the hosted page's contents. This is the one blind spot in ~2,950 tests.

**Smallest fix:** the hosted page's source is **in this repo** — `docs/privacy/index.html` is git-tracked
and its `Last updated: July 31, 2026 | Version 1.1` line matches what the live URL serves. Delete the
Sentry / crash-report / usage-pattern claims from that file so it matches `copy.ts`, then let Pages
redeploy. No app build required.

*(While you're in that file: it also omits Nominatim — see S11.)*

---

### B2 · The production database has zero `open` and zero `verified` flags — the app is empty on every default surface
**~1 hour · production SQL, no binary change**

Live: `select status, count(*) from public.flags group by status` → `{rejected: 14, resolved: 6}`.
20 rows total, all pre-launch test data around Kelowna BC, **zero open, zero verified**.

Every landing surface filters to exactly `['open','verified']`:
- `src/lib/flags.ts:1666` `DEFAULT_STATUSES: FlagStatus[] = ['open','verified']`
- → `src/lib/flagsStore.tsx:187` `useState<FlagStatus[]>(DEFAULT_STATUSES)`
- → `src/lib/mapFilters.ts:67` `statuses: [...DEFAULT_STATUSES]`
- Tasks is *independently* hard-coded to the same pair at `src/screens/TasksScreen.tsx:96`.

So a reviewer sees: **Map** → "Nothing here right now" (`MapScreen.tsx:2318`); **Home** → "No barriers
reported yet." (`HomeScreen.tsx:587`); **Tasks** → empty list. RLS is *not* the cause — the `flags
readable by anon` policy is `USING (true)`, verified live. There is simply nothing matching to read.

It also directly contradicts your shipped reviewer instructions: `docs/APP_STORE_REVIEWER_NOTES.md:13-15`
tells the reviewer *"Reports are concentrated around Kelowna, British Columbia... To see populated data,
search or pan to Kelowna, BC"*. The Kelowna rows exist — but every one is resolved/rejected and therefore
invisible under the default filter. **A reviewer following your notes verbatim still sees an empty map.**

This is the classic Guideline 2.1 / 4.2 "app appears non-functional or demo-quality" rejection.

**Smallest fix:** seed real `open` and `verified` flags in production at the coordinates the reviewer
notes name, before submitting. Verify with one read: `select status, count(*) from public.flags group by
status` must show non-zero `open` **and** `verified`.

**Sequencing warning:** `supabase/migrations/2026-08-18_purge_test_flags.sql:46` is a bare
`delete from public.flags;` with no seeding step. It is **not applied** (20 rows still live; no
`zz_backup_*` tables exist). If you run it standalone before seeding, the app goes to literally zero
content. Treat purge-then-seed as one operation.

---

### B3 · No way to block an abusive user (Guideline 1.2)
**~half a day · `src/lib/hiddenContent.ts` + `src/components/CommentBubble.tsx` + read-side filters**

Guideline 1.2 requires *"a mechanism to block abusive users from the service."* Flagstone has no such
mechanism. Exhaustively verified twice:

- `rg -in 'blocked_users|block_user|blockUser|user_blocks|blocklist'` across the **whole repo** → zero code, zero SQL. Only markdown hits in `design-reviews/`.
- `rg -in '\bmute\b' src/` → two unrelated haptics props (`ui/Button.tsx:42`, `ui/Card.tsx:32`).
- Live `list_tables` on the production project returns 13 tables. **No blocking/mute table exists.**

What *does* exist is a per-**item** hide list, and it genuinely works — but it is the wrong shape:
- `src/lib/hiddenContent.ts:33` — `type HiddenKind = 'flag' | 'comment'`. Content kinds, never an author id.
- Its header at lines 12-16 states the author-id design was **deliberately rejected**, because anonymous flags are `user_id IS NULL` rows.
- The only production call is `src/components/FlagDetailModal.tsx:364` → `hideContent('comment', commentId)`. The `'flag'` branch is dead code.
- No read path anywhere excludes rows by author: `flags.ts:994` `listFlags` and `:1041` `listFlagsPage` apply only `.in('status', statuses)`.

An abuser posts a second comment and it renders normally. The reader must hide each item, forever.

**One nuance that makes the fix smaller than it looks:** flags never display an author. `FlagDetailModal.tsx:1241-1257`
renders only "You" / "Another community member" / "Anonymous". **Comments are the only surface with a
visible author identity** (`display_name`, joined at `comments.ts:32`). So blocking comment authors is
the leg that actually has to work.

**Smallest fix that satisfies the guideline:** extend the existing device-local list with an author-id
kind — `hideContent('author', userId)` — add a "Block this user" control to `CommentBubble.tsx` beside
the Report control that's already there, and filter on read in `src/hooks/useComments.ts`. That reuses a
shipped, tested module and needs no migration. A server-side `blocked_users` table is the better
long-term answer but is not required to clear review.

---

## SHOULD FIX — risky or sloppy, probably passable

Ordered by how fast you can clear them.

| # | Finding | Where | Time |
|---|---|---|---|
| S1 | **Reviewer notes describe controls that don't exist.** `docs/APP_STORE_REVIEWER_NOTES.md:17` says *"tap **Skip** on the sign-in screen"* — the actual control reads **"Browse without an account →"** (`SignInScreen.tsx:283`). `:27` says *"tap the **+** button"* — that FAB is wrapped in `{authUser && (` at `MapScreen.tsx:2624`, so it does not render on the guest path the notes just sent them down. The notes also *understate* the app: they say signing in is needed to report, but anonymous reporting works (`ReportFlagModal.tsx:413` → `createAnonFlag`). Docs-only. | `docs/APP_STORE_REVIEWER_NOTES.md` | 15 min |
| S2 | **`guestMode` is never reset.** Set true at `App.tsx:151`, never set false. A user who entered as guest, signed in, then signed out lands back in the browsing app instead of the sign-in wall. Fix: `useEffect(() => { if (session) setGuestMode(false); }, [session])`. | `App.tsx` ~:113 | 5 min |
| S3 | **`display_name` bypasses the content filter.** `src/lib/users.ts:17-49` `updateUserProfile` trims and length-caps but never calls `containsBlockedTerm` — no `@/moderation` import in the file. That name is rendered next to every comment (`comments.ts:32`) and on the leaderboard. It's the one field where a slur appears under an author's own byline. Add the check after the length check at :31. Note `blockedTerms.test.ts:174-182` pins only `comments.ts`/`flags.ts`, so nothing goes red — add a third row. | `src/lib/users.ts` | 20 min |
| S4 | **`feedback.contact_email` survives account deletion.** The FK is `ON DELETE SET NULL` (live-confirmed), so `user_id` is nulled — but `contact_email` is an independent column nothing clears, and `FeedbackModal.tsx:88` prefills it with the signed-in user's address. Your dialog promises *"permanently delete your account and personal information"* (`ProfileScreen.tsx:1764`). Fix: one line in the edge function before the admin delete — `await adminClient.from('feedback').update({ contact_email: null }).eq('user_id', userId);` then redeploy. | `supabase/functions/delete-account/index.ts` | 30 min |
| S5 | **`supabase/config.toml` does not exist.** `delete-account/index.ts:6-7` asserts *"verify_jwt: true (set in supabase/config.toml)"* and :33-35 repeats the required contents — but the file isn't there. The only `config.toml` is nested inside `supabase/functions/notify-flag-status/`, which the CLI does not read as authoritative. Live values are currently correct anyway (`delete-account` verify_jwt=true), so no submission impact — but a `functions deploy` from this checkout declares nothing. | new `supabase/config.toml` | 15 min |
| S6 | **Monthly leaderboard tab can never populate.** `src/lib/users.ts:114` calls `supabase.rpc('list_monthly_leaderboard')`. Live `pg_proc` returns 23 public functions and **that one is absent** — the migration is `2026-06-18_monthly_leaderboard_rpc_PROPOSED.sql`, unapplied. Degrades gracefully to `[]`, but the empty-state copy (`LeaderboardScreen.tsx:396`) blames low activity for a deployment gap. Apply the migration (smaller, more honest) or remove the 'month' branch at `:228-231`. | migration or `LeaderboardScreen.tsx` | 30 min |
| S7 | **Post-sign-up tells users to check an email that was never sent.** `SignInScreen.tsx:78-81` discards everything but `error` and then always shows *"We sent a confirmation link to…"* (`:103-112`). Two live records say Confirm email is **off** on this project, meaning `signUp` returns a session, `SIGNED_IN` fires, and the app drops the user into the map — while telling them to go find an email. Fix: read `data.session`; if non-null, skip the alert. | `src/screens/SignInScreen.tsx` | 1 hour |
| S8 | **Permanently-denied location makes reporting a dead end.** No `Linking.openSettings()` exists anywhere in `src/`. Chain: `MapScreen.tsx:2641` Report FAB → `requestLocation()` (`:1165`) → on permanent denial iOS resolves instantly `denied`, handler only sets a banner (`:2428`) that sits *behind* the now-open modal → `ReportFlagModal.tsx:633` shows "Waiting for location…" → `:643` a "Use my location" button wired to the same call that will deny forever → `:1206` Submit permanently disabled with the hint *"Tap 'Use my location' above to try again"*, an instruction that can never succeed. The escape hatch works (`MapScreen.tsx:1501` long-press sets `dropLocation` with no permission check) but is undiscoverable. Fix: check `canAskAgain`; when false, Alert with an "Open Settings" button, and mention the long-press. | `MapScreen.tsx:1166`, `ReportFlagModal.tsx` | 1 hour |
| S9 | **The sign-in wall promises guests can report; the map hides the control.** `SignInScreen.tsx:285` — *"You can browse and report barriers without an account."* But `MapScreen.tsx:2624` `{authUser && (` hides the Report FAB, and `:1503` `if (!authUser) return;` silently swallows the long-press. It *does* work from Home (`HomeScreen.tsx:638-648`, no auth gate) → `openReport: true` → anon insert. So the capability is real and missing exactly where a reviewer will look. | `MapScreen.tsx` or `SignInScreen.tsx` copy | 1 hour |
| S10 | **Comments are invisible to signed-out users, so per-comment reporting is unreachable for them.** Live `pg_policies` on `flag_comments` shows one SELECT policy, `TO authenticated`. An anon caller matches none, so `listComments` returns `[]` silently and the UI renders *"No comments yet — share what you know."* — a lie to a guest looking at a flag that has comments. Worse, the in-code rationale at `FlagDetailModal.tsx:1741-1744` claims the control is *"GUEST-VISIBLE… the App Review reviewer walks this app signed out"*, which is false for comments. Either add an anon SELECT policy, or fix the comment and show a sign-in prompt. Don't ship both claims. | migration or `FlagDetailModal.tsx` | 1 hour |
| S11 | **In-app policy says "That's it" but every typed address goes to OpenStreetMap.** `copy.ts:734` closes the third-party section with *"That's it."* But `geocode.ts:22` posts the user's typed query to `nominatim.openstreetmap.org`, reached from `AddressSearchModal.tsx:112`, mounted on both Map and Home. An independent egress sweep confirms it is the **only** undisclosed third-party recipient on iOS (cartocdn is web-only; the directions link is `maps:?daddr=` on iOS). Add one clause — to **both** `15_PRIVACY_POLICY_v1.md` and `docs/privacy/index.html`. *(`reverseGeocode` at `geocode.ts:108` would also send coordinates, but it is dead code — delete it so it can't be wired up later.)* | `copy.ts` + both policies | 1 hour |
| S12 | **Cold-launch blank screen for up to ~30s.** `App.tsx:142` `if (loading) return null;` and `auth.tsx:51-60` clears `loading` only in the `finally` of `getSession()`. Traced into the installed auth-js 2.106.2: an expired session triggers `_refreshAccessToken` with retries bounded by `AUTO_REFRESH_TICK_DURATION_MS = 30_000`. `expo-splash-screen` is not installed, so nothing holds the splash — the user sees nothing. **This cannot hit a reviewer's first launch** (fresh install has no persisted session), so it's a returning-user defect, not a review risk. Fix: race `getSession()` against a ~5s timeout and render the themed wash instead of `null`. | `src/lib/auth.tsx:53`, `App.tsx:142` | 1 hour |
| S13 | **Abuse reports land in a table nothing ever reads.** Reports insert into `public.feedback` with a `[REPORT]` prefix — verified working end to end. But: `AdminScreen.tsx` only loads `listRecentFlags(200)` (every "report" word there means an accessibility *flag*); `parseReportBody` has **no production caller**; `MyFeedbackModal.tsx:93` explicitly filters `[REPORT]` rows *out*; live `pg_trigger` on `feedback` shows only the rate limiter — no webhook. The only route to those rows is hand-written SQL in the dashboard. Meanwhile `copy.ts:169` promises *"Reports are reviewed within 24 hours."* Cheapest honest fix: a Supabase Database Webhook on `feedback` firing when `body LIKE '[REPORT]%'` — no client change. | new migration or `AdminScreen.tsx` | half a day |
| S14 | **No password reset exists.** Not a broken one — none. `resetPasswordForEmail` returns zero hits in `src/`. `SignInScreen.tsx:225-271` has only Sign in / Create account. A reviewer who typos a password hits a wall. Not an Apple rejection (there's no dead control), but a real abandonment hole. A full spec is banked at `specs/ready/password-reset-r7.md` and unimplemented. Note its constraint is real: `supabase.ts:60` sets native `flowType: 'implicit'`, and auth-js throws `AuthPKCEGrantCodeExchangeError` on the mismatch — so native must not call it directly; the web-owned arm is the one that works. | `SignInScreen.tsx` + web | half a day |
| S15 | **No crash reporting ships.** `src/lib/sentry.ts` is a 4-line no-op stub, so any release crash is invisible to you. (This is *why* B1 is a contradiction, and fixing B1 by editing the policy — rather than by adding Sentry — is the right call for v1.) | `src/lib/sentry.ts` | half a day |
| S16 | **Admin comment takedown has no in-app UI.** The DB lever exists and is live — `pg_policies` on `flag_comments` returns **four** policies including `admin delete any comment`. But `AdminScreen.tsx:69/153/174` is flags-only, so you must use the Supabase dashboard to remove an abusive comment. Capability exists; the UI doesn't. | `src/screens/AdminScreen.tsx` | half a day |
| S17 | **`flags` is anon-readable including reporter `user_id` alongside precise lat/lng.** Live: `flags readable by anon` `qual=true`, and `anon` holds SELECT on all 16 columns including `user_id`, `lat`, `lng`, `description`. The UI is careful (`FlagDetailModal.tsx:1241-1257` never shows a name) but the REST API is not, and the anon key ships in the binary. `supabase/schema.sql:320` justifies the policy with *"flags contain no PII"* — that is false. **Scope is narrower than it first looks:** anonymous reports carry no `user_id` at all (the anon insert policy forces `user_id IS NULL`), and `anon` has zero SELECT on `public.users`, so no name join without authenticating. ⚠️ **Do not** simply `revoke select (user_id) ... from anon` — `flags.ts:997/1046` select `user_id` explicitly on the guest path, and a column revoke makes PostgREST fail the whole request. Pair it with an anon-specific select list or a `user_id`-free view. | new migration + `flags.ts` select lists | half a day |
| S18 | **Any authenticated user can UPDATE any flag row.** Live `pg_policies`: `flags status update by any authenticated`, cmd UPDATE, `qual=true`, `with_check=true`. The name is misleading — it is not status-scoped. A `BEFORE UPDATE` trigger does column-lock (`enforce_flag_status_only_for_non_owner` contains `new.user_id := old.user_id`), so the practical damage is bounded, but the policy is far broader than its name. The status-transition guard (`2026-06-09_status_transition_guard_PROPOSED.sql`) was never deployed. Not an Apple concern; a data-integrity one. | new migration | half a day |
| S19 | **`getUserLeaderboardRank` is broken against live grants.** `flags.ts:1719-1722` does `.from('users').select('*', { count:'exact', head:true })`. I executed it: `set local role authenticated; select count(*) from (select * from public.users) t` → **ERROR 42501 permission denied**. `authenticated` holds SELECT on only 6 columns. Silent today (`LeaderboardScreen.tsx:243-246` swallows it, and it only fires outside the top 20 with 4 users). Fix: `.select('id', …)` — a head-count needs one granted column. | `src/lib/flags.ts:1719` | 15 min |
| S20 | **No image moderation of any kind.** No automated screening, no pre-approval, no per-photo report target. `uploadStrippedImage` (`flags.ts:740`) is a *privacy* pipeline (EXIF strip, magic-byte MIME, size cap) — nothing inspects what the image depicts. Mitigating: photos require an authenticated account (the anon insert policy forces `photo_url IS NULL`), and a reviewer can report the whole flag. Cheapest improvement: add a `'photo'` kind to `ReportTarget` (`reports.ts:61-66`). | `src/lib/reports.ts` | half a day |
| S21 | **Delete-account retry shows a misleading title.** After the deleted-but-sign-out-failed path, `ProfileScreen.tsx:692` leaves the sheet open with a live Delete button. On the second tap the user sees *"Could not delete account"* over *"Edge Function returned a non-2xx status code"* — their account **was** deleted. (The originally-suspected *"Your account was not deleted"* fallback at `:689` is only reached when the error has no message; that specific string is not what shows.) | `src/screens/ProfileScreen.tsx:679-693` | 20 min |

---

## OK — verified present and working

**Guideline 1.2(b) — reporting objectionable content: PASS.**
Per-item Report control on flags (`FlagDetailModal.tsx:1607-1623` → `setReportTarget({kind:'flag', id})`)
and on other people's comments (`CommentBubble.tsx:242-257`, gated `!isOwn`). Both open
`ReportContentModal` → `submitContentReport` (`reports.ts:242`) → `submitFeedback` → real INSERT into
`public.feedback`. **Works signed out** — the feedback insert policy allows anon rows, verified live.
The rate limiter (`enforce_feedback_rate_limit`, live, `tgenabled='O'`) **cannot silently drop a report**:
a throttled insert maps `skipped → failed` (`reports.ts:273-275`) and surfaces to the user. Confirmation
is explicit and screen-reader announced (`ReportContentModal.tsx:197-199`, `:320-331`).
*Caveat: nothing reads the resulting rows — see S13.*

**Guideline 5.1.1(v) — account deletion: PASS.**
Delete Account lives on **Profile** (`ProfileScreen.tsx:1721-1802`, typed confirmation) → `account.ts:24`
→ `supabase.functions.invoke('delete-account')`. **The edge function is deployed and ACTIVE** on the live
project (verified via `list_edge_functions`, `verify_jwt=true`), and it really deletes the `auth.users`
row via `adminClient.auth.admin.deleteUser` — not a sign-out, not a soft flag. The cascade holds live:
`pg_constraint` shows 20 FKs targeting `users`/`auth.users`, every `confdeltype` in `('c','n')`, zero
restrict/no-action, so nothing blocks the delete. `notification_preferences` CASCADEs (rows deleted);
`push_tokens` CASCADEs. Flags are deliberately anonymised rather than erased (`user_id = NULL`), which
your published Terms disclose — *"Anything you've contributed may stay in the app, with your name
removed."* Deletion is ungated and works for a user who never posted, and the dialog explains what will
happen first. *(Residuals: S4, and photos under the user's UUID prefix, which is disclosed at `copy.ts:742`.)*

**Guideline 1.2 — support contact: PASS.** `skylerhalisky@gmail.com` (`feedback.ts:8`) reachable through
three traced chains, and printed as readable text in the in-app Terms and Privacy screens — **reachable
while signed out**, one tap from the first screen.

**Guideline 1.2(a) — content filtering: PASS (client-side).** `containsBlockedTerm` fires on all four
flag/comment free-text paths *before* the network call: `flags.ts:1196` (create), `:1270` (owner edit),
`:1773` (**anonymous** create — hardened in `189bf5a`), `comments.ts:157`. 369 curated terms, deliberately
excluding ordinary profanity so *"the damn ramp is still broken"* is not rejected. *Gaps: S3, S20, and
the filter is client-only with no server mirror.*

**Guideline 4.8 — NOT TRIGGERED.** Email + password against your own Supabase backend is the only auth
method (`SignInScreen.tsx:20` imports only `signInWithEmail`/`signUpWithEmail`; no OAuth, no magic link,
no third-party auth SDK in `package.json`). 4.8 binds only when a *third-party or social* login service is
offered. **Sign in with Apple is not required.** Do not add it on this basis.

**Guideline 2.1 — completeness:** No placeholder copy, no lorem ipsum, no user-visible TODO, no dead link
— every user-reachable URL resolves. Every navigation destination renders real content; no stub screens.
Empty states are designed, not blank. App icon is a real asset at spec; version metadata is coherent
across `package.json`, `app.json`, and the generated Info.plist. `_to_delete/` is inert (nothing in `src/`
imports it). `eas.json`'s `TODO_PATH_TO_GOOGLE_SERVICE_ACCOUNT_KEY.json` is under `submit.production.android`
and **does not block an iOS submission**. The `TODO(Sky)` in `ResourcesScreen.tsx:9` is a code comment about
*optional* links — the screen has zero URLs and renders info cards, so there is no dead link.

**Robustness:** Offline handling is genuinely strong — stale-while-revalidate cache, bounded reads, honest
banners, no infinite skeletons. `ErrorBoundary` exists and is really mounted (`App.tsx:223`), plus a second
per-screen boundary. Camera, photo-library and notification denials all degrade cleanly. **No crash found
on the reviewer's main flow** (launch → sign in → map → pin → report + photo → tasks → profile).

**Privacy & permissions:** Every permission the code requests has a specific, plain-language purpose string
(`app.json:22-27`) — location, camera, photo library. The two classic traps don't apply: no
`NSPhotoLibraryAddUsageDescription` needed (nothing saves to the library), and the committed `ios/` drift
is not a shipping risk (`.gitignore:37` is `/ios`; `git ls-files ios` is empty, so EAS prebuilds fresh from
`app.json`). Privacy policy reachable in-app both signed out and signed in. **Data inventory matches the
declared `NSPrivacyCollectedDataTypes` exactly** — nothing collected-but-undeclared, nothing
declared-but-not-collected. `users.email` is NOT readable by other users (the propose-only migration was in
fact applied). Disability context tags describe the *barrier*, not the reporter — avoids special-category
data by design. EXIF/GPS stripping is real and **fail-closed** (`flags.ts:111-210`), matching the policy's claim.

**Backend:** All 13 public tables the app queries exist, and **RLS is enabled on every one**. Security
advisors return 4 WARN, 0 ERROR — three are intentional `SECURITY DEFINER` RPCs the client legitimately
calls, plus leaked-password protection being off. 67 migrations applied through 2026-07-29.

**Reviewer credentials:** `docs/APP_STORE_REVIEWER_NOTES.md:7-8` now reads `[PROVIDED IN APP STORE CONNECT
REVIEW NOTES]` for both fields. `APP_STORE_TODO.md §0.1` is **stale** on this — the working tree is clean.
The old password remains in public git history, so rotating it in Supabase Auth is still worth doing, but
it is not a repo-purge job.

**Demo account not required.** Guest browsing is real (`App.tsx:147`, `SignInScreen.tsx:283`), so Apple's
demo-account rule — which binds only when the app *requires* login — does not apply. No
`reviewer@accessmap.com` exists in the live auth table (only 4 real accounts), and nothing in the repo
asserts it is what gets submitted.

---

## UNKNOWN — what I could not verify, and the exact check

| # | Question | How to settle it |
|---|---|---|
| U1 | **Are `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` defined in the EAS `production` environment?** `supabase.ts:16-23` throws at **module scope**, imported via `App.tsx:12 → auth.tsx:3`, i.e. before any React render — so the `ErrorBoundary` cannot catch it. A missing var is a fatal launch crash, the textbook 2.1 rejection. Your own memory records this exact failure on 2026-05-29. | `eas env:list --environment production` — 5 min. Highest value-per-second check on this list. |
| U2 | Is **Confirm email** on or off in the Supabase dashboard? Decides whether S7's copy is a lie, and whether native sign-up is a dead end (no auth deep-link route; `linking.ts:30-40` declares only `FullMap`). | Supabase → Authentication → Providers → Email → "Confirm email". |
| U3 | What credential (if any) is entered in App Store Connect → App Review → Sign-In Information? | Check App Store Connect. Given guest mode works, "none" is acceptable — but then lead the notes with the guest path. |
| U4 | Does the mailto fallback deliver on a review device with no Mail account configured? `Linking.canOpenURL('mailto:')` returns false there, degrading to an on-screen address. | Run the report flow once on a fresh simulator with no Mail account. |

---

## Refuted during verification — do not re-raise

These were raised by a first-pass auditor and **disproved** by an independent second pass. Recorded so
they don't come back.

1. ~~"The Admin gate is unreachable — `authenticated` has no SELECT on `users.is_admin`."~~ **False as of
   today.** Live `information_schema.column_privileges` returns `is_admin` / SELECT for `authenticated`,
   and `admin_count = 1`. Applied live per `0dc33af` and `design-reviews/device-fixes/2026-08-18/04_CLOSEOUT.md:177-179`.
   The auditor was reading a now-stale code comment at `admin.ts:35-42` — the doc-as-hypothesis trap, one
   level down in the source.
2. ~~"There is no admin delete policy for comments."~~ **False.** Live `pg_policies` on `flag_comments`
   returns four policies including `admin delete any comment`. Only the migration *file* is missing — a
   provenance gap, not a capability gap.
3. ~~"The stale `ios/` prebuild ships an iPad-capable binary / the name AccessMap."~~ **Cannot reach the
   binary.** `.gitignore:37` is `/ios` and `git ls-files ios` is empty; EAS prebuilds from `app.json`.
   Operational caveat only: don't archive from `ios/` or run `eas build --local`.
4. ~~"Account deletion orphans `notification_preferences` and `flag_edit_history` — no FK."~~ **False.**
   The auditor's FK query was restricted to `schema public` and missed every FK pointing at `auth.users`.
   All three are wired; `notification_preferences` CASCADEs. Only S4 survives.

---

## Verdict

**Not submittable today — but you are three items away, and two of them are not code.**

Nothing in the binary is broken. The 1.2(b) reporting leg, 5.1.1(v) account deletion, purpose strings,
privacy-policy reachability, completeness, offline handling and permission-denial behaviour all genuinely
pass, verified against code and the live database rather than documentation. 4.8 is not triggered, so
Sign in with Apple is not required.

**Shortest path to submittable:**

1. **Edit `docs/privacy/index.html`** — strip the Sentry / crash-report / usage-analytics claims so the
   hosted policy matches the app and your App Privacy labels. *(~30 min, one file, no build.)*
2. **Seed production with real `open` and `verified` flags** at the coordinates your reviewer notes name —
   and do *not* run the purge migration standalone. *(~1 hour, SQL only, no build.)*
3. **Add author-level blocking to comments** — the only surface with a visible author identity. Extend the
   existing `hiddenContent` module with an `'author'` kind, add a Block control beside the Report control
   already in `CommentBubble.tsx`, and filter on read in `useComments.ts`. *(~half a day, no migration.)*
4. **Run `eas env:list --environment production`** before building. *(5 min — U1 is a launch crash if wrong.)*

Only item 3 requires a new binary. Items 1, 2 and 4 are a policy edit, a SQL seed, and a config check.

Then, in the same build, the cheap wins worth folding in: S1 (reviewer notes, 15 min), S2 (`guestMode`,
5 min), S3 (`display_name` filter, 20 min), S19 (leaderboard `select('*')`, 15 min) — about an hour total
for four real defects.

Realistically: **half a day of your time to submittable**, most of it on the blocking control.
