# Phase 03B — offline final-structure divergence diagnosis (2026-09-20)

> Note on authorship: filed under the established `_Codex_` naming convention used
> throughout this `qa-reports/phase03b/` saga for continuity with prior artifacts.
> This specific diagnosis was performed by Claude (Sonnet 5), continuing the
> handoff left by the prior session, entirely offline against already-captured
> evidence and committed git history — no live production contact.

## Scope

The second live read-only post-apply verification (2026-09-20, evidence at
`qa-reports/phase03b/2026-09-20-second-live-post-apply-verification/`) reached
structural capture and halted fail-closed with:

> `Final structure differs from accepted revised-staging final artifact`

- Observed `normalizedStructureSha256`: `5060adfbe389716a940e8a09a06d888159a5f94864137c41c42a5d26c42ac766`
- Expected `EXPECTED_FINAL_STRUCTURE_SHA256`: `f185495387290e1effaeda12bf3381a55fba7a67d8610940581927412acb38e7`

This report diagnoses that single mismatch completely offline: no Supabase
queries, no live verifier, no migration/controller reruns, no production or
staging mutation.

## 1. Identifying the expected artifact

`verify_post_apply.mjs` hardcodes `EXPECTED_FINAL_STRUCTURE_SHA256` but does not
carry the artifact itself in this worktree. Its own R3-repair documentation
(`qa-reports/2026-09-17_Codex_Phase03BProductionApplyPacketR3Repair.md`, line 81)
names the source:

> "exact accepted normalized final-state SHA-256 `f1854953...` from staging
> evidence commit `aca5fdb...`"

`git log --all` resolves `aca5fdb` to `aca5fdbb0f5fd151a5c98d5ca1b956954cf83354`
("test(phase03b): bank revised staging catalog evidence", 2026-09-15). That
commit is **not an ancestor of the current branch's HEAD** — it lives on
`codex/flagstone-p03b-revised-staging-20260915` (and its independent-review
sibling) — so it was read via `git show <sha>:<path>` without checking out or
modifying anything in this worktree.

The commit adds four files under `qa-reports/phase03b/2026-09-15-revised-staging/`.
Their embedded `checksum` fields (written by `scripts/structural-catalog.mjs`'s
own `writeCapture()`, so they self-report the hash of their own content):

| File | label | checksum |
|---|---|---|
| `CATALOG_PREMUTATION.json` | PREMUTATION | `86011aa2...` (pre-migration state — different, as expected) |
| `CATALOG_FIRST_REVISED_APPLY.json` | FIRST_REVISED_APPLY | **`f1854953...`** ✅ matches |
| `CATALOG_REAPPLY.json` | REAPPLY | **`f1854953...`** ✅ matches |

**`EXPECTED_ARTIFACT_PATH = qa-reports/phase03b/2026-09-15-revised-staging/CATALOG_FIRST_REVISED_APPLY.json`**
(commit `aca5fdbb0f5fd151a5c98d5ca1b956954cf83354`). The banked
`STRUCTURAL_DIFF.json` in the same commit independently confirms
`FIRST_REVISED_APPLY` and `REAPPLY` are byte-identical after normalization
(`residualCount: 0`), so this expected baseline is internally reproducible, not
a one-off fluke.

Both migration files' SHA-256 were re-verified against the frozen candidate in
this worktree (`supabase/migrations-next/phase03b/20260915210256_...sql` →
`b1d7b5a6...`, `supabase/migrations-next/phase03b/20260915210413_...sql` →
`0b8ad388...`) — exact match, no drift, confirming this really is a comparison
against the correct, unmodified, frozen migration candidate.

## 2. Temporary-gate exclusion check

`verify_post_apply.mjs` filters exactly 1 function
(`private.flagstone_phase03b_block_row_lifecycle_r2`) and exactly 2 triggers
(`aaa_flagstone_phase03b_row_lifecycle_quiescence_r2`,
`aaa_flagstone_phase03b_truncate_quiescence_r3`) before hashing, and asserts
that cardinality (`throw` if not exactly 1 and 2). The object-level diff below
shows **zero residuals in `functions` or `triggers`** — so the exclusion
worked exactly as designed, and the mismatch is not caused by a leaked gate or
recovery object.

**TEMPORARY_GATE_EXCLUSION: PASS**

## 3. Deterministic object-level diff

Ran the repo's own comparator (`scripts/structural-catalog.mjs diff`, the same
tool that produced the original R3-accepted evidence — no ad-hoc diffing
logic) between:

- `--first` = `CATALOG_FIRST_REVISED_APPLY.json` (expected, from commit `aca5fdb`)
- `--second` = `qa-reports/phase03b/2026-09-20-second-live-post-apply-verification/NORMALIZED_STRUCTURE_EXCLUDING_EXACT_GATE.json` (observed, from this run)

Both inputs were already `normalizeCatalog()`-normalized before this diff (the
capture tool normalizes on write; the verifier normalizes before hashing), so
this is a semantic diff, not a serialization diff.

**Result: 55 residuals, all `only-in-second` (present in production, absent
from the expected artifact). Zero `only-in-first` residuals** — nothing the
expected artifact requires is missing from production.

| Section | Residuals | Side |
|---|---|---|
| `relations` | 7 | only-in-second |
| `columns` | 48 | only-in-second |
| everything else (`schemas`, `functions`, `policies`, `triggers`, `roles`, `defaultAcls`) | 0 | — |

The 7 relations:

```
public.bk_2026_08_22_flags
public.bk_2026_08_22_flag_comments
public.bk_2026_08_22_flag_edit_history
public.bk_2026_08_22_flag_photos
public.bk_2026_08_22_flag_status_history
public.bk_2026_08_22_flag_verifications
public.bk_2026_08_22_point_links
```

All 48 column residuals belong exclusively to those same 7 tables (verified
programmatically: `0` column residuals on any other table). No policy,
trigger, function, role, schema, or default-ACL residual exists anywhere.

## 4. Tracing the root cause

`grep`-ing both frozen migration files for `bk_2026_08_22`: **0 hits in
either.** Neither migration creates, touches, or references these tables.

`grep -rl bk_2026_08_22` across the repo surfaces
`supabase/nonmanaged/destructive-data/2026-08-22_takedown_junk_flags_APPLIED.sql`,
whose header states these 7 tables are pre-delete backups from a one-time,
Sky-waived, agent-applied production cleanup ("do the whole thing now"),
**applied 2026-08-23** — closing PRODUCT_READ MUST-1 (removing dev junk/profanity
flag rows before App Store screenshots/review). This is a known, already-closed,
already-documented production-only operation, unrelated to Flagstone's normal
migration pipeline (it lives under `nonmanaged/`, explicitly outside
`supabase/migrations/`).

Cross-checked against **Phase03A's own production preflight capture**, taken
2026-09-15 — five days before Phase03B's production apply, and the same day
the Phase03B staging baseline was banked:
`qa-reports/phase03a/2026-09-15-production-preflight/PRODUCTION_CATALOG_CAPTURE.json`
already lists all 7 `bk_2026_08_22_*` relation names. **These tables
unambiguously predate Phase03B.**

They're absent from the expected artifact only because the Phase03B staging
target (`cepayqmsoqxshsiyqnvz`) is a separate Supabase project that never
received the 2026-08-22 production-only destructive-data operation — it was
never going to have these tables, structurally, regardless of what Phase03B's
migrations do.

## 5. Classification

**All 55 residuals: `D. PREEXISTING_ENVIRONMENTAL_DRIFT`.**

- Not `A` (production defect) — production correctly reflects both frozen
  migrations; nothing migration-created is wrong or missing.
- Not `B` (stale/incorrect expected artifact) — the expected artifact is
  correct *for staging*; staging was never supposed to have these tables.
- Not `C` (normalization/representation only) — this is a real, substantive
  object-inventory difference, not a serialization artifact (confirmed
  identical-input reproducibility via the banked `REAPPLY` checksum).
- Not `E` (unknown) — fully traced to a named, dated, documented, git-committed
  source with independent cross-confirmation from a second unrelated capture.

Security/permission relevance: `relations` and `columns` are on the
`AUTHORIZATION_SURFACES` watch-list by category, but every individual residual
here is an entire table appearing wholesale (not a grant/RLS/default change on
a table both sides share), and it's a backup table nobody's application code
queries. **Can it affect application behavior:** no — `src/lib/flags.ts` and
the rest of the app only ever address `public.flags` and its siblings, never
`bk_2026_08_22_*`.

## 6. What this means, without deciding it

Neither side is "wrong" relative to the frozen migration bytes. This is an
adjudication question, not a repair: should the comparator's fixed exclusion
list (currently exactly 3 objects: 1 gate function + 2 gate triggers) be
extended to also exclude `bk_2026_08_22_*` going forward, given they're a
known-closed, already-decided, production-only artifact that will never exist
in the staging project this pipeline validates against? That's a scope
decision for Sky, not something this diagnosis resolves on its own — per the
task's own constraint, no expected-artifact or comparator change is made here.

## Output

- This report: `qa-reports/2026-09-20_Codex_Phase03BOfflineStructureDivergence.md`
- Machine-readable diff: `qa-reports/phase03b/2026-09-20-structure-divergence-diff.json`
- No product, migration, or verifier file was modified.
