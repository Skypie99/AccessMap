# Phase 03A — independent preflight reviews

Reviewed source: `c2e36800b269ee22f29d0be35cfb88dace7c2afc`

Tree: `7a68541462f0a9e1d55f48d98ea54df0fc0b01b7`

Review mode: two bounded independent agents, read-only. Root records their returned findings here.
These are preflight reports, **not SQL implementation acceptance or Steve/Dana staging signatures**.

## 03a_predecessor_review — migration and provenance

The agent independently verified clean predecessor identity, accepted ancestry and:
71/71 migration SHA-256/byte pairs against the crosswalk and immutable Build 33 blobs;
71 ledger version/name pairs; comparator file hash; and the stored comparison's normalization
and exact seven-backup-table residual. With-next matches ten stored catalog sections after that
declared residual; applied-only correctly differs. Root separately recaptured current raw
production without residual removal.

Agent-run read-only commands and results:

- `node scripts/generate-migration-crosswalk.mjs --check`: exit 0, current.
- `node scripts/check-schema-snapshot.mjs`: exit 0, 87 ordered inputs.
- `node scripts/run-pgtap.mjs --discover`: exit 0, three suites, one fixture, one raising proof.
- Git ancestry, source-file hash/byte checks and stored comparison reconstruction: exact matches.

The agent did not rerun database replay, behavior, rollback or heavy gates; those historical
Phase 02 results remain inherited, not freshly executed.

The accepted predecessor's constraints are real:

1. No staging identity or mutation authorization is supplied by its receipts.
2. Comparator v3 does not capture per-column/default/sequence ACLs or owners. Root has added
   a fresh supplementary read-only capture, not modified the accepted comparator.
3. pgTAP execution was unavailable before later applies. Two discovered deletion suites are
   authorized-staging-only and depend on proposals outside Phase 03A's deletion scope.
4. The five adoption candidates remain inert and separately gated; source acceptance did not
   close FDA-027's production ledger.
5. Their rollback contract is disposable-only: four unsafe source-baseline restorations and one
   atomic non-reversible-security refusal. It cannot be treated as a production rollback package.
6. Backend direct DELETE rights do not prove current client deletion success. Accepted 02A
   already records the Edge-only client contract break as FDA-002.
7. No Phase 03A SQL acceptance, hosted rollback proof, gateway decision, two-client test or
   production token is inherited.

Evidence locators on the accepted base:

- `qa-reports/2026-09-03_Phase02B_CanonicalMigrationSource.md:597–797`
- `qa-reports/2026-09-03_Phase02A_ProductionContractTruth.md:153`
- `supabase/migrations-next/rollback/rollback-contract.v1.json:3`
- `supabase/migrations-next/rollback/20260904000400_adopt_execute_revokes.rollback.sql:8`

Verdict: **accepted predecessor identity/artifacts verified; Phase 03A preconditions remain
incomplete. No Phase 02 identity drift.**

## 03a_code_dependency_review — authorization and callers

The agent confirmed clean predecessor identity before and after source review.
It ran no tests or remote tools and wrote no files.

| Area | Direct source result |
|---|---|
| FDA-009/023 | `schema.generated.sql:1952,1966,2015` shows guest open-only INSERT, authenticated owner INSERT without status pin, and permissive PUBLIC ALL overlap. Another permissive INSERT policy would not constrain the existing OR composition. Current authenticated create omits status (`src/lib/flags.ts:1271`); guest create sends open (`:1786`). |
| FDA-010 | Six residual trigger helper signatures are listed in `deployed-contract.v1.json:80`. Keep separate RPC allowlist for dispute/reopen counters, realtime logging, caller-scoped private admin helper and service-only webhook verification. A broad trigger EXECUTE grant does not establish that its body is callable outside trigger context. |
| FDA-012 | Table UPDATE and other excess grants remain in accepted capture. Comparator `supabase/replay/compare.sql:33–39,96–119` omits column/default/sequence ACLs and owners. Bootstrap `supabase/replay/00_platform_bootstrap.sql:183` reproduces broad defaults; fixing existing objects alone leaves future-object grants unresolved. |
| FDA-021 | `src/lib/users.ts:18–59` requires profile updates and returning SELECT columns. Avatar fallback at `:119` writes both avatar_url and avatar_object_key=null. Keep the media-key guard (`20260830130000_promptb_media_key_read_contract.sql:127`). Remove effective table UPDATE before a column allowlist can constrain writes. |
| Rewards | `schema.generated.sql:338–645` contains trusted report/photo/comment/vote/status/streak writes; trigger attachments at `:1447–1510`. Preserve definitions and existing reject penalty semantics. Owner metadata was needed and root has freshly captured it. |
| FDA-026 | `src/lib/admin.ts:30–34` reads users.is_admin. `src/lib/flags.ts:1680–1722` queries/counts users for leaderboard and rank. `src/lib/comments.ts:28–32` embeds users.display_name, including INSERT returning. Self-only RLS breaks other users' bylines and global rank without compatible contracts. |
| Admin dependency | Flag/comment admin DELETE uses users subqueries (`schema.generated.sql:1718–1729`); Storage admin delete is in `20260729053159_sr050_admin_delete_flag_photo_20260729.sql:6`. Existing private helper (`20260904000000_adopt_private_admin_helper.sql:27`) is caller-scoped with empty search_path. It should be preserved/adapted, not claimed newly created. |
| FDA-028 | Global guest caps are 100 flags/hour and 30 feedback/hour (`schema.generated.sql:170,72`). Client AsyncStorage throttle (`src/lib/anonRateLimit.ts:3`) is not a trusted server boundary. Guest create goes directly to Data API (`src/lib/flags.ts:1789`). No source proof establishes isolated client budgets. |

The agent identified the §16 caller-scope issue: leaderboard/comment rewiring is not clearly within
the explicit admin/owner client allowance. It recommended owner adjudication rather than a silent
contract change.

Two independent preservation corrections:

- `src/lib/flags.ts:1442–1453` and `client-expectations.v1.json:102–120` show the existing Edge-only
  deletion defect. Preserve transitional DB privileges without taking over the deletion pipeline.
- `supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql:15–50` asserts direct DELETE denial for the
  later deletion architecture. It is not a Phase 03A transitional success test and must not be
  modified merely to make this phase green.

Verdict: **source preflight complete; contract/scope/policy decisions unresolved. No implementation
acceptance.**

## Root reconciliation

Root's fresh production capture matches the accepted production evidence; the above source
dependencies remain current within that catalog scope. Root additionally verified expanded
privileges and current pgTAP absence. Crosswalk/snapshot checks pass in the new worktree;
typecheck is currently unavailable because tsc is absent.

No reviewer verdict was converted into a phase PASS. The main receipt retains all four internal
task IDs and all seven findings with non-PASS dispositions. Final receipt review, if recorded,
checks evidence accuracy only.

## Independent final receipt audit

The predecessor reviewer independently reproduced final-production versus accepted-production
equality in all ten sections plus metadata, checked the unchanged SQL wrapper/comparator and
baseline hashes, checked expanded privilege counts, and confirmed the forty-path inventory and
actual local gate outcomes. It found the explicit scope/privacy/environment stops support BLOCKED.
Root corrected its three requested wording issues before finalization. The reviewer did not
inspect a separately saved first fresh capture and did not supply any behavioral acceptance.
Its final audit made no writes. Hash-index, copy, links and final preservation checks remain
root finalization responsibilities.
