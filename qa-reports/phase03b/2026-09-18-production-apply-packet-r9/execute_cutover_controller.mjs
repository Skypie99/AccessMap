#!/usr/bin/env node
// PROPOSAL ONLY. This committed controller is intentionally inert unless a
// later, separate owner-authorized production-apply run supplies the exact
// arming argument below. This R8 repair does not execute it against production.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHermeticWorkdir } from './build_hermetic_workdir.mjs';
import { generateEvidenceManifest } from './generate_evidence_manifest.mjs';
import {
  EXPECTED,
  ESCALATED_STATE,
  TARGET,
  assertAutomationAllowed,
  assertExitDispatchAllowed,
  buildEntryEnvelope,
  cadenceSlot,
  createEscalationLatch,
  createDeadlines,
  deriveClientOutcome,
  dispatchRestorationBeforeDeadline,
  evaluateExitEligibility,
  maxQuiescenceState,
  parseCliJson,
  postExitDisposition,
  resultRow,
  updateEscalationLatch,
  validateCadenceSample,
  validateDryRunPlan,
  validateEntryAndImmediateProof,
  validateMonitorAgainstEntry,
  validateR8Envelope,
  validateServerStateEnvelope,
} from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const WORKDIR = '/tmp/flagstone-p03b-production-apply-9d638456';
const ARMING_VALUE = 'FLAGSTONE-P03B-R8-PRODUCTION-APPLY';
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
const runId = randomUUID();

const receipt = {
  schemaVersion: 1,
  packetVersion: 'R8',
  target: TARGET,
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  runId,
  controllerPid: process.pid,
  controllerState: 'INITIALIZING',
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
let entryOperationStarted = false;
let entryClientOutcome = 'ENTRY_NOT_STARTED';
let applySpawned = false;
let monitorStop = false;
let monitorFailure = null;
let monitorPromise = null;
let previousCadence = null;
const escalationLatch = createEscalationLatch();
let controllerState = 'INITIALIZING';
let interrupted = false;
let maximumTimer = null;
let quiescenceExited = false;
const RESTORATION_DISPATCH_TOKEN = Symbol('phase03b-r8-restoration-dispatch');

function transition(state, detail = null) {
  receipt.stateTransitions.push({ state, detail, atUtc: iso(), monotonicMs: monoMs() });
}

function setControllerState(state, detail = null) {
  controllerState = state;
  receipt.controllerState = state;
  transition(state, detail);
}

function latchMaximum(reason, now = monoMs()) {
  const wasLatched = escalationLatch.latched;
  const exitAlreadyDispatched = controllerState === 'EXIT_DISPATCHED_PRE_DEADLINE';
  updateEscalationLatch(escalationLatch, now, receipt.immutableDeadlines.maximumQuiescenceEscalationMonoMs, reason);
  if (!wasLatched && escalationLatch.latched) {
    setControllerState(ESCALATED_STATE, reason);
    if (!exitAlreadyDispatched) signalActiveChild('SIGINT');
  }
  return escalationLatch.latched;
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

async function runCaptured(relativeBase, command, args, deadlineMonoMs, detached = false, cutoverCritical = false, restoration = null) {
  if (relativeBase === '05-exit/exit' && restoration?.token !== RESTORATION_DISPATCH_TOKEN) {
    throw new Error('Direct exit helper call rejected: use the single restoration dispatcher');
  }
  const dispatchMonoMs = monoMs();
  if (!Number.isSafeInteger(deadlineMonoMs) || dispatchMonoMs >= deadlineMonoMs) {
    throw new Error(`Refusing to spawn ${relativeBase}: absolute deadline expired`);
  }
  const stdoutPath = join(evidence, `${relativeBase}.stdout.log`);
  const stderrPath = join(evidence, `${relativeBase}.stderr.log`);
  const out = openSync(stdoutPath, 'wx', 0o600);
  const err = openSync(stderrPath, 'wx', 0o600);
  const startedAt = iso();
  const startedMonoMs = monoMs();
  if (startedMonoMs >= deadlineMonoMs) {
    closeSync(out);
    closeSync(err);
    throw new Error(`Refusing to spawn ${relativeBase}: deadline crossed during capture setup`);
  }
  const timeoutMs = deadlineMonoMs - startedMonoMs;
  let child;
  let restorationDispatchedAtMonoMs = null;
  try {
    if (restoration) {
      const dispatched = dispatchRestorationBeforeDeadline({
        ...restoration.predicates,
        nowMonoMs: monoMs,
        maximumMonoMs: restoration.maximumMonoMs,
        spawnChild: () => spawn(command, args, { stdio: ['ignore', out, err], detached, env: { ...process.env } }),
      });
      child = dispatched.child;
      restorationDispatchedAtMonoMs = dispatched.dispatchedAtMonoMs;
      restoration.onDispatched(restorationDispatchedAtMonoMs);
    } else {
      child = spawn(command, args, { stdio: ['ignore', out, err], detached, env: { ...process.env } });
    }
  } catch (error) {
    closeSync(out);
    closeSync(err);
    throw error;
  }
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
    restorationDispatchedAtMonoMs,
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

async function dispatchRestoration(exitSqlPath, deadlines) {
  const noUnknownState = receipt.result !== 'UNKNOWN' && !interrupted;
  const operationDeadlineMonoMs = Math.min(monoMs() + 30_000, deadlines.maximumQuiescenceEscalationMonoMs);
  return runCaptured('05-exit/exit', 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', exitSqlPath, '--output-format', 'json',
  ], operationDeadlineMonoMs, false, true, {
    token: RESTORATION_DISPATCH_TOKEN,
    maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs,
    predicates: {
      controllerState,
      escalationLatch,
      allComparatorsPass: true,
      primaryInvariantPass: true,
      historyCorroborationPass: true,
      httpBaselinePass: true,
      gateIdentityExact: true,
      noUnknownState,
      noInvalidEnvelope: true,
      currentRunMatchesEvidence: entryEnvelope?.runId === runId,
    },
    onDispatched: (dispatchedAtMonoMs) => setControllerState(
      'EXIT_DISPATCHED_PRE_DEADLINE',
      `Atomic exit dispatched at monotonic ${dispatchedAtMonoMs}; it may resolve if 600 seconds crosses while in flight`,
    ),
  });
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
  const sample = resultRow(parseCliJson(readFileSync(step.stdoutPath, 'utf8')), 'phase03b_monitor_r8');
  validateMonitorAgainstEntry(sample, entryEnvelope);
  const combined = {
    ...cadence,
    actualEndMonoMs: monoMs(),
    monotonicElapsedMs: monoMs() - deadlines.originMonoMs,
    utcTimestamp: sample.captured_at_utc,
    runId,
    controllerState,
    controllerPid: process.pid,
    childPid: activeCutoverChild?.pid ?? null,
    childProcessGroupId: activeCutoverChild?.detached ? activeCutoverChild.pid : null,
    childRunning: Boolean(activeCutoverChild),
    childExitCode: activeCutoverChild ? null : receipt.steps.at(-2)?.exitCode ?? null,
    childSignal: activeCutoverChild ? null : receipt.steps.at(-2)?.exitSignal ?? null,
    server: sample,
    ledgerSummary: { count: sample.ledger_count, uniqueCount: sample.ledger_unique_count, versions: sample.phase03b_versions },
    gateState: 'GATE_PRESENT_EXACT',
    maximumQuiescenceLatch: structuredClone(escalationLatch),
  };
  receipt.monitorSamples.push(combined);
  writeJson(`03-monitoring/sample-${String(slot).padStart(3, '0')}.json`, combined);
  if (maxQuiescenceState(combined.monotonicElapsedMs) === ESCALATED_STATE) {
    latchMaximum('600-second monotonic boundary reached; owner required', monoMs());
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
  if (existsSync(directory)) {
    const existing = join(directory, 'SERVER_STATE_CLASSIFICATION.json');
    if (!existsSync(existing)) return null;
    const result = readJson(existing);
    validateServerStateEnvelope(result, {
      runId, controllerPid: process.pid, controllerMonotonicOrigin: receipt.monotonicOriginMs,
      entryEnvelope, applySpawned,
    });
    return result;
  }
  const args = [
    join(PACKET, 'adjudicate_server_state.mjs'),
    `--evidence=${directory}`,
  ];
  if (entryEnvelope) args.push(`--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`);
  else args.push(`--run-id=${runId}`, `--controller-pid=${process.pid}`, `--monotonic-origin=${receipt.monotonicOriginMs}`);
  if (applySpawned) args.push('--apply-spawned');
  const step = await runCaptured('07-final/server-adjudication-runner', process.execPath, args, monoMs() + 330_000, true);
  const resultPath = join(directory, 'SERVER_STATE_CLASSIFICATION.json');
  const result = existsSync(resultPath) ? readJson(resultPath) : null;
  if (result) validateServerStateEnvelope(result, {
    runId, controllerPid: process.pid, controllerMonotonicOrigin: receipt.monotonicOriginMs,
    entryEnvelope, applySpawned,
  });
  receipt.serverAdjudication = {
    reason,
    runner: step,
    status: result?.status ?? 'OWNER_REQUIRED_FAIL_CLOSED',
    entryClassification: result?.observed?.entryClassification ?? 'OWNER_REQUIRED_FAIL_CLOSED',
    gateState: result?.observed?.gateState?.state ?? 'GATE_UNKNOWN',
    applyClassification: result?.observed?.applyClassification ?? 'BACKEND_UNKNOWN',
  };
  return result;
}

try {
  setControllerState('PREFLIGHT');
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
  setControllerState('EXACT_PLAN_PASS');

  const originMonoMs = monoMs();
  const deadlines = createDeadlines(originMonoMs);
  receipt.monotonicOriginMs = originMonoMs;
  receipt.immutableDeadlines = deadlines;
  writeJson('01-entry/IMMUTABLE_DEADLINES.json', deadlines);
  writeJson('01-entry/RUN_CONTEXT.json', {
    schemaVersion: 1,
    packetVersion: 'R8',
    runId,
    controllerPid: process.pid,
    controllerMonotonicOrigin: originMonoMs,
    productionTarget: TARGET,
    candidateSha: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree,
  });
  maximumTimer = setTimeout(() => {
    if (quiescenceExited) return;
    latchMaximum('600-second monotonic boundary reached; irreversible owner-required fail-closed');
  }, Math.max(1, deadlines.maximumQuiescenceEscalationMonoMs - monoMs()));

  const entryStartedAtMs = Date.now();
  entryOperationStarted = true;
  entryClientOutcome = 'ENTRY_COMMIT_AMBIGUOUS';
  setControllerState('ENTRY_STARTED', 'runId fixed before entry dispatch; client outcome is ambiguous until proven');
  const entryStep = await runCaptured('01-entry/entry', 'supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_ENTER.sql'), '--output-format', 'json',
  ], deadlines.entryCompleteMonoMs, false, true);
  requireSuccess(entryStep);
  const entry = resultRow(parseCliJson(readFileSync(entryStep.stdoutPath, 'utf8')), 'phase03b_quiescence_entry_r3');
  entryClientOutcome = 'ENTRY_COMMITTED_CLIENT_CONFIRMED';
  setControllerState('ENTRY_COMMITTED_CLIENT_CONFIRMED');
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
  entryEnvelope = buildEntryEnvelope({
    entry, proof, inventory, deadlines, controllerPid: process.pid, runId, entryStep, proofStep,
    capturedAtUtc: iso(), capturedAtMonotonic: monoMs(),
  });
  writeJson('01-entry/ENTRY_RECEIPT.json', entryEnvelope);
  entryClientOutcome = 'ENTRY_COMMITTED_CONFIRMED';
  setControllerState('ENTRY_COMMITTED_CONFIRMED_NORMAL_PATH');

  assertAutomationAllowed(escalationLatch, 'migration apply');
  applySpawned = true;
  setControllerState('APPLY_SPAWNED');
  const applyStep = await runCaptured('02-apply/apply', 'supabase', [
    'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET,
    '--skip-vault', '--include-all', '--yes', '--output-format', 'json',
  ], deadlines.applyCompleteMonoMs, true, true);
  const applyOutcome = deriveClientOutcome(applyStep);
  writeJson('02-apply/APPLY_OUTCOME.json', applyOutcome);
  if (applyOutcome.result !== 'CLIENT_EXIT_0' || interrupted) {
    receipt.result = 'UNKNOWN';
    setControllerState('UNKNOWN_CLIENT_OUTCOME');
    await adjudicate('Apply client outcome ambiguous');
    throw new Error('Apply outcome is UNKNOWN; no retry or exit authorized');
  }
  if (monitorFailure) throw monitorFailure;
  setControllerState('APPLY_CLIENT_EXIT_0');

  const postApplyDir = join(evidence, '04-post-apply-quiesced/comparator');
  const postApplyStep = await runCaptured('04-post-apply-quiesced/comparator-runner', process.execPath, [
    join(PACKET, 'verify_post_apply.mjs'), `--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`, `--evidence=${postApplyDir}`,
  ], deadlines.postApplyVerificationCompleteMonoMs, true, true);
  requireSuccess(postApplyStep, 'post-apply comparator');
  const postApplyReceipt = readJson(join(postApplyDir, 'POST_APPLY_VERIFIER_RECEIPT.json'));
  validateR8Envelope(postApplyReceipt, {
    phase: 'POST_APPLY_COMPARATOR', runId, controllerPid: process.pid,
    controllerMonotonicOrigin: originMonoMs, entryEnvelope,
  });
  if (postApplyReceipt.status !== 'PASS_WHILE_QUIESCED' || postApplyReceipt.numericExit !== 0) {
    throw new Error('Post-apply comparator did not return strict R8 PASS while quiesced');
  }
  if (monitorFailure) throw monitorFailure;
  setControllerState('POST_APPLY_EXACT_PASS');

  const eligibility = evaluateExitEligibility({
    postApplyVerificationPass: true,
    primaryInvariantPass: true,
    historyCorroborationPass: true,
    httpBaselinePass: true,
    gateIdentityPass: true,
    ledgerExactExpected: true,
    structureExactExpected: true,
    noUnknownState: receipt.result !== 'UNKNOWN' && !interrupted,
    withinMaximumQuiescence: !escalationLatch.latched && monoMs() < deadlines.maximumQuiescenceEscalationMonoMs,
    noEscalationLatch: !escalationLatch.latched,
  });
  writeJson('04-post-apply-quiesced/EXIT_ELIGIBILITY.json', eligibility);
  if (!eligibility.allowed) throw new Error(`Exit forbidden: ${eligibility.missing.join(', ')}`);
  setControllerState('VERIFIED_SAFE_TO_EXIT');
  assertExitDispatchAllowed({
    controllerState, escalationLatch, nowMonoMs: monoMs(), maximumMonoMs: deadlines.maximumQuiescenceEscalationMonoMs,
    allComparatorsPass: true, primaryInvariantPass: true, historyCorroborationPass: true,
    httpBaselinePass: true, noUnknownState: receipt.result !== 'UNKNOWN' && !interrupted,
    gateIdentityExact: true, noInvalidEnvelope: true, currentRunMatchesEvidence: entryEnvelope.runId === runId,
  });
  await stopMonitoring();

  const exitSqlPath = join(evidence, '05-exit/RECEIPT_BOUND_EXIT.sql');
  const generatorStep = await runCaptured('05-exit/generator', process.execPath, [
    join(PACKET, 'generate_exit_sql.mjs'), `--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`, `--output=${exitSqlPath}`,
  ], Math.min(deadlines.maximumQuiescenceEscalationMonoMs, monoMs() + 30_000));
  requireSuccess(generatorStep);
  const exitStep = await dispatchRestoration(exitSqlPath, deadlines);
  if (deriveClientOutcome(exitStep).result !== 'CLIENT_EXIT_0') {
    setControllerState('EXIT_FAILED_OWNER_REQUIRED', 'Exit transaction failed or became ambiguous; no cleanup retry');
    throw new Error('Receipt-bound exit transaction failed or became ambiguous');
  }
  quiescenceExited = true;
  clearTimeout(maximumTimer);
  transition('EXIT_COMMITTED', 'Atomic exit was dispatched below the hard boundary');

  const postExitDir = join(evidence, '06-post-exit/comparator');
  const postExitStep = await runCaptured('06-post-exit/comparator-runner', process.execPath, [
    join(PACKET, 'verify_post_exit.mjs'), `--entry=${join(evidence, '01-entry/ENTRY_RECEIPT.json')}`, `--evidence=${postExitDir}`,
  ], monoMs() + 300_000, true, true);
  const postExitReceipt = existsSync(join(postExitDir, 'POST_EXIT_VERIFIER_RECEIPT.json'))
    ? readJson(join(postExitDir, 'POST_EXIT_VERIFIER_RECEIPT.json')) : null;
  const disposition = postExitDisposition(postExitStep, postExitReceipt, {
    runId, controllerPid: process.pid, controllerMonotonicOrigin: originMonoMs, entryEnvelope,
  });
  writeJson('06-post-exit/POST_EXIT_DISPOSITION.json', disposition);
  if (disposition.result !== 'PASS') {
    setControllerState('EXIT_FAILED_OWNER_REQUIRED', 'Post-exit structural restoration comparator returned HOLD');
    throw new Error('Post-exit structural restoration comparator returned HOLD');
  }
  receipt.result = 'PASS_RESTORED';
  if (escalationLatch.latched) transition('READ_ONLY_POST_EXIT_VERIFICATION_COMPLETE', 'Escalation latch remains irreversible');
  else setControllerState('COMPLETE');
} catch (error) {
  receipt.error = error.message;
  monitorStop = true;
  if (monitorPromise) await monitorPromise;
  if (entryOperationStarted && !quiescenceExited) {
    try {
      const adjudication = await adjudicate(error.message);
      const classification = adjudication?.observed?.entryClassification ?? 'OWNER_REQUIRED_FAIL_CLOSED';
      if (classification === 'ENTRY_CONFIRMED_NOT_COMMITTED') receipt.result = 'HOLD_CONFIRMED_NOT_ENTERED';
      else if (classification === 'ENTRY_COMMITTED_CONFIRMED') receipt.result = 'HOLD_WHILE_QUIESCED_OR_EXIT_UNKNOWN';
      else receipt.result = 'OWNER_REQUIRED_FAIL_CLOSED';
      if (escalationLatch.latched) {
        writeJson('07-final/OWNER_ESCALATION_RECEIPT.json', {
          schemaVersion: 1,
          packetVersion: 'R8',
          runId,
          state: ESCALATED_STATE,
          monotonicElapsedMs: monoMs() - receipt.monotonicOriginMs,
          latch: structuredClone(escalationLatch),
          noNewApplyOrRetry: true,
          noAutomaticExitRestorationOrRollback: true,
          quiescenceObjectsRemovedAutomatically: false,
          finalMonitoringSnapshot: receipt.monitorSamples.at(-1) ?? null,
          serverStateClassification: adjudication?.observed?.applyClassification ?? 'BACKEND_UNKNOWN',
          requiredOwnerAction: 'Adjudicate captured ledger, structure, gate identity, backend, invariants, and HTTP evidence; do not retry or exit automatically.',
        });
      }
    } catch (adjudicationError) {
      receipt.adjudicationError = adjudicationError.message;
      receipt.result = 'OWNER_REQUIRED_FAIL_CLOSED';
    }
  } else if (!entryOperationStarted) receipt.result = 'HOLD_NOT_ENTERED';
  else if (receipt.result !== 'PASS_RESTORED') receipt.result = 'HOLD_AFTER_EXIT_OWNER_REQUIRED';
  process.exitCode = 1;
} finally {
  monitorStop = true;
  clearTimeout(maximumTimer);
  signalActiveChild('SIGINT');
  if (monitorPromise) await monitorPromise;
  receipt.finishedAt = iso();
  receipt.finishedMonoMs = monoMs();
  receipt.interrupted = interrupted;
  receipt.entryClientOutcome = entryClientOutcome;
  receipt.maximumQuiescenceEscalationReached = escalationLatch.latched;
  receipt.maximumQuiescenceLatch = structuredClone(escalationLatch);
  receipt.controllerState = controllerState;
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
