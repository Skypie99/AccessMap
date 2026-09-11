/**
 * STAGE-MF-02 — the capture harness must retain content before hashing, must not
 * report pure reordering as a difference, and must never hide a real one.
 *
 * The ACL-ordering case is the acceptor's leading hypothesis for the hosted
 * 09c42928 vs c70e119a divergence: `REVOKE ALL` followed by re-`GRANT` reorders
 * aclitem entries without changing who can do what. If that is the cause, a
 * set-based comparison neutralises it. This test pins that behaviour, and the
 * test below it pins that a genuine grant change is still reported.
 */
import { execFileSync } from 'node:child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const MOD = './scripts/structural-catalog.mjs';

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
const constant = (name: string) =>
  JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
    `import * as m from '${MOD}'; console.log(JSON.stringify(m.${name}));`],
  { cwd: root, encoding: 'utf8' }));

const catalogOf = (obj: unknown) => ({ catalog: call('normalizeCatalog', obj), checksum: call('checksum', call('normalizeCatalog', obj)) });

describe('ACL normalization neutralises reordering, not substance', () => {
  it('treats a reordered aclitem array as identical', () => {
    const a = call('normalizeAcl', '{postgres=arwd/postgres,anon=r/postgres}');
    const b = call('normalizeAcl', '{anon=r/postgres,postgres=arwd/postgres}');
    expect(a).toEqual(b);
  });

  it('still reports a genuinely different grant', () => {
    const a = call('normalizeAcl', '{anon=r/postgres}');
    const b = call('normalizeAcl', '{anon=rw/postgres}');
    expect(a).not.toEqual(b);
  });

  it('handles an empty ACL', () => {
    expect(call('normalizeAcl', '')).toEqual([]);
    expect(call('normalizeAcl', '{}')).toEqual([]);
  });

  // Regression. An independent reviewer was asked to construct a case where two
  // genuinely different privilege states normalize to one checksum, and found this:
  // NULL acl and '{}' both became []. For a FUNCTION that is the difference between
  // "EXECUTE to PUBLIC" and "nobody", so a proacl moving '{}' -> NULL silently
  // re-granted PUBLIC EXECUTE and diffCaptures() called the captures identical.
  it('never collides a NULL ACL with an explicitly empty one', () => {
    const nul = call('normalizeAcl', null);
    const empty = call('normalizeAcl', '{}');
    expect(nul).not.toEqual(empty);
    expect(nul).toEqual([constant('ACL_DEFAULT_SENTINEL')]);
  });

  it('reports a proacl going {} -> NULL as a security-relevant residual', () => {
    const restrictive = catalogOf({ functions: [{ n: 'admin_fn', acl: '{}' }] });
    const permissive = catalogOf({ functions: [{ n: 'admin_fn', acl: null }] });
    expect(restrictive.checksum).not.toBe(permissive.checksum);
    const d = call('diffCaptures', restrictive, permissive);
    expect(d.identical).toBe(false);
    expect(d.securityRelevantSections).toContain('functions');
  });

  it('does not coalesce a NULL acl away in the capture query', () => {
    const sql = constant('CATALOG_SQL');
    for (const acl of ['nspacl', 'relacl', 'attacl', 'proacl', 'defaclacl']) {
      expect(sql).not.toContain(`coalesce(${acl}`);
    }
  });
});

describe('checksum is stable under reordering and sensitive to substance', () => {
  it('gives one checksum to two orderings of the same catalog', () => {
    const one = catalogOf({ policies: [{ p: 'a' }, { p: 'b' }], relations: [{ n: 'users', acl: '{x=r/o,y=w/o}' }] });
    const two = catalogOf({ relations: [{ n: 'users', acl: '{y=w/o,x=r/o}' }], policies: [{ p: 'b' }, { p: 'a' }] });
    expect(one.checksum).toBe(two.checksum);
  });

  it('changes the checksum when a policy actually changes', () => {
    const one = catalogOf({ policies: [{ p: 'a', qual: 'true' }] });
    const two = catalogOf({ policies: [{ p: 'a', qual: 'auth.uid() = id' }] });
    expect(one.checksum).not.toBe(two.checksum);
  });
});

describe('diffCaptures reports every residual and never suppresses one', () => {
  it('reports identical captures as identical', () => {
    const a = catalogOf({ policies: [{ p: 'a' }] });
    const b = catalogOf({ policies: [{ p: 'a' }] });
    expect(call('diffCaptures', a, b)).toMatchObject({ identical: true, residualCount: 0 });
  });

  it('names a dropped policy as a security-relevant residual', () => {
    const first = catalogOf({ policies: [{ p: 'users readable by authenticated' }, { p: 'own row' }] });
    const second = catalogOf({ policies: [{ p: 'own row' }] });
    const d = call('diffCaptures', first, second);
    expect(d.identical).toBe(false);
    expect(d.residualCount).toBe(1);
    expect(d.residuals[0]).toMatchObject({ section: 'policies', side: 'only-in-first' });
    expect(d.securityRelevantSections).toContain('policies');
  });

  it('names an added column grant as a residual too', () => {
    const first = catalogOf({ columns: [{ c: 'points', acl: '{authenticated=r/o}' }] });
    const second = catalogOf({ columns: [{ c: 'points', acl: '{authenticated=r/o}' }, { c: 'is_admin', acl: '{authenticated=r/o}' }] });
    const d = call('diffCaptures', first, second);
    expect(d.residualCount).toBe(1);
    expect(d.residuals[0].side).toBe('only-in-second');
    expect(d.securityRelevantSections).toContain('columns');
  });
});

describe('a capture always retains its content', () => {
  let out: string;
  beforeEach(() => { out = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-')); });
  afterEach(() => fs.rmSync(out, { recursive: true, force: true }));

  it('writes the full normalized catalog, not just a digest', () => {
    const res = call('writeCapture', {
      outDir: out, label: 'FIRST_APPLY',
      rawCatalog: { policies: [{ p: 'own row' }] },
      sourceSha: 'abc123', integrationSha: 'def456', target: 'ctshxbykuemeqnofqcdh',
    });
    const written = JSON.parse(fs.readFileSync(res.file, 'utf8'));
    expect(path.basename(res.file)).toBe('CATALOG_FIRST_APPLY.json');
    // The content is present — this is exactly what the first staging run failed to keep.
    expect(written.catalog.policies).toEqual([{ p: 'own row' }]);
    expect(written.checksum).toBe(res.checksum);
    // And every field the acceptor asked for is on the artifact.
    expect(written.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(written.captureTool).toBe('scripts/structural-catalog.mjs');
    expect(written.captureQuerySha256).toMatch(/^[0-9a-f]{64}$/);
    expect(written.sourceSha).toBe('abc123');
    expect(written.integrationSha).toBe('def456');
    expect(written.target).toBe('ctshxbykuemeqnofqcdh');
    expect(written.normalizationRules.length).toBeGreaterThan(0);
    expect(written.excludedVolatileFields.length).toBeGreaterThan(0);
  });

  it('justifies every excluded volatile field', () => {
    for (const f of constant('VOLATILE_FIELDS')) {
      expect(typeof f.field).toBe('string');
      expect(f.reason.length).toBeGreaterThan(40);
    }
  });

  // Round-2 review constructed five authorization changes that produced an IDENTICAL
  // checksum. Each is pinned here so none can regress silently.
  it.each([
    ['SECURITY DEFINER losing SET search_path', 'functions',
      { functions: [{ n: 'f', secdef: true, config: 'search_path=' }] },
      { functions: [{ n: 'f', secdef: true, config: '' }] }],
    ['a trigger being disabled', 'triggers',
      { triggers: [{ g: 't', enabled: 'O' }] }, { triggers: [{ g: 't', enabled: 'D' }] }],
    ['a trigger WHEN clause being removed', 'triggers',
      { triggers: [{ g: 't', when: 'CREATE TRIGGER t ... WHEN (new.is_admin) ...' }] },
      { triggers: [{ g: 't', when: 'CREATE TRIGGER t ... ' }] }],
    ['a column default flipped to true', 'columns',
      { columns: [{ c: 'is_admin', default: 'false' }] },
      { columns: [{ c: 'is_admin', default: 'true' }] }],
    ['FORCE ROW LEVEL SECURITY toggled', 'relations',
      { relations: [{ n: 'users', forcerls: true }] },
      { relations: [{ n: 'users', forcerls: false }] }],
  ])('reports %s as a security-relevant residual', (_label, section, before, after) => {
    const a = catalogOf(before);
    const b = catalogOf(after);
    expect(a.checksum).not.toBe(b.checksum);
    const d = call('diffCaptures', a, b);
    expect(d.identical).toBe(false);
    expect(d.securityRelevantSections).toContain(section);
  });

  it('declares its schema scope instead of implying it covers everything', () => {
    expect(constant('CAPTURED_SCHEMAS')).toEqual(['public', 'private', 'storage', 'limiter']);
  });

  // Derived from the registry. BE PRECISE ABOUT WHAT THIS PROVES: it feeds SYNTHETIC
  // objects to the comparator, so it shows the comparator reacts to a change in a
  // field of that name. It does NOT run CATALOG_SQL and does NOT touch a database, so
  // it cannot show the capture actually populates the field from the catalog.
  // Round 4 demonstrated that gap: functions.body passed this test while failing to
  // detect a BEGIN ATOMIC body inversion. The registry is a regression net and a
  // review aid, not a completeness guarantee, and the module header says so.
  it.each(constant('AUTHORIZATION_SURFACES').map((s: any) => [`${s.section}.${s.field}`, s]))(
    'detects a change to %s', (_label: string, surface: any) => {
      const before = { [surface.section]: [{ k: 'x', [surface.field]: 'BEFORE' }] };
      const after  = { [surface.section]: [{ k: 'x', [surface.field]: 'AFTER' }] };
      const a = catalogOf(before);
      const b = catalogOf(after);
      expect(a.checksum).not.toBe(b.checksum);
      const d = call('diffCaptures', a, b);
      expect(d.identical).toBe(false);
      // Every authorization-bearing section must be classed security-relevant, or a
      // reviewer skimming securityRelevantSections would miss it.
      expect(d.securityRelevantSections).toContain(surface.section);
    });

  it('names every registry field INSIDE its own section of the query', () => {
    // Round 4: the previous version searched the whole query, so `'owner'` and the
    // four `*.acl` entries were satisfied by unrelated occurrences in other sections.
    // Scope each lookup to the slice of SQL that builds that section.
    const sql: string = constant('CATALOG_SQL');
    const sections = ['schemas','relations','columns','functions','policies','triggers','roles','defaultAcls'];
    // Anchor on LINE-INITIAL top-level keys. A bare indexOf is ambiguous: 'roles' is
    // both a top-level section and a field name inside the policies object, so
    // searching anywhere truncated the policies slice before 'qual'. Found by this
    // test failing on its first run, which is the point of writing it this way.
    const topLevel = (section: string) => {
      const m = new RegExp(`^  '${section}',`, 'm').exec(sql);
      expect(`${section} is a top-level key`).toBe(m ? `${section} is a top-level key` : `${section} NOT FOUND`);
      return m!.index;
    };
    const bounds = sections.map(topLevel).sort((a, b) => a - b);
    const sliceFor = (section: string) => {
      const start = topLevel(section);
      const end = bounds.find((i) => i > start) ?? sql.length;
      return sql.slice(start, end);
    };
    for (const s of constant('AUTHORIZATION_SURFACES')) {
      expect(`${s.section}.${s.field} present in its own section`)
        .toBe(sliceFor(s.section).includes(`'${s.field}'`)
          ? `${s.section}.${s.field} present in its own section`
          : `${s.section}.${s.field} MISSING from the ${s.section} section`);
      expect(typeof s.detects).toBe('string');
      expect(s.detects.length).toBeGreaterThan(10);
    }
  });

  it('states its own limits rather than claiming completeness', () => {
    const src = fs.readFileSync(path.join(root, 'scripts', 'structural-catalog.mjs'), 'utf8');
    // The header must NOT promise the derived tests prove capture completeness.
    expect(src.replace(/\s*\n\s*\*\s*/g, ' ')).toMatch(/do NOT execute CATALOG_SQL/);
    expect(src.replace(/\s*\n\s*\*\s*/g, ' ')).toMatch(/NOT a completeness guarantee/);
    // And it must name what is knowingly outside scope.
    expect(src.replace(/\s*\n\s*\*\s*/g, ' ')).toMatch(/Known-uncaptured/);
    expect(src.replace(/\s*\n\s*\*\s*/g, ' ')).toMatch(/auth and vault/);
  });
});
