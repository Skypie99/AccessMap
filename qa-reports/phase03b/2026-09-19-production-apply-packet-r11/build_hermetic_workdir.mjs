#!/usr/bin/env node
// Local-only R11 transport builder. The workspace contains the exact accepted
// production history support plus exactly two pending Phase 03B migrations.
// History support is read from one immutable Git commit and is never an apply
// candidate. This module performs no network operation.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  assertExactInventory,
  EXPECTED,
  EXPECTED_FILENAMES,
  EXPECTED_PRODUCTION_LEDGER,
  validateProductionMigrationLedger,
} from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PACKET, '../../..');
export const HISTORY_SOURCE_COMMIT = 'cf683eac2f50a284d8dc897db98a91290e9b6bc0';
const HISTORY_SOURCE_PATTERN = /^supabase\/(?:migrations|migrations-next|migrations-next\/phase03a)\/(\d{14})_[^/]+\.sql$/;
const RECONCILED_INVENTORY_KEYS = [
  'schemaVersion', 'packetVersion', 'target', 'candidate', 'candidateTree', 'historySourceCommit',
  'workspaceRoot', 'totalMigrationFileCount', 'historySupportFileCount', 'pendingMigrationFileCount',
  'seedFiles', 'roleFiles', 'otherSqlFiles', 'historyLedgerSha256', 'historyVersions',
  'pendingVersions', 'files',
];
const RECONCILED_FILE_KEYS = ['relativePath', 'filename', 'version', 'classification', 'size', 'sha256'];

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(file) {
  return sha256Bytes(readFileSync(file));
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`${label} key set mismatch`);
}

function walk(directory) {
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const file = join(directory, name);
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`Symlink forbidden in reconciled workdir: ${file}`);
    if (stat.isDirectory()) files.push(...walk(file));
    else files.push(file);
  }
  return files;
}

function git(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: ROOT, encoding, timeout: 30_000, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 || result.signal || result.error) throw new Error(`git ${args.join(' ')} failed`);
  return result.stdout;
}

function defaultLedger() {
  return {
    receipt: 'phase03b_r11_production_migration_ledger_read_only',
    captured_at_utc: '2026-09-15T00:00:00.000000Z',
    transaction_read_only: 'on',
    ledger_count: EXPECTED_PRODUCTION_LEDGER.expectedRowCount,
    ledger_unique_count: EXPECTED_PRODUCTION_LEDGER.expectedRowCount,
    ledger_latest_version: EXPECTED.baseline.ledgerLatestVersion,
    ledger_ordered_version_name_sha256: EXPECTED_PRODUCTION_LEDGER.expectedOrderedSha256,
    rows: structuredClone(EXPECTED_PRODUCTION_LEDGER.rows),
  };
}

function loadLedger(input) {
  const ledger = input == null ? defaultLedger()
    : typeof input === 'string' ? JSON.parse(readFileSync(resolve(input), 'utf8'))
      : structuredClone(input);
  validateProductionMigrationLedger(ledger);
  return ledger;
}

function historySourcePaths(ledger) {
  if (git(['rev-parse', `${HISTORY_SOURCE_COMMIT}^{commit}`]).trim() !== HISTORY_SOURCE_COMMIT) {
    throw new Error('Immutable history source commit mismatch');
  }
  const candidates = git(['ls-tree', '-r', '--name-only', HISTORY_SOURCE_COMMIT]).trim().split('\n')
    .filter(Boolean).filter((path) => HISTORY_SOURCE_PATTERN.test(path));
  return ledger.rows.map((row) => {
    const matches = candidates.filter((path) => basename(path).startsWith(`${row.version}_`));
    if (matches.length !== 1) throw new Error(`History source cardinality mismatch for ${row.version}`);
    return { ...row, sourcePath: matches[0] };
  });
}

function migrationFiles(output) {
  const directory = join(output, 'supabase/migrations');
  return existsSync(directory)
    ? readdirSync(directory).filter((name) => statSync(join(directory, name)).isFile() && name.endsWith('.sql')).sort()
    : [];
}

export function reconciledWorkspaceInventory(outputPath, ledgerInput = null) {
  const output = resolve(outputPath);
  const ledger = loadLedger(ledgerInput);
  const allFiles = walk(output);
  const names = migrationFiles(output);
  const historyVersions = new Set(ledger.rows.map((row) => row.version));
  const expectedPendingNames = new Set(EXPECTED_FILENAMES);
  const files = names.map((filename) => {
    const match = /^(\d{14})_/.exec(filename);
    const version = match?.[1] ?? null;
    const classification = expectedPendingNames.has(filename) ? 'PENDING_PHASE03B'
      : historyVersions.has(version) ? 'HISTORY_SUPPORT' : 'UNEXPECTED';
    const file = join(output, 'supabase/migrations', filename);
    return {
      relativePath: relative(output, file), filename, version, classification,
      size: statSync(file).size, sha256: sha256File(file),
    };
  });
  const sqlFiles = allFiles.filter((file) => file.endsWith('.sql'));
  const inventory = {
    schemaVersion: 1,
    packetVersion: 'R11-TRANSPORT-REPAIR',
    target: EXPECTED.productionTarget,
    candidate: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree,
    historySourceCommit: HISTORY_SOURCE_COMMIT,
    workspaceRoot: output,
    totalMigrationFileCount: files.length,
    historySupportFileCount: files.filter((file) => file.classification === 'HISTORY_SUPPORT').length,
    pendingMigrationFileCount: files.filter((file) => file.classification === 'PENDING_PHASE03B').length,
    seedFiles: allFiles.filter((file) => /(^|\/)seed(?:\.sql|s\/)/.test(relative(output, file))).length,
    roleFiles: allFiles.filter((file) => /(^|\/)roles?\.sql$/.test(relative(output, file))).length,
    otherSqlFiles: sqlFiles.length - names.length,
    historyLedgerSha256: ledger.ledger_ordered_version_name_sha256,
    historyVersions: files.filter((file) => file.classification === 'HISTORY_SUPPORT').map((file) => file.version),
    pendingVersions: files.filter((file) => file.classification === 'PENDING_PHASE03B').map((file) => file.version),
    files,
  };
  validateReconciledWorkspaceInventory(inventory, ledger);
  return inventory;
}

export function validateReconciledWorkspaceInventory(inventory, ledgerInput = null) {
  const ledger = loadLedger(ledgerInput);
  exactKeys(inventory, RECONCILED_INVENTORY_KEYS, 'Reconciled workspace inventory');
  if (inventory.schemaVersion !== 1 || inventory.packetVersion !== 'R11-TRANSPORT-REPAIR' ||
      inventory.target !== EXPECTED.productionTarget || inventory.candidate !== EXPECTED.candidate ||
      inventory.candidateTree !== EXPECTED.candidateTree || inventory.historySourceCommit !== HISTORY_SOURCE_COMMIT) {
    throw new Error('Reconciled workspace metadata mismatch');
  }
  if (!Array.isArray(inventory.files)) throw new Error('Reconciled workspace files must be an array');
  for (const [index, file] of inventory.files.entries()) {
    exactKeys(file, RECONCILED_FILE_KEYS, `Reconciled workspace file[${index}]`);
    if (!/^\d{14}$/.test(file.version ?? '') || !Number.isSafeInteger(file.size) || file.size <= 0 ||
        !/^[0-9a-f]{64}$/.test(file.sha256)) throw new Error(`Reconciled workspace file[${index}] is malformed`);
    if (file.relativePath !== `supabase/migrations/${file.filename}`) throw new Error('Reconciled workspace relative path mismatch');
  }
  const versions = inventory.files.map((file) => file.version);
  if (new Set(versions).size !== versions.length) throw new Error('Reconciled workspace contains a duplicate migration version');
  if (inventory.files.some((file) => file.classification === 'UNEXPECTED')) throw new Error('Reconciled workspace contains an unexpected local migration');
  const history = inventory.files.filter((file) => file.classification === 'HISTORY_SUPPORT');
  const pending = inventory.files.filter((file) => file.classification === 'PENDING_PHASE03B');
  const expectedHistoryVersions = ledger.rows.map((row) => row.version);
  if (inventory.totalMigrationFileCount !== ledger.rows.length + EXPECTED.migrations.length ||
      inventory.files.length !== inventory.totalMigrationFileCount ||
      inventory.historySupportFileCount !== ledger.rows.length || history.length !== ledger.rows.length ||
      inventory.pendingMigrationFileCount !== EXPECTED.migrations.length || pending.length !== EXPECTED.migrations.length) {
    throw new Error('Reconciled workspace migration cardinality mismatch');
  }
  if (JSON.stringify(inventory.historyVersions) !== JSON.stringify(expectedHistoryVersions) ||
      JSON.stringify(history.map((file) => file.version)) !== JSON.stringify(expectedHistoryVersions)) {
    throw new Error('Reconciled workspace history support does not exactly match the production ledger');
  }
  if (inventory.historyLedgerSha256 !== ledger.ledger_ordered_version_name_sha256) {
    throw new Error('Reconciled workspace history ledger digest mismatch');
  }
  if (JSON.stringify(pending.map((file) => file.filename)) !== JSON.stringify(EXPECTED_FILENAMES) ||
      JSON.stringify(inventory.pendingVersions) !== JSON.stringify(EXPECTED.migrations.map((migration) => migration.version))) {
    throw new Error('Reconciled workspace pending migration set/order mismatch');
  }
  for (const [index, file] of pending.entries()) {
    if (file.sha256 !== EXPECTED.migrations[index].sha256) throw new Error(`Pending migration hash mismatch: ${file.filename}`);
  }
  if (inventory.seedFiles !== 0 || inventory.roleFiles !== 0 || inventory.otherSqlFiles !== 0) {
    throw new Error('Reconciled workspace contains seed, role, or helper SQL');
  }
  return true;
}

export function inventoryWorkspace(outputPath, ledgerInput = null) {
  const output = resolve(outputPath);
  const reconciled = reconciledWorkspaceInventory(output, ledgerInput);
  const pendingFiles = reconciled.files.filter((file) => file.classification === 'PENDING_PHASE03B');
  const inventory = {
    schemaVersion: 1,
    packetVersion: 'R8',
    target: EXPECTED.productionTarget,
    candidate: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree,
    workspaceRoot: output,
    migrationFileCount: pendingFiles.length,
    files: pendingFiles.map(({ relativePath, filename, size, sha256 }) => ({ relativePath, filename, size, sha256 })),
    seedFiles: reconciled.seedFiles,
    roleFiles: reconciled.roleFiles,
    otherSqlFiles: reconciled.otherSqlFiles,
  };
  assertExactInventory(inventory);
  return inventory;
}

export function verifyWorkdirAgainstManifest(outputPath, ledgerInput = null) {
  const output = resolve(outputPath);
  const ledger = loadLedger(ledgerInput);
  const manifest = JSON.parse(readFileSync(join(output, 'PHASE03B_APPLY_WORKSPACE_MANIFEST.json'), 'utf8'));
  const pendingInventory = inventoryWorkspace(output, ledger);
  const reconciledInventory = reconciledWorkspaceInventory(output, ledger);
  const pendingSha256 = sha256Bytes(JSON.stringify(pendingInventory));
  const reconciledSha256 = sha256Bytes(JSON.stringify(reconciledInventory));
  if (manifest.pendingInventorySha256 !== pendingSha256 || manifest.reconciledInventorySha256 !== reconciledSha256 ||
      manifest.historyLedgerSha256 !== ledger.ledger_ordered_version_name_sha256 ||
      manifest.historySupportCount !== ledger.rows.length || manifest.pendingMigrationCount !== EXPECTED.migrations.length) {
    throw new Error('Reconciled workspace changed after validation');
  }
  return { manifest, pendingInventory, reconciledInventory, pendingSha256, reconciledSha256 };
}

export function buildHermeticWorkdir(outputPath, ledgerInput = null) {
  const output = resolve(outputPath);
  const ledger = loadLedger(ledgerInput);
  if (existsSync(output)) throw new Error(`Refusing existing output path: ${output}`);
  if (git(['rev-parse', `${EXPECTED.candidate}^{tree}`]).trim() !== EXPECTED.candidateTree) {
    throw new Error('Frozen candidate object/tree mismatch');
  }
  mkdirSync(join(output, 'supabase/migrations'), { recursive: true, mode: 0o700 });
  writeFileSync(join(output, 'supabase/config.toml'), [
    'project_id = "flagstone-phase03b-hermetic-r11-transport"',
    '',
    '[db]',
    'major_version = 17',
    '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });

  const historySources = historySourcePaths(ledger);
  for (const source of historySources) {
    const bytes = git(['show', `${HISTORY_SOURCE_COMMIT}:${source.sourcePath}`], null);
    writeFileSync(join(output, 'supabase/migrations', basename(source.sourcePath)), bytes, { mode: 0o600, flag: 'wx' });
  }
  for (const expected of EXPECTED.migrations) {
    const source = join(ROOT, 'supabase/migrations-next/phase03b', expected.filename);
    if (!existsSync(source) || sha256File(source) !== expected.sha256) {
      throw new Error(`Frozen migration source mismatch: ${expected.filename}`);
    }
    writeFileSync(join(output, 'supabase/migrations', expected.filename), readFileSync(source), { mode: 0o600, flag: 'wx' });
  }

  const inventory = inventoryWorkspace(output, ledger);
  const reconciledInventory = reconciledWorkspaceInventory(output, ledger);
  const manifest = {
    schemaVersion: 1,
    packetVersion: 'R11-TRANSPORT-REPAIR',
    target: EXPECTED.productionTarget,
    candidate: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree,
    historySourceCommit: HISTORY_SOURCE_COMMIT,
    historyLedgerSha256: ledger.ledger_ordered_version_name_sha256,
    historySupportCount: ledger.rows.length,
    pendingMigrationCount: EXPECTED.migrations.length,
    pendingMigrations: EXPECTED_FILENAMES,
    pendingInventorySha256: sha256Bytes(JSON.stringify(inventory)),
    reconciledInventorySha256: sha256Bytes(JSON.stringify(reconciledInventory)),
  };
  writeFileSync(join(output, 'MIGRATION_INVENTORY.json'), `${JSON.stringify(inventory, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(join(output, 'HISTORY_SUPPORT_INVENTORY.json'), `${JSON.stringify(reconciledInventory, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(join(output, 'PHASE03B_APPLY_WORKSPACE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  verifyWorkdirAgainstManifest(output, ledger);
  return { output, inventory, reconciledInventory, manifest };
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invoked) {
  const outputArg = process.argv.find((value) => value.startsWith('--output='));
  const ledgerArg = process.argv.find((value) => value.startsWith('--ledger='));
  if (!outputArg) throw new Error('Required: --output=/absolute/new/workdir');
  const result = buildHermeticWorkdir(
    outputArg.slice('--output='.length),
    ledgerArg?.slice('--ledger='.length) ?? null,
  );
  console.log(JSON.stringify({ status: 'PASS', ...result }, null, 2));
}
