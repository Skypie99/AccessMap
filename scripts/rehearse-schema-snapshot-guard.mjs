#!/usr/bin/env node
/** Temp-only negative matrix for every snapshot/staleness claim in Prompt 02B. */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(ROOT, 'scripts', 'check-schema-snapshot.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flagstone-snapshot-tamper-'));

function copyCase(name) {
  const dest = path.join(tmp, name);
  fs.mkdirSync(dest);
  fs.cpSync(path.join(ROOT, 'supabase'), path.join(dest, 'supabase'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(dest, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dest, 'package.json'));
  execFileSync(process.execPath, [checker, `--root=${dest}`], { stdio: 'ignore' });
  return dest;
}

const cases = [
  ['lineage-content', (root) => {
    const crosswalk = JSON.parse(fs.readFileSync(path.join(root, 'supabase/contract/migration-crosswalk.v1.json'), 'utf8'));
    fs.appendFileSync(path.join(root, crosswalk.entries.find((entry) => entry.status === 'APPLIED').file), '\n-- tamper\n');
  }],
  ['candidate-content', (root) => {
    fs.appendFileSync(path.join(root, 'supabase/migrations-next/20260904000000_adopt_private_admin_helper.sql'), '\n-- tamper\n');
  }],
  ['bootstrap-content', (root) => {
    fs.appendFileSync(path.join(root, 'supabase/replay/00_platform_bootstrap.sql'), '\n-- tamper\n');
  }],
  ['comparator-content', (root) => {
    fs.appendFileSync(path.join(root, 'supabase/replay/compare.sql'), '\n-- tamper\n');
  }],
  ['snapshot-hand-edit', (root) => {
    fs.appendFileSync(path.join(root, 'supabase/schema.generated.sql'), '\n-- tamper\n');
  }],
  ['managed-migration-added', (root) => {
    fs.writeFileSync(path.join(root, 'supabase/migrations/20990101000000_untracked.sql'), 'select 1;\n');
  }],
  ['managed-migration-deleted', (root) => {
    const crosswalk = JSON.parse(fs.readFileSync(path.join(root, 'supabase/contract/migration-crosswalk.v1.json'), 'utf8'));
    fs.unlinkSync(path.join(root, crosswalk.entries.find((entry) => entry.status === 'APPLIED').file));
  }],
  ['crosswalk-order', (root) => {
    const file = path.join(root, 'supabase/contract/migration-crosswalk.v1.json');
    const crosswalk = JSON.parse(fs.readFileSync(file, 'utf8'));
    const indexes = crosswalk.entries.map((entry, index) => entry.status === 'APPLIED' ? index : -1).filter((index) => index >= 0);
    [crosswalk.entries[indexes[0]], crosswalk.entries[indexes[1]]] =
      [crosswalk.entries[indexes[1]], crosswalk.entries[indexes[0]]];
    fs.writeFileSync(file, `${JSON.stringify(crosswalk, null, 2)}\n`);
  }],
  ['managed-source-moved', (root) => {
    const crosswalk = JSON.parse(fs.readFileSync(path.join(root, 'supabase/contract/migration-crosswalk.v1.json'), 'utf8'));
    const source = path.join(root, crosswalk.entries.find((entry) => entry.status === 'APPLIED').file);
    fs.renameSync(source, source.replace(/\.sql$/, '_moved.sql'));
  }],
];

try {
  const rejected = [];
  for (const [name, mutate] of cases) {
    const caseRoot = copyCase(name);
    mutate(caseRoot);
    const negative = spawnSync(process.execPath, [checker, `--root=${caseRoot}`], { encoding: 'utf8' });
    if (negative.status === 0 ||
        !/(SCHEMA SNAPSHOT IS STALE|Managed migration inventory differs)/.test(negative.stderr)) {
      throw new Error(`Snapshot guard failed to reject temp-only ${name} tamper`);
    }
    rejected.push(name);
  }
  console.log(`snapshot guard negative rehearsal: PASS (${rejected.length} tamper classes rejected: ${rejected.join(', ')})`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
