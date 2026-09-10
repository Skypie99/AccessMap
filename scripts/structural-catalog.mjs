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
 * NOTHING structural is excluded. Grants, policies, functions, triggers, columns and
 * schemas are all compared. The only excluded fields are listed in VOLATILE_FIELDS
 * with a justification each, and excluding a field there is a deliberate, reviewable
 * act rather than a convenience.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 2;
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
      'n', nspname, 'owner', pg_get_userbyid(nspowner), 'acl', coalesce(nspacl::text,''))
      order by nspname) from pg_namespace where nspname in (select nspname from s)), '[]'::jsonb),
  'relations', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 'n', c.relname, 'kind', c.relkind, 'rls', c.relrowsecurity,
      'owner', pg_get_userbyid(c.relowner), 'acl', coalesce(c.relacl::text,''))
      order by n.nspname, c.relname, c.relkind)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (select nspname from s) and c.relkind in ('r','v','m','S','p')), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 't', c.relname, 'c', a.attname,
      'type', format_type(a.atttypid, a.atttypmod), 'notnull', a.attnotnull,
      'acl', coalesce(a.attacl::text,''))
      order by n.nspname, c.relname, a.attname)
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (select nspname from s) and a.attnum>0 and not a.attisdropped
      and c.relkind in ('r','v','m','p')), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(jsonb_build_object(
      's', n.nspname, 'n', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
      'secdef', p.prosecdef, 'kind', p.prokind, 'body', md5(coalesce(p.prosrc,'')),
      'acl', coalesce(p.proacl::text,''))
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
      'fn', tg.tgfoid::regprocedure::text, 'type', tg.tgtype)
      order by n.nspname, c.relname, tg.tgname)
    from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (select nspname from s) and not tg.tgisinternal), '[]'::jsonb),
  'defaultAcls', coalesce((select jsonb_agg(jsonb_build_object(
      'owner', pg_get_userbyid(d.defaclrole), 's', coalesce(n.nspname,'GLOBAL'),
      'kind', d.defaclobjtype, 'acl', coalesce(d.defaclacl::text,''))
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
export function normalizeAcl(aclText) {
  if (!aclText) return [];
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
    normalizationRules: [
      'every collection sorted by a stable key derived from its own content',
      'aclitem[] parsed into a sorted set so REVOKE/GRANT reordering is not reported as a difference',
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
      .filter((s) => ['policies', 'functions', 'columns', 'relations', 'schemas', 'defaultAcls'].includes(s)),
  };
}
