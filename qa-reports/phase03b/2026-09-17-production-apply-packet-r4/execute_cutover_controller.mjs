#!/usr/bin/env node
// PROPOSAL ONLY. This committed controller is intentionally inert unless a
// later, separate owner-authorized production-apply run supplies the exact
// arming argument below. This R4 repair does not execute it against production.
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHermeticWorkdir } from './build_hermetic_workdir.mjs';
import { generateEvidenceManifest } from './generate_evidence_manifest.mjs';
import {
  EXPECTED,
  TARGET,
  buildEntryEnvelope,
  cadenceSlot,
  createDeadlines,
  deriveClientOutcome,
  evaluateExitEligibility,
  maxQuiescenceState,
  parseCliJson,
  postExitDisposition,
  resultRow,
  validateCadenceSample,
  validateDryRunPlan,
  validateEntryAndImmediateProof,
  validateMonitorAgainstEntry,
} from './r4_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const WORKDIR = '/tmp/flagstone-p03b-production-apply-9d638456';
const ARMING_VALUE = 'FLAGSTONE-P03B-R4-PRODUCTION-APPLY';
const evidenceArg = process.argv.find((value) => value.startsWith('--evidence='));
const authorizationArg = process.argv.find((value) => value.startsWith('--owner-authorization='));
if (!evidenceArg || authorizationArg?.slice('--owner-authorization='.length) !== ARMING_VALUE) {
  throw new Error(`Required for a separately authorized future run: --evidence=/absolute/new/directory --owner-authorization=${ARMING_VALUE}`);
}
const evidence = resolve(evidenceArg.slice('--evidence='.length));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: false, mode: 0o700 });
const directories = ['00-preflight', '01-entry', '02-apply', '03-monitoring', '04-post-apply-quiesced', '05-exit', '06-post-exit', '07-final', 'manifest'];
for (const directory of directories) mkdirSync(join(evidence, directory), { mode: 0o700 });

const iso = () => new Date().toISOString();
const monoMs = () => Number(process.hrtime.bigint() / 1_000_000n);
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const writeJson = (relativePath, value) => writeFileSync(join(evidence, relativePath), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const receipt = {
  schemaVersion: 1,
  packetVersion: 'R4',
  target: TARGET,
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  controllerPid: process.pid,
  result: 'NOT_STARTED',
  automaticRetryAuthorized: false,
  automaticDestructiveRollbackAuthorized: false,
  quiescenceAutomaticallyReleasedOnTimeout: false,
  productionInnerApplyCommand: [
    'supabase', 'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET,
    '--skip-vault', '--include-all', '--yes', '--output-format', 'json',
  ],
  steps: [],
  monitorSamples: [],
  stateTransitions: [],
  startedAt: iso(),
};

let activeCutoverChild = null;
let entryEnvelope = null;
let entryReference = null;
let entryCommitted = false;
let applySpawned = false;
let monitorStop = false;
let monitorFailure = null;
let monitorPromise = null;
let previousCadence = null;
let escalated = false;
let interrupted = false;
let maximumTimer = null;
let quiescenceExited = false;

function transition(state, detail = null) {
  receipt.stateTransitions.push({ state, detail, atUtc: iso(), monotonicMs: monoMs() });
}

function signalActiveChild(signal) {
  if (!activeCutoverChild?.pid) return;
  try { process.kill(activeCutoverChild.detached ? -activeCutoverChild.pid : activeCutoverChild.pid, signal); } catch { /* already exited */ }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true;
    monitorFailure ??= new Error(`Controller interrupted by ${signal}; server adjudication required`);
    signalActiveChild('SIGINT');
  });
}

async function runCaptured(relativeBase, command, args, deadlineMonoMs, detached = false, cutoverCritical = false) {
  const stdoutPath = join(evidence, `${relativeBase}.stdout.log`);
  const stderrPath = join(evidence, `${relativeBase}.stderr.log`);
  const out = openSync(stdoutPath, 'wx', 0o600);
  const err = openSync(stderrPath, 'wx', 0o600);
  const startedAt = iso();
  const startedMonoMs = monoMs();
  const timeoutMs = Math.max(1, deadlineMonoMs - startedMonoMs);
  const child = spawn(command, args, { stdio: ['ignore', out, err], detached, env: { ...process.env } });
  if (cutoverCritical) activeCutoverChild = { pid: child.pid, detached };
  let timedOut = false;
  let signalSent = null;
  let termTimer;
  let killTimer;
  const send = (signal) => {
    try {
      process.kill(detached ? -child.pid : child.pid, signal);
      signalSent = signal;
    } catch { /* already exited */ }
  };
  const timeout = setTimeout(() => {
    timedOut = true;
    send('SIGINT');
    termTimer = setTimeout(() => send('SIGTERM'), EXPECTED.timingMs.signalGrace);
    killTimer = setTimeout(() => send('SIGKILL'), EXPECTED.timingMs.signalGrace * 2);
  }, timeoutMs);
  const ended = await new Promise((resolvePromise) => {
    child.once('error', (error) => resolvePromise({ code: null, signal: null, error: error.message }));
    child.once('exit', (code, signal) => resolvePromise({ code, signal, error: null }));
  });
  clearTimeout(timeout);
  clearTimeout(termTimer);
  clearTimeout(killTimer);
  closeSync(out);
  closeSync(err);
  if (activeCutoverChild?.pid === child.pid) activeCutoverChild = null;
  const step = {
    label: relativeBase,
    command: [command, ...args],
    controllerPid: process.pid,
    childPid: child.pid,
    processGroupId: detached ? child.pid : null,
    startedAt,
    endedAt: iso(),
    startedMonoMs,
    endedMonoMs: monoMs(),
    absoluteDeadlineMonoMs: deadlineMonoMs,
    timeoutMs,
    timedOut,
    signalSent,
    exitCode: ended.code,
    exitSignal: ended.signal,
    spawnError: ended.error,
    stdoutPath,
    stderrPath,
  };
  receipt.steps.push(step);
  return step;
}

function requireSuccess(step, label = step.label) {
  if (deriveClientOutcome(step).result !== 'CLIENT_EXIT_0') throw new Error(`${label} failed or became ambiguous`);
}

async function monitorOnce(slot, deadlines) {
  const schedule = cadenceSlot(deadlines.originMonoMs, slot);
  const delay = schedule.scheduledMonoMs - monoMs();
  if (delay > 0) await wait(delay);
  const cadence = { ...schedule, actualStartMonoMs: monoMs() };
  validateCadenceSample(previousCadence, cadence);
  previousCadence = cadence;
  const deadline = Math.min(schedule.scheduledMonoMs + EXPECTED.timingMs.monitorCadence, deadlines.maximumQuiescenceEscalationMonoMs);
  const step = await runCaptured(`03-monitoring/sample-${String(slot).padStart(3, '0')}`, 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'MONITOR_READ_ONLY.sql'), '--output-format', 'json',
  ], deadline);
  requireSuccess(step, `monitor slot ${slot}`);
  const sample = resultRow(parseCliJson(readFileSync(step.stdoutPath, 'utf8')), 'phase03b_monitor_r4');
  validateMonitorAgainstEntry(sample, entryEnvelope ?? entryReference);
  const combined = {
    ...cadence,
    actualEndMonoMs: monoMs(),
    monotonicElapsedMs: monoMs() - deadlines.originMonoMs,
    utcTimestamp: sample.captured_at_utc,
    controllerPid: process.pid,
    childPid: activeCutoverChild?.pid ?? null,
    childProcessGroupId: activeCutoverChild?.detached ? activeCutoverChild.pid : null,
    childRunning: Boolean(activeCutoverChild),
    childExitCode: activeCutoverChild ? null : receipt.steps.at(-2)?.exitCode ?? null,
    childSignal: activeCutoverChild ? null : receipt.steps.at(-2)?.exitSignal ?? null,
    server: sample,
  };
  receipt.monitorSamples.push(combined);
  writeJson(`03-monitoring/sample-${String(slot).padStart(3, '0')}.json`, combined);
  if (maxQuiescenceState(combined.monotonicElapsedMs) === 'ESCALATED_FAIL_CLOSED') {
    escalated = true;
    transition('ESCALATED_FAIL_CLOSED', '600-second monotonic boundary reached; no exit or retry');
    signalActiveChild('SIGINT');
    throw new Error('Maximum quiescence escalation boundary reached');
  }
}

async function monitorLoop(deadlines) {
  let slot = Math.floor((monoMs() - deadlines.originMonoMs) / EXPECTED.timingMs.monitorCadence) + 1;
  while (!monitorStop) {
    try {
      await monitorOnce(slot, deadlines);
    } catch (error) {
      monitorFailure = error;
      signalActiveChild('SIGINT');
      return;
    }
    slot += 1;
  }
}

async function stopMonitoring() {
  monitorStop = true;
  if (monitorPromise) await monitorPromise;
  if (monitorFailure) throw monitorFailure;
}

async function adjudicate(reason) {
  const directory = join(evidence, '07-final/server-adjudication');
  if (!entryEnvelope || existsSync(directory)) return null;
  const args = [
    join(PACKET, 'adjudicate_server_state.mjs'),
    `--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`,
    `--evidence=${directory}`,
  ];
  if (applySpawned) args.push('--apply-spawned');
  const step = await runCaptured('07-final/server-adjudication-runner', process.execPath, args, monoMs() + 330_000, true);
  const resultPath = join(directory, 'SERVER_STATE_CLASSIFICATION.json');
  const result = existsSync(resultPath) ? readJson(resultPath) : { classification: 'BACKEND_UNKNOWN' };
  receipt.serverAdjudication = { reason, runner: step, classification: result.classification, policy: result.policy ?? null };
  return result;
}

try {
  transition('PREFLIGHT');
  const builderDeadline = monoMs() + 30_000;
  const builderStep = await runCaptured('00-preflight/hermetic-builder', process.execPath, [
    join(PACKET, 'build_hermetic_workdir.mjs'), `--output=${WORKDIR}`,
  ], builderDeadline);
  requireSuccess(builderStep);
  const inventory = readJson(join(WORKDIR, 'MIGRATION_INVENTORY.json'));
  writeJson('00-preflight/MIGRATION_INVENTORY.json', inventory);

  const planStep = await runCaptured('00-preflight/exact-plan', 'supabase', [
    'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET,
    '--dry-run', '--skip-vault', '--include-all', '--output-format', 'json',
  ], monoMs() + 60_000, true);
  requireSuccess(planStep);
  const plan = parseCliJson(readFileSync(planStep.stdoutPath, 'utf8'));
  validateDryRunPlan(plan);
  writeJson('00-preflight/EXACT_PLAN_GUARD.json', { status: 'PASS', target: TARGET, inventory, plan });
  transition('EXACT_PLAN_PASS');

  const originMonoMs = monoMs();
  const deadlines = createDeadlines(originMonoMs);
  receipt.monotonicOriginMs = originMonoMs;
  receipt.immutableDeadlines = deadlines;
  writeJson('01-entry/IMMUTABLE_DEADLINES.json', deadlines);
  maximumTimer = setTimeout(() => {
    if (quiescenceExited) return;
    escalated = true;
    transition('ESCALATED_FAIL_CLOSED', '600-second monotonic boundary reached; no exit or retry');
    signalActiveChild('SIGINT');
  }, Math.max(1, deadlines.maximumQuiescenceEscalationMonoMs - monoMs()));

  const entryStartedAtMs = Date.now();
  const entryStep = await runCaptured('01-entry/entry', 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_ENTER.sql'), '--output-format', 'json',
  ], deadlines.entryCompleteMonoMs, false, true);
  requireSuccess(entryStep);
  const entry = resultRow(parseCliJson(readFileSync(entryStep.stdoutPath, 'utf8')), 'phase03b_quiescence_entry_r3');
  entryReference = entry;
  entryCommitted = true;
  transition('ENTRY_COMMITTED');
  const boundaryMs = Date.parse(entry.boundary_at_utc);
  const endedAtMs = Date.parse(entryStep.endedAt);
  if (!Number.isFinite(boundaryMs) || boundaryMs < entryStartedAtMs - EXPECTED.timingMs.clockSkew || boundaryMs > endedAtMs + EXPECTED.timingMs.clockSkew) {
    throw new Error('Database/host clock skew exceeds the pinned two-second bound');
  }

  monitorPromise = monitorLoop(deadlines);
  const proofStep = await runCaptured('01-entry/immediate-proof', 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql'), '--output-format', 'json',
  ], deadlines.applyCompleteMonoMs, false, true);
  requireSuccess(proofStep);
  const proof = resultRow(parseCliJson(readFileSync(proofStep.stdoutPath, 'utf8')), 'phase03b_quiescence_proof_r3');
  validateEntryAndImmediateProof(entry, proof);
  entryEnvelope = buildEntryEnvelope({ entry, proof, inventory, deadlines, controllerPid: process.pid, entryStep, proofStep });
  writeJson('01-entry/ENTRY_RECEIPT.json', entryEnvelope);
  transition('ENTRY_PROOF_PASS');

  applySpawned = true;
  transition('APPLY_SPAWNED');
  const applyStep = await runCaptured('02-apply/apply', 'supabase', [
    'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET,
    '--skip-vault', '--include-all', '--yes', '--output-format', 'json',
  ], deadlines.applyCompleteMonoMs, true, true);
  const applyOutcome = deriveClientOutcome(applyStep);
  writeJson('02-apply/APPLY_OUTCOME.json', applyOutcome);
  if (applyOutcome.result !== 'CLIENT_EXIT_0' || interrupted) {
    receipt.result = 'UNKNOWN';
    transition('UNKNOWN_CLIENT_OUTCOME');
    await adjudicate('Apply client outcome ambiguous');
    throw new Error('Apply outcome is UNKNOWN; no retry or exit authorized');
  }
  if (monitorFailure) throw monitorFailure;
  transition('APPLY_CLIENT_EXIT_0');

  const postApplyDir = join(evidence, '04-post-apply-quiesced/comparator');
  const postApplyStep = await runCaptured('04-post-apply-quiesced/comparator-runner', process.execPath, [
    join(PACKET, 'verify_post_apply.mjs'), `--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`, `--evidence=${postApplyDir}`,
  ], deadlines.postApplyVerificationCompleteMonoMs, true, true);
  requireSuccess(postApplyStep, 'post-apply comparator');
  const postApplyReceipt = readJson(join(postApplyDir, 'POST_APPLY_VERIFIER_RECEIPT.json'));
  if (postApplyReceipt.result !== 'PASS_WHILE_QUIESCED') throw new Error('Post-apply comparator did not return PASS while quiesced');
  if (monitorFailure) throw monitorFailure;
  transition('POST_APPLY_EXACT_PASS');

  const eligibility = evaluateExitEligibility({
    postApplyVerificationPass: true,
    primaryInvariantPass: true,
    historyCorroborationPass: true,
    httpBaselinePass: true,
    gateIdentityPass: true,
    ledgerExactExpected: true,
    structureExactExpected: true,
    noUnknownState: receipt.result !== 'UNKNOWN' && !interrupted,
    withinMaximumQuiescence: !escalated && monoMs() < deadlines.maximumQuiescenceEscalationMonoMs,
  });
  writeJson('04-post-apply-quiesced/EXIT_ELIGIBILITY.json', eligibility);
  if (!eligibility.allowed) throw new Error(`Exit forbidden: ${eligibility.missing.join(', ')}`);
  await stopMonitoring();

  const exitSqlPath = join(evidence, '05-exit/RECEIPT_BOUND_EXIT.sql');
  const generatorStep = await runCaptured('05-exit/generator', process.execPath, [
    join(PACKET, 'generate_exit_sql.mjs'), `--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`, `--output=${exitSqlPath}`,
  ], Math.min(deadlines.maximumQuiescenceEscalationMonoMs, monoMs() + 30_000));
  requireSuccess(generatorStep);
  transition('EXIT_ELIGIBLE');
  const exitStep = await runCaptured('05-exit/exit', 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', exitSqlPath, '--output-format', 'json',
  ], deadlines.maximumQuiescenceEscalationMonoMs, false, true);
  if (deriveClientOutcome(exitStep).result !== 'CLIENT_EXIT_0') {
    transition('EXIT_FAILED_OWNER_REQUIRED', 'Exit transaction failed or became ambiguous; no cleanup retry');
    throw new Error('Receipt-bound exit transaction failed or became ambiguous');
  }
  quiescenceExited = true;
  clearTimeout(maximumTimer);
  transition('EXIT_COMMITTED');

  const postExitDir = join(evidence, '06-post-exit/comparator');
  const postExitStep = await runCaptured('06-post-exit/comparator-runner', process.execPath, [
    join(PACKET, 'verify_post_exit.mjs'), `--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`, `--evidence=${postExitDir}`,
  ], monoMs() + 300_000, true, true);
  const postExitReceipt = existsSync(join(postExitDir, 'POST_EXIT_VERIFIER_RECEIPT.json'))
    ? readJson(join(postExitDir, 'POST_EXIT_VERIFIER_RECEIPT.json')) : null;
  const disposition = postExitDisposition(postExitStep, postExitReceipt);
  writeJson('06-post-exit/POST_EXIT_DISPOSITION.json', disposition);
  if (disposition.result !== 'PASS') {
    transition('EXIT_FAILED_OWNER_REQUIRED', 'Post-exit structural restoration comparator returned HOLD');
    throw new Error('Post-exit structural restoration comparator returned HOLD');
  }
  receipt.result = 'PASS_RESTORED';
  transition('COMPLETE');
} catch (error) {
  receipt.error = error.message;
  if (receipt.result !== 'UNKNOWN') receipt.result = entryCommitted ? 'HOLD_WHILE_QUIESCED_OR_EXIT_UNKNOWN' : 'HOLD_NOT_ENTERED';
  monitorStop = true;
  if (monitorPromise) await monitorPromise;
  if (entryCommitted) {
    try {
      const adjudication = await adjudicate(error.message);
      if (escalated) {
        writeJson('07-final/OWNER_ESCALATION_RECEIPT.json', {
          schemaVersion: 1,
          packetVersion: 'R4',
          state: 'ESCALATED_FAIL_CLOSED',
          monotonicElapsedMs: monoMs() - receipt.monotonicOriginMs,
          noNewApplyOrRetry: true,
          quiescenceObjectsRemovedAutomatically: false,
          finalMonitoringSnapshot: receipt.monitorSamples.at(-1) ?? null,
          serverStateClassification: adjudication?.classification ?? 'BACKEND_UNKNOWN',
          requiredOwnerAction: 'Adjudicate captured ledger, structure, gate identity, backend, invariants, and HTTP evidence; do not retry or exit automatically.',
        });
      }
    } catch (adjudicationError) { receipt.adjudicationError = adjudicationError.message; }
  }
  process.exitCode = 1;
} finally {
  monitorStop = true;
  clearTimeout(maximumTimer);
  signalActiveChild('SIGINT');
  if (monitorPromise) await monitorPromise;
  receipt.finishedAt = iso();
  receipt.finishedMonoMs = monoMs();
  receipt.interrupted = interrupted;
  receipt.maximumQuiescenceEscalationReached = escalated;
  receipt.quiescenceAutomaticallyExited = false;
  receipt.serverStateProvenByLocalProcessDeath = false;
  receipt.workdirDestroyed = false;
  if (existsSync(WORKDIR)) {
    rmSync(WORKDIR, { recursive: true, force: true });
    receipt.workdirDestroyed = !existsSync(WORKDIR);
  }
  writeJson('07-final/FINAL_RECEIPT.json', receipt);
  try { generateEvidenceManifest(evidence); } catch (manifestError) { process.exitCode = 1; }
}
