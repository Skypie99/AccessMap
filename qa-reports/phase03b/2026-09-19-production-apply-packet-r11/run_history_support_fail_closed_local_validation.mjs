#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const evidenceArg = process.argv.find((value) => value.startsWith('--evidence='));
if (!evidenceArg) throw new Error('Required: --evidence=/absolute/new/directory');
const evidence = resolve(evidenceArg.slice('--evidence='.length));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: true, mode: 0o700 });

const cases = [
  ['priorTransport', 'validate_transport_repair.mjs'],
  ['historyFailClosed', 'validate_history_support_fail_closed.mjs'],
  ['preservedR11Controls', 'validate_r8_controls.mjs'],
  ['preservedR11DisposableSql', 'validate_quiescence_local.mjs'],
];
const receipt = {
  schemaVersion: 1,
  promptId: 'FLAGSTONE-P03B-R11-TRANSPORT-HISTORY-FAIL-CLOSED-REPAIR-20260919',
  status: 'HOLD',
  localOnly: true,
  productionInputsAccepted: false,
  children: [],
  priorTransportTests: null,
  newHistoryFailClosedTests: null,
  allChildChecksTrue: false,
  numericChildExits: [],
  validationInfrastructureDestroyed: false,
  productionMutations: 'NONE',
  quiescenceEntered: false,
  controllerExecuted: false,
  productionApplyExecuted: false,
  capturedAtUtc: null,
  error: null,
};

try {
  for (const [label, script] of cases) {
    const child = spawnSync(process.execPath, [join(PACKET, script)], {
      cwd: PACKET,
      encoding: 'utf8',
      timeout: 240_000,
      maxBuffer: 64 * 1024 * 1024,
      env: process.env,
    });
    const stdoutPath = join(evidence, `${label}.stdout.log`);
    const stderrPath = join(evidence, `${label}.stderr.log`);
    writeFileSync(stdoutPath, child.stdout ?? '', { mode: 0o600, flag: 'wx' });
    writeFileSync(stderrPath, child.stderr ?? '', { mode: 0o600, flag: 'wx' });
    let payload = null;
    try { payload = JSON.parse(child.stdout); } catch { /* raw streams remain evidence */ }
    receipt.children.push({
      label,
      command: [process.execPath, join(PACKET, script)],
      exitCode: child.status,
      signal: child.signal,
      spawnError: child.error?.message ?? null,
      stdoutPath,
      stderrPath,
      payload,
    });
  }
  const prior = receipt.children.find((child) => child.label === 'priorTransport')?.payload;
  const history = receipt.children.find((child) => child.label === 'historyFailClosed')?.payload;
  receipt.priorTransportTests = { passed: prior?.passed ?? 0, total: prior?.total ?? 0 };
  receipt.newHistoryFailClosedTests = { passed: history?.passed ?? 0, total: history?.total ?? 0 };
  receipt.numericChildExits = receipt.children.map((child) => child.exitCode);
  receipt.allChildChecksTrue = receipt.children.every((child) => {
    const groups = [
      child.payload?.checks,
      child.payload?.requiredBranchCases,
      child.payload?.preservedR6BranchCases,
      child.payload?.r8ValidatorCases,
      child.payload?.r8SchemaRepairCases,
      child.payload?.r9TransportExactnessCases,
      child.payload?.r10ValidationOrderCases,
      child.payload?.r11PgNetCases,
    ].filter(Boolean);
    return groups.length > 0 && groups.flatMap((group) => Object.values(group)).every((value) => value === true);
  });
  receipt.validationInfrastructureDestroyed = receipt.children.every((child) => child.payload?.tempDestroyed === true);
  if (receipt.children.every((child) => child.exitCode === 0 && !child.signal && !child.spawnError && child.payload?.status === 'PASS') &&
      receipt.priorTransportTests.passed === 22 && receipt.priorTransportTests.total === 22 &&
      receipt.newHistoryFailClosedTests.passed >= 18 &&
      receipt.newHistoryFailClosedTests.passed === receipt.newHistoryFailClosedTests.total &&
      receipt.allChildChecksTrue && receipt.validationInfrastructureDestroyed) receipt.status = 'PASS';
} catch (error) {
  receipt.error = String(error.stack ?? error);
} finally {
  receipt.capturedAtUtc = new Date().toISOString();
  writeFileSync(join(evidence, 'HISTORY_SUPPORT_FAIL_CLOSED_LOCAL_VALIDATION_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

console.log(JSON.stringify({
  status: receipt.status,
  priorTransportTests: receipt.priorTransportTests,
  newHistoryFailClosedTests: receipt.newHistoryFailClosedTests,
  allChildChecksTrue: receipt.allChildChecksTrue,
  numericChildExits: receipt.numericChildExits,
  validationInfrastructureDestroyed: receipt.validationInfrastructureDestroyed,
  productionInputsAccepted: receipt.productionInputsAccepted,
  productionMutations: receipt.productionMutations,
  quiescenceEntered: receipt.quiescenceEntered,
  controllerExecuted: receipt.controllerExecuted,
  productionApplyExecuted: receipt.productionApplyExecuted,
  evidence,
  error: receipt.error,
}, null, 2));
if (receipt.status !== 'PASS') process.exitCode = 1;
