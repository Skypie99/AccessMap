# Wave 6 Candidate Brainstorm — AccessMap

**Date:** 2026-05-28
**Role:** Quill (temporary specialist)
**Task:** Horizon-scan for Wave 6 features from recent QA reports and backlog items

---

## Overview

AccessMap has just shipped Wave 5 (merge wave 2026-05-29, daily TestFlight builds live 2026-05-31). This report identifies ten Wave 6 candidate features by scanning FEATURES.md "Later" section, recent qa-reports, and Jordan/Dani pre-reviews. Each candidate is tied to its source and includes effort estimate, dependency analysis, and privacy/accessibility risk classification.

---

## Candidates (Priority Order)

### 1. **Web Map Marker Clustering**

**Title:** Cluster markers on the web map via supercluster + Leaflet

**Source:** `FEATURES.md:57–60` ("Flag clustering on the web map")

**Rationale:** Native map clustering shipped with marker-clustering Wave 5. Web map (`PlatformMap.web.tsx`) does not cluster; identical marker data needs identical UX on both platforms. `supercluster` is already a project dependency (installed for native clustering). Wiring it into the Leaflet render path is a straightforward port from the native implementation.

**Effort:** S (Small)
- Reuse `supercluster` binning logic from native map
- Add ClusteredMarkerLayer component for Leaflet
- Copy a11y labels + cluster bubble styling from native variant
- Zero new dependencies

**Dependency on Wave 5:** Low
- Clusters are computed from the same `useFlags().flags` array
- All styling tokens already exist
- Native clustering is fully shipped and tested

**Privacy/Accessibility Risk:** None
- Clustering is a pure UI layer; no new data access
- Existing a11y patterns (cluster labels, VoiceOver announcements) carry over from native

**Owner:** Shamus (UI/map engineering)

**Open Questions:** None

---

### 2. **Search & Filter for Watched Flags List**

**Title:** Add search + severity/status filter chips to MyWatchedModal

**Source:** `FEATURES.md:61–65` ("Search/filter for the Watched Flags list")

**Rationale:** `MyWatchedModal` shows watched flags as a flat list with no search or filtering. Users with many watched flags cannot easily find a specific one. A `SearchInputRow` (reusable component already in use on TasksScreen and MyReportsModal) + status/severity filter chips (matching Tasks UX pattern) would make the list scannable, especially for a11y users. High-value polish for power users.

**Effort:** S (Small)
- Reuse existing `SearchInputRow` component
- Add filter state to modal (status: open/verified/resolved/rejected; severity: 1–5)
- Filter in-memory watched flags array (no new Supabase query)
- Add 4–6 filter chip tests

**Dependency on Wave 5:** None
- Tasks screen already ships with the same pattern
- Watched flags data is already fetched and memoized

**Privacy/Accessibility Risk:** None
- All data already visible in the unfiltered list
- Search + filter chips are A11y-complete per existing pattern

**Owner:** Shamus or Dani (UI polish)

**Open Questions:** Filter defaults (all chips unselected, or default to "open")?

---

### 3. **Offline Tile Caching for Native Map**

**Title:** Wire react-native-maps tile requests through tileCache.ts (native URLSession/OkHttp override)

**Source:** `FEATURES.md:71–73` ("react-native-maps tile interception")

**Rationale:** Web map already caches OpenStreetMap tiles to disk via `PlatformMap.web.tsx` → `tileCache.ts` (Wave 4 feature, Jordan pre-reviewed, conditions C1–C5 defined). Native map (`react-native-maps` with `PROVIDER_DEFAULT`) does not cache tiles. Native users cannot use the app offline or on slow networks. This is a platform-parity gap. Solution requires managed-workflow ejection or a native module to intercept URLSession/OkHttp tile requests.

**Effort:** M–L (Medium to Large)
- Requires either:
  - Managed-workflow ejection + Xcode/Android Studio configuration (not beginner-friendly per CLAUDE.md)
  - OR adoption of a third-party native tile cache module (e.g., `react-native-maps-offline` or custom bridge)
- Must vet any library against Jordan's conditions (no telemetry, size bounds, TTL, sign-out clear)
- Integrate with existing `tileCache.ts` metadata index or create platform-specific variant

**Dependency on Wave 5:** High
- Depends on Jordan's offline-tiles pre-review (2026-05-25) — conditions C1–C5 already approved
- Depends on `tileCache.ts` architecture shipped in Wave 4

**Privacy/Accessibility Risk:** Medium
- Jordan pre-review complete; conditions are non-negotiable merge gates
- Risk of leaking navigation patterns in cache; Jordan's sign-out-clear requirement (C1) mitigates this
- Native module choice must be vetted to avoid telemetry or data exfiltration (Jordan condition C3)

**Owner:** Rory (infra) + Shamus (integration)

**Open Questions:** 
- Managed-workflow ejection appetite? 
- Third-party module acceptable, or custom native bridge required?
- Device storage limit (50 MB per Jordan condition C4)?

---

### 4. **User Reputation / Contribution Leaderboard**

**Title:** Leaderboard showing top reporters by flag count, points, or verification rate

**Source:** Deferred from post-project discussions (not explicitly in FEATURES.md, implied by "power user" engagement)

**Rationale:** AccessMap is crowdsourced; users who report many flags or verify others' reports drive data quality. A public leaderboard (or private "monthly contributors" highlight) would gamify participation and surface trusted reporters. High engagement feature. Pairs well with points system (Wave 5 points trigger shipped). Motivates continued flag reporting and quality triage.

**Effort:** M (Medium)
- New Supabase query: aggregate flags + points by user, rank by metric of choice (count, points, verification %)
- New screen: LeaderboardScreen with sorted FlatList
- New profile stat: user's current rank + percentile
- Zero new database schema (all data already exists)

**Dependency on Wave 5:** High
- Depends on points trigger (Wave 5: `handle_flag_status_change` trigger that awards points)
- Depends on `public.users.points` column (shipped Wave 5)

**Privacy/Accessibility Risk:** Medium
- Leaderboard exposes display names + point totals (public data, already visible on individual profiles)
- Does NOT expose location data or flag specifics, only aggregates
- A11y: must include numeric sort options + keyboard navigation; avoid colour-only ranking cues
- Jordan review recommended if leaderboard ranks by flag density by geography (could infer disability concentrations)

**Owner:** Shamus (UI) + Dana (query optimization)

**Open Questions:** 
- Leaderboard metric: top points, top flags, highest verification rate, or all three with tabs?
- Public or private (in-app only)?
- Time window: all-time, monthly, weekly?

---

### 5. **Neighbourhood Heat-Map Layer (Refined)**

**Title:** Colour-density grid overlay showing flag severity aggregation by geography

**Source:** Jordan pre-review (2026-05-25); Shamus shipped (2026-05-28); merged to Wave 5 merge queue

**Rationale:** This is already built and merge-ready (report: `2026-05-28_Shamus_HeatmapBuild.md`). Including as Wave 6 candidate only if merge deferred past 2026-05-31. If merged in Wave 5, remove from Wave 6 backlog.

**Status:** CONDITIONAL
- If merged to main by 2026-05-31: Mark SHIPPED, remove from Wave 6
- If deferred: Move to top of Wave 6 (priority 0.5) — it is complete and unblocked

**Owner:** Morgan (merge sequencing decision)

---

### 6. **Flag Editing Extensions (Comments / Resolution Notes)**

**Title:** Allow verifiers/resolvers to attach a comment explaining their action (e.g., "fixed on 2026-06-01")

**Source:** Implied by flag-editing feature (Wave 5); deferred UX enhancement

**Rationale:** Flag editing (Wave 5: `feat/flag-edit-2026-05-24`) lets owners tweak descriptions. Extension: let verifiers or resolvers (non-owners) add a comment/note explaining *why* they verified or rejected a flag. Examples: "Confirmed: new ramp installed," "Not an accessibility issue—design choice," "Needs more detail." Improves feedback loop and reporter learning. Pairs with status-history UI (Wave 5).

**Effort:** M (Medium)
- New `flag_comments` table (flag_id, user_id, action_type: verify/resolve/reject, comment_text, created_at)
- New schema migration + RLS policy (comments writable by actor, readable by owner + flag author)
- Comment rendering in FlagDetailModal (below status history)
- New form UI in modal (text input, 500-char limit)

**Dependency on Wave 5:** High
- Depends on flag-editing RLS (Wave 5: D1 trigger deployed)
- Depends on status-history UI + queries (Wave 5: shipped)

**Privacy/Accessibility Risk:** Medium
- Comments are user-generated text; input validation required (trim, char limit, no HTML)
- Steve (security) must review RLS policy to ensure comments aren't readable by unauthenticated users
- A11y: form input must have visible label, hint text, error handling

**Owner:** Shamus (UI) + Steve (RLS review)

**Open Questions:** 
- Comment length limit (500 chars? 1000?)?
- Comment editing/deletion by author? Or immutable audit trail?
- Notification to reporter when comment is posted?

---

### 7. **Real-time Flag Updates via Supabase Realtime**

**Title:** Subscribe to flag changes (new reports, status updates) and auto-refresh UI without polling

**Source:** `FEATURES.md` shipped section (Wave 3, 2026-05-23); currently unmerged; needs server-side setup

**Rationale:** Realtime client-side plumbing exists on main (`src/lib/flagsStore.tsx` has realtime-ready shape). Server-side `supabase/realtime.sql` migration (propose-only) was drafted but not applied to production. Once applied, the app can subscribe to real-time flag events (new reports, status changes) and update the map/tasks list live without a poll loop. High-engagement feature; improves freshness perception and reduces polling overhead.

**Effort:** M (Medium)
- Apply `supabase/realtime.sql` migration (idempotent; adds realtime publication)
- Uncommment/test realtime subscription in `FlagsProvider`
- Test subscription cleanup on unmount (no dangling connections)
- Verify Supabase realtime is enabled on the project (Sky setting)

**Dependency on Wave 5:** None
- All client code already shipped; waiting on server setup
- No new app features required, just backend activation

**Privacy/Accessibility Risk:** Low
- Realtime uses same RLS policies as REST API (existing authenticated-read policy)
- No new data exposure
- A11y: auto-refresh must respect `useReducedMotion` to avoid disorienting UI thrashing

**Owner:** Rory (infra setup) + Shamus (subscription testing)

**Open Questions:** 
- Supabase realtime cost implications? Billing model?
- Fallback if realtime unavailable (graceful degrade to polling)?

---

### 8. **Battery + Network-Status Aware Caching**

**Title:** Reduce tile + flag fetch frequency when device is low-battery or on metered connection

**Source:** Performance + UX consideration (not in FEATURES.md, implied by offline-first architecture)

**Rationale:** AccessMap is a location-focused app used on mobile. Users may be outdoors, low-battery, or on metered cellular data. Currently, tile caching and flag polling are unconditional. Smart adaptation: detect low-battery (via `react-native-device-info` or Expo Battery API) and reduce fetch frequency; detect metered connection (via `react-native-netinfo`) and skip tile pre-fetch. Improves UX on constrained devices and reduces data usage for users on limited plans.

**Effort:** M (Medium)
- Add `expo-battery` or similar for battery state
- Add `@react-native-netinfo/netinfo` for connection type
- Modify `tileCache.ts` to skip new tile fetches if on metered or low-battery
- Modify `FlagsProvider` poll loop to reduce frequency on low-battery
- Test matrix: low-battery + wifi, full-battery + metered, etc.

**Dependency on Wave 5:** Medium
- Depends on tile caching architecture (Wave 4)
- Depends on flag polling loop (all waves)

**Privacy/Accessibility Risk:** Low
- No new data collection; purely device-state reading
- Battery/connection state is not sent to server
- A11y: no impact

**Owner:** Shamus or Rory (depends on battery API choice)

**Open Questions:** 
- Battery threshold (< 20%?)? Configurable by user?
- Tile fetch delay on metered (skip? or just less aggressive prefetch)?

---

### 9. **Flag Photo Gallery / Lightbox Enhancements**

**Title:** Expand photo viewing experience: multi-photo support per flag, swipe navigation, full-screen viewer

**Source:** Current UX shows one photo per flag; extension to support multiple angles/conditions

**Rationale:** Accessibility issues are often multifaceted (e.g., no ramp *and* broken pavement). Allowing reporters to attach 2–3 photos per flag would improve issue documentation. Requires:
- Schema change: `flags.photo_url` → `flags.photo_urls` (array or new `flag_photos` table)
- UI: gallery grid in FlagDetailModal, swipe-to-navigate on mobile, full-screen lightbox
- File upload: allow multi-select in photo picker
- Storage: cap at 3 photos per flag (storage cost + Supabase bandwidth)

**Effort:** L (Large)
- Schema migration: `flag_photos` junction table (flag_id, photo_url, order, created_at)
- RLS policy: same as existing flag photos (public read, authenticated owner delete)
- UI components: photo gallery grid, full-screen lightbox, multi-select picker
- Upload logic: loop over selected photos, post to Storage
- Test coverage: multi-photo upload, gallery navigation, storage quota

**Dependency on Wave 5:** Medium
- Depends on existing photo upload + Storage RLS (Wave 4)
- Depends on FlagDetailModal (shipped, but UI extension needed)

**Privacy/Accessibility Risk:** Medium
- Photos remain PII-sensitive (may show identifying objects, store signage, etc.)
- Jordan review needed for multi-photo implications (more data per flag = larger dataset footprint)
- Storage quota management required (prevent malicious bulk uploads)
- A11y: lightbox must have close button, keyboard navigation, `accessibilityRole="image"` per photo

**Owner:** Shamus (UI) + Jordan (privacy review) + Steve (upload quota enforcement)

**Open Questions:** 
- Max photos per flag (2? 3? 5?)?
- Storage quota: hard cap per flag or per user?
- Compression/resizing before upload, or accept user resolution?

---

### 10. **Accessibility Audit & WCAG 2.1 AA Certification Prep**

**Title:** Formal accessibility audit + remediation roadmap toward WCAG 2.1 AA certification

**Source:** Alex's ongoing a11y work (Waves 3–5); deferred full certification scope

**Rationale:** AccessMap has shipped a11y improvements across five waves (readable contrast, semantic labels, reduced-motion respect, keyboard navigation). However, a formal third-party WCAG 2.1 AA audit (or at minimum, a thorough internal pass with automated tools + manual testing) has not been completed. Wave 6 could include:
- Run `axe-devtools`, `wave`, or other automated a11y scanners on all screens
- Manual testing on screen reader (VoiceOver/TalkBack)
- Keyboard-only navigation test (no mouse)
- Colour-contrast verification for all text/icons
- Focus order audit
- Document findings + remediation plan
- (Optional) Pay for third-party audit if seeking formal WCAG 2.1 AA certification

**Effort:** M–L (Medium to Large, depending on scope)
- Automated scans: 2–3 hours
- Manual testing: 4–6 hours
- Remediation + testing: 4–8 hours per finding
- Formal third-party audit: $2k–$5k + 2–4 weeks

**Dependency on Wave 5:** None
- Audit is independent; can run anytime
- Might uncover bugs, but no blockers

**Privacy/Accessibility Risk:** None
- Audit is read-only (no code changes)
- Results are internal planning tool

**Owner:** Alex (a11y expert) + Dani (design support for remediation)

**Open Questions:** 
- Scope: internal audit only, or third-party certification?
- Automated tools: axe-devtools + manual, or full VPAT/ATAG scope?
- Timeline: parallel to other Wave 6 work, or sequential?

---

## Summary Table

| # | Title | Effort | Wave 5 Dependency | Risk | Priority | Owner(s) |
|---|---|---|---|---|---|---|
| 1 | Web map clustering | S | Low | None | 1 | Shamus |
| 2 | Watched flags search/filter | S | None | None | 2 | Shamus/Dani |
| 3 | Native tile interception | M–L | High | Medium | 3 | Rory/Shamus |
| 4 | Leaderboard | M | High | Medium | 4 | Shamus/Dana |
| 5 | Heat-map (if deferred) | S | Low | Low | 0.5 | — |
| 6 | Comment system | M | High | Medium | 5 | Shamus/Steve |
| 7 | Realtime updates | M | None | Low | 6 | Rory/Shamus |
| 8 | Battery-aware caching | M | Medium | Low | 7 | Shamus/Rory |
| 9 | Multi-photo gallery | L | Medium | Medium | 8 | Shamus/Jordan/Steve |
| 10 | A11y certification audit | M–L | None | None | 9 | Alex/Dani |

---

## Recommendations for Wave 6 Planning

1. **Start with the easy wins (candidates 1–2):** Web clustering and watched-flag search are small, low-risk, and ship platform parity + polish. Can be merged 1–2 weeks into Wave 6.

2. **Realtime (candidate 7) is unblocked:** All client code exists; just needs Sky to confirm Supabase realtime is enabled on the project. Can run in parallel with other work.

3. **Assess native tile interception appetite (candidate 3):** This is the most technically risky (requires managed-workflow ejection or native module). Defer unless offline map support is a stated Wave 6 priority.

4. **Jordan + Steve gates for medium/high-risk items:** Candidates 4 (leaderboard), 6 (comments), 9 (multi-photo) require pre-build reviews from privacy/security experts. Plan asynchronously.

5. **A11y audit (candidate 10) could be concurrent:** Internal audit by Alex can run in parallel with feature development; remediation (if found) becomes next-cycle work.

---

## Out of Scope (Noted but Not Recommended for Wave 6)

- **Dashboard live updates** — scope pending Sky clarification (separate task, deferred 2026-05-28)
- **User settings / preferences panel** — low priority; exists conceptually in profile but no dedicated settings screen
- **Data export / bulk flag list download** — Jordan review needed (data sensitivity); likely Wave 7+
- **Offline-first sync of new flags created offline** — high complexity; would need conflict resolution + delta sync. Deferrable.

---

**End report.**
