# Phase 03B database candidate

This directory is a local-only Phase 03B candidate. Its migrations must not be
applied to staging or production without the separate environment-specific
owner gate.

Apply order:

1. `20260915210255_phase03b_moderation_semantics.sql`
2. `20260915210413_phase03b_points_integrity.sql`

Rollback order is the reverse. Both rollbacks are safe compensating
restorations, not historical schema rewinds:

- the points rollback preserves claims/counters/events and disables the affected
  prospective rewards instead of restoring the penalty or farming paths;
- the moderation rollback preserves audit/reason evidence and rejected-row
  hiding, revokes the admin queue/decision RPCs, and narrows the status RPC to
  community-only compare-and-set transitions.

Reapplying the forward migrations restores capabilities from the preserved
state. Neither rollback discards captured evidence.

## Flag-removal boundary

`moderate_report(..., 'flag_removed', ...)` makes the relational flag deletion
and report closure one database transaction only when the flag has no photo URL,
canonical photo object key, or `flag_photos` rows. A flag with any storage
association fails closed with SQLSTATE `55000`; deleting its Storage object and
closing the report cannot be made atomic inside Postgres. Such flags must keep
using the canonical `delete-flag` Edge route, which verifies Storage absence.
Phase 03B does not weaken that safety boundary or claim an atomic cross-service
delete.

## Legacy recovery

A flag rejected before Phase 03B has no `flag_moderation_events` rejection row.
Admin restore remains allowed. Its append-only restore event records the real
restoration reason and leaves `reverses_event_id` null; the migration does not
invent historical rejection evidence.
