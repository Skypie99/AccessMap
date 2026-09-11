/**
 * Independent CODE review 2026-09-11 — the two MUST-FIX and one SHOULD-FIX.
 *
 * All three were reproduced before being fixed; these pin the fixes.
 */
import { execFileSync } from 'node:child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const FIXTURE = 'supabase/tests/phase03a-fixtures/contaminated-staging-ledger.json';

function cli(args: string[], env: NodeJS.ProcessEnv = {}) {
  try {
    const stdout = execFileSync(process.execPath,
      ['scripts/canonical-migration-identity.mjs', ...args],
      { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 32 * 1024 * 1024 });
    return { code: 0, stdout };
  } catch (e: any) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? '') };
  }
}

describe('MUST-FIX 1 — the detectors must be reachable through the shipped CLI', () => {
  // Before: `plan --ledger <the project's own fixture>` crashed with
  // "ledger is not iterable", and the CLI never supplied knownLocalVersions, so a
  // well-formed real ledger could only ever produce [unauditable ledger]. The
  // headline capability of this whole repair was unreachable from the command line.
  // The module header's own standard: "Guard-rail logic that cannot be run is not
  // a guard rail."
  const run = cli(['plan', '--stage', 'A', '--ledger', FIXTURE]);
  const out = JSON.parse(run.stdout.slice(run.stdout.indexOf('{'), run.stdout.lastIndexOf('}') + 1));

  it('accepts the { rows: [...] } capture shape this repo actually produces', () => {
    expect(run.code).toBe(1);          // refusal, not a crash
    expect(run.stdout).toContain('"refusals"');
  });

  it('derives knownLocalVersions from the tree, with no operator flag', () => {
    expect(out.knownLocalVersionCount).toBeGreaterThan(80);
  });

  it('reproduces the full detection through the CLI, not just the library', () => {
    const tally = (s: string) => out.refusals.filter((r: string) => r.includes(s)).length;
    expect(tally('phantom remote version')).toBe(11);
    expect(tally('wall-clock substitution')).toBe(6);
    expect(tally('impossible ordering')).toBe(8);
    expect(out.ok).toBe(false);
    expect(out.plan).toEqual([]);
  });

  it('refuses a malformed ledger with a message instead of a stack trace', () => {
    const bad = path.join(os.tmpdir(), `bad-ledger-${process.pid}.json`);
    fs.writeFileSync(bad, JSON.stringify({ notRows: [] }));
    const r = cli(['plan', '--stage', 'A', '--ledger', bad]);
    fs.rmSync(bad, { force: true });
    expect(r.code).toBe(2);
    expect(`${r.stderr}`).toMatch(/must be a JSON array|"rows" array/);
    expect(`${r.stderr}`).not.toMatch(/not iterable/);
  });
});

describe('MUST-FIX 2 — the temp root is not whatever TMPDIR happens to say', () => {
  // Before: TMPDIR=$HOME put a disposable workspace directly in the user's home
  // directory, and the destruction guard green-lit removing it. The "home is never
  // touched" invariant was resting on an environment variable.
  const probe = (env: NodeJS.ProcessEnv) => {
    const code =
      `import * as w from './scripts/canonical-apply-workspace.mjs';` +
      `let o;try{const ws=w.createWorkspaceDir({});o={ok:true,ws};}catch(e){o={ok:false,message:String(e.message)};}` +
      `console.log(JSON.stringify(o));`;
    return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code],
      { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } }));
  };

  it('refuses a temp root inside the home directory, and says why', () => {
    const r = probe({ TMPDIR: `${os.homedir()}/` });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/inside the home directory/);
    expect(r.message).toMatch(/TMPDIR/);
    // and nothing was created in $HOME
    expect(fs.readdirSync(os.homedir()).some((n) => n.startsWith('flagstone-p03a-apply-'))).toBe(false);
  });

  it('refuses a temp root inside a git repository', () => {
    const r = probe({ TMPDIR: root });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/inside a git repository|inside the home directory/);
  });

  it('still works with a normal temp root', () => {
    const r = probe({});
    expect(r.ok).toBe(true);
    expect(path.basename(r.ws)).toMatch(/^flagstone-p03a-apply-/);
    const code = `import * as w from './scripts/canonical-apply-workspace.mjs';` +
      `console.log(JSON.stringify(w.destroyWorkspace(${JSON.stringify(r.ws)})));`;
    expect(JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code],
      { cwd: root, encoding: 'utf8' }))).toBe(true);
  });
});

describe('SHOULD-FIX — a valid endpoint without a trailing slash is configured', () => {
  // Before: '^https://[a-z0-9.-]+/' meant "https://host" read as unconfigured and
  // the webhook silently no-op'd, which an operator would read as a broken migration.
  const sql = fs.readFileSync(path.join(root,
    'supabase/migrations-next/phase03a/20260911120000_phase03a_webhook_target_env_scoped.sql'), 'utf8');
  const m = /v_endpoint !~ '([^']+)'/.exec(sql);
  const re = new RegExp(m![1].replace(/\$\)/, '$)'));

  it.each([
    ['https://abc.supabase.co/functions/v1/notify-flag-status', true],
    ['https://abc.supabase.co/', true],
    ['https://abc.supabase.co', true],
    ['https://localhost:54321/f', true],
    ['http://abc.supabase.co/', false],
    ['ftp://abc/', false],
    ['https://', false],
    ['  https://abc/', false],
  ])('%s -> configured=%s', (endpoint, expected) => {
    expect(re.test(endpoint as string)).toBe(expected);
  });

  it('still fails closed before any network call', () => {
    const body = sql.slice(sql.indexOf('DECLARE v_secret'));
    expect(body.indexOf('v_endpoint IS NULL')).toBeLessThan(body.indexOf('net.http_post'));
    expect(sql).not.toMatch(/https:\/\/[a-z]{20}\.supabase\.co/);
  });
});
