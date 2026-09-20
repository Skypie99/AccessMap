#!/usr/bin/env node
// Focused tests for the exact-allowlist preexisting-backup-table structure
// exclusion. Synthetic fixtures only in this file; the separate offline replay
// (replay_preexisting_structure_exclusion_offline.mjs) proves the exclusion
// against real captured production evidence. No production or staging contact.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffCaptures, normalizeCatalog, checksum } from '../../../scripts/structural-catalog.mjs';
import {
  PREEXISTING_STRUCTURE_EXCLUSIONS,
  applyPreexistingStructureExclusions,
} from './preexisting_structure_exclusions.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = join(PACKET, '../../..');
const holds = (operation) => { try { operation(); return false; } catch { return true; } };
const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

const relation = (s, n, extra = {}) => ({ s, n, kind: 'r', owner: 'postgres', acl: null, forcerls: false, reloptions: '', ...extra });
const column = (s, t, c, extra = {}) => ({ s, t, c, type: 'text', notnull: false, acl: null, default: null, generated: '', ...extra });
const baseCatalog = () => ({ schemas: [], relations: [], columns: [], functions: [], policies: [], triggers: [], roles: [], defaultAcls: [] });

// A catalog carrying exactly the 7 pinned tables, plus 2 unrelated real objects
// (one Phase03B-relevant relation, one non-excluded relation) as controls.
function catalogWithPinnedTablesPlus(extraRelations = [], extraColumns = []) {
  const cat = baseCatalog();
  cat.relations = [
    ...PREEXISTING_STRUCTURE_EXCLUSIONS.map((e) => relation(e.schema, e.table)),
    relation('public', 'flags'),
    ...extraRelations,
  ];
  cat.columns = [
    ...PREEXISTING_STRUCTURE_EXCLUSIONS.map((e) => column(e.schema, e.table, 'id')),
    column('public', 'flags', 'id'),
    ...extraColumns,
  ];
  return cat;
}

const checks = {};

// 1. exact seven approved tables -> excluded
{
  const result = applyPreexistingStructureExclusions(catalogWithPinnedTablesPlus());
  const remainingPinned = result.relations.filter((r) =>
    PREEXISTING_STRUCTURE_EXCLUSIONS.some((e) => e.schema === r.s && e.table === r.n));
  checks.exactSevenApprovedTablesExcluded = remainingPinned.length === 0 &&
    result.relations.some((r) => r.s === 'public' && r.n === 'flags');
  const remainingPinnedColumns = result.columns.filter((c) =>
    PREEXISTING_STRUCTURE_EXCLUSIONS.some((e) => e.schema === c.s && e.table === c.t));
  checks.exactSevenApprovedTableColumnsExcluded = remainingPinnedColumns.length === 0 &&
    result.columns.some((c) => c.s === 'public' && c.t === 'flags');
}

// 4. an eighth similarly named backup table -> NOT excluded
{
  const eighth = relation('public', 'bk_2026_08_22_flags_copy2');
  const result = applyPreexistingStructureExclusions(catalogWithPinnedTablesPlus([eighth]));
  checks.eighthSimilarlyNamedTableNotExcluded = result.relations.some((r) => r.s === 'public' && r.n === 'bk_2026_08_22_flags_copy2');
}

// 5. prefix-match-only table -> NOT excluded
{
  const prefixOnly = relation('public', 'bk_2026_08_22_flags_extra_suffix');
  const result = applyPreexistingStructureExclusions(catalogWithPinnedTablesPlus([prefixOnly]));
  checks.prefixMatchOnlyTableNotExcluded = result.relations.some((r) => r.s === 'public' && r.n === 'bk_2026_08_22_flags_extra_suffix');
}

// 6. wrong schema + same table name -> NOT excluded
{
  const wrongSchema = relation('private', 'bk_2026_08_22_flags');
  const result = applyPreexistingStructureExclusions(catalogWithPinnedTablesPlus([wrongSchema]));
  checks.wrongSchemaSameTableNameNotExcluded = result.relations.some((r) => r.s === 'private' && r.n === 'bk_2026_08_22_flags');
}

// 7. missing one of the exact seven -> does not silently broaden exclusion
{
  const cat = baseCatalog();
  cat.relations = PREEXISTING_STRUCTURE_EXCLUSIONS.slice(0, 6).map((e) => relation(e.schema, e.table));
  cat.columns = [];
  checks.missingOnePinnedTableHoldsInsteadOfBroadening = holds(() => applyPreexistingStructureExclusions(cat));
}

// 8. Phase03B-created object -> NOT excluded
{
  const result = applyPreexistingStructureExclusions(catalogWithPinnedTablesPlus());
  checks.phase03bObjectNotExcluded = result.relations.some((r) => r.s === 'public' && r.n === 'flags');
}

// 9. permission/RLS difference on a nonexcluded object -> HOLD (comparator still catches real defects)
{
  const expected = normalizeCatalog({ ...baseCatalog(), relations: [relation('public', 'flags', { acl: '{postgres=arwd/postgres}' })] });
  const observedDifferentAcl = normalizeCatalog({ ...baseCatalog(), relations: [relation('public', 'flags', { acl: '{postgres=arwd/postgres,anon=r/postgres}' })] });
  const diff = diffCaptures(
    { catalog: expected, checksum: checksum(expected) },
    { catalog: observedDifferentAcl, checksum: checksum(observedDifferentAcl) },
  );
  checks.rlsAclDifferenceOnNonExcludedObjectStillDetected = !diff.identical && diff.securityRelevantSections.includes('relations');
}

// 10. trigger/function/policy difference -> HOLD (comparator still catches real defects)
{
  const expected = normalizeCatalog({ ...baseCatalog(), triggers: [{ s: 'public', t: 'flags', g: 'some_trigger', fn: 'f()', type: 7, enabled: 'O', when: 'CREATE TRIGGER some_trigger ...' }] });
  const observedDisabled = normalizeCatalog({ ...baseCatalog(), triggers: [{ s: 'public', t: 'flags', g: 'some_trigger', fn: 'f()', type: 7, enabled: 'D', when: 'CREATE TRIGGER some_trigger ...' }] });
  const diff = diffCaptures(
    { catalog: expected, checksum: checksum(expected) },
    { catalog: observedDisabled, checksum: checksum(observedDisabled) },
  );
  checks.triggerDifferenceOnNonExcludedObjectStillDetected = !diff.identical && diff.securityRelevantSections.includes('triggers');
}

// 11. frozen migration bytes unchanged
{
  const m1 = join(ROOT, 'supabase/migrations-next/phase03b/20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql');
  const m2 = join(ROOT, 'supabase/migrations-next/phase03b/20260915210413_phase03b_points_integrity.sql');
  checks.migration1BytesUnchanged = sha256File(m1) === 'b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11';
  checks.migration2BytesUnchanged = sha256File(m2) === '0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5';
}

// 12/13. re-run the EXISTING, unmodified ledger-statement-identity validator; require PASS at exactly 23/23
{
  const out = execFileSync('node', [join(PACKET, 'validate_ledger_statement_identity.mjs')], { encoding: 'utf8' });
  const receipt = JSON.parse(out);
  checks.ledgerIdentity6823StillPass = receipt.status === 'PASS' &&
    receipt.rows[0].statement_count === 68 && receipt.rows[1].statement_count === 23;
  checks.priorLedgerIdentityTestsNoRegression = receipt.status === 'PASS' && receipt.passed === 23 && receipt.total === 23;
}

// 14. re-run the EXISTING, unmodified recovery-transport validator; require PASS at exactly 13/13
{
  const out = execFileSync('node', [join(PACKET, 'validate_post_apply_recovery_transport.mjs')], { encoding: 'utf8' });
  const receipt = JSON.parse(out);
  checks.priorRecoveryTransportTestsNoRegression = receipt.status === 'PASS' && receipt.passed === 13 && receipt.total === 13;
}

// Exclusion contract shape checks (no wildcard, no prefix, exactly 7)
checks.exactlySevenPinnedExclusions = PREEXISTING_STRUCTURE_EXCLUSIONS.length === 7;
checks.noWildcardOrRegexInPinnedNames = PREEXISTING_STRUCTURE_EXCLUSIONS.every((e) =>
  !/[*%[\]().+?^$]/.test(e.table) && e.table.startsWith('bk_2026_08_22_'));
checks.allPinnedSchemasArePublic = PREEXISTING_STRUCTURE_EXCLUSIONS.every((e) => e.schema === 'public');

const passed = Object.values(checks).filter(Boolean).length;
const total = Object.keys(checks).length;
const receipt = {
  status: passed === total ? 'PASS' : 'HOLD',
  scope: 'STRUCTURE_EQUIVALENCE_ONLY',
  pinnedExclusionCount: PREEXISTING_STRUCTURE_EXCLUSIONS.length,
  pinnedExclusions: PREEXISTING_STRUCTURE_EXCLUSIONS,
  checks,
  passed,
  total,
  productionMutations: 'NONE',
  productionContact: 'NONE',
};
console.log(JSON.stringify(receipt, null, 2));
if (receipt.status !== 'PASS') process.exitCode = 1;
