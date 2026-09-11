#!/usr/bin/env node
/**
 * STAGE-MF-01 / STAGE-MF-08 — canonical migration identity and forward-only ledger truth.
 *
 * Phase 03A staging applied its candidates two ways and BOTH destroyed migration
 * identity:
 *
 *   Management API apply  -> recorded the WALL-CLOCK time of the apply
 *                            (20260910161947 ...) instead of the candidate's own
 *                            canonical version (20260904000000 ...).
 *   `db query --file`     -> recorded NOTHING. Two candidates have no ledger row.
 *
 * Either way `supabase migration list` can no longer answer "what is applied?".
 * Neither mechanism may be used against production.
 *
 * The supported mechanism is `supabase db push`, which reads supabase/migrations/
 * and records each file under its own canonical version. This module is the guard
 * rail around it: it decides what may be pushed, refuses the failure modes that
 * bit us, and verifies identity afterwards read-only.
 *
 * FORWARD-ONLY LEDGER MODEL (STAGE-MF-08)
 * ---------------------------------------
 * Restoration must never delete or rewrite a ledger row. If 20260905055633 ran, it
 * ran, and the ledger must keep saying so. Undoing it is a NEW forward migration
 * with its own later canonical version. A later re-application is likewise a new
 * forward version. The ledger then reads as a truthful history:
 *
 *     20260905055633_phase03a_contextual_profiles      <- applied
 *     20260910130000_restore_phase03a_contextual...    <- undone, deliberately
 *     20260911xxxxxx_reapply_phase03a_contextual...    <- re-applied
 *
 * rather than the fiction that the first migration never happened. This also
 * fixes the defect the acceptor found: after the staging rollbacks, six
 * phase03a_* rows still claimed to be applied while their objects were gone.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const CANONICAL_NAME = /^(\d{14})_([A-Za-z0-9][A-Za-z0-9_-]*)\.sql$/;

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Canonical identity of a migration file: its version and name come from the FILENAME, never from the clock. */
export function canonicalIdentity(filename) {
  const m = CANONICAL_NAME.exec(filename);
  if (!m) throw new Error(`Not a canonical migration filename: ${filename}`);
  return { version: m[1], name: m[2], file: filename };
}

/**
 * Decide what may be pushed. Every refusal here corresponds to a way the first
 * staging run went wrong, or a way it could have gone wrong unnoticed.
 *
 * @param {object}   opts
 * @param {string}   opts.dir            directory holding the candidate .sql files
 * @param {object[]} opts.declared       manifest entries {file, sha256, applyStage}
 * @param {object[]} opts.ledger         rows already in the remote history {version, name}
 * @param {string}   [opts.stage]        only plan candidates of this applyStage (default 'A')
 */
export function planApply({ dir, declared, ledger, stage = 'A' }) {
  const refusals = [];
  const plan = [];

  const forStage = declared.filter((d) => d.applyStage === stage);
  if (!forStage.length) refusals.push(`No declared candidates for applyStage ${stage}`);

  // A candidate with no declared stage is a candidate nobody decided about.
  for (const d of declared) {
    if (d.applyStage !== 'A' && d.applyStage !== 'B') {
      refusals.push(`${d.file}: missing applyStage (must be A or B)`);
    }
  }

  const seen = new Map();
  for (const d of forStage) {
    let id;
    try {
      id = canonicalIdentity(d.file);
    } catch (e) {
      refusals.push(e.message);
      continue;
    }

    // Two files claiming one version is ambiguous history. Refuse rather than pick.
    if (seen.has(id.version)) {
      refusals.push(`Duplicate canonical version ${id.version}: ${seen.get(id.version)} and ${d.file}`);
      continue;
    }
    seen.set(id.version, d.file);

    const full = path.join(dir, d.file);
    if (!fs.existsSync(full)) {
      refusals.push(`${d.file}: declared in the manifest but absent on disk`);
      continue;
    }
    // The bytes must be the reviewed bytes. A matching version with different
    // content is exactly the substitution this guard exists to stop.
    const actual = sha256(fs.readFileSync(full));
    if (actual !== d.sha256) {
      refusals.push(`${d.file}: hash mismatch (declared ${d.sha256.slice(0, 12)}, on disk ${actual.slice(0, 12)})`);
      continue;
    }

    const already = ledger.find((r) => r.version === id.version);
    if (already) {
      // Already applied under its canonical version: skip, do not re-run.
      if (already.name !== id.name) {
        refusals.push(
          `${d.file}: version ${id.version} is in the ledger under a different name ` +
          `(${already.name}). Refusing rather than guessing which artifact ran.`,
        );
      }
      continue;
    }
    plan.push({ ...id, sha256: actual });
  }

  // Ordering is part of correctness; these migrations are not commutative.
  plan.sort((a, b) => a.version.localeCompare(b.version));
  return { plan, refusals, ok: refusals.length === 0 };
}

/**
 * Read-only proof that the ledger tells the truth after an apply. This is the
 * check that would have caught the staging defect immediately.
 */
export function verifyLedgerIdentity({ expected, ledger }) {
  const problems = [];
  for (const e of expected) {
    const id = canonicalIdentity(e.file);
    const rows = ledger.filter((r) => r.version === id.version);
    if (rows.length === 0) {
      problems.push(`${e.file}: NO ledger row for canonical version ${id.version} (ledgerless apply)`);
    } else if (rows.length > 1) {
      problems.push(`${e.file}: ${rows.length} ledger rows for version ${id.version} (applied more than once)`);
    } else if (rows[0].name !== id.name) {
      problems.push(`${e.file}: ledger records version ${id.version} under name "${rows[0].name}"`);
    }
  }
  // Wall-clock substitution: a row whose name matches a canonical candidate but
  // whose version does not. This is the exact staging failure signature.
  for (const e of expected) {
    const id = canonicalIdentity(e.file);
    for (const row of ledger) {
      if (row.name === id.name && row.version !== id.version) {
        problems.push(
          `Wall-clock substitution: ledger has "${row.name}" under version ${row.version}, ` +
          `but its canonical version is ${id.version}`,
        );
      }
    }
  }
  return { passed: problems.length === 0, problems };
}

/**
 * STAGE-MF-08. Name the forward migration that UNDOES an applied candidate.
 * Never deletes history; adds to it.
 */
export function forwardRestorationName(candidateFile, at) {
  const id = canonicalIdentity(candidateFile);
  // Accept a Date or an ISO string, so the same function is callable across a
  // process boundary (the CJS test harness passes ISO).
  at = at instanceof Date ? at : new Date(at);
  const stamp =
    at.getUTCFullYear().toString() +
    String(at.getUTCMonth() + 1).padStart(2, '0') +
    String(at.getUTCDate()).padStart(2, '0') +
    String(at.getUTCHours()).padStart(2, '0') +
    String(at.getUTCMinutes()).padStart(2, '0') +
    String(at.getUTCSeconds()).padStart(2, '0');
  if (stamp <= id.version) {
    throw new Error(
      `A forward restoration must sort AFTER the migration it undoes ` +
      `(${stamp} <= ${id.version}). Refusing to backdate history.`,
    );
  }
  return `${stamp}_restore_${id.name}.sql`;
}

/**
 * STAGE-MF-08. Build the actual forward-restoration MIGRATION from a candidate's
 * rollback body — not just its name. Independent review pointed out that a naming
 * helper alone leaves the ledger defect to recur unchanged, because no artifact
 * conformed to the model. This emits one.
 *
 * The result is an ordinary forward migration: `supabase db push` records it under
 * its own canonical version, so the ledger ends up reading "candidate applied, then
 * deliberately undone" instead of silently still claiming the candidate is live.
 */
export function buildForwardRestoration({ candidateFile, rollbackBody, at, reason }) {
  const id = canonicalIdentity(candidateFile);
  const name = forwardRestorationName(candidateFile, at);
  const body = String(rollbackBody)
    .split('\n')
    .filter((line) => !/^--\s*PHASE-03A LOCAL CANDIDATE/i.test(line))
    .join('\n')
    .trim();
  const header = [
    `-- FORWARD RESTORATION of ${id.version}_${id.name}.`,
    '-- Generated by scripts/canonical-migration-identity.mjs (STAGE-MF-08).',
    '--',
    `-- Undoes ${id.file}. This is a NEW forward migration with its own canonical`,
    `-- version (${name.slice(0, 14)}), NOT a deletion or rewrite of that candidate's`,
    '-- ledger row. After applying this, the ledger truthfully reads: the candidate ran,',
    '-- and was then deliberately undone. Re-applying later is another new forward',
    '-- version, never a re-run of the original.',
    '--',
    `-- Reason: ${reason ?? 'not stated'}`,
    '--',
    '-- This restores the pre-candidate posture and therefore restores whatever',
    '-- weaknesses that posture had. That is the point of a rollback, and it must be a',
    '-- deliberate decision rather than a reflex.',
  ].join('\n');
  return { filename: name, version: name.slice(0, 14), contents: `${header}\n${body}\n` };
}

/** The one supported apply command. Printed so the runbook cannot drift from the tool. */
export function supportedApplyCommand({ projectRef, dryRun = true }) {
  if (!projectRef) throw new Error('projectRef is required: the target must always be named explicitly');
  return `supabase db push --linked --project-ref ${projectRef}${dryRun ? ' --dry-run' : ''}`;
}

export const PROHIBITED_MECHANISMS = [
  {
    mechanism: 'Management API apply_migration',
    observed: 'recorded wall-clock apply time (20260910161947) instead of the canonical version (20260904000000)',
    verdict: 'PROHIBITED for production',
  },
  {
    mechanism: 'supabase db query --file',
    observed: 'recorded no ledger row at all; candidates 7 and 8 are invisible to migration list',
    verdict: 'PROHIBITED for production',
  },
];

// ---------------------------------------------------------------------------
// CLI. Added after independent review pointed out that the packet instructed an
// operator to "make planApply() return ok:true" while no command existed to do it.
// Guard-rail logic that cannot be run is not a guard rail.
//
//   node scripts/canonical-migration-identity.mjs plan   [--stage A|B] [--ledger <file.json>]
//   node scripts/canonical-migration-identity.mjs verify  --ledger <file.json> [--stage A|B]
//   node scripts/canonical-migration-identity.mjs command --project-ref <ref> [--apply]
//
// --ledger takes a JSON array of {version,name} rows. Obtain it READ-ONLY, e.g.
//   supabase db query --linked --project-ref <ref> \
//     -f <(echo "select version,name from supabase_migrations.schema_migrations order by version")
// This tool never connects to a database and never mutates anything.
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flag = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
  };
  const dir = flag('dir', 'supabase/migrations-next/phase03a');
  const stage = flag('stage', 'A');
  const contractPath = path.join(dir, 'candidate-contract.json');
  const readLedger = () => {
    const f = flag('ledger');
    if (!f) {
      console.error('ERROR: --ledger <file.json> is required (a JSON array of {version,name} rows).');
      process.exit(2);
    }
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  };

  if (cmd === 'plan') {
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const ledger = argv.includes('--ledger') ? readLedger() : [];
    const res = planApply({ dir, declared: contract.migrations, ledger, stage });
    console.log(JSON.stringify({ stage, ...res }, null, 2));
    if (!res.ok) {
      console.error(`REFUSED: ${res.refusals.length} problem(s). Nothing may be applied.`);
      process.exit(1);
    }
    console.error(`OK: ${res.plan.length} candidate(s) may be applied, in canonical order.`);
    process.exit(0);
  }

  if (cmd === 'verify') {
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const expected = contract.migrations.filter((m) => m.applyStage === stage);
    const res = verifyLedgerIdentity({ expected, ledger: readLedger() });
    console.log(JSON.stringify(res, null, 2));
    if (!res.passed) {
      console.error(`LEDGER IDENTITY FAILED: ${res.problems.length} problem(s).`);
      process.exit(1);
    }
    console.error('OK: every candidate has exactly one ledger row under its canonical version.');
    process.exit(0);
  }

  if (cmd === 'restore') {
    const candidate = flag('candidate');
    if (!candidate) { console.error('ERROR: --candidate <file.sql> is required'); process.exit(2); }
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const entry = contract.migrations.find((m) => m.file === candidate);
    if (!entry) { console.error(`ERROR: ${candidate} is not in the manifest`); process.exit(2); }
    const rollbackBody = fs.readFileSync(path.join(dir, entry.rollback), 'utf8');
    const built = buildForwardRestoration({
      candidateFile: candidate, rollbackBody, at: new Date(), reason: flag('reason'),
    });
    const out = flag('out');
    if (out) {
      fs.writeFileSync(path.join(out, built.filename), built.contents);
      console.error(`OK: wrote ${built.filename} (canonical version ${built.version}).`);
    } else {
      console.log(built.contents);
      console.error(`OK: would be ${built.filename} (canonical version ${built.version}).`);
    }
    process.exit(0);
  }

  if (cmd === 'command') {
    const projectRef = flag('project-ref');
    try {
      console.log(supportedApplyCommand({ projectRef, dryRun: !argv.includes('--apply') }));
      console.error('PROHIBITED for production: ' + PROHIBITED_MECHANISMS.map((m) => m.mechanism).join('; '));
      process.exit(0);
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      process.exit(2);
    }
  }

  console.error('usage: canonical-migration-identity.mjs <plan|verify|command> [flags] (see header)');
  process.exit(2);
}
