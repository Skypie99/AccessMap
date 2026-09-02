#!/usr/bin/env node
// scripts/render-current-release.mjs — generate qa-reports/CURRENT_RELEASE.md
// FROM release/current.json. Deterministic: same manifest → same bytes, so
// `release:verify` can prove the human doc has not drifted from the machine
// authority.
//
//   npm run release:render [-- --repo <path>] [--manifest <path>] [--out <path>]
//                          [--stdout] [--check]
//
//   --check   exit 1 (without writing) when the file on disk differs

import fs from 'node:fs';
import path from 'node:path';
import {
  atomicWriteFile,
  defaultManifestPath,
  defaultRenderedPath,
  loadManifest,
  optFlag,
  optString,
  parseArgs,
  renderCurrentRelease,
  validateManifestShape,
} from './release-lib.mjs';

const { opts } = parseArgs(process.argv.slice(2));
const repo = path.resolve(optString(opts, 'repo') ?? process.cwd());
const manifestPath = path.resolve(optString(opts, 'manifest') ?? defaultManifestPath(repo));
const outPath = path.resolve(optString(opts, 'out') ?? defaultRenderedPath(repo));

const loaded = loadManifest(manifestPath);
if (!loaded.ok) {
  process.stderr.write(`RENDER FAIL: ${loaded.error}${loaded.recovery ? `\n${loaded.recovery}` : ''}\n`);
  process.exit(1);
}
const errors = validateManifestShape(loaded.manifest);
if (errors.length > 0) {
  process.stderr.write(`RENDER FAIL: manifest does not satisfy schema v2 — refusing to render an invalid state:\n${errors.map((e) => `  - ${e}`).join('\n')}\n`);
  process.exit(1);
}

const rendered = renderCurrentRelease(loaded.manifest);

if (optFlag(opts, 'stdout')) {
  process.stdout.write(rendered);
  process.exit(0);
}
if (optFlag(opts, 'check')) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
  if (current === rendered) {
    process.stdout.write(`RENDER CHECK: PASS — ${outPath} matches ${manifestPath}\n`);
    process.exit(0);
  }
  process.stdout.write(`RENDER CHECK: FAIL — ${outPath} ${current === null ? 'is missing' : 'has drifted from the manifest'}; run npm run release:render\n`);
  process.exit(1);
}
atomicWriteFile(outPath, rendered);
process.stdout.write(`RENDERED ${outPath}\n  from ${manifestPath}\n`);
