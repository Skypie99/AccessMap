# 10 — Opus Implementation Results (Phase 03C core)

```
CANONICAL_BASE:   6e91ec65bd5f5bdca086fe21949c8477bdc18bac (tree 82d248608f6dec177e497dca7a90c5bc0cda36d4)
RECON_COMMIT:     94338ad36e7ba0899251a2907370fd51cbbf8060
BRANCH:           opus/flagstone-phase03c-core-implementation-20260920
COMMITS:          93bb764d1cfc30250c7273e6fff0286c8f4a4e22  docs: review + locked contract (08, 09)
                  97dd04c10767949c53e2793406a3a24c4af38549  test: contract suite + harness + F2 (tree a8379ec3b0ad0a7cd799b575ad2fd03367494b2c)
                  <the commit adding this file>             docs: results, handoff, evidence
PRODUCTION/STAGING CONTACT: NONE · DEPLOY: NONE · PUSH: NOT PERFORMED · MIGRATIONS: NONE
```

## What was implemented

| File | Change | Why |
|---|---|---|
| `supabase/tests/phase03c-anon-contract.test.sql` | **new**. pgTAP, `PGTAP_EXECUTION: phase-three-c-disposable`, `plan(85)`, sha256 `91fcf0e4…3dc43` | The recon's own central gap (`05_TEST_INVENTORY.md`): no executable proof of the anon boundary existed. It pins C-1…C-10 from 09. That means positive guest reads, the anonymous `RETURNING *` submit and anonymous feedback, the negative space across every private table and RPC, moderation labels, the compat surfaces, exact-set invariants on the anon grant/policy/function surface, storage and realtime, and authenticated/admin compatibility. |
| `scripts/replay-phase03c.mjs` | **new**. Socket-only harness | It uses the same build as the accepted `replay-phase03b.mjs`, reaching ledger-equivalent 87, and adds four things: pinned-pgTAP hash verification, a runtime locality proof, strict `planned == passed` TAP accounting, and a fail-closed refusal if `migrations-next/phase03c/` appears. The three 03B suites run unchanged as regression. |
| `src/lib/flags.ts` (listFlags doc comment, 3 lines replaced by 3) | **F2 fix** | The comment claimed flags were authenticated-only. It now states the real anon contract and points to the proof. It is line-neutral on purpose (see Repairs). |

Deliberately **not** implemented, with evidence in 08: any migration, and the recon's F1, F3 and F4
proposals. Production already enforces the intended contract. Every proposed server change was a
no-op, broke the shipped client, broadened anon access, or pre-empted owner-gated Stage B.

## Results (all local, all on committed HEAD `97dd04c` unless marked)

| Gate | Command | Result |
|---|---|---|
| Baseline, pre-change (HEAD `94338ad`) | `node scripts/replay-phase03b.mjs --pgtap-sql=<pinned>` | **PASS**: compatibility, moderation and points on forward + reapply; safe rollback; reapply schema-exact; temp destroyed |
| Phase 03C harness | `node scripts/replay-phase03c.mjs --pgtap-sql=<pinned>` | **PASS 208/208 · 0 failed**: compatibility 52/52, moderation 49/49, points 22/22, **anon contract 85/85**. Locality: `listen_addresses=''`, socket and data dir are the mkdtemp paths. pgTAP `d4f9c8a4…26b3` equals the pin (1.3.4). Built ledger-equivalent 87. Temp destroyed. → `LOCAL_REPLAY_PHASE03C_RESULT.json` |
| Phase 03B regression | `node scripts/replay-phase03b.mjs --pgtap-sql=<pinned>` | **PASS**: forward + reapply, safe rollback, reapply exact. → `LOCAL_REPLAY_PHASE03B_REGRESSION_RESULT.json` |
| pgTAP discovery | `node scripts/run-pgtap.mjs --discover` | **DISCOVERED**: 22 suites, 0 problems; the 03C suite is classified `pgtap`/`phase-three-c-disposable`/85 |
| Focused Jest | `npx jest --ci -w 3 <17 suites>` (listed in 11) | **17/17 suites · 360/360 tests** |
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Read-only acceptance SQL | `LIVE_READONLY_ACCEPTANCE.sql` on a local replay | Runs clean and every expectation matches locally. The ledger step is production-only, since the local build writes no ledger rows. |

pgTAP source: the contract-pinned build (`candidate-contract.json` `localPgTap`: commit
`968eb53a…`, `generatedSqlSha256 d4f9c8a4…26b3`). It was found already built on disk at
`~/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a…/sql/pgtap.sql`,
hash re-verified, and loaded SQL-only into the disposable DB. Nothing was downloaded or installed.

Locality: every Postgres command ran through a harness that does `initdb` into `mkdtemp`, sets
`listen_addresses=''` (no TCP), and uses a Unix socket inside the temp dir. The environment is an
explicit allowlist (no `PG*`/`SUPABASE*`/`DATABASE_URL` reaches any child), and the process shell
had none set either. No Supabase CLI, no `--linked`, no project ref, no remote URL.

## Mutation controls: the suite fails when the boundary breaks

The same 85-assertion suite, run after each single mutation on a fresh replay (scratch runner,
not committed):

| # | Mutation | Red assertions |
|---|---|---|
| M1 | `create policy … on flag_comments for select to anon using (true)` | #7 policy exact-set, #36 anon reads 1 comment |
| M2 | `alter view flag_status_history_public set (security_invoker = false)` | #10 structural, #39 anon reads the view |
| M3 | `grant execute on public.get_comment_author_profiles(uuid[]) to anon` | #14 catalog EXECUTE count. The behavior stays closed behind the wrapper's `private` schema and in-body caller check, so #14 is the tripwire. |
| M4 | `drop policy "flags rejected hidden from anon"` | #7, #23, #30, #31, #34, #35 |
| M5 | recon F1 made effective (table revoke + allowlist) | #1, #33, then the suite **aborts** on anon's reason read |
| M6 | `replica identity full` on comments + anon storage SELECT policy | #20, #22 |
| M7 | **recon F1 exactly as written** (`revoke select (last_moderation_reason_code) …`) | **none: 85/85.** The privilege does not change, which is proof of the no-op |
| M8 | **recon F4** (`revoke select on flag_comments, flag_photos from anon`) | #1, #2, then **abort**: the shipped guest read throws 42501 |

## Repairs (Mandatory Wall protocol: at most 2 per predicate)

| Predicate | Attempt | Cause | Fix | Outcome |
|---|---|---|---|---|
| `contractManifest.guard.test.ts` (3 tests) | 1 of 2 | The first F2 wording was 7 lines against the original 5. The Phase 02A manifest pins RPC/Edge call sites in `flags.ts` by **exact line**, and every later site shifted +2. | Reworded to exactly 5 lines, a line-neutral diff (`@@ -1067,3 +1067,3 @@`) | PASS, with no manifest edit |

No other failure occurred. There was no unexplained security-test failure.

## Scratch probes (evidence basis for 08; not committed)

- The behavioral anon/authenticated/admin probe produced the exact numbers quoted in 08
  (anon 2 flags / 0 comments / 0 photos / 0 point events / 42501 elsewhere).
- The proposal probe proved the F1 no-op, the effective-F1 `RETURNING *` break, and the F4 throw.
- Two probe artifacts were identified and discarded rather than reported:
  1. `WITH … INSERT` inside a subquery (0A000).
  2. A planner-elided STABLE call that looked like anon EXECUTE. The catalog and the direct call
     both say 42501.
