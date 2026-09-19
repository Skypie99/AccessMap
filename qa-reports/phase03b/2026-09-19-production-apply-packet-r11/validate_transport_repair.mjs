#!/usr/bin/env node
// Focused local-only regressions for the R11 execution-transport repair.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HISTORY_SOURCE_COMMIT,
  buildHermeticWorkdir,
  validateReconciledWorkspaceInventory,
  verifyWorkdirAgainstManifest,
} from './build_hermetic_workdir.mjs';
import {
  EXPECTED,
  EXPECTED_FILENAMES,
  EXPECTED_PRODUCTION_LEDGER,
  validateDryRunPlan,
  validateProductionMigrationLedger,
} from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'p03b-r11-transport-'));
const workspace = join(temp, 'workspace');
const result = {
  status: 'ERROR',
  localOnly: true,
  target: EXPECTED.productionTarget,
  checks: {},
  productionMutations: 'NONE',
  quiescenceEntered: false,
  productionApplyExecuted: false,
  tempDestroyed: false,
  error: null,
};

function clone(value) {
  return structuredClone(value);
}

function fixtureLedger() {
  return {
    receipt: 'phase03b_r11_production_migration_ledger_read_only',
    captured_at_utc: '2026-09-19T20:00:00.000000Z',
    transaction_read_only: 'on',
    ledger_count: EXPECTED_PRODUCTION_LEDGER.expectedRowCount,
    ledger_unique_count: EXPECTED_PRODUCTION_LEDGER.expectedRowCount,
    ledger_latest_version: EXPECTED.baseline.ledgerLatestVersion,
    ledger_ordered_version_name_sha256: EXPECTED_PRODUCTION_LEDGER.expectedOrderedSha256,
    rows: clone(EXPECTED_PRODUCTION_LEDGER.rows),
  };
}

function expectFailure(fn, label, includes = null) {
  try {
    fn();
  } catch (error) {
    if (includes && !String(error.message).includes(includes)) {
      throw new Error(`${label} failed with an unexpected error: ${error.message}`);
    }
    return true;
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

function exactPlan() {
  return { dryRun: true, upToDate: false, migrations: [...EXPECTED_FILENAMES], seeds: [], roles: [] };
}

try {
  const ledger = fixtureLedger();
  result.checks.productionLedgerExactFixturePasses = validateProductionMigrationLedger(ledger) === 'VALIDATED_R11_PRODUCTION_LEDGER';
  const built = buildHermeticWorkdir(workspace, ledger);
  const inventory = built.reconciledInventory;

  result.checks.acceptedHistoryPlusExactTwoPendingPasses =
    validateReconciledWorkspaceInventory(inventory, ledger) === true &&
    inventory.historySupportFileCount === 85 && inventory.pendingMigrationFileCount === 2;

  const missingHistory = clone(inventory);
  const removed = missingHistory.files.findIndex((file) => file.classification === 'HISTORY_SUPPORT');
  missingHistory.files.splice(removed, 1);
  missingHistory.historyVersions.splice(removed, 1);
  missingHistory.totalMigrationFileCount -= 1;
  missingHistory.historySupportFileCount -= 1;
  result.checks.oneHistoricalRemoteVersionMissingLocallyHolds = expectFailure(
    () => validateReconciledWorkspaceInventory(missingHistory, ledger), 'missing historical support',
  );

  const unexpectedHistory = clone(inventory);
  unexpectedHistory.files.push({
    relativePath: 'supabase/migrations/20000101000000_unexpected.sql',
    filename: '20000101000000_unexpected.sql',
    version: '20000101000000',
    classification: 'UNEXPECTED',
    size: 1,
    sha256: 'a'.repeat(64),
  });
  unexpectedHistory.totalMigrationFileCount += 1;
  result.checks.unexpectedLocalHistoryVersionHolds = expectFailure(
    () => validateReconciledWorkspaceInventory(unexpectedHistory, ledger), 'unexpected local history',
  );

  const duplicateHistory = clone(inventory);
  duplicateHistory.files[1].version = duplicateHistory.files[0].version;
  duplicateHistory.historyVersions[1] = duplicateHistory.historyVersions[0];
  result.checks.duplicateHistoryVersionHolds = expectFailure(
    () => validateReconciledWorkspaceInventory(duplicateHistory, ledger), 'duplicate history version',
  );

  const driftedLedger = fixtureLedger();
  driftedLedger.rows[0].name = `${driftedLedger.rows[0].name}_drift`;
  result.checks.productionLedgerDriftHolds = expectFailure(
    () => validateProductionMigrationLedger(driftedLedger), 'production ledger drift',
  );

  const thirdPending = exactPlan();
  thirdPending.migrations.push('20260915210500_unexpected.sql');
  result.checks.thirdPendingMigrationHolds = expectFailure(
    () => validateDryRunPlan(thirdPending), 'third pending migration',
  );

  const wrongPendingHash = clone(inventory);
  wrongPendingHash.files.find((file) => file.classification === 'PENDING_PHASE03B').sha256 = 'f'.repeat(64);
  result.checks.wrongPendingMigrationHashHolds = expectFailure(
    () => validateReconciledWorkspaceInventory(wrongPendingHash, ledger), 'wrong pending hash',
  );

  const reversedPlan = exactPlan();
  reversedPlan.migrations.reverse();
  result.checks.pendingOrderChangedHolds = expectFailure(
    () => validateDryRunPlan(reversedPlan), 'pending order changed',
  );

  const seeded = clone(inventory);
  seeded.seedFiles = 1;
  result.checks.seedPresentHolds = expectFailure(
    () => validateReconciledWorkspaceInventory(seeded, ledger), 'seed present',
  );

  const roles = clone(inventory);
  roles.roleFiles = 1;
  result.checks.roleMigrationPresentHolds = expectFailure(
    () => validateReconciledWorkspaceInventory(roles, ledger), 'role migration present',
  );

  result.checks.legacyMissingLocalClassifiedFailClosed = expectFailure(
    () => validateDryRunPlan({
      _tag: 'Error',
      error: { code: 'LegacyDbPushMissingLocalError', message: 'Remote migration versions not found in local migrations directory.' },
    }),
    'LegacyDbPushMissingLocalError',
    'FAIL_CLOSED_LEGACY_DB_PUSH_MISSING_LOCAL',
  );
  result.checks.successfulCliDryRunExactTwoOnly = validateDryRunPlan(exactPlan()) === true;
  result.checks.malformedCliOutputHolds = expectFailure(
    () => validateDryRunPlan({ dryRun: 'true', migrations: EXPECTED_FILENAMES, seeds: [], roles: [] }),
    'malformed CLI output',
  );
  result.checks.workspaceManifestRevalidationPasses =
    verifyWorkdirAgainstManifest(workspace, ledger).reconciledInventory.historySupportFileCount === 85;

  writeFileSync(join(workspace, 'supabase/migrations', EXPECTED_FILENAMES[0]), '-- changed\n');
  result.checks.workspaceMutationAfterValidationHolds = expectFailure(
    () => verifyWorkdirAgainstManifest(workspace, ledger), 'workspace mutation after validation',
  );

  const controller = readFileSync(join(PACKET, 'execute_cutover_controller.mjs'), 'utf8');
  result.checks.controllerInternalDryRunUsesRepairedWorkspace =
    controller.includes('`--ledger=${productionLedgerPath}`') &&
    controller.includes("'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET,\n    '--dry-run'");
  result.checks.controllerApplyUsesSameValidatedWorkspaceManifest =
    controller.includes('verifyWorkdirAgainstManifest(WORKDIR, productionLedger)') &&
    controller.includes("'db', 'push', '--workdir', WORKDIR, '--linked', '--project-ref', TARGET,\n    '--skip-vault'") &&
    controller.includes('PRE_APPLY_WORKSPACE_GUARD.json');
  result.checks.controllerCapturesLedgerReadOnlyBeforeBuilder =
    controller.indexOf('production-ledger-read-only') < controller.indexOf('hermetic-builder') &&
    controller.includes("'--file', join(PACKET, 'PRODUCTION_MIGRATION_LEDGER_READ_ONLY.sql')");
  result.checks.historySourcesPinnedToAcceptedPacketCommit = HISTORY_SOURCE_COMMIT === 'cf683eac2f50a284d8dc897db98a91290e9b6bc0';
  result.checks.prohibitedRepairAndPullAbsent =
    !controller.includes('migration repair') && !controller.includes("'db', 'pull'");
  result.checks.noProductionMutationDuringValidation =
    result.productionMutations === 'NONE' && result.quiescenceEntered === false && result.productionApplyExecuted === false;

  const failures = Object.entries(result.checks).filter(([, value]) => value !== true).map(([key]) => key);
  if (failures.length) throw new Error(`Focused transport checks failed: ${failures.join(', ')}`);
  result.status = 'PASS';
  result.passed = Object.keys(result.checks).length;
  result.total = Object.keys(result.checks).length;
} catch (error) {
  result.error = String(error.stack ?? error);
} finally {
  rmSync(temp, { recursive: true, force: true });
  result.tempDestroyed = !existsSync(temp);
}

console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS' || !result.tempDestroyed) process.exitCode = 1;
