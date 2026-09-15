/** FDA-028 hosted harness: target refusal, TAP accounting, and cleanup protocol. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertNegativeControl,
  assertAllowedStderr,
  assertPreflightState,
  assertReviewedArtifacts,
  assertSuccessfulTap,
  executeProtocol,
  extractState,
  parseArgs,
  validateReviewedSha,
  validateTarget,
} from '../run-fda028-hosted.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fresh = 'cepayqmsoqxshsiyqnvz';
const branch = '4a37413a-01c2-4ab2-8bf8-a17a42a549b8';

function validState() {
  return {
    ledger_count: 103,
    ledger_latest: '20260913080000',
    ledger_sha256: '9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316',
    flags: 0,
    buckets: 0,
    grants: 0,
    helpers: 0,
    queued_http: 0,
    vault_secret_rows: 1,
    vault_key_bytes: 32,
    dev_key_material_exists: false,
    key_state: { id: true, epoch: 20711, reseed_anchor: 20706, window_seconds: 86400 },
    config: {
      id: true,
      enabled: true,
      catchup_cap: 32,
      ipv4_prefix: 32,
      ipv6_prefix: 64,
      window_seconds: 86400,
      reseed_interval: 7,
      bucket_allowance: 50,
      normal_allowance: 5,
      require_public_ip: true,
      retention_windows: 1,
    },
    function_contract: { clockless_flag: true, clocked_flag: true, purge: true, purge_at: true },
  };
}

function protocol(mode) {
  const state = validState();
  const post = mode === 'cleanup-fail' ? { ...state, flags: 1 } : state;
  const suite = mode === 'suite-fail'
    ? '1..1\nnot ok 1 - forced suite failure\n'
    : '1..2\nok 1 - one\nok 2 - two\n';
  const events = [];
  try {
    const value = executeProtocol({
      runState(label) {
        events.push(label);
        return { status: 0, stdout: '', stderr: '', state: label === 'pre' ? state : post };
      },
      runNegative() {
        events.push('negative');
        return { status: 0, stdout: '1..1\nnot ok 1 - FDA028 deliberate runner negative control\n', stderr: '' };
      },
      runSuite() {
        events.push('suite');
        return { status: 0, stdout: suite, stderr: '' };
      },
    });
    return { ok: true, events, cleanup: value.cleanup };
  } catch (error) {
    return { ok: false, events, message: String(error.message), cleanup: error.protocol?.cleanup };
  }
}

test('accepts only the exact fresh staging target pairing', () => {
  assert.equal(validateTarget({ projectRef: fresh, branchId: branch }), true);
  for (const candidate of [
    { projectRef: 'kldlwszpfkdmsjrjhjym', branchId: branch },
    { projectRef: 'ctshxbykuemeqnofqcdh', branchId: branch },
    { projectRef: 'aaaaaaaaaaaaaaaaaaaa', branchId: branch },
    { projectRef: fresh, branchId: '11111111-1111-4111-8111-111111111111' },
    { projectRef: `${fresh} --linked`, branchId: branch },
  ]) assert.throws(() => validateTarget(candidate), /Refusing|canonical token/);
});

test('requires one explicit value for each runner argument', () => {
  assert.throws(() => parseArgs(['--branch-id', branch, '--receipt-dir', 'x']), /project-ref/);
  assert.throws(
    () => parseArgs(['--project-ref', fresh, '--branch-id', branch, '--linked', '--receipt-dir', 'x']),
    /prohibited target selector/,
  );
  assert.throws(
    () => parseArgs(['--project-ref', fresh, '--project-ref', fresh, '--branch-id', branch, '--receipt-dir', 'x']),
    /Duplicate/,
  );
  assert.throws(
    () => parseArgs(['--project-ref', fresh, '--branch-id', branch, '--receipt-dir', 'x']),
    /reviewed-sha/,
  );
  assert.equal(validateReviewedSha('a'.repeat(40)), true);
  assert.throws(() => validateReviewedSha('HEAD'), /canonical token/);
});

test('binds every executable hosted artifact to the reviewed Git commit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fda028-reviewed-'));
  try {
    for (const relative of [
      'supabase/tests/fda028/hosted-state.sql',
      'supabase/tests/fda028/hosted-negative-control.sql',
      'supabase/tests/fda028/hosted-acceptance.sql',
      'scripts/run-fda028-hosted.mjs',
    ]) {
      const full = path.join(dir, relative);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, `${relative}\n`);
    }
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'fda028@example.invalid'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'FDA028 Test'], { cwd: dir });
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-qm', 'reviewed'], { cwd: dir });
    const reviewed = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
    assert.deepEqual(Object.keys(assertReviewedArtifacts(reviewed, dir)).sort(), [
      'scripts/run-fda028-hosted.mjs',
      'supabase/tests/fda028/hosted-acceptance.sql',
      'supabase/tests/fda028/hosted-negative-control.sql',
      'supabase/tests/fda028/hosted-state.sql',
    ]);
    fs.appendFileSync(path.join(dir, 'supabase/tests/fda028/hosted-acceptance.sql'), '-- changed\n');
    assert.throws(() => assertReviewedArtifacts(reviewed, dir), /differs from reviewed SHA/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('accepts a complete ordered TAP plan', () => {
  assert.deepEqual(assertSuccessfulTap('1..2\nok 1 - one\nok 2 - two\n'), {
    plan: 2,
    passed: 2,
    failed: 0,
    assertions: [
      { number: 1, description: 'one' },
      { number: 2, description: 'two' },
    ],
  });
});

test('parses TAP rows from JSON-formatted Supabase query output', () => {
  const raw = JSON.stringify([{ plan: '1..2' }, { ok: 'ok 1 - one' }, { ok: 'ok 2 - two' }]);
  assert.equal(assertSuccessfulTap(raw).passed, 2);
});

test('rejects TAP failures, omissions, and duplicate numbering', () => {
  assert.throws(() => assertSuccessfulTap('1..2\nok 1 - one\nnot ok 2 - two\n'), /failing assertion/);
  assert.throws(() => assertSuccessfulTap('1..2\nok 1 - one\n'), /accounting mismatch/);
  assert.throws(() => assertSuccessfulTap('1..2\nok 1 - one\nok 1 - duplicate\n'), /accounting mismatch/);
});

test('rejects skipped, TODO, bailout, and diagnostic TAP paths', () => {
  assert.throws(() => assertSuccessfulTap('1..1\nok 1 - skipped # SKIP unavailable\n'), /skipped or TODO/);
  assert.throws(() => assertSuccessfulTap('1..1\nok 1 - later # TODO repair\n'), /skipped or TODO/);
  assert.throws(() => assertSuccessfulTap('1..1\nBail out! unavailable\n'), /bailout/);
  assert.throws(() => assertSuccessfulTap('1..1\nok 1 - one\n  ---\n  message: bad\n  ...\n'), /diagnostics/);
  assert.throws(() => assertSuccessfulTap('1..1\nok 1 - one\n# unexpected diagnostic\n'), /diagnostic comment/);
});

test('rejects unexpected CLI stderr and allows only the version notice', () => {
  assert.equal(assertAllowedStderr(''), true);
  assert.equal(assertAllowedStderr(
    'A new version of Supabase CLI is available: v2.117.0 (currently installed v2.116.0)\n' +
    'We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli\n',
  ), true);
  assert.throws(() => assertAllowedStderr('warning: query partially failed\n'), /unexpected stderr/);
});

test('requires the exact deliberate negative control', () => {
  assert.deepEqual(
    assertNegativeControl('1..1\nnot ok 1 - FDA028 deliberate runner negative control\n'),
    { plan: 1, passed: 0, failed: 1, detected: true },
  );
  assert.throws(() => assertNegativeControl('1..1\nok 1 - accidental pass\n'), /not detected/);
});

test('extracts and validates nested Supabase state output', () => {
  const state = validState();
  const raw = JSON.stringify([{ fda028_state: state }]);
  assert.deepEqual(extractState(raw), state);
  assert.equal(assertPreflightState(state), true);
  assert.throws(() => assertPreflightState({ ...state, function_contract: {} }), /function contract/);
});

test('verifies cleanup after a passing suite', () => {
  assert.deepEqual(protocol('pass'), {
    ok: true,
    events: ['pre', 'negative', 'suite', 'post'],
    cleanup: 'PASS',
  });
});

test('still verifies cleanup after a failing suite', () => {
  const result = protocol('suite-fail');
  assert.equal(result.ok, false);
  assert.deepEqual(result.events, ['pre', 'negative', 'suite', 'post']);
  assert.match(result.message, /failing assertion/);
  assert.equal(result.cleanup, 'PASS');
});

test('turns residual contamination into a failure', () => {
  const result = protocol('cleanup-fail');
  assert.equal(result.ok, false);
  assert.deepEqual(result.events, ['pre', 'negative', 'suite', 'post']);
  assert.match(result.message, /cleanup mismatch/);
  assert.equal(result.cleanup, 'HOLD');
});

test('hosted SQL uses the real schema, timing, and function signatures', () => {
  const suite = fs.readFileSync(path.join(root, 'supabase/tests/fda028/hosted-acceptance.sql'), 'utf8');
  assert.match(suite, /'no_ramp'/);
  assert.match(suite, /limiter\.admit_guest_flag_at\(/);
  assert.match(suite, /limiter\.admit_guest_flag\(/);
  assert.match(suite, /SELECT window_seconds FROM limiter\.config WHERE id/);
  assert.doesNotMatch(suite, /interval\s+'600 seconds'/i);
});

test('legacy ramp appears only in a caught invalid-value control', () => {
  const suite = fs.readFileSync(path.join(root, 'supabase/tests/fda028/hosted-acceptance.sql'), 'utf8');
  assert.equal((suite.match(/'ramp'/g) ?? []).length, 1);
  assert.match(suite, /EXCEPTION WHEN check_violation/);
  assert.match(suite, /v_constraint = 'flags_category_check'/);
});

test('hosted SQL does not write fixture key material or create helpers', () => {
  const suite = fs.readFileSync(path.join(root, 'supabase/tests/fda028/hosted-acceptance.sql'), 'utf8');
  assert.doesNotMatch(suite, /(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?limiter\.dev_key_material/i);
  assert.doesNotMatch(suite, /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i);
  assert.match(suite, /to_regclass\('limiter\.dev_key_material'\) IS NULL/);
});

test('hosted SQL wraps every mutation in one rollback-only transaction', () => {
  const suite = fs.readFileSync(path.join(root, 'supabase/tests/fda028/hosted-acceptance.sql'), 'utf8');
  assert.ok(suite.trimStart().indexOf('BEGIN;') < suite.indexOf('CREATE TEMP TABLE'));
  assert.ok(suite.trimEnd().endsWith('ROLLBACK;'));
  assert.equal((suite.match(/^BEGIN;/gm) ?? []).length, 1);
  assert.equal((suite.match(/^ROLLBACK;/gm) ?? []).length, 1);
  assert.doesNotMatch(suite, /^COMMIT;/gm);
});

test('hosted SQL plan equals its per-assertion evidence', () => {
  const suite = fs.readFileSync(path.join(root, 'supabase/tests/fda028/hosted-acceptance.sql'), 'utf8');
  const planned = Number(/SELECT plan\((\d+)\)/.exec(suite)?.[1]);
  const assertions = (suite.match(/^SELECT\s+(?:ok|is|isnt|throws_ok)\s*\(/gim) ?? []).length;
  assert.equal(planned, 39);
  assert.equal(assertions, planned);
});

test('hosted SQL executes the public clockless path under service_role', () => {
  const suite = fs.readFileSync(path.join(root, 'supabase/tests/fda028/hosted-acceptance.sql'), 'utf8');
  assert.match(suite, /SET LOCAL ROLE service_role;[\s\S]*limiter\.admit_guest_flag\(/);
  assert.match(suite, /RESET ROLE;[\s\S]*runtime: service_role executes the clockless entry point/);
});

test('state proof records Vault shape without returning secret material', () => {
  const state = fs.readFileSync(path.join(root, 'supabase/tests/fda028/hosted-state.sql'), 'utf8');
  assert.match(state, /octet_length\(limiter\.read_epoch_key\(\)\)/);
  assert.doesNotMatch(state, /decrypted_secret/i);
  assert.doesNotMatch(state, /encode\s*\(\s*limiter\.read_epoch_key/i);
});
