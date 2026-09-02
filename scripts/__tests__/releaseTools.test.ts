/**
 * Focused tests for the Flagstone release control-plane tools:
 *   scripts/release-preflight.mjs · verify-release-state.mjs · release-status.mjs ·
 *   render-current-release.mjs · release-finalize.mjs · verify-live-release.mjs ·
 *   release-meta.mjs
 *
 * Every test runs the real CLI in a child process against a throwaway Git
 * fixture, so exit codes and printed output are exactly what an operator sees.
 * Nothing here touches the real repository's manifest, Vercel, EAS, or the
 * public internet (the "live" tests use a local HTTP server).
 *
 * Guards matter more than the happy path — see docs/RELEASE_IDENTITY.md.
 */
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const SCRIPTS_DIR = path.resolve(__dirname, '..');
const NODE = process.execPath;
const GIT_ENV: Record<string, string> = {
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};

type Run = { status: number | null; stdout: string; stderr: string; out: string };

function run(script: string, args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): Run {
  const res = spawnSync(NODE, [path.join(SCRIPTS_DIR, script), ...args], {
    encoding: 'utf8',
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeout: 20000,
  });
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '', out: `${res.stdout ?? ''}\n${res.stderr ?? ''}` };
}

/**
 * Async variant for tests that also host a local HTTP server in this process:
 * spawnSync would block the event loop and the server could never answer.
 */
function runAsync(script: string, args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): Promise<Run> {
  return new Promise((resolve) => {
    execFile(
      NODE,
      [path.join(SCRIPTS_DIR, script), ...args],
      { encoding: 'utf8', cwd: options.cwd, env: { ...process.env, ...options.env }, timeout: 20000 },
      (error, stdout, stderr) => {
        const code = error && typeof (error as { code?: unknown }).code === 'number' ? ((error as { code: number }).code) : error ? 1 : 0;
        resolve({ status: code, stdout: String(stdout ?? ''), stderr: String(stderr ?? ''), out: `${stdout ?? ''}\n${stderr ?? ''}` });
      },
    );
  });
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, '-c', 'commit.gpgsign=false', ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...GIT_ENV },
  }).trim();
}

function write(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `flagstone-${prefix}-`));
}

interface Fixture {
  repo: string;
  baseSha: string;
  appSha: string;
  appTree: string;
  webSha: string;
  webTree: string;
  orphanSha: string;
  orphanTree: string;
}

/**
 * base ──► app (release source, branch main + release/app-fixture)
 *           └─► web (web-only repair, branch release/web-fixture)
 * unrelated: orphan commit with no shared history.
 * origin/main is pinned at `base` (main has NOT converged to the release).
 */
function makeFixture(): Fixture {
  const repo = tmpDir('repo');
  git(repo, 'init', '-q', '-b', 'main');
  write(repo, 'app.json', `${JSON.stringify({ expo: { name: 'Flagstone', slug: 'accessmap', version: '4.1.1', ios: { buildNumber: '15' } } }, null, 2)}\n`);
  write(repo, 'eas.json', `${JSON.stringify({ cli: { appVersionSource: 'remote' } }, null, 2)}\n`);
  write(repo, 'README.md', 'base\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'base');
  const baseSha = git(repo, 'rev-parse', 'HEAD');

  write(repo, 'qa-reports/receipt.md', '# fixture receipt\n');
  write(repo, 'src.txt', 'app release source\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'app release source');
  const appSha = git(repo, 'rev-parse', 'HEAD');
  const appTree = git(repo, 'rev-parse', 'HEAD^{tree}');
  git(repo, 'branch', 'release/app-fixture', appSha);

  git(repo, 'checkout', '-q', '-b', 'release/web-fixture');
  write(repo, 'web.txt', 'web-only repair\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'web-only repair');
  const webSha = git(repo, 'rev-parse', 'HEAD');
  const webTree = git(repo, 'rev-parse', 'HEAD^{tree}');

  git(repo, 'checkout', '-q', '--orphan', 'unrelated');
  git(repo, 'rm', '-rfq', '.');
  write(repo, 'other.txt', 'unrelated history\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'unrelated');
  const orphanSha = git(repo, 'rev-parse', 'HEAD');
  const orphanTree = git(repo, 'rev-parse', 'HEAD^{tree}');

  git(repo, 'checkout', '-q', 'main');
  git(repo, 'update-ref', 'refs/remotes/origin/main', baseSha);
  git(repo, 'update-ref', 'refs/remotes/origin/release/app-fixture', appSha);
  git(repo, 'update-ref', 'refs/remotes/origin/release/web-fixture', webSha);
  return { repo, baseSha, appSha, appTree, webSha, webTree, orphanSha, orphanTree };
}

type Manifest = Record<string, any>;

function deployment(sha: string, branch: string): Manifest {
  return {
    provider: 'vercel',
    project: 'access-map',
    team: 'skypie99s-projects',
    productionBranch: branch,
    deploymentId: 'dpl_fixture',
    deployedCommit: sha,
    domains: ['flagstone.example.test'],
    liveIdentityMode: 'legacy-triangulated',
    verifiedAt: '2026-09-02',
    receipt: 'qa-reports/receipt.md',
  };
}

function manifestFor(f: Fixture, mode: 'exact' | 'descendant'): Manifest {
  const web =
    mode === 'exact'
      ? { syncMode: 'exact', baseReleaseCommit: f.appSha, sourceCommit: f.appSha, sourceTree: f.appTree, overlay: null, deployment: deployment(f.appSha, 'release/app-fixture') }
      : {
          syncMode: 'web-only-descendant',
          baseReleaseCommit: f.appSha,
          sourceCommit: f.webSha,
          sourceTree: f.webTree,
          overlay: { baseCommit: f.appSha, headCommit: f.webSha, reason: 'fixture web-only repair', approved: true, receipt: 'qa-reports/receipt.md' },
          deployment: deployment(f.webSha, 'release/web-fixture'),
        };
  return {
    schemaVersion: 2,
    product: 'Flagstone',
    governance: { baseCommit: f.baseSha, releaseCodeIntegration: 'deferred' },
    app: {
      version: '4.1.1',
      iosBuild: 33,
      sourceCommit: f.appSha,
      sourceTree: f.appTree,
      originMainAtBuild: null,
      eas: { versionSource: 'remote', buildId: null, sourceCommit: f.appSha, profile: null, status: 'UNPROVEN', createdAt: null },
      appStore: { status: 'submitted_for_review', submittedAt: null },
    },
    web,
    releaseTag: null,
    lastVerified: '2026-09-02T00:00:00Z',
  };
}

function manifestPathOf(f: Fixture): string {
  return path.join(f.repo, 'release/current.json');
}

function renderedPathOf(f: Fixture): string {
  return path.join(f.repo, 'qa-reports/CURRENT_RELEASE.md');
}

/** Writes the manifest and (when it is valid) the rendered doc next to it. */
function writeManifest(f: Fixture, m: Manifest): void {
  write(f.repo, 'release/current.json', `${JSON.stringify(m, null, 2)}\n`);
  run('render-current-release.mjs', ['--repo', f.repo]); // refuses invalid manifests; that is fine here
}

function verify(f: Fixture, extra: string[] = []): Run {
  return run('verify-release-state.mjs', ['--repo', f.repo, ...extra]);
}

type Served = { url: string; requests: { url: string; headers: http.IncomingHttpHeaders }[]; close: () => Promise<void> };

function serve(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<Served> {
  return new Promise((resolve) => {
    const requests: Served['requests'] = [];
    const server = http.createServer((req, res) => {
      requests.push({ url: req.url ?? '', headers: req.headers });
      handler(req, res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${port}/release-meta.json`,
        requests,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}

function releaseMeta(f: Fixture, overrides: Manifest = {}): Manifest {
  return {
    schemaVersion: 1,
    product: 'Flagstone',
    appVersion: '4.1.1',
    iosBuild: 33,
    webSourceCommit: f.appSha,
    webSourceTree: f.appTree,
    builtAt: '2026-09-02T00:00:00Z',
    ...overrides,
  };
}

const EXPERIENCE_LINE = 'RECRUITER / PRODUCT EXPERIENCE: SEPARATE GATE';

// ---------------------------------------------------------------------------

describe('release:preflight', () => {
  let f: Fixture;
  beforeAll(() => {
    f = makeFixture();
  });
  afterAll(() => fs.rmSync(f.repo, { recursive: true, force: true }));

  it('prints the required identity rows from live Git and PASSes on a clean checkout', () => {
    const r = run('release-preflight.mjs', ['--repo', f.repo]);
    expect(r.status).toBe(0);
    for (const label of [
      'FLAGSTONE RELEASE PREFLIGHT',
      'Repository:',
      'Actual worktree path:',
      'Common Git dir:',
      'Branch:',
      'HEAD:',
      'Tree:',
      'Actual origin/main:',
      'Tracked tree clean:',
      'App version:',
      'Local configured iOS build:',
      'EAS version-source mode:',
      'Local iOS build authoritative:',
      'Timestamp source:',
      'PREFLIGHT: PASS',
    ]) {
      expect(r.stdout).toContain(label);
    }
    expect(r.stdout).toContain(`HEAD:                            ${f.appSha}`);
  });

  it('states the EAS remote-version rule: local buildNumber is NOT authoritative', () => {
    const r = run('release-preflight.mjs', ['--repo', f.repo, '--json']);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.easVersionSource).toBe('remote');
    expect(j.localIosBuildAuthoritative).toBe('NO');
    expect(j.localIosBuildNumber).toBe('15');
    const text = run('release-preflight.mjs', ['--repo', f.repo]).stdout;
    expect(text).toContain('EAS VERSION SOURCE: REMOTE');
    expect(text).toContain('LOCAL IOS BUILD NUMBER: 15');
    expect(text).toContain('LOCAL BUILD NUMBER AUTHORITATIVE: NO');
  });

  it('does not fail merely because HEAD != origin/main (prints the difference)', () => {
    const r = run('release-preflight.mjs', ['--repo', f.repo]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/HEAD vs origin\/main:\s+differs — HEAD is 1 ahead \/ 0 behind/);
  });

  it('detects a linked worktree, records it, and does not fail because of it', () => {
    const wt = path.join(tmpDir('wt'), 'linked');
    git(f.repo, 'worktree', 'add', '-q', wt, 'release/web-fixture');
    const r = run('release-preflight.mjs', ['--repo', wt, '--json']);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.linkedWorktree).toBe(true);
    expect(fs.realpathSync(j.worktreePath)).toBe(fs.realpathSync(wt));
    expect(fs.realpathSync(j.commonGitDir)).toBe(fs.realpathSync(path.join(f.repo, '.git')));
    expect(j.head).toBe(f.webSha);
    git(f.repo, 'worktree', 'remove', '--force', wt);
  });

  it('fails a build-sensitive preflight on a dirty TRACKED tree, but only reports it otherwise', () => {
    fs.appendFileSync(path.join(f.repo, 'README.md'), 'dirty\n');
    const info = run('release-preflight.mjs', ['--repo', f.repo]);
    expect(info.status).toBe(0);
    expect(info.stdout).toMatch(/Tracked tree clean:\s+NO \(1 tracked change/);
    const strict = run('release-preflight.mjs', ['--repo', f.repo, '--build-sensitive']);
    expect(strict.status).toBe(1);
    expect(strict.stdout).toContain('PREFLIGHT: FAIL');
    expect(strict.stdout).toContain('tracked worktree is dirty');
    git(f.repo, 'checkout', '--', 'README.md');
  });

  it('fails when repository identity cannot resolve', () => {
    const notRepo = tmpDir('notrepo');
    const r = run('release-preflight.mjs', ['--repo', notRepo]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('repository identity cannot resolve');
    fs.rmSync(notRepo, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------

describe('release:verify', () => {
  let f: Fixture;
  beforeAll(() => {
    f = makeFixture();
  });
  afterAll(() => fs.rmSync(f.repo, { recursive: true, force: true }));

  it('PASSes an exact-mode manifest and keeps the experience gate separate', () => {
    writeManifest(f, manifestFor(f, 'exact'));
    const r = verify(f);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('APP IDENTITY: PASS');
    expect(r.stdout).toContain('WEB IDENTITY: PASS');
    expect(r.stdout).toContain('APP ↔ WEB: EXACT (WEB = APP)');
    expect(r.stdout).toContain('RELEASE VERIFY: PASS');
    expect(r.stdout).toContain(EXPERIENCE_LINE);
    expect(r.stdout).not.toMatch(/EXPERIENCE:\s*PASS/i);
  });

  it('PASSes an approved web-only descendant with real ancestry', () => {
    writeManifest(f, manifestFor(f, 'descendant'));
    const r = verify(f);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('APP ↔ WEB: APPROVED WEB-ONLY DESCENDANT (ancestry: PASS)');
    expect(r.stdout).toContain('Overlay — fixture web-only repair (approved)');
  });

  it('FAILs when the EAS-built source differs from the intended app source', () => {
    const m = manifestFor(f, 'exact');
    m.app.eas.sourceCommit = f.baseSha;
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('RELEASE IDENTITY FAIL');
    expect(r.stdout).toContain('APP IDENTITY: FAIL');
  });

  it('FAILs exact mode when the web SHA differs from the app SHA', () => {
    const m = manifestFor(f, 'exact');
    m.web.sourceCommit = f.webSha;
    m.web.sourceTree = f.webTree;
    m.web.deployment.deployedCommit = f.webSha;
    m.web.deployment.productionBranch = 'release/web-fixture';
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('Exact mode: web == app');
    expect(r.stdout).toContain('WEB IDENTITY: FAIL');
  });

  it('FAILs an unrelated web source in descendant mode (ancestry)', () => {
    const m = manifestFor(f, 'descendant');
    m.web.sourceCommit = f.orphanSha;
    m.web.sourceTree = f.orphanTree;
    m.web.overlay.headCommit = f.orphanSha;
    m.web.deployment.deployedCommit = f.orphanSha;
    m.web.deployment.productionBranch = 'unrelated';
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('does not descend from');
    expect(r.stdout).toContain('ancestry: FAIL');
  });

  it('FAILs descendant mode without overlay metadata', () => {
    const m = manifestFor(f, 'descendant');
    m.web.overlay = null;
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('requires overlay');
  });

  it('FAILs descendant mode when the overlay receipt file is missing', () => {
    const m = manifestFor(f, 'descendant');
    m.web.overlay.receipt = 'qa-reports/does-not-exist.md';
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('Overlay receipt exists: missing file');
  });

  it('FAILs when overlay approval is not explicitly true', () => {
    const m = manifestFor(f, 'descendant');
    m.web.overlay.approved = 'yes';
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('approved must be exactly true');
  });

  it('FAILs on a tree SHA that does not belong to the commit', () => {
    const m = manifestFor(f, 'exact');
    m.app.sourceTree = f.webTree;
    m.web.sourceTree = f.webTree;
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('App source commit ↔ tree tree');
    expect(r.stdout).toContain(`manifest says ${f.webTree}`);
  });

  it('FAILs malformed SHAs at the schema layer', () => {
    const m = manifestFor(f, 'exact');
    m.app.sourceCommit = f.appSha.slice(0, 7);
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('full 40-hex SHA');
  });

  it('FAILs a stale/incorrect deployed SHA', () => {
    const m = manifestFor(f, 'exact');
    m.web.deployment.deployedCommit = f.baseSha;
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('STALE/INCORRECT DEPLOYED SHA');
  });

  it('FAILs when the web base is not the app source (demo decision required)', () => {
    const m = manifestFor(f, 'exact');
    m.web.baseReleaseCommit = f.baseSha;
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('APP ↔ WEB NOT SYNCHRONIZED');
    expect(r.stdout).toContain('explicit governance decision');
  });

  it('FAILs when the production branch head moved away from the expected web source', () => {
    writeManifest(f, manifestFor(f, 'descendant'));
    git(f.repo, 'update-ref', 'refs/remotes/origin/release/web-fixture', f.orphanSha);
    const r = verify(f);
    git(f.repo, 'update-ref', 'refs/remotes/origin/release/web-fixture', f.webSha);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('frozen branch moved or manifest stale');
  });

  it('FAILs a "converged" claim that origin/main contradicts', () => {
    const m = manifestFor(f, 'exact');
    m.governance.releaseCodeIntegration = 'converged';
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('manifest says converged but app source');
  });

  it('FAILs when CURRENT_RELEASE.md drifted, and PASSes again after re-render', () => {
    writeManifest(f, manifestFor(f, 'exact'));
    fs.appendFileSync(renderedPathOf(f), '\nhand edit\n');
    const drifted = verify(f);
    expect(drifted.status).toBe(1);
    expect(drifted.stdout).toContain('drifted from the manifest');
    expect(run('render-current-release.mjs', ['--repo', f.repo]).status).toBe(0);
    expect(verify(f).status).toBe(0);
  });

  it('reports a half-written manifest as MANIFEST UNREADABLE with a Git recovery hint', () => {
    writeManifest(f, manifestFor(f, 'exact'));
    const raw = fs.readFileSync(manifestPathOf(f), 'utf8');
    fs.writeFileSync(manifestPathOf(f), raw.slice(0, Math.floor(raw.length / 2)));
    const r = verify(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('MANIFEST UNREADABLE');
    expect(r.stdout).toContain('git checkout -- release/current.json');
  });

  it('never reports an UNPROVEN deployment as PASS', () => {
    const m = manifestFor(f, 'exact');
    m.web.deployment.productionBranch = 'UNPROVEN';
    m.web.deployment.deploymentId = 'UNPROVEN';
    m.web.deployment.deployedCommit = 'UNPROVEN';
    m.web.deployment.verifiedAt = 'UNPROVEN';
    m.web.deployment.liveIdentityMode = 'release-meta';
    m.web.deployment.receipt = null;
    writeManifest(f, m);
    const r = verify(f);
    expect(r.status).toBe(0); // no contradiction — but nothing live is claimed
    expect(r.stdout).toContain('LIVE IDENTITY: UNPROVEN');
    expect(r.stdout).not.toMatch(/LIVE IDENTITY: PASS/);
    expect(r.stdout).toContain('[UNPROVEN] Deployed SHA == expected web source');
  });

  it('refuses to run on a shallow clone (no false PASS from missing history)', () => {
    writeManifest(f, manifestFor(f, 'descendant'));
    const shallow = path.join(tmpDir('shallow'), 'clone');
    git(f.repo, 'clone', '-q', '--depth', '1', '--branch', 'release/web-fixture', `file://${f.repo}`, shallow);
    const r = run('verify-release-state.mjs', ['--repo', shallow, '--manifest', manifestPathOf(f), '--no-render-check']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('SHALLOW CLONE');
    fs.rmSync(path.dirname(shallow), { recursive: true, force: true });
  });

  it('--json exposes the summary and checks', () => {
    writeManifest(f, manifestFor(f, 'descendant'));
    const r = verify(f, ['--json']);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.ok).toBe(true);
    expect(j.summary.appWeb).toBe('APPROVED WEB-ONLY DESCENDANT');
    expect(j.checks.some((c: any) => c.id === 'web.descendant-ancestry' && c.status === 'PASS')).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('release:status', () => {
  let f: Fixture;
  beforeAll(() => {
    f = makeFixture();
  });
  afterAll(() => fs.rmSync(f.repo, { recursive: true, force: true }));

  it('summarises a legacy Build 33-style release honestly in one command', () => {
    writeManifest(f, manifestFor(f, 'descendant'));
    const r = run('release-status.mjs', ['--repo', f.repo]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('FLAGSTONE RELEASE STATUS');
    expect(r.stdout).toContain('4.1.1 (33)');
    expect(r.stdout).toContain('EAS version source: REMOTE (local app.json buildNumber is NOT authoritative)');
    expect(r.stdout).toContain('APPROVED WEB-ONLY DESCENDANT');
    expect(r.stdout).toContain('Ancestry: PASS');
    expect(r.stdout).toContain('Automated release-meta endpoint: NOT AVAILABLE FOR BUILD 33');
    expect(r.stdout).toContain('Receipt verification: RECORDED');
    expect(r.stdout).toContain('MAIN RELEASE-CODE CONVERGENCE\nDEFERRED');
    expect(r.stdout).toContain(EXPERIENCE_LINE);
    expect(r.stdout).toContain('RELEASE STATUS: PASS');
    expect(r.stdout).not.toMatch(/LIVE.*PASS/);
  });

  it('exits non-zero and lists failures on a contradictory manifest', () => {
    const m = manifestFor(f, 'exact');
    m.app.eas.sourceCommit = f.webSha;
    writeManifest(f, m);
    const r = run('release-status.mjs', ['--repo', f.repo]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('Identity: FAIL');
    expect(r.stdout).toMatch(/RELEASE STATUS: FAIL/);
  });
});

// ---------------------------------------------------------------------------

describe('release:render', () => {
  let f: Fixture;
  beforeAll(() => {
    f = makeFixture();
  });
  afterAll(() => fs.rmSync(f.repo, { recursive: true, force: true }));

  it('derives CURRENT_RELEASE.md from the manifest and --check detects drift', () => {
    writeManifest(f, manifestFor(f, 'descendant'));
    const stdout = run('render-current-release.mjs', ['--repo', f.repo, '--stdout']).stdout;
    expect(stdout).toContain('GENERATED FILE');
    expect(stdout).toContain(`- Source: \`${f.webSha}\``);
    expect(stdout).toContain('Machine authority: `release/current.json`');
    expect(run('render-current-release.mjs', ['--repo', f.repo, '--check']).status).toBe(0);
    fs.appendFileSync(renderedPathOf(f), 'drift\n');
    const check = run('render-current-release.mjs', ['--repo', f.repo, '--check']);
    expect(check.status).toBe(1);
    expect(check.stdout).toContain('RENDER CHECK: FAIL');
  });

  it('refuses to render an invalid manifest', () => {
    const m = manifestFor(f, 'exact');
    m.web.syncMode = 'mystery';
    write(f.repo, 'release/current.json', `${JSON.stringify(m, null, 2)}\n`);
    const r = run('render-current-release.mjs', ['--repo', f.repo]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('RENDER FAIL');
  });
});

// ---------------------------------------------------------------------------

describe('release:finalize', () => {
  let f: Fixture;
  const finalize = (args: string[]) => run('release-finalize.mjs', ['--repo', f.repo, ...args]);
  // A new app release built from the fixture's `web` commit (a real descendant).
  const nextRelease = () => ['--version', '4.1.2', '--build', '34', '--source-sha', f.webSha, '--eas-source-sha', f.webSha, '--profile', 'testflight', '--status', 'FINISHED'];

  beforeEach(() => {
    f = makeFixture();
    writeManifest(f, manifestFor(f, 'exact'));
  });
  afterEach(() => fs.rmSync(f.repo, { recursive: true, force: true }));

  it('is a dry run by default: proposes changes and writes nothing', () => {
    const before = fs.readFileSync(manifestPathOf(f), 'utf8');
    const r = finalize(nextRelease());
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('DRY RUN');
    expect(r.stdout).toContain('RELEASE IDENTITY GATE: PASS');
    expect(r.stdout).toContain('WEB SYNC MODE: EXACT (default');
    expect(r.stdout).toContain('app.iosBuild: 33 → 34');
    expect(fs.readFileSync(manifestPathOf(f), 'utf8')).toBe(before);
  });

  it('--write records the release atomically, re-renders, and the result verifies', () => {
    const r = finalize([...nextRelease(), '--write']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('WRITTEN');
    const m = readJson(manifestPathOf(f));
    expect(m.app.version).toBe('4.1.2');
    expect(m.app.iosBuild).toBe(34);
    expect(m.app.sourceCommit).toBe(f.webSha);
    expect(m.app.sourceTree).toBe(f.webTree);
    expect(m.app.eas.sourceCommit).toBe(f.webSha);
    expect(m.app.eas.profile).toBe('testflight');
    expect(m.web.syncMode).toBe('exact');
    expect(m.web.sourceCommit).toBe(f.webSha);
    expect(m.web.deployment.deployedCommit).toBe('UNPROVEN');
    expect(m.web.deployment.deploymentId).toBe('UNPROVEN');
    expect(m.web.deployment.liveIdentityMode).toBe('release-meta');
    expect(fs.readdirSync(path.join(f.repo, 'release')).filter((n) => n.includes('.tmp-'))).toEqual([]);
    expect(fs.readFileSync(renderedPathOf(f), 'utf8')).toContain('- Version: 4.1.2');
    const v = verify(f);
    expect(v.status).toBe(0);
    expect(v.stdout).toContain('LIVE IDENTITY: UNPROVEN');
  });

  it('re-running the identical finalization is idempotent (NO CHANGE, bytes identical)', () => {
    expect(finalize([...nextRelease(), '--write']).status).toBe(0);
    const first = fs.readFileSync(manifestPathOf(f), 'utf8');
    const again = finalize([...nextRelease(), '--write']);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('NO CHANGE');
    expect(fs.readFileSync(manifestPathOf(f), 'utf8')).toBe(first);
  });

  it('HARD GATE: a wrong EAS source SHA exits non-zero and leaves the state untouched', () => {
    const before = fs.readFileSync(manifestPathOf(f), 'utf8');
    const r = finalize(['--version', '4.1.2', '--build', '34', '--source-sha', f.webSha, '--eas-source-sha', f.orphanSha, '--write']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('RELEASE IDENTITY FAIL');
    expect(r.stdout).toContain(`INTENDED: ${f.webSha}`);
    expect(r.stdout).toContain(`EAS:      ${f.orphanSha}`);
    expect(r.stdout).toContain('CURRENT RELEASE STATE NOT UPDATED');
    expect(fs.readFileSync(manifestPathOf(f), 'utf8')).toBe(before);
  });

  it('never treats the local app.json buildNumber as the build number under remote version source', () => {
    const before = fs.readFileSync(manifestPathOf(f), 'utf8');
    const r = finalize(['--version', '4.1.2', '--source-sha', f.webSha, '--eas-source-sha', f.webSha, '--write']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('LOCAL BUILD NUMBER AUTHORITATIVE: NO');
    expect(r.stdout).toContain('BUILD NUMBER UNPROVEN');
    expect(r.stdout).toContain('NOT authoritative and was not used');
    expect(r.stdout).toContain('CURRENT RELEASE STATE NOT UPDATED');
    expect(fs.readFileSync(manifestPathOf(f), 'utf8')).toBe(before);
    expect(readJson(manifestPathOf(f)).app.iosBuild).toBe(33);
  });

  it('accepts a sanitized EAS evidence file, reads only identity keys, and never echoes other values', () => {
    const evidence = path.join(f.repo, 'eas-evidence.json');
    fs.writeFileSync(
      evidence,
      JSON.stringify({
        id: 'eas-build-0001',
        status: 'FINISHED',
        platform: 'IOS',
        gitCommitHash: f.webSha,
        buildProfile: 'testflight',
        createdAt: '2026-09-03T01:02:03.000Z',
        appVersion: '4.1.2',
        appBuildVersion: '34',
        artifacts: { buildUrl: 'https://example.invalid/artifact-DO-NOT-ECHO' },
        initiatingActor: { displayName: 'someone-DO-NOT-ECHO' },
      }),
    );
    const r = finalize(['--source-sha', f.webSha, '--evidence', evidence, '--write']);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain('DO-NOT-ECHO');
    const m = readJson(manifestPathOf(f));
    expect(m.app.iosBuild).toBe(34);
    expect(m.app.eas.buildId).toBe('eas-build-0001');
    expect(m.app.eas.status).toBe('FINISHED');
    expect(m.app.eas.createdAt).toBe('2026-09-03T01:02:03.000Z');
  });

  it('STOPs when the evidence file and flags disagree', () => {
    const evidence = path.join(f.repo, 'eas-evidence.json');
    fs.writeFileSync(evidence, JSON.stringify({ gitCommitHash: f.webSha, appBuildVersion: '34', appVersion: '4.1.2' }));
    const r = finalize(['--source-sha', f.webSha, '--evidence', evidence, '--build', '35', '--write']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('EVIDENCE CONFLICT');
    expect(readJson(manifestPathOf(f)).app.iosBuild).toBe(33);
  });

  it('refuses to write over a corrupt manifest and cleans an interrupted temp file', () => {
    const raw = fs.readFileSync(manifestPathOf(f), 'utf8');
    fs.writeFileSync(manifestPathOf(f), raw.slice(0, 40));
    const stale = path.join(f.repo, 'release', '.current.json.tmp-999-1');
    fs.writeFileSync(stale, '{ "half": ');
    const r = finalize([...nextRelease(), '--write']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('Removed stale temp file');
    expect(r.stdout).toContain('MANIFEST UNREADABLE');
    expect(r.stdout).toContain('git checkout -- release/current.json');
    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.readFileSync(manifestPathOf(f), 'utf8')).toBe(raw.slice(0, 40));
  });

  it('records an approved web-only descendant only with explicit approval', () => {
    const base = ['--version', '4.1.1', '--build', '33', '--source-sha', f.appSha, '--eas-source-sha', f.appSha, '--web-sync', 'web-only-descendant', '--web-source-sha', f.webSha, '--overlay-reason', 'web basemap repair', '--overlay-receipt', 'qa-reports/receipt.md'];
    const unapproved = finalize([...base, '--write']);
    expect(unapproved.status).toBe(1);
    expect(unapproved.stdout).toContain('overlay approval must be explicit');
    const approved = finalize([...base, '--overlay-approved', 'yes', '--write']);
    expect(approved.status).toBe(0);
    expect(approved.stdout).toContain('WEB SOURCE DIFFERS FROM IOS SOURCE');
    expect(approved.stdout).toContain('MODE: APPROVED WEB-ONLY DESCENDANT');
    const m = readJson(manifestPathOf(f));
    expect(m.web.syncMode).toBe('web-only-descendant');
    expect(m.web.overlay.approved).toBe(true);
    expect(m.web.deployment.deployedCommit).toBe('UNPROVEN');
    expect(verify(f).status).toBe(0);
  });

  it('records a verified production deployment, and rejects a deployment at the wrong SHA', () => {
    const wrong = finalize(['--target', 'web-deployment', '--deployment-id', 'dpl_wrong', '--deployed-sha', f.webSha, '--production-branch', 'release/app-fixture', '--write']);
    expect(wrong.status).toBe(1);
    expect(wrong.stdout).toContain('RELEASE IDENTITY FAIL');
    expect(wrong.stdout).toContain(`EXPECTED WEB SOURCE: ${f.appSha}`);
    expect(readJson(manifestPathOf(f)).web.deployment.deploymentId).toBe('dpl_fixture');

    const right = finalize(['--target', 'web-deployment', '--deployment-id', 'dpl_new', '--deployed-sha', f.appSha, '--production-branch', 'release/app-fixture', '--verified-at', '2026-09-03T00:00:00Z', '--write']);
    expect(right.status).toBe(0);
    expect(right.stdout).toContain('LIVE IDENTITY GATE: PASS');
    const m = readJson(manifestPathOf(f));
    expect(m.web.deployment.deploymentId).toBe('dpl_new');
    expect(m.web.deployment.verifiedAt).toBe('2026-09-03T00:00:00Z');
    expect(verify(f).status).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('release:web:verify-live', () => {
  let f: Fixture;
  beforeAll(() => {
    f = makeFixture();
  });
  afterAll(() => fs.rmSync(f.repo, { recursive: true, force: true }));

  const liveArgs = (url: string, extra: string[] = []) => ['--repo', f.repo, '--url', url, '--timeout-ms', '3000', ...extra];

  it('legacy Build 33: makes NO network request and reports the immutable receipt honestly', async () => {
    writeManifest(f, manifestFor(f, 'descendant')); // liveIdentityMode: legacy-triangulated
    const s = await serve((_req, res) => res.end('should never be called'));
    const r = await runAsync('verify-live-release.mjs', liveArgs(s.url));
    await s.close();
    expect(r.status).toBe(0);
    expect(s.requests).toHaveLength(0);
    expect(r.stdout).toContain('BUILD 33 LIVE IDENTITY: LEGACY VERIFIED BY IMMUTABLE DEPLOYMENT RECEIPT');
    expect(r.stdout).toContain('Automated release-meta endpoint: NOT AVAILABLE FOR BUILD 33');
    expect(r.stdout).toContain('LIVE VERIFY: RECORDED (legacy receipt; live network state not checked by this run)');
    expect(r.stdout).not.toMatch(/LIVE RELEASE IDENTITY: PASS/);
    expect(r.stdout).toContain(EXPERIENCE_LINE);
  });

  it('legacy + --require-release-meta fails clearly when the endpoint does not exist', async () => {
    writeManifest(f, manifestFor(f, 'descendant'));
    const s = await serve((_req, res) => {
      res.statusCode = 404;
      res.end('not found');
    });
    const r = await runAsync('verify-live-release.mjs', liveArgs(s.url, ['--require-release-meta']));
    await s.close();
    expect(r.status).toBe(1);
    expect(s.requests).toHaveLength(1);
    expect(r.stdout).toContain('HTTP 404');
    expect(r.stdout).toContain('LIVE RELEASE IDENTITY FAIL');
  });

  function releaseMetaManifest(): Manifest {
    const m = manifestFor(f, 'exact');
    m.web.deployment.liveIdentityMode = 'release-meta';
    return m;
  }

  it('PASSes when the live artifact matches, using cache-busting and no-cache headers', async () => {
    writeManifest(f, releaseMetaManifest());
    const s = await serve((_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify(releaseMeta(f)));
    });
    const r = await runAsync('verify-live-release.mjs', liveArgs(s.url));
    await s.close();
    expect(r.status).toBe(0);
    expect(s.requests).toHaveLength(1);
    expect(s.requests[0]!.url).toMatch(/\/release-meta\.json\?nocache=[a-z0-9]+$/);
    expect(String(s.requests[0]!.headers['cache-control'])).toContain('no-cache');
    expect(String(s.requests[0]!.headers.pragma)).toBe('no-cache');
    expect(r.stdout).toContain('LIVE RELEASE IDENTITY: PASS');
    expect(r.stdout).toContain(EXPERIENCE_LINE);
    expect(r.stdout).not.toMatch(/EXPERIENCE:\s*PASS/i);
  });

  it('FAILs with EXPECTED/OBSERVED when the live SHA is stale', async () => {
    writeManifest(f, releaseMetaManifest());
    const s = await serve((_req, res) => res.end(JSON.stringify(releaseMeta(f, { webSourceCommit: f.baseSha, webSourceTree: null }))));
    const r = await runAsync('verify-live-release.mjs', liveArgs(s.url));
    await s.close();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('LIVE RELEASE IDENTITY FAIL');
    expect(r.stdout).toContain(`EXPECTED: commit ${f.appSha}`);
    expect(r.stdout).toContain(`commit ${f.baseSha}`);
    expect(r.stdout).toContain('IDENTITY MISMATCH');
  });

  it('FAILs on a mismatched tree or version even when the commit matches', async () => {
    writeManifest(f, releaseMetaManifest());
    const s = await serve((_req, res) => res.end(JSON.stringify(releaseMeta(f, { webSourceTree: f.webTree, appVersion: '9.9.9' }))));
    const r = await runAsync('verify-live-release.mjs', liveArgs(s.url));
    await s.close();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('webSourceTree');
    expect(r.stdout).toContain('appVersion 9.9.9');
  });

  it('FAILs on a malformed live artifact', async () => {
    writeManifest(f, releaseMetaManifest());
    const s = await serve((_req, res) => res.end('<html>not json</html>'));
    const bad = await runAsync('verify-live-release.mjs', liveArgs(s.url));
    await s.close();
    expect(bad.status).toBe(1);
    expect(bad.stdout).toContain('MALFORMED release-meta.json');

    const s2 = await serve((_req, res) => res.end(JSON.stringify({ schemaVersion: 1, product: 'Flagstone' })));
    const shape = await runAsync('verify-live-release.mjs', liveArgs(s2.url));
    await s2.close();
    expect(shape.status).toBe(1);
    expect(shape.stdout).toContain('webSourceCommit must be a full 40-hex SHA');
  });

  it('times out clearly instead of hanging', async () => {
    writeManifest(f, releaseMetaManifest());
    const s = await serve(() => {
      /* never respond */
    });
    const r = await runAsync('verify-live-release.mjs', ['--repo', f.repo, '--url', s.url, '--timeout-ms', '300']);
    await s.close();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('TIMEOUT after 300 ms');
  });

  it('checks every URL and fails if any domain serves the wrong source', async () => {
    writeManifest(f, releaseMetaManifest());
    const good = await serve((_req, res) => res.end(JSON.stringify(releaseMeta(f))));
    const stale = await serve((_req, res) => res.end(JSON.stringify(releaseMeta(f, { webSourceCommit: f.baseSha, webSourceTree: null }))));
    const r = await runAsync('verify-live-release.mjs', ['--repo', f.repo, '--url', good.url, '--url', stale.url, '--timeout-ms', '3000']);
    await good.close();
    await stale.close();
    expect(r.status).toBe(1);
    expect(good.requests).toHaveLength(1);
    expect(stale.requests).toHaveLength(1);
    expect(r.stdout).toContain('LIVE RELEASE IDENTITY FAIL');
  });
});

// ---------------------------------------------------------------------------

describe('release:meta (future artifact generator)', () => {
  let f: Fixture;
  beforeAll(() => {
    f = makeFixture();
    // A manifest that claims a DIFFERENT web source than HEAD: the generator
    // must ignore it and report the actual checked-out commit.
    const m = manifestFor(f, 'exact');
    m.web.sourceCommit = f.baseSha;
    write(f.repo, 'release/current.json', `${JSON.stringify(m, null, 2)}\n`);
  });
  afterAll(() => fs.rmSync(f.repo, { recursive: true, force: true }));

  const SECRETS = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://leak-DO-NOT-EMIT.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_DO-NOT-EMIT',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_DO-NOT-EMIT',
    EAS_TOKEN: 'eas-token-DO-NOT-EMIT',
    EXPO_APPLE_PASSWORD: 'placeholder-DO-NOT-EMIT',
  };

  it('reports the ACTUAL checked-out commit and tree, never the manifest value, and only the documented keys', () => {
    const r = run('release-meta.mjs', ['--repo', f.repo], { env: SECRETS });
    expect(r.status).toBe(0);
    const meta = JSON.parse(r.stdout);
    expect(Object.keys(meta)).toEqual(['schemaVersion', 'product', 'appVersion', 'iosBuild', 'webSourceCommit', 'webSourceTree', 'builtAt']);
    expect(meta.webSourceCommit).toBe(f.appSha); // HEAD of main
    expect(meta.webSourceCommit).not.toBe(f.baseSha); // what the manifest claimed
    expect(meta.webSourceTree).toBe(f.appTree);
    expect(meta.appVersion).toBe('4.1.1');
    expect(meta.iosBuild).toBeNull(); // app.json says 15 — deliberately not used
    expect(meta.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(r.out).not.toContain('DO-NOT-EMIT');
  });

  it('takes iosBuild only from an explicit nonsecret input and writes atomically to --out', () => {
    const out = path.join(f.repo, 'dist', 'release-meta.json');
    const r = run('release-meta.mjs', ['--repo', f.repo, '--ios-build', '34', '--out', out], { env: SECRETS });
    expect(r.status).toBe(0);
    const meta = readJson(out);
    expect(meta.iosBuild).toBe(34);
    expect(fs.readdirSync(path.dirname(out)).filter((n) => n.includes('.tmp-'))).toEqual([]);
    expect(run('release-meta.mjs', ['--repo', f.repo, '--ios-build', 'thirty-four']).status).toBe(1);
    expect(r.out).not.toContain('DO-NOT-EMIT');
  });

  it('fails instead of guessing when Git HEAD and the build provider disagree', () => {
    const r = run('release-meta.mjs', ['--repo', f.repo], { env: { VERCEL_GIT_COMMIT_SHA: f.baseSha } });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('BUILD SOURCE CONFLICT');
    const agree = run('release-meta.mjs', ['--repo', f.repo], { env: { VERCEL_GIT_COMMIT_SHA: f.appSha } });
    expect(agree.status).toBe(0);
  });

  it('falls back to the build provider SHA (tree null) when there is no .git directory, and fails with neither', () => {
    const plain = tmpDir('nogit');
    write(plain, 'app.json', JSON.stringify({ expo: { version: '4.1.1', ios: { buildNumber: '15' } } }));
    const withProvider = run('release-meta.mjs', ['--repo', plain], { env: { VERCEL_GIT_COMMIT_SHA: f.appSha } });
    expect(withProvider.status).toBe(0);
    const meta = JSON.parse(withProvider.stdout);
    expect(meta.webSourceCommit).toBe(f.appSha);
    expect(meta.webSourceTree).toBeNull();
    const without = run('release-meta.mjs', ['--repo', plain]);
    expect(without.status).toBe(1);
    expect(without.stderr).toContain('cannot determine the actual build source');
    fs.rmSync(plain, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------

describe('reference schema', () => {
  it('release/schema.json parses and agrees with the enforced enums', () => {
    const schema = readJson(path.resolve(SCRIPTS_DIR, '..', 'release', 'schema.json'));
    expect(schema.properties.schemaVersion.const).toBe(2);
    expect(schema.properties.web.properties.syncMode.enum).toEqual(['exact', 'web-only-descendant']);
    expect(schema.properties.web.properties.deployment.properties.liveIdentityMode.enum).toEqual(['legacy-triangulated', 'release-meta']);
    expect(schema.properties.governance.properties.releaseCodeIntegration.enum).toEqual(['deferred', 'converged']);
    expect(schema.properties.app.properties.eas.properties.versionSource.enum).toEqual(['remote', 'local']);
  });
});
