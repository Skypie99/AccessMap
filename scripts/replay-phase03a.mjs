/** Phase03A local-only extension to the accepted socket replay harness. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { checkApplicationPrivileges, rehearsePrivilegeGuard } from './check-application-privileges.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const stable = (x) => Array.isArray(x) ? x.map(stable) : x && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
const fingerprint = (x) => hash(JSON.stringify(stable(x)));

export function parseTap(text, expectedPlan) {
  const parser = String.raw`
    my $source = do { local $/; <STDIN> };
    my $p = TAP::Parser->new({tap => $source}); my $bailout = 0;
    while (my $r = $p->next) { $bailout = 1 if $r->is_bailout; }
    my @errors = $p->parse_errors; my @failed = $p->actual_failed;
    my @skipped = $p->skipped; my @todo = $p->todo;
    print JSON::PP->new->canonical->encode({
      planned => $p->tests_planned, executed => $p->tests_run,
      failed => scalar(@failed), skipped => scalar(@skipped), todo => scalar(@todo),
      parseErrors => \@errors, bailout => $bailout,
      parserVersion => $TAP::Parser::VERSION
    });`;
  const result = JSON.parse(execFileSync('/usr/bin/perl', ['-MTAP::Parser', '-MJSON::PP', '-e', parser], {
    input: text, encoding: 'utf8', env: { PATH: '/usr/bin:/bin' },
  }));
  result.passed = expectedPlan > 0 && result.planned === expectedPlan &&
    result.executed === expectedPlan && result.failed === 0 && result.skipped === 0 &&
    result.todo === 0 && result.bailout === 0 && result.parseErrors.length === 0;
  return result;
}

export function replayPhase03a({ root, psql, applySqlFile, comparator, adaptations, pgTapSql, privilegesOnly = false }) {
  const dir = path.join(root, 'supabase/migrations-next/phase03a');
  const contract = JSON.parse(fs.readFileSync(path.join(dir, 'candidate-contract.json')));
  const sqlInventory = (folder, pattern) => fs.readdirSync(folder).filter(file => pattern.test(file)).sort();
  if (JSON.stringify(sqlInventory(dir, /^\d{14}_.*\.sql$/)) !==
      JSON.stringify(contract.migrations.map(m => m.file).sort()) ||
      JSON.stringify(sqlInventory(path.join(dir, 'rollback'), /^\d{14}_.*\.rollback\.sql$/)) !==
      JSON.stringify(contract.migrations.map(m => m.rollback.slice('rollback/'.length)).sort())) {
    throw new Error('Phase03A migration/restoration inventory differs from the reviewed manifest');
  }
  if (!privilegesOnly && !pgTapSql) throw new Error('Phase03A requires the explicitly pinned --phase03a-pgtap-sql file');
  if (!privilegesOnly && hash(fs.readFileSync(pgTapSql)) !== contract.localPgTap.generatedSqlSha256) {
    throw new Error('Phase03A pgTAP source hash mismatch');
  }
  const verified = (relative, digest) => {
    if (!/^[A-Za-z0-9_./-]+$/.test(relative) || relative.split('/').includes('..')) throw new Error('Invalid candidate path');
    const full = path.join(dir, relative);
    if (hash(fs.readFileSync(full)) !== digest) throw new Error(`Phase03A artifact hash mismatch: ${relative}`);
    return full;
  };
  const candidates = contract.migrations.map(m => ({
    ...m, forwardPath: verified(m.file, m.sha256), rollbackPath: verified(m.rollback, m.rollbackSha256),
  }));
  const extraSql = fs.readFileSync(verified('catalog.sql', contract.catalogSqlSha256), 'utf8');
  const guard = contract.privilegeGuard;
  const allowlist = JSON.parse(fs.readFileSync(verified(guard.allowlist, guard.allowlistSha256)));
  const privilegeSql = fs.readFileSync(verified(guard.query, guard.querySha256), 'utf8');
  const capturePrivileges = () => JSON.parse(psql('flagstone_replay', ['-qAtc', privilegeSql]));
  const capture = () => ({ catalog: comparator(), extra: JSON.parse(psql('flagstone_replay', ['-qAtc', extraSql])) });
  const beforeSupplement = capture();
  const supplement = path.join(root, contract.localBaselineSupplement.file);
  if (hash(fs.readFileSync(supplement)) !== contract.localBaselineSupplement.sha256) throw new Error('Local baseline supplement hash mismatch');
  applySqlFile('flagstone_replay', supplement, adaptations);
  const backups = path.join(root, contract.localBaselineBackups.file);
  if (hash(fs.readFileSync(backups)) !== contract.localBaselineBackups.sha256) throw new Error('Backup schema fixture hash mismatch');
  applySqlFile('flagstone_replay', backups, adaptations);
  const before = capture();
  const evidencePath = path.join(root, contract.localBaselineSupplement.evidence);
  if (hash(fs.readFileSync(evidencePath)) !== contract.localBaselineSupplement.evidenceSha256) throw new Error('Baseline evidence hash mismatch');
  const expected = JSON.parse(fs.readFileSync(evidencePath));
  const clients = r => ['anon', 'authenticated', 'service_role'].includes(r.grantee);
  const sorted = rows => rows.map(r => JSON.stringify(stable(r))).sort();
  const aclMatches = {
    columns: [before.extra.columnAcls.filter(clients).map(({schema,table,column,grantee,privilege,grantable}) => ({schema,table,column,grantee,privilege,grantable})), expected.column_acls.map(r => ({schema:r.schema,table:r.table_name,column:r.column_name,grantee:r.grantee,privilege:r.privilege_type,grantable:r.is_grantable}))],
    defaults: [before.extra.defaultAcls.filter(clients).map(({owner,schema,kind,grantee,privilege,grantable}) => ({owner,schema,kind,grantee,privilege,grantable})), expected.default_acls.map(r => ({owner:r.owner_role,schema:r.schema,kind:r.object_type,grantee:r.grantee,privilege:r.privilege_type,grantable:r.is_grantable}))],
    sequences: [before.extra.sequenceAcls.filter(clients).map(({schema,sequence,grantee,privilege,grantable}) => ({schema,sequence,grantee,privilege,grantable})), expected.sequence_acls.map(r => ({schema:r.schema,sequence:r.sequence_name,grantee:r.grantee,privilege:r.privilege_type,grantable:r.is_grantable}))],
  };
  const baselineAclVerification = Object.fromEntries(Object.entries(aclMatches).map(([name, [actual, wanted]]) => [name, { count: actual.length, expected: wanted.length, matches: JSON.stringify(sorted(actual)) === JSON.stringify(sorted(wanted)) }]));
  if (Object.values(baselineAclVerification).some(v => !v.matches)) throw new Error('Supplemented local ACL baseline does not match the saved hosted capture');
  const result = {
    status: 'INCOMPLETE', kind: 'socket-only disposable local PostgreSQL', production: false,
    capturedAtUtc: new Date().toISOString(),
    source: {
      sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim(),
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
      workingTreeClean: execFileSync('git', ['status', '--porcelain=v1'], { cwd: root, encoding: 'utf8' }).trim() === '',
    },
    scope: 'Seven local SQL candidates and effective FDA012 guard; FDA028 and hosted behavior are not accepted here',
    privilegesOnly,
    beforeSupplement, localBaselineSupplement: contract.localBaselineSupplement,
    localBaselineBackups: contract.localBaselineBackups, baselineAclVerification,
    before, beforeSha256: fingerprint(before), migrations: [],
  };
  for (const m of candidates) {
    applySqlFile('flagstone_replay', m.forwardPath, adaptations);
    result.migrations.push({ file: m.file, sha256: m.sha256, appliedLocally: true });
  }
  result.after = capture(); result.afterSha256 = fingerprint(result.after);
  result.privilegeCapture = capturePrivileges();
  result.privilegeGuard = checkApplicationPrivileges(result.privilegeCapture, allowlist);
  result.privilegeGuardRehearsal = rehearsePrivilegeGuard({ allowlist,
    captureWithMutation: sql => JSON.parse(psql('flagstone_replay', ['-qAtc', `BEGIN; ${sql}\n${privilegeSql}\nROLLBACK;`])),
  });

  if (!privilegesOnly) {
    // Only this disposable database receives the upstream SQL. No extension files,
    // pg_extension claim, sharedir writes, hosted connection or package install.
    psql('flagstone_replay', ['-q', '-c', 'CREATE SCHEMA phase03a_tap; SET search_path = phase03a_tap, public, extensions;', '-f', pgTapSql,
      '-c', 'GRANT USAGE ON SCHEMA phase03a_tap TO anon, authenticated, service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA phase03a_tap TO anon, authenticated, service_role;']);
    result.pgTap = { ...contract.localPgTap, installMode: 'upstream_sql_load', installedOnlyInDisposableDatabase: true, suites: [] };
    for (const suite of contract.suites) {
      const suiteFile = path.join(root, suite.file);
      if (hash(fs.readFileSync(suiteFile)) !== suite.sha256) throw new Error(`Suite hash mismatch: ${suite.file}`);
      const tap = psql('flagstone_replay', ['-qAt', '-c', 'SET search_path = public, phase03a_tap, extensions;', '-f', suiteFile]);
      const parsed = parseTap(tap, suite.plan);
      result.pgTap.suites.push({ file: suite.file, sha256: suite.sha256, tap, ...parsed });
    }
  } else {
    result.pgTap = { status: 'NOT_RUN_PRIVILEGE_GUARD_ONLY', suites: [] };
  }

  // Restoration is tested after real role/trigger tests, whose fixtures roll back.
  for (const m of [...candidates].reverse()) applySqlFile('flagstone_replay', m.rollbackPath, adaptations);
  result.restored = capture(); result.restoredSha256 = fingerprint(result.restored);
  result.restorationExact = result.restoredSha256 === result.beforeSha256;
  for (const m of candidates) applySqlFile('flagstone_replay', m.forwardPath, adaptations);
  result.reapplied = capture(); result.reappliedSha256 = fingerprint(result.reapplied);
  result.reapplyDeterministic = result.reappliedSha256 === result.afterSha256;
  result.reappliedPrivilegeGuard = checkApplicationPrivileges(capturePrivileges(), allowlist);
  result.privilegeProofPassed = result.privilegeGuard.passed && result.privilegeGuardRehearsal.passed &&
    result.reappliedPrivilegeGuard.passed && result.restorationExact && result.reapplyDeterministic;
  result.localProofPassed = !privilegesOnly && result.pgTap.suites.length === contract.suites.length &&
    result.pgTap.suites.length > 0 && result.pgTap.suites.every(s => s.passed) && result.privilegeProofPassed;
  result.status = privilegesOnly ? (result.privilegeProofPassed ? 'LOCAL_PRIVILEGE_GUARD_PASS' : 'LOCAL_PRIVILEGE_GUARD_FAIL') :
    (result.localProofPassed ? 'LOCAL_CANDIDATE_PROOF_PASS' : 'LOCAL_CANDIDATE_PROOF_FAIL');
  result.phaseGate = 'BLOCKED';
  return result;
}
