# Morgan — D4 Realtime-Flags Dispatch Control Sheet

**Date:** 2026-05-28
**Owner:** Morgan
**Policy choice:** Option 2 — filtered broadcast (id + status only); clients re-fetch via existing RLS-gated SELECT
**Authorized by:** Sky (2026-05-28 chat)

---

## Sky-approval log

| # | Decision | Authorized by | Scope |
|---|----------|---------------|-------|
| 1 | D4 policy: Option 2 + 4 safeguards | Sky direct chat 2026-05-28 | Standing — until rolled back |
| 2 | **Rory may perform the step-9 main merge for THIS D4 release** | Sky direct chat 2026-05-28 ("Rory can do the merging in step 9, I approve") | **One-time exception to Const. Art. 1, THIS branch only. Not standing.** |

---

## The 4 safeguards (status per spec)

| # | Safeguard | Location | Status |
|---|-----------|----------|--------|
| 1 | Geofence channel | Client-side viewport filter | Owned by Shamus |
| 2 | Per-user opt-in toggle (default OFF) | Client-side ProfileScreen + AsyncStorage `realtime_enabled` | Owned by Shamus |
| 3 | Observability log | Server-side: `realtime_subscribe_log` table + `log_realtime_event()` RPC | **Baked into Dana's SQL** |
| 4 | 30-day review checkpoint | Morgan operational task | Morgan schedules post-merge |

---

## Chain status — ✅ COMPLETE (2026-05-28)

| Step | Owner | Status | Report |
|------|-------|--------|--------|
| 1 | Sky | ✅ DONE | Picked Option 2 + safeguards (2026-05-28 chat) |
| 2 | Dana | ✅ DONE | [2026-05-28_Dana_D4-RealtimeFlags-Filtered-SQL.md](2026-05-28_Dana_D4-RealtimeFlags-Filtered-SQL.md) |
| 3 | Sky | ✅ DONE | SQL applied via Cowork — verified live by Rory pre-flight (publication filter `{id, status}` confirmed) |
| 4–5 | Shamus | ✅ PASS | [2026-05-28_Shamus_D4-Client-Implementation.md](2026-05-28_Shamus_D4-Client-Implementation.md) — commits `3a6d11c`, `29fe3f0` |
| 6 | Gary | ✅ PASS — 21 new tests, **1068/1068 total green** | [2026-05-28_Gary_D4-Tests.md](2026-05-28_Gary_D4-Tests.md) |
| 7 | Jordan | ✅ PASS — all 6 PRIV properties verified against code on branch | [2026-05-28_Jordan_D4-PrivacyReview.md](2026-05-28_Jordan_D4-PrivacyReview.md) |
| 8–9 | Rory | ✅ MERGED to main `670b378` (Sky pre-approval cited in commit msg) | [2026-05-28_Rory_D4-Audit-Merge.md](2026-05-28_Rory_D4-Audit-Merge.md) |
| 10 | Morgan | ✅ 30-day review scheduled for 2026-06-27 09:00 PT | (scheduled-task `morgan-d4-realtime-30day-review`) |

**Final main HEAD:** `670b378` (in sync with `origin/main`)
**Release branch:** `release/d4-realtime-flags-2026-05-28` (staged on local + remote)
**Option-1 SQL files:** renamed to `*.deprecated-option1-do-not-apply` (commit `585acd4`)
**Merge conflict in `flagsStore.tsx`:** resolved by taking feat branch (Option 2 supersedes Option 1 — correct resolution).
**Total chain wall-clock:** ~15 min · **subagent tokens:** ~442K · **agents:** 4 (Shamus Sonnet, Gary Haiku, Jordan Sonnet, Rory Haiku).

---

## Halt conditions for this chain

The implementation workflow halts immediately on:
- Any verdict != PASS from any agent
- Halt sentinel `~/.claude/BACKGROUND_HALT`
- Rory's pre-flight verification finding: D4 SQL not yet applied → halts with "waiting on Sky", does NOT merge
- Rory's pre-flight verification finding: Option-1 SQL applied instead → BLOCK + escalation

## Files touched (catalogue)

**SQL (Dana — already written, NOT applied):**
- `supabase/migrations/2026-05-28_d4_realtime_flags_filtered.sql`
- `supabase/migrations/2026-05-28_d4_realtime_flags_filtered_rollback.sql`

**Code (Shamus — pending):**
- New branch: `feat/d4-realtime-flags-2026-05-28`
- Expected files: `src/screens/MapScreen.tsx`, `src/screens/ProfileScreen.tsx`, possibly new `src/lib/realtime.ts` wrapper, `src/types/database.ts` update

**Superseded (to be renamed by Rory):**
- `supabase/realtime.sql` → `.deprecated-option1-do-not-apply`
- `supabase/migrations/2026-05-24_realtime_flags.sql` → `.deprecated-option1-do-not-apply`

**Release branch (Rory — pending):**
- `release/d4-realtime-flags-2026-05-28`

## Sky-touches remaining

1. **Step 3:** Paste Dana's SQL via Cowork (prompt in Dana's report, also surfaced in the chat)
2. **None for step 9** — Rory pre-authorized

That's it. Two touches total for the rest of D4: the Cowork paste + the verify-it-worked screenshot.

## What happens if Sky never applies the SQL

Shamus, Gary, Jordan can complete fully (client code is independent of SQL state for unit work). Rory halts at pre-flight, marks "waiting on Sky", does not merge. Branch stays staged. Whenever Sky pastes + confirms, re-fire Rory.
