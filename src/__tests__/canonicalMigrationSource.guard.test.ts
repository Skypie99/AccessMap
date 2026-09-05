/**
 * PHASE-02B — the canonical migration source stays reproducible.
 *
 * The disposable replay (scripts/replay-migrations.mjs) is the real proof, but
 * it needs a Postgres and takes ~30s. These are the cheap invariants that must
 * hold on every commit so the expensive proof stays meaningful.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SUPABASE = path.join(ROOT, 'supabase');
const NEXT = path.join(SUPABASE, 'migrations-next');
const crosswalk = JSON.parse(
  fs.readFileSync(path.join(SUPABASE, 'contract', 'migration-crosswalk.v1.json'), 'utf8'),
) as { rules: { ledgerHead: string }; summary: Record<string, number> };
const expected = JSON.parse(
  fs.readFileSync(path.join(SUPABASE, 'contract', 'expected-catalog.v1.json'), 'utf8'),
);

describe('PHASE-02B — managed lineage holds only what production applied', () => {
  it('every file in supabase/migrations is an applied version', () => {
    expect(crosswalk.summary.repoManagedFiles).toBe(crosswalk.summary.appliedInLedger);
    expect(crosswalk.summary.unappliedBackdated).toBe(0);
    expect(crosswalk.summary.unappliedForward).toBe(0);
  });

  it('unapplied work lives in nonmanaged/proposed, not the managed lineage', () => {
    const proposed = fs.readdirSync(path.join(SUPABASE, 'nonmanaged', 'proposed'));
    for (const slug of [
      'mod1_moderation_release_safety',
      'mod1_admin_report_queue',
      'mod1r_fix2_action_intent',
    ]) {
      expect(`${slug} is proposed: ${proposed.some((n) => n.includes(slug))}`).toBe(
        `${slug} is proposed: true`,
      );
    }
    const managed = fs.readdirSync(path.join(SUPABASE, 'migrations'));
    expect(managed.filter((n) => n.includes('mod1'))).toEqual([]);
  });
});

describe('PHASE-02B — forward-only candidates', () => {
  const candidates = fs
    .readdirSync(NEXT)
    .filter((n) => /^\d{14}_.*\.sql$/.test(n))
    .sort();

  it('every candidate is strictly after the ledger head', () => {
    const head = crosswalk.rules.ledgerHead;
    const violations = candidates.filter((n) => n.slice(0, 14) <= head);
    expect(`candidates at or before ${head}: ${violations.join(', ') || 'none'}`).toBe(
      `candidates at or before ${head}: none`,
    );
  });

  it('every candidate has a rollback', () => {
    const rollbacks = fs.readdirSync(path.join(NEXT, 'rollback'));
    const missing = candidates.filter(
      (n) => !rollbacks.includes(n.replace(/\.sql$/, '.rollback.sql')),
    );
    expect(`candidates without a rollback: ${missing.join(', ') || 'none'}`).toBe(
      'candidates without a rollback: none',
    );
  });

  it('every candidate states it is not authorized for apply', () => {
    const silent = candidates.filter(
      (n) => !/NOT AUTHORIZED FOR APPLY/i.test(fs.readFileSync(path.join(NEXT, n), 'utf8')),
    );
    expect(`candidates missing the no-apply banner: ${silent.join(', ') || 'none'}`).toBe(
      'candidates missing the no-apply banner: none',
    );
  });

  it('no candidate has been moved into the applied lineage', () => {
    const managed = fs.readdirSync(path.join(SUPABASE, 'migrations'));
    const leaked = candidates.filter((n) => managed.includes(n));
    expect(`candidates leaked into supabase/migrations: ${leaked.join(', ') || 'none'}`).toBe(
      'candidates leaked into supabase/migrations: none',
    );
  });
});

describe('PHASE-02B — replay targets', () => {
  it('the expected catalog records both replay modes and production', () => {
    expect(expected.withForwardCandidates.matchesProduction).toBe(true);
    expect(expected.appliedLineageOnly.matchesProduction).toBe(false);
    // The whole point: lineage + candidates == production, byte for byte.
    expect(expected.withForwardCandidates.policyPredicateMd5).toBe(
      expected.production.policyPredicateMd5,
    );
    expect(expected.withForwardCandidates.triggerMd5).toBe(expected.production.triggerMd5);
  });

  it('the only accepted residual delta is the out-of-band backup tables', () => {
    expect(expected.acceptedResidualDeltas).toHaveLength(1);
    expect(expected.acceptedResidualDeltas[0].objects).toHaveLength(7);
    expect(
      expected.acceptedResidualDeltas[0].objects.every((o: string) =>
        o.startsWith('bk_2026_08_22_'),
      ),
    ).toBe(true);
  });

  it('environment caveats are stated, not elided', () => {
    const text = expected.environmentCaveats.join(' ');
    expect(text).toMatch(/pg_net/);
    expect(text).toMatch(/stub/i);
    expect(text).toMatch(/17\.11.*17\.6|17\.6.*17\.11/);
  });
});

describe('PHASE-02B — generated snapshot', () => {
  it('schema.generated.sql exists, is stamped, and is marked generated', () => {
    const snap = fs.readFileSync(path.join(SUPABASE, 'schema.generated.sql'), 'utf8');
    expect(snap.startsWith('-- GENERATED FILE — DO NOT EDIT BY HAND.')).toBe(true);
    expect(fs.existsSync(path.join(SUPABASE, 'schema.generated.stamp.json'))).toBe(true);
  });

  it('the hand-written schema.sql says it is not the snapshot', () => {
    const hand = fs.readFileSync(path.join(SUPABASE, 'schema.sql'), 'utf8');
    expect(hand).toContain('REFERENCE ONLY — NOT THE GENERATED SNAPSHOT');
    expect(hand).toContain('supabase/schema.generated.sql');
  });
});

describe('PHASE-02B — the replay harness cannot reach production', () => {
  const harness = fs.readFileSync(path.join(ROOT, 'scripts', 'replay-migrations.mjs'), 'utf8');

  it('refuses to execute anything under nonmanaged/', () => {
    expect(harness).toContain('nonmanaged');
    expect(harness).toMatch(/REFUSED/);
  });

  it('disables TCP and uses a throwaway directory', () => {
    expect(harness).toContain("listen_addresses = ''");
    expect(harness).toContain('mkdtempSync');
  });

  it('reads no Supabase credential, URL or project ref', () => {
    expect(harness).not.toMatch(/SUPABASE_URL|SUPABASE_ANON_KEY|SERVICE_ROLE|kldlwszpfkdmsjrjhjym/);
  });
});
