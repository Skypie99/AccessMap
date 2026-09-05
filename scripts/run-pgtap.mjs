#!/usr/bin/env node
/**
 * PHASE-02B — pgTAP discovery and deterministic-order runner.
 *
 * DISCOVERY always runs: it enumerates every suite under supabase/tests/,
 * fixes their order, and fails if a suite is unreadable or has no plan().
 * That half needs no database and runs anywhere.
 *
 * EXECUTION needs the pgTAP extension. It has no Homebrew formula and no local
 * build on this machine, so on an environment without it this script exits
 * NON-ZERO with UNAVAILABLE. It deliberately does not "pass" — an unrun test
 * suite is not a green one, and the whole point of PHASE-02 was that a receipt
 * is not proof.
 *
 *   node scripts/run-pgtap.mjs            # discover; run if pgTAP is present
 *   node scripts/run-pgtap.mjs --discover # discovery only, never needs a DB
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = path.join(ROOT, 'supabase', 'tests');
const DISCOVER_ONLY = process.argv.includes('--discover');

// ---------------------------------------------------------------- discovery --
function discover(dir, prefix = '') {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...discover(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.sql')) found.push(rel);
  }
  return found;
}

if (!fs.existsSync(TESTS)) {
  console.error(`No supabase/tests directory at ${TESTS}`);
  process.exit(1);
}
// Sorted by relative path: deterministic across machines and filesystems.
const suites = discover(TESTS).sort((a, b) => a.localeCompare(b));
console.log(`Discovered ${suites.length} pgTAP suites, in run order:`);
// supabase/tests/ holds TWO kinds of suite, and conflating them produced a
// false "no plan()" failure on first run:
//   pgtap  — `select plan(N)` ... `select * from finish()`, needs the pgTAP ext
//   raises — plain SQL that RAISEs on an unexpected outcome and relies on
//            psql -v ON_ERROR_STOP=1 (see .github/workflows/mod1r-fix1-rls-proof.yml)
// A raises-suite is a legitimate proof; it just is not pgTAP.
const problems = [];
const classified = [];
for (const s of suites) {
  const body = fs.readFileSync(path.join(TESTS, s), 'utf8');
  const plan = /select\s+plan\s*\(\s*(\d+)\s*\)/i.exec(body);
  const finish = /select\s+\*?\s*from\s+finish\(\)|select\s+finish\(\)/i.test(body);
  const raises = /raise\s+exception/i.test(body);
  const isFixture = /TEST INFRASTRUCTURE ONLY|baseline/i.test(body) && !raises && !plan;
  const kind = plan ? 'pgtap' : isFixture ? 'fixture' : raises ? 'raises' : 'unknown';
  classified.push({ suite: s, kind, planned: plan ? Number(plan[1]) : 0 });
  const detail = kind === 'pgtap' ? `plan(${plan[1]})${finish ? '' : '  [WARN: no finish()]'}` : kind;
  console.log(`  ${s}  ${detail}`);
  if (kind === 'unknown') {
    problems.push(`${s}: neither a pgTAP plan() nor a raising proof — cannot tell if it asserts anything`);
  }
  if (kind === 'pgtap' && !finish) {
    problems.push(`${s}: has plan() but no finish() — pgTAP will not report`);
  }
}
if (problems.length) {
  console.error(`\nDiscovery problems:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
const pgtap = classified.filter((c) => c.kind === 'pgtap');
const raises = classified.filter((c) => c.kind === 'raises');
const fixtures = classified.filter((c) => c.kind === 'fixture');
const totalPlanned = pgtap.reduce((n, c) => n + c.planned, 0);
console.log(
  `\nDiscovery OK: ${pgtap.length} pgTAP suites (${totalPlanned} planned assertions), ` +
  `${raises.length} raising proofs, ${fixtures.length} fixtures.`,
);
if (DISCOVER_ONLY) process.exit(0);

// ---------------------------------------------------------------- execution --
function pgBin() {
  for (const dir of [process.env.PG_BINDIR, '/opt/homebrew/opt/postgresql@17/bin', '/usr/local/opt/postgresql@17/bin'].filter(Boolean)) {
    if (fs.existsSync(path.join(dir, 'psql'))) return dir;
  }
  const w = spawnSync('which', ['psql'], { encoding: 'utf8' });
  return w.status === 0 && w.stdout.trim() ? path.dirname(w.stdout.trim()) : null;
}
const BIN = pgBin();
if (!BIN) {
  console.error('\nUNAVAILABLE: no Postgres toolchain. Suites discovered but NOT RUN.');
  process.exit(2);
}
const shareDir = execFileSync(path.join(BIN, 'pg_config'), ['--sharedir'], { encoding: 'utf8' }).trim();
if (!fs.existsSync(path.join(shareDir, 'extension', 'pgtap.control'))) {
  console.error(
    '\nUNAVAILABLE: pgTAP is not installed for this Postgres.\n' +
    `  looked in: ${shareDir}/extension/pgtap.control\n` +
    '  pgTAP has no Homebrew formula; installing it means fetching a third-party\n' +
    '  extension (pgxn install pgtap), which is an explicit owner decision.\n' +
    '\n  The 4 suites above are DISCOVERED and ORDERED but NOT RUN. This exits\n' +
    '  non-zero on purpose: an unrun suite must never read as a pass.',
  );
  process.exit(2);
}
console.error('pgTAP present, but running the suites requires a database with the ' +
  'full lineage applied. Use scripts/replay-migrations.mjs --keep, then psql -f each suite in the order above.');
process.exit(2);
