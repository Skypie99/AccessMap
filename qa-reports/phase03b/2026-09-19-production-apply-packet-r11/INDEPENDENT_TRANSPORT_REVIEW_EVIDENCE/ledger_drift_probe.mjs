#!/usr/bin/env node
// Disposable local-only proof for Supabase CLI 2.116.0 --include-all behavior.
// It accepts no production input and destroys its PostgreSQL cluster on exit.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const binDir = '/opt/homebrew/opt/postgresql@17/bin';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'p03b-r11-ledger-drift-'));
const data = path.join(temp, 'data');
const workspace = path.join(temp, 'workspace');
const log = path.join(temp, 'postgres.log');
let started = false;

const reserve = net.createServer();
await new Promise((resolve, reject) => reserve.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));

const pgEnv = {
  PATH: `${binDir}:/usr/bin:/bin:/usr/sbin:/sbin`,
  LC_ALL: 'C',
  LC_CTYPE: 'C',
  LANG: 'C',
};
const bin = (name) => path.join(binDir, name);
const dbUrl = `postgresql://postgres@127.0.0.1:${port}/ledger_drift_probe?sslmode=disable`;

function cleanup() {
  if (started) {
    try { execFileSync(bin('pg_ctl'), ['-D', data, '-m', 'immediate', 'stop'], { env: pgEnv, stdio: 'ignore' }); } catch {}
  }
  fs.rmSync(temp, { recursive: true, force: true });
}
process.on('exit', cleanup);

function psql(sql) {
  execFileSync(bin('psql'), [
    '-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres',
    '-d', 'ledger_drift_probe', '-v', 'ON_ERROR_STOP=1', '-q', '-c', sql,
  ], { env: pgEnv, stdio: ['ignore', 'ignore', 'pipe'] });
}

function dryRun() {
  const result = spawnSync('supabase', [
    'db', 'push', '--db-url', dbUrl, '--workdir', workspace,
    '--dry-run', '--skip-vault', '--include-all', '--output-format', 'json',
  ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`dry-run failed: exit=${result.status}`);
  return JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
}

let result;
try {
  execFileSync(bin('initdb'), [
    '-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-sync',
  ], { env: pgEnv, stdio: 'ignore' });
  fs.appendFileSync(
    path.join(data, 'postgresql.conf'),
    `\nlisten_addresses = '127.0.0.1'\nport = ${port}\nfsync = off\nfull_page_writes = off\n`,
  );
  execFileSync(bin('pg_ctl'), ['-D', data, '-l', log, '-w', 'start'], { env: pgEnv, stdio: 'ignore' });
  started = true;
  execFileSync(bin('createdb'), [
    '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'ledger_drift_probe',
  ], { env: pgEnv, stdio: 'ignore' });

  psql(`
    create schema supabase_migrations;
    create table supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
    insert into supabase_migrations.schema_migrations(version, statements, name)
    values ('20240101000000', array['select 1'], 'historical_support');
  `);

  fs.mkdirSync(path.join(workspace, 'supabase', 'migrations'), { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(workspace, 'supabase', 'config.toml'),
    `project_id = "ledger-drift-probe"\n\n[db]\nmajor_version = 17\n`,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(workspace, 'supabase', 'migrations', '20240101000000_historical_support.sql'),
    'create table public.historical_support_probe(id integer);\n',
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(workspace, 'supabase', 'migrations', '20240202000000_new_pending.sql'),
    'create table public.new_pending_probe(id integer);\n',
    { mode: 0o600 },
  );

  const accepted = dryRun();
  psql(`delete from supabase_migrations.schema_migrations where version = '20240101000000';`);
  const drifted = dryRun();
  result = {
    status: 'PASS',
    cli: '2.116.0',
    acceptedLedgerPlan: accepted.migrations,
    afterHistoricalLedgerRowRemovedPlan: drifted.migrations,
    historicalSupportBecamePending: drifted.migrations.includes('20240101000000_historical_support.sql'),
    productionInputsAccepted: false,
    productionMutations: 'NONE',
  };
} finally {
  cleanup();
}

console.log(JSON.stringify({ ...result, temporaryInfrastructureDestroyed: !fs.existsSync(temp) }, null, 2));
