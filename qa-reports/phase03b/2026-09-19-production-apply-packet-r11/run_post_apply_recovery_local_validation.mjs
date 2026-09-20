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
  ['ledgerStatementIdentity', 'validate_ledger_statement_identity.mjs'],
  ['recoveryTransport', 'validate_post_apply_recovery_transport.mjs'],
  ['preservedTransport', 'validate_transport_repair.mjs'],
  ['preservedHistoryFailClosed', 'validate_history_support_fail_closed.mjs'],
  ['preservedR11Controls', 'validate_r8_controls.mjs'],
  ['preservedDisposableSql', 'validate_quiescence_local.mjs'],
];
const receipt = {
  schemaVersion: 1,
  promptId: 'FLAGSTONE-P03B-R11-RECOVERY-LEDGER-STATEMENT-IDENTITY-20260919',
  status: 'HOLD',
  localOnly: true,
  productionMutations: 'NONE',
  productionControllerExecuted: false,
  productionApplyExecuted: false,
  restorationExecuted: false,
  children: [],
  capturedAtUtc: null,
};

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
  try { payload = JSON.parse(child.stdout); } catch { /* raw streams are retained */ }
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

const focused = receipt.children.find((child) => child.label === 'recoveryTransport')?.payload;
const ledgerIdentity = receipt.children.find((child) => child.label === 'ledgerStatementIdentity')?.payload;
receipt.ledgerIdentityTests = { passed: ledgerIdentity?.passed ?? 0, total: ledgerIdentity?.total ?? 0 };
receipt.recoveryTransportTests = { passed: focused?.passed ?? 0, total: focused?.total ?? 0 };
receipt.numericChildExits = receipt.children.map((child) => child.exitCode);
receipt.validationInfrastructureDestroyed = receipt.children
  .filter((child) => !['ledgerStatementIdentity', 'recoveryTransport'].includes(child.label))
  .every((child) => child.payload?.tempDestroyed === true);
receipt.status = receipt.children.every((child) =>
  child.exitCode === 0 && !child.signal && !child.spawnError && child.payload?.status === 'PASS') &&
  receipt.ledgerIdentityTests.passed === 23 && receipt.ledgerIdentityTests.total === 23 &&
  receipt.recoveryTransportTests.passed === 13 && receipt.recoveryTransportTests.total === 13 &&
  receipt.validationInfrastructureDestroyed ? 'PASS' : 'HOLD';
receipt.capturedAtUtc = new Date().toISOString();
writeFileSync(join(evidence, 'POST_APPLY_RECOVERY_LOCAL_VALIDATION_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({
  status: receipt.status,
  ledgerIdentityTests: receipt.ledgerIdentityTests,
  recoveryTransportTests: receipt.recoveryTransportTests,
  numericChildExits: receipt.numericChildExits,
  validationInfrastructureDestroyed: receipt.validationInfrastructureDestroyed,
  productionMutations: receipt.productionMutations,
  productionControllerExecuted: receipt.productionControllerExecuted,
  productionApplyExecuted: receipt.productionApplyExecuted,
  restorationExecuted: receipt.restorationExecuted,
  evidence,
}, null, 2));
if (receipt.status !== 'PASS') process.exitCode = 1;
