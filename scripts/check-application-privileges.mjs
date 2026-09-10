/** FDA012 fail-closed validation of a read-only PostgreSQL effective capture. */
const sorted = values => [...values].sort();
const sameSet = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const identity = r => `${r.schema}.${r.name ?? r.signature.replaceAll(', ', ',')}`;

export function checkApplicationPrivileges(capture, allowlist) {
  const failures = [];
  const fail = message => failures.push(message);
  if (capture.version !== 1 || allowlist.version !== 1) fail('Unsupported privilege contract/capture version');
  const compare = (actual, expected, label) => {
    if (!Array.isArray(actual) || !sameSet(actual, expected)) fail(`${label}: expected ${JSON.stringify(sorted(expected))}; got ${JSON.stringify(actual)}`);
  };
  const inventory = (kind, visit) => {
    const expected = new Map(allowlist[kind].map(row => [identity(row), row]));
    const seen = new Set();
    if (!Array.isArray(capture[kind])) { fail(`Missing ${kind} inventory`); return; }
    for (const actual of capture[kind]) {
      const id = identity(actual);
      if (seen.has(id)) fail(`Duplicate ${kind} identity: ${id}`);
      seen.add(id);
      const wanted = expected.get(id);
      if (!wanted) { fail(`Unreviewed ${kind} object: ${id}`); continue; }
      if (actual.owner !== wanted.owner || actual.owner !== 'postgres') fail(`Unexpected owner: ${id}`);
      visit(actual, wanted, id);
    }
    for (const [id, row] of expected) if (row.required !== false && !seen.has(id)) fail(`Missing ${kind} object: ${id}`);
  };
  inventory('relations', (actual, wanted, id) => {
    if (actual.kind !== wanted.kind) fail(`Unexpected relation kind: ${id}`);
    if (wanted.requireRls && actual.rls !== true) fail(`RLS disabled: ${id}`);
    if (wanted.requireSecurityInvoker && actual.securityInvoker !== true) fail(`Invoker protection missing: ${id}`);
    compare(actual.columns, wanted.columns, `${id} column inventory`);
    for (const role of allowlist.roles) {
      const grant = actual.roles?.[role]; const approved = wanted[role];
      if (!grant) { fail(`${id} missing effective role: ${role}`); continue; }
      compare(grant.tablePrivileges, approved.tablePrivileges, `${id} ${role} table privileges`);
      compare(grant.tableGrantOptions, [], `${id} ${role} table grant options`);
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) {
        const columns = approved.tablePrivileges.includes(privilege) ? wanted.columns : approved.columnPrivileges[privilege] ?? [];
        compare(grant.columnPrivileges?.[privilege], columns, `${id} ${role} ${privilege} columns`);
        compare(grant.columnGrantOptions?.[privilege], [], `${id} ${role} ${privilege} column grant options`);
      }
    }
  });
  inventory('sequences', (actual, wanted, id) => {
    for (const role of allowlist.roles) {
      compare(actual.roles?.[role]?.privileges, wanted[role], `${id} ${role} sequence privileges`);
      compare(actual.roles?.[role]?.grantOptions, [], `${id} ${role} sequence grant options`);
    }
  });
  inventory('functions', (actual, wanted, id) => {
    if (actual.kind !== 'f' || actual.securityDefiner !== wanted.securityDefiner) fail(`Routine execution identity changed: ${id}`);
    for (const role of allowlist.roles) {
      if (actual.roles?.[role]?.execute !== wanted.EXECUTE[role]) fail(`${id} ${role} EXECUTE differs`);
      if (actual.roles?.[role]?.grantOption !== false) fail(`${id} ${role} EXECUTE grant option`);
    }
  });
  for (const [schema, rules] of Object.entries(allowlist.schemas)) for (const role of allowlist.roles) {
    compare(capture.schemas?.[schema]?.[role]?.privileges, rules[role], `${schema} ${role} schema privileges`);
    compare(capture.schemas?.[schema]?.[role]?.grantOptions, [], `${schema} ${role} schema grant options`);
  }
  for (const [role, rules] of Object.entries(allowlist.roleAttributes)) for (const [attribute, value] of Object.entries(rules)) {
    if (capture.roleAttributes?.[role]?.[attribute] !== value) fail(`${role} ${attribute} changed`);
  }
  if (!Array.isArray(capture.memberships) || capture.memberships.length) fail('Unreviewed client/service role membership');
  if (!Array.isArray(capture.defaults)) fail('Missing default ACL capture');
  for (const row of capture.defaults ?? []) {
    if (row.owner === 'postgres' && row.reachableBy.length) fail(`Application default grants ${row.privilege} to ${row.grantee} in ${row.schema}`);
  }
  const managedDefaults = (capture.defaults ?? []).filter(row => row.owner === 'supabase_admin');
  return {
    passed: failures.length === 0, failures,
    counts: Object.fromEntries(['relations', 'sequences', 'functions'].map(kind => [kind, capture[kind]?.length ?? 0])),
    managedDefaults: { classification: 'MANAGED_PLATFORM_RESIDUAL', rows: managedDefaults, changedByPhase03a: false },
    scope: 'Flagstone-owned application objects; no platform-wide hardening claim',
  };
}

/** Each transaction mutates only the disposable replay DB and rolls back. */
export function rehearsePrivilegeGuard({ captureWithMutation, allowlist }) {
  const cases = [
    ['new table', 'CREATE TABLE public.fda012_probe(id integer); GRANT SELECT ON public.fda012_probe TO anon;'],
    ['new view', 'CREATE VIEW public.fda012_probe AS SELECT 1 AS id; GRANT SELECT ON public.fda012_probe TO anon;'],
    ['new sequence', 'CREATE SEQUENCE public.fda012_probe; GRANT USAGE ON public.fda012_probe TO anon;'],
    ['new function', "CREATE FUNCTION public.fda012_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1'; GRANT EXECUTE ON FUNCTION public.fda012_probe() TO anon;"],
    ['new overload', "CREATE FUNCTION public.current_user_can_admin(integer) RETURNS boolean LANGUAGE sql AS 'SELECT false';"],
    ['missing RLS', 'ALTER TABLE public.feedback DISABLE ROW LEVEL SECURITY;'],
    ['managed owner', 'ALTER TABLE public.feedback OWNER TO supabase_admin;'],
    ['new column under SELECT', 'ALTER TABLE public.flags ADD COLUMN fda012_unreviewed text;'],
    ['column grant', 'GRANT UPDATE(points) ON public.users TO authenticated;'],
    ['PUBLIC grant', 'GRANT SELECT ON public.users TO PUBLIC;'],
    ['inherited role grant', 'CREATE ROLE fda012_inherited; GRANT SELECT ON public.users TO fda012_inherited; GRANT fda012_inherited TO authenticated;'],
    ['grant option', 'GRANT SELECT ON public.flags TO authenticated WITH GRANT OPTION;'],
    ['service broad DML', 'GRANT INSERT,UPDATE,DELETE ON public.flags TO service_role;'],
    ['service trigger execute', 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;'],
    ['schema CREATE', 'GRANT CREATE ON SCHEMA public TO service_role;'],
    ['future service defaults', 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;'],
    ['future PUBLIC function default', 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;'],
    ['view invoker disabled', 'ALTER VIEW public.flag_edit_history_public SET (security_invoker=false);'],
  ];
  const results = cases.map(([name, sql]) => {
    const result = checkApplicationPrivileges(captureWithMutation(sql), allowlist);
    return { name, sql, rejected: !result.passed, failures: result.failures };
  });
  return { passed: results.length > 0 && results.every(result => result.rejected), cases: results };
}
