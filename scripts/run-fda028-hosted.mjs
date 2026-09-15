#!/usr/bin/env node
/**
 * FDA-028 explicit-target hosted acceptance runner.
 *
 * This runner has one authorized database target. It never reads linked-project
 * state, never accepts a database URL, and never renders Vault material.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const EXPECTED_PROJECT_REF = 'cepayqmsoqxshsiyqnvz';
export const EXPECTED_BRANCH_ID = '4a37413a-01c2-4ab2-8bf8-a17a42a549b8';
export const PRODUCTION_PROJECT_REF = 'kldlwszpfkdmsjrjhjym';
export const OLD_STAGING_PROJECT_REF = 'ctshxbykuemeqnofqcdh';
export const ACCEPTED_INTEGRATION_SHA = '9a0af4c88b5b00898e405992cfd44ba7dfd689fc';
export const EXPECTED_LEDGER = Object.freeze({
  count: 103,
  latest: '20260913080000',
  sha256: '9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316',
});

const EXPECTED_ARTIFACTS = Object.freeze({
  'supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql':
    '8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771',
  'supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql':
    'eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302',
});

const HOSTED_FILES = Object.freeze({
  state: 'supabase/tests/fda028/hosted-state.sql',
  negative: 'supabase/tests/fda028/hosted-negative-control.sql',
  suite: 'supabase/tests/fda028/hosted-acceptance.sql',
  runner: 'scripts/run-fda028-hosted.mjs',
});

const TARGET_SELECTORS = new Set([
  '--project-ref', '--branch-id', '--db-url', '--linked', '--local', '--profile', '--workdir',
]);

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unexpected positional argument: ${token}`);
    if (!['--project-ref', '--branch-id', '--reviewed-sha', '--receipt-dir'].includes(token)) {
      if (TARGET_SELECTORS.has(token)) throw new Error(`Ambiguous or prohibited target selector: ${token}`);
      throw new Error(`Unknown option: ${token}`);
    }
    if (Object.hasOwn(out, token)) throw new Error(`Duplicate option: ${token}`);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
    out[token] = value;
    i += 1;
  }
  for (const required of ['--project-ref', '--branch-id', '--reviewed-sha', '--receipt-dir']) {
    if (!Object.hasOwn(out, required)) throw new Error(`Missing required option: ${required}`);
  }
  return {
    projectRef: out['--project-ref'],
    branchId: out['--branch-id'],
    reviewedSha: out['--reviewed-sha'],
    receiptDir: out['--receipt-dir'],
  };
}

function assertSingleToken(label, value, pattern) {
  if (typeof value !== 'string' || value.trim() !== value || !pattern.test(value)) {
    throw new Error(`${label} must be exactly one canonical token`);
  }
}

export function validateReviewedSha(reviewedSha) {
  assertSingleToken('reviewed SHA', reviewedSha, /^[0-9a-f]{40}$/);
  return true;
}

export function validateTarget({ projectRef, branchId }) {
  assertSingleToken('project ref', projectRef, /^[a-z]{20}$/);
  assertSingleToken('branch id', branchId, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  if (projectRef === PRODUCTION_PROJECT_REF) throw new Error('Refusing production project identity');
  if (projectRef === OLD_STAGING_PROJECT_REF) throw new Error('Refusing old staging project identity');
  if (projectRef !== EXPECTED_PROJECT_REF) throw new Error(`Refusing unexpected project identity: ${projectRef}`);
  if (branchId !== EXPECTED_BRANCH_ID) throw new Error(`Refusing unexpected branch identity: ${branchId}`);
  return true;
}

function walk(value, visit) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
  } else if (value && typeof value === 'object') {
    visit(value);
    for (const child of Object.values(value)) walk(child, visit);
  }
}

export function parseTap(raw) {
  const text = String(raw).replaceAll('\\n', '\n');
  const plans = [...text.matchAll(/(?:^|[^0-9])1\.\.(\d+)/gm)].map((m) => Number(m[1]));
  const notOk = [...text.matchAll(/\bnot ok\s+(\d+)\s*-\s*([^"\\\r\n]*)/g)].map((m) => ({
    number: Number(m[1]), description: m[2].trim(),
  }));
  const ok = [...text.matchAll(/(?<!not )\bok\s+(\d+)\s*-\s*([^"\\\r\n]*)/g)].map((m) => ({
    number: Number(m[1]), description: m[2].trim(),
  }));
  return { plans, ok, notOk };
}

function assertTapEnvelope(raw, { allowExpectedNegativeDiagnostics = false } = {}) {
  const original = String(raw).trim();
  if (!original) throw new Error('TAP output was empty');
  const jsonFramed = original.startsWith('{') || original.startsWith('[');
  if (jsonFramed) {
    let parsed;
    try { parsed = JSON.parse(original); }
    catch { throw new Error('Supabase TAP output was not one valid JSON document'); }
    let reportedError = false;
    walk(parsed, (candidate) => {
      for (const key of ['error', 'errors', 'warning', 'warnings']) {
        if (Object.hasOwn(candidate, key) && candidate[key]) reportedError = true;
      }
    });
    if (reportedError) throw new Error('Supabase TAP output contained an error object');
  } else {
    const allowed = /^(?:1\.\.\d+|(?:not )?ok\s+\d+\s*-\s*[^\r\n]+)$/i;
    const expectedNegativeDiagnostic = /^# (?:Failed test 1: "FDA028 deliberate runner negative control"|Looks like you failed 1 test of 1)$/;
    const unexpected = original.replaceAll('\\n', '\n').split(/\r?\n/)
      .map((line) => line.trim()).filter(Boolean)
      .filter((line) => !allowed.test(line)
        && !(allowExpectedNegativeDiagnostics && expectedNegativeDiagnostic.test(line)));
    if (unexpected.length) throw new Error('TAP output contained an unexpected stdout record');
  }
  const text = original.replaceAll('\\n', '\n');
  if (/\bBail out!/i.test(text)) throw new Error('TAP output emitted a bailout');
  if (/1\.\.\d+[^\r\n]*#\s*(?:SKIP|TODO)\b/i.test(text)
      || /\bok\s+\d+[^\r\n]*#\s*(?:SKIP|TODO)\b/i.test(text)) {
    throw new Error('TAP output emitted a skipped or TODO plan/assertion');
  }
  if (/(?:^|\n)\s*(?:---|\.\.\.)\s*(?:\n|$)/m.test(text)) {
    throw new Error('TAP output emitted unexpected YAML diagnostics');
  }
  const comments = [...text.matchAll(/(?:^|\n)\s*(#\s+[^\r\n]+)/gm)].map((match) => match[1].trim());
  const expectedNegativeDiagnostic = /^# (?:Failed test 1: "FDA028 deliberate runner negative control"|Looks like you failed 1 test of 1)$/;
  if (comments.some((comment) => !allowExpectedNegativeDiagnostics || !expectedNegativeDiagnostic.test(comment))) {
    throw new Error('TAP output emitted an unexpected diagnostic comment');
  }
  if (/\b(?:WARNING|ERROR|FATAL|PANIC|NOTICE):/i.test(text)) {
    throw new Error('TAP output contained an unexpected diagnostic record');
  }
}

function assertOnePlan(tap) {
  if (tap.plans.length !== 1) throw new Error(`Expected one TAP plan, found ${JSON.stringify(tap.plans)}`);
  if (tap.plans[0] <= 0) throw new Error('TAP plan must contain at least one assertion');
  return tap.plans[0];
}

export function assertNegativeControl(raw) {
  assertTapEnvelope(raw, { allowExpectedNegativeDiagnostics: true });
  const tap = parseTap(raw);
  const plan = assertOnePlan(tap);
  if (plan !== 1 || tap.ok.length !== 0 || tap.notOk.length !== 1 || tap.notOk[0].number !== 1) {
    throw new Error('Deliberate negative control was not detected exactly once');
  }
  if (!tap.notOk[0].description.includes('deliberate runner negative control')) {
    throw new Error('Unexpected failing assertion in negative control output');
  }
  return { plan, passed: 0, failed: 1, detected: true };
}

export function assertSuccessfulTap(raw, expectedPlan = 39) {
  assertTapEnvelope(raw);
  const tap = parseTap(raw);
  const plan = assertOnePlan(tap);
  if (plan !== expectedPlan) throw new Error(`Hosted suite plan mismatch: expected ${expectedPlan}, received ${plan}`);
  const numbers = tap.ok.map((x) => x.number).sort((a, b) => a - b);
  if (tap.notOk.length) throw new Error(`Hosted suite reported ${tap.notOk.length} failing assertion(s)`);
  if (tap.ok.length !== plan || numbers.some((number, index) => number !== index + 1)) {
    throw new Error(`TAP assertion accounting mismatch: plan ${plan}, ok ${tap.ok.length}`);
  }
  return { plan, passed: tap.ok.length, failed: 0, assertions: tap.ok };
}

function findObjectWithKey(value, key) {
  let found;
  walk(value, (candidate) => {
    if (Object.hasOwn(candidate, key)) found = candidate[key];
  });
  return found;
}

function balancedJsonObjects(text) {
  const objects = [];
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === '{') depth += 1;
      else if (char === '}' && --depth === 0) {
        objects.push(text.slice(start, i + 1));
        break;
      }
    }
  }
  return objects;
}

export function extractState(raw) {
  let parsed;
  try { parsed = JSON.parse(String(raw)); } catch { parsed = null; }
  let state = parsed === null ? undefined : findObjectWithKey(parsed, 'fda028_state');
  if (typeof state === 'string') {
    try { state = JSON.parse(state); } catch { /* handled below */ }
  }
  if (!state || typeof state !== 'object') {
    for (const candidate of balancedJsonObjects(String(raw))) {
      try {
        const value = JSON.parse(candidate);
        state = Object.hasOwn(value, 'ledger_count') ? value : findObjectWithKey(value, 'fda028_state');
        if (typeof state === 'string') state = JSON.parse(state);
        if (state && typeof state === 'object') break;
      } catch { /* continue */ }
    }
  }
  if (!state || typeof state !== 'object') throw new Error('FDA-028 state row was absent from query output');
  return state;
}

export function assertPreflightState(state) {
  if (Number(state.ledger_count) !== EXPECTED_LEDGER.count
      || String(state.ledger_latest) !== EXPECTED_LEDGER.latest
      || state.ledger_sha256 !== EXPECTED_LEDGER.sha256) {
    throw new Error('Fresh staging migration ledger identity did not match the accepted 103-row ledger');
  }
  for (const key of ['flags', 'buckets', 'grants', 'helpers', 'queued_http']) {
    if (Number(state[key]) !== 0) throw new Error(`Fresh staging precondition failed: ${key}=${state[key]}`);
  }
  if (Number(state.vault_secret_rows) !== 1 || Number(state.vault_key_bytes) !== 32) {
    throw new Error('Accepted Vault key contract was absent');
  }
  if (state.dev_key_material_exists !== false) throw new Error('Fixture-only dev_key_material exists hosted');
  const expectedConfig = {
    id: true, enabled: true, catchup_cap: 32, ipv4_prefix: 32, ipv6_prefix: 64,
    window_seconds: 86400, reseed_interval: 7, bucket_allowance: 50,
    normal_allowance: 5, require_public_ip: true, retention_windows: 1,
  };
  if (!state.config || Object.entries(expectedConfig).some(([key, value]) => state.config[key] !== value)) {
    throw new Error('Fresh staging limiter configuration did not match the accepted contract');
  }
  const functionKeys = ['clockless_flag', 'clocked_flag', 'purge', 'purge_at'];
  if (!state.function_contract
      || Object.keys(state.function_contract).sort().join(',') !== [...functionKeys].sort().join(',')
      || functionKeys.some((key) => state.function_contract[key] !== true)) {
    throw new Error('Fresh staging function contract did not match');
  }
  return true;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

export function assertCleanup(pre, post) {
  const left = JSON.stringify(canonicalJson(pre));
  const right = JSON.stringify(canonicalJson(post));
  if (left !== right) throw new Error('Hosted cleanup mismatch: post-run state differs from pre-run state');
  return true;
}

export function executeProtocol({ runState, runNegative, runSuite }) {
  const pre = runState('pre');
  assertPreflightState(pre.state);
  let negative;
  let suite;
  let primaryError;
  try {
    negative = runNegative();
    if (negative.status !== 0) throw new Error('Negative-control SQL command failed before TAP evaluation');
    negative.parsed = assertNegativeControl(negative.stdout);
    suite = runSuite();
    if (suite.status !== 0) throw new Error('Hosted acceptance SQL command failed');
    suite.parsed = assertSuccessfulTap(suite.stdout);
  } catch (error) {
    primaryError = error;
  }
  let post;
  let cleanupError;
  try {
    post = runState('post');
    assertCleanup(pre.state, post.state);
  } catch (error) {
    cleanupError = error;
  }
  const protocol = {
    pre,
    negative,
    suite,
    post,
    cleanup: cleanupError ? 'HOLD' : 'PASS',
  };
  if (primaryError || cleanupError) {
    const message = primaryError && cleanupError
      ? `${primaryError.message}; cleanup verification also failed: ${cleanupError.message}`
      : String((primaryError ?? cleanupError).message);
    const combined = new Error(message);
    combined.protocol = protocol;
    throw combined;
  }
  return protocol;
}

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function artifactSnapshot(root = ROOT) {
  return Object.fromEntries(Object.values(HOSTED_FILES).map((relative) => [relative, sha256File(path.join(root, relative))]));
}

export function assertArtifactSnapshot(expected, root = ROOT) {
  const actual = artifactSnapshot(root);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Committed hosted inputs changed during execution');
  return actual;
}

export function assertReviewedArtifacts(reviewedSha, root = ROOT) {
  validateReviewedSha(reviewedSha);
  const ancestry = command('git', ['merge-base', '--is-ancestor', reviewedSha, 'HEAD'], { cwd: root });
  if (ancestry.status !== 0) throw new Error('HEAD does not descend from the independently reviewed SHA');
  const actual = artifactSnapshot(root);
  for (const relative of Object.keys(actual)) {
    const reviewed = command('git', ['show', `${reviewedSha}:${relative}`], { cwd: root });
    if (reviewed.status !== 0) throw new Error(`Reviewed SHA does not contain hosted artifact: ${relative}`);
    const reviewedHash = createHash('sha256').update(reviewed.stdout).digest('hex');
    if (actual[relative] !== reviewedHash) throw new Error(`Hosted artifact differs from reviewed SHA: ${relative}`);
  }
  return actual;
}

function command(bin, args, options = {}) {
  const result = spawnSync(bin, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1' },
    ...options,
  });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

export function assertAllowedStderr(stderr) {
  const remaining = String(stderr)
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .filter((line) => !/^A new version of Supabase CLI is available: v\d+\.\d+\.\d+ \(currently installed v\d+\.\d+\.\d+\)$/.test(line))
    .filter((line) => !/^We recommend updating regularly for new features and bug fixes: https:\/\/supabase\.com\/docs\/guides\/cli\/getting-started#updating-the-supabase-cli$/.test(line));
  if (remaining.length) throw new Error('Supabase CLI emitted unexpected stderr');
  return true;
}

function successfulCommand(bin, args, label) {
  const result = command(bin, args);
  if (result.status !== 0) throw new Error(`${label} failed with exit ${result.status}`);
  return result;
}

function git(...args) {
  return successfulCommand('git', args, `git ${args[0]}`).stdout.trim();
}

function verifyLocalSource(reviewedSha) {
  if (git('status', '--porcelain=v1')) throw new Error('Working tree must be clean before hosted execution');
  const ancestry = command('git', ['merge-base', '--is-ancestor', ACCEPTED_INTEGRATION_SHA, 'HEAD']);
  if (ancestry.status !== 0) throw new Error('HEAD does not descend from the accepted integration SHA');
  for (const [relative, expected] of Object.entries(EXPECTED_ARTIFACTS)) {
    const actual = sha256File(path.join(ROOT, relative));
    if (actual !== expected) throw new Error(`Accepted limiter artifact bytes changed: ${relative}`);
  }
  assertReviewedArtifacts(reviewedSha);
  return { sha: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') };
}

function redactDiagnostic(input) {
  return String(input)
    .replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s/]+@/gi, '$1[REDACTED]@')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED JWT]')
    .replace(/\bsb_secret_[A-Za-z0-9_-]{20,}\b/g, '[REDACTED KEY]');
}

function safeWrite(file, content) {
  fs.writeFileSync(file, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

function writeRaw(receiptDir, name, result) {
  safeWrite(path.join(receiptDir, `${name}.stdout.txt`), result.stdout);
  safeWrite(path.join(receiptDir, `${name}.stderr.txt`), redactDiagnostic(result.stderr));
}

function dbQuery(projectRef, relativeFile) {
  return command('supabase', [
    'db', 'query', '--project-ref', projectRef,
    '--file', path.join(ROOT, relativeFile), '--output-format', 'json',
  ]);
}

function main(argv) {
  const args = parseArgs(argv);
  validateTarget(args);
  validateReviewedSha(args.reviewedSha);
  const source = verifyLocalSource(args.reviewedSha);
  const artifacts = assertReviewedArtifacts(args.reviewedSha);
  if (fs.existsSync(args.receiptDir)) throw new Error(`Receipt directory already exists: ${args.receiptDir}`);
  fs.mkdirSync(args.receiptDir, { recursive: true, mode: 0o700 });

  const target = {
    id: args.branchId,
    projectRef: args.projectRef,
    verification: 'explicit exact tokens plus accepted database ledger and contract',
    productionContact: false,
  };

  const raw = {};
  let result;
  let failure;
  try {
    result = executeProtocol({
      runState(label) {
        assertReviewedArtifacts(args.reviewedSha);
        const response = dbQuery(args.projectRef, HOSTED_FILES.state);
        raw[label] = response;
        if (response.status !== 0) throw new Error(`${label} state query failed with exit ${response.status}`);
        assertAllowedStderr(response.stderr);
        assertReviewedArtifacts(args.reviewedSha);
        return { ...response, state: extractState(response.stdout) };
      },
      runNegative() {
        assertArtifactSnapshot(artifacts);
        assertReviewedArtifacts(args.reviewedSha);
        const response = dbQuery(args.projectRef, HOSTED_FILES.negative);
        raw.negative = response;
        assertAllowedStderr(response.stderr);
        return response;
      },
      runSuite() {
        assertArtifactSnapshot(artifacts);
        assertReviewedArtifacts(args.reviewedSha);
        const response = dbQuery(args.projectRef, HOSTED_FILES.suite);
        raw.suite = response;
        assertAllowedStderr(response.stderr);
        return response;
      },
    });
  } catch (error) {
    failure = error;
    result = error.protocol;
  }

  for (const [name, response] of Object.entries(raw)) writeRaw(args.receiptDir, name, response);
  const receipt = {
    receiptVersion: 1,
    runUnit: 'FDA028_HOSTED_HARNESS_REPAIR',
    generatedAtUtc: new Date().toISOString(),
    status: failure ? 'HOLD' : 'PASS',
    target,
    source,
    reviewedSha: args.reviewedSha,
    acceptedIntegrationSha: ACCEPTED_INTEGRATION_SHA,
    expectedLedger: EXPECTED_LEDGER,
    artifactSha256: artifacts,
    negativeControl: result?.negative?.parsed ?? null,
    hostedAcceptance: result?.suite?.parsed ? {
      plan: result.suite.parsed.plan,
      passed: result.suite.parsed.passed,
      failed: result.suite.parsed.failed,
    } : null,
    cleanup: result?.cleanup ?? (raw.post ? 'HOLD' : 'UNVERIFIED'),
    preState: result?.pre?.state ?? null,
    postState: result?.post?.state ?? null,
    failure: failure ? String(failure.message) : null,
    command: [
      'node', 'scripts/run-fda028-hosted.mjs',
      '--project-ref', EXPECTED_PROJECT_REF,
      '--branch-id', EXPECTED_BRANCH_ID,
      '--reviewed-sha', args.reviewedSha,
      '--receipt-dir', args.receiptDir,
    ],
  };
  safeWrite(path.join(args.receiptDir, 'RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    status: receipt.status,
    target: receipt.target,
    source: receipt.source,
    negativeControl: receipt.negativeControl,
    hostedAcceptance: receipt.hostedAcceptance,
    cleanup: receipt.cleanup,
    receipt: path.join(args.receiptDir, 'RECEIPT.json'),
    failure: receipt.failure,
  }, null, 2));
  if (failure) process.exitCode = 1;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    console.error(`FDA028 HOSTED HARNESS REFUSED: ${error.message}`);
    process.exitCode = 1;
  }
}
