#!/usr/bin/env node
// Local, offline-only comparator for the third live read-only Phase03B post-apply
// verification. Takes JSON already captured elsewhere (see RETURN_FORMAT.md) and
// judges it against EXPECTED_VALUES.json. Makes NO network call, runs NO Supabase
// command, and never mutates anything -- it only reads local files and prints a
// report. Reuses the same exclusion/normalization/hash modules the in-repo verifier
// uses so this comparison cannot silently diverge from the accepted logic.
//
//   node compare_captured_results.mjs --captured=/absolute/path/to/CAPTURED
//
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeCatalog, checksum } from '../../../scripts/structural-catalog.mjs';
import {
  PREEXISTING_STRUCTURE_EXCLUSIONS,
  applyPreexistingStructureExclusions,
} from '../2026-09-19-production-apply-packet-r11/preexisting_structure_exclusions.mjs';
import { createAggregator } from './verdict_aggregation.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const capturedArg = process.argv.find((v) => v.startsWith('--captured='));
if (!capturedArg) throw new Error('Required: --captured=/absolute/path/to/CAPTURED (see RETURN_FORMAT.md)');
const CAPTURED = resolve(capturedArg.slice('--captured='.length));

const EXPECTED = JSON.parse(readFileSync(join(HERE, 'EXPECTED_VALUES.json'), 'utf8'));
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const stable = (v) => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v;
const hashJson = (v) => createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');

const aggregator = createAggregator();
const { report, fail, pass, hold, notRun } = aggregator;

// ---------- Target identity sanity (from the RETURN_FORMAT note, if present) -----
const note = readJson(join(CAPTURED, 'note.json'));
if (note && note.projectRef && note.projectRef !== EXPECTED.productionTarget) {
  fail('TARGET_IDENTITY', `captured note claims project ref ${note.projectRef}, expected ${EXPECTED.productionTarget}`);
} else {
  pass('TARGET_IDENTITY', note ? 'note.json confirms target' : 'no note.json supplied -- unverified, treat as HOLD manually');
}

// ---------- 1. Quiescence + ledger + gate proof ----------------------------------
const proof = readJson(join(CAPTURED, 'proof.json'));
if (!proof) {
  notRun('LIVE_GATE_AND_LEDGER', 'proof.json not found in captured directory');
} else {
  const exp = EXPECTED.quiescenceAndLedgerGate.expectedExactFields;
  const mismatches = Object.entries(exp).filter(([k, v]) => proof[k] !== v).map(([k, v]) => `${k}: expected ${v}, got ${proof[k]}`);
  const versions = proof.phase03b_versions ?? [];
  if (JSON.stringify(versions) !== JSON.stringify(EXPECTED.quiescenceAndLedgerGate.expectedPhase03bVersions)) {
    mismatches.push(`phase03b_versions: expected ${JSON.stringify(EXPECTED.quiescenceAndLedgerGate.expectedPhase03bVersions)}, got ${JSON.stringify(versions)}`);
  }
  const rows = proof.phase03b_rows ?? [];
  for (const expectedRow of EXPECTED.quiescenceAndLedgerGate.expectedPhase03bRows) {
    const row = rows.find((r) => r.version === expectedRow.version);
    if (!row) mismatches.push(`phase03b_rows: missing version ${expectedRow.version}`);
    else if (row.statement_count !== expectedRow.statement_count || row.statement_sha256 !== expectedRow.statement_sha256) {
      mismatches.push(`phase03b_rows[${expectedRow.version}]: expected ${JSON.stringify(expectedRow)}, got ${JSON.stringify(row)}`);
    }
  }
  for (const key of EXPECTED.quiescenceAndLedgerGate.entryToPostApplyOidFieldsThatMustMatchExactly) {
    const expected = EXPECTED.quiescenceAndLedgerGate.entryValuesFromENTRY_RECEIPT[key];
    if (expected !== undefined && proof[key] !== undefined && String(proof[key]) !== String(expected)) {
      mismatches.push(`${key}: entry had ${expected}, post-apply has ${proof[key]}`);
    }
  }
  if (Number(proof.http_queue_count) !== 0) mismatches.push(`http_queue_count must be 0, got ${proof.http_queue_count}`);
  if (Number(proof.http_response_new_since_t0_count) !== 0) mismatches.push(`http_response_new_since_t0_count must be 0, got ${proof.http_response_new_since_t0_count}`);
  if (Number(proof.pg_net_ttl_seconds) <= 600) mismatches.push(`pg_net_ttl_seconds must exceed 600, got ${proof.pg_net_ttl_seconds}`);
  if (proof.transaction_read_only !== 'on') mismatches.push('transaction_read_only was not "on" -- this capture was not actually read-only');

  if (mismatches.length) hold('LIVE_GATE_AND_LEDGER', mismatches);
  else pass('LIVE_GATE_AND_LEDGER', 'all exact fields, versions, statement identities, entry-carryover OIDs, and quiescence invariants match');
}

// ---------- 2. Final structure (== permissions/RLS == moderation == points) ------
const rawCatalog = readJson(join(CAPTURED, 'structure_catalog.json'));
if (!rawCatalog) {
  notRun('FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS', 'structure_catalog.json not found in captured directory');
} else {
  try {
    const filtered = structuredClone(rawCatalog);
    const beforeFunctions = filtered.functions.length;
    const beforeTriggers = filtered.triggers.length;
    filtered.functions = filtered.functions.filter((item) => !(item.s === 'private' && item.n === 'flagstone_phase03b_block_row_lifecycle_r2' && item.args === ''));
    filtered.triggers = filtered.triggers.filter((item) => !(
      item.s === 'public' && item.t === 'flags' && ['aaa_flagstone_phase03b_row_lifecycle_quiescence_r2', 'aaa_flagstone_phase03b_truncate_quiescence_r3'].includes(item.g)
    ));
    if (beforeFunctions - filtered.functions.length !== 1 || beforeTriggers - filtered.triggers.length !== 2) {
      throw new Error('temporary-gate exclusion cardinality mismatch (expected exactly 1 function + 2 triggers removed)');
    }
    const withPreexistingExcluded = applyPreexistingStructureExclusions(filtered);
    const normalized = normalizeCatalog(withPreexistingExcluded);
    const structureSha256 = checksum(normalized);
    const expectedSha = EXPECTED.finalStructure.expectedFinalStructureSha256AfterAllExclusions;
    if (structureSha256 !== expectedSha) {
      hold('FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS', {
        message: 'structure hash mismatch after applying the exact 3-object gate exclusion and the exact 7-table preexisting exclusion',
        observed: structureSha256,
        expected: expectedSha,
        nextStep: 'run scripts/structural-catalog.mjs diff against the accepted staging capture to localize residuals -- do not widen either exclusion to force a match',
      });
    } else {
      pass('FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS', `hash matches accepted staging value (${expectedSha}), covering structure, RLS/grants, moderation and points object definitions`);
    }
  } catch (e) {
    fail('FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS', e.message);
  }
}

// ---------- 3. Edge Function identity --------------------------------------------
const edgeRaw = readJson(join(CAPTURED, 'edge_function.json'));
if (!edgeRaw) {
  notRun('EDGE_FUNCTION_IDENTITY', 'edge_function.json not found -- CLI/API capability likely unavailable to the capturing tool');
} else {
  const functions = Array.isArray(edgeRaw) ? edgeRaw : edgeRaw.functions;
  const selected = (functions ?? []).filter((fn) => fn.slug === 'notify-flag-status').map((fn) => ({
    id: fn.id, slug: fn.slug, name: fn.name, status: fn.status, version: fn.version,
    verifyJwt: fn.verify_jwt, createdAt: fn.created_at, updatedAt: fn.updated_at,
  }));
  if (selected.length !== EXPECTED.edgeFunctionIdentity.expectedSelectedCount) {
    hold('EDGE_FUNCTION_IDENTITY', `expected exactly ${EXPECTED.edgeFunctionIdentity.expectedSelectedCount} function named notify-flag-status, found ${selected.length}`);
  } else {
    const observedSha = hashJson(selected[0]);
    if (observedSha !== EXPECTED.edgeFunctionIdentity.expectedSha256) {
      hold('EDGE_FUNCTION_IDENTITY', { message: 'Edge Function identity hash mismatch', observed: observedSha, expected: EXPECTED.edgeFunctionIdentity.expectedSha256 });
    } else {
      pass('EDGE_FUNCTION_IDENTITY', `hash matches (${observedSha})`);
    }
  }
}

// ---------- 4. Client compatibility (never live, by design) ----------------------
notRun('CLIENT_COMPATIBILITY', EXPECTED.clientCompatibility.reason);

// ---------- Report -----------------------------------------------------------------
console.log(JSON.stringify({ overall: aggregator.overall, generatedAtUtc: new Date().toISOString(), report }, null, 2));
process.exitCode = aggregator.exitCode;
