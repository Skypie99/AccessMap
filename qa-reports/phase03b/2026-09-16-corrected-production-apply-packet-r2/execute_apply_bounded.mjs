#!/usr/bin/env node
// PROPOSAL ONLY. Requires a separate production-apply authorization.
// Captures stdout/stderr separately and bounds only the local CLI process.
// A timeout NEVER proves the server operation stopped; the runbook requires a
// separate read-only pg_stat_activity/ledger/catalog adjudication.
import { openSync, closeSync, writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const WORKDIR = '/tmp/flagstone-p03b-production-apply-9d638456';
const TARGET = 'kldlwszpfkdmsjrjhjym';
const APPLY_TIMEOUT_MS = 180_000;
const pending = [
  ['20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql','b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11'],
  ['20260915210413_phase03b_points_integrity.sql','0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5'],
];
const evidenceArg = process.argv.find((v) => v.startsWith('--evidence='));
const entryArg = process.argv.find((v) => v.startsWith('--entry='));
if (!evidenceArg || !entryArg) throw new Error('Required: --entry=/absolute/ENTRY_RECEIPT.json --evidence=/absolute/new/directory');
const evidence = resolve(evidenceArg.slice(11));
const entryPath = resolve(entryArg.slice(8));
if (existsSync(evidence)) throw new Error(`Refusing existing evidence path: ${evidence}`);
mkdirSync(evidence, { recursive: false, mode: 0o700 });
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
for (const [name,hash] of pending) if (sha(join(WORKDIR,'supabase/migrations',name)) !== hash) throw new Error(`Frozen migration mismatch: ${name}`);
const manifest = JSON.parse(readFileSync(join(WORKDIR,'PHASE03B_APPLY_WORKSPACE_MANIFEST.json'),'utf8'));
if (manifest.target !== TARGET || JSON.stringify(manifest.pendingMigrations) !== JSON.stringify(pending.map(([n]) => n))) throw new Error('Apply workspace target/inventory mismatch');
const files = readdirSync(join(WORKDIR,'supabase/migrations')).filter((n) => n.endsWith('.sql')).sort();
if (files.length !== 87 || files.at(-2) !== pending[0][0] || files.at(-1) !== pending[1][0]) throw new Error('Apply workspace must contain the 85 applied files plus exactly two frozen pending files');
const entryEnvelope = JSON.parse(readFileSync(entryPath,'utf8'));
const entry = entryEnvelope.phase03b_quiescence_entry_r2 ?? entryEnvelope;
if (entry.receipt !== 'phase03b_quiescence_entry_r2' || entry.trigger_enabled !== 'A') throw new Error('Invalid quiescence entry receipt');
const entryEpochMs = Date.parse(entry.boundary_at_utc);
if (!Number.isFinite(entryEpochMs)) throw new Error('Invalid quiescence entry timestamp');
const remainingApplyMs = entryEpochMs + APPLY_TIMEOUT_MS - Date.now();
if (remainingApplyMs <= 0) throw new Error('The 180-second entry-to-apply-completion budget is already exhausted');

const args = ['db','push','--workdir',WORKDIR,'--linked','--project-ref',TARGET,'--skip-vault','--include-all','--yes','--output-format','json'];
const startedAt = new Date().toISOString();
const out = openSync(join(evidence,'stdout.log'),'wx',0o600);
const err = openSync(join(evidence,'stderr.log'),'wx',0o600);
const child = spawn('supabase', args, { cwd: WORKDIR, stdio: ['ignore',out,err], detached: true, env: { ...process.env } });
let timedOut = false;
let termTimer;
let killTimer;
const monitor = [];
const cadence = setInterval(() => monitor.push({at:new Date().toISOString(),elapsedMs:Date.now()-Date.parse(startedAt),localProcessState:child.exitCode===null?'running':'exited'}),5_000);
const killGroup = (signal) => { try { process.kill(-child.pid, signal); } catch { /* already exited */ } };
const timeout = setTimeout(() => {
  timedOut=true;
  killGroup('SIGINT');
  termTimer=setTimeout(() => killGroup('SIGTERM'),10_000);
  killTimer=setTimeout(() => killGroup('SIGKILL'),20_000);
},remainingApplyMs);
child.on('error',(error) => { clearInterval(cadence); clearTimeout(timeout); closeSync(out); closeSync(err); writeFileSync(join(evidence,'runner-error.json'),JSON.stringify({message:error.message},null,2),{mode:0o600}); process.exitCode=1; });
child.on('exit',(code,signal) => {
  clearInterval(cadence); clearTimeout(timeout); clearTimeout(termTimer); clearTimeout(killTimer); closeSync(out); closeSync(err);
  const receipt={command:['supabase',...args],workdir:WORKDIR,target:TARGET,entryReceipt:entryPath,entryBoundaryAtUtc:entry.boundary_at_utc,startedAt,endedAt:new Date().toISOString(),commandWallClockMs:Date.now()-Date.parse(startedAt),entryToExitWallClockMs:Date.now()-entryEpochMs,totalApplyTimeoutMs:APPLY_TIMEOUT_MS,localTimeoutScheduledMs:remainingApplyMs,timedOut,exitCode:code,signal,monitoringCadenceMs:5000,localProcessMonitor:monitor,serverStateProven:false,automaticRetryAuthorized:false};
  writeFileSync(join(evidence,'apply-receipt.json'),`${JSON.stringify(receipt,null,2)}\n`,{mode:0o600,flag:'wx'});
  process.exitCode = code===0 && !timedOut ? 0 : 1;
});
