# Flagstone Phase 03B — Final R11 Owner Runbook

Date: 2026-09-19 (America/Vancouver)

`FINAL_R11_OWNER_RUNBOOK: READY`

`ONE_RUN_AUTHORIZATION_STATUS: UNUSED`

`PRODUCTION_MUTATIONS: NONE`

This is a non-executing owner runbook generated from the accepted history-support repair. Generating and validating this document did not contact production or staging, enter quiescence, launch the controller, apply migrations, repair migration history, pull a database, push, merge, release, or start Phase 03C.

## Immutable authority

- Source repository: `/Users/skypie/AccessMap`
- History-support repair: `3dd4e47dc35580c3b907daa9631b1db4c536cda6`
- Repair tree: `933e9194525a2c843a184656197031d76065f639`
- Independent history-support review: `4459327012432a52c2ce72bdc4589fc76dd6520e`
- Source transport repair: `b50759af723d0b1c1008ca78f3e169d1ffbe08e0`
- Source R11 packet: `cf683eac2f50a284d8dc897db98a91290e9b6bc0`
- Candidate: `9d638456fa8e679678c54f131fe8f0db723eda72`
- Candidate tree: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`
- Production target: `kldlwszpfkdmsjrjhjym`
- Supabase CLI: `2.116.0` exactly

## Exact paths created or used by the compact block

- Final owner branch: `owner/flagstone-p03b-r11-final-production-execution-20260919`
- Final owner worktree: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-production-execution-20260919`
- Packet directory: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-production-execution-20260919/qa-reports/phase03b/2026-09-19-production-apply-packet-r11`
- Canonical controller: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-production-execution-20260919/qa-reports/phase03b/2026-09-19-production-apply-packet-r11/execute_cutover_controller.mjs`
- Read-only preflight root: `/tmp/flagstone-p03b-r11-final-owner-readonly-preflight-20260919`
- Controller temporary workdir: `/tmp/flagstone-p03b-production-apply-9d638456`
- Production evidence root: `/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-production-execution-20260919/qa-reports/phase03b/2026-09-19-production-apply-r11-final-evidence`

The worktree, branch, read-only preflight root, controller workdir, and production evidence root must all be absent before the block starts. Any mismatch is `STOP_PRE_MUTATION`.

## One compact macOS zsh block

Copy this block once into a fresh macOS Terminal. Do not run individual lines separately. Everything before the exact `>>> PRODUCTION MUTATION BEGINS HERE <<<` marker is local-only or target-pinned read-only. The controller is invoked once and never retried.

```bash
zsh <<'FLAGSTONE_R11_FINAL_OWNER_RUN'
set -euo pipefail

typeset -r R11_SOURCE=/Users/skypie/AccessMap
typeset -r R11_WORKTREE=/Users/skypie/AccessMap-codex/flagstone-p03b-r11-final-owner-production-execution-20260919
typeset -r R11_BRANCH=owner/flagstone-p03b-r11-final-production-execution-20260919
typeset -r R11_REPAIR_SHA=3dd4e47dc35580c3b907daa9631b1db4c536cda6
typeset -r R11_REPAIR_TREE=933e9194525a2c843a184656197031d76065f639
typeset -r R11_REVIEW_SHA=4459327012432a52c2ce72bdc4589fc76dd6520e
typeset -r R11_TRANSPORT_SHA=b50759af723d0b1c1008ca78f3e169d1ffbe08e0
typeset -r R11_PACKET_SHA=cf683eac2f50a284d8dc897db98a91290e9b6bc0
typeset -r R11_CANDIDATE=9d638456fa8e679678c54f131fe8f0db723eda72
typeset -r R11_CANDIDATE_TREE=cfc76206f7cf7af6a7127a6329620d2ee1dc4da8
typeset -r R11_TARGET=kldlwszpfkdmsjrjhjym
typeset -r R11_LEDGER_SHA=811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec
typeset -r R11_MIGRATION_ONE=20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql
typeset -r R11_MIGRATION_ONE_SHA=b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11
typeset -r R11_MIGRATION_TWO=20260915210413_phase03b_points_integrity.sql
typeset -r R11_MIGRATION_TWO_SHA=0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5
typeset -r R11_PREFLIGHT=/tmp/flagstone-p03b-r11-final-owner-readonly-preflight-20260919
typeset -r R11_CONTROLLER_WORKDIR=/tmp/flagstone-p03b-production-apply-9d638456

[[ ! -e "$R11_WORKTREE" ]] || { print -r -- 'STOP_PRE_MUTATION: final owner worktree path already exists'; exit 1; }
[[ ! -e "$R11_PREFLIGHT" ]] || { print -r -- 'STOP_PRE_MUTATION: read-only preflight root already exists'; exit 1; }
[[ ! -e "$R11_CONTROLLER_WORKDIR" ]] || { print -r -- 'STOP_PRE_MUTATION: controller workdir already exists'; exit 1; }
if git -C "$R11_SOURCE" show-ref --verify --quiet "refs/heads/$R11_BRANCH"; then
  print -r -- 'STOP_PRE_MUTATION: final owner branch already exists'
  exit 1
fi

for command_name in zsh git node supabase jq rg shasum awk; do
  command -v "$command_name" >/dev/null || { print -r -- "STOP_PRE_MUTATION: missing required tool $command_name"; exit 1; }
done
[[ "$(supabase --version)" == 2.116.0 ]] || { print -r -- 'STOP_PRE_MUTATION: Supabase CLI must be exactly 2.116.0'; exit 1; }
supabase db push --help | rg -- '--workdir|--linked|--project-ref|--dry-run|--skip-vault|--include-all|--yes|--output-format' >/dev/null
supabase db query --help | rg -- '--linked|--project-ref|--file|--output-format' >/dev/null

git -C "$R11_SOURCE" cat-file -e "$R11_PACKET_SHA^{commit}"
git -C "$R11_SOURCE" cat-file -e "$R11_TRANSPORT_SHA^{commit}"
git -C "$R11_SOURCE" cat-file -e "$R11_REPAIR_SHA^{commit}"
git -C "$R11_SOURCE" cat-file -e "$R11_REVIEW_SHA^{commit}"
git -C "$R11_SOURCE" cat-file -e "$R11_CANDIDATE^{commit}"
[[ "$(git -C "$R11_SOURCE" rev-parse "$R11_REPAIR_SHA^{tree}")" == "$R11_REPAIR_TREE" ]]
[[ "$(git -C "$R11_SOURCE" rev-parse "$R11_REVIEW_SHA^")" == "$R11_REPAIR_SHA" ]]
git -C "$R11_SOURCE" merge-base --is-ancestor "$R11_PACKET_SHA" "$R11_REPAIR_SHA"
git -C "$R11_SOURCE" merge-base --is-ancestor "$R11_TRANSPORT_SHA" "$R11_REPAIR_SHA"
git -C "$R11_SOURCE" cat-file -e "${R11_REVIEW_SHA}:qa-reports/2026-09-19_Codex_Phase03B_R11_History_Support_Independent_Review.md"
git -C "$R11_SOURCE" show "${R11_REVIEW_SHA}:qa-reports/2026-09-19_Codex_Phase03B_R11_History_Support_Independent_Review.md" | rg -F 'INDEPENDENT_R11_HISTORY_SUPPORT_REVIEW: PASS' >/dev/null
git -C "$R11_SOURCE" show "${R11_REVIEW_SHA}:qa-reports/2026-09-19_Codex_Phase03B_R11_History_Support_Independent_Review.md" | rg -F 'OWNER_RUNBOOK_REGENERATION: READY' >/dev/null

git -C "$R11_SOURCE" worktree add -b "$R11_BRANCH" "$R11_WORKTREE" "$R11_REPAIR_SHA"
cd "$R11_WORKTREE"

typeset -r R11_PACKET="$R11_WORKTREE/qa-reports/phase03b/2026-09-19-production-apply-packet-r11"
typeset -r R11_CONTROLLER="$R11_PACKET/execute_cutover_controller.mjs"
typeset -r R11_EVIDENCE="$R11_WORKTREE/qa-reports/phase03b/2026-09-19-production-apply-r11-final-evidence"
[[ "$(git rev-parse HEAD)" == "$R11_REPAIR_SHA" ]]
[[ "$(git rev-parse 'HEAD^{tree}')" == "$R11_REPAIR_TREE" ]]
[[ "$(git rev-parse "$R11_CANDIDATE^{tree}")" == "$R11_CANDIDATE_TREE" ]]
[[ -z "$(git status --porcelain=v1)" ]]
[[ -z "$(git ls-files -u)" ]]
git diff --exit-code
git diff --cached --exit-code
for state in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG rebase-apply rebase-merge; do
  [[ ! -e "$(git rev-parse --git-path "$state")" ]] || { print -r -- "STOP_PRE_MUTATION: interrupted Git state $state"; exit 1; }
done

for required_path in \
  "$R11_CONTROLLER" \
  "$R11_PACKET/adjudicate_server_state.mjs" \
  "$R11_PACKET/build_hermetic_workdir.mjs" \
  "$R11_PACKET/r8_control_lib.mjs" \
  "$R11_PACKET/run_history_support_fail_closed_local_validation.mjs" \
  "$R11_PACKET/run_live_transport_validation.mjs" \
  "$R11_PACKET/run_live_evidence_privacy_scan.mjs" \
  "$R11_PACKET/PRODUCTION_MIGRATION_LEDGER_READ_ONLY.sql" \
  "$R11_PACKET/PG_NET_RUN_RELATIVE_PREFLIGHT.sql" \
  "$R11_PACKET/HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_EVIDENCE/HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_VALIDATION_RECEIPT.json" \
  "$R11_PACKET/HISTORY_SUPPORT_FAIL_CLOSED_LIVE_EVIDENCE/LIVE_TRANSPORT_VALIDATION_RECEIPT.json"; do
  [[ -f "$required_path" ]] || { print -r -- "STOP_PRE_MUTATION: missing required path $required_path"; exit 1; }
done
node --check "$R11_CONTROLLER"
node --check "$R11_PACKET/build_hermetic_workdir.mjs"
node --check "$R11_PACKET/r8_control_lib.mjs"
node --check "$R11_PACKET/run_history_support_fail_closed_local_validation.mjs"
node --check "$R11_PACKET/run_live_transport_validation.mjs"

jq -e '.candidateSha == "9d638456fa8e679678c54f131fe8f0db723eda72" and .candidateTree == "cfc76206f7cf7af6a7127a6329620d2ee1dc4da8" and .exactTwoMigrationsOnly == true and .candidateBytesChanged == false and [.migrations[].path] == ["supabase/migrations-next/phase03b/20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql","supabase/migrations-next/phase03b/20260915210413_phase03b_points_integrity.sql"] and [.migrations[].sha256] == ["b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11","0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5"]' "$R11_PACKET/CANDIDATE_FREEZE.json" >/dev/null
jq -e '.status == "PASS" and .priorTransportTests == {"passed":22,"total":22} and .newHistoryFailClosedTests == {"passed":22,"total":22} and .allChildChecksTrue == true and .numericChildExits == [0,0,0,0] and .validationInfrastructureDestroyed == true and .productionMutations == "NONE" and .quiescenceEntered == false and .controllerExecuted == false and .productionApplyExecuted == false' "$R11_PACKET/HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_EVIDENCE/HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_VALIDATION_RECEIPT.json" >/dev/null
jq -e '.status == "PASS" and .target == "kldlwszpfkdmsjrjhjym" and .supabaseCli == "2.116.0" and .productionLedger.rowCount == 85 and .productionLedger.orderedVersionNameSha256 == "811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec" and .reconciledWorkspace.historySupportCount == 85 and .reconciledWorkspace.pendingMigrationCount == 2 and .authoritativeDryRunPlan.pendingMigrationCount == 2 and .authoritativeDryRunPlan.exactExpectedOrder == true and .authoritativeDryRunPlan.seeds == [] and .authoritativeDryRunPlan.roles == [] and .productionMutations == "NONE" and .quiescenceEntered == false and .controllerExecuted == false and .productionApplyExecuted == false' "$R11_PACKET/HISTORY_SUPPORT_FAIL_CLOSED_LIVE_EVIDENCE/LIVE_TRANSPORT_VALIDATION_RECEIPT.json" >/dev/null

typeset -a R11_PHASE03B_SQL=("$R11_WORKTREE"/supabase/migrations-next/phase03b/*.sql(N))
(( ${#R11_PHASE03B_SQL[@]} == 2 ))
[[ -f "$R11_WORKTREE/supabase/migrations-next/phase03b/$R11_MIGRATION_ONE" ]]
[[ -f "$R11_WORKTREE/supabase/migrations-next/phase03b/$R11_MIGRATION_TWO" ]]
[[ "$(shasum -a 256 "$R11_WORKTREE/supabase/migrations-next/phase03b/$R11_MIGRATION_ONE" | awk '{print $1}')" == "$R11_MIGRATION_ONE_SHA" ]]
[[ "$(shasum -a 256 "$R11_WORKTREE/supabase/migrations-next/phase03b/$R11_MIGRATION_TWO" | awk '{print $1}')" == "$R11_MIGRATION_TWO_SHA" ]]
git diff --exit-code "$R11_CANDIDATE" "$R11_REPAIR_SHA" -- \
  "supabase/migrations-next/phase03b/$R11_MIGRATION_ONE" \
  "supabase/migrations-next/phase03b/$R11_MIGRATION_TWO"

[[ ! -e "$R11_EVIDENCE" ]] || { print -r -- 'STOP_PRE_MUTATION: production evidence root already exists'; exit 1; }
mkdir -m 700 "$R11_PREFLIGHT"

node "$R11_PACKET/run_history_support_fail_closed_local_validation.mjs" --evidence="$R11_PREFLIGHT/history-local-validation" > "$R11_PREFLIGHT/history-local-validation.summary.json"
jq -e '.status == "PASS" and .priorTransportTests == {"passed":22,"total":22} and .newHistoryFailClosedTests == {"passed":22,"total":22} and .allChildChecksTrue == true and .numericChildExits == [0,0,0,0] and .validationInfrastructureDestroyed == true and .productionInputsAccepted == false and .productionMutations == "NONE" and .quiescenceEntered == false and .controllerExecuted == false and .productionApplyExecuted == false' "$R11_PREFLIGHT/history-local-validation.summary.json" >/dev/null

supabase projects list --output json > "$R11_PREFLIGHT/projects.json"
jq -e --arg target "$R11_TARGET" 'map(select(.id == $target)) as $matches | ($matches | length) == 1 and $matches[0].status == "ACTIVE_HEALTHY"' "$R11_PREFLIGHT/projects.json" >/dev/null
print -r -- 'TARGET_IDENTITY = PASS'

supabase db query --linked --project-ref "$R11_TARGET" --file "$R11_PACKET/PG_NET_RUN_RELATIVE_PREFLIGHT.sql" --output-format json > "$R11_PREFLIGHT/pgnet-preflight.raw.json"
node --input-type=module -e 'import {readFileSync,writeFileSync} from "node:fs"; import {pathToFileURL} from "node:url"; const [packet,raw,out]=process.argv.slice(1); const controls=await import(pathToFileURL(packet+"/r8_control_lib.mjs").href); const payload=controls.parseCliJson(readFileSync(raw,"utf8")); const row=controls.resultRow(payload,"phase03b_pgnet_run_relative_preflight_r11"); controls.createRunRelativePgNetContext(row); writeFileSync(out,JSON.stringify(row,null,2)+"\n",{flag:"wx",mode:0o600});' "$R11_PACKET" "$R11_PREFLIGHT/pgnet-preflight.raw.json" "$R11_PREFLIGHT/PG_NET_RUN_RELATIVE_PREFLIGHT.json"
jq -e '.receipt == "phase03b_pgnet_run_relative_preflight_r11" and .captured_at_utc == .database_t0 and .transaction_read_only == "on" and .pg_net_ttl_seconds > 600 and .http_queue_count == 0 and .http_response_new_since_t0_count == 0' "$R11_PREFLIGHT/PG_NET_RUN_RELATIVE_PREFLIGHT.json" >/dev/null

node "$R11_PACKET/adjudicate_server_state.mjs" \
  --evidence="$R11_PREFLIGHT/server-state" \
  --preflight="$R11_PREFLIGHT/PG_NET_RUN_RELATIVE_PREFLIGHT.json" \
  --run-id="$(node -p 'crypto.randomUUID()')" \
  --controller-pid=$$ \
  --monotonic-origin="$(node -p 'Number(process.hrtime.bigint()/1000000n)')"
R11_T0="$(jq -r '.database_t0' "$R11_PREFLIGHT/PG_NET_RUN_RELATIVE_PREFLIGHT.json")"
jq -e --arg t0 "$R11_T0" '.status == "ENTRY_CONFIRMED_NOT_COMMITTED" and .observed.entryClassification == "ENTRY_CONFIRMED_NOT_COMMITTED" and .observed.gateState.state == "GATE_ABSENT" and .observed.applyClassification == "APPLY_NOT_STARTED" and .observed.snapshot.querySucceeded == true and .observed.snapshot.transaction_read_only == "on" and .observed.snapshot.ledger_count == 85 and .observed.snapshot.ledger_unique_count == 85 and .observed.snapshot.ledger_latest_version == "20260911120000" and .observed.snapshot.ledger_ordered_version_name_sha256 == "811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec" and .observed.snapshot.phase03b_versions == [] and .observed.snapshot.function_count == 0 and .observed.snapshot.row_trigger_count == 0 and .observed.snapshot.truncate_trigger_count == 0 and .observed.snapshot.candidate_backends == [] and .observed.snapshot.database_t0 == $t0 and .observed.snapshot.pg_net_ttl_seconds > 600 and .observed.snapshot.http_queue_count == 0 and .observed.snapshot.http_response_new_since_t0_count == 0 and .numericExit == 0 and .signal == null and .timedOut == false' "$R11_PREFLIGHT/server-state/SERVER_STATE_CLASSIFICATION.json" >/dev/null

jq -e '.historicalFingerprintClassification == "DIAGNOSTIC_HISTORY_ONLY" and .volatileHttpFingerprintRemovedFromAuthorization == true and .oldResponseExpiryAllowed == true and .newOutboundResponseFailsClosed == true and .databaseT0Immutable == true and .httpQueueZeroRequired == true and .noNewResponseAfterT0Required == true' "$R11_PACKET/ARTIFACT_MANIFEST.json" >/dev/null

node "$R11_PACKET/run_live_transport_validation.mjs" --evidence="$R11_PREFLIGHT/history-transport" > "$R11_PREFLIGHT/history-transport.summary.json"
jq -e '.status == "PASS" and .target == "kldlwszpfkdmsjrjhjym" and .supabaseCli == "2.116.0" and .productionLedger.validation == "PASS_EXACT_ACCEPTED_85_ROW_LEDGER" and .productionLedger.transactionReadOnly == "on" and .productionLedger.rowCount == 85 and .productionLedger.orderedVersionNameSha256 == "811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec" and .reconciledWorkspace.validation == "PASS" and .reconciledWorkspace.historySourceCommit == "cf683eac2f50a284d8dc897db98a91290e9b6bc0" and .reconciledWorkspace.historySupportCount == 85 and .reconciledWorkspace.pendingMigrationCount == 2 and [.reconciledWorkspace.pendingMigrations[].filename] == ["20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql","20260915210413_phase03b_points_integrity.sql"] and [.reconciledWorkspace.pendingMigrations[].sha256] == ["b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11","0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5"] and .authoritativeDryRunPlan.validation == "PASS_EXACT_TWO_PENDING_ONLY" and .authoritativeDryRunPlan.dryRun == true and .authoritativeDryRunPlan.upToDate == false and .authoritativeDryRunPlan.pendingMigrationCount == 2 and .authoritativeDryRunPlan.migrations == ["20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql","20260915210413_phase03b_points_integrity.sql"] and .authoritativeDryRunPlan.exactExpectedOrder == true and .authoritativeDryRunPlan.seeds == [] and .authoritativeDryRunPlan.roles == [] and .numericChildExits == {"supabase-version":0,"production-ledger-read-only":0,"target-pinned-db-push-dry-run":0} and .productionMutations == "NONE" and .quiescenceEntered == false and .controllerExecuted == false and .productionApplyExecuted == false and .temporaryWorkspaceDestroyed == true' "$R11_PREFLIGHT/history-transport.summary.json" >/dev/null
jq -e '.packetVersion == "R11-TRANSPORT-REPAIR" and .target == "kldlwszpfkdmsjrjhjym" and .candidate == "9d638456fa8e679678c54f131fe8f0db723eda72" and .candidateTree == "cfc76206f7cf7af6a7127a6329620d2ee1dc4da8" and .historySourceCommit == "cf683eac2f50a284d8dc897db98a91290e9b6bc0" and .historySupportMode == "ABORT_FIRST_TRIPWIRE" and .historyLedgerSha256 == "811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec" and .historySupportCount == 85 and .pendingMigrationCount == 2 and .pendingMigrations == ["20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql","20260915210413_phase03b_points_integrity.sql"]' "$R11_PREFLIGHT/history-transport/PHASE03B_APPLY_WORKSPACE_MANIFEST.json" >/dev/null
jq -e '.totalMigrationFileCount == 87 and .historySupportFileCount == 85 and .pendingMigrationFileCount == 2 and .seedFiles == 0 and .roleFiles == 0 and .otherSqlFiles == 0 and .historyLedgerSha256 == "811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec" and .pendingVersions == ["20260915210256","20260915210413"] and ([.files[] | select(.classification == "HISTORY_SUPPORT")] | length) == 85 and ([.files[] | select(.classification == "PENDING_PHASE03B")] | length) == 2 and ([.files[] | select(.classification == "UNEXPECTED")] | length) == 0' "$R11_PREFLIGHT/history-transport/HISTORY_SUPPORT_INVENTORY.json" >/dev/null
if rg -F 'LegacyDbPushMissingLocalError' "$R11_PREFLIGHT/history-transport/target-pinned-db-push-dry-run.stdout.log" "$R11_PREFLIGHT/history-transport/target-pinned-db-push-dry-run.stderr.log"; then
  print -r -- 'STOP_PRE_MUTATION: LegacyDbPushMissingLocalError detected'
  exit 1
fi

[[ -z "$(git status --porcelain=v1)" ]]
[[ ! -e "$R11_CONTROLLER_WORKDIR" ]]
[[ ! -e "$R11_EVIDENCE" ]]

print -r -- ''
print -r -- 'HUMAN CHECKPOINT'
print -r -- ''
print -r -- 'TARGET:'
print -r -- 'kldlwszpfkdmsjrjhjym'
print -r -- ''
print -r -- 'EXACT TWO PENDING MIGRATIONS:'
print -r -- '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql'
print -r -- '20260915210413_phase03b_points_integrity.sql'
print -r -- ''
print -r -- 'HISTORY_SUPPORT_REPAIR_COMMIT:'
print -r -- '3dd4e47dc35580c3b907daa9631b1db4c536cda6'
print -r -- ''
print -r -- 'INDEPENDENT_HISTORY_SUPPORT_REVIEW_COMMIT:'
print -r -- '4459327012432a52c2ce72bdc4589fc76dd6520e'
print -r -- ''
print -r -- 'APPLY_ATTEMPT_COUNT:'
print -r -- '0'
print -r -- ''
print -r -- 'ONE_RUN_AUTHORIZATION_STATUS:'
print -r -- 'UNUSED'
print -r -- ''
print -r -- 'FIRST_AND_ONLY_AUTHORIZED_R11_PRODUCTION_ATTEMPT:'
print -r -- 'YES'
print -r -- ''
print -r -- 'If any statement is false: STOP.'
print -r -- ''

read -r 'R11_CONFIRM?Type exactly EXECUTE EXACT ONE FINAL R11 PRODUCTION ATTEMPT, or press Return to stop: '
[[ "$R11_CONFIRM" == 'EXECUTE EXACT ONE FINAL R11 PRODUCTION ATTEMPT' ]] || { print -r -- 'STOP: production controller not launched'; exit 1; }

print -r -- '>>> PRODUCTION MUTATION BEGINS HERE <<<'
set +e
node "$R11_CONTROLLER" --evidence="$R11_EVIDENCE" --owner-authorization=FLAGSTONE-P03B-R8-PRODUCTION-APPLY
R11_CONTROLLER_EXIT=$?
set -e

print -r -- "Controller numeric exit: $R11_CONTROLLER_EXIT"
print -r -- 'DO NOT RETRY. Preserve the complete evidence root for owner adjudication or independent review.'
if [[ -f "$R11_EVIDENCE/07-final/FINAL_RECEIPT.json" ]]; then
  jq '{packetVersion,target,candidate,candidateTree,runId,controllerPid,controllerState,result,migrationTransport,productionInnerApplyCommand,automaticRetryAuthorized,automaticDestructiveRollbackAuthorized,interrupted,entryClientOutcome,maximumQuiescenceEscalationReached,maximumQuiescenceLatch,workdirDestroyed,error,adjudicationError,steps}' "$R11_EVIDENCE/07-final/FINAL_RECEIPT.json"
else
  print -r -- 'FINAL_RECEIPT.json is missing. STOP. DO NOT RETRY.'
fi

if (( R11_CONTROLLER_EXIT != 0 )); then
  exit "$R11_CONTROLLER_EXIT"
fi

jq -e '.packetVersion == "R8" and .target == "kldlwszpfkdmsjrjhjym" and .candidate == "9d638456fa8e679678c54f131fe8f0db723eda72" and .candidateTree == "cfc76206f7cf7af6a7127a6329620d2ee1dc4da8" and .controllerState == "COMPLETE" and .result == "PASS_RESTORED" and .migrationTransport == "R11_RECONCILED_HISTORY_SUPPORT_PLUS_EXACT_TWO_PENDING" and .productionInnerApplyCommand == ["supabase","db","push","--workdir","/tmp/flagstone-p03b-production-apply-9d638456","--linked","--project-ref","kldlwszpfkdmsjrjhjym","--skip-vault","--include-all","--yes","--output-format","json"] and ([.steps[] | select(.label == "02-apply/apply")] | length) == 1 and ([.steps[] | select(.label == "02-apply/pre-apply-production-ledger-read-only")] | length) == 1 and .automaticRetryAuthorized == false and .automaticDestructiveRollbackAuthorized == false and .interrupted == false and .entryClientOutcome == "ENTRY_COMMITTED_CONFIRMED" and .maximumQuiescenceEscalationReached == false and .maximumQuiescenceLatch.latched == false and .workdirDestroyed == true and .error == null and (.adjudicationError // null) == null' "$R11_EVIDENCE/07-final/FINAL_RECEIPT.json" >/dev/null
jq -e '.receipt == "phase03b_r11_production_migration_ledger_read_only" and .transaction_read_only == "on" and .ledger_count == 85 and .ledger_unique_count == 85 and .ledger_latest_version == "20260911120000" and .ledger_ordered_version_name_sha256 == "811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec" and (.rows | length) == 85' "$R11_EVIDENCE/02-apply/PRE_APPLY_PRODUCTION_MIGRATION_LEDGER.json" >/dev/null
jq -e '.status == "PASS" and .historySupportMode == "ABORT_FIRST_TRIPWIRE" and .historyLedgerSha256 == "811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec" and .historySupportCount == 85 and .pendingMigrationCount == 2 and [.pendingMigrations[].filename] == ["20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql","20260915210413_phase03b_points_integrity.sql"] and [.pendingMigrations[].sha256] == ["b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11","0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5"] and .manifest.historySupportMode == "ABORT_FIRST_TRIPWIRE" and .manifest.historySupportCount == 85 and .manifest.pendingMigrationCount == 2' "$R11_EVIDENCE/02-apply/PRE_APPLY_WORKSPACE_GUARD.json" >/dev/null
jq -e '.result == "CLIENT_EXIT_0" and .retryAllowed == false and .rollbackInferred == false and .adjudicationRequired == false' "$R11_EVIDENCE/02-apply/APPLY_OUTCOME.json" >/dev/null

R11_RUN_T0="$(jq -r '.databaseT0' "$R11_EVIDENCE/01-entry/RUN_CONTEXT.json")"
jq -e --arg t0 "$R11_RUN_T0" '.packetVersion == "R8" and .status == "ENTRY_COMMITTED_CONFIRMED" and .expected.databaseT0 == $t0 and .observed.entry.database_t0 == $t0 and .observed.immediatePostCommitProof.database_t0 == $t0 and .observed.entry.http_queue_count == 0 and .observed.entry.http_response_new_since_t0_count == 0 and .observed.immediatePostCommitProof.http_queue_count == 0 and .observed.immediatePostCommitProof.http_response_new_since_t0_count == 0' "$R11_EVIDENCE/01-entry/ENTRY_RECEIPT.json" >/dev/null
jq -e --arg t0 "$R11_RUN_T0" '.packetVersion == "R8" and .phase == "POST_APPLY_COMPARATOR" and .status == "PASS_WHILE_QUIESCED" and .numericExit == 0 and .signal == null and .timedOut == false and .expected.databaseT0 == $t0 and .observed.proof.database_t0 == $t0 and .observed.proof.ledger_count == 87 and .observed.proof.ledger_unique_count == 87 and .observed.proof.ledger_latest_version == "20260915210413" and .observed.proof.ledger_ordered_version_name_sha256 == "b9fb376947238c4bd3dc3d164337d6b9294df9084eab9008530ba9fd4d4603b5" and .observed.proof.phase03b_versions == ["20260915210256","20260915210413"] and [.observed.proof.phase03b_rows[].statement_sha256] == ["b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11","0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5"] and .observed.proof.http_queue_count == 0 and .observed.proof.http_response_new_since_t0_count == 0 and .observed.proof.pg_net_ttl_seconds > 600 and .observed.normalizedStructureSha256 == "f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7"' "$R11_EVIDENCE/04-post-apply-quiesced/comparator/POST_APPLY_VERIFIER_RECEIPT.json" >/dev/null
jq -e '.result == "PASS" and .target == "kldlwszpfkdmsjrjhjym" and .structureSha256 == "f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7" and (.exactChecks | index("grants/RLS")) != null and (.exactChecks | index("RPC/moderation/points definitions")) != null and (.exactChecks | index("photo_alt boundary")) != null and (.exactChecks | index("admin reject/restore")) != null and (.exactChecks | index("no unexpected migration/object")) != null' "$R11_EVIDENCE/04-post-apply-quiesced/comparator/POST_APPLY_COMPARISON.json" >/dev/null
jq -e '.allowed == true and .missing == []' "$R11_EVIDENCE/04-post-apply-quiesced/EXIT_ELIGIBILITY.json" >/dev/null
jq -e --arg t0 "$R11_RUN_T0" '.packetVersion == "R8" and .phase == "POST_EXIT_COMPARATOR" and .status == "PASS_RESTORED" and .numericExit == 0 and .signal == null and .timedOut == false and .expected.databaseT0 == $t0 and .observed.proof.database_t0 == $t0 and .observed.proof.function_count == 0 and .observed.proof.reserved_trigger_count == 0 and .observed.proof.ledger_count == 87 and .observed.proof.ledger_unique_count == 87 and .observed.proof.phase03b_versions == ["20260915210256","20260915210413"] and [.observed.proof.phase03b_rows[].statement_sha256] == ["b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11","0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5"] and .observed.proof.http_queue_count == 0 and .observed.proof.http_response_new_since_t0_count == 0 and .observed.proof.pg_net_ttl_seconds > 600 and .observed.normalizedStructureSha256 == "f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7"' "$R11_EVIDENCE/06-post-exit/comparator/POST_EXIT_VERIFIER_RECEIPT.json" >/dev/null
jq -e '.result == "PASS" and .state == "COMPLETE"' "$R11_EVIDENCE/06-post-exit/POST_EXIT_DISPOSITION.json" >/dev/null

(cd "$R11_EVIDENCE" && shasum -a 256 -c manifest/ARTIFACT_MANIFEST.sha256)
node "$R11_PACKET/run_live_evidence_privacy_scan.mjs" --root="$R11_EVIDENCE"
jq -e '.packetVersion == "R11" and .privacySafe == true and .matchingValuesRetained == false and .findingCount == 0 and .findings == [] and .status == "PASS"' "$R11_EVIDENCE/PRIVACY_SCAN.json" >/dev/null

print -r -- 'SUCCESS_EVIDENCE_STATUS: PASS_RESTORED'
print -r -- 'CONTROLLER_RUN_COUNT: 1'
print -r -- 'APPLY_DISPATCH_COUNT: 1'
print -r -- 'HISTORY_SUPPORT_MIGRATIONS_EXECUTED: 0'
print -r -- 'POST_APPLY_VERIFICATION_WHILE_QUIESCED: PASS'
print -r -- 'SAFE_EXIT_AND_POST_EXIT_RESTORATION: PASS'
print -r -- 'CONTROLLER_WORKDIR_DESTROYED: YES'
print -r -- 'PRIVACY_SCAN: PASS'
print -r -- 'DO NOT PUSH OR MERGE. Preserve this worktree for a genuinely fresh post-apply reviewer.'
FLAGSTONE_R11_FINAL_OWNER_RUN
```

## Failure and one-run contract

Once the controller begins, never rerun the block, the controller, the inner Supabase push, quiescence SQL, restoration SQL, gate removal, rollback, or adjudicator. A nonzero exit, timeout, signal, Terminal interruption, network failure, missing output, malformed output, local process death, missing receipt, `UNKNOWN`, or owner-required state consumes this attempt and requires new explicit owner direction. Preserve the worktree and all evidence exactly.

The controller's 600-second maximum-quiescence latch is irreversible. The runbook does not add an automatic retry, destructive rollback, manual gate removal, or second restoration dispatch.

## Success evidence retained by the block

A success claim requires the controller's exact `COMPLETE / PASS_RESTORED` final receipt, exactly one apply step, the fresh 85-row pre-apply ledger reconciliation, the `ABORT_FIRST_TRIPWIRE` workspace guard, the exact two migration statement hashes, ledger `87/87`, moderation/points/compatibility and grants/RLS comparison PASS, immutable-T0 pg_net invariants, queue zero, no new response since T0, safe exit, gate removal, post-exit restoration PASS, destroyed controller workdir, verified artifact manifest, and privacy scan PASS.

The block does not stage, commit, push, merge, or publish production evidence. A successful evidence tree must be preserved for a genuinely fresh independent post-apply reviewer.

## DECISIONS FOR SKY

- [ ] **Execute or hold the unused one-run authorization**
  - **Recommendation:** Execute only by copying the complete compact block into a fresh macOS Terminal and only if every automatic preflight passes and the checkpoint statements are all true.
  - **Why:** The repaired transport and controller are independently accepted, but the controller mutates production and any ambiguous outcome forbids retry.
  - **Alternative:** Hold. Production stays unchanged and the authorization remains unused.
  - **Impact:** Typing the exact confirmation phrase launches the only authorized R11 production attempt.

## Runbook-generation boundary

- Live target-pinned dry run during generation: `NOT_RUN`.
- Production/staging contact during generation: none.
- Controller launch during generation: none.
- Quiescence during generation: not entered.
- Production apply during generation: not executed.
- One-run authorization during generation: unused.
- Phase 03C: not started.
