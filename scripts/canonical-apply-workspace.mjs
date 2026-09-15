#!/usr/bin/env node
/**
 * STAGE-BLOCK-03 — the end-to-end canonical apply workflow.
 *
 * THE PROBLEM
 * `supabase db push` is the only mechanism that records a migration under its own
 * canonical version, and it reads `supabase/migrations/`. Every Phase 02/03A
 * candidate lives in `supabase/migrations-next/`, whose README says plainly:
 *
 *     Do not use an unfiltered migration push or promote this directory into
 *     applied migration history.
 *
 * So the authorized mechanism had no executable path to the candidates, and the
 * first staging run filled that gap with two mechanisms that destroyed migration
 * identity: a Management API apply that substituted the wall-clock time, and
 * `db query --file`, which recorded nothing at all.
 *
 * THE MECHANISM
 * `--workdir` is a GLOBAL flag of the installed CLI (2.116.0):
 *
 *     --workdir string    path to a Supabase project directory
 *
 * Proven empirically before anything here depended on it: a workspace holding one
 * marker migration made `supabase migration list --workdir <ws>` report exactly
 * that marker as local, against 82 real remote rows. The CLI reads the workspace,
 * not the repository.
 *
 * So we materialize a TRANSIENT workspace holding the applied baseline plus exactly
 * the approved artifacts, under their own canonical filenames, and push THAT.
 *
 *   - `supabase/migrations/` in the repo is never written to;
 *   - `migrations-next/` governance is untouched -- nothing is promoted;
 *   - every file is bound to its accepted hash before it is materialized;
 *   - the workspace is destroyed once receipts are taken.
 *
 * WHY THE BASELINE MUST BE PRESENT
 * `db push` pre-flights local/remote parity and refuses if the remote holds a
 * version with no local file. The baseline is what the target has already applied.
 * This is also exactly why the contaminated branch is unusable: eleven of its rows
 * are fabricated versions that no honest local tree can ever contain.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalIdentity, planApply, assertUnambiguousTarget, assertTargetToken,
         PROJECT_REF_PATTERN, PRODUCTION_PROJECT_REF } from './canonical-migration-identity.mjs';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// DISPOSABLE-WORKSPACE IDENTITY
//
// 2026-09-11 incident: destroyWorkspace's only guard was "does <ws>/supabase/
// config.toml exist". Every AccessMap worktree root satisfies that, because
// config.toml is APPLICATION CONTENT, not workspace identity. A regression test
// that called destroyWorkspace(repoRoot) expecting a refusal deleted six working
// trees instead -- four under ~/AccessMap*, one under /private/tmp, and finally
// the Phase 03A checkpoint-bank worktree. Committed objects survived; nothing
// else did.
//
// Identity is now something a repository cannot accidentally have:
//   - the directory is created by US, by mkdtemp, directly inside the real
//     temp root, under a prefix nobody else uses;
//   - it carries a marker file naming the type and schema version.
// Both must hold, and the resolved path must still sit where we put it, before
// one byte is removed. Every check fails closed.
// ---------------------------------------------------------------------------
export const WORKSPACE_PREFIX = 'flagstone-p03a-apply-';
export const WORKSPACE_MARKER = '.p03a-workspace';
export const WORKSPACE_MARKER_TYPE = 'flagstone-p03a-apply-workspace';
export const WORKSPACE_MARKER_VERSION = 1;

/**
 * The real temp root. os.tmpdir() is itself a symlink on macOS (/var -> /private/var).
 *
 * Review 2026-09-11 MUST-FIX 2: this used to trust os.tmpdir() -- i.e. $TMPDIR --
 * unconditionally, and TMPDIR is an ordinary environment variable. With
 * TMPDIR=$HOME set, createWorkspaceDir() put a workspace directly in the user's
 * home directory and inspectWorkspaceForDestruction() green-lit removing it. The
 * blast radius was bounded (only a directory this module itself mkdtemp'd, carrying
 * a valid marker, can ever be removed) but the stated invariant -- home, cwd and
 * repositories are never touched -- was resting on an environment variable.
 *
 * A temp root that lives inside the home directory, inside a git repository, or at
 * the filesystem root is refused outright. The refusal names TMPDIR, because a
 * misconfigured environment is the realistic cause and the operator needs to know
 * what to change.
 */
function tmpRoot() {
  const resolved = fs.realpathSync(os.tmpdir());
  const home = safeReal(os.homedir());
  const fsRoot = path.parse(resolved).root;

  if (resolved === fsRoot) {
    throw new Error(`Refusing to use the filesystem root as the temp root (TMPDIR=${os.tmpdir()}).`);
  }
  if (resolved === home || withinDir(home, resolved)) {
    throw new Error(
      `Refusing a temp root inside the home directory: ${resolved} (TMPDIR=${os.tmpdir()}). ` +
      `Disposable workspaces must live in real ephemeral storage, not under $HOME.`,
    );
  }
  // Walk up: a temp root anywhere inside a git repository would put disposable
  // workspaces inside someone's working tree.
  for (let dir = resolved; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      throw new Error(
        `Refusing a temp root inside a git repository (${dir}): ${resolved} (TMPDIR=${os.tmpdir()}).`,
      );
    }
    if (dir === path.dirname(dir)) break;
  }
  return resolved;
}

/** True when `child` is strictly inside `parent`, path-segment-wise. */
function withinDir(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Create a disposable workspace: mkdtemp directly under the real temp root, with
 * our prefix, carrying the marker. This is the ONLY way a workspace is made --
 * there is deliberately no caller-supplied output directory any more, because a
 * caller-supplied directory is exactly how the repository root got passed in.
 */
export function createWorkspaceDir({ projectId = 'accessmap' } = {}) {
  const ws = fs.mkdtempSync(path.join(tmpRoot(), WORKSPACE_PREFIX));
  fs.writeFileSync(path.join(ws, WORKSPACE_MARKER), `${JSON.stringify({
    type: WORKSPACE_MARKER_TYPE,
    markerVersion: WORKSPACE_MARKER_VERSION,
    createdBy: 'scripts/canonical-apply-workspace.mjs',
    createdAt: new Date().toISOString(),
    pid: process.pid,
  }, null, 2)}\n`);
  fs.mkdirSync(path.join(ws, 'supabase', 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'supabase', 'config.toml'), `project_id = "${projectId}"\n`);
  return ws;
}

/**
 * Decide whether a path may be recursively removed -- WITHOUT removing anything.
 *
 * Exported and pure on purpose: it is how the regression suite interrogates the
 * guard about genuinely dangerous paths (/, $HOME, cwd, a live git worktree)
 * without ever handing one of them to the destructive call. A test must never
 * have to risk a real tree to prove a refusal.
 *
 * Returns { ok, resolved, refusals[] }. ok === true only when every check passed.
 */
export function inspectWorkspaceForDestruction(ws) {
  const refusals = [];
  const no = (r) => { refusals.push(r); return { ok: false, resolved: null, refusals }; };

  if (typeof ws !== 'string' || ws.trim() === '') return no('path is empty or not a string');
  if (!path.isAbsolute(ws)) return no(`path is not absolute: ${ws}`);

  // The entry itself must be a real directory, never a symlink: a symlink named
  // like a workspace is the obvious way to aim the delete somewhere else.
  let lst;
  try { lst = fs.lstatSync(ws); } catch { return no(`path does not exist: ${ws}`); }
  if (lst.isSymbolicLink()) return no(`path is a symlink: ${ws}`);
  if (!lst.isDirectory()) return no(`path is not a directory: ${ws}`);

  // Canonicalize AFTER the symlink check, so ".." traversal and any indirection
  // in the parent chain are resolved before we decide where this really is.
  let resolved;
  try { resolved = fs.realpathSync(ws); } catch { return no(`path cannot be resolved: ${ws}`); }

  let root;
  try { root = tmpRoot(); } catch { return no('temp root cannot be resolved'); }

  // Never-touch list. These are all outside the temp root anyway -- they are
  // named explicitly so a refusal says WHY, and so a future change to the
  // location rule cannot silently expose them.
  const protectedPaths = new Map([
    [path.parse(resolved).root, 'filesystem root'],
    [root, 'the temp root itself'],
    [safeReal(os.homedir()), 'home directory'],
    [safeCwd(), 'current working directory'],
    [safeReal(path.resolve(moduleDir(), '..')), 'this repository root'],
  ]);
  const hit = protectedPaths.get(resolved);
  if (hit) return no(`refusing to remove ${hit}: ${resolved}`);

  // A git repository or worktree root always carries a .git entry (a directory in
  // a primary checkout, a file in a linked worktree). A disposable workspace never
  // does. This is the check that would have stopped the incident outright.
  if (fs.existsSync(path.join(resolved, '.git'))) {
    return no(`refusing to remove a git repository or worktree: ${resolved}`);
  }

  // Location: created by us, where we create them, named how we name them.
  if (path.dirname(resolved) !== root) {
    return no(`outside the disposable workspace root ${root}: ${resolved}`);
  }
  if (!path.basename(resolved).startsWith(WORKSPACE_PREFIX)) {
    return no(`name does not carry the workspace prefix ${WORKSPACE_PREFIX}: ${path.basename(resolved)}`);
  }

  // Marker: must be a real file (not a symlink to one), parse, and self-identify.
  const marker = path.join(resolved, WORKSPACE_MARKER);
  let ms;
  try { ms = fs.lstatSync(marker); } catch { return no(`missing marker ${WORKSPACE_MARKER}`); }
  if (!ms.isFile()) return no(`marker ${WORKSPACE_MARKER} is not a regular file`);
  let meta;
  try { meta = JSON.parse(fs.readFileSync(marker, 'utf8')); } catch { return no(`marker ${WORKSPACE_MARKER} does not parse`); }
  if (!meta || typeof meta !== 'object') return no('marker is not an object');
  if (meta.type !== WORKSPACE_MARKER_TYPE) return no(`marker type ${JSON.stringify(meta.type)} !== ${WORKSPACE_MARKER_TYPE}`);
  if (meta.markerVersion !== WORKSPACE_MARKER_VERSION) {
    return no(`marker version ${JSON.stringify(meta.markerVersion)} !== ${WORKSPACE_MARKER_VERSION}`);
  }

  // Shape, checked last: a workspace we built holds the materialization dir.
  if (!fs.existsSync(path.join(resolved, 'supabase', 'migrations'))) {
    return no('does not have the generated workspace shape (supabase/migrations)');
  }

  return { ok: true, resolved, refusals };
}

function safeReal(p) { try { return fs.realpathSync(p); } catch { return p; } }
// process.cwd() throws if the directory was removed underneath us -- which is
// precisely the situation this guard exists to prevent recurring.
function safeCwd() { try { return safeReal(process.cwd()); } catch { return '\u0000none'; } }
function moduleDir() { return path.dirname(new URL(import.meta.url).pathname); }

const sqlFiles = (dir) => fs.readdirSync(dir).filter((f) => /^\d{14}_.*\.sql$/.test(f));

/** Versions already applied to the target, read from the repo's canonical history. */
export function baselineVersions(baselineDir) {
  return sqlFiles(baselineDir).map((f) => canonicalIdentity(f).version).sort();
}

/**
 * Every version that may legitimately appear in a remote ledger: the applied
 * baseline, the declared adoption artifacts, and every declared candidate of BOTH
 * stages. Stage B is included deliberately -- a target that has already had the
 * cutover applied is not a phantom, it is simply further ahead than this plan.
 */
export function knownLocalVersions({ baselineDir, declared = [], adoptionDeclared = [] }) {
  const v = new Set(baselineVersions(baselineDir));
  for (const a of adoptionDeclared) { try { v.add(canonicalIdentity(a.file).version); } catch { /* reported elsewhere */ } }
  for (const d of declared) { try { v.add(canonicalIdentity(d.file).version); } catch { /* reported elsewhere */ } }
  return [...v].sort();
}

/**
 * Materialize the transient apply workspace. Refuses before writing anything if the
 * plan is refused, so a poisoned ledger cannot produce a workspace, let alone a
 * command.
 */
export function buildWorkspace({
  baselineDir, adoptionDir = null, candidateDir, declared, adoptionDeclared = [],
  ledger = [], stage = 'A', projectId = 'accessmap',
}) {
  const known = knownLocalVersions({ baselineDir, declared, adoptionDeclared });
  const planned = planApply({ dir: candidateDir, declared, ledger, stage, knownLocalVersions: known });
  if (!planned.ok) {
    return { ok: false, refusals: planned.refusals, workspace: null, materialized: [], ledgerAudit: planned.ledgerAudit };
  }

  // Always ours, always disposable, always marked. No caller-supplied directory.
  const ws = createWorkspaceDir({ projectId });
  const migDir = path.join(ws, 'supabase', 'migrations');
  const bail = (refusals) => {
    destroyWorkspace(ws);
    return { ok: false, refusals, workspace: null, materialized: [], ledgerAudit: planned.ledgerAudit };
  };

  const materialized = [];
  const copy = (fromDir, file, role) => {
    const bytes = fs.readFileSync(path.join(fromDir, file));
    // Canonical filename preserved exactly. No renaming, ever -- renaming is how
    // 20260904000000 became 20260910161947.
    fs.writeFileSync(path.join(migDir, file), bytes);
    materialized.push({ file, role, version: canonicalIdentity(file).version, sha256: sha256(bytes) });
  };

  for (const f of sqlFiles(baselineDir)) copy(baselineDir, f, 'baseline');

  if (adoptionDir && fs.existsSync(adoptionDir)) {
    const declaredSha = new Map(adoptionDeclared.map((a) => [a.file, a.sha256]));
    const refusals = [];
    for (const f of sqlFiles(adoptionDir)) {
      const want = declaredSha.get(f);
      // An adoption artifact nobody declared is an artifact nobody accepted.
      if (!want) { refusals.push(`${f}: present in the adoption directory but undeclared`); continue; }
      const actual = sha256(fs.readFileSync(path.join(adoptionDir, f)));
      if (actual !== want) {
        refusals.push(`${f}: adoption hash mismatch (declared ${want.slice(0, 12)}, on disk ${actual.slice(0, 12)})`);
        continue;
      }
      copy(adoptionDir, f, 'adoption');
    }
    if (refusals.length) return bail(refusals);
  }

  const bindingFailures = [];
  for (const p of planned.plan) {
    const bytes = fs.readFileSync(path.join(candidateDir, p.file));
    const actual = sha256(bytes);
    // Bind to the ACCEPTED hash at materialization time, not only at plan time.
    // Between plan and copy is exactly where a substitution would hide.
    if (actual !== p.sha256) {
      bindingFailures.push(`${p.file}: hash changed between plan and materialize (${p.sha256.slice(0, 12)} -> ${actual.slice(0, 12)})`);
      continue;
    }
    fs.writeFileSync(path.join(migDir, p.file), bytes);
    materialized.push({ file: p.file, role: 'candidate', version: p.version, sha256: actual });
  }
  if (bindingFailures.length) return bail(bindingFailures);

  const present = new Set(fs.readdirSync(migDir));
  const missing = planned.plan.filter((p) => !present.has(p.file)).map((p) => p.file);
  if (missing.length) return bail([`materialization incomplete: ${missing.join(', ')}`]);

  materialized.sort((a, b) => a.version.localeCompare(b.version));

  // WHAT `db push` WOULD ACTUALLY DO. The plan covers this manifest's candidates,
  // but push applies EVERY workspace file absent from the ledger. If those two sets
  // disagree the plan describes a different operation than the one that runs --
  // the same shape of defect that made planApply's ok:true meaningless. Every
  // pending file must be an artifact somebody declared and whose hash we bound.
  const ledgerVersions = new Set((ledger ?? []).map((r) => r.version));
  const wouldPush = materialized.filter((m) => !ledgerVersions.has(m.version));
  const accounted = new Set([
    ...planned.plan.map((p) => p.version),
    ...materialized.filter((m) => m.role === 'adoption').map((m) => m.version),
  ]);
  const unaccounted = wouldPush.filter((m) => !accounted.has(m.version));
  if (unaccounted.length) {
    return bail(unaccounted.map((m) => `${m.file} would be pushed but is declared by nothing (role ${m.role})`));
  }

  return {
    ok: true, refusals: [], workspace: ws, migrationsDir: migDir,
    plan: planned.plan, materialized, wouldPush,
    counts: {
      baseline: materialized.filter((m) => m.role === 'baseline').length,
      adoption: materialized.filter((m) => m.role === 'adoption').length,
      candidate: materialized.filter((m) => m.role === 'candidate').length,
      total: materialized.length,
    },
    ledgerAudit: planned.ledgerAudit,
  };
}

/** The dry-run and apply commands for a materialized workspace. One target authority. */
export function workspaceCommands({ workspace, projectRef }) {
  if (!workspace) throw new Error('workspace is required');
  // Validate the VALUES before the production compare, for the same reason
  // supportedApplyCommand does: `===` against an unvalidated string that is then
  // joined into a shell line is not a target check. Measured on this very
  // function -- projectRef "kldlwszpfkdmsjrjhjym " (one trailing space) produced
  // an executable production apply command. This is the entry point the staging
  // packet uses, so it mattered more here than anywhere else.
  assertTargetToken('projectRef', projectRef, { pattern: PROJECT_REF_PATTERN });
  assertTargetToken('workspace', workspace);
  if (projectRef === PRODUCTION_PROJECT_REF) {
    throw new Error(`Refusing to build a staging command targeting production ${PRODUCTION_PROJECT_REF}.`);
  }
  const base = ['supabase', 'db', 'push', '--workdir', workspace, '--project-ref', projectRef];
  assertUnambiguousTarget(base);
  return {
    dryRun: [...base, '--dry-run'].join(' '),
    apply: base.join(' '),
    // argv is the authority for anyone who executes; the strings are for runbooks.
    dryRunArgv: [...base, '--dry-run'],
    applyArgv: [...base],
  };
}

/**
 * Build the only production-capable command this source is allowed to expose:
 * a dry-run with Vault updates disabled. There is deliberately no apply string,
 * apply argv, flag, token, or override in this return value.
 */
export function productionPlanCommand({ workspace, projectRef }) {
  assertTargetToken('workspace', workspace);
  assertTargetToken('projectRef', projectRef, { pattern: PROJECT_REF_PATTERN });
  if (projectRef !== PRODUCTION_PROJECT_REF) {
    throw new Error(
      `Production plan target must be exactly ${PRODUCTION_PROJECT_REF}; received ${projectRef}.`,
    );
  }
  const dryRunArgv = [
    'supabase', 'db', 'push', '--workdir', workspace,
    '--project-ref', projectRef, '--dry-run', '--skip-vault',
  ];
  assertUnambiguousTarget(dryRunArgv);
  return Object.freeze({
    mode: 'PRODUCTION_PLAN_ONLY',
    target: projectRef,
    nonMutating: true,
    applyAvailable: false,
    dryRunArgv: Object.freeze(dryRunArgv),
    dryRun: dryRunArgv.join(' '),
  });
}

const exactHex = (name, value, length) => {
  if (typeof value !== 'string' || !new RegExp(`^[0-9a-f]{${length}}$`).test(value)) {
    throw new Error(`${name} must be exactly ${length} lowercase hexadecimal characters.`);
  }
  return value;
};

/**
 * Validate the retained production evidence before any transient workspace is
 * created. "Candidate/object mismatch" is a first-class refusal: absent ledger
 * rows alone never establish that adoption SQL is a no-op against real objects.
 */
export function validateProductionPlanEvidence({
  projectRef, evidence, evidenceSha256, actualEvidenceSha256,
  ledger, sourceHead, sourceTree, evidenceSourceAncestor,
}) {
  const refusals = [];
  try { assertTargetToken('projectRef', projectRef, { pattern: PROJECT_REF_PATTERN }); }
  catch (e) { refusals.push(e.message); }
  if (projectRef !== PRODUCTION_PROJECT_REF) {
    refusals.push(`production plan requires exact project ref ${PRODUCTION_PROJECT_REF}`);
  }
  try { exactHex('evidenceSha256', evidenceSha256, 64); }
  catch (e) { refusals.push(e.message); }
  if (evidenceSha256 !== actualEvidenceSha256) {
    refusals.push('production evidence hash mismatch');
  }
  if (!evidence || typeof evidence !== 'object') {
    refusals.push('production evidence is missing or not an object');
    return { ok: false, refusals };
  }
  if (evidence.targetProjectRef !== projectRef) {
    refusals.push('production evidence target does not match the explicit project ref');
  }
  try {
    exactHex('sourceHead', sourceHead, 40);
    exactHex('sourceTree', sourceTree, 40);
    exactHex('evidence source SHA', evidence.sourceIdentity?.currentSha, 40);
    exactHex('evidence source tree', evidence.sourceIdentity?.currentTree, 40);
  }
  catch (e) { refusals.push(e.message); }
  if (evidenceSourceAncestor !== true) {
    refusals.push('production evidence source is not an exact verified ancestor of the current source');
  }
  const contract = evidence.productionPreApplyContract;
  if (contract?.exactAcceptedComparatorMatch !== true) {
    refusals.push('candidate/object mismatch: exact accepted production comparator match is not proven');
  }
  for (const [name, value] of [
    ['canonicalCatalogSha256', contract?.canonicalCatalogSha256],
    ['structuralCatalogSha256', contract?.structuralCatalogSha256],
    ['ledgerOrderedSha256', contract?.ledgerOrderedSha256],
  ]) {
    try { exactHex(name, value, 64); } catch (e) { refusals.push(e.message); }
  }
  if (!Array.isArray(ledger)) {
    refusals.push('production ledger must be an array');
  } else {
    if (contract?.ledgerRows !== ledger.length) {
      refusals.push(`production evidence says ${contract?.ledgerRows} ledger rows but capture has ${ledger.length}`);
    }
    const latest = ledger.length ? [...ledger].sort((a, b) => a.version.localeCompare(b.version)).at(-1)?.version : null;
    if (contract?.ledgerLatest !== latest) {
      refusals.push(`production evidence latest version ${contract?.ledgerLatest} does not match capture ${latest}`);
    }
  }
  if (evidence.stageB?.included !== false) {
    refusals.push('Stage B must be explicitly excluded from a production plan');
  }
  if (!Array.isArray(evidence.entries) || evidence.entries.length === 0) {
    refusals.push('production evidence has no pending migration entries');
  } else {
    if (evidence.pendingCount !== evidence.entries.length) {
      refusals.push(`production evidence pending count ${evidence.pendingCount} does not match ${evidence.entries.length} entries`);
    }
    const versions = new Set();
    for (const entry of evidence.entries) {
      if (entry.stage !== 'A') refusals.push(`${entry.file ?? '<unknown>'}: non-Stage-A entry in production plan`);
      if (entry.file === evidence.stageB?.file || /stage_b_cutover/i.test(entry.file ?? '')) {
        refusals.push(`${entry.file}: Stage B leaked into the production plan`);
      }
      if (/_(?:restore|reapply)_/i.test(entry.file ?? '')) {
        refusals.push(`${entry.file}: recovery file leaked into the initial production plan`);
      }
      try {
        const id = canonicalIdentity(entry.file);
        if (entry.version !== id.version) refusals.push(`${entry.file}: evidence version does not match filename`);
        if (versions.has(id.version)) refusals.push(`${entry.file}: duplicate evidence version ${id.version}`);
        versions.add(id.version);
        exactHex(`${entry.file} sha256`, entry.sha256, 64);
      } catch (e) { refusals.push(e.message); }
    }
  }
  return { ok: refusals.length === 0, refusals };
}

/**
 * Materialize and bind a production PLAN. This function performs local file IO
 * only. It never starts the Supabase CLI and never returns an apply command.
 */
export function buildProductionPlan({
  baselineDir, adoptionDir, candidateDir, declared, adoptionDeclared,
  ledger, evidence, evidenceSha256, actualEvidenceSha256,
  projectRef, sourceHead, sourceTree, evidenceSourceAncestor, projectId = 'accessmap',
}) {
  const validated = validateProductionPlanEvidence({
    projectRef, evidence, evidenceSha256, actualEvidenceSha256,
    ledger, sourceHead, sourceTree, evidenceSourceAncestor,
  });
  if (!validated.ok) {
    return { ok: false, refusals: validated.refusals, workspace: null, plan: [], command: null };
  }
  const built = buildWorkspace({
    baselineDir, adoptionDir, candidateDir, declared, adoptionDeclared,
    ledger, stage: 'A', projectId,
  });
  if (!built.ok) return { ...built, plan: [], command: null };

  const expected = evidence.entries;
  const actual = built.wouldPush;
  const mismatches = [];
  if (expected.length !== actual.length) {
    mismatches.push(`evidence declares ${expected.length} pending files but workspace would push ${actual.length}`);
  }
  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    const want = expected[i];
    const got = actual[i];
    if (!want || !got || want.file !== got.file || want.version !== got.version || want.sha256 !== got.sha256) {
      mismatches.push(`pending entry ${i + 1} does not exactly match the evidence manifest`);
    }
  }
  if (mismatches.length) {
    destroyWorkspace(built.workspace);
    return { ok: false, refusals: mismatches, workspace: null, plan: [], command: null };
  }

  const command = productionPlanCommand({ workspace: built.workspace, projectRef });
  return {
    ok: true,
    refusals: [],
    workspace: built.workspace,
    plan: actual,
    counts: built.counts,
    ledgerAudit: built.ledgerAudit,
    command,
    sourceIdentity: { head: sourceHead, tree: sourceTree },
    productionApplyAvailable: false,
  };
}

/**
 * Post-apply verification semantics: after a real apply every pushed artifact must
 * appear exactly once under its own canonical version. Read-only; mutates nothing.
 */
export function expectedLedgerAfterApply({ ledgerBefore = [], wouldPush = [] }) {
  return [...ledgerBefore, ...wouldPush.map((m) => ({ version: m.version, name: canonicalIdentity(m.file).name }))]
    .sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Remove a disposable workspace. Fails closed: if the guard is not unanimously
 * satisfied, NOTHING is removed and false is returned. There is no force path,
 * no best-effort path, and no caller-supplied override.
 */
export function destroyWorkspace(ws) {
  const verdict = inspectWorkspaceForDestruction(ws);
  if (!verdict.ok) return false;
  fs.rmSync(verdict.resolved, { recursive: true, force: true });
  return true;
}

// ---------------------------------------------------------------------------
// CLI
//   node scripts/canonical-apply-workspace.mjs build   --ledger <f.json> [--stage A|B]
//   node scripts/canonical-apply-workspace.mjs command --workspace <dir> --project-ref <ref>
//   node scripts/canonical-apply-workspace.mjs production-plan --ledger <f.json> --evidence <f.json>
//        --evidence-sha256 <sha256> --project-ref <ref> --release-sha <sha> --release-tree <tree>
//   node scripts/canonical-apply-workspace.mjs destroy --workspace <dir>
// Obtain the ledger READ-ONLY, e.g.
//   supabase db query --linked --project-ref <ref> "select version,name from supabase_migrations.schema_migrations order by version"
// This tool never connects to a database and never applies anything.
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flag = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
  const root = process.cwd();
  const baselineDir = path.join(root, flag('baseline', 'supabase/migrations'));
  const adoptionDir = path.join(root, flag('adoption', 'supabase/migrations-next'));
  const candidateDir = path.join(root, flag('candidates', 'supabase/migrations-next/phase03a'));

  if (cmd === 'production-plan') {
    const valueFlags = new Set([
      '--ledger', '--evidence', '--evidence-sha256', '--project-ref', '--release-sha', '--release-tree',
      '--baseline', '--adoption', '--candidates',
    ]);
    const forbidden = new Set(['--apply', '--linked', '--local', '--db-url', '--stage']);
    const seen = new Set();
    for (let i = 1; i < argv.length; i++) {
      const token = argv[i];
      if (forbidden.has(token)) {
        console.error(`ERROR: ${token} is prohibited in production plan-only mode.`);
        process.exit(2);
      }
      if (!valueFlags.has(token)) {
        console.error(`ERROR: unexpected production plan argument ${JSON.stringify(token)}.`);
        process.exit(2);
      }
      if (seen.has(token)) {
        console.error(`ERROR: duplicate production plan argument ${token}.`);
        process.exit(2);
      }
      seen.add(token);
      const value = argv[++i];
      if (!value || value.startsWith('--')) {
        console.error(`ERROR: ${token} requires exactly one value.`);
        process.exit(2);
      }
    }
    const required = ['ledger', 'evidence', 'evidence-sha256', 'project-ref', 'release-sha', 'release-tree'];
    for (const name of required) {
      if (!flag(name)) {
        console.error(`ERROR: --${name} is required in production plan-only mode.`);
        process.exit(2);
      }
    }
    let ledger;
    let evidence;
    let evidenceBytes;
    try {
      const raw = JSON.parse(fs.readFileSync(flag('ledger'), 'utf8'));
      ledger = Array.isArray(raw) ? raw : raw?.rows;
      if (!Array.isArray(ledger)) throw new Error('ledger must be an array or an object with a rows array');
      evidenceBytes = fs.readFileSync(flag('evidence'));
      evidence = JSON.parse(evidenceBytes);
    } catch (e) {
      console.error(`ERROR: production evidence could not be read: ${e.message}`);
      process.exit(2);
    }
    let sourceHead;
    let sourceTree;
    let evidenceSourceAncestor;
    try {
      const tracked = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=no'],
        { cwd: root, encoding: 'utf8' });
      if (tracked.trim()) throw new Error('tracked working tree is dirty');
      sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
      sourceTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
      if (flag('release-sha') !== sourceHead || flag('release-tree') !== sourceTree) {
        throw new Error('supplied release SHA/tree does not match current clean Git identity');
      }
      const evidenceSourceSha = evidence.sourceIdentity?.currentSha;
      const evidenceSourceTree = evidence.sourceIdentity?.currentTree;
      exactHex('evidence source SHA', evidenceSourceSha, 40);
      exactHex('evidence source tree', evidenceSourceTree, 40);
      const actualEvidenceSourceTree = execFileSync(
        'git', ['rev-parse', `${evidenceSourceSha}^{tree}`], { cwd: root, encoding: 'utf8' },
      ).trim();
      execFileSync('git', ['merge-base', '--is-ancestor', evidenceSourceSha, sourceHead], {
        cwd: root, stdio: 'ignore',
      });
      evidenceSourceAncestor = actualEvidenceSourceTree === evidenceSourceTree;
      if (!evidenceSourceAncestor) throw new Error('evidence source SHA/tree identity does not match Git');
    } catch (e) {
      console.error(`ERROR: production source identity refused: ${e.message}`);
      process.exit(2);
    }
    const contract = JSON.parse(fs.readFileSync(path.join(candidateDir, 'candidate-contract.json'), 'utf8'));
    const res = buildProductionPlan({
      baselineDir, adoptionDir, candidateDir,
      declared: contract.migrations, adoptionDeclared: contract.phase02Adoption?.entries ?? [],
      ledger, evidence,
      evidenceSha256: flag('evidence-sha256'), actualEvidenceSha256: sha256(evidenceBytes),
      projectRef: flag('project-ref'), sourceHead, sourceTree, evidenceSourceAncestor,
    });
    console.log(JSON.stringify({
      mode: 'PRODUCTION_PLAN_ONLY', ok: res.ok, refusals: res.refusals,
      workspace: res.workspace, counts: res.counts,
      pending: res.plan?.map((p) => ({ file: p.file, version: p.version, sha256: p.sha256 })),
      command: res.command, sourceIdentity: res.sourceIdentity, productionApplyAvailable: false,
    }, null, 2));
    if (!res.ok) {
      console.error(`REFUSED: ${res.refusals.length} problem(s). No production plan was prepared.`);
      process.exit(1);
    }
    console.error(
      `OK: prepared a non-mutating production dry-run plan for ${res.plan.length} pending migrations. ` +
      'No production command was executed and no apply command exists in this result.',
    );
    process.exit(0);
  }

  if (cmd === 'build') {
    const contract = JSON.parse(fs.readFileSync(path.join(candidateDir, 'candidate-contract.json'), 'utf8'));
    const lf = flag('ledger');
    if (!lf) { console.error('ERROR: --ledger <file.json> is required (JSON array of {version,name}).'); process.exit(2); }
    const raw = JSON.parse(fs.readFileSync(lf, 'utf8'));
    const res = buildWorkspace({
      baselineDir, adoptionDir, candidateDir,
      declared: contract.migrations, adoptionDeclared: contract.phase02Adoption?.entries ?? [],
      ledger: Array.isArray(raw) ? raw : raw.rows, stage: flag('stage', 'A'),
    });
    console.log(JSON.stringify({
      ok: res.ok, refusals: res.refusals, workspace: res.workspace, counts: res.counts,
      plan: res.plan?.map((p) => `${p.version}_${p.name}`),
      wouldPush: res.wouldPush?.map((m) => `${m.file} (${m.role})`),
    }, null, 2));
    if (!res.ok) { console.error(`REFUSED: ${res.refusals.length} problem(s). No workspace was created.`); process.exit(1); }
    console.error(`OK: workspace at ${res.workspace} (${res.counts.total} files, ${res.wouldPush.length} pending).`);
    process.exit(0);
  }

  if (cmd === 'command') {
    try {
      console.log(JSON.stringify(workspaceCommands({ workspace: flag('workspace'), projectRef: flag('project-ref') }), null, 2));
      process.exit(0);
    } catch (e) { console.error(`ERROR: ${e.message}`); process.exit(2); }
  }

  if (cmd === 'destroy') {
    console.error(destroyWorkspace(flag('workspace')) ? 'OK: workspace destroyed.' : 'NOTHING DESTROYED: not a workspace.');
    process.exit(0);
  }

  console.error('usage: canonical-apply-workspace.mjs <build|command|production-plan|destroy> [flags] (see header)');
  process.exit(2);
}
