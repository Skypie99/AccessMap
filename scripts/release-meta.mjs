#!/usr/bin/env node
// scripts/release-meta.mjs — FUTURE web build identity artifact generator.
//
//   npm run release:meta [-- --repo <path>] [--out dist/release-meta.json]
//                        [--ios-build <n>] [--app-version <x.y.z>]
//
// NOT WIRED INTO ANY BUILD OR DEPLOY PIPELINE. Activation is a separate,
// documented step after main/release convergence (docs/RELEASE_IDENTITY.md,
// "Deferred activation checklist"). Build 33 is not retrofitted.
//
// v2 rule: this artifact reports the ACTUAL build source. It NEVER reads
// release/current.json. The commit comes from the checked-out Git HEAD (or,
// when no .git directory exists in the build environment, from the build
// provider's Git metadata: VERCEL_GIT_COMMIT_SHA). If both exist and disagree
// the generator fails — never guess.
//
// Emits exactly these keys and nothing else:
//   schemaVersion, product, appVersion, iosBuild, webSourceCommit,
//   webSourceTree, builtAt
// NO secrets. NO environment dump. NO user data. NO Supabase keys. NO tokens.
// iosBuild comes only from an explicit nonsecret input (--ios-build); never
// from app.json (remote EAS version source makes that value non-authoritative).

import path from 'node:path';
import {
  PRODUCT,
  RELEASE_META_KEYS,
  RELEASE_META_SCHEMA_VERSION,
  atomicWriteFile,
  gitRepoInfo,
  isFullSha,
  nowIso,
  optString,
  parseArgs,
  readAppConfig,
  stableJson,
} from './release-lib.mjs';

const { opts } = parseArgs(process.argv.slice(2));
const repo = path.resolve(optString(opts, 'repo') ?? process.cwd());
const outPath = optString(opts, 'out') ? path.resolve(optString(opts, 'out')) : null;

const fail = (msg) => {
  process.stderr.write(`RELEASE META FAIL: ${msg}\n`);
  process.exit(1);
};

// The ONLY environment variable this tool reads. Its value is a Git SHA.
const providerSha = process.env.VERCEL_GIT_COMMIT_SHA;
if (providerSha !== undefined && !isFullSha(providerSha)) fail('VERCEL_GIT_COMMIT_SHA is set but is not a full 40-hex SHA');

const info = gitRepoInfo(repo);
let webSourceCommit;
let webSourceTree = null;
let derivation;
if (info.ok && info.head) {
  webSourceCommit = info.head;
  webSourceTree = info.tree;
  derivation = `git HEAD of ${info.toplevel}`;
  if (providerSha && providerSha !== info.head) {
    fail(`BUILD SOURCE CONFLICT — git HEAD ${info.head} but VERCEL_GIT_COMMIT_SHA ${providerSha}; refusing to guess`);
  }
} else if (providerSha) {
  webSourceCommit = providerSha;
  derivation = 'build-provider Git metadata (VERCEL_GIT_COMMIT_SHA); no .git directory, tree unavailable';
} else {
  fail(`cannot determine the actual build source: ${repo} is not a Git checkout and VERCEL_GIT_COMMIT_SHA is not set`);
}

const app = readAppConfig(repo);
const appVersion = optString(opts, 'app-version') ?? (app.ok ? app.version : null);
if (!appVersion) fail('appVersion unavailable: pass --app-version or build from a checkout with app.json expo.version');

let iosBuild = null;
const iosBuildRaw = optString(opts, 'ios-build');
if (iosBuildRaw !== undefined) {
  iosBuild = Number.parseInt(iosBuildRaw, 10);
  if (!Number.isInteger(iosBuild) || iosBuild <= 0 || String(iosBuild) !== iosBuildRaw.trim()) fail(`--ios-build must be a positive integer (got ${iosBuildRaw})`);
}

const meta = {
  schemaVersion: RELEASE_META_SCHEMA_VERSION,
  product: PRODUCT,
  appVersion,
  iosBuild,
  webSourceCommit,
  webSourceTree,
  builtAt: nowIso(),
};
// Belt and braces: the artifact can only ever carry the documented keys.
const keys = Object.keys(meta);
if (keys.length !== RELEASE_META_KEYS.length || keys.some((k, i) => k !== RELEASE_META_KEYS[i])) fail('internal: unexpected artifact keys');

const body = stableJson(meta);
if (outPath) {
  atomicWriteFile(outPath, body);
  process.stderr.write(`release-meta written: ${outPath}\n  source: ${derivation}\n  commit: ${webSourceCommit}\n  tree:   ${webSourceTree ?? 'n/a'}\n`);
} else {
  process.stderr.write(`release-meta (stdout) · source: ${derivation}\n`);
  process.stdout.write(body);
}
