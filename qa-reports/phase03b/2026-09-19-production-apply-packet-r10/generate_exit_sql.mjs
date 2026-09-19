#!/usr/bin/env node
// Local-only deterministic materializer. It accepts a JSON entry-receipt file,
// writes one new exit SQL file, and performs no network operation.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entryFromEnvelope } from './r8_control_lib.mjs';

const packet = dirname(fileURLToPath(import.meta.url));
const inputArg = process.argv.find((v) => v.startsWith('--entry='));
const outputArg = process.argv.find((v) => v.startsWith('--output='));
if (!inputArg || !outputArg) throw new Error('Required: --entry=/absolute/ENTRY_RECEIPT.json --output=/absolute/new/EXIT.sql');
const input = resolve(inputArg.slice(8));
const output = resolve(outputArg.slice(9));
if (existsSync(output)) throw new Error(`Refusing existing output file: ${output}`);
const envelope = JSON.parse(readFileSync(input, 'utf8'));
const r = entryFromEnvelope(envelope);
const exact = {
  receipt: 'phase03b_quiescence_entry_r3',
  function_owner: 'postgres',
  trigger_table_owner: 'postgres',
  function_definition_sha256: '16555e58ee2cdfce5d54336ef63584116ed1cb798d90ac779c278a5c0e5b0bac',
  trigger_definition_sha256: 'e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf',
  truncate_trigger_definition_sha256: '54e10e11dabd45d1edfdf44a7aa065f2e335c964b230cd41c6138c6ef295c58a',
  trigger_enabled: 'A',
  truncate_trigger_enabled: 'A',
};
for (const [key,value] of Object.entries(exact)) if (r[key] !== value) throw new Error(`Entry receipt mismatch: ${key}`);
for (const key of ['function_oid','trigger_oid','truncate_trigger_oid','flags_id_status_count','history_count']) if (!Number.isSafeInteger(Number(r[key])) || Number(r[key]) < 0) throw new Error(`Invalid numeric entry field: ${key}`);
for (const key of ['flags_id_status_sha256','history_sha256']) if (!/^[0-9a-f]{64}$/.test(r[key])) throw new Error(`Invalid digest entry field: ${key}`);
let sql = readFileSync(join(packet,'PROPOSED_QUIESCENCE_EXIT_TEMPLATE.sql'),'utf8');
const replacements = {
  '__ENTRY_FUNCTION_OID__': String(Number(r.function_oid)), '__ENTRY_TRIGGER_OID__': String(Number(r.trigger_oid)),
  '__ENTRY_TRUNCATE_TRIGGER_OID__': String(Number(r.truncate_trigger_oid)),
  '__ENTRY_FUNCTION_SHA256__': r.function_definition_sha256, '__ENTRY_TRIGGER_SHA256__': r.trigger_definition_sha256,
  '__ENTRY_TRUNCATE_TRIGGER_SHA256__': r.truncate_trigger_definition_sha256,
  '__ENTRY_FLAGS_COUNT__': String(Number(r.flags_id_status_count)), '__ENTRY_FLAGS_SHA256__': r.flags_id_status_sha256,
  '__ENTRY_HISTORY_COUNT__': String(Number(r.history_count)), '__ENTRY_HISTORY_SHA256__': r.history_sha256,
};
for (const [token,value] of Object.entries(replacements)) sql = sql.replaceAll(token,value);
if (/__[A-Z0-9_]+__/.test(sql)) throw new Error('Unresolved exit template token');
writeFileSync(output, sql, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({status:'PASS',input,output},null,2));
