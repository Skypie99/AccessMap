# AccessMap — Project State

**Updated:** 2026-05-25 (morning cycle — post night-cycle Wave 5 + overnight branch activity)
**Source:** Morgan read pass | git log | qa-reports | migration files
**Main SHA:** `1659092` · Tests: 789/789 · TSC errors: 0 · Test suites: 52

---

## Features

### LIVE (on main, shipped)

| Feature | Notes |
|---|---|
| Photo thumbnails in triage | FlagCard inline photo → PhotoLightboxModal; onError graceful degradation |
| Offline tile cache | `src/lib/tileCache.ts` TTL 7d, LRU 50 MB, user-keyed; sign-out clear wired |
| My Flags toggle | "All / Mine" chip in TasksScreen; AsyncStorage-persisted |
| Status history UI | FlagDetailModal "History" tab; graceful degradation if migration not yet applied |
| flagsMap O(1) lookups | `useMemo` Map in FlagsContext; replaces O(n) `find()` in TasksScreen |
| renderItem memoization | `useCallback` in TasksScreen; React.memo on FlagCard now effective |
| 3 a11y residuals (Wave 5) | MapScreen announceForAccessibility; useReducedMotion both PlatformMap variants; web photo alt text |
| ESLint + Prettier | `eslint.config.js`, `.prettierrc.json`, lint/format npm scripts |
| Jest open-handles fix | `jest.mock('../supabase')` in filterSets + mapFilters test files |
| GitHub Actions CI | typecheck + test on push/PR |
| Offline flags cache | AsyncStorage 24h TTL, user-scoped, stale-while-revalidate, offline banner |
| Push notification client | Token storage, settings toggle, sign-out clear, Edge Function written — awaiting Sky DB steps |
| Dark mode | useColor() + ThemeContext, all 8 token categories |
| Flag pagination | Cursor-based Load More |
| Activity Feed, Watched Flags, Saved Places, Visit Streak, Achievements | Stable |
| Address search, Open in Maps, Feedback flow, Help/FAQ, About, What's New | Stable |
| Text search (NFC), Notification prefs, Tasks sort, Map long-press, Nearest flag jump | Stable |
| Realtime flags (client wired) | Subscription wired; awaiting DB migration to go live |

### BUILT-NOT-MERGED (ready pending Sky action)

| Branch | What | Gate |
|---|---|---|
| `origin/shamus/marker-clustering-2026-05-25` | Marker clustering + flag editing UI; Gary's 20 `updateFlagContent` tests; Alex 5 a11y fixes — all stacked on one branch | Sky applies `2026-05-25_flag_edit_rls_replacement.sql` first, then merge is safe |
| `origin/feat/expo-web-vercel-2026-05-25` | Expo Web build + Vercel deployment config | Sky review — no migration dependency; low risk |

### IN-PROGRESS / CARRY-FORWARD (open branches, not yet merged)

| Branch | What | Action |
|---|---|---|
| `fix/dani-statushistory-darkmode-2026-05-25` | StatusHistoryModal raw `'#fff'` tokens + list/listitem a11y roles | Spawn next Shamus task chip |
| `chore/design-token-residuals-2026-05-25` | radius.circle, overlayBtnPressed, accessibilityRole cohesion | Spawn next Dani task chip |
| `worktree-agent-a31117016067fc579` | 15 unique commits including shared FlagsProvider code; unaudited | Audit before deleting — possible cherry-picks |

### PLANNED (approved, build not started)

| Feature | Gate / Notes |
|---|---|
| Leaflet tile interception (web-only) | No native dep; pseudo-code in `2026-05-25-shamus-offline-tiles.md`; low complexity |
| Neighbourhood heat-map | Jordan APPROVED WITH CONDITIONS (k>=3 floor, severity disclosure). Sky decision on severity-colour rendering needed before Shamus builds (see Open Decisions D5) |
| Flag edit history audit table | `2026-05-25_flag_edit_history_table.sql` CONDITIONAL — Sky answers YES/NO first (D6) |
| EAS Build / TestFlight | `eas.json` missing; Rory proposed config in `release-2026-05-25.md` |
| `expo-notifications` install | `npx expo install expo-notifications` + rebuild dev client; unblocks push notifications end-to-end |

---

## Migrations

| File | Status | Notes |
|---|---|---|
| `2026-05-23_data_layer_hardening.sql` | PENDING (file only) | Sky applies via Supabase SQL Editor |
| `2026-05-23_feedback_table.sql` | APPLIED (Cycle F confirmed) | `public.feedback` table live |
| `2026-05-23_rls_initplan_and_non_owner_status_update.sql` | PENDING (file only) | Sky applies via SQL Editor |
| `2026-05-23_status_update_trigger_proposal.sql` | **APPROVED — AWAITING SKY APPLY** | Steve signed off 2026-05-27. Safe to apply. Unblocks `shamus/marker-clustering-2026-05-25` merge. See qa-reports/2026-05-27_D3_Steve_TriggerApproval.md |
| `2026-05-27_users_email_privacy.sql` | **SECURITY — AWAITING SKY APPLY** | Fixes `public.users.email` PII exposure (Const. Art. 2.4). Apply after wave2 branch merge. See qa-reports/2026-05-27_Steve_Security_Wave2.md |
| `2026-05-24_flag_context_tags.sql` | APPLIED (Cycle F confirmed) | `context_tags` column live; `createFlag()` fallback can be removed |
| `2026-05-24_realtime_flags.sql` | PENDING (file only) | Sky applies — unlocks Supabase Realtime |
| `2026-05-24_status_history_table.sql` | APPLIED (Cycle F confirmed) | `flag_status_history` table + trigger live |
| `2026-05-25_flag_edit_history_table.sql` | PROPOSE-ONLY — CONDITIONAL | Apply only if Sky answers YES to D6 |
| `2026-05-25_flag_edit_rls_replacement.sql` | PROPOSE-ONLY — BLOCKING | Must apply before `shamus/marker-clustering-2026-05-25` merges. Replaces `flags update own` with `flags owner edit open` (status='open' guard). |
| `2026-05-25_push_tokens.sql` | PROPOSE-ONLY | Apply to enable push notifications DB layer. Pair with Edge Function deploy + `expo-notifications` install. |

---

## Active Branches

| Branch | Contains | Status |
|---|---|---|
| `origin/main` | Everything shipped through Wave 5 | Canonical |
| `origin/shamus/marker-clustering-2026-05-25` | Clustering + flag editing + Gary tests + Alex a11y fixes | Ready after RLS migration |
| `origin/feat/expo-web-vercel-2026-05-25` | Expo Web + Vercel deployment config | Ready for Sky review + merge |
| `origin/a11y/residual-2026-05-25` | Content already on main via `20823fa` | Safe to delete |
| `origin/docs/learnings-sequential-merge-2026-05-25` | Content already on main | Safe to delete |
| `origin/cycle/H-2026-05-24` | Cycle H carry-over | Audit — likely superseded |
| `origin/sync/local-main-to-origin` | Sync utility | Safe to delete |
| `worktree-agent-a31117016067fc579` (local) | 15 commits, FlagsProvider code | Audit before deleting |

---

## Open Decisions for Sky

| # | Decision | Urgency |
|---|---|---|
| D1 | Apply `2026-05-25_flag_edit_rls_replacement.sql` in Supabase SQL Editor | BLOCKING — flag edit cannot merge without it |
| D2 | Apply `2026-05-25_push_tokens.sql` + deploy Edge Function + install `expo-notifications` | HIGH — fully built, zero user value until applied |
| D3 | ✅ APPROVED — Apply `2026-05-23_status_update_trigger_proposal.sql` in Supabase SQL Editor (Steve signed off 2026-05-27) | **BLOCKING** — apply before merging marker-clustering |
| D8 | Apply `2026-05-27_users_email_privacy.sql` in Supabase SQL Editor — email PII fix (Const. 2.4) | **HIGH** — apply same cycle as wave2 branch merge |
| D4 | Apply pending batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags` | MEDIUM (~15 min in SQL Editor) |
| D5 | Heat-map severity-colour rendering: gradient yes or no | MEDIUM — Jordan pre-reviewed; Sky answer unblocks Shamus build |
| D6 | Flag edit history audit table: apply CONDITIONAL migration yes or no | LOW |
| D7 | Constitution Art. 1.2 amendment (Cowork-as-Sky merge authority) | LOW — no sprint impact |

---

## What Sky Needs To Do Before Next Sprint (ordered)

1. Apply `2026-05-23_status_update_trigger_proposal.sql` in Supabase SQL Editor → then apply `2026-05-25_flag_edit_rls_replacement.sql` → merge `origin/shamus/marker-clustering-2026-05-25` (D3 Steve-approved 2026-05-27)
2. Merge `security/hardening-wave2-2026-05-27` → apply `2026-05-27_users_email_privacy.sql` in Supabase SQL Editor (PII fix, Const. 2.4)
3. Apply `2026-05-25_push_tokens.sql` in Supabase SQL Editor
4. Deploy `notify-flag-status` Edge Function via Supabase Dashboard
5. Run `npx expo install expo-notifications` in Terminal at ~/AccessMap and rebuild dev client
6. Apply remaining batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags` (~15 min)
7. Review and merge `origin/feat/expo-web-vercel-2026-05-25`
8. Answer D5 (heat-map severity colour) so Shamus can start heat-map build
9. Create `eas.json` from Rory's proposal in `release-2026-05-25.md` when TestFlight is on the horizon
10. Delete safe stale branches: `a11y/residual-2026-05-25`, `docs/learnings-sequential-merge-2026-05-25`, `sync/local-main-to-origin`
