#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED } from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const excluded = new Set(['ARTIFACT_MANIFEST.json', 'ARTIFACT_MANIFEST.sha256']);
const artifacts = readdirSync(PACKET).sort().filter((name) => !excluded.has(name)).map((name) => {
  const path = join(PACKET, name);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Packet artifact must be a regular file: ${name}`);
  return { path: name, size: stat.size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
});
const validation = JSON.parse(readFileSync(join(PACKET, 'LOCAL_VALIDATION_RECEIPT.json'), 'utf8'));
if (validation.result !== 'PASS' || validation.localReplayCheckCount !== 217 ||
    validation.preservedR9ReplayCheckCount !== 201 ||
    validation.preservedR8ReplayCheckCount !== 182 ||
    validation.preservedR7ReplayCheckCount !== 172 ||
    validation.preservedR5BranchTests?.passed !== 30 || validation.preservedR5BranchTests?.total !== 30 ||
    validation.preservedR6BranchTests?.passed !== 40 || validation.preservedR6BranchTests?.total !== 40 ||
    validation.newR8ValidatorTests?.passed !== 35 || validation.newR8ValidatorTests?.total !== 35 ||
    validation.newR8SchemaTests?.passed !== 10 || validation.newR8SchemaTests?.total !== 10 ||
    validation.newR9TransportTests?.passed !== 19 || validation.newR9TransportTests?.total !== 19 ||
    validation.newR10ValidationOrderTests?.passed !== 16 || validation.newR10ValidationOrderTests?.total !== 16 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotClassifierCallCount !== 0 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotComparatorCallCount !== 0 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotConsumedResultCount !== 0 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotControllerTransitionCount !== 0 ||
    validation.validationInfrastructureDestroyed !== true) {
  throw new Error('R10 local validation receipt does not prove 217 total checks, 201 preserved R9 checks, 16/16 R10 ordering cases, zero invalid-input consumers/transitions, and all preserved R8/R7 controls');
}
const traceability = JSON.parse(readFileSync(join(PACKET, 'TRACEABILITY.json'), 'utf8'));
if (traceability.rootDefectCount !== 1 || traceability.entries?.length !== 1 || traceability.entries[0]?.id !== 'R10-D1') {
  throw new Error('R10 traceability must contain exactly the authorized pre-classification snapshot validation-order defect');
}
const livePreflight = JSON.parse(readFileSync(join(PACKET, 'LIVE_READ_ONLY_PREFLIGHT_EVIDENCE.json'), 'utf8'));
if (livePreflight.liveTransactionReadOnly !== true || livePreflight.productionMutations !== 'NONE' ||
    livePreflight.quiescenceEntered !== false || livePreflight.productionApplyExecuted !== false ||
    livePreflight.httpResponseCountMatch !== false || livePreflight.httpResponseFingerprintMatch !== false ||
    livePreflight.liveReadOnlyServerStatePreflight !== 'HOLD' ||
    livePreflight.pgNetProvenanceEvidenceCommit !== '64ee3b24e270a590656590e55312a1dd7326ab88') {
  throw new Error('R10 live evidence must preserve the read-only zero-write state and fail closed on post-provenance pg_net drift');
}
const envelopeSchema = JSON.parse(readFileSync(join(PACKET, 'STRICT_R8_ENVELOPE_SCHEMA.json'), 'utf8'));
if (envelopeSchema.additionalProperties !== false || envelopeSchema.properties?.packetVersion?.const !== 'R8') {
  throw new Error('R8 strict envelope schema is not fail-closed');
}
const gateManifest = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_TEMPORARY_GATE_IDENTITIES.json'), 'utf8'));
if (gateManifest.packetVersion !== 'R6' || gateManifest.productionTarget !== EXPECTED.productionTarget || gateManifest.objects?.length !== 3) {
  throw new Error('Preserved source-R6 expected temporary-gate identity manifest mismatch');
}
const manifest = {
  schemaVersion: 1,
  packetVersion: 'R10',
  promptId: 'FLAGSTONE-P03B-R10-HTTP-BASELINE-REFRESH-20260919',
  sourceR9PacketCommit: '28f54e37ae018ab33fe8326a556cd1209794e484',
  sourceR9IndependentReviewCommit: '097e5a6acbf8d78e54d94032b9b2d5edc90760eb',
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  productionTarget: EXPECTED.productionTarget,
  rootDefectCount: 1,
  packetRepairDisposition: 'HOLD',
  pgNetProvenanceEvidenceCommit: '64ee3b24e270a590656590e55312a1dd7326ab88',
  currentAcceptedHttpFingerprint: 'db09cd0f61b4405a2540be7541b690df4fa52bd7697c98c1e7e88d37a3f99031',
  exactTwoMigrationsOnly: true,
  localReplayCheckCount: validation.localReplayCheckCount,
  preservedR9ReplayCheckCount: validation.preservedR9ReplayCheckCount,
  preservedR8ReplayCheckCount: validation.preservedR8ReplayCheckCount,
  preservedR7ReplayCheckCount: validation.preservedR7ReplayCheckCount,
  preservedR5BranchTests: validation.preservedR5BranchTests,
  preservedR6BranchTests: validation.preservedR6BranchTests,
  newR8ValidatorTests: validation.newR8ValidatorTests,
  newR8SchemaTests: validation.newR8SchemaTests,
  newR9TransportTests: validation.newR9TransportTests,
  newR10ValidationOrderTests: validation.newR10ValidationOrderTests,
  invalidSnapshotClassifierCallCount: validation.r10ValidationOrderMetrics.invalidSnapshotClassifierCallCount,
  invalidSnapshotComparatorCallCount: validation.r10ValidationOrderMetrics.invalidSnapshotComparatorCallCount,
  invalidSnapshotConsumedResultCount: validation.r10ValidationOrderMetrics.invalidSnapshotConsumedResultCount,
  invalidSnapshotControllerTransitionCount: validation.r10ValidationOrderMetrics.invalidSnapshotControllerTransitionCount,
  rawSnapshotControlFlowBypass: 'NONE',
  liveReadOnlyServerStatePreflight: livePreflight.liveReadOnlyServerStatePreflight,
  liveTransactionReadOnly: livePreflight.liveTransactionReadOnly,
  httpResponseFingerprintMatch: livePreflight.httpResponseFingerprintMatch,
  transientBreakageRiskAfterR10: 'PRESENT',
  independentReviewReadiness: 'NOT_READY',
  localReplayExit: 0,
  numericChildExits: validation.numericChildExits,
  validationInfrastructureDestroyed: validation.validationInfrastructureDestroyed,
  candidateBytesChanged: false,
  productionMutations: 'NONE',
  stagingMutations: 'NONE',
  quiescenceEntered: false,
  productionApplyExecuted: false,
  artifactCountExcludingManifests: artifacts.length,
  artifacts,
};
const manifestPath = join(PACKET, 'ARTIFACT_MANIFEST.json');
const shaPath = join(PACKET, 'ARTIFACT_MANIFEST.sha256');
if (existsSync(manifestPath) || existsSync(shaPath)) throw new Error('Refusing existing packet manifest');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
writeFileSync(shaPath, `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join('\n')}\n`, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS', artifactCount: artifacts.length }, null, 2));
