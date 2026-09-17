#!/usr/bin/env node
/**
 * Socket-only disposable PostgreSQL validation for the proposed Phase 03B
 * quiescence SQL. It accepts no hosted address or credential and disables TCP.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildHermeticWorkdir } from './build_hermetic_workdir.mjs';
import { buildEntryEnvelope, createDeadlines } from './r4_control_lib.mjs';

const PACKET = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(PACKET, '../../..');
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

// Keep the Unix-socket path below PostgreSQL's platform limit on macOS.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p03b-q-'));
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
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.on('exit', cleanup);

const baseArgs = ['-X', '-h', sock, '-U', 'postgres', '-d', 'flagstone_replay', '-v', 'ON_ERROR_STOP=1'];
function psql(args, options = {}) {
  return execFileSync(bin('psql'), [...baseArgs, ...args], {
    env: PG_ENV,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

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
  return psql(['-q', '-f', target]);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function expectBlocked(sql, label) {
  try {
    psql(['-qAtc', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    throw new Error(`${label} unexpectedly succeeded`);
  } catch (error) {
    const stderr = String(error.stderr ?? '');
    if (!stderr.includes('Flag creation, deletion, and status changes are temporarily paused for maintenance.')) {
      throw new Error(`${label} failed for the wrong reason: ${stderr}`);
    }
  }
}

const result = {
  status: 'ERROR',
  target: 'socket-only disposable PostgreSQL 17',
  tcpDisabled: true,
  productionInputsAccepted: false,
  checks: {},
};

try {
  execFileSync(bin('initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-sync'], { env: PG_ENV, stdio: 'ignore' });
  fs.appendFileSync(path.join(data, 'postgresql.conf'), `\nlisten_addresses = ''\nunix_socket_directories = '${sock}'\nfsync = off\nfull_page_writes = off\n`);
  execFileSync(bin('pg_ctl'), ['-D', data, '-l', log, '-w', 'start'], { env: PG_ENV, stdio: 'ignore' });
  started = true;
  execFileSync(bin('createdb'), ['-h', sock, '-U', 'postgres', 'flagstone_replay'], { env: PG_ENV, stdio: 'ignore' });

  const replayDir = path.join(ROOT, 'supabase/replay');
  for (const name of fs.readdirSync(replayDir).filter((name) => /^\d\d_.*\.sql$/.test(name)).sort()) {
    apply(path.join(replayDir, name));
  }
  const crosswalk = JSON.parse(fs.readFileSync(path.join(ROOT, 'supabase/contract/migration-crosswalk.v1.json')));
  const applied = crosswalk.entries
    .filter((entry) => entry.status === 'APPLIED' && entry.file)
    .sort((left, right) => left.version.localeCompare(right.version));
  if (applied.length !== 71) throw new Error(`Expected 71 applied migrations, found ${applied.length}`);
  for (const entry of applied) apply(path.resolve(ROOT, entry.file));

  const nextDir = path.join(ROOT, 'supabase/migrations-next');
  for (const name of fs.readdirSync(nextDir).filter((name) => /^\d{14}_.*\.sql$/.test(name)).sort()) {
    apply(path.join(nextDir, name));
  }
  const phase03aDir = path.join(nextDir, 'phase03a');
  apply(path.join(ROOT, 'supabase/tests/phase03a-fixtures/baseline-extra.sql'));
  apply(path.join(ROOT, 'supabase/tests/phase03a-fixtures/baseline-backups.sql'));
  const phase03a = JSON.parse(fs.readFileSync(path.join(phase03aDir, 'candidate-contract.json')))
    .migrations.filter((entry) => entry.applyStage === 'A');
  for (const entry of phase03a) apply(path.join(phase03aDir, entry.file));

  // Reproduce only the privacy-safe production ledger identities and accepted
  // inert HTTP baseline needed by the exit guard. No customer row is copied.
  const accepted = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'qa-reports/phase03b/2026-09-16-revised-production-dry-run/PRE_SNAPSHOT.json'),
  ));
  const ledgerValues = accepted.ledger.rows
    .map((row) => `(${sqlLiteral(row.version)}, ${sqlLiteral(row.name)}, array[]::text[])`)
    .join(',\n');
  psql(['-q', '-c', `
    insert into supabase_migrations.schema_migrations(version,name,statements)
    values ${ledgerValues};
    create table net.http_request_queue (id bigint);
    create table net._http_response (
      id bigint,
      created timestamptz not null,
      status_code integer,
      timed_out boolean,
      error_msg text
    );
    insert into net._http_response(id,created,status_code,timed_out,error_msg) values
      (67,'2026-09-09T02:37:21.383126Z',200,false,null),
      (68,'2026-09-09T02:37:28.116576Z',400,false,null),
      (69,'2026-09-09T02:37:31.364153Z',400,false,null),
      (70,'2026-09-09T02:37:36.115069Z',400,false,null),
      (71,'2026-09-09T02:37:40.493470Z',400,false,null),
      (72,'2026-09-09T02:37:43.435372Z',400,false,null);
  `]);

  psql(['-q', '-c', `
    insert into auth.users(id,email,raw_user_meta_data) values
      ('aa000000-0000-4000-8000-000000000001','quiescence-owner@example.invalid','{}'),
      ('aa000000-0000-4000-8000-000000000002','quiescence-actor@example.invalid','{}');
    insert into public.flags(id,user_id,lat,lng,category,severity,status)
    values ('ab000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open');
  `]);

  const stateSql = `select json_build_object(
    'status', (select status from public.flags where id='ab000000-0000-4000-8000-000000000001'),
    'history', (select count(*) from public.flag_status_history where flag_id='ab000000-0000-4000-8000-000000000001'),
    'trigger', (select tgenabled from pg_trigger where tgrelid='public.flags'::regclass and tgname='aaa_flagstone_phase03b_row_lifecycle_quiescence_r2' and not tgisinternal),
    'truncateTrigger', (select tgenabled from pg_trigger where tgrelid='public.flags'::regclass and tgname='aaa_flagstone_phase03b_truncate_quiescence_r3' and not tgisinternal),
    'count', (select count(*) from public.flags),
    'fingerprint', encode(extensions.digest(coalesce((select string_agg(id::text||E'\\t'||status::text,E'\\n' order by id) from public.flags),''),'sha256'),'hex')
  )`;
  const before = JSON.parse(psql(['-qAtc', stateSql]).trim());

  const entryOutput = psql(['-qAt', '-f', path.join(PACKET, 'PROPOSED_QUIESCENCE_ENTER.sql')]);
  const entry = JSON.parse(entryOutput.split('\n').find((line) => line.startsWith('{')));
  const entered = JSON.parse(psql(['-qAtc', stateSql]).trim());
  result.checks.gateEnteredAlways = entered.trigger === 'A' && entered.truncateTrigger === 'A';
  const immediateProof = JSON.parse(psql(['-qAt', '-f', path.join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql')]).split('\n').find((line) => line.startsWith('{')));
  const hermetic = buildHermeticWorkdir(path.join(tmp, 'hermetic-workdir'));
  const originMonoMs = Number(process.hrtime.bigint() / 1_000_000n);
  const entryEnvelope = buildEntryEnvelope({
    entry,
    proof: immediateProof,
    inventory: hermetic.inventory,
    deadlines: createDeadlines(originMonoMs),
    controllerPid: process.pid,
    entryStep: { exitCode: 0, childPid: process.pid, startedMonoMs: originMonoMs, endedMonoMs: originMonoMs },
    proofStep: { exitCode: 0, childPid: process.pid, startedMonoMs: originMonoMs, endedMonoMs: originMonoMs },
  });
  result.checks.controllerEnvelopeGeneratedFromRawEntryAndProof = entryEnvelope.packetVersion === 'R4';

  expectBlocked(
    `update public.flags set status='verified' where id='ab000000-0000-4000-8000-000000000001'`,
    'direct status update before migration one',
  );
  expectBlocked(
    `set session_replication_role=replica; update public.flags set status='verified' where id='ab000000-0000-4000-8000-000000000001'`,
    'replica-role bypass attempt',
  );
  expectBlocked(
    `insert into public.flags(id,user_id,lat,lng,category,severity,status) values ('ab000000-0000-4000-8000-000000000002','aa000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open')`,
    'flag insert while quiesced',
  );
  expectBlocked(
    `delete from public.flags where id='ab000000-0000-4000-8000-000000000001'`,
    'flag delete while quiesced',
  );
  result.checks.insertBlocked = true;
  result.checks.deleteBlocked = true;
  expectBlocked('truncate table public.flags cascade', 'flag truncate while quiesced');
  result.checks.truncateBlocked = true;
  expectBlocked(
    `update public.flags set id='ab000000-0000-4000-8000-000000000003' where id='ab000000-0000-4000-8000-000000000001'`,
    'flag identity update while quiesced',
  );
  result.checks.idChangeBlocked = true;
  result.checks.statusChangeBlocked = true;
  result.checks.replicaModeStatusChangeBlocked = true;
  psql(['-q', '-c', `update public.flags set severity=severity where id='ab000000-0000-4000-8000-000000000001'`]);
  result.checks.unrelatedUpdateAllowed = true;

  const phase03bDir = path.join(nextDir, 'phase03b');
  apply(path.join(phase03bDir, '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql'));
  result.checks.migrationOneAppliedWithGate = true;
  expectBlocked(
    `begin; select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true); select set_config('request.jwt.claim.role','authenticated',true); set local role authenticated; select * from public.transition_flag_status('ab000000-0000-4000-8000-000000000001','open','verified',null,null); commit`,
    'authenticated transition RPC between migrations',
  );

  apply(path.join(phase03bDir, '20260915210413_phase03b_points_integrity.sql'));
  psql(['-q', '-c', `
    insert into supabase_migrations.schema_migrations(version,name,statements) values
      ('20260915210256','phase03b_moderation_semantics_compatibility_bridge',array[]::text[]),
      ('20260915210413','phase03b_points_integrity',array[]::text[]);
  `]);
  result.checks.migrationTwoAppliedWithGate = true;
  result.phase03bConstraintIndexSha256 = psql(['-qAtc', `
    with objects as (
      select 'constraint' kind, n.nspname schema_name, c.relname relation_name, con.conname object_name,
        pg_catalog.pg_get_constraintdef(con.oid,true) definition
      from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and (c.relname in ('flag_moderation_events','flag_point_reward_claims','comment_reward_daily','comment_vote_reward_counts')
        or con.conname in ('flags_last_moderation_reason_code_vocabulary','feedback_moderation_resolution_vocabulary','feedback_moderation_action_intent_vocabulary','feedback_moderation_reason_code_vocabulary','feedback_moderation_review_pairing','feedback_reject_reason_pairing'))
      union all
      select 'index', schemaname, tablename, indexname, indexdef from pg_catalog.pg_indexes
      where schemaname='public' and (tablename in ('flag_moderation_events','flag_point_reward_claims','comment_reward_daily','comment_vote_reward_counts')
        or indexname in ('feedback_moderation_open_idx','flag_moderation_events_one_reversal_idx','flag_moderation_events_flag_created_idx','flag_moderation_events_report_reject_idx'))
    ) select encode(extensions.digest(coalesce(string_agg(kind||E'\t'||schema_name||E'\t'||relation_name||E'\t'||object_name||E'\t'||definition,E'\n' order by kind,schema_name,relation_name,object_name),''),'sha256'),'hex') from objects
  `]).trim();
  result.checks.phase03bConstraintsAndIndexesPinned = /^[0-9a-f]{64}$/.test(result.phase03bConstraintIndexSha256);
  expectBlocked(
    `update public.flags set status='verified' where id='ab000000-0000-4000-8000-000000000001'`,
    'direct status update after migration two',
  );

  apply(path.join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql'));
  const held = JSON.parse(psql(['-qAtc', stateSql]).trim());
  result.checks.statusAndHistoryStableWhileQuiesced =
    held.status === before.status && held.history === before.history && held.count === before.count &&
    held.fingerprint === before.fingerprint && held.trigger === 'A' && held.truncateTrigger === 'A';
  result.checks.entryInvariantStable = result.checks.statusAndHistoryStableWhileQuiesced;

  const proof = JSON.parse(psql(['-qAt', '-f', path.join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql')]).split('\n').find((line) => line.startsWith('{')));
  result.checks.preDropOidOwnerHashVerification =
    proof.function_owner === 'postgres' && proof.trigger_table_owner === 'postgres' &&
    proof.function_definition_sha256 === '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac' &&
    proof.trigger_definition_sha256 === 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf' &&
    proof.truncate_trigger_definition_sha256 === '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a';
  const entryPath = path.join(tmp, 'entry.json');
  const exitPath = path.join(tmp, 'exit.sql');
  fs.writeFileSync(entryPath, JSON.stringify(entryEnvelope), { mode: 0o600 });
  execFileSync(process.execPath, [path.join(PACKET, 'generate_exit_sql.mjs'), `--entry=${entryPath}`, `--output=${exitPath}`], { env: PG_ENV, stdio: 'ignore' });
  psql(['-q', '-c', `alter table public.flags disable trigger aaa_flagstone_phase03b_row_lifecycle_quiescence_r2`]);
  try {
    psql(['-q', '-f', exitPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    throw new Error('Exit unexpectedly accepted trigger identity drift');
  } catch (error) {
    const stderr = String(error.stderr ?? '');
    if (!stderr.includes('OID, owner, or enable state changed')) throw error;
  }
  const afterRefusal = JSON.parse(psql(['-qAtc', stateSql]).trim());
  if (afterRefusal.trigger !== 'D') throw new Error('Failed exit did not preserve the drifted gate for adjudication');
  result.checks.exitRefusesIdentityDriftAndDropsNothing = true;
  psql(['-q', '-c', `alter table public.flags enable always trigger aaa_flagstone_phase03b_row_lifecycle_quiescence_r2`]);
  apply(exitPath);
  const exited = JSON.parse(psql(['-qAtc', stateSql]).trim());
  result.checks.gateRemovedAtomically = exited.trigger === null && exited.truncateTrigger === null;
  apply(path.join(PACKET, 'POST_EXIT_VERIFY.sql'));
  result.checks.postExitReadOnlyProofExecutable = true;
  psql(['-q', '-c', `update public.flags set status='verified' where id='ab000000-0000-4000-8000-000000000001'`]);
  const restored = JSON.parse(psql(['-qAtc', stateSql]).trim());
  result.checks.writeRestoredAfterExit = restored.status === 'verified' && restored.history === before.history + 1;

  result.status = Object.values(result.checks).every(Boolean) ? 'PASS' : 'HOLD';
} catch (error) {
  result.error = String(error.stderr || error.message).split('\n').filter(Boolean).slice(0, 20);
} finally {
  cleanup();
  started = false;
  result.tempDestroyed = !fs.existsSync(tmp);
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'PASS' && result.tempDestroyed ? 0 : 1);
