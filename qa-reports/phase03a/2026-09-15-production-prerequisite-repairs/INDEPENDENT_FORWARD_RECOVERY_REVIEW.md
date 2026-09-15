# Phase 03A production forward-recovery R2 — independent review

```text
REVIEWED_SOURCE_SHA: 22e1db5aa7e58d7129551cb1325f921b37f95105
REVIEWED_SOURCE_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
TARGET_PROJECT_REF: kldlwszpfkdmsjrjhjym
PRODUCTION_FORWARD_RECOVERY: PREPARED_REVIEWED
RECOVERY_EXECUTION_AUTHORIZED: NO
PRODUCTION_CONTACT: NONE
SOURCE_EDITS: NONE
```

## Verdict

The production-specific forward-recovery R2 preparation is complete and internally consistent for independent static review. All 24 prepared SQL artifacts are hash-exact derivations of the accepted sources, their versions are unique and absent from the fresh captured production ledger, restore and reapply dependency order is correct, and the two non-restorable security crossings have no restoration artifact. I found no blocker to marking the preparation `PREPARED_REVIEWED`.

This verdict does not classify any restoration as safe to execute. Every restoration is explicitly `UNSAFE_BASELINE_RESTORE`; execution still requires an owner-selected dependency-safe subset, fresh production reconciliation, new version-availability proof, impact/security review, and separate exact authorization.

## Frozen identities and production availability

- Git matched the requested source exactly: commit `22e1db5aa7e58d7129551cb1325f921b37f95105`, tree `657f1b6ce01d3fdbb27102b5aa33616c918feade`.
- The manifest binds the exact production ref `kldlwszpfkdmsjrjhjym` and the same source SHA/tree. Associated re-preflight evidence also identifies that ref and records a read-only capture.
- `PRODUCTION_LEDGER_REPREFLIGHT.json` contains 71 canonically ordered rows, latest version `20260830130000`. Its file SHA-256 is `2a54be38a86c82bb194c7a46021605c776265849600058e3cc7114fe1be3a629`, and the independently recomputed ordered row digest is `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b`; both match the manifest.
- Restore versions `20260916000000..20260916001100` and reapply versions `20260917000000..20260917001100` form 24 unique canonical versions. None appears in the 71-row production capture or in tracked SQL outside the recovery bank.
- The manifest correctly requires those versions and the current production ledger to be reverified immediately before any separately authorized future operation. The present availability proof is preflight evidence, not a durable reservation.

## Artifact and ordering verification

I verified all 12 recoverable entries against the Stage A candidate contract and the files on disk:

```text
candidate source hashes:                 12/12 match
accepted rollback hashes:                12/12 match
prepared restore artifact hashes:        12/12 match
prepared reapply artifact hashes:        12/12 match
restore files reproduce generator output
  plus exact accepted rollback bodies:   12/12 match
reapply files contain the fixed header
  plus exact accepted candidate bodies:  12/12 match
artifact filenames and declared versions: 24/24 match
```

The 14-entry Stage A contract is covered exactly by 12 recoverable entries and two non-restorable security repairs; Stage B is absent. Sorting the restore files by declared order produces the exact reverse of the 12-item contract order. Sorting the reapply files produces the exact original order with the two deliberately non-restorable entries omitted. There are no missing, extra, phantom, or duplicate candidates.

The reviewed packet file hashes are:

```text
FORWARD_RECOVERY_MANIFEST_R2.json
  92aea2ed3cbf3213304e9e9321f521370c6a630670b6508e1f5184b5297f4b24
FORWARD_RECOVERY_VALIDATION_R2.json
  982bbcb0276eaf8207357a1b1b8659742874e0ebf57efd844b57f68893b34b07
FORWARD_RECOVERY_README_R2.md
  e1c592154194bee73a632629db857894a8dfd3a339aea1863cfa6c2b53265916
PRODUCTION_LEDGER_REPREFLIGHT.json
  2a54be38a86c82bb194c7a46021605c776265849600058e3cc7114fe1be3a629
```

## Trigger, stop, and ledger semantics

The manifest does not present recovery as a routine post-apply step. Its trigger requires a separately authorized Stage A production apply, a material regression attributed to candidate behavior, an owner-selected exact subset after impact review, current ledger reconciliation and unused-version proof, and fresh before/after captures.

Its stop conditions cover target, source, hash, ledger, version, prerequisite, and dependency mismatches; any need to recreate either non-reversible security baseline; uncertain or partial application; and any operation that would overwrite or discard legitimate live data. Those conditions are material because the prepared restoration bodies deliberately reverse security controls, and the FDA-028 restoration drops limiter state tables. An operator must assess the exact selected subset and current data before execution; this review supplies no blanket recovery command or authority.

Every recovery file has a new version after the candidate and current ledger head. Restore headers expressly retain the original candidate row, and reapply files use a second new version rather than rerunning, renaming, deleting, or rewriting an applied row. A static search found no reference to Supabase migration-history tables and no ledger delete/rewrite statement in the 24 artifacts. The recorded semantics therefore remain forward-only.

## Security implications and the two non-restorable crossings

All 12 prepared restorations are accurately classified as `UNSAFE_BASELINE_RESTORE`. The bodies include deliberate weakening such as removing limiters, restoring broader client privileges or trigger-function execution, and returning policies to their pre-candidate posture. Candidate-specific manifest reasons and artifact warnings make those effects visible. Preparation acceptance does not approve those effects.

The two stronger security crossings are handled separately and concretely:

1. `20260904000400_adopt_execute_revokes.sql` has no restore or reapply artifact in the 24-file set. Its accepted rollback is an executable refusal because baseline restoration would republish a retired credential literal and reopen client execution of trigger-only security-definer functions.
2. `20260911120000_phase03a_webhook_target_env_scoped.sql` has no restore or reapply artifact in the set. Its weaker rollback would restore the hardcoded production webhook target, so it is excluded.

Independent scanning confirmed that the 24 artifacts contain no hardcoded production webhook URL and no grant of `check_flag_rate_limit`, `notify_flag_status_webhook`, or `verify_webhook_secret` to `PUBLIC`, `anon`, or `authenticated`. Service-role grants retained by the effective-privilege baseline do not recreate the client-execution crossing. The repository credential census also passed without emitting credential content.

For either crossing, the manifest requires stopping and preserving evidence, refusing restoration of the retired credential, client grants, or hardcoded endpoint, then using owner-selected application/release containment or a newly reviewed defect-specific forward correction with a fresh, reverified version. That is a concrete fail-closed disposition; neither weak baseline is encoded as a prepared recovery action.

## Verification performed

```text
JSON parse of manifest, validation, and fresh ledger: PASS
fresh ledger file hash / ordered digest / count / latest / order: PASS
24 artifact hashes and canonical filenames: PASS
12 candidate and 12 rollback source hashes: PASS
12 exact restoration derivations: PASS
12 exact reapplication derivations: PASS
Stage A coverage and Stage B exclusion: PASS
reverse restore dependency order: PASS
original reapply dependency order: PASS
production and local version collision probes: PASS (zero collisions)
non-restorable candidate hashes and artifact absence: PASS
forward-only history search: PASS
credential guard: PASS — 1 suite, 10 tests
hosted commands or target contact: NONE
```

## Remaining authority

`PREPARED_REVIEWED` means the forward-recovery materials are suitable to be retained with a future production authorization packet. It does not authorize generation of an executable recovery workspace, production contact, recovery execution, Stage B, or any change to MF-03, MF-04, MF-05, policy status, or owner decisions.

## DECISIONS FOR SKY

No new decision is required to retain this reviewed preparation. Any actual recovery would require Sky to decide the exact dependency-safe subset or select correction/containment for a security crossing after reviewing current production evidence and impact. The recommendation is to preserve this bank unchanged until that concrete scenario exists.
