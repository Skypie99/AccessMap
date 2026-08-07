# AccessMap — Final Pre-Tester Security, Safety & Robustness QA Report

**Auditor:** Steve (Safety Engineer) · **Date:** 2026-06-01
**Branch:** `qa-steve/accessmap-2026-06-01` (off `main`; **not merged** — main is Sky's gate)
**Live project verified (read-only):** `Accessable City App` (`kldlwszpfkdmsjrjhjym`)
**Gate:** `npm run typecheck` ✅ 0 · `npm test` ✅ 1553 passed / 0 failed (94 suites) · `npm run lint` ✅ 0 errors (259 pre-existing warnings, 0 added)

This was a whole-app pass. The headline: the app's auth/secrets foundation is
solid and prior RLS/privacy migrations are already applied live — but the live
DB has **policy/function drift** that re-opened one HIGH-severity hole, and the
client had broken-image and single-screen-crash gaps. I landed the safe client
fixes and wrote (propose-only) migrations for the DB findings.

---

## 🔧 Prod application this session — F1 FIXED + verified (Morgan→Dana, Sky-authorized)

Sky authorized the prod apply and asked Morgan to delegate; the fix is **applied
and verified on prod** with rolled-back probes (two real users). Live
introspection also **corrected the finding**:

- **EDIT was never exploitable.** The `enforce_flag_status_only_for_non_owner`
  BEFORE-UPDATE trigger already reverts every non-status column for non-owners
  (verified: a non-owner severity change did not persist). My first "edit
  succeeded" probe only counted rows — the trigger silently reverted the value.
- **DELETE *was* the real hole** (trigger is UPDATE-only; `flags_auth_user_only`
  granted DELETE + spoofed INSERT to any signed-in user). Confirmed: a non-owner
  delete of another's flag persisted.
- **Fix applied** (`flags_close_nonowner_delete_and_fix_triage_20260601`):
  replaced the broken triage policy with a simple `using/check(true)` (the
  trigger does the column-locking) and dropped `flags_auth_user_only`.
  **Verified on prod:** non-owner DELETE → blocked; non-owner edit → reverted,
  no RLS error; non-owner status triage → allowed; owner edit → works; spoofed
  INSERT → blocked. Webhook functions (`net.http_post`,
  `supabase_functions.http_request`) both exist, so status triage works
  end-to-end.
- **Also applied + verified:** anon `photo_url` injection closed; legit anon
  reporting still works.

**New follow-up findings surfaced during the fix (NOT changed — route to Dana):**
- **Hardcoded webhook secrets** in two trigger definitions
  (`flag_status_notify_trigger`, `notify-flag-status`) are extractable by any
  authenticated role via `pg_proc`/`pg_trigger`. **Rotate both + move to Vault.**
- **Duplicate triggers** → **double points**: two `AFTER UPDATE OF status`
  triggers both run `handle_flag_status_change` (plus two webhook triggers, two
  `updated_at` triggers). Drop the duplicates.
- `enforce_flag_status_only_for_non_owner` doesn't lock `context_tags` (minor
  non-owner metadata edit). Low severity.

---

## ⚠️ DECISIONS FOR SKY (in priority order)

> None of these were applied by me. DB changes are migration files for you to
> run; the rest are dashboard toggles or judgment calls.

1. **[HIGH — ✅ RESOLVED on prod this session]** "Any signed-in user can delete
   any flag" — fixed + verified (see the Prod-application section above).
   *New top items surfaced while fixing it (route to Dana):* **(a) rotate the
   two hardcoded webhook secrets** (extractable via `pg_proc`/`pg_trigger`) and
   move them to Vault; **(b) drop the duplicate `AFTER UPDATE OF status`
   trigger** — two of them run `handle_flag_status_change`, so every verify/
   resolve awards **double points** (gamification-integrity bug).

2. **[MED] `2026-06-01_function_exec_and_search_path_hardening.sql` — dry-run on
   a preview branch, then apply.** Four trigger functions are RPC-callable and
   two have mutable `search_path`. NOT applied this session: pinning
   `search_path` on `notify_flag_status_webhook` can break it if its body calls
   `net.*`/`extensions.*` unqualified — verify the status webhook still fires on
   a preview branch first.

3. **[MED] `2026-06-01_flag_photos_insert_guard.sql` — dry-run on a preview
   branch, then apply.** `flag_photos` INSERT is `WITH CHECK (true)` (Supabase's
   linter flags it) — any authenticated user can attach an arbitrary external
   image URL to any flag. Well-isolated (0 rows, no triggers); just confirm a
   legit multi-photo insert still passes the new check.

   *Already done this session (safe, verified, kept on prod):* the anon
   `photo_url` injection is closed (insecure duplicate anon-insert policy
   dropped; legit anon reporting still works).

4. **[LOW] Enable leaked-password protection** (Supabase → Authentication →
   Policies → "Leaked password protection"). Currently **disabled** (advisor
   `auth_leaked_password_protection`). One toggle; no code.

> ### ⚠️ CORRECTION — 2026-07-31 (security audit train, Phase B, finding S-2)
>
> **This finding was right, but under-rated and mis-scoped — and the ledger then
> closed it as a false positive.** The credential was committed in TWO places by
> `9fd1cd9` (2026-05-31); this entry cites only the `.sql` migration and misses
> the credential table added in the same commit. The 2026-06-02 cleanup
> (`c51c46a`) redacted the file this entry named and left the other, so the
> string has been live in `origin/main` of a **public** repo ever since. Six
> in-tree copies survive.
>
> **A secret finding is closed by re-grepping the string across HEAD and history
> — never by re-reading the one file the original finding named.**
>
> Re-rated **HIGH**. Live verification shows the exact published address does not
> resolve to an account, but the password string is public and a reviewer account
> exists at a one-character-different domain. **Rotation is the fix and it is
> Sky's to perform.** Purging these files is hygiene that belongs *after*
> rotation, so the historical text below is left intact rather than quietly
> rewritten.
>
> Detail: `security-audit/2026-07-31/LENS1_secrets_exposure.md` (S-1, S-2).

5. **[HIGH — re-rated 2026-07-31; was [LOW]] Reviewer test-account password is committed in git.**
   `supabase/migrations/2026-05-31_reviewer_test_account.sql:10` hardcodes
   `[REDACTED]`. It is **not applied live yet** (good). Before App Store
   submission: set the password in the dashboard only (not in a tracked file),
   use a strong unique value, and remove/rotate the committed one.

6. **[DECISION] Anon read of precise lat/lng + category + description.**
   Applied and Jordan-approved, but Jordan isn't a lawyer. Precise location +
   disability-adjacent context on a public map readable by guests deserves a
   final explicit privacy sign-off before public testers. No code change.

7. **[MERGE] This branch co-mingles the accessibility sibling's commits.**
   See "Branch state" below — the shared working tree caused my branch to also
   contain a11y commits. Reconcile the three audit branches carefully at merge.

---

## Already applied live — do NOT re-apply

Read-only `list_migrations` + `get_advisors` confirmed these prior propose-only
migrations are **already on the live DB**, so earlier reports listing them as
"to apply" are stale: `users_email_privacy` (email PII closed; `users.ts`
already dropped `email` from its select), `anon_flag_reporting_photo_fix`,
`latlong_range_constraint`, `account_deletion_cascade`,
`function_search_path_hardening` (partial — see F2), `anon_flags_select`,
`flag_photos_junction`, `trust_score_system`. RLS is enabled on **every** public
table.

---

## What I FIXED (landed on the branch — client/robustness)

All verified with typecheck + the relevant Jest suites.

| # | Fix | Files | Commit |
|---|-----|-------|--------|
| 1 | **Fail-safe `RemoteImage`** — raw `<Image uri>` rendered a blank gap on a null/dead/malicious URL. New `ui/RemoteImage.tsx` shows a muted fallback (or avatar initials) on null/error, resets on URL change. Migrated 11 call sites. TasksScreen already self-guarded → left alone. | `ui/RemoteImage.tsx` (new) + 10 files | `6d435b1` |
| 2 | **Per-tab error boundaries** — one screen's render crash no longer blanks the app. `ErrorBoundary` gained an optional `variant`/`label` (backward compatible); the tab navigator wraps every screen via `screenLayout`. | `ErrorBoundary.tsx`, `RootNavigator.tsx` | `5b6c59e` |
| 3 | **Map offline banner** — parity with TasksScreen; stale cached flags now show a "Showing saved data" notice. | `MapScreen.tsx` | `0cbab5f` |
| 4 | **Input validation** — `createFlag`/`createAnonFlag` now reject out-of-set category and non-1..5 severity at the client boundary, and normalize the description (trim, empty→null, cap 2000). | `flags.ts` | `ebfb57c` |
| 5 | **Phase-0 plan + findings register.** | `QA_PLAN_SECURITY.md` | `c7219e7` |

**Assessed but intentionally NOT changed (already safe — avoided shared-file churn):**
`Promise.all` filter hydration in MapScreen (every loader catches internally →
can't reject), `pickContrastText` NaN path (flows to a boolean → safe `#fff`),
comment + display-name validation (already trim + bound).

---

## PROPOSE-ONLY (migrations written, NOT applied)

`supabase/migrations/` — each is idempotent with a rollback + post-apply smoke
test in its header (commit `43959ec`):
- `2026-06-01_flags_policy_consolidation.sql` (F1, HIGH)
- `2026-06-01_function_exec_and_search_path_hardening.sql` (F2)
- `2026-06-01_flag_photos_insert_guard.sql` (F3)

**Suggested apply order:** F1 → F2 → F3 (independent; no prereqs — the
migrations they build on are already live). Run each file's smoke test before
moving on.

---

## SHARED-FILE edits (for merge reconciliation with a11y + perf)

Minimal + additive; flagged here as requested:
- `src/components/ui/RemoteImage.tsx` — **new** file (no conflict).
- `src/components/ErrorBoundary.tsx` — optional `variant`/`label` prop (additive, backward compatible).
- `src/navigation/RootNavigator.tsx` — one `screenLayout` prop + import.
- `src/components/FlagCard.tsx`, `PlatformMap.tsx` — `<Image>`→`<RemoteImage>`.
- `src/screens/MapScreen.tsx` — `<Image>`→`<RemoteImage>` + offline banner (**the a11y sibling also edited this file** — its FAB-dim change is in a different region; both layer cleanly and the suite passes).
- `src/screens/NearbyFlagsModal.tsx` — `<Image>`→`<RemoteImage>` (**a11y also touched this**: heading role; different region).
- `src/lib/flags.ts` — additive validation (perf may also touch this).

---

## Branch state (read before merging)

Due to the documented AccessMap shared-tree churn, this branch's history
**also contains the accessibility sibling's commits** (`bc03122`, `f6bd898`,
`8ddb534`, `02b6317`) and files (`QA_PLAN_A11Y.md`, `SignInScreen.tsx`). They
are clearly labelled `a11y(...)`; mine are `security(...)` / `harden(...)` /
`docs(security)`. The combined tree is green. I did **not** attempt to
surgically remove them (rebasing a live shared tree risks losing work). Morgan
should reconcile the security / a11y / perf branches at merge time.

**My commits only (review these):**
`c7219e7` plan · `43959ec` migrations · `6d435b1` images · `5b6c59e` boundaries
· `0cbab5f` map offline · `ebfb57c` input validation.

---

## Remaining risk going into testing

- **Non-owner DELETE of flags: FIXED + verified on prod** this session. Content
  edits were already trigger-protected. The remaining DB items are the two
  hardcoded webhook secrets (rotate) and the duplicate status trigger (double
  points) — both routed to Dana, neither blocks testers.
- Anon read privacy posture (F6) is a policy/legal question, not a bug.
- No new error-tracking backend (Sentry is a stub) — production crashes will be
  silent until Phase 6; the new error boundaries at least keep the app usable.
- Per-modal boundaries (vs. per-tab) are a possible future enhancement; I scoped
  to per-tab to limit shared-file churn.

---

## How to review

```bash
# My security commits (the branch also has a11y commits — see Branch state):
git show c7219e7 43959ec 6d435b1 5b6c59e 0cbab5f ebfb57c

# Or the whole branch vs main (includes the co-mingled a11y work):
git diff main..qa-steve/accessmap-2026-06-01
```

**DB fixes:** dry-run F1 (trigger-based) → F2 → F3 on a **Supabase preview
branch** (not prod) using each file's test plan, then apply to prod once green.
F1 is best owned by Dana (trigger design). The **leaked-password protection**
toggle (F4) can be flipped any time. (Prod already carries the anon
photo-injection close from this session.)

**Verify on real iOS + Android:**
- Broken-image fallback: a flag/avatar with a dead photo URL shows the muted
  box / initials, not a blank gap.
- Screen-crash isolation: a render error in one tab shows "… ran into a
  problem / Try again" while the tab bar + other tabs stay usable.
- Offline: airplane mode → map shows the "Showing saved data" banner + cached flags.
- Permissions: deny location → map degrades to default region; deny camera/
  library → graceful alert, report still submittable without a photo.
- After F1: with two accounts, confirm a non-owner can change a flag's **status**
  but cannot edit its description or delete it; anon report still inserts with
  `photo_url = NULL`.

---

## Delivery & next step

Per the only-Morgan rule, **this report was not emailed** — saved in
`qa-reports/` for Morgan to route. You opted for **Gary over Cowork** to run the
DB work; the audit then found the DB fixes need a **preview-branch dry-run
first** (F1's correct fix is trigger design, not a one-liner), so the next step:

- Spin up a Supabase **preview branch**; **Dana** finalizes + dry-runs the F1
  trigger-based fix (and F2/F3) against it using each file's test plan; **Gary**
  owns the verification/regression harness.
- Apply to prod only once the preview branch is green. F4 (leaked-password
  toggle) can be flipped any time.
- **Already applied to prod this session (verified):** anon `photo_url`
  injection closed.

The client-side fixes (RemoteImage, per-tab boundaries, Map offline banner,
input validation) are committed on `qa-steve/accessmap-2026-06-01`, awaiting
your merge.
