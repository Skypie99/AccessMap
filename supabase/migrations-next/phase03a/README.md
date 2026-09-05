# Phase 03A local candidate — HOLD

These six concern-specific migrations and six forward restoration files are an
unaccepted local candidate. They are deliberately separate from the five accepted
Phase 02 adoption files. The normal Phase 02 replay keeps its original behavior.
No migration here has been applied to hosted staging or production.

`candidate-contract.json` pins the exact order, SQL/restoration/test hashes and
local tooling. Do not use an unfiltered migration push or promote this directory
into applied migration history. Integration requires complete independent
03A-CODE acceptance. No production authorization exists.

The candidate removes the overlapping flag ALL policy, requires authenticated
flag INSERTs to start open, narrows user profile UPDATE, replaces broad user reads
with contextual RPCs, protects internal trigger functions, and removes client
maintenance/sequence-mutation privileges. Existing DML grants remain governed by
their RLS and explicit column contracts; this is not a claim that all privilege
work is complete. New client methods require these currently undeployed RPCs.

Outstanding requirements:

- FDA012: the hosted postgres role cannot manage supabase_admin defaults. The
  candidate changes postgres-owned defaults only. A supported platform resolution
  or explicit owner disposition is still required; no privilege escalation is
  attempted.
- FDA028: no compliant independent anonymous gateway budget is implemented.
  Guest flag/feedback paths and existing global emergency caps remain unchanged.
  Additional gateway/configuration and guest-caller scope needs owner resolution.
- A separately identified, verified non-production Supabase staging project,
  hosted role/RLS/REST/RPC tests, two-client tests, rollback/reapply, and independent
  acceptance remain required. Local SQL tests cannot establish those results.

The optional local proof uses the accepted socket-only PostgreSQL harness:

```bash
node scripts/replay-migrations.mjs --with-next --local-only --phase03a --phase03a-pgtap-sql=/absolute/path/to/pinned/sql/pgtap.sql --json
```

Build only the SQL target from the pinned upstream source identified in the
manifest. Do not run `make install`. This loads genuine pgTAP into a disposable
test schema, checks complete TAP plans and failure/bailout/skip states, and changes
no global extension files. The standalone TAP parser refusal tests are in
`scripts/__tests__/phase03aReplay.test.ts`.

The local-only baseline supplement models column/default grants omitted by
Phase 02 comparator v3. Before applying candidates, the runner verifies its 18
column, 108 default and 18 sequence ACL entries against the captured hosted
metadata. The fixture is never a hosted migration. Historical Phase 02 source
and receipts remain intact. Local Auth, Storage and webhook stubs do not prove
hosted behavior or delivery.

Restoration runs all six exact files in reverse order and compares policies,
functions, table/column/default/sequence ACLs and owners with the pre-candidate
catalog, then reapplies and checks determinism. These restorations reopen known
weaknesses in the captured baseline. They are UNSAFE_BASELINE_RESTORE artifacts,
usable only for the authorized disposable rehearsal until separately reviewed
and authorized for another target. The Phase 02 unsafe rollback files are not
used by this rehearsal.

Owner/admin direct flag DELETE is the Phase 03A transitional proof. The full
application delete-flag Edge workflow stays with Phase 04.
