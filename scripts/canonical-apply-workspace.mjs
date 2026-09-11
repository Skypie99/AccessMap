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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalIdentity, planApply, assertUnambiguousTarget, PRODUCTION_PROJECT_REF } from './canonical-migration-identity.mjs';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
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
  ledger = [], stage = 'A', projectId = 'accessmap', outDir = null,
}) {
  const known = knownLocalVersions({ baselineDir, declared, adoptionDeclared });
  const planned = planApply({ dir: candidateDir, declared, ledger, stage, knownLocalVersions: known });
  if (!planned.ok) {
    return { ok: false, refusals: planned.refusals, workspace: null, materialized: [], ledgerAudit: planned.ledgerAudit };
  }

  const ws = outDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'p03a-apply-'));
  const migDir = path.join(ws, 'supabase', 'migrations');
  fs.mkdirSync(migDir, { recursive: true });
  fs.writeFileSync(path.join(ws, 'supabase', 'config.toml'), `project_id = "${projectId}"\n`);
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
export function workspaceCommands({ workspace, projectRef, expectStaging = true }) {
  if (!workspace) throw new Error('workspace is required');
  if (!projectRef) throw new Error('projectRef is required: the target must always be named explicitly');
  if (expectStaging && projectRef === PRODUCTION_PROJECT_REF) {
    throw new Error(`Refusing to build a staging command targeting production ${PRODUCTION_PROJECT_REF}.`);
  }
  const base = ['supabase', 'db', 'push', '--workdir', workspace, '--project-ref', projectRef];
  assertUnambiguousTarget(base);
  return { dryRun: [...base, '--dry-run'].join(' '), apply: base.join(' ') };
}

/**
 * Post-apply verification semantics: after a real apply every pushed artifact must
 * appear exactly once under its own canonical version. Read-only; mutates nothing.
 */
export function expectedLedgerAfterApply({ ledgerBefore = [], wouldPush = [] }) {
  return [...ledgerBefore, ...wouldPush.map((m) => ({ version: m.version, name: canonicalIdentity(m.file).name }))]
    .sort((a, b) => a.version.localeCompare(b.version));
}

export function destroyWorkspace(ws) {
  if (!ws) return false;
  // Only ever remove a directory we created and that still looks like a workspace.
  if (!fs.existsSync(path.join(ws, 'supabase', 'config.toml'))) return false;
  fs.rmSync(ws, { recursive: true, force: true });
  return true;
}

// ---------------------------------------------------------------------------
// CLI
//   node scripts/canonical-apply-workspace.mjs build   --ledger <f.json> [--out <dir>] [--stage A|B]
//   node scripts/canonical-apply-workspace.mjs command --workspace <dir> --project-ref <ref>
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

  if (cmd === 'build') {
    const contract = JSON.parse(fs.readFileSync(path.join(candidateDir, 'candidate-contract.json'), 'utf8'));
    const lf = flag('ledger');
    if (!lf) { console.error('ERROR: --ledger <file.json> is required (JSON array of {version,name}).'); process.exit(2); }
    const raw = JSON.parse(fs.readFileSync(lf, 'utf8'));
    const res = buildWorkspace({
      baselineDir, adoptionDir, candidateDir,
      declared: contract.migrations, adoptionDeclared: contract.phase02Adoption?.entries ?? [],
      ledger: Array.isArray(raw) ? raw : raw.rows, stage: flag('stage', 'A'), outDir: flag('out'),
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

  console.error('usage: canonical-apply-workspace.mjs <build|command|destroy> [flags] (see header)');
  process.exit(2);
}
