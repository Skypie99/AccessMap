#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPECTED,
  EXPECTED_PHASE03B_ROWS,
  GATE_MANIFEST_SHA256,
  MAXIMUM_QUIESCENCE_WINDOW_SECONDS,
  buildR8Envelope,
  parseCliJson,
  resultRow,
  validateR8Envelope,
} from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const RECOVERY_EVIDENCE = resolve(PACKET, '..', '2026-09-19-post-apply-recovery-evidence');
const entryPath = resolve(process.argv.find((value) => value.startsWith('--entry='))?.slice('--entry='.length)
  ?? join(RECOVERY_EVIDENCE, 'retained-incident-input', 'ENTRY_RECEIPT.json'));
const proofPath = resolve(process.argv.find((value) => value.startsWith('--proof-stdout='))?.slice('--proof-stdout='.length)
  ?? join(RECOVERY_EVIDENCE, 'retained-incident-input', 'quiescence-proof.stdout.log'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const clone = (value) => structuredClone(value);
const checks = {};
const hold = (operation) => {
  try { operation(); return false; } catch { return true; }
};

const entryEnvelope = JSON.parse(readFileSync(entryPath, 'utf8'));
const proofPayload = parseCliJson(readFileSync(proofPath, 'utf8'));
const transportedProof = resultRow(proofPayload, 'phase03b_quiescence_proof_r3');
const proof = {
  ...transportedProof,
  phase03b_rows: EXPECTED_PHASE03B_ROWS,
};
const boundary = '0123456789abcdef0123456789abcdef';
const rowsWrapper = { boundary, rows: [{ phase03b_quiescence_proof_r3: proof }], warning: `rows bounded by <${boundary}>` };

checks.oneRowArrayProofWrapper = resultRow(proofPayload, 'phase03b_quiescence_proof_r3') === proofPayload[0].phase03b_quiescence_proof_r3;
checks.rowsWrapperProof = resultRow(rowsWrapper, 'phase03b_quiescence_proof_r3') === proof;
checks.malformedArrayHolds = hold(() => resultRow([7], 'phase03b_quiescence_proof_r3'));
checks.zeroRowsHolds = hold(() => resultRow([], 'phase03b_quiescence_proof_r3'));
checks.multipleRowsHold = hold(() => resultRow([proofPayload[0], proofPayload[0]], 'phase03b_quiescence_proof_r3'));
checks.missingProofKeyHolds = hold(() => resultRow([{}], 'phase03b_quiescence_proof_r3'));
checks.unknownWrapperKeysHold = hold(() => resultRow({ ...rowsWrapper, unexpected: true }, 'phase03b_quiescence_proof_r3'));

const successStep = (command, index) => ({
  command,
  childPid: process.pid,
  startedAt: `2026-09-20T06:20:4${index}.000Z`,
  endedAt: `2026-09-20T06:20:4${index}.100Z`,
  timeoutMs: index === 1 ? 120_000 : 60_000,
  timedOut: false,
  exitCode: 0,
  signal: null,
  error: null,
  stdoutPath: join(RECOVERY_EVIDENCE, `test-${index}.stdout.log`),
  stderrPath: join(RECOVERY_EVIDENCE, `test-${index}.stderr.log`),
});
const comparatorArgs = (candidateProof) => ({
  runId: entryEnvelope.runId,
  controllerPid: entryEnvelope.controllerPid,
  controllerMonotonicOrigin: entryEnvelope.controllerMonotonicOrigin,
  phase: 'POST_APPLY_COMPARATOR',
  expected: {
    result: 'PASS_WHILE_QUIESCED',
    gateManifestSha256: GATE_MANIFEST_SHA256,
    finalLedgerSha256: EXPECTED.final.ledgerSha256,
    finalStructureSha256: EXPECTED.final.normalizedStructureSha256,
    databaseT0: entryEnvelope.expected.databaseT0,
    maximumQuiescenceWindowSeconds: MAXIMUM_QUIESCENCE_WINDOW_SECONDS,
  },
  observed: {
    proof: candidateProof,
    normalizedStructureSha256: EXPECTED.final.normalizedStructureSha256,
    steps: [
      successStep(['supabase', 'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql'), '--output-format', 'json'], 0),
      successStep(['supabase', 'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget, '--file', join(RECOVERY_EVIDENCE, 'STRUCTURAL_CAPTURE_READ_ONLY.sql'), '--output-format', 'json'], 1),
      successStep(['supabase', 'functions', 'list', '--project-ref', EXPECTED.productionTarget, '--output-format', 'json'], 2),
    ],
  },
  status: 'PASS_WHILE_QUIESCED',
  capturedAtUtc: '2026-09-20T06:20:49.000Z',
  capturedAtMonotonic: entryEnvelope.controllerMonotonicOrigin + 20_000,
  numericExit: 0,
  validationContext: {
    phase: 'POST_APPLY_COMPARATOR',
    runId: entryEnvelope.runId,
    controllerPid: entryEnvelope.controllerPid,
    controllerMonotonicOrigin: entryEnvelope.controllerMonotonicOrigin,
    entryEnvelope,
  },
});

const validEnvelope = buildR8Envelope(comparatorArgs(proof));
checks.validPostApplyProofBuildsStrictEnvelope = validateR8Envelope(validEnvelope, comparatorArgs(proof).validationContext) === 'VALIDATED_R8';
checks.invalidProofCannotReachPass = hold(() => buildR8Envelope(comparatorArgs({ ...clone(proof), ledger_count: 86 })));

const postExitProof = { receipt: 'phase03b_post_exit_proof_r3' };
checks.postExitUsesSameValidTransport = resultRow([{ phase03b_post_exit_proof_r3: postExitProof }], 'phase03b_post_exit_proof_r3') === postExitProof;

const postApplySource = readFileSync(join(PACKET, 'verify_post_apply.mjs'), 'utf8');
const postExitSource = readFileSync(join(PACKET, 'verify_post_exit.mjs'), 'utf8');
checks.bothVerifiersUseCanonicalResultRow = [postApplySource, postExitSource].every((source) =>
  source.includes('resultRow,') && !source.includes('payload.rows?.[0]?.[key]'));
checks.strictSchemaUnchanged = sha256(readFileSync(join(PACKET, 'STRICT_R8_ENVELOPE_SCHEMA.json'))) === '0fe78b2a306fba77d1741fa57eb2591dba2762dfdc53e4d9f00e81d84dead517';
checks.candidateMigrationBytesUnchanged = [
  ['20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql', 'b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11'],
  ['20260915210413_phase03b_points_integrity.sql', '0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5'],
].every(([filename, expected]) => sha256(readFileSync(resolve(PACKET, '../../../supabase/migrations-next/phase03b', filename))) === expected);

const passed = Object.values(checks).filter(Boolean).length;
const result = { status: passed === Object.keys(checks).length ? 'PASS' : 'HOLD', passed, total: Object.keys(checks).length, checks };
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
