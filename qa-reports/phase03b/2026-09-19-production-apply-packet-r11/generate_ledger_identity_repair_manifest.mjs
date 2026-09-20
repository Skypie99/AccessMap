#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKET = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PACKET, '../../..');
const EVIDENCE = join(ROOT, 'qa-reports/phase03b/2026-09-19-post-apply-recovery-evidence');
const OUTPUT_JSON = join(EVIDENCE, 'LEDGER_IDENTITY_REPAIR_MANIFEST.json');
const OUTPUT_SHA = join(EVIDENCE, 'LEDGER_IDENTITY_REPAIR_MANIFEST.sha256');
if (existsSync(OUTPUT_JSON) || existsSync(OUTPUT_SHA)) throw new Error('Refusing existing ledger identity repair manifest');

const packetFiles = [
  'EXPECTED_PHASE03B_STATEMENT_IDENTITY.json',
  'MIGRATION_LEDGER_STATEMENT_IDENTITY_CONTRACT.md',
  'POST_EXIT_VERIFY.sql',
  'PROPOSED_QUIESCENCE_VERIFY.sql',
  'STRICT_R8_ENVELOPE_SCHEMA.json',
  'generate_ledger_identity_repair_manifest.mjs',
  'phase03b_statement_identity.mjs',
  'r8_control_lib.mjs',
  'run_post_apply_recovery_local_validation.mjs',
  'validate_ledger_statement_identity.mjs',
  'validate_post_apply_recovery_transport.mjs',
  'validate_r8_controls.mjs',
  'verify_post_apply.mjs',
  'verify_post_exit.mjs',
].map((name) => join(PACKET, name));
const migrationFiles = [
  '20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql',
  '20260915210413_phase03b_points_integrity.sql',
].map((name) => join(ROOT, 'supabase/migrations-next/phase03b', name));
const evidenceDirectories = [
  'ledger-statement-identity-local-validation',
  'live-ledger-statement-identity-post-apply',
  'ledger-statement-identity-local-validation-v2',
].map((name) => join(EVIDENCE, name));

function walk(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`Manifest symlink forbidden: ${path}`);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) throw new Error(`Unsupported manifest artifact: ${path}`);
  return readdirSync(path).sort().flatMap((name) => walk(join(path, name)));
}

const paths = [...packetFiles, ...migrationFiles, ...evidenceDirectories.flatMap(walk)].sort();
const artifacts = paths.map((path) => ({
  path: relative(ROOT, path),
  size: lstatSync(path).size,
  sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
}));
const receipt = JSON.parse(readFileSync(join(EVIDENCE, 'ledger-statement-identity-local-validation-v2/POST_APPLY_RECOVERY_LOCAL_VALIDATION_RECEIPT.json'), 'utf8'));
const live = JSON.parse(readFileSync(join(EVIDENCE, 'live-ledger-statement-identity-post-apply/POST_APPLY_VERIFIER_RECEIPT.json'), 'utf8'));
if (receipt.status !== 'PASS' || receipt.ledgerIdentityTests?.passed !== 23 || receipt.ledgerIdentityTests?.total !== 23 ||
    receipt.recoveryTransportTests?.passed !== 13 || receipt.recoveryTransportTests?.total !== 13 ||
    receipt.validationInfrastructureDestroyed !== true || live.status !== 'HOLD' || live.numericExit !== 1) {
  throw new Error('Repair evidence does not match the fail-closed checkpoint');
}
const manifest = {
  schemaVersion: 1,
  promptId: 'FLAGSTONE-P03B-R11-RECOVERY-LEDGER-STATEMENT-IDENTITY-20260919',
  candidateSha: '9d638456fa8e679678c54f131fe8f0db723eda72',
  candidateTree: 'cfc76206f7cf7af6a7127a6329620d2ee1dc4da8',
  parserSourceCommit: '997a1e69a4a83466964ed874d3a604c88a7b3866',
  ledgerIdentityTests: receipt.ledgerIdentityTests,
  priorRecoveryTransportTests: receipt.recoveryTransportTests,
  liveCorrectedPostApplyVerification: 'HOLD',
  liveVerifierRunCount: 1,
  liveVerifierRetried: false,
  productionMutations: 'NONE',
  migrationApplyRetried: false,
  restorationRunbookPrepared: false,
  restorationExecuted: false,
  strictSchemaWeakened: false,
  candidateBytesChanged: false,
  historicalR11ManifestDisposition: 'PRESERVED_AS_PRE_REPAIR_HISTORY',
  artifactCount: artifacts.length,
  artifacts,
};
writeFileSync(OUTPUT_JSON, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
writeFileSync(OUTPUT_SHA, `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join('\n')}\n`, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ status: 'PASS', artifactCount: artifacts.length, output: relative(ROOT, OUTPUT_JSON) }, null, 2));
