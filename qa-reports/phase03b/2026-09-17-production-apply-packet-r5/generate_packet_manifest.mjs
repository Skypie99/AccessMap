#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED } from './r5_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const excluded = new Set(['ARTIFACT_MANIFEST.json', 'ARTIFACT_MANIFEST.sha256']);
const artifacts = readdirSync(PACKET).sort().filter((name) => !excluded.has(name)).map((name) => {
  const path = join(PACKET, name);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Packet artifact must be a regular file: ${name}`);
  return { path: name, size: stat.size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
});
const validation = JSON.parse(readFileSync(join(PACKET, 'LOCAL_VALIDATION_RECEIPT.json'), 'utf8'));
if (validation.result !== 'PASS' || validation.localReplayCheckCount !== 96 ||
    validation.newControllerBranchTests?.passed !== 30 || validation.newControllerBranchTests?.total !== 30 ||
    validation.validationInfrastructureDestroyed !== true) {
  throw new Error('R5 local validation receipt is not the exact accepted 96-check / 30-branch PASS');
}
const traceability = JSON.parse(readFileSync(join(PACKET, 'TRACEABILITY.json'), 'utf8'));
if (traceability.rootDefectCount !== 4 || traceability.entries?.length !== 4 ||
    JSON.stringify(traceability.entries.map((entry) => entry.id)) !== JSON.stringify(['R5-D1', 'R5-D2', 'R5-D3', 'R5-D4'])) {
  throw new Error('R5 traceability must contain exactly the four reviewed root defects');
}
const envelopeSchema = JSON.parse(readFileSync(join(PACKET, 'STRICT_R5_ENVELOPE_SCHEMA.json'), 'utf8'));
if (envelopeSchema.additionalProperties !== false || envelopeSchema.properties?.packetVersion?.const !== 'R5') {
  throw new Error('R5 strict envelope schema is not fail-closed');
}
const gateManifest = JSON.parse(readFileSync(join(PACKET, 'EXPECTED_TEMPORARY_GATE_IDENTITIES.json'), 'utf8'));
if (gateManifest.packetVersion !== 'R5' || gateManifest.productionTarget !== EXPECTED.productionTarget || gateManifest.objects?.length !== 3) {
  throw new Error('R5 expected temporary-gate identity manifest mismatch');
}
const manifest = {
  schemaVersion: 1,
  packetVersion: 'R5',
  promptId: 'FLAGSTONE-P03B-PRODUCTION-APPLY-PACKET-R5-FOUR-DEFECT-REPAIR-20260917-R1',
  sourceR4PacketCommit: '71ec54f6bbebf9934dbb6ea6cd8dacf2305d670a',
  sourceR4IndependentReviewCommit: '675503927b44c51d6c5b21447d7bc9d9203c52fc',
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  productionTarget: EXPECTED.productionTarget,
  rootDefectCount: 4,
  exactTwoMigrationsOnly: true,
  localReplayCheckCount: validation.localReplayCheckCount,
  newControllerBranchTests: validation.newControllerBranchTests,
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
