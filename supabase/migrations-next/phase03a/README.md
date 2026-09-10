# Phase 03A local candidate — HOLD

These seven concern-specific migrations and seven forward restoration files are an
unaccepted local candidate. They are deliberately separate from the five accepted
Phase 02 adoption files. The normal Phase 02 replay keeps its original behavior.
No migration here has been applied to hosted staging or production.

`candidate-contract.json` pins the exact order, SQL/restoration/test hashes and
local tooling. Do not use an unfiltered migration push or promote this directory
into applied migration history. Integration requires complete independent
03A-CODE acceptance. No production authorization exists.

The candidate removes the overlapping flag ALL policy, requires authenticated
flag INSERTs to start open, narrows user profile UPDATE, replaces broad user reads
with contextual RPCs, protects internal trigger functions, and narrows effective
table/column/sequence/function access for clients and service role. The seventh
migration preserves the original six pairs and completes the local FDA012
allowlist. New client methods require these currently undeployed RPCs.

Outstanding requirements:

- FDA012: the owner now classifies supabase_admin defaults as a managed platform
  residual. Its exact 48 captured entries are recorded separately. Application
  objects and postgres-owned defaults must meet the effective allowlist; actual
  hosted role/REST/Auth acceptance remains required. No platform-wide claim is made.
- FDA028: no compliant independent anonymous gateway budget is implemented.
  Guest flag/feedback paths and existing global emergency caps remain unchanged.
  Bounded local and staging implementation is authorized, but the trusted client
  signal must be verified before choosing an architecture. IP hashing does not
  separate clients behind one network; freely remintable tokens reset budgets.
- The owner-designated development branch ctshxbykuemeqnofqcdh still requires
  complete independent CODE and INT, its full staging identity/baseline gate,
  hosted role/RLS/REST/RPC tests, two-client tests, rollback/reapply, and independent
  acceptance. Local SQL tests cannot establish those results.

`application-privileges.v1.json` is the reviewed source-backed proposal. It covers
13 active tables, three views, two sequences, 35 routines and seven exact known
historical backups when present. Unrecognized objects, overloads and columns
fail closed. The effective query includes PUBLIC, inherited and column access,
grant options, role/schema capabilities and implicit global function defaults.
CI runs the guard and 18 real database mutation/refusal cases; it does not claim
pgTAP execution. All application objects must be owned by postgres. The external
service role has only flags SELECT/UPDATE(user_id), push_tokens SELECT(token,user_id)
and verify_webhook_secret(text) EXECUTE, derived from the actual deployed functions.

Current client payloads and explicit legacy RLS capabilities remain usable.
The historical direct realtime-log route is removed because the app uses its
bounded RPC. Owner-held manual inspection and trigger writes remain. Verification
weight and preference timestamps use server defaults. Phase04 pipelines and
absent media-intent RPCs gain no invented permissions.

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

A separate schema-only fixture models the seven backup tables without copying
rows. Hosted branches may legitimately lack these historical tables; do not run
the fixture there. When they exist, they must have no client/service privileges.
The local managed-default fixture models the 36 client/service entries; the 12
extra hosted grants back to postgres are recorded in the live residual evidence,
not misrepresented as local platform parity.

Restoration runs all seven exact files in reverse order and compares policies,
functions, table/column/default/sequence ACLs and owners with the pre-candidate
catalog, then reapplies and checks determinism. These restorations reopen known
weaknesses in the captured baseline. They are UNSAFE_BASELINE_RESTORE artifacts,
usable only for the authorized disposable rehearsal until separately reviewed
and authorized for another target. The Phase 02 unsafe rollback files are not
used by this rehearsal.

Owner/admin direct flag DELETE is the Phase 03A transitional proof. The full
application delete-flag Edge workflow stays with Phase 04.
