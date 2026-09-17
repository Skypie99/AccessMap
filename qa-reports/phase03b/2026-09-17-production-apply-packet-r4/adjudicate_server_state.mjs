#!/usr/bin/env node
// Read-only R4 adjudicator for timeout, lost output, signals, terminal/network
// failure, controller interruption, or otherwise ambiguous client exit.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPECTED,
  classifyServerState,
  parseCliJson,
  resultRow,
  statePolicy,
  validateEntryEnvelope,
} from './r4_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const entryArg = process.argv.find((value) => value.startsWith('--entry='));
const evidenceArg = process.argv.find((value) => value.startsWith('--evidence='));
const applySpawned = process.argv.includes('--apply-spawned');
if (!entryArg || !evidenceArg) throw new Error('Required: --entry=/absolute/ENTRY_RECEIPT.json --evidence=/absolute/new/directory [--apply-spawned]');
const entryPath = resolve(entryArg.slice('--entry='.length));
const evidence = resolve(evidenceArg.slice('--evidence='.length));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: false, mode: 0o700 });
const envelope = JSON.parse(readFileSync(entryPath, 'utf8'));
validateEntryEnvelope(envelope);

function run(label, command, args, timeout = 120_000) {
  const began = new Date().toISOString();
  const startedMonoMs = Number(process.hrtime.bigint() / 1_000_000n);
  const result = spawnSync(command, args, { encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, env: process.env });
  const stdoutPath = join(evidence, `${label}.stdout.log`);
  const stderrPath = join(evidence, `${label}.stderr.log`);
  writeFileSync(stdoutPath, result.stdout ?? '', { mode: 0o600, flag: 'wx' });
  writeFileSync(stderrPath, result.stderr ?? '', { mode: 0o600, flag: 'wx' });
  return {
    command: [command, ...args], began, ended: new Date().toISOString(), startedMonoMs,
    endedMonoMs: Number(process.hrtime.bigint() / 1_000_000n), exitCode: result.status,
    signal: result.signal, timedOut: result.error?.code === 'ETIMEDOUT',
    spawnError: result.error?.message ?? null, stdoutPath, stderrPath,
  };
}

const receipt = {
  schemaVersion: 1,
  packetVersion: 'R4',
  target: EXPECTED.productionTarget,
  readOnly: true,
  applySpawned,
  result: 'HOLD',
  classification: 'BACKEND_UNKNOWN',
  steps: [],
  startedAt: new Date().toISOString(),
};

try {
  const stateStep = run('server-state', 'supabase', [
    'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget,
    '--file', join(PACKET, 'SERVER_STATE_ADJUDICATE.sql'), '--output-format', 'json',
  ]);
  receipt.steps.push(stateStep);
  if (stateStep.exitCode !== 0 || stateStep.signal || stateStep.timedOut || stateStep.spawnError) {
    throw new Error('Server-state read failed; backend remains unknown');
  }
  const snapshot = resultRow(parseCliJson(readFileSync(stateStep.stdoutPath, 'utf8')), 'phase03b_server_state_r4');
  const entry = envelope.entry;
  snapshot.querySucceeded = true;
  snapshot.gateIdentityExact = snapshot.function_count === 1 && snapshot.reserved_trigger_count === 2 &&
    snapshot.function_oid === entry.function_oid && snapshot.function_owner === entry.function_owner &&
    snapshot.gate_trigger_oid === entry.trigger_oid && snapshot.gate_enabled === 'A' &&
    snapshot.truncate_gate_trigger_oid === entry.truncate_trigger_oid && snapshot.truncate_gate_enabled === 'A' &&
    snapshot.flags_id_status_count === entry.flags_id_status_count && snapshot.flags_id_status_sha256 === entry.flags_id_status_sha256 &&
    snapshot.history_count === entry.history_count && snapshot.history_sha256 === entry.history_sha256 &&
    snapshot.http_queue_count === EXPECTED.baseline.httpQueueCount && snapshot.http_response_count === EXPECTED.baseline.httpResponseCount &&
    snapshot.http_response_sha256 === EXPECTED.baseline.httpResponseSha256;

  const exactPair = JSON.stringify(snapshot.phase03b_versions ?? []) === JSON.stringify(EXPECTED.migrations.map((migration) => migration.version));
  if (exactPair && !(snapshot.candidate_backends ?? []).some((backend) => backend.state !== 'idle') && snapshot.gateIdentityExact) {
    const comparatorEvidence = join(evidence, 'full-post-apply-comparator');
    const comparatorStep = run('full-post-apply-comparator', process.execPath, [
      join(PACKET, 'verify_post_apply.mjs'), `--entry=${entryPath}`, `--evidence=${comparatorEvidence}`,
    ], 300_000);
    receipt.steps.push(comparatorStep);
    let comparatorReceipt = null;
    const comparatorReceiptPath = join(comparatorEvidence, 'POST_APPLY_VERIFIER_RECEIPT.json');
    if (existsSync(comparatorReceiptPath)) comparatorReceipt = JSON.parse(readFileSync(comparatorReceiptPath, 'utf8'));
    snapshot.structureExact = comparatorStep.exitCode === 0 && !comparatorStep.signal && !comparatorStep.timedOut && comparatorReceipt?.result === 'PASS_WHILE_QUIESCED';
  }
  receipt.snapshot = snapshot;
  receipt.classification = classifyServerState(snapshot, { applySpawned });
  receipt.policy = statePolicy(receipt.classification);
  receipt.result = 'CLASSIFIED';
} catch (error) {
  receipt.error = error.message;
  receipt.classification = 'BACKEND_UNKNOWN';
  receipt.policy = statePolicy(receipt.classification);
  process.exitCode = 1;
} finally {
  receipt.finishedAt = new Date().toISOString();
  writeFileSync(join(evidence, 'SERVER_STATE_CLASSIFICATION.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ result: receipt.result, classification: receipt.classification, policy: receipt.policy }, null, 2));
}
