#!/usr/bin/env node
/**
 * PHASE-02B rev2 — isolated migration replay, catalog comparison, and rollback
 * rehearsal. No production address or credential is accepted by this process.
 * Production evidence is a committed catalog-only capture made separately.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const NEXT = path.join(ROOT, 'supabase', 'migrations-next');
const REPLAY = path.join(ROOT, 'supabase', 'replay');
const CROSSWALK = path.join(ROOT, 'supabase', 'contract', 'migration-crosswalk.v1.json');
const DEPLOYED_CONTRACT = path.join(ROOT, 'supabase', 'contract', 'deployed-contract.v1.json');
const PRODUCTION_CAPTURE = path.join(ROOT, 'supabase', 'contract', 'production-catalog-capture.v2.json');
const ROLLBACK_CONTRACT = path.join(NEXT, 'rollback', 'rollback-contract.v1.json');
const WITH_NEXT = process.argv.includes('--with-next');
const DUMP = process.argv.includes('--dump');
const JSON_OUT = process.argv.includes('--json');
const VERIFY_ROLLBACKS = process.argv.includes('--verify-rollbacks');
const LOCAL_ONLY = process.argv.includes('--local-only');
const RUN_PGTAP = process.argv.includes('--run-pgtap');
const PHASE03A_PRIVILEGES_ONLY = process.argv.includes('--phase03a-privileges-only');
const PHASE03A = process.argv.includes('--phase03a') || PHASE03A_PRIVILEGES_ONLY;
const phase03aPgTapArg = process.argv.find(arg => arg.startsWith('--phase03a-pgtap-sql='));
if (PHASE03A_PRIVILEGES_ONLY && (process.argv.includes('--phase03a') || phase03aPgTapArg)) {
  throw new Error('Choose full Phase03A proof or privilege guard only, never both');
}
if (PHASE03A && (!WITH_NEXT || !LOCAL_ONLY || DUMP || VERIFY_ROLLBACKS || RUN_PGTAP)) {
  throw new Error('Phase03A requires --with-next --local-only and its separate proof mode');
}
const catalogOutArg = process.argv.find((arg) => arg.startsWith('--catalog-out='));
const CATALOG_OUT = catalogOutArg ? path.resolve(catalogOutArg.slice('--catalog-out='.length)) : null;
const comparisonOutArg = process.argv.find((arg) => arg.startsWith('--comparison-out='));
const COMPARISON_OUT = comparisonOutArg ? path.resolve(comparisonOutArg.slice('--comparison-out='.length)) : null;
const log = (...args) => { if (!JSON_OUT) console.log(...args); };

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
const stableText = (value) => JSON.stringify(stable(value));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

function pgBin() {
  const candidates = [
    process.env.PG_BINDIR,
    '/opt/homebrew/opt/postgresql@17/bin',
    '/usr/local/opt/postgresql@17/bin',
    '/usr/lib/postgresql/17/bin',
  ].filter(Boolean);
  for (const dir of candidates) if (fs.existsSync(path.join(dir, 'initdb'))) return dir;
  const found = spawnSync('which', ['initdb'], { encoding: 'utf8' });
  return found.status === 0 && found.stdout.trim() ? path.dirname(found.stdout.trim()) : null;
}

const BIN = pgBin();
if (!BIN) {
  const reason = 'NO POSTGRES 17 TOOLCHAIN. Replay is UNAVAILABLE, never PASS.';
  if (JSON_OUT) console.log(JSON.stringify({ status: 'UNAVAILABLE', reason }, null, 2));
  else console.error(reason);
  process.exit(2);
}
const bin = (name) => path.join(BIN, name);

// Explicit allowlist. In particular, no inherited PGHOST/PGPORT/PGPASSWORD,
// Supabase variable, HOME, or psql startup file reaches a child process.
const PG_ENV = {
  PATH: `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`,
  TMPDIR: os.tmpdir(),
  LC_ALL: 'C',
  LC_CTYPE: 'C',
  LANG: 'C',
  PGTZ: 'UTC',
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flagstone-replay-rev2-'));
const DATA = path.join(tmp, 'data');
const SOCK = path.join(tmp, 'sock');
const LOG = path.join(tmp, 'postgres.log');
fs.mkdirSync(SOCK, { recursive: true });
let started = false;
let cleaned = false;

function redactDiagnostic(input) {
  return String(input ?? '')
    .replace(/(X-Webhook-Secret[^\n,]*[,=:]\s*["']?)[^\s,"')]+/gi, '$1[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED JWT]')
    .replace(/\bsb_secret_[A-Za-z0-9_-]{20,}\b/g, '[REDACTED KEY]');
}

function cleanup() {
  if (cleaned) return;
  if (started) {
    try {
      execFileSync(bin('pg_ctl'), ['-D', DATA, '-m', 'immediate', 'stop'], {
        stdio: 'ignore', env: PG_ENV,
      });
    } catch { /* already stopped */ }
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* reported below */ }
  cleaned = true;
}
process.on('exit', cleanup);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { cleanup(); process.exit(130); });
}

const psql = (database, args, options = {}) => execFileSync(
  bin('psql'),
  ['-X', '-h', SOCK, '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', ...args],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: PG_ENV, ...options },
);

function globalPgNetState() {
  const sharedir = execFileSync(bin('pg_config'), ['--sharedir'], { encoding: 'utf8', env: PG_ENV }).trim();
  const extensionDir = path.join(sharedir, 'extension');
  const files = fs.existsSync(extensionDir)
    ? fs.readdirSync(extensionDir).filter((name) => /^pg_net(?:--.*)?\.(?:sql|control)$/.test(name)).sort()
    : [];
  return {
    sharedir,
    files: files.map((name) => ({
      name,
      sha256: sha256(fs.readFileSync(path.join(extensionDir, name))),
    })),
  };
}

function comparator(database = 'flagstone_replay') {
  const sql = fs.readFileSync(path.join(REPLAY, 'compare.sql'), 'utf8');
  return JSON.parse(psql(database, ['-tAc', sql]));
}

function applySqlFile(database, file, replayAdaptations) {
  let target = file;
  const source = fs.readFileSync(file, 'utf8');
  const extensionPattern = /^\s*create\s+extension\s+if\s+not\s+exists\s+pg_net\s*;\s*$/gim;
  const occurrences = [...source.matchAll(extensionPattern)].length;
  if (occurrences) {
    if (occurrences !== 1 || path.basename(file) !== '20260529181141_notify_flag_status_webhook_trigger.sql') {
      throw new Error(`REFUSED unexpected pg_net extension statement in ${path.relative(ROOT, file)}`);
    }
    const transformed = source.replace(
      extensionPattern,
      '-- REPLAY ADAPTATION: pg_net is an in-database, network-inert bootstrap stub;',
    );
    target = path.join(tmp, path.basename(file));
    fs.writeFileSync(target, transformed, { mode: 0o600 });
    replayAdaptations.push({
      file: path.relative(ROOT, file),
      statement: 'CREATE EXTENSION IF NOT EXISTS pg_net',
      mechanism: 'temp-only no-op; net.http_get/http_post are inert bootstrap functions',
      reason: 'local pg_net unavailable; global extension-directory writes are forbidden',
    });
  }
  psql(database, ['-f', target], { stdio: ['ignore', 'ignore', 'pipe'] });
}

function catalogDiff(replayCatalog, productionCatalog) {
  const allowedResidualTables = new Set([
    'bk_2026_08_22_flags',
    'bk_2026_08_22_flag_comments',
    'bk_2026_08_22_flag_photos',
    'bk_2026_08_22_flag_status_history',
    'bk_2026_08_22_flag_verifications',
    'bk_2026_08_22_flag_edit_history',
    'bk_2026_08_22_point_links',
  ]);
  const stripResiduals = (catalog) => {
    const copy = structuredClone(catalog);
    for (const section of ['tables', 'columns', 'tableGrants']) {
      copy[section] = (copy[section] ?? []).filter((entry) => {
        const table = entry.name ?? entry.table_name;
        return !(entry.schema === 'public' && allowedResidualTables.has(table));
      });
    }
    return copy;
  };
  const normalizedReplay = structuredClone(replayCatalog);
  const normalizedProduction = stripResiduals(productionCatalog);
  const sections = [
    'roles', 'schemas', 'tables', 'columns', 'policies', 'triggers',
    'functions', 'functionGrants', 'tableGrants', 'migrationHistory',
  ];
  const sortRows = (rows = []) => [...rows].sort((left, right) => {
    const a = stableText(left);
    const b = stableText(right);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  for (const section of sections) {
    normalizedReplay[section] = sortRows(normalizedReplay[section]);
    normalizedProduction[section] = sortRows(normalizedProduction[section]);
  }
  const sectionMatches = Object.fromEntries(
    sections.map((section) => [section, stableText(normalizedReplay[section]) === stableText(normalizedProduction[section])]),
  );
  const metadataMatches = replayCatalog.comparatorVersion === productionCatalog.comparatorVersion &&
    stableText(replayCatalog.scope) === stableText(productionCatalog.scope);
  const sectionDeltas = Object.fromEntries(
    sections.map((section) => [section, sectionDelta(
      section,
      normalizedReplay[section],
      normalizedProduction[section],
    )]),
  );
  const observedResidualTables = (productionCatalog.tables ?? [])
    .filter((entry) => entry.schema === 'public' && allowedResidualTables.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  const replayResidualTables = (replayCatalog.tables ?? [])
    .filter((entry) => entry.schema === 'public' && allowedResidualTables.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  return {
    exactAfterAcceptedResiduals: metadataMatches && Object.values(sectionMatches).every(Boolean),
    metadataMatches,
    sectionMatches,
    sectionDeltas,
    acceptedResidual: {
      classification: 'production-only nonmanaged backup tables',
      expectedTables: [...allowedResidualTables].sort(),
      observedTables: observedResidualTables,
      replayObservedTables: replayResidualTables,
      replayAbsent: replayResidualTables.length === 0,
      exactSet: replayResidualTables.length === 0 &&
        stableText([...allowedResidualTables].sort()) === stableText(observedResidualTables),
    },
    replayCatalogSha256: sha256(stableText(replayCatalog)),
    productionCatalogSha256: sha256(stableText(productionCatalog)),
  };
}

function sectionDelta(section, before, after) {
  const keyFor = (entry) => {
    if (section === 'schemas' || section === 'roles') return entry.schema ?? entry.name;
    if (section === 'tables') return `${entry.schema}.${entry.name}`;
    if (section === 'columns') return `${entry.schema}.${entry.table_name}.${entry.column_name}`;
    if (section === 'policies' || section === 'triggers') return `${entry.schema}.${entry.table_name}.${entry.name}`;
    if (section === 'functions' || section === 'functionGrants') {
      return `${entry.schema}.${entry.signature}${entry.grantee ? `:${entry.grantee}:${entry.privilege_type}` : ''}`;
    }
    if (section === 'tableGrants') return `${entry.schema}.${entry.table_name}:${entry.grantee}:${entry.privilege_type}`;
    if (section === 'migrationHistory') return entry.version;
    return stableText(entry);
  };
  const left = new Map((before ?? []).map((entry) => [keyFor(entry), sha256(stableText(entry))]));
  const right = new Map((after ?? []).map((entry) => [keyFor(entry), sha256(stableText(entry))]));
  return {
    added: [...right.keys()].filter((key) => !left.has(key)).sort(),
    removed: [...left.keys()].filter((key) => !right.has(key)).sort(),
    changed: [...left.keys()].filter((key) => right.has(key) && left.get(key) !== right.get(key)).sort(),
  };
}

function rehearseRollbacks(candidates) {
  const contract = JSON.parse(fs.readFileSync(ROLLBACK_CONTRACT, 'utf8'));
  const byCandidate = new Map(contract.entries.map((entry) => [entry.candidate, entry]));
  const results = [];
  for (const [candidateIndex, candidate] of candidates.entries()) {
    const rule = byCandidate.get(candidate);
    if (!rule) throw new Error(`No rollback contract for ${candidate}`);
    if (!['UNSAFE_BASELINE_RESTORE', 'NON_REVERSIBLE_SECURITY_REPAIR'].includes(rule.mode)) {
      throw new Error(`Invalid rollback mode for ${candidate}`);
    }
    if (rule.mode === 'UNSAFE_BASELINE_RESTORE' && rule.expectedCatalogRestored !== true) {
      throw new Error(`Baseline-restoring rollback contract is incomplete for ${candidate}`);
    }
    if (rule.mode === 'NON_REVERSIBLE_SECURITY_REPAIR' &&
        (rule.expectedCatalogRestored !== false || typeof rule.expectedRollbackRefusal !== 'string')) {
      throw new Error(`Non-reversible rollback contract is incomplete for ${candidate}`);
    }
    const database = `rollback_${candidate.slice(0, 14)}`;
    execFileSync(bin('createdb'), ['-h', SOCK, '-U', 'postgres', '-T', 'flagstone_replay', database], {
      stdio: 'ignore', env: PG_ENV,
    });
    const replayAdaptations = [];
    for (const prerequisite of candidates.slice(0, candidateIndex)) {
      applySqlFile(database, path.join(NEXT, prerequisite), replayAdaptations);
    }
    const preCandidateCatalog = comparator(database);
    applySqlFile(database, path.join(NEXT, candidate), replayAdaptations);
    const forwardCatalog = comparator(database);
    const catalogSections = [
      'roles', 'schemas', 'tables', 'columns', 'policies', 'triggers',
      'functions', 'functionGrants', 'tableGrants', 'migrationHistory',
    ];
    const forwardChangedSections = catalogSections.filter(
      (section) => stableText(preCandidateCatalog[section]) !== stableText(forwardCatalog[section]),
    );
    const forwardCatalogSha256 = sha256(stableText(forwardCatalog));
    const forwardVerified = forwardChangedSections.length > 0 &&
      stableText(forwardChangedSections) === stableText(rule.expectedForwardChangedSections) &&
      forwardCatalogSha256 === rule.expectedForwardCatalogSha256;
    const rollback = path.join(NEXT, 'rollback', candidate.replace(/\.sql$/, '.rollback.sql'));
    if (rule.mode === 'NON_REVERSIBLE_SECURITY_REPAIR') {
      const attempt = spawnSync(
        bin('psql'),
        ['-X', '-h', SOCK, '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-f', rollback],
        { encoding: 'utf8', env: PG_ENV },
      );
      const diagnostic = redactDiagnostic(`${attempt.stdout ?? ''}\n${attempt.stderr ?? ''}`);
      const afterRefusalCatalog = comparator(database);
      results.push({
        candidate,
        mode: rule.mode,
        forwardChangedSections,
        forwardCatalogSha256,
        forwardVerified,
        rollbackRefused: attempt.status !== 0 && diagnostic.includes(rule.expectedRollbackRefusal),
        refusalAtomic: stableText(afterRefusalCatalog) === stableText(forwardCatalog),
        catalogRestored: false,
      });
      continue;
    }
    applySqlFile(database, rollback, replayAdaptations);
    const after = comparator(database);
    const sectionMatches = Object.fromEntries(
      catalogSections
        .map((section) => [section, stableText(after[section]) === stableText(preCandidateCatalog[section])]),
    );
    results.push({
      candidate,
      mode: rule.mode,
      forwardChangedSections,
      forwardCatalogSha256,
      forwardVerified,
      rollbackExecuted: true,
      catalogRestored: stableText(after) === stableText(preCandidateCatalog),
      sectionMatches,
      sectionDeltas: Object.fromEntries(
        Object.entries(sectionMatches)
          .filter(([, matches]) => !matches)
          .map(([section]) => [section, sectionDelta(section, preCandidateCatalog[section], after[section])]),
      ),
    });
  }
  return results;
}

const result = {
  status: 'UNKNOWN',
  safety: {
    inheritedPgEnvironment: false,
    tcpDisabled: true,
    productionInputsAccepted: false,
    nonmanagedExecuted: false,
    nonmanagedDestructiveArtifactExecuted: false,
  },
  applied: [],
  next: [],
  replayAdaptations: [],
  failed: null,
};

try {
  result.pgVersion = execFileSync(bin('postgres'), ['--version'], { encoding: 'utf8', env: PG_ENV }).trim();
  result.globalPostgresBefore = globalPgNetState();
  execFileSync(bin('initdb'), [
    '-D', DATA, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-sync',
  ], { stdio: ['ignore', 'ignore', 'pipe'], env: PG_ENV });
  fs.appendFileSync(
    path.join(DATA, 'postgresql.conf'),
    `\nlisten_addresses = ''\nunix_socket_directories = '${SOCK}'\nfsync = off\nfull_page_writes = off\n`,
  );
  execFileSync(bin('pg_ctl'), ['-D', DATA, '-l', LOG, '-w', 'start'], { stdio: 'ignore', env: PG_ENV });
  started = true;
  execFileSync(bin('createdb'), ['-h', SOCK, '-U', 'postgres', 'flagstone_replay'], { stdio: 'ignore', env: PG_ENV });
  result.serverVersion = psql('flagstone_replay', ['-tAc', 'show server_version']).trim();

  for (const file of fs.readdirSync(REPLAY).filter((name) => /^\d\d_.*\.sql$/.test(name)).sort()) {
    applySqlFile('flagstone_replay', path.join(REPLAY, file), result.replayAdaptations);
  }

  const crosswalk = JSON.parse(fs.readFileSync(CROSSWALK, 'utf8'));
  const applied = crosswalk.entries
    .filter((entry) => entry.status === 'APPLIED' && entry.file)
    .sort((a, b) => a.version.localeCompare(b.version));
  if (applied.length !== 71) throw new Error(`Expected 71 applied migrations, found ${applied.length}`);
  for (const entry of applied) {
    const full = path.resolve(ROOT, entry.file);
    if (!full.startsWith(`${MIGRATIONS}${path.sep}`)) {
      throw new Error(`REFUSED non-managed applied path: ${entry.file}`);
    }
    applySqlFile('flagstone_replay', full, result.replayAdaptations);
    result.applied.push(entry.version);
    psql('flagstone_replay', [
      '-c',
      `insert into supabase_migrations.schema_migrations(version, name) values (` +
        `'${entry.version}', '${String(entry.ledgerName ?? entry.slug).replaceAll("'", "''")}')`,
    ], { stdio: 'ignore' });
  }

  const candidates = fs.readdirSync(NEXT).filter((name) => /^\d{14}_.*\.sql$/.test(name)).sort();
  if (VERIFY_ROLLBACKS) {
    result.rollbackRehearsal = rehearseRollbacks(candidates);
    const rollbackPass = result.rollbackRehearsal.every((entry) =>
      entry.forwardVerified && (entry.mode === 'NON_REVERSIBLE_SECURITY_REPAIR'
        ? entry.rollbackRefused && entry.refusalAtomic
        : entry.catalogRestored),
    );
    if (!rollbackPass) throw new Error('Rollback rehearsal did not meet its declared contract');
  }
  if (WITH_NEXT) {
    for (const file of candidates) {
      applySqlFile('flagstone_replay', path.join(NEXT, file), result.replayAdaptations);
      result.next.push(file);
    }
  }

  if (PHASE03A) {
    const { replayPhase03a } = await import('./replay-phase03a.mjs');
    result.phase03a = replayPhase03a({ root: ROOT, psql, applySqlFile, comparator,
      adaptations: result.replayAdaptations,
      privilegesOnly: PHASE03A_PRIVILEGES_ONLY,
      pgTapSql: phase03aPgTapArg?.slice('--phase03a-pgtap-sql='.length) });
    if (!(PHASE03A_PRIVILEGES_ONLY ? result.phase03a.privilegeProofPassed : result.phase03a.localProofPassed)) {
      throw new Error('Phase03A local proof failed; see phase03a evidence');
    }
  }

  result.catalog = comparator();
  result.catalogSha256 = sha256(stableText(result.catalog));
  if (CATALOG_OUT) {
    const capture = {
      captureVersion: 2,
      capturedAtUtc: new Date().toISOString(),
      target: { kind: 'socket-only disposable PostgreSQL', production: false },
      source: {
        repositorySha: git('rev-parse', 'HEAD'),
        repositoryTree: git('rev-parse', 'HEAD^{tree}'),
        comparator: 'supabase/replay/compare.sql',
        comparatorSha256: sha256(fs.readFileSync(path.join(REPLAY, 'compare.sql'))),
      },
      catalog: result.catalog,
    };
    fs.writeFileSync(CATALOG_OUT, `${JSON.stringify(capture, null, 2)}\n`, { mode: 0o600 });
    result.catalogOutput = { path: CATALOG_OUT, sha256: result.catalogSha256 };
  }

  const compareWithProduction = !LOCAL_ONLY && (WITH_NEXT || Boolean(COMPARISON_OUT));
  if (compareWithProduction) {
    if (!fs.existsSync(PRODUCTION_CAPTURE)) {
      result.status = 'HOLD_NO_FRESH_PRODUCTION_CAPTURE';
    } else {
      const capture = JSON.parse(fs.readFileSync(PRODUCTION_CAPTURE, 'utf8'));
      const deployedContract = JSON.parse(fs.readFileSync(DEPLOYED_CONTRACT, 'utf8'));
      const authoritativeProjectRef = deployedContract.project?.ref;
      const projectBindingValid = typeof authoritativeProjectRef === 'string' &&
        crosswalk.project === authoritativeProjectRef &&
        capture.target?.projectRef === authoritativeProjectRef;
      const comparatorSha256 = sha256(fs.readFileSync(path.join(REPLAY, 'compare.sql')));
      const capturedCommitTree = git('rev-parse', `${capture.source?.repositorySha}^{tree}`);
      const capturedCommitIsAncestor = spawnSync(
        'git', ['merge-base', '--is-ancestor', capture.source?.repositorySha, 'HEAD'],
        { cwd: ROOT, encoding: 'utf8' },
      ).status === 0;
      const captureTime = Date.parse(capture.capturedAtUtc);
      const capturedCommitTime = Date.parse(git('show', '-s', '--format=%cI', capture.source?.repositorySha));
      const captureValid = capture.captureVersion === 2 &&
        capture.target?.kind === 'production' && capture.target?.readOnly === true &&
        capture.target?.catalogOnly === true && capture.target?.applicationDataRead === false &&
        capture.target?.mutationsPerformed === false &&
        projectBindingValid && capturedCommitIsAncestor &&
        capture.source?.repositoryTree === capturedCommitTree &&
        capture.source?.comparatorPath === 'supabase/replay/compare.sql' &&
        capture.source?.comparatorSha256 === comparatorSha256 &&
        capture.source?.comparatorVersion === 3 && capture.catalog?.comparatorVersion === 3 &&
        capture.source?.collectionMethod === 'Supabase execute_sql read-only SELECT using the committed comparator' &&
        Number.isFinite(captureTime) && captureTime >= capturedCommitTime && captureTime <= Date.now();
      if (!captureValid) throw new Error('Fresh production capture provenance validation failed');
      result.productionComparison = catalogDiff(result.catalog, capture.catalog);
      result.status = result.productionComparison.exactAfterAcceptedResiduals &&
        result.productionComparison.acceptedResidual.exactSet ? 'PASS' : 'DRIFT';
      if (COMPARISON_OUT) {
        const comparisonCapture = {
          comparisonVersion: 2,
          comparedAtUtc: new Date().toISOString(),
          source: {
            repositorySha: git('rev-parse', 'HEAD'),
            repositoryTree: git('rev-parse', 'HEAD^{tree}'),
            comparatorSha256: sha256(fs.readFileSync(path.join(REPLAY, 'compare.sql'))),
          },
          productionCapture: path.relative(ROOT, PRODUCTION_CAPTURE),
          result: result.productionComparison,
        };
        fs.writeFileSync(COMPARISON_OUT, `${JSON.stringify(comparisonCapture, null, 2)}\n`, { mode: 0o600 });
      }
    }
  } else {
    result.status = WITH_NEXT ? 'LOCAL_REPLAY_ONLY' : 'PASS';
  }

  if (DUMP) {
    if (!WITH_NEXT) throw new Error('--dump requires --with-next');
    const dest = path.join(ROOT, 'supabase', 'schema.generated.sql');
    const dump = execFileSync(bin('pg_dump'), [
      '-h', SOCK, '-U', 'postgres', '-d', 'flagstone_replay',
      '--schema-only', '--no-owner', '--no-privileges', '--no-comments',
      '-n', 'public', '-n', 'private',
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: PG_ENV });
    const header = [
      '-- GENERATED FILE — DO NOT EDIT BY HAND.',
      '--',
      '-- Produced by: node scripts/replay-migrations.mjs --with-next --local-only --dump',
      '-- Source: 71 immutable applied migrations plus five forward candidates.',
      '-- This is a deterministic REFERENCE SNAPSHOT, not an apply script,',
      '-- migration history, or proof of current production state.',
      '-- Privileges and owners are excluded; compare.sql covers grants.',
      '',
    ].join('\n');
    const normalized = dump.split('\n')
      .filter((line) => !/^\\(un)?restrict\s/.test(line))
      .join('\n').replace(/\n+$/, '\n');
    fs.writeFileSync(dest, header + normalized, { mode: 0o644 });
    result.snapshot = { file: 'supabase/schema.generated.sql', sha256: sha256(header + normalized) };
  }

  if (RUN_PGTAP) {
    psql('flagstone_replay', ['-c', 'create extension if not exists pgtap'], { stdio: 'ignore' });
    const testDir = path.join(ROOT, 'supabase', 'tests');
    const suites = fs.readdirSync(testDir)
      .filter((name) => name.endsWith('.sql'))
      .filter((name) => /PGTAP_EXECUTION:\s*canonical-replay-with-next/i.test(
        fs.readFileSync(path.join(testDir, name), 'utf8'),
      )).sort();
    result.pgTap = [];
    for (const suite of suites) {
      const output = psql('flagstone_replay', ['-f', path.join(testDir, suite)]);
      const notOk = output.split('\n').filter((line) => /^not ok\b/i.test(line.trim()));
      result.pgTap.push({ suite, executed: true, passed: notOk.length === 0 });
      if (notOk.length) throw new Error(`pgTAP suite failed: ${suite} (${notOk.length} not-ok results)`);
    }
  }
} catch (error) {
  result.status = result.status === 'UNKNOWN' ? 'ERROR' : result.status;
  result.failed = redactDiagnostic(error.stderr || error.message).split('\n').filter(Boolean).slice(0, 12);
}

result.globalPostgresAfter = globalPgNetState();
result.safety.globalPostgresUnchanged = stableText(result.globalPostgresBefore) === stableText(result.globalPostgresAfter);
if (!result.safety.globalPostgresUnchanged && result.status !== 'ERROR') result.status = 'ERROR';
cleanup();
result.safety.tempDestroyed = !fs.existsSync(tmp);
if (!result.safety.tempDestroyed && result.status !== 'ERROR') result.status = 'ERROR';

if (JSON_OUT) {
  const printable = CATALOG_OUT ? { ...result, catalog: '[written to --catalog-out]' } : result;
  console.log(JSON.stringify(printable, null, 2));
}
else {
  log(`PHASE-02B rev2 replay: ${result.status}`);
  log(`Applied migrations: ${result.applied.length}; candidates: ${result.next.length}`);
  log(`Temp destroyed: ${result.safety.tempDestroyed}; global PostgreSQL unchanged: ${result.safety.globalPostgresUnchanged}`);
  if (result.rollbackRehearsal) {
    for (const entry of result.rollbackRehearsal) {
      log(`Rollback ${entry.candidate}: ${entry.mode} — ${entry.catalogRestored || entry.rollbackRefused ? 'contract met' : 'FAILED'}`);
    }
  }
  if (result.failed) console.error(result.failed.join('\n'));
}

process.exit(['PASS', 'LOCAL_REPLAY_ONLY'].includes(result.status) ? 0 : result.status.startsWith('HOLD') ? 2 : 1);
