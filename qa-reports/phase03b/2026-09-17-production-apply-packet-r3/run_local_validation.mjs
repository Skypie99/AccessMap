#!/usr/bin/env node
// Reproducible local-only evidence capture for validate_quiescence_local.mjs.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packet = dirname(fileURLToPath(import.meta.url));
const outputs = {
  stdout: join(packet, 'LOCAL_VALIDATION.stdout.log'),
  stderr: join(packet, 'LOCAL_VALIDATION.stderr.log'),
  json: join(packet, 'LOCAL_QUIESCENCE_VALIDATION.json'),
  receipt: join(packet, 'LOCAL_VALIDATION_RECEIPT.json'),
};
for (const path of Object.values(outputs)) if (existsSync(path)) throw new Error(`Refusing existing evidence file: ${path}`);
const startedAtUtc = new Date().toISOString();
const startedMono = process.hrtime.bigint();
const child = spawnSync(process.execPath, [join(packet, 'validate_quiescence_local.mjs')], {
  encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env,
});
const endedAtUtc = new Date().toISOString();
writeFileSync(outputs.stdout, child.stdout ?? '', { mode: 0o600, flag: 'wx' });
writeFileSync(outputs.stderr, child.stderr ?? '', { mode: 0o600, flag: 'wx' });
let parsed;
try { parsed = JSON.parse(child.stdout); } catch { parsed = { status: 'ERROR', parseError: 'validator stdout was not one JSON document' }; }
writeFileSync(outputs.json, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
const receipt = {
  command: [process.execPath, join(packet, 'validate_quiescence_local.mjs')],
  startedAtUtc, endedAtUtc,
  monotonicDurationMs: Number((process.hrtime.bigint() - startedMono) / 1_000_000n),
  childPid: child.pid ?? null,
  exitCode: child.status,
  signal: child.signal,
  spawnError: child.error ? { code: child.error.code, message: child.error.message } : null,
  stdout: outputs.stdout,
  stderr: outputs.stderr,
  resultJson: outputs.json,
};
writeFileSync(outputs.receipt, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
if (child.status !== 0 || child.signal || child.error || parsed.status !== 'PASS') process.exit(1);
console.log(JSON.stringify({ status: 'PASS', ...receipt }, null, 2));
