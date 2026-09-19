import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCompiledR8Schema } from './r8_schema_validator.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
export const EXPECTED = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_VALUES.json'), 'utf8'));
export const STATE_MACHINE = JSON.parse(readFileSync(join(PACKET, 'PARTIAL_APPLY_STATE_MACHINE.json'), 'utf8'));
export const ENVELOPE_SCHEMA = JSON.parse(readFileSync(join(PACKET, 'STRICT_R8_ENVELOPE_SCHEMA.json'), 'utf8'));
const gateManifestBytes = readFileSync(join(PACKET, 'EXPECTED_TEMPORARY_GATE_IDENTITIES.json'));
export const EXPECTED_GATE_IDENTITIES = JSON.parse(gateManifestBytes.toString('utf8'));
export const GATE_MANIFEST_SHA256 = createHash('sha256').update(gateManifestBytes).digest('hex');
export const EXPECTED_FILENAMES = EXPECTED.migrations.map((migration) => migration.filename);
export const TARGET = EXPECTED.productionTarget;
export const ENVELOPE_SCHEMA_VERSION = 'flagstone.phase03b.r8-envelope.v1';
export const PRODUCER_VERSION = 'flagstone.phase03b.packet-r8.v1';
export const ESCALATED_STATE = 'ESCALATED_FAIL_CLOSED_OWNER_REQUIRED';

const ENVELOPE_KEYS = [
  'schemaVersion', 'packetVersion', 'candidateSha', 'candidateTree', 'productionTarget',
  'runId', 'controllerPid', 'controllerMonotonicOrigin', 'phase', 'checkName',
  'expected', 'observed', 'status', 'capturedAtUtc', 'capturedAtMonotonic',
  'sourceArtifact', 'producer', 'producerVersion', 'numericExit', 'signal', 'timedOut',
];

const ENTRY_STATE_KEYS = [
  'function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'function_owner', 'trigger_table_owner',
  'lock_mode', 'function_execute_grants', 'truncate_trigger_table_oid', 'pre_entry_structural_snapshot_sha256',
  'function_definition_sha256', 'trigger_definition_sha256', 'truncate_trigger_definition_sha256',
  'trigger_enabled', 'truncate_trigger_enabled', 'flags_id_status_count', 'flags_id_status_sha256',
  'history_count', 'history_sha256', 'ledger_count', 'ledger_unique_count', 'ledger_latest_version',
  'ledger_ordered_version_name_sha256', 'http_queue_count', 'http_response_count', 'http_response_sha256',
  'receipt', 'phase03b_ledger_count', 'boundary_at_utc', 'transaction_id', 'backend_pid',
  'lock_acquisition_started_at_utc', 'lock_acquisition_ended_at_utc', 'lock_wait_ms',
  'pre_install_flags_id_status_count', 'pre_install_flags_id_status_sha256',
  'pre_install_history_count', 'pre_install_history_sha256',
];
const ENTRY_PROOF_KEYS = [
  'function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'function_owner', 'trigger_table_owner',
  'captured_at_utc', 'backend_pid', 'function_execute_grants', 'truncate_trigger_table_oid',
  'phase03b_constraint_index_sha256',
  'function_definition_sha256', 'trigger_definition_sha256', 'truncate_trigger_definition_sha256',
  'trigger_enabled', 'truncate_trigger_enabled', 'flags_id_status_count', 'flags_id_status_sha256',
  'history_count', 'history_sha256', 'ledger_count', 'ledger_unique_count', 'ledger_latest_version',
  'ledger_ordered_version_name_sha256', 'http_queue_count', 'http_response_count', 'http_response_sha256',
  'receipt', 'transaction_read_only', 'function_count', 'trigger_count', 'truncate_trigger_count',
  'phase03b_versions', 'phase03b_rows',
];
const INVENTORY_KEYS = [
  'schemaVersion', 'packetVersion', 'target', 'candidate', 'candidateTree', 'workspaceRoot',
  'migrationFileCount', 'seedFiles', 'roleFiles', 'otherSqlFiles', 'files',
];
const INVENTORY_FILE_KEYS = ['relativePath', 'filename', 'size', 'sha256'];
const DEADLINE_KEYS = [
  'originMonoMs', 'entryCompleteMonoMs', 'applyCompleteMonoMs',
  'postApplyVerificationCompleteMonoMs', 'maximumQuiescenceEscalationMonoMs',
];
const CONTROLLER_STEP_KEYS = [
  'label', 'command', 'controllerPid', 'childPid', 'processGroupId', 'startedAt', 'endedAt',
  'startedMonoMs', 'endedMonoMs', 'absoluteDeadlineMonoMs', 'restorationDispatchedAtMonoMs',
  'timeoutMs', 'timedOut', 'signalSent', 'exitCode', 'exitSignal', 'spawnError', 'stdoutPath', 'stderrPath',
];
const SERVER_CAPTURE_STEP_KEYS = [
  'command', 'began', 'ended', 'startedMonoMs', 'endedMonoMs', 'exitCode', 'signal', 'timedOut',
  'spawnError', 'stdoutPath', 'stderrPath',
];
const SERVER_SNAPSHOT_KEYS = [
  'querySucceeded', 'receipt', 'captured_at_utc', 'transaction_read_only', 'candidate_backends',
  'ledger_count', 'ledger_unique_count', 'ledger_latest_version', 'ledger_ordered_version_name_sha256', 'phase03b_versions',
  'table_oid', 'table_schema', 'table_name', 'table_owner', 'function_count', 'function_oid', 'function_schema',
  'function_name', 'function_identity_arguments', 'function_owner', 'function_language', 'function_security_definer',
  'function_volatility', 'function_definition_sha256', 'row_trigger_count', 'row_trigger_oid', 'row_trigger_schema',
  'row_trigger_table', 'row_trigger_table_oid', 'row_trigger_table_owner', 'row_trigger_name', 'row_trigger_enabled',
  'row_trigger_tgtype', 'row_trigger_timing', 'row_trigger_level', 'row_trigger_events', 'row_trigger_update_columns',
  'row_trigger_function_oid', 'row_trigger_function_identity', 'row_trigger_definition_sha256', 'truncate_trigger_count',
  'truncate_trigger_oid', 'truncate_trigger_schema', 'truncate_trigger_table', 'truncate_trigger_table_oid',
  'truncate_trigger_table_owner', 'truncate_trigger_name', 'truncate_trigger_enabled', 'truncate_trigger_tgtype',
  'truncate_trigger_timing', 'truncate_trigger_level', 'truncate_trigger_events', 'truncate_trigger_update_columns',
  'truncate_trigger_function_oid', 'truncate_trigger_function_identity', 'truncate_trigger_definition_sha256',
  'flags_id_status_count', 'flags_id_status_sha256', 'history_count', 'history_sha256',
  'phase03b_constraint_index_sha256', 'http_queue_count', 'http_response_count', 'http_response_sha256',
];
const CANDIDATE_BACKEND_KEYS = [
  'pid', 'usename', 'application_name', 'state', 'wait_event_type', 'wait_event', 'xact_start', 'query_start',
];
const ABSENT_GATE_NULL_KEYS = [
  'function_oid', 'function_schema', 'function_name', 'function_identity_arguments', 'function_owner',
  'function_language', 'function_security_definer', 'function_volatility', 'function_definition_sha256',
  'row_trigger_oid', 'row_trigger_schema', 'row_trigger_table', 'row_trigger_table_oid', 'row_trigger_table_owner',
  'row_trigger_name', 'row_trigger_enabled', 'row_trigger_tgtype', 'row_trigger_timing', 'row_trigger_level',
  'row_trigger_events', 'row_trigger_update_columns', 'row_trigger_function_oid', 'row_trigger_function_identity',
  'row_trigger_definition_sha256', 'truncate_trigger_oid', 'truncate_trigger_schema', 'truncate_trigger_table',
  'truncate_trigger_table_oid', 'truncate_trigger_table_owner', 'truncate_trigger_name', 'truncate_trigger_enabled',
  'truncate_trigger_tgtype', 'truncate_trigger_timing', 'truncate_trigger_level', 'truncate_trigger_events',
  'truncate_trigger_update_columns', 'truncate_trigger_function_oid', 'truncate_trigger_function_identity',
  'truncate_trigger_definition_sha256',
];

const PHASE_CONTRACTS = Object.freeze({
  ENTRY_RECEIPT: {
    checkName: 'entry-and-immediate-proof',
    sourceArtifact: 'execute_cutover_controller.mjs',
    producer: 'phase03b-r8-cutover-controller',
    statuses: ['ENTRY_COMMITTED_CONFIRMED'],
    expectedKeys: ['candidateSha', 'candidateTree', 'productionTarget', 'gateManifestSha256', 'migrationFilenames'],
    observedKeys: ['entry', 'immediatePostCommitProof', 'migrationInventory', 'immutableDeadlines', 'rawCapture'],
  },
  SERVER_STATE_CLASSIFICATION: {
    checkName: 'ambiguous-server-state',
    sourceArtifact: 'adjudicate_server_state.mjs',
    producer: 'phase03b-r8-server-adjudicator',
    statuses: ['ENTRY_COMMITTED_CONFIRMED', 'ENTRY_CONFIRMED_NOT_COMMITTED', 'OWNER_REQUIRED_FAIL_CLOSED'],
    expectedKeys: ['gateManifestSha256', 'acceptedLedgerCounts', 'productionTarget'],
    observedKeys: ['entryClassification', 'gateState', 'applyClassification', 'snapshot', 'policy', 'steps'],
  },
  POST_APPLY_COMPARATOR: {
    checkName: 'post-apply-exact-quiesced-state',
    sourceArtifact: 'verify_post_apply.mjs',
    producer: 'phase03b-r8-post-apply-verifier',
    statuses: ['PASS_WHILE_QUIESCED', 'HOLD'],
    expectedKeys: ['result', 'gateManifestSha256', 'finalLedgerSha256', 'finalStructureSha256', 'httpResponseSha256'],
    observedKeys: ['proof', 'normalizedStructureSha256', 'steps'],
  },
  POST_EXIT_COMPARATOR: {
    checkName: 'post-exit-write-restoration',
    sourceArtifact: 'verify_post_exit.mjs',
    producer: 'phase03b-r8-post-exit-verifier',
    statuses: ['PASS_RESTORED', 'HOLD'],
    expectedKeys: ['result', 'gateManifestSha256', 'finalLedgerSha256', 'finalStructureSha256', 'httpResponseSha256'],
    observedKeys: ['proof', 'normalizedStructureSha256', 'steps'],
  },
});

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} key set mismatch`);
  return true;
}

function assertRequiredAllowedKeys(value, requiredKeys, optionalKeys, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be a plain object`);
  for (const key of requiredKeys) if (!Object.hasOwn(value, key)) throw new Error(`${label} missing key: ${key}`);
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} unknown key: ${key}`);
  return true;
}

function deepEqual(actual, expected) {
  return JSON.stringify(stable(actual)) === JSON.stringify(stable(expected));
}

function invalid(message) {
  throw new Error(`FAIL_CLOSED_INVALID_ENVELOPE: ${message}`);
}

function requireExact(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual?.[key] !== value) throw new Error(`${label} mismatch: ${key}`);
  }
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive safe integer`);
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer`);
}

function requireSha256(value, label) {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${label} must be a lowercase SHA-256`);
}

function requireUtc(value, label) {
  if (typeof value !== 'string' || !value.endsWith('Z') || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a UTC timestamp`);
  }
}

const POST_APPLY_PROOF_KEYS = [
  'receipt', 'transaction_read_only', 'captured_at_utc', 'backend_pid', 'table_oid',
  'function_count', 'function_oid', 'function_owner', 'function_execute_grants', 'function_definition_sha256',
  'trigger_count', 'trigger_oid', 'trigger_table_owner', 'trigger_enabled', 'trigger_definition_sha256',
  'truncate_trigger_count', 'truncate_trigger_oid', 'truncate_trigger_table_oid', 'truncate_trigger_enabled',
  'truncate_trigger_definition_sha256', 'flags_id_status_count', 'flags_id_status_sha256', 'history_count',
  'history_sha256', 'ledger_count', 'ledger_unique_count', 'ledger_latest_version',
  'ledger_ordered_version_name_sha256', 'phase03b_versions', 'phase03b_rows',
  'phase03b_constraint_index_sha256', 'http_queue_count', 'http_response_count', 'http_response_sha256',
];

const POST_EXIT_PROOF_KEYS = [
  'receipt', 'transaction_read_only', 'captured_at_utc', 'function_count', 'reserved_trigger_count',
  'ledger_count', 'ledger_unique_count', 'ledger_latest_version', 'ledger_ordered_version_name_sha256',
  'phase03b_versions', 'phase03b_rows', 'phase03b_constraint_index_sha256', 'flags_id_status_count',
  'flags_id_status_sha256', 'history_count', 'history_sha256', 'http_queue_count', 'http_response_count',
  'http_response_sha256',
];

const EXPECTED_PHASE03B_ROWS = EXPECTED.migrations.map((migration) => ({
  version: migration.version,
  name: migration.filename.replace(/^\d{14}_/, '').replace(/\.sql$/, ''),
  statement_count: 1,
  statement_sha256: migration.sha256,
}));

function validateComparatorStep(step, phase, index) {
  const label = `${phase} observed.steps[${index}]`;
  if (isPlainObject(step) && Object.keys(step).length === 1 && typeof step.comparatorError === 'string' && step.comparatorError.length > 0) {
    return 'ERROR';
  }
  const expectedKeys = phase === 'POST_APPLY_COMPARATOR'
    ? ['command', 'childPid', 'startedAt', 'endedAt', 'timeoutMs', 'timedOut', 'exitCode', 'signal', 'error', 'stdoutPath', 'stderrPath']
    : ['command', 'startedAt', 'endedAt', 'exitCode', 'signal', 'timedOut'];
  assertExactKeys(step, expectedKeys, label);
  if (!Array.isArray(step.command) || step.command[0] !== 'supabase' || !step.command.includes('--project-ref') ||
      step.command[step.command.indexOf('--project-ref') + 1] !== TARGET) throw new Error(`${label} command is not target-pinned`);
  requireUtc(step.startedAt, `${label}.startedAt`);
  requireUtc(step.endedAt, `${label}.endedAt`);
  if (step.timedOut !== false || step.exitCode !== 0 || step.signal !== null) throw new Error(`${label} is not an exact successful capture`);
  if (phase === 'POST_APPLY_COMPARATOR') {
    requirePositiveInteger(step.childPid, `${label}.childPid`);
    requirePositiveInteger(step.timeoutMs, `${label}.timeoutMs`);
    if (step.error !== null || typeof step.stdoutPath !== 'string' || typeof step.stderrPath !== 'string') {
      throw new Error(`${label} capture metadata is invalid`);
    }
  }
  return 'PASS';
}

function validateComparatorProof(envelope, constraints) {
  const isPostApply = envelope.phase === 'POST_APPLY_COMPARATOR';
  const passStatus = isPostApply ? 'PASS_WHILE_QUIESCED' : 'PASS_RESTORED';
  requireExact(envelope.expected, {
    result: passStatus,
    gateManifestSha256: GATE_MANIFEST_SHA256,
    finalLedgerSha256: EXPECTED.final.ledgerSha256,
    finalStructureSha256: EXPECTED.final.normalizedStructureSha256,
    httpResponseSha256: EXPECTED.baseline.httpResponseSha256,
  }, `${envelope.phase} expected identity`);
  if (!Array.isArray(envelope.observed.steps)) throw new Error(`${envelope.phase} observed.steps must be an array`);
  const stepStates = envelope.observed.steps.map((step, index) => validateComparatorStep(step, envelope.phase, index));
  if (envelope.status === 'HOLD') {
    if (envelope.numericExit === 0 || !stepStates.includes('ERROR')) throw new Error(`${envelope.phase} HOLD evidence is contradictory`);
    return true;
  }
  if (envelope.status !== passStatus || envelope.numericExit !== 0 || envelope.signal !== null || envelope.timedOut !== false) {
    throw new Error(`${envelope.phase} PASS status/process fields are contradictory`);
  }
  if (stepStates.length !== 3 || stepStates.some((state) => state !== 'PASS')) throw new Error(`${envelope.phase} PASS requires three exact successful steps`);
  if (envelope.observed.normalizedStructureSha256 !== EXPECTED.final.normalizedStructureSha256) {
    throw new Error(`${envelope.phase} observed structure digest mismatch`);
  }
  const proof = envelope.observed.proof;
  assertExactKeys(proof, isPostApply ? POST_APPLY_PROOF_KEYS : POST_EXIT_PROOF_KEYS, `${envelope.phase} observed.proof`);
  requireUtc(proof.captured_at_utc, `${envelope.phase} proof capture`);
  requireExact(proof, {
    receipt: isPostApply ? 'phase03b_quiescence_proof_r3' : 'phase03b_post_exit_proof_r3',
    transaction_read_only: 'on',
    function_count: isPostApply ? 1 : 0,
    ledger_count: EXPECTED.final.ledgerCount,
    ledger_unique_count: EXPECTED.final.ledgerUniqueCount,
    ledger_latest_version: EXPECTED.final.ledgerLatestVersion,
    ledger_ordered_version_name_sha256: EXPECTED.final.ledgerSha256,
    phase03b_constraint_index_sha256: EXPECTED.final.phase03bConstraintIndexSha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount,
    http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  }, `${envelope.phase} proof`);
  if (!isPostApply && proof.reserved_trigger_count !== 0) throw new Error('POST_EXIT_COMPARATOR proof still contains a reserved gate');
  if (JSON.stringify(proof.phase03b_versions) !== JSON.stringify(EXPECTED.migrations.map((migration) => migration.version)) ||
      JSON.stringify(proof.phase03b_rows) !== JSON.stringify(EXPECTED_PHASE03B_ROWS)) {
    throw new Error(`${envelope.phase} proof migration identity mismatch`);
  }
  for (const key of ['flags_id_status_count', 'history_count']) requireNonNegativeInteger(proof[key], `${envelope.phase} proof.${key}`);
  for (const key of ['flags_id_status_sha256', 'history_sha256']) requireSha256(proof[key], `${envelope.phase} proof.${key}`);
  if (isPostApply) {
    requireExact(proof, {
      function_owner: EXPECTED.gate.functionOwner,
      function_definition_sha256: EXPECTED.gate.functionDefinitionSha256,
      trigger_count: 1,
      trigger_table_owner: EXPECTED.gate.tableOwner,
      trigger_enabled: EXPECTED.gate.enableState,
      trigger_definition_sha256: EXPECTED.gate.rowTriggerDefinitionSha256,
      truncate_trigger_count: 1,
      truncate_trigger_enabled: EXPECTED.gate.enableState,
      truncate_trigger_definition_sha256: EXPECTED.gate.truncateTriggerDefinitionSha256,
    }, 'POST_APPLY_COMPARATOR proof gate identity');
    requirePositiveInteger(proof.backend_pid, 'POST_APPLY_COMPARATOR proof.backend_pid');
    for (const key of ['table_oid', 'function_oid', 'trigger_oid', 'truncate_trigger_oid', 'truncate_trigger_table_oid']) {
      if (!/^[1-9][0-9]*$/.test(proof[key])) throw new Error(`POST_APPLY_COMPARATOR proof.${key} must be a positive decimal OID string`);
    }
    if (!Array.isArray(proof.function_execute_grants)) throw new Error('POST_APPLY_COMPARATOR proof.function_execute_grants must be an array');
    for (const [index, grant] of proof.function_execute_grants.entries()) {
      assertExactKeys(grant, ['grantee', 'privilege', 'grantable'], `POST_APPLY_COMPARATOR proof.function_execute_grants[${index}]`);
    }
  }
  if (constraints.entryEnvelope) {
    validateEntryEnvelope(constraints.entryEnvelope);
    const entry = constraints.entryEnvelope.observed.entry;
    const invariantKeys = ['flags_id_status_count', 'flags_id_status_sha256', 'history_count', 'history_sha256'];
    if (isPostApply) invariantKeys.push('function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid');
    for (const key of invariantKeys) if (proof[key] !== entry[key]) throw new Error(`${envelope.phase} proof/entry mismatch: ${key}`);
  }
  return true;
}

export function parseCliJson(text) {
  const objectAt = text.indexOf('{');
  const arrayAt = text.indexOf('[');
  const offset = objectAt === -1 ? arrayAt : arrayAt === -1 ? objectAt : Math.min(objectAt, arrayAt);
  if (offset < 0) throw new Error('CLI output contained no JSON');
  return JSON.parse(text.slice(offset));
}

export function resultRow(payload, key) {
  let rows;
  if (Array.isArray(payload)) {
    rows = payload;
  } else if (isPlainObject(payload)) {
    assertExactKeys(payload, ['boundary', 'rows', 'warning'], 'CLI rows transport wrapper');
    if (!Array.isArray(payload.rows)) throw new Error('CLI rows transport wrapper.rows must be an array');
    if (typeof payload.boundary !== 'string' || !/^[0-9a-f]{32}$/.test(payload.boundary)) {
      throw new Error('CLI rows transport wrapper.boundary must be a 32-character lowercase hex string');
    }
    if (typeof payload.warning !== 'string' || !payload.warning.includes(`<${payload.boundary}>`)) {
      throw new Error('CLI rows transport wrapper.warning must bind the exact boundary');
    }
    rows = payload.rows;
  } else {
    throw new Error(`CLI output did not contain an exact row wrapper for ${key}`);
  }

  if (rows.length !== 1) throw new Error(`CLI row transport must contain exactly one row for ${key}`);
  const [row] = rows;
  assertExactKeys(row, [key], `CLI row transport for ${key}`);
  return row[key];
}

export function assertExactInventory(inventory) {
  assertExactKeys(inventory, INVENTORY_KEYS, 'Hermetic inventory');
  if (inventory.schemaVersion !== 1 || inventory.packetVersion !== 'R8' || inventory.target !== TARGET ||
      inventory.candidate !== EXPECTED.candidate || inventory.candidateTree !== EXPECTED.candidateTree) {
    throw new Error('Hermetic inventory metadata mismatch');
  }
  if (inventory.migrationFileCount !== 2 || inventory.files?.length !== 2) throw new Error('MIGRATION_FILE_COUNT must equal 2');
  const actualNames = inventory.files.map((file) => file.filename);
  if (JSON.stringify(actualNames) !== JSON.stringify(EXPECTED_FILENAMES)) throw new Error('Hermetic migration filename set/order mismatch');
  for (const [index, file] of inventory.files.entries()) {
    assertExactKeys(file, INVENTORY_FILE_KEYS, `Hermetic migration inventory file[${index}]`);
    const expected = EXPECTED.migrations[index];
    if (file.relativePath !== `supabase/migrations/${expected.filename}` || file.sha256 !== expected.sha256 ||
        !Number.isSafeInteger(file.size) || file.size <= 0) throw new Error(`Hermetic migration inventory mismatch: ${expected.filename}`);
  }
  if (inventory.seedFiles !== 0 || inventory.roleFiles !== 0 || inventory.otherSqlFiles !== 0) {
    throw new Error('Hermetic workspace contains seed, role, or helper SQL');
  }
  return true;
}

export function validateDryRunPlan(payload) {
  if (payload.dryRun !== true || payload.upToDate !== false) throw new Error('Pre-apply plan is not a pending dry-run');
  if (JSON.stringify(payload.migrations) !== JSON.stringify(EXPECTED_FILENAMES)) throw new Error('Pre-apply dry-run did not propose the exact frozen pair');
  if (!Array.isArray(payload.seeds) || payload.seeds.length !== 0 || !Array.isArray(payload.roles) || payload.roles.length !== 0) {
    throw new Error('Pre-apply dry-run includes seed or role work');
  }
  return true;
}

export function createDeadlines(originMonoMs) {
  if (!Number.isSafeInteger(originMonoMs) || originMonoMs < 0) throw new Error('Invalid monotonic origin');
  const timing = EXPECTED.timingMs;
  return Object.freeze({
    originMonoMs,
    entryCompleteMonoMs: originMonoMs + timing.entryComplete,
    applyCompleteMonoMs: originMonoMs + timing.applyComplete,
    postApplyVerificationCompleteMonoMs: originMonoMs + timing.postApplyVerificationComplete,
    maximumQuiescenceEscalationMonoMs: originMonoMs + timing.maximumQuiescenceEscalation,
  });
}

export function cadenceSlot(originMonoMs, slot) {
  if (!Number.isSafeInteger(slot) || slot < 1) throw new Error('Cadence slot must be a positive integer');
  return { slot, scheduledMonoMs: originMonoMs + slot * EXPECTED.timingMs.monitorCadence };
}

export function validateCadenceSample(previous, current) {
  const tolerance = EXPECTED.timingMs.monitorMaximumStartLateness;
  if (current.actualStartMonoMs < current.scheduledMonoMs || current.actualStartMonoMs - current.scheduledMonoMs > tolerance) {
    throw new Error(`Monitor slot ${current.slot} missed its anchored start window`);
  }
  if (previous) {
    if (current.slot !== previous.slot + 1 || current.scheduledMonoMs - previous.scheduledMonoMs !== EXPECTED.timingMs.monitorCadence) {
      throw new Error('Monitor cadence skipped or duplicated an anchored slot');
    }
    if (current.actualStartMonoMs - previous.actualStartMonoMs > EXPECTED.timingMs.monitorCadence + tolerance * 2) {
      throw new Error('Successive monitor start-time gap exceeded the accepted cadence');
    }
  }
  return true;
}

export function validateEntryAndImmediateProof(entry, proof) {
  assertExactKeys(entry, ENTRY_STATE_KEYS, 'Entry receipt object');
  assertExactKeys(proof, ENTRY_PROOF_KEYS, 'Immediate proof object');
  const gate = EXPECTED.gate;
  requireExact(entry, {
    receipt: 'phase03b_quiescence_entry_r3', function_owner: gate.functionOwner,
    lock_mode: 'SHARE ROW EXCLUSIVE',
    trigger_table_owner: gate.tableOwner, function_definition_sha256: gate.functionDefinitionSha256,
    trigger_definition_sha256: gate.rowTriggerDefinitionSha256,
    truncate_trigger_definition_sha256: gate.truncateTriggerDefinitionSha256,
    trigger_enabled: gate.enableState, truncate_trigger_enabled: gate.enableState,
    ledger_count: EXPECTED.baseline.ledgerCount, ledger_unique_count: EXPECTED.baseline.ledgerUniqueCount,
    ledger_latest_version: EXPECTED.baseline.ledgerLatestVersion, phase03b_ledger_count: 0,
    ledger_ordered_version_name_sha256: EXPECTED.baseline.ledgerSha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount, http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  }, 'Entry receipt');
  if (!/^[1-9][0-9]*$/.test(entry.truncate_trigger_table_oid) || entry.truncate_trigger_table_oid !== entry.table_oid) {
    throw new Error('Entry receipt truncate trigger table OID contradicts the locked table OID');
  }
  if (entry.pre_entry_structural_snapshot_sha256 !== '2d533d8f8bfb827fe6b63f4fb6f17035afd55b8d474260a51a20fe2c004bda01') {
    throw new Error('Entry receipt structural snapshot digest mismatch');
  }
  if (!Array.isArray(entry.function_execute_grants)) throw new Error('Entry receipt function_execute_grants must be an array');
  for (const [index, grant] of entry.function_execute_grants.entries()) {
    assertExactKeys(grant, ['grantee', 'privilege', 'grantable'], `Entry receipt function_execute_grants[${index}]`);
    if (typeof grant.grantee !== 'string' || typeof grant.privilege !== 'string' || typeof grant.grantable !== 'boolean') {
      throw new Error(`Entry receipt function_execute_grants[${index}] is malformed`);
    }
  }
  requireExact(proof, {
    receipt: 'phase03b_quiescence_proof_r3', transaction_read_only: 'on', function_count: 1,
    function_owner: gate.functionOwner, function_definition_sha256: gate.functionDefinitionSha256,
    trigger_count: 1, trigger_table_owner: gate.tableOwner, trigger_enabled: gate.enableState,
    trigger_definition_sha256: gate.rowTriggerDefinitionSha256, truncate_trigger_count: 1,
    truncate_trigger_enabled: gate.enableState, truncate_trigger_definition_sha256: gate.truncateTriggerDefinitionSha256,
    ledger_count: EXPECTED.baseline.ledgerCount, ledger_unique_count: EXPECTED.baseline.ledgerUniqueCount,
    ledger_latest_version: EXPECTED.baseline.ledgerLatestVersion, ledger_ordered_version_name_sha256: EXPECTED.baseline.ledgerSha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount, http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  }, 'Immediate proof');
  requireUtc(proof.captured_at_utc, 'Immediate proof captured_at_utc');
  requirePositiveInteger(proof.backend_pid, 'Immediate proof backend_pid');
  if (!/^[1-9][0-9]*$/.test(proof.truncate_trigger_table_oid) || proof.truncate_trigger_table_oid !== proof.table_oid) {
    throw new Error('Immediate proof truncate trigger table OID mismatch');
  }
  if (proof.phase03b_constraint_index_sha256 !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
    throw new Error('Immediate proof pre-apply constraint/index digest mismatch');
  }
  if (!Array.isArray(proof.function_execute_grants)) throw new Error('Immediate proof function_execute_grants must be an array');
  for (const [index, grant] of proof.function_execute_grants.entries()) {
    assertExactKeys(grant, ['grantee', 'privilege', 'grantable'], `Immediate proof function_execute_grants[${index}]`);
  }
  if (!deepEqual(entry.function_execute_grants, proof.function_execute_grants)) throw new Error('Entry/proof function grants mismatch');
  if (JSON.stringify(proof.phase03b_versions ?? []) !== '[]' || JSON.stringify(proof.phase03b_rows ?? []) !== '[]') {
    throw new Error('Immediate proof contains Phase 03B ledger rows');
  }
  for (const key of [
    'function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'function_owner', 'trigger_table_owner',
    'function_definition_sha256', 'trigger_definition_sha256', 'truncate_trigger_definition_sha256',
    'trigger_enabled', 'truncate_trigger_enabled', 'flags_id_status_count', 'flags_id_status_sha256',
    'history_count', 'history_sha256', 'ledger_count', 'ledger_unique_count', 'ledger_latest_version',
    'ledger_ordered_version_name_sha256', 'http_queue_count', 'http_response_count', 'http_response_sha256',
  ]) if (entry[key] !== proof[key]) throw new Error(`Entry/proof mismatch: ${key}`);
  if (entry.pre_install_flags_id_status_count !== entry.flags_id_status_count ||
      entry.pre_install_flags_id_status_sha256 !== entry.flags_id_status_sha256 ||
      entry.pre_install_history_count !== entry.history_count || entry.pre_install_history_sha256 !== entry.history_sha256) {
    throw new Error('Pre-install and post-install invariant captures differ');
  }
  for (const key of ['transaction_id', 'backend_pid']) {
    requirePositiveInteger(entry[key], `Entry receipt.${key}`);
  }
  for (const key of ['function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'truncate_trigger_table_oid']) {
    if (!/^[1-9][0-9]*$/.test(entry[key])) throw new Error(`Entry receipt.${key} must be a positive decimal OID string`);
  }
  for (const key of ['flags_id_status_count', 'history_count', 'pre_install_flags_id_status_count', 'pre_install_history_count']) {
    requireNonNegativeInteger(entry[key], `Entry receipt.${key}`);
  }
  if (typeof entry.lock_wait_ms !== 'number' || !Number.isFinite(entry.lock_wait_ms) || entry.lock_wait_ms < 0) {
    throw new Error('Entry receipt.lock_wait_ms must be a non-negative finite number');
  }
  for (const key of ['boundary_at_utc', 'lock_acquisition_started_at_utc', 'lock_acquisition_ended_at_utc']) {
    requireUtc(entry[key], `Entry receipt.${key}`);
  }
  return 'VALIDATED_R8';
}

function validateEnvelopeBase(envelope, constraints = {}) {
  validateCompiledR8Schema(envelope);
  assertExactKeys(envelope, ENVELOPE_KEYS, 'R8 envelope');
  const contract = PHASE_CONTRACTS[envelope.phase];
  if (!contract) throw new Error('Unknown R8 envelope phase');
  requireExact(envelope, {
    schemaVersion: ENVELOPE_SCHEMA_VERSION, packetVersion: 'R8', candidateSha: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree, productionTarget: TARGET,
    checkName: contract.checkName, sourceArtifact: contract.sourceArtifact, producer: contract.producer,
    producerVersion: PRODUCER_VERSION,
  }, 'R8 envelope identity');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(envelope.runId)) {
    throw new Error('R8 envelope runId is not an immutable UUID v4');
  }
  requirePositiveInteger(envelope.controllerPid, 'R8 envelope controllerPid');
  if (!Number.isSafeInteger(envelope.controllerMonotonicOrigin) || envelope.controllerMonotonicOrigin < 0) {
    throw new Error('R8 envelope controllerMonotonicOrigin is invalid');
  }
  if (!Number.isSafeInteger(envelope.capturedAtMonotonic) || envelope.capturedAtMonotonic < envelope.controllerMonotonicOrigin) {
    throw new Error('R8 envelope capturedAtMonotonic is invalid');
  }
  requireUtc(envelope.capturedAtUtc, 'R8 envelope capturedAtUtc');
  if (!Number.isSafeInteger(envelope.numericExit)) throw new Error('R8 envelope numericExit is required');
  if (envelope.signal !== null && typeof envelope.signal !== 'string') throw new Error('R8 envelope signal is invalid');
  if (typeof envelope.timedOut !== 'boolean') throw new Error('R8 envelope timedOut is invalid');
  if (!contract.statuses.includes(envelope.status)) throw new Error('R8 envelope status is invalid for its phase');
  assertExactKeys(envelope.expected, contract.expectedKeys, 'R8 envelope expected');
  assertExactKeys(envelope.observed, contract.observedKeys, 'R8 envelope observed');
  if (constraints.phase && envelope.phase !== constraints.phase) throw new Error('R8 envelope phase mismatch');
  if (constraints.runId && envelope.runId !== constraints.runId) throw new Error('R8 envelope runId mismatch');
  if (constraints.controllerPid && envelope.controllerPid !== constraints.controllerPid) throw new Error('R8 envelope controllerPid mismatch');
  if (constraints.controllerMonotonicOrigin !== undefined && envelope.controllerMonotonicOrigin !== constraints.controllerMonotonicOrigin) {
    throw new Error('R8 envelope monotonic origin mismatch');
  }
  if (envelope.expected.gateManifestSha256 !== GATE_MANIFEST_SHA256) throw new Error('R8 gate identity manifest digest mismatch');
  if (envelope.phase === 'ENTRY_RECEIPT') {
    requireExact(envelope.expected, {
      candidateSha: EXPECTED.candidate,
      candidateTree: EXPECTED.candidateTree,
      productionTarget: TARGET,
      gateManifestSha256: GATE_MANIFEST_SHA256,
    }, 'R8 entry expected identity');
    if (JSON.stringify(envelope.expected.migrationFilenames) !== JSON.stringify(EXPECTED_FILENAMES)) {
      throw new Error('R8 entry expected migration identity mismatch');
    }
  }
  if (envelope.phase === 'SERVER_STATE_CLASSIFICATION') {
    requireExact(envelope.expected, { gateManifestSha256: GATE_MANIFEST_SHA256, productionTarget: TARGET }, 'R8 server-state expected identity');
    if (JSON.stringify(envelope.expected.acceptedLedgerCounts) !== JSON.stringify([
      EXPECTED.baseline.ledgerCount, EXPECTED.baseline.ledgerCount + 1, EXPECTED.final.ledgerCount,
    ])) throw new Error('R8 server-state accepted ledger counts mismatch');
  }
  return contract;
}

function validateControllerCapture(step, envelope, label, expectedLabel) {
  assertExactKeys(step, CONTROLLER_STEP_KEYS, label);
  requireExact(step, {
    label: expectedLabel,
    controllerPid: envelope.controllerPid,
    timedOut: false,
    signalSent: null,
    exitCode: 0,
    exitSignal: null,
    spawnError: null,
    restorationDispatchedAtMonoMs: null,
  }, label);
  if (!Array.isArray(step.command) || step.command[0] !== 'supabase' || !step.command.includes('--project-ref') ||
      step.command[step.command.indexOf('--project-ref') + 1] !== TARGET) invalid(`${label} command is not target-pinned`);
  requirePositiveInteger(step.childPid, `${label}.childPid`);
  requirePositiveInteger(step.timeoutMs, `${label}.timeoutMs`);
  requireUtc(step.startedAt, `${label}.startedAt`);
  requireUtc(step.endedAt, `${label}.endedAt`);
  return 'VALIDATED_R8';
}

function validateEntryEnvelopeInternal(envelope, constraints = {}) {
  validateEnvelopeBase(envelope, { ...constraints, phase: 'ENTRY_RECEIPT' });
  if (envelope.status !== 'ENTRY_COMMITTED_CONFIRMED' || envelope.numericExit !== 0 ||
      envelope.signal !== null || envelope.timedOut !== false) {
    invalid('ENTRY_RECEIPT process outcome contradicts committed-entry status');
  }
  validateEntryAndImmediateProof(envelope.observed.entry, envelope.observed.immediatePostCommitProof);
  assertExactInventory(envelope.observed.migrationInventory);
  const deadlines = envelope.observed.immutableDeadlines;
  assertExactKeys(deadlines, DEADLINE_KEYS, 'R8 entry immutableDeadlines');
  const expectedDeadlines = createDeadlines(envelope.controllerMonotonicOrigin);
  if (!deepEqual(deadlines, expectedDeadlines)) invalid('ENTRY_RECEIPT immutable deadlines contradict the controller origin');
  assertExactKeys(envelope.observed.rawCapture, ['entryStep', 'proofStep'], 'R8 entry rawCapture');
  validateControllerCapture(envelope.observed.rawCapture.entryStep, envelope, 'R8 entry rawCapture.entryStep', '01-entry/entry');
  validateControllerCapture(envelope.observed.rawCapture.proofStep, envelope, 'R8 entry rawCapture.proofStep', '01-entry/immediate-proof');
  if (envelope.capturedAtMonotonic > deadlines.applyCompleteMonoMs) invalid('ENTRY_RECEIPT was captured after its immutable entry/proof budget');
  return 'VALIDATED_R8';
}

export function validateEntryEnvelope(envelope, constraints = {}) {
  try {
    return validateEntryEnvelopeInternal(envelope, constraints);
  } catch (error) {
    if (String(error.message).startsWith('FAIL_CLOSED_INVALID_ENVELOPE:')) throw error;
    invalid(error.message);
  }
}

function validateServerCaptureStep(step, label) {
  assertExactKeys(step, SERVER_CAPTURE_STEP_KEYS, label);
  if (!Array.isArray(step.command) || step.command.length === 0) invalid(`${label} command is malformed`);
  requireUtc(step.began, `${label}.began`);
  requireUtc(step.ended, `${label}.ended`);
  requireNonNegativeInteger(step.startedMonoMs, `${label}.startedMonoMs`);
  requireNonNegativeInteger(step.endedMonoMs, `${label}.endedMonoMs`);
  if (typeof step.timedOut !== 'boolean' || (step.exitCode !== null && !Number.isSafeInteger(step.exitCode)) ||
      (step.signal !== null && typeof step.signal !== 'string') || (step.spawnError !== null && typeof step.spawnError !== 'string')) {
    invalid(`${label} process fields are malformed`);
  }
}

function validateServerStateEnvelopeInternal(envelope, constraints = {}) {
  validateEnvelopeBase(envelope, { ...constraints, phase: 'SERVER_STATE_CLASSIFICATION' });
  if (typeof constraints.applySpawned !== 'boolean') invalid('SERVER_STATE_CLASSIFICATION requires exact applySpawned context');
  if (envelope.signal !== null || envelope.timedOut !== false) invalid('SERVER_STATE_CLASSIFICATION outer process outcome is contradictory');
  const { snapshot, steps } = envelope.observed;
  if (!Array.isArray(steps) || steps.length === 0) invalid('SERVER_STATE_CLASSIFICATION requires executable step evidence');
  for (const [index, step] of steps.entries()) {
    if (Object.keys(step).length === 1 && typeof step.adjudicationError === 'string') {
      if (step.adjudicationError.length === 0) invalid(`SERVER_STATE_CLASSIFICATION steps[${index}] has empty error`);
    } else {
      validateServerCaptureStep(step, `SERVER_STATE_CLASSIFICATION steps[${index}]`);
    }
  }
  let expectedEntry;
  let expectedGate;
  let expectedApply;
  if (snapshot.querySucceeded === false) {
    assertExactKeys(snapshot, ['querySucceeded', 'captureError'], 'SERVER_STATE_CLASSIFICATION failure snapshot');
    if (envelope.numericExit === 0 || typeof snapshot.captureError !== 'string' || snapshot.captureError.length === 0 ||
        !steps.some((step) => typeof step.adjudicationError === 'string')) {
      invalid('UNKNOWN-required server evidence carries a definitive or incomplete classification');
    }
    expectedEntry = 'OWNER_REQUIRED_FAIL_CLOSED';
    expectedGate = { state: 'GATE_UNKNOWN', mismatches: ['notCaptured'] };
    expectedApply = 'BACKEND_UNKNOWN';
  } else {
    assertRequiredAllowedKeys(snapshot, SERVER_SNAPSHOT_KEYS, ['structureExact'], 'SERVER_STATE_CLASSIFICATION success snapshot');
    for (const [index, backend] of snapshot.candidate_backends.entries()) {
      assertExactKeys(backend, CANDIDATE_BACKEND_KEYS, `SERVER_STATE_CLASSIFICATION candidate_backends[${index}]`);
    }
    const objectCounts = [snapshot.function_count, snapshot.row_trigger_count, snapshot.truncate_trigger_count];
    if (objectCounts.every((count) => count === 0) && ABSENT_GATE_NULL_KEYS.some((key) => snapshot[key] !== null)) {
      invalid('gate-absent classification contradicts live object identity evidence');
    }
    if (!objectCounts.every((count) => count === 0) && ABSENT_GATE_NULL_KEYS.some((key) => snapshot[key] === undefined)) {
      invalid('gate-present classification has incomplete object identity evidence');
    }
    if (envelope.numericExit !== 0 || steps.some((step) => typeof step.adjudicationError === 'string')) {
      invalid('definitive server evidence contradicts process/error fields');
    }
    const firstStep = steps[0];
    if (!Array.isArray(firstStep.command) || firstStep.command[0] !== 'supabase' || !firstStep.command.includes('--project-ref') ||
        firstStep.command[firstStep.command.indexOf('--project-ref') + 1] !== TARGET || firstStep.exitCode !== 0 ||
        firstStep.signal !== null || firstStep.timedOut !== false || firstStep.spawnError !== null) {
      invalid('definitive classification lacks a successful target-pinned server-state step');
    }
    let entry = null;
    if (constraints.entryEnvelope) {
      validateEntryEnvelope(constraints.entryEnvelope, constraints);
      entry = constraints.entryEnvelope.observed.entry;
    }
    const entryResult = classifyEntryState(snapshot, entry);
    expectedEntry = entryResult.classification;
    expectedGate = entryResult.gate;
    expectedApply = classifyServerState(snapshot, { applySpawned: constraints.applySpawned, gateState: expectedGate.state, entry });
  }
  const expectedPolicy = statePolicy(expectedApply);
  const expectedStatus = envelope.numericExit !== 0 || constraints.applySpawned || expectedEntry === 'OWNER_REQUIRED_FAIL_CLOSED'
    ? 'OWNER_REQUIRED_FAIL_CLOSED' : expectedEntry;
  if (envelope.observed.entryClassification !== expectedEntry || !deepEqual(envelope.observed.gateState, expectedGate) ||
      envelope.observed.applyClassification !== expectedApply || !deepEqual(envelope.observed.policy, expectedPolicy) ||
      envelope.status !== expectedStatus) {
    invalid('SERVER_STATE_CLASSIFICATION contains mutually incompatible classification, gate, snapshot, policy, or status truths');
  }
  return 'VALIDATED_R8';
}

export function validateServerStateEnvelope(envelope, constraints = {}) {
  try {
    return validateServerStateEnvelopeInternal(envelope, constraints);
  } catch (error) {
    if (String(error.message).startsWith('FAIL_CLOSED_INVALID_ENVELOPE:')) throw error;
    invalid(error.message);
  }
}

export function validateR8Envelope(envelope, constraints = {}) {
  try {
    if (envelope?.phase === 'ENTRY_RECEIPT') return validateEntryEnvelope(envelope, constraints);
    if (envelope?.phase === 'SERVER_STATE_CLASSIFICATION') return validateServerStateEnvelope(envelope, constraints);
    validateEnvelopeBase(envelope, constraints);
    if (envelope.phase === 'POST_APPLY_COMPARATOR' || envelope.phase === 'POST_EXIT_COMPARATOR') {
      validateComparatorProof(envelope, constraints);
      return 'VALIDATED_R8';
    }
    invalid('unknown R8 envelope phase');
  } catch (error) {
    if (String(error.message).startsWith('FAIL_CLOSED_INVALID_ENVELOPE:')) throw error;
    invalid(error.message);
  }
}

export function buildR8Envelope({ runId, controllerPid, controllerMonotonicOrigin, phase, expected, observed, status, capturedAtUtc, capturedAtMonotonic, numericExit, signal = null, timedOut = false, validationContext = {} }) {
  const contract = PHASE_CONTRACTS[phase];
  if (!contract) throw new Error('Unknown R8 envelope phase');
  const envelope = {
    schemaVersion: ENVELOPE_SCHEMA_VERSION, packetVersion: 'R8', candidateSha: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree, productionTarget: TARGET, runId, controllerPid,
    controllerMonotonicOrigin, phase, checkName: contract.checkName, expected, observed, status,
    capturedAtUtc, capturedAtMonotonic, sourceArtifact: contract.sourceArtifact, producer: contract.producer,
    producerVersion: PRODUCER_VERSION, numericExit, signal, timedOut,
  };
  validateR8Envelope(envelope, validationContext);
  return envelope;
}

export function buildEntryEnvelope({ entry, proof, inventory, deadlines, controllerPid, runId, entryStep, proofStep, capturedAtUtc, capturedAtMonotonic }) {
  validateEntryAndImmediateProof(entry, proof);
  assertExactInventory(inventory);
  requirePositiveInteger(controllerPid, 'controller PID');
  const envelope = buildR8Envelope({
    runId, controllerPid, controllerMonotonicOrigin: deadlines.originMonoMs, phase: 'ENTRY_RECEIPT',
    expected: {
      candidateSha: EXPECTED.candidate, candidateTree: EXPECTED.candidateTree, productionTarget: TARGET,
      gateManifestSha256: GATE_MANIFEST_SHA256, migrationFilenames: EXPECTED_FILENAMES,
    },
    observed: {
      entry, immediatePostCommitProof: proof, migrationInventory: inventory,
      immutableDeadlines: deadlines, rawCapture: { entryStep, proofStep },
    },
    status: 'ENTRY_COMMITTED_CONFIRMED', capturedAtUtc, capturedAtMonotonic, numericExit: 0,
  });
  return envelope;
}

export function entryFromEnvelope(envelope) {
  validateEntryEnvelope(envelope);
  return envelope.observed.entry;
}

export function validateMonitorAgainstEntry(sample, envelope) {
  validateEntryEnvelope(envelope);
  const entry = envelope.observed.entry;
  requireExact(sample, {
    transaction_read_only: 'on', function_count: 1, function_oid: entry.function_oid,
    function_owner: entry.function_owner, function_definition_sha256: entry.function_definition_sha256,
    trigger_count: 1, gate_trigger_oid: entry.trigger_oid, gate_table_owner: entry.trigger_table_owner,
    gate_enabled: 'A', gate_definition_sha256: entry.trigger_definition_sha256,
    truncate_trigger_count: 1, truncate_gate_trigger_oid: entry.truncate_trigger_oid,
    truncate_gate_enabled: 'A', truncate_gate_definition_sha256: entry.truncate_trigger_definition_sha256,
    flags_id_status_count: entry.flags_id_status_count, flags_id_status_sha256: entry.flags_id_status_sha256,
    history_count: entry.history_count, history_sha256: entry.history_sha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount, http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  }, 'Monitor');
  const versions = sample.phase03b_versions ?? [];
  const accepted = [[], [EXPECTED.migrations[0].version], EXPECTED.migrations.map((migration) => migration.version)];
  if (!accepted.some((candidate) => JSON.stringify(candidate) === JSON.stringify(versions))) throw new Error('Monitor observed unexpected Phase 03B ledger versions');
  const expectedCount = EXPECTED.baseline.ledgerCount + versions.length;
  if (sample.ledger_count !== expectedCount || sample.ledger_unique_count !== expectedCount) throw new Error('Monitor ledger count is inconsistent with the accepted migration state');
  return true;
}

export function deriveClientOutcome(step) {
  if (step.timedOut || step.exitCode === null || step.exitSignal || step.signal || step.spawnError || step.exitCode !== 0) {
    return { result: 'UNKNOWN', retryAllowed: false, rollbackInferred: false, adjudicationRequired: true };
  }
  return { result: 'CLIENT_EXIT_0', retryAllowed: false, rollbackInferred: false, adjudicationRequired: false };
}

function compareValue(actual, expected, label, mismatches) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push(label);
}

export function classifyGateIdentity(snapshot, entry = null) {
  if (!snapshot || snapshot.querySucceeded === false) return { state: 'GATE_UNKNOWN', mismatches: ['querySucceeded'] };
  const counts = [snapshot.function_count, snapshot.row_trigger_count, snapshot.truncate_trigger_count];
  if (counts.every((count) => count === 0)) return { state: 'GATE_ABSENT', mismatches: [] };
  const mismatches = [];
  if (!counts.every((count) => count === 1)) mismatches.push('objectCardinality');
  const [fn, rowTrigger, truncateTrigger] = EXPECTED_GATE_IDENTITIES.objects;
  const exact = {
    table_schema: EXPECTED_GATE_IDENTITIES.table.schema, table_name: EXPECTED_GATE_IDENTITIES.table.name,
    table_owner: EXPECTED_GATE_IDENTITIES.table.owner, function_schema: fn.schema, function_name: fn.name,
    function_identity_arguments: fn.identityArguments, function_owner: fn.owner, function_language: fn.language,
    function_security_definer: fn.securityDefiner, function_volatility: fn.volatility,
    function_definition_sha256: fn.normalizedDefinitionSha256,
    row_trigger_schema: rowTrigger.schema, row_trigger_table: rowTrigger.table,
    row_trigger_table_owner: rowTrigger.tableOwner, row_trigger_name: rowTrigger.name,
    row_trigger_enabled: rowTrigger.enabled, row_trigger_tgtype: rowTrigger.tgType,
    row_trigger_timing: rowTrigger.timing, row_trigger_level: rowTrigger.level,
    row_trigger_events: rowTrigger.events, row_trigger_update_columns: rowTrigger.updateColumns,
    row_trigger_function_identity: rowTrigger.referencedFunction,
    row_trigger_definition_sha256: rowTrigger.normalizedDefinitionSha256,
    truncate_trigger_schema: truncateTrigger.schema, truncate_trigger_table: truncateTrigger.table,
    truncate_trigger_table_owner: truncateTrigger.tableOwner, truncate_trigger_name: truncateTrigger.name,
    truncate_trigger_enabled: truncateTrigger.enabled, truncate_trigger_tgtype: truncateTrigger.tgType,
    truncate_trigger_timing: truncateTrigger.timing, truncate_trigger_level: truncateTrigger.level,
    truncate_trigger_events: truncateTrigger.events, truncate_trigger_update_columns: truncateTrigger.updateColumns,
    truncate_trigger_function_identity: truncateTrigger.referencedFunction,
    truncate_trigger_definition_sha256: truncateTrigger.normalizedDefinitionSha256,
  };
  for (const [key, value] of Object.entries(exact)) compareValue(snapshot[key], value, key, mismatches);
  const runtimeOids = {
    function_oid: snapshot.function_oid, table_oid: snapshot.table_oid,
    row_trigger_oid: snapshot.row_trigger_oid, truncate_trigger_oid: snapshot.truncate_trigger_oid,
    row_trigger_function_oid: snapshot.row_trigger_function_oid,
    truncate_trigger_function_oid: snapshot.truncate_trigger_function_oid,
    row_trigger_table_oid: snapshot.row_trigger_table_oid,
    truncate_trigger_table_oid: snapshot.truncate_trigger_table_oid,
  };
  const numericOids = Object.fromEntries(Object.entries(runtimeOids).map(([key, value]) => [key, Number(value)]));
  for (const [key, value] of Object.entries(numericOids)) if (!Number.isSafeInteger(value) || value <= 0) mismatches.push(key);
  compareValue(numericOids.row_trigger_function_oid, numericOids.function_oid, 'rowTriggerFunctionOidRelationship', mismatches);
  compareValue(numericOids.truncate_trigger_function_oid, numericOids.function_oid, 'truncateTriggerFunctionOidRelationship', mismatches);
  compareValue(numericOids.row_trigger_table_oid, numericOids.table_oid, 'rowTriggerTableOidRelationship', mismatches);
  compareValue(numericOids.truncate_trigger_table_oid, numericOids.table_oid, 'truncateTriggerTableOidRelationship', mismatches);
  if (entry) {
    compareValue(numericOids.function_oid, Number(entry.function_oid), 'entryFunctionOid', mismatches);
    compareValue(numericOids.table_oid, Number(entry.table_oid), 'entryTableOid', mismatches);
    compareValue(numericOids.row_trigger_oid, Number(entry.trigger_oid), 'entryRowTriggerOid', mismatches);
    compareValue(numericOids.truncate_trigger_oid, Number(entry.truncate_trigger_oid), 'entryTruncateTriggerOid', mismatches);
  }
  return {
    state: mismatches.length === 0 ? 'GATE_PRESENT_EXACT' : 'GATE_PRESENT_MISMATCH',
    mismatches: [...new Set(mismatches)].sort(),
    runtimeBindings: {
      functionOid: Number.isSafeInteger(numericOids.function_oid) ? numericOids.function_oid : null,
      tableOid: Number.isSafeInteger(numericOids.table_oid) ? numericOids.table_oid : null,
      rowTriggerOid: Number.isSafeInteger(numericOids.row_trigger_oid) ? numericOids.row_trigger_oid : null,
      truncateTriggerOid: Number.isSafeInteger(numericOids.truncate_trigger_oid) ? numericOids.truncate_trigger_oid : null,
    },
  };
}

export function classifyEntryState(snapshot, entry = null) {
  const gate = classifyGateIdentity(snapshot, entry);
  if (gate.state === 'GATE_PRESENT_EXACT') return { classification: 'ENTRY_COMMITTED_CONFIRMED', gate };
  if (gate.state === 'GATE_ABSENT') return { classification: 'ENTRY_CONFIRMED_NOT_COMMITTED', gate };
  return { classification: 'OWNER_REQUIRED_FAIL_CLOSED', gate };
}

export function classifyServerState(snapshot, context = {}) {
  if (!snapshot || snapshot.querySucceeded === false) return 'BACKEND_UNKNOWN';
  const gateState = context.gateState ?? classifyGateIdentity(snapshot, context.entry ?? null).state;
  if (gateState === 'GATE_PRESENT_MISMATCH' || gateState === 'GATE_UNKNOWN') return 'QUIESCENCE_IDENTITY_MISMATCH';
  if ((snapshot.candidate_backends ?? []).some((backend) => backend.state !== 'idle')) return 'BACKEND_STILL_ACTIVE';
  const versions = snapshot.phase03b_versions ?? [];
  const expected = EXPECTED.migrations.map((migration) => migration.version);
  if (snapshot.ledger_unique_count !== snapshot.ledger_count || !versions.every((version) => expected.includes(version)) ||
      versions.length > 2 || (versions.length === 1 && versions[0] !== expected[0]) ||
      ![EXPECTED.baseline.ledgerCount, EXPECTED.baseline.ledgerCount + 1, EXPECTED.final.ledgerCount].includes(snapshot.ledger_count)) {
    return 'UNEXPECTED_LEDGER_STATE';
  }
  if (versions.length === 0) return context.applySpawned ? 'NO_PHASE03B_LEDGER_ROWS' : 'APPLY_NOT_STARTED';
  if (versions.length === 1) return 'MIGRATION_1_ONLY';
  if (snapshot.structureExact === false) return 'LEDGER_STRUCTURE_DISAGREE';
  if (snapshot.structureExact === true) return 'BOTH_RECORDED_EXPECTED_STRUCTURE';
  return 'BOTH_MIGRATIONS_RECORDED';
}

export function statePolicy(stateId) {
  const state = STATE_MACHINE.states.find((candidate) => candidate.state_id === stateId);
  if (!state) throw new Error(`Unknown state policy: ${stateId}`);
  return state;
}

export function createEscalationLatch() {
  return { latched: false, state: 'WITHIN_MAXIMUM_QUIESCENCE', latchedAtMonotonic: null, reason: null };
}

export function updateEscalationLatch(latch, nowMonoMs, maximumMonoMs, reason = 'Maximum quiescence boundary reached') {
  if (latch.latched) return latch;
  if (nowMonoMs >= maximumMonoMs) {
    latch.latched = true;
    latch.state = ESCALATED_STATE;
    latch.latchedAtMonotonic = nowMonoMs;
    latch.reason = reason;
  }
  return latch;
}

export function maxQuiescenceState(elapsedMs) {
  return elapsedMs >= EXPECTED.timingMs.maximumQuiescenceEscalation ? ESCALATED_STATE : 'WITHIN_MAXIMUM_QUIESCENCE';
}

export function evaluateExitEligibility(state) {
  const required = [
    'postApplyVerificationPass', 'primaryInvariantPass', 'historyCorroborationPass', 'httpBaselinePass',
    'gateIdentityPass', 'ledgerExactExpected', 'structureExactExpected', 'noUnknownState',
    'withinMaximumQuiescence', 'noEscalationLatch',
  ];
  const missing = required.filter((key) => state[key] !== true);
  return { allowed: missing.length === 0, missing };
}

export function assertExitDispatchAllowed({
  controllerState,
  escalationLatch,
  nowMonoMs,
  maximumMonoMs,
  allComparatorsPass,
  primaryInvariantPass,
  historyCorroborationPass,
  httpBaselinePass,
  gateIdentityExact,
  noUnknownState,
  noInvalidEnvelope,
  currentRunMatchesEvidence,
}) {
  updateEscalationLatch(escalationLatch, nowMonoMs, maximumMonoMs, 'Exit dispatch reached or crossed the hard maximum');
  if (controllerState !== 'VERIFIED_SAFE_TO_EXIT' || escalationLatch.latched || nowMonoMs >= maximumMonoMs ||
      allComparatorsPass !== true || primaryInvariantPass !== true || historyCorroborationPass !== true ||
      httpBaselinePass !== true || gateIdentityExact !== true || noUnknownState !== true ||
      noInvalidEnvelope !== true || currentRunMatchesEvidence !== true) {
    throw new Error('Exit/restoration dispatch prohibited by R8 hard guard');
  }
  return true;
}

export function dispatchRestorationBeforeDeadline({ nowMonoMs, maximumMonoMs, spawnChild, ...predicates }) {
  if (typeof nowMonoMs !== 'function' || typeof spawnChild !== 'function') {
    throw new Error('Restoration dispatch requires exact clock and spawn functions');
  }
  const dispatchedAtMonoMs = nowMonoMs();
  assertExitDispatchAllowed({ ...predicates, nowMonoMs: dispatchedAtMonoMs, maximumMonoMs });
  const child = spawnChild();
  return Object.freeze({ child, dispatchedAtMonoMs, maximumMonoMs });
}

export function assertAutomationAllowed(escalationLatch, action) {
  if (escalationLatch.latched) throw new Error(`${action} prohibited after ${ESCALATED_STATE}`);
  return true;
}

export function postExitDisposition(step, comparatorEnvelope, constraints = {}) {
  try {
    validateR8Envelope(comparatorEnvelope, { phase: 'POST_EXIT_COMPARATOR', ...constraints });
  } catch {
    return { result: 'HOLD', state: 'EXIT_FAILED_OWNER_REQUIRED' };
  }
  if (deriveClientOutcome(step).result !== 'CLIENT_EXIT_0' || comparatorEnvelope.status !== 'PASS_RESTORED' || comparatorEnvelope.numericExit !== 0) {
    return { result: 'HOLD', state: 'EXIT_FAILED_OWNER_REQUIRED' };
  }
  return { result: 'PASS', state: 'COMPLETE' };
}
