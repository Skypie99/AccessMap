#!/usr/bin/env node
// scripts/release-finalize.mjs — record an ALREADY-CREATED, ALREADY-VERIFIED
// release in the control plane (release/current.json).
//
// It never launches EAS, submits to Apple, pushes, tags, or deploys.
// DRY-RUN BY DEFAULT. Nothing is written without --write.
//
// Target "app" (default) — record the finalized app release:
//   npm run release:finalize -- \
//     --version 4.1.2 --build 34 \
//     --source-sha <intended full SHA> [--source-tree <tree>] \
//     --eas-source-sha <SHA from EAS build details> [--eas-build-id <id>] \
//     [--profile testflight] [--status FINISHED] [--eas-created-at <iso>] \
//     [--app-store-status submitted_for_review] [--submitted-at <iso>] \
//     [--origin-main-at-build <sha>] \
//     [--web-sync exact|web-only-descendant] (default exact: web follows app) \
//     [--web-source-sha <sha> --web-source-tree <tree> --overlay-reason "…" \
//      --overlay-receipt qa-reports/… --overlay-approved yes] \
//     [--live-identity-mode release-meta|legacy-triangulated] \
//     [--evidence <sanitized EAS JSON file>] [--write]
//
//   HARD GATE: --source-sha must equal --eas-source-sha. Otherwise:
//     RELEASE IDENTITY FAIL / INTENDED / EAS / CURRENT RELEASE STATE NOT UPDATED
//     and exit non-zero.
//   Build number: required from EAS evidence (--build or evidence file). With
//   appVersionSource=remote the local app.json buildNumber is NEVER used.
//   When the app source changes, the web section is re-targeted (exact by
//   default) and the deployment record resets to UNPROVEN until recorded.
//
// Target "web-deployment" — record the serving production deployment after
// you verified it independently (deployment ID + SHA + custom domains):
//   npm run release:finalize -- --target web-deployment \
//     --deployment-id <id> --deployed-sha <sha> --production-branch <branch> \
//     [--receipt qa-reports/…] [--verified-at <iso> | --verified-now] \
//     [--live-identity-mode …] [--domain a.example --domain b.example] [--write]
//
//   HARD GATE: --deployed-sha must equal web.sourceCommit.
//
// Writes are interruption-safe (validate → temp file → fsync → atomic rename)
// and idempotent (identical input → NO CHANGE, nothing rewritten).

import fs from 'node:fs';
import path from 'node:path';
import {
  APP_STORE_STATUSES,
  LIVE_IDENTITY_MODES,
  RELEASE_CODE_INTEGRATIONS,
  SYNC_MODES,
  UNPROVEN,
  atomicWriteFile,
  commitExists,
  defaultManifestPath,
  defaultRenderedPath,
  findStaleTempFiles,
  formatChecks,
  isFullSha,
  isTimestamp,
  loadManifest,
  manifestsEquivalent,
  nowIso,
  optFlag,
  optList,
  optString,
  parseArgs,
  readAppConfig,
  readEasConfig,
  readJsonFile,
  renderCurrentRelease,
  stableJson,
  treeOfCommit,
  validateManifestShape,
  verifyReleaseState,
} from './release-lib.mjs';

const { opts } = parseArgs(process.argv.slice(2));
const repo = path.resolve(optString(opts, 'repo') ?? process.cwd());
const manifestPath = path.resolve(optString(opts, 'manifest') ?? defaultManifestPath(repo));
const renderedPath = path.resolve(optString(opts, 'rendered') ?? defaultRenderedPath(repo));
const target = optString(opts, 'target') ?? 'app';
const write = optFlag(opts, 'write');

const out = [];
const say = (s = '') => out.push(s);
const flush = () => process.stdout.write(`${out.join('\n')}\n`);
const notUpdated = (reasons) => {
  say('');
  say('RELEASE IDENTITY FAIL');
  for (const r of reasons) say(`  - ${r}`);
  say('CURRENT RELEASE STATE NOT UPDATED');
  flush();
  process.exit(1);
};

say(`FLAGSTONE RELEASE FINALIZE (target: ${target}) — ${write ? 'WRITE' : 'DRY RUN (pass --write to apply)'}`);
say(`Manifest: ${manifestPath}`);
say('');

if (!['app', 'web-deployment'].includes(target)) notUpdated([`unknown --target "${target}" (app | web-deployment)`]);

// Interrupted earlier run? A temp file next to the manifest is never valid
// state; remove it and say so. The manifest itself is only ever replaced by
// an atomic rename, so it is either the old complete file or the new one.
for (const stale of findStaleTempFiles(manifestPath)) {
  fs.unlinkSync(stale);
  say(`Removed stale temp file from an interrupted run: ${stale}`);
}

const loaded = loadManifest(manifestPath);
if (!loaded.ok) notUpdated([loaded.error, loaded.recovery ?? 'finalize needs a complete, valid existing manifest to carry governance/deployment context forward']);
const existing = loaded.manifest;
const existingErrors = validateManifestShape(existing);
if (existingErrors.length > 0) notUpdated([`existing manifest is invalid: ${existingErrors.join('; ')}`, 'recover it from Git (git checkout -- release/current.json) before finalizing']);

const eas = readEasConfig(repo);
if (!eas.ok) notUpdated([`eas.json cannot be read: ${eas.error}`]);
const app = readAppConfig(repo);
say(`EAS VERSION SOURCE: ${eas.appVersionSource.toUpperCase()}`);
say(`LOCAL IOS BUILD NUMBER: ${app.ok && app.iosBuildNumber ? app.iosBuildNumber : 'absent'}`);
say(`LOCAL BUILD NUMBER AUTHORITATIVE: ${eas.localBuildAuthoritative}`);
say('');

let candidate;
if (target === 'app') candidate = buildAppCandidate();
else candidate = buildWebDeploymentCandidate();

// Validate the COMPLETE new state before anything touches disk.
candidate.lastVerified = existing.lastVerified;
const report = verifyReleaseState({ repo, manifest: candidate, checkRender: false });
say('Validation of the complete candidate state:');
say(formatChecks(report.checks));
say('');
if (!report.ok) {
  notUpdated(report.checks.filter((c) => c.status === 'FAIL').map((c) => `${c.label}: ${c.detail}`));
}

if (manifestsEquivalent(existing, candidate)) {
  say('NO CHANGE — the control plane already records exactly this state (idempotent). Nothing written.');
  flush();
  process.exit(0);
}

say('PROPOSED CHANGES:');
for (const line of diffLines(existing, candidate)) say(`  ${line}`);
say('');

if (!write) {
  say('DRY RUN — no files changed. Re-run with --write to apply.');
  flush();
  process.exit(0);
}

candidate.lastVerified = nowIso();
atomicWriteFile(manifestPath, stableJson(candidate));
atomicWriteFile(renderedPath, renderCurrentRelease(candidate));
say(`WRITTEN ${manifestPath} (atomic rename; lastVerified ${candidate.lastVerified})`);
say(`WRITTEN ${renderedPath} (re-rendered from the manifest)`);
say('Next: npm run release:verify && npm run release:status — then commit both files to governance main with Sky\'s authorization.');
flush();
process.exit(0);

// ---------------------------------------------------------------------------

function buildAppCandidate() {
  const problems = [];
  const ev = loadEvidence();
  const pick = (flag, evKey, label) => {
    const fromFlag = optString(opts, flag);
    const fromEv = ev && ev[evKey] != null ? String(ev[evKey]) : undefined;
    if (fromFlag !== undefined && fromEv !== undefined && fromFlag !== fromEv) {
      problems.push(`EVIDENCE CONFLICT for ${label}: --${flag} says ${fromFlag} but evidence file says ${fromEv} — trustworthy sources disagree, STOP`);
      return undefined;
    }
    return fromFlag ?? fromEv;
  };

  const version = pick('version', 'appVersion', 'app version');
  const buildRaw = pick('build', 'appBuildVersion', 'iOS build number');
  const sourceSha = optString(opts, 'source-sha');
  const easSourceSha = pick('eas-source-sha', 'gitCommitHash', 'EAS source SHA');
  // Optional facts: when the app source is UNCHANGED (a re-run or an amendment
  // of the same release) an omitted input carries forward from the existing
  // manifest, so identical input stays idempotent. When the app source CHANGES
  // an omitted fact is UNPROVEN/null — never inherited from another release.
  const sameSource = sourceSha === existing.app.sourceCommit;
  const carry = (value, fallback) => (sameSource ? value : fallback);
  const easBuildId = pick('eas-build-id', 'id', 'EAS build ID') ?? carry(existing.app.eas.buildId, null);
  const profile = pick('profile', 'buildProfile', 'EAS profile') ?? carry(existing.app.eas.profile, null);
  const status = pick('status', 'status', 'EAS status') ?? carry(existing.app.eas.status, UNPROVEN);
  const createdAt = pick('eas-created-at', 'createdAt', 'EAS createdAt') ?? carry(existing.app.eas.createdAt, null);
  const appStoreStatus = optString(opts, 'app-store-status') ?? carry(existing.app.appStore.status, UNPROVEN);
  const submittedAt = optString(opts, 'submitted-at') ?? carry(existing.app.appStore.submittedAt, null);
  const originMainAtBuild = optString(opts, 'origin-main-at-build') ?? carry(existing.app.originMainAtBuild, null);

  if (!version) problems.push('--version (or evidence appVersion) is required');
  if (!sourceSha) problems.push('--source-sha (the INTENDED app source SHA) is required');
  else if (!isFullSha(sourceSha)) problems.push(`--source-sha must be a full 40-hex SHA (got ${sourceSha})`);
  if (!easSourceSha) problems.push('--eas-source-sha (or evidence gitCommitHash) is required — the VERIFIED EAS source');
  else if (!isFullSha(easSourceSha)) problems.push(`--eas-source-sha must be a full 40-hex SHA (got ${easSourceSha})`);

  let build = null;
  if (buildRaw === undefined) {
    problems.push(
      `BUILD NUMBER UNPROVEN — --build (or evidence appBuildVersion) is required. EAS appVersionSource=${eas.appVersionSource}; ` +
        `the local app.json buildNumber (${app.ok && app.iosBuildNumber ? app.iosBuildNumber : 'absent'}) is ${eas.appVersionSource === 'remote' ? 'NOT authoritative and was not used' : 'not used by this tool; pass it explicitly'}`,
    );
  } else {
    build = Number.parseInt(buildRaw, 10);
    if (!Number.isInteger(build) || build <= 0 || String(build) !== String(buildRaw).trim()) problems.push(`--build must be a positive integer (got ${buildRaw})`);
  }
  if (createdAt !== null && !isTimestamp(createdAt)) problems.push(`--eas-created-at must be an ISO timestamp (got ${createdAt})`);
  if (submittedAt !== null && !isTimestamp(submittedAt)) problems.push(`--submitted-at must be an ISO timestamp (got ${submittedAt})`);
  if (!APP_STORE_STATUSES.includes(appStoreStatus)) problems.push(`--app-store-status must be one of ${APP_STORE_STATUSES.join('|')}`);
  if (originMainAtBuild !== null && !isFullSha(originMainAtBuild)) problems.push('--origin-main-at-build must be a full SHA (omit it when unproven)');
  if (problems.length) notUpdated(problems);

  // HARD GATE — intended source must be the source EAS actually built.
  if (sourceSha !== easSourceSha) {
    say('RELEASE IDENTITY FAIL');
    say(`INTENDED: ${sourceSha}`);
    say(`EAS:      ${easSourceSha}`);
    say('The EAS build was not made from the intended source. Rebuild from the intended SHA or correct the intended SHA using primary evidence.');
    say('CURRENT RELEASE STATE NOT UPDATED');
    flush();
    process.exit(1);
  }
  say('RELEASE IDENTITY GATE: PASS (intended app source == EAS source)');

  if (!commitExists(repo, sourceSha)) notUpdated([`source commit ${sourceSha} does not exist in ${repo} — fetch it before finalizing`]);
  const actualTree = treeOfCommit(repo, sourceSha);
  const sourceTree = optString(opts, 'source-tree') ?? actualTree;
  if (sourceTree !== actualTree) notUpdated([`--source-tree ${sourceTree} does not match the real tree of ${sourceSha} (${actualTree})`]);
  say(`Source tree: ${sourceTree}${optString(opts, 'source-tree') ? ' (verified against Git)' : ' (derived from Git)'}`);

  const versionSourceForManifest = eas.appVersionSource === 'UNDECLARED' ? existing.app.eas.versionSource : eas.appVersionSource;

  const appSection = {
    version,
    iosBuild: build,
    sourceCommit: sourceSha,
    sourceTree,
    originMainAtBuild,
    eas: { versionSource: versionSourceForManifest, buildId: easBuildId, sourceCommit: easSourceSha, profile, status, createdAt },
    appStore: { status: appStoreStatus, submittedAt },
  };

  const appChanged = sourceSha !== existing.app.sourceCommit;
  const webSync = optString(opts, 'web-sync');
  let webSection;
  if (!appChanged && !webSync) {
    webSection = JSON.parse(JSON.stringify(existing.web));
    say('Web section: carried forward unchanged (app source unchanged, no --web-sync given)');
  } else {
    const mode = webSync ?? 'exact';
    if (!SYNC_MODES.includes(mode)) notUpdated([`--web-sync must be one of ${SYNC_MODES.join('|')}`]);
    const liveMode = optString(opts, 'live-identity-mode') ?? 'release-meta';
    if (!LIVE_IDENTITY_MODES.includes(liveMode)) notUpdated([`--live-identity-mode must be one of ${LIVE_IDENTITY_MODES.join('|')}`]);
    say(`WEB SYNC MODE: ${mode.toUpperCase()}${webSync ? '' : ' (default — web follows app)'}`);
    const deployment = {
      provider: existing.web.deployment.provider,
      project: existing.web.deployment.project,
      team: existing.web.deployment.team,
      productionBranch: UNPROVEN,
      deploymentId: UNPROVEN,
      deployedCommit: UNPROVEN,
      domains: [...existing.web.deployment.domains],
      liveIdentityMode: liveMode,
      verifiedAt: UNPROVEN,
      receipt: null,
    };
    if (mode === 'exact') {
      webSection = { syncMode: 'exact', baseReleaseCommit: sourceSha, sourceCommit: sourceSha, sourceTree, overlay: null, deployment };
    } else {
      const webSha = optString(opts, 'web-source-sha');
      const reason = optString(opts, 'overlay-reason');
      const receipt = optString(opts, 'overlay-receipt');
      const approved = optFlag(opts, 'overlay-approved');
      const p = [];
      if (!webSha || !isFullSha(webSha)) p.push('--web-source-sha (full SHA) is required for web-only-descendant');
      if (!reason) p.push('--overlay-reason is required for web-only-descendant');
      if (!receipt) p.push('--overlay-receipt (repo-relative path) is required for web-only-descendant');
      if (!approved) p.push('overlay approval must be explicit: --overlay-approved yes');
      if (p.length) notUpdated(p);
      if (!commitExists(repo, webSha)) notUpdated([`web source commit ${webSha} does not exist in ${repo}`]);
      const webTreeActual = treeOfCommit(repo, webSha);
      const webTree = optString(opts, 'web-source-tree') ?? webTreeActual;
      if (webTree !== webTreeActual) notUpdated([`--web-source-tree ${webTree} does not match the real tree of ${webSha} (${webTreeActual})`]);
      webSection = {
        syncMode: 'web-only-descendant',
        baseReleaseCommit: sourceSha,
        sourceCommit: webSha,
        sourceTree: webTree,
        overlay: { baseCommit: sourceSha, headCommit: webSha, reason, approved: true, receipt },
        deployment,
      };
      say('WEB SOURCE DIFFERS FROM IOS SOURCE');
      say('MODE: APPROVED WEB-ONLY DESCENDANT (explicit platform overlay, not drift)');
    }
    say('WEB EXPECTED SOURCE RESET — deployment record is now UNPROVEN until recorded with --target web-deployment after independent live verification.');
  }

  const integration = optString(opts, 'release-code-integration') ?? existing.governance.releaseCodeIntegration;
  if (!RELEASE_CODE_INTEGRATIONS.includes(integration)) notUpdated([`--release-code-integration must be one of ${RELEASE_CODE_INTEGRATIONS.join('|')}`]);
  const governanceBase = optString(opts, 'governance-base') ?? existing.governance.baseCommit;
  if (!isFullSha(governanceBase)) notUpdated(['--governance-base must be a full SHA']);
  const releaseTag = optString(opts, 'release-tag') ?? existing.releaseTag;

  return {
    schemaVersion: existing.schemaVersion,
    product: existing.product,
    governance: { baseCommit: governanceBase, releaseCodeIntegration: integration },
    app: appSection,
    web: webSection,
    releaseTag,
    lastVerified: existing.lastVerified,
  };
}

function buildWebDeploymentCandidate() {
  const problems = [];
  const deploymentId = optString(opts, 'deployment-id');
  const deployedSha = optString(opts, 'deployed-sha');
  const productionBranch = optString(opts, 'production-branch');
  const receipt = optString(opts, 'receipt') ?? existing.web.deployment.receipt;
  const liveMode = optString(opts, 'live-identity-mode') ?? existing.web.deployment.liveIdentityMode;
  const domains = optList(opts, 'domain');
  let verifiedAt = optString(opts, 'verified-at') ?? (optFlag(opts, 'verified-now') ? nowIso() : UNPROVEN);
  if (!deploymentId) problems.push('--deployment-id is required');
  if (!deployedSha || !isFullSha(deployedSha)) problems.push('--deployed-sha (full SHA actually serving production) is required');
  if (!productionBranch) problems.push('--production-branch (the host\'s configured production branch) is required');
  if (!LIVE_IDENTITY_MODES.includes(liveMode)) problems.push(`--live-identity-mode must be one of ${LIVE_IDENTITY_MODES.join('|')}`);
  if (verifiedAt !== UNPROVEN && !isTimestamp(verifiedAt)) problems.push(`--verified-at must be an ISO timestamp (got ${verifiedAt})`);
  if (problems.length) notUpdated(problems);

  if (deployedSha !== existing.web.sourceCommit) {
    say('RELEASE IDENTITY FAIL');
    say(`EXPECTED WEB SOURCE: ${existing.web.sourceCommit}`);
    say(`DEPLOYED:            ${deployedSha}`);
    say('The serving deployment is not the expected web source. Branch Tracking or a promotion did not produce the expected SHA — do not record it.');
    say('CURRENT RELEASE STATE NOT UPDATED');
    flush();
    process.exit(1);
  }
  say('LIVE IDENTITY GATE: PASS (deployed SHA == expected web source)');
  if (verifiedAt === UNPROVEN) say('verifiedAt: UNPROVEN (pass --verified-at <iso> or --verified-now to stamp a real clock reading)');

  const candidate = JSON.parse(JSON.stringify(existing));
  candidate.web.deployment = {
    ...candidate.web.deployment,
    productionBranch,
    deploymentId,
    deployedCommit: deployedSha,
    domains: domains.length ? domains : candidate.web.deployment.domains,
    liveIdentityMode: liveMode,
    verifiedAt,
    receipt,
  };
  return candidate;
}

/** Sanitized EAS evidence file: only known identity keys are read or shown. */
function loadEvidence() {
  const file = optString(opts, 'evidence');
  if (!file) return null;
  const r = readJsonFile(path.resolve(file));
  if (!r.ok) notUpdated([`evidence file: ${r.error}`]);
  let v = r.value;
  if (Array.isArray(v)) {
    if (v.length !== 1) notUpdated([`evidence file must contain exactly one build (got ${v.length})`]);
    v = v[0];
  }
  if (!v || typeof v !== 'object') notUpdated(['evidence file must be a JSON object (e.g. sanitized `eas build:view --json`)']);
  const keys = ['id', 'status', 'platform', 'gitCommitHash', 'buildProfile', 'createdAt', 'appVersion', 'appBuildVersion'];
  const picked = {};
  for (const k of keys) if (v[k] != null) picked[k] = v[k];
  say(`Evidence file: ${file}`);
  say(`  identity fields read: ${Object.entries(picked).map(([k, val]) => `${k}=${val}`).join(', ') || '(none)'}`);
  return picked;
}

function diffLines(before, after) {
  const flat = (obj, prefix = '', acc = {}) => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) flat(v, prefix ? `${prefix}.${k}` : k, acc);
    } else acc[prefix] = JSON.stringify(obj);
    return acc;
  };
  const a = flat(before);
  const b = flat(after);
  const lines = [];
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    if (key === 'lastVerified') continue;
    if (a[key] !== b[key]) lines.push(`${key}: ${a[key] ?? '(absent)'} → ${b[key] ?? '(removed)'}`);
  }
  return lines;
}
