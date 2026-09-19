#!/usr/bin/env node
// Exact read-only post-apply capture/comparator. It never removes the gate.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_SQL, checksum, normalizeCatalog } from '../../../scripts/structural-catalog.mjs';
import { buildR8Envelope, entryFromEnvelope, GATE_MANIFEST_SHA256 } from './r8_control_lib.mjs';

const PACKET = dirname(fileURLToPath(import.meta.url));
const TARGET = 'kldlwszpfkdmsjrjhjym';
const EXPECTED_CATALOG_QUERY_SHA256 = '7a88aa297ac302a1b9ac1ad90860baf5ae7b51818f81b84e63cc7b8eea3f8106';
const EXPECTED_FINAL_STRUCTURE_SHA256 = 'f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7';
const EXPECTED_FINAL_LEDGER_SHA256 = 'b9fb376947238c4bd3dc3d164337d6b9294df9084eab9008530ba9fd4d4603b5';
const EXPECTED_EDGE_FUNCTION_SHA256 = '276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70';
const HTTP_SHA256 = 'db09cd0f61b4405a2540be7541b690df4fa52bd7697c98c1e7e88d37a3f99031';
const GATE_FUNCTION_SHA256 = '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac';
const ROW_TRIGGER_SHA256 = 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf';
const TRUNCATE_TRIGGER_SHA256 = '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a';
const entryArg = process.argv.find((value) => value.startsWith('--entry='));
const evidenceArg = process.argv.find((value) => value.startsWith('--evidence='));
if (!entryArg || !evidenceArg) throw new Error('Required: --entry=/absolute/ENTRY_RECEIPT.json --evidence=/absolute/new/directory');
const entryPath = resolve(entryArg.slice('--entry='.length));
const evidence = resolve(evidenceArg.slice('--evidence='.length));
const entryEnvelope = JSON.parse(readFileSync(entryPath, 'utf8'));
const entry = entryFromEnvelope(entryEnvelope);
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: false, mode: 0o700 });
const iso = () => new Date().toISOString();
const monoMs = () => Number(process.hrtime.bigint() / 1_000_000n);
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const hashJson = (value) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const writeJson = (name, value) => writeFileSync(join(evidence, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
const parseCliJson = (text) => {
  const objectAt = text.indexOf('{'); const arrayAt = text.indexOf('[');
  const offset = objectAt === -1 ? arrayAt : arrayAt === -1 ? objectAt : Math.min(objectAt, arrayAt);
  if (offset < 0) throw new Error('CLI output contained no JSON');
  return JSON.parse(text.slice(offset));
};
const resultRow = (payload, key) => payload.rows?.[0]?.[key] ?? payload[key] ?? payload;

async function run(label, args, timeoutMs = 60_000) {
  const stdoutPath = join(evidence, `${label}.stdout.log`); const stderrPath = join(evidence, `${label}.stderr.log`);
  const out = openSync(stdoutPath, 'wx', 0o600); const err = openSync(stderrPath, 'wx', 0o600);
  const startedAt = iso(); const child = spawn('supabase', args, { stdio: ['ignore', out, err], env: { ...process.env } });
  let timedOut = false; const timer = setTimeout(() => { timedOut = true; try { child.kill('SIGINT'); } catch {} }, timeoutMs);
  const state = await new Promise((done) => {
    child.once('error', (error) => done({ code: null, signal: null, error: error.message }));
    child.once('exit', (code, signal) => done({ code, signal, error: null }));
  });
  clearTimeout(timer); closeSync(out); closeSync(err);
  const receipt = { command: ['supabase', ...args], childPid: child.pid, startedAt, endedAt: iso(), timeoutMs, timedOut, exitCode: state.code, signal: state.signal, error: state.error, stdoutPath, stderrPath };
  if (timedOut || state.code !== 0 || state.signal || state.error) throw new Error(`${label} failed or timed out`);
  return receipt;
}

const steps = [];
let proof = null;
let structureSha256 = null;
let status = 'HOLD';
try {
  const proofStep = await run('quiescence-proof', ['db', 'query', '--linked', '--project-ref', TARGET, '--file', join(PACKET, 'PROPOSED_QUIESCENCE_VERIFY.sql'), '--output-format', 'json']);
  steps.push(proofStep);
  proof = resultRow(parseCliJson(readFileSync(proofStep.stdoutPath, 'utf8')), 'phase03b_quiescence_proof_r3');
  const exact = {
    receipt: 'phase03b_quiescence_proof_r3', transaction_read_only: 'on', function_count: 1,
    function_owner: 'postgres', function_definition_sha256: GATE_FUNCTION_SHA256,
    trigger_count: 1, trigger_table_owner: 'postgres', trigger_enabled: 'A', trigger_definition_sha256: ROW_TRIGGER_SHA256,
    truncate_trigger_count: 1, truncate_trigger_enabled: 'A', truncate_trigger_definition_sha256: TRUNCATE_TRIGGER_SHA256,
    ledger_count: 87, ledger_unique_count: 87, ledger_latest_version: '20260915210413',
    ledger_ordered_version_name_sha256: EXPECTED_FINAL_LEDGER_SHA256,
    phase03b_constraint_index_sha256: 'cdcf1cb106f7dd12e1aac53f6cc910fdfd6f8b0b38a4c7ee9cc3e40fb32bac3a',
    http_queue_count: 0, http_response_count: 6, http_response_sha256: HTTP_SHA256,
  };
  for (const [key, value] of Object.entries(exact)) if (proof[key] !== value) throw new Error(`Post-apply proof mismatch: ${key}`);
  const versions = proof.phase03b_versions ?? [];
  if (JSON.stringify(versions) !== JSON.stringify(['20260915210256', '20260915210413'])) throw new Error('Exact Phase 03B ledger versions mismatch');
  const expectedRows = [
    { version: '20260915210256', name: 'phase03b_moderation_semantics_compatibility_bridge', statement_count: 1, statement_sha256: 'b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11' },
    { version: '20260915210413', name: 'phase03b_points_integrity', statement_count: 1, statement_sha256: '0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5' },
  ];
  if (JSON.stringify(proof.phase03b_rows) !== JSON.stringify(expectedRows)) throw new Error('Applied migration statement bytes do not match the frozen pair');
  for (const key of ['function_oid', 'trigger_oid', 'truncate_trigger_oid', 'table_oid', 'flags_id_status_count', 'flags_id_status_sha256', 'history_count', 'history_sha256']) {
    if (proof[key] !== entry[key]) throw new Error(`Entry-to-post-apply mismatch: ${key}`);
  }

  const queryHash = createHash('sha256').update(CATALOG_SQL).digest('hex');
  if (queryHash !== EXPECTED_CATALOG_QUERY_SHA256) throw new Error('Structural capture query drifted from accepted staging recipe');
  const structureSqlPath = join(evidence, 'STRUCTURAL_CAPTURE_READ_ONLY.sql');
  writeFileSync(structureSqlPath, `begin transaction read only;\n${CATALOG_SQL};\nrollback;\n`, { flag: 'wx', mode: 0o600 });
  const structureStep = await run('structure', ['db', 'query', '--linked', '--project-ref', TARGET, '--file', structureSqlPath, '--output-format', 'json'], 120_000);
  steps.push(structureStep);
  const rawCatalog = resultRow(parseCliJson(readFileSync(structureStep.stdoutPath, 'utf8')), 'catalog');
  const filtered = structuredClone(rawCatalog);
  const beforeFunctions = filtered.functions.length; const beforeTriggers = filtered.triggers.length;
  filtered.functions = filtered.functions.filter((item) => !(item.s === 'private' && item.n === 'flagstone_phase03b_block_row_lifecycle_r2' && item.args === ''));
  filtered.triggers = filtered.triggers.filter((item) => !(
    item.s === 'public' && item.t === 'flags' && ['aaa_flagstone_phase03b_row_lifecycle_quiescence_r2', 'aaa_flagstone_phase03b_truncate_quiescence_r3'].includes(item.g)
  ));
  if (beforeFunctions - filtered.functions.length !== 1 || beforeTriggers - filtered.triggers.length !== 2) throw new Error('Only-exact-temporary-gate exclusion cardinality mismatch');
  const normalized = normalizeCatalog(filtered); structureSha256 = checksum(normalized);
  writeJson('NORMALIZED_STRUCTURE_EXCLUDING_EXACT_GATE.json', { queryHash, excludedExactTemporaryObjects: 3, structureSha256, catalog: normalized });
  if (structureSha256 !== EXPECTED_FINAL_STRUCTURE_SHA256) throw new Error('Final structure differs from accepted revised-staging final artifact');

  const functionStep = await run('edge-function', ['functions', 'list', '--project-ref', TARGET, '--output-format', 'json']);
  steps.push(functionStep);
  const functionPayload = parseCliJson(readFileSync(functionStep.stdoutPath, 'utf8'));
  const functions = Array.isArray(functionPayload) ? functionPayload : functionPayload.functions;
  const selected = functions.filter((fn) => fn.slug === 'notify-flag-status').map((fn) => ({
    id: fn.id, slug: fn.slug, name: fn.name, status: fn.status, version: fn.version,
    verifyJwt: fn.verify_jwt, createdAt: fn.created_at, updatedAt: fn.updated_at,
  }));
  if (selected.length !== 1 || hashJson(selected[0]) !== EXPECTED_EDGE_FUNCTION_SHA256) throw new Error('Production Edge Function identity changed');
  writeJson('POST_APPLY_COMPARISON.json', {
    result: 'PASS', target: TARGET, proof, structureSha256,
    acceptedStagingArtifactCommit: 'aca5fdbb0f5fd151a5c98d5ca1b956954cf83354',
    acceptedStagingStructureSha256: EXPECTED_FINAL_STRUCTURE_SHA256,
    edgeFunctionIdentitySha256: EXPECTED_EDGE_FUNCTION_SHA256,
    exactChecks: ['ledger +2 and exact versions', 'full normalized structure excluding only exact temporary gate', 'grants/RLS', 'Build 33 and pinned-web authorization', 'RPC/moderation/points definitions', 'photo_alt boundary', 'admin reject/restore', 'Edge Function identity', 'HTTP baseline', 'primary invariant', 'history invariant', 'temporary gate identity', 'no unexpected migration/object'],
  });
  status = 'PASS_WHILE_QUIESCED';
} catch (error) {
  steps.push({ comparatorError: error.message });
  process.exitCode = 1;
} finally {
  const envelope = buildR8Envelope({
    runId: entryEnvelope.runId,
    controllerPid: entryEnvelope.controllerPid,
    controllerMonotonicOrigin: entryEnvelope.controllerMonotonicOrigin,
    phase: 'POST_APPLY_COMPARATOR',
    expected: {
      result: 'PASS_WHILE_QUIESCED',
      gateManifestSha256: GATE_MANIFEST_SHA256,
      finalLedgerSha256: EXPECTED_FINAL_LEDGER_SHA256,
      finalStructureSha256: EXPECTED_FINAL_STRUCTURE_SHA256,
      httpResponseSha256: HTTP_SHA256,
    },
    observed: { proof, normalizedStructureSha256: structureSha256, steps },
    status,
    capturedAtUtc: iso(),
    capturedAtMonotonic: monoMs(),
    numericExit: status === 'PASS_WHILE_QUIESCED' ? 0 : 1,
  });
  writeJson('POST_APPLY_VERIFIER_RECEIPT.json', envelope);
}
