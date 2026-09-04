/**
 * PHASE-02A — the client's backend expectations are declared, and every one of
 * them is classified against what production actually deploys.
 *
 * ─── WHY ──────────────────────────────────────────────────────────────────
 * Build 33 shipped four calls to contracts that do not exist in production
 * (FDA-002/003/004/019). Nothing in this repository could have caught that: the
 * unit tests mock Supabase, so a call to an absent RPC passes every suite and
 * then throws in a reviewer's hands. A mocked test never proves a deployed
 * contract.
 *
 * This suite does not contact production either — it cannot, and pretending
 * otherwise is exactly the failure mode above. What it does is make the gap
 * VISIBLE and STABLE: production truth is captured read-only into
 * deployed-contract.v1.json, the client's demands are declared in
 * client-expectations.v1.json, and the two are compared here. A new call to an
 * undeployed contract fails this suite rather than reaching a build.
 *
 * The live half of the gate — re-capturing the catalog before a release —
 * belongs to Phase 06A. This is its foundation, not its replacement.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const CONTRACT = path.join(ROOT, 'supabase', 'contract');
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(CONTRACT, name), 'utf8'));

const deployed = read('deployed-contract.v1.json');
const expectations = read('client-expectations.v1.json');

type CallSite = {
  file: string;
  line?: number;
  kind: 'rpc' | 'edge' | 'columns' | 'table';
  name: string;
  onAbsent: 'hard' | 'graceful' | 'swallowed' | 'n/a';
  deployed?: boolean;
};
type Surface = { surface: string; callSites: CallSite[]; finding: string | null };
const surfaces: Surface[] = expectations.surfaces;
const allCalls = surfaces.flatMap((s) => s.callSites.map((c) => ({ ...c, surface: s.surface })));

describe('PHASE-02A — manifest shape', () => {
  it('both manifests are versioned and name the same project lineage', () => {
    expect(deployed.manifestVersion).toBe(1);
    expect(expectations.manifestVersion).toBe(1);
    expect(deployed.project.ref).toBe('kldlwszpfkdmsjrjhjym');
    expect(expectations.sourceLineage.build33).toBe('f5594171e75bc5ec92a87d0392c361601ddedfba');
  });

  it('the capture records a fingerprint and an object count', () => {
    expect(deployed.catalogFingerprint.value).toMatch(/^[0-9a-f]{32}$/);
    expect(deployed.catalogFingerprint.objectCount).toBeGreaterThan(0);
  });

  it('every declared call site is fully classified', () => {
    const bad = allCalls.filter(
      (c) =>
        !c.file ||
        !c.name ||
        !['rpc', 'edge', 'columns', 'table'].includes(c.kind) ||
        !['hard', 'graceful', 'swallowed', 'n/a'].includes(c.onAbsent),
    );
    expect(`unclassified call sites: ${bad.map((c) => c.name).join(', ') || 'none'}`).toBe(
      'unclassified call sites: none',
    );
  });

  it('the ledger head matches the crosswalk', () => {
    const crosswalk = read('migration-crosswalk.v1.json');
    expect(deployed.migrationLedger.head.version).toBe(crosswalk.rules.ledgerHead);
    expect(deployed.migrationLedger.appliedCount).toBe(crosswalk.summary.appliedInLedger);
  });
});

describe('PHASE-02A — the four shipped mismatches reproduce from the manifests', () => {
  const absentRpc: string[] = deployed.rpc.absentAtAnySignature;
  const absentEdge: string[] = deployed.edgeFunctions.absent;

  it('FDA-019 — signed-in photo upload calls RPCs production does not have', () => {
    const photo = surfaces.find((s) => s.surface === 'photo-upload')!;
    const broken = photo.callSites.filter((c) => c.kind === 'rpc' && absentRpc.includes(c.name));
    expect(broken.length).toBeGreaterThan(0);
    expect(broken.some((c) => c.onAbsent === 'hard')).toBe(true);
    expect(photo.finding).toBe('FDA-019');
  });

  it('FDA-002 — flag deletion invokes an Edge Function that is not deployed', () => {
    const del = surfaces.find((s) => s.surface === 'flag-delete')!;
    expect(absentEdge).toContain('delete-flag');
    expect(del.callSites.every((c) => c.onAbsent === 'hard')).toBe(true);
    expect(del.finding).toBe('FDA-002');
  });

  it('FDA-003 — deletion status polls an absent route while delete-account v4 is live', () => {
    const acct = surfaces.find((s) => s.surface === 'account-deletion')!;
    expect(absentEdge).toContain('account-deletion-status');
    expect(deployed.edgeFunctions.deployed.map((f: { slug: string }) => f.slug)).toContain(
      'delete-account',
    );
    expect(acct.callSites.find((c) => c.name === 'account-deletion-status')!.onAbsent).toBe('hard');
    expect(acct.finding).toBe('FDA-003');
  });

  it('FDA-004 — the moderation queue selects columns feedback does not have', () => {
    const mod = surfaces.find((s) => s.surface === 'moderation-queue')!;
    expect(Object.keys(deployed.columns.absent)).toEqual(
      expect.arrayContaining([
        'feedback.moderation_reviewed_at',
        'feedback.moderation_resolution',
        'feedback.moderation_action_intent',
      ]),
    );
    expect(mod.callSites[0].onAbsent).toBe('hard');
    expect(mod.finding).toBe('FDA-004');
  });
});

describe('PHASE-02A — no undeclared dependency on an absent contract', () => {
  const declared = new Set(allCalls.map((c) => c.name));

  const sourceFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        sourceFiles.push(full);
      }
    }
  };
  walk(path.join(ROOT, 'src'));

  const found = { rpc: new Set<string>(), edge: new Set<string>() };
  for (const file of sourceFiles) {
    const body = fs.readFileSync(file, 'utf8');
    for (const m of body.matchAll(/\.rpc\(\s*['"]([A-Za-z0-9_]+)['"]/g)) found.rpc.add(m[1]);
    for (const m of body.matchAll(/functions\.invoke\(\s*['"]([A-Za-z0-9_-]+)['"]/g))
      found.edge.add(m[1]);
  }

  it('every RPC the client calls is declared in the manifest', () => {
    const undeclared = [...found.rpc].filter((n) => !declared.has(n));
    expect(`undeclared RPC calls: ${undeclared.join(', ') || 'none'}`).toBe(
      'undeclared RPC calls: none',
    );
  });

  it('every Edge Function the client invokes is declared in the manifest', () => {
    const undeclared = [...found.edge].filter((n) => !declared.has(n));
    expect(`undeclared Edge invocations: ${undeclared.join(', ') || 'none'}`).toBe(
      'undeclared Edge invocations: none',
    );
  });

  it('an absent contract is only reachable through a declared, classified call', () => {
    // The gate that would have caught Build 33: a call to something production
    // does not deploy must be recorded, with its failure mode stated.
    const absent = new Set<string>([
      ...deployed.rpc.absentAtAnySignature,
      ...deployed.edgeFunctions.absent,
    ]);
    const reached = [...found.rpc, ...found.edge].filter((n) => absent.has(n));
    const unrecorded = reached.filter((n) => !declared.has(n));
    expect(
      `absent contracts called without a manifest entry: ${unrecorded.join(', ') || 'none'}`,
    ).toBe('absent contracts called without a manifest entry: none');

    // And every one that IS recorded must say what happens when it is missing.
    for (const name of reached) {
      const site = allCalls.find((c) => c.name === name)!;
      expect(`${name} declares a failure mode: ${site.onAbsent !== 'n/a'}`).toBe(
        `${name} declares a failure mode: true`,
      );
    }
  });

  it('the graceful-degradation reference case stays graceful', () => {
    // list_monthly_leaderboard is absent in production BY DESIGN and degrades
    // to an empty state. It is the pattern FDA-004 should copy, so it must not
    // quietly become a hard failure.
    const leaderboard = allCalls.find((c) => c.name === 'list_monthly_leaderboard')!;
    expect(leaderboard.onAbsent).toBe('graceful');
    expect(deployed.rpc.absentAtAnySignature).toContain('list_monthly_leaderboard');
  });
});
