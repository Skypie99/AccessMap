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

## ⚠️ DECISIONS FOR SKY (in priority order)

> None of these were applied by me. DB changes are migration files for you to
> run; the rest are dashboard toggles or judgment calls.

1. **[HIGH] Apply `supabase/migrations/2026-06-01_flags_policy_consolidation.sql`.**
   Live `pg_policies` shows a leftover coarse policy **`flags_auth_user_only`**
   (`FOR ALL`, role `public`, `USING/CHECK auth.uid() IS NOT NULL`). Because
   permissive policies are **OR'd**, it overrides the careful owner/triage
   policies: **any signed-in user can UPDATE or DELETE *any* flag, or INSERT a
   flag with a spoofed `user_id`.** For a wheelchair-routing app, a tester
   silently moving/erasing someone's barrier report is integrity *and* safety.
   A second leftover (`flags insert anon`) also **re-opened the anon `photo_url`
   injection** that `anon_flag_reporting_photo_fix` had closed. The migration
   drops both and keeps the least-privilege set. **Run the embedded smoke test
   after applying** (it verifies non-owners can't edit/delete others' flags).

2. **[MED] Apply `2026-06-01_function_exec_and_search_path_hardening.sql`.**
   Four trigger functions are RPC-callable via `/rest/v1/rpc` and two have a
   mutable `search_path` (`notify_flag_status_webhook`,
   `enforce_flag_status_only_for_non_owner`, `check_flag_creation_rate_limit`,
   `check_flag_rate_limit`). Pins `search_path` + revokes RPC EXECUTE — exactly
   what the baseline triggers already do.

3. **[MED] Apply `2026-06-01_flag_photos_insert_guard.sql`.**
   `flag_photos` INSERT is `WITH CHECK (true)` (Supabase's own linter flags it).
   Any authenticated user can attach an arbitrary external image URL to any
   flag. Migration anchors the URL to the uploader's storage folder.

4. **[LOW] Enable leaked-password protection** (Supabase → Authentication →
   Policies → "Leaked password protection"). Currently **disabled** (advisor
   `auth_leaked_password_protection`). One toggle; no code.

5. **[LOW] Reviewer test-account password is committed in git.**
   `supabase/migrations/2026-05-31_reviewer_test_account.sql:10` hardcodes
   `AccessMap2026!`. It is **not applied live yet** (good). Before App Store
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

- **Until F1 is applied, the flags table is open to authenticated tampering** —
  the single most important item. Everything else is lower severity.
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

**Apply the DB migrations** (Supabase → SQL Editor), in order, running each
file's smoke test: F1 `flags_policy_consolidation` → F2
`function_exec_and_search_path_hardening` → F3 `flag_photos_insert_guard`. Then
flip the **leaked-password protection** toggle (F4).

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

## Delivery

Per the standing rule that only Morgan messages Sky, **this report was not
emailed** — it's saved here in `qa-reports/` for Morgan to route. Copy-paste
prompt for applying the migrations via Cowork:

```
In the AccessMap Supabase project (Accessable City App), open the SQL Editor and
apply these three migration files from supabase/migrations/ in order, running the
smoke test in each file's header before moving to the next:
1. 2026-06-01_flags_policy_consolidation.sql
2. 2026-06-01_function_exec_and_search_path_hardening.sql
3. 2026-06-01_flag_photos_insert_guard.sql
Then enable Authentication → Policies → Leaked password protection. Do not change
anything else. Report back the smoke-test results for migration #1.
```
