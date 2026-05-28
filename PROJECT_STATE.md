# AccessMap — Project State

**Updated:** 2026-05-27 (Morgan ACTIVE cycle — heatmap-wave3-briefing)
**Source:** Morgan read pass | git log | qa-reports/cycle-2026-05-27-morgan-heatmap-wave3.md
**Main SHA:** `2086fde` · Tests: 827/827 · TSC errors: 0 · Test suites: 54

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
| `feat/heat-map-severity-2026-05-27` | Neighbourhood heat-map Wave 3: bucketFlagsToCells + HeatmapLegend + MapScreen toggle + native/web render. 827/827 tests, TSC clean. Jordan conditions: k≥3 floor enforced in-lib; severity legend live in overlay. | No migration needed — Sky review + merge (D-NEW-8) |
| `shamus/marker-clustering-2026-05-25` | Marker clustering + flag editing UI; Gary's 20 `updateFlagContent` tests; Alex 5 a11y fixes | Sky applies `2026-05-25_flag_edit_rls_replacement.sql` first (D1 BLOCKING) |
| `feat/expo-web-vercel-2026-05-25` | Expo Web build + Vercel deployment config | Sky review — no migration dependency; low risk |

### UNCHARTED (built since 2026-05-26 — STAGED STATE RULE applied; Will audit pending)

| Branch | Status |
|---|---|
| `feat/notify-flag-status-2026-05-27` | not merged · unknown status |
| `feat/shamus-category-quickfilter-2026-05-26` | not merged · unknown status |
| `feat/shamus-flag-deeplink-detail-2026-05-27` | not merged · unknown status |
| `feat/tasks-search-2026-05-25` | not merged · unknown status |
| `fix/sql-cleanup-2026-05-27` | not merged · unknown status |
| `security/hardening-wave2-2026-05-27` | not merged · unknown status |
| `a11y-perf/wave3-2026-05-27` | not merged · unknown status |
| `design/creative-polish-2026-05-27` | not merged · unknown status |
| `design/auto-2026-05-26-linheight-token` | not merged · unknown status |
| `test/gary-wave2-2026-05-26` | not merged · unknown status |
| `test/gary-wave3-2026-05-27` | not merged · unknown status |
| `test/gary-wave4-heatmap-2026-05-27` | not merged · pending Gary review |
| `claude/*` (6 branches) | not merged · auto-generated · pending Will audit |

### SUPERSEDED (pending deletion after Will audit confirms no unique commits)

| Branch | Reason |
|---|---|
| `feat/heatmap-severity-gradient-2026-05-25` | Superseded by `feat/heat-map-severity-2026-05-27` (complete Wave 3). Delete after Will confirms no unique commits. |

### PLANNED (approved, build not started)

| Feature | Gate / Notes |
|---|---|
| Leaflet tile interception (web-only) | No native dep; pseudo-code in `2026-05-25-shamus-offline-tiles.md`; low complexity |
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
| `2026-05-23_status_update_trigger_proposal.sql` | PROPOSE-ONLY — HELD | Steve sign-off needed (D3). Morgan recommends APPROVE. Sky messages Steve, then applies. |
| `2026-05-24_flag_context_tags.sql` | APPLIED (Cycle F confirmed) | `context_tags` column live |
| `2026-05-24_realtime_flags.sql` | PENDING (file only) | Sky applies — unlocks Supabase Realtime |
| `2026-05-24_status_history_table.sql` | APPLIED (Cycle F confirmed) | `flag_status_history` table + trigger live |
| `2026-05-25_flag_edit_history_table.sql` | PROPOSE-ONLY — CONDITIONAL | Apply only if Sky answers YES to D6 |
| `2026-05-25_flag_edit_rls_replacement.sql` | PROPOSE-ONLY — BLOCKING | Must apply before `shamus/marker-clustering-2026-05-25` merges (D1). |
| `2026-05-25_push_tokens.sql` | PROPOSE-ONLY | Apply to enable push notifications DB layer. Pair with Edge Function deploy + `expo-notifications` install (D2). |

---

## Active Branches (summary — 21 unmerged into main as of 2026-05-27)

See UNCHARTED and BUILT-NOT-MERGED tables above. `will/audit-unmerged-branches` is the next scheduled read-only pass to triage all 21.

---

## Open Decisions for Sky

| # | Decision | Status | Urgency |
|---|---|---|---|
| D1 | Apply `2026-05-25_flag_edit_rls_replacement.sql` in Supabase SQL Editor | **BLOCKING** | Immediate |
| D2 | Apply `2026-05-25_push_tokens.sql` + deploy Edge Function + install `expo-notifications` | Open | HIGH |
| D3 | Steve trigger sign-off on `2026-05-23_status_update_trigger_proposal.sql` | Open | HIGH |
| D4 | Apply pending batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags` | Open | MEDIUM (~15 min) |
| **D5** | ~~Heat-map severity-colour rendering~~ | **RESOLVED** — gradient built (Sky answered; Shamus delivered) | — |
| D6 | Flag edit history audit table: apply CONDITIONAL migration yes or no | Open | LOW |
| D7 | Constitution Art. 1.2 amendment (Cowork-as-Sky merge authority) | Open | LOW |
| D-NEW-8 | Merge `feat/heat-map-severity-2026-05-27` | Ready — no gate | HIGH |
| D-NEW-9 | 12+ uncharted branches from 2026-05-26–27: Will audits before next merge wave | Will audit first | MEDIUM |
| D-NEW-10 | Delete `feat/heatmap-severity-gradient-2026-05-25` (superseded) | After Will confirms no unique commits | LOW |

---

## What Sky Needs To Do Next (ordered)

1. **Apply `2026-05-25_flag_edit_rls_replacement.sql`** in Supabase SQL Editor → merge `shamus/marker-clustering-2026-05-25` **(D1 BLOCKING)**
2. **Review + merge `feat/heat-map-severity-2026-05-27`** — no migration, no gate **(D-NEW-8, easy win)**
3. **Review + merge `feat/expo-web-vercel-2026-05-25`** — low risk, no migration
4. **Apply `2026-05-25_push_tokens.sql`** + deploy Edge Function + `npx expo install expo-notifications` **(D2)**
5. **Message Steve** re: `2026-05-23_status_update_trigger_proposal.sql` → apply on confirm **(D3)**
6. **Apply batch** `data_layer_hardening` + `rls_initplan` + `realtime_flags` (~15 min) **(D4)**
7. **Delete `feat/heatmap-severity-gradient-2026-05-25`** once Will confirms no unique commits **(D-NEW-10)**
