#!/usr/bin/env node
/** PHASE-02B rev2 deterministic snapshot provenance guard. */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
const ROOT = rootArg ? path.resolve(rootArg.slice('--root='.length)) : defaultRoot;
const SNAPSHOT = path.join(ROOT, 'supabase', 'schema.generated.sql');
const STAMP = path.join(ROOT, 'supabase', 'schema.generated.stamp.json');
const CROSSWALK = path.join(ROOT, 'supabase', 'contract', 'migration-crosswalk.v1.json');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

function addFile(inputs, relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) throw new Error(`Required snapshot input missing: ${relativePath}`);
  inputs.push({ path: relativePath, sha256: sha256(fs.readFileSync(full)) });
}

function listedSql(relativeDir, pattern) {
  const dir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => pattern.test(name)).sort()
    .map((name) => `${relativeDir}/${name}`);
}

const crosswalk = JSON.parse(fs.readFileSync(CROSSWALK, 'utf8'));
const inputs = [];
addFile(inputs, 'supabase/contract/migration-crosswalk.v1.json');
const appliedEntries = crosswalk.entries.filter((item) => item.status === 'APPLIED');
const crosswalkAppliedPaths = appliedEntries.map((entry) => entry.file);
const managedMigrationPaths = listedSql('supabase/migrations', /^\d{14}_.*\.sql$/);
if (JSON.stringify(crosswalkAppliedPaths) !== JSON.stringify(managedMigrationPaths)) {
  console.error('Managed migration inventory differs from the ordered APPLIED crosswalk.');
  process.exit(1);
}
for (const entry of appliedEntries) {
  if (!entry.file) throw new Error(`Applied migration ${entry.version} has no source path`);
  addFile(inputs, entry.file);
}
for (const relativePath of listedSql('supabase/migrations-next', /^\d{14}_.*\.sql$/)) addFile(inputs, relativePath);
for (const relativePath of listedSql('supabase/migrations-next/rollback', /^\d{14}_.*\.rollback\.sql$/)) addFile(inputs, relativePath);
addFile(inputs, 'supabase/migrations-next/rollback/rollback-contract.v1.json');
for (const relativePath of listedSql('supabase/replay', /^\d\d_.*\.sql$/)) addFile(inputs, relativePath);
addFile(inputs, 'supabase/replay/compare.sql');
addFile(inputs, 'scripts/replay-migrations.mjs');
addFile(inputs, 'package.json');

const inputManifestSha256 = sha256(inputs.map((entry, index) =>
  `${String(index).padStart(4, '0')}:${entry.path}:${entry.sha256}`).join('\n'));

if (!fs.existsSync(SNAPSHOT)) {
  console.error('supabase/schema.generated.sql is missing. Run npm run db:snapshot.');
  process.exit(1);
}
const record = {
  stampVersion: 2,
  generationCommand: 'node scripts/replay-migrations.mjs --with-next --local-only --dump',
  generatorSource: 'scripts/replay-migrations.mjs',
  inputManifestSha256,
  snapshotSha256: sha256(fs.readFileSync(SNAPSHOT)),
  inputs,
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(STAMP, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Recorded schema snapshot stamp v2 (${inputs.length} ordered inputs).`);
  process.exit(0);
}

if (!fs.existsSync(STAMP)) {
  console.error('supabase/schema.generated.stamp.json is missing. Regenerate the snapshot.');
  process.exit(1);
}
const stamp = JSON.parse(fs.readFileSync(STAMP, 'utf8'));
const problems = [];
if (stamp.stampVersion !== 2) problems.push('stamp format is not rev2');
if (stamp.inputManifestSha256 !== record.inputManifestSha256) {
  problems.push('ordered snapshot inputs changed, moved, appeared, or disappeared');
}
if (stamp.snapshotSha256 !== record.snapshotSha256) problems.push('generated snapshot content changed');
if (stablePaths(stamp.inputs) !== stablePaths(record.inputs)) problems.push('input path/order manifest changed');
if (problems.length) {
  console.error(`SCHEMA SNAPSHOT IS STALE:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`schema.generated.sql is current (${inputs.length} ordered inputs, stamp v2).`);

function stablePaths(entries = []) {
  return JSON.stringify(entries.map((entry) => entry.path));
}
