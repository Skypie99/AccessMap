# FLAGSTONE FULL SIMULATOR WALK — PHASE A CLOSE-OUT
**Fable 5 · 2026-08-19→20 · walk + diagnose only (no fixes; Phase B = separate Opus window)**

## ★ COMMIT HANDSHAKE (repeated at close)
Walked binary built from **main @ `bc91789`** — the current tip of local main == origin/main at build time, clean tracked tree. Everything merged to date is included: today's legal-sheets/modal-ordering fix, the anonymous content filter (`189bf5a`), the Flagstone rename, and the fmt/Xcode-26 build fix (`b70ca86`). No unmerged branch walked (Sky named none). **BUILD TYPE = sim-release** (Release config, embedded bundle, no Metro) — closest local proxy to the store binary; true release-binary perf/chrome + real-device concerns remain DEVICE-ONLY.

## ROUTE + RIG (declared)
- **Route A** — local Release simulator build (the fmt wall is fixed on main; ~75-min cold build). Route B (EAS) not needed.
- **idb was impossible** on this Mac (core formula absent; facebook/fb/idb-companion needs CLT-for-Xcode-27 admin install). **Substituted WebDriverAgent** (built from source, Xcode 26.6) — full AX-tree-with-frames (measured hit targets), W3C tap/swipe/longpress, typing, alerts. Verified-tap proof banked (00_STEP0_BUILD.md). Screenshots via `simctl io`.
- **Device matrix:** iPhone 17 Pro Max (440×956, largest — full pass) + iPhone 17e (390×844, runtime's smallest; **no true SE-class 375×667 exists in iOS 26.5** — matrix limit, not skipped). `supportsTablet:false` → no iPad, deliberate ✓.

## ★ COVERAGE ARITHMETIC (40 nodes from the code census)
**28/40 exercised** on the reachable guest surface (27 full + C6 partial). The 12-node gap, each explained:
| Bucket | Count | Nodes | Why |
|---|---|---|---|
| Fully walked | 27 | A1,A2,A3,A4,A5,A6,A7,A9,A10,B1,B2,B3,B4,B5,B6,C1,C2,C3,C5,C7,C13,C15,C16,C17,D1,D2,D3 | — |
| Partial | 1 | C6 NearbyFlags | entry button exercised; list modal not opened (coord hit a marker) |
| SKY-QUEUE (auth) | 6 | A5b Profile-signed-in, C9 Achievements, C10 ActivityFeed, C11 MyReports, C12 MyWatched, C14 Leaderboard | password-only auth; agent cannot enter credentials (system + Const. prohibition) |
| Role-gated | 1 | A8 Admin | only registered when is_admin; census-complete |
| No test data | 2 | C8 PhotoLightbox, E1 PhotoGallery | every seeded flag has "No photos" → nothing to open |
| **Blocked by defect** | 2 | E2 ReportContentModal, E3 StatusHistoryModal | **their buttons are dead — SW-26 (itself a finding)** |
| Deferred low-value | 1 | C4 SavedPlaces save-flow | same local-CRUD pattern already proven end-to-end via C2 |
Element-level: every walked screen has an AX census (frames) in `screens/` + `*_census.json`; hit targets measured numerically throughout, not eyeballed.

**Sizing lens applied:** hit targets (44pt floor, measured) · safe-area/home-indicator intrusion (SW-01/02 family) · Dynamic Type accessibility-extra-large (Tasks/Home/SignIn) · keyboard contract (email type + KAV) · BOTH appearances (dark pass: Home/Tasks/FlagDetail/Settings) · portrait-lock honored. Console log streamed throughout (caught the SW-30 crash signature).

## ★ THE LEDGER (full detail: LEDGER.md) — 1 Blocker, 7 High, 9 Med, ~12 Low, 2 Obs
- **BLOCKER — SW-30:** re-opening the SAME flag's detail crashes the host screen (`cannot add postgres_changes callbacks … after subscribe()`) → ErrorBoundary; **cross-tab blast radius** (every tab that mounts that flag's detail dies); only relaunch recovers (SW-31). The single most important fix.
- **HIGH:** SW-01 (Apple-1.2 consent line below the fold — fully off-screen on 17e; store-review risk), SW-26 (History+Report buttons in FlagDetail dead → E2/E3 unreachable), SW-28 (FlagDetail "View on Map" doesn't focus the flag; deep-link + card-title paths prove it CAN), SW-37 (anonymous report dead-ends with location denied — Submit stays disabled, no manual-pin fallback; core value flow blocked), SW-23 (FlagDetail intermittently absent from the AX tree → VoiceOver void, PLAUSIBLE — device-VO verify), SW-31 (boundary can't recover + false "switch tabs" copy).
- **MED/LOW:** micro hit-targets (clear-search 16×17, copy-coords 21×24, collapse-panel 32pt, Report FAB 42pt), silent guest-disabled push switch, SF-default-vs-Kelowna-data map card, preset Save AX-unreachable, "3351 min walk" absurdity, reporter-attribution wording drift, tab "N of 5" count on a 3-tab bar, AX mid-word wrap. See rollup in LEDGER.md.

## VERIFIED-GOOD (regressions checked, PASS — worth Sky's confidence)
- **Today's legal-sheets/modal-ordering fix (bc91789):** F1 regression green — Terms AND Privacy present correctly OVER the About modal and from SignIn; both sheets close cleanly.
- **BQ-1 wording:** in-app Terms (v1.0 2026-07-27) + Privacy (v1.0 2026-07-29) read **Flagstone throughout — 0 "AccessMap" hits** in either full tree. The memory line "in-app Terms/Privacy still say AccessMap" is **STALE.**
- **Anonymous content filter (189bf5a):** present; correctly a submit-time server path (edge honored, never fired).
- **Rename:** every walked user-visible surface says Flagstone (home label, permission dialogs "Flagstone Would Like…", About v3.0.0, share footer "Reported via Flagstone."). Deep link scheme correctly still `accessmap://` (protected identifier). **No rename inconsistency found in-app.**
- **Dark mode:** the memory-flagged dark STATUS_COLORS bug (status pills/severity chips) is FIXED — all legible.
- **Privacy gate:** OS location dialog fires ONLY on user action; no auto-prompt anywhere.
- **Share payload:** perfect (`flagstone.skypistudio.com/flag/<uuid>` + `accessmap://` deep link + "Reported via Flagstone."). Deep link end-to-end focuses the exact flag.
- **Accessibility labels:** genuinely excellent across the app (composite labels with severity/status/distance; disabled-state announcements; per-severity descriptions).

## [SIMTEST] CLEANUP — COMPLETE (SIMTEST_CLEANUP.md)
Zero backend writes (all anon flows walked to edge, never submitted; all authed actions guest-gated). Only created state = one device-local filter preset "SIMTEST preset" — **created then deleted, verified gone.** Sky one-tap fallback if any residue: `xcrun simctl erase <both UDIDs>`.

## HONEST DEVICE-ONLY REMAINDER (the TestFlight pass owns these)
Real touch feel/haptics · true VoiceOver reading order (SW-23/SW-03 verdicts) · camera capture + real EXIF/sanitize gate (sim had no photo data) · push notifications delivery · real GPS · release-binary perf/blur-over-live-tiles · orientation force-rotate.

## SKY-QUEUE (to unlock the authed remainder)
Sign into the reviewer/[SIMTEST] account ONCE on each booted sim (agent cannot enter credentials). Then a successor window walks: A5b full Profile, C9–C12 profile modals, C14 Leaderboard, authed C3 verify/resolve/reject (with [SIMTEST]-prefixed rows + cleanup), G3 push dialog, Admin (if the account is admin).

## GATE / ONE-WRITER
Phase A made ZERO commits and ZERO tracked-file edits — all artifacts under `design-reviews/sim-walk/2026-08-19/` (untracked). Peer session confirmed read-only (PM briefing). Phase B (Opus) owns fixes: pin the measured gate baseline (tsc 0 · jest 205 suites/3005 · lint 0) first, one commit per defect in severity order starting with SW-30, then the mandatory REBUILD→reinstall→RE-WALK regression loop in the sim.

**STOP — Phase A complete. Awaiting "RUN PHASE B".**
