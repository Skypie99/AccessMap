#!/usr/bin/env node
/** PHASE-02B rev2 explicit SQL-proof classifier and pgTAP runner. */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = path.join(ROOT, 'supabase', 'tests');
const DISCOVER_ONLY = process.argv.includes('--discover');

function discover(dir, prefix = '') {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...discover(path.join(dir, entry.name), relative));
    else if (entry.name.endsWith('.sql')) found.push(relative);
  }
  return found;
}

const suites = discover(TESTS).sort();
const classified = [];
const problems = [];
for (const suite of suites) {
  const body = fs.readFileSync(path.join(TESTS, suite), 'utf8');
  const kind = /PGTAP_KIND:\s*([a-z-]+)/i.exec(body)?.[1]?.toLowerCase();
  const execution = /PGTAP_EXECUTION:\s*([a-z-]+)/i.exec(body)?.[1]?.toLowerCase() ?? null;
  const plan = /select\s+plan\s*\(\s*(\d+)\s*\)/i.exec(body);
  const finish = /select\s+(?:\*\s+from\s+)?finish\s*\(\s*\)/i.test(body);
  if (!['pgtap', 'fixture', 'raising-proof'].includes(kind)) {
    problems.push(`${suite}: missing or invalid PGTAP_KIND marker`);
  }
  if (kind === 'pgtap' && (!plan || !finish || !execution)) {
    problems.push(`${suite}: pgTAP requires plan(), finish(), and PGTAP_EXECUTION`);
  }
  if (kind === 'fixture' && plan) {
    problems.push(`${suite}: fixture declares a pgTAP plan`);
  }
  if (kind === 'raising-proof' && !/raise\s+exception/i.test(body)) {
    problems.push(`${suite}: raising proof has no RAISE EXCEPTION`);
  }
  classified.push({ suite, kind, execution, planned: plan ? Number(plan[1]) : 0 });
}

console.log(JSON.stringify({ status: problems.length ? 'INVALID' : 'DISCOVERED', suites: classified, problems }, null, 2));
if (problems.length) process.exit(1);
if (DISCOVER_ONLY) process.exit(0);

function pgBin() {
  for (const dir of [
    process.env.PG_BINDIR,
    '/opt/homebrew/opt/postgresql@17/bin',
    '/usr/local/opt/postgresql@17/bin',
    '/usr/lib/postgresql/17/bin',
  ].filter(Boolean)) if (fs.existsSync(path.join(dir, 'pg_config'))) return dir;
  return null;
}
const BIN = pgBin();
if (!BIN) {
  console.error('UNAVAILABLE: PostgreSQL 17 toolchain absent; pgTAP suites NOT RUN.');
  process.exit(2);
}
const shareDir = execFileSync(path.join(BIN, 'pg_config'), ['--sharedir'], { encoding: 'utf8' }).trim();
if (!fs.existsSync(path.join(shareDir, 'extension', 'pgtap.control'))) {
  console.error(
    'UNAVAILABLE: pgTAP extension absent; suites NOT RUN. No installation was attempted.\n' +
    'The MOD1R raising proof is not pgTAP and runs separately via npm run db:mod1r-proof.',
  );
  process.exit(2);
}

const canonical = classified.filter((entry) => entry.kind === 'pgtap' && entry.execution === 'canonical-replay-with-next');
const stagingOnly = classified.filter((entry) => entry.kind === 'pgtap' && entry.execution === 'authorized-staging-only');
const run = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'replay-migrations.mjs'), '--with-next', '--local-only', '--run-pgtap', '--json'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
if (run.status !== 0) {
  console.error('pgTAP canonical replay execution failed.');
  process.exit(1);
}
const replay = JSON.parse(run.stdout);
console.log(JSON.stringify({ status: 'PARTIAL', executed: replay.pgTap ?? [], stagingOnly }, null, 2));
if ((replay.pgTap ?? []).length !== canonical.length || stagingOnly.length) {
  console.error(
    `UNAVAILABLE: ${stagingOnly.length} pgTAP suite(s) require a separately authorized staging apply; ` +
    'nonmanaged proposal SQL was not executed by this runner.',
  );
  process.exit(2);
}
process.exit(0);
