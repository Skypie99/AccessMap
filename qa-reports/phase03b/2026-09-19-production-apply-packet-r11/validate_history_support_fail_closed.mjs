#!/usr/bin/env node
// Focused local-only regressions for the R11 history-support fail-closed repair.
// No hosted target, credential, production input, or production mutation is accepted.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HISTORY_SOURCE_COMMIT,
  HISTORY_SUPPORT_MODE,
  HISTORY_SUPPORT_TRIPWIRE_ERROR,
  buildHermeticWorkdir,
  historySupportTripwire,
  validateReconciledWorkspaceInventory,
  verifyWorkdirAgainstManifest,
} from './build_hermetic_workdir.mjs';
import {
  EXPECTED,
  EXPECTED_FILENAMES,
  EXPECTED_PRODUCTION_LEDGER,
  validateDryRunPlan,
  validatePreApplyProductionMigrationLedger,
  validateProductionMigrationLedger,
} from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PACKET, '../../..');
const temp = mkdtempSync(join(tmpdir(), 'p03b-r11-history-fail-closed-'));
const workspace = join(temp, 'workspace');
const data = join(temp, 'data');
const log = join(temp, 'postgres.log');
const pgCandidates = [
  process.env.PG_BINDIR,
  '/opt/homebrew/opt/postgresql@17/bin',
  '/usr/local/opt/postgresql@17/bin',
  '/usr/lib/postgresql/17/bin',
].filter(Boolean);
const PG_BIN = pgCandidates.find((directory) => existsSync(join(directory, 'initdb')));
let started = false;

const result = {
  status: 'ERROR',
  localOnly: true,
  productionInputsAccepted: false,
  target: 'disposable local PostgreSQL 17 plus pure local validators',
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

function exactPlan() {
  return { dryRun: true, upToDate: false, migrations: [...EXPECTED_FILENAMES], seeds: [], roles: [] };
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

function git(args, encoding = 'utf8') {
  const child = spawnSync('git', args, { cwd: ROOT, encoding, maxBuffer: 64 * 1024 * 1024 });
  if (child.status !== 0 || child.error || child.signal) throw new Error(`git ${args.join(' ')} failed`);
  return child.stdout;
}

function cleanup() {
  if (started && PG_BIN) {
    spawnSync(join(PG_BIN, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop'], { stdio: 'ignore' });
  }
  rmSync(temp, { recursive: true, force: true });
}
process.on('exit', cleanup);

try {
  if (!PG_BIN) throw new Error('PostgreSQL 17 toolchain unavailable');
  const ledger = fixtureLedger();
  const built = buildHermeticWorkdir(workspace, ledger);
  const inventory = built.reconciledInventory;
  const history = inventory.files.filter((file) => file.classification === 'HISTORY_SUPPORT');
  const pending = inventory.files.filter((file) => file.classification === 'PENDING_PHASE03B');
  const migrationDirectory = join(workspace, 'supabase/migrations');

  result.checks.accepted85HistoryPlusExactTwoPendingPasses =
    validateReconciledWorkspaceInventory(inventory, ledger) === true &&
    history.length === 85 && pending.length === 2;

  const sourcePaths = git(['ls-tree', '-r', '--name-only', HISTORY_SOURCE_COMMIT]).trim().split('\n')
    .filter((path) => /^supabase\/(?:migrations|migrations-next|migrations-next\/phase03a)\/\d{14}_[^/]+\.sql$/.test(path));
  const sourceByVersion = new Map(ledger.rows.map((row) => {
    const matches = sourcePaths.filter((path) => basename(path).startsWith(`${row.version}_`));
    if (matches.length !== 1) throw new Error(`History source cardinality mismatch for ${row.version}`);
    return [row.version, matches[0]];
  }));

  result.checks.historicalSupportContainsNoHistoricalSqlBodies = history.every((file) => {
    const support = readFileSync(join(migrationDirectory, file.filename));
    const historical = git(['show', `${HISTORY_SOURCE_COMMIT}:${sourceByVersion.get(file.version)}`], null);
    return !support.equals(historical);
  });

  result.checks.everyHistoricalSupportFileHasExactTripwire = history.every((file) => {
    const bytes = readFileSync(join(migrationDirectory, file.filename), 'utf8');
    return bytes === historySupportTripwire(file.version, file.filename) &&
      bytes.includes(HISTORY_SUPPORT_TRIPWIRE_ERROR) &&
      bytes.split('\n').find((line) => line.trim() && !line.trim().startsWith('--')) === 'do $phase03b_history_support_tripwire$';
  });

  result.checks.manifestBindsTripwireMode =
    built.manifest.historySupportMode === HISTORY_SUPPORT_MODE &&
    verifyWorkdirAgainstManifest(workspace, ledger).manifest.historySupportMode === HISTORY_SUPPORT_MODE;

  const tripwireMutation = history[0];
  const tripwirePath = join(migrationDirectory, tripwireMutation.filename);
  writeFileSync(tripwirePath, git(['show', `${HISTORY_SOURCE_COMMIT}:${sourceByVersion.get(tripwireMutation.version)}`], null));
  result.checks.realHistoricalBodySubstitutionHolds = expectFailure(
    () => verifyWorkdirAgainstManifest(workspace, ledger),
    'real historical body substitution',
    'History-support tripwire mismatch',
  );
  writeFileSync(tripwirePath, historySupportTripwire(tripwireMutation.version, tripwireMutation.filename));
  verifyWorkdirAgainstManifest(workspace, ledger);

  const reserve = net.createServer();
  await new Promise((resolvePromise, reject) => reserve.once('error', reject).listen(0, '127.0.0.1', resolvePromise));
  const port = reserve.address().port;
  await new Promise((resolvePromise) => reserve.close(resolvePromise));
  const pgEnv = {
    PATH: `${PG_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`,
    LC_ALL: 'C', LC_CTYPE: 'C', LANG: 'C',
  };
  const pg = (name) => join(PG_BIN, name);
  const run = (command, args, options = {}) => spawnSync(command, args, {
    env: pgEnv, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options,
  });
  let child = run(pg('initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-sync']);
  if (child.status !== 0) throw new Error('Disposable initdb failed');
  writeFileSync(join(data, 'postgresql.conf'), `\nlisten_addresses = '127.0.0.1'\nport = ${port}\nfsync = off\nfull_page_writes = off\n`, { flag: 'a' });
  child = run(pg('pg_ctl'), ['-D', data, '-l', log, '-w', 'start']);
  if (child.status !== 0) throw new Error('Disposable PostgreSQL start failed');
  started = true;
  child = run(pg('createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'tripwire_probe']);
  if (child.status !== 0) throw new Error('Disposable database creation failed');
  const psqlBase = ['-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'tripwire_probe', '-v', 'ON_ERROR_STOP=1'];
  child = run(pg('psql'), [...psqlBase, '-q', '-c', `
    create schema supabase_migrations;
    create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);
  `]);
  if (child.status !== 0) throw new Error('Disposable ledger bootstrap failed');

  const selected = history[0];
  const selectedProbe = join(temp, 'selected-history-support.sql');
  writeFileSync(selectedProbe, [
    historySupportTripwire(selected.version, selected.filename),
    'create table public.historical_sql_executed(id integer);',
    `insert into supabase_migrations.schema_migrations(version, statements, name) values ('${selected.version}', array['tripwire bypassed'], 'should_not_apply');`,
    '',
  ].join('\n'), { mode: 0o600 });
  const selectedRun = run(pg('psql'), [...psqlBase, '-1', '-q', '-f', selectedProbe]);
  const state = run(pg('psql'), [...psqlBase, '-qAt', '-c', `select json_build_object(
    'marker_absent',to_regclass('public.historical_sql_executed') is null,
    'ledger_row_count',(select count(*) from supabase_migrations.schema_migrations where version='${selected.version}')
  )`]);
  if (state.status !== 0) throw new Error('Disposable tripwire state query failed');
  const tripwireState = JSON.parse(state.stdout.trim());
  result.checks.historicalSupportSelectedPendingAbortsBeforeHistoricalSql =
    selectedRun.status !== 0 && selectedRun.stderr.includes(HISTORY_SUPPORT_TRIPWIRE_ERROR) && tripwireState.marker_absent === true;
  result.checks.historicalSupportCannotSilentlyBecomeApplied =
    selectedRun.status !== 0 && tripwireState.ledger_row_count === 0;

  const missing = fixtureLedger();
  missing.rows.splice(0, 1);
  missing.ledger_count -= 1;
  missing.ledger_unique_count -= 1;
  result.checks.oneRemoteHistoricalVersionMissingBeforeApplyHolds = expectFailure(
    () => validatePreApplyProductionMigrationLedger(ledger, missing), 'missing remote historical version',
  );

  const unexpected = fixtureLedger();
  unexpected.rows.push({ version: '20260912120000', name: 'unexpected_history' });
  unexpected.ledger_count += 1;
  unexpected.ledger_unique_count += 1;
  unexpected.ledger_latest_version = '20260912120000';
  result.checks.unexpectedRemoteHistoricalVersionBeforeApplyHolds = expectFailure(
    () => validatePreApplyProductionMigrationLedger(ledger, unexpected), 'unexpected remote historical version',
  );

  const duplicate = fixtureLedger();
  duplicate.rows[1].version = duplicate.rows[0].version;
  result.checks.duplicateRemoteHistoricalVersionHolds = expectFailure(
    () => validatePreApplyProductionMigrationLedger(ledger, duplicate),
    'duplicate remote historical version', 'duplicate version',
  );

  const historicalPending = exactPlan();
  historicalPending.migrations.unshift(history[0].filename);
  result.checks.historicalSupportVersionInPendingPlanHolds = expectFailure(
    () => validateDryRunPlan(historicalPending), 'historical support selected pending',
    'FAIL_CLOSED_HISTORY_SUPPORT_SELECTED_PENDING',
  );

  const thirdPending = exactPlan();
  thirdPending.migrations.push('20260915210500_unexpected.sql');
  result.checks.thirdPhase03bPendingMigrationHolds = expectFailure(
    () => validateDryRunPlan(thirdPending), 'third Phase03B pending migration',
  );

  const wrongPendingHash = clone(inventory);
  wrongPendingHash.files.find((file) => file.classification === 'PENDING_PHASE03B').sha256 = 'f'.repeat(64);
  result.checks.wrongPhase03bHashHolds = expectFailure(
    () => validateReconciledWorkspaceInventory(wrongPendingHash, ledger), 'wrong Phase03B hash',
  );

  const reversed = exactPlan();
  reversed.migrations.reverse();
  result.checks.pendingOrderChangeHolds = expectFailure(
    () => validateDryRunPlan(reversed), 'pending order change',
  );

  const seeded = exactPlan();
  seeded.seeds.push('supabase/seed.sql');
  result.checks.seedHolds = expectFailure(() => validateDryRunPlan(seeded), 'seed plan');

  const roles = exactPlan();
  roles.roles.push('supabase/roles.sql');
  result.checks.roleMigrationHolds = expectFailure(() => validateDryRunPlan(roles), 'role plan');

  result.checks.validExactTwoPendingPlanPasses = validateDryRunPlan(exactPlan()) === true;

  const freshPreApplyLedger = fixtureLedger();
  freshPreApplyLedger.captured_at_utc = '2026-09-19T20:00:01.000000Z';
  result.checks.freshPreApplyLedgerReconciliationPasses =
    validatePreApplyProductionMigrationLedger(ledger, freshPreApplyLedger) === 'VALIDATED_R11_PRE_APPLY_PRODUCTION_LEDGER';

  const controller = readFileSync(join(PACKET, 'execute_cutover_controller.mjs'), 'utf8');
  const preApplyCapture = controller.indexOf("'02-apply/pre-apply-production-ledger-read-only'");
  const preApplyValidation = controller.indexOf('validatePreApplyProductionMigrationLedger(productionLedger, preApplyProductionLedger)');
  const preApplyWorkspace = controller.indexOf('verifyWorkdirAgainstManifest(WORKDIR, preApplyProductionLedger)');
  const applyDispatch = controller.indexOf("'02-apply/apply'");
  result.checks.controllerPreApplyLedgerReconciliationBeforeApplyDispatch =
    preApplyCapture > 0 && preApplyCapture < preApplyValidation && preApplyValidation < preApplyWorkspace && preApplyWorkspace < applyDispatch;
  result.checks.controllerUsesTripwireWorkspaceForApply =
    controller.includes("join(PACKET, 'build_hermetic_workdir.mjs')") &&
    controller.includes("'db', 'push', '--workdir', WORKDIR") &&
    controller.includes('historySupportMode: preApplyWorkspace.manifest.historySupportMode');

  result.checks.frozenPhase03bMigrationBytesUnchanged = EXPECTED.migrations.every((migration) => {
    const bytes = readFileSync(join(ROOT, 'supabase/migrations-next/phase03b', migration.filename));
    return createHash('sha256').update(bytes).digest('hex') === migration.sha256;
  });

  result.checks.noProductionMutationDuringValidation =
    result.productionInputsAccepted === false && result.productionMutations === 'NONE' &&
    result.quiescenceEntered === false && result.productionApplyExecuted === false;

  const failures = Object.entries(result.checks).filter(([, value]) => value !== true).map(([key]) => key);
  if (failures.length) throw new Error(`History fail-closed checks failed: ${failures.join(', ')}`);
  result.status = 'PASS';
  result.passed = Object.keys(result.checks).length;
  result.total = Object.keys(result.checks).length;
} catch (error) {
  result.error = String(error.stack ?? error);
} finally {
  cleanup();
  result.tempDestroyed = !existsSync(temp);
}

console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS' || !result.tempDestroyed) process.exitCode = 1;
