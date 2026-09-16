#!/usr/bin/env node
/**
 * Phase03B socket-only PostgreSQL replay.
 *
 * Builds the accepted local baseline in a disposable cluster, applies Phase03A
 * Stage A plus Phase03B, runs the two Phase03B pgTAP suites, rehearses the safe
 * capability-off rollbacks, reapplies, and reruns the suites. It accepts no
 * hosted address or credential and disables TCP.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.find((value) => value.startsWith('--pgtap-sql='));
if (!arg) throw new Error('Required: --pgtap-sql=/absolute/path/to/pgtap.sql');
const PGTAP = path.resolve(arg.slice('--pgtap-sql='.length));
if (!fs.existsSync(PGTAP)) throw new Error('pgTAP SQL source does not exist');

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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flagstone-phase03b-'));
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
}

function normalizedDump() {
  return execFileSync(bin('pg_dump'), [
    '-h', sock, '-U', 'postgres', '-d', 'flagstone_replay',
    '--schema-only', '--no-owner', '-n', 'public', '-n', 'private',
  ], { env: PG_ENV, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .filter((line) => !/^\\(un)?restrict\s/.test(line))
    .join('\n');
}

function runSuites(label, suites = [
  'phase03b-compatibility.test.sql',
  'phase03b-moderation.test.sql',
  'phase03b-points.test.sql',
]) {
  return suites.map((suite) => {
    const output = psql([
      '-qAt', '-c', 'set search_path = public, phase03b_tap, extensions;',
      '-f', path.join(ROOT, 'supabase/tests', suite),
    ]);
    const failed = output.split('\n').filter((line) => /^not ok\b/i.test(line.trim()));
    if (failed.length) throw new Error(`${label} ${suite}: ${failed.join(' | ')}\n${output}`);
    return { suite, passed: true, outputSha256: createHash('sha256').update(output).digest('hex') };
  });
}

const result = {
  status: 'ERROR',
  target: 'socket-only disposable PostgreSQL',
  tcpDisabled: true,
  productionInputsAccepted: false,
  tests: [],
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
  const contract = JSON.parse(fs.readFileSync(path.join(phase03aDir, 'candidate-contract.json')));
  const phase03a = contract.migrations.filter((entry) => entry.applyStage === 'A');
  for (const entry of phase03a) apply(path.join(phase03aDir, entry.file));

  const phase03bDir = path.join(nextDir, 'phase03b');
  psql([
    '-q',
    '-c', 'create schema phase03b_tap; set search_path = phase03b_tap, public, extensions;',
    '-f', PGTAP,
    '-c', 'grant usage on schema phase03b_tap to anon, authenticated, service_role; grant execute on all functions in schema phase03b_tap to anon, authenticated, service_role;',
  ]);

  const forward = [
    '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql',
    '20260915210413_phase03b_points_integrity.sql',
  ];
  apply(path.join(phase03bDir, forward[0]));
  result.prePointsCompatibility = runSuites(
    'after moderation migration',
    ['phase03b-compatibility.test.sql'],
  );
  apply(path.join(phase03bDir, forward[1]));
  result.tests.push({ phase: 'forward', suites: runSuites('forward') });
  const forwardDump = normalizedDump();

  apply(path.join(phase03bDir, 'rollback/20260915210413_phase03b_points_integrity.rollback.sql'));
  apply(path.join(phase03bDir, 'rollback/20260915210256_phase03b_moderation_semantics_compatibility_bridge.rollback.sql'));
  const safeState = JSON.parse(psql(['-qAtc', `
    begin;
    insert into auth.users(id,email,raw_user_meta_data) values
      ('ba000000-0000-4000-8000-000000000001','rollback-owner@example.invalid','{}'),
      ('ba000000-0000-4000-8000-000000000002','rollback-community@example.invalid','{}');
    insert into public.flags(id,user_id,lat,lng,category,severity,status)
    values
      ('bb000000-0000-4000-8000-000000000001','ba000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'open'),
      ('bb000000-0000-4000-8000-000000000002','ba000000-0000-4000-8000-000000000001',0,0,'no_ramp',1,'resolved');
    select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000002',true);
    select set_config('request.jwt.claim.role','authenticated',true);
    set local role authenticated;
    do $proof$
    begin
      perform * from public.transition_flag_status(
        'bb000000-0000-4000-8000-000000000001','open','verified',null,null
      );
      perform set_config('phase03b.rollback_community_works','true',true);
      update public.flags
         set status = 'open'
       where id = 'bb000000-0000-4000-8000-000000000002'
         and status = 'resolved';
      perform set_config('phase03b.rollback_direct_bridge_works',found::text,true);
      begin
        perform * from public.transition_flag_status(
          'bb000000-0000-4000-8000-000000000001','verified','rejected','duplicate',null
        );
        perform set_config('phase03b.rollback_reject_blocked','false',true);
      exception when sqlstate '42501' then
        perform set_config('phase03b.rollback_reject_blocked','true',true);
      end;
    end
    $proof$;
    reset role;
    select json_build_object(
      'transition_execute', has_function_privilege('authenticated','public.transition_flag_status(uuid,public.flag_status,public.flag_status,text,uuid)','EXECUTE'),
      'moderate_execute', has_function_privilege('authenticated','public.moderate_report(uuid,text,public.flag_status,text)','EXECUTE'),
      'list_execute', has_function_privilege('authenticated','public.list_open_moderation_reports(integer)','EXECUTE'),
      'direct_status_update', has_column_privilege('authenticated','public.flags','status','UPDATE'),
      'vote_delete', has_table_privilege('authenticated','public.comment_votes','DELETE'),
      'audit_table_retained', to_regclass('public.flag_moderation_events') is not null,
      'claims_retained', to_regclass('public.flag_point_reward_claims') is not null,
      'daily_counter_retained', to_regclass('public.comment_reward_daily') is not null,
      'vote_counter_retained', to_regclass('public.comment_vote_reward_counts') is not null,
      'rejected_hide_policy_retained', exists(select 1 from pg_policy where polrelid='public.flags'::regclass and polname='flags rejected hidden from nonadmins' and not polpermissive),
      'penalty_absent', position('flag_spam_penalty' in pg_get_functiondef('public.handle_flag_status_change()'::regprocedure)) = 0,
      'comment_rewards_disabled', position('point_events' in pg_get_functiondef('public.handle_comment_added()'::regprocedure)) = 0,
      'vote_rewards_disabled', position('point_events' in pg_get_functiondef('public.handle_comment_vote_added()'::regprocedure)) = 0
      ,'community_transition_works', current_setting('phase03b.rollback_community_works')::boolean
      ,'direct_bridge_works', current_setting('phase03b.rollback_direct_bridge_works')::boolean
      ,'reject_capability_off', current_setting('phase03b.rollback_reject_blocked')::boolean
      ,'disabled_milestone_claims_consumed', (select count(*) from public.flag_point_reward_claims where flag_id='bb000000-0000-4000-8000-000000000001')
    );
    rollback;`]).trim().split('\n').filter(Boolean).at(-1));
  const safeExpected = {
    transition_execute: true,
    moderate_execute: false,
    list_execute: false,
    direct_status_update: true,
    vote_delete: false,
    audit_table_retained: true,
    claims_retained: true,
    daily_counter_retained: true,
    vote_counter_retained: true,
    rejected_hide_policy_retained: true,
    penalty_absent: true,
    comment_rewards_disabled: true,
    vote_rewards_disabled: true,
    community_transition_works: true,
    direct_bridge_works: true,
    reject_capability_off: true,
    disabled_milestone_claims_consumed: 2,
  };
  result.safeRollback = { ...safeState, passed: JSON.stringify(safeState) === JSON.stringify(safeExpected) };
  if (!result.safeRollback.passed) throw new Error('Safe compensating rollback assertions failed');

  for (const name of forward) apply(path.join(phase03bDir, name));
  const reappliedDump = normalizedDump();
  result.reapplySchemaExact = forwardDump === reappliedDump;
  if (!result.reapplySchemaExact) throw new Error('Phase03B reapply schema/ACL dump differs from first apply');
  result.tests.push({ phase: 'reapply', suites: runSuites('reapply') });
  result.status = 'PASS';
} catch (error) {
  result.error = String(error.stderr || error.message).split('\n').filter(Boolean).slice(0, 20);
} finally {
  cleanup();
  started = false;
  result.tempDestroyed = !fs.existsSync(tmp);
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'PASS' && result.tempDestroyed ? 0 : 1);
