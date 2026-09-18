#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED } from './r7_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const excluded = new Set(['ARTIFACT_MANIFEST.json', 'ARTIFACT_MANIFEST.sha256']);
const artifacts = readdirSync(PACKET).sort().filter((name) => !excluded.has(name)).map((name) => {
  const path = join(PACKET, name);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Packet artifact must be a regular file: ${name}`);
  return { path: name, size: stat.size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
});
const validation = JSON.parse(readFileSync(join(PACKET, 'LOCAL_VALIDATION_RECEIPT.json'), 'utf8'));
if (validation.result !== 'PASS' || validation.localReplayCheckCount !== 172 ||
    validation.preservedR6ReplayCheckCount !== 137 ||
    validation.preservedR5BranchTests?.passed !== 30 || validation.preservedR5BranchTests?.total !== 30 ||
    validation.preservedR6BranchTests?.passed !== 40 || validation.preservedR6BranchTests?.total !== 40 ||
    validation.newR7ValidatorTests?.passed !== 35 || validation.newR7ValidatorTests?.total !== 35 ||
    validation.validationInfrastructureDestroyed !== true) {
  throw new Error('R7 local validation receipt does not prove 172 R7 checks, 137 source-R6 checks, preserved 30/30 and 40/40 branches, and 35/35 new validator cases');
}
const traceability = JSON.parse(readFileSync(join(PACKET, 'TRACEABILITY.json'), 'utf8'));
if (traceability.rootDefectCount !== 3 || traceability.entries?.length !== 3 ||
    JSON.stringify(traceability.entries.map((entry) => entry.id)) !== JSON.stringify(['R7-D1', 'R7-D2', 'R7-D3'])) {
  throw new Error('R7 traceability must contain exactly the three authorized validator defects');
}
const envelopeSchema = JSON.parse(readFileSync(join(PACKET, 'STRICT_R7_ENVELOPE_SCHEMA.json'), 'utf8'));
if (envelopeSchema.additionalProperties !== false || envelopeSchema.properties?.packetVersion?.const !== 'R7') {
  throw new Error('R7 strict envelope schema is not fail-closed');
}
const gateManifest = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_TEMPORARY_GATE_IDENTITIES.json'), 'utf8'));
if (gateManifest.packetVersion !== 'R6' || gateManifest.productionTarget !== EXPECTED.productionTarget || gateManifest.objects?.length !== 3) {
  throw new Error('Preserved source-R6 expected temporary-gate identity manifest mismatch');
}
const manifest = {
  schemaVersion: 1,
  packetVersion: 'R7',
  promptId: 'FLAGSTONE-P03B-PRODUCTION-APPLY-PACKET-R7-D1-VALIDATOR-REPAIR-20260917-R1',
  sourceR6PacketCommit: 'f6d314b6f58c3367d6a5ee0d461c43ef05516e56',
  sourceR6IndependentReview: 'Codex rollout 01a0b2b2-cdfa-79e1-9545-c5166ec6940a; executable probe custom-tool ordinal 164; HOLD adjudication assistant-message ordinal 199',
  sourceR5PacketCommit: 'aeab11d6dedb6a6789abe1d3bb47b7bc9c89cf23',
  sourceR5IndependentReviewCommit: 'cbd32a182cd4c89f7d3ea5d110b119e48fa72930',
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  productionTarget: EXPECTED.productionTarget,
  rootDefectCount: 3,
  exactTwoMigrationsOnly: true,
  localReplayCheckCount: validation.localReplayCheckCount,
  preservedR6ReplayCheckCount: validation.preservedR6ReplayCheckCount,
  preservedR5BranchTests: validation.preservedR5BranchTests,
  preservedR6BranchTests: validation.preservedR6BranchTests,
  newR7ValidatorTests: validation.newR7ValidatorTests,
  localReplayExit: validation.numericChildExits,
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
