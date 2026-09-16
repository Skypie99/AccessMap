import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGET = 'kldlwszpfkdmsjrjhjym';
const STAGING = 'cepayqmsoqxshsiyqnvz';
const ACCEPTED_HTTP_FINGERPRINT = '709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8';
const EXPECTED_HEAD = '9d638456fa8e679678c54f131fe8f0db723eda72';
const EXPECTED_TREE = 'cfc76206f7cf7af6a7127a6329620d2ee1dc4da8';
const EXPECTED_BRANCH = 'codex/flagstone-p03b-production-dry-run-v2-20260916';
const EXPECTED_WORKTREE = '/Users/skypie/AccessMap-codex/flagstone-p03b-production-dry-run-v2-20260916';
const MODERATION = '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql';
const MODERATION_SHA = 'b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11';
const POINTS = '20260915210413_phase03b_points_integrity.sql';
const POINTS_SHA = '0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5';
const EXPECTED_PHASE03A_VERSIONS = new Set([
  '20260904000000', '20260904000100', '20260904000200', '20260904000300', '20260904000400',
  '20260905055629', '20260905055630', '20260905055632', '20260905055633', '20260905055635',
  '20260905055636', '20260905073925', '20260909120000', '20260911120000',
]);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repo = resolve(scriptDir, '../../..');
const snapshotSql = join(scriptDir, 'snapshot.sql');
const startedAt = new Date().toISOString();
let workspace = null;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256Text(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function run(command, args, options = {}) {
  const began = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repo,
    encoding: 'utf8',
    timeout: options.timeout ?? 30_000,
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
  });
  return {
    command: [command, ...args],
    began,
    ended: new Date().toISOString(),
    exitCode: result.status,
    signal: result.signal,
    timedOut: result.error?.code === 'ETIMEDOUT',
    error: result.error ? { code: result.error.code, message: result.error.message } : null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function requireSuccess(step, label) {
  if (step.exitCode !== 0 || step.timedOut || step.signal) {
    throw new Error(`${label} failed: exit=${step.exitCode} timedOut=${step.timedOut} signal=${step.signal}`);
  }
}

function gitValue(args) {
  const step = run('git', args);
  requireSuccess(step, `git ${args.join(' ')}`);
  return step.stdout.trim();
}

function parseCliJson(stdout) {
  const first = stdout.indexOf('{');
  const array = stdout.indexOf('[');
  const offset = first === -1 ? array : array === -1 ? first : Math.min(first, array);
  if (offset === -1) throw new Error('CLI output did not contain JSON');
  return JSON.parse(stdout.slice(offset));
}

function sanitizeStep(step) {
  return {
    command: step.command,
    began: step.began,
    ended: step.ended,
    exitCode: step.exitCode,
    signal: step.signal,
    timedOut: step.timedOut,
    error: step.error,
    stdout: step.stdout,
    stderr: step.stderr,
  };
}

function captureSnapshot(label) {
  const step = run('supabase', [
    'db', 'query', '--linked', '--project-ref', TARGET,
    '--output-format', 'json', '--file', snapshotSql,
  ], { timeout: 45_000 });
  requireSuccess(step, `${label} snapshot`);
  const envelope = parseCliJson(step.stdout);
  const snapshot = envelope.rows?.[0]?.phase03b_snapshot;
  if (!snapshot) throw new Error(`${label} snapshot payload missing`);
  if (snapshot.projectRef !== TARGET || snapshot.forbiddenStagingRef !== STAGING) {
    throw new Error(`${label} target identity mismatch`);
  }
  if (snapshot.transactionReadOnly !== 'on') throw new Error(`${label} transaction was not read-only`);
  const structuralChecksum = sha256Text(JSON.stringify(stable(snapshot.structure)));
  const output = {
    ...snapshot,
    structuralChecksum,
    command: step.command,
    commandStartedAt: step.began,
    commandEndedAt: step.ended,
    commandExitCode: step.exitCode,
  };
  writeFileSync(join(scriptDir, `${label}_SNAPSHOT.json`), `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

function captureFunctionMetadata(label) {
  const step = run('supabase', [
    'functions', 'list', '--project-ref', TARGET, '--output-format', 'json',
  ]);
  requireSuccess(step, `${label} function metadata`);
  const payload = parseCliJson(step.stdout);
  const functions = Array.isArray(payload) ? payload : payload.functions;
  const selected = functions
    .filter((fn) => fn.slug === 'notify-flag-status')
    .map((fn) => ({
      id: fn.id,
      slug: fn.slug,
      name: fn.name,
      status: fn.status,
      version: fn.version,
      verifyJwt: fn.verify_jwt,
      createdAt: fn.created_at,
      updatedAt: fn.updated_at,
    }));
  if (selected.length !== 1) throw new Error(`${label} expected one notify-flag-status function`);
  const output = {
    projectRef: TARGET,
    function: selected[0],
    identitySha256: sha256Text(JSON.stringify(stable(selected[0]))),
    command: step.command,
    commandStartedAt: step.began,
    commandEndedAt: step.ended,
    commandExitCode: step.exitCode,
  };
  writeFileSync(join(scriptDir, `${label}_FUNCTION_METADATA.json`), `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

function collectForwardMigrationSources() {
  const sources = [];
  const addSqlFiles = (directory, predicate = () => true) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (statSync(path).isFile() && /^\d{14}_.+\.sql$/.test(name) && predicate(name)) sources.push(path);
    }
  };
  addSqlFiles(join(repo, 'supabase/migrations'));
  addSqlFiles(join(repo, 'supabase/migrations-next'), (name) => EXPECTED_PHASE03A_VERSIONS.has(name.slice(0, 14)));
  addSqlFiles(join(repo, 'supabase/migrations-next/phase03a'), (name) => EXPECTED_PHASE03A_VERSIONS.has(name.slice(0, 14)));
  return sources;
}

const receipt = {
  schemaVersion: 1,
  promptId: 'FLAGSTONE-P03B-REVISED-PRODUCTION-DRY-RUN-20260916-R1',
  startedAt,
  target: TARGET,
  forbiddenStagingTarget: STAGING,
  result: 'HOLD',
  dryRun: null,
  discovery: null,
  pre: null,
  post: null,
  preFunction: null,
  postFunction: null,
  workspace: null,
  workspaceRemoved: false,
  failure: null,
};

try {
  const identity = {
    branch: gitValue(['branch', '--show-current']),
    head: gitValue(['rev-parse', 'HEAD']),
    tree: gitValue(['rev-parse', 'HEAD^{tree}']),
    worktree: gitValue(['rev-parse', '--show-toplevel']),
    unmerged: gitValue(['ls-files', '-u']),
  };
  if (identity.branch !== EXPECTED_BRANCH || identity.head !== EXPECTED_HEAD ||
      identity.tree !== EXPECTED_TREE || identity.worktree !== EXPECTED_WORKTREE || identity.unmerged !== '') {
    throw new Error(`git identity mismatch: ${JSON.stringify(identity)}`);
  }
  const moderationPath = join(repo, 'supabase/migrations-next/phase03b', MODERATION);
  const pointsPath = join(repo, 'supabase/migrations-next/phase03b', POINTS);
  if (sha256File(moderationPath) !== MODERATION_SHA || sha256File(pointsPath) !== POINTS_SHA) {
    throw new Error('frozen migration hash mismatch');
  }

  const discovery = captureSnapshot('DISCOVERY');
  receipt.discovery = {
    ledger: discovery.ledger,
    structuralChecksum: discovery.structuralChecksum,
    http: discovery.http,
  };
  if (discovery.http.requestQueueCount !== 0 || discovery.http.responseCount !== 6 ||
      discovery.http.responseFingerprint !== ACCEPTED_HTTP_FINGERPRINT) {
    throw new Error('HTTP baseline precondition mismatch');
  }
  if (discovery.ledger.phase03bFrozenRowsPresent !== 0 ||
      discovery.ledger.rowCount !== discovery.ledger.uniqueVersionCount) {
    throw new Error('production migration ledger is not eligible for the frozen Phase 03B plan');
  }
  receipt.preFunction = captureFunctionMetadata('PRE');

  workspace = mkdtempSync(join(tmpdir(), 'flagstone-p03b-production-dryrun-v2-'));
  receipt.workspace = workspace;
  writeFileSync(join(workspace, '.flagstone-p03b-dry-run-workspace'), `${TARGET}\n`);
  const init = run('supabase', ['init', '--workdir', workspace, '--yes']);
  requireSuccess(init, 'temporary workspace init');
  const destination = join(workspace, 'supabase/migrations');
  mkdirSync(destination, { recursive: true });

  const sources = collectForwardMigrationSources();
  const byVersion = new Map();
  for (const source of sources) {
    const version = basename(source).slice(0, 14);
    if (byVersion.has(version)) throw new Error(`duplicate frozen local migration version ${version}`);
    byVersion.set(version, source);
  }
  for (const row of discovery.ledger.rows) {
    const source = byVersion.get(row.version);
    if (!source) throw new Error(`no frozen local source for production ledger version ${row.version}`);
    cpSync(source, join(destination, basename(source)));
  }
  cpSync(moderationPath, join(destination, MODERATION));
  cpSync(pointsPath, join(destination, POINTS));

  const workspaceMigrations = readdirSync(destination).filter((name) => name.endsWith('.sql')).sort();
  const expectedPlan = [MODERATION, POINTS];
  if (workspaceMigrations.length !== discovery.ledger.rowCount + 2 ||
      sha256File(join(destination, MODERATION)) !== MODERATION_SHA ||
      sha256File(join(destination, POINTS)) !== POINTS_SHA) {
    throw new Error('temporary workspace migration inventory mismatch');
  }

  const pre = captureSnapshot('PRE');
  receipt.pre = {
    ledger: pre.ledger,
    structuralChecksum: pre.structuralChecksum,
    http: pre.http,
  };
  if (pre.http.requestQueueCount !== 0 || pre.http.responseCount !== 6 ||
      pre.http.responseFingerprint !== ACCEPTED_HTTP_FINGERPRINT) {
    throw new Error('immediate HTTP baseline precondition mismatch');
  }
  if (pre.ledger.phase03bFrozenRowsPresent !== 0 ||
      pre.ledger.rowCount !== pre.ledger.uniqueVersionCount ||
      pre.ledger.orderedVersionNameSha256 !== discovery.ledger.orderedVersionNameSha256 ||
      pre.structuralChecksum !== discovery.structuralChecksum) {
    throw new Error('production state drifted while preparing the local dry-run workspace');
  }

  const command = [
    'db', 'push', '--workdir', workspace, '--linked', '--project-ref', TARGET,
    '--dry-run', '--skip-vault', '--include-all', '--output-format', 'json',
  ];
  const dryRun = run('supabase', command, { timeout: 50_000 });
  receipt.dryRun = sanitizeStep(dryRun);
  let proposed = [];
  if (!dryRun.timedOut && dryRun.exitCode === 0 && !dryRun.signal) {
    const parsed = parseCliJson(dryRun.stdout);
    proposed = (parsed.migrations ?? []).map((item) => item.endsWith('.sql') ? item : `${item}.sql`);
  }
  receipt.dryRun.proposedMigrations = proposed;
  receipt.dryRun.exactTwoMigrationsOnly = JSON.stringify(proposed) === JSON.stringify(expectedPlan);

  const post = captureSnapshot('POST');
  receipt.post = {
    ledger: post.ledger,
    structuralChecksum: post.structuralChecksum,
    http: post.http,
  };
  receipt.postFunction = captureFunctionMetadata('POST');

  const immutable = {
    ledger: pre.ledger.orderedVersionNameSha256 === post.ledger.orderedVersionNameSha256 &&
      pre.ledger.rowCount === post.ledger.rowCount && JSON.stringify(pre.ledger.rows) === JSON.stringify(post.ledger.rows),
    structure: pre.structuralChecksum === post.structuralChecksum,
    function: receipt.preFunction.identitySha256 === receipt.postFunction.identitySha256,
    http: post.http.requestQueueCount === 0 && post.http.responseCount === 6 &&
      post.http.responseFingerprint === ACCEPTED_HTTP_FINGERPRINT &&
      JSON.stringify(pre.http.rows) === JSON.stringify(post.http.rows),
  };
  receipt.immutability = immutable;

  if (dryRun.timedOut || dryRun.exitCode !== 0 || dryRun.signal) throw new Error('dry-run did not complete unambiguously');
  if (!receipt.dryRun.exactTwoMigrationsOnly) throw new Error(`unexpected dry-run plan: ${JSON.stringify(proposed)}`);
  if (!Object.values(immutable).every(Boolean)) throw new Error(`production immutability mismatch: ${JSON.stringify(immutable)}`);
  receipt.result = 'PASS';
} catch (error) {
  receipt.result = 'HOLD';
  receipt.failure = { message: error instanceof Error ? error.message : String(error) };
} finally {
  if (workspace && existsSync(workspace)) {
    const marker = join(workspace, '.flagstone-p03b-dry-run-workspace');
    if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === TARGET &&
        workspace.startsWith(`${tmpdir()}/flagstone-p03b-production-dryrun-v2-`)) {
      rmSync(workspace, { recursive: true, force: false });
    }
  }
  receipt.workspaceRemoved = workspace ? !existsSync(workspace) : true;
  receipt.endedAt = new Date().toISOString();
  writeFileSync(join(scriptDir, 'DRY_RUN_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`);
}

const concise = {
  result: receipt.result,
  failure: receipt.failure,
  preLedgerCount: receipt.pre?.ledger?.rowCount ?? null,
  preLedgerDigest: receipt.pre?.ledger?.orderedVersionNameSha256 ?? null,
  preStructuralChecksum: receipt.pre?.structuralChecksum ?? null,
  preHttp: receipt.pre?.http ? {
    queue: receipt.pre.http.requestQueueCount,
    responses: receipt.pre.http.responseCount,
    fingerprint: receipt.pre.http.responseFingerprint,
  } : null,
  function: receipt.preFunction?.function ?? null,
  dryRunExit: receipt.dryRun?.exitCode ?? null,
  dryRunTimedOut: receipt.dryRun?.timedOut ?? null,
  proposedMigrations: receipt.dryRun?.proposedMigrations ?? null,
  immutability: receipt.immutability ?? null,
  postHttp: receipt.post?.http ? {
    queue: receipt.post.http.requestQueueCount,
    responses: receipt.post.http.responseCount,
    fingerprint: receipt.post.http.responseFingerprint,
  } : null,
  workspaceRemoved: receipt.workspaceRemoved,
};
console.log(JSON.stringify(concise, null, 2));
process.exitCode = receipt.result === 'PASS' ? 0 : 2;
