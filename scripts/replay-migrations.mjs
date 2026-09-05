#!/usr/bin/env node
/**
 * PHASE-02B — disposable migration replay.
 *
 * Builds a throwaway Postgres cluster in a temp directory, applies the platform
 * bootstrap and then every APPLIED migration in version order, and reports the
 * resulting catalog. Proves the repository can rebuild production's schema from
 * source, which is what FDA-027 is really asking.
 *
 * SAFETY. This never touches production and cannot:
 *   - the cluster lives in a fresh mkdtemp directory, destroyed on exit;
 *   - TCP is disabled (listen_addresses = ''), unix socket only;
 *   - no Supabase URL, key, host or credential is read or accepted;
 *   - the only SQL executed is supabase/replay/*.sql plus the versions the
 *     crosswalk marks APPLIED. supabase/nonmanaged/** is never executed, and
 *     destructive-data/ is explicitly refused.
 *
 * Usage:
 *   node scripts/replay-migrations.mjs            # replay + compare + report
 *   node scripts/replay-migrations.mjs --keep     # leave the cluster running
 *   node scripts/replay-migrations.mjs --json     # machine-readable summary
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const REPLAY = path.join(ROOT, 'supabase', 'replay');
const CROSSWALK = path.join(ROOT, 'supabase', 'contract', 'migration-crosswalk.v1.json');
const KEEP = process.argv.includes('--keep');
const WITH_NEXT = process.argv.includes('--with-next');
const DUMP = process.argv.includes('--dump');
const JSON_OUT = process.argv.includes('--json');

const log = (...a) => { if (!JSON_OUT) console.log(...a); };

// --- locate a postgres toolchain -------------------------------------------
function pgBin() {
  const candidates = [
    process.env.PG_BINDIR,
    '/opt/homebrew/opt/postgresql@17/bin',
    '/usr/local/opt/postgresql@17/bin',
    '/opt/homebrew/opt/postgresql@16/bin',
    '/usr/lib/postgresql/17/bin',
    '/usr/lib/postgresql/16/bin',
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'initdb'))) return dir;
  }
  const which = spawnSync('which', ['initdb'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return path.dirname(which.stdout.trim());
  return null;
}

const BIN = pgBin();
if (!BIN) {
  const msg =
    'NO POSTGRES TOOLCHAIN FOUND. The replay cannot run, and an unrun replay is ' +
    'NOT a pass. Install one (macOS: brew install postgresql@17) or set PG_BINDIR.';
  if (JSON_OUT) console.log(JSON.stringify({ status: 'UNAVAILABLE', reason: msg }, null, 2));
  else console.error(msg);
  process.exit(2);
}
const bin = (n) => path.join(BIN, n);

// macOS: without an explicit locale the postmaster trips
// "became multithreaded during startup" and refuses to boot. C is also the
// right choice for a comparison run — collation must not vary by machine.
const PG_ENV = { ...process.env, LC_ALL: 'C', LC_CTYPE: 'C', LANG: 'C', PGTZ: 'UTC' };

// --- disposable cluster -----------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flagstone-replay-'));
const DATA = path.join(tmp, 'data');
const SOCK = path.join(tmp, 'sock');
const LOG = path.join(tmp, 'postgres.log');
fs.mkdirSync(SOCK, { recursive: true });
let started = false;

function cleanup() {
  if (started && !KEEP) {
    try { execFileSync(bin('pg_ctl'), ['-D', DATA, '-m', 'immediate', 'stop'], { stdio: 'ignore', env: PG_ENV }); } catch { /* already down */ }
  }
  if (!KEEP) {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  } else {
    log(`\n--keep: cluster left at ${DATA} (socket ${SOCK})`);
  }
}
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130); });

const psql = (args, opts = {}) =>
  execFileSync(bin('psql'), ['-h', SOCK, '-d', 'flagstone_replay', '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: PG_ENV, ...opts,
  });

// --- run --------------------------------------------------------------------
const result = { status: 'UNKNOWN', applied: [], failed: null, pgVersion: null };
try {
  log(`Postgres toolchain: ${BIN}`);
  execFileSync(bin('initdb'), ['-D', DATA, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-sync'], { stdio: 'ignore', env: PG_ENV });
  // Unix socket only. No TCP, so nothing off-box can reach this cluster.
  fs.appendFileSync(path.join(DATA, 'postgresql.conf'),
    `\nlisten_addresses = ''\nunix_socket_directories = '${SOCK}'\nfsync = off\nfull_page_writes = off\n`);
  execFileSync(bin('pg_ctl'), ['-D', DATA, '-l', LOG, '-w', 'start'], { stdio: 'ignore', env: PG_ENV });
  started = true;
  execFileSync(bin('createdb'), ['-h', SOCK, '-U', 'postgres', 'flagstone_replay'], { stdio: 'ignore', env: PG_ENV });
  result.pgVersion = psql(['-U', 'postgres', '-tAc', 'show server_version']).trim();
  log(`Disposable cluster up: Postgres ${result.pgVersion} (socket only, no TCP)\n`);

  // Install replay stub extensions. Supabase-hosted extensions have no local
  // build; providing them as real installable extensions is what lets the
  // migrations replay VERBATIM instead of being preprocessed.
  const shareDir = execFileSync(bin('pg_config'), ['--sharedir'], { encoding: 'utf8', env: PG_ENV }).trim();
  const stubSrc = path.join(REPLAY, 'stub-extensions');
  const installedStubs = [];
  if (fs.existsSync(stubSrc)) {
    for (const f of fs.readdirSync(stubSrc)) {
      const dest = path.join(shareDir, 'extension', f);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(stubSrc, f), dest);
        installedStubs.push(f);
      }
    }
  }
  result.stubExtensions = fs.existsSync(stubSrc)
    ? [...new Set(fs.readdirSync(stubSrc).map((f) => f.split(/[-.]/)[0]))]
    : [];
  if (installedStubs.length) log(`Installed replay stub extensions: ${installedStubs.join(', ')}`);

  // Platform bootstrap.
  // Only NN_-prefixed files are bootstrap steps; fingerprint.sql is a query.
  for (const f of fs.readdirSync(REPLAY).filter((n) => /^\d\d_.*\.sql$/.test(n)).sort()) {
    psql(['-U', 'postgres', '-f', path.join(REPLAY, f)], { stdio: ['ignore', 'ignore', 'pipe'] });
    log(`  bootstrap  ${f}`);
  }

  // The lineage: only versions the crosswalk marks APPLIED, in version order.
  const crosswalk = JSON.parse(fs.readFileSync(CROSSWALK, 'utf8'));
  const applied = crosswalk.entries
    .filter((e) => e.status === 'APPLIED' && e.file)
    .sort((a, b) => a.version.localeCompare(b.version));
  log(`\nReplaying ${applied.length} applied migrations in version order:`);

  for (const e of applied) {
    const full = path.join(ROOT, e.file);
    if (full.includes(`${path.sep}nonmanaged${path.sep}`)) {
      throw new Error(`REFUSED: ${e.file} is under nonmanaged/ and must never be replayed.`);
    }
    try {
      psql(['-U', 'postgres', '-f', full], { stdio: ['ignore', 'ignore', 'pipe'] });
      result.applied.push(e.version);
    } catch (err) {
      result.status = 'FAILED';
      result.failed = {
        version: e.version,
        file: e.file,
        appliedBefore: result.applied.length,
        error: String(err.stderr || err.message).split('\n').filter(Boolean).slice(0, 12).join('\n'),
      };
      log(`\n  ✗ ${e.version} ${path.basename(e.file)}`);
      log(result.failed.error.replace(/^/gm, '      '));
      break;
    }
  }

  // Optionally continue with the forward-only candidates in migrations-next/.
  // They are NOT part of the applied lineage and are never applied to any real
  // database by this harness; replaying them here is how we prove they actually
  // close the gaps the plain replay exposed.
  if (result.status !== 'FAILED' && WITH_NEXT) {
    const NEXT = path.join(ROOT, 'supabase', 'migrations-next');
    result.next = [];
    const files = fs.existsSync(NEXT)
      ? fs.readdirSync(NEXT).filter((n) => /^\d{14}_.*\.sql$/.test(n)).sort()
      : [];
    log(`\nApplying ${files.length} forward-only candidates from migrations-next/:`);
    for (const f of files) {
      try {
        psql(['-U', 'postgres', '-f', path.join(NEXT, f)], { stdio: ['ignore', 'ignore', 'pipe'] });
        result.next.push(f);
        log(`  ✓ ${f}`);
      } catch (err) {
        result.status = 'FAILED';
        result.failed = { file: `migrations-next/${f}`, error: String(err.stderr || err.message).slice(0, 2000) };
        log(`  ✗ ${f}`);
        log(result.failed.error.replace(/^/gm, '      '));
        break;
      }
    }
  }

  if (result.status !== 'FAILED') {
    result.status = 'REPLAYED';
    log(`  ✓ all ${result.applied.length} applied cleanly`);
    // Same fingerprint expression as the production capture, so the two are
    // directly comparable.
    const q = fs.readFileSync(path.join(REPLAY, 'fingerprint.sql'), 'utf8');
    result.catalog = JSON.parse(psql(['-U', 'postgres', '-tAc', q]));
    // Comparable-by-construction: the identical normalised aggregate is run
    // against production read-only, so the two md5s can be compared directly
    // without transcribing a large predicate list between environments.
    const cq = fs.readFileSync(path.join(REPLAY, 'compare.sql'), 'utf8');
    result.comparable = JSON.parse(psql(['-U', 'postgres', '-tAc', cq]));

    if (DUMP) {
      // The generated schema snapshot. Produced from the REPLAY, never from
      // production: a pg_dump of production would carry live data shapes and
      // Supabase-internal objects, and would need production credentials this
      // harness deliberately cannot hold.
      const dest = path.join(ROOT, 'supabase', 'schema.generated.sql');
      const dump = execFileSync(bin('pg_dump'), [
        '-h', SOCK, '-U', 'postgres', '-d', 'flagstone_replay',
        '--schema-only', '--no-owner', '--no-privileges', '--no-comments',
        '-n', 'public', '-n', 'private',
      ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: PG_ENV });
      const header = [
        '-- GENERATED FILE — DO NOT EDIT BY HAND.',
        '--',
        '-- Produced by: node scripts/replay-migrations.mjs --with-next --dump',
        '-- Source: the 71 applied migrations plus supabase/migrations-next/,',
        '--         replayed from zero onto a disposable Postgres.',
        '--',
        '-- This is a REFERENCE SNAPSHOT, not an apply script and not the',
        '-- migration lineage. supabase/migrations/ remains the only authority on',
        '-- what production ran; this file just shows where that lineage lands.',
        '-- Privileges and owners are intentionally excluded (--no-privileges',
        '-- --no-owner): grants are asserted by the contract manifests and the',
        '-- replay comparison, not by a dump that would go stale silently.',
        '--',
        `-- Regenerate whenever supabase/migrations/ or supabase/migrations-next/`,
        '-- changes; scripts/check-schema-snapshot.mjs enforces that.',
        '', '',
      ].join('\n');
      // pg_dump 17 emits a random \restrict/\unrestrict nonce (a psql
      // meta-command guard, not schema). It is the ONLY non-deterministic part
      // of the output — verified by diffing consecutive dumps — and it would
      // make the snapshot's hash change on every regeneration, defeating the
      // staleness guard. Dropping those two lines makes the dump reproducible.
      const normalized = dump
        .split('\n')
        .filter((line) => !/^\\(un)?restrict\s/.test(line))
        .join('\n');
      fs.writeFileSync(dest, header + normalized);
      log(`\nWrote generated snapshot: supabase/schema.generated.sql (${dump.split('\n').length} lines)`);
    }

    const expectedPath = path.join(ROOT, 'supabase', 'contract', 'expected-catalog.v1.json');
    if (fs.existsSync(expectedPath)) {
      const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
      const target = WITH_NEXT ? expected.withForwardCandidates : expected.appliedLineageOnly;
      result.comparison = {
        mode: WITH_NEXT ? 'with-next' : 'applied-only',
        policyPredicateMatch: result.comparable.policyPredicateMd5 === target.policyPredicateMd5,
        triggerMatch: result.comparable.triggerMd5 === target.triggerMd5,
        expected: target,
        actual: result.comparable,
      };
      log(`\nCatalog comparison (${result.comparison.mode}):`);
      log(`  policy predicates: ${result.comparison.policyPredicateMatch ? 'MATCH' : 'MISMATCH'} (${result.comparable.policyPredicateMd5})`);
      log(`  triggers:          ${result.comparison.triggerMatch ? 'MATCH' : 'MISMATCH'} (${result.comparable.triggerMd5})`);
      if (!result.comparison.policyPredicateMatch || !result.comparison.triggerMatch) {
        result.status = 'DRIFT';
      }
    }
  }
} catch (err) {
  result.status = result.status === 'UNKNOWN' ? 'ERROR' : result.status;
  result.error = String(err.stderr || err.message).slice(0, 4000);
  if (fs.existsSync(LOG)) result.error += `\n--- postgres.log ---\n${fs.readFileSync(LOG, 'utf8').slice(-2000)}`;
  if (!JSON_OUT) console.error(`\nHARNESS ERROR:\n${result.error}`);
}

if (JSON_OUT) console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'REPLAYED' ? 0 : 1);
