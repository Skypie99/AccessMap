#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const packet = dirname(fileURLToPath(import.meta.url));
const excluded = new Set(['ARTIFACT_MANIFEST.json', 'ARTIFACT_MANIFEST.sha256']);
const files = readdirSync(packet).filter((name) => !excluded.has(name) && statSync(join(packet, name)).isFile()).sort();
const sha256 = (name) => createHash('sha256').update(readFileSync(join(packet, name))).digest('hex');
const artifacts = files.map((path) => ({ path, sha256: sha256(path) }));
const manifest = {
  schemaVersion: 1,
  promptId: 'FLAGSTONE-P03B-PRODUCTION-APPLY-PACKET-R3-FOUR-BLOCKER-REPAIR-20260917-R1',
  sourceR2PacketCommit: '3c9aa3b7cdb36a4bdfda5bdfcbb028371a9a691d',
  sourceR2IndependentReviewCommit: 'fff266ba2ced85e912406622c53058ad9065ebb4',
  candidate: '9d638456fa8e679678c54f131fe8f0db723eda72',
  candidateTree: 'cfc76206f7cf7af6a7127a6329620d2ee1dc4da8',
  productionTarget: 'kldlwszpfkdmsjrjhjym',
  blockerCount: 4,
  expectedFunctionDefinitionSha256: '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac',
  expectedRowTriggerDefinitionSha256: 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf',
  expectedTruncateTriggerDefinitionSha256: '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a',
  candidateBytesChanged: false,
  productionMutations: 'NONE', stagingMutations: 'NONE', quiescenceEntered: false, productionApplyExecuted: false,
  artifactCountExcludingManifests: artifacts.length,
  artifacts,
};
writeFileSync(join(packet, 'ARTIFACT_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
const lines = artifacts.map(({ path, sha256: digest }) => `${digest}  ${path}`);
lines.push(`${createHash('sha256').update(JSON.stringify(manifest, null, 2) + '\n').digest('hex')}  ARTIFACT_MANIFEST.json`);
writeFileSync(join(packet, 'ARTIFACT_MANIFEST.sha256'), `${lines.join('\n')}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: 'PASS', artifactCount: artifacts.length + 1 }, null, 2));
