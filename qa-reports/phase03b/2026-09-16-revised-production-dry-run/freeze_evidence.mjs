import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const excluded = new Set(['ARTIFACT_MANIFEST.json', 'ARTIFACT_MANIFEST.sha256']);
const files = readdirSync(directory)
  .filter((name) => !excluded.has(name) && statSync(join(directory, name)).isFile())
  .sort();
const entries = files.map((name) => ({
  path: name,
  bytes: statSync(join(directory, name)).size,
  sha256: createHash('sha256').update(readFileSync(join(directory, name))).digest('hex'),
}));
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  entries,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(join(directory, 'ARTIFACT_MANIFEST.json'), serialized);
writeFileSync(
  join(directory, 'ARTIFACT_MANIFEST.sha256'),
  `${createHash('sha256').update(serialized, 'utf8').digest('hex')}  ARTIFACT_MANIFEST.json\n`,
);
