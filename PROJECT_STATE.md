# AccessMap — Project State

**Updated:** 2026-05-25 (morning continuation — 4 features built on branches)
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

### Morning continuation — 4 features ready for review

| Branch | What | Action |
|---|---|---|
| `feat/leaflet-tile-interception-2026-05-25` | `CachedTileLayer` in `PlatformMap.web.tsx`; tiles served from `tileCache.ts` after first load | Review + merge |
| `feat/edit-profile-2026-05-25` | Avatar photo upload + initials fallback + `radius.circle`/`overlayBtnPressed` token sweep | **Note:** commit `8f24ba4` from a concurrent agent is noisy (CHANGELOG.md, coverage/). Consider cherry-picking `c41e5ca` + `5e92a6e` only |
| `feat/context-tags-display-2026-05-25` | "Conditions" chip row in FlagDetailModal (context tags previously set but never shown) | Review + merge |
| `feat/tasks-search-2026-05-25` | `SearchInputRow` above Mine/All chips in Tasks; filters on category + description in real time | Review + merge |

### From prior cycles

| Branch | What | Action |
|---|---|---|
| `fix/dani-statushistory-darkmode-2026-05-25` | StatusHistoryModal raw `'#fff'` tokens + list/listitem a11y roles | Spawn next Shamus task chip |
| `chore/design-token-residuals-2026-05-25` | radius.circle, overlayBtnPressed, accessibilityRole cohesion | Spawn next Dani task chip |
| `worktree-agent-a31117016067fc579` | 15 unique commits including shared FlagsProvider code; unaudited | Audit before deleting — possible cherry-picks |

### PLANNED (approved, build not started)

| Feature | Gate / Notes |
|---|---|
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
| `2026-05-23_status_update_trigger_proposal.sql` | PROPOSE-ONLY — HELD | Steve sign-off needed (trigger vs. RLS failure-mode). Morgan recommends APPROVE (Decision 3). Sky messages Steve, then applies. |
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
| `origin/feat/tasks-search-2026-05-25` | Tasks text search + state docs | Ready for review |
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
| D3 | Steve trigger sign-off on `2026-05-23_status_update_trigger_proposal.sql` — Morgan recommends APPROVE | HIGH |
| D4 | Apply pending batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags` | MEDIUM (~15 min in SQL Editor) |
| D5 | Heat-map severity-colour rendering: gradient yes or no | MEDIUM — Jordan pre-reviewed; Sky answer unblocks Shamus build |
| D6 | Flag edit history audit table: apply CONDITIONAL migration yes or no | LOW |
| D7 | Constitution Art. 1.2 amendment (Cowork-as-Sky merge authority) | LOW — no sprint impact |

---

## What Sky Needs To Do Before Next Sprint (ordered)

1. Apply `2026-05-25_flag_edit_rls_replacement.sql` in Supabase SQL Editor → merge `origin/shamus/marker-clustering-2026-05-25`
2. Message Steve about `2026-05-23_status_update_trigger_proposal.sql` — get confirm, then apply
3. Apply `2026-05-25_push_tokens.sql` in Supabase SQL Editor
4. Deploy `notify-flag-status` Edge Function via Supabase Dashboard
5. Run `npx expo install expo-notifications` in Terminal at ~/AccessMap and rebuild dev client
6. Apply remaining batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags` (~15 min)
7. Review and merge `origin/feat/expo-web-vercel-2026-05-25`
8. Review morning feature branches: `feat/tasks-search-2026-05-25` (PR #6), `feat/leaflet-tile-interception-2026-05-25`, `feat/context-tags-display-2026-05-25`, `feat/edit-profile-2026-05-25` (cherry-pick `c41e5ca`+`5e92a6e` only — noisy concurrent-agent commit)
9. Answer D5 (heat-map severity colour) so Shamus can start heat-map build
10. Create `eas.json` from Rory's proposal in `release-2026-05-25.md` when TestFlight is on the horizon
11. Delete safe stale branches: `a11y/residual-2026-05-25`, `docs/learnings-sequential-merge-2026-05-25`, `sync/local-main-to-origin`
