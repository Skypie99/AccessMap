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
| Production target | `kldlwszpfkdmsjrjhjym` only — never `cepayqmsoqxshsiyqnvz` |

This runbook is only valid for this run ID and this T0. If either the entry receipt or
the database T0 changes for any reason, this entire runbook is stale and must be
regenerated, not hand-edited — see §4.

## 2. Evidence status — what is independently proven vs. what is asserted

Before writing "prove before restoration" as a checklist, it matters what "proof" means
right now, today, in this repo. This saga's own founding rule (`scripts/structural-catalog.mjs`
header) is **"no original artifact, no identity claim."** Applying that rule honestly to
the third live verification as currently reported:

| Claim | Status | Basis |
|---|---|---|
| `FINAL_STRUCTURE_PERMISSIONS_RLS_MODERATION_POINTS`: PASS, hash `f185495387290e1...` | **INDEPENDENTLY VERIFIED** | Raw artifact exists at `qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff/CAPTURED_FINAL_STRUCTURE/structure_catalog.json` (132,102 bytes, valid JSON, correct top-level shape). This session ran `compare_captured_results.mjs` against it directly, locally, offline, and it independently reproduced `PASS` with the exact same hash Sky reported. |
| Ledger count 87, both Phase03B versions present, statement counts 68/23, gate present, pg_net TTL 6h, HTTP queue 0, 0 new responses since T0 | **ASSERTED ONLY, NOT INDEPENDENTLY VERIFIED FROM A SAVED ARTIFACT** | No `proof.json` was ever saved to the `CAPTURED/` or `CAPTURED_FINAL_STRUCTURE/` directory (only `structure_catalog.json` exists). These values come from Sky's report of what ChatGPT's connector said, not from a file this session could re-derive a hash from. |
| Edge Function identity PASS, hash `276dcb14c8...` | **ASSERTED ONLY, NOT INDEPENDENTLY VERIFIED FROM A SAVED ARTIFACT** | Same reason — no `edge_function.json` was saved. |

**This is a real gap, not a formality.** It is the same gap this saga has caught and
fixed in itself multiple times (e.g. the R4/round-4 collisions in
`structural-catalog.mjs`, the pg_net response-history HOLD that led to R11). Recommend
closing it before an independent reviewer is asked to sign off on restoration: re-run
`01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql` and the `supabase functions list` call one
more time (same read-only, zero-mutation pattern already used), save `proof.json` and
`edge_function.json` next to the existing `structure_catalog.json`, and run
`compare_captured_results.mjs` against the complete set. Until that's done, treat the
ledger/gate/edge-function rows above as **HOLD-pending-artifact**, not PASS, however
confident the chat report reads.

## 3. Prove before restoration (preflight gate)

Immediately before the actual restoration attempt — not hours or days earlier — reprove,
fresh, from the same read-only artifacts already built:

1. Target identity exact (`kldlwszpfkdmsjrjhjym`, matches `LIVE_TARGET_IDENTITY.json`).
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

```bash
# --- 1. Fresh preflight reproof (read-only, safe to run any time, no authorization needed beyond the standing read-only one) ---
HANDOFF="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-third-live-verification-external-handoff"
RUNBOOK="/Users/skypie/AccessMap-codex/flagstone-p03b-post-apply-recovery-20260919/qa-reports/phase03b/2026-09-20-restoration-runbook"
mkdir -p "$HANDOFF/CAPTURED_PRE_RESTORATION"
supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file "$HANDOFF/01_QUIESCENCE_LEDGER_GATE_READ_ONLY.sql" --output-format json | jq '.[0].phase03b_quiescence_proof_r3' > "$HANDOFF/CAPTURED_PRE_RESTORATION/proof.json"
supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file "$HANDOFF/02_FINAL_STRUCTURE_CAPTURE_READ_ONLY.sql" --output-format json | jq '.[0].catalog' > "$HANDOFF/CAPTURED_PRE_RESTORATION/structure_catalog.json"
supabase functions list --project-ref kldlwszpfkdmsjrjhjym --output-format json > "$HANDOFF/CAPTURED_PRE_RESTORATION/edge_function.json"
node "$HANDOFF/compare_captured_results.mjs" --captured="$HANDOFF/CAPTURED_PRE_RESTORATION"
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
happens, not by preparing this document.

## 9. Checkpoint maintenance

`qa-reports/phase03b/CURRENT_RECOVERY_HANDOFF.md` and `CURRENT_RECOVERY_STATE.json`
are updated alongside this runbook (same commit) to point here and to record the §2
evidence-status gap. Neither file claims restoration has happened, because it hasn't.

## 10. Decisions for Sky

🔴 **Close the evidence gap in §2 before asking anyone to independently review this
runbook for a go/no-go on restoration.**
- **What:** Only the final-structure check has a saved raw artifact this session could
  independently re-hash. The ledger/gate/pg_net/Edge-Function PASS claims are
  currently only as strong as the chat report of them.
- **Recommendation:** Re-run the same read-only capture for `proof.json` and
  `edge_function.json` (command block in §8, step 1) and save them so
  `compare_captured_results.mjs` reports PASS across the board from saved evidence,
  not from narration.
- **Why:** This is the exact standard the rest of this saga holds itself to — every
  other accepted artifact in this recovery has a file, a hash, and an independent
  re-derivation behind it. Skipping that once, here, would be new to this saga's
  practice, not a continuation of it.
- **Alternative:** Proceed to independent review with the gap noted as an open risk —
  workable, but weaker, and it's the kind of shortcut this saga has specifically been
  burned by before (see the pg_net response-history HOLD that produced R11).
- **Impact:** Until closed, an independent reviewer is being asked to sign off on a
  restoration whose preflight gate (§3, item 6) would itself currently read HOLD, not
  PASS.
