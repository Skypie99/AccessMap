#!/usr/bin/env node
/** Run the existing MOD1R raising proof in a socket-only disposable cluster. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'supabase', 'tests', 'mod1r_fix1', '00_baseline.sql');
const PROOF = path.join(ROOT, 'supabase', 'tests', 'mod1r_fix1', '10_proof.sql');
const expectedIncludes = [
  'supabase/migrations/20260524211752_feedback_table.sql',
  'supabase/nonmanaged/proposed/20260828040000_mod1_moderation_release_safety.sql',
  'supabase/nonmanaged/proposed/20260828050000_mod1_admin_report_queue.sql',
  'supabase/nonmanaged/proposed/20260828060000_mod1r_fix1_report_and_insert_authz.sql',
  'supabase/nonmanaged/proposed/20260828070000_mod1r_fix1_pending_close_state.sql',
  'supabase/nonmanaged/proposed/20260828080000_mod1r_fix2_action_intent.sql',
];

function pgBin() {
  for (const dir of [process.env.PG_BINDIR, '/opt/homebrew/opt/postgresql@17/bin', '/usr/lib/postgresql/17/bin'].filter(Boolean)) {
    if (fs.existsSync(path.join(dir, 'initdb'))) return dir;
  }
  return null;
}
const BIN = pgBin();
if (!BIN) {
  console.error('UNAVAILABLE: PostgreSQL 17 toolchain absent; MOD1R proof NOT RUN.');
  process.exit(2);
}
const bin = (name) => path.join(BIN, name);
const PG_ENV = {
  PATH: `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`, TMPDIR: os.tmpdir(),
  LC_ALL: 'C', LC_CTYPE: 'C', LANG: 'C', PGTZ: 'UTC',
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flagstone-mod1r-proof-'));
const data = path.join(tmp, 'data');
const socket = path.join(tmp, 'sock');
const log = path.join(tmp, 'postgres.log');
fs.mkdirSync(socket, { recursive: true });
let started = false;

function cleanup() {
  if (started) {
    try { execFileSync(bin('pg_ctl'), ['-D', data, '-m', 'immediate', 'stop'], { stdio: 'ignore', env: PG_ENV }); } catch { /* stopped */ }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.on('exit', cleanup);

try {
  const baseline = fs.readFileSync(BASELINE, 'utf8');
  const includes = [...baseline.matchAll(/^\\i\s+(.+)$/gm)].map((match) => match[1]);
  if (JSON.stringify(includes) !== JSON.stringify(expectedIncludes)) {
    throw new Error('MOD1R fixture include allowlist changed or is out of order');
  }
  for (const relative of includes) {
    if (relative.includes('/destructive-data/') || !fs.existsSync(path.join(ROOT, relative))) {
      throw new Error(`REFUSED invalid MOD1R fixture include: ${relative}`);
    }
  }
  execFileSync(bin('initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-sync'], {
    stdio: ['ignore', 'ignore', 'pipe'], env: PG_ENV,
  });
  fs.appendFileSync(path.join(data, 'postgresql.conf'),
    `\nlisten_addresses = ''\nunix_socket_directories = '${socket}'\nfsync = off\nfull_page_writes = off\n`);
  execFileSync(bin('pg_ctl'), ['-D', data, '-l', log, '-w', 'start'], { stdio: 'ignore', env: PG_ENV });
  started = true;
  execFileSync(bin('createdb'), ['-h', socket, '-U', 'postgres', 'flagstone_mod1r'], { stdio: 'ignore', env: PG_ENV });
  const psqlArgs = ['-X', '-h', socket, '-U', 'postgres', '-d', 'flagstone_mod1r', '-v', 'ON_ERROR_STOP=1'];
  execFileSync(bin('psql'), [...psqlArgs, '-f', BASELINE], { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'], env: PG_ENV });
  const output = execFileSync(bin('psql'), [...psqlArgs, '-f', PROOF], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: PG_ENV,
  });
  if (!output.includes('MOD1R FIX1+FIX2 — ALL 19 PROOF CASES PASSED')) {
    throw new Error('MOD1R proof completed without its 19-case final marker');
  }
  cleanup();
  console.log('MOD1R raising proof: PASS (19 cases; temp cluster destroyed)');
} catch (error) {
  cleanup();
  console.error(String(error.stderr || error.message).split('\n').slice(0, 16).join('\n'));
  process.exit(1);
}
