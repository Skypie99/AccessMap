#!/usr/bin/env node
// Privacy-safe local scan: records only pattern counts and matching file names,
// never matching lines or values.
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(PACKET, 'PRIVACY_SCAN.json');
if (existsSync(OUTPUT)) throw new Error('Refusing existing privacy scan artifact');
const excluded = new Set(['ARTIFACT_MANIFEST.json', 'ARTIFACT_MANIFEST.sha256', 'PRIVACY_SCAN.json']);
const patterns = [
  ['privateKeyHeader', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['jwtLikeToken', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['credentialedPostgresUri', /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]+@/g],
  ['supabaseSecretLikeToken', /sb_secret_[A-Za-z0-9_-]{20,}/g],
];
const files = readdirSync(PACKET).sort().filter((name) => !excluded.has(name)).filter((name) => {
  const stat = lstatSync(join(PACKET, name));
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Packet artifact must be a regular file: ${name}`);
  return true;
});
const findings = [];
for (const file of files) {
  const text = readFileSync(join(PACKET, file), 'utf8');
  for (const [pattern, regex] of patterns) {
    const count = [...text.matchAll(regex)].length;
    if (count > 0) findings.push({ file, pattern, count });
  }
}
const result = {
  schemaVersion: 1,
  packetVersion: 'R10',
  privacySafe: true,
  matchingValuesRetained: false,
  scannedFileCount: files.length,
  findingCount: findings.reduce((sum, finding) => sum + finding.count, 0),
  findings,
  status: findings.length === 0 ? 'PASS' : 'HOLD',
};
writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ status: result.status, scannedFileCount: result.scannedFileCount, findingCount: result.findingCount }, null, 2));
process.exit(result.status === 'PASS' ? 0 : 1);
