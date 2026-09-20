# Phase 03B current recovery handoff

- `CURRENT_TASK`: Offline diagnosis of the final-structure divergence found by the second live verification. No live contact, no mutation.
- `CURRENT_PHASE`: `OFFLINE_STRUCTURE_DIAGNOSIS_COMPLETE`
- `CURRENT_BRANCH`: `codex/flagstone-p03b-post-apply-recovery-20260919`
- `CURRENT_WORKTREE`: `/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919`
- `CURRENT_HEAD_SHA`: `1cfb885f6261a732a4471dc46d4055140603fd67` (at time of second live run; this checkpoint's own commit will supersede it — see git log)
- `CURRENT_TREE`: `21e024606ba7edde02e9d3469b3a9c201764524d` (pre-checkpoint; see git log for current)
- `INCIDENT_RUN_ID`: `ebdba703-2470-41fa-ac6d-44354203b8d1`
- `ORIGINAL_DATABASE_T0`: `2026-09-20T06:20:25.216974Z`
- `PRODUCTION_APPLY_ATTEMPT_COUNT`: `1`
- `ORIGINAL_ONE_RUN_AUTHORIZATION_STATUS`: `CONSUMED`
- `CURRENT_LIVE_GATE_STATE`: `EXACT_PRESENT` (last confirmed by the second live read-only run; not re-checked this session — no live contact made)
- `COMPLETED_WORK`: identified the expected structure artifact (`qa-reports/phase03b/2026-09-15-revised-staging/CATALOG_FIRST_REVISED_APPLY.json` at commit `aca5fdbb0f5fd151a5c98d5ca1b956954cf83354`, on sibling branch `codex/flagstone-p03b-revised-staging-20260915`, read via `git show` without checkout); ran `scripts/structural-catalog.mjs diff` (the repo's own comparator) between that expected artifact and the observed live capture; classified and traced all 55 residuals to root cause; wrote bounded report and machine-readable diff
- `COMPLETED_TESTS`: none re-run this session (pure offline evidence diagnosis)
- `FAILED_TESTS_OR_BLOCKERS`: none — diagnosis reached a definitive, fully-traced conclusion (0 `UNKNOWN` residuals)
- `LIVE_READ_ONLY_RESULTS`: unchanged from the second live run (see prior checkpoint / git log commit `fe37022`): `HOLD`, ledger identity PASS, gate `EXACT_PRESENT`, structural mismatch found
- `OFFLINE_STRUCTURE_DIAGNOSIS_RESULT`: **HOLD** (real difference exists) but **fully explained and traced**. All 55 structural residuals (7 relations + 48 columns) are exhaustively caused by 7 known, pre-existing, already-documented production-only backup tables (`bk_2026_08_22_*`) created 2026-08-23 by a Sky-waived one-time destructive-data cleanup (`supabase/nonmanaged/destructive-data/2026-08-22_takedown_junk_flags_APPLIED.sql`), confirmed present in production as of the 2026-09-15 Phase03A preflight capture (predates Phase03B entirely). Neither frozen Phase03B migration file references these tables. Zero residuals in functions/policies/triggers/roles/schemas/defaultAcls — everything Phase03B actually creates or changes matches the accepted baseline exactly. Classification: `D. PREEXISTING_ENVIRONMENTAL_DRIFT` for all 55 residuals. Temporary-gate exclusion confirmed working correctly (not the cause).
- `CURRENT_EVIDENCE_PATHS`: `qa-reports/phase03b/2026-09-20-second-live-post-apply-verification/` (live capture, prior checkpoint); `qa-reports/phase03b/2026-09-20-structure-divergence-diff.json` (new, this checkpoint); `qa-reports/2026-09-20_Codex_Phase03BOfflineStructureDivergence.md` (new, this checkpoint)
- `UNCOMMITTED_FILES`: none after this checkpoint commit
- `NEXT_EXACT_ACTION`: Sky decides `NEXT_ACTION_CLASSIFICATION: PREEXISTING_DRIFT_ADJUDICATION_REQUIRED` — specifically, whether to extend the verifier's fixed 3-object exclusion list to also exclude the 7 `bk_2026_08_22_*` tables (a scope/adjudication decision, not a migration or production repair) before any further live verification is authorized. Do not retry the live verifier until that's decided, since permissions/RLS/moderation/points/client-compatibility/Edge Function checks still remain unexecuted and unknown.
- `DO_NOT_REPEAT`: production controller; either Phase 03B migration; migration apply; original one-run authorization; the now-consumed second live verifier run; any live retry without new explicit authority
- `DO_NOT_DO`: gate removal; exit SQL; restoration; rollback; migration repair; db pull; production mutation; staging mutation; Phase 03C; R12; automatically updating the expected artifact or comparator exclusion list without Sky's decision
- `LAST_UPDATED_UTC`: `2026-09-20T08:32:00Z`

## DECISIONS FOR SKY

🔴 **The structural mismatch is fully diagnosed and is not a defect in either the migrations or production — it's a known, already-closed loose end resurfacing.** The 7 objects causing all 55 residuals are the `bk_2026_08_22_*` backup tables from last month's Sky-waived junk-flag takedown, which staging never had and never will (separate project, never received that one-time production-only operation).

- **What:** The comparator's expected-structure artifact was captured from a staging project that structurally lacks 7 tables production has carried since 2026-08-23, unrelated to Phase03B. Every other structural surface (grants, RLS, policies, triggers, functions, roles) matches exactly.
- **Recommendation:** Extend the verifier's exclusion list (currently exactly 3 objects) to also exclude the 7 `bk_2026_08_22_*` tables and their columns, re-derive the accepted expected structure hash from that wider exclusion, and only then authorize a third live run. This treats it as what it is — a known, already-decided artifact — not new migration work.
- **Why:** Neither production nor the migrations need to change; only the comparator's scope needs updating to reflect a legitimate, pre-existing divergence it was never designed to see.
- **Alternative:** Leave production quiesced indefinitely until this is adjudicated — there's still no time pressure.
- **Impact:** Until this is decided, permissions/RLS, moderation, points, client-compatibility, and Edge Function identity remain unverified live, and no restoration runbook can be prepared.
