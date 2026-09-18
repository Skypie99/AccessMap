#!/usr/bin/env node
// Local-only R7 builder. It creates a minimal Supabase workdir containing only
// the two frozen Phase 03B migrations. It performs no network operation.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertExactInventory, EXPECTED, EXPECTED_FILENAMES } from './r7_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PACKET, '../../..');

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function walk(directory) {
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const file = join(directory, name);
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`Symlink forbidden in hermetic workdir: ${file}`);
    if (stat.isDirectory()) files.push(...walk(file));
    else files.push(file);
  }
  return files;
}

export function inventoryWorkspace(output) {
  const allFiles = walk(output);
  const sqlFiles = allFiles.filter((file) => file.endsWith('.sql'));
  const migrationDir = join(output, 'supabase/migrations');
  const migrationFiles = existsSync(migrationDir)
    ? readdirSync(migrationDir).filter((name) => statSync(join(migrationDir, name)).isFile() && name.endsWith('.sql')).sort()
    : [];
  const inventory = {
    schemaVersion: 1,
    packetVersion: 'R7',
    target: EXPECTED.productionTarget,
    candidate: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree,
    workspaceRoot: output,
    migrationFileCount: migrationFiles.length,
    files: migrationFiles.map((filename) => {
      const file = join(migrationDir, filename);
      return {
        relativePath: relative(output, file),
        filename,
        size: statSync(file).size,
        sha256: sha256File(file),
      };
    }),
    seedFiles: allFiles.filter((file) => /(^|\/)seed(?:\.sql|s\/)/.test(relative(output, file))).length,
    roleFiles: allFiles.filter((file) => /(^|\/)roles?\.sql$/.test(relative(output, file))).length,
    otherSqlFiles: sqlFiles.length - migrationFiles.length,
  };
  assertExactInventory(inventory);
  return inventory;
}

function gitValue(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed`);
  return result.stdout.trim();
}

export function buildHermeticWorkdir(outputPath) {
  const output = resolve(outputPath);
  if (existsSync(output)) throw new Error(`Refusing existing output path: ${output}`);
  if (gitValue(['rev-parse', `${EXPECTED.candidate}^{tree}`]) !== EXPECTED.candidateTree) {
    throw new Error('Frozen candidate object/tree mismatch');
  }
  mkdirSync(join(output, 'supabase/migrations'), { recursive: true, mode: 0o700 });
  writeFileSync(join(output, 'supabase/config.toml'), [
    'project_id = "flagstone-phase03b-hermetic-r7"',
    '',
    '[db]',
    'major_version = 17',
    '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  for (const expected of EXPECTED.migrations) {
    const source = join(ROOT, 'supabase/migrations-next/phase03b', expected.filename);
    if (!existsSync(source) || sha256File(source) !== expected.sha256) {
      throw new Error(`Frozen migration source mismatch: ${expected.filename}`);
    }
    cpSync(source, join(output, 'supabase/migrations', basename(source)), { errorOnExist: true });
  }
  const inventory = inventoryWorkspace(output);
  const manifest = {
    schemaVersion: 1,
    packetVersion: 'R7',
    target: EXPECTED.productionTarget,
    candidate: EXPECTED.candidate,
    candidateTree: EXPECTED.candidateTree,
    migrationCount: 2,
    pendingMigrations: EXPECTED_FILENAMES,
    inventorySha256: createHash('sha256').update(JSON.stringify(inventory)).digest('hex'),
    migrations: inventory.files,
  };
  writeFileSync(join(output, 'MIGRATION_INVENTORY.json'), `${JSON.stringify(inventory, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(join(output, 'PHASE03B_APPLY_WORKSPACE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  // Re-inventory after receipts are present; neither receipt is SQL.
  assertExactInventory(inventoryWorkspace(output));
  return { output, inventory, manifest };
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invoked) {
  const outputArg = process.argv.find((value) => value.startsWith('--output='));
  if (!outputArg) throw new Error('Required: --output=/absolute/new/workdir');
  const result = buildHermeticWorkdir(outputArg.slice('--output='.length));
  console.log(JSON.stringify({ status: 'PASS', ...result }, null, 2));
}
