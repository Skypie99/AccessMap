#!/usr/bin/env node
// Disposable, local-only executable validation of the two R6 repairs while
// preserving the accepted R5 controls.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHermeticWorkdir, inventoryWorkspace } from './build_hermetic_workdir.mjs';
import { generateEvidenceManifest } from './generate_evidence_manifest.mjs';
import {
  ESCALATED_STATE,
  EXPECTED,
  EXPECTED_FILENAMES,
  EXPECTED_GATE_IDENTITIES,
  GATE_MANIFEST_SHA256,
  assertAutomationAllowed,
  assertExactInventory,
  assertExitDispatchAllowed,
  buildEntryEnvelope,
  buildR6Envelope,
  cadenceSlot,
  classifyEntryState,
  classifyGateIdentity,
  classifyServerState,
  createDeadlines,
  createEscalationLatch,
  deriveClientOutcome,
  dispatchRestorationBeforeDeadline,
  evaluateExitEligibility,
  maxQuiescenceState,
  postExitDisposition,
  statePolicy,
  updateEscalationLatch,
  validateCadenceSample,
  validateDryRunPlan,
  validateEntryEnvelope,
  validateR6Envelope,
} from './r6_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'p03b-r6-controls-'));
const result = {
  status: 'ERROR',
  localOnly: true,
  productionInputsAccepted: false,
  checks: {},
  requiredBranchCases: {},
  newR6BranchCases: {},
  error: null,
  tempDestroyed: false,
};

function expectFailure(fn, label) {
  try { fn(); } catch { return true; }
  throw new Error(`${label} unexpectedly succeeded`);
}

function clone(value) {
  return structuredClone(value);
}

function entryFixtures() {
  const gate = EXPECTED.gate;
  const shared = {
    function_oid: 41001,
    trigger_oid: 41002,
    truncate_trigger_oid: 41003,
    table_oid: 40999,
    function_owner: gate.functionOwner,
    trigger_table_owner: gate.tableOwner,
    function_definition_sha256: gate.functionDefinitionSha256,
    trigger_definition_sha256: gate.rowTriggerDefinitionSha256,
    truncate_trigger_definition_sha256: gate.truncateTriggerDefinitionSha256,
    trigger_enabled: gate.enableState,
    truncate_trigger_enabled: gate.enableState,
    flags_id_status_count: 21,
    flags_id_status_sha256: '5'.repeat(64),
    history_count: 37,
    history_sha256: '4'.repeat(64),
    ledger_count: EXPECTED.baseline.ledgerCount,
    ledger_unique_count: EXPECTED.baseline.ledgerUniqueCount,
    ledger_latest_version: EXPECTED.baseline.ledgerLatestVersion,
    ledger_ordered_version_name_sha256: EXPECTED.baseline.ledgerSha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount,
    http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  };
  const entry = {
    ...shared,
    receipt: 'phase03b_quiescence_entry_r3',
    phase03b_ledger_count: 0,
    boundary_at_utc: '2026-09-17T18:00:00.000000Z',
    transaction_id: 12345,
    backend_pid: 54321,
    lock_acquisition_started_at_utc: '2026-09-17T17:59:59.900000Z',
    lock_acquisition_ended_at_utc: '2026-09-17T18:00:00.000000Z',
    lock_wait_ms: 100,
    pre_install_flags_id_status_count: shared.flags_id_status_count,
    pre_install_flags_id_status_sha256: shared.flags_id_status_sha256,
    pre_install_history_count: shared.history_count,
    pre_install_history_sha256: shared.history_sha256,
  };
  const proof = {
    ...shared,
    receipt: 'phase03b_quiescence_proof_r3',
    transaction_read_only: 'on',
    function_count: 1,
    trigger_count: 1,
    truncate_trigger_count: 1,
    phase03b_versions: [],
    phase03b_rows: [],
  };
  return { entry, proof };
}

function exactGateSnapshot() {
  const [fn, rowTrigger, truncateTrigger] = EXPECTED_GATE_IDENTITIES.objects;
  return {
    querySucceeded: true,
    receipt: 'phase03b_server_state_r6',
    transaction_read_only: 'on',
    table_oid: 40999,
    table_schema: EXPECTED_GATE_IDENTITIES.table.schema,
    table_name: EXPECTED_GATE_IDENTITIES.table.name,
    table_owner: EXPECTED_GATE_IDENTITIES.table.owner,
    function_count: 1,
    function_oid: 41001,
    function_schema: fn.schema,
    function_name: fn.name,
    function_identity_arguments: fn.identityArguments,
    function_owner: fn.owner,
    function_language: fn.language,
    function_security_definer: fn.securityDefiner,
    function_volatility: fn.volatility,
    function_definition_sha256: fn.normalizedDefinitionSha256,
    row_trigger_count: 1,
    row_trigger_oid: 41002,
    row_trigger_schema: rowTrigger.schema,
    row_trigger_table: rowTrigger.table,
    row_trigger_table_oid: 40999,
    row_trigger_table_owner: rowTrigger.tableOwner,
    row_trigger_name: rowTrigger.name,
    row_trigger_enabled: rowTrigger.enabled,
    row_trigger_tgtype: rowTrigger.tgType,
    row_trigger_timing: rowTrigger.timing,
    row_trigger_level: rowTrigger.level,
    row_trigger_events: rowTrigger.events,
    row_trigger_update_columns: rowTrigger.updateColumns,
    row_trigger_function_oid: 41001,
    row_trigger_function_identity: rowTrigger.referencedFunction,
    row_trigger_definition_sha256: rowTrigger.normalizedDefinitionSha256,
    truncate_trigger_count: 1,
    truncate_trigger_oid: 41003,
    truncate_trigger_schema: truncateTrigger.schema,
    truncate_trigger_table: truncateTrigger.table,
    truncate_trigger_table_oid: 40999,
    truncate_trigger_table_owner: truncateTrigger.tableOwner,
    truncate_trigger_name: truncateTrigger.name,
    truncate_trigger_enabled: truncateTrigger.enabled,
    truncate_trigger_tgtype: truncateTrigger.tgType,
    truncate_trigger_timing: truncateTrigger.timing,
    truncate_trigger_level: truncateTrigger.level,
    truncate_trigger_events: truncateTrigger.events,
    truncate_trigger_update_columns: truncateTrigger.updateColumns,
    truncate_trigger_function_oid: 41001,
    truncate_trigger_function_identity: truncateTrigger.referencedFunction,
    truncate_trigger_definition_sha256: truncateTrigger.normalizedDefinitionSha256,
    candidate_backends: [],
    ledger_count: EXPECTED.baseline.ledgerCount,
    ledger_unique_count: EXPECTED.baseline.ledgerUniqueCount,
    phase03b_versions: [],
  };
}

function comparatorEnvelope(phase, status, entryEnvelope) {
  const isPostApply = phase === 'POST_APPLY_COMPARATOR';
  const successStep = (command) => isPostApply ? {
    command, childPid: process.pid, startedAt: '2026-09-17T18:00:00.600Z', endedAt: '2026-09-17T18:00:00.700Z',
    timeoutMs: 60_000, timedOut: false, exitCode: 0, signal: null, error: null,
    stdoutPath: join(temp, 'stdout.log'), stderrPath: join(temp, 'stderr.log'),
  } : {
    command, startedAt: '2026-09-17T18:00:00.600Z', endedAt: '2026-09-17T18:00:00.700Z',
    exitCode: 0, signal: null, timedOut: false,
  };
  const migrationRows = EXPECTED.migrations.map((migration) => ({
    version: migration.version,
    name: migration.filename.replace(/^\d{14}_/, '').replace(/\.sql$/, ''),
    statement_count: 1,
    statement_sha256: migration.sha256,
  }));
  const sharedProof = {
    receipt: isPostApply ? 'phase03b_quiescence_proof_r3' : 'phase03b_post_exit_proof_r3',
    transaction_read_only: 'on', captured_at_utc: '2026-09-17T18:00:00.650Z',
    flags_id_status_count: entryEnvelope.observed.entry.flags_id_status_count,
    flags_id_status_sha256: entryEnvelope.observed.entry.flags_id_status_sha256,
    history_count: entryEnvelope.observed.entry.history_count,
    history_sha256: entryEnvelope.observed.entry.history_sha256,
    ledger_count: EXPECTED.final.ledgerCount, ledger_unique_count: EXPECTED.final.ledgerUniqueCount,
    ledger_latest_version: EXPECTED.final.ledgerLatestVersion,
    ledger_ordered_version_name_sha256: EXPECTED.final.ledgerSha256,
    phase03b_versions: EXPECTED.migrations.map((migration) => migration.version),
    phase03b_rows: migrationRows,
    phase03b_constraint_index_sha256: EXPECTED.final.phase03bConstraintIndexSha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount,
    http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  };
  const proof = isPostApply ? {
    ...sharedProof,
    backend_pid: 54321,
    table_oid: entryEnvelope.observed.entry.table_oid,
    function_count: 1,
    function_oid: entryEnvelope.observed.entry.function_oid,
    function_owner: EXPECTED.gate.functionOwner,
    function_execute_grants: [],
    function_definition_sha256: EXPECTED.gate.functionDefinitionSha256,
    trigger_count: 1,
    trigger_oid: entryEnvelope.observed.entry.trigger_oid,
    trigger_table_owner: EXPECTED.gate.tableOwner,
    trigger_enabled: EXPECTED.gate.enableState,
    trigger_definition_sha256: EXPECTED.gate.rowTriggerDefinitionSha256,
    truncate_trigger_count: 1,
    truncate_trigger_oid: entryEnvelope.observed.entry.truncate_trigger_oid,
    truncate_trigger_table_oid: entryEnvelope.observed.entry.table_oid,
    truncate_trigger_enabled: EXPECTED.gate.enableState,
    truncate_trigger_definition_sha256: EXPECTED.gate.truncateTriggerDefinitionSha256,
  } : {
    ...sharedProof,
    function_count: 0,
    reserved_trigger_count: 0,
  };
  const steps = isPostApply ? [
    successStep(['supabase', 'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql'), '--output-format', 'json']),
    successStep(['supabase', 'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget, '--file', join(temp, 'STRUCTURAL_CAPTURE_READ_ONLY.sql'), '--output-format', 'json']),
    successStep(['supabase', 'functions', 'list', '--project-ref', EXPECTED.productionTarget, '--output-format', 'json']),
  ] : [
    successStep(['supabase', 'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget, '--file', join(PACKET, 'POST_EXIT_VERIFY.sql'), '--output-format', 'json']),
    successStep(['supabase', 'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget, '--file', join(temp, 'STRUCTURAL_CAPTURE_READ_ONLY.sql'), '--output-format', 'json']),
    successStep(['supabase', 'functions', 'list', '--project-ref', EXPECTED.productionTarget, '--output-format', 'json']),
  ];
  return buildR6Envelope({
    runId: entryEnvelope.runId,
    controllerPid: entryEnvelope.controllerPid,
    controllerMonotonicOrigin: entryEnvelope.controllerMonotonicOrigin,
    phase,
    expected: {
      result: status,
      gateManifestSha256: GATE_MANIFEST_SHA256,
      finalLedgerSha256: EXPECTED.final.ledgerSha256,
      finalStructureSha256: EXPECTED.final.normalizedStructureSha256,
      httpResponseSha256: EXPECTED.baseline.httpResponseSha256,
    },
    observed: { proof, normalizedStructureSha256: EXPECTED.final.normalizedStructureSha256, steps },
    status,
    capturedAtUtc: '2026-09-17T18:00:01.000Z',
    capturedAtMonotonic: entryEnvelope.controllerMonotonicOrigin + (isPostApply ? 300 : 400),
    numericExit: 0,
  });
}

async function captureDetachedChild() {
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 25)'], { detached: true, stdio: 'ignore' });
  const receipt = { childPid: child.pid, processGroupId: child.pid };
  const exitCode = await new Promise((resolvePromise) => child.once('exit', resolvePromise));
  return { ...receipt, exitCode };
}

try {
  const workspace = join(temp, 'hermetic');
  const built = buildHermeticWorkdir(workspace);
  result.checks.hermeticWorkdirExactlyTwo = assertExactInventory(built.inventory);
  result.checks.migrationFileCountEqualsTwo = built.inventory.migrationFileCount === 2;
  result.checks.exactMigrationSetAndHashes = built.inventory.files.every((file, index) =>
    file.filename === EXPECTED.migrations[index].filename && file.sha256 === EXPECTED.migrations[index].sha256);
  writeFileSync(join(workspace, 'supabase/migrations/20260915210300_unexpected.sql'), 'select 1;\n');
  result.checks.extraMigrationHardFails = expectFailure(() => inventoryWorkspace(workspace), 'third migration inventory');
  rmSync(join(workspace, 'supabase/migrations/20260915210300_unexpected.sql'));
  const exactPlan = { upToDate: false, dryRun: true, migrations: EXPECTED_FILENAMES, seeds: [], roles: [] };
  result.checks.exactPlanGuardPassesPair = validateDryRunPlan(exactPlan);
  result.checks.exactPlanGuardRejectsExtra = expectFailure(() => validateDryRunPlan({ ...exactPlan, migrations: [...exactPlan.migrations, '20260915210300_unexpected.sql'] }), 'extra dry-run migration');

  const origin = 1_000_000;
  const deadlines = createDeadlines(origin);
  result.checks.deadlinesUseOneOriginAndAreImmutable = Object.isFrozen(deadlines) &&
    deadlines.entryCompleteMonoMs === origin + 30_000 && deadlines.applyCompleteMonoMs === origin + 180_000 &&
    deadlines.postApplyVerificationCompleteMonoMs === origin + 480_000 && deadlines.maximumQuiescenceEscalationMonoMs === origin + 600_000;
  const first = { ...cadenceSlot(origin, 1), actualStartMonoMs: origin + 5_050 };
  const second = { ...cadenceSlot(origin, 2), actualStartMonoMs: origin + 10_040 };
  result.checks.monitoringUsesAnchoredFiveSecondSlots = validateCadenceSample(null, first) && validateCadenceSample(first, second);
  result.checks.missedCadenceHardFails = expectFailure(() => validateCadenceSample(first, { ...cadenceSlot(origin, 3), actualStartMonoMs: origin + 15_010 }), 'skipped monitor slot');
  const child = await captureDetachedChild();
  result.checks.childPidAndProcessGroupCaptured = Number.isSafeInteger(child.childPid) && child.childPid > 0 && child.processGroupId === child.childPid && child.exitCode === 0;
  const unknown = deriveClientOutcome({ timedOut: true, exitCode: null, exitSignal: 'SIGINT', spawnError: null });
  result.checks.timeoutIsUnknownNotRollback = unknown.result === 'UNKNOWN' && unknown.rollbackInferred === false && unknown.retryAllowed === false && unknown.adjudicationRequired === true;

  const { entry, proof } = entryFixtures();
  const runId = '00000000-0000-4000-8000-000000000005';
  const envelope = buildEntryEnvelope({
    entry, proof, inventory: built.inventory, deadlines, controllerPid: process.pid, runId,
    entryStep: { exitCode: 0, childPid: process.pid }, proofStep: { exitCode: 0, childPid: process.pid },
    capturedAtUtc: '2026-09-17T18:00:00.500Z', capturedAtMonotonic: origin + 200,
  });

  const variants = {
    case01ExactR6EnvelopeAccepted: () => validateEntryEnvelope(envelope),
    case02BareScalarRejected: () => expectFailure(() => validateR6Envelope(7), 'bare scalar'),
    case03BareHashRejected: () => expectFailure(() => validateR6Envelope('a'.repeat(64)), 'bare hash'),
    case04EmptyObjectRejected: () => expectFailure(() => validateR6Envelope({}), 'empty object'),
    case05R4EnvelopeRejected: () => { const value = clone(envelope); value.packetVersion = 'R4'; return expectFailure(() => validateR6Envelope(value), 'R4 envelope'); },
    case06UnversionedEnvelopeRejected: () => { const value = clone(envelope); delete value.packetVersion; return expectFailure(() => validateR6Envelope(value), 'unversioned envelope'); },
    case07MissingCandidateShaRejected: () => { const value = clone(envelope); delete value.candidateSha; return expectFailure(() => validateR6Envelope(value), 'missing candidateSha'); },
    case08WrongCandidateShaRejected: () => { const value = clone(envelope); value.candidateSha = '0'.repeat(40); return expectFailure(() => validateR6Envelope(value), 'wrong candidateSha'); },
    case09WrongCandidateTreeRejected: () => { const value = clone(envelope); value.candidateTree = '0'.repeat(40); return expectFailure(() => validateR6Envelope(value), 'wrong candidateTree'); },
    case10WrongProductionTargetRejected: () => { const value = clone(envelope); value.productionTarget = EXPECTED.forbiddenStagingTarget; return expectFailure(() => validateR6Envelope(value), 'wrong production target'); },
    case11MissingRunIdRejected: () => { const value = clone(envelope); delete value.runId; return expectFailure(() => validateR6Envelope(value), 'missing runId'); },
    case12MissingMonotonicTimestampRejected: () => { const value = clone(envelope); delete value.capturedAtMonotonic; return expectFailure(() => validateR6Envelope(value), 'missing monotonic timestamp'); },
    case13MissingNumericExitRejected: () => { const value = clone(envelope); delete value.numericExit; return expectFailure(() => validateR6Envelope(value), 'missing numeric exit'); },
    case14MalformedStatusRejected: () => { const value = clone(envelope); value.status = 'MAYBE'; return expectFailure(() => validateR6Envelope(value), 'malformed status'); },
    case15UnknownSchemaVersionRejected: () => { const value = clone(envelope); value.schemaVersion = 'legacy'; return expectFailure(() => validateR6Envelope(value), 'unknown schema'); },
    case16UnexpectedLegacyAliasRejected: () => { const value = clone(envelope); value.phase03b_quiescence_entry_r3 = value.observed.entry; return expectFailure(() => validateR6Envelope(value), 'legacy alias'); },
  };
  for (const [name, test] of Object.entries(variants)) result.requiredBranchCases[name] = test() === true;

  result.checks.entryReceiptGeneratedFromCapturedArtifacts = envelope.status === 'ENTRY_COMMITTED_CONFIRMED' &&
    envelope.observed.rawCapture.entryStep.exitCode === 0 && envelope.observed.rawCapture.proofStep.exitCode === 0;
  const entryPath = join(temp, 'ENTRY_RECEIPT.json');
  const exitPath = join(temp, 'EXIT.sql');
  writeFileSync(entryPath, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });
  const generator = spawnSync(process.execPath, [join(PACKET, 'generate_exit_sql.mjs'), `--entry=${entryPath}`, `--output=${exitPath}`], { encoding: 'utf8' });
  result.checks.strictEnvelopeGeneratesExitSql = generator.status === 0 && existsSync(exitPath) && !/__([A-Z0-9_]+)__/.test(readFileSync(exitPath, 'utf8'));

  const legacyPath = join(temp, 'LEGACY_ENTRY.json');
  writeFileSync(legacyPath, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  const legacyGenerator = spawnSync(process.execPath, [join(PACKET, 'generate_exit_sql.mjs'), `--entry=${legacyPath}`, `--output=${join(temp, 'BAD_EXIT.sql')}`], { encoding: 'utf8' });
  const badPostApplyEvidence = join(temp, 'bad-post-apply');
  const badPostApply = spawnSync(process.execPath, [join(PACKET, 'verify_post_apply.mjs'), `--entry=${legacyPath}`, `--evidence=${badPostApplyEvidence}`], { encoding: 'utf8' });
  const badPostExitEvidence = join(temp, 'bad-post-exit');
  const badPostExit = spawnSync(process.execPath, [join(PACKET, 'verify_post_exit.mjs'), `--entry=${legacyPath}`, `--evidence=${badPostExitEvidence}`], { encoding: 'utf8' });
  result.checks.exitGeneratorRejectsLegacyBareReceipt = legacyGenerator.status !== 0;
  result.checks.postApplyRejectsLegacyBeforeNetwork = badPostApply.status !== 0 && !existsSync(badPostApplyEvidence);
  result.checks.postExitRejectsLegacyBeforeNetwork = badPostExit.status !== 0 && !existsSync(badPostExitEvidence);

  const exactSnapshot = exactGateSnapshot();
  const absentSnapshot = { ...exactSnapshot, function_count: 0, row_trigger_count: 0, truncate_trigger_count: 0 };
  const partialSnapshot = { ...exactSnapshot, truncate_trigger_count: 0 };
  const wrongFunctionHash = { ...exactSnapshot, function_definition_sha256: '0'.repeat(64) };
  const wrongRowTriggerHash = { ...exactSnapshot, row_trigger_definition_sha256: '0'.repeat(64) };
  const wrongOwner = { ...exactSnapshot, function_owner: 'not_postgres' };
  const wrongEnable = { ...exactSnapshot, truncate_trigger_enabled: 'O' };
  result.requiredBranchCases.case17EntryHelperSuccessCommitted = envelope.status === 'ENTRY_COMMITTED_CONFIRMED';
  result.requiredBranchCases.case18ExplicitRollbackGateAbsent = classifyEntryState(absentSnapshot).classification === 'ENTRY_CONFIRMED_NOT_COMMITTED';
  result.requiredBranchCases.case19LostOutputExactGatePresentCommitted = classifyEntryState(exactSnapshot).classification === 'ENTRY_COMMITTED_CONFIRMED';
  result.requiredBranchCases.case20LostOutputGateAbsentConfirmedNotCommitted = classifyEntryState(absentSnapshot).classification === 'ENTRY_CONFIRMED_NOT_COMMITTED';
  result.requiredBranchCases.case21PartialGateOwnerRequired = classifyEntryState(partialSnapshot).classification === 'OWNER_REQUIRED_FAIL_CLOSED';
  result.requiredBranchCases.case22GateHashMismatchOwnerRequired = classifyEntryState(wrongFunctionHash).classification === 'OWNER_REQUIRED_FAIL_CLOSED';
  result.requiredBranchCases.case23WrongFunctionHashMismatch = classifyGateIdentity(wrongFunctionHash).state === 'GATE_PRESENT_MISMATCH';
  result.requiredBranchCases.case24WrongTriggerHashMismatch = classifyGateIdentity(wrongRowTriggerHash).state === 'GATE_PRESENT_MISMATCH';
  result.requiredBranchCases.case25WrongOwnerMismatch = classifyGateIdentity(wrongOwner).state === 'GATE_PRESENT_MISMATCH';
  result.requiredBranchCases.case26WrongEnableStateMismatch = classifyGateIdentity(wrongEnable).state === 'GATE_PRESENT_MISMATCH';
  result.requiredBranchCases.case27ExactObjectsClassifyExact = classifyGateIdentity(exactSnapshot, entry).state === 'GATE_PRESENT_EXACT';
  result.checks.classifierRejectsReferencedFunctionOidMismatch = classifyGateIdentity({ ...exactSnapshot, row_trigger_function_oid: 99999 }).state === 'GATE_PRESENT_MISMATCH';
  result.checks.classifierRejectsTableOidRelationshipMismatch = classifyGateIdentity({ ...exactSnapshot, truncate_trigger_table_oid: 99999 }).state === 'GATE_PRESENT_MISMATCH';
  result.checks.classifierRejectsTriggerTimingMismatch = classifyGateIdentity({ ...exactSnapshot, row_trigger_timing: 'AFTER' }).state === 'GATE_PRESENT_MISMATCH';

  const exactPass = {
    postApplyVerificationPass: true, primaryInvariantPass: true, historyCorroborationPass: true,
    httpBaselinePass: true, gateIdentityPass: true, ledgerExactExpected: true,
    structureExactExpected: true, noUnknownState: true, withinMaximumQuiescence: true,
    noEscalationLatch: true,
  };
  const dispatchPredicates = (escalationLatch) => ({
    controllerState: 'VERIFIED_SAFE_TO_EXIT', escalationLatch, allComparatorsPass: true,
    primaryInvariantPass: true, historyCorroborationPass: true, httpBaselinePass: true,
    noUnknownState: true, gateIdentityExact: true, noInvalidEnvelope: true,
    currentRunMatchesEvidence: true,
  });
  const beforeLatch = createEscalationLatch();
  const allowedAt599999 = assertExitDispatchAllowed({
    ...dispatchPredicates(beforeLatch),
    nowMonoMs: origin + 599_999, maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs,
  });
  result.requiredBranchCases.case28ExitAt599999Allowed = allowedAt599999 && !beforeLatch.latched;
  const boundaryLatch = createEscalationLatch();
  result.requiredBranchCases.case29Cross600BeforeDispatchBlocked = expectFailure(() => assertExitDispatchAllowed({
    ...dispatchPredicates(boundaryLatch),
    nowMonoMs: origin + 600_000, maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs,
  }), 'dispatch at hard boundary') && boundaryLatch.latched;
  const delayedLatch = createEscalationLatch();
  assertExitDispatchAllowed({
    ...dispatchPredicates(delayedLatch),
    nowMonoMs: origin + 590_000, maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs,
  });
  result.requiredBranchCases.case30SafeAt590DispatchAt601Blocked = expectFailure(() => assertExitDispatchAllowed({
    ...dispatchPredicates(delayedLatch),
    nowMonoMs: origin + 601_000, maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs,
  }), 'delayed dispatch after hard boundary') && delayedLatch.latched;
  updateEscalationLatch(delayedLatch, origin + 602_000, deadlines.maximumQuiescenceEscalationMonoMs);
  result.checks.escalationLatchIrreversibleAfterLaterPass = delayedLatch.latched && delayedLatch.state === ESCALATED_STATE;
  result.checks.automaticRestorationCannotClearLatch = expectFailure(() => assertAutomationAllowed(delayedLatch, 'automatic restoration'), 'automatic restoration');
  result.checks.automaticRetryCannotClearLatch = expectFailure(() => assertAutomationAllowed(delayedLatch, 'automatic retry'), 'automatic retry');
  result.checks.maxQuiescenceUsesExactHardState = maxQuiescenceState(600_000) === ESCALATED_STATE &&
    statePolicy(ESCALATED_STATE).restoration_allowed === false;

  result.checks.invalidComparatorPreventsExit = evaluateExitEligibility({ ...exactPass, postApplyVerificationPass: false }).allowed === false;
  result.checks.unknownStatePreventsExit = evaluateExitEligibility({ ...exactPass, noUnknownState: false }).allowed === false;
  result.checks.maxQuiescencePreventsExit = evaluateExitEligibility({ ...exactPass, noEscalationLatch: false }).allowed === false;
  result.checks.exitAllowedOnlyAfterExactPass = evaluateExitEligibility(exactPass).allowed === true;
  const postApplyEnvelope = comparatorEnvelope('POST_APPLY_COMPARATOR', 'PASS_WHILE_QUIESCED', envelope);
  const postExitEnvelope = comparatorEnvelope('POST_EXIT_COMPARATOR', 'PASS_RESTORED', envelope);
  const comparatorConstraints = { runId, controllerPid: process.pid, controllerMonotonicOrigin: origin, entryEnvelope: envelope };
  const rejectPostApply = (value, label) => expectFailure(() => validateR6Envelope(value, {
    phase: 'POST_APPLY_COMPARATOR', ...comparatorConstraints,
  }), label);
  result.checks.strictEnvelopeUsedPostApply = validateR6Envelope(postApplyEnvelope, { phase: 'POST_APPLY_COMPARATOR', ...comparatorConstraints });
  result.checks.strictEnvelopeUsedPostExit = validateR6Envelope(postExitEnvelope, { phase: 'POST_EXIT_COMPARATOR', ...comparatorConstraints });
  result.checks.postExitStrictPassAccepted = postExitDisposition(
    { timedOut: false, exitCode: 0, exitSignal: null, spawnError: null }, postExitEnvelope, comparatorConstraints,
  ).result === 'PASS';
  result.checks.postExitLegacyRejected = postExitDisposition({ timedOut: false, exitCode: 0, exitSignal: null, spawnError: null }, { result: 'PASS_RESTORED' }, { runId }).result === 'HOLD';

  const d1 = result.newR6BranchCases;
  d1.d1_01_exactR6EnvelopeAccepted = validateR6Envelope(postApplyEnvelope, { phase: 'POST_APPLY_COMPARATOR', ...comparatorConstraints });
  d1.d1_02_r5EnvelopeRejected = (() => { const value = clone(postApplyEnvelope); value.packetVersion = 'R5'; return rejectPostApply(value, 'R5 runtime envelope'); })();
  d1.d1_03_r4EnvelopeRejected = (() => { const value = clone(postApplyEnvelope); value.packetVersion = 'R4'; return rejectPostApply(value, 'R4 runtime envelope'); })();
  d1.d1_04_bareScalarRejected = expectFailure(() => validateR6Envelope(0), 'bare scalar');
  d1.d1_05_bareHashRejected = expectFailure(() => validateR6Envelope('0'.repeat(64)), 'bare hash');
  d1.d1_06_missingRequiredTopLevelKeyRejected = (() => { const value = clone(postApplyEnvelope); delete value.signal; return rejectPostApply(value, 'missing signal'); })();
  d1.d1_07_unknownExtraTopLevelKeyRejected = (() => { const value = clone(postApplyEnvelope); value.legacyResult = 'PASS'; return rejectPostApply(value, 'extra top-level key'); })();
  d1.d1_08_wrongSchemaVersionRejected = (() => { const value = clone(postApplyEnvelope); value.schemaVersion = 'legacy'; return rejectPostApply(value, 'wrong schema'); })();
  d1.d1_09_wrongPacketVersionRejected = (() => { const value = clone(postApplyEnvelope); value.packetVersion = 'R7'; return rejectPostApply(value, 'wrong packet'); })();
  d1.d1_10_wrongCandidateShaRejected = (() => { const value = clone(postApplyEnvelope); value.candidateSha = '0'.repeat(40); return rejectPostApply(value, 'wrong candidate SHA'); })();
  d1.d1_11_wrongCandidateTreeRejected = (() => { const value = clone(postApplyEnvelope); value.candidateTree = '0'.repeat(40); return rejectPostApply(value, 'wrong candidate tree'); })();
  d1.d1_12_wrongProductionTargetRejected = (() => { const value = clone(postApplyEnvelope); value.productionTarget = EXPECTED.forbiddenStagingTarget; return rejectPostApply(value, 'wrong production target'); })();
  d1.d1_13_wrongRunIdRejected = (() => { const value = clone(postApplyEnvelope); value.runId = '00000000-0000-4000-8000-000000000006'; return rejectPostApply(value, 'wrong runId'); })();
  d1.d1_14_missingNumericExitRejected = (() => { const value = clone(postApplyEnvelope); delete value.numericExit; return rejectPostApply(value, 'missing numericExit'); })();
  d1.d1_15_stringNumericExitRejected = (() => { const value = clone(postApplyEnvelope); value.numericExit = '0'; return rejectPostApply(value, 'string numericExit'); })();
  d1.d1_16_unknownStatusRejected = (() => { const value = clone(postApplyEnvelope); value.status = 'PASS'; return rejectPostApply(value, 'unknown status'); })();
  d1.d1_17_nestedExtraKeyRejected = (() => { const value = clone(postApplyEnvelope); value.observed.proof.legacyDigest = '0'.repeat(64); return rejectPostApply(value, 'nested extra key'); })();
  d1.d1_18_producerVersionMismatchRejected = (() => { const value = clone(postApplyEnvelope); value.producerVersion = 'flagstone.phase03b.packet-r5.v1'; return rejectPostApply(value, 'producer version mismatch'); })();
  d1.d1_19_rawParsedButInvalidCannotDriveControlFlow = (() => {
    const value = JSON.parse(JSON.stringify(postExitEnvelope)); value.observed.proof = null;
    return postExitDisposition({ timedOut: false, exitCode: 0, exitSignal: null, spawnError: null }, value, comparatorConstraints).result === 'HOLD';
  })();
  d1.d1_20_allSafetyConsumersFailClosed = (() => {
    const value = clone(postApplyEnvelope); value.observed.normalizedStructureSha256 = '0'.repeat(64);
    return rejectPostApply(value, 'invalid comparator at controller boundary') &&
      postExitDisposition({ timedOut: false, exitCode: 0, exitSignal: null, spawnError: null }, { result: 'PASS_RESTORED' }, comparatorConstraints).result === 'HOLD';
  })();
  d1.d1_21_nullProofRejected = (() => { const value = clone(postApplyEnvelope); value.observed.proof = null; return rejectPostApply(value, 'null proof'); })();
  d1.d1_22_emptyProofRejected = (() => { const value = clone(postApplyEnvelope); value.observed.proof = {}; return rejectPostApply(value, 'empty proof'); })();
  d1.d1_23_wrongFinalDigestsRejected = ['finalLedgerSha256', 'finalStructureSha256', 'httpResponseSha256'].every((key) => {
    const value = clone(postApplyEnvelope); value.expected[key] = '0'.repeat(64); return rejectPostApply(value, `wrong ${key}`);
  });
  d1.d1_24_contradictoryStatusAndProofRejected = (() => { const value = clone(postApplyEnvelope); value.numericExit = 1; return rejectPostApply(value, 'contradictory pass'); })();
  d1.d1_25_malformedStepsRejected = (() => { const value = clone(postApplyEnvelope); value.observed.steps[0].extra = true; return rejectPostApply(value, 'malformed steps'); })();

  const d2 = result.newR6BranchCases;
  let spawnCount = 0;
  const inFlightLatch = createEscalationLatch();
  const allowedDispatch = dispatchRestorationBeforeDeadline({
    ...dispatchPredicates(inFlightLatch), nowMonoMs: () => origin + 599_000,
    maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs, spawnChild: () => { spawnCount += 1; return { pid: 70001 }; },
  });
  d2.d2_01_safeExitAt599Allowed = allowedDispatch.dispatchedAtMonoMs === origin + 599_000 && spawnCount === 1;
  const delayedDispatchLatch = createEscalationLatch();
  assertExitDispatchAllowed({ ...dispatchPredicates(delayedDispatchLatch), nowMonoMs: origin + 590_000, maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs });
  d2.d2_02_safeAt590DispatchAt601Blocked = expectFailure(() => dispatchRestorationBeforeDeadline({
    ...dispatchPredicates(delayedDispatchLatch), nowMonoMs: () => origin + 601_000,
    maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs, spawnChild: () => { spawnCount += 1; },
  }), 'integrated delayed dispatch');
  const crossingLatch = createEscalationLatch();
  assertExitDispatchAllowed({ ...dispatchPredicates(crossingLatch), nowMonoMs: origin + 599_900, maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs });
  d2.d2_03_crossBeforeSideEffectBlocked = expectFailure(() => dispatchRestorationBeforeDeadline({
    ...dispatchPredicates(crossingLatch), nowMonoMs: () => origin + 600_000,
    maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs, spawnChild: () => { spawnCount += 1; },
  }), 'clock crossing before side effect');
  const irreversibleLatch = createEscalationLatch();
  updateEscalationLatch(irreversibleLatch, origin + 600_000, deadlines.maximumQuiescenceEscalationMonoMs);
  updateEscalationLatch(irreversibleLatch, origin + 1, deadlines.maximumQuiescenceEscalationMonoMs);
  d2.d2_04_latchAt600Irreversible = irreversibleLatch.latched && irreversibleLatch.state === ESCALATED_STATE;
  d2.d2_05_laterComparatorPassCannotClear = expectFailure(() => assertExitDispatchAllowed({
    ...dispatchPredicates(irreversibleLatch), nowMonoMs: origin + 590_000, maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs,
  }), 'later comparator pass');
  d2.d2_06_laterServerClassifierPassCannotClear = classifyServerState({
    ...exactSnapshot, ledger_count: EXPECTED.final.ledgerCount, ledger_unique_count: EXPECTED.final.ledgerUniqueCount,
    phase03b_versions: EXPECTED.migrations.map((migration) => migration.version), structureExact: true,
  }, { applySpawned: true, gateState: 'GATE_PRESENT_EXACT' }) === 'BOTH_RECORDED_EXPECTED_STRUCTURE' && irreversibleLatch.latched;
  d2.d2_07_automaticRetryBlocked = expectFailure(() => assertAutomationAllowed(irreversibleLatch, 'automatic retry'), 'automatic retry after latch');
  d2.d2_08_automaticRollbackBlocked = expectFailure(() => assertAutomationAllowed(irreversibleLatch, 'automatic rollback'), 'automatic rollback after latch');

  result.checks.classifierZeroRows = classifyServerState(exactSnapshot, { applySpawned: true, gateState: 'GATE_PRESENT_EXACT' }) === 'NO_PHASE03B_LEDGER_ROWS';
  result.checks.classifierMigrationOneOnly = classifyServerState({ ...exactSnapshot, ledger_count: 86, ledger_unique_count: 86, phase03b_versions: [EXPECTED.migrations[0].version] }, { applySpawned: true, gateState: 'GATE_PRESENT_EXACT' }) === 'MIGRATION_1_ONLY';
  result.checks.classifierBothRecorded = classifyServerState({ ...exactSnapshot, ledger_count: 87, ledger_unique_count: 87, phase03b_versions: EXPECTED.migrations.map((migration) => migration.version) }, { applySpawned: true, gateState: 'GATE_PRESENT_EXACT' }) === 'BOTH_MIGRATIONS_RECORDED';
  result.checks.classifierGateMismatchRoutesHold = classifyServerState(wrongFunctionHash, { applySpawned: true }) === 'QUIESCENCE_IDENTITY_MISMATCH';
  result.checks.partialMatrixRoutesHashMismatch = statePolicy('QUIESCENCE_IDENTITY_MISMATCH').owner_required === true && statePolicy('QUIESCENCE_IDENTITY_MISMATCH').restoration_allowed === false;
  result.checks.stateMatrixForbidsRetryAndAutomaticRollback = statePolicy('MIGRATION_1_ONLY').retry_allowed === false && statePolicy('MIGRATION_1_ONLY').rollback_automatic === false;
  result.checks.gateManifestPinsAllThreeObjects = EXPECTED_GATE_IDENTITIES.objects.length === 3 && EXPECTED_GATE_IDENTITIES.objects.every((object) => /^[0-9a-f]{64}$/.test(object.normalizedDefinitionSha256));

  const controllerSource = readFileSync(join(PACKET, 'execute_cutover_controller.mjs'), 'utf8');
  result.checks.controllerSupportsReceiptFreeAdjudication = controllerSource.includes('`--run-id=${runId}`') && controllerSource.includes('entryOperationStarted = true');
  result.checks.controllerHasSingleRestorationDispatcher = (controllerSource.match(/async function dispatchRestoration\(/g) ?? []).length === 1 &&
    (controllerSource.match(/runCaptured\('05-exit\/exit'/g) ?? []).length === 1;
  result.checks.controllerRefusesExpiredSpawn = controllerSource.includes('absolute deadline expired') && controllerSource.includes('deadline crossed during capture setup');
  result.checks.controllerBindsExitToImmutableMaximum = controllerSource.includes('maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs') &&
    controllerSource.includes("Direct exit helper call rejected: use the single restoration dispatcher");
  result.checks.controllerPreservesFutureApplyCommand = controllerSource.includes("'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET") && controllerSource.includes("'--skip-vault', '--include-all', '--yes', '--output-format', 'json'");
  const signalHandlerSource = controllerSource.slice(controllerSource.indexOf("for (const signal of ['SIGINT', 'SIGTERM'])"), controllerSource.indexOf('async function runCaptured'));
  const catchSource = controllerSource.slice(controllerSource.indexOf('} catch (error) {', controllerSource.indexOf("const postExitDir")), controllerSource.indexOf('} finally {'));
  const finallySource = controllerSource.slice(controllerSource.indexOf('} finally {'));
  d2.d2_09_finallyCleanupCannotRestore = !finallySource.includes('dispatchRestoration(') && !finallySource.includes('PROPOSED_QUIESCENCE_EXIT_TEMPLATE.sql');
  d2.d2_10_signalHandlerCannotRestore = !signalHandlerSource.includes('dispatchRestoration(') && !signalHandlerSource.includes('PROPOSED_QUIESCENCE_EXIT_TEMPLATE.sql');
  d2.d2_11_emergencyCleanupCannotRestore = !catchSource.includes('dispatchRestoration(') && !catchSource.includes('PROPOSED_QUIESCENCE_EXIT_TEMPLATE.sql');
  d2.d2_12_directExitHelperCallRejected = controllerSource.includes("relativeBase === '05-exit/exit'") &&
    controllerSource.includes('restoration?.token !== RESTORATION_DISPATCH_TOKEN');
  updateEscalationLatch(inFlightLatch, origin + 600_000, deadlines.maximumQuiescenceEscalationMonoMs);
  d2.d2_13_preDeadlineInFlightMayResolveOnce = allowedDispatch.child.pid === 70001 && spawnCount === 1 && inFlightLatch.latched;
  const ambiguousDisposition = postExitDisposition(
    { timedOut: true, exitCode: null, exitSignal: 'SIGINT', spawnError: null }, postExitEnvelope, comparatorConstraints,
  );
  d2.d2_14_ambiguousInFlightAdjudicatedNoSecondExit = ambiguousDisposition.result === 'HOLD' &&
    !catchSource.includes('dispatchRestoration(') && (controllerSource.match(/await dispatchRestoration\(/g) ?? []).length === 1;
  d2.d2_15_restartCannotInferRestorationPermission = controllerSource.includes('Refusing existing evidence path') &&
    statePolicy(ESCALATED_STATE).owner_required === true && statePolicy(ESCALATED_STATE).restoration_allowed === false;
  const adjudicationSql = readFileSync(join(PACKET, 'SERVER_STATE_ADJUDICATE.sql'), 'utf8');
  result.checks.adjudicationSqlCapturesFunctionAndTriggerHashes = adjudicationSql.includes("'function_definition_sha256'") && adjudicationSql.includes("'row_trigger_definition_sha256'") && adjudicationSql.includes("'truncate_trigger_definition_sha256'");
  result.checks.adjudicationSqlCapturesOidRelationshipsAndSemantics = adjudicationSql.includes("'row_trigger_function_oid'") && adjudicationSql.includes("'truncate_trigger_table_oid'") && adjudicationSql.includes("'row_trigger_events'") && adjudicationSql.includes("'truncate_trigger_timing'");

  const evidenceRoot = join(temp, 'evidence');
  mkdirSync(join(evidenceRoot, '00-preflight'), { recursive: true });
  mkdirSync(join(evidenceRoot, 'manifest'));
  writeFileSync(join(evidenceRoot, '00-preflight/raw.txt'), 'raw evidence\n');
  const evidenceManifest = generateEvidenceManifest(evidenceRoot);
  result.checks.evidenceManifestUsesActualCapturedFile = evidenceManifest.artifactCount === 1 && /^[0-9a-f]{64}$/.test(evidenceManifest.artifacts[0].sha256);

  const requiredPass = Object.values(result.requiredBranchCases).every(Boolean) && Object.keys(result.requiredBranchCases).length === 30;
  const newR6Pass = Object.values(result.newR6BranchCases).every(Boolean) && Object.keys(result.newR6BranchCases).length === 40;
  result.requiredBranchPassed = Object.values(result.requiredBranchCases).filter(Boolean).length;
  result.requiredBranchTotal = Object.keys(result.requiredBranchCases).length;
  result.newR6BranchPassed = Object.values(result.newR6BranchCases).filter(Boolean).length;
  result.newR6BranchTotal = Object.keys(result.newR6BranchCases).length;
  result.status = requiredPass && newR6Pass && Object.values(result.checks).every(Boolean) ? 'PASS' : 'HOLD';
} catch (error) {
  result.error = error.message;
} finally {
  rmSync(temp, { recursive: true, force: true });
  result.tempDestroyed = !existsSync(temp);
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'PASS' && result.tempDestroyed ? 0 : 1);
