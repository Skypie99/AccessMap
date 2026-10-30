#!/usr/bin/env node
// scripts/check-unused-js-budget.mjs — enforce the unused-JavaScript byte budget.
//
//   node scripts/check-unused-js-budget.mjs
//
// Runs after `lhci autorun` in the Lighthouse workflow. LHCI can only assert the
// `unused-javascript` audit by item count (maxLength) or by its numericValue,
// which Lighthouse 12 reports in milliseconds, so a budget in bytes is checked
// here instead: the audit's "Potential savings" total (overallSavingsBytes) of
// every run in .lighthouseci/ must not exceed UNUSED_JAVASCRIPT_BUDGET_KIB from
// .lighthouserc.js. The budget and why it exists live next to the assertion
// there.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repo = process.cwd();
const { UNUSED_JAVASCRIPT_BUDGET_KIB: budgetKib } = require(path.join(repo, '.lighthouserc.js'));

if (!Number.isFinite(budgetKib)) {
  console.error('UNUSED_JAVASCRIPT_BUDGET_KIB is missing from .lighthouserc.js');
  process.exit(1);
}

const dir = path.join(repo, '.lighthouseci');
const runs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)) : [];
if (runs.length === 0) {
  console.error('No Lighthouse results in .lighthouseci/ — run `lhci autorun` first.');
  process.exit(1);
}

const budgetBytes = budgetKib * 1024;
let ok = true;
for (const file of runs) {
  const lhr = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const audit = lhr.audits?.['unused-javascript'];
  const wasted = audit?.details?.overallSavingsBytes;
  if (!Number.isFinite(wasted)) {
    console.error(`${lhr.finalDisplayedUrl ?? file}: unused-javascript produced no byte total.`);
    ok = false;
    continue;
  }
  const wastedKib = Math.ceil(wasted / 1024);
  const pass = wasted <= budgetBytes;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  unused-javascript ${lhr.finalDisplayedUrl ?? file}: ` +
      `${wasted} bytes (${wastedKib} KiB rounded up), budget ${budgetKib} KiB`,
  );
  for (const item of audit.details.items ?? []) {
    console.log(`        ${item.wastedBytes} of ${item.totalBytes} bytes unused  ${item.url}`);
  }
  if (!pass) ok = false;
}

process.exit(ok ? 0 : 1);
