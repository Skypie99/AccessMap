#!/usr/bin/env node
/**
 * STAGE-MF-02 — structural catalog capture, hashing and residual classification.
 *
 * The first staging run hashed the first-apply catalog and threw the content away.
 * When the reapplied digest turned out to differ (09c42928 vs c70e119a) the delta
 * could not be localised by anyone, including its author. The independent acceptor
 * also noted the digest recipe was never published, so nobody else could reproduce
 * it. Both are fixed here: the recipe is this file, and capture ALWAYS writes the
 * full sanitized JSON before it computes a checksum.
 *
 * Rule: no original artifact, no identity claim.
 *
 * NORMALIZATION
 * -------------
 * A structural comparison must not report a difference that is only a difference in
 * how Postgres happened to serialise something. It must also never hide a real one.
 * So normalization is limited to ORDERING and nothing else:
 *
 *   - every collection is sorted by a stable key derived from its own content;
 *   - ACL arrays (aclitem[]) are parsed into sorted grantee/privilege sets, because
 *     `REVOKE ALL` followed by re-`GRANT` reorders aclitem entries without changing
 *     who can do what. This is the acceptor's leading hypothesis for the hosted
 *     divergence and it is neutralised by comparing sets, not text.
 *
 * WHAT IS AND IS NOT COMPARED
 * ---------------------------
 * An earlier version of this header said "NOTHING structural is excluded". That was
 * an overclaim, and a second independent review disproved it by constructing five
 * authorization changes that produced an IDENTICAL checksum: a SECURITY DEFINER
 * function losing its `SET search_path`, a disabled trigger, a removed trigger WHEN
 * clause, a column default flipped to true, and FORCE ROW LEVEL SECURITY toggled.
 * All five are now captured (proconfig, tgenabled, the full trigger definition,
 * column defaults, relforcerowsecurity) and `triggers` counts as security-relevant.
 *
 * The honest statement is bounded, so state it that way:
 *   SCOPE: the schemas in CAPTURED_SCHEMAS only. Anything outside them is invisible
 *          to this tool by design, and that is a limit, not a guarantee.
 *   WITHIN scope: schemas, relations (incl. RLS + FORCE RLS + ACL), columns (incl.
 *          type, notnull, default, generated, ACL), functions (incl. security
 *          definer, config, leakproof, body hash, ACL), policies, triggers (incl.
 *          enabled state and full definition) and default ACLs.
 *   EXCLUDED: only VOLATILE_FIELDS, each with a written justification.
 *
 * If you add a catalog surface that can carry authorization, add it here too. A
 * checksum is only as honest as its inputs.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 3;

/** The comparison is scoped to these schemas and nothing else. Stated, not implied. */
export const CAPTURED_SCHEMAS = ['public', 'private', 'storage', 'limiter'];
export const CAPTURE_TOOL = 'scripts/structural-catalog.mjs';

/**
 * Fields excluded from the comparison. Each needs a reason that would survive a
 * reviewer asking "could a real regression hide behind this?".
 */
export const VOLATILE_FIELDS = [
  {
    field: 'oid',
    reason: 'Object identifiers are assigned by the server in creation order. Dropping and recreating an identical object changes every oid without changing anything a client can observe. Identity is carried by (schema, name, arguments) instead, which is compared.',
  },
  {
    field: 'relpages / reltuples',
    reason: 'Planner statistics. They change with autovacuum timing and row counts, not with structure. No privilege, policy or definition can hide behind them.',
  },
];

/** The exact catalog query. Published so any reviewer can reproduce a capture. */
export const CATALOG_SQL = `
with s as (select unnest(array['public','private','storage','limiter']) as nspname)
select jsonb_build_object(
  'schemas', coalesce((select jsonb_agg(jsonb_build_object(
      'n', nspname, 'owner', pg_get_userbyid(nspowner), 'acl', nspacl::text)
      order by nspname) from pg_namespace where nspname in (select nspname from s)), '[]'::jsonb),
  'relations', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 'n', c.relname, 'kind', c.relkind, 'rls', c.relrowsecurity,
      'owner', pg_get_userbyid(c.relowner), 'acl', c.relacl::text,
      'forcerls', c.relforcerowsecurity)
      order by n.nspname, c.relname, c.relkind)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (select nspname from s) and c.relkind in ('r','v','m','S','p')), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 't', c.relname, 'c', a.attname,
      'type', format_type(a.atttypid, a.atttypmod), 'notnull', a.attnotnull,
      'acl', a.attacl::text,
      'default', pg_get_expr(ad.adbin, ad.adrelid), 'generated', a.attgenerated)
      order by n.nspname, c.relname, a.attname)
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
    where n.nspname in (select nspname from s) and a.attnum>0 and not a.attisdropped
      and c.relkind in ('r','v','m','p')), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 'n', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
      'secdef', p.prosecdef, 'kind', p.prokind, 'body', md5(coalesce(p.prosrc,'')),
      'acl', p.proacl::text,
      'config', array_to_string(p.proconfig, '|'), 'leakproof', p.proleakproof)
      order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in (select nspname from s)), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(jsonb_build_object(
      's', schemaname, 't', tablename, 'p', policyname, 'cmd', cmd,
      'permissive', permissive, 'roles', roles::text,
      'qual', coalesce(qual,''), 'withcheck', coalesce(with_check,''))
      order by schemaname, tablename, policyname)
    from pg_policies where schemaname in (select nspname from s)), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 't', c.relname, 'g', tg.tgname,
      'fn', tg.tgfoid::regprocedure::text, 'type', tg.tgtype,
      'enabled', tg.tgenabled, 'when', pg_get_triggerdef(tg.oid))
      order by n.nspname, c.relname, tg.tgname)
    from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (select nspname from s) and not tg.tgisinternal), '[]'::jsonb),
  'defaultAcls', coalesce((select jsonb_agg(jsonb_build_object(
      'owner', pg_get_userbyid(d.defaclrole), 's', coalesce(n.nspname,'GLOBAL'),
      'kind', d.defaclobjtype, 'acl', d.defaclacl::text)
      order by pg_get_userbyid(d.defaclrole), coalesce(n.nspname,'GLOBAL'), d.defaclobjtype)
    from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
    where n.nspname in (select nspname from s) or d.defaclnamespace=0), '[]'::jsonb)
) as catalog;
`.trim();

/**
 * Parse a Postgres aclitem[] text form into a sorted, order-insensitive set.
 * "{postgres=arwd/postgres,anon=r/postgres}" -> ["anon=r/postgres","postgres=arwd/postgres"]
 * Order is a serialisation artifact; who-can-do-what is the fact.
 */
/**
 * A NULL acl and an EMPTY acl are NOT the same thing and must never collide.
 *   NULL  -> "no explicit ACL": Postgres applies the built-in default, which for a
 *            FUNCTION means EXECUTE to PUBLIC. Permissive.
 *   '{}'  -> an explicit empty ACL: nobody but the owner. Restrictive.
 * A proacl moving '{}' -> NULL silently re-grants PUBLIC EXECUTE. An earlier version
 * of this file coalesced NULL to '' and mapped both to [], so that change produced an
 * identical checksum and diffCaptures() reported `identical: true`. Found by
 * independent review, which was asked to construct exactly this collision.
 */
export const ACL_DEFAULT_SENTINEL = '<no-explicit-acl:postgres-default-applies>';

export function normalizeAcl(aclText) {
  if (aclText === null || aclText === undefined) return [ACL_DEFAULT_SENTINEL];
  const inner = String(aclText).replace(/^\{/, '').replace(/\}$/, '');
  if (!inner.trim()) return [];
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
    .sort();
}

const ACL_KEYS = new Set(['acl']);

/** Recursively normalize a captured catalog: sort collections, set-ify ACLs. */
export function normalizeCatalog(value) {
  if (Array.isArray(value)) {
    const items = value.map(normalizeCatalog);
    return items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = ACL_KEYS.has(key) ? normalizeAcl(value[key]) : normalizeCatalog(value[key]);
    }
    return out;
  }
  return value;
}

export const checksum = (normalized) =>
  createHash('sha256').update(JSON.stringify(normalized)).digest('hex');

/**
 * Write a capture artifact. The CONTENT is written before the checksum is reported,
 * so a later comparison is always possible. This is the whole point of MF-02.
 */
export function writeCapture({ outDir, label, rawCatalog, sourceSha, integrationSha, target }) {
  const normalized = normalizeCatalog(rawCatalog);
  const artifact = {
    schemaVersion: SCHEMA_VERSION,
    label,
    captureTool: CAPTURE_TOOL,
    captureQuerySha256: createHash('sha256').update(CATALOG_SQL).digest('hex'),
    sourceSha: sourceSha ?? null,
    integrationSha: integrationSha ?? null,
    target: target ?? null,
    capturedSchemas: CAPTURED_SCHEMAS,
    scopeCaveat: 'Only the schemas above are compared. Anything outside them is invisible to this tool by design.',
    normalizationRules: [
      'every collection sorted by a stable key derived from its own content',
      'aclitem[] parsed into a sorted set so REVOKE/GRANT reordering is not reported as a difference',
      'a NULL acl is distinguished from an explicitly empty one and never collapses into it',
    ],
    excludedVolatileFields: VOLATILE_FIELDS,
    catalog: normalized,
  };
  artifact.checksum = checksum(normalized);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `CATALOG_${label}.json`);
  fs.writeFileSync(file, JSON.stringify(artifact, null, 2) + '\n');
  return { file, checksum: artifact.checksum };
}

/**
 * Structural diff between two captures. Reports EVERY residual and classifies it.
 * A residual is never suppressed to make two checksums agree.
 */
export function diffCaptures(a, b) {
  const sections = new Set([...Object.keys(a.catalog ?? {}), ...Object.keys(b.catalog ?? {})]);
  const residuals = [];
  for (const section of [...sections].sort()) {
    const left = new Map((a.catalog?.[section] ?? []).map((x) => [JSON.stringify(x), x]));
    const right = new Map((b.catalog?.[section] ?? []).map((x) => [JSON.stringify(x), x]));
    for (const [k, v] of left) if (!right.has(k)) residuals.push({ section, side: 'only-in-first', entry: v });
    for (const [k, v] of right) if (!left.has(k)) residuals.push({ section, side: 'only-in-second', entry: v });
  }
  return {
    identical: residuals.length === 0,
    firstChecksum: a.checksum,
    secondChecksum: b.checksum,
    residualCount: residuals.length,
    residuals,
    // Sections that carry authorization. A residual here is never cosmetic.
    securityRelevantSections: [...new Set(residuals.map((r) => r.section))]
      .filter((s) => ['policies', 'functions', 'columns', 'relations', 'schemas', 'defaultAcls', 'triggers'].includes(s)),
  };
}

// ---------------------------------------------------------------------------
// CLI.
//   node scripts/structural-catalog.mjs sql
//        prints the exact capture query, to be run READ-ONLY against a target.
//   node scripts/structural-catalog.mjs capture --label FIRST_APPLY --in <raw.json> \
//        --out <dir> [--source-sha X] [--integration-sha Y] [--target REF]
//        writes CATALOG_<label>.json — full content first, checksum second.
//   node scripts/structural-catalog.mjs diff --first <a.json> --second <b.json>
//        prints every residual and exits non-zero if any exist.
// This tool never connects to a database.
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flag = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };

  if (cmd === 'sql') { console.log(CATALOG_SQL); process.exit(0); }

  if (cmd === 'capture') {
    const label = flag('label');
    const input = flag('in');
    if (!label || !input) { console.error('ERROR: --label and --in are required'); process.exit(2); }
    const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
    const res = writeCapture({
      outDir: flag('out', '.'), label,
      rawCatalog: raw.catalog ?? raw,
      sourceSha: flag('source-sha'), integrationSha: flag('integration-sha'), target: flag('target'),
    });
    console.log(JSON.stringify(res, null, 2));
    console.error(`OK: content written to ${res.file} BEFORE the checksum was taken.`);
    process.exit(0);
  }

  if (cmd === 'diff') {
    const a = JSON.parse(fs.readFileSync(flag('first'), 'utf8'));
    const b = JSON.parse(fs.readFileSync(flag('second'), 'utf8'));
    const d = diffCaptures(a, b);
    console.log(JSON.stringify(d, null, 2));
    if (!d.identical) {
      console.error(`${d.residualCount} residual(s); security-relevant sections: ${d.securityRelevantSections.join(', ') || 'none'}`);
      process.exit(1);
    }
    console.error('OK: captures are structurally identical.');
    process.exit(0);
  }

  console.error('usage: structural-catalog.mjs <sql|capture|diff> [flags] (see header)');
  process.exit(2);
}
