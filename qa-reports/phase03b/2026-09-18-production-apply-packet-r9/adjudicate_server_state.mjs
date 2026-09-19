#!/usr/bin/env node
// Read-only R8 adjudicator for timeout, lost output, signals, terminal/network
// failure, controller interruption, or otherwise ambiguous client exit.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPECTED,
  GATE_MANIFEST_SHA256,
  buildR8Envelope,
  classifyEntryState,
  classifyServerState,
  entryFromEnvelope,
  parseCliJson,
  resultRow,
  statePolicy,
  validateR8Envelope,
  validateServerStateEnvelope,
} from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const entryArg = process.argv.find((value) => value.startsWith('--entry='));
const evidenceArg = process.argv.find((value) => value.startsWith('--evidence='));
const runIdArg = process.argv.find((value) => value.startsWith('--run-id='));
const controllerPidArg = process.argv.find((value) => value.startsWith('--controller-pid='));
const originArg = process.argv.find((value) => value.startsWith('--monotonic-origin='));
const applySpawned = process.argv.includes('--apply-spawned');
if (!evidenceArg) throw new Error('Required: --evidence=/absolute/new/directory plus --entry=... or exact run context');

let entryEnvelope = null;
let entry = null;
let entryPath = null;
let runId;
let controllerPid;
let controllerMonotonicOrigin;
if (entryArg) {
  entryPath = resolve(entryArg.slice('--entry='.length));
  entryEnvelope = JSON.parse(readFileSync(entryPath, 'utf8'));
  entry = entryFromEnvelope(entryEnvelope);
  runId = entryEnvelope.runId;
  controllerPid = entryEnvelope.controllerPid;
  controllerMonotonicOrigin = entryEnvelope.controllerMonotonicOrigin;
} else {
  if (!runIdArg || !controllerPidArg || !originArg) {
    throw new Error('Receipt-free adjudication requires --run-id, --controller-pid, and --monotonic-origin');
  }
  runId = runIdArg.slice('--run-id='.length);
  controllerPid = Number(controllerPidArg.slice('--controller-pid='.length));
  controllerMonotonicOrigin = Number(originArg.slice('--monotonic-origin='.length));
}

const evidence = resolve(evidenceArg.slice('--evidence='.length));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: false, mode: 0o700 });
const monoMs = () => Number(process.hrtime.bigint() / 1_000_000n);
const iso = () => new Date().toISOString();

function run(label, command, args, timeout = 120_000) {
  const began = iso();
  const startedMonoMs = monoMs();
  const result = spawnSync(command, args, { encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, env: process.env });
  const stdoutPath = join(evidence, `${label}.stdout.log`);
  const stderrPath = join(evidence, `${label}.stderr.log`);
  writeFileSync(stdoutPath, result.stdout ?? '', { mode: 0o600, flag: 'wx' });
  writeFileSync(stderrPath, result.stderr ?? '', { mode: 0o600, flag: 'wx' });
  return {
    command: [command, ...args], began, ended: iso(), startedMonoMs, endedMonoMs: monoMs(),
    exitCode: result.status, signal: result.signal, timedOut: result.error?.code === 'ETIMEDOUT',
    spawnError: result.error?.message ?? null, stdoutPath, stderrPath,
  };
}

const steps = [];
let snapshot = { querySucceeded: false };
let gateState = { state: 'GATE_UNKNOWN', mismatches: ['notCaptured'] };
let entryClassification = 'OWNER_REQUIRED_FAIL_CLOSED';
let applyClassification = 'BACKEND_UNKNOWN';
let policy = statePolicy('BACKEND_UNKNOWN');
let numericExit = 1;

try {
  const stateStep = run('server-state', 'supabase', [
    'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget,
    '--file', join(PACKET, 'SERVER_STATE_ADJUDICATE.sql'), '--output-format', 'json',
  ]);
  steps.push(stateStep);
  if (stateStep.exitCode !== 0 || stateStep.signal || stateStep.timedOut || stateStep.spawnError) {
    throw new Error('Server-state read failed; backend remains unknown');
  }
  snapshot = resultRow(parseCliJson(readFileSync(stateStep.stdoutPath, 'utf8')), 'phase03b_server_state_r8');
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Server-state row must contain one snapshot object');
  }
  snapshot.querySucceeded = true;
  const entryResult = classifyEntryState(snapshot, entry);
  gateState = entryResult.gate;
  entryClassification = entryResult.classification;

  const exactPair = JSON.stringify(snapshot.phase03b_versions ?? []) === JSON.stringify(EXPECTED.migrations.map((migration) => migration.version));
  if (entryEnvelope && exactPair && !(snapshot.candidate_backends ?? []).some((backend) => backend.state !== 'idle') && gateState.state === 'GATE_PRESENT_EXACT') {
    const comparatorEvidence = join(evidence, 'full-post-apply-comparator');
    const comparatorStep = run('full-post-apply-comparator', process.execPath, [
      join(PACKET, 'verify_post_apply.mjs'), `--entry=${entryPath}`, `--evidence=${comparatorEvidence}`,
    ], 300_000);
    steps.push(comparatorStep);
    let comparatorEnvelope = null;
    const comparatorReceiptPath = join(comparatorEvidence, 'POST_APPLY_VERIFIER_RECEIPT.json');
    if (existsSync(comparatorReceiptPath)) comparatorEnvelope = JSON.parse(readFileSync(comparatorReceiptPath, 'utf8'));
    try {
      validateR8Envelope(comparatorEnvelope, {
        phase: 'POST_APPLY_COMPARATOR', runId, controllerPid, controllerMonotonicOrigin, entryEnvelope,
      });
      snapshot.structureExact = comparatorStep.exitCode === 0 && !comparatorStep.signal && !comparatorStep.timedOut && comparatorEnvelope.status === 'PASS_WHILE_QUIESCED';
    } catch {
      snapshot.structureExact = false;
    }
  }
  applyClassification = classifyServerState(snapshot, { applySpawned, gateState: gateState.state, entry });
  policy = statePolicy(applyClassification);
  numericExit = 0;
} catch (error) {
  snapshot = { querySucceeded: false, captureError: error.message };
  steps.push({ adjudicationError: error.message });
  process.exitCode = 1;
}

const status = numericExit !== 0 || applySpawned || entryClassification === 'OWNER_REQUIRED_FAIL_CLOSED'
  ? 'OWNER_REQUIRED_FAIL_CLOSED' : entryClassification;
const envelope = buildR8Envelope({
  runId,
  controllerPid,
  controllerMonotonicOrigin,
  phase: 'SERVER_STATE_CLASSIFICATION',
  expected: {
    gateManifestSha256: GATE_MANIFEST_SHA256,
    acceptedLedgerCounts: [EXPECTED.baseline.ledgerCount, EXPECTED.baseline.ledgerCount + 1, EXPECTED.final.ledgerCount],
    productionTarget: EXPECTED.productionTarget,
  },
  observed: { entryClassification, gateState, applyClassification, snapshot, policy, steps },
  status,
  capturedAtUtc: iso(),
  capturedAtMonotonic: monoMs(),
  numericExit,
  validationContext: { runId, controllerPid, controllerMonotonicOrigin, entryEnvelope, applySpawned },
});
validateServerStateEnvelope(envelope, { runId, controllerPid, controllerMonotonicOrigin, entryEnvelope, applySpawned });
writeFileSync(join(evidence, 'SERVER_STATE_CLASSIFICATION.json'), `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ status: envelope.status, entryClassification, gateState: gateState.state, applyClassification }, null, 2));
