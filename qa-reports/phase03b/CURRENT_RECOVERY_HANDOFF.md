# Phase 03B current recovery handoff

- `CURRENT_TASK`: Repair the R11 post-apply/post-exit CLI row transport defect, validate locally, run one new read-only post-apply verification, and prepare—but never execute—an owner restoration runbook only if verification passes.
- `CURRENT_BRANCH`: `codex/flagstone-p03b-post-apply-recovery-20260919`
- `CURRENT_WORKTREE`: `/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919`
- `CURRENT_HEAD_SHA`: `f374e17db673fe755ca197bdd110c1d7bd01a9e7`
- `CURRENT_TREE`: `355cf3328231e9cc13638d6fa8e788218969d906`
- `INCIDENT_RUN_ID`: `ebdba703-2470-41fa-ac6d-44354203b8d1`
- `ORIGINAL_DATABASE_T0`: `2026-09-20T06:20:25.216974Z`
- `PRODUCTION_APPLY_ATTEMPT_COUNT`: `1`
- `ONE_RUN_AUTHORIZATION_STATUS`: `CONSUMED`
- `CURRENT_LIVE_GATE_STATE`: `EXACT_PRESENT`
- `COMPLETED_WORK`: root cause confirmed; both recovery-critical weak extractors replaced with the canonical strict `resultRow`; focused and preserved local gates passed; one corrected production post-apply verifier run completed read-only and returned `HOLD`
- `COMPLETED_TESTS`: recovery transport `13/13`; preserved transport `22/22`; preserved history fail-closed `22/22`; preserved R11 controls PASS; disposable PostgreSQL replay PASS; all five child exits `0`; validation infrastructure destroyed
- `LIVE_READ_ONLY_RESULTS`: `HOLD`; transport accepted; ledger `87`; Phase 03B versions `[20260915210256, 20260915210413]`; exact gate present; HTTP queue `0`; new responses since original T0 `0`; TTL `6 hours`; comparator stopped on production ledger statement representation `68/23` versus frozen contract `1/1`, before structural capture
- `CURRENT_EVIDENCE_PATHS`: `qa-reports/phase03b/2026-09-19-post-apply-recovery-evidence/retained-incident-input`; `qa-reports/phase03b/2026-09-19-post-apply-recovery-evidence/local-validation`; `qa-reports/phase03b/2026-09-19-post-apply-recovery-evidence/live-post-apply`
- `UNCOMMITTED_FILES`: live read-only evidence, this handoff, state JSON, and session QA report pending the documentation checkpoint
- `NEXT_EXACT_ACTION`: Sky decides whether to authorize a separate bounded correction of the verifier's migration-ledger statement identity contract; until then keep the exact gate present and do not prepare restoration
- `DO_NOT_REPEAT`: production controller; either Phase 03B migration; migration apply; original one-run authorization; corrected live verifier without new authority
- `DO_NOT_DO`: gate removal; exit SQL; restoration; rollback; migration repair; db pull; production mutation; Phase 03C; R12
- `LAST_UPDATED_UTC`: `2026-09-20T06:39:16Z`

## DECISIONS FOR SKY

Decide whether to authorize a separate, narrow local-only repair of the `phase03b_rows` ledger identity contract. Recommendation: authorize that bounded repair and independent review without changing the strict envelope schema, candidate migrations, gate, database, or production state. The live ledger records Supabase's split-statement representation (68 and 23 statements with first-statement hashes), while the current verifier expects one whole-file statement for each migration. The alternative is to leave the verifier unchanged; impact: production remains intentionally quiesced and no restoration runbook can be prepared.
