#!/usr/bin/env node
// scripts/release-status.mjs — one-command release status.
//
//   npm run release:status [-- --repo <path>] [--manifest <path>] [--json]
//
// LOCAL / CONTROL-PLANE ONLY. No network. Runs the same validator as
// `release:verify` and prints the human summary. An unchecked live network
// state is never labelled PASS here: LIVE shows RECORDED or UNPROVEN.

import path from 'node:path';
import {
  EXPERIENCE_GATE_LINE,
  UNPROVEN,
  optFlag,
  optString,
  parseArgs,
  short,
  verifyReleaseState,
} from './release-lib.mjs';

const { opts } = parseArgs(process.argv.slice(2));
const repo = path.resolve(optString(opts, 'repo') ?? process.cwd());
const manifestPath = optString(opts, 'manifest') ? path.resolve(optString(opts, 'manifest')) : undefined;
const report = verifyReleaseState({ repo, manifestPath, checkRender: !optFlag(opts, 'no-render-check') });

if (optFlag(opts, 'json')) {
  process.stdout.write(`${JSON.stringify({ ok: report.ok, summary: report.summary, checks: report.checks }, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

const m = report.manifest;
const s = report.summary;
const failures = report.checks.filter((c) => c.status === 'FAIL');
const lines = [];
const sha = (v) => (v === UNPROVEN || v == null ? UNPROVEN : `${short(v)} (${v})`);

lines.push('FLAGSTONE RELEASE STATUS');
lines.push('');
lines.push(`Manifest: ${manifestPath ?? path.join(repo, 'release/current.json')}`);
lines.push('Mode: LOCAL / CONTROL-PLANE ONLY (no network)');
lines.push('');
if (!m || !m.app || !m.web) {
  lines.push('MANIFEST: UNREADABLE OR INVALID');
  for (const f of failures) lines.push(`  ✗ ${f.label}: ${f.detail}`);
  lines.push('');
  lines.push('RELEASE STATUS: FAIL');
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(1);
}
const a = m.app;
const w = m.web;
const d = w.deployment;

lines.push('APP');
lines.push(`${a.version} (${a.iosBuild})`);
lines.push(`Source: ${sha(a.sourceCommit)}`);
lines.push(`Tree: ${sha(a.sourceTree)}`);
lines.push(`EAS source: ${sha(a.eas.sourceCommit)}`);
lines.push(`EAS version source: ${a.eas.versionSource.toUpperCase()}${a.eas.versionSource === 'remote' ? ' (local app.json buildNumber is NOT authoritative)' : ''}`);
lines.push(`App Store: ${a.appStore.status}`);
lines.push(`Identity: ${s.app}`);
lines.push('');
lines.push('WEB');
lines.push(`Mode: ${w.syncMode}`);
lines.push(`Base: ${sha(w.baseReleaseCommit)}`);
lines.push(`Source: ${sha(w.sourceCommit)}`);
lines.push(`Tree: ${sha(w.sourceTree)}`);
lines.push(`Deployed: ${sha(d.deployedCommit)}`);
lines.push(`Production branch: ${d.productionBranch}`);
lines.push(`Deployment ID: ${d.deploymentId}`);
lines.push(`Provider: ${d.provider} project ${d.project} (${d.team})`);
lines.push(`Domains: ${d.domains.join(', ')}`);
lines.push(`Identity: ${s.web}`);
lines.push('');
lines.push('APP ↔ WEB');
lines.push(s.appWeb);
lines.push(`Ancestry: ${s.ancestry}`);
if (w.overlay) {
  lines.push(`Overlay: ${w.overlay.reason}`);
  lines.push(`Receipt: ${w.overlay.receipt}`);
}
lines.push('');
lines.push('LIVE');
lines.push(`Mode: ${d.liveIdentityMode}`);
if (d.liveIdentityMode === 'legacy-triangulated') {
  lines.push(`Automated release-meta endpoint: NOT AVAILABLE FOR BUILD ${a.iosBuild}`);
  lines.push(`Receipt verification: ${d.receipt ? 'RECORDED' : UNPROVEN}${d.receipt ? ` (${d.receipt})` : ''}`);
} else {
  lines.push('Automated release-meta endpoint: expected at /release-meta.json on every production domain');
  lines.push('Live check: NOT RUN HERE — npm run release:web:verify-live');
}
lines.push(`Serving deployment: ${d.deploymentId === UNPROVEN || d.deployedCommit === UNPROVEN ? UNPROVEN : `${d.deploymentId} @ ${short(d.deployedCommit)}`}`);
lines.push(`Control-plane live identity: ${s.live}`);
lines.push('');
lines.push('MAIN RELEASE-CODE CONVERGENCE');
lines.push(s.main);
lines.push(`Governance base: ${sha(m.governance.baseCommit)}`);
lines.push('');
lines.push(EXPERIENCE_GATE_LINE);
lines.push('');
lines.push(`Last verified (manifest stamp): ${m.lastVerified}`);
lines.push('');
if (failures.length === 0) {
  lines.push('RELEASE STATUS: PASS');
} else {
  lines.push(`RELEASE STATUS: FAIL (${failures.length} failure${failures.length === 1 ? '' : 's'})`);
  for (const f of failures) lines.push(`  ✗ ${f.label}: ${f.detail}`);
}
process.stdout.write(`${lines.join('\n')}\n`);
process.exit(report.ok ? 0 : 1);
