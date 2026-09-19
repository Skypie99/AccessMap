#!/usr/bin/env node
// Privacy-safe recursive scan for the R10 live read-only evidence directory.
// It records file names and counts only, never matching lines or values.
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const rootArg = process.argv.find((value) => value.startsWith('--root='));
if (!rootArg) throw new Error('Required: --root=/absolute/evidence/directory');
const root = resolve(rootArg.slice('--root='.length));
const output = join(root, 'PRIVACY_SCAN.json');
if (!existsSync(root)) throw new Error(`Evidence root does not exist: ${root}`);
if (existsSync(output)) throw new Error(`Refusing existing privacy scan artifact: ${output}`);

const excluded = new Set([
  'PRIVACY_SCAN.json',
  'manifest/ARTIFACT_MANIFEST.json',
  'manifest/ARTIFACT_MANIFEST.sha256',
]);
const patterns = [
  ['privateKeyHeader', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['jwtLikeToken', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['credentialedPostgresUri', /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]+@/g],
  ['supabaseSecretLikeToken', /sb_secret_[A-Za-z0-9_-]{20,}/g],
];

function walk(directory) {
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Evidence symlink forbidden: ${path}`);
    if (stat.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

const files = walk(root).filter((path) => !excluded.has(relative(root, path)));
const findings = [];
for (const path of files) {
  const text = readFileSync(path, 'utf8');
  for (const [pattern, regex] of patterns) {
    const count = [...text.matchAll(regex)].length;
    if (count > 0) findings.push({ file: relative(root, path), pattern, count });
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
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ status: result.status, scannedFileCount: result.scannedFileCount, findingCount: result.findingCount }, null, 2));
process.exit(result.status === 'PASS' ? 0 : 1);
