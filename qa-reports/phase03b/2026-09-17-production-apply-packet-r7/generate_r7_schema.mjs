#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const exactObject = (keys, properties = {}) => ({
  type: 'object',
  additionalProperties: false,
  required: keys,
  properties: Object.fromEntries(keys.map((key) => [key, properties[key] ?? {}])),
});
const ref = (name) => ({ $ref: `#/$defs/${name}` });
const sha256 = ref('sha256');
const utc = ref('utc');
const positive = ref('positiveInteger');
const nonNegative = ref('nonNegativeInteger');
const oid = ref('oid');

const entryStateKeys = [
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
const entryProofKeys = [
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
const controllerStepKeys = [
  'label', 'command', 'controllerPid', 'childPid', 'processGroupId', 'startedAt', 'endedAt',
  'startedMonoMs', 'endedMonoMs', 'absoluteDeadlineMonoMs', 'restorationDispatchedAtMonoMs',
  'timeoutMs', 'timedOut', 'signalSent', 'exitCode', 'exitSignal', 'spawnError', 'stdoutPath', 'stderrPath',
];
const serverSnapshotKeys = [
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
const comparatorExpectedKeys = ['result', 'gateManifestSha256', 'finalLedgerSha256', 'finalStructureSha256', 'httpResponseSha256'];
const postApplyProofKeys = [
  'receipt', 'transaction_read_only', 'captured_at_utc', 'backend_pid', 'table_oid',
  'function_count', 'function_oid', 'function_owner', 'function_execute_grants', 'function_definition_sha256',
  'trigger_count', 'trigger_oid', 'trigger_table_owner', 'trigger_enabled', 'trigger_definition_sha256',
  'truncate_trigger_count', 'truncate_trigger_oid', 'truncate_trigger_table_oid', 'truncate_trigger_enabled',
  'truncate_trigger_definition_sha256', 'flags_id_status_count', 'flags_id_status_sha256', 'history_count',
  'history_sha256', 'ledger_count', 'ledger_unique_count', 'ledger_latest_version',
  'ledger_ordered_version_name_sha256', 'phase03b_versions', 'phase03b_rows',
  'phase03b_constraint_index_sha256', 'http_queue_count', 'http_response_count', 'http_response_sha256',
];
const postExitProofKeys = [
  'receipt', 'transaction_read_only', 'captured_at_utc', 'function_count', 'reserved_trigger_count',
  'ledger_count', 'ledger_unique_count', 'ledger_latest_version', 'ledger_ordered_version_name_sha256',
  'phase03b_versions', 'phase03b_rows', 'phase03b_constraint_index_sha256', 'flags_id_status_count',
  'flags_id_status_sha256', 'history_count', 'history_sha256', 'http_queue_count', 'http_response_count',
  'http_response_sha256',
];

const entryNumeric = [
  'transaction_id', 'backend_pid',
];
const entryOids = ['function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'truncate_trigger_table_oid'];
const entryNonNegative = [
  'flags_id_status_count', 'history_count', 'ledger_count', 'ledger_unique_count', 'http_queue_count',
  'http_response_count', 'phase03b_ledger_count', 'lock_wait_ms', 'pre_install_flags_id_status_count',
  'pre_install_history_count',
];
const entryDigests = [
  'function_definition_sha256', 'trigger_definition_sha256', 'truncate_trigger_definition_sha256',
  'flags_id_status_sha256', 'history_sha256', 'ledger_ordered_version_name_sha256', 'http_response_sha256',
  'pre_install_flags_id_status_sha256', 'pre_install_history_sha256',
];
const entryStateProperties = Object.fromEntries([
  ...entryNumeric.map((key) => [key, positive]),
  ...entryOids.map((key) => [key, oid]),
  ...entryNonNegative.map((key) => [key, nonNegative]),
  ...entryDigests.map((key) => [key, sha256]),
]);
Object.assign(entryStateProperties, {
  receipt: { const: 'phase03b_quiescence_entry_r3' }, phase03b_ledger_count: { const: 0 },
  boundary_at_utc: utc, lock_acquisition_started_at_utc: utc, lock_acquisition_ended_at_utc: utc,
  lock_wait_ms: { type: 'number', minimum: 0 },
  lock_mode: { const: 'SHARE ROW EXCLUSIVE' }, function_execute_grants: { type: 'array', items: ref('grant') },
  pre_entry_structural_snapshot_sha256: { const: '2d533d8f8bfb827fe6b63f4fb6f17035afd55b8d474260a51a20fe2c004bda01' },
});
const entryProofProperties = Object.fromEntries(entryProofKeys.map((key) => [key, entryStateProperties[key] ?? {}]));
Object.assign(entryProofProperties, {
  receipt: { const: 'phase03b_quiescence_proof_r3' }, transaction_read_only: { const: 'on' },
  captured_at_utc: utc, backend_pid: positive, truncate_trigger_table_oid: oid,
  function_execute_grants: { type: 'array', items: ref('grant') },
  phase03b_constraint_index_sha256: { const: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  function_count: { const: 1 }, trigger_count: { const: 1 }, truncate_trigger_count: { const: 1 },
  phase03b_versions: { type: 'array', maxItems: 0 }, phase03b_rows: { type: 'array', maxItems: 0 },
});

const policyAKeys = [
  'state_id', 'predicate', 'controller_state', 'ledger_state', 'gate_state', 'apply_allowed', 'retry_allowed',
  'exit_allowed', 'restoration_allowed', 'rollback_automatic', 'owner_required', 'required_evidence', 'next_action',
];
const policyBKeys = [
  'state_id', 'predicate', 'apply_allowed', 'retry_allowed', 'restoration_allowed', 'rollback_auto_allowed',
  'owner_required', 'quiescence_state', 'required_evidence', 'next_action',
];
const boolSchema = { type: 'boolean' };
const policyProperties = {
  apply_allowed: boolSchema, retry_allowed: boolSchema, exit_allowed: boolSchema, restoration_allowed: boolSchema,
  rollback_automatic: boolSchema, rollback_auto_allowed: boolSchema, owner_required: boolSchema,
  required_evidence: ref('stringArray'),
};
const comparatorStep = {
  oneOf: [
    exactObject(['comparatorError'], { comparatorError: { type: 'string', minLength: 1 } }),
    exactObject(['command', 'startedAt', 'endedAt', 'exitCode', 'signal', 'timedOut'], {
      command: ref('stringArray'), startedAt: utc, endedAt: utc, exitCode: ref('nullableInteger'),
      signal: { type: ['string', 'null'] }, timedOut: boolSchema,
    }),
    exactObject(['command', 'childPid', 'startedAt', 'endedAt', 'timeoutMs', 'timedOut', 'exitCode', 'signal', 'error', 'stdoutPath', 'stderrPath'], {
      command: ref('stringArray'), childPid: positive, startedAt: utc, endedAt: utc, timeoutMs: positive,
      timedOut: boolSchema, exitCode: ref('nullableInteger'), signal: { type: ['string', 'null'] }, error: { type: ['string', 'null'] },
    }),
  ],
};

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'flagstone.phase03b.r7-envelope.v1',
  title: 'Flagstone Phase 03B R7 exact safety envelope',
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion', 'packetVersion', 'candidateSha', 'candidateTree', 'productionTarget', 'runId',
    'controllerPid', 'controllerMonotonicOrigin', 'phase', 'checkName', 'expected', 'observed', 'status',
    'capturedAtUtc', 'capturedAtMonotonic', 'sourceArtifact', 'producer', 'producerVersion', 'numericExit',
    'signal', 'timedOut',
  ],
  properties: {
    schemaVersion: { const: 'flagstone.phase03b.r7-envelope.v1' }, packetVersion: { const: 'R7' },
    candidateSha: { const: '9d638456fa8e679678c54f131fe8f0db723eda72' },
    candidateTree: { const: 'cfc76206f7cf7af6a7127a6329620d2ee1dc4da8' },
    productionTarget: { const: 'kldlwszpfkdmsjrjhjym' },
    runId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' },
    controllerPid: positive, controllerMonotonicOrigin: nonNegative,
    phase: { enum: ['ENTRY_RECEIPT', 'SERVER_STATE_CLASSIFICATION', 'POST_APPLY_COMPARATOR', 'POST_EXIT_COMPARATOR'] },
    checkName: { type: 'string', minLength: 1 }, expected: { type: 'object' }, observed: { type: 'object' },
    status: { enum: ['HOLD', 'ENTRY_COMMITTED_CONFIRMED', 'ENTRY_CONFIRMED_NOT_COMMITTED', 'OWNER_REQUIRED_FAIL_CLOSED', 'PASS_WHILE_QUIESCED', 'PASS_RESTORED'] },
    capturedAtUtc: utc, capturedAtMonotonic: nonNegative, sourceArtifact: { type: 'string', minLength: 1 },
    producer: { type: 'string', minLength: 1 }, producerVersion: { const: 'flagstone.phase03b.packet-r7.v1' },
    numericExit: { type: 'integer' }, signal: { type: ['string', 'null'] }, timedOut: boolSchema,
  },
  $defs: {
    positiveInteger: { type: 'integer', minimum: 1 }, nonNegativeInteger: { type: 'integer', minimum: 0 },
    oid: { type: 'string', pattern: '^[1-9][0-9]*$' },
    nullableInteger: { type: ['integer', 'null'] }, sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' },
    utc: { type: 'string', format: 'date-time' }, stringArray: { type: 'array', items: { type: 'string' } },
    migrationRows: { type: 'array', items: exactObject(['version', 'name', 'statement_count', 'statement_sha256'], { statement_count: positive, statement_sha256: sha256 }) },
    entryExpected: exactObject(['candidateSha', 'candidateTree', 'productionTarget', 'gateManifestSha256', 'migrationFilenames'], {
      candidateSha: { const: '9d638456fa8e679678c54f131fe8f0db723eda72' },
      candidateTree: { const: 'cfc76206f7cf7af6a7127a6329620d2ee1dc4da8' }, productionTarget: { const: 'kldlwszpfkdmsjrjhjym' },
      gateManifestSha256: sha256, migrationFilenames: { type: 'array', minItems: 2, maxItems: 2, prefixItems: [
        { const: '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql' },
        { const: '20260915210413_phase03b_points_integrity.sql' },
      ] },
    }),
    entryState: exactObject(entryStateKeys, entryStateProperties),
    entryProof: exactObject(entryProofKeys, entryProofProperties),
    migrationInventoryFile: exactObject(['relativePath', 'filename', 'size', 'sha256'], { size: positive, sha256 }),
    migrationInventory: exactObject(['schemaVersion', 'packetVersion', 'target', 'candidate', 'candidateTree', 'workspaceRoot', 'migrationFileCount', 'seedFiles', 'roleFiles', 'otherSqlFiles', 'files'], {
      schemaVersion: { const: 1 }, packetVersion: { const: 'R7' }, target: { const: 'kldlwszpfkdmsjrjhjym' },
      candidate: { const: '9d638456fa8e679678c54f131fe8f0db723eda72' }, candidateTree: { const: 'cfc76206f7cf7af6a7127a6329620d2ee1dc4da8' },
      migrationFileCount: { const: 2 }, seedFiles: { const: 0 }, roleFiles: { const: 0 }, otherSqlFiles: { const: 0 },
      files: { type: 'array', minItems: 2, maxItems: 2, items: ref('migrationInventoryFile') },
    }),
    deadlines: exactObject(['originMonoMs', 'entryCompleteMonoMs', 'applyCompleteMonoMs', 'postApplyVerificationCompleteMonoMs', 'maximumQuiescenceEscalationMonoMs'], {
      originMonoMs: nonNegative, entryCompleteMonoMs: nonNegative, applyCompleteMonoMs: nonNegative,
      postApplyVerificationCompleteMonoMs: nonNegative, maximumQuiescenceEscalationMonoMs: nonNegative,
    }),
    controllerStep: exactObject(controllerStepKeys, {
      command: ref('stringArray'), controllerPid: positive, childPid: positive, processGroupId: ref('nullableInteger'),
      startedAt: utc, endedAt: utc, startedMonoMs: nonNegative, endedMonoMs: nonNegative,
      absoluteDeadlineMonoMs: nonNegative, restorationDispatchedAtMonoMs: ref('nullableInteger'), timeoutMs: positive,
      timedOut: boolSchema, signalSent: { type: ['string', 'null'] }, exitCode: ref('nullableInteger'),
      exitSignal: { type: ['string', 'null'] }, spawnError: { type: ['string', 'null'] },
    }),
    entryObserved: exactObject(['entry', 'immediatePostCommitProof', 'migrationInventory', 'immutableDeadlines', 'rawCapture'], {
      entry: ref('entryState'), immediatePostCommitProof: ref('entryProof'), migrationInventory: ref('migrationInventory'),
      immutableDeadlines: ref('deadlines'), rawCapture: exactObject(['entryStep', 'proofStep'], { entryStep: ref('controllerStep'), proofStep: ref('controllerStep') }),
    }),
    serverExpected: exactObject(['gateManifestSha256', 'acceptedLedgerCounts', 'productionTarget'], {
      gateManifestSha256: sha256, acceptedLedgerCounts: { type: 'array', minItems: 3, maxItems: 3, items: nonNegative },
      productionTarget: { const: 'kldlwszpfkdmsjrjhjym' },
    }),
    runtimeBindings: exactObject(['functionOid', 'tableOid', 'rowTriggerOid', 'truncateTriggerOid'], {
      functionOid: ref('nullableInteger'), tableOid: ref('nullableInteger'), rowTriggerOid: ref('nullableInteger'), truncateTriggerOid: ref('nullableInteger'),
    }),
    gateState: { oneOf: [
      exactObject(['state', 'mismatches'], { state: { enum: ['GATE_UNKNOWN', 'GATE_ABSENT'] }, mismatches: ref('stringArray') }),
      exactObject(['state', 'mismatches', 'runtimeBindings'], { state: { enum: ['GATE_PRESENT_EXACT', 'GATE_PRESENT_MISMATCH'] }, mismatches: ref('stringArray'), runtimeBindings: ref('runtimeBindings') }),
    ] },
    candidateBackend: exactObject(['pid', 'usename', 'application_name', 'state', 'wait_event_type', 'wait_event', 'xact_start', 'query_start'], { pid: positive }),
    serverSnapshotFailure: exactObject(['querySucceeded', 'captureError'], { querySucceeded: { const: false }, captureError: { type: 'string', minLength: 1 } }),
    serverSnapshotSuccess: {
      ...exactObject(serverSnapshotKeys, {
        querySucceeded: { const: true }, receipt: { const: 'phase03b_server_state_r7' }, captured_at_utc: utc,
        transaction_read_only: { const: 'on' }, candidate_backends: { type: 'array', items: ref('candidateBackend') },
        ledger_count: nonNegative, ledger_unique_count: nonNegative, ledger_ordered_version_name_sha256: sha256,
        phase03b_versions: ref('stringArray'), table_oid: oid, function_oid: { anyOf: [oid, { type: 'null' }] },
        row_trigger_oid: { anyOf: [oid, { type: 'null' }] }, row_trigger_table_oid: { anyOf: [oid, { type: 'null' }] },
        row_trigger_function_oid: { anyOf: [oid, { type: 'null' }] }, truncate_trigger_oid: { anyOf: [oid, { type: 'null' }] },
        truncate_trigger_table_oid: { anyOf: [oid, { type: 'null' }] }, truncate_trigger_function_oid: { anyOf: [oid, { type: 'null' }] },
        function_count: nonNegative, row_trigger_count: nonNegative,
        truncate_trigger_count: nonNegative, flags_id_status_count: nonNegative, flags_id_status_sha256: sha256,
        history_count: nonNegative, history_sha256: sha256, http_queue_count: nonNegative,
        http_response_count: nonNegative, http_response_sha256: sha256,
      }),
      required: serverSnapshotKeys,
      properties: { ...Object.fromEntries(serverSnapshotKeys.map((key) => [key, {}])),
        querySucceeded: { const: true }, receipt: { const: 'phase03b_server_state_r7' }, captured_at_utc: utc,
        transaction_read_only: { const: 'on' }, candidate_backends: { type: 'array', items: ref('candidateBackend') },
        ledger_count: nonNegative, ledger_unique_count: nonNegative, ledger_ordered_version_name_sha256: sha256,
        phase03b_versions: ref('stringArray'), table_oid: oid, function_oid: { anyOf: [oid, { type: 'null' }] },
        row_trigger_oid: { anyOf: [oid, { type: 'null' }] }, row_trigger_table_oid: { anyOf: [oid, { type: 'null' }] },
        row_trigger_function_oid: { anyOf: [oid, { type: 'null' }] }, truncate_trigger_oid: { anyOf: [oid, { type: 'null' }] },
        truncate_trigger_table_oid: { anyOf: [oid, { type: 'null' }] }, truncate_trigger_function_oid: { anyOf: [oid, { type: 'null' }] },
        function_count: nonNegative, row_trigger_count: nonNegative,
        truncate_trigger_count: nonNegative, flags_id_status_count: nonNegative, flags_id_status_sha256: sha256,
        history_count: nonNegative, history_sha256: sha256, http_queue_count: nonNegative,
        http_response_count: nonNegative, http_response_sha256: sha256, structureExact: boolSchema,
      },
    },
    serverCaptureStep: exactObject(['command', 'began', 'ended', 'startedMonoMs', 'endedMonoMs', 'exitCode', 'signal', 'timedOut', 'spawnError', 'stdoutPath', 'stderrPath'], {
      command: ref('stringArray'), began: utc, ended: utc, startedMonoMs: nonNegative, endedMonoMs: nonNegative,
      exitCode: ref('nullableInteger'), signal: { type: ['string', 'null'] }, timedOut: boolSchema, spawnError: { type: ['string', 'null'] },
    }),
    adjudicationError: exactObject(['adjudicationError'], { adjudicationError: { type: 'string', minLength: 1 } }),
    statePolicy: { oneOf: [exactObject(policyAKeys, policyProperties), exactObject(policyBKeys, policyProperties)] },
    serverObserved: exactObject(['entryClassification', 'gateState', 'applyClassification', 'snapshot', 'policy', 'steps'], {
      entryClassification: { enum: ['ENTRY_COMMITTED_CONFIRMED', 'ENTRY_CONFIRMED_NOT_COMMITTED', 'OWNER_REQUIRED_FAIL_CLOSED'] },
      gateState: ref('gateState'), applyClassification: { type: 'string' },
      snapshot: { oneOf: [ref('serverSnapshotFailure'), ref('serverSnapshotSuccess')] }, policy: ref('statePolicy'),
      steps: { type: 'array', minItems: 1, items: { oneOf: [ref('serverCaptureStep'), ref('adjudicationError')] } },
    }),
    comparatorExpected: exactObject(comparatorExpectedKeys, {
      result: { enum: ['PASS_WHILE_QUIESCED', 'PASS_RESTORED'] }, gateManifestSha256: sha256,
      finalLedgerSha256: sha256, finalStructureSha256: sha256, httpResponseSha256: sha256,
    }),
    grant: exactObject(['grantee', 'privilege', 'grantable'], { grantable: boolSchema }),
    postApplyProof: exactObject(postApplyProofKeys, { captured_at_utc: utc, function_execute_grants: { type: 'array', items: ref('grant') }, phase03b_versions: ref('stringArray'), phase03b_rows: ref('migrationRows') }),
    postExitProof: exactObject(postExitProofKeys, { captured_at_utc: utc, phase03b_versions: ref('stringArray'), phase03b_rows: ref('migrationRows') }),
    comparatorStep,
    postApplyObserved: exactObject(['proof', 'normalizedStructureSha256', 'steps'], { proof: { oneOf: [ref('postApplyProof'), { type: 'null' }] }, normalizedStructureSha256: { type: ['string', 'null'] }, steps: { type: 'array', items: ref('comparatorStep') } }),
    postExitObserved: exactObject(['proof', 'normalizedStructureSha256', 'steps'], { proof: { oneOf: [ref('postExitProof'), { type: 'null' }] }, normalizedStructureSha256: { type: ['string', 'null'] }, steps: { type: 'array', items: ref('comparatorStep') } }),
  },
  allOf: [
    { if: { properties: { phase: { const: 'ENTRY_RECEIPT' } }, required: ['phase'] }, then: { properties: {
      checkName: { const: 'entry-and-immediate-proof' }, sourceArtifact: { const: 'execute_cutover_controller.mjs' },
      producer: { const: 'phase03b-r7-cutover-controller' }, expected: ref('entryExpected'), observed: ref('entryObserved'),
    } } },
    { if: { properties: { phase: { const: 'SERVER_STATE_CLASSIFICATION' } }, required: ['phase'] }, then: { properties: {
      checkName: { const: 'ambiguous-server-state' }, sourceArtifact: { const: 'adjudicate_server_state.mjs' },
      producer: { const: 'phase03b-r7-server-adjudicator' }, expected: ref('serverExpected'), observed: ref('serverObserved'),
    } } },
    { if: { properties: { phase: { const: 'POST_APPLY_COMPARATOR' } }, required: ['phase'] }, then: { properties: {
      checkName: { const: 'post-apply-exact-quiesced-state' }, sourceArtifact: { const: 'verify_post_apply.mjs' },
      producer: { const: 'phase03b-r7-post-apply-verifier' }, expected: ref('comparatorExpected'), observed: ref('postApplyObserved'),
    } } },
    { if: { properties: { phase: { const: 'POST_EXIT_COMPARATOR' } }, required: ['phase'] }, then: { properties: {
      checkName: { const: 'post-exit-write-restoration' }, sourceArtifact: { const: 'verify_post_exit.mjs' },
      producer: { const: 'phase03b-r7-post-exit-verifier' }, expected: ref('comparatorExpected'), observed: ref('postExitObserved'),
    } } },
  ],
};

writeFileSync(join(PACKET, 'STRICT_R7_ENVELOPE_SCHEMA.json'), `${JSON.stringify(schema, null, 2)}\n`, { mode: 0o600 });
