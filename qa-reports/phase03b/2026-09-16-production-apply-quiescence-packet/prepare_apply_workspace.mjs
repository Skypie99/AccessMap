#!/usr/bin/env node
/**
 * PROPOSAL ONLY. Local-only builder for the future Phase 03B apply workspace.
 * It performs no hosted query and accepts no credential. The caller supplies
 * the privacy-safe pre-quiescence snapshot produced by snapshot.sql.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PACKET, '../../..');
const EXPECTED_CANDIDATE = '9d638456fa8e679678c54f131fe8f0db723eda72';
const EXPECTED_TREE = 'cfc76206f7cf7af6a7127a6329620d2ee1dc4da8';
const TARGET = 'kldlwszpfkdmsjrjhjym';
const MODERATION = '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql';
const MODERATION_SHA = 'b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11';
const POINTS = '20260915210413_phase03b_points_integrity.sql';
const POINTS_SHA = '0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5';
const EXPECTED_PHASE03A_VERSIONS = new Set([
  '20260904000000', '20260904000100', '20260904000200', '20260904000300', '20260904000400',
  '20260905055629', '20260905055630', '20260905055632', '20260905055633', '20260905055635',
  '20260905055636', '20260905073925', '20260909120000', '20260911120000',
]);

const snapshotArg = process.argv.find((value) => value.startsWith('--snapshot='));
const outputArg = process.argv.find((value) => value.startsWith('--output='));
if (!snapshotArg || !outputArg) {
  throw new Error('Required: --snapshot=/absolute/PRE_QUIESCENCE_STATE.json --output=/absolute/empty/path');
}
const snapshotPath = resolve(snapshotArg.slice('--snapshot='.length));
const output = resolve(outputArg.slice('--output='.length));
if (existsSync(output)) throw new Error(`Refusing existing output path: ${output}`);

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
function run(command, args, cwd = ROOT) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}
function addSqlFiles(sources, directory, predicate = () => true) {
  for (const name of readdirSync(directory).sort()) {
    const file = join(directory, name);
    if (statSync(file).isFile() && /^\d{14}_.+\.sql$/.test(name) && predicate(name)) sources.push(file);
  }
}

if (run('git', ['rev-parse', `${EXPECTED_CANDIDATE}^{tree}`]) !== EXPECTED_TREE) {
  throw new Error('Frozen candidate object/tree mismatch');
}
const moderationPath = join(ROOT, 'supabase/migrations-next/phase03b', MODERATION);
const pointsPath = join(ROOT, 'supabase/migrations-next/phase03b', POINTS);
if (sha256File(moderationPath) !== MODERATION_SHA || sha256File(pointsPath) !== POINTS_SHA) {
  throw new Error('Frozen Phase 03B migration hash mismatch');
}

const envelope = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const snapshot = envelope.phase03b_snapshot ?? envelope;
if (snapshot.projectRef !== TARGET || snapshot.transactionReadOnly !== 'on') {
  throw new Error('Snapshot is not a read-only receipt for the exact production target');
}
if (snapshot.ledger.phase03bFrozenRowsPresent !== 0 || snapshot.ledger.rowCount !== snapshot.ledger.uniqueVersionCount) {
  throw new Error('Snapshot ledger is not eligible for this frozen apply plan');
}

const sources = [];
addSqlFiles(sources, join(ROOT, 'supabase/migrations'));
addSqlFiles(sources, join(ROOT, 'supabase/migrations-next'), (name) => EXPECTED_PHASE03A_VERSIONS.has(name.slice(0, 14)));
addSqlFiles(sources, join(ROOT, 'supabase/migrations-next/phase03a'), (name) => EXPECTED_PHASE03A_VERSIONS.has(name.slice(0, 14)));
const byVersion = new Map();
for (const source of sources) {
  const version = basename(source).slice(0, 14);
  if (byVersion.has(version)) throw new Error(`Duplicate local migration version: ${version}`);
  byVersion.set(version, source);
}

run('supabase', ['init', '--workdir', output, '--yes']);
const destination = join(output, 'supabase/migrations');
mkdirSync(destination, { recursive: true });
const manifest = [];
for (const row of snapshot.ledger.rows) {
  const source = byVersion.get(row.version);
  if (!source) throw new Error(`No frozen local source for production ledger version ${row.version}`);
  const target = join(destination, basename(source));
  cpSync(source, target);
  manifest.push({ version: row.version, file: basename(source), sha256: sha256File(target), remoteName: row.name });
}
for (const [source, expectedHash] of [[moderationPath, MODERATION_SHA], [pointsPath, POINTS_SHA]]) {
  const target = join(destination, basename(source));
  cpSync(source, target);
  if (sha256File(target) !== expectedHash) throw new Error(`Copied candidate hash mismatch: ${basename(source)}`);
  manifest.push({ version: basename(source).slice(0, 14), file: basename(source), sha256: expectedHash, pending: true });
}

const files = readdirSync(destination).filter((name) => name.endsWith('.sql')).sort();
if (files.length !== snapshot.ledger.rowCount + 2 || files.at(-2) !== MODERATION || files.at(-1) !== POINTS) {
  throw new Error('Workspace inventory/order mismatch');
}
writeFileSync(join(output, 'PHASE03B_APPLY_WORKSPACE_MANIFEST.json'), `${JSON.stringify({
  schemaVersion: 1,
  target: TARGET,
  candidate: EXPECTED_CANDIDATE,
  candidateTree: EXPECTED_TREE,
  sourceSnapshot: snapshotPath,
  migrationCount: files.length,
  pendingMigrations: [MODERATION, POINTS],
  migrations: manifest,
}, null, 2)}\n`, { mode: 0o600 });

console.log(JSON.stringify({
  status: 'PASS',
  target: TARGET,
  output,
  migrationCount: files.length,
  pendingMigrations: [MODERATION, POINTS],
}, null, 2));
