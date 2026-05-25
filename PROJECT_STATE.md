# AccessMap — Project State

**Updated:** 2026-05-25 (night cycle Wave 5 complete)
**Cycle:** morgan/night-cycle-2026-05-25

---

## Main Branch

| Field | Value |
|---|---|
| SHA | `af5f0bc` |
| Tests | 789 / 789 |
| TSC errors | 0 |
| Test suites | 52 |

---

## Active Modules (stable on main)

### Features shipped this cycle
- **Photo thumbnails in triage** — FlagCard inline photo → PhotoLightboxModal on tap; onError graceful degradation; Dani COMMIT after 2 polish iterations
- **Offline tile cache** — `src/lib/tileCache.ts`: TTL 7d, LRU 50 MB cap, user-keyed namespace; `signOut` clear wired (Jordan C1–C5 ✅); tile _interception_ is propose-only
- **My Flags toggle** — "All / Mine" chip in TasksScreen; AsyncStorage-persisted scope
- **Status history UI** — "History" button in FlagDetailModal → StatusHistoryModal timeline; graceful degradation if `flag_status_history` migration not applied
- **3 a11y residuals** — MapScreen `announceForAccessibility` (WCAG 4.1.3); `useReducedMotion` wired into both PlatformMap variants (WCAG 2.3.3); web photo popup category-derived alt text (WCAG 1.1.1)
- **flagsMap O(1) lookups** — `useMemo` Map in FlagsContext
- **renderItem memoization** — `useCallback` in TasksScreen; React.memo on FlagCard now effective
- **ESLint + Prettier** — `eslint.config.js`, `.prettierrc.json`, lint/format npm scripts
- **Jest open-handles fix** — `jest.mock('../supabase')` in filterSets + mapFilters test files

### Features stable from prior cycles
- Offline flags cache (AsyncStorage, 24h TTL, user-scoped, stale-while-revalidate, offline banner)
- Push notifications (opt-in, settings toggle, push_tokens migration ready, Edge Function ready)
- Flag editing for open-flag owners (RLS guard **PENDING Sky** — don't promote yet)
- Supabase realtime (client ready; migration file ready, not applied)
- Dark mode (useColor() + ThemeContext, all tokens)
- Flag pagination cursor-based Load More
- Marker clustering, ErrorBoundary, photo upload hardening, maxLength 2000
- Activity Feed, UpdateBanner, Watched Flags, Saved Places, Visit Streak, Achievements
- Address search, Open in Maps, Photo lightbox, Feedback flow, Help/FAQ, About, What's New
- Text search (NFC-normalized), Notification preferences, Tasks sort, Map long-press, Nearest flag jump

### Design System
Token categories: **color · font · spacing · shadow · radius · motion · breakpoints · size** (8 total)

New tokens this cycle:
- `size.thumb: 80` · `size.cardMin: 96` ← first `size` category entries
- `color.backdropStrong` · `color.backdropCaption` · `color.overlayBtn` + dark variants

### Infrastructure
- GitHub Actions CI — typecheck + test on push/PR
- ESLint + Prettier configured
- Jest: Supabase mock pattern required for any test with transitive `supabase.ts` import

---

## Critical — Sky Must Apply (DB / production)

| Priority | Item | Where |
|---|---|---|
| 🔴 BLOCKING | Flag-edit RLS `status='open'` guard | `qa-reports/2026-05-25-shamus-flag-editing-brief.md` → Supabase SQL Editor |
| High | 5 older migrations | data_layer_hardening · feedback_table · rls_initplan · status_update_trigger · flag_context_tags |
| High | `2026-05-25_push_tokens.sql` + deploy `notify-flag-status` Edge Function + DB Webhook | Supabase SQL Editor + Dashboard |
| Medium | `npx expo install expo-notifications` + rebuild dev client | Terminal |
| Optional | Tile interception | `qa-reports/2026-05-25-shamus-offline-tiles.md` — Leaflet (web) simpler; native requires ejection |

---

## Open Branches (Sky decision / carry-forward)

| Branch | What | Action |
|---|---|---|
| `fix/dani-statushistory-darkmode-2026-05-25` | StatusHistoryModal `'#fff'` → `color.surface` + list/listitem a11y | Spawn task chip — Sky clicks to build |
| `chore/design-token-residuals-2026-05-25` | radius.circle · overlayBtnPressed · accessibilityRole cohesion | Spawn task chip |
| `worktree-agent-a31117016067fc579` | 15 unique commits incl. shared FlagsProvider code | Spawn task chip — audit before deleting |
| `feat/offline-tiles-2026-05-25` | Content already on main via 9597c31 | Safe to delete |
| `test/auto-2026-05-25` | Content already incorporated | Safe to delete |

---

## Decisions Made This Cycle

1. **`size` token category** — owned by Dani; add new entries via Dani per token ownership rule
2. **Sequential build/merge discipline** — Build → QA (parallel OK) → wait for push confirm → next Build (in LEARNINGS.md)
3. **Parallel merge conflict resolution** — verify `git log --oneline main..HEAD` after any conflict resolution to catch dropped commits (in LEARNINGS.md)
4. **Supabase mock pattern** — `jest.mock('../supabase', () => ({ supabase: {} }))` required for test files with transitive supabase.ts import (in LEARNINGS.md)

---

## Open Risks / Blockers

- 🔴 Flag-edit RLS gap — live in prod without DB guard; must not promote to users
- Tile interception (react-native-maps native) requires managed workflow ejection — high complexity
- `worktree-agent-a31117016067fc579` has potentially valuable code not yet audited

---

## Known Contradictions Detected

None — `state_consistency: pass`

---

## Next Cycle Intent

1. **Leaflet tile interception** (web-only, no native dep) — `L.TileLayer.extend` wiring; pseudo-code in `qa-reports/2026-05-25-shamus-offline-tiles.md`
2. **Neighbourhood heat-map layer** — Jordan pre-review first (location + disability data aggregation)
3. **Branch cleanup** — delete `feat/offline-tiles-2026-05-25` and `test/auto-2026-05-25`
4. **Dani P4** — `bannerBase` shared style extraction (low priority, tracked)
