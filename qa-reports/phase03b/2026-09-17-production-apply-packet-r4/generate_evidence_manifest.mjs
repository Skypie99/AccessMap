#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

function walk(root, directory = root) {
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Evidence symlink forbidden: ${path}`);
    if (stat.isDirectory()) files.push(...walk(root, path));
    else files.push({ path, relativePath: relative(root, path) });
  }
  return files;
}

export function generateEvidenceManifest(rootPath) {
  const root = resolve(rootPath);
  if (!existsSync(root)) throw new Error(`Evidence root does not exist: ${root}`);
  const excluded = new Set(['manifest/ARTIFACT_MANIFEST.json', 'manifest/ARTIFACT_MANIFEST.sha256']);
  const artifacts = walk(root).filter((file) => !excluded.has(file.relativePath)).map((file) => ({
    path: file.relativePath,
    size: lstatSync(file.path).size,
    sha256: createHash('sha256').update(readFileSync(file.path)).digest('hex'),
  }));
  const manifest = { schemaVersion: 1, packetVersion: 'R4', root, artifactCount: artifacts.length, artifacts };
  const manifestPath = join(root, 'manifest/ARTIFACT_MANIFEST.json');
  const shaPath = join(root, 'manifest/ARTIFACT_MANIFEST.sha256');
  if (existsSync(manifestPath) || existsSync(shaPath)) throw new Error('Refusing existing evidence manifest');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  const lines = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`);
  writeFileSync(shaPath, `${lines.join('\n')}\n`, { mode: 0o600, flag: 'wx' });
  return manifest;
}

const rootArg = process.argv.find((value) => value.startsWith('--root='));
if (rootArg) console.log(JSON.stringify(generateEvidenceManifest(rootArg.slice('--root='.length)), null, 2));
