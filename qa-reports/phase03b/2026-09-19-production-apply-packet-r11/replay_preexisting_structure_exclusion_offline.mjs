#!/usr/bin/env node
// OFFLINE REPLAY ONLY. Re-derives the Phase03B final-structure comparison using
// exclusively already-captured evidence on disk: the raw structural capture
// from the second live read-only verifier run
// (qa-reports/phase03b/2026-09-20-second-live-post-apply-verification/structure.stdout.log)
// and the accepted revised-staging catalog read via `git show` from a sibling
// branch (no checkout, no working-tree change). No Supabase CLI invocation, no
// network call, no production or staging contact of any kind.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffCaptures, normalizeCatalog, checksum } from '../../../scripts/structural-catalog.mjs';
import { applyPreexistingStructureExclusions } from './preexisting_structure_exclusions.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(join(PACKET, '../../..'));
const EVIDENCE_DIR = join(ROOT, 'qa-reports/phase03b/2026-09-20-second-live-post-apply-verification');
const EXPECTED_FINAL_STRUCTURE_SHA256 = 'f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7';
const EXPECTED_ARTIFACT_COMMIT = 'aca5fdbb0f5fd151a5c98d5ca1b956954cf83354';
const EXPECTED_ARTIFACT_PATH = 'qa-reports/phase03b/2026-09-15-revised-staging/CATALOG_FIRST_REVISED_APPLY.json';

// 1. Load the RAW (unfiltered) production catalog exactly as the second live
//    run captured it -- this is the same file verify_post_apply.mjs read.
const rawStdout = readFileSync(join(EVIDENCE_DIR, 'structure.stdout.log'), 'utf8');
const rawPayload = JSON.parse(rawStdout);
const rawCatalog = rawPayload.rows[0].catalog;

// 2. Apply the SAME two-stage exclusion verify_post_apply.mjs applies: first
//    the 3 exact temporary quiescence objects, then the 7 pinned preexisting
//    tables. Replicated inline (not re-imported from verify_post_apply.mjs)
//    so this replay does not depend on that file executing correctly --
//    it is an independent check on the same exclusion module.
const gateFiltered = structuredClone(rawCatalog);
const beforeFunctions = gateFiltered.functions.length;
const beforeTriggers = gateFiltered.triggers.length;
gateFiltered.functions = gateFiltered.functions.filter((item) => !(item.s === 'private' && item.n === 'flagstone_phase03b_block_row_lifecycle_r2' && item.args === ''));
gateFiltered.triggers = gateFiltered.triggers.filter((item) => !(
  item.s === 'public' && item.t === 'flags' && ['aaa_flagstone_phase03b_row_lifecycle_quiescence_r2', 'aaa_flagstone_phase03b_truncate_quiescence_r3'].includes(item.g)
));
if (beforeFunctions - gateFiltered.functions.length !== 1 || beforeTriggers - gateFiltered.triggers.length !== 2) {
  throw new Error('Replay: gate exclusion cardinality mismatch');
}
const fullyFiltered = applyPreexistingStructureExclusions(gateFiltered);
const normalizedObserved = normalizeCatalog(fullyFiltered);
const observedStructureSha256 = checksum(normalizedObserved);

// 3. Load the accepted expected artifact from its own sibling branch via
//    `git show`, without checking out or modifying anything in this worktree.
const expectedRaw = execFileSync('git', ['show', `${EXPECTED_ARTIFACT_COMMIT}:${EXPECTED_ARTIFACT_PATH}`], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
const expectedArtifact = JSON.parse(expectedRaw);

// 4. Deterministic semantic diff, same tool used throughout this saga.
const diff = diffCaptures(
  { catalog: expectedArtifact.catalog, checksum: expectedArtifact.checksum },
  { catalog: normalizedObserved, checksum: observedStructureSha256 },
);

const checks = {
  expectedArtifactChecksumMatchesPinnedConstant: expectedArtifact.checksum === EXPECTED_FINAL_STRUCTURE_SHA256,
  observedStructureMatchesExpectedAfterExclusions: observedStructureSha256 === EXPECTED_FINAL_STRUCTURE_SHA256,
  zeroResidualsAfterExclusions: diff.residualCount === 0,
  diffReportsIdentical: diff.identical === true,
};

const passed = Object.values(checks).filter(Boolean).length;
const total = Object.keys(checks).length;
const receipt = {
  status: passed === total ? 'PASS' : 'HOLD',
  method: 'Offline replay: raw production structure capture (already on disk) re-filtered through gate exclusion + the new pinned 7-table exclusion, renormalized, rehashed, and diffed against the accepted staging artifact (read via git show from a sibling branch). No Supabase CLI call, no network call, no production or staging contact.',
  rawCaptureSource: 'qa-reports/phase03b/2026-09-20-second-live-post-apply-verification/structure.stdout.log',
  expectedArtifactSource: `${EXPECTED_ARTIFACT_COMMIT}:${EXPECTED_ARTIFACT_PATH}`,
  observedStructureSha256,
  expectedStructureSha256: EXPECTED_FINAL_STRUCTURE_SHA256,
  residualCount: diff.residualCount,
  securityRelevantSections: diff.securityRelevantSections,
  checks,
  passed,
  total,
  productionContact: 'NONE',
  stagingContact: 'NONE',
  productionMutations: 'NONE',
};
console.log(JSON.stringify(receipt, null, 2));
if (receipt.status !== 'PASS') process.exitCode = 1;
