#!/usr/bin/env node
// scripts/release-preflight.mjs — READ-ONLY release preflight.
//
//   npm run release:preflight [-- --repo <path>] [--build-sensitive] [--ls-remote] [--json]
//
// Prints the real, live Git identity of the checkout you are about to build or
// release from. It never trusts a harness/UI status snapshot: every value comes
// from `git` right now. It never mutates anything (no fetch, no checkout).
//
//   --build-sensitive  a dirty TRACKED tree is a FAIL (use before any EAS build)
//   --ls-remote        also print live origin/main via `git ls-remote` (network read)
//   --json             machine-readable output
//
// It does NOT fail merely because HEAD != origin/main: release candidates and
// governance worktrees legitimately differ from main. It prints the difference.
//
// EAS remote-version-source rule: when eas.json says cli.appVersionSource =
// "remote", the submitted build number lives on EAS servers. The local
// app.json buildNumber is DIAGNOSTIC ONLY and is printed as such. Never infer
// "local buildNumber == submitted build number".

import path from 'node:path';
import {
  UNPROVEN,
  aheadBehind,
  gitRepoInfo,
  gitStatusSummary,
  lsRemoteRef,
  nowIso,
  optFlag,
  optString,
  parseArgs,
  readAppConfig,
  readEasConfig,
} from './release-lib.mjs';

const { opts } = parseArgs(process.argv.slice(2));
const repo = path.resolve(optString(opts, 'repo') ?? process.cwd());
const buildSensitive = optFlag(opts, 'build-sensitive');
const wantLsRemote = optFlag(opts, 'ls-remote');
const asJson = optFlag(opts, 'json');

const failures = [];
const out = { repo };

const info = gitRepoInfo(repo);
if (!info.ok) {
  failures.push(info.error);
} else {
  Object.assign(out, {
    repository: info.originUrl ?? '(no origin remote)',
    worktreePath: info.toplevel,
    commonGitDir: info.commonDir,
    gitDir: info.gitDir,
    linkedWorktree: info.isLinkedWorktree,
    branch: info.branch,
    head: info.head,
    tree: info.tree,
    originMain: info.originMain,
    shallow: info.shallow,
  });
  if (!info.head) failures.push('HEAD cannot resolve');
  if (!info.tree) failures.push('HEAD tree cannot resolve');
  if (info.originMain && info.head) out.headVsOriginMain = aheadBehind(repo, info.originMain, 'HEAD');
  if (wantLsRemote) {
    const live = lsRemoteRef(repo, 'origin', 'refs/heads/main');
    out.originMainLive = live.ok ? live.sha : `unavailable (${live.error})`;
  }
  const status = gitStatusSummary(repo);
  if (!status.ok) failures.push(`git status failed: ${status.error}`);
  else {
    out.trackedDirty = status.trackedDirty;
    out.trackedPaths = status.trackedPaths;
    out.untracked = status.untracked;
    if (buildSensitive && status.trackedDirty > 0) {
      failures.push(`tracked worktree is dirty (${status.trackedDirty} change(s)) — a build-sensitive operation requires a clean tracked tree`);
    }
  }
}

const app = readAppConfig(repo);
if (!app.ok) failures.push(`app version cannot resolve: ${app.error}`);
else {
  out.appVersion = app.version;
  out.localIosBuildNumber = app.iosBuildNumber;
  if (!app.version) failures.push('app version cannot resolve (app.json has no expo.version)');
}

const eas = readEasConfig(repo);
if (!eas.ok) failures.push(`eas.json cannot be read: ${eas.error}`);
else {
  out.easVersionSource = eas.appVersionSource;
  out.localIosBuildAuthoritative = eas.localBuildAuthoritative;
}

out.timestamp = nowIso();
out.timestampSource = 'system clock (Date.now)';
out.failures = failures;
out.result = failures.length === 0 ? 'PASS' : 'FAIL';

if (asJson) {
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}

const row = (label, value) => `${`${label}:`.padEnd(32)} ${value}`;
const lines = [];
lines.push('FLAGSTONE RELEASE PREFLIGHT');
lines.push('');
lines.push(row('Repository', out.repository ?? UNPROVEN));
lines.push(row('Actual worktree path', out.worktreePath ?? UNPROVEN));
lines.push(row('Common Git dir', out.commonGitDir ?? UNPROVEN));
lines.push(row('Linked worktree', out.linkedWorktree === undefined ? UNPROVEN : out.linkedWorktree ? `YES (git dir: ${out.gitDir})` : 'NO'));
lines.push(row('Branch', out.branch ?? UNPROVEN));
lines.push(row('HEAD', out.head ?? 'UNRESOLVED'));
lines.push(row('Tree', out.tree ?? 'UNRESOLVED'));
lines.push(row('Actual origin/main', out.originMain ? `${out.originMain} (remote-tracking ref; run \`git fetch origin\` or pass --ls-remote for live)` : 'not available locally'));
if (wantLsRemote) lines.push(row('origin/main (ls-remote, live)', out.originMainLive));
if (out.headVsOriginMain) {
  const { ahead, behind } = out.headVsOriginMain;
  lines.push(row('HEAD vs origin/main', ahead === 0 && behind === 0 ? 'EQUAL' : `differs — HEAD is ${ahead} ahead / ${behind} behind (informational, not a failure)`));
} else if (out.head) {
  lines.push(row('HEAD vs origin/main', 'origin/main unavailable — cannot compare'));
}
if (out.shallow) lines.push(row('Shallow clone', 'YES — ancestry checks cannot be trusted here'));
if (out.trackedDirty !== undefined) {
  lines.push(row('Tracked tree clean', out.trackedDirty === 0 ? 'YES' : `NO (${out.trackedDirty} tracked change(s): ${out.trackedPaths.slice(0, 8).join(', ')}${out.trackedPaths.length > 8 ? ', …' : ''})`));
  lines.push(row('Untracked files', String(out.untracked)));
}
lines.push(row('App version', out.appVersion ?? 'UNRESOLVED'));
lines.push(row('Local configured iOS build', out.localIosBuildNumber ?? 'absent'));
lines.push(row('EAS version-source mode', out.easVersionSource ? out.easVersionSource.toUpperCase() : 'UNRESOLVED'));
lines.push(row('Local iOS build authoritative', out.localIosBuildAuthoritative ?? UNPROVEN));
lines.push(row('Timestamp source', `${out.timestampSource} — ${out.timestamp}`));
lines.push('');
if (out.easVersionSource === 'remote') {
  lines.push('EAS VERSION SOURCE: REMOTE');
  lines.push(`LOCAL IOS BUILD NUMBER: ${out.localIosBuildNumber ?? 'absent'}`);
  lines.push('LOCAL BUILD NUMBER AUTHORITATIVE: NO');
  lines.push('The submitted build number comes from EAS build details / verified release evidence, never from app.json.');
  lines.push('');
}
lines.push('RELEASE SOURCE RULE: never infer release source from this checkout\'s recency. The control plane is release/current.json (docs/RELEASE_IDENTITY.md).');
if (buildSensitive) lines.push('Mode: BUILD-SENSITIVE (dirty tracked tree is fatal)');
lines.push('');
if (failures.length === 0) {
  lines.push('PREFLIGHT: PASS');
} else {
  lines.push('PREFLIGHT: FAIL');
  for (const f of failures) lines.push(`  - ${f}`);
}
process.stdout.write(`${lines.join('\n')}\n`);
process.exit(failures.length === 0 ? 0 : 1);
