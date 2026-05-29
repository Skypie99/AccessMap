---
role: Morgan (PM)
date: 2026-05-29
mode: DIRECT (/morgan)
status: VERIFIED — Dana-confirmed apply order (2026-05-29_Dana_SQL_ApplyOrder_Verify.md)
model_tier: Opus (Sky-initiated)
audience: Sky (live-DB apply — Sky only, Const. Art. 5)
---

# AccessMap — SQL Apply Checklist (Sky-only) — VERIFIED

> Const. Art. 5: only Sky applies to the live DB. This is a READ-ONLY plan.
> Order below is **Dana-verified** for dependency safety. Apply in Supabase SQL Editor in this exact order, one at a time, confirming each succeeds before the next.

## ✅ VERIFIED APPLY ORDER
| # | File | Why / dependency | Idempotent? Rollback? |
|---|---|---|---|
| 1 | `2026-05-27_users_email_privacy.sql` | PII fix — `public.users.email` exposure (Const. 2.4). Highest priority. | Idempotent · 2-line rollback |
| 2 | `2026-05-23_data_layer_hardening.sql` | **Must precede #4** — creates `updated_at` + `on_flag_updated_at` trigger the status trigger relies on. | per file |
| 3 | `2026-05-23_rls_initplan_and_non_owner_status_update.sql` | **Must precede #5** — recreates "flags update own"; if run after #5 it would overwrite the tighter replacement policy. | per file |
| 4 | `2026-05-23_status_update_trigger_proposal.sql` | D3 — non-owner status enforcement trigger. **Steve-approved.** Depends on #2. | per file |
| 5 | `2026-05-25_flag_edit_rls_replacement.sql` | D1 — freezes all 5 immutable cols (lat/lng/created_at/etc). Jordan-gated. Depends on #3. | per file |
| 6 | `2026-05-28_d4_realtime_flags_filtered.sql` | D4 — realtime flags (filtered). Has `_rollback.sql`. | has rollback |
| 7 | `2026-05-25_push_tokens.sql` | D2 — push tokens table. | per file |
| 7b | `2026-05-25_notification_preferences_proposal.sql` | Pair with #7 — companion table (no FK). Was untracked in state (doc gap). | per file |
| 8 | `2026-05-29_anon_flags_select.sql` | Guest map read. **Jordan-approved** (2026-05-29_Jordan_GuestSigninPrivacyGate). No PII surface. | per file |
| 9 | `2026-05-25_flag_edit_history_table.sql` | **CONDITIONAL** — apply ONLY if you answer D6 = YES. | per file |

## ❌ DO NOT APPLY
- `2026-05-25_flag_edit_rls.sql` — SUPERSEDED/dead. Same policy name as #5 but weaker WITH CHECK. Never apply.
- `2026-05-24_realtime_flags.sql.deprecated-option1-do-not-apply` — deprecated, superseded by #6.
- `2026-05-30_flag_creation_rate_limit.sql` — NOT on main; trapped on `fix/security-hardening-2026-05-30` (needs Steve review + merge first).

## Corrections Dana made to Morgan's draft (logged)
1. `data_layer_hardening` MUST run before `status_update_trigger` (column/trigger dependency).
2. `rls_initplan` MUST run before `flag_edit_rls_replacement` (else weak policy overwrites the tight one).

## After-apply pairings (not SQL)
- After #7 push_tokens: deploy `notify-flag-status` Edge Function (Supabase Dashboard) + `npx expo install expo-notifications` at ~/AccessMap, rebuild dev client.
