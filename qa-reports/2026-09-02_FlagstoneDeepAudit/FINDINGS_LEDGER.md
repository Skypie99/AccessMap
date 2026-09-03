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
| FDA-007 | Reviewer password literal live at HEAD (design-reviews, unscanned by guard) + public history; rotation unverified | CONFIRMED/EVIDENCE_GAP | MEDIUM | security | BACKEND, DOCS_ONLY |
| FDA-008 | Auth leaked-password protection disabled | CONFIRMED | LOW | security hygiene | BACKEND |
| FDA-009 | Legacy flags_user_scoped FOR ALL policy still live; owner can edit verified flags' lat/lng | CONFIRMED | MEDIUM | data-integrity/backend hygiene | BACKEND |
| FDA-010 | Trigger functions EXECUTE-granted to anon/authenticated | CONFIRMED | LOW | security hygiene | BACKEND |
| FDA-011 | TS 6 vs SDK 54, app.json privacyPolicyUrl; expo-doctor fails 2/18 | CONFIRMED | LOW | tooling | CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-012 | Default anon/authenticated table grants incl. TRUNCATE on all public tables | CONFIRMED | LOW | security hygiene | BACKEND |
| FDA-013 | Web CSP report-only with stale CARTO allowlist; OpenFreeMap + blob worker violate | CONFIRMED | LOW | security hygiene/web | WEB_BUILD |
| FDA-014 | Destructive UI paths (admin remove, owner delete, delete account) have zero screen-level tests | CONFIRMED | MEDIUM | test-confidence | CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-015 | pgTAP RLS proofs never run in CI; main has no supabase/tests | CONFIRMED | MEDIUM | ci/test-confidence/backend | SUBMITTED_BUILD_33, CURRENT_MAIN |
| FDA-016 | Submit workflow privacy gate d8_closed is self-attested | CONFIRMED | LOW | release-guard | CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-017 | 32 it.todo stubs blocked on non-existent E2E harness | CONFIRMED | LOW | test-confidence | CURRENT_MAIN |
| FDA-018 | format:check ungated (guards whitespace-sensitive); no safe-area Jest mock | CONFIRMED | NOTE | test-confidence/tooling | CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-019 | Build 33 photo upload calls prepare/commit_flag_photo_upload RPCs absent in production | CONFIRMED | HIGH | functional/backend-contract/app-store | SUBMITTED_BUILD_33, WEB_BUILD |
| FDA-020 | Any signed-in user can reject any report (live guard + main Reject button) | CONFIRMED | HIGH | safety/moderation/data-integrity | BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-021 | users.points/streaks/email client-writable on own row | CONFIRMED | HIGH | data-integrity/security | BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-022 | Points farming: vote cycling, uncapped comments, owner self-verify | LIKELY | MEDIUM | data-integrity | BACKEND |
| FDA-023 | Authenticated INSERT can create flags as verified/resolved/rejected | CONFIRMED | MEDIUM | data-integrity | BACKEND |
| FDA-024 | Account deletion leaves photos/avatars/contact_email; uid stays in photo_url | CONFIRMED | MEDIUM | privacy | BACKEND, CURRENT_MAIN |
| FDA-025 | Webhook secret literal in Build 33 migration (public repo); rotation unverified | CONFIRMED/EVIDENCE_GAP | MEDIUM | security | SUBMITTED_BUILD_33, BACKEND |
| FDA-026 | Any user can enumerate users and identify admins | CONFIRMED | MEDIUM | privacy | BACKEND |
| FDA-027 | main's migration set does not reproduce live posture (two lineages) | CONFIRMED | LOW | architecture/backend/release-governance | CURRENT_MAIN |
| FDA-028 | Global anon caps are single-attacker DoS switches | CONFIRMED | LOW | safety/availability | BACKEND |
| FDA-029 | Web SW caches /auth/v1/user; purge only on signOut | LIKELY | LOW | privacy/web | WEB_BUILD |
| FDA-030 | Privacy policy promises deletion/retention behaviour code lacks | CONFIRMED | MEDIUM | app-store/privacy | DOCS_ONLY, BACKEND |
| FDA-031 | Security hygiene notes (grouped) | CONFIRMED | NOTE | security hygiene | BOTH |
| FDA-032 | zz_backup snapshots exposed (suspected) | FALSE_POSITIVE | NOTE | privacy | BACKEND |
| FDA-033 | Onboarding permission CTAs fail closed (dead dimmed button, no timeout) | LIKELY | MEDIUM | functional/UI/a11y | CURRENT_MAIN |
| FDA-034 | Map location alert shows raw SDK/kCLErrorDomain text | CONFIRMED | MEDIUM | UI/UX copy/error handling | CURRENT_MAIN |
| FDA-035 | Help FAQ denies the −20 admin-rejection penalty the live trigger applies | CONFIRMED | MEDIUM | functional/copy/trust | BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33 |
| FDA-036 | Web: Alert.alert is a no-op; 12 unguarded call sites lose errors/confirmations | CONFIRMED | MEDIUM | functional/UX web | WEB_BUILD |
| FDA-037 | Architecture debt notes (grouped) | CONFIRMED | LOW | architecture/debt | CURRENT_MAIN |

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
TITLE: A reviewer-account password literal is still present at HEAD in a tracked design-review prompt file (outside the credential guard's census) and throughout the PUBLIC repository's git history; rotation cannot be verified by the audit
STATUS: CONFIRMED (present at HEAD + history) / EVIDENCE_GAP (rotation)
SEVERITY: MEDIUM
CATEGORY: security (credential exposure)
AFFECTED_STATE: BACKEND (auth), DOCS_ONLY (repo)
CONFIDENCE: HIGH

USER_IMPACT: Anyone can read the historical literal from `git log -p` on github.com/Skypie99/AccessMap (visibility PUBLIC, verified via `gh repo view`). If the live reviewer account still uses it, a stranger can act as that account (post, comment, report). The repo audit of 2026-07-31 reached the same conclusion and forked rotation to Sky.
REPRODUCTION: `git log -p --follow -- supabase/migrations/2026-05-31_reviewer_test_account.sql` shows the removed comment line (commit 9fd1cd9 era); `git grep -l -E '[A-Za-z]+2026!'` at HEAD → exactly 1 tracked file: `design-reviews/sim-walk/2026-08-19/PROMPT_AUTHED_PASS.md:141` ("the old reviewer login `…`, which is sitting in git history"). `src/__tests__/noCredentialsInTree.guard.test.ts` scans docs/ + src/ + supabase/ (+ an allowlist) and does not walk design-reviews/ or qa-reports/, so the guard passes while the literal ships. The literal itself is deliberately NOT recorded in this audit.
EXPECTED: Rotated password; history either rewritten or accepted as burned with rotation as the control.
ACTUAL: Rotation status unknown to the audit (only Sky can check); the ★ START HERE checkbox in APP_STORE_TODO.md is unchecked as of the locked SHA.

ROOT_CAUSE_EVIDENCE: credential committed in a migration comment on 2026-05-31; redacted later without history rewrite.
SOURCE_EVIDENCE: git history of the migration; security-audit/2026-07-31/phase-b/{FORK_S1_credential_rotation.md, CLOSE_OUT.md}.
RUNTIME_EVIDENCE: `gh repo view --json isPrivate` → false.
TEST_EVIDENCE: `src/__tests__/noCredentialsInTree` guard exists (2e510e9) — it protects HEAD, not history.
VISUAL_EVIDENCE: n/a

HISTORICAL_RELATION: S-1 (2026-07-31 FORK), APP_STORE_TODO §0.1 — HISTORICAL_STILL_OPEN unless Sky rotated out-of-band.
REGRESSION_RISK: none
LIKELY_REPAIR_SIZE: TINY (rotate + redact the one design-review line + extend the guard's census to design-reviews/ and qa-reports/) — history rewrite optional and Sky-only.
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
TITLE: Legacy `flags_user_scoped` FOR ALL policy (roles = public, bare `auth.uid()`) is still live, overlaps every other flags policy, and lets an owner edit ANY column of their own flag after verification (bypassing the open-only / immutable lat-lng owner-edit contract)
STATUS: CONFIRMED
SEVERITY: MEDIUM
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

### FDA-014
ID: FDA-014
TITLE: The three destructive user-facing paths — Admin Remove/Dismiss, owner "Delete this flag", and Profile "Delete Account" — have zero screen-level test coverage on both lineages; only the library functions beneath them are unit-tested against a mocked Supabase client
STATUS: CONFIRMED
SEVERITY: MEDIUM
CATEGORY: test-confidence
AFFECTED_STATE: CURRENT_MAIN, SUBMITTED_BUILD_33, TEST_INFRA_ONLY
CONFIDENCE: HIGH
USER_IMPACT: A broken confirm-dialog wiring, swapped id, swallowed error, or (as in FDA-002/003) a dead backend contract ships silently: the unit tests pass because `deleteFlag()`/`deleteAccount()` are exercised with a mock that always succeeds in the shapes the code expects.
REPRODUCTION: `src/screens/__tests__/` has no AdminScreen or ProfileScreen test; grep for `handleRemove`, `handleDismiss`, `handleDelete`, "Delete this flag" across all test files → 0 matches (Lane H evidence, evidence/laneH-test-ci-inventory.md CAND-H-01/02/05). `src/lib/__tests__/sr050DeleteFlagPhotos.test.ts` and `account.test.ts` cover the lib layer only.
EXPECTED: One RTL test per destructive screen path: render → press → confirm → mocked backend called with the right id → success/failure copy shown; plus one contract test that fails when the backend call target does not exist in the target project (FDA-005).
HISTORICAL_RELATION: F18 (double-tap guard) and F53 (CAS) comments in AdminScreen.tsx describe fixes that were never pinned by a screen test.
LIKELY_REPAIR_SIZE: SMALL–MEDIUM (3 RTL suites). DEPENDENCIES: none. RECOMMENDED_ACCEPTANCE_TEST: the suites exist, run in ci.yml, and fail when `deleteFlag` is pointed at a non-existent function slug in the mock.

### FDA-015
ID: FDA-015
TITLE: The only real-Postgres proofs of RLS/grants (pgTAP files under supabase/tests/, Build 33 tree) are never executed by CI; main has no supabase/tests/ at all
STATUS: CONFIRMED
SEVERITY: MEDIUM
CATEGORY: ci / test-confidence / backend
AFFECTED_STATE: SUBMITTED_BUILD_33 (files exist), CURRENT_MAIN (files absent), TEST_INFRA_ONLY
CONFIDENCE: HIGH
USER_IMPACT: Policy/grant regressions (who can really delete/read what) have no automated backstop; the drift between source migrations and the live catalog documented in FDA-002/004/009/012 is invisible to CI.
REPRODUCTION: repo-wide search for `d1f4r3_fix2_flags_delete_rls.test.sql` / `promptb_media_key_guards.test.sql` in package.json scripts and .github/workflows → none (only qa-report prose calls them "staging-only"); `.github/workflows/mod1r-fix1-rls-proof.yml` (Build 33) boots Postgres but is scoped to two non-main branches (Lane H CAND-H-03).
EXPECTED: a PR-triggered workflow on `supabase/**` that applies the managed migration set to a throwaway Postgres and runs every pgTAP file; optionally a read-only production catalog snapshot diff.
LIKELY_REPAIR_SIZE: MEDIUM. DEPENDENCIES: single migration lineage (FDA-005). RECOMMENDED_ACCEPTANCE_TEST: CI run shows pgTAP plan counts passing; deliberately dropping `admin delete any flag` in a branch makes CI red.

### FDA-016
ID: FDA-016
TITLE: The TestFlight/App Store submit workflow's privacy gate (`d8_closed`) is a self-attested string input, not a code- or state-verified check
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: release-guard
AFFECTED_STATE: CURRENT_MAIN, SUBMITTED_BUILD_33 (identical workflow)
CONFIDENCE: HIGH
USER_IMPACT: A human can dispatch `eas-testflight-submit.yml` with profile=production and `d8_closed=yes` without D8 (EXIF/GPS strip) being verified; the workflow then runs `eas submit --profile production`. Still human-dispatched (not unattended); the `release-approval` GitHub Environment may add a required reviewer, but that lives outside the repo and could not be verified read-only.
REPRODUCTION: .github/workflows/eas-testflight-submit.yml:39-44 (Lane H CAND-H-04).
EXPECTED: the gate reads a machine-checkable artifact (e.g. a passing EXIF-strip test id + release/current.json field) or is removed in favour of the required-reviewer environment.
LIKELY_REPAIR_SIZE: TINY. DEPENDENCIES: Sky confirms the GitHub Environment reviewer. RECOMMENDED_ACCEPTANCE_TEST: dispatch with `d8_closed=yes` but a failing EXIF test → workflow refuses.

### FDA-017
ID: FDA-017
TITLE: 32 undated `it.todo()` stubs (heatmap, clustering, watched-flags search, offline indicator) wait for an E2E/device harness that does not exist; screen-level behaviour for those features is unverifiable in-repo
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: test-confidence
AFFECTED_STATE: CURRENT_MAIN, TEST_INFRA_ONLY
CONFIDENCE: HIGH
REPRODUCTION: MapScreen.heatmap.test.tsx (14), MapClustering.test.tsx (7), WatchedFlagsSearch.test.tsx (6), OfflineIndicator.test.tsx (5); no playwright/detox/maestro anywhere (Lane H CAND-H-06). Jest baseline reports "32 todo".
EXPECTED: either a Maestro/Detox smoke lane on the simulator or an explicit decision that manual simulator QA (this audit's Lane B/C/D) is the accepted substitute, with the todos dated.
LIKELY_REPAIR_SIZE: MEDIUM (harness) / TINY (decision + dating). DEPENDENCIES: product decision.

### FDA-018
ID: FDA-018
TITLE: Formatting is unenforced in CI because Prettier output breaks five whitespace-sensitive guard tests; `react-native-safe-area-context` has no Jest mock wired
STATUS: CONFIRMED
SEVERITY: NOTE
CATEGORY: test-confidence / tooling
AFFECTED_STATE: CURRENT_MAIN, SUBMITTED_BUILD_33
CONFIDENCE: HIGH
REPRODUCTION: .github/workflows/ci.yml lint job comment (format:check red 25/25; `prettier --write src` touches 178 files and breaks 5 guard tests); jest.config.js/jest.setup.js contain no safe-area-context mock (Lane H CAND-H-07/08).
EXPECTED: guard tests normalise whitespace (or assert on AST/strings after formatting) so `format:check` can be gated; safe-area mock wired so inset-dependent layouts are testable.
LIKELY_REPAIR_SIZE: SMALL. DEPENDENCIES: none.

### FDA-019
ID: FDA-019
TITLE: Submitted Build 33 photo upload calls the `prepare_flag_photo_upload` / `commit_flag_photo_upload` RPCs, which do not exist in production — any report or avatar with a photo fails in the shipped app
STATUS: CONFIRMED (source + production catalog; runtime not exercised)
SEVERITY: HIGH
CATEGORY: functional / backend-contract / app-store
AFFECTED_STATE: SUBMITTED_BUILD_33, WEB_BUILD. CURRENT_MAIN: NOT affected (main uploads directly to Storage at `<uid>/<ts>.<ext>` and the live policies permit it).
CONFIDENCE: HIGH
USER_IMPACT: In the shipped app, Report → add photo → Submit: `uploadFlagPhoto` throws "Photo upload could not be prepared." (PGRST202 function not found) BEFORE `createFlag`, so the whole report fails (ReportFlagModal uploads first, then creates the row). Avatar change fails the same way. App Review's "Report a barrier — photo is optional" step fails whenever a photo is attached; the EXIF-strip privacy gate now sits behind a dead call.
REPRODUCTION: Build 33 src/lib/flags.ts:856-895 (`.rpc('prepare_flag_photo_upload', …)` with no fallback; `cancel_flag_photo_upload` in the catch), src/lib/photos.ts:100,133,144, src/lib/users.ts (avatar). Build 33 src/screens/ReportFlagModal.tsx:712-720 (authenticated path: `preparedPhotos.push(await uploadFlagPhoto(...))` runs BEFORE `createFlag`, inside the try whose catch at :789 shows "Couldn't submit your report") — no `isFunctionMissing` degrade exists on this path (that helper is used only by the leaderboard RPC and disputes). Historical confirmation: qa-reports/2026-08-31_Codex_FinalBuild32Stabilization.md (Build 33 tree) already recorded via read-only inspection that prepare_flag_photo_upload / commit_avatar_photo_upload / cancel_flag_photo_upload are not deployed and repaired only the AVATAR path's error copy. Production `pg_proc` (evidence/db-proof-flags-delete-authorization.md functions table) has no prepare_/commit_/cancel_flag_photo_upload or commit_avatar_photo_upload; the definitions live only in Build 33's supabase/nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql.
EXPECTED: photo attached → uploaded → report created. ACTUAL: report fails outright with a photo attached; succeeds only without one.
ROOT_CAUSE_EVIDENCE: Prompt B "B2 minimum media-key read contract" applied only the READ side (20260830130000); the write side (upload intents) was explicitly deferred ("deliberately does not enable those deferred writers", ProductionSchemaContractP0 report) while the accepted client already used it.
TEST_EVIDENCE: Build 33 flags tests mock `rpc` to succeed; nothing checks function existence.
HISTORICAL_RELATION: Prompt B B2/B2-R (2026-08-30), D1F4 upload intents, D8 EXIF gate.
REGRESSION_RISK: Restoring direct Storage upload in the client re-opens the "URL-injection into flag_photos" class D1S-A F3 closed (policies require the uid folder — still enforced live).
LIKELY_REPAIR_SIZE: SMALL (client: fall back to the direct-upload path when the RPC is missing, mirroring `listMonthlyLeaderboard`'s `isFunctionMissing` pattern) or LARGE (deploy the intents pipeline + migrations).
DEPENDENCIES: FDA-001 lineage; FDA-005 gate; Sky decision on D1F4.
RECOMMENDED_ACCEPTANCE_TEST: disposable account on a disposable environment → report with one JPEG → row + Storage object + flag_photos junction exist; EXIF absent; failure copy legible when Storage denies.

### FDA-020
ID: FDA-020
TITLE: Any signed-in user can permanently reject any accessibility report — production's transition guard allows open/verified→rejected for every authenticated user, and main's Tasks cards show a Reject button on every flag
STATUS: CONFIRMED
SEVERITY: HIGH
CATEGORY: safety / moderation / data-integrity
AFFECTED_STATE: BACKEND (live guard), CURRENT_MAIN (UI exposes Reject to everyone), SUBMITTED_BUILD_33 (UI hides Reject behind isAdmin but the REST path stays open)
CONFIDENCE: HIGH
USER_IMPACT: One hostile or careless account can bury every report on the map: `rejected` is terminal (only admins may move resolved→rejected; nothing moves rejected back), rejected rows are excluded from default views, reporters get no push for `rejected`, and there is no rate limit on status writes. For a safety product this is the most damaging community action available and it has no gate.
REPRODUCTION: production `pg_get_functiondef(enforce_flag_status_transition)` (captured 2026-09-02): `(old.status='open' and new.status in ('verified','resolved','rejected')) or (old.status='verified' and new.status in ('resolved','rejected'))` → allowed for anyone; admin check exists only for resolved→rejected. Policy `flags status update by any authenticated` qual = EXISTS(users row). main src/screens/TasksScreen.tsx:1842-1849 (`key:'reject' … onSetStatus(flag.id,'rejected', isOwn)`), src/components/FlagDetailModal.tsx:670 (`canReject = status==='open'||'verified'`). Fix exists only in Build 33's unapplied 20260828040000_mod1_moderation_release_safety.sql.
EXPECTED: reject (and ideally resolve) restricted to admins or to a quorum; reporter notified; a restore path.
ACTUAL: open to all signed-in users.
HISTORICAL_RELATION: MOD1 CHECKPOINT A (2026-08-28, unapplied), Q16/D27 owner self-triage decision, F53 CAS.
REGRESSION_RISK: Making reject admin-only changes community triage semantics — product decision.
LIKELY_REPAIR_SIZE: SMALL (apply MOD1 guard + hide Reject for non-admins in main) — Sky decision on triage model first.
DEPENDENCIES: FDA-004 (MOD1 set), FDA-005 lineage.
RECOMMENDED_ACCEPTANCE_TEST: non-admin PATCH status=rejected → P0001; admin succeeds; UI shows Reject only to admins.

### FDA-021
ID: FDA-021
TITLE: `public.users` is client-writable on every column of the caller's own row except `is_admin` — a signed-in user can set `points`, `streak_days`, `longest_streak_days`, `email`, `created_at` via one REST PATCH
STATUS: CONFIRMED
SEVERITY: HIGH
CATEGORY: data-integrity / security
AFFECTED_STATE: BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33 (no tree contains a fix)
CONFIDENCE: HIGH
USER_IMPACT: Leaderboard, tiers, achievements and streaks are forgeable (`PATCH /rest/v1/users?id=eq.<me> {"points":999999}`); the `public.users.email` mirror can be rewritten, breaking the maintainer-email-keyed policies' assumptions. Trust signal of the whole points economy is void.
REPRODUCTION: production `information_schema.column_privileges` UPDATE for authenticated on users = avatar_object_key, avatar_url, created_at, display_name, email, id, is_admin, last_active_date, longest_streak_days, points, streak_days (captured 2026-09-02); policy `users update own row` WITH CHECK pins only `is_admin` (via private.current_user_is_admin()). No migration in main or Build 33 scopes UPDATE columns; docs/ROADMAP.md:68 names `2026-05-29_restrict_users_update_columns.sql`, which was never committed (`git log --all -- '*restrict_users_update_columns*'` → nothing).
EXPECTED: `grant update (display_name, avatar_url, avatar_object_key) on public.users to authenticated` and revoke the rest; points/streaks written only by SECURITY DEFINER triggers.
HISTORICAL_RELATION: SR-048 (HIGH, ship-ready 01_functionality_findings.md:144), R-10 (05_THE_SUBMISSION_GAP_LIST.md:35), ROADMAP "Points Self-Write RLS" — HISTORICAL_STILL_OPEN.
LIKELY_REPAIR_SIZE: TINY (one grant/revoke migration + pgTAP). DEPENDENCIES: FDA-005 lineage. RECOMMENDED_ACCEPTANCE_TEST: PATCH points as a user → 42501; display_name update still works; triggers still award points.

### FDA-022
ID: FDA-022
TITLE: Points economy is farmable — vote delete/re-insert cycles award the comment author +2 repeatedly, comments award +1 uncapped and are self-deletable, and owners can verify/resolve their own flags for the reporter bonus
STATUS: LIKELY (source logic of applied migrations; live function bodies not re-read)
SEVERITY: MEDIUM
CATEGORY: data-integrity
AFFECTED_STATE: BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33
CONFIDENCE: MEDIUM
REPRODUCTION: supabase/migrations/2026-05-30_trust_score_system.sql:100-104 (own vote delete), :291-297 (`COUNT(*)` of current votes ≤10 → +2), :247-270 (comment +1, no cap); FlagDetailModal.tsx:668-669 (`canVerify = status==='open'`, no isOwn check); the applied ledger contains trust_score_system (20260531202835).
EXPECTED: dedupe awards against point_events per (voter, comment); cap comment awards per day; block owner self-verify or make it award nothing (the trigger already skips the actor when actor = reporter, but the reporter bonus still lands).
HISTORICAL_RELATION: SW-53, SR-085/SR-098/A7-1 (comment_votes), Q16/D27, P2/P12 (qa-2026-08-18-deep-sweep).
LIKELY_REPAIR_SIZE: SMALL–MEDIUM. DEPENDENCIES: FDA-021 (same trust-model wave). RECOMMENDED_ACCEPTANCE_TEST: pgTAP: vote cycle awards once; self-verify awards nothing.

### FDA-023
ID: FDA-023
TITLE: Authenticated INSERT can create a flag directly as `verified`, `resolved` or `rejected` — only the anon INSERT policy pins `status='open'`
STATUS: CONFIRMED
SEVERITY: MEDIUM
CATEGORY: data-integrity
AFFECTED_STATE: BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33
CONFIDENCE: HIGH
REPRODUCTION: production pg_policies INSERT for authenticated: `flags insert own WITH CHECK ((select auth.uid()) = user_id)` only; the transition guard is BEFORE UPDATE OF status so inserts bypass it; restrictive `flags_insert_status_open_only` exists only in Build 33's unapplied 20260828060000_mod1r_fix1_report_and_insert_authz.sql.
USER_IMPACT: fake "verified" barriers without a verifier; pre-rejected spam invisible to triage; `flag_status_history` records NULL→verified as genuine.
LIKELY_REPAIR_SIZE: TINY (restrictive policy). DEPENDENCIES: FDA-004/005. RECOMMENDED_ACCEPTANCE_TEST: INSERT status='verified' as user → 42501.

### FDA-024
ID: FDA-024
TITLE: Account deletion as deployed (v4) leaves the person's photos and avatars world-readable in the public bucket, keeps `feedback.contact_email`, and the anonymised flags still embed the deleted user's UUID in `photo_url`
STATUS: CONFIRMED (code) — see runtime counts addendum
SEVERITY: MEDIUM
CATEGORY: privacy (erasure)
AFFECTED_STATE: BACKEND (deployed v4), CURRENT_MAIN (same function source). SUBMITTED_BUILD_33's D1F4 worker would sweep Storage but is not deployed (FDA-003).
CONFIDENCE: HIGH
USER_IMPACT: PIPEDA erasure expectations and the published policy ("Delete your account") are not met: barrier photos and any selfie avatar remain fetchable at their old public URLs; all of a deleted person's "anonymous" reports stay groupable by the `<uid>/` folder in `photo_url`.
REPRODUCTION: deployed delete-account v4 source (`flags.update({user_id:null})` then `auth.admin.deleteUser`; no Storage or feedback step); main src/lib/flags.ts photo path `<uid>/<ts>.<ext>`; bucket public=true (storage.buckets); flag-photos policies allow owner/admin delete only.
HISTORICAL_RELATION: SR-010 (anonymise-not-erase), R-1 (server-side sweep), D1F4 storage plan (accountDeletionWorkerCore.ts) — HISTORICAL_STILL_OPEN.
LIKELY_REPAIR_SIZE: SMALL (extend v4: list+remove `<uid>/*` objects, null contact_email, rewrite/strip photo_url folder) vs LARGE (D1F4 pipeline).
DEPENDENCIES: FDA-003 decision; Jordan privacy review (Const. Art. 7.6).
RECOMMENDED_ACCEPTANCE_TEST: disposable account with a photo report + avatar → delete → objects gone, contact_email null, photo_url no longer contains the uid.

### FDA-025
ID: FDA-025
TITLE: A 64-hex webhook shared secret is committed verbatim in Build 33's migration chain (`20260529181141_notify_flag_status_webhook_trigger.sql`) in a public repository; rotation after the 2026-06-03 Vault move is unverified
STATUS: CONFIRMED (literal present) / EVIDENCE_GAP (validity)
SEVERITY: MEDIUM
CATEGORY: security
AFFECTED_STATE: SUBMITTED_BUILD_33 (tree), BACKEND (if still valid). Not present in CURRENT_MAIN.
CONFIDENCE: HIGH
USER_IMPACT: If the value is still the live `webhook_secret`, anyone can POST to `notify-flag-status` (verify_jwt=false) and push arbitrary "verified/resolved" notifications to any user with a token.
REPRODUCTION: `git show f5594171:supabase/migrations/20260529181141_notify_flag_status_webhook_trigger.sql | grep -c -E '[0-9a-f]{64}'` → 1 (line 23, `'X-Webhook-Secret', '<64-hex>'`); the value is NOT recorded here. Rotation status: only Sky can compare against Vault.
HISTORICAL_RELATION: SR-018 / S-6 / IO-4 / X-2; 2026-06-01 "FOLLOW-UPS DISCOVERED 1: rotate both + move to Vault".
LIKELY_REPAIR_SIZE: TINY (rotate in Vault + redact file on the Build 33 lineage). DEPENDENCIES: Sky-only. RECOMMENDED_ACCEPTANCE_TEST: POST with the historical value → 401.

### FDA-026
ID: FDA-026
TITLE: Any signed-in user can enumerate all users and identify admins (`users readable by authenticated` = true + `is_admin` column SELECT grant)
STATUS: CONFIRMED
SEVERITY: MEDIUM
CATEGORY: privacy
AFFECTED_STATE: BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33
CONFIDENCE: HIGH
REPRODUCTION: production pg_policies users: `users readable by authenticated` qual true; column_privileges: authenticated SELECT on is_admin (needed by the admin-delete RLS subselect). `GET /rest/v1/users?select=id,display_name,avatar_url,points,is_admin&is_admin=eq.true` works for any user.
USER_IMPACT: moderators can be singled out for harassment/targeted reports; full directory enumeration exceeds what the leaderboard needs. (Only 5 users today.)
EXPECTED: move the admin check into a SECURITY DEFINER helper (private.current_user_is_admin() already exists) and revoke the column grant; leaderboard via a view/RPC.
HISTORICAL_RELATION: W6-1 (verifier identity), A1 (2026-08-18 is_admin grant).
LIKELY_REPAIR_SIZE: SMALL. DEPENDENCIES: FDA-002 delete path (its policy subselect uses the grant). RECOMMENDED_ACCEPTANCE_TEST: non-admin select is_admin → 42501; admin delete still works.

### FDA-027
ID: FDA-027
TITLE: CURRENT_MAIN's migration set no longer reproduces the live database posture (two lineages; main lacks ~14 live objects/policies; schema.sql warns it is stale) — a fresh bootstrap from main would be less secure than production
STATUS: CONFIRMED
SEVERITY: LOW (release-governance LOW today; becomes HIGH at the moment of any disaster recovery or staging build)
CATEGORY: architecture / backend / release-governance
AFFECTED_STATE: CURRENT_MAIN (source), BACKEND (docs-only for prod)
CONFIDENCE: HIGH
REPRODUCTION: applied ledger (71 timestamped versions) vs main's 47 date-named files (+PROPOSED/APPLIED suffixes, drift_capture files); Build 33 carries a reconstructed timestamped chain plus supabase/nonmanaged/{proposed,live-out-of-band,destructive-data}. Live-only objects absent from main: SR-090 owner-edit alias fix, A2-1 context_tags revert, SR-024 flag_photos anon explicit, SR-001 admin comment delete, SR-050 admin storage delete, is_admin column grant, dispute counter, flag_comments.user_id default, D1S-A account-row gates + bk_* containment, promptb media keys.
HISTORICAL_RELATION: F3 (2026-06-01), migration-history truth repair (2026-08-28), FDA-005.
LIKELY_REPAIR_SIZE: MEDIUM (adopt one lineage; regenerate schema.sql from live; delete the stale one). DEPENDENCIES: Sky decision. RECOMMENDED_ACCEPTANCE_TEST: `supabase db diff` against production from the chosen lineage → empty.

### FDA-028
ID: FDA-028
TITLE: Global anonymous rate caps (100 flags/h, 30 feedback/h, keyed on nothing) are single-attacker denial-of-service switches for every guest
STATUS: CONFIRMED (design)
SEVERITY: LOW
CATEGORY: safety / availability
AFFECTED_STATE: BACKEND, CURRENT_MAIN, SUBMITTED_BUILD_33
CONFIDENCE: HIGH
REPRODUCTION: 2026-07-27_drift_capture_live_flag_insert_throttles.sql:103-111 (global anon 100/h); Build 33 20260727075623_a2_2_feedback_anon_throttle (30/h); client-only 5/24h in src/lib/anonRateLimit.ts.
USER_IMPACT: a script exhausts both caps hourly → guest reporting and guest abuse reports (which App Review exercises first) fail for everyone; recorded trade-off (no IP/device keys per Jordan).
LIKELY_REPAIR_SIZE: SMALL (Supabase per-IP API rate limits at the gateway; keep the DB cap as backstop). DEPENDENCIES: Jordan review. RECOMMENDED_ACCEPTANCE_TEST: 101st anon insert in an hour from one client is refused while a second client still succeeds.

### FDA-029
ID: FDA-029
TITLE: Web service worker caches every `*.supabase.co` GET (including `/auth/v1/user`) by URL and only `signOut()` purges it; CSP is report-only
STATUS: LIKELY (source; runtime not exercised)
SEVERITY: LOW
CATEGORY: privacy / web
AFFECTED_STATE: WEB_BUILD, CURRENT_MAIN (public/sw.js)
CONFIDENCE: MEDIUM
REPRODUCTION: public/sw.js:106-120; src/lib/supabase.ts:101-130 (purge inside signOut only); vercel.json (report-only CSP, FDA-013).
USER_IMPACT: shared/public computer — previous user's identity/rows available to the offline fallback if the tab was closed without sign-out.
LIKELY_REPAIR_SIZE: TINY (exclude /auth/ and per-user endpoints from runtime caching; purge on session change). RECOMMENDED_ACCEPTANCE_TEST: DevTools Cache Storage has no /auth/v1/user after session expiry.

### FDA-030
ID: FDA-030
TITLE: Published privacy policy and reviewer notes promise behaviour the deployed code does not implement (deletion removes photos; retention jobs; "we keep the original photo" — code is fail-closed)
STATUS: CONFIRMED (repo copy) / see addendum for the live page
SEVERITY: MEDIUM
CATEGORY: app-store / privacy (accuracy)
AFFECTED_STATE: DOCS_ONLY (published page + docs/PRIVACY_POLICY.md), BACKEND (behaviour)
CONFIDENCE: HIGH
REPRODUCTION: docs/PRIVACY_POLICY.md:129-132 ("Delete a flag — remove any flag you submitted via the flag's detail screen" — dead in Build 33 per FDA-002; "Delete your account" — see FDA-003/024); retention rows naming jobs that do not exist in source (Lane E CAND-E-17); ":228 if processing fails, we keep the original photo" vs src/lib/flags.ts fail-closed gate.
USER_IMPACT: App Review and regulators compare policy to behaviour; over-promising erasure is the riskiest mismatch.
LIKELY_REPAIR_SIZE: SMALL (copy) — but must follow the FDA-003/024 decision. DEPENDENCIES: Jordan. RECOMMENDED_ACCEPTANCE_TEST: each policy claim maps to a code path or scheduled job.

### FDA-031
ID: FDA-031
TITLE: Security hygiene notes (grouped): raw upstream error text returned by delete-account v4 and by src/lib/errors.ts; non-constant-time secret compare in send-push-notification; Supabase session persisted in AsyncStorage (not SecureStore) on native; maintainer e-mail hard-coded as an authorization key in three policies; pre-commit secret scan matches only `service_role`/`eyJ`
STATUS: CONFIRMED
SEVERITY: NOTE
CATEGORY: security hygiene
AFFECTED_STATE: CURRENT_MAIN, SUBMITTED_BUILD_33, BACKEND
CONFIDENCE: HIGH
REPRODUCTION: Lane E CAND-E-18 (file:line list in evidence/laneE-privacy-security-static.md).
LIKELY_REPAIR_SIZE: SMALL each; none individually exploitable.

### FDA-032
ID: FDA-032
TITLE: Suspected un-RLS'd `zz_backup_*_20260818` purge snapshots in `public`
STATUS: FALSE_POSITIVE
SEVERITY: NOTE
CATEGORY: privacy
AFFECTED_STATE: BACKEND
CONFIDENCE: HIGH
NOTES: Lane E CAND-E-13 raised it from the 2026-08-18 purge migration; read-only `information_schema.tables` on production (2026-09-02) finds no `zz_%`/`%backup%` tables in any user schema — the snapshots were dropped. Only the seven `bk_2026_08_22_*` tables remain and they are RLS-locked with zero grants (D1S-A F1).

### FDA-033
ID: FDA-033
TITLE: Onboarding permission cards fail closed — when the silent permission lookup never resolves to a boolean, "Allow location" and "Turn on notifications" stay disabled at 50% opacity with no timeout, and the only way forward is "Not now"
STATUS: LIKELY (reproduced on the audit simulator on CURRENT_MAIN; device behaviour not observed; root cause read from source)
SEVERITY: MEDIUM
CATEGORY: functional / UX / accessibility (permission acquisition)
AFFECTED_STATE: CURRENT_MAIN (src/components/OnboardingCards.tsx); SUBMITTED_BUILD_33 to be re-checked on its build
CONFIDENCE: MEDIUM
USER_IMPACT: A first-run user is shown the app's own value-proposition for location and notifications and then cannot act on it: the primary CTA is dimmed and dead (it announces `disabled` to VoiceOver too). They must tap "Not now"; location can only be granted later from Home's "Use my location". If the lookup rejects on a real device (the code comment COR-6 documents "rare OS/entitlement states"), the same dead button ships.
REPRODUCTION: simulator (iOS 26.5, Release build of 70b52a30): screenshots/main-onboarding-03-light.png, main-onboarding-03b-state.png (button dimmed after tap, no system dialog), main-onboarding-04-light.png, main-onboarding-04b-notif-tap.png (dimmed; tap ignored). Source: OnboardingCards.tsx:369-370 `permissionChecking = permission != null && Platform.OS !== 'web' && currentGranted === null`; :381-397 the check's `.catch(() => {})` leaves `currentGranted` null; :706-711 `disabled={permissionChecking}` + `opacity: 0.5`.
EXPECTED: the silent lookup fails OPEN (treat unknown as not-granted after a short timeout so the CTA is live and fires the OS prompt), matching the request path's COR-6 contract "the primary button must never read as dead".
ACTUAL: fail-closed; button dead while the lookup is pending/rejected.
ROOT_CAUSE_EVIDENCE: rejection/hang in `Location.getForegroundPermissionsAsync()` or `Notifications.getPermissionsAsync()` is swallowed without setting a boolean; no timeout.
TEST_EVIDENCE: Lane H journey matrix — onboarding tests exist for copy/a11y; none simulate a rejected/hanging lookup.
VISUAL_EVIDENCE: the four screenshots above.
HISTORICAL_RELATION: COR-6, S19 (L1-3), Q12 (2026-08-21) — related but distinct (they hardened the REQUEST path, not the LOOKUP path).
REGRESSION_RISK: none (fail-open only widens the enabled window).
LIKELY_REPAIR_SIZE: TINY (catch → set false; optional 1.5 s timeout race).
DEPENDENCIES: none. RECOMMENDED_ACCEPTANCE_TEST: RTL test that rejects/hangs the lookup and asserts the CTA is enabled and fires the request; simulator: fresh install → card 3 CTA is live and the iOS dialog appears.
NOTES: On this simulator no iOS location/notification dialog appeared at all after the tap; `locationd.synchronous` XPC activation is logged at the tap time. Whether the lookup hangs only in the simulator is an evidence gap; the code path is the finding.

### FDA-034
ID: FDA-034
TITLE: The map's "Couldn't find your location" alert shows raw internal error text to the user ("Calling the 'getCurrentPositionAsync' function has failed → Caused by: … (kCLErrorDomain error 0.)")
STATUS: CONFIRMED (CURRENT_MAIN, simulator); Build 33 status pending its build (Lane E notes Build 33 added `locationErrorMessage` hardening in src/lib/location.ts)
SEVERITY: MEDIUM
CATEGORY: UI / UX copy / error handling (trust)
AFFECTED_STATE: CURRENT_MAIN; SUBMITTED_BUILD_33 = to verify (likely HISTORICAL_FIXED there)
CONFIDENCE: HIGH
USER_IMPACT: The first thing a new user sees on the map after granting location can be a developer stack-style message naming an SDK function and an Apple error domain. It reads as broken and untrustworthy on a safety product; it also happens on transient `kCLErrorLocationUnknown` (error 0), which simply means "try again".
REPRODUCTION: simulator, main Release build, location granted, simulated location set → Explore → screenshots/main-map-02-light-settled.png. Source: src/screens/MapScreen.tsx:1299 `Alert.alert("Couldn't find your location", errorMessage(e))` — the friendly constant `LOCATE_FAILED_MSG` defined at MapScreen.tsx:277 ("Couldn't find your location — check your connection and try again.") is not used on this path; `errorMessage()` (src/lib/errors.ts) passes unrecognised messages verbatim. Build 33: src/lib/location.ts:63-75 `locationErrorMessage()` explicitly maps `kCLErrorDomain error N` → HISTORICAL_FIXED on Build 33, STILL_OPEN on main.
EXPECTED: friendly copy ("We couldn't get your location right now. Check Location Services or try again.") with a Retry action; transient error 0 retried silently once.
ACTUAL: raw chained error text; OK only.
VISUAL_EVIDENCE: screenshots/main-map-02-light-settled.png (glass alert over the map; body text over a blurred green/blue backdrop is also lower-contrast than the token floor).
HISTORICAL_RELATION: Build 33 `locationErrorMessage` (Codex Wave R3 prompt/permission work, 2026-08-27) — likely HISTORICAL_FIXED on Build 33 / STILL_OPEN on main.
LIKELY_REPAIR_SIZE: TINY (port Build 33's mapper to main, or converge). DEPENDENCIES: FDA-001. RECOMMENDED_ACCEPTANCE_TEST: unit test mapping kCLErrorDomain 0/1/2 to friendly copy; simulator shows friendly alert with Retry.

### FDA-036
ID: FDA-036
TITLE: On the web build `Alert.alert()` is a no-op, and at least 12 of 29 call sites (AdminScreen, SettingsScreen, FeedbackModal, FilterPresetsModal, FlagDetailModal, feedback.ts) are unguarded — errors, confirmations and successes vanish silently on web
STATUS: CONFIRMED (source; react-native-web's Alert export read from node_modules)
SEVERITY: MEDIUM
CATEGORY: functional / UX (web)
AFFECTED_STATE: WEB_BUILD (CURRENT_MAIN source; Build 33 web not independently re-checked)
CONFIDENCE: HIGH
USER_IMPACT: On flagstone.skypistudio.com a failed action shows nothing: e.g. Settings data export/preset delete failures and successes, Flag Detail errors, feedback send errors. The team has patched this class four times individually (F46 `notify()`, F48 in SignInScreen, R8, R11) but not systemically.
REPRODUCTION: Lane I CAND-I-02 (evidence/laneI-architecture-health.md — per-call-site table); `node_modules/react-native-web/src/exports/Alert/index.js` is an empty function.
EXPECTED: every user-facing alert goes through `notify()`/`confirm()` from src/lib/confirm.ts (web-safe); a lint rule bans bare `Alert.alert(` outside that module.
HISTORICAL_RELATION: F46, F48, R8, R11 — HISTORICAL_REGRESSED (class re-introduced after each spot fix).
LIKELY_REPAIR_SIZE: SMALL (12 call sites + lint rule). DEPENDENCIES: none. RECOMMENDED_ACCEPTANCE_TEST: ESLint no-restricted-syntax on `Alert.alert`; web click-through of Settings export failure shows a visible banner.

### FDA-037
ID: FDA-037
TITLE: Architecture debt notes (grouped, non-blocking): FlagDetailModal's `shownFlag` sync is discipline-dependent across three owner screens; `comments.ts` casts the whole Supabase client to `any`; near-identical names NotificationPreferencesScreen vs NotificationPrefsModal; five `as unknown as` interop casts; `legacy-peer-deps` possibly vestigial; `reverseGeocode()` has zero callers; `@expo/vector-icons` likely unused; severity-color invariant comment-enforced only
STATUS: CONFIRMED
SEVERITY: LOW
CATEGORY: architecture / debt
AFFECTED_STATE: CURRENT_MAIN
CONFIDENCE: HIGH
REPRODUCTION: Lane I CAND-I-04..I-12 with file:line in evidence/laneI-architecture-health.md.
NOTES: Lane I also recorded what is unusually good: realtime subscription cleanup, optimistic-update rollback discipline, near-zero TS escapes in production code, and ticket-referenced comments for historical races. Technical debt here is not a release blocker.

### FDA-035
ID: FDA-035
TITLE: The Help FAQ tells users "Rejecting a report awards no points", but the live `handle_flag_status_change` trigger deducts 20 points from the reporter when an admin rejects their flag (silent `flag_spam_penalty`)
STATUS: CONFIRMED (live function body read via `pg_get_functiondef`, 2026-09-02; copy present in both trees)
SEVERITY: MEDIUM
CATEGORY: functional / copy accuracy / trust
AFFECTED_STATE: BACKEND (behaviour), CURRENT_MAIN and SUBMITTED_BUILD_33 (copy)
CONFIDENCE: HIGH
USER_IMPACT: A reporter whose flag is rejected by an admin silently loses 20 points with no notification (`notify-flag-status` skips `rejected`) and no in-app explanation, while the FAQ promises the opposite. For a community-trust product this is a provable false statement about its own economy.
REPRODUCTION: production `handle_flag_status_change()`: `elsif new.status = 'rejected' and auth.uid() in (select id from public.users where is_admin = true) then … set points = greatest(0, points - 20) … 'flag_spam_penalty'`. src/components/HelpModal.tsx:53 (main) and Build 33 HelpModal (same line) "Rejecting a report awards no points." src/lib/points.ts calls itself the single source of truth but has no penalty entry; CLAUDE.md's points table DOES document the −20.
EXPECTED: FAQ discloses the admin-rejection penalty (or the penalty is removed), and the reporter is told when it happens.
HISTORICAL_RELATION: SW-53 (points reconciliation 2026-08-20) — reconciled CLAUDE.md, not the FAQ; Lane I CAND-I-01.
LIKELY_REPAIR_SIZE: TINY (copy + POINTS constant) / SMALL (notification). DEPENDENCIES: FDA-020 (who may reject). RECOMMENDED_ACCEPTANCE_TEST: FAQ text test pins the penalty; point_events `flag_spam_penalty` surfaces in the user's activity feed.

