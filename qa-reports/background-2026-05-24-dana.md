---
mode: background
model_tier: opus-4.7
project: accessmap
cycle_id: dana-background-2026-05-24
role: Dana (Backend & Database Engineer)
branch: (none — AUDIT-ONLY per Const. 12.5)
base: main
constitution: v1.11 / AGENT_OS v1.11
art_12_compliance: HALT-check passed; AUDIT-ONLY (no commits, no file mutations); no external sends; ≤1 reversible change rule N/A (zero changes); `~/.claude/**`, governance docs untouched
---

# Dana — AccessMap background cycle 2026-05-24

## Posture

BACKGROUND mode + privacy-sensitive project → **AUDIT-ONLY** (Const.
12.5). Read + propose only. Companion to MutualMesh report
[background-2026-05-24-dana.md](../../MutualMesh/qa-reports/background-2026-05-24-dana.md);
findings here are smaller — AccessMap's data layer is in much better
shape than MutualMesh's because Dana audited it just yesterday (the
hardening + feedback + RLS-initplan + status-update-trigger migration
quartet on 2026-05-23). This cycle confirms nothing has regressed and
flags two polish items.

## Baseline check ✓

Reviewed:
- [supabase/schema.sql](supabase/schema.sql) (224 lines)
- [src/types/database.ts](src/types/database.ts) (107 lines)
- [supabase/migrations/](supabase/migrations) (4 files, all 2026-05-23)
  - `2026-05-23_data_layer_hardening.sql` — `updated_at` column,
    description cap, points >= 0, composite index, geo index drop
  - `2026-05-23_feedback_table.sql` — `public.feedback` table + RLS
  - `2026-05-23_rls_initplan_and_non_owner_status_update.sql` — RLS
    perf rewrite + triage policy
  - `2026-05-23_status_update_trigger_proposal.sql` — points trigger

All migrations remain FILES; Sky has not yet applied them (per
CLAUDE.md "Recent QA pass (2026-05-22)" framing and the fact that
`database.ts:24-28` still marks `updated_at` as `?:`-optional with the
explicit "Optional until ... is applied" comment).

`type` (not `interface`) used throughout [database.ts](src/types/database.ts) ✓ — Gotcha
#1 holds. `EmptyRelationships` alias used for every table ✓.

## Findings

### A1 — `updated_at` staging strategy is correct; just confirm

`FlagRow.updated_at?` is intentionally optional pending migration apply
([database.ts:24-28](src/types/database.ts:24)). Once Sky applies
`2026-05-23_data_layer_hardening.sql`, tighten to required (`string`,
not `string | undefined`). Same pattern recommended for MutualMesh in
that report's Section G.

**Action for Sky:** when you next sit down to apply migrations on the
AccessMap live DB, queue the `?` removal as a one-line follow-up PR
right after. Surface to Morgan when ready.

### A2 — `feedback` table type also marked optional; mirror staging

[database.ts:86-99](src/types/database.ts:86) marks the entire
`feedback` Tables entry "Optional until `2026-05-23_feedback_table.sql`
is applied." The submitFeedback() dual-write to mailto: covers the
PostgREST-error case if the table doesn't exist; that's solid defense.

No action needed unless Sky applies the migration — then drop the
"optional until" comment in the same follow-up PR as A1.

### A3 — `flags status update by any authenticated` RLS policy uses 7 correlated subselects

[supabase/schema.sql:172-186](supabase/schema.sql:172). The WITH CHECK
compares every non-status column on NEW against OLD via 7 separate
`(SELECT col FROM public.flags WHERE id = flags.id)` subqueries. This
is the "non-owner triage" policy that lets any authenticated user
change ONLY the `status` column.

Performance shape: at most 7 index-lookups per UPDATE statement (PK
lookup, planner caches the plan). At staging scale (<500 rows) this
is fine — invisible. At a hypothetical 10k+ daily triage volume it
becomes the dominant cost of the UPDATE path.

The schema comment correctly explains the design choice (READ COMMITTED
visibility of the in-flight UPDATE). The alternative — a BEFORE UPDATE
trigger that copies NEW columns from OLD for non-status fields — is
mechanically simpler but moves the security boundary from RLS (where
Steve audited it) to a trigger (where it's easier to forget). **Keep
the RLS approach.** Just flag for Peter to benchmark once row counts
grow past ~5,000.

**Proposal (no commit):** add this note as a `COMMENT ON POLICY` so
future readers find the rationale at the policy site:

```sql
-- Append to schema.sql after the policy definition (line 186 area).
COMMENT ON POLICY "flags status update by any authenticated" ON public.flags IS
  'Triage policy: non-owners may UPDATE only the status column. WITH CHECK
   uses 7 correlated subselects to compare NEW vs OLD on non-status columns
   (READ COMMITTED visibility of the in-flight row). Performance is fine at
   staging scale; if daily UPDATE volume exceeds ~5,000, consider a BEFORE
   UPDATE trigger alternative — but route the redesign through Steve because
   it moves the security boundary off RLS.';
```

### A4 — `flag-photos` Storage bucket is PUBLIC (intentional)

[supabase/schema.sql:198-205](supabase/schema.sql:198). Bucket is
created with `public = true`; no SELECT policy added (correctly — a
SELECT policy on `storage.objects` would only enable LIST). Photos are
served as `/object/public/flag-photos/...` URLs.

**Verify against threat model:** this is materially different from
MutualMesh's `resource-photos` bucket which is PRIVATE (`public =
false`, signed-URL only, S4 from Steve's audit). The difference is
intentional and documented:

| App | Bucket public? | Reason |
|---|---|---|
| AccessMap | YES | Accessibility flag photos are inherently public observations of public infrastructure (broken sidewalks, missing ramps). Public visibility is the point. |
| MutualMesh | NO | Resource photos may contain PII (faces, addresses, identifying interior shots of a person's home/storage). Surveillance-averse audience. |

No change needed — flagged for cross-project awareness only.

### A5 — `handle_flag_status_change` security-definer trigger

[supabase/schema.sql:75-118](supabase/schema.sql:75). Forward-only point
award; `revoke execute on function ... from public, anon, authenticated`
([line 121](supabase/schema.sql:121)) correctly prevents direct RPC
invocation. Trigger still fires (revoke removes only PostgREST/RPC
access; trigger-fired execution is internal).

Edge case worth a comment: rapid double-transition `open → verified →
resolved` by the same actor in one session awards both reporter (+5 then
+10 = +15) and actor (+2 then +5 = +7). The trigger's forward-only IF
chain handles this correctly — each transition is independently
evaluated. CLAUDE.md describes this in "Points trigger" — fine.

No action needed; this is the documented behavior.

## Summary

- **Type drift:** none. AccessMap's `database.ts` is in lockstep with
  the live schema (Cycle 1 base) and explicitly marks not-yet-applied
  migration columns as optional with a comment pointing to the file. Best-
  in-class pattern; MutualMesh report recommends copying it.
- **RLS performance:** A3 is the only watch-item. Re-benchmark once
  row counts pass ~5,000.
- **Storage policy posture:** intentionally divergent from MutualMesh.
  Documented above.

## DECISIONS FOR SKY

None blocking. When you next apply AccessMap migrations to the live
DB, queue the `?` removal on `FlagRow.updated_at` and the
"optional until" cleanup on the `feedback` entry in the same follow-up
PR. Single one-line touch, zero risk.

## Const. Art. 12 compliance ledger

- HALT sentinel check: passed (no `~/.claude/BACKGROUND_HALT`).
- Project posture: AUDIT-ONLY (12.5). Zero files modified, zero
  commits, zero migrations authored.
- External sends: none. Morgan picks this up.
- Hard exclusions: `~/.claude/**`, `~/ClaudeCorp/.claude/**`,
  Constitution, AGENT_OS, role files, governance docs — none touched.
- ≤1 reversible scoped change: rule N/A (zero changes).
- Branch prefix: N/A (no branch created).

## End of cycle
