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
  onAbsent: string;
  deployed?: boolean;
  note?: string;
};
type Surface = { surface: string; callSites: CallSite[]; finding: string | null };
const surfaces: Surface[] = expectations.surfaces;
// The manifest defines its own vocabulary; the guard reads it rather than
// hardcoding a list that silently rejects a newly-needed classification.
const onAbsentVocabulary: Record<string, string> = expectations.onAbsentDefinitions;
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
        !Object.keys(onAbsentVocabulary).includes(c.onAbsent),
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

  it('FDA-019 — flag photo attachment is gated (not a legacy Storage fallback) when the upload-intent RPC is absent; avatar upload is unaffected', () => {
    // Rev 8 (Phase 04A FINAL repair, D-04A-2, 2026-09-21): rev 7 pinned the
    // legacy-fallback shape (graceful onAbsent, a WORKING claim resting on
    // that fallback). An independent review held the fallback itself unsafe
    // for a brand-new signed-in photo — no server-side hold protects the
    // object if the row insert after it never happens. uploadFlagPhoto now
    // gates attachment instead (FlagPhotoAttachmentUnavailableError). Avatar
    // upload (a separate call site, users.ts) is untouched and keeps its own
    // graceful legacy fallback.
    const flagPhoto = surfaces.find((s) => s.surface === 'photo-upload-flag')!;
    const avatar = surfaces.find((s) => s.surface === 'photo-upload-avatar')!;

    const prepare = flagPhoto.callSites.find(
      (c) => c.name === 'prepare_flag_photo_upload' && c.file === 'src/lib/flags.ts',
    )!;
    expect(prepare.onAbsent).toBe('fail_closed');
    expect(absentRpc).toContain('prepare_flag_photo_upload');

    const commit = flagPhoto.callSites.find(
      (c) => c.name === 'commit_flag_photo_upload' && c.file === 'src/lib/flags.ts',
    )!;
    expect(commit.onAbsent).toBe('unreachable');

    // The avatar surface's OWN legacy fallback must remain graceful/WORKING —
    // this finding is scoped to flag photos only.
    expect(flagPhoto.finding).toBe('FDA-019');
    expect(avatar.finding).toBeNull();
    const avatarPrepare = avatar.callSites.find((c) => c.name === 'prepare_flag_photo_upload')!;
    expect(avatarPrepare.onAbsent).toBe('graceful');
    expect(avatar.productionImpact).toMatch(/^WORKING/);

    // The flag-photo surface must NOT claim the legacy fallback is working —
    // it must truthfully describe gating instead, and must not claim the
    // (now unreachable) fallback provides orphan-cleanup protection for a
    // brand-new photo.
    expect(flagPhoto.productionImpact).not.toMatch(/legacy uid-folder path when the upload-intent/i);
    expect(flagPhoto.productionImpact).toMatch(/gated|refused/i);
    const finalNote = (flagPhoto as unknown as { phase04aFinalRepairNote?: string }).phase04aFinalRepairNote;
    expect(finalNote).toBeDefined();
    expect(finalNote).toMatch(/gated/i);
    expect(finalNote).not.toMatch(/orphan.cleanup (is )?guaranteed/i);

    const legacyInsert = flagPhoto.callSites.find(
      (c) => c.file === 'src/lib/photos.ts' && c.name === 'flag_photos',
    )!;
    expect(legacyInsert.line).toBe(82);
    expect(legacyInsert.note).toContain('20260904000200_adopt_d1sa_containment.sql:61-77');
    expect(legacyInsert.note).toMatch(/own flag-photos folder/);
    expect(legacyInsert.note).toMatch(/existing public\.users account/);
    expect(legacyInsert.note).toMatch(/ownership of the related flag/);
    expect(legacyInsert.note).not.toMatch(/WITH CHECK\s*\(?true\)?/i);
  });

  it('FDA-002 — D-04A-4 disables client deletion for every flag until an atomic backend contract exists', () => {
    const del = surfaces.find((s) => s.surface === 'flag-delete')!;
    expect(absentEdge).toContain('delete-flag');
    expect(del.callSites).toEqual([]);
    expect(del.finding).toBe('FDA-002');
    expect(del.productionImpact).toMatch(/temporarily unavailable for every flag/i);
    expect(del.deployedAlternative).toMatch(/does not call it/i);
    const note = (del as unknown as { phase04FinalRepairNote: string }).phase04FinalRepairNote;
    expect(note).toMatch(/FlagDeletionUnavailableError/);
    expect(note).toMatch(/no photo appears between check and row deletion/i);
    expect(note).toMatch(/future atomic\/server deletion contract is deferred/i);
    expect(note).toMatch(/No live backend deployment occurred/i);
    expect((del as unknown as { phase04aFinalRepairNote: string }).phase04aFinalRepairNote).toMatch(/SUPERSEDED by D-04A-4/);
  });

  it('FDA-003 — deletion status polls an absent route while delete-account v4 is live', () => {
    const acct = surfaces.find((s) => s.surface === 'account-deletion')!;
    expect(absentEdge).toContain('account-deletion-status');
    expect(deployed.edgeFunctions.deployed.map((f: { slug: string }) => f.slug)).toContain(
      'delete-account',
    );
    expect(acct.callSites.find((c) => c.name === 'account-deletion-status')!.onAbsent).toBe('unreachable');
    expect(acct.finding).toBe('FDA-003');
  });

  it('FDA-004 — the candidate queue fails closed before touching absent columns', () => {
    const mod = surfaces.find((s) => s.surface === 'moderation-queue')!;
    expect(Object.keys(deployed.columns.absent)).toEqual(
      expect.arrayContaining([
        'feedback.moderation_reviewed_at',
        'feedback.moderation_resolution',
        'feedback.moderation_action_intent',
      ]),
    );
    expect(mod.callSites.map((site) => site.kind)).toEqual(['rpc', 'rpc']);
    expect(mod.callSites[0]).toMatchObject({
      name: 'list_open_moderation_reports',
      onAbsent: 'fail_closed',
      deployed: false,
    });
    expect(mod.callSites[1]).toMatchObject({
      name: 'moderate_report',
      onAbsent: 'unreachable',
      deployed: false,
    });
    expect(mod.finding).toBe('FDA-004');
  });
});

describe('PHASE-02A — no undeclared dependency on an absent contract', () => {
  // Rev 2. Rev 1 compared NAME SETS, so a second call site for an
  // already-declared name passed unnoticed, two file attributions were wrong
  // and nothing checked the moderation COLUMN writes at all. Independent
  // review found all of that while this suite was green. It now keys on
  // file:line, which is what makes a green run mean something.
  type Site = { file: string; line?: number; name: string; kind: string; onAbsent: string };
  const declaredSites: Site[] = allCalls as Site[];
  const key = (file: string, line: number) => `${file}:${line}`;
  const declaredByPosition = new Set(
    declaredSites.filter((c) => c.line !== undefined).map((c) => key(c.file, c.line!)),
  );

  const sourceFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== '__mocks__') walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        sourceFiles.push(full);
      }
    }
  };
  walk(path.join(ROOT, 'src'));

  type Found = { file: string; line: number; name: string; kind: 'rpc' | 'edge' };
  const found: Found[] = [];
  for (const full of sourceFiles) {
    const rel = path.relative(ROOT, full);
    fs.readFileSync(full, 'utf8')
      .split('\n')
      .forEach((text, i) => {
        // A doc comment naming an RPC is prose, not a call site.
        if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
        for (const m of text.matchAll(/\.rpc\(\s*['"]([A-Za-z0-9_]+)['"]/g)) {
          found.push({ file: rel, line: i + 1, name: m[1], kind: 'rpc' });
        }
        for (const m of text.matchAll(/functions\.invoke\(\s*['"]([A-Za-z0-9_-]+)['"]/g)) {
          found.push({ file: rel, line: i + 1, name: m[1], kind: 'edge' });
        }
      });
  }

  it('every RPC and Edge call site is declared at its exact file and line', () => {
    const undeclared = found
      .filter((f) => !declaredByPosition.has(key(f.file, f.line)))
      .map((f) => `${f.file}:${f.line} ${f.name}`);
    expect(`undeclared call sites: ${undeclared.join(', ') || 'none'}`).toBe(
      'undeclared call sites: none',
    );
  });

  it('no declared call site points at a file or line that does not hold it', () => {
    const stale = declaredSites
      .filter((c) => (c.kind === 'rpc' || c.kind === 'edge') && c.line !== undefined)
      .filter((c) => {
        const full = path.join(ROOT, c.file);
        if (!fs.existsSync(full)) return true;
        const line = fs.readFileSync(full, 'utf8').split('\n')[c.line! - 1] ?? '';
        return !line.includes(c.name);
      })
      .map((c) => `${c.file}:${c.line} ${c.name}`);
    expect(`misattributed declarations: ${stale.join(', ') || 'none'}`).toBe(
      'misattributed declarations: none',
    );
  });

  it('every touch of an absent column is declared, read AND write', () => {
    const absentColumns = Object.keys(deployed.columns.absent).map((c) => c.split('.')[1]);
    const declaredColumnSites = new Set(
      declaredSites
        .filter((c) => c.kind === 'columns' && c.line !== undefined)
        .map((c) => key(c.file, c.line!)),
    );
    // Only PostgREST query expressions count. A TypeScript type member that
    // names the same column is a declaration, not a touch — rev 2's first
    // attempt flagged those and had to be tightened.
    const OP = /\.(select|update|insert|upsert)\(/;
    const undeclared: string[] = [];
    for (const full of sourceFiles) {
      const rel = path.relative(ROOT, full);
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      lines.forEach((text, i) => {
        if (!OP.test(text)) return;
        // The operation's arguments may span lines; scan to the end of the call.
        const window = lines.slice(i, i + 10).join('\n');
        const args = window.slice(window.indexOf('('));
        const upTo = args.indexOf(');') === -1 ? args : args.slice(0, args.indexOf(');'));
        if (!absentColumns.some((col) => upTo.includes(col))) return;
        if (!declaredColumnSites.has(key(rel, i + 1))) undeclared.push(`${rel}:${i + 1}`);
      });
    }
    expect(`undeclared absent-column touches: ${undeclared.join(', ') || 'none'}`).toBe(
      'undeclared absent-column touches: none',
    );
  });

  it('every call reaching an absent contract states a failure mode', () => {
    const absent = new Set<string>([
      ...deployed.rpc.absentAtAnySignature,
      ...deployed.edgeFunctions.absent,
    ]);
    for (const f of found.filter((f) => absent.has(f.name))) {
      const site = declaredSites.find((c) => c.line === f.line && c.file === f.file);
      expect(
        `${f.file}:${f.line} declares a failure mode: ${site !== undefined && site.onAbsent !== 'n/a'}`,
      ).toBe(`${f.file}:${f.line} declares a failure mode: true`);
    }
  });

  it('the graceful-degradation reference case stays graceful', () => {
    const leaderboard = declaredSites.find((c) => c.name === 'list_monthly_leaderboard')!;
    expect(leaderboard.onAbsent).toBe('graceful');
    expect(deployed.rpc.absentAtAnySignature).toContain('list_monthly_leaderboard');
  });
});
