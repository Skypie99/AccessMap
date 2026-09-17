#!/usr/bin/env node
// PROPOSAL ONLY. Requires a later, separate production-apply authorization.
// One process owns entry, immediate proof, apply timing, 5 s monitoring, and
// the bounded read-only post-apply verifier. It never removes quiescence.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const WORKDIR = '/tmp/flagstone-p03b-production-apply-9d638456';
const TARGET = 'kldlwszpfkdmsjrjhjym';
const APPLY_LIMIT_MS = 180_000;
const VERIFY_LIMIT_MS = 300_000;
const MAX_QUIESCENCE_MS = 600_000;
const CLOCK_SKEW_LIMIT_MS = 2_000;
const CADENCE_MS = 5_000;
const GRACE_MS = 10_000;
const expected = {
  function_definition_sha256: '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac',
  trigger_definition_sha256: 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf',
  truncate_trigger_definition_sha256: '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a',
};
const pending = [
  ['20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql', 'b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11'],
  ['20260915210413_phase03b_points_integrity.sql', '0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5'],
];

const evidenceArg = process.argv.find((v) => v.startsWith('--evidence='));
if (!evidenceArg) throw new Error('Required: --evidence=/absolute/new/directory');
const evidence = resolve(evidenceArg.slice('--evidence='.length));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: false, mode: 0o700 });

const iso = () => new Date().toISOString();
const monoMs = () => Number(process.hrtime.bigint() / 1_000_000n);
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const writeJson = (name, value) => writeFileSync(join(evidence, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
const parseCliJson = (text) => {
  const objectAt = text.indexOf('{');
  const arrayAt = text.indexOf('[');
  const offset = objectAt === -1 ? arrayAt : arrayAt === -1 ? objectAt : Math.min(objectAt, arrayAt);
  if (offset < 0) throw new Error('Supabase output contained no JSON');
  return JSON.parse(text.slice(offset));
};
const resultRow = (payload, key) => payload.rows?.[0]?.[key] ?? payload[key] ?? payload;

async function runCaptured(label, command, args, timeoutMs, detached = false) {
  const stdoutPath = join(evidence, `${label}.stdout.log`);
  const stderrPath = join(evidence, `${label}.stderr.log`);
  const out = openSync(stdoutPath, 'wx', 0o600);
  const err = openSync(stderrPath, 'wx', 0o600);
  const startedAt = iso();
  const startedMonoMs = monoMs();
  const child = spawn(command, args, { stdio: ['ignore', out, err], detached, env: { ...process.env } });
  const pid = child.pid;
  let timedOut = false;
  let signalSent = null;
  let termTimer;
  let killTimer;
  const signal = (name) => {
    try { process.kill(detached ? -pid : pid, name); signalSent = name; } catch { /* already exited */ }
  };
  const timeout = timeoutMs == null ? null : setTimeout(() => {
    timedOut = true;
    signal('SIGINT');
    termTimer = setTimeout(() => signal('SIGTERM'), GRACE_MS);
    killTimer = setTimeout(() => signal('SIGKILL'), GRACE_MS * 2);
  }, Math.max(1, timeoutMs));
  const ended = await new Promise((resolvePromise) => {
    child.once('error', (error) => resolvePromise({ code: null, signal: null, error: error.message }));
    child.once('exit', (code, signalName) => resolvePromise({ code, signal: signalName, error: null }));
  });
  if (timeout) clearTimeout(timeout);
  clearTimeout(termTimer);
  clearTimeout(killTimer);
  closeSync(out);
  closeSync(err);
  return {
    label, command: [command, ...args], childPid: pid, processGroupId: detached ? pid : null,
    startedAt, endedAt: iso(), startedMonoMs, endedMonoMs: monoMs(),
    timeoutMs, timedOut, signalSent, exitCode: ended.code, exitSignal: ended.signal,
    spawnError: ended.error, stdoutPath, stderrPath,
  };
}

function requireSuccess(step) {
  if (step.exitCode !== 0 || step.exitSignal || step.timedOut || step.spawnError) {
    throw new Error(`${step.label} failed or became ambiguous; quiescence must remain active`);
  }
}

function validateWorkspace() {
  const migrationDir = join(WORKDIR, 'supabase/migrations');
  for (const [name, hash] of pending) if (sha256(join(migrationDir, name)) !== hash) throw new Error(`Frozen migration mismatch: ${name}`);
  const manifest = JSON.parse(readFileSync(join(WORKDIR, 'PHASE03B_APPLY_WORKSPACE_MANIFEST.json'), 'utf8'));
  const files = readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
  if (manifest.target !== TARGET || JSON.stringify(manifest.pendingMigrations) !== JSON.stringify(pending.map(([name]) => name)) ||
      files.length !== 87 || files.at(-2) !== pending[0][0] || files.at(-1) !== pending[1][0]) {
    throw new Error('Apply workspace target or exact-two-migration inventory mismatch');
  }
}

function validateEntry(entry, proof) {
  for (const [key, value] of Object.entries(expected)) {
    if (entry[key] !== value || proof[key] !== value) throw new Error(`Entry identity mismatch: ${key}`);
  }
  const exact = {
    receipt: 'phase03b_quiescence_entry_r3', function_owner: 'postgres', trigger_table_owner: 'postgres',
    trigger_enabled: 'A', truncate_trigger_enabled: 'A', ledger_count: 85, ledger_unique_count: 85,
    ledger_latest_version: '20260911120000', phase03b_ledger_count: 0,
    ledger_ordered_version_name_sha256: '811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec',
    http_queue_count: 0, http_response_count: 6,
    http_response_sha256: '709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8',
  };
  for (const [key, value] of Object.entries(exact)) if (entry[key] !== value) throw new Error(`Entry receipt mismatch: ${key}`);
  if (proof.receipt !== 'phase03b_quiescence_proof_r3' || proof.transaction_read_only !== 'on') throw new Error('Immediate post-commit proof is not exact/read-only');
  for (const key of ['function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'flags_id_status_count', 'flags_id_status_sha256', 'history_count', 'history_sha256']) {
    if (entry[key] !== proof[key]) throw new Error(`Entry/proof mismatch: ${key}`);
  }
  if (entry.pre_install_flags_id_status_count !== entry.flags_id_status_count ||
      entry.pre_install_flags_id_status_sha256 !== entry.flags_id_status_sha256 ||
      entry.pre_install_history_count !== entry.history_count || entry.pre_install_history_sha256 !== entry.history_sha256) {
    throw new Error('Pre-install and post-install invariant captures differ');
  }
}

const receipt = {
  schemaVersion: 1, target: TARGET, result: 'NOT_STARTED', automaticRetryAuthorized: false,
  applyLimitMs: APPLY_LIMIT_MS, verificationLimitMs: VERIFY_LIMIT_MS,
  maximumQuiescenceEscalationMs: MAX_QUIESCENCE_MS, monitoringCadenceMs: CADENCE_MS,
  clockSkewLimitMs: CLOCK_SKEW_LIMIT_MS, steps: [], monitorSamples: [],
};

let monitorTimer;
let monitorBusy = false;
let monitorViolation = false;
let entryStartMonoForFailure = null;
async function monitorSample(entryStartMonoMs) {
  if (monitorBusy) { monitorViolation = true; return; }
  monitorBusy = true;
  try {
    const step = await runCaptured(`monitor-${String(receipt.monitorSamples.length + 1).padStart(3, '0')}`, 'supabase', [
      'db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'MONITOR_READ_ONLY.sql'), '--output-format', 'json',
    ], 30_000);
    receipt.monitorSamples.push({ ...step, quiescenceElapsedMs: monoMs() - entryStartMonoMs });
    if (monoMs() - entryStartMonoMs >= MAX_QUIESCENCE_MS) receipt.maximumQuiescenceEscalationReached = true;
  } finally { monitorBusy = false; }
}

try {
  validateWorkspace();
  const entryStartedAtMs = Date.now();
  const entryStartedMonoMs = monoMs();
  entryStartMonoForFailure = entryStartedMonoMs;
  const entryStep = await runCaptured('entry', 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_ENTER.sql'), '--output-format', 'json',
  ], 30_000);
  receipt.steps.push(entryStep);
  requireSuccess(entryStep);
  const entryPayload = parseCliJson(readFileSync(entryStep.stdoutPath, 'utf8'));
  const entry = resultRow(entryPayload, 'phase03b_quiescence_entry_r3');
  const serverBoundaryMs = Date.parse(entry.boundary_at_utc);
  const entryEndedAtMs = Date.parse(entryStep.endedAt);
  if (!Number.isFinite(serverBoundaryMs) || serverBoundaryMs < entryStartedAtMs - CLOCK_SKEW_LIMIT_MS || serverBoundaryMs > entryEndedAtMs + CLOCK_SKEW_LIMIT_MS) {
    throw new Error('Database/host clock skew exceeds 2 seconds; gate stays active and apply does not start');
  }
  const proofStep = await runCaptured('post-entry-proof', 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql'), '--output-format', 'json',
  ], 30_000);
  receipt.steps.push(proofStep);
  requireSuccess(proofStep);
  const proof = resultRow(parseCliJson(readFileSync(proofStep.stdoutPath, 'utf8')), 'phase03b_quiescence_proof_r3');
  validateEntry(entry, proof);
  writeJson('ENTRY_RECEIPT.json', { entry, immediatePostCommitProof: proof, localEntryCommand: entryStep, localProofCommand: proofStep });

  monitorTimer = setInterval(() => void monitorSample(entryStartedMonoMs), CADENCE_MS);
  await monitorSample(entryStartedMonoMs);
  const remainingApplyMs = APPLY_LIMIT_MS - (monoMs() - entryStartedMonoMs);
  if (remainingApplyMs <= 0) throw new Error('Conservative 180-second entry-to-apply budget exhausted before apply spawn');
  const applyStep = await runCaptured('apply', 'supabase', [
    'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET,
    '--skip-vault', '--include-all', '--yes', '--output-format', 'json',
  ], remainingApplyMs, true);
  receipt.steps.push(applyStep);
  if (applyStep.timedOut || applyStep.exitCode !== 0 || applyStep.exitSignal || applyStep.spawnError) {
    receipt.result = 'UNKNOWN';
    receipt.timeoutState = applyStep.timedOut ? 'APPLY_WALL_CLOCK_EXCEEDED' : 'AMBIGUOUS_OR_FAILED_CLIENT_EXIT';
    const adjudicationUntil = monoMs() + 30_000;
    while (monoMs() < adjudicationUntil) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
    throw new Error('Apply outcome unknown; no retry and no quiescence exit authorized');
  }

  const verifyStep = await runCaptured('post-apply-verifier', process.execPath, [
    join(PACKET, 'verify_post_apply.mjs'), `--entry=${join(evidence, 'ENTRY_RECEIPT.json')}`, `--evidence=${join(evidence, 'POST-APPLY')}`,
  ], VERIFY_LIMIT_MS, true);
  receipt.steps.push(verifyStep);
  requireSuccess(verifyStep);
  if (monitorViolation) throw new Error('A 5-second monitor sample overlapped its successor; evidence cadence is not exact');
  receipt.result = 'PASS_WHILE_QUIESCED';
} catch (error) {
  receipt.error = error.message;
  if (receipt.result !== 'UNKNOWN' && receipt.result !== 'PASS_WHILE_QUIESCED') receipt.result = 'HOLD_WHILE_QUIESCED_OR_NOT_ENTERED';
  if (entryStartMonoForFailure !== null && receipt.monitorSamples.length === 0) {
    try { await monitorSample(entryStartMonoForFailure); } catch (monitorError) { receipt.failureMonitorError = monitorError.message; }
  }
  process.exitCode = 1;
} finally {
  clearInterval(monitorTimer);
  while (monitorBusy) await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
  receipt.finishedAt = iso();
  receipt.quiescenceAutomaticallyExited = false;
  receipt.serverStateProvenByLocalProcessDeath = false;
  writeJson('ORCHESTRATION_RECEIPT.json', receipt);
}
