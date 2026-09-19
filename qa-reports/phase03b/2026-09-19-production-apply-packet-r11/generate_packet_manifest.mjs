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
if (validation.result !== 'PASS' || validation.localReplayCheckCount !== 232 ||
    validation.preservedR10ReplayCheckCount !== 217 ||
    validation.preservedR9ReplayCheckCount !== 201 ||
    validation.preservedR8ReplayCheckCount !== 182 ||
    validation.preservedR7ReplayCheckCount !== 172 ||
    validation.preservedR5BranchTests?.passed !== 30 || validation.preservedR5BranchTests?.total !== 30 ||
    validation.preservedR6BranchTests?.passed !== 40 || validation.preservedR6BranchTests?.total !== 40 ||
    validation.newR8ValidatorTests?.passed !== 35 || validation.newR8ValidatorTests?.total !== 35 ||
    validation.newR8SchemaTests?.passed !== 10 || validation.newR8SchemaTests?.total !== 10 ||
    validation.newR9TransportTests?.passed !== 19 || validation.newR9TransportTests?.total !== 19 ||
    validation.newR10ValidationOrderTests?.passed !== 16 || validation.newR10ValidationOrderTests?.total !== 16 ||
    validation.newR11PgNetTests?.passed !== 14 || validation.newR11PgNetTests?.total !== 14 ||
    validation.newR11SqlGateChecks?.passed !== 1 || validation.newR11SqlGateChecks?.total !== 1 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotClassifierCallCount !== 0 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotComparatorCallCount !== 0 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotConsumedResultCount !== 0 ||
    validation.r10ValidationOrderMetrics?.invalidSnapshotControllerTransitionCount !== 0 ||
    validation.validationInfrastructureDestroyed !== true) {
  throw new Error('R11 local receipt must prove 232 checks, 217 preserved R10 checks, 14/14 R11 cases, one bound-SQL pg_net check, zero invalid-input consumers/transitions, and all preserved controls');
}

const traceability = JSON.parse(readFileSync(join(PACKET, 'TRACEABILITY.json'), 'utf8'));
if (traceability.rootDefectCount !== 1 || traceability.entries?.length !== 1 || traceability.entries[0]?.id !== 'R11-D1') {
  throw new Error('R11 traceability must contain exactly the authorized volatile pg_net baseline defect');
}

const history = JSON.parse(readFileSync(join(PACKET, 'HISTORICAL_PGNET_FINGERPRINTS.json'), 'utf8'));
if (history.classification !== 'DIAGNOSTIC_HISTORY_ONLY' || history.authorizationUse !== 'FORBIDDEN' ||
    history.entries?.length !== 3) throw new Error('R11 historical pg_net fingerprints are not preserved as diagnostic-only evidence');

const livePreflight = JSON.parse(readFileSync(join(PACKET, 'LIVE_READ_ONLY_PREFLIGHT_EVIDENCE.json'), 'utf8'));
if (livePreflight.targetIdentity !== 'PASS' || livePreflight.liveTransactionReadOnly !== true ||
    livePreflight.pgNetTtl !== '6 hours' || livePreflight.pgNetTtlSeconds !== 21600 ||
    livePreflight.pgNetTtlExceedsMaximumQuiescenceWindow !== true || livePreflight.httpQueueCount !== 0 ||
    livePreflight.httpResponseNewSinceT0Count !== 0 || livePreflight.historicalFingerprintAuthorizesOrBlocks !== false ||
    livePreflight.liveReadOnlyServerStatePreflight !== 'PASS' || livePreflight.productionMutations !== 'NONE' ||
    livePreflight.quiescenceEntered !== false || livePreflight.productionApplyExecuted !== false ||
    livePreflight.pgNetProvenanceEvidenceCommit !== '64ee3b24e270a590656590e55312a1dd7326ab88') {
  throw new Error('R11 live preflight does not prove the read-only run-relative pg_net contract and zero-write state');
}

const envelopeSchema = JSON.parse(readFileSync(join(PACKET, 'STRICT_R8_ENVELOPE_SCHEMA.json'), 'utf8'));
if (envelopeSchema.additionalProperties !== false || envelopeSchema.properties?.packetVersion?.const !== 'R8') {
  throw new Error('Preserved R8 strict envelope schema is not fail-closed');
}
const gateManifest = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_TEMPORARY_GATE_IDENTITIES.json'), 'utf8'));
if (gateManifest.packetVersion !== 'R6' || gateManifest.productionTarget !== EXPECTED.productionTarget || gateManifest.objects?.length !== 3) {
  throw new Error('Preserved source-R6 expected temporary-gate identity manifest mismatch');
}

const manifest = {
  schemaVersion: 1,
  packetVersion: 'R11',
  promptId: 'FLAGSTONE-P03B-R11-PGNET-RUN-RELATIVE-INVARIANT-20260919',
  sourceR10PacketCommit: '0ba40b4ff027e043edf441ea24fe2be1eae5f9bc',
  sourceR10RefreshEvidenceCommit: '41184103505ae2af44cc2a506b7f485a19846f81',
  pgNetProvenanceEvidenceCommit: '64ee3b24e270a590656590e55312a1dd7326ab88',
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  productionTarget: EXPECTED.productionTarget,
  rootDefectCount: 1,
  packetRepairDisposition: 'PASS',
  volatileHttpFingerprintRemovedFromAuthorization: true,
  historicalHttpFingerprintsPreserved: true,
  historicalFingerprintClassification: 'DIAGNOSTIC_HISTORY_ONLY',
  databaseT0Immutable: true,
  httpQueueZeroRequired: true,
  noNewResponseAfterT0Required: true,
  pgNetTtl: livePreflight.pgNetTtl,
  pgNetTtlSeconds: livePreflight.pgNetTtlSeconds,
  pgNetTtlExceeds600Seconds: true,
  oldResponseExpiryAllowed: true,
  newOutboundResponseFailsClosed: true,
  exactTwoMigrationsOnly: true,
  localReplayCheckCount: validation.localReplayCheckCount,
  preservedR10ReplayCheckCount: validation.preservedR10ReplayCheckCount,
  preservedR9ReplayCheckCount: validation.preservedR9ReplayCheckCount,
  preservedR8ReplayCheckCount: validation.preservedR8ReplayCheckCount,
  preservedR7ReplayCheckCount: validation.preservedR7ReplayCheckCount,
  newR11PgNetTests: validation.newR11PgNetTests,
  newR11SqlGateChecks: validation.newR11SqlGateChecks,
  invalidSnapshotClassifierCallCount: validation.r10ValidationOrderMetrics.invalidSnapshotClassifierCallCount,
  invalidSnapshotComparatorCallCount: validation.r10ValidationOrderMetrics.invalidSnapshotComparatorCallCount,
  rawSnapshotControlFlowBypass: 'NONE',
  liveReadOnlyServerStatePreflight: livePreflight.liveReadOnlyServerStatePreflight,
  liveTransactionReadOnly: livePreflight.liveTransactionReadOnly,
  transientBreakageRiskAfterR11: 'NONE',
  independentReviewReadiness: 'READY',
  numericChildExits: validation.numericChildExits,
  validationInfrastructureDestroyed: validation.validationInfrastructureDestroyed,
  candidateBytesChanged: false,
  productionMutations: 'NONE',
  stagingMutations: 'NONE',
  quiescenceEntered: false,
  productionApplyExecuted: false,
  oneRunAuthorizationStatus: 'UNUSED',
  phase03cStarted: false,
  artifactCountExcludingManifests: artifacts.length,
  artifacts,
};

const manifestPath = join(PACKET, 'ARTIFACT_MANIFEST.json');
const shaPath = join(PACKET, 'ARTIFACT_MANIFEST.sha256');
if (existsSync(manifestPath) || existsSync(shaPath)) throw new Error('Refusing existing packet manifest');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
writeFileSync(shaPath, `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join('\n')}\n`, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS', artifactCount: artifacts.length }, null, 2));
