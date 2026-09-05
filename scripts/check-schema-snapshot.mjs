#!/usr/bin/env node
/**
 * PHASE-02B — staleness guard for supabase/schema.generated.sql.
 *
 * A generated snapshot that silently goes stale is worse than none: it looks
 * authoritative while describing a schema nobody has. This records a hash of
 * every INPUT that determines the snapshot (the applied lineage plus the
 * forward-only candidates plus the bootstrap) and fails when they move without
 * the snapshot being regenerated.
 *
 * It does NOT need a database — that is the point. The expensive replay proves
 * the snapshot is correct; this cheap check proves it is current, so it can run
 * on every commit and in CI where no Postgres exists.
 *
 *   node scripts/check-schema-snapshot.mjs           # verify (exit 1 if stale)
 *   node scripts/check-schema-snapshot.mjs --write   # re-record after regenerating
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'supabase', 'schema.generated.sql');
const STAMP = path.join(ROOT, 'supabase', 'schema.generated.stamp.json');

const inputs = [];
const addDir = (rel, filter) => {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).sort()) {
    if (!filter(name)) continue;
    inputs.push([`${rel}/${name}`, createHash('sha256').update(fs.readFileSync(path.join(dir, name))).digest('hex')]);
  }
};
addDir('supabase/migrations', (n) => /^\d{14}_.*\.sql$/.test(n));
addDir('supabase/migrations-next', (n) => /^\d{14}_.*\.sql$/.test(n));
addDir('supabase/replay', (n) => /^\d\d_.*\.sql$/.test(n));

const inputsHash = createHash('sha256')
  .update(inputs.map(([f, h]) => `${f}:${h}`).join('\n'))
  .digest('hex');

if (!fs.existsSync(SNAPSHOT)) {
  console.error('supabase/schema.generated.sql is missing. Run:\n  node scripts/replay-migrations.mjs --with-next --dump');
  process.exit(1);
}
const snapshotHash = createHash('sha256').update(fs.readFileSync(SNAPSHOT)).digest('hex');
const record = { inputsHash, snapshotHash, inputCount: inputs.length, generatedBy: 'node scripts/replay-migrations.mjs --with-next --dump' };

if (process.argv.includes('--write')) {
  fs.writeFileSync(STAMP, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Recorded schema snapshot stamp (${inputs.length} inputs).`);
  process.exit(0);
}

if (!fs.existsSync(STAMP)) {
  console.error('supabase/schema.generated.stamp.json is missing. Run this script with --write after regenerating.');
  process.exit(1);
}
const stamp = JSON.parse(fs.readFileSync(STAMP, 'utf8'));
const problems = [];
if (stamp.inputsHash !== inputsHash) {
  problems.push('Migration inputs changed since the snapshot was generated.');
}
if (stamp.snapshotHash !== snapshotHash) {
  problems.push('supabase/schema.generated.sql was edited by hand (its hash does not match the stamp).');
}
if (problems.length) {
  console.error(`SCHEMA SNAPSHOT IS STALE:\n  - ${problems.join('\n  - ')}\n\nRegenerate:\n  node scripts/replay-migrations.mjs --with-next --dump\n  node scripts/check-schema-snapshot.mjs --write`);
  process.exit(1);
}
console.log(`schema.generated.sql is current (${inputs.length} inputs).`);
