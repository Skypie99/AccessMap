# Phase 03B — restoration runbook (quiescence-gate exit)

**Status: NON-EXECUTING DOCUMENT. Nothing in this runbook has been run against
production. Preparing it does not authorize restoration.** It defines exactly what a
future, separately authorized restoration attempt must prove, do, and prove again —
so that when Sky (or an independent reviewer) is ready, the actual execution is a
matter of following fixed steps rather than making judgment calls live against
production.

Prepared 2026-09-20, local-only, by Claude (Sonnet 5), in worktree
`flagstone-p03b-post-apply-recovery-20260919`, branch
`codex/flagstone-p03b-post-apply-recovery-20260919`. No production or staging contact
was made preparing this document or its SQL artifacts.

## 1. Evidence bindings — this runbook applies to exactly this incident

| Field | Value |
|---|---|
| Run ID | `ebdba703-2470-41fa-ac6d-44354203b8d1` |
| Original database T0 | `2026-09-20T06:20:25.216974Z` |
| Original one-run production-apply authorization | `CONSUMED` (unchanged — this runbook does not touch it) |
| Structural repair reviewed | commit `3420d87`, independent review PASS at `386d363` |
| Third live read-only post-apply verification | reported complete by Sky, 2026-09-20 (see §2 for what is and isn't independently confirmed) |
| Production target | `kldlwszpfkdmsjrjhjym` (project name `Accessable City App`, region `us-west-2`, Postgres engine `17`) only — never staging `cepayqmsoqxshsiyqnvz`. Identity captured 2026-09-19 in `qa-reports/phase03b/2026-09-19-production-apply-packet-r11/LIVE_TARGET_IDENTITY.json` (`requestedProjectRef` == `observedProjectRef` == `kldlwszpfkdmsjrjhjym`). See §2's `TARGET_IDENTITY` row for what this file does and does not substitute for. |

This runbook is only valid for this run ID and this T0. If either the entry receipt or
the database T0 changes for any reason, this entire runbook is stale and must be
regenerated, not hand-edited — see §4.

## 2. Evidence status — what is independently proven vs. what is asserted

Before writing "prove before restoration" as a checklist, it matters what "proof" means
right now, today, in this repo. This saga's own founding rule (`scripts/structural-catalog.mjs`
header) is **"no original artifact, no identity claim."** Applying that rule honestly,
as of this hardening pass, to all three saved evidence files in
`qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/CAPTURED_FINAL_STRUCTURE/`:

| Claim | Status | Basis |
|---|---|---|
| `FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS`: PASS, hash `f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7` | **INDEPENDENTLY VERIFIED** | Raw artifact `structure_catalog.json` exists, valid JSON, correct top-level shape. `compare_captured_results.mjs` run directly, locally, offline, against it reproduces `PASS` with this exact hash. |
| Ledger count 87, both Phase03B versions present, statement counts 68/23, gate present, pg_net TTL 6h, HTTP queue 0, 0 new responses since T0 | **INDEPENDENTLY VERIFIED** | `proof.json` is now saved in the same directory. `compare_captured_results.mjs` run directly, locally, offline, against it reproduces `LIVE_GATE_AND_LEDGER: PASS`. |
| Edge Function identity PASS, hash `276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70` | **INDEPENDENTLY VERIFIED** | `edge_function.json` is now saved in the same directory. `compare_captured_results.mjs` run directly, locally, offline, against it reproduces `EDGE_FUNCTION_IDENTITY: PASS` with this exact hash. |
| `TARGET_IDENTITY` (comparator's automated check) | **STRUCTURALLY CAVEATED, NOT A DEFECT** | `compare_captured_results.mjs` only reads a genuine PASS for this section when a `note.json` with `projectRef` sits in the captured directory. The external tool that produced the three files above never wrote one, so the comparator correctly (not incorrectly) reports "no note.json supplied — unverified, treat as HOLD manually" for that historical capture — this document does not retroactively fabricate a `note.json` for evidence that was never accompanied by one. The actual identity proof for that capture is `LIVE_TARGET_IDENTITY.json` (§1), captured 2026-09-19, independently confirming `requestedProjectRef == observedProjectRef == kldlwszpfkdmsjrjhjym`, `Accessable City App`, `us-west-2`, Postgres `17`. Going forward, the hardened §8 step-1 preflight script (below) writes its own `note.json`, truthfully self-attesting the project ref *that specific run* used — so any future preflight reproof run through this runbook gets a real, non-caveated `TARGET_IDENTITY: PASS` from the comparator, not just from the `--project-ref` flag on each CLI call. |

`compare_captured_results.mjs --captured=.../CAPTURED_FINAL_STRUCTURE` was re-run fresh
during this hardening pass and reproduces `overall: PASS` with `CLIENT_COMPATIBILITY`
correctly `NOT_RUN` (non-blocking, by design — see the comparator's own message). The
evidence gap this section used to describe (missing `proof.json`/`edge_function.json`)
is closed; nothing here is asserted-only any more.

## 3. Prove before restoration (preflight gate)

Immediately before the actual restoration attempt — not hours or days earlier — reprove,
fresh, from the same read-only artifacts already built:

1. Target identity exact (`kldlwszpfkdmsjrjhjym`, matches `LIVE_TARGET_IDENTITY.json`;
   the §8 step-1 script additionally self-attests the ref it used into a fresh
   `note.json`, which `compare_captured_results.mjs` reads for a real, non-caveated
   `TARGET_IDENTITY: PASS` — see §2).
2. Ledger still exactly 87, both Phase03B versions present, statement identity unchanged
   (`01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql` in the external-handoff directory).
3. Exact temporary gate (1 function + 2 triggers) still present, owned by `postgres`,
   enabled `A`, hashes unchanged (same file).
4. Final normalized structure still hashes to `f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7`
   (`02_FINAL_STRUCTURE_CAPTURE_READ_ONLY.sql` in the external-handoff directory).
5. No new pg_net activity since the original T0: `http_queue_count = 0`,
   `http_response_new_since_t0_count = 0`, `pg_net_ttl_seconds > 600`.
6. All of §2's evidence rows read INDEPENDENTLY VERIFIED, not asserted-only.

If any of 1–6 fails or cannot be freshly reproduced: **HOLD.** Do not proceed to §5.
Do not narrow, skip, or waive any of these six — they are the same checks already used
for entry, post-apply, and are reused verbatim here, not weakened for convenience.

## 4. Restoration SQL — exactly one attempt, exact scope

`PHASE03B_RESTORATION_EXIT.sql` in this directory is the **exact, fully-bound**
restoration SQL. It was not hand-written for this runbook — it was deterministically
materialized by the saga's own `generate_exit_sql.mjs` from the committed
`ENTRY_RECEIPT.json`, the same tool and the same template
(`PROPOSED_QUIESCENCE_EXIT_TEMPLATE.sql`) already sitting in the r11 packet awaiting
"a separate production-write authorization" (its own header text). Every
`__ENTRY_*__` / `__DATABASE_T0__` token has been replaced with the literal value from
the entry receipt (function OID `20772`, row-trigger OID `20773`, truncate-trigger OID
`20774`, flags count `24`, history count `49`, T0
`2026-09-20T06:20:25.216974Z`) and verified to contain zero unresolved tokens.
**Do not hand-edit it.** If the entry receipt ever changes, regenerate it with the same
tool instead.

What it does, top to bottom, inside one `begin; ... commit;` transaction:

1. Sets a 5s lock timeout and 30s statement timeout, and takes `SHARE ROW EXCLUSIVE`
   on `public.flags` — bounded, not indefinite.
2. A `do $guard$` block that **refuses** (raises `P0001`, aborting the whole
   transaction) unless: the running role is exactly `postgres`; exactly 1 gate function
   and exactly 2 gate triggers exist; their OIDs, owner, and enabled state match the
   entry receipt exactly; their definition hashes match both the entry receipt AND the
   independently pinned constants; the `flags`/`flag_status_history` invariant
   (count + content hash) is unchanged since entry; the ledger is still exactly 87 rows
   with both Phase03B versions present and latest version correct; the moderation and
   points tables/functions/RPC privileges (`transition_flag_status`,
   `moderate_report`, `flag_moderation_events`, `flag_point_reward_claims`, etc.) still
   exist with the expected grant shape; the `pg_net` quiescence invariant still holds.
3. Only if every guard passes: captures a pre-exit proof row, then drops — **in this
   exact order, nothing else** — the truncate trigger, the row-lifecycle trigger, then
   the gate function itself.
4. A second `do $absence$` block that refuses to commit unless all three objects are
   now provably gone.
5. `commit`.

This SQL touches **only** those 3 named objects. It contains no `ALTER TABLE`, no
`UPDATE`, no `INSERT`, no migration-ledger write, and does not reference any
product table other than to read it for the invariant checks. It does not run
automatically and is not wired into any script that would run it automatically.

## 5. Immediately after restoration: the corrected post-exit verifier

Run the **already-reviewed** `verify_post_exit.mjs`
(`qa-reports/phase03b/2026-09-19-production-apply-packet-r11/verify_post_exit.mjs`) —
this is the same file the `3420d87` repair touched to add the preexisting-structure
exclusions, so it is already "corrected" in the sense this task means; no new script
was written for this runbook. Exactly once. It:

- Re-runs the bound `POST_EXIT_VERIFY.sql` (this directory has the same query,
  T0-bound, as `PHASE03B_POST_EXIT_VERIFY_READ_ONLY.sql`, for inspection) and requires,
  exactly: `function_count = 0`, `reserved_trigger_count = 0` (gate objects **absent**),
  `ledger_count = 87`, `ledger_unique_count = 87`, `ledger_latest_version =
  20260915210413`, the same ledger hash as post-apply, the same
  `phase03b_constraint_index_sha256` (moderation/points object definitions unchanged),
  `flags_id_status_count/sha256` and `history_count/sha256` unchanged from entry, and
  the same pg_net safety invariant (queue 0, no new responses since T0, TTL > 600s).
- Re-runs the full structural catalog capture and, after applying only the
  **7-table preexisting-backup exclusion** (the 3-object temporary-gate exclusion no
  longer applies — the objects are actually gone now, not filtered out), requires the
  **same** `f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7` hash —
  i.e. removing the gate must produce a structure byte-for-byte identical, modulo
  those 3 objects, to what passed before. Any other change anywhere in `public`,
  `private`, `storage`, or `limiter` fails this.
- Re-runs `supabase functions list` and requires the same
  `276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70` Edge Function
  identity hash.

Its own exit code is non-zero on any mismatch, and it writes a receipt
(`POST_EXIT_VERIFIER_RECEIPT.json`) rather than a silent boolean. There is no retry
loop anywhere in this script.

## 6. What restoration must not do (unchanged from the standing rules)

- Must not change the migration ledger (no new row, no altered row).
- Must not change any product schema, table, column, or data.
- Must not alter the frozen Phase03B migration bytes.
- Must not modify any function, trigger, or table other than the 3 named gate objects.
- Must not retry automatically on any guard failure, mismatch, or ambiguity — a failed
  guard aborts the transaction (nothing committed) and the correct response is **HOLD**,
  not "run it again."
- Must not remove, weaken, or bypass the `do $guard$` / `do $absence$` blocks to "get
  it to pass."
- Must not run in the same sitting as, or be triggered by, Phase 03C, the production
  controller, or any migration apply.

## 7. Ambiguity or failure handling

Any of the following is a **HOLD**, reported and stopped, never retried automatically:

- Any §3 preflight check fails or can't be freshly reproduced.
- The exit transaction raises any exception (guard or absence check).
- The exit transaction succeeds but `verify_post_exit.mjs` reports anything other than
  `PASS_RESTORED`.
- The exit transaction's outcome is unclear (connection dropped mid-transaction,
  ambiguous CLI exit code, etc.) — treat "don't know if it committed" as no different
  from "it failed," and re-run only the read-only §3/§5 proofs (never the exit SQL
  itself) to find out what actually happened before anyone decides on a next step.

A HOLD here goes back through independent review before any second restoration attempt
is even drafted — this runbook authorizes exactly one attempt, not "retry until PASS."

## 8. Owner execution section (NOT RUN — for reference only)

These are the exact commands a human owner would eventually run, each read-only step
first, in order, on a machine with the pinned Supabase CLI (`2.116.0`) already
authenticated to `kldlwszpfkdmsjrjhjym`. **None of these have been executed.** Running
them requires a separate, explicit go-ahead from Sky beyond what authorized the
read-only verification — restoration is a write, not a read.

Step 1's block below is a hardened, fail-fast shell script (`set -euo pipefail`, no
bare pipe into `jq` that could mask a failed capture, an explicit CLI-version guard,
an explicit staging-ref rejection, and refusal on any missing input file or on an
evidence directory that already exists) — added during the 2026-09-21 readiness-review
repair (F1/F2). It replaces the previous four-line, non-fail-fast version. Nothing
about its *scope* changed: it is still exactly the same three read-only captures plus
the local, offline comparator, still not wired to run automatically, still requiring a
human to read the printed `overall` before doing anything else.

```bash
#!/usr/bin/env bash
# --- 1. Fresh preflight reproof (read-only, safe to run any time, no authorization
#        needed beyond the standing read-only one). Fail-fast: any error anywhere in
#        this block halts it immediately -- it does not depend on a human noticing a
#        bad line in the printed output. ---
set -euo pipefail

readonly EXPECTED_CLI_VERSION="2.116.0"
readonly PRODUCTION_PROJECT_REF="kldlwszpfkdmsjrjhjym"
readonly REJECTED_STAGING_PROJECT_REF="cepayqmsoqxshsiyqnvz"

readonly HANDOFF="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff"
readonly RUNBOOK="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-restoration-runbook"
readonly SQL_LEDGER_GATE="$HANDOFF/01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql"
readonly SQL_STRUCTURE="$HANDOFF/02_FINAL_STRUCTURE_CAPTURE_READ_ONLY.sql"
readonly COMPARATOR="$HANDOFF/compare_captured_results.mjs"
readonly OUT="$HANDOFF/CAPTURED_PRE_RESTORATION_$(date -u +%Y%m%dT%H%M%SZ)"

# Pin production, reject staging: refuse to proceed unless the ref this script would
# use is exactly the pinned production ref and is not the rejected staging ref. Both
# sides are checked explicitly (not just "trust the constant above") so this guard
# still does its job if the block is ever copy/pasted or edited carelessly.
if [ "$PRODUCTION_PROJECT_REF" != "kldlwszpfkdmsjrjhjym" ] || [ "$PRODUCTION_PROJECT_REF" = "$REJECTED_STAGING_PROJECT_REF" ]; then
  echo "REFUSING: target ref '$PRODUCTION_PROJECT_REF' is not the pinned production ref kldlwszpfkdmsjrjhjym, or equals the rejected staging ref $REJECTED_STAGING_PROJECT_REF." >&2
  exit 1
fi

# Explicit CLI version guard -- must match exactly, checked before any live-capable
# command runs (mirrors assertInstalledSupabaseCliVersion(), currently only enforced
# inside verify_post_exit.mjs; this closes the gap on the preflight/comparator path).
ACTUAL_CLI_VERSION="$(supabase --version)"
if [ "$ACTUAL_CLI_VERSION" != "$EXPECTED_CLI_VERSION" ]; then
  echo "REFUSING: supabase --version reported '$ACTUAL_CLI_VERSION', required exactly '$EXPECTED_CLI_VERSION'." >&2
  exit 1
fi

# Refuse if any required input file is missing.
for f in "$SQL_LEDGER_GATE" "$SQL_STRUCTURE" "$COMPARATOR"; do
  if [ ! -f "$f" ]; then
    echo "REFUSING: required file missing: $f" >&2
    exit 1
  fi
done

# Refuse to silently overwrite or merge into an existing evidence directory.
if [ -e "$OUT" ]; then
  echo "REFUSING: evidence output path already exists: $OUT" >&2
  exit 1
fi
mkdir -p "$OUT"

# Each capture is a separate, unpiped command so a failed `supabase` call trips
# `set -e` directly -- no `cmd | jq` construct whose exit status a downstream `jq`
# could mask. Each extraction is then independently checked for a non-null result.
RAW_LEDGER_GATE="$OUT/.raw_ledger_gate.json"
supabase db query --linked --project-ref "$PRODUCTION_PROJECT_REF" --file "$SQL_LEDGER_GATE" --output-format json > "$RAW_LEDGER_GATE"
jq -e '.[0].phase03b_quiescence_proof_r3 != null' "$RAW_LEDGER_GATE" > /dev/null
jq '.[0].phase03b_quiescence_proof_r3' "$RAW_LEDGER_GATE" > "$OUT/proof.json"

RAW_STRUCTURE="$OUT/.raw_structure.json"
supabase db query --linked --project-ref "$PRODUCTION_PROJECT_REF" --file "$SQL_STRUCTURE" --output-format json > "$RAW_STRUCTURE"
jq -e '.[0].catalog != null' "$RAW_STRUCTURE" > /dev/null
jq '.[0].catalog' "$RAW_STRUCTURE" > "$OUT/structure_catalog.json"

supabase functions list --project-ref "$PRODUCTION_PROJECT_REF" --output-format json > "$OUT/edge_function.json"
jq -e 'type == "array" or type == "object"' "$OUT/edge_function.json" > /dev/null

rm -f "$RAW_LEDGER_GATE" "$RAW_STRUCTURE"

# Self-attested target-identity note: truthfully records the ref THIS invocation used.
# It does not, and must not, assert anything about any earlier or different capture.
printf '{"projectRef": "%s", "capturedAtUtc": "%s", "capturedBy": "RESTORATION_RUNBOOK.md \xc2\xa78 step 1 (hardened)"}\n' \
  "$PRODUCTION_PROJECT_REF" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT/note.json"

# Judge, locally, offline. No retry: a failure here is reported, not re-attempted.
node "$COMPARATOR" --captured="$OUT"
# ---> read the printed "overall". If it is not PASS on every non-NOT_RUN section, STOP HERE. ---

# --- 2. THE WRITE. Only after step 1 reads clean AND independent review has signed off AND Sky has separately authorized this specific write. ---
# supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file "$RUNBOOK/PHASE03B_RESTORATION_EXIT.sql" --output-format json > "$RUNBOOK/EXIT_RUN_RECEIPT.json"

# --- 3. Immediately after, the corrected post-exit verifier (never skip, never delay) ---
# node "/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-19-production-apply-packet-r11/verify_post_exit.mjs" \
#   --entry="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-19-post-apply-recovery-evidence/retained-incident-input/ENTRY_RECEIPT.json" \
#   --evidence="$RUNBOOK/POST_EXIT_EVIDENCE_$(date -u +%Y%m%dT%H%M%SZ)"
```

Steps 2 and 3 are commented out deliberately. This runbook does not uncomment them —
that is the separate authorization act, made by Sky, at the time restoration actually
happens, not by preparing this document. Step 1 contains no migration-apply command,
no production-controller invocation, and no automatic retry of any kind: every failure
path is `exit 1` with a message on stderr, once, and nothing loops.

## 9. Checkpoint maintenance

`qa-reports/phase03b/CURRENT_RECOVERY_HANDOFF.md` and `CURRENT_RECOVERY_STATE.json`
are updated alongside this runbook (same commit) to point here and to record this
hardening pass. Neither file claims restoration has happened, because it hasn't.

## 10. Decisions for Sky

🔴 **The final restoration-readiness review (2026-09-21) read HOLD on two literal
gaps (F1, F2) in this runbook's §8 preflight block. Both are now repaired in this
document; this repair still needs its own fresh independent review before any
restoration authorization.**
- **What:** F1 (§8 step-1 block had no fail-fast shell behavior) and F2 (no CLI
  version guard on that path) are closed: the block now uses `set -euo pipefail`,
  splits every `supabase | jq` pair into a checked capture step followed by a checked
  `jq -e` extraction step (so a failed `supabase` call can't be masked by a
  downstream `jq` that still exits 0), and refuses to proceed unless
  `supabase --version` reads exactly `2.116.0`. It also explicitly pins the
  production ref and rejects the staging ref by name, refuses on any missing input
  file, and refuses to overwrite an existing evidence directory. The evidence gap §2
  used to describe (missing `proof.json`/`edge_function.json`) is also closed — both
  files exist and `compare_captured_results.mjs` independently reproduces
  `overall: PASS` against all three saved files, hashes matching. F3 (target-identity
  check) is documented, not silenced: §2 now explains why the historical capture's
  `TARGET_IDENTITY` reads a caveat rather than a real PASS, and the hardened §8 script
  closes it going forward by writing its own truthful `note.json`.
- **Recommendation:** Request one fresh, independent, local-only readiness review of
  this hardened runbook. If it passes, the runbook is ready for your separate,
  explicit restoration go-ahead — distinct from the read-only authorization already
  consumed.
- **Why:** This saga's standing practice is that nothing touching a safety-relevant
  script or comparator is treated as trustworthy until reviewed by someone other than
  whoever wrote the fix — this repair session does not certify itself.
- **Alternative:** None recommended — skipping the review pass here would be the
  first time in this saga a restoration-adjacent change went live without one.
- **Impact:** Zero production risk today. Restoration has not run and cannot run
  without your separate explicit go-ahead. The restoration SQL, its live
  `do $guard$`/`do $absence$` blocks, `verify_post_exit.mjs`, and the frozen
  Phase03B migration bytes are all unchanged by this repair.
