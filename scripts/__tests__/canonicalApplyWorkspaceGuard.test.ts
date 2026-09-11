/**
 * STAGE-BLOCK-03 SAFETY — destroyWorkspace() may never remove a repository.
 *
 * 2026-09-11: the previous version of this guard accepted any directory holding
 * `supabase/config.toml`. Every AccessMap worktree root holds one. A test that
 * called destroyWorkspace(repoRoot) expecting `false` deleted six working trees
 * instead. This suite replaces it and is built on one rule:
 *
 *   NO REAL REPOSITORY, WORKTREE, HOME, CWD OR FILESYSTEM ROOT IS EVER PASSED TO
 *   THE DESTRUCTIVE CALL.
 *
 * Dangerous real paths are interrogated with inspectWorkspaceForDestruction(),
 * which is pure and removes nothing. Only disposable temp fixtures are ever handed
 * to destroyWorkspace(). Proving a guard must not require risking the thing it
 * protects.
 */
import { execFileSync } from 'node:child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const MOD = './scripts/canonical-apply-workspace.mjs';

function call(fn: string, ...args: unknown[]): any {
  const code =
    `import * as m from '${MOD}';` +
    `const a=${JSON.stringify(args)};` +
    `let out;try{out={ok:true,v:m.${fn}(...a)};}catch(e){out={ok:false,message:String(e.message)};}` +
    `console.log(JSON.stringify(out));`;
  const res = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  }));
  if (!res.ok) throw new Error(res.message);
  return res.v;
}
function constant(name: string): any {
  const code = `import * as m from '${MOD}'; console.log(JSON.stringify(m.${name}));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8' }));
}

const PREFIX: string = constant('WORKSPACE_PREFIX');
const MARKER: string = constant('WORKSPACE_MARKER');
const MARKER_TYPE: string = constant('WORKSPACE_MARKER_TYPE');
const MARKER_VERSION: number = constant('WORKSPACE_MARKER_VERSION');
const TMP = fs.realpathSync(os.tmpdir());

const inspect = (p: unknown) => call('inspectWorkspaceForDestruction', p);
const destroy = (p: unknown) => call('destroyWorkspace', p);
const createWorkspace = () => call('createWorkspaceDir', {}) as string;

/** The guard as it stood when it deleted six worktrees. Kept for the negative control. */
const OLD_GUARD = (p: string) => fs.existsSync(path.join(p, 'supabase', 'config.toml'));

// Every fixture this suite creates, removed with plain fs at the end. Nothing here
// is ever removed by the code under test unless the test is specifically proving
// that destruction succeeds.
const fixtures: string[] = [];
function tempDir(prefix: string): string {
  const d = fs.mkdtempSync(path.join(TMP, prefix));
  fixtures.push(d);
  return d;
}
/** A directory shaped exactly like an AccessMap worktree root — but disposable. */
function fakeRepoFixture(prefix = 'guard-fake-repo-'): string {
  const d = tempDir(prefix);
  fs.mkdirSync(path.join(d, 'supabase', 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(d, 'supabase', 'config.toml'), 'project_id = "accessmap"\n');
  fs.writeFileSync(path.join(d, 'package.json'), '{"name":"fake"}\n');
  return d;
}
function writeMarker(dir: string, body: unknown | string) {
  fs.writeFileSync(path.join(dir, MARKER), typeof body === 'string' ? body : `${JSON.stringify(body)}\n`);
}
function validMarker() {
  return { type: MARKER_TYPE, markerVersion: MARKER_VERSION, createdBy: 'test', createdAt: new Date().toISOString() };
}
/** A fixture that satisfies EVERY guard, so a single deviation can be isolated. */
function workspaceShapedFixture(): string {
  const d = tempDir(PREFIX);
  fs.mkdirSync(path.join(d, 'supabase', 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(d, 'supabase', 'config.toml'), 'project_id = "accessmap"\n');
  writeMarker(d, validMarker());
  return d;
}

afterAll(() => {
  for (const d of fixtures) {
    try { if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true }); } catch { /* already gone */ }
  }
});

describe('A — a genuine disposable workspace is destroyable', () => {
  it('creates under the temp root, with the prefix and the marker', () => {
    const ws = createWorkspace();
    fixtures.push(ws);
    expect(path.dirname(fs.realpathSync(ws))).toBe(TMP);
    expect(path.basename(ws).startsWith(PREFIX)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(path.join(ws, MARKER), 'utf8'));
    expect(meta.type).toBe(MARKER_TYPE);
    expect(meta.markerVersion).toBe(MARKER_VERSION);
    expect(fs.existsSync(path.join(ws, 'supabase', 'migrations'))).toBe(true);
  });

  it('destroys exactly that directory and nothing beside it', () => {
    const ws = createWorkspace();
    const bystander = workspaceShapedFixture();
    expect(destroy(ws)).toBe(true);
    expect(fs.existsSync(ws)).toBe(false);
    expect(fs.existsSync(bystander)).toBe(true);
    expect(fs.existsSync(TMP)).toBe(true);
  });

  it('refuses the same path twice — a destroyed workspace is no longer destroyable', () => {
    const ws = createWorkspace();
    expect(destroy(ws)).toBe(true);
    expect(destroy(ws)).toBe(false);
  });
});

describe('B — a repo-shaped directory without the marker is refused', () => {
  it('refuses, and the directory survives', () => {
    const fake = fakeRepoFixture();
    const verdict = inspect(fake);
    expect(verdict.ok).toBe(false);
    expect(destroy(fake)).toBe(false);
    expect(fs.existsSync(path.join(fake, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(fake, 'supabase', 'config.toml'))).toBe(true);
  });

  it('NEGATIVE CONTROL: the old guard would have deleted it', () => {
    const fake = fakeRepoFixture();
    // The exact predicate that shipped: config.toml present => delete.
    expect(OLD_GUARD(fake)).toBe(true);
    // The new guard, same directory, opposite answer.
    expect(inspect(fake).ok).toBe(false);
  });

  it('NEGATIVE CONTROL: the old guard was satisfied by this very worktree', () => {
    // Read-only proof, on the real repository, with no destructive call anywhere:
    // this is why six worktrees died. Nothing is passed to destroyWorkspace here.
    expect(OLD_GUARD(root)).toBe(true);
    const verdict = inspect(root);
    expect(verdict.ok).toBe(false);
    expect(verdict.refusals.join(' ')).toMatch(/repository|worktree|git/i);
    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
  });
});

describe('C — location: only the approved disposable root', () => {
  it('refuses a fully-marked workspace carrying the wrong prefix', () => {
    const d = tempDir('guard-wrong-prefix-');
    fs.mkdirSync(path.join(d, 'supabase', 'migrations'), { recursive: true });
    writeMarker(d, validMarker());
    expect(inspect(d).refusals.join(' ')).toMatch(/prefix/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('refuses a correctly-named workspace nested below the temp root', () => {
    const parent = tempDir('guard-nested-');
    const nested = path.join(parent, `${PREFIX}deep`);
    fs.mkdirSync(path.join(nested, 'supabase', 'migrations'), { recursive: true });
    writeMarker(nested, validMarker());
    expect(inspect(nested).refusals.join(' ')).toMatch(/outside the disposable workspace root/i);
    expect(destroy(nested)).toBe(false);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it('refuses a subdirectory of a real workspace', () => {
    const ws = createWorkspace();
    fixtures.push(ws);
    expect(destroy(path.join(ws, 'supabase'))).toBe(false);
    expect(fs.existsSync(path.join(ws, 'supabase'))).toBe(true);
  });
});

describe('D/E — the marker must be present, parseable and self-identifying', () => {
  it('refuses a malformed marker', () => {
    const d = workspaceShapedFixture();
    writeMarker(d, '{ this is not json');
    expect(inspect(d).refusals.join(' ')).toMatch(/does not parse/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('refuses a marker of the wrong type', () => {
    const d = workspaceShapedFixture();
    writeMarker(d, { ...validMarker(), type: 'some-other-tool-workspace' });
    expect(inspect(d).refusals.join(' ')).toMatch(/marker type/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('refuses a marker of the wrong schema version', () => {
    const d = workspaceShapedFixture();
    writeMarker(d, { ...validMarker(), markerVersion: MARKER_VERSION + 1 });
    expect(inspect(d).refusals.join(' ')).toMatch(/marker version/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('refuses a marker that is a JSON array, not an object', () => {
    const d = workspaceShapedFixture();
    writeMarker(d, '[]');
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('refuses when the marker is a symlink rather than a regular file', () => {
    const d = workspaceShapedFixture();
    const real = path.join(tempDir('guard-marker-src-'), 'marker.json');
    fs.writeFileSync(real, `${JSON.stringify(validMarker())}\n`);
    fs.rmSync(path.join(d, MARKER));
    fs.symlinkSync(real, path.join(d, MARKER));
    expect(inspect(d).refusals.join(' ')).toMatch(/not a regular file/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('refuses a workspace missing the generated shape', () => {
    const d = tempDir(PREFIX);
    writeMarker(d, validMarker());
    expect(inspect(d).refusals.join(' ')).toMatch(/shape/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });
});

describe('F — degenerate arguments are refused', () => {
  it.each([
    ['empty string', ''],
    ['whitespace', '   '],
    ['relative path', 'supabase/migrations'],
    ['dot', '.'],
    ['null', null],
    ['undefined', undefined],
    ['number', 12345],
    ['object', { path: '/tmp' }],
  ])('refuses %s', (_label, value) => {
    expect(inspect(value as unknown).ok).toBe(false);
    expect(destroy(value as unknown)).toBe(false);
  });

  it('refuses a path that does not exist', () => {
    expect(destroy(path.join(TMP, `${PREFIX}definitely-not-created-${Date.now()}`))).toBe(false);
  });
});

describe('G/H/I — dangerous real paths, interrogated without ever destroying', () => {
  // Not one of these is passed to destroyWorkspace. inspectWorkspaceForDestruction
  // is pure; that is the whole reason it is exported.
  it('refuses the filesystem root, which still exists', () => {
    const v = inspect(path.parse(process.cwd()).root);
    expect(v.ok).toBe(false);
    expect(v.refusals.join(' ')).toMatch(/filesystem root/i);
    expect(fs.existsSync('/')).toBe(true);
  });

  it('refuses the home directory in several representations', () => {
    const home = os.homedir();
    for (const form of [home, `${home}/`, path.join(home, 'Documents', '..')]) {
      expect(inspect(form).ok).toBe(false);
    }
    expect(fs.existsSync(home)).toBe(true);
  });

  it('refuses the current working directory', () => {
    // The subprocess runs with cwd = repo root, so this is cwd AND a worktree.
    const v = inspect(root);
    expect(v.ok).toBe(false);
    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
  });

  it('refuses the temp root itself', () => {
    expect(inspect(TMP).refusals.join(' ')).toMatch(/temp root/i);
    expect(fs.existsSync(TMP)).toBe(true);
  });

  it('refuses the primary checkout and every registered worktree', () => {
    const worktrees = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: root, encoding: 'utf8' })
      .split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice('worktree '.length));
    expect(worktrees.length).toBeGreaterThan(0);
    for (const wt of worktrees) {
      if (!fs.existsSync(wt)) continue;           // stale record, nothing to assert
      const v = inspect(wt);
      expect(v.ok).toBe(false);                   // inspection only — never destroy()
      expect(fs.existsSync(wt)).toBe(true);
    }
  });
});

describe('J — the git check fires even when everything else looks right', () => {
  it('refuses a perfectly-shaped workspace that carries a .git directory', () => {
    const d = workspaceShapedFixture();
    fs.mkdirSync(path.join(d, '.git'));
    expect(inspect(d).refusals.join(' ')).toMatch(/git repository or worktree/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('refuses a perfectly-shaped workspace that carries a .git FILE (linked worktree)', () => {
    const d = workspaceShapedFixture();
    fs.writeFileSync(path.join(d, '.git'), 'gitdir: /somewhere/.git/worktrees/x\n');
    expect(inspect(d).refusals.join(' ')).toMatch(/git repository or worktree/i);
    expect(destroy(d)).toBe(false);
    expect(fs.existsSync(d)).toBe(true);
  });
});

describe('K — symlink indirection cannot aim the delete', () => {
  it('refuses a correctly-named symlink pointing at another disposable directory', () => {
    const target = workspaceShapedFixture();
    const link = path.join(TMP, `${PREFIX}symlink-${process.pid}-${Date.now()}`);
    fs.symlinkSync(target, link);
    fixtures.push(link);
    expect(inspect(link).refusals.join(' ')).toMatch(/symlink/i);
    expect(destroy(link)).toBe(false);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.existsSync(path.join(target, MARKER))).toBe(true);
  });

  it('refuses a correctly-named symlink pointing at a repo-shaped directory', () => {
    const fake = fakeRepoFixture();
    const link = path.join(TMP, `${PREFIX}symlink-repo-${process.pid}-${Date.now()}`);
    fs.symlinkSync(fake, link);
    fixtures.push(link);
    expect(destroy(link)).toBe(false);
    expect(fs.existsSync(path.join(fake, 'package.json'))).toBe(true);
  });
});

describe('L — traversal and normalization cannot escape the workspace root', () => {
  it('refuses ".." out of a real workspace', () => {
    const ws = createWorkspace();
    fixtures.push(ws);
    expect(destroy(path.join(ws, '..'))).toBe(false);
    expect(destroy(path.join(ws, 'supabase', '..', '..'))).toBe(false);
    expect(fs.existsSync(TMP)).toBe(true);
    expect(fs.existsSync(ws)).toBe(true);
  });

  it('refuses a traversal that lands on a repo-shaped sibling', () => {
    const fake = fakeRepoFixture();
    const escaped = path.join(TMP, `${PREFIX}x`, '..', path.basename(fake));
    expect(destroy(escaped)).toBe(false);
    expect(fs.existsSync(path.join(fake, 'package.json'))).toBe(true);
  });
});

describe('M — buildWorkspace can no longer be pointed at a directory', () => {
  it('ignores a caller-supplied outDir and builds under the disposable root', () => {
    const decoy = fakeRepoFixture('guard-decoy-outdir-');
    const baselineDir = path.join(root, 'supabase/migrations');
    const candidateDir = path.join(root, 'supabase/migrations-next/phase03a');
    const adoptionDir = path.join(root, 'supabase/migrations-next');
    const contract = JSON.parse(fs.readFileSync(path.join(candidateDir, 'candidate-contract.json'), 'utf8'));
    const ledger = (call('baselineVersions', baselineDir) as string[]).map((version) => ({ version, name: 'baseline' }));

    const res = call('buildWorkspace', {
      baselineDir, adoptionDir, candidateDir,
      declared: contract.migrations,
      adoptionDeclared: contract.phase02Adoption?.entries ?? [],
      ledger, stage: 'A',
      outDir: decoy,                                   // the shape that caused the incident
    });

    expect(res.ok).toBe(true);
    if (res.workspace) fixtures.push(res.workspace);
    expect(path.dirname(fs.realpathSync(res.workspace))).toBe(TMP);
    expect(path.basename(res.workspace).startsWith(PREFIX)).toBe(true);
    // The decoy was never written into, and is not destroyable.
    expect(fs.existsSync(path.join(decoy, 'supabase', 'migrations'))).toBe(true);
    expect(fs.readdirSync(path.join(decoy, 'supabase', 'migrations'))).toEqual([]);
    expect(destroy(decoy)).toBe(false);
    expect(fs.existsSync(decoy)).toBe(true);
    // And the workspace it did build is a proper disposable one.
    expect(destroy(res.workspace)).toBe(true);
    expect(fs.existsSync(res.workspace)).toBe(false);
  });
});
