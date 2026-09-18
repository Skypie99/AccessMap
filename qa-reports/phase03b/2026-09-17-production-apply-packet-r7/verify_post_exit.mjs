#!/usr/bin/env node
// Exact target-explicit read-only restoration comparator. Never recreates a gate.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_SQL, checksum, normalizeCatalog } from '../../../scripts/structural-catalog.mjs';
import { buildR7Envelope, entryFromEnvelope, GATE_MANIFEST_SHA256 } from './r7_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const TARGET = 'kldlwszpfkdmsjrjhjym';
const STRUCTURE_SHA256 = 'f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7';
const LEDGER_SHA256 = 'b9fb376947238c4bd3dc3d164337d6b9294df9084eab9008530ba9fd4d4603b5';
const HTTP_SHA256 = '709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8';
const EDGE_SHA256 = '276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70';
const entryArg = process.argv.find((value) => value.startsWith('--entry='));
const evidenceArg = process.argv.find((value) => value.startsWith('--evidence='));
if (!entryArg || !evidenceArg) throw new Error('Required: --entry=/absolute/ENTRY_RECEIPT.json --evidence=/absolute/new/directory');
const entryEnvelope = JSON.parse(readFileSync(resolve(entryArg.slice('--entry='.length)), 'utf8'));
const entry = entryFromEnvelope(entryEnvelope);
const evidence = resolve(evidenceArg.slice('--evidence='.length));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: false, mode: 0o700 });
const stable = (v) => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v;
const hashJson = (v) => createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const parse = (text) => { const i = text.search(/[\[{]/); if (i < 0) throw new Error('No JSON in CLI output'); return JSON.parse(text.slice(i)); };
const row = (payload, key) => payload.rows?.[0]?.[key] ?? payload[key] ?? payload;
const run = (label, args, timeout = 120_000) => {
  const startedAt = new Date().toISOString();
  const result = spawnSync('supabase', args, { encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, env: process.env });
  writeFileSync(join(evidence, `${label}.stdout.log`), result.stdout ?? '', { mode: 0o600, flag: 'wx' });
  writeFileSync(join(evidence, `${label}.stderr.log`), result.stderr ?? '', { mode: 0o600, flag: 'wx' });
  const receipt = { command: ['supabase', ...args], startedAt, endedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal, timedOut: result.error?.code === 'ETIMEDOUT' };
  if (receipt.exitCode !== 0 || receipt.signal || receipt.timedOut) throw new Error(`${label} failed`);
  return { receipt, payload: parse(result.stdout) };
};

const monoMs = () => Number(process.hrtime.bigint() / 1_000_000n);
const steps = [];
let proof = null;
let structureSha256 = null;
let status = 'HOLD';
try {
  const proofRun = run('post-exit-proof', ['db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'POST_EXIT_VERIFY.sql'), '--output-format', 'json']);
  steps.push(proofRun.receipt); proof = row(proofRun.payload, 'phase03b_post_exit_proof_r3');
  const exact = { receipt: 'phase03b_post_exit_proof_r3', transaction_read_only: 'on', function_count: 0, reserved_trigger_count: 0, ledger_count: 87, ledger_unique_count: 87, ledger_latest_version: '20260915210413', ledger_ordered_version_name_sha256: LEDGER_SHA256, phase03b_constraint_index_sha256: 'cdcf1cb106f7dd12e1aac53f6cc910fdfd6f8b0b38a4c7ee9cc3e40fb32bac3a', http_queue_count: 0, http_response_count: 6, http_response_sha256: HTTP_SHA256 };
  for (const [key, value] of Object.entries(exact)) if (proof[key] !== value) throw new Error(`Post-exit mismatch: ${key}`);
  if (JSON.stringify(proof.phase03b_versions) !== JSON.stringify(['20260915210256', '20260915210413'])) throw new Error('Post-exit Phase 03B ledger mismatch');
  const expectedRows = [
    { version: '20260915210256', name: 'phase03b_moderation_semantics_compatibility_bridge', statement_count: 1, statement_sha256: 'b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11' },
    { version: '20260915210413', name: 'phase03b_points_integrity', statement_count: 1, statement_sha256: '0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5' },
  ];
  if (JSON.stringify(proof.phase03b_rows) !== JSON.stringify(expectedRows)) throw new Error('Post-exit migration statement bytes mismatch');
  for (const key of ['flags_id_status_count', 'flags_id_status_sha256', 'history_count', 'history_sha256']) if (proof[key] !== entry[key]) throw new Error(`Post-exit invariant mismatch: ${key}`);

  const sqlPath = join(evidence, 'STRUCTURAL_CAPTURE_READ_ONLY.sql');
  writeFileSync(sqlPath, `begin transaction read only;\n${CATALOG_SQL};\nrollback;\n`, { mode: 0o600, flag: 'wx' });
  const structureRun = run('structure', ['db', 'query', '--linked', '--project-ref', TARGET, '--file', sqlPath, '--output-format', 'json']);
  steps.push(structureRun.receipt); const normalized = normalizeCatalog(row(structureRun.payload, 'catalog'));
  structureSha256 = checksum(normalized);
  writeFileSync(join(evidence, 'NORMALIZED_STRUCTURE.json'), `${JSON.stringify({ structureSha256, catalog: normalized }, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  if (structureSha256 !== STRUCTURE_SHA256) throw new Error('Post-exit structure differs from accepted final structure');

  const fnRun = run('edge-function', ['functions', 'list', '--project-ref', TARGET, '--output-format', 'json']); steps.push(fnRun.receipt);
  const functions = Array.isArray(fnRun.payload) ? fnRun.payload : fnRun.payload.functions;
  const selected = functions.filter((fn) => fn.slug === 'notify-flag-status').map((fn) => ({ id: fn.id, slug: fn.slug, name: fn.name, status: fn.status, version: fn.version, verifyJwt: fn.verify_jwt, createdAt: fn.created_at, updatedAt: fn.updated_at }));
  if (selected.length !== 1 || hashJson(selected[0]) !== EDGE_SHA256) throw new Error('Post-exit Edge Function identity mismatch');
  status = 'PASS_RESTORED';
} catch (error) {
  steps.push({ comparatorError: error.message }); process.exitCode = 1;
} finally {
  const envelope = buildR7Envelope({
    runId: entryEnvelope.runId,
    controllerPid: entryEnvelope.controllerPid,
    controllerMonotonicOrigin: entryEnvelope.controllerMonotonicOrigin,
    phase: 'POST_EXIT_COMPARATOR',
    expected: {
      result: 'PASS_RESTORED',
      gateManifestSha256: GATE_MANIFEST_SHA256,
      finalLedgerSha256: LEDGER_SHA256,
      finalStructureSha256: STRUCTURE_SHA256,
      httpResponseSha256: HTTP_SHA256,
    },
    observed: { proof, normalizedStructureSha256: structureSha256, steps },
    status,
    capturedAtUtc: new Date().toISOString(),
    capturedAtMonotonic: monoMs(),
    numericExit: status === 'PASS_RESTORED' ? 0 : 1,
  });
  writeFileSync(join(evidence, 'POST_EXIT_VERIFIER_RECEIPT.json'), `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}
