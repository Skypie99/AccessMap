import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
export const EXPECTED = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_VALUES.json'), 'utf8'));
export const STATE_MACHINE = JSON.parse(readFileSync(join(PACKET, 'PARTIAL_APPLY_STATE_MACHINE.json'), 'utf8'));
export const EXPECTED_FILENAMES = EXPECTED.migrations.map((migration) => migration.filename);
export const TARGET = EXPECTED.productionTarget;

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

export function parseCliJson(text) {
  const objectAt = text.indexOf('{');
  const arrayAt = text.indexOf('[');
  const offset = objectAt === -1 ? arrayAt : arrayAt === -1 ? objectAt : Math.min(objectAt, arrayAt);
  if (offset < 0) throw new Error('CLI output contained no JSON');
  return JSON.parse(text.slice(offset));
}

export function resultRow(payload, key) {
  return payload.rows?.[0]?.[key] ?? payload[key] ?? payload;
}

export function assertExactInventory(inventory) {
  if (inventory.schemaVersion !== 1 || inventory.packetVersion !== 'R4' || inventory.target !== TARGET) {
    throw new Error('Hermetic inventory metadata mismatch');
  }
  if (inventory.migrationFileCount !== 2 || inventory.files?.length !== 2) {
    throw new Error('MIGRATION_FILE_COUNT must equal 2');
  }
  const actualNames = inventory.files.map((file) => file.filename);
  if (JSON.stringify(actualNames) !== JSON.stringify(EXPECTED_FILENAMES)) {
    throw new Error('Hermetic migration filename set/order mismatch');
  }
  for (const [index, file] of inventory.files.entries()) {
    const expected = EXPECTED.migrations[index];
    if (file.relativePath !== `supabase/migrations/${expected.filename}` || file.sha256 !== expected.sha256 ||
        !Number.isSafeInteger(file.size) || file.size <= 0) {
      throw new Error(`Hermetic migration inventory mismatch: ${expected.filename}`);
    }
  }
  if (inventory.seedFiles !== 0 || inventory.roleFiles !== 0 || inventory.otherSqlFiles !== 0) {
    throw new Error('Hermetic workspace contains seed, role, or helper SQL');
  }
  return true;
}

export function validateDryRunPlan(payload) {
  if (payload.dryRun !== true || payload.upToDate !== false) throw new Error('Pre-apply plan is not a pending dry-run');
  if (JSON.stringify(payload.migrations) !== JSON.stringify(EXPECTED_FILENAMES)) {
    throw new Error('Pre-apply dry-run did not propose the exact frozen pair');
  }
  if (!Array.isArray(payload.seeds) || payload.seeds.length !== 0 || !Array.isArray(payload.roles) || payload.roles.length !== 0) {
    throw new Error('Pre-apply dry-run includes seed or role work');
  }
  return true;
}

export function createDeadlines(originMonoMs) {
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

function requireExact(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) throw new Error(`${label} mismatch: ${key}`);
  }
}

export function validateEntryAndImmediateProof(entry, proof) {
  const gate = EXPECTED.gate;
  requireExact(entry, {
    receipt: 'phase03b_quiescence_entry_r3',
    function_owner: gate.functionOwner,
    trigger_table_owner: gate.tableOwner,
    function_definition_sha256: gate.functionDefinitionSha256,
    trigger_definition_sha256: gate.rowTriggerDefinitionSha256,
    truncate_trigger_definition_sha256: gate.truncateTriggerDefinitionSha256,
    trigger_enabled: gate.enableState,
    truncate_trigger_enabled: gate.enableState,
    ledger_count: EXPECTED.baseline.ledgerCount,
    ledger_unique_count: EXPECTED.baseline.ledgerUniqueCount,
    ledger_latest_version: EXPECTED.baseline.ledgerLatestVersion,
    phase03b_ledger_count: 0,
    ledger_ordered_version_name_sha256: EXPECTED.baseline.ledgerSha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount,
    http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  }, 'Entry receipt');
  requireExact(proof, {
    receipt: 'phase03b_quiescence_proof_r3',
    transaction_read_only: 'on',
    function_count: 1,
    function_owner: gate.functionOwner,
    function_definition_sha256: gate.functionDefinitionSha256,
    trigger_count: 1,
    trigger_table_owner: gate.tableOwner,
    trigger_enabled: gate.enableState,
    trigger_definition_sha256: gate.rowTriggerDefinitionSha256,
    truncate_trigger_count: 1,
    truncate_trigger_enabled: gate.enableState,
    truncate_trigger_definition_sha256: gate.truncateTriggerDefinitionSha256,
    ledger_count: EXPECTED.baseline.ledgerCount,
    ledger_unique_count: EXPECTED.baseline.ledgerUniqueCount,
    ledger_latest_version: EXPECTED.baseline.ledgerLatestVersion,
    ledger_ordered_version_name_sha256: EXPECTED.baseline.ledgerSha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount,
    http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  }, 'Immediate proof');
  if (JSON.stringify(proof.phase03b_versions ?? []) !== '[]' || JSON.stringify(proof.phase03b_rows ?? []) !== '[]') {
    throw new Error('Immediate proof contains Phase 03B ledger rows');
  }
  for (const key of [
    'function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'function_owner',
    'trigger_table_owner', 'function_definition_sha256', 'trigger_definition_sha256',
    'truncate_trigger_definition_sha256', 'trigger_enabled', 'truncate_trigger_enabled',
    'flags_id_status_count', 'flags_id_status_sha256', 'history_count', 'history_sha256',
    'ledger_count', 'ledger_unique_count', 'ledger_latest_version',
    'ledger_ordered_version_name_sha256', 'http_queue_count', 'http_response_count', 'http_response_sha256',
  ]) {
    if (entry[key] !== proof[key]) throw new Error(`Entry/proof mismatch: ${key}`);
  }
  if (entry.pre_install_flags_id_status_count !== entry.flags_id_status_count ||
      entry.pre_install_flags_id_status_sha256 !== entry.flags_id_status_sha256 ||
      entry.pre_install_history_count !== entry.history_count || entry.pre_install_history_sha256 !== entry.history_sha256) {
    throw new Error('Pre-install and post-install invariant captures differ');
  }
  return true;
}

export function buildEntryEnvelope({ entry, proof, inventory, deadlines, controllerPid, entryStep, proofStep }) {
  validateEntryAndImmediateProof(entry, proof);
  assertExactInventory(inventory);
  if (!Number.isSafeInteger(controllerPid) || controllerPid <= 0) throw new Error('Invalid controller PID');
  const envelope = {
    schemaVersion: 1,
    packetVersion: 'R4',
    target: TARGET,
    candidate: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree,
    migrationInventory: inventory,
    monotonicOriginMs: deadlines.originMonoMs,
    immutableDeadlines: deadlines,
    controllerPid,
    entryBoundaryUtc: entry.boundary_at_utc,
    backendPid: entry.backend_pid,
    xid: entry.transaction_id ?? null,
    lockAcquisitionStartedAtUtc: entry.lock_acquisition_started_at_utc,
    lockAcquisitionEndedAtUtc: entry.lock_acquisition_ended_at_utc,
    lockWaitMs: entry.lock_wait_ms,
    rowGateOid: entry.trigger_oid,
    rowGateFunctionOid: entry.function_oid,
    truncateGateOid: entry.truncate_trigger_oid,
    owners: { function: entry.function_owner, table: entry.trigger_table_owner },
    normalizedGateHashes: {
      function: entry.function_definition_sha256,
      rowTrigger: entry.trigger_definition_sha256,
      truncateTrigger: entry.truncate_trigger_definition_sha256,
    },
    enableAlways: { rowTrigger: entry.trigger_enabled, truncateTrigger: entry.truncate_trigger_enabled },
    primaryInvariant: { count: entry.flags_id_status_count, sha256: entry.flags_id_status_sha256 },
    historyInvariant: { count: entry.history_count, sha256: entry.history_sha256 },
    ledger: { count: entry.ledger_count, uniqueCount: entry.ledger_unique_count, latestVersion: entry.ledger_latest_version, sha256: entry.ledger_ordered_version_name_sha256 },
    http: { queueCount: entry.http_queue_count, responseCount: entry.http_response_count, responseSha256: entry.http_response_sha256 },
    entry,
    immediatePostCommitProof: proof,
    rawCapture: { entryStep, proofStep },
  };
  validateEntryEnvelope(envelope);
  return envelope;
}

export function validateEntryEnvelope(envelope) {
  if (envelope.schemaVersion !== 1 || envelope.packetVersion !== 'R4' || envelope.target !== TARGET ||
      envelope.candidate !== EXPECTED.candidate || envelope.candidateTree !== EXPECTED.candidateTree) {
    throw new Error('R4 entry envelope identity mismatch');
  }
  validateEntryAndImmediateProof(envelope.entry, envelope.immediatePostCommitProof);
  assertExactInventory(envelope.migrationInventory);
  if (envelope.rowGateOid !== envelope.entry.trigger_oid || envelope.rowGateFunctionOid !== envelope.entry.function_oid ||
      envelope.truncateGateOid !== envelope.entry.truncate_trigger_oid) throw new Error('R4 entry envelope OID projection mismatch');
  if (!envelope.immutableDeadlines || envelope.immutableDeadlines.originMonoMs !== envelope.monotonicOriginMs) {
    throw new Error('R4 entry envelope deadline origin mismatch');
  }
  return true;
}

export function validateMonitorAgainstEntry(sample, envelopeOrEntry) {
  const entry = envelopeOrEntry?.entry ?? envelopeOrEntry;
  if (envelopeOrEntry?.entry) validateEntryEnvelope(envelopeOrEntry);
  if (!entry || entry.receipt !== 'phase03b_quiescence_entry_r3' ||
      entry.function_definition_sha256 !== EXPECTED.gate.functionDefinitionSha256 ||
      entry.trigger_definition_sha256 !== EXPECTED.gate.rowTriggerDefinitionSha256 ||
      entry.truncate_trigger_definition_sha256 !== EXPECTED.gate.truncateTriggerDefinitionSha256 ||
      entry.ledger_count !== EXPECTED.baseline.ledgerCount ||
      entry.http_response_sha256 !== EXPECTED.baseline.httpResponseSha256) {
    throw new Error('Monitor reference entry is not the exact accepted boundary');
  }
  requireExact(sample, {
    transaction_read_only: 'on',
    function_count: 1,
    function_oid: entry.function_oid,
    function_owner: entry.function_owner,
    function_definition_sha256: entry.function_definition_sha256,
    trigger_count: 1,
    gate_trigger_oid: entry.trigger_oid,
    gate_table_owner: entry.trigger_table_owner,
    gate_enabled: 'A',
    gate_definition_sha256: entry.trigger_definition_sha256,
    truncate_trigger_count: 1,
    truncate_gate_trigger_oid: entry.truncate_trigger_oid,
    truncate_gate_enabled: 'A',
    truncate_gate_definition_sha256: entry.truncate_trigger_definition_sha256,
    flags_id_status_count: entry.flags_id_status_count,
    flags_id_status_sha256: entry.flags_id_status_sha256,
    history_count: entry.history_count,
    history_sha256: entry.history_sha256,
    http_queue_count: EXPECTED.baseline.httpQueueCount,
    http_response_count: EXPECTED.baseline.httpResponseCount,
    http_response_sha256: EXPECTED.baseline.httpResponseSha256,
  }, 'Monitor');
  const versions = sample.phase03b_versions ?? [];
  const accepted = [[], [EXPECTED.migrations[0].version], EXPECTED.migrations.map((migration) => migration.version)];
  if (!accepted.some((candidate) => JSON.stringify(candidate) === JSON.stringify(versions))) {
    throw new Error('Monitor observed unexpected Phase 03B ledger versions');
  }
  const expectedCount = EXPECTED.baseline.ledgerCount + versions.length;
  if (sample.ledger_count !== expectedCount || sample.ledger_unique_count !== expectedCount) {
    throw new Error('Monitor ledger count is inconsistent with the accepted migration state');
  }
  return true;
}

export function deriveClientOutcome(step) {
  if (step.timedOut || step.exitCode === null || step.exitSignal || step.spawnError || step.exitCode !== 0) {
    return { result: 'UNKNOWN', retryAllowed: false, rollbackInferred: false, adjudicationRequired: true };
  }
  return { result: 'CLIENT_EXIT_0', retryAllowed: false, rollbackInferred: false, adjudicationRequired: false };
}

export function classifyServerState(snapshot, context = {}) {
  if (!snapshot || snapshot.querySucceeded === false) return 'BACKEND_UNKNOWN';
  if (snapshot.gateIdentityExact === false) return 'QUIESCENCE_IDENTITY_MISMATCH';
  if ((snapshot.candidate_backends ?? []).some((backend) => backend.state !== 'idle')) return 'BACKEND_STILL_ACTIVE';
  const versions = snapshot.phase03b_versions ?? [];
  const expected = EXPECTED.migrations.map((migration) => migration.version);
  if (snapshot.ledger_unique_count !== snapshot.ledger_count ||
      !versions.every((version) => expected.includes(version)) || versions.length > 2 ||
      (versions.length === 1 && versions[0] !== expected[0]) ||
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

export function maxQuiescenceState(elapsedMs) {
  return elapsedMs >= EXPECTED.timingMs.maximumQuiescenceEscalation ? 'ESCALATED_FAIL_CLOSED' : 'WITHIN_WINDOW';
}

export function evaluateExitEligibility(state) {
  const required = [
    'postApplyVerificationPass', 'primaryInvariantPass', 'historyCorroborationPass', 'httpBaselinePass',
    'gateIdentityPass', 'ledgerExactExpected', 'structureExactExpected', 'noUnknownState',
    'withinMaximumQuiescence',
  ];
  const missing = required.filter((key) => state[key] !== true);
  return { allowed: missing.length === 0, missing };
}

export function postExitDisposition(step, comparatorReceipt) {
  if (deriveClientOutcome(step).result !== 'CLIENT_EXIT_0' || comparatorReceipt?.result !== 'PASS_RESTORED') {
    return { result: 'HOLD', state: 'EXIT_FAILED_OWNER_REQUIRED' };
  }
  return { result: 'PASS', state: 'COMPLETE' };
}
