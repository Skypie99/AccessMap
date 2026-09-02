#!/usr/bin/env node
// scripts/verify-live-release.mjs — verify the LIVE web deployment's identity.
//
//   npm run release:web:verify-live [-- --repo <path>] [--manifest <path>]
//        [--url <https://host/release-meta.json>]… [--timeout-ms 10000]
//        [--require-release-meta] [--json]
//
// For release-meta-enabled releases it fetches /release-meta.json from EVERY
// production domain in the manifest (cache: no-store, a cache-busting query
// parameter, explicit no-cache headers, explicit timeout) and compares:
//   live.webSourceCommit  == web.sourceCommit
//   live.webSourceTree    == web.sourceTree   (when the artifact reports one)
//   live.appVersion       == app.version
//   live.iosBuild         == app.iosBuild     (when the artifact reports one)
// Any mismatch → LIVE RELEASE IDENTITY FAIL / EXPECTED / OBSERVED, exit 1.
//
// Build 33 exception: release-meta does not exist historically. When the
// manifest's liveIdentityMode is legacy-triangulated this command makes NO
// network request and reports the immutable receipt instead (exit 0). Pass
// --require-release-meta to force a live fetch anyway.
//
// A passing identity never implies a passing recruiter/product experience.
// That is a separate gate (docs/RELEASE_IDENTITY.md).

import fs from 'node:fs';
import path from 'node:path';
import {
  EXPERIENCE_GATE_LINE,
  RELEASE_META_PATH,
  RELEASE_META_SCHEMA_VERSION,
  defaultManifestPath,
  gitRepoInfo,
  isFullSha,
  isTimestamp,
  loadManifest,
  optFlag,
  optList,
  optString,
  parseArgs,
  validateManifestShape,
} from './release-lib.mjs';

const { opts } = parseArgs(process.argv.slice(2));
const repo = path.resolve(optString(opts, 'repo') ?? process.cwd());
const manifestPath = path.resolve(optString(opts, 'manifest') ?? defaultManifestPath(repo));
const timeoutMs = Number.parseInt(optString(opts, 'timeout-ms') ?? '10000', 10);
const requireMeta = optFlag(opts, 'require-release-meta');
const asJson = optFlag(opts, 'json');

const out = [];
const say = (s = '') => out.push(s);
const finish = (code, extra = {}) => {
  if (asJson) process.stdout.write(`${JSON.stringify({ ok: code === 0, ...extra }, null, 2)}\n`);
  else process.stdout.write(`${out.join('\n')}\n`);
  process.exit(code);
};

say('FLAGSTONE LIVE WEB VERIFY');
say(`Manifest: ${manifestPath}`);
say('');

const loaded = loadManifest(manifestPath);
if (!loaded.ok) {
  say(`FAIL: ${loaded.error}`);
  finish(1, { error: loaded.error });
}
const m = loaded.manifest;
const shape = validateManifestShape(m);
if (shape.length) {
  say(`FAIL: manifest invalid — ${shape.join('; ')}`);
  finish(1, { error: shape });
}
const d = m.web.deployment;
const expected = {
  webSourceCommit: m.web.sourceCommit,
  webSourceTree: m.web.sourceTree,
  appVersion: m.app.version,
  iosBuild: m.app.iosBuild,
};

if (d.liveIdentityMode === 'legacy-triangulated' && !requireMeta) {
  const info = gitRepoInfo(repo);
  const receiptPath = d.receipt ? path.join(info.ok ? info.toplevel : repo, d.receipt) : null;
  const receiptExists = receiptPath ? fs.existsSync(receiptPath) : false;
  say('Live identity mode: legacy-triangulated');
  say(`BUILD ${m.app.iosBuild} LIVE IDENTITY: LEGACY VERIFIED BY IMMUTABLE DEPLOYMENT RECEIPT`);
  say(`Receipt: ${d.receipt ?? 'NONE RECORDED'}${d.receipt ? (receiptExists ? ' (present)' : ' (MISSING FILE)') : ''}`);
  say(`Recorded serving deployment: ${d.deploymentId} @ ${d.deployedCommit} (production branch ${d.productionBranch})`);
  say(`Automated release-meta endpoint: NOT AVAILABLE FOR BUILD ${m.app.iosBuild}`);
  say('No network request was made. Pass --require-release-meta to force a live fetch (expected to fail for a legacy deployment).');
  say('');
  say(EXPERIENCE_GATE_LINE);
  say('');
  if (!d.receipt || !receiptExists) {
    say('LIVE VERIFY: FAIL — legacy mode requires a present deployment receipt');
    finish(1, { mode: 'legacy-triangulated', receipt: d.receipt, receiptExists });
  }
  say('LIVE VERIFY: RECORDED (legacy receipt; live network state not checked by this run)');
  finish(0, { mode: 'legacy-triangulated', receipt: d.receipt, receiptExists, networkChecked: false });
}

const urls = optList(opts, 'url').length ? optList(opts, 'url') : d.domains.map((h) => `https://${h}${RELEASE_META_PATH}`);
say(`Live identity mode: ${d.liveIdentityMode}${requireMeta && d.liveIdentityMode === 'legacy-triangulated' ? ' (forced release-meta fetch)' : ''}`);
say(`Timeout: ${timeoutMs} ms · cache: no-store + cache-busting query + no-cache headers`);
say('');

const results = [];
for (const url of urls) results.push(await checkUrl(url));

const failed = results.filter((r) => !r.ok);
say('');
say(`EXPECTED: commit ${expected.webSourceCommit} · tree ${expected.webSourceTree} · version ${expected.appVersion} · build ${expected.iosBuild}`);
for (const r of results) {
  say(`OBSERVED (${r.url}): ${r.observed ? `commit ${r.observed.webSourceCommit} · tree ${r.observed.webSourceTree ?? 'n/a'} · version ${r.observed.appVersion} · build ${r.observed.iosBuild ?? 'n/a'}` : r.error}`);
}
say('');
say(EXPERIENCE_GATE_LINE);
say('');
if (failed.length) {
  say('LIVE RELEASE IDENTITY FAIL');
  for (const r of failed) say(`  ✗ ${r.url}: ${r.error}`);
  finish(1, { expected, results });
}
say(`LIVE RELEASE IDENTITY: PASS — the exact expected web source is serving at ${urls.join(', ')}`);
finish(0, { expected, results });

// ---------------------------------------------------------------------------

async function checkUrl(url) {
  const bust = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const target = `${url}${url.includes('?') ? '&' : '?'}nocache=${bust}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const result = { url, ok: false, observed: null, error: null, diagnostics: {} };
  say(`GET ${target}`);
  let res;
  try {
    res = await fetch(target, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache, no-store, max-age=0',
        pragma: 'no-cache',
        'user-agent': 'flagstone-release-verify/2',
      },
    });
  } catch (e) {
    clearTimeout(timer);
    result.error = e && e.name === 'AbortError' ? `TIMEOUT after ${timeoutMs} ms — no response from ${url}` : `NETWORK ERROR: ${e && e.message ? e.message : String(e)}`;
    say(`  ✗ ${result.error}`);
    return result;
  }
  clearTimeout(timer);
  for (const h of ['content-type', 'cache-control', 'age', 'date', 'x-vercel-cache', 'x-vercel-id', 'etag']) {
    const v = res.headers.get(h);
    if (v) result.diagnostics[h] = v;
  }
  say(`  status ${res.status} · ${Object.entries(result.diagnostics).map(([k, v]) => `${k}=${v}`).join(' · ') || 'no cache headers'}`);
  if (!res.ok) {
    result.error = `HTTP ${res.status} — release-meta.json not available (${res.status === 404 ? 'this deployment does not publish release-meta; a release-meta-enabled release must' : 'unexpected status'})`;
    say(`  ✗ ${result.error}`);
    return result;
  }
  let text;
  try {
    text = await res.text();
  } catch (e) {
    result.error = `could not read body: ${e.message}`;
    say(`  ✗ ${result.error}`);
    return result;
  }
  let live;
  try {
    live = JSON.parse(text);
  } catch (e) {
    result.error = `MALFORMED release-meta.json (not JSON: ${e.message}) — body starts: ${JSON.stringify(text.slice(0, 80))}`;
    say(`  ✗ ${result.error}`);
    return result;
  }
  const shapeErrors = validateReleaseMeta(live);
  if (shapeErrors.length) {
    result.error = `MALFORMED release-meta.json: ${shapeErrors.join('; ')}`;
    say(`  ✗ ${result.error}`);
    return result;
  }
  result.observed = live;
  const mismatches = [];
  if (live.webSourceCommit !== expected.webSourceCommit) mismatches.push(`webSourceCommit ${live.webSourceCommit} ≠ expected ${expected.webSourceCommit}`);
  if (live.webSourceTree !== null && live.webSourceTree !== expected.webSourceTree) mismatches.push(`webSourceTree ${live.webSourceTree} ≠ expected ${expected.webSourceTree}`);
  if (live.appVersion !== expected.appVersion) mismatches.push(`appVersion ${live.appVersion} ≠ expected ${expected.appVersion}`);
  if (live.iosBuild !== null && live.iosBuild !== expected.iosBuild) mismatches.push(`iosBuild ${live.iosBuild} ≠ expected ${expected.iosBuild}`);
  if (mismatches.length) {
    result.error = `IDENTITY MISMATCH: ${mismatches.join('; ')}`;
    say(`  ✗ ${result.error}`);
    return result;
  }
  result.ok = true;
  say(`  ✓ identity matches (built ${live.builtAt})`);
  return result;
}

function validateReleaseMeta(v) {
  const errors = [];
  if (!v || typeof v !== 'object' || Array.isArray(v)) return ['not a JSON object'];
  if (v.schemaVersion !== RELEASE_META_SCHEMA_VERSION) errors.push(`schemaVersion must be ${RELEASE_META_SCHEMA_VERSION}`);
  if (typeof v.product !== 'string' || !v.product) errors.push('product missing');
  if (typeof v.appVersion !== 'string' || !v.appVersion) errors.push('appVersion missing');
  if (!(v.iosBuild === null || Number.isInteger(v.iosBuild))) errors.push('iosBuild must be an integer or null');
  if (!isFullSha(v.webSourceCommit)) errors.push('webSourceCommit must be a full 40-hex SHA');
  if (!(v.webSourceTree === null || isFullSha(v.webSourceTree))) errors.push('webSourceTree must be a full SHA or null');
  if (!isTimestamp(v.builtAt)) errors.push('builtAt must be an ISO timestamp');
  return errors;
}
