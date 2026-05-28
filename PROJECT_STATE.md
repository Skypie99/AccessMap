# AccessMap — Project State

**Updated:** 2026-05-28 (cycle/auto-2026-05-28 — Gary EXIF tests + Alex heatmap audit + Steve security review)
**Source:** Morgan read pass | git log | qa-reports | migration files
**Main SHA:** `1659092` · Tests: 872/872 (main) · TSC errors: 0 · Test suites: 58
**Active branch:** `privacy/exif-strip-2026-05-28` (EXIF strip + cycle QA artifacts) — 3 commits ahead of main

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
| A11y Wave 5 residuals | MapScreen announceForAccessibility; useReducedMotion both PlatformMap variants; web photo alt text |
| ESLint + Prettier | `eslint.config.js`, `.prettierrc.json`, lint/format npm scripts |
| GitHub Actions CI | typecheck + test on push/PR |
| Offline flags cache | AsyncStorage 24h TTL, user-scoped, stale-while-revalidate, offline banner |
| Push notification client | Token storage, settings toggle, sign-out clear, Edge Function written — awaiting Sky DB steps |
| Dark mode | useColor() + ThemeContext, all 8 token categories |
| Flag pagination | Cursor-based Load More |
| Activity Feed, Watched Flags, Saved Places, Visit Streak, Achievements | Stable |
| Address search, Open in Maps, Feedback flow, Help/FAQ, About, What's New | Stable |
| Text search (NFC), Notification prefs, Tasks sort, Map long-press, Nearest flag jump | Stable |
| Realtime flags (client wired) | Subscription wired; awaiting DB migration to go live |

### BUILT TODAY — GATE-APPROVED (branches ready for Monday merge wave)

| Branch | What | Gate status |
|---|---|---|
| `privacy/exif-strip-2026-05-28` | EXIF metadata stripping before photo upload (GPS/timestamp/camera PII removal) | **Jordan APPROVED** (2026-05-28) |
| `test/gary-exif-2026-05-28` | 12 tests for EXIF strip functions (verifyExifStripped + native/web fail-safes) | **Gary APPROVED** — 884 tests pass |
| `feat/heat-map-severity-2026-05-27` | Neighbourhood heatmap: severity gradient, k≥3 privacy floor, HeatmapLegend, persistence | **Alex APPROVED** WCAG 2.2 AA (2026-05-28) |
| `security/hardening-wave2-2026-05-27` | display_name cap, FeedbackModal input guards, email PII migration (propose-only) | **Steve APPROVED** (2026-05-28) |

### BUILT-NOT-MERGED (ready pending Sky action)

| Branch | What | Gate |
|---|---|---|
| `origin/shamus/marker-clustering-2026-05-25` | Marker clustering + flag editing UI; Gary's 20 tests; Alex 5 a11y fixes | Sky applies `2026-05-25_flag_edit_rls_replacement.sql` first |
| `origin/feat/expo-web-vercel-2026-05-25` | Expo Web build + Vercel deployment config | Sky review — low risk |

### MONDAY MERGE WAVE (cycle/auto-2026-06-02 target)

15 branches staged for sequential merge. Ordered by tier:
1. **Tier 1 — Safety/Quality:** `test/gary-wave2-2026-05-26`, `security/hardening-wave2-2026-05-27`, `fix/sql-cleanup-2026-05-27`, `design/auto-2026-05-26-linheight-token`, `a11y/alex-wave2-2026-05-26`
2. **Tier 2 — Design Polish:** `design/creative-polish-2026-05-27`, `a11y-perf/wave3-2026-05-27`
3. **Tier 3 — Features:** `feat/shamus-category-quickfilter-2026-05-26`, `feat/shamus-flag-deeplink-detail-2026-05-27`, `feat/heat-map-severity-2026-05-27`, `feat/tasks-search-2026-05-25`, `privacy/exif-strip-2026-05-28` + `test/gary-exif-2026-05-28`
4. **Tier 4 — Release:** `release/auto-2026-05-28`
5. **Blocked:** `feat/notify-flag-status-2026-05-27` (awaiting D2)

### PLANNED (approved, build not started)

| Feature | Gate / Notes |
|---|---|
| Leaflet tile interception (web-only) | Low complexity; pseudo-code in `2026-05-25-shamus-offline-tiles.md` |
| Flag edit history audit table | `2026-05-25_flag_edit_history_table.sql` CONDITIONAL — Sky answers D6 yes/no |
| EAS Build / TestFlight | `eas.json` exists on `release/auto-2026-05-28`; Rory confirmed infra ready |

---

## Migrations

| File | Status | Notes |
|---|---|---|
| `2026-05-23_data_layer_hardening.sql` | PENDING | Sky applies via Supabase SQL Editor |
| `2026-05-23_feedback_table.sql` | APPLIED | `public.feedback` table live |
| `2026-05-23_rls_initplan_and_non_owner_status_update.sql` | PENDING | Sky applies |
| `2026-05-23_status_update_trigger_proposal.sql` | PROPOSE-ONLY — HELD | Steve sign-off needed |
| `2026-05-24_flag_context_tags.sql` | APPLIED | `context_tags` column live |
| `2026-05-24_realtime_flags.sql` | PENDING | Sky applies — unlocks Supabase Realtime |
| `2026-05-24_status_history_table.sql` | APPLIED | `flag_status_history` table + trigger live |
| `2026-05-25_flag_edit_history_table.sql` | PROPOSE-ONLY — CONDITIONAL | Sky decides D6 |
| `2026-05-25_flag_edit_rls_replacement.sql` | PROPOSE-ONLY — BLOCKING | Must apply before marker-clustering merges |
| `2026-05-25_push_tokens.sql` | PROPOSE-ONLY | Apply to enable push notifications DB layer |
| `2026-05-27_users_email_privacy.sql` | PROPOSE-ONLY — **NEW** | Steve APPROVED 2026-05-28. Closes email PII exposure. Apply with pending batch. |

---

## Open Decisions for Sky

| # | Decision | Urgency |
|---|---|---|
| D1 | Apply `2026-05-25_flag_edit_rls_replacement.sql` | BLOCKING — marker clustering cannot merge |
| D2 | Apply `2026-05-25_push_tokens.sql` + deploy Edge Function + install `expo-notifications` | HIGH — fully built |
| D3 | Steve trigger sign-off on `2026-05-23_status_update_trigger_proposal.sql` — Morgan recommends APPROVE | HIGH |
| D4 | Apply pending batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags`, `users_email_privacy` | MEDIUM (~20 min in SQL Editor) |
| D5 | Heat-map severity-colour gradient: **RESOLVED** — Sky approved gradient (2026-05-28), feature built ✅ | DONE |
| D6 | Flag edit history audit table: apply CONDITIONAL migration yes or no | LOW |
| D7 | Constitution Art. 1.2 amendment (Cowork-as-Sky merge authority) | LOW |

---

## Active Worktrees (as of 2026-05-28 evening)

| Path | Branch | Status |
|---|---|---|
| `~/AccessMap` | `privacy/exif-strip-2026-05-28` | Active working tree |
| `/tmp/gary-w3-verify` | `test/gary-wave3-2026-05-27` | Clean — can remove |
| `/tmp/gary-exif-2026-05-28` | `test/gary-exif-2026-05-28` | Completed — ready to push/merge |
| `/tmp/alex-heatmap-a11y-2026-05-28` | `a11y/heatmap-2026-05-28` | Completed — a11y report written |
| `.claude/worktrees/` (11 entries) | various `claude/*` | Stale — audit before deleting |

---

## Next Cycle Intent

1. Monday 2026-06-02: Execute 15-branch merge wave (cycle/auto-2026-06-02) under Morgan orchestration
2. Post-merge: Sky applies D2 (push tokens + Edge Function + expo-notifications install) to light up notifications end-to-end
3. Post-merge: Apply D4 batch migrations (~20 min) to activate realtime flags + email privacy
4. Resume feature cycle: EAS / TestFlight prep (Rory) + next feature batch
