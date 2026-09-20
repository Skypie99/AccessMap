# Phase03B preexisting-drift exclusion — narrow independent review

**Reviewed repair commit:** `3420d878eb58658a42a299d228c25f2b617752cd`
**Mode:** Fresh independent review, local/offline only. No production or staging contact. No mutation.
**Verdict:** PASS

## What was reviewed

Only the diff introduced by commit `3420d87`: a pinned, exact-match, 7-table
allowlist that excludes the `bk_2026_08_22_*` production-only backup tables
from the Phase03B staging-vs-production **structure equivalence** comparison,
plus the two comparator files it's wired into.

## Independent verification performed (not re-trusting the commit's own claims)

- Re-derived migration SHA-256 hashes myself with `shasum -a 256`; both match
  the pinned constants exactly and match the frozen-migration hashes given in
  the review brief.
- `grep -in bk_2026_08_22` against both frozen migration `.sql` files: no
  match. Neither migration creates, alters, drops, or references any excluded
  table.
- Read `preexisting_structure_exclusions.mjs` directly: the match function is
  exact `(schema === schema) && (table === table)` against a frozen array —
  no `startsWith`, `includes`, or regex against candidate names. A cardinality
  assertion throws if the removed-relation count isn't exactly 7, so a
  match-rule regression fails closed instead of silently widening scope.
- Parsed `qa-reports/phase03a/2026-09-15-production-preflight/PRODUCTION_CATALOG_CAPTURE.json`
  myself: all 7 table names are present in that capture, dated
  `2026-09-15T03:23:45.369Z` — 5 days before the Phase03B production apply T0
  (`2026-09-20T06:20:25.216974Z`). This independently proves pre-existence; I
  did not take the commit's provenance claim on faith.
- Read `qa-reports/phase03b/2026-09-19-production-apply-packet-r11/PHASE03B_PREEXISTING_PRODUCTION_STRUCTURE_EXCLUSIONS.json`
  supporting SQL reference and confirmed `supabase/nonmanaged/destructive-data/2026-08-22_takedown_junk_flags_APPLIED.sql`
  exists on disk and mentions the `bk_2026_08_22_` prefix 39 times, consistent
  with it being the table-creating operation.
- Pulled the accepted staging baseline artifact myself via
  `git show aca5fdbb0f5fd151a5c98d5ca1b956954cf83354:qa-reports/phase03b/2026-09-15-revised-staging/CATALOG_FIRST_REVISED_APPLY.json`
  (sibling branch, no checkout) and confirmed zero `bk_2026_08_22_*` mentions
  anywhere in it, and that its own `checksum` field
  (`f185495387...acb38e7`) matches the pinned `EXPECTED_FINAL_STRUCTURE_SHA256`
  constant the repair still uses unchanged — i.e. the staging artifact was not
  edited to force a match.
- Parsed `qa-reports/phase03b/2026-09-20-structure-divergence-diff.json`
  programmatically: exactly 55 residuals = 7 relations + 48 columns, every
  single `objectName` belongs to one of the 7 pinned tables (zero outliers),
  all classified `D_PREEXISTING_ENVIRONMENTAL_DRIFT`, and zero are
  `only-in-first` (i.e. nothing the accepted baseline expects is actually
  missing from production — no real defect being masked).
- Re-ran all local test suites myself, fresh, in this worktree:
  - `validate_preexisting_structure_exclusions.mjs` → **17/17 PASS**, including
    the specific non-broadening checks this review brief called out by name
    (8th similarly-named table not excluded, prefix-only match not excluded,
    wrong-schema-same-name not excluded, missing-one-of-seven fails closed
    rather than broadening, RLS/ACL and trigger differences on non-excluded
    objects still detected).
  - `validate_ledger_statement_identity.mjs` → **23/23 PASS** (unmodified
    validator, no regression).
  - `validate_post_apply_recovery_transport.mjs` → **13/13 PASS** (unmodified
    validator, no regression).
  - `replay_preexisting_structure_exclusion_offline.mjs` → **PASS**, 0 residual
    differences, observed structure hash exactly matches the expected hash,
    using only the already-captured production evidence on disk (the script
    makes no Supabase CLI call and no network call — confirmed by reading it).

## Conclusion

All 15 checklist items in the review brief hold. The exclusion is exact,
narrow, independently proven pre-existing, provably inert with respect to
both frozen migrations, scoped only to the structure-equivalence comparator,
and does not weaken any other verification surface. No production or staging
contact was made at any point in this review.

This repair is ready for Sky to separately authorize exactly one fresh live
read-only post-apply verification. This review does not authorize that step
and does not run it.
