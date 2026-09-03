# Lane J1 — Historical inventory (2026-07-01 → now, + Build-33-only reports, + design-reviews)

STATUS: IN PROGRESS — incremental write per resilience rule; regenerated from scratch parts each checkpoint.

## Files read (list every file path you actually read; mark Build-33-only ones with [B33])

docs/MASTER_FIX_LOG.md
docs/PHASE_TESTFLIGHT_FIX_PLAN.md
docs/TESTFLIGHT_ACTION_ITEMS.md
qa-reports/2026-08-26_Codex_Wave1CurrentBinaryAcceptance.md [B33]
qa-reports/2026-08-26_Codex_Wave1SharedFoundations.md [B33]
qa-reports/2026-08-26_Codex_Wave2ScreenSpecificImplementation.md [B33]
qa-reports/2026-08-26_Codex_Wave3ConsolidatedReleaseQA.md [B33]
qa-reports/2026-08-27_Codex_D1F4AsyncDeletionSource.md [B33]
qa-reports/2026-08-27_Codex_D1OptionAAccountDeletion.md [B33]
qa-reports/2026-08-27_Codex_D1SADeployedSecurityContainment.md [B33]
qa-reports/2026-08-28_Claude_D1F4R3_FIX3_ReviewAudit.md [B33]
qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md [B33]
qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md [B33]
qa-reports/2026-08-28_Codex_D1F4R3_FIX2.md [B33]
qa-reports/2026-08-28_Codex_D1F4R3_LocalGateVerification.md [B33]
qa-reports/2026-08-28_Codex_D1F4R3_SourceClosure.md [B33]
qa-reports/2026-08-28_Codex_D1F4RSourceRepair.md [B33]
qa-reports/2026-08-30_Codex_ProductionSchemaContractP0.md [B33]
qa-reports/2026-08-30_Codex_ReportModalXXXLClosure.md [B33]
qa-reports/2026-08-30_Codex_SeverityXXXLFinalP1Closure.md [B33]
qa-reports/2026-08-31_Codex_FinalEMD_PostMapFix.md [B33]
qa-reports/2026-08-31_Codex_MapHeatDuplicateRemoval.md [B33]
qa-reports/2026-08-31_Codex_MapHeatXXXL_Repair.md [B33]
qa-reports/2026-08-31_Codex_MapOverlaySpaceRecovery.md [B33]
qa-reports/2026-08-31_Codex_RCTFatalDiagnosisAndFilterXXXL.md [B33]
qa-reports/2026-08-31_Codex_TargetedFinalPolishRuntimeAcceptance.md [B33]
qa-reports/releases/2026-09-01_Flagstone_4.1.1_Build33_ReleaseIdentity.md

## P2 reports located (file → ID range/count, one line each)

(none located yet)

## Inventory table

| ORIGINAL_ID | SOURCE_FILE | DATE | WORDING | ORIGINAL_EVIDENCE | CLAIMED_STATUS_IN_SOURCE | AREA | VISUAL | SIM_REQUIRED | ADMIN_DELETE_RELATED |
|---|---|---|---|---|---|---|---|---|---|
| RC-1 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Wrong build profile (preview, internal dist) used for TestFlight submission instead of testflight/store profile | TESTFLIGHT_LAUNCH.md told Sky to use --profile preview | OPEN | RELEASE | N | N | N |
| RC-2 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | eas submit in GitHub Actions workflow missing --latest flag, may submit stale/wrong build | Workflow used eas submit --non-interactive with no --latest | OPEN | RELEASE | N | N | N |
| RC-3 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | EXPO_APPLE_PASSWORD secret must be app-specific password, not regular Apple ID password | Apple rejects regular password when 2FA enabled | OPEN | RELEASE | N | N | N |
| RC-4 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Missing release-approval GitHub Environment will stall the CI workflow | Workflow has environment: release-approval gate | OPEN | RELEASE | N | N | N |
| AR-1 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | No App Store screenshots; Apple requires at least 1 at 6.7in resolution | ASC listing has zero screenshots | OPEN | APPSTORE | Y | N | N |
| AR-2 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | No demo/reviewer test account; Apple rejects sign-in-required apps without one | Guideline 4.0 Sign-in required without demo account | OPEN | APPSTORE | N | N | N |
| AR-3 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Privacy policy URL not entered into App Store Connect record (mandatory field) | Policy live at github.io/AccessMap/privacy but not in ASC | OPEN | APPSTORE | N | N | N |
| AR-4 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Production EAS build not yet triggered; only a preview/internal build exists | Last build 2e91ae9b was preview distribution | OPEN | RELEASE | N | N | N |
| AR-5 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | feat/phase5-trust-score branch not merged to main before production build | Production builds should be off main, not a feature branch | OPEN | RELEASE | N | N | N |
| MR-1 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | expo-notifications plugin missing from app.json plugins array; push silently fails in store builds | APNs aps-environment production entitlement omitted | OPEN | FUNC | N | N | N |
| MR-2 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Supabase pg_net extension not enabled; push notifications inert end-to-end | notify-flag-status Edge Function uses net.http_post | OPEN | FUNC | N | N | N |
| MR-3 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Privacy Policy missing trust-tier leaderboard disclosure (Jordan Condition 1) | Display name/points/tier visible to other users, not disclosed | OPEN | PRIV-SEC | N | N | N |
| MR-4 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | EXIF production gate (d8_closed flag) still armed in CI workflow though EXIF stripping is implemented | Workflow exits 1 unless d8_closed=yes passed | OPEN | PRIV-SEC | N | N | N |
| MR-5 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Privacy Manifest (PrivacyInfo.xcprivacy) may be missing app-level required-reason API declarations | Needs verification in actual build log, not source alone | OPEN | APPSTORE | N | N | N |
| NH-1 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | CHANGELOG.md missing though release runbook checklist requires it | RELEASE_RUNBOOK.md pre-flight checklist item | OPEN | RELEASE | N | N | N |
| NH-2 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Support URL not set in App Store Connect | APP_STORE_LISTING.md has [Sky fills in] placeholder | OPEN | APPSTORE | N | N | N |
| NH-3 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | PROJECT_STATE.md stale about ASC App ID being unset | Rory filled it in 2026-05-30 (6774709116) already | FIXED | RELEASE | N | N | N |
| NH-4 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | Android submit serviceAccountKeyPath still TODO placeholder in eas.json | Not required for Phase 6 iOS launch but blocks Android submit | OPEN | RELEASE | N | N | N |
| NH-5 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | production eas.json profile missing SENTRY_DISABLE_AUTO_UPLOAD env var (testflight profile has it) | Harmless while Sentry inactive; risk if Sentry re-added | OPEN | RELEASE | N | N | N |
| NH-6 | docs/TESTFLIGHT_ACTION_ITEMS.md | 2026-06-01 | app.json missing expo.owner field | extra.eas.projectId set so functionally OK | OPEN | RELEASE | N | N | N |
| P1-1 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | Canonical report deletion collects only legacy photo_url junction URLs, not canonical photo_object_key/flag_photos.object_key | src/lib/flags.ts deletes relational flag before best-effort Storage removal | OPEN | PRIV-SEC | N | N | Y |
| P1-2 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | Auth ambiguity retry threshold can require a vanished public.users row/lock after an Auth side effect | Retry moves AUTH_RECONCILIATION to FAILED_REVIEW_REQUIRED clearing resume_from | OPEN | PRIV-SEC | N | N | N |
| P1-3 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | Review guard does not capture legacy avatar evidence or durably preserve backup flag_photos associations before purge | bk_2026_08_22_flag_photos associations removed by purge unpreserved | OPEN | PRIV-SEC | N | N | N |
| P1-4 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | account-deletion-worker calls admin.schema(storage).from(objects) directly for exact lookups/owner inventory instead of narrow RPC | Storage metadata boundary crossed by worker admin calls | OPEN | PRIV-SEC | N | N | N |
| P1-5 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | Storage/evidence pages use offset .range() without deterministic ordering; review endpoint rejects over 500 keys/250 ambiguous intents | Pagination not deterministic, hard caps cause dead ends | OPEN | PRIV-SEC | N | N | N |
| P1-6 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | No final Storage lease proof performed immediately before each external Storage.remove batch | Lease renewal precedes exact reads but not final remove call | OPEN | PRIV-SEC | N | N | N |
| P1-7 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | Web user can open destructive account-deletion confirmation claiming device will show completion; receipt storage rejects only after confirm | Web recovery copy misleading before secure receipt storage check | OPEN | PRIV-SEC | N | N | N |
| P1-8 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | Anonymous-insert policy checks URL/object/uploader fields but not photo_alt, leaving a gap for anonymous photo_alt injection | Anonymous photo_alt field not covered by insert policy check | OPEN | PRIV-SEC | N | N | N |
| P1-9 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | SQL owner comparisons cast persisted owner_id::uuid but worker compares case-insensitively rather than exact trusted UUID text | Storage owner typing mismatch between SQL and worker comparisons | OPEN | PRIV-SEC | N | N | N |
| P1-10 | qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md | 2026-08-28 | Four D1F4 Edge handlers import floating https://esm.sh/@supabase/supabase-js@2; root package also range-pinned, not exact-pinned | Floating/unpinned Edge Function dependency versions | OPEN | ARCH | N | N | N |
| P1-1 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Canonical report deletion repaired: collects primary/gallery object_key, foreign-uploader-mismatch fails closed, exact cleanup before relational delete | Report-delete path now source-repaired; not yet deployed | PARTIAL | PRIV-SEC | N | N | Y |
| P1-2 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Deletion lifecycle/Storage evidence repaired via new migration 20260828000000_d1f4r2_source_repair.sql; source-level only, not applied | Migration written, not applied to any environment | PARTIAL | PRIV-SEC | N | N | N |
| P1-3 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Historical evidence now captured before purge per source repair; not yet deployed/verified live | Same migration as P1-2, source-only | PARTIAL | PRIV-SEC | N | N | N |
| P1-4 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Storage metadata boundary repaired: fixed-bucket service-role-only RPCs replace worker admin.schema(storage) use | Older unbounded review RPC revoked from service_role | PARTIAL | PRIV-SEC | N | N | N |
| P1-5 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Owner inventory now keyset-paged at 100 with duplicate/non-advancing-page rejection; adversarial tests added | Tested at 99-501 record boundaries | PARTIAL | PRIV-SEC | N | N | N |
| P1-6 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Final lease renewal now performed immediately before every real Storage remove batch; lost lease prevents batch | Source repaired, staging verification still required | PARTIAL | PRIV-SEC | N | N | N |
| P1-7 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Web now blocked before confirmation and before deleteAccount reachable; tells user to use Flagstone on iOS | Native confirmation behavior unchanged | PARTIAL | PRIV-SEC | N | N | N |
| P1-8 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Forward-only anonymous photo-free constraint added requiring photo_url/object_key/uploader_id/photo_alt all null | New policy + migration, source-level only | PARTIAL | PRIV-SEC | N | N | N |
| P1-9 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Storage owner typing repaired via exact text equality; null/malformed/foreign values fail closed | Source repaired, staging verification still required | PARTIAL | PRIV-SEC | N | N | N |
| P1-10 | qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md | 2026-08-28 | Four D1F4 Edge Functions now pin exact npm:@supabase/supabase-js@2.106.2 dependency; root package/lockfile match | Floating dependency pin issue repaired | PARTIAL | ARCH | N | N | N |
| F1 | qa-reports/2026-08-27_Codex_D1SADeployedSecurityContainment.md | 2026-08-27 | Client exposure of seven bk_2026_08_22_* recovery/backup tables to PUBLIC/anon/authenticated | RLS enabled + direct table privileges revoked; local migration only | PROPOSED | PRIV-SEC | N | N | N |
| F2 | qa-reports/2026-08-27_Codex_D1SADeployedSecurityContainment.md | 2026-08-27 | Stale authenticated account writes allowed after account state changes (Storage/status/counter RPCs) | public.users.id = auth.uid() condition added; local migration only | PROPOSED | PRIV-SEC | N | N | N |
| F3 | qa-reports/2026-08-27_Codex_D1SADeployedSecurityContainment.md | 2026-08-27 | Cross-owner photo metadata attachment possible via authenticated flag_photos INSERT | INSERT policy now requires parent flag belongs to caller | PROPOSED | PRIV-SEC | N | N | N |
| F4 | qa-reports/2026-08-27_Codex_D1SADeployedSecurityContainment.md | 2026-08-27 | Direct client execution of trigger-only status transition function was allowed | Execute revoked from PUBLIC/anon/authenticated; local migration only | PROPOSED | PRIV-SEC | N | N | N |
| D1F4R3-FIX2 | qa-reports/2026-08-28_Codex_D1F4R3_FIX2.md | 2026-08-28 | Repairs review resume/replay truthfulness AND drops flags_user_scoped/'flags delete own'/'admin delete any flag' DELETE policies | Migration revokes DELETE grant on public.flags; source-only | PARTIAL | PRIV-SEC | N | N | Y |
| delete-flag-config-gap | qa-reports/2026-08-28_Codex_D1F4R3_LocalGateVerification.md | 2026-08-28 | delete-flag Edge function is browser-invoked with OPTIONS branch but has no explicit [functions.delete-flag] entry in supabase/config.toml | Default verify_jwt=true assumed; gateway behavior unproven from source | OPEN | PRIV-SEC | N | N | Y |
| D1F4R3-unrelated-test-failures | qa-reports/2026-08-28_Codex_D1F4R3_LocalGateVerification.md | 2026-08-28 | 3 pre-existing non-D1F4 suites fail after exact dependency restore: ReportFlagModal, MapScreen.guestHandoff, LeaderboardScreen.monogram | 5 tests failed of 3,838 total; unrelated to D1F4 paths | OPEN | TEST | N | N | N |
| D1F4R3-SourceClosure | qa-reports/2026-08-28_Codex_D1F4R3_SourceClosure.md | 2026-08-28 | REPAIR BLOCKED: typecheck/lint/full-jest all BLOCKED locally because expo-crypto/expo-secure-store unresolved; source committed but repo-wide gate unavailable | Missing local dependency cache, not a source defect per report | OPEN | TEST | N | N | N |
| D1F4R3-FIX3 | qa-reports/2026-08-28_Claude_D1F4R3_FIX3_ReviewAudit.md | 2026-08-28 | Fixes FIX2 regression: first review-item resolution committed with 0 audit rows (missing privacy-audit write for non-final resolutions) | Multi-item review; first resolution's evidence digest permanently absent | PARTIAL | PRIV-SEC | N | N | N |
| PROD-SCHEMA-CONTRACT-P0 | qa-reports/2026-08-30_Codex_ProductionSchemaContractP0.md | 2026-08-30 | Client selects canonical media keys (photo_object_key, avatar_object_key, flag_photos.object_key) that production schema lacks; causes 42703 errors | Production ledger has 70 migrations, missing 20260830130000; info_schema confirms columns absent | OPEN | ARCH | N | N | N |

## Admin flag deletion history (chronological)

### 2026-08-27 — qa-reports/2026-08-27_Codex_D1OptionAAccountDeletion.md
"flags_user_scoped permissive-RLS bypass — corrected... an owner could otherwise use this path while their deletion lock existed." (flags DELETE policy, owner-scoped ALL). CLAIM: fixed at migration-source level (not yet applied — "no migration was applied").

### 2026-08-28 — qa-reports/2026-08-28_Codex_D1F4R2_BlockedAuthorization.md
"P1-1 canonical report deletion... src/lib/flags.ts collects only photo_url/legacy junction URLs; it deletes the relational flag before a best-effort Storage removal. Canonical photo_object_key/flag_photos.object_key are not collected." CLAIM: NOT CLOSED (open defect in own-report/flag deletion).

### 2026-08-28 — qa-reports/2026-08-28_Codex_D1F4R2_SourceRepair.md
"P1-1 canonical ordinary report deletion... collects primary photo_object_key, gallery object_key... before relational deletion. Canonical keys are never reconstructed from public URLs." CLAIM: source-repaired (PARTIAL — not deployed/applied; "does not claim any migration has been applied").
### 2026-08-28 — qa-reports/2026-08-28_Codex_D1F4R3_FIX2.md (C-D1F4R3-FIX2)
"It drops all known client-authorizing DELETE/ALL policies: flags_user_scoped, 'flags delete own', and 'admin delete any flag'." Migration `20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql` revokes DELETE on public.flags from public/anon/authenticated (source only). CLAIM: source-repaired, NOT APPLIED — "No migration was applied." Fresh independent source acceptance required next.
- Confirms an "admin delete any flag" RLS policy existed in schema prior to this fix (being removed/contained).
- Only remaining ordinary deletion path after this fix: the `delete-flag` Edge function (bearer-derived caller, server-derives plan, verifies Storage ownership, removes exact keys, proves exact absence, then relational delete).
- Staging-only pgTAP assertions added (NOT YET RUN): effective anon/authenticated denial, retained service-role authority, absence of DELETE/ALL policies, "owner/admin direct-DML denial (42501)", retained authenticated read/create/update grants.
- Test file `src/lib/__tests__/sr050DeleteFlagPhotos.test.ts` referenced — ties this fix to an earlier finding "SR-050" (delete flag photos) — origin report not yet located, see coverage notes.
- Test file `src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts` referenced ("canonical report delete").
- schema.sql baseline also updated so "a future baseline replay cannot reintroduce the owner DELETE policy."
### 2026-08-28 — qa-reports/2026-08-28_Codex_D1F4R3_LocalGateVerification.md
Confirms delete-flag handler: bearer-derived caller via getUser(), client supplies only flagId, service-role client for prepare/finalize RPCs + Storage ops, exact-absence check before relational delete. Flags that supabase/config.toml has explicit verify_jwt=false for delete-account/account-deletion-worker/-status/-review but NOT for delete-flag — "REVIEW REQUIRED", left unresolved pending independent Work review + staging.

### 2026-08-28 — qa-reports/2026-08-28_Codex_D1F4R3_SourceClosure.md
"removes the old bulk review resolver and the direct admin Storage delete policy" (migration 20260828010000_d1f4r3_source_closure.sql) + adds service-role-only prepare/finalize RPCs for ordinary flag deletion; new supabase/functions/delete-flag/index.ts added, src/lib/flags.ts updated to call it, "removed the broad client-side Storage/relational cleanup path." CLAIM: REPAIR BLOCKED — source committed but repo-wide gate (typecheck/lint/jest) BLOCKED locally by missing expo deps; migration NOT applied/parsed anywhere (no Deno/psql/Docker available).
### 2026-08-28 — qa-reports/2026-08-28_Claude_D1F4R3_FIX3_ReviewAudit.md (C-D1F4R3-FIX3)
Confirms FIX2's flags-delete containment "all remain green": DELETE revoked from public/anon/authenticated, service_role authority retained, "flags_user_scoped / flags delete own / admin delete any flag" dropped, canonical delete-flag route with {flagId}. CLAIM: source + local-disposable-Postgres-cluster proof only. CRITICAL STATUS: "PUSH BLOCKED" — branch claude/d1f4r3-fix3-review-audit-20260828 committed but git push to Skypie99/AccessMap returned 403 (Claude GitHub App lacks write access). Neither this nor any FIX2/R3/R2/D1F4 commit is an ancestor of origin/main (main = a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50 at time of writing). As of 2026-08-28, the entire admin-delete-any-flag policy removal exists ONLY in unpushed feature branches — NOT in main, NOT applied to production Supabase.

## Production schema contract history

### 2026-08-30 — qa-reports/2026-08-30_Codex_ProductionSchemaContractP0.md (PROD-SCHEMA-CONTRACT, project kldlwszpfkdmsjrjhjym)
"The root cause is a client/production schema-contract mismatch, not network or authentication failure. The accepted client selects canonical media keys that production lacks..." Read-only info_schema confirmed flags.photo_object_key, users.avatar_object_key, flag_photos.object_key are ABSENT in production; legacy flags.photo_alt, users.avatar_url, flag_photos.url exist. Production ledger = 70 versions ending 20260819214410_photo_alt_text; migration 20260830130000_promptb_media_key_read_contract.sql (present in accepted local tree) is NOT deployed. Breaks listFlags/listFlagsPage/listFlagsByUser/fetchFlagById/fetchFlagsByIds/listRecentFlags, ProfileScreen avatar reads, and Flag Detail gallery reads — "restores the current 42703 outage" language implies outage is CURRENT/ONGOING as of 2026-08-30. Notes an unfiltered `--include-all` push would also apply 6 unrelated undeployed migrations: 20260818211920 plus five 20260828... moderation files (i.e. the D1F4/moderation migrations from Aug 28 were STILL not in production as of Aug 30, consistent with the D1F4R3-FIX3 "push blocked" finding). CLAIM: OPEN / BLOCKER — no DB-executed proof available locally (no Docker/psql); production mutation NONE; requires Sky authorization to apply single migration via isolated dry-run workspace. Rollback documented in migration lines 46-59, but rolling back while accepted client is live "restores the current 42703 outage."
- Also references an earlier partial fix: "Applying only the two incident-log columns would leave seeded Flag Detail reads broken" — implies a prior incident addressed photo_object_key/avatar_object_key but not flag_photos.object_key. Origin of that earlier incident not found in this file — see coverage notes.

## Un-IDed open items

- docs/PHASE_TESTFLIGHT_FIX_PLAN.md (2026-06-01, "Decisions for Sky" #1): submit feat/phase5-trust-score now vs. after merge to main — recommend merge first.
- docs/PHASE_TESTFLIGHT_FIX_PLAN.md (2026-06-01, "Decisions for Sky" #2): push notification disclaimer for TestFlight testers since net.http_post missing on Supabase free tier.
- docs/PHASE_TESTFLIGHT_FIX_PLAN.md (2026-06-01, "Decisions for Sky" #3): Sentry re-integration timing is a Phase 6 task, assign Rory + Gary.
- docs/MASTER_FIX_LOG.md (2026-05-31, section 2a): Sentry fully removed after iOS26 native crash; "Re-integration is a Phase 6 task" — needs org/project DSN before plugin re-registered.
- docs/MASTER_FIX_LOG.md (2026-05-31, section 4g): App Store reviewer test account migration (2026-05-31_reviewer_test_account.sql) committed but propose-only — Sky must run once before App Store submission (reviewer@accessmap.com).
- qa-reports/releases/2026-09-01_Flagstone_4.1.1_Build33_ReleaseIdentity.md (2026-09-02): Build 33 release receipt notes hard reload, repeat portfolio-path reload, and responsive checks were "intentionally unverified" for the web deployment decision (PASS WITH NOTES).
- qa-reports/releases/2026-09-01_Flagstone_4.1.1_Build33_ReleaseIdentity.md (2026-09-02): EAS build ID/profile/created timestamp and origin/main-at-build-time are both marked UNPROVEN (not in primary evidence).
- qa-reports/2026-08-26_Codex_Wave1CurrentBinaryAcceptance.md (2026-08-26): Wave 1 current-binary Simulator visual acceptance ENVIRONMENT BLOCKED — no launchable binary (Expo Go + local Simulator build both failed); all Explore map / liquid-glass checks NOT VERIFIED. [SIM_REQUIRED]
- qa-reports/2026-08-26_Codex_Wave1SharedFoundations.md (2026-08-26): Map foundation region/zoom refactor (PlatformMap.tsx, MapScreen.tsx) authorized and implemented, but real-device Explore light/dark liquid-glass visual acceptance still required before merge. [SIM_REQUIRED]
- qa-reports/2026-08-26_Codex_Wave2ScreenSpecificImplementation.md (2026-08-26): Wave 2 screen polish (Explore heat legend, Feedback sheet, barrier sheets, Tasks search) source-complete; combined Waves 1-3 visual/runtime gate deferred to Wave 3. [SIM_REQUIRED]
- qa-reports/2026-08-26_Codex_Wave3ConsolidatedReleaseQA.md (2026-08-26): "ENVIRONMENT BLOCKED — SKY DECISION REQUIRED" — all Wave1-3 automated gates pass, but CoreSimulator unreachable so current-binary runtime/visual acceptance (Explore glass, map gestures, Feedback sheet, Dynamic Type/VoiceOver) could not run; branch not a source-freeze candidate. [SIM_REQUIRED] [VISUAL]
- qa-reports/2026-08-31_Codex_MapOverlaySpaceRecovery.md (2026-08-31): Upper/lower Heat Zone card merge (ghost-space removal) source-complete + focused tests pass; default/XXXL live pixels, pan/zoom, Simulator verification all LIVE UNPROVEN. FINAL VERDICT: BLOCKED. [VISUAL] [SIM_REQUIRED]
- qa-reports/2026-08-31_Codex_FinalEMD_PostMapFix.md (2026-08-31): Post-map-fix live acceptance BLOCKED — Metro and Simulator attribution both FAIL; stale Simulator app still showed removed lower card. "UNRESOLVED P1 — 1 (live acceptance blocked by runtime attribution)". [VISUAL] [SIM_REQUIRED]
- qa-reports/2026-08-31_Codex_MapHeatDuplicateRemoval.md (2026-08-31): Removed duplicate lower "No heat zones qualify yet" card; source + focused tests PASS; default/XXXL live acceptance, viewport pixels, pan/zoom, Simulator attribution all LIVE UNPROVEN. FINAL VERDICT: BLOCKED. [VISUAL] [SIM_REQUIRED]
- qa-reports/2026-08-30_Codex_SeverityXXXLFinalP1Closure.md (2026-08-30): Report severity discs/caption were not uncapped at XXXL (SeverityDisc missing scaleWithType opt-in); fixed source-side + tests pass; Severity-only XXXL live verification still required before FTQA acceptance/visual freeze. [VISUAL] [SIM_REQUIRED]
- qa-reports/2026-08-31_Codex_RCTFatalDiagnosisAndFilterXXXL.md (2026-08-31): RCTFatal startup crash root-caused to a cross-worktree node_modules symlink (dev-environment defect, not source); fixed by exact lockfile reinstall. After fix, Filter & Sort at Accessibility XXXL PASS, Dynamic Type restored to Large. [SIM_REQUIRED]
- qa-reports/2026-08-31_Codex_TargetedFinalPolishRuntimeAcceptance.md (2026-08-31, SAME DAY as above): RCTFatal RECURS on a later candidate/runtime receipt (95a8697/76ee355) — candidate never loads past the RCTFatal dev-build error screen even after one Reload; every requested check (Nearby, Profile sheets, Feedback sheet, Filter&Sort default+XXXL, Map callout) NOT RUN. TARGETED RUNTIME ACCEPTANCE: FAIL. Contradicts/supersedes the same-day RCTFatal "fixed" claim above — worth reconciling which build state is current. [SIM_REQUIRED]
- qa-reports/2026-08-30_Codex_ReportModalXXXLClosure.md (2026-08-30): Report modal title/location-prompt/quick-fill/category labels were finite-capped at XXXL (prior "token-only" fix insufficient because RN scales fontSize and tokens identically); now moved to TYPE_BLOCK.content uncapped convention + wrap-safe geometry; tests PASS; live iOS XXXL re-verification REQUIRED before FTQA acceptance/visual freeze (both NOT YET). [VISUAL] [SIM_REQUIRED]
- qa-reports/2026-08-31_Codex_MapHeatXXXL_Repair.md (2026-08-31): Map Heat notice/dismiss-button reflow fix for XXXL (TypeBlock chrome cap + minWidth:0); eslint PASS but typecheck/full-lint BLOCKED locally (missing expo-crypto/expo-secure-store); baseline runtime verdict was Map Heat XXXL FAIL, post-repair runtime verdict NOT VERIFIED (Simulator blocked). [VISUAL] [SIM_REQUIRED]

## Coverage notes

(in progress — not yet finalized)
