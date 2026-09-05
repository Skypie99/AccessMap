/** PHASE-02B rev2 cheap invariants for the expensive database proofs. */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SUPABASE = path.join(ROOT, 'supabase');
const NEXT = path.join(SUPABASE, 'migrations-next');
const crosswalk = JSON.parse(
  fs.readFileSync(path.join(SUPABASE, 'contract', 'migration-crosswalk.v1.json'), 'utf8'),
) as { rules: { ledgerHead: string }; summary: Record<string, number> };

describe('PHASE-02B rev2 — managed lineage and forward candidates', () => {
  const candidates = fs.readdirSync(NEXT).filter((name) => /^\d{14}_.*\.sql$/.test(name)).sort();

  it('preserves exactly the 71 applied migration sources', () => {
    expect(crosswalk.summary.appliedInLedger).toBe(71);
    expect(crosswalk.summary.repoManagedFiles).toBe(71);
    expect(crosswalk.summary.unappliedBackdated).toBe(0);
    expect(crosswalk.summary.unappliedForward).toBe(0);
  });

  it('keeps the same five unapplied candidates strictly after ledger head', () => {
    expect(candidates).toHaveLength(5);
    expect(candidates.every((name) => name.slice(0, 14) > crosswalk.rules.ledgerHead)).toBe(true);
    expect(candidates.every((name) =>
      /NOT AUTHORIZED FOR APPLY/i.test(fs.readFileSync(path.join(NEXT, name), 'utf8')),
    )).toBe(true);
    const managed = new Set(fs.readdirSync(path.join(SUPABASE, 'migrations')));
    expect(candidates.filter((name) => managed.has(name))).toEqual([]);
  });

  it('gives every candidate a declared, executable-or-refusing rollback contract', () => {
    const rollbackDir = path.join(NEXT, 'rollback');
    const contract = JSON.parse(fs.readFileSync(path.join(rollbackDir, 'rollback-contract.v1.json'), 'utf8'));
    expect(contract.entries.map((entry: { candidate: string }) => entry.candidate)).toEqual(candidates);
    for (const candidate of candidates) {
      expect(fs.existsSync(path.join(rollbackDir, candidate.replace(/\.sql$/, '.rollback.sql')))).toBe(true);
    }
    for (const entry of contract.entries) {
      expect(entry.expectedForwardChangedSections.length).toBeGreaterThan(0);
      expect(entry.expectedForwardCatalogSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(contract.entries.filter((entry: { mode: string }) =>
      entry.mode === 'NON_REVERSIBLE_SECURITY_REPAIR')).toHaveLength(1);
  });

  it('keeps relocated MOD1 proposals outside managed migrations', () => {
    const proposed = fs.readdirSync(path.join(SUPABASE, 'nonmanaged', 'proposed'));
    for (const version of ['20260828040000', '20260828050000', '20260828060000', '20260828070000', '20260828080000']) {
      expect(proposed.some((name) => name.startsWith(version))).toBe(true);
    }
  });
});

describe('PHASE-02B rev2 — comparator coverage', () => {
  const comparator = fs.readFileSync(path.join(SUPABASE, 'replay', 'compare.sql'), 'utf8');

  it.each([
    'roles', 'schemas', 'tables', 'columns', 'policies', 'triggers',
    'functions', 'functionGrants', 'tableGrants', 'migrationHistory',
  ])('emits the %s catalog section', (section) => {
    expect(comparator).toContain(`'${section}'`);
  });

  it('covers policy roles/commands/full expressions and hashed complete trigger definitions', () => {
    expect(comparator).toContain('polroles');
    expect(comparator).toContain('polcmd');
    expect(comparator).toContain('pg_get_expr');
    expect(comparator).toContain('pg_get_triggerdef');
    expect(comparator).toContain('definition_md5');
  });

  it('covers full function bodies, security mode, config, and effective ACLs', () => {
    expect(comparator).toContain('pg_get_functiondef');
    expect(comparator).toContain('prosecdef');
    expect(comparator).toContain('proconfig');
    expect(comparator).toContain('aclexplode');
  });
});

describe('PHASE-02B rev2 — generated snapshot provenance', () => {
  const snapshot = fs.readFileSync(path.join(SUPABASE, 'schema.generated.sql'), 'utf8');
  const stamp = JSON.parse(fs.readFileSync(path.join(SUPABASE, 'schema.generated.stamp.json'), 'utf8'));

  it('marks the dump as a generated reference, never production truth', () => {
    expect(snapshot.startsWith('-- GENERATED FILE — DO NOT EDIT BY HAND.')).toBe(true);
    expect(snapshot).toMatch(/REFERENCE SNAPSHOT/);
    expect(snapshot).not.toMatch(/source of truth/i);
  });

  it('pins ordered sources, candidates, rollbacks, bootstrap, comparator, and generator', () => {
    expect(stamp.stampVersion).toBe(2);
    const inputs = stamp.inputs.map((entry: { path: string }) => entry.path);
    expect(inputs).toContain('scripts/replay-migrations.mjs');
    expect(inputs).toContain('supabase/replay/compare.sql');
    expect(inputs).toContain('supabase/migrations-next/rollback/rollback-contract.v1.json');
    expect(inputs.filter((name: string) => name.startsWith('supabase/migrations/'))).toHaveLength(71);
    expect(inputs.filter((name: string) => /^supabase\/migrations-next\/\d/.test(name))).toHaveLength(5);
    expect(inputs.filter((name: string) => name.endsWith('.rollback.sql'))).toHaveLength(5);
  });

  it('guards the managed migration inventory and rehearses every claimed tamper class', () => {
    const checker = fs.readFileSync(path.join(ROOT, 'scripts', 'check-schema-snapshot.mjs'), 'utf8');
    const rehearsal = fs.readFileSync(path.join(ROOT, 'scripts', 'rehearse-schema-snapshot-guard.mjs'), 'utf8');
    expect(checker).toContain('managedMigrationPaths');
    for (const name of [
      'lineage-content', 'candidate-content', 'bootstrap-content', 'comparator-content',
      'snapshot-hand-edit', 'managed-migration-added', 'managed-migration-deleted',
      'crosswalk-order', 'managed-source-moved',
    ]) expect(rehearsal).toContain(name);
  });

  it('keeps schema.sql explicit about its commentary-only status', () => {
    const hand = fs.readFileSync(path.join(SUPABASE, 'schema.sql'), 'utf8');
    expect(hand).toContain('REFERENCE ONLY — NOT THE GENERATED SNAPSHOT');
    expect(hand).toContain('NEVER run this file');
    expect(hand).toContain('not proof of current production state');
  });
});

describe('PHASE-02B rev2 — replay safety', () => {
  const harness = fs.readFileSync(path.join(ROOT, 'scripts', 'replay-migrations.mjs'), 'utf8');

  it('uses a socket-only temp cluster and an environment allowlist', () => {
    expect(harness).toContain("listen_addresses = ''");
    expect(harness).toContain('mkdtempSync');
    expect(harness).toContain('const PG_ENV = {');
    expect(harness).not.toContain('{ ...process.env');
    expect(harness).toContain("'-X'");
  });

  it('accepts no production address, key, or project reference', () => {
    expect(harness).not.toMatch(/SUPABASE_URL|SUPABASE_ANON_KEY|SERVICE_ROLE|kldlwszpfkdmsjrjhjym/);
  });

  it('can compare both applied-only and with-next catalogs to the saved production capture', () => {
    expect(harness).toContain("const compareWithProduction = !LOCAL_ONLY && (WITH_NEXT || Boolean(COMPARISON_OUT));");
    expect(harness).toContain('sectionDeltas');
    expect(harness).toContain('captureValid');
    expect(harness).toContain('projectBindingValid');
    expect(harness).toContain('replayAbsent');
  });

  it('gives the replay CI job enough history to validate capture ancestry', () => {
    const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
    const replayJob = workflow.slice(workflow.indexOf('migration-replay:'), workflow.indexOf('perf-budget:'));
    expect(replayJob).toMatch(/actions\/checkout@v4[\s\S]*?fetch-depth:\s*0/);
  });

  it('never writes PostgreSQL sharedir and records the one temp-only adaptation', () => {
    expect(harness).toContain('globalPgNetState');
    expect(harness).not.toMatch(/copyFileSync\([^\n]*sharedir|writeFileSync\([^\n]*sharedir/i);
    expect(harness).toContain('temp-only no-op');
    expect(fs.existsSync(path.join(SUPABASE, 'replay', 'stub-extensions'))).toBe(false);
  });

  it('refuses any applied source outside the managed migration directory', () => {
    expect(harness).toContain('REFUSED non-managed applied path');
    expect(harness).toContain('nonmanagedDestructiveArtifactExecuted: false');
  });
});

describe('PHASE-02B rev2 — SQL proof ownership', () => {
  it('classifies every SQL artifact explicitly', () => {
    const files = [
      'd1f4r3_fix2_flags_delete_rls.test.sql',
      'd1f4r3_fix3_review_audit.test.sql',
      'promptb_media_key_guards.test.sql',
      'mod1r_fix1/00_baseline.sql',
      'mod1r_fix1/10_proof.sql',
    ];
    for (const file of files) {
      expect(fs.readFileSync(path.join(SUPABASE, 'tests', file), 'utf8')).toMatch(/PGTAP_KIND:/);
    }
  });

  it('points every MOD1R include at an existing, correctly owned file', () => {
    const fixture = fs.readFileSync(path.join(SUPABASE, 'tests', 'mod1r_fix1', '00_baseline.sql'), 'utf8');
    const includes = [...fixture.matchAll(/^\\i\s+(.+)$/gm)].map((match) => match[1]);
    expect(includes).toHaveLength(6);
    expect(includes.slice(1).every((name) => name.startsWith('supabase/nonmanaged/proposed/'))).toBe(true);
    expect(includes.every((name) => fs.existsSync(path.join(ROOT, name)))).toBe(true);
  });
});
