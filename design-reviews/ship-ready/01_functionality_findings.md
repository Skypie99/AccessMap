# SHIP-READY Phase 1 — 01 · Functional Census (Lens 1)

Banked per cluster as each walk lands. Every finding: SR-id · tier · cohorts · evidence tag · file:line. Cohort proxy law (00 §9): the **web build IS the guest cohort**, so web-verified guest results are real guest results — but native-only behavior (Modal presentation, safe areas, Dynamic Type, VoiceOver, OS permission prompts, haptics) is never inferred from web (00 §2).

---

## §H · Home + Search + Onboarding-cards cluster — verdict **FINISHED** (8 findings, no padding)

Method: code-trace then 2 sequential live segments on the export; 1 Nominatim query total (law: ≤1); **0 console errors** both walks; 9 captures at `assets/home/`. Terminal controls never pressed (the guest report sheet was opened, asserted, closed — never filled or submitted).

### Findings

| SR | Tier | Cohorts | Evidence | Where | What |
|---|---|---|---|---|---|
| **SR-040** | MED | native (iOS/Android) | code-inferred + NEEDS-SKY-DEVICE | `HomeScreen.tsx:346-379` (X at :367-375) | **"Clear search" is unreachable to VoiceOver**: the clear-X is a Pressable nested inside the outer search Pressable, which defaults `accessible={true}`, so iOS flattens the children. No other path clears a picked search center within a session (tabs stay mounted). Web is unaffected (clear verified working live) — so this is invisible to every web check. |
| **SR-041** | MED | all | web-verified (web deny) + code-inferred (native) | `HomeScreen.tsx:382-393`, `:140`, `location.ts:211-219` | **"Use my location" becomes a silent dead control after denial** — second tap produced 0 DOM delta, no feedback; `askedForLocation` flips only once and iOS never re-prompts. Home has no denied-state affordance at all (no banner, no Settings hint), unlike MapScreen's shipped treatment (`:2463` banner + `:1214` announce). NOTE: the peek *caption's* silence is ratified design (D4/C2) — the gap is the button + missing recovery path. |
| **SR-042** | LOW-MED | all | web-verified (label text) + NEEDS-SKY-DEVICE (pronunciation) | `HomeScreen.tsx:574` | Row screen-reader labels speak abbreviated distance ("…297 m away", NBSP + "m") instead of the house `speakDistance()` used by Tasks (`:1230`) and NearbyFlagsModal (`:127`); `distance.ts:100-102` states the SR path stays plain ASCII. One-line fix shape (`speakDistance` appends "away" itself). |
| **SR-043** | LOW | all | code-inferred | `HomeScreen.tsx:304-308`, `:235-249` | Headline count and CLOSEST are computed over the store's **page-1 window** (50 rows), so at scale "N barriers" is a loaded-count not a census, and CLOSEST is closest-of-most-recent-50; the number shifts after paging on Tasks. **Latent today** (prod = 9 flags, live-verified) — improvement slate, not a ship blocker. |
| **SR-044** | LOW | all | code-inferred | `HomeScreen.tsx:292-296` | Home never revalidates: no pull-to-refresh, no focus refetch (Tasks has `useFocusEffect:414`; Map revalidates on focus-arrival). The landing surface ages invisibly in long sessions; refresh is reachable only via the error/stale banners. |
| **SR-045** | LOW | all | code-inferred + NEEDS-SKY-DEVICE (Dynamic Type) | `AddressSearchModal.tsx:348-381` | The live-results FlatList never got the M13 treatment its sibling recents section did (`flexShrink:1` at `:558-563`): RN default `flexShrink:0` inside a `maxHeight:'85%'` card means at large type + multi-line results the tail rows can clip unreachable. Same bug class M13 already fixed once. |
| **SR-046** | LOW | web only | code-inferred | `OnboardingCards.tsx:204-207`, `:319` | Card index tracks `onMomentumScrollEnd`, which RN-web emulates unreliably → a raw swipe could desync actions/dots from the visible card. Buttons (goTo) stay correct; native momentum is reliable. Live probe inconclusive. |
| **SR-047** | INFO | all | code-inferred | `geocode.ts:39-54`, `AddressSearchModal.tsx:39` | Nominatim courtesy edges: the 350 ms debounce can transiently exceed 1 req/s under rhythmic typing, and the `User-Agent` header is browser-stripped on web (Referer covers it — the file documents this at `:11`). Compliant in spirit; UA, 8 s timeout and abort plumbing all correct. |

### CHECKS-PASSED (positives the census proves — these are as load-bearing as the findings)
- **Every Home Pressable lands a real effect** (dead-control hunt found only SR-041): menu→drawer + focus-return, feedback→shared modal, search→modal, locate→probe, peek→FullMap (interior inert, announced as ONE button), caption live-region, offline banner with age copy, stale-refresh banner→refresh, error-card retry, rows→FullMap `focusFlag`, pill→FullMap `openReport`. [web-verified + code-inferred]
- **Permission-prompt fence holds**: the native mount-probe uses `requireExistingPermission` (no prompt); prompts are strictly user-initiated. Reveal-delay honesty verified live — a fast denial produced no "Finding your location…" flash. [web-verified]
- **The D4 peek family is unregressed** (device-tune CLOSED baseline verified, not re-found): keyed remount on center change, correct absence of the empty-local guard when flags are in-window, one-voice label/chip channels intact in code + jest.
- **Honest-mode header swap** LATEST/"Most recent barriers"/RECENT ↔ NEARBY/"Sorted by distance"/CLOSEST tracks center presence exactly; distance sort verified ascending live (297 m → 639 m → 1.5 km).
- **AddressSearchModal**: autoFocus, <3-char reset, backtrack abort, retryable-error vs "No matches" split, select→close→"Near …" subtitle→clear-X, recents move-to-front + clear, AVM forwarded through GlassSurface, RM → `animationType:'none'`. [web-verified]
- **Recents privacy**: stored payload live-inspected = `id/displayName/lat/lng` only — exactly the documented scope, namespaced key, cap 5, defensive parser, user-clearable. [web-verified]
- **Guest report entry works and is un-gated by design**: pill → `openReport` → sheet opens with no auth check, param self-clears. [web-verified, nothing submitted]
- **OnboardingCards**: all controls ≥44pt, labeled + hinted, Back announced-disabled on card 1, severity-scale group label correct, web "Continue" branch correct, Dynamic Island inset math on Skip, RM honored on pager + dots, position announced on change. [web-verified]

### NEEDS-SKY-DEVICE (from this cluster)
1. VoiceOver reachability of "Clear search" (SR-040) and pronunciation of row distance labels (SR-042).
2. Native denied-location walk: deny at onboarding → Home "Use my location" dead-tap (SR-041's native leg) — ~30 s check.
3. AddressSearchModal at accessibility text sizes: results-tail reachability (SR-045) + keyboard clearance.
4. Onboarding slides 3/4 firing real OS prompts + granted states; swipe paging feel (SR-046's native leg).
5. Native offline cold-open (banner + peek suppression) — the web export cannot boot offline.

### ROUTED (seam hits — correctly not re-litigated)
SF fallback region in denied/LATEST states → **FORK-1**. Home banner geometry → **device-tune F-20**. RN-web a11y-prop no-ops → **F-22** (the chip's `aria-hidden` is the F-22-aware pattern, present). Drawer/empty-local copy → **BP16** (Sky-ratified A-5 string untouched). Prefs-screen gap → **SR-020** (Settings agent). Cold-start PATH → Settings agent.

### Open questions raised (routed to the owning agents)
- `MapScreen.tsx:1481` comment claims `focusFlag` "self-clears" — only `flagId` does; traced benign, but the comment is untrue (Map agent to confirm/route).
- A guest-sheet `aria-disabled: null` read likely matched a wrapper node — sheet internals belong to the Map agent's census.

---

## §M · Map + Report cluster — verdict **FINISHED** (7 findings: 2 HIGH, 2 MED, 3 LOW) — RECOVERED + COMPLETED

> **Provenance:** predecessor (died 18:32 mid-offline-probe) had code-traced all 21 surface files (~12,700 lines) + banked ~85 live assertions in the DENIED-context walk (13 captures). Recovery agent mined that, then ran what had never run: the GRANTED-cohort walk, heat/collapse/status-empty composition, the anon-Submit ENABLED brink, pin-popup entry, the definitive offline settle, and the fit-race probe (6 fresh captures; 19 PNGs total at `assets/map-report/`). Two predecessor FAILs retracted as probe artifacts (pre-settle sampling); its "cluster-locked after N clicks" INFOs re-explained by SR-105. Brink held both sessions (Submit asserted ENABLED, never clicked).

### Findings

| SR | Tier | Cohorts | Evidence | Where | What |
|---|---|---|---|---|---|
| **SR-104** | **HIGH** | all web (native unaffected) | web-verified | `accessibility.ts:130` ← RN-web `AccessibilityInfo` source · `MapScreen.tsx:472`, `:552-558`, `:2713-2716` | **Every web user is treated as a screen-reader user**: RN-web's `isScreenReaderEnabled()` hardcodes `resolve(true)`. Both consumers verified: (a) NearbyFlagsModal **auto-opens over the map on every arrival** (6/6 sessions, denied AND granted); (b) Nearby row-select takes the SR branch — opens FlagDetail over the list instead of recenter+callout, so **no sighted web user can ever recenter from the list**. Native uses the real API. Distinct from F-22 (different API). |
| **SR-105** | **HIGH** | guest/web no-location | web-verified ×3 sessions (1 counter-session) + mechanism code-cited | `MapScreen.tsx:1477-1506` (flag consumed `:1502`) · `PlatformMap.web.tsx:890-892`, `:1001-1010` | **T7 fit-to-flags intermittently never lands**: the one-time fit flag is consumed BEFORE the snap call, and web `instantCut` is an optional-chained **silent no-op if the Leaflet instance isn't ready** — a missed fit never retries → session-long "Showing 9 flags" over a markerless San Francisco default. Compounds with SR-104: a sighted no-location web guest has **no path to see flags on the map** short of manually panning SF→Kelowna. Native twin = device row (same consumed-flag pattern; native ref binding likely wins the race). |
| **SR-106** | MED | all (geometry proven web) | web-verified + code-inferred | card label `MapScreen.tsx:1161`, render `:2377-2381` | **Empty-filters recovery card composites OVER the open filter panel and intercepts its taps** (bbox overlap proven; a panel-chip click was intercepted twice). The user who emptied the map from the panel cannot un-toggle the chip there — recovery only via the card's own chips (which work: "All access needs" + "Reset all" verified). PROTECT #2's card behavior itself is intact — stacking/hit-testing defect, not a card defect. |
| **SR-107** | MED | all, web engine | web-verified + code-inferred mechanism | `PlatformMap.web.tsx:380-382` | **Coincident flags are permanently cluster-locked on web — no spiderfy** (supercluster has none natively): 8 of 9 prod flags (the coincident downtown group) never decluster; their pin-popup → Open-details is unreachable by map tap; the Nearby list is the only route. Positive control: the one separate flag DID decluster → popup with correct severity grammar + 44px Open details. Native uses react-native-map-clustering (spiderfy default ON) — likely fine, device row. |
| **SR-108** | LOW | all | web-verified + code | `MapScreen.tsx:1172-1188` | Recovery card builds per-axis chips for category/severity/distance/disability but **no STATUS chip** — status-only empties show the card with 0 per-axis chips ("Reset all" does recover; the panel's zero-status hint exists). Polish vs the card's per-axis design intent. |
| **SR-109** | LOW | guest/web | web-verified | `copy.ts:42` · `flagsStore.tsx:376` | Offline refresh failure surfaces the raw fallback "**Unknown error. Tap to retry.**" (banner at t+8s; honest status pill + full retry recovery verified). Technical/vague for the cohort most likely to hit it. Copy side flagged to BP16 seam; the mechanism finding stays here. |
| **SR-110** | LOW | dead code | code-verified | MapScreen ×7, ReportFlagModal ×3, `HeatmapLayer.tsx` | 10 defined-but-unreferenced StyleSheet keys + **HeatmapLayer.tsx imported only by its own test** (HeatmapLegend IS used; heat cells render via PlatformMap's own layer) — orphan candidate, improvement slate. |
| — | INFO (00 §4 class) | web | web-verified (capture 06) | "Name this filter" dup-name save | Duplicate-name save is a raw `Alert.alert` → silent no-op on web — dialog stays open, zero feedback. Recorded per 00 §4 as a web-cohort completeness row, not graded as a finding. Same-class: long-press menus → sequential `window.confirm` chains on web (work). |

### Cohort capability matrix (verified; condensed)
Browse/tiles/attribution ✔ all cohorts · **see flags on map without location: ✖ intermittent (SR-105)** · Nearby list+search+tabs ✔ (honest no-distance notice when denied; real distances when granted) · row-select recenter: ✖ web (SR-104), ✔ native code-inferred · pin popup: ✔ where geometry permits, ✖ coincident group (SR-107) · Legend + k≥3 ✔ · filters all axes + quick-cycles + collapse ✔ (distance filter really filters: "1 of 9 shown") · saved filter sets full CRUD ✔ (device-local) · presets/saved-places correctly authUser-gated ✖ guest · heat map + Jordan disclaimer + k≥3 floor observable live (9 flags → 1 qualifying cell) ✔ · **Report FAB hidden for guest ✔ (Jordan C2, `:2564`)** · long-press drop-pin silently gated for guest ✔ (`:1522`) · anon sheet: Submit DISABLED without location / **ENABLED with coords captured — asserted, never clicked** ✔ · anon limits/photo law honesty ✔ (templates/photo/tags hidden, honesty banner) · offline failure + recovery ✔.

### CHECKS-PASSED (selected)
T7 polite hint ↔ S4 assertive denial banner mutual exclusivity (wording exact) · quick-cycles cycle AND wrap with correct rest labels · Legend 6 sections + clean close · saved-sets lifecycle incl. empty-name disabled save + make-default flip · Escape closes idle report sheet · S5 denied retry persists sheet · anon submit labeled "Submit report anonymously" (visible-label subset, WCAG 2.5.3-compliant) · **box-none law intact 6/6 sites** (`:1620 :1630 :1636 :1649 :1660 :2519`) · Jordan C2 both gates verified · **D8 photo pipeline fail-closed chain re-confirmed at HEAD** (scheme→ext→size→magic-byte→strip→sanitize→verify→derive-ext; anon photos structurally impossible) · deep-link chain code-complete (warm capture → `accessmap://flag/:flagId?` → fetchFlagById+animateTo; focusFlag/flagId retire the T7 fit, openReport deliberately doesn't) · web address-bar paramless serialization live-confirmed · zero non-benign pageerrors in every session.

### NEEDS-SKY-DEVICE (this cluster)
1. **Native no-location arrival frame** (SR-105's native twin): cold-launch iOS, deny location — does Map frame the 9 flags or sit on SF? 2. Native cluster spiral on the coincident group (SR-107 counter-check). 3. Nearby auto-open + row-select under real VoiceOver (SR-104's intended behavior). 4. Long-press drop-pin confirm (signed-in). 5. NearbyFlagsModal pageSheet swipe (SR-028 companion). 6. Airplane-mode refresh vs the 12s/30s ladder.

### ROUTED
Dup "Use my location" nodes under RN-web modals (background not aria-hidden) → **F-22**. · "Unknown error" fallback copy → **BP16 seam** (mechanism stays here as SR-109). · Registry drift noted: the two Name dialogs now at `:2751`/`:2836` (4-line drift from SR-029's cited lines). · **SR-033 closed-verified**: 6 box-none sites re-verified at `512494a`. · **SR-001 live evidence**: uncurated guest-visible UGC in prod (capture 16). · **SR-007 / SR-036 / SR-037**: anon-limit wiring locations confirmed (client-only, submit-time surfacing; the unnamespaced `anon_submit_timestamps` key and silent `recordAnonSubmit()` failure stand as registered — improvement slate).

### Open questions
1. Fix shape for SR-105 (parent/Phase-2 call): don't consume the fit flag until the snap actually executed, or queue pre-ready camera calls in PlatformMap.web. 2. Is SR-104's auto-open intended-for-web (zero-tap data surfacing)? The row-select endpoint is the unambiguous defect either way. 3. walk3b's offline anomaly (4 requestfinished while offline) = browser disk-cache mediation; real-device airplane mode is the honest arbiter.

### §NOT-VERIFIED
Signed-in live walks (no credentials — law §3): FAB press, drop-pin confirm, photo pipeline UI, templates/tags UI, presets internals, Name-preset dialog, map-detail triage — code-traced only. Submission efficacy (brink law). Native gestures/callouts/haptics/VoiceOver (§2). `accessmap://` end-to-end (native-only; harness lacks SPA rewrite). Tile-cache runtime. S11 12s/30s ladder on a true hang (fail-fast paths settle first; wiring code-verified).

## §T · Tasks + FlagDetail cluster — verdict **FINISHED** (7 findings: 1 HIGH, 1 MED-HIGH, 2 MED, 2 LOW, 1 INFO) — RECOVERED + COMPLETED

> **Provenance:** predecessor agent died 18:32 one step before composing its report; a recovery agent mined its transcript (87 tool calls, all 5 walk scripts + outputs, 10 captures at `assets/tasks/`) and finished the remainder fresh (serve re-confirmed, every load-bearing gate line re-verified). Brink held in both sessions — walk network logs show GETs only; the reopen submit was asserted enabled and screenshotted, never clicked. Rows tagged [recovered] vs [fresh] in the agent return; condensed here.

### Cohort capability matrix (verified)

| Capability | Guest (web = guest cohort) | Signed-in (code + jest) |
|---|---|---|
| Browse triage list | ✅ live: 9 cards, Open 6 / Verified 3, badge "6" | ✅ + Mine scope |
| Search | ✅ live: "ramp"→5, SR announce "5 flags match", clear-X, honest empty w/ query echo | ✅ same |
| Filter & sort Sheet | ✅ live (`aria-expanded` flips; 11 chips + All; 3 sort tabs; Mine/All row structurally absent for guests — device-tune F-16 confirmed) | ✅ + Mine/All (hydration-guarded :1068) |
| Sort correctness | ✅ live: Newest/Oldest flip; Severity per-section descending [5,3,3,1,1,1] | ✅ (tasksSort.test.ts) |
| Select mode + bulk bar | ⚠️ reachable; Verify/Resolve ENABLED; Watch disabled w/ "Sign in to watch flags" | ✅ full |
| Per-card / detail triage | ⚠️ rendered + enabled → SR-093 | ✅ CAS + points flash + SR announce |
| Card tap → View on map | ✅ live | ✅ + analytics |
| FlagDetailModal | ✅ live; Edit/Delete correctly hidden (isOwn) | ✅ owner Edit (2000-cap) / Delete |
| Comments | ❌ **HTTP 300 → dead** (SR-092); composer hidden | ❌ same 300 — dead for ALL cohorts |
| Status history | ⚠️ 401 → "History not yet enabled" (SR-095) | ✅ (view granted to authenticated, no user_id) |
| Reopen request | ❌ enabled form, silent no-op submit (SR-094) | ✅ RPC + Bronze-3 threshold + per-device dedup |
| Share / Copy coords | ✅ chain traced; headless share error = harness artifact | ✅ native Share.share |
| Photo gallery/lightbox | GET 200 `[]` live; add hidden (owner-only); 0 photo flags in prod | ✅ owner-only junction path |
| Pagination | ✅ 9 < 50 → no Load more, end line present | ✅ 50/20, F40 footer logic |
| Initial-load failure | ✅ honest banner + retry cycle, badge suppressed | ✅ + offline cache (signed-in only by design, flagsStore:356) |

### Findings

| SR | Tier | Cohorts | Evidence | Where | What |
|---|---|---|---|---|---|
| **SR-092** | **HIGH** | **all** | web-verified (prod REST) + code-inferred | `src/lib/comments.ts:68` (+ `:94`) | **Comments are dead against prod for every cohort**: the `users(display_name)` embed became ambiguous (PGRST201 → HTTP 300) when `comment_votes` (trust_score_system, applied `20260531`) created a second flag_comments↔users relationship. Live UI shows perpetual "Couldn't load comments"+Retry; the insert's `.select` at `:94` carries the same embed so posting fails too; jest is green because supabase is mocked. Fix shape: `users!flag_comments_user_id_fkey(display_name)` (PostgREST's own hint). Prod `content-range: */0` — zero comments ever, no data lost. |
| **SR-093** | MED-HIGH | guest | web-verified + code-inferred | `TasksScreen.tsx:689-727` · `FlagDetailModal.tsx:420` · `flags.ts:1233-1239` | **Guest triage is un-gated client-side**: enabled Verify/Resolve/Reject per-card, bulk, and detail. A guest press fires a real prod UPDATE as anon; the `to authenticated` policy matches 0 rows → CAS null → `FlagStatusConflictError` → guest is told **"This flag changed — it was updated by someone else just now"** — false copy, no sign-in path, while sibling controls model the correct gate (bulk Watch: "Sign in to watch flags"). Cohort-gate gap, not a security hole (RLS denies the write). |
| **SR-094** | MED | guest | web-verified + code-inferred | `FlagDetailModal.tsx:640` (render gate `:1147`) | **Guest reopen dead-end**: on a resolved non-own flag the full form renders, char counter live, Submit enabled (capture `12_guest_reopen_form_enabled.png`) — but `handleReopenSubmit`'s first line `if (!user…) return;` silently swallows the press. Zero feedback, no sign-in notice. |
| **SR-095** | MED | guest | web-verified (prod REST) + code-inferred | `StatusHistoryModal.tsx:171-179` | Guest status history: fetch 401 `42501`, and the modal collapses every non-success into "**History not yet enabled** — when this feature is fully set up…" — false for guests (works signed-in; the DB gate is deliberate). Error and empty are indistinguishable. Fix shape: sign-in-aware line for the anon 401 branch. |
| **SR-096** | LOW | signed-in | code-inferred [fresh] | `TasksScreen.tsx:1303-1340` | Empty-state fork keys on `flagsError ‖ categoryFilter ‖ searchText ‖ hasMore` — **`mineOnly` missing**: Mine-scope + zero own flags renders the gold "All caught up — nice work!" celebration while the community queue may be full; breaks the fork's own F40/F41 "celebrate only genuinely empty" law. Banked-check done: NOT previously found (R2 feel row 17 banked the five-way fork; mineOnly absence is new). |
| **SR-097** | LOW | all | static-scan, spot-verified | TasksScreen + 4 files | Dead-style orphans: `mineChip*/catChip*/sortChip*` ×12 (orphaned by D3/C3's move into the Sheet), `title:2223`, `errorBannerIcon:2067`, `offlineBannerIcon`; `PhotoGallery` `removeIcon/emptyIcon/lightboxCloseText`; `StatusHistoryModal` `closeBtnText`; `CommentBubble` `deleteBtnText`. (FlagDetailModal/PhotoLightbox orphans already parked in BP8/BP4 — cited, not re-found.) |
| **SR-098** | INFO | all | code-inferred + prod-verified | `src/types/database.ts:250` | `comment_votes` exists in prod + types with zero src consumers — and is the schema-side trigger of SR-092. Wire votes or drop the table; as-is it's a live-schema landmine that already broke comments. (Disposition joins the SQL sweep's dead-table SKY-DECISION ×4.) |

### CHECKS-PASSED (selected)
Search/filter/sort engine correct live (token-AND + announced counts; severity strictly descending per section) · CAS conflict machinery typed + honest at both catch sites (jest: flags.supabase.test.ts) · points/flash speaks reporter-vs-actor bonuses with announce · Reject confirm gate on all three paths (web-safe `confirm()`) · bulk bar a11y (live-region count, static labels, disabled-reason hints) · error surfaces honest (42501 → "You don't have permission to do that.") · guest fences hold where implemented (watch/comments/Edit/Delete/photo-add) · offline-cache design correct (page-1-only, guest degrades to honest error by design) · pagination caps + F40 footer · share/copy fallback ladder (headless share failure = harness artifact, not app) · StatusHistory privacy shape matches Jordan gates (no user_id, invoker view, append-only).

### Parent closures of the agent's §NOT-VERIFIED (recovery window)
1. **SR-024 interplay** — CLOSED by cross-reference: 04b §A1-3 read exactly those policies (junction owner-verbs NULL-collapse on anon flags + the 06-01 insert-guard rewrite). 2. **computeTasksBadge** — CLOSED: `perceptionHelpers.ts:14-17` is open-only, cap 99, global/unfiltered by design (S-7, single-writer doc comment); matches the live badge "6". 3. **Lightbox tap-dismiss** — jest render coverage exists (`PhotoGallery.test.tsx`); behavior remains the device-pass item (NEEDS-SKY-DEVICE 3). 4. **Comment-length parity** — CLOSED: `comments.ts:9` MAX=500 == DB `CHECK (char_length BETWEEN 1 AND 500)`. 5. walk3 tail — superseded by per-control assertions.

### NEEDS-SKY-DEVICE (this cluster)
1. Share on real devices (the one unverifiable chain — headless artifact). 2. Optional 30-sec repro of SR-093 (guest tap Verify → false dialog; server-safe). 3. **Photo-bearing flag pass** (native, signed-in): thumb → lightbox, gallery, owner photo-add — prod had zero photo flags, so this limb is jest-only. 4. Signed-in offline cold-open (cached banner + age copy). 5. Triage haptics (BP3 contract).

### ROUTED
Tasks end-line honesty → BP16 (built off-main). · catChip double-speak + ~90 `aria-selected` → BP2 parking lot. · missing error-haptic → BP3/BP8. · `reopenSubmitBtn` amber contrast → BP8. · already-parked dead styles → BP8/BP4. · `/ago$/` flake → owned fix branch. · schema-side comment fix + `comment_votes` decision → Dana/backend seam (+ SQL sweep dead-table slate).

### Open questions
1. **Product intent — guest triage**: signed-in-only (client gate missing, SR-093) or eventually open? No triage-rights statement in `docs/ANON_REPORTING_SPEC.md` → Quinn/Sky. 2. Comments shipped dormant? (zero rows ever + votes unwired). 3. StatusHistory guest copy: deliberate cover or should it say "Sign in to see history"?

## §P · Profile + auth cluster — verdict **FINISHED** (15 findings: 3 HIGH, 7 MED, 5 LOW)

Method: full code-trace + a short live guest walk (GuestProfile → sign-in modal → back). Brink held absolutely: nothing typed into any auth field, no submit touched, no mutation anywhere. Captures at `assets/profile/`. Zero console errors (benign tile `ERR_CONNECTION_RESET` only).

### HIGH findings

| SR | Tier | Cohorts | Evidence | Where | What |
|---|---|---|---|---|---|
| **SR-048** | **HIGH** | signed-in | code-inferred | `schema.sql:303-308` · `2026-05-30_admin_role.sql:34-43` · `2026-05-27_users_email_privacy.sql:175-180` | **`users.points` is client-writable.** The `users` UPDATE policy's WITH CHECK pins only `is_admin`, and no column-level UPDATE grant exists anywhere (the 05-27 migration scoped **SELECT** only). Any signed-in user can `PATCH /rest/v1/users?id=eq.<own-uid>` with `{"points": 999999}` (also `email`, `streak_days`) — forging leaderboard rank, tier, achievements and the milestone bar, while `point_events` silently contradicts the total. The 05-30 `is_admin` migration recognized exactly this attack class and closed only that one column. |
| **SR-049** | **HIGH** | signed-in | code-inferred | `supabase/functions/delete-account/index.ts:75-91` · `src/lib/users.ts:71-86` · `schema.sql:442-449` | **Account deletion never touches Storage.** The edge function anonymizes `flags.user_id` then deletes the auth user; the public `flag-photos` bucket is untouched, so the user's **avatar — a face photo — at `<uid>/avatar/<ts>.jpg`** plus all their flag photos stay publicly fetchable **forever**, and become permanently un-deletable (the owner-path-scoped Storage policy can never again match a deleted uid). Directly contradicts the dialog's "permanently delete your account and personal information" and Apple 5.1.1(v)'s expectation (§A-2). |
| **SR-050** | **HIGH** | admin | code-inferred | `flags.ts:1283-1286` · `AdminScreen.tsx:146` · `flags.ts:861-870` | **Admin takedown is structurally incomplete** (SR-001 evidence): `deleteFlag` removes only the DB row — the *photo*, the likeliest objectionable payload, stays publicly served at its stable URL and the admin cannot remove it. `removeUploadedFlagPhotos` already exists and is proven on the create-rollback path; it is simply not wired into takedown. A 1.2 report mechanism built on top of this queue would still be unable to remove the reported image. |

### MED findings

| SR | Cohorts | Evidence | Where | What |
|---|---|---|---|---|
| **SR-051** | signed-in | code-inferred | `ProfileScreen.tsx:678-700` · `account.ts:37-40` | On `AccountDeletedSignOutPendingError` no SIGNED_OUT fires, so the destructive dialog stays open with an **enabled** Delete button; a re-tap hits the edge fn with a dead JWT → 401 → "Your account was not deleted", contradicting the "Account deleted" message just shown. `setDeleteAccountOpen(false)` is never called on any path. |
| **SR-052** | wall/guest | web-verified + code-inferred | `SignInScreen.tsx:38-89` | **No password recovery, and re-signup is an indistinguishable dead end** (SR-026 evidence). `resetPasswordForEmail` appears nowhere; live walk confirms no Forgot/Reset affordance. The only remaining door — Create account — returns success under Supabase's anti-enumeration default and shows "Check your email… to finish signing up" for an address that already exists. |
| **SR-053** | signed-in | code-inferred | `streak.ts:116-157` · `trust_score_system.sql:318-360` · `ProfileScreen.tsx:1184-1210` | **Two conflicting streak systems** (PROTECT-8 single-source-of-truth): a local per-day *Profile-visit* streak drives the hero card and all three badges, while a server *contribution* streak writes `users.streak_days` and awards +5 every 7 days. The UI never reads the server columns — so "3 days in a row" can sit directly above a "+5 pts · 7-day mapping streak" history row. |
| **SR-054** | wall/guest | web-verified attrs | `SignInScreen.tsx:143-158` vs `ProfileScreen.tsx:1540-1551` | Email field never disables autocorrect (live attrs: `autocorrect=on spellcheck=true`); `keyboardType="email-address"` does not suppress iOS autocorrect, and a mangled email is a classic silent sign-in failure. The app's own display-name Input correctly sets `autoCorrect={false}`. |
| **SR-055** | signed-in | code-inferred | `LeaderboardScreen.tsx:147` vs `users.ts:136-153` | Leaderboard initials use `name.slice(0,2)` instead of `getInitials()` — re-introduces the F59 emoji-surrogate mojibake bug on the **public** ranking and yields different initials than the Profile avatar for the same user. |
| **SR-056** | signed-in | code-inferred | `auth.tsx:82-85` · `ProfileScreen.tsx:333/391, 403/443, 480-492` | Token refresh (~hourly) rebuilds the `user` object; every Profile effect keys on the object, so `load` identity changes → `useFocusEffect` re-fires → spontaneous spinner + full refetch while the user sits on the screen. Same class F55 already fixed in `App.tsx` by keying on `user.id`. |
| **SR-057** | signed-in (web) | code-inferred | `ProfileScreen.tsx:630`, `:649` | Two preference failures are silent on web: `handlePickTab` / `handleRealtimeToggle` use raw `Alert.alert` (no-op on web) *while rolling back* the optimistic UI — the control snaps back with zero explanation. The same file uses `notify()` everywhere else for exactly this reason. Per 00 §4 this is a per-call-site completeness row, not a web artifact. |

### LOW findings
**SR-058** (all, web-verified) `A11yLiveRegion.tsx:26-45` retains its **last** announcement forever in a 1×1 sr-only node — "Card 1 of 5" was still readable on the guest Profile long after onboarding was skipped (cross-cutting; also relevant to Lens 2). · **SR-059** (signed-in) `delete-account/index.ts:5-6,33-36` asserts a `verify_jwt` precondition that exists in no config.toml (SR-010 evidence; actual protection is the in-function `getUser()` 401, which the header doesn't credit). · **SR-060** (signed-in) deletion-cascade doc drift: the header omits `flag_comments` (CASCADE — the user's comments *are* silently deleted), `point_events`, `flag_verifications`, `comment_votes`; the UI promises only that reports remain. · **SR-061** (signed-in) old avatars are never reclaimed (`upsert:false`, no `.remove()`), so each prior face photo stays public at its old URL — compounds SR-049. · **SR-062** (signed-in) the "get in touch with support" sentence has no address/link/button, and the transparent dialog covers the header's Feedback control (SR-010 evidence).

### Evidence added under existing SR-ids
- **SR-010**: deletion IS present end-to-end and FK-safe (all 13 FKs to `users`/`auth.users` are CASCADE or SET NULL — no RESTRICT, so `deleteUser` cannot fail on FK). New gaps: Storage residue (SR-049), cascade doc drift (SR-060), unversioned verify_jwt (SR-059), dead-end support line (SR-062).
- **SR-017**: the reviewer account is `is_admin=false`, so a reviewer signing in gets the standard signed-in cohort and never sees Admin — reviewer notes must also carry the "Browse without an account" line.
- **SR-026**: confirmed both ways — email+password only, no third-party button anywhere (live), and no reset path in code or UI.
- **SR-019**: add `ActivityFeedModal.tsx:87-89` — comment claims "SELECT policy is authenticated-only", stale since the anon SELECT policy (harmless behaviorally, same drift class).
- **SR-001**: admin can do exactly two things — hard-delete a flag, set status `rejected`. No comment moderation, no display-name takedown, no ban/suspend, no photo-only removal. `display_name` has a 60-char cap but **zero** content validation and no uniqueness, so impersonation ("AccessMap Admin") is unblocked on a public leaderboard.
- **SR-025**: `GUEST_SIGNIN_ENABLED` confirmed dead; the real gate is `App.tsx:146`.

### CHECKS-PASSED (selected)
Guest sees **none** of 12 signed-in surfaces (each live-asserted false). Sign-in modal correctly omits the guest CTA and includes "← Back"; `role=dialog aria-modal=true` on web + AVM native. **Avatar upload runs the same D8 privacy pipeline as flag photos** (scheme guard → ext allowlist → 10 MB → magic-byte → fail-closed strip → byte sanitizer → structural verify → post-strip MIME). Admin double gate verified (route registration + in-screen lock; guests resolve false). Wrong-credential message is honest and non-enumerating, renders inline on web, and is announced for VoiceOver. `auth.tsx` INITIAL_SESSION vs SIGNED_IN does not double-prompt (restore passes `promptIfNew:false`). Email-privacy footnote **holds** (leaderboard never carries email; column grant makes it unreachable). Deep link survives the signed-out window on native and is consumed exactly once. Points/tier/achievement derivations are single-sourced as designed.

### NEEDS-SKY-DEVICE (this cluster)
1. **Type a real email into the iOS sign-in field and confirm autocorrect doesn't mangle it** (SR-054) — highest-value 30-second check here. 2. Delete-account dialog: AVM truth + Cancel/Delete reachability at largest Dynamic Type. 3. Sign-in modal has no swipe-dismiss (fullscreen Modal) — verify "← Back" reachable under notch + large type. 4. Avatar picker: iOS photo-permission denial copy; HEIC fail-closed message. 5. VoiceOver order through the Profile hero. 6. **Is "Confirm email" ON in the live Supabase project?** — decides whether the sign-up copy is truthful (SKY-SIDE dashboard read).

### ROUTED
Background scenes staying in the ARIA tree behind Profile/dialog → **F-22 / Lens 2**. Any string changes implied (support sentence, "Check your email") → **BP16** (mechanism only proposed here, no new copy). SignInScreen's hardcoded dark gradient regardless of scheme → **Lens 2**. Points *numerals* (10/3/15/7) → **fork-briefs Fork 2**; SR-048 is the *write-authorization* axis and attaches as new context rather than merging.

## §S · Settings + drawer + shared modals + first-run — verdict **FINISHED** (5 findings: 1 HIGH, 1 MED, 3 LOW, 1 note) — RECOVERED + COMPLETED

> **Provenance:** predecessor died 18:32 mid-FAQ-verification; recovery agent mined its transcript (walks 1–8 all recovered with outputs) and closed the fresh gaps (replay tutorial, changelog arbitration, export gate, drawer X measure, SR-020 reader grep, PIPEDA ordering, FAQ-claims finish). 14 PNGs at `assets/settings/` (note: `settings-guest.png` is a byte-duplicate of `about-sheet-overflow.png` — a true light Settings capture is a small open item). Brink held both sessions (sign-out confirm dismissed, feedback never sent).

### Findings

| SR | Tier | Cohorts | Evidence | Where | What |
|---|---|---|---|---|---|
| **SR-099** | **HIGH** | all web; native NEEDS-SKY-DEVICE | web-verified + code-inferred | `AboutScreen.tsx:157-171` · `HelpModal.tsx:212-229` (latent: `FeedbackModal.tsx:349-367`, `MyFeedbackModal.tsx:276-293`) | **The unresolved-percentage sheet-overflow CLASS** (mechanism for SR-064, now 4 surfaces): card `maxHeight:'90%'` sits on the card but its parent wrapper has no height, so the percentage never resolves → uncapped card; `justifyContent:'flex-end'` pins the bottom and the header row **with the 44pt X lands above the viewport** (About X y=−65, Help X y=−53). Backdrop is a plain View — no scrim-tap — so on touch web there is **no pointer path to dismiss either sheet** (Escape rescues desktop only). Same recipe latent in Feedback/MyFeedback (content currently fits). Captures: `about-sheet-overflow.png`, `help-sheet-overflow.png`. |
| **SR-100** | MED | web | web-verified | `RootNavigator.tsx:43-44` + `ErrorBoundary.tsx` handleReset | Settings/Admin are module-level `React.lazy` with split chunks (SettingsScreen-*.js 31KB); if the chunk fetch fails (offline at first open) the boundary's "Try again… or switch to another tab and come back" promises exactly the two paths that don't work — reset re-renders the **cached rejected lazy, no refetch**; only a full reload recovers (walk7/8, `settings-offline-chunk.png`). Native unaffected (local bundle). |
| **SR-101** | LOW | guest | web-verified + code-inferred | `SettingsScreen.tsx:626-635`, `:432-445` | Sign out row renders for guests ("End your session on this device") and fires a real confirm; accept would no-op (native guest does NOT exit guest mode). The drawer is auth-aware ("Sign in"); Settings isn't. |
| **SR-102** | LOW | web-guest | web-verified | `SettingsScreen.tsx:346-349` | Export-my-data guest gate is raw `Alert.alert` → silent no-op on web (live: zero dialogs, zero body delta). Per 00 §4: per-call-site completeness row (file already imports `notify()`). |
| **SR-103** | LOW | web signed-in | code-inferred | `pushNotifications.ts:227-242` (`:233`) | Web signed-in push toggle: PIPEDA `window.confirm` fires, then the web-null token failure is a raw `Alert.alert` → silent — the toggle snaps back with zero feedback right after the user confirmed a dialog. |
| — | INFO | web | web-verified (arbitrated) | ChangelogModal | The last collapsed release rests half-clipped at the card's bottom edge at natural open; real tap fails there but works after in-sheet scroll (JS-click + pointer-events + post-scroll click all arbitrated). Polish note, not a dead control. |

### Evidence added under existing SRs
- **SR-020**: flag-off hides row+screen (SettingsScreen:499/:653; live absent); prefs key `@accessmap/push_notif_prefs_v1:` has **zero readers** outside the screen — dead surface confirmed.
- **SR-025**: `GUEST_SIGNIN_ENABLED` zero consumers [recovered grep]; **`PUSH_NOTIFICATIONS_ENABLED` also zero consumers (same dead-flag class — extension)**; only `PUSH_NOTIF_TYPES_ENABLED` is consumed.
- **SR-031**: C-lite = long-press Tasks header title → glassMode store; zero visible affordance **by design** (GLASS.md: one build carries both modes for Sky's on-device A/B; haptic+flash+announce on flip; cleanup commit planned). Discoverability is intentional, not a gap.
- **SR-032**: all 6 Resources entries lack `url` (`linked = !!r.url`) → cards are genuinely non-pressable info cards, **zero dead links** (live 6/6 render, 0 link roles). Downgrade: content-completeness with a TODO(Sky), not a broken control.
- **SR-035**: **cold start VERIFIED SAFE** — see CHECKS-PASSED 1–2.
- **SR-064**: mechanism + class scope now at SR-099.

### CHECKS-PASSED (selected)
1. **Cold-start first-run** [recovered, web-verified]: fresh storage → OnboardingCards ~600ms → full 5-card walk → guest Home; `onboarded_v1='1'`; no re-show after reload; mid-flow reload correctly re-shows; zero console errors. 2. **Native no-network cold start cannot hang** [fresh, code-inferred]: fonts bundled + non-blocking on error (App.tsx:205-216); `getSession` is local-storage with `finally { setLoading(false) }` (auth.tsx:46-60); FirstLaunchGate ≈50ms AsyncStorage read → wall/guest reachable offline. Web offline cold start = browser error page (no service worker — honest posture row). 3. **Drawer contract unregressed**: X measured 44×44 [fresh]; scrim-close; items correct per cohort; exit-latch + RM-snap present at HEAD — device feel stays with the CLOSED device-tune baseline. 4. Resources 6/6 · HowToHelp 4/4 · About v3.0.0 == app.json + privacy section. 5. Banner-prefs guest gate honest (amber notice, disabled toggles, none dead). 6. Appearance flips live + persists across reload (`accessmap:appearance='dark'`). 7. Help & FAQ: 7 questions; search exact-hit + honest empty; points answer interpolates 10/15/3/7 (matches trigger); **FAQ claims vs real UI all TRUE** (predecessor's death-point thread finished). 8. Replay tutorial full walk incl. F20 reopen-reset (walk5's contrary reads were probe artifacts — retracted). 9. What's New: v3.0.0 expanded, toggling correct; **source = hardcoded RELEASES array; date/bullets are SKY-EDITABLE placeholders → pre-ship confirm item (S20)**. 10. Feedback modal validation ladder correct incl. inline email error; sending guard complete; mailto builder F60-trimmed [never sent]. 11. **PIPEDA ordering verified**: explanation BEFORE OS prompt; SIGNED_IN prompts once, INITIAL_SESSION silent re-register; F52 stale-permission reconcile on mount; guest web switch properly disabled. 12. Sign-out centralizes cache+token cleanup; export path correct on both platforms (clipboard/Share + guards). 13. Tasks badge renders "6" == computeTasksBadge. 14. Escape closes all five shared/settings sheets on web.

### NEEDS-SKY-DEVICE (this cluster)
1. **About/Help sheet height on a real device** (SR-099 native companion — Yoga % vs indefinite parent is plausible natively). 2. Disabled-switch + banner-gate VoiceOver truth. 3. Drawer latch/RM feel (settled baseline, spot-check). 4. **Changelog date/bullets confirm before public release (S20)**. 5. Push OS-prompt flow end-to-end (SR-018/021 standing).

### ROUTED
Push-row subtitle disabled-reason string + guest Sign-out copy + any FAQ tweaks → **BP16**. RN-web a11y-prop no-ops → **F-22**. F-20 banner → **device-tune**. Guest Verify/Resolve brink controls → §T (SR-093). Sim build → in-flight branch.

### Open questions
1. Migrate the two straggler raw-Alert call-sites (SR-102/103) to `notify()`? 2. Should native-guest Sign out exit guest mode back to the wall (product call)? 3. Re-capture a true light-mode Settings PNG (the current one duplicates the About overflow).

### §NOT-VERIFIED
Signed-in cohort never live-authenticated (law §3) — signed-in paths code-inferred. No native binary evidence (SR-021). Mailto compose / sign-out accept / export confirm — brink-terminal, never fired. Post-reload radio re-read flaked once (nav flake; persistence proven via storage read + screenshot instead). Native About/Help overflow unproven either way (device row).
