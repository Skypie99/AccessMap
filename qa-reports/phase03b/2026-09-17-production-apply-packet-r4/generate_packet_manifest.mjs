#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED } from './r4_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const excluded = new Set(['ARTIFACT_MANIFEST.json', 'ARTIFACT_MANIFEST.sha256']);
const artifacts = readdirSync(PACKET).sort().filter((name) => !excluded.has(name)).map((name) => {
  const path = join(PACKET, name);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Packet artifact must be a regular file: ${name}`);
  return { path: name, size: stat.size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
});
const validation = JSON.parse(readFileSync(join(PACKET, 'LOCAL_VALIDATION_RECEIPT.json'), 'utf8'));
if (validation.result !== 'PASS' || validation.localReplayCheckCount !== 55 || validation.validationInfrastructureDestroyed !== true) {
  throw new Error('R4 local validation receipt is not the exact accepted 55-check PASS');
}
const traceability = JSON.parse(readFileSync(join(PACKET, 'TRACEABILITY.json'), 'utf8'));
if (traceability.rootDefectCount !== 3 || traceability.defects.length !== 3) throw new Error('R4 traceability must contain exactly three root defects');
const manifest = {
  schemaVersion: 1,
  packetVersion: 'R4',
  promptId: 'FLAGSTONE-P03B-PRODUCTION-APPLY-PACKET-R4-THREE-EXECUTABLE-DEFECT-REPAIR-20260917-R1',
  sourceR3PacketCommit: '88e6fce5f262b2385571a09f7084821ceb980244',
  sourceR3IndependentReviewCommit: 'f77555b2b4a3ce7e1939ad63ae1a9bef4e82890c',
  candidate: EXPECTED.candidate,
  candidateTree: EXPECTED.candidateTree,
  productionTarget: EXPECTED.productionTarget,
  rootDefectCount: 3,
  exactTwoMigrationsOnly: true,
  localReplayCheckCount: validation.localReplayCheckCount,
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
