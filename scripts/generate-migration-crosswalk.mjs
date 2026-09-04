#!/usr/bin/env node
/**
 * Regenerate supabase/contract/migration-crosswalk.v1.json from the repository
 * tree, preserving the recorded production ledger.
 *
 * PHASE-02A. This script NEVER contacts the database. The applied-version list
 * is production truth captured read-only and stored in the crosswalk itself;
 * regenerating re-reads the tree and re-hashes files, but it will not invent,
 * drop or reorder a ledger entry. Refreshing the ledger is a separate,
 * explicitly authorised read-only capture.
 *
 * Usage:  node scripts/generate-migration-crosswalk.mjs [--check]
 *         --check exits non-zero if the committed crosswalk is out of date.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const CROSSWALK = path.join(ROOT, 'supabase', 'contract', 'migration-crosswalk.v1.json');
const NAME_RE = /^(\d{14})_(.+)\.sql$/;

const previous = JSON.parse(fs.readFileSync(CROSSWALK, 'utf8'));
const ledger = new Map(
  previous.entries.filter((e) => e.ledgerName !== undefined).map((e) => [e.version, e.ledgerName]),
);

const files = new Map();
for (const name of fs.readdirSync(MIGRATIONS).sort()) {
  const m = NAME_RE.exec(name);
  if (!m) continue;
  const full = path.join(MIGRATIONS, name);
  files.set(m[1], {
    file: `supabase/migrations/${name}`,
    slug: m[2],
    sha256: createHash('sha256').update(fs.readFileSync(full)).digest('hex'),
    bytes: fs.statSync(full).size,
  });
}

const head = [...ledger.keys()].sort().at(-1);
const entries = [...new Set([...ledger.keys(), ...files.keys()])].sort().map((version) => {
  const f = files.get(version);
  const applied = ledger.has(version);
  const entry = {
    version,
    status: applied
      ? f
        ? 'APPLIED'
        : 'APPLIED_NO_SOURCE'
      : version < head
        ? 'UNAPPLIED_BACKDATED'
        : 'UNAPPLIED_FORWARD',
    ...(f ?? {}),
  };
  if (applied) {
    entry.ledgerName = ledger.get(version);
    if (f && f.slug !== entry.ledgerName) {
      entry.nameDrift = { ledgerName: entry.ledgerName, repoSlug: f.slug };
    }
  }
  return entry;
});

const count = (s) => entries.filter((e) => e.status === s).length;
const next = {
  ...previous,
  rules: { ...previous.rules, ledgerHead: head, futureMigrationsMustBeStrictlyAfter: head },
  summary: {
    appliedInLedger: ledger.size,
    repoManagedFiles: files.size,
    appliedWithSource: count('APPLIED'),
    appliedWithoutSource: count('APPLIED_NO_SOURCE'),
    unappliedBackdated: count('UNAPPLIED_BACKDATED'),
    unappliedForward: count('UNAPPLIED_FORWARD'),
    nameDrift: entries.filter((e) => e.nameDrift).length,
  },
  entries,
};

const rendered = `${JSON.stringify(next, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (rendered !== fs.readFileSync(CROSSWALK, 'utf8')) {
    console.error('migration-crosswalk.v1.json is stale. Run: node scripts/generate-migration-crosswalk.mjs');
    process.exit(1);
  }
  console.log('migration-crosswalk.v1.json is current.');
} else {
  fs.writeFileSync(CROSSWALK, rendered);
  console.log(`migration-crosswalk.v1.json regenerated (${entries.length} entries, head ${head}).`);
}
