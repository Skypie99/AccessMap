#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const cases = [
  ['focusedTransport', 'validate_transport_repair.mjs'],
  ['preservedR11Controls', 'validate_r8_controls.mjs'],
  ['preservedR11DisposableSql', 'validate_quiescence_local.mjs'],
];
const receiptPath = join(PACKET, 'TRANSPORT_REPAIR_LOCAL_VALIDATION_RECEIPT.json');
if (existsSync(receiptPath)) throw new Error(`Refusing existing validation receipt: ${receiptPath}`);

const receipt = {
  schemaVersion: 1,
  promptId: 'FLAGSTONE-P03B-R11-EXECUTION-TRANSPORT-REPAIR-20260919',
  status: 'HOLD',
  localOnly: true,
  children: [],
  focusedTransportTests: null,
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
    const stdoutPath = join(PACKET, `TRANSPORT_REPAIR_${label}.stdout.log`);
    const stderrPath = join(PACKET, `TRANSPORT_REPAIR_${label}.stderr.log`);
    for (const path of [stdoutPath, stderrPath]) if (existsSync(path)) throw new Error(`Refusing existing artifact: ${path}`);
    const child = spawnSync(process.execPath, [join(PACKET, script)], {
      cwd: PACKET,
      encoding: 'utf8',
      timeout: 180_000,
      maxBuffer: 64 * 1024 * 1024,
      env: process.env,
    });
    writeFileSync(stdoutPath, child.stdout ?? '', { mode: 0o600, flag: 'wx' });
    writeFileSync(stderrPath, child.stderr ?? '', { mode: 0o600, flag: 'wx' });
    let payload = null;
    try { payload = JSON.parse(child.stdout); } catch { /* raw stream remains evidence */ }
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
  const focused = receipt.children.find((child) => child.label === 'focusedTransport')?.payload;
  receipt.focusedTransportTests = { passed: focused?.passed ?? 0, total: focused?.total ?? 0 };
  receipt.numericChildExits = receipt.children.map((child) => child.exitCode);
  receipt.allChildChecksTrue = receipt.children.every((child) => {
    const groups = [child.payload?.checks, child.payload?.requiredBranchCases, child.payload?.preservedR6BranchCases,
      child.payload?.r8ValidatorCases, child.payload?.r8SchemaRepairCases, child.payload?.r9TransportExactnessCases,
      child.payload?.r10ValidationOrderCases, child.payload?.r11PgNetCases].filter(Boolean);
    return groups.length > 0 && groups.flatMap((group) => Object.values(group)).every((value) => value === true);
  });
  receipt.validationInfrastructureDestroyed = receipt.children.every((child) => child.payload?.tempDestroyed === true);
  if (receipt.children.every((child) => child.exitCode === 0 && !child.signal && !child.spawnError && child.payload?.status === 'PASS') &&
      receipt.focusedTransportTests.passed >= 15 && receipt.focusedTransportTests.passed === receipt.focusedTransportTests.total &&
      receipt.allChildChecksTrue && receipt.validationInfrastructureDestroyed) receipt.status = 'PASS';
} catch (error) {
  receipt.error = String(error.stack ?? error);
} finally {
  receipt.capturedAtUtc = new Date().toISOString();
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

console.log(JSON.stringify({
  status: receipt.status,
  focusedTransportTests: receipt.focusedTransportTests,
  allChildChecksTrue: receipt.allChildChecksTrue,
  numericChildExits: receipt.numericChildExits,
  validationInfrastructureDestroyed: receipt.validationInfrastructureDestroyed,
  productionMutations: receipt.productionMutations,
  quiescenceEntered: receipt.quiescenceEntered,
  controllerExecuted: receipt.controllerExecuted,
  productionApplyExecuted: receipt.productionApplyExecuted,
  error: receipt.error,
}, null, 2));
if (receipt.status !== 'PASS') process.exitCode = 1;
