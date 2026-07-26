---
role: Morgan (PM)
date: 2026-06-03
title: Consolidated Security Record — pre-build reference
trigger: direct /morgan ("take note of all the security stuff before our next build") — in-session delivery (no iMessage per Sky override 2026-05-28)
model_tier: (Sky-initiated session)
coherence_score: 0.98
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
---

# AccessMap — Security Record (pre-build) — 2026-06-03

Authoritative record of every security change this cycle. **All items were applied to the LIVE
Supabase DB (`kldlwszpfkdmsjrjhjym`) by Sky via Cowork, and each was independently verified read-only
by Morgan/Gary after the fact.** A single consolidated re-verification on 2026-06-03 confirms all nine
states below are live and correct. main = `45f7964` (pushed to public `origin`).

## §1 Dependency Graph (security items → verification)
nodes:
- sec/dup-trigger-drop (Sky apply, Cowork) — DONE+VERIFIED
- sec/f3-flag-photos (Sky apply) — DONE+VERIFIED
- sec/f2-function-hardening (Sky apply) — DONE+VERIFIED
- sec/webhook-vault-rotation (Sky apply + Edge Fn deploy) — DONE+VERIFIED
- sec/is-admin-fix (Sky apply) — DONE+VERIFIED
- sec/reviewer-account (Sky create) — DONE+VERIFIED
edges:
- every node → morgan/read-only-verify (gate: live pg_catalog confirms expected state)

## §2 Reason for Ordering
- Live applies were Sky-only (Const. Art. 5 — agents never write the live DB); agents authored runbooks + verified read-only.
- Verification was done against `pg_proc`/`pg_policies`/`pg_trigger`, not report prose — per `LEARNINGS` "trust the live catalog over migration files" (also [[security-audit-2026-06-01]]).
- Webhook rotation sequenced env/Edge-Function before the Vault read so the secret never desynced (Dana runbook §5).

## §3 Blocked Nodes (open security items)
- {node: sec/rotate-reviewer-pw, why: old reviewer password is in public git history + the new one was printed in chat, unblock: Sky generates a fresh password in Supabase Auth + enters it only in App Store Connect Demo Account, type: DECISION_FOR_SKY}
- {node: sec/points-value-canon, why: live trigger awards 10/3/15/7 but schema.sql/CLAUDE.md say 5/2/10/5, unblock: Sky picks canonical + docs updated, type: DECISION_FOR_SKY}

## §4 Checkpoint References
- {name: webhook Vault auth, role: Dana/Cowork, artifact: commit:45f7964 + migration 2026-06-03_verify_webhook_secret.sql, qa-report: 2026-06-02_Dana_WebhookSecret_Rotation_Runbook.md}
- {name: is_admin fix, role: Dana, artifact: migration 2026-05-30_admin_role.sql (applied live), qa-report: 2026-06-02_Dana_is_admin_bug_fix_proposal.md}
- {name: F2/F3 sign-off, role: Steve, artifact: live pg_proc/pg_policies, qa-report: 2026-06-02_Steve_PreTester_Security_SignOff.md}
- {name: gate runbook, role: Morgan, artifact: qa-reports/2026-06-02_SECURITY_GATE_RUNBOOK.md}

## §5 Duplication Report
No duplications detected this cycle.

---

## CONSOLIDATED SECURITY CHANGES (what was hardened)

| # | Change | Before | After | Applied | Verified |
|---|---|---|---|---|---|
| 1 | **Duplicate points trigger** | `on_flag_status_change` **and** `trigger_flag_status_change` both ran `handle_flag_status_change` → points awarded **twice** | `trigger_flag_status_change` dropped; only `on_flag_status_change` remains | LIVE (Cowork) | ✅ one trigger live |
| 2 | **F3 — flag_photos INSERT** | `WITH CHECK (true)` → any authenticated user could attach **any URL** to any flag | `WITH CHECK (position('/flag-photos/' \|\| (select auth.uid()) \|\| '/' in url) > 0)` — caller's own folder only | LIVE (Cowork) | ✅ scoped |
| 3 | **F2 — function hardening** | 2 of 4 trigger fns had mutable `search_path`; all 4 callable via RPC by anon/authenticated | `search_path=public` pinned on all 4; EXECUTE revoked from public/anon/authenticated (triggers still fire as owner) | LIVE (Cowork) | ✅ anon blocked |
| 4 | **Webhook secret rotation → Vault** | **TWO hardcoded secrets**: one in `notify-flag-status` trigger tgargs, one in `notify_flag_status_webhook` function body; webhook silently 401'd (verify_jwt was on, no JWT) — **had never fired** | Secret in Supabase **Vault** only (`webhook_secret`); DB fn reads it at runtime; Edge Function verifies via `public.verify_webhook_secret(text)` RPC (boolean back, raw value stays in Vault); `config.toml verify_jwt=false`; broken trigger dropped | LIVE (Cowork + Edge Fn deploy) | ✅ **200 ok ×3**; no literal; reads Vault; 0 http_request triggers |
| 5 | **is_admin bug fix** | `handle_flag_status_change` referenced `users.is_admin` (column didn't exist) → flag **REJECT/REOPEN transitions errored** on prod | Applied `2026-05-30_admin_role.sql`: adds `is_admin boolean DEFAULT false`, dormant admin-delete-any-flag RLS policy, hardened user-update policy (blocks self-promotion) | LIVE (Cowork) | ✅ column exists; reject/reopen succeed |
| 6 | **Reviewer test account** | none existed | `reviewer@accessmap.com`, `is_admin=false`; **hardcoded password redacted** from a committed migration comment before the public push | LIVE (Sky) | ✅ exists, not admin |

**Inherited from Steve's prior pass (already in main before this cycle):** F1 RLS non-owner-DELETE fix
(applied + live-verified), fail-safe RemoteImage, per-tab error boundaries, create-time input validation.

## MIGRATION STATUS (for the repo record)
| File | Status |
|---|---|
| `2026-06-01_flags_policy_consolidation.sql` (F1) | applied live (prior cycle) |
| `2026-06-01_flag_photos_insert_guard.sql` (F3) | **applied live this cycle** |
| `2026-06-01_function_exec_and_search_path_hardening.sql` (F2) | **applied live this cycle** (notify fn portion superseded by #4) |
| `2026-05-30_admin_role.sql` | **applied live this cycle** |
| `2026-06-03_verify_webhook_secret.sql` | **applied live this cycle** (Vault RPC) |

> Note: live DB has drifted from `supabase/schema.sql` (these migrations applied, schema not regenerated).
> For backend reasoning trust `get_advisors`/`pg_*`, not schema.sql. See [[security-audit-2026-06-01]].

## Pre-existing advisor items NOT introduced this cycle (post-tester, Dana)
- `auth_rls_initplan` WARN — wrap `auth.<fn>()` as `(select auth.<fn>())` in several RLS policies.
- `multiple_permissive_policies` WARN — consolidate overlapping permissive policies.
- Enable leaked-password protection (Supabase dashboard).

---

## DECISIONS FOR SKY
1. **Rotate the reviewer-account password** before App Store submission — the old documented value is in public git history and the new one was printed in chat. Low/internal risk (a reviewer account can only do what any user can — RLS blocks everything else), but rotate for hygiene + Apple's credential scan. Confirm when done.
2. **Point values** — live awards `10/3/15/7`; `schema.sql`/`CLAUDE.md` say `5/2/10/5`. Accept live as canonical (update docs) or revert the trigger? (Not a build blocker.)

**Build readiness from a security standpoint: GREEN.** Nothing on this list blocks the EAS TestFlight
build. The two open items are pre-App-Store hygiene, not pre-TestFlight blockers.
