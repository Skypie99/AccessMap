#!/usr/bin/env node
// Exact, pinned allowlist of proven-preexisting production-only tables to exclude
// from the Phase03B staging-vs-production STRUCTURE EQUIVALENCE comparison only.
//
// This module never uses a prefix or wildcard match. A relation or column is
// excluded only when (schema, table) is byte-identical to a pinned entry in
// PHASE03B_PREEXISTING_PRODUCTION_STRUCTURE_EXCLUSIONS.json. A new table whose
// name merely resembles a pinned entry (e.g. bk_2026_08_22_new, a different
// schema with the same table name, or an eighth similarly-named table) is never
// excluded, because the match key is (schema, table) equality against the fixed
// pinned array below, not a pattern test.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));

const CONTRACT = JSON.parse(readFileSync(
  join(PACKET, 'PHASE03B_PREEXISTING_PRODUCTION_STRUCTURE_EXCLUSIONS.json'),
  'utf8',
));

if (CONTRACT.scope !== 'STRUCTURE_EQUIVALENCE_ONLY') {
  throw new Error('PHASE03B_PREEXISTING_PRODUCTION_STRUCTURE_EXCLUSIONS.json scope drifted from STRUCTURE_EQUIVALENCE_ONLY');
}
if (!Array.isArray(CONTRACT.exclusions) || CONTRACT.exclusions.length !== 7) {
  throw new Error('PHASE03B_PREEXISTING_PRODUCTION_STRUCTURE_EXCLUSIONS.json must contain exactly 7 pinned exclusions');
}

/** Frozen (schema, table) identity pairs. Exactly 7. No wildcard, no prefix. */
export const PREEXISTING_STRUCTURE_EXCLUSIONS = Object.freeze(
  CONTRACT.exclusions.map((entry) => Object.freeze({ schema: entry.schema, table: entry.table })),
);

const isPinnedExcludedTable = (schema, table) =>
  PREEXISTING_STRUCTURE_EXCLUSIONS.some((entry) => entry.schema === schema && entry.table === table);

/**
 * Remove exactly the pinned preexisting tables (and their columns) from a raw
 * structural-catalog capture, in place semantics via a returned shallow copy.
 * Asserts exactly PREEXISTING_STRUCTURE_EXCLUSIONS.length relations were removed
 * -- not more, not fewer -- so a match-rule regression is caught immediately
 * rather than silently widening or narrowing scope.
 */
export function applyPreexistingStructureExclusions(catalog) {
  const beforeRelations = catalog.relations.length;
  const relations = catalog.relations.filter((item) => !isPinnedExcludedTable(item.s, item.n));
  const removedRelations = beforeRelations - relations.length;
  if (removedRelations !== PREEXISTING_STRUCTURE_EXCLUSIONS.length) {
    throw new Error(`Preexisting-table exclusion cardinality mismatch: removed ${removedRelations} relations, expected exactly ${PREEXISTING_STRUCTURE_EXCLUSIONS.length}`);
  }
  const columns = catalog.columns.filter((item) => !isPinnedExcludedTable(item.s, item.t));
  return { ...catalog, relations, columns };
}
