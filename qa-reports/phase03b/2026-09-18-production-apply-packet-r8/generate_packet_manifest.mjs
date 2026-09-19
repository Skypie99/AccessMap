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
if (validation.result !== 'PASS' || validation.localReplayCheckCount !== 182 ||
    validation.preservedR7ReplayCheckCount !== 172 ||
    validation.preservedR5BranchTests?.passed !== 30 || validation.preservedR5BranchTests?.total !== 30 ||
    validation.preservedR6BranchTests?.passed !== 40 || validation.preservedR6BranchTests?.total !== 40 ||
    validation.newR8ValidatorTests?.passed !== 35 || validation.newR8ValidatorTests?.total !== 35 ||
    validation.newR8SchemaTests?.passed !== 10 || validation.newR8SchemaTests?.total !== 10 ||
    validation.validationInfrastructureDestroyed !== true) {
  throw new Error('R8 local validation receipt does not prove 182 R8 checks, 172 preserved source-R7 checks, preserved 30/30 and 40/40 branches, 35/35 validator cases, and 10/10 R8 schema-repair cases');
}
const traceability = JSON.parse(readFileSync(join(PACKET, 'TRACEABILITY.json'), 'utf8'));
if (traceability.rootDefectCount !== 1 || traceability.entries?.length !== 1 || traceability.entries[0]?.id !== 'R8-D1') {
  throw new Error('R8 traceability must contain exactly the authorized server-state snapshot extraction defect');
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
  packetVersion: 'R8',
  promptId: 'FLAGSTONE-P03B-R8-SERVER-STATE-SNAPSHOT-SCHEMA-REPAIR-20260918',
  sourceR7PacketCommit: '4dd4ebd7ae6295c8ebb204583f42932db7fb4c95',
  sourceR7IndependentReviewCommit: 'f39e126f7573d8e218e0fbbf49326c395cb301e2',
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  productionTarget: EXPECTED.productionTarget,
  rootDefectCount: 1,
  exactTwoMigrationsOnly: true,
  localReplayCheckCount: validation.localReplayCheckCount,
  preservedR7ReplayCheckCount: validation.preservedR7ReplayCheckCount,
  preservedR5BranchTests: validation.preservedR5BranchTests,
  preservedR6BranchTests: validation.preservedR6BranchTests,
  newR8ValidatorTests: validation.newR8ValidatorTests,
  newR8SchemaTests: validation.newR8SchemaTests,
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
