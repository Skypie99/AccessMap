// scripts/release-lib.mjs — shared helpers for the Flagstone release control plane.
//
// Read docs/RELEASE_IDENTITY.md first. Every release CLI (scripts/release-*.mjs,
// scripts/verify-*.mjs, scripts/render-current-release.mjs) imports from here.
//
// Design rules (Release Source Lock v2):
//   - release/current.json is the ONE machine-readable control-plane authority.
//   - The manifest describes immutable historical Git objects. It never has to
//     live inside the commit it describes (no self-reference).
//   - UNPROVEN is a first-class value. It is reported as UNPROVEN, never as PASS.
//   - Nothing here reads .env, prints environment values, or needs a secret.
//   - Nothing here pushes, merges, tags, deploys, or runs EAS.
//   - Node built-ins only. No dependencies, so CI can run it without `npm ci`.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 2;
export const PRODUCT = 'Flagstone';
export const UNPROVEN = 'UNPROVEN';
export const FULL_SHA_RE = /^[0-9a-f]{40}$/;
export const SEMVER_RE = /^\d+\.\d+\.\d+$/;
// ISO-8601 date (YYYY-MM-DD) or date-time with an explicit zone. Date-only is
// accepted on purpose: a receipt that only proves a date must not be forced
// into a fabricated precise time.
export const TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;
export const SYNC_MODES = ['exact', 'web-only-descendant'];
export const LIVE_IDENTITY_MODES = ['legacy-triangulated', 'release-meta'];
export const RELEASE_CODE_INTEGRATIONS = ['deferred', 'converged'];
export const VERSION_SOURCES = ['remote', 'local'];
export const APP_STORE_STATUSES = [
  'not_submitted',
  'submitted_for_review',
  'in_review',
  'approved',
  'released',
  'rejected',
  UNPROVEN,
];
export const DEFAULT_MANIFEST_REL = 'release/current.json';
export const DEFAULT_RENDERED_REL = 'qa-reports/CURRENT_RELEASE.md';
export const RELEASE_META_PATH = '/release-meta.json';
export const RELEASE_META_SCHEMA_VERSION = 1;
export const RELEASE_META_KEYS = [
  'schemaVersion',
  'product',
  'appVersion',
  'iosBuild',
  'webSourceCommit',
  'webSourceTree',
  'builtAt',
];
export const EXPERIENCE_GATE_LINE =
  'RECRUITER / PRODUCT EXPERIENCE: SEPARATE GATE — NOT ASSESSED BY THIS TOOL ' +
  '(source identity PASS never implies experience PASS)';

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export function scriptsRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function short(sha) {
  return typeof sha === 'string' && FULL_SHA_RE.test(sha) ? sha.slice(0, 7) : String(sha);
}

export function isFullSha(v) {
  return typeof v === 'string' && FULL_SHA_RE.test(v);
}

export function isTimestamp(v) {
  return typeof v === 'string' && TIMESTAMP_RE.test(v);
}

export function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Minimal `--key value` / `--key=value` / `--flag` parser. Repeated keys become
 * arrays. No dependency on any argv library.
 */
export function parseArgs(argv) {
  const opts = Object.create(null);
  const positional = [];
  const set = (k, v) => {
    if (k in opts) opts[k] = Array.isArray(opts[k]) ? [...opts[k], v] : [opts[k], v];
    else opts[k] = v;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) {
      set(body.slice(0, eq), body.slice(eq + 1));
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      set(body, next);
      i += 1;
    } else {
      set(body, true);
    }
  }
  return { opts, positional };
}

export function optString(opts, key) {
  const v = opts[key];
  if (v === undefined || v === true) return undefined;
  return Array.isArray(v) ? String(v[v.length - 1]) : String(v);
}

export function optFlag(opts, key) {
  const v = opts[key];
  return v === true || v === 'true' || v === 'yes' || v === '1';
}

export function optList(opts, key) {
  const v = opts[key];
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).filter((x) => x !== true).map(String);
}

export function readJsonFile(file) {
  if (!fs.existsSync(file)) return { ok: false, error: `file not found: ${file}` };
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return { ok: false, error: `unreadable: ${file} (${e.message})` };
  }
  try {
    return { ok: true, value: JSON.parse(raw), raw };
  } catch (e) {
    return { ok: false, error: `invalid JSON in ${file}: ${e.message}`, raw };
  }
}

/** Strip userinfo (tokens, passwords) from a remote URL before printing it. */
export function sanitizeUrl(u) {
  if (typeof u !== 'string') return u;
  try {
    const url = new URL(u);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    // scp-like syntax (git@host:owner/repo.git) carries no secret; strip any
    // `//user:pass@` form defensively.
    return u.replace(/\/\/[^@/]+@/, '//');
  }
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

/** Deep equality that ignores key order and the `lastVerified` stamp. */
export function manifestsEquivalent(a, b) {
  const strip = (m) => {
    const clone = JSON.parse(JSON.stringify(m));
    delete clone.lastVerified;
    return canonicalize(clone);
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/**
 * Interruption-safe write: validate first (caller's job), then write to a
 * temp file in the same directory, fsync, atomically rename into place.
 * A reader never sees a half-written file.
 */
export function atomicWriteFile(file, contents) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${Date.now()}`);
  const fd = fs.openSync(tmp, 'w', 0o644);
  try {
    fs.writeFileSync(fd, contents, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  try {
    const dfd = fs.openSync(dir, 'r');
    try {
      fs.fsyncSync(dfd);
    } catch {
      // Directory fsync is best-effort on some filesystems.
    } finally {
      fs.closeSync(dfd);
    }
  } catch {
    // ignore
  }
}

/** Temp files left behind by an interrupted atomicWriteFile of `file`. */
export function findStaleTempFiles(file) {
  const dir = path.dirname(file);
  const prefix = `.${path.basename(file)}.tmp-`;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(dir, name));
}

// ---------------------------------------------------------------------------
// Git (always real, live output — never a UI/harness snapshot)
// ---------------------------------------------------------------------------

export function runGit(repo, args) {
  const res = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (res.error) return { ok: false, status: -1, stdout: '', rawStdout: '', stderr: res.error.message };
  return {
    ok: res.status === 0,
    status: res.status ?? -1,
    stdout: (res.stdout || '').trim(),
    rawStdout: res.stdout || '',
    stderr: (res.stderr || '').trim(),
  };
}

export function gitRepoInfo(repo) {
  const top = runGit(repo, ['rev-parse', '--show-toplevel']);
  if (!top.ok) return { ok: false, error: `repository identity cannot resolve at ${repo}: ${top.stderr}` };
  const toplevel = top.stdout;
  const gitDir = runGit(repo, ['rev-parse', '--absolute-git-dir']);
  const common = runGit(repo, ['rev-parse', '--git-common-dir']);
  const gitDirAbs = gitDir.ok ? path.resolve(toplevel, gitDir.stdout) : null;
  const commonAbs = common.ok ? path.resolve(toplevel, common.stdout) : null;
  const shallow = runGit(repo, ['rev-parse', '--is-shallow-repository']).stdout === 'true';
  const head = runGit(repo, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']);
  const tree = head.ok ? runGit(repo, ['rev-parse', '--verify', '--quiet', 'HEAD^{tree}']) : { ok: false };
  const branch = runGit(repo, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const origin = runGit(repo, ['remote', 'get-url', 'origin']);
  const originMain = runGit(repo, ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main^{commit}']);
  return {
    ok: true,
    toplevel,
    gitDir: gitDirAbs,
    commonDir: commonAbs,
    isLinkedWorktree: Boolean(gitDirAbs && commonAbs && gitDirAbs !== commonAbs),
    shallow,
    head: head.ok ? head.stdout : null,
    tree: tree.ok ? tree.stdout : null,
    branch: branch.ok ? branch.stdout : '(detached HEAD)',
    originUrl: origin.ok ? sanitizeUrl(origin.stdout) : null,
    originMain: originMain.ok ? originMain.stdout : null,
  };
}

export function gitStatusSummary(repo) {
  const res = runGit(repo, ['status', '--porcelain=v1', '-uall', '--no-renames']);
  if (!res.ok) return { ok: false, error: res.stderr };
  const lines = res.rawStdout.split('\n').filter((l) => l.length > 0);
  const tracked = lines.filter((l) => !l.startsWith('??'));
  const untracked = lines.filter((l) => l.startsWith('??'));
  return {
    ok: true,
    trackedDirty: tracked.length,
    untracked: untracked.length,
    trackedPaths: tracked.map((l) => l.slice(3)),
    untrackedPaths: untracked.map((l) => l.slice(3)),
  };
}

export function commitExists(repo, sha) {
  return runGit(repo, ['cat-file', '-e', `${sha}^{commit}`]).ok;
}

export function treeOfCommit(repo, sha) {
  const r = runGit(repo, ['rev-parse', '--verify', '--quiet', `${sha}^{tree}`]);
  return r.ok ? r.stdout : null;
}

export function isAncestor(repo, ancestor, descendant) {
  const r = runGit(repo, ['merge-base', '--is-ancestor', ancestor, descendant]);
  if (r.status === 0) return { ok: true, ancestor: true };
  if (r.status === 1) return { ok: true, ancestor: false };
  return { ok: false, error: r.stderr || `git merge-base exited ${r.status}` };
}

export function resolveRef(repo, ref) {
  const r = runGit(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  return r.ok ? r.stdout : null;
}

export function aheadBehind(repo, base, head) {
  const r = runGit(repo, ['rev-list', '--left-right', '--count', `${base}...${head}`]);
  if (!r.ok) return null;
  const [behind, ahead] = r.stdout.split(/\s+/).map((n) => Number.parseInt(n, 10));
  return { ahead, behind };
}

export function lsRemoteRef(repo, remote, ref) {
  const r = runGit(repo, ['ls-remote', '--exit-code', remote, ref]);
  if (!r.ok) return { ok: false, error: r.stderr || `ref not found on ${remote}: ${ref}` };
  return { ok: true, sha: r.stdout.split(/\s+/)[0] };
}

/** Conservative branch-name check (subset of git check-ref-format --branch). */
export function isPlausibleBranchName(name) {
  if (!isNonEmptyString(name)) return false;
  if (/[\s~^:?*[\\]/.test(name)) return false;
  if (name.startsWith('-') || name.startsWith('/') || name.endsWith('/')) return false;
  if (name.includes('..') || name.includes('//') || name.includes('@{')) return false;
  if (name.endsWith('.lock') || name.endsWith('.')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// app.json / eas.json (identity inputs only — never .env)
// ---------------------------------------------------------------------------

export function readAppConfig(repo) {
  const r = readJsonFile(path.join(repo, 'app.json'));
  if (!r.ok) return { ok: false, error: r.error };
  const expo = r.value && typeof r.value === 'object' && r.value.expo ? r.value.expo : r.value;
  const ios = expo && typeof expo === 'object' ? expo.ios : undefined;
  return {
    ok: true,
    name: expo?.name ?? null,
    slug: expo?.slug ?? null,
    version: typeof expo?.version === 'string' ? expo.version : null,
    iosBuildNumber: ios && ios.buildNumber != null ? String(ios.buildNumber) : null,
  };
}

/**
 * EAS version-source semantics. When `cli.appVersionSource` is "remote", the
 * submitted build number lives on EAS servers and app.json's buildNumber is
 * diagnostic only. When undeclared we report UNDECLARED rather than guess.
 */
export function readEasConfig(repo) {
  const file = path.join(repo, 'eas.json');
  if (!fs.existsSync(file)) {
    return { ok: true, present: false, appVersionSource: 'UNDECLARED', localBuildAuthoritative: UNPROVEN };
  }
  const r = readJsonFile(file);
  if (!r.ok) return { ok: false, error: r.error };
  const declared = r.value?.cli?.appVersionSource;
  if (declared === 'remote') return { ok: true, present: true, appVersionSource: 'remote', localBuildAuthoritative: 'NO' };
  if (declared === 'local') return { ok: true, present: true, appVersionSource: 'local', localBuildAuthoritative: 'YES' };
  return { ok: true, present: true, appVersionSource: 'UNDECLARED', localBuildAuthoritative: UNPROVEN };
}

// ---------------------------------------------------------------------------
// Manifest (release/current.json, schema v2)
// ---------------------------------------------------------------------------

export function defaultManifestPath(repo) {
  return path.join(repo, DEFAULT_MANIFEST_REL);
}

export function defaultRenderedPath(repo) {
  return path.join(repo, DEFAULT_RENDERED_REL);
}

export function loadManifest(file) {
  const r = readJsonFile(file);
  if (!r.ok) {
    const unreadable = r.raw !== undefined; // exists but not parseable
    return {
      ok: false,
      error: unreadable ? `MANIFEST UNREADABLE — ${r.error}` : r.error,
      recovery: unreadable
        ? 'The control plane is versioned. Recover the last committed manifest with: git checkout -- release/current.json'
        : undefined,
    };
  }
  return { ok: true, manifest: r.value, raw: r.raw };
}

const TOP_LEVEL_KEYS = ['schemaVersion', 'product', 'governance', 'app', 'web', 'releaseTag', 'lastVerified'];

/** Schema-level validation (no Git). Returns a list of human-readable errors. */
export function validateManifestShape(m) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const shaOrUnproven = (v) => v === UNPROVEN || isFullSha(v);
  const tsOrUnproven = (v) => v === UNPROVEN || isTimestamp(v);

  if (!isObj(m)) return ['manifest is not a JSON object'];
  for (const key of Object.keys(m)) if (!TOP_LEVEL_KEYS.includes(key)) err(`unknown top-level key "${key}" (schema v2 is deliberately small)`);
  if (m.schemaVersion !== SCHEMA_VERSION) err(`schemaVersion must be ${SCHEMA_VERSION} (got ${JSON.stringify(m.schemaVersion)})`);
  if (!isNonEmptyString(m.product)) err('product must be a non-empty string');

  const g = m.governance;
  if (!isObj(g)) err('governance must be an object');
  else {
    if (!isFullSha(g.baseCommit)) err(`governance.baseCommit must be a full 40-hex SHA (got ${JSON.stringify(g.baseCommit)})`);
    if (!RELEASE_CODE_INTEGRATIONS.includes(g.releaseCodeIntegration)) err(`governance.releaseCodeIntegration must be one of ${RELEASE_CODE_INTEGRATIONS.join('|')}`);
  }

  const a = m.app;
  if (!isObj(a)) err('app must be an object');
  else {
    if (!(typeof a.version === 'string' && SEMVER_RE.test(a.version))) err(`app.version must look like 1.2.3 (got ${JSON.stringify(a.version)})`);
    if (!(Number.isInteger(a.iosBuild) && a.iosBuild > 0)) err(`app.iosBuild must be a positive integer (got ${JSON.stringify(a.iosBuild)})`);
    if (!isFullSha(a.sourceCommit)) err(`app.sourceCommit must be a full 40-hex SHA (got ${JSON.stringify(a.sourceCommit)})`);
    if (!isFullSha(a.sourceTree)) err(`app.sourceTree must be a full 40-hex tree SHA (got ${JSON.stringify(a.sourceTree)})`);
    if (!(a.originMainAtBuild === null || isFullSha(a.originMainAtBuild))) err('app.originMainAtBuild must be null or a full SHA');
    const e = a.eas;
    if (!isObj(e)) err('app.eas must be an object');
    else {
      if (!VERSION_SOURCES.includes(e.versionSource)) err(`app.eas.versionSource must be one of ${VERSION_SOURCES.join('|')}`);
      if (!(e.buildId === null || isNonEmptyString(e.buildId))) err('app.eas.buildId must be null or a non-empty string');
      if (!isFullSha(e.sourceCommit)) err(`app.eas.sourceCommit must be a full 40-hex SHA — an unproven EAS source is a release-identity failure (got ${JSON.stringify(e.sourceCommit)})`);
      if (!(e.profile === null || isNonEmptyString(e.profile))) err('app.eas.profile must be null or a non-empty string');
      if (!isNonEmptyString(e.status)) err('app.eas.status must be a non-empty string (use "UNPROVEN" when unknown)');
      if (!(e.createdAt === null || isTimestamp(e.createdAt))) err('app.eas.createdAt must be null or an ISO timestamp');
    }
    const s = a.appStore;
    if (!isObj(s)) err('app.appStore must be an object');
    else {
      if (!APP_STORE_STATUSES.includes(s.status)) err(`app.appStore.status must be one of ${APP_STORE_STATUSES.join('|')}`);
      if (!(s.submittedAt === null || isTimestamp(s.submittedAt))) err('app.appStore.submittedAt must be null or an ISO timestamp');
    }
  }

  const w = m.web;
  if (!isObj(w)) err('web must be an object');
  else {
    if (!SYNC_MODES.includes(w.syncMode)) err(`web.syncMode must be one of ${SYNC_MODES.join('|')} (got ${JSON.stringify(w.syncMode)})`);
    if (!isFullSha(w.baseReleaseCommit)) err('web.baseReleaseCommit must be a full 40-hex SHA');
    if (!isFullSha(w.sourceCommit)) err('web.sourceCommit must be a full 40-hex SHA');
    if (!isFullSha(w.sourceTree)) err('web.sourceTree must be a full 40-hex tree SHA');
    if (!(w.overlay === null || isObj(w.overlay))) err('web.overlay must be null or an object');
    else if (isObj(w.overlay)) {
      const o = w.overlay;
      if (!isFullSha(o.baseCommit)) err('web.overlay.baseCommit must be a full SHA');
      if (!isFullSha(o.headCommit)) err('web.overlay.headCommit must be a full SHA');
      if (!isNonEmptyString(o.reason)) err('web.overlay.reason must be a non-empty string');
      if (o.approved !== true) err('web.overlay.approved must be exactly true (explicit approval)');
      if (!isNonEmptyString(o.receipt)) err('web.overlay.receipt must be a repo-relative path');
    }
    const d = w.deployment;
    if (!isObj(d)) err('web.deployment must be an object');
    else {
      if (!isNonEmptyString(d.provider)) err('web.deployment.provider must be a non-empty string');
      if (!isNonEmptyString(d.project)) err('web.deployment.project must be a non-empty string');
      if (!isNonEmptyString(d.team)) err('web.deployment.team must be a non-empty string');
      if (!(d.productionBranch === UNPROVEN || isPlausibleBranchName(d.productionBranch))) err(`web.deployment.productionBranch must be a plausible branch name or "UNPROVEN" (got ${JSON.stringify(d.productionBranch)})`);
      if (!(d.deploymentId === UNPROVEN || isNonEmptyString(d.deploymentId))) err('web.deployment.deploymentId must be a non-empty string or "UNPROVEN"');
      if (!shaOrUnproven(d.deployedCommit)) err(`web.deployment.deployedCommit must be a full SHA or "UNPROVEN" (got ${JSON.stringify(d.deployedCommit)})`);
      if (!(Array.isArray(d.domains) && d.domains.length > 0 && d.domains.every(isNonEmptyString))) err('web.deployment.domains must be a non-empty array of hostnames');
      if (!LIVE_IDENTITY_MODES.includes(d.liveIdentityMode)) err(`web.deployment.liveIdentityMode must be one of ${LIVE_IDENTITY_MODES.join('|')}`);
      if (!tsOrUnproven(d.verifiedAt)) err('web.deployment.verifiedAt must be an ISO date/timestamp or "UNPROVEN"');
      if (!(d.receipt === null || isNonEmptyString(d.receipt))) err('web.deployment.receipt must be null or a repo-relative path');
    }
  }

  if (!(m.releaseTag === null || isNonEmptyString(m.releaseTag))) err('releaseTag must be null or a non-empty string');
  if (!isTimestamp(m.lastVerified)) err('lastVerified must be an ISO timestamp');
  return errors;
}

// ---------------------------------------------------------------------------
// Rendering (qa-reports/CURRENT_RELEASE.md) — deterministic from the manifest
// ---------------------------------------------------------------------------

function code(v) {
  return `\`${v}\``;
}

export function renderCurrentRelease(m) {
  const a = m.app;
  const w = m.web;
  const d = w.deployment;
  const modeLabel =
    w.syncMode === 'exact' ? 'exact (WEB = APP)' : 'web-only-descendant (APPROVED WEB-ONLY DESCENDANT)';
  const lines = [];
  const p = (s = '') => lines.push(s);
  p(`# ${m.product} — Current Release`);
  p();
  p('<!-- GENERATED FILE — do not hand-edit. Machine authority: release/current.json.');
  p('     Regenerate with `npm run release:render`. `npm run release:verify` fails when this file drifts. -->');
  p();
  p(`> Derived from ${code('release/current.json')} (schema v${m.schemaVersion}) by ${code('npm run release:render')}.`);
  p('> Do not hand-maintain values here. Change the manifest through `npm run release:finalize`, then re-render.');
  p();
  p('## APP');
  p();
  p(`- Version: ${a.version}`);
  p(`- iOS build: ${a.iosBuild} (authoritative source: EAS ${a.eas.versionSource} version source; local app.json buildNumber is diagnostic only)`);
  p(`- Source: ${code(a.sourceCommit)}`);
  p(`- Tree: ${code(a.sourceTree)}`);
  p(`- EAS source: ${code(a.eas.sourceCommit)} (build ID: ${a.eas.buildId ?? UNPROVEN}; profile: ${a.eas.profile ?? UNPROVEN}; status: ${a.eas.status}; created: ${a.eas.createdAt ?? UNPROVEN})`);
  p(`- origin/main at build: ${a.originMainAtBuild ? code(a.originMainAtBuild) : UNPROVEN}`);
  p(`- App Store state: ${a.appStore.status}${a.appStore.submittedAt ? ` (submitted ${a.appStore.submittedAt})` : ''}`);
  p();
  p('## WEB');
  p();
  p(`- Mode: ${modeLabel}`);
  p(`- Base: ${code(w.baseReleaseCommit)}`);
  p(`- Source: ${code(w.sourceCommit)}`);
  p(`- Tree: ${code(w.sourceTree)}`);
  if (w.overlay) {
    p(`- Overlay: ${w.overlay.reason} (approved: ${w.overlay.approved ? 'yes' : 'NO'}; receipt: ${code(w.overlay.receipt)})`);
  } else {
    p('- Overlay: none');
  }
  p(`- Deployed: ${d.deployedCommit === UNPROVEN ? UNPROVEN : code(d.deployedCommit)}`);
  p(`- Production branch: ${d.productionBranch === UNPROVEN ? UNPROVEN : code(d.productionBranch)}`);
  p(`- Deployment ID: ${d.deploymentId === UNPROVEN ? UNPROVEN : code(d.deploymentId)}`);
  p(`- Provider: ${d.provider} project ${code(d.project)} (team ${code(d.team)})`);
  p(`- Domains: ${d.domains.join(', ')}`);
  p(`- Live identity mode: ${d.liveIdentityMode}`);
  p(`- Deployment verified at: ${d.verifiedAt}`);
  p(`- Deployment receipt: ${d.receipt ? code(d.receipt) : 'none recorded'}`);
  p();
  p('## MAIN');
  p();
  p(`- Release-code integration: ${m.governance.releaseCodeIntegration.toUpperCase()}`);
  p(`- Governance base: ${code(m.governance.baseCommit)}`);
  p(`- Release tag: ${m.releaseTag ? code(m.releaseTag) : 'none'}`);
  p();
  p(`Last verified: ${m.lastVerified}`);
  p();
  p(`Machine authority: ${code('release/current.json')}`);
  p();
  p('Note: Branch Tracking on the host never proves the serving deployment; "Deployed" above is the recorded serving SHA, and a live release-meta check is a separate step (`npm run release:web:verify-live`). Source identity and recruiter/product experience are separate gates.');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Central verification engine
// ---------------------------------------------------------------------------

/**
 * Validate the control-plane state against real Git objects.
 * Options:
 *   repo          — path inside the repository (default: cwd)
 *   manifest      — in-memory manifest (skips file load)
 *   manifestPath  — path to release/current.json
 *   renderedPath  — path to CURRENT_RELEASE.md; checkRender=false skips it
 *   remote        — also ls-remote the production branch (network; default off)
 * Returns { ok, checks:[{id,status,label,detail}], summary, manifest }.
 * Status vocabulary: PASS | FAIL | WARN | SKIP | UNPROVEN | INFO.
 * ok === true only when there is no FAIL. UNPROVEN is never counted as PASS.
 */
export function verifyReleaseState(options = {}) {
  const repo = options.repo ?? process.cwd();
  const checks = [];
  const add = (id, status, label, detail = '') => checks.push({ id, status, label, detail });
  const done = (manifest, extra = {}) => {
    const failed = checks.filter((c) => c.status === 'FAIL');
    return { ok: failed.length === 0, checks, manifest, summary: summarize(manifest, checks, extra), repo };
  };

  // 1. Manifest readable + schema
  let manifest = options.manifest;
  const manifestPath = options.manifestPath ?? defaultManifestPath(repo);
  if (!manifest) {
    const loaded = loadManifest(manifestPath);
    if (!loaded.ok) {
      add('manifest.readable', 'FAIL', 'Manifest readable', `${loaded.error}${loaded.recovery ? ` — ${loaded.recovery}` : ''}`);
      return done(null);
    }
    manifest = loaded.manifest;
    add('manifest.readable', 'PASS', 'Manifest readable', manifestPath);
  } else {
    add('manifest.readable', 'PASS', 'Manifest readable', '(in-memory candidate)');
  }
  const shapeErrors = validateManifestShape(manifest);
  if (shapeErrors.length > 0) {
    add('manifest.schema', 'FAIL', 'Manifest schema v2', shapeErrors.join('; '));
    return done(manifest);
  }
  add('manifest.schema', 'PASS', 'Manifest schema v2', 'shape + full-SHA formatting valid');

  const a = manifest.app;
  const w = manifest.web;
  const d = w.deployment;

  // 2. Git repository
  const info = gitRepoInfo(repo);
  if (!info.ok) {
    add('git.repo', 'FAIL', 'Git repository', info.error);
    return done(manifest);
  }
  add('git.repo', 'PASS', 'Git repository', `${info.toplevel}${info.isLinkedWorktree ? ' (linked worktree)' : ''}`);
  if (info.shallow) {
    add('git.shallow', 'FAIL', 'Full history available', 'SHALLOW CLONE — ancestry and object checks cannot be trusted. Fetch full history (fetch-depth: 0).');
    return done(manifest);
  }
  add('git.shallow', 'PASS', 'Full history available', 'not a shallow clone');

  const objectCheck = (id, label, sha, expectedTree) => {
    if (!commitExists(repo, sha)) {
      add(id, 'FAIL', label, `commit ${sha} not found in this repository (fetch the release branch / full history)`);
      return false;
    }
    if (expectedTree !== undefined) {
      const tree = treeOfCommit(repo, sha);
      if (tree !== expectedTree) {
        add(`${id}.tree`, 'FAIL', `${label} tree`, `commit ${short(sha)} has tree ${tree}, manifest says ${expectedTree}`);
        return false;
      }
      add(id, 'PASS', label, `${sha} → tree ${expectedTree}`);
      return true;
    }
    add(id, 'PASS', label, sha);
    return true;
  };

  // 3. Governance base + app source
  objectCheck('governance.base-object', 'Governance base commit exists', manifest.governance.baseCommit);
  objectCheck('app.source-object', 'App source commit ↔ tree', a.sourceCommit, a.sourceTree);

  // 4. EAS gate: intended source must equal the EAS-built source
  if (a.eas.sourceCommit === a.sourceCommit) {
    add('app.eas-source-gate', 'PASS', 'EAS source == intended app source', a.eas.sourceCommit);
  } else {
    add('app.eas-source-gate', 'FAIL', 'EAS source == intended app source', `RELEASE IDENTITY FAIL — INTENDED ${a.sourceCommit} vs EAS ${a.eas.sourceCommit}`);
  }

  // 5. EAS remote-version-source semantics
  const eas = readEasConfig(repo);
  if (!eas.ok) add('app.eas-version-source', 'FAIL', 'EAS version source', eas.error);
  else if (!eas.present) add('app.eas-version-source', 'SKIP', 'EAS version source', `no eas.json in ${repo}; manifest declares ${a.eas.versionSource}`);
  else if (eas.appVersionSource === 'UNDECLARED') add('app.eas-version-source', 'WARN', 'EAS version source', `eas.json does not declare cli.appVersionSource; manifest declares ${a.eas.versionSource}`);
  else if (eas.appVersionSource === a.eas.versionSource) add('app.eas-version-source', 'PASS', 'EAS version source', `${eas.appVersionSource.toUpperCase()} (eas.json agrees with manifest)`);
  else add('app.eas-version-source', 'FAIL', 'EAS version source', `eas.json says ${eas.appVersionSource}, manifest says ${a.eas.versionSource}`);
  const app = readAppConfig(repo);
  if (app.ok) {
    const authoritative = a.eas.versionSource === 'remote' ? 'NO' : 'YES';
    add('app.local-build-number', 'INFO', 'Local app.json buildNumber', `${app.iosBuildNumber ?? 'absent'} — authoritative: ${authoritative}; manifest iosBuild ${a.iosBuild} comes from release evidence, never from app.json`);
    if (app.version && app.version !== a.version) add('app.local-version', 'INFO', 'Local app.json version', `${app.version} differs from manifest ${a.version} (expected when HEAD is not the release source)`);
  } else {
    add('app.local-build-number', 'SKIP', 'Local app.json buildNumber', app.error);
  }

  // 6. Web base + sync mode
  if (w.baseReleaseCommit === a.sourceCommit) add('web.base-equals-app', 'PASS', 'Web base == app source', w.baseReleaseCommit);
  else add('web.base-equals-app', 'FAIL', 'Web base == app source', `web.baseReleaseCommit ${w.baseReleaseCommit} ≠ app.sourceCommit ${a.sourceCommit} — APP ↔ WEB NOT SYNCHRONIZED; a new finalized app release with an older demo requires an explicit governance decision (docs/RELEASE_IDENTITY.md §6)`);
  add('web.sync-mode', 'PASS', 'Web sync mode', w.syncMode);

  const webObjOk = objectCheck('web.source-object', 'Web source commit ↔ tree', w.sourceCommit, w.sourceTree);
  let ancestryStatus = 'n/a';
  if (w.syncMode === 'exact') {
    if (w.sourceCommit === a.sourceCommit && w.sourceTree === a.sourceTree) add('web.exact-equality', 'PASS', 'Exact mode: web == app', w.sourceCommit);
    else add('web.exact-equality', 'FAIL', 'Exact mode: web == app', `web ${w.sourceCommit}/${w.sourceTree} ≠ app ${a.sourceCommit}/${a.sourceTree}`);
    if (w.overlay !== null) add('web.overlay', 'FAIL', 'Overlay', 'exact mode must not carry an overlay');
    else add('web.overlay', 'PASS', 'Overlay', 'none (exact mode)');
  } else {
    if (w.sourceCommit === a.sourceCommit) add('web.descendant-distinct', 'FAIL', 'Descendant mode: web ≠ app', 'web source equals app source — use syncMode "exact"');
    if (webObjOk && commitExists(repo, a.sourceCommit)) {
      const anc = isAncestor(repo, a.sourceCommit, w.sourceCommit);
      if (!anc.ok) {
        add('web.descendant-ancestry', 'FAIL', 'Descendant ancestry: app is ancestor of web', anc.error);
        ancestryStatus = 'FAIL';
      } else if (anc.ancestor) {
        add('web.descendant-ancestry', 'PASS', 'Descendant ancestry: app is ancestor of web', `${short(a.sourceCommit)} → ${short(w.sourceCommit)}`);
        ancestryStatus = 'PASS';
      } else {
        add('web.descendant-ancestry', 'FAIL', 'Descendant ancestry: app is ancestor of web', `${w.sourceCommit} does not descend from ${a.sourceCommit} — unrelated web source`);
        ancestryStatus = 'FAIL';
      }
    } else {
      add('web.descendant-ancestry', 'FAIL', 'Descendant ancestry: app is ancestor of web', 'cannot evaluate: source object missing');
      ancestryStatus = 'FAIL';
    }
    const o = w.overlay;
    if (!o) add('web.overlay', 'FAIL', 'Overlay', 'web-only-descendant mode requires overlay {baseCommit, headCommit, reason, approved:true, receipt}');
    else {
      const problems = [];
      if (o.baseCommit !== a.sourceCommit) problems.push(`overlay.baseCommit ${o.baseCommit} ≠ app.sourceCommit`);
      if (o.headCommit !== w.sourceCommit) problems.push(`overlay.headCommit ${o.headCommit} ≠ web.sourceCommit`);
      if (o.approved !== true) problems.push('overlay.approved is not explicitly true');
      if (problems.length) add('web.overlay', 'FAIL', 'Overlay', problems.join('; '));
      else add('web.overlay', 'PASS', 'Overlay', `${o.reason} (approved)`);
      const receiptPath = path.join(info.toplevel, o.receipt);
      if (fs.existsSync(receiptPath)) add('web.overlay-receipt', 'PASS', 'Overlay receipt exists', o.receipt);
      else add('web.overlay-receipt', 'FAIL', 'Overlay receipt exists', `missing file: ${o.receipt}`);
    }
  }

  // 7. Deployment record
  if (d.deployedCommit === UNPROVEN) add('web.deployment.deployed-sha', 'UNPROVEN', 'Deployed SHA == expected web source', 'deployedCommit is UNPROVEN — record it with release:finalize --target web-deployment after independent verification');
  else if (d.deployedCommit === w.sourceCommit) add('web.deployment.deployed-sha', 'PASS', 'Deployed SHA == expected web source', d.deployedCommit);
  else add('web.deployment.deployed-sha', 'FAIL', 'Deployed SHA == expected web source', `STALE/INCORRECT DEPLOYED SHA — recorded ${d.deployedCommit}, expected ${w.sourceCommit}`);
  if (d.deploymentId === UNPROVEN) add('web.deployment.id', 'UNPROVEN', 'Deployment ID', 'UNPROVEN');
  else add('web.deployment.id', 'PASS', 'Deployment ID', d.deploymentId);

  if (d.productionBranch === UNPROVEN) {
    add('web.deployment.production-branch', 'UNPROVEN', 'Production branch', 'UNPROVEN');
  } else {
    add('web.deployment.production-branch', 'PASS', 'Production branch format', d.productionBranch);
    const remoteRef = `refs/remotes/origin/${d.productionBranch}`;
    const localRef = `refs/heads/${d.productionBranch}`;
    const remoteSha = resolveRef(repo, remoteRef);
    const localSha = remoteSha ? null : resolveRef(repo, localRef);
    const known = remoteSha ?? localSha;
    const which = remoteSha ? remoteRef : localRef;
    if (!known) add('web.deployment.production-branch-head', 'SKIP', 'Production branch head == web source (local refs)', `${d.productionBranch} not present locally (neither ${remoteRef} nor ${localRef})`);
    else if (known === w.sourceCommit) add('web.deployment.production-branch-head', 'PASS', 'Production branch head == web source (local refs)', `${which} → ${known}`);
    else add('web.deployment.production-branch-head', 'FAIL', 'Production branch head == web source (local refs)', `${which} → ${known}, expected ${w.sourceCommit} — frozen branch moved or manifest stale`);
    if (options.remote) {
      const ls = lsRemoteRef(repo, 'origin', `refs/heads/${d.productionBranch}`);
      if (!ls.ok) add('web.deployment.production-branch-remote', 'FAIL', 'Production branch head == web source (origin, live)', ls.error);
      else if (ls.sha === w.sourceCommit) add('web.deployment.production-branch-remote', 'PASS', 'Production branch head == web source (origin, live)', ls.sha);
      else add('web.deployment.production-branch-remote', 'FAIL', 'Production branch head == web source (origin, live)', `origin has ${ls.sha}, expected ${w.sourceCommit}`);
    } else {
      add('web.deployment.production-branch-remote', 'SKIP', 'Production branch head == web source (origin, live)', 'network check off by default (pass --remote)');
    }
  }
  add('web.deployment.live-identity-mode', 'INFO', 'Live identity mode', d.liveIdentityMode === 'legacy-triangulated'
    ? 'legacy-triangulated — verified by immutable deployment receipt; no release-meta endpoint for this release'
    : 'release-meta — live identity is proven only by `npm run release:web:verify-live` (not run here)');
  if (d.receipt) {
    if (fs.existsSync(path.join(info.toplevel, d.receipt))) add('web.deployment.receipt', 'PASS', 'Deployment receipt exists', d.receipt);
    else add('web.deployment.receipt', 'FAIL', 'Deployment receipt exists', `missing file: ${d.receipt}`);
  } else if (d.liveIdentityMode === 'legacy-triangulated') {
    add('web.deployment.receipt', 'FAIL', 'Deployment receipt exists', 'legacy-triangulated live identity requires a recorded receipt');
  } else {
    add('web.deployment.receipt', 'UNPROVEN', 'Deployment receipt exists', 'no receipt recorded yet');
  }

  // 8. Main release-code integration vs reality
  const integration = manifest.governance.releaseCodeIntegration;
  if (info.originMain && commitExists(repo, a.sourceCommit)) {
    const inMain = isAncestor(repo, a.sourceCommit, info.originMain);
    if (!inMain.ok) add('main.release-code-integration', 'WARN', 'Main release-code integration', inMain.error);
    else if (integration === 'converged' && !inMain.ancestor) add('main.release-code-integration', 'FAIL', 'Main release-code integration', `manifest says converged but app source ${short(a.sourceCommit)} is not in origin/main ${short(info.originMain)}`);
    else if (integration === 'deferred' && inMain.ancestor) add('main.release-code-integration', 'WARN', 'Main release-code integration', `manifest says deferred but app source ${short(a.sourceCommit)} is already in origin/main ${short(info.originMain)} — update the manifest`);
    else add('main.release-code-integration', 'INFO', 'Main release-code integration', `${integration.toUpperCase()} (origin/main ${short(info.originMain)} ${inMain.ancestor ? 'contains' : 'does not contain'} app source)`);
  } else {
    add('main.release-code-integration', 'INFO', 'Main release-code integration', `${integration.toUpperCase()} (origin/main not available locally for cross-check)`);
  }

  // 9. Rendered doc matches manifest
  if (options.checkRender === false) {
    add('render.current-release', 'SKIP', 'CURRENT_RELEASE.md matches manifest', 'render check skipped');
  } else {
    const renderedPath = options.renderedPath ?? defaultRenderedPath(info.toplevel);
    if (!fs.existsSync(renderedPath)) add('render.current-release', 'FAIL', 'CURRENT_RELEASE.md matches manifest', `missing ${renderedPath} — run npm run release:render`);
    else if (fs.readFileSync(renderedPath, 'utf8') === renderCurrentRelease(manifest)) add('render.current-release', 'PASS', 'CURRENT_RELEASE.md matches manifest', renderedPath);
    else add('render.current-release', 'FAIL', 'CURRENT_RELEASE.md matches manifest', `${renderedPath} drifted from the manifest — run npm run release:render`);
  }

  // 10. The experience gate is a separate judgment. Never PASS here.
  add('gate.experience', 'INFO', 'Recruiter / product experience', 'SEPARATE GATE — not assessed by this tool');

  return done(manifest, { ancestryStatus });
}

function summarize(manifest, checks, extra) {
  const failIds = (prefix) => checks.some((c) => c.status === 'FAIL' && c.id.startsWith(prefix));
  if (!manifest || checks.some((c) => c.status === 'FAIL' && c.id.startsWith('manifest'))) {
    return { app: 'FAIL', web: 'FAIL', live: 'FAIL', appWeb: 'FAIL', main: 'UNKNOWN', ancestry: 'n/a' };
  }
  const gitFail = failIds('git.') || failIds('governance.');
  const d = manifest.web.deployment;
  const liveUnproven = d.deployedCommit === UNPROVEN || d.deploymentId === UNPROVEN || d.productionBranch === UNPROVEN;
  let live;
  if (failIds('web.deployment')) live = 'FAIL';
  else if (liveUnproven) live = 'UNPROVEN';
  else if (d.liveIdentityMode === 'legacy-triangulated') live = 'RECORDED (legacy-triangulated receipt)';
  else live = 'RECORDED (control plane) — live release-meta check not run here';
  return {
    app: gitFail || failIds('app.') ? 'FAIL' : 'PASS',
    web: gitFail || failIds('web.') ? 'FAIL' : 'PASS',
    appWeb: manifest.web.syncMode === 'exact' ? 'EXACT (WEB = APP)' : 'APPROVED WEB-ONLY DESCENDANT',
    ancestry: manifest.web.syncMode === 'exact' ? 'n/a (exact)' : extra.ancestryStatus ?? 'n/a',
    live,
    main: manifest.governance.releaseCodeIntegration.toUpperCase(),
  };
}

export function formatChecks(checks) {
  const width = Math.max(...checks.map((c) => c.status.length));
  return checks
    .map((c) => `  [${c.status.padEnd(width)}] ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
    .join('\n');
}
