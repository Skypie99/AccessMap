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

## 🔧 Prod application this session (under Sky's explicit authorization)

Sky authorized applying the DB fixes to live prod. I applied + **verified with
rolled-back probes** (two real users, every write rolled back) — which changed
the picture materially and is exactly why I verified instead of trusting the apply:

- **F1 vuln CONFIRMED on prod:** as a second real user I both **edited and
  deleted** another user's flag. Real, not theoretical.
- **F1 fix applied → then REVERTED.** Dropping `flags_auth_user_only` broke
  community triage: the intended `flags status update by any authenticated`
  policy is *itself* broken (mis-correlated subquery → "more than one row"
  error), so non-owner status updates errored. I reverted the drop so triage
  keeps working. The correct fix is **trigger-based** and needs a preview-branch
  test (see DECISION 1 + the rewritten migration).
- **Kept (safe, verified):** the anon-insert consolidation — the insecure
  duplicate policy is gone, closing the anon `photo_url` injection; legit
  anonymous reporting verified still working.
- **F2 + F3 NOT applied to prod.** Given the live DB's demonstrated hidden
  interactions (a "safe" drop unmasked a broken policy), I stopped improvising
  live RLS/function changes. F2 risks the status webhook (search_path); both
  should be dry-run on a Supabase preview branch first.

**Net prod state vs. session start:** slightly safer (anon photo injection
closed), triage intact, the non-owner-tamper hole still OPEN pending the
trigger-based fix. The Supabase migration log shows the apply + the revert.

---

## ⚠️ DECISIONS FOR SKY (in priority order)

> None of these were applied by me. DB changes are migration files for you to
> run; the rest are dashboard toggles or judgment calls.

1. **[HIGH — still OPEN] Fix the "any signed-in user can edit/delete any flag"
   hole — via the trigger-based design in the rewritten
   `2026-06-01_flags_policy_consolidation.sql`, tested on a preview branch.**
   Confirmed exploitable on prod this session. The naive fix (drop
   `flags_auth_user_only`) breaks community triage because the
   `flags status update by any authenticated` policy is itself broken, and RLS
   column-pinning is fragile against the `updated_at` trigger + `reopen_requests`
   RPC. The migration now documents the evidence and a trigger-based fix
   (repair `enforce_flag_status_only_for_non_owner` to lock non-owners to the
   status column) with a preview-branch test plan. **Best owned by Dana** —
   it's backend trigger design, not a one-liner. This is the top item.

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

- **The flags table is still open to authenticated tampering** — confirmed
  exploitable on prod this session (non-owner edit + delete). The fix needs the
  trigger-based design (DECISION 1) dry-run on a preview branch; it's the single
  most important follow-up. Everything else is lower severity.
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
