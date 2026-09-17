#!/usr/bin/env node
// Disposable, local-only validation of the three R4 executable repairs.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHermeticWorkdir, inventoryWorkspace } from './build_hermetic_workdir.mjs';
import { generateEvidenceManifest } from './generate_evidence_manifest.mjs';
import {
  EXPECTED,
  assertExactInventory,
  buildEntryEnvelope,
  cadenceSlot,
  classifyServerState,
  createDeadlines,
  deriveClientOutcome,
  evaluateExitEligibility,
  maxQuiescenceState,
  postExitDisposition,
  statePolicy,
  validateCadenceSample,
  validateDryRunPlan,
  validateEntryEnvelope,
} from './r4_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'p03b-r4-controls-'));
const result = {
  status: 'ERROR',
  localOnly: true,
  productionInputsAccepted: false,
  checks: {},
  error: null,
  tempDestroyed: false,
};

function expectFailure(fn, label) {
  try { fn(); } catch { return true; }
  throw new Error(`${label} unexpectedly succeeded`);
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

  const exactPlan = { upToDate: false, dryRun: true, migrations: EXPECTED.migrations.map((migration) => migration.filename), seeds: [], roles: [] };
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

  const snapshot = { querySucceeded: true, gateIdentityExact: true, candidate_backends: [], ledger_unique_count: 85, ledger_count: 85, phase03b_versions: [] };
  result.checks.classifierZeroRows = classifyServerState(snapshot, { applySpawned: true }) === 'NO_PHASE03B_LEDGER_ROWS';
  result.checks.classifierMigrationOneOnly = classifyServerState({ ...snapshot, ledger_unique_count: 86, ledger_count: 86, phase03b_versions: [EXPECTED.migrations[0].version] }, { applySpawned: true }) === 'MIGRATION_1_ONLY';
  result.checks.classifierBothRecorded = classifyServerState({ ...snapshot, ledger_unique_count: 87, ledger_count: 87, phase03b_versions: EXPECTED.migrations.map((migration) => migration.version) }, { applySpawned: true }) === 'BOTH_MIGRATIONS_RECORDED';
  result.checks.classifierBothExpectedStructure = classifyServerState({ ...snapshot, ledger_unique_count: 87, ledger_count: 87, phase03b_versions: EXPECTED.migrations.map((migration) => migration.version), structureExact: true }, { applySpawned: true }) === 'BOTH_RECORDED_EXPECTED_STRUCTURE';
  result.checks.classifierUnexpectedState = classifyServerState({ ...snapshot, ledger_unique_count: 86, ledger_count: 86, phase03b_versions: [EXPECTED.migrations[1].version] }, { applySpawned: true }) === 'UNEXPECTED_LEDGER_STATE';
  result.checks.classifierActiveBackend = classifyServerState({ ...snapshot, candidate_backends: [{ state: 'active' }] }, { applySpawned: true }) === 'BACKEND_STILL_ACTIVE';
  result.checks.classifierUnknownBackend = classifyServerState({ querySucceeded: false }, { applySpawned: true }) === 'BACKEND_UNKNOWN';
  result.checks.classifierGateMismatch = classifyServerState({ ...snapshot, gateIdentityExact: false }, { applySpawned: true }) === 'QUIESCENCE_IDENTITY_MISMATCH';
  result.checks.stateMatrixForbidsRetryAndAutomaticRollback = statePolicy('MIGRATION_1_ONLY').retry_allowed === false && statePolicy('MIGRATION_1_ONLY').rollback_automatically_allowed === false;
  result.checks.maxQuiescenceEscalatesFailClosed = maxQuiescenceState(600_000) === 'ESCALATED_FAIL_CLOSED' && statePolicy('ESCALATED_FAIL_CLOSED').exit_quiescence_allowed === false;

  const { entry, proof } = entryFixtures();
  const envelope = buildEntryEnvelope({
    entry, proof, inventory: built.inventory, deadlines,
    controllerPid: process.pid,
    entryStep: { exitCode: 0, childPid: process.pid, startedMonoMs: origin, endedMonoMs: origin + 100 },
    proofStep: { exitCode: 0, childPid: process.pid, startedMonoMs: origin + 100, endedMonoMs: origin + 200 },
  });
  result.checks.entryReceiptGeneratedFromRawEvidence = validateEntryEnvelope(envelope) && envelope.rawCapture.entryStep.exitCode === 0 && envelope.rawCapture.proofStep.exitCode === 0;
  const entryPath = join(temp, 'ENTRY_RECEIPT.json');
  const exitPath = join(temp, 'EXIT.sql');
  writeFileSync(entryPath, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });
  const generator = spawnSync(process.execPath, [join(PACKET, 'generate_exit_sql.mjs'), `--entry=${entryPath}`, `--output=${exitPath}`], { encoding: 'utf8' });
  result.checks.controllerEnvelopeGeneratesExitSql = generator.status === 0 && existsSync(exitPath) && !/__([A-Z0-9_]+)__/.test(readFileSync(exitPath, 'utf8'));
  const malformedPath = join(temp, 'MALFORMED_ENTRY.json');
  writeFileSync(malformedPath, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  const malformed = spawnSync(process.execPath, [join(PACKET, 'generate_exit_sql.mjs'), `--entry=${malformedPath}`, `--output=${join(temp, 'BAD_EXIT.sql')}`], { encoding: 'utf8' });
  result.checks.bareR3ReceiptRejected = malformed.status !== 0;

  const exactPass = {
    postApplyVerificationPass: true, primaryInvariantPass: true, historyCorroborationPass: true,
    httpBaselinePass: true, gateIdentityPass: true, ledgerExactExpected: true,
    structureExactExpected: true, noUnknownState: true, withinMaximumQuiescence: true,
  };
  result.checks.comparatorFailurePreventsExit = evaluateExitEligibility({ ...exactPass, postApplyVerificationPass: false }).allowed === false;
  result.checks.unknownStatePreventsExit = evaluateExitEligibility({ ...exactPass, noUnknownState: false }).allowed === false;
  result.checks.exitAllowedOnlyAfterExactPass = evaluateExitEligibility(exactPass).allowed === true;
  result.checks.postExitComparatorFailureReturnsHold = postExitDisposition({ timedOut: false, exitCode: 1, exitSignal: null, spawnError: null }, { result: 'HOLD' }).result === 'HOLD';

  const controllerSource = readFileSync(join(PACKET, 'execute_cutover_controller.mjs'), 'utf8');
  const planPosition = controllerSource.indexOf("'00-preflight/exact-plan'");
  const entryPosition = controllerSource.indexOf("'01-entry/entry'");
  const applyPosition = controllerSource.indexOf("'02-apply/apply'");
  const postApplyPosition = controllerSource.indexOf("'04-post-apply-quiesced/comparator-runner'");
  const exitPosition = controllerSource.indexOf("'05-exit/exit'");
  const postExitPosition = controllerSource.indexOf("'06-post-exit/comparator-runner'");
  result.checks.controllerOrdersPlanBeforeEntryAndApply = planPosition >= 0 && planPosition < entryPosition && entryPosition < applyPosition;
  result.checks.controllerOwnsComparatorExitLifecycle = applyPosition < postApplyPosition && postApplyPosition < exitPosition && exitPosition < postExitPosition;
  result.checks.controllerEnforcesEveryMonitor = controllerSource.includes('requireSuccess(step, `monitor slot ${slot}`)') && controllerSource.includes('validateMonitorAgainstEntry(sample, entryEnvelope ?? entryReference)');
  result.checks.controllerHasExactEvidenceTree = controllerSource.includes("'00-preflight', '01-entry', '02-apply', '03-monitoring', '04-post-apply-quiesced', '05-exit', '06-post-exit', '07-final', 'manifest'");
  result.checks.controllerEscalatesAtImmutableMaximum = controllerSource.includes("transition('ESCALATED_FAIL_CLOSED'") && controllerSource.includes('receipt.quiescenceAutomaticallyExited = false');
  result.checks.controllerAdjudicatesAmbiguousClientOutcome = controllerSource.includes("await adjudicate('Apply client outcome ambiguous')") && controllerSource.includes('automaticRetryAuthorized: false');
  result.checks.futureInnerApplyCommandPreserved = controllerSource.includes("'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET") && controllerSource.includes("'--skip-vault', '--include-all', '--yes', '--output-format', 'json'");

  const evidenceRoot = join(temp, 'evidence');
  mkdirSync(join(evidenceRoot, '00-preflight'), { recursive: true });
  mkdirSync(join(evidenceRoot, 'manifest'));
  writeFileSync(join(evidenceRoot, '00-preflight/raw.txt'), 'raw evidence\n');
  const manifest = generateEvidenceManifest(evidenceRoot);
  const expectedDigest = (await import('node:crypto')).createHash('sha256').update('raw evidence\n').digest('hex');
  result.checks.evidenceManifestUsesActualFiles = manifest.artifactCount === 1 && manifest.artifacts[0].sha256 === expectedDigest;

  result.status = Object.values(result.checks).every(Boolean) ? 'PASS' : 'HOLD';
} catch (error) {
  result.error = error.message;
} finally {
  rmSync(temp, { recursive: true, force: true });
  result.tempDestroyed = !existsSync(temp);
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'PASS' && result.tempDestroyed ? 0 : 1);
