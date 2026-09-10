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
