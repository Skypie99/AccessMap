import fs from 'node:fs';
import path from 'node:path';
import { replayPhase03a } from '/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903/scripts/replay-phase03a.mjs';

const repo = '/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903';
const out = '/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/phase03a-owner-resume';
const pgTapSql = '/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql';
const relative = 'supabase/migrations-next/phase03a';
const manifest = JSON.parse(fs.readFileSync(path.join(repo, relative, 'candidate-contract.json')));
const first = manifest.migrations[0];
const inventoryError = 'Phase03A migration/restoration inventory differs from the reviewed manifest';
const cases = [
  ['unchanged inventory reaches capture', () => {}, 'INDEPENDENT_AFTER_VALIDATION', true],
  ['new unlisted migration', d => fs.writeFileSync(path.join(d, '20260905073926_independent_unlisted.sql'), 'SELECT 1;\n'), inventoryError, false],
  ['new unlisted restoration', d => fs.writeFileSync(path.join(d, 'rollback/20260905073926_independent_unlisted.rollback.sql'), 'SELECT 1;\n'), inventoryError, false],
  ['missing migration', d => fs.unlinkSync(path.join(d, first.file)), inventoryError, false],
  ['missing restoration', d => fs.unlinkSync(path.join(d, first.rollback)), inventoryError, false],
  ['migration source drift', d => fs.appendFileSync(path.join(d, first.file), '-- independent mutation\n'), `Phase03A artifact hash mismatch: ${first.file}`, false],
  ['restoration source drift', d => fs.appendFileSync(path.join(d, first.rollback), '-- independent mutation\n'), `Phase03A artifact hash mismatch: ${first.rollback}`, false],
  ['allowlist source drift', d => fs.appendFileSync(path.join(d, 'application-privileges.v1.json'), '\n'), 'Phase03A artifact hash mismatch: application-privileges.v1.json', false],
  ['effective capture query drift', d => fs.appendFileSync(path.join(d, 'effective-privileges.sql'), '\n'), 'Phase03A artifact hash mismatch: effective-privileges.sql', false],
];
const results = [];
for (const [name, mutate, expectedError, expectedReachedCapture] of cases) {
  const temp = fs.mkdtempSync(path.join(out, 'independent-inventory-temp-'));
  let reachedCapture = false;
  let error = null;
  try {
    fs.cpSync(path.join(repo, relative), path.join(temp, relative), { recursive: true });
    mutate(path.join(temp, relative));
    const capture = () => { reachedCapture = true; throw new Error('INDEPENDENT_AFTER_VALIDATION'); };
    try {
      replayPhase03a({ root: temp, psql: capture, applySqlFile: capture, comparator: capture, adaptations: [], pgTapSql });
    } catch (e) { error = e.message; }
    results.push({ name, expectedError, error, reachedCapture,
      passed: error === expectedError && reachedCapture === expectedReachedCapture });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
const receipt = { scope: 'Independent manifest/hash gate tests in disposable Documents copies; no database or repository mutation',
  candidateSha: '0a6a6b03fd0cbe72f70f67260f6cab746e098f6a',
  cases: results, passed: results.every(r => r.passed) };
fs.writeFileSync(path.join(out, 'independent-inventory-check.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
process.exitCode = receipt.passed ? 0 : 1;
