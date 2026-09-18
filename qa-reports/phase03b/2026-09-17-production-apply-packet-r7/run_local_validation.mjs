#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const monoMs = () => Number(process.hrtime.bigint() / 1_000_000n);
const iso = () => new Date().toISOString();

async function run(label, script) {
  const stdoutPath = join(PACKET, `${label}.stdout.log`);
  const stderrPath = join(PACKET, `${label}.stderr.log`);
  const jsonPath = join(PACKET, `${label}.json`);
  for (const path of [stdoutPath, stderrPath, jsonPath]) if (existsSync(path)) throw new Error(`Refusing existing validation artifact: ${path}`);
  const out = openSync(stdoutPath, 'wx', 0o600);
  const err = openSync(stderrPath, 'wx', 0o600);
  const startedAt = iso();
  const startedMonoMs = monoMs();
  const scriptPath = isAbsolute(script) ? script : join(PACKET, script);
  const child = spawn(process.execPath, [scriptPath], { stdio: ['ignore', out, err], env: { ...process.env } });
  const ended = await new Promise((resolvePromise) => {
    child.once('error', (error) => resolvePromise({ exitCode: null, signal: null, spawnError: error.message }));
    child.once('exit', (exitCode, signal) => resolvePromise({ exitCode, signal, spawnError: null }));
  });
  closeSync(out);
  closeSync(err);
  const endedMonoMs = monoMs();
  const stdout = readFileSync(stdoutPath, 'utf8');
  let payload = null;
  try { payload = JSON.parse(stdout); } catch { /* retained raw stream is authoritative */ }
  if (payload) writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  return {
    label,
    command: [process.execPath, scriptPath],
    controllerPid: process.pid,
    childPid: child.pid,
    processGroupId: null,
    startedAt,
    endedAt: iso(),
    startedMonoMs,
    endedMonoMs,
    durationMs: endedMonoMs - startedMonoMs,
    exitCode: ended.exitCode,
    signal: ended.signal,
    spawnError: ended.spawnError,
    stdoutPath,
    stderrPath,
    jsonPath: payload ? jsonPath : null,
    payload,
  };
}

const receiptPath = join(PACKET, 'LOCAL_VALIDATION_RECEIPT.json');
if (existsSync(receiptPath)) throw new Error(`Refusing existing validation receipt: ${receiptPath}`);
const receipt = {
  schemaVersion: 1,
  packetVersion: 'R7',
  startedAt: iso(),
  controllerPid: process.pid,
  productionMutations: 'NONE',
  stagingMutations: 'NONE',
  children: [],
  result: 'HOLD',
};

try {
  receipt.children.push(await run('LOCAL_SQL_GATE_VALIDATION', 'validate_quiescence_local.mjs'));
  receipt.children.push(await run('LOCAL_R7_CONTROL_VALIDATION', 'validate_r7_controls.mjs'));
  const sourceR6 = join(PACKET, '..', '2026-09-17-production-apply-packet-r6');
  receipt.children.push(await run('PRESERVED_R6_SQL_GATE_VALIDATION', join(sourceR6, 'validate_quiescence_local.mjs')));
  receipt.children.push(await run('PRESERVED_R6_CONTROL_VALIDATION', join(sourceR6, 'validate_r6_controls.mjs')));
  const r7Children = receipt.children.filter((child) => child.label.startsWith('LOCAL_'));
  const r6Children = receipt.children.filter((child) => child.label.startsWith('PRESERVED_R6_'));
  const r7Checks = r7Children.flatMap((child) => [
    ...Object.entries(child.payload?.checks ?? {}),
    ...Object.entries(child.payload?.requiredBranchCases ?? {}),
    ...Object.entries(child.payload?.preservedR6BranchCases ?? {}),
    ...Object.entries(child.payload?.r7ValidatorCases ?? {}),
  ]);
  const r6Checks = r6Children.flatMap((child) => [
    ...Object.entries(child.payload?.checks ?? {}),
    ...Object.entries(child.payload?.requiredBranchCases ?? {}),
    ...Object.entries(child.payload?.newR6BranchCases ?? {}),
  ]);
  const checks = [...r7Checks, ...r6Checks];
  receipt.localReplayCheckCount = r7Checks.length;
  receipt.preservedR6ReplayCheckCount = r6Checks.length;
  const branchChild = receipt.children.find((child) => child.label === 'LOCAL_R7_CONTROL_VALIDATION');
  receipt.preservedR5BranchTests = {
    passed: branchChild?.payload?.requiredBranchPassed ?? 0,
    total: branchChild?.payload?.requiredBranchTotal ?? 0,
  };
  receipt.preservedR6BranchTests = {
    passed: branchChild?.payload?.preservedR6BranchPassed ?? 0,
    total: branchChild?.payload?.preservedR6BranchTotal ?? 0,
  };
  receipt.newR7ValidatorTests = {
    passed: branchChild?.payload?.r7ValidatorPassed ?? 0,
    total: branchChild?.payload?.r7ValidatorTotal ?? 0,
  };
  receipt.allChecksTrue = checks.length > 0 && checks.every(([, value]) => value === true);
  receipt.validationInfrastructureDestroyed = receipt.children.every((child) => child.payload?.tempDestroyed === true);
  receipt.numericChildExits = receipt.children.map((child) => child.exitCode);
  receipt.result = receipt.children.every((child) => child.exitCode === 0 && !child.signal && !child.spawnError && child.payload?.status === 'PASS') &&
    receipt.allChecksTrue && receipt.validationInfrastructureDestroyed ? 'PASS' : 'HOLD';
} catch (error) {
  receipt.error = error.message;
  process.exitCode = 1;
} finally {
  receipt.finishedAt = iso();
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

if (receipt.result !== 'PASS') process.exitCode = 1;
console.log(JSON.stringify({
  result: receipt.result,
  localReplayCheckCount: receipt.localReplayCheckCount,
  preservedR6ReplayCheckCount: receipt.preservedR6ReplayCheckCount,
  preservedR5BranchTests: receipt.preservedR5BranchTests,
  preservedR6BranchTests: receipt.preservedR6BranchTests,
  newR7ValidatorTests: receipt.newR7ValidatorTests,
  numericChildExits: receipt.numericChildExits,
  validationInfrastructureDestroyed: receipt.validationInfrastructureDestroyed,
}, null, 2));
