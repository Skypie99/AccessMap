/**
 * Production planning is a separate, non-mutating authority. These tests bind
 * the plan to retained production evidence and prove that none of the staging
 * apply helpers can be turned into a production apply path.
 */
import { createHash } from 'crypto';
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const MOD = './scripts/canonical-apply-workspace.mjs';
const ID = './scripts/canonical-migration-identity.mjs';
const PROD = 'kldlwszpfkdmsjrjhjym';
const OLD_STAGING = 'ctshxbykuemeqnofqcdh';
const FRESH_STAGING = 'ohkrskupelstthqmweny';
const packet = path.join(root, 'qa-reports/phase03a/2026-09-15-production-preflight');
const evidenceFile = path.join(packet, 'PENDING_MIGRATION_PLAN.json');
const ledgerFile = path.join(packet, 'PRODUCTION_LEDGER.json');
const baselineDir = path.join(root, 'supabase/migrations');
const adoptionDir = path.join(root, 'supabase/migrations-next');
const candidateDir = path.join(adoptionDir, 'phase03a');
const contract = JSON.parse(fs.readFileSync(path.join(candidateDir, 'candidate-contract.json'), 'utf8'));
const retainedEvidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
const retainedLedger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const sha256 = (body: Buffer | string) => createHash('sha256').update(body).digest('hex');

function invoke(mod: string, fn: string, ...args: unknown[]): { ok: boolean; value?: any; message?: string } {
  const code =
    `import * as m from '${mod}';` +
    `const a=${JSON.stringify(args)};` +
    `let out;try{out={ok:true,value:m.${fn}(...a)};}catch(e){out={ok:false,message:String(e.message)};}` +
    `console.log(JSON.stringify(out));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  }));
}

function evidenceArgs(evidence = retainedEvidence, ledger = retainedLedger) {
  const bytes = JSON.stringify(evidence);
  return {
    baselineDir, adoptionDir, candidateDir,
    declared: contract.migrations,
    adoptionDeclared: contract.phase02Adoption.entries,
    ledger, evidence,
    evidenceSha256: sha256(bytes),
    actualEvidenceSha256: sha256(bytes),
    projectRef: PROD,
    sourceHead: evidence.sourceIdentity.currentSha,
    sourceTree: evidence.sourceIdentity.currentTree,
    evidenceSourceAncestor: true,
  };
}

function build(evidence = retainedEvidence, ledger = retainedLedger) {
  return invoke(MOD, 'buildProductionPlan', evidenceArgs(evidence, ledger));
}

function destroy(workspace: string | null | undefined) {
  if (workspace) invoke(MOD, 'destroyWorkspace', workspace);
}

describe('production plan target authority', () => {
  it('accepts only the exact production ref and returns only a non-mutating dry-run', () => {
    const result = invoke(MOD, 'productionPlanCommand', { workspace: '/tmp/plan-workspace', projectRef: PROD });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual(expect.objectContaining({
      mode: 'PRODUCTION_PLAN_ONLY', target: PROD, nonMutating: true, applyAvailable: false,
    }));
    expect(result.value.dryRunArgv).toEqual([
      'supabase', 'db', 'push', '--workdir', '/tmp/plan-workspace',
      '--project-ref', PROD, '--dry-run', '--skip-vault',
    ]);
    expect(JSON.stringify(result.value)).not.toMatch(/applyArgv|"apply"\s*:/);
    expect(result.value.dryRunArgv).not.toContain('--linked');
    expect(result.value.dryRunArgv).not.toContain('--db-url');
  });

  it.each([
    ['missing', undefined],
    ['trailing whitespace', `${PROD} `],
    ['old staging', OLD_STAGING],
    ['fresh staging', FRESH_STAGING],
  ])('refuses %s project identity', (_label, projectRef) => {
    expect(invoke(MOD, 'productionPlanCommand', {
      workspace: '/tmp/plan-workspace', projectRef,
    }).ok).toBe(false);
  });

  it('refuses linked and DB URL selectors at the production-plan CLI boundary', () => {
    for (const selector of ['--linked', '--db-url']) {
      const args = ['scripts/canonical-apply-workspace.mjs', 'production-plan', selector];
      if (selector === '--db-url') args.push('postgresql://example.invalid/db');
      const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/prohibited in production plan-only mode/);
    }
  });

  it('keeps production apply refused even if a caller supplies the old override', () => {
    const identity = invoke(ID, 'supportedApplyCommand', {
      projectRef: PROD, dryRun: false, expectStaging: false,
    });
    const workspace = invoke(MOD, 'workspaceCommands', {
      workspace: '/tmp/plan-workspace', projectRef: PROD, expectStaging: false,
    });
    expect(identity.ok).toBe(false);
    expect(workspace.ok).toBe(false);
    expect(`${identity.message} ${workspace.message}`).toMatch(/production/i);
  });
});

describe('production evidence and pending-set binding', () => {
  it('turns the exact clean 71-row evidence into the exact 14-file Stage A plan', () => {
    const called = build();
    expect(called.ok).toBe(true);
    const result = called.value;
    try {
      expect(result.ok).toBe(true);
      expect(retainedLedger).toHaveLength(71);
      expect(result.plan).toHaveLength(14);
      expect(result.plan.map((entry: { version: string }) => entry.version))
        .toEqual(retainedEvidence.entries.map((entry: { version: string }) => entry.version));
      expect(result.plan.map((entry: { sha256: string }) => entry.sha256))
        .toEqual(retainedEvidence.entries.map((entry: { sha256: string }) => entry.sha256));
      expect(result.plan.every((entry: { file: string }) => !/stage_b_cutover/i.test(entry.file))).toBe(true);
      expect(result.productionApplyAvailable).toBe(false);
    } finally {
      destroy(result.workspace);
    }
  });

  it('refuses a phantom ledger version before a workspace survives', () => {
    const ledger = retainedLedger.map((row: unknown) => ({ ...(row as object) }));
    ledger[10] = { name: 'fabricated_wall_clock_row', version: '20260914121212' };
    const evidence = structuredClone(retainedEvidence);
    // Keep the retained contract internally consistent so the ledger auditor,
    // rather than the earlier capture-consistency check, proves the phantom.
    evidence.productionPreApplyContract.ledgerLatest = '20260914121212';
    const result = build(evidence, ledger).value;
    expect(result.ok).toBe(false);
    expect(result.workspace).toBeNull();
    expect(result.refusals.join('\n')).toMatch(/phantom remote version|wall-clock substitution|impossible ordering/);
  });

  it('does not reapply an exact canonical migration already recorded in the ledger', () => {
    const applied = retainedEvidence.entries[0];
    const ledger = [...retainedLedger, { name: applied.name, version: applied.version }];
    const evidence = structuredClone(retainedEvidence);
    evidence.entries = evidence.entries.slice(1);
    evidence.pendingCount = evidence.entries.length;
    evidence.productionPreApplyContract.ledgerRows = ledger.length;
    evidence.productionPreApplyContract.ledgerLatest = applied.version;
    const called = build(evidence, ledger);
    expect(called.ok).toBe(true);
    try {
      expect(called.value.ok).toBe(true);
      expect(called.value.plan).toHaveLength(13);
      expect(called.value.plan.some((entry: { version: string }) => entry.version === applied.version)).toBe(false);
    } finally {
      destroy(called.value.workspace);
    }
  });

  it('refuses candidate/object mismatch and a tampered manifest hash', () => {
    const mismatch = structuredClone(retainedEvidence);
    mismatch.productionPreApplyContract.exactAcceptedComparatorMatch = false;
    const mismatchResult = build(mismatch).value;
    expect(mismatchResult.ok).toBe(false);
    expect(mismatchResult.refusals.join('\n')).toMatch(/candidate\/object mismatch/);

    const args = evidenceArgs();
    args.evidenceSha256 = '0'.repeat(64);
    const hashResult = invoke(MOD, 'buildProductionPlan', args).value;
    expect(hashResult.ok).toBe(false);
    expect(hashResult.refusals.join('\n')).toMatch(/evidence hash mismatch/);
  });

  it('refuses evidence whose exact source identity is not a verified ancestor', () => {
    const args = evidenceArgs();
    args.evidenceSourceAncestor = false;
    const result = invoke(MOD, 'buildProductionPlan', args).value;
    expect(result.ok).toBe(false);
    expect(result.refusals.join('\n')).toMatch(/exact verified ancestor/);
  });

  it('refuses Stage B leakage and a pending-entry hash mismatch', () => {
    const stageB = structuredClone(retainedEvidence);
    stageB.stageB.included = true;
    stageB.entries.push({
      order: 15, stage: 'B', version: '20260911130000',
      file: '20260911130000_phase03a_fda026_stage_b_cutover.sql', sha256: 'a'.repeat(64),
    });
    const stageBResult = build(stageB).value;
    expect(stageBResult.ok).toBe(false);
    expect(stageBResult.refusals.join('\n')).toMatch(/Stage B/);

    const tampered = structuredClone(retainedEvidence);
    tampered.entries[0].sha256 = 'f'.repeat(64);
    const tamperedResult = build(tampered).value;
    expect(tamperedResult.ok).toBe(false);
    expect(tamperedResult.workspace).toBeNull();
    expect(tamperedResult.refusals.join('\n')).toMatch(/does not exactly match the evidence manifest/);
  });
});
