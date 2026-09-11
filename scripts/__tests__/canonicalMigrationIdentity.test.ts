/**
 * STAGE-MF-01 / STAGE-MF-08 — the apply guard must refuse every way the first
 * staging run destroyed migration identity, and the forward-only ledger model must
 * refuse to backdate history.
 *
 * Each case here is a real failure mode, not a hypothetical: the wall-clock and
 * ledgerless cases are the exact signatures measured on staging.
 */
import { execFileSync } from 'node:child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

// The module is ESM (.mjs) and this jest config is CJS, so evaluate it in a node
// subprocess -- the same convention scripts/__tests__/phase03aReplay.test.ts uses.
const root = path.join(__dirname, '..', '..');
const MOD = './scripts/canonical-migration-identity.mjs';

function call(fn: string, ...args: unknown[]): any {
  const code =
    `import * as m from '${MOD}';` +
    `const a=${JSON.stringify(args)};` +
    `let out;try{out={ok:true,v:m.${fn}(...a)};}catch(e){out={ok:false,message:String(e.message)};}` +
    `console.log(JSON.stringify(out));`;
  const res = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root, encoding: 'utf8',
  }));
  if (!res.ok) throw new Error(res.message);
  return res.v;
}
function constant(name: string): any {
  const code = `import * as m from '${MOD}'; console.log(JSON.stringify(m.${name}));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8' }));
}

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');
const canonicalIdentity = (f: string) => call('canonicalIdentity', f);
const planApply = (o: unknown) => call('planApply', o);
const verifyLedgerIdentity = (o: unknown) => call('verifyLedgerIdentity', o);
const supportedApplyCommand = (o: unknown) => call('supportedApplyCommand', o);
const assertUnambiguousTarget = (a: unknown) => call('assertUnambiguousTarget', a);
const PROHIBITED_MECHANISMS = constant('PROHIBITED_MECHANISMS');
const forwardRestorationName = (f: string, at: Date) => call('forwardRestorationName', f, at.toISOString());

let dir: string;
const write = (name: string, body: string) => {
  fs.writeFileSync(path.join(dir, name), body);
  return sha256(Buffer.from(body));
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canon-mig-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('canonical identity comes from the filename, never the clock', () => {
  it('extracts version and name', () => {
    expect(canonicalIdentity('20260905055633_phase03a_contextual_profiles.sql'))
      .toEqual({ version: '20260905055633', name: 'phase03a_contextual_profiles', file: '20260905055633_phase03a_contextual_profiles.sql' });
  });

  it('rejects a non-canonical filename outright', () => {
    expect(() => canonicalIdentity('contextual_profiles.sql')).toThrow(/Not a canonical/);
    expect(() => canonicalIdentity('2026090_short.sql')).toThrow(/Not a canonical/);
  });
});

describe('planApply refuses the failure modes measured on staging', () => {
  it('plans a clean, ordered Stage A apply', () => {
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const b = write('20260905055630_open_inserts.sql', '-- b');
    const { plan, refusals, ok } = planApply({
      dir,
      declared: [
        { file: '20260905055630_open_inserts.sql', sha256: b, applyStage: 'A' },
        { file: '20260905055629_flag_policies.sql', sha256: a, applyStage: 'A' },
      ],
      ledger: [],
    });
    expect(ok).toBe(true);
    expect(refusals).toEqual([]);
    expect(plan.map((p: { version: string }) => p.version)).toEqual(['20260905055629', '20260905055630']);
  });

  it('refuses a hash mismatch — same version, different bytes', () => {
    write('20260905055629_flag_policies.sql', '-- tampered');
    const { refusals, ok } = planApply({
      dir,
      declared: [{ file: '20260905055629_flag_policies.sql', sha256: sha256(Buffer.from('-- reviewed')), applyStage: 'A' }],
      ledger: [],
    });
    expect(ok).toBe(false);
    expect(refusals.join()).toMatch(/hash mismatch/);
  });

  it('refuses a candidate with no declared applyStage', () => {
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const { refusals } = planApply({
      dir, declared: [{ file: '20260905055629_flag_policies.sql', sha256: a }], ledger: [],
    });
    expect(refusals.join()).toMatch(/missing applyStage/);
  });

  it('withholds Stage B from a Stage A plan', () => {
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const b = write('20260910120000_fda026_stage_b_cutover.sql', '-- b');
    const { plan } = planApply({
      dir,
      declared: [
        { file: '20260905055629_flag_policies.sql', sha256: a, applyStage: 'A' },
        { file: '20260910120000_fda026_stage_b_cutover.sql', sha256: b, applyStage: 'B' },
      ],
      ledger: [],
    });
    expect(plan.map((p: { name: string }) => p.name)).toEqual(['flag_policies']);
  });

  it('refuses a duplicate canonical version', () => {
    const a = write('20260905055629_one.sql', '-- a');
    const b = write('20260905055629_two.sql', '-- b');
    const { refusals } = planApply({
      dir,
      declared: [
        { file: '20260905055629_one.sql', sha256: a, applyStage: 'A' },
        { file: '20260905055629_two.sql', sha256: b, applyStage: 'A' },
      ],
      ledger: [],
    });
    expect(refusals.join()).toMatch(/Duplicate canonical version 20260905055629/);
  });

  it('skips a candidate already applied under its canonical version', () => {
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const { plan, ok } = planApply({
      dir,
      declared: [{ file: '20260905055629_flag_policies.sql', sha256: a, applyStage: 'A' }],
      ledger: [{ version: '20260905055629', name: 'flag_policies' }],
      knownLocalVersions: ['20260905055629'],
    });
    expect(ok).toBe(true);
    expect(plan).toEqual([]);
  });

  it('refuses to audit a non-empty ledger with no known-local version set', () => {
    // STAGE-BLOCK-02. Without it there is no way to tell a legitimate historical
    // row from a fabricated one, and guessing is how the first run came to trust a
    // poisoned history. Fail closed rather than assume.
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const { ok, refusals } = planApply({
      dir,
      declared: [{ file: '20260905055629_flag_policies.sql', sha256: a, applyStage: 'A' }],
      ledger: [{ version: '20260905055629', name: 'flag_policies' }],
    });
    expect(ok).toBe(false);
    expect(refusals.join()).toMatch(/unauditable ledger/);
  });

  it('refuses when the ledger holds that version under a different name', () => {
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const { refusals } = planApply({
      dir,
      declared: [{ file: '20260905055629_flag_policies.sql', sha256: a, applyStage: 'A' }],
      ledger: [{ version: '20260905055629', name: 'something_else' }],
      knownLocalVersions: ['20260905055629'],
    });
    expect(refusals.join()).toMatch(/different name/);
  });

  it('refuses a manifest entry with no file on disk', () => {
    const { refusals } = planApply({
      dir, declared: [{ file: '20260905055629_missing.sql', sha256: 'x'.repeat(64), applyStage: 'A' }], ledger: [],
    });
    expect(refusals.join()).toMatch(/absent on disk/);
  });
});

describe('verifyLedgerIdentity reproduces and detects the staging defects', () => {
  const expected = [
    { file: '20260904000000_adopt_private_admin_helper.sql' },
    { file: '20260909120000_fda028_v4_limiter.sql' },
  ];

  it('passes when every candidate has exactly one row under its canonical version', () => {
    const r = verifyLedgerIdentity({
      expected,
      ledger: [
        { version: '20260904000000', name: 'adopt_private_admin_helper' },
        { version: '20260909120000', name: 'fda028_v4_limiter' },
      ],
    });
    expect(r).toEqual({ passed: true, problems: [] });
  });

  it('detects the wall-clock substitution measured on staging', () => {
    // Exactly what staging recorded: the right name under the apply time.
    const r = verifyLedgerIdentity({
      expected,
      ledger: [
        { version: '20260910161947', name: 'adopt_private_admin_helper' },
        { version: '20260909120000', name: 'fda028_v4_limiter' },
      ],
    });
    expect(r.passed).toBe(false);
    expect(r.problems.join()).toMatch(/Wall-clock substitution/);
    expect(r.problems.join()).toMatch(/NO ledger row for canonical version 20260904000000/);
  });

  it('detects a ledgerless apply', () => {
    const r = verifyLedgerIdentity({
      expected, ledger: [{ version: '20260904000000', name: 'adopt_private_admin_helper' }],
    });
    expect(r.passed).toBe(false);
    expect(r.problems.join()).toMatch(/fda028_v4_limiter.*NO ledger row/);
  });

  it('detects a double apply', () => {
    const r = verifyLedgerIdentity({
      expected: [expected[0]],
      ledger: [
        { version: '20260904000000', name: 'adopt_private_admin_helper' },
        { version: '20260904000000', name: 'adopt_private_admin_helper' },
      ],
    });
    expect(r.problems.join()).toMatch(/applied more than once/);
  });
});

describe('STAGE-MF-08 forward-only restoration never rewrites history', () => {
  it('names a restoration that sorts after the migration it undoes', () => {
    const name = forwardRestorationName(
      '20260905055633_phase03a_contextual_profiles.sql', new Date(Date.UTC(2026, 8, 10, 13, 0, 0)));
    expect(name).toBe('20260910130000_restore_phase03a_contextual_profiles.sql');
    expect(name.slice(0, 14) > '20260905055633').toBe(true);
  });

  it('builds a REAL conforming forward-restoration migration, not just a name', () => {
    // Independent review: a naming helper alone leaves the ledger defect to recur,
    // because no artifact conforms to the model. This is the artifact.
    const built = call('buildForwardRestoration', {
      candidateFile: '20260905055633_phase03a_contextual_profiles.sql',
      rollbackBody: '-- PHASE-03A LOCAL CANDIDATE: FDA-026 STAGE A rollback.\nBEGIN;\nDROP FUNCTION public.foo();\nCOMMIT;',
      at: new Date(Date.UTC(2026, 8, 10, 13, 0, 0)).toISOString(),
      reason: 'premature cutover',
    });
    expect(built.filename).toBe('20260910130000_restore_phase03a_contextual_profiles.sql');
    expect(built.version).toBe('20260910130000');
    // It carries the rollback body...
    expect(built.contents).toContain('DROP FUNCTION public.foo();');
    // ...states the reason...
    expect(built.contents).toContain('premature cutover');
    // ...says plainly that it does not rewrite history...
    expect(built.contents).toMatch(/NOT a deletion or rewrite/);
    // ...and drops the "NOT AUTHORIZED FOR APPLY" candidate banner, since this file
    // IS meant to be applied once the owner decides to roll back.
    expect(built.contents).not.toMatch(/PHASE-03A LOCAL CANDIDATE/);
    // The restoration must sort after what it undoes, or the ledger reads backwards.
    expect(built.version > '20260905055633').toBe(true);
  });

  it('refuses to backdate a restoration before the migration it undoes', () => {
    expect(() => forwardRestorationName(
      '20260905055633_phase03a_contextual_profiles.sql', new Date(Date.UTC(2026, 7, 1))))
      .toThrow(/Refusing to backdate history/);
  });
});

describe('the one supported apply command', () => {
  it('names exactly one target and defaults to a dry run', () => {
    // CHANGED from the accepted candidate, deliberately. It used to emit
    // `--linked --project-ref <ref>`. The corrected rerun found `projects list`
    // reporting PRODUCTION as linked:true, so that command's safety rested on
    // undocumented flag precedence -- which did favour --project-ref, verified
    // empirically, but a precedence is not a guarantee. One authority now.
    expect(supportedApplyCommand({ projectRef: 'ctshxbykuemeqnofqcdh' }))
      .toBe('supabase db push --project-ref ctshxbykuemeqnofqcdh --dry-run');
    expect(supportedApplyCommand({ projectRef: 'ctshxbykuemeqnofqcdh', dryRun: false }))
      .toBe('supabase db push --project-ref ctshxbykuemeqnofqcdh');
    expect(supportedApplyCommand({ projectRef: 'ctshxbykuemeqnofqcdh' })).not.toMatch(/--linked/);
  });

  it('refuses to build a staging command aimed at production', () => {
    expect(() => supportedApplyCommand({ projectRef: 'kldlwszpfkdmsjrjhjym' })).toThrow(/production project/);
  });

  it('refuses an ambiguous command carrying two target selectors', () => {
    expect(() => assertUnambiguousTarget(['--linked', '--project-ref', 'x'])).toThrow(/Ambiguous target/);
    expect(() => assertUnambiguousTarget(['--db-url', 'x', '--project-ref', 'y'])).toThrow(/Ambiguous target/);
    expect(() => assertUnambiguousTarget(['--linked'])).toThrow(/No explicit target/);
    expect(assertUnambiguousTarget(['--project-ref', 'x'])).toBe(true);
  });

  it('refuses to build a command with no explicit target', () => {
    // Wording changed with the 2026-09-11 target-token fix: the value is now
    // validated before anything else, so the refusal names the value rather than
    // the policy. Still a refusal, and an earlier one.
    expect(() => supportedApplyCommand({})).toThrow(/projectRef is required/);
  });

  it('records both prohibited mechanisms with what was observed', () => {
    expect(PROHIBITED_MECHANISMS).toHaveLength(2);
    expect(PROHIBITED_MECHANISMS.every((m: { verdict: string }) => m.verdict === 'PROHIBITED for production')).toBe(true);
    expect(JSON.stringify(PROHIBITED_MECHANISMS)).toMatch(/20260910161947/);
  });
});

describe('STAGE-BLOCK-02 — the real contaminated staging ledger must be refused', () => {
  // The permanent negative fixture: the actual ledger of the first staging run.
  // planApply() once returned ok:true against this while verifyLedgerIdentity()
  // returned 14 problems on the very same input, and the plan it green-lit would
  // have aborted on a real database. This is the regression proving the two halves
  // of the guard rail now speak to each other.
  const fixture = JSON.parse(fs.readFileSync(
    path.join(root, 'supabase/tests/phase03a-fixtures/contaminated-staging-ledger.json'), 'utf8'));
  const contaminated = fixture.rows as { version: string; name: string }[];
  const contract = JSON.parse(fs.readFileSync(
    path.join(root, 'supabase/migrations-next/phase03a/candidate-contract.json'), 'utf8'));
  const candDir = path.join(root, 'supabase/migrations-next/phase03a');
  const baselineVersions = fs.readdirSync(path.join(root, 'supabase/migrations'))
    .filter((f) => /^\d{14}_.*\.sql$/.test(f)).map((f) => f.slice(0, 14));
  const known = [
    ...baselineVersions,
    ...contract.phase02Adoption.entries.map((e: { file: string }) => e.file.slice(0, 14)),
    ...contract.migrations.map((m: { file: string }) => m.file.slice(0, 14)),
  ];
  const stageA = contract.migrations.filter((m: { applyStage: string }) => m.applyStage === 'A');
  const run = (ledger: unknown) =>
    planApply({ dir: candDir, declared: contract.migrations, ledger, stage: 'A', knownLocalVersions: known });

  it('REFUSES it, and returns no executable plan', () => {
    const res = run(contaminated);
    expect(res.ok).toBe(false);
    // A refused plan must be empty. Returning candidates alongside refusals is how
    // a caller ends up pushing anyway.
    expect(res.plan).toEqual([]);
  });

  it('fires three independent detectors and finds all eleven phantom rows', () => {
    const { refusals } = run(contaminated);
    const joined = refusals.join('\n');
    expect(refusals.filter((r: string) => r.includes('phantom remote version'))).toHaveLength(11);
    expect(refusals.filter((r: string) => r.includes('wall-clock substitution'))).toHaveLength(6);
    expect(joined).toMatch(/impossible ordering/);
    // Any one of the three alone would have stopped it.
    expect(joined).toContain('20260910161947');
    expect(joined).toContain('20260905055629');
  });

  it('still plans correctly against the clean baseline a fresh branch will have', () => {
    const res = run(baselineVersions.map((v) => ({ version: v, name: 'baseline' })));
    expect(res.ok).toBe(true);
    expect(res.refusals).toEqual([]);
    expect(res.plan).toHaveLength(stageA.length);
    const versions = res.plan.map((p: { version: string }) => p.version);
    expect(versions).toEqual([...versions].sort());
    expect(res.plan.map((p: { name: string }) => p.name)).not.toContain('phase03a_fda026_stage_b_cutover');
  });

  it('treats an exactly-applied canonical set as a satisfied no-op', () => {
    const res = run([
      ...baselineVersions.map((v) => ({ version: v, name: 'baseline' })),
      ...stageA.map((m: { file: string }) => ({ version: m.file.slice(0, 14), name: m.file.slice(15, -4) })),
    ]);
    expect(res.ok).toBe(true);
    expect(res.plan).toEqual([]);
  });

  it('refuses a candidate that would be inserted before an already-applied version', () => {
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const { ok, refusals } = planApply({
      dir,
      declared: [{ file: '20260905055629_flag_policies.sql', sha256: a, applyStage: 'A' }],
      ledger: [{ version: '20260906000000', name: 'something_later' }],
      knownLocalVersions: ['20260905055629', '20260906000000'],
    });
    expect(ok).toBe(false);
    expect(refusals.join()).toMatch(/impossible ordering/);
  });
});
