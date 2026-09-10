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
    });
    expect(ok).toBe(true);
    expect(plan).toEqual([]);
  });

  it('refuses when the ledger holds that version under a different name', () => {
    const a = write('20260905055629_flag_policies.sql', '-- a');
    const { refusals } = planApply({
      dir,
      declared: [{ file: '20260905055629_flag_policies.sql', sha256: a, applyStage: 'A' }],
      ledger: [{ version: '20260905055629', name: 'something_else' }],
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

  it('refuses to backdate a restoration before the migration it undoes', () => {
    expect(() => forwardRestorationName(
      '20260905055633_phase03a_contextual_profiles.sql', new Date(Date.UTC(2026, 7, 1))))
      .toThrow(/Refusing to backdate history/);
  });
});

describe('the one supported apply command', () => {
  it('always names the target explicitly and defaults to a dry run', () => {
    expect(supportedApplyCommand({ projectRef: 'ctshxbykuemeqnofqcdh' }))
      .toBe('supabase db push --linked --project-ref ctshxbykuemeqnofqcdh --dry-run');
    expect(supportedApplyCommand({ projectRef: 'ctshxbykuemeqnofqcdh', dryRun: false }))
      .toBe('supabase db push --linked --project-ref ctshxbykuemeqnofqcdh');
  });

  it('refuses to build a command with no explicit target', () => {
    expect(() => supportedApplyCommand({})).toThrow(/target must always be named explicitly/);
  });

  it('records both prohibited mechanisms with what was observed', () => {
    expect(PROHIBITED_MECHANISMS).toHaveLength(2);
    expect(PROHIBITED_MECHANISMS.every((m: { verdict: string }) => m.verdict === 'PROHIBITED for production')).toBe(true);
    expect(JSON.stringify(PROHIBITED_MECHANISMS)).toMatch(/20260910161947/);
  });
});
