#!/usr/bin/env node
// Target-pinned, credential-safe validation: one read-only ledger capture and
// one Supabase db-push dry run. This script cannot enter quiescence or apply.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHermeticWorkdir, verifyWorkdirAgainstManifest } from './build_hermetic_workdir.mjs';
import {
  EXPECTED,
  EXPECTED_FILENAMES,
  parseCliJson,
  resultRow,
  validateDryRunPlan,
  validateProductionMigrationLedger,
} from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const outputArg = process.argv.find((value) => value.startsWith('--evidence='));
if (!outputArg) throw new Error('Required: --evidence=/absolute/new/directory');
const evidence = resolve(outputArg.slice('--evidence='.length));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: true, mode: 0o700 });
const temp = mkdtempSync(join(tmpdir(), 'p03b-r11-live-transport-'));
const workspace = join(temp, 'workspace');

const receipt = {
  schemaVersion: 1,
  promptId: 'FLAGSTONE-P03B-R11-EXECUTION-TRANSPORT-REPAIR-20260919',
  status: 'ERROR',
  target: EXPECTED.productionTarget,
  supabaseCli: null,
  productionLedger: null,
  reconciledWorkspace: null,
  authoritativeDryRunPlan: null,
  numericChildExits: {},
  productionMutations: 'NONE',
  quiescenceEntered: false,
  controllerExecuted: false,
  productionApplyExecuted: false,
  temporaryWorkspaceDestroyed: false,
  capturedAtUtc: null,
  error: null,
};

function capture(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: PACKET,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
  writeFileSync(join(evidence, `${label}.stdout.log`), result.stdout ?? '', { mode: 0o600, flag: 'wx' });
  writeFileSync(join(evidence, `${label}.stderr.log`), result.stderr ?? '', { mode: 0o600, flag: 'wx' });
  receipt.numericChildExits[label] = result.status;
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`${label} failed: exit=${result.status} signal=${result.signal ?? 'none'}`);
  }
  return result.stdout;
}

try {
  receipt.supabaseCli = capture('supabase-version', 'supabase', ['--version']).trim();
  if (receipt.supabaseCli !== '2.116.0') throw new Error(`Supabase CLI drift: ${receipt.supabaseCli}`);

  const ledgerRaw = capture('production-ledger-read-only', 'supabase', [
    'db', 'query', '--linked', '--project-ref', EXPECTED.productionTarget,
    '--file', join(PACKET, 'PRODUCTION_MIGRATION_LEDGER_READ_ONLY.sql'), '--output-format', 'json',
  ]);
  const ledger = resultRow(parseCliJson(ledgerRaw), 'phase03b_r11_production_migration_ledger_read_only');
  validateProductionMigrationLedger(ledger);
  writeFileSync(join(evidence, 'PRODUCTION_MIGRATION_LEDGER.json'), `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600, flag: 'wx' });

  const built = buildHermeticWorkdir(workspace, ledger);
  const verified = verifyWorkdirAgainstManifest(workspace, ledger);
  writeFileSync(join(evidence, 'HISTORY_SUPPORT_INVENTORY.json'), `${JSON.stringify(built.reconciledInventory, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(join(evidence, 'PHASE03B_APPLY_WORKSPACE_MANIFEST.json'), `${JSON.stringify(verified.manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });

  const planRaw = capture('target-pinned-db-push-dry-run', 'supabase', [
    'db', 'push', '--workdir', workspace, '--linked', '--project-ref', EXPECTED.productionTarget,
    '--dry-run', '--skip-vault', '--include-all', '--output-format', 'json',
  ]);
  const plan = parseCliJson(planRaw);
  validateDryRunPlan(plan);

  receipt.productionLedger = {
    validation: 'PASS_EXACT_ACCEPTED_85_ROW_LEDGER',
    transactionReadOnly: ledger.transaction_read_only,
    rowCount: ledger.ledger_count,
    latestVersion: ledger.ledger_latest_version,
    orderedVersionNameSha256: ledger.ledger_ordered_version_name_sha256,
  };
  receipt.reconciledWorkspace = {
    validation: 'PASS',
    historySourceCommit: verified.manifest.historySourceCommit,
    historySupportCount: verified.manifest.historySupportCount,
    pendingMigrationCount: verified.manifest.pendingMigrationCount,
    pendingMigrations: EXPECTED.migrations.map(({ filename, sha256 }) => ({ filename, sha256 })),
    historyLedgerSha256: verified.manifest.historyLedgerSha256,
    pendingInventorySha256: verified.manifest.pendingInventorySha256,
    reconciledInventorySha256: verified.manifest.reconciledInventorySha256,
  };
  receipt.authoritativeDryRunPlan = {
    validation: 'PASS_EXACT_TWO_PENDING_ONLY',
    dryRun: plan.dryRun,
    upToDate: plan.upToDate,
    pendingMigrationCount: plan.migrations.length,
    migrations: plan.migrations,
    exactExpectedOrder: JSON.stringify(plan.migrations) === JSON.stringify(EXPECTED_FILENAMES),
    seeds: plan.seeds,
    roles: plan.roles,
  };
  receipt.status = 'PASS';
  receipt.capturedAtUtc = new Date().toISOString();
} catch (error) {
  receipt.error = String(error.stack ?? error);
} finally {
  rmSync(temp, { recursive: true, force: true });
  receipt.temporaryWorkspaceDestroyed = !existsSync(temp);
  writeFileSync(join(evidence, 'LIVE_TRANSPORT_VALIDATION_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

console.log(JSON.stringify({
  status: receipt.status,
  target: receipt.target,
  supabaseCli: receipt.supabaseCli,
  productionLedger: receipt.productionLedger,
  reconciledWorkspace: receipt.reconciledWorkspace,
  authoritativeDryRunPlan: receipt.authoritativeDryRunPlan,
  numericChildExits: receipt.numericChildExits,
  productionMutations: receipt.productionMutations,
  quiescenceEntered: receipt.quiescenceEntered,
  controllerExecuted: receipt.controllerExecuted,
  productionApplyExecuted: receipt.productionApplyExecuted,
  temporaryWorkspaceDestroyed: receipt.temporaryWorkspaceDestroyed,
  evidence,
  error: receipt.error,
}, null, 2));
if (receipt.status !== 'PASS' || !receipt.temporaryWorkspaceDestroyed) process.exitCode = 1;
