# FINDINGS LEDGER — Flagstone Deep Audit 2026-09-02

Stable IDs FDA-001… Never renumber. Status/severity vocab per audit prompt §11.

## Index

| ID | Title | Status | Severity | Category | Affected state |
|---|---|---|---|---|---|
| FDA-001 | main lacks Build 33 product code (113 commits) | CONFIRMED | HIGH | release-truth | CURRENT_MAIN, NEXT_BUILD_ONLY |
| FDA-002 | Build 33 admin Remove flag calls undeployed delete-flag Edge Function | CONFIRMED | HIGH | functional/backend-contract | SUBMITTED_BUILD_33, WEB_BUILD |

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

