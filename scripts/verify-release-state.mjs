#!/usr/bin/env node
// scripts/verify-release-state.mjs — central release-identity validator.
//
//   npm run release:verify [-- --repo <path>] [--manifest <path>] [--rendered <path>]
//                          [--no-render-check] [--remote] [--json]
//
// Validates release/current.json against REAL Git objects:
//   manifest schema · full-SHA formatting · objects exist · commit ↔ tree ·
//   EAS source == intended source · EAS remote-version-source semantics ·
//   web base == app source · syncMode · exact equality · descendant ancestry ·
//   overlay metadata + receipt · deployment SHA formatting/consistency ·
//   production-branch formatting + local head · CURRENT_RELEASE.md freshness ·
//   no UNPROVEN value is ever reported as PASS.
//
// Network verification is OFF by default. `--remote` adds one `git ls-remote`
// of the production branch. Live web identity is a separate command
// (`npm run release:web:verify-live`). Exit code is non-zero on any FAIL.

import path from 'node:path';
import {
  EXPERIENCE_GATE_LINE,
  formatChecks,
  optFlag,
  optString,
  parseArgs,
  verifyReleaseState,
} from './release-lib.mjs';

const { opts } = parseArgs(process.argv.slice(2));
const repo = path.resolve(optString(opts, 'repo') ?? process.cwd());
const manifestPath = optString(opts, 'manifest') ? path.resolve(optString(opts, 'manifest')) : undefined;
const renderedPath = optString(opts, 'rendered') ? path.resolve(optString(opts, 'rendered')) : undefined;

const report = verifyReleaseState({
  repo,
  manifestPath,
  renderedPath,
  checkRender: !optFlag(opts, 'no-render-check'),
  remote: optFlag(opts, 'remote'),
});

if (optFlag(opts, 'json')) {
  process.stdout.write(`${JSON.stringify({ ok: report.ok, summary: report.summary, checks: report.checks }, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

const failures = report.checks.filter((c) => c.status === 'FAIL');
const s = report.summary;
const lines = [];
lines.push('FLAGSTONE RELEASE VERIFY');
lines.push('');
lines.push(`Repository: ${report.repo}`);
lines.push(`Manifest:   ${manifestPath ?? path.join(repo, 'release/current.json')}`);
lines.push(`Network:    ${optFlag(opts, 'remote') ? 'ls-remote of production branch only' : 'none (local control-plane check)'}`);
lines.push('');
lines.push(formatChecks(report.checks));
lines.push('');
lines.push(`APP IDENTITY: ${s.app}`);
lines.push(`WEB IDENTITY: ${s.web}`);
lines.push(`APP ↔ WEB: ${s.appWeb} (ancestry: ${s.ancestry})`);
lines.push(`LIVE IDENTITY: ${s.live}`);
lines.push(`MAIN RELEASE-CODE CONVERGENCE: ${s.main}`);
lines.push(EXPERIENCE_GATE_LINE);
lines.push('');
if (failures.length === 0) {
  lines.push('RELEASE VERIFY: PASS');
} else {
  lines.push(`RELEASE VERIFY: FAIL (${failures.length} failure${failures.length === 1 ? '' : 's'})`);
  for (const f of failures) lines.push(`  ✗ ${f.label}: ${f.detail}`);
}
process.stdout.write(`${lines.join('\n')}\n`);
process.exit(report.ok ? 0 : 1);
