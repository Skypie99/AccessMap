#!/usr/bin/env node
/**
 * Phase03C socket-only PostgreSQL replay: anonymous public-read privacy contract.
 *
 * Builds the production-equivalent local state in a disposable cluster, the same
 * build as scripts/replay-phase03b.mjs forward: 71 applied migrations, top-level
 * migrations-next, Phase03A fixtures, Stage A, and both Phase03B migrations (ledger 87).
 * It then runs the three Phase03B suites unchanged as regression, plus the Phase03C
 * contract suite. Phase03C adds no migration, so there is no rollback rehearsal. If a
 * phase03c migration directory appears, this harness refuses rather than testing a
 * state it was not built for.
 *
 * It accepts no hosted address or credential, disables TCP, passes an allowlisted
 * environment to every child, verifies the pinned pgTAP build, and destroys the
 * cluster on exit.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.find((value) => value.startsWith('--pgtap-sql='));
if (!arg) throw new Error('Required: --pgtap-sql=/absolute/path/to/pinned/pgtap.sql');
const PGTAP = path.resolve(arg.slice('--pgtap-sql='.length));
if (!fs.existsSync(PGTAP)) throw new Error('pgTAP SQL source does not exist');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const nextDir = path.join(ROOT, 'supabase/migrations-next');
const phase03aContract = JSON.parse(fs.readFileSync(path.join(nextDir, 'phase03a/candidate-contract.json'), 'utf8'));
const pinnedPgTap = phase03aContract.localPgTap?.generatedSqlSha256;
const pgTapSha = sha256(fs.readFileSync(PGTAP));
if (!pinnedPgTap || pgTapSha !== pinnedPgTap) {
  throw new Error(`pgTAP build ${pgTapSha} does not match the pinned ${pinnedPgTap}`);
}
if (fs.existsSync(path.join(nextDir, 'phase03c'))) {
  throw new Error('supabase/migrations-next/phase03c exists: extend this harness with its apply and rollback contract first');
}

const pgCandidates = [
  process.env.PG_BINDIR,
  '/opt/homebrew/opt/postgresql@17/bin',
  '/usr/local/opt/postgresql@17/bin',
  '/usr/lib/postgresql/17/bin',
].filter(Boolean);
const BIN = pgCandidates.find((dir) => fs.existsSync(path.join(dir, 'initdb')));
if (!BIN) throw new Error('PostgreSQL 17 toolchain unavailable');
const bin = (name) => path.join(BIN, name);
const PG_ENV = {
  PATH: `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`,
  TMPDIR: os.tmpdir(),
  LC_ALL: 'C',
  LC_CTYPE: 'C',
  LANG: 'C',
  PGTZ: 'UTC',
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flagstone-phase03c-'));
const data = path.join(tmp, 'data');
const sock = path.join(tmp, 'sock');
const log = path.join(tmp, 'postgres.log');
fs.mkdirSync(sock);
let started = false;

function cleanup() {
  if (started) {
    try {
      execFileSync(bin('pg_ctl'), ['-D', data, '-m', 'immediate', 'stop'], { env: PG_ENV, stdio: 'ignore' });
    } catch { /* already stopped */ }
    started = false;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.on('exit', cleanup);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { cleanup(); process.exit(130); });

const psql = (args, options = {}) => execFileSync(
  bin('psql'),
  ['-X', '-h', sock, '-U', 'postgres', '-d', 'flagstone_replay', '-v', 'ON_ERROR_STOP=1', ...args],
  { env: PG_ENV, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options },
);

function apply(file) {
  const source = fs.readFileSync(file, 'utf8');
  const extension = /^\s*create\s+extension\s+if\s+not\s+exists\s+pg_net\s*;\s*$/gim;
  const occurrences = [...source.matchAll(extension)].length;
  let target = file;
  if (occurrences) {
    if (occurrences !== 1 || path.basename(file) !== '20260529181141_notify_flag_status_webhook_trigger.sql') {
      throw new Error(`Unexpected pg_net statement: ${path.relative(ROOT, file)}`);
    }
    target = path.join(tmp, path.basename(file));
    fs.writeFileSync(target, source.replace(extension, '-- socket replay: inert pg_net bootstrap'), { mode: 0o600 });
  }
  psql(['-q', '-f', target]);
  return path.relative(ROOT, file);
}

// Strict TAP accounting: every planned assertion must run and pass.
function runSuite(suite) {
  const file = path.join(ROOT, 'supabase/tests', suite);
  const output = psql(['-qAt', '-c', 'set search_path = public, phase03b_tap, extensions;', '-f', file]);
  const lines = output.split('\n').map((line) => line.trim());
  const planned = Number(/^1\.\.(\d+)$/.exec(lines.find((line) => /^1\.\.\d+$/.test(line)) ?? '')?.[1] ?? NaN);
  const passed = lines.filter((line) => /^ok \d+/.test(line)).length;
  const failures = lines.filter((line) => /^not ok \d+/.test(line));
  const entry = {
    suite,
    sha256: sha256(fs.readFileSync(file)),
    planned,
    passed,
    failed: failures.length,
    outputSha256: sha256(output),
  };
  if (failures.length || !Number.isInteger(planned) || passed !== planned) {
    throw new Error(`${suite}: planned=${planned} passed=${passed} failed=${failures.length}\n${failures.join('\n')}\n${output}`);
  }
  return entry;
}

const result = {
  status: 'ERROR',
  harness: 'scripts/replay-phase03c.mjs',
  target: 'socket-only disposable PostgreSQL',
  tcpDisabled: true,
  productionInputsAccepted: false,
  pgTap: { sha256: pgTapSha, pinned: pinnedPgTap, version: phase03aContract.localPgTap.version },
  build: {},
  suites: [],
};

try {
  result.pgVersion = execFileSync(bin('postgres'), ['--version'], { encoding: 'utf8', env: PG_ENV }).trim();
  execFileSync(bin('initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-sync'], { env: PG_ENV, stdio: 'ignore' });
  fs.appendFileSync(path.join(data, 'postgresql.conf'), `\nlisten_addresses = ''\nunix_socket_directories = '${sock}'\nfsync = off\nfull_page_writes = off\n`);
  execFileSync(bin('pg_ctl'), ['-D', data, '-l', log, '-w', 'start'], { env: PG_ENV, stdio: 'ignore' });
  started = true;
  execFileSync(bin('createdb'), ['-h', sock, '-U', 'postgres', 'flagstone_replay'], { env: PG_ENV, stdio: 'ignore' });
  result.locality = {
    listenAddresses: psql(['-qAtc', 'show listen_addresses']).trim(),
    socketDirectoryIsTemp: psql(['-qAtc', 'show unix_socket_directories']).trim() === sock,
    dataDirectoryIsTemp: fs.realpathSync(psql(['-qAtc', 'show data_directory']).trim()) === fs.realpathSync(data),
  };
  if (result.locality.listenAddresses !== '' || !result.locality.socketDirectoryIsTemp || !result.locality.dataDirectoryIsTemp) {
    throw new Error(`Locality proof failed: ${JSON.stringify(result.locality)}`);
  }

  const replayDir = path.join(ROOT, 'supabase/replay');
  result.build.bootstrap = fs.readdirSync(replayDir).filter((name) => /^\d\d_.*\.sql$/.test(name)).sort()
    .map((name) => apply(path.join(replayDir, name)));

  const crosswalk = JSON.parse(fs.readFileSync(path.join(ROOT, 'supabase/contract/migration-crosswalk.v1.json')));
  const applied = crosswalk.entries
    .filter((entry) => entry.status === 'APPLIED' && entry.file)
    .sort((left, right) => left.version.localeCompare(right.version));
  if (applied.length !== 71) throw new Error(`Expected 71 applied migrations, found ${applied.length}`);
  for (const entry of applied) apply(path.resolve(ROOT, entry.file));
  result.build.applied = applied.length;

  result.build.next = fs.readdirSync(nextDir).filter((name) => /^\d{14}_.*\.sql$/.test(name)).sort()
    .map((name) => apply(path.join(nextDir, name)));

  apply(path.join(ROOT, 'supabase/tests/phase03a-fixtures/baseline-extra.sql'));
  apply(path.join(ROOT, 'supabase/tests/phase03a-fixtures/baseline-backups.sql'));
  result.build.stageA = phase03aContract.migrations.filter((entry) => entry.applyStage === 'A')
    .map((entry) => apply(path.join(nextDir, 'phase03a', entry.file)));
  result.build.phase03b = [
    '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql',
    '20260915210413_phase03b_points_integrity.sql',
  ].map((name) => apply(path.join(nextDir, 'phase03b', name)));
  result.build.equivalentLedgerCount = result.build.applied + result.build.next.length +
    result.build.stageA.length + result.build.phase03b.length;
  if (result.build.equivalentLedgerCount !== 87) {
    throw new Error(`Expected the accepted 87-row production ledger equivalent, built ${result.build.equivalentLedgerCount}`);
  }

  psql([
    '-q',
    '-c', 'create schema phase03b_tap; set search_path = phase03b_tap, public, extensions;',
    '-f', PGTAP,
    '-c', 'grant usage on schema phase03b_tap to anon, authenticated, service_role; grant execute on all functions in schema phase03b_tap to anon, authenticated, service_role;',
  ]);

  for (const suite of [
    'phase03b-compatibility.test.sql',
    'phase03b-moderation.test.sql',
    'phase03b-points.test.sql',
    'phase03c-anon-contract.test.sql',
  ]) result.suites.push(runSuite(suite));
  result.totals = result.suites.reduce(
    (sum, entry) => ({ planned: sum.planned + entry.planned, passed: sum.passed + entry.passed, failed: sum.failed + entry.failed }),
    { planned: 0, passed: 0, failed: 0 },
  );
  result.status = 'PASS';
} catch (error) {
  result.error = String(error.stderr || error.message).split('\n').filter(Boolean).slice(0, 40);
} finally {
  cleanup();
  result.tempDestroyed = !fs.existsSync(tmp);
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'PASS' && result.tempDestroyed ? 0 : 1);
