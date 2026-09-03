# FINDINGS LEDGER — Flagstone Deep Audit 2026-09-02

Stable IDs FDA-001… Never renumber. Status/severity vocab per audit prompt §11.

## Index

| ID | Title | Status | Severity | Category | Affected state |
|---|---|---|---|---|---|
| FDA-001 | main lacks Build 33 product code (113 commits) | CONFIRMED | HIGH | release-truth | CURRENT_MAIN, NEXT_BUILD_ONLY |
| FDA-002 | Build 33 admin Remove flag calls undeployed delete-flag Edge Function | CONFIRMED | HIGH | functional/backend-contract | SUBMITTED_BUILD_33, WEB_BUILD |
| FDA-003 | Build 33 account deletion: deployed v4 returns 'deleted', client demands 'requested'; user told it failed | CONFIRMED | HIGH | functional/backend-contract/app-store | SUBMITTED_BUILD_33 |
| FDA-004 | Build 33 Admin Reports queue selects feedback.moderation_* columns absent in production | CONFIRMED | HIGH | functional/backend-contract | SUBMITTED_BUILD_33, WEB_BUILD |
| FDA-005 | No backend-contract release gate; three client→backend mismatches shipped in Build 33 | CONFIRMED | HIGH | release-governance/test-confidence | SUBMITTED_BUILD_33, BACKEND, CURRENT_MAIN |
| FDA-006 | App Store demo account unverifiable (exists; credentials/rotation unknown) | EVIDENCE_GAP | MEDIUM | app-store | SUBMITTED_BUILD_33 |
| FDA-007 | Reviewer password literal in PUBLIC git history; rotation unverified | CONFIRMED/EVIDENCE_GAP | MEDIUM | security | BACKEND, DOCS_ONLY |
| FDA-008 | Auth leaked-password protection disabled | CONFIRMED | LOW | security hygiene | BACKEND |
| FDA-009 | Legacy flags_user_scoped FOR ALL policy still live | CONFIRMED | LOW | backend hygiene/perf | BACKEND |
| FDA-010 | Trigger functions EXECUTE-granted to anon/authenticated | CONFIRMED | LOW | security hygiene | BACKEND |
| FDA-011 | TS 6 vs SDK 54, app.json privacyPolicyUrl; expo-doctor fails 2/18 | CONFIRMED | LOW | tooling | CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-012 | Default anon/authenticated table grants incl. TRUNCATE on all public tables | CONFIRMED | LOW | security hygiene | BACKEND |
| FDA-013 | Web CSP report-only with stale CARTO allowlist; OpenFreeMap + blob worker violate | CONFIRMED | LOW | security hygiene/web | WEB_BUILD |

## Findings

### FDA-001
ID: FDA-001
TITLE: origin/main does not contain the submitted Build 33 product code (113 commits); a build cut from main would regress the shipped app
STATUS: CONFIRMED
SEVERITY: HIGH
CATEGORY: release-truth / governance
AFFECTED_STATE: CURRENT_MAIN, NEXT_BUILD_ONLY
CONFIDENCE: HIGH

USER_IMPACT: Any future EAS build taken from `main` ships without the Build 33 fixes (XXXL Dynamic Type sheet/report repairs, map overlay space recovery, keyboard-safe address search, em-dash copy fixes, moderation queue UI, async account-deletion client, media-key read contract). Users on that build would regress relative to what Apple is reviewing.
REPRODUCTION: `git merge-base --is-ancestor f5594171 origin/main` → NO. `git log --oneline f5594171..origin/main` = 5 docs/guard commits; `git log --oneline origin/main..f5594171` = 113 commits; `git diff --stat f5594171 origin/main -- . ':!*.md' ':!qa-reports' ':!docs' ':!design-reviews'` = 296 files, −22,705 lines.
EXPECTED: Governance `main` either contains, or is explicitly converged with, the source that was submitted to Apple before the next build is cut.
ACTUAL: `release/current.json` records `governance.releaseCodeIntegration: "deferred"`; docs call convergence "a SEPARATE RELEASE DECISION"; `npm run release:verify` PASSES while printing "MAIN RELEASE-CODE CONVERGENCE: DEFERRED".

ROOT_CAUSE_EVIDENCE: Build 33 was cut from `codex/final-polish-consolidation-20260831` @ f5594171, a descendant of a0bf4d04 (main at the time); main advanced only with docs/guards afterwards.
SOURCE_EVIDENCE: release/current.json (app.sourceCommit f5594171, governance.baseCommit c4626479); docs/RELEASE_IDENTITY.md §10; git ancestry above.
RUNTIME_EVIDENCE: n/a
TEST_EVIDENCE: logs/baseline-release-guards.log (release:verify PASS with DEFERRED info line)
VISUAL_EVIDENCE: n/a

HISTORICAL_RELATION: DECISIONS_LOG.md `[WEB-DEPLOY-BUILD33-SPLIT]`; docs/RELEASE_IDENTITY.md §23 "Deferred activation checklist".
REGRESSION_RISK: HIGH for the next build if the source decision is not made first; none for the currently submitted binary.
LIKELY_REPAIR_SIZE: LARGE (decision + convergence merge of 113 commits with two migration lineages — see FDA-004 once written)
DEPENDENCIES: Sky's convergence decision; migration-lineage reconciliation; FDA-002/FDA-003 (Build 33 backend contract gaps) must be resolved in the same decision.
RECOMMENDED_ACCEPTANCE_TEST: `git merge-base --is-ancestor <submitted SHA> origin/main` → YES, and `release:verify` reports `converged`; a fresh `release:preflight -- --build-sensitive` on the convergence commit.
NOTES: The split is a documented, intentional deferral (INTENTIONAL_DECISION in spirit) — recorded here because it is the single largest release-truth risk and gates every other repair wave's target branch.

### FDA-002
ID: FDA-002
TITLE: Admin "Remove flag" in the submitted Build 33 calls the `delete-flag` Edge Function, which is not deployed to production; the delete can never succeed
STATUS: CONFIRMED
SEVERITY: HIGH
CATEGORY: functional / backend-contract (moderation)
AFFECTED_STATE: SUBMITTED_BUILD_33, WEB_BUILD (ebf091c descends from f5594171 and keeps the same client); NOT CURRENT_MAIN (main still issues a direct Data API DELETE that production authorizes — see §29.4 evidence)
CONFIDENCE: HIGH

USER_IMPACT: An admin attempts to delete a flag from the Admin section, confirms "Remove flag?", and the flag does not disappear from the authoritative data/state (the app shows an error alert; the row is untouched). This is Sky's reported defect. Owners deleting their own flag through Flag Detail hit the same dead route in Build 33.
REPRODUCTION (source + catalog; runtime pending): Build 33 `src/lib/flags.ts:1442-1447` → `supabase.functions.invoke('delete-flag', { body: { flagId } })`. Production Edge Functions (Supabase management API, 2026-09-02): send-push-notification, notify-flag-status, delete-account only. Unauthenticated POST to `/functions/v1/delete-flag` → 404 (probe recorded in evidence/build33-backend-contract-probe.md). The three RPCs the route needs (`account_deletion_prepare_flag_delete`, `account_deletion_finalize_flag_delete`, `account_deletion_storage_exact_object`) are absent from `pg_proc` in production.
EXPECTED: Remove → confirmation → row deleted → list row removed → survives refresh.
ACTUAL: Remove → confirmation → `functions.invoke` fails (404 / FunctionsHttpError) → `Alert.alert('Error', …)` → row remains.

ROOT_CAUSE_EVIDENCE: D1F4R3-FIX2 (supabase/nonmanaged/proposed/20260828020000_…_flag_delete.sql, header "LOCAL SOURCE ONLY … not applied") moved deletion behind a service-role Edge route and was shipped in the client, but neither the Edge Function nor its RPC migrations were deployed; the client was accepted against a backend contract that does not exist in production.
SOURCE_EVIDENCE: Build 33 flags.ts:1432-1454 (comment: "`delete-flag` Edge route"); Build 33 supabase/functions/delete-flag/index.ts (rpc calls); Build 33 src/lib/adminReports.ts delegates report-queue removal to the same route.
RUNTIME_EVIDENCE: evidence/db-proof-flags-delete-authorization.md (deployed function list; applied migration ledger ends 20260830130000, no 20260828020000); endpoint probe.
TEST_EVIDENCE: Build 33 tests (d1f4r3Fix2ReviewReplay.test.ts:189, d1f4r3SourceClosure.guard.test.ts:125) only assert that the SOURCE TEXT contains `functions.invoke('delete-flag'` — they cannot see deployment state. The pgTAP file supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql asserts the post-migration world, which was never applied.
VISUAL_EVIDENCE: pending (simulator run of Build 33 source, if built)

HISTORICAL_RELATION: SR-050 (takedown gap, 2026-07-29 applied); D1F4R3-FIX2 (2026-08-28, "LOCAL SOURCE ONLY"); "admin delete any flag" 42501 saga (fixed 2026-08-18/19 by the users.is_admin SELECT grant — that older root cause is NOT the current one: the grant is present in production).
REGRESSION_RISK: Restoring the direct-DELETE client path in Build 33 would re-open the Storage-first takedown ordering that D1F4R3-FIX2 was written to enforce; deploying the Edge route + RPCs instead requires applying the d1f4 pipeline migrations (not in the managed lineage) to production.
LIKELY_REPAIR_SIZE: SMALL for the client-only option (route `deleteFlag` back to the direct DELETE + `.select('id')` path that main uses, keeping SR-050 photo sweep); MEDIUM–LARGE for the deploy-the-contract option (Edge Function + 3 RPCs + migration ledger + pgTAP proof).
DEPENDENCIES: FDA-001 (which lineage the fix lands on); FDA-003 (same class: other undeployed contract calls); Sky's decision on the D1F4 pipeline.
RECOMMENDED_ACCEPTANCE_TEST: see ADMIN_FLAG_DELETE_ACCEPTANCE_PLAN in FINAL_AUDIT_REPORT.md.
NOTES: ADMIN_DELETE_DB_AUTHORIZATION for a direct Data API DELETE by an is_admin user = YES in production today (grant + permissive policy + is_admin SELECT). The defect is a client→backend contract mismatch, not an RLS refusal.

### FDA-003
ID: FDA-003
TITLE: Submitted Build 33 account deletion contract mismatch — the deployed `delete-account` (v4, pre-D1) deletes the account immediately and returns `status: 'deleted'`, but the Build 33 client requires `status: 'requested'`, then polls an undeployed status route; the user is told the request failed while the account is already gone
STATUS: CONFIRMED (both sides read from source/production; runtime not exercised because it is destructive)
SEVERITY: HIGH
CATEGORY: functional / backend-contract / app-store (Guideline 5.1.1(v) account deletion) / privacy-adjacent
AFFECTED_STATE: SUBMITTED_BUILD_33 (native). WEB_BUILD: Build 33 web has no deletion path by design (`accountDeletionStartAvailability(Platform.OS)` → "unavailable in this browser"). CURRENT_MAIN: NOT affected — main's `src/lib/account.ts` only checks `error` from the same function and is compatible with the deployed v4.
CONFIDENCE: HIGH

USER_IMPACT: In the shipped app, Profile → Delete Account → confirm: the server anonymises the user's flags and deletes the auth user (v4 behaviour), returns 200 `{status:'deleted'}`; the client throws "Deletion request was not accepted." because it wanted `'requested'`; ProfileScreen shows the alert "Could not confirm deletion request … Use Check deletion status below before trying again"; `signOut` is never reached (it runs after the status check), so the app keeps a dead session until the access token expires; "Check deletion status" calls `account-deletion-status` → 404 every time. The account IS deleted, but the person is told it was not. An App Store reviewer exercising account deletion sees a failure message.
REPRODUCTION: source trace only. Build 33 `src/lib/account.ts:17-31` (invoke → `if (!data || data.status !== 'requested') throw`), Build 33 `src/screens/ProfileScreen.tsx` `handleDeleteAccount` catch branch (`notify('Could not confirm deletion request', …)` then `refreshAccountDeletionStatus()`), deployed `delete-account` v4 source (`return jsonResponse(200, { status: 'deleted' })` after `auth.admin.deleteUser`), probe `account-deletion-status` → 404 (evidence/build33-backend-contract-probe.md).
EXPECTED: Confirm → durable REQUESTED (D1F4 design) or immediate deletion (legacy design) → clear success copy → signed out.
ACTUAL: Deletion happens server-side; client reports failure; session lingers; status surface dead.

ROOT_CAUSE_EVIDENCE: The D1F4 async pipeline (Build 33 supabase/functions/delete-account + account-deletion-{status,review,worker} + `request_account_deletion` RPC and tables under supabase/nonmanaged/proposed/…) was shipped in the client but never deployed; production still runs the 2026-05-31 cascade function (v4, updated_at 1780164326432).
SOURCE_EVIDENCE: Build 33 src/lib/account.ts, src/lib/accountDeletionReceipt.ts:87-97, src/screens/ProfileScreen.tsx (handleDeleteAccount / refreshAccountDeletionStatus); Build 33 supabase/functions/delete-account/index.ts (expects operationId/receiptSecret, calls rpc `request_account_deletion`); main src/lib/account.ts (checks only `error`).
RUNTIME_EVIDENCE: production Edge Function list + deployed v4 source (Supabase management API, read-only); `pg_proc` has no `request_account_deletion`.
TEST_EVIDENCE: Build 33 `src/lib/__tests__/account.test.ts` mocks `functions.invoke` to return `{status:'requested'}`; `src/__tests__/d1OptionAAccountDeletion.guard.test.ts` greps the Edge Function SOURCE text — neither can observe deployment.
VISUAL_EVIDENCE: none (not exercised)

HISTORICAL_RELATION: D1 Option A / D1F4 (qa-reports 2026-08-27/28, "LOCAL SOURCE ONLY"); design-reviews/ship-ready/R1_ACCOUNT_DELETION_SWEEP.md; migration 2026-05-29_account_deletion_cascade.sql (main) — HISTORICAL_REGRESSED from the user's perspective: the May flow worked end-to-end; the Build 33 client broke it against the same backend.
REGRESSION_RISK: Any fix must keep flags anonymisation + auth deletion atomic; the D1S-A live policies require a `public.users` row for writes, so a lingering dead session produces "Account is no longer active" errors until sign-out.
LIKELY_REPAIR_SIZE: SMALL (client: accept `'deleted'` from the legacy function, sign out, show success; hide "Check deletion status" until the status route exists) vs LARGE (deploy the D1F4 pipeline: 4 Edge Functions, worker scheduling, nonmanaged migrations into the ledger, pgTAP proof).
DEPENDENCIES: FDA-001 (target lineage); Sky's decision D1F4-vs-legacy; privacy review (account deletion touches auth — Const. Art. 7.6).
RECOMMENDED_ACCEPTANCE_TEST: disposable account on a disposable environment → Delete Account → success copy → signed out → relaunch shows signed-out → `auth.users` row absent, flags anonymised → no error alert; web shows the intended unavailability copy.
NOTES: Web demo cannot delete accounts at all (design decision in Build 33) — recorded under App Store/product notes, not as a separate defect.

### FDA-004
ID: FDA-004
TITLE: Submitted Build 33 Admin "Reports" queue selects moderation columns that production's `feedback` table does not have; the queue never loads and report resolutions cannot be recorded
STATUS: CONFIRMED (source + production catalog)
SEVERITY: HIGH
CATEGORY: functional / backend-contract (UGC moderation)
AFFECTED_STATE: SUBMITTED_BUILD_33, WEB_BUILD. CURRENT_MAIN: NOT affected (main has no `adminReports.ts` / Reports tab; its Admin screen is the flags list only).
CONFIDENCE: HIGH

USER_IMPACT: In the shipped app the Admin screen has two queues (Flags / Reports). Opening Reports runs `listOpenReports()` → PostgREST 42703 "column feedback.moderation_reviewed_at does not exist" → `reportsLoadError` banner; every close/resolve/action-intent update (`.update({ moderation_reviewed_by, moderation_resolution, … })`) fails the same way. The admin cannot triage content reports in-app. Users CAN still file reports (the user-facing path inserts an ordinary `feedback` row).
REPRODUCTION: source trace. Build 33 `src/lib/adminReports.ts:82` `REPORT_SELECT = 'id, created_at, body, moderation_reviewed_at, moderation_resolution, moderation_action_intent'`; `:104-110` `.from('feedback').select(REPORT_SELECT).is('moderation_reviewed_at', null)…`; production `information_schema.columns` for `feedback` = id, user_id, category, body, contact_email, platform, created_at (no moderation_* columns); applied-migration ledger lacks 20260828050000/070000/080000 (mod1 admin report queue / pending-close / action-intent). Runtime: not exercised (needs admin sign-in) → EVIDENCE_GAP for the on-screen banner text.
EXPECTED: Reports tab lists open reports; actions persist.
ACTUAL: Reports tab errors; nothing persists.

ROOT_CAUSE_EVIDENCE: MOD1 migrations (supabase/migrations/20260828040000–080000 in the Build 33 tree) add the columns, policies (`feedback_select_moderation`, `feedback_update_moderation`, `feedback_select_report_requires_admin`) and column-scoped UPDATE grants, but were never applied (see also the 2026-08-30 ProductionSchemaContractP0 report, which explicitly warned that an unfiltered push "could apply … five 20260828… moderation files" and chose to apply only the media-key migration).
SOURCE_EVIDENCE: Build 33 src/lib/adminReports.ts (REPORT_SELECT, listOpenReports, closeAfterContentAction); Build 33 src/screens/AdminScreen.tsx:110-145 (reports state + loadReports + error banner).
RUNTIME_EVIDENCE: evidence/db-proof-flags-delete-authorization.md (migration ledger); production column list captured 2026-09-02.
TEST_EVIDENCE: Build 33 src/lib/__tests__/adminReports.test.ts mocks the Supabase chain; nothing checks column existence against a real schema.
VISUAL_EVIDENCE: none

HISTORICAL_RELATION: MOD1 / MOD1R (qa-reports/2026-08-28_MOD1R_moderation_release_safety.md, Build-33-only); Apple 1.2 UGC moderation items in design-reviews/ship-ready/05_THE_SUBMISSION_GAP_LIST.md.
REGRESSION_RISK: Applying MOD1 also revokes broad UPDATE on `feedback` from authenticated and adds admin-only policies — a security improvement, but must be applied as a set with the client that expects it.
LIKELY_REPAIR_SIZE: MEDIUM (apply the three MOD1 migrations in order + `mod1r_fix1_report_and_insert_authz` review + pgTAP proof) or SMALL client-side degrade (hide the Reports tab until the columns exist).
DEPENDENCIES: FDA-001 lineage decision; FDA-005 (contract gate); migration-lineage reconciliation (two naming schemes).
RECOMMENDED_ACCEPTANCE_TEST: admin opens Reports → list renders (or honest empty state) → close a disposable report → row shows moderation_reviewed_at set → non-admin cannot read others' reports.
NOTES: Production `feedback` grants still give `authenticated` (and `anon`) full table UPDATE/DELETE with only RLS as the guard (default Supabase grants) — Lane E records that separately.

### FDA-005
ID: FDA-005
TITLE: No release gate ties the accepted client to the production backend contract — Build 33 shipped with at least three client→backend mismatches (delete-flag route, D1F4 account deletion, MOD1 report queue) that no test, CI job, or release guard could see
STATUS: CONFIRMED
SEVERITY: HIGH
CATEGORY: release-governance / test-confidence
AFFECTED_STATE: SUBMITTED_BUILD_33, BACKEND, TEST_INFRA_ONLY (process), CURRENT_MAIN (same gap exists for future builds)
CONFIDENCE: HIGH

USER_IMPACT: Indirect but systemic: features that pass every local gate (typecheck, 3,657 Jest tests, source-grep guard tests, release identity guards) can still be dead on arrival because production lacks the function/column/RPC they call. FDA-002, FDA-003 and FDA-004 are three instances in one submitted binary; the 2026-08-30 media-key P0 (42703 on every flag read) was a fourth, caught only after acceptance.
REPRODUCTION: Compare Build 33 `supabase.functions.invoke(...)` / `.rpc(...)` / column projections with the production Edge Function list, `pg_proc`, and `information_schema.columns` (evidence/build33-backend-contract-probe.md). CI workflows run Jest/typecheck/lint and `release:verify` (source identity only); the pgTAP proofs under supabase/tests/ are "staging-only" and the mod1r-fix1-rls-proof workflow (Build 33 tree) needs a Postgres it does not have in CI.
EXPECTED: Before an EAS store build, an automated check enumerates the client's backend surface (functions invoked, RPCs, selected columns) and proves each exists in the target project (read-only catalog queries), failing the build otherwise.
ACTUAL: `release:verify` proves Git identity only ("RECRUITER / PRODUCT EXPERIENCE: SEPARATE GATE"); Supabase migrations are hand-applied with two competing lineages (date-named files on main vs timestamped files + `nonmanaged/` on Build 33); guard tests grep source text.

ROOT_CAUSE_EVIDENCE: supabase/nonmanaged/proposed/* headers ("LOCAL SOURCE ONLY … not applied"); ProductionSchemaContractP0 report; production ledger vs Build 33 migration set; Jest mocks (Lane H evidence) resolve every backend call successfully by default.
SOURCE_EVIDENCE: .github/workflows/* (Lane H inventory), scripts/verify-release-state.mjs (identity-only checks), supabase/tests/*.sql (never run in CI).
RUNTIME_EVIDENCE: three confirmed mismatches above.
TEST_EVIDENCE: logs/baseline-jest.log (all green while the shipped binary's admin delete, account deletion and report queue are broken).
VISUAL_EVIDENCE: n/a

HISTORICAL_RELATION: ProductionSchemaContractP0 (2026-08-30); D1F4R3 LocalGateVerification (2026-08-28) explicitly deferred database proof; DECISIONS_LOG migration-history repairs (2026-08-28).
REGRESSION_RISK: none from the gate itself; it is additive.
LIKELY_REPAIR_SIZE: MEDIUM (a read-only "backend contract" script: parse invoke/rpc/select strings → query catalog via CLI/HTTP with the anon key → fail on missing; wire into release:preflight) + a decision on a single migration lineage.
DEPENDENCIES: Sky's decision on the migration lineage (main-style vs Build-33-style); FDA-001.
RECOMMENDED_ACCEPTANCE_TEST: Running the gate against production with the Build 33 tree FAILS listing delete-flag, account-deletion-status, request_account_deletion, feedback.moderation_reviewed_at; running it against the eventually converged tree PASSES.
NOTES: This is the "WHY DID TESTS NOT CATCH IT" answer for FDA-002/003/004.

### FDA-006
ID: FDA-006
TITLE: App Store demo account cannot be verified by the audit — a reviewer-pattern account exists in production, but the credentials handed to Apple, their rotation status, and whether the account still signs in are unknown
STATUS: EVIDENCE_GAP
SEVERITY: MEDIUM
CATEGORY: app-store (Guideline 2.1 demo account)
AFFECTED_STATE: SUBMITTED_BUILD_33
CONFIDENCE: MEDIUM

USER_IMPACT: If App Review cannot sign in with the supplied account, the submission is rejected regardless of app quality. Signed-out browsing exists ("Browse without an account"), and anonymous reporting works, so the blast radius is limited to the signed-in checks the notes ask reviewers to perform (comments, block-user, verify/resolve).
REPRODUCTION: `docs/APP_STORE_REVIEWER_NOTES.md` now says credentials are "[PROVIDED IN APP STORE CONNECT REVIEW NOTES]". Read-only production count: `auth.users` rows with email matching review/test/apple/demo = 1; `reviewer@accessmap.com` (the address in `supabase/migrations/2026-05-31_reviewer_test_account.sql`) = 0 rows — the live account is at a different address (security-audit CLOSE_OUT 2026-07-31: "a one-character-different domain"). 3 of 5 auth users signed in within 30 days.
EXPECTED: One documented demo account, verified to sign in on the submitted build, with a rotated password stored only in App Store Connect.
ACTUAL: Existence proven; sign-in ability and ASC contents unverifiable from the repo; `APP_STORE_TODO.md` §0.1 "Rotate the reviewer credential ★ START HERE" is still an open checkbox.

ROOT_CAUSE_EVIDENCE: n/a (verification gap)
SOURCE_EVIDENCE: docs/APP_STORE_REVIEWER_NOTES.md; APP_STORE_TODO.md:18-24; security-audit/2026-07-31/phase-b/FORK_S1_credential_rotation.md; supabase/migrations/2026-05-31_reviewer_test_account.sql (comment now says password never committed).
RUNTIME_EVIDENCE: read-only auth.users counts (no emails or PII recorded).
TEST_EVIDENCE: none possible.
VISUAL_EVIDENCE: none

HISTORICAL_RELATION: AR-2 (docs/TESTFLIGHT_ACTION_ITEMS.md "No test account for Apple reviewer"); S-1 (security-audit FORK, 2026-07-31); APP_STORE_TODO §0.1.
REGRESSION_RISK: none
LIKELY_REPAIR_SIZE: TINY (Sky: confirm/rotate in Supabase Auth; confirm ASC notes; sign in once on TestFlight Build 33)
DEPENDENCIES: Sky-only (credentials never handled by agents)
RECOMMENDED_ACCEPTANCE_TEST: Sky signs in with the ASC-listed credentials on the TestFlight build; the account can comment, verify, and block; APP_STORE_TODO §0.1 checked.
NOTES: Also note FDA-003: if a reviewer exercises Delete Account with this account, the account is destroyed AND the reviewer sees an error.

### FDA-007
ID: FDA-007
TITLE: A reviewer-account password literal remains in the PUBLIC repository's git history (removed from HEAD by a later redaction commit); rotation cannot be verified by the audit
STATUS: CONFIRMED (history) / EVIDENCE_GAP (rotation)
SEVERITY: MEDIUM
CATEGORY: security (credential exposure)
AFFECTED_STATE: BACKEND (auth), DOCS_ONLY (repo)
CONFIDENCE: HIGH

USER_IMPACT: Anyone can read the historical literal from `git log -p` on github.com/Skypie99/AccessMap (visibility PUBLIC, verified via `gh repo view`). If the live reviewer account still uses it, a stranger can act as that account (post, comment, report). The repo audit of 2026-07-31 reached the same conclusion and forked rotation to Sky.
REPRODUCTION: `git log -p --follow -- supabase/migrations/2026-05-31_reviewer_test_account.sql` shows the removed comment line; `git grep` at HEAD for the literal pattern → 0 tracked files (redaction held). The literal itself is deliberately NOT recorded in this audit.
EXPECTED: Rotated password; history either rewritten or accepted as burned with rotation as the control.
ACTUAL: Rotation status unknown to the audit (only Sky can check); the ★ START HERE checkbox in APP_STORE_TODO.md is unchecked as of the locked SHA.

ROOT_CAUSE_EVIDENCE: credential committed in a migration comment on 2026-05-31; redacted later without history rewrite.
SOURCE_EVIDENCE: git history of the migration; security-audit/2026-07-31/phase-b/{FORK_S1_credential_rotation.md, CLOSE_OUT.md}.
RUNTIME_EVIDENCE: `gh repo view --json isPrivate` → false.
TEST_EVIDENCE: `src/__tests__/noCredentialsInTree` guard exists (2e510e9) — it protects HEAD, not history.
VISUAL_EVIDENCE: n/a

HISTORICAL_RELATION: S-1 (2026-07-31 FORK), APP_STORE_TODO §0.1 — HISTORICAL_STILL_OPEN unless Sky rotated out-of-band.
REGRESSION_RISK: none
LIKELY_REPAIR_SIZE: TINY (rotate) — history rewrite optional and Sky-only.
DEPENDENCIES: Sky-only
RECOMMENDED_ACCEPTANCE_TEST: Sky confirms the account password was changed after 2026-07-31; optional: GitHub secret-scanning alert closed.
NOTES: The audit surfaced the literal in a shell transcript by accident (a masking regex assumed quotes); it was not copied into any audit artifact.

### FDA-008
ID: FDA-008
TITLE: Supabase Auth leaked-password protection (HaveIBeenPwned check) is disabled in production
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: security hygiene
AFFECTED_STATE: BACKEND
CONFIDENCE: HIGH
USER_IMPACT: Email/password sign-up accepts known-breached passwords; account-takeover risk for users who reuse passwords. No in-app symptom.
REPRODUCTION: Supabase security advisor `auth_leaked_password_protection` (evidence/supabase-advisors.md).
EXPECTED: enabled (dashboard toggle, no code). ACTUAL: disabled.
ROOT_CAUSE_EVIDENCE / SOURCE_EVIDENCE / RUNTIME_EVIDENCE: advisor output 2026-09-02. TEST_EVIDENCE / VISUAL_EVIDENCE: n/a
HISTORICAL_RELATION: not previously recorded (grep of qa-reports for "leaked password" — none).
REGRESSION_RISK: existing users with breached passwords are prompted at next sign-in only if Supabase enforces on sign-in (it enforces on sign-up/password change).
LIKELY_REPAIR_SIZE: TINY (Sky: Auth → Passwords → enable). DEPENDENCIES: Sky-only production setting.
RECOMMENDED_ACCEPTANCE_TEST: advisor no longer lists the lint; sign-up with a known-breached password is refused with the app showing its error copy legibly.
NOTES: Also check the Auth password minimum length in the same screen (not readable via advisors).

### FDA-009
ID: FDA-009
TITLE: Legacy `flags_user_scoped` FOR ALL policy (roles = public, bare `auth.uid()`) is still live and overlaps every other flags policy
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: backend hygiene / performance
AFFECTED_STATE: BACKEND
CONFIDENCE: HIGH
USER_IMPACT: None today (21 rows). At scale: per-row re-evaluation of `auth.uid()` (advisor `auth_rls_initplan`) and 7 `multiple_permissive_policies` warnings on `flags`. Security: the policy is owner-scoped, so it adds no access beyond `flags delete own` / `flags insert own`, but it silently re-grants owner DELETE if the named DELETE policies were ever dropped — which is exactly what D1F4R3-FIX2 tried to prevent by dropping it.
REPRODUCTION: evidence/db-proof-flags-delete-authorization.md (pg_policies); evidence/supabase-advisors.md.
EXPECTED: one policy per command/role, all using `(select auth.uid())`. ACTUAL: catch-all legacy policy persists.
ROOT_CAUSE_EVIDENCE: `d1_flags_rls` (20260528180513) era policy never dropped by the 2026-06-01 consolidation (`flags_policy_consolidation_20260601` dropped others).
SOURCE_EVIDENCE: main `supabase/schema.sql` does not declare it (schema.sql is stale vs live — see Lane I). 
HISTORICAL_RELATION: D1F4R3-FIX2 (drop policy "flags_user_scoped"), rls_initplan work (2026-05-23, 2026-07-27).
LIKELY_REPAIR_SIZE: TINY (one `drop policy` migration + pgTAP assertion). DEPENDENCIES: migration-lineage decision (FDA-005).
RECOMMENDED_ACCEPTANCE_TEST: advisors show no `auth_rls_initplan` on flags; owner insert/update/delete and admin delete still pass.

### FDA-010
ID: FDA-010
TITLE: Three SECURITY DEFINER trigger functions from the media-key migration are EXECUTE-granted to PUBLIC/anon/authenticated
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: security hygiene
AFFECTED_STATE: BACKEND
CONFIDENCE: HIGH
USER_IMPACT: None exploitable — `RETURNS trigger` functions cannot be invoked via `/rest/v1/rpc` ("trigger functions can only be called as triggers") — but the grant contradicts the project's own search_path/grant hardening (2026-06-01) and keeps two linter WARNs permanently red, hiding future real ones.
REPRODUCTION: `pg_proc` grant listing (evidence/db-proof-flags-delete-authorization.md, functions table): enforce_flag_photos_object_key_guard, enforce_flags_photo_object_key_guard, enforce_users_avatar_object_key_guard → PUBLIC,anon,authenticated. Advisor lints 0028/0029.
EXPECTED: `revoke execute … from public, anon, authenticated` like the other trigger functions (e.g. `enforce_flag_status_transition` after D1S-A F4).
SOURCE_EVIDENCE: supabase/migrations/… 20260830130000_promptb_media_key_read_contract.sql (Build 33 tree; applied in production).
LIKELY_REPAIR_SIZE: TINY. DEPENDENCIES: FDA-005 lineage.
RECOMMENDED_ACCEPTANCE_TEST: security advisor shows no lint 0028/0029 for these three functions; photo upload/commit flows still work.

### FDA-011
ID: FDA-011
TITLE: Toolchain drift: TypeScript ~6.0 (main and Build 33) versus Expo SDK 54's expected ~5.9, three patch-level SDK package drifts, and an invalid `privacyPolicyUrl` key in app.json — `expo-doctor` fails 2 of 18 checks
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: architecture / tooling
AFFECTED_STATE: CURRENT_MAIN, SUBMITTED_BUILD_33 (both declare "typescript": "~6.0.0")
CONFIDENCE: HIGH
USER_IMPACT: None at runtime; typecheck passes. Risk: Expo tooling explicitly unsupported combination; future `expo install --fix` will downgrade; Dependabot's "typescript-and-tooling" PR is red in CI (run 33605027648) so tooling updates are stuck.
REPRODUCTION: logs/baseline-expo-doctor.log; `gh run list` (2026-09-02 dependabot CI failure); package.json:85.
EXPECTED: `expo-doctor` 18/18. ACTUAL: schema error `privacyPolicyUrl` (not an Expo config key; Apple reads the privacy URL from App Store Connect, not app.json) + version mismatches.
SOURCE_EVIDENCE: app.json:5; package.json:85; commit 8ce2c41 "remove duplicate typescript from dependencies; align lockfile".
LIKELY_REPAIR_SIZE: TINY–SMALL (move the URL to a comment/docs, `npx expo install --check`, pin TS ~5.9 or add `expo.install.exclude`).
DEPENDENCIES: none. RECOMMENDED_ACCEPTANCE_TEST: `npx expo-doctor` passes; typecheck/lint/jest green; Dependabot CI green.

### FDA-012
ID: FDA-012
TITLE: Every public table still carries Supabase's default grant set for `anon` and `authenticated` (DELETE, UPDATE, TRUNCATE, TRIGGER, REFERENCES) — RLS is the only guard, and TRUNCATE is not governed by RLS
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: security hygiene (defense in depth)
AFFECTED_STATE: BACKEND
CONFIDENCE: HIGH
USER_IMPACT: None via PostgREST today (it never issues TRUNCATE/DDL). It matters if any future SECURITY DEFINER function or a misconfigured policy exposes a path, and it is the exact class D1F4R3-FIX2 argued for ("no client role keeps DELETE table privilege" — never applied).
REPRODUCTION: `information_schema.role_table_grants` for anon/authenticated (evidence/db-proof-flags-delete-authorization.md addendum + evidence/supabase-advisors.md data). Only `bk_2026_08_22_*` tables had their grants revoked (D1S-A F1).
EXPECTED: least privilege per table (e.g. anon: SELECT on flags + INSERT on flags/feedback only). ACTUAL: full default set everywhere.
LIKELY_REPAIR_SIZE: SMALL (one revoke migration + pgTAP proving the app's exact needs) — must be sequenced with FDA-002's chosen delete path (a direct-DELETE client needs authenticated DELETE kept).
DEPENDENCIES: FDA-002 decision; FDA-005 lineage.
RECOMMENDED_ACCEPTANCE_TEST: pgTAP `has_table_privilege` matrix equals the documented minimum; all journeys pass on a disposable environment.

### FDA-013
ID: FDA-013
TITLE: Web Content-Security-Policy is report-only and its allowlist names the retired CARTO basemap while the served Build 33 web uses OpenFreeMap (MapLibre blob worker also violates `worker-src 'self'`)
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: security hygiene / web
AFFECTED_STATE: WEB_BUILD (Build 33 web ebf091c: tiles.openfreemap.org); CURRENT_MAIN web still uses CARTO tiles (`{s}.basemaps.cartocdn.com`) so main matches the CSP but shows "API KEY REQUIRED" watermarks (already documented as the reason for the frozen web branch)
CONFIDENCE: HIGH
USER_IMPACT: None today (report-only). If someone flips the header to enforcing without updating it, the public demo's basemap, style JSON, sprites/glyphs and the MapLibre worker all break. Meanwhile the site gets no CSP protection.
REPRODUCTION: vercel.json headers (`Content-Security-Policy-Report-Only` … `img-src … https://*.basemaps.cartocdn.com; connect-src … https://*.basemaps.cartocdn.com … worker-src 'self'`); live console on flagstone.skypistudio.com: "Creating a worker from 'blob:…' violates … worker-src 'self'. The policy is report-only". Build 33 web PlatformMap.web.tsx:615-619 references https://tiles.openfreemap.org/styles/{positron,dark}.
EXPECTED: CSP allowlist matches the served basemap provider; `worker-src 'self' blob:`; then enforce.
ACTUAL: stale allowlist, report-only.
SOURCE_EVIDENCE: vercel.json; ebf091c:src/components/PlatformMap.web.tsx; main src/components/PlatformMap.web.tsx:722-726.
RUNTIME_EVIDENCE: browser console 2026-09-02 (in-app browser).
HISTORICAL_RELATION: Build 33 OpenFreeMap web transplant (qa-reports/2026-09-01_Build33_WebDeploymentDecision.md).
LIKELY_REPAIR_SIZE: TINY (vercel.json) — but vercel.json changes on the frozen branch are a production-web change (Sky-only deploy).
DEPENDENCIES: FDA-001 (which lineage carries the web basemap change into main).
RECOMMENDED_ACCEPTANCE_TEST: with CSP enforcing on a Preview deployment: map renders, no CSP console violations, hard reload OK.

